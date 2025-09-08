from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import asyncpg
import asyncio
from datetime import datetime, date
import os
from contextlib import asynccontextmanager

# Database connection configuration
DATABASE_URL = "postgresql://postgres:od@2022@183.182.125.245:5432/odg_test"

# Global connection pool
pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global pool
    print("Starting up... Creating database connection pool")
    try:
        pool = await asyncpg.create_pool(DATABASE_URL)
        print("Database connection pool created successfully")
    except Exception as e:
        print(f"Warning: Could not connect to database: {e}")
        print("Server will start without database connection")
        pool = None
    yield
    # Shutdown
    if pool:
        print("Shutting down... Closing database connection pool")
        await pool.close()

app = FastAPI(
    title="ODG Backend API", 
    description="Python FastAPI backend for ODG POS system",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5176", "http://localhost:3000", "http://localhost:5174"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class LoginRequest(BaseModel):
    code: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    message: str
    user: Optional[dict] = None

class TransferDetail(BaseModel):
    item_code: str
    item_name: str
    unit_code: str
    quantity: float
    wh_code: str
    shelf_code: str
    wh_code_2: str
    shelf_code_2: str

class TransferRequest(BaseModel):
    transfer_no: str
    creator: str
    wh_from: str
    location_from: str
    wh_to: str
    location_to: str
    details: List[TransferDetail]

# Helper function to get database connection
async def get_db():
    if not pool:
        raise HTTPException(status_code=503, detail="Database not available")
    async with pool.acquire() as connection:
        yield connection

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "ODG Python Backend API", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "database": "connected" if pool else "disconnected"}

@app.post("/api/login", response_model=LoginResponse)
async def login(request: LoginRequest, db: asyncpg.Connection = Depends(get_db)):
    """
    User login endpoint
    
    !!! SECURITY WARNING: This implementation uses plain text password comparison
    which is a major security risk. In production, always use proper password
    hashing (e.g., bcrypt) and secure comparison methods.
    """
    print(f"Received login attempt with: code={request.code}, password={request.password}")
    
    try:
        query = """
        SELECT code, name_1, ic_wht, ic_shelf 
        FROM erp_user 
        WHERE code = $1 AND password = $2
        """
        result = await db.fetchrow(query, request.code, request.password)
        
        if result:
            user_data = {
                "code": result["code"],
                "name_1": result["name_1"],
                "ic_wht": result["ic_wht"],
                "ic_shelf": result["ic_shelf"]
            }
            print(f"User logged in: Code={result['code']}, Name={result['name_1']}")
            return LoginResponse(
                success=True,
                message="Login successful",
                user=user_data
            )
        else:
            print(f"Login failed: Invalid credentials for code {request.code}")
            raise HTTPException(status_code=401, detail="Invalid credentials")
            
    except Exception as e:
        print(f"Error during login: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.get("/api/pos-products")
async def get_pos_products(limit: int = 30, offset: int = 0):
    """
    API endpoint to get products for POS with pagination.
    Note: This query makes assumptions about table (ic_master) and column names (sale_price_1).
    This should be verified against the actual database schema.
    """
    global pool
    
    # If database is not available, return mock data
    if not pool:
        print("Database not available, returning mock data")
        mock_products = []
        for i in range(min(limit, 20)):  # Return at most 20 mock products
            mock_products.append({
                "item_code": f"ITEM{i+offset:03d}",
                "item_name": f"Product {i+offset}",
                "unit_code": "PCS",
                "price": 100.0 + (i * 10),
                "stock_quantity": 50 - i,
                "image": "/image/exam.jpg"
            })
        return mock_products
    
    # If database is available, fetch real data
    try:
        async with pool.acquire() as connection:
            query = """
            SELECT 
                item.code AS item_code, 
                item.name_1 AS item_name, 
                item.unit_code_1 AS unit_code,
                item.sale_price_1 AS price,
                COALESCE(stock.balance_qty, 0) AS stock_quantity,
                '/image/exam.jpg' AS image -- Placeholder image as requested
            FROM 
                ic_master AS item
            LEFT JOIN 
                sml_ic_function_stock_balance_warehouse_location(CURRENT_DATE, item.code, '1301', '') AS stock 
            ON 
                item.code = stock.ic_code
            WHERE 
                item.active_status = 0 -- Assuming 0 means active
            ORDER BY 
                item.code ASC
            LIMIT $1 OFFSET $2;
            """
            rows = await connection.fetch(query, limit, offset)
            return [dict(row) for row in rows]
    except Exception as e:
        print(f"Error fetching products for POS: {e}")
        # Return mock data when database query fails
        mock_products = []
        for i in range(min(limit, 20)):  # Return at most 20 mock products
            mock_products.append({
                "item_code": f"ITEM{i+offset:03d}",
                "item_name": f"Product {i+offset}",
                "unit_code": "PCS",
                "price": 100.0 + (i * 10),
                "stock_quantity": 50 - i,
                "image": "/image/exam.jpg"
            })
        return mock_products

@app.get("/api/units", response_model=List[str])
async def get_units():
    """
    API endpoint to get all unique unit codes (categories).
    """
    global pool
    if not pool:
        print("Database not available, returning mock units")
        return ["PCS", "BOX", "SET"]
        
    try:
        async with pool.acquire() as connection:
            query = """
            SELECT DISTINCT unit_code_1 
            FROM ic_master 
            WHERE unit_code_1 IS NOT NULL AND unit_code_1 <> ''
            ORDER BY unit_code_1 ASC;
            """
            rows = await connection.fetch(query)
            return [row['unit_code_1'] for row in rows]
    except Exception as e:
        print(f"Error fetching units: {e}")
        return ["PCS", "BOX", "SET"] # Fallback mock data

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)