from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import asyncpg # Using asyncpg for async database operations
import os
from dotenv import load_dotenv

# Load environment variables from .env.development
load_dotenv(dotenv_path='.env.development')

# Database connection configuration
# Using environment variables for sensitive info
DATABASE_CONFIG = {
    "host": os.getenv("DB_HOST", "183.182.125.245"),
    "port": int(os.getenv("DB_PORT", 5432)),
    "database": os.getenv("DB_NAME", "odg_test"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "od@2022")
}

app = FastAPI(
    title="ODG Check Price API",
    description="FastAPI backend for checking product prices",
    version="1.0.0"
)

# Configure CORS
frontend_ip_url = os.getenv("VITE_FRONTEND_IP_URL")
allowed_origins = [
    "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:3000"
]
if frontend_ip_url:
    allowed_origins.append(frontend_ip_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global connection pool for asyncpg
pool = None

@app.on_event("startup")
async def startup_event():
    global pool
    try:
        print("Starting up Check Price API... Creating database connection pool")
        pool = await asyncpg.create_pool(
            user=DATABASE_CONFIG["user"],
            password=DATABASE_CONFIG["password"],
            host=DATABASE_CONFIG["host"],
            port=DATABASE_CONFIG["port"],
            database=DATABASE_CONFIG["database"],
            min_size=1,
            max_size=20
        )
        print("Check Price API database connection pool created successfully")
    except Exception as e:
        print(f"Warning: Check Price API could not connect to database: {e}")
        print("Check Price API will start without database connection")
        pool = None

@app.on_event("shutdown")
async def shutdown_event():
    global pool
    if pool:
        print("Shutting down Check Price API... Closing database connection pool")
        await pool.close()

# Dependency to get a database connection
async def get_db():
    if not pool:
        raise HTTPException(status_code=503, detail="Database not available for Check Price API")
    async with pool.acquire() as connection:
        yield connection

# Pydantic model for product response
class Product(BaseModel):
    item_code: str
    item_name: str
    price: float
    unit_code: str
    url_image: Optional[str] = None
    stock_quantity: int
    barcode: Optional[str] = None

@app.get("/api/check-price-product", response_model=List[Product])
async def check_price_product(
    search: str,
    whcode: str = "1301",
    loccode: str = "130101",
    db: asyncpg.Connection = Depends(get_db)
):
    """
    API endpoint to check product price by item code or name.
    """
    if not search.strip():
        print(f"DEBUG: Received empty search term.") # Debug log
        raise HTTPException(status_code=400, detail="Search term cannot be empty")

    print(f"DEBUG: Received search request - search='{search}', whcode='{whcode}', loccode='{loccode}'") # Debug log

    try:
        # Use the search term directly for barcode exact match
        search_term_exact = search.strip()
        # Use a pattern for name/code partial match
        search_pattern_like = f"%{search_term_exact}%"

        query = """
            WITH found_product AS (
                SELECT
                    a.ic_code,
                    a.ic_name,
                    a.ic_unit_code,
                    a.balance_qty
                FROM
                    sml_ic_function_stock_balance_warehouse_location('2099-12-31', '', $1, $2) a
                LEFT JOIN
                    ic_inventory_barcode b ON a.ic_code = b.ic_code
                WHERE
                    (a.ic_name ILIKE $3 OR a.ic_code ILIKE $3 OR b.barcode = $4)
                    AND a.balance_qty > 0
                LIMIT 1
            )
            SELECT
                fp.ic_code as item_code,
                fp.ic_name as item_name,
                fp.ic_unit_code as unit_code,
                fp.balance_qty as stock_quantity,
                (SELECT barcode FROM ic_inventory_barcode WHERE ic_code = fp.ic_code LIMIT 1) as barcode,
                COALESCE((SELECT sale_price1 FROM ic_inventory_price
                          WHERE current_date BETWEEN from_date AND to_date
                          AND currency_code ='02'
                          AND ic_code=fp.ic_code
                          AND unit_code=fp.ic_unit_code
                          AND cust_group_1='101'
                          ORDER BY roworder DESC LIMIT 1), 0) as price,
                (SELECT url_image FROM product_image WHERE ic_code = fp.ic_code AND line_number = 1) as url_image
            FROM
                found_product fp;
        """
        
        query_params = (whcode, loccode, search_pattern_like, search_term_exact)

        print(f"DEBUG: Executing SQL query:\n{query}")
        print(f"DEBUG: With parameters: whcode='{whcode}', loccode='{loccode}', search_pattern_like='{search_pattern_like}', search_term_exact='{search_term_exact}'")

        rows = await db.fetch(query, *query_params)
        
        print(f"DEBUG: Raw database result (rows): {rows}")

        if not rows:
            print(f"DEBUG: No product found for search='{search}'")
            return []

        products = [
            Product(
                item_code=row["item_code"],
                item_name=row["item_name"],
                price=float(row["price"]),
                unit_code=row["unit_code"],
                url_image=row["url_image"],
                stock_quantity=int(row["stock_quantity"]),
                barcode=row["barcode"]
            ) for row in rows
        ]
        print(f"DEBUG: Found product(s): {products}")
        return products

    except Exception as e:
        print(f"ERROR: Exception in check_price_product: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    database_status = "connected" if pool else "disconnected"
    return {"status": "healthy", "database": database_status}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005) # Using port 8005 to avoid conflict with main_simple.py (8004)