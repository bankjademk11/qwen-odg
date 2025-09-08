from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import psycopg2
import psycopg2.pool
from datetime import datetime, date
import os

# Database connection configuration
DATABASE_CONFIG = {
    "host": "183.182.125.245",
    "port": 5432,
    "database": "odg_test",
    "user": "postgres",
    "password": "od@2022"
}

app = FastAPI(
    title="ODG Backend API", 
    description="Python FastAPI backend for ODG POS system",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:3000"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global connection pool
connection_pool = None

@app.on_event("startup")
async def startup_event():
    global connection_pool
    try:
        print("Starting up... Creating database connection pool")
        connection_pool = psycopg2.pool.SimpleConnectionPool(
            1, 20,  # min and max connections
            **DATABASE_CONFIG
        )
        print("Database connection pool created successfully")
    except Exception as e:
        print(f"Warning: Could not connect to database: {e}")
        print("Server will start without database connection")
        connection_pool = None

@app.on_event("shutdown")
async def shutdown_event():
    global connection_pool
    if connection_pool:
        print("Shutting down... Closing database connection pool")
        connection_pool.closeall()

# Pydantic models for request/response
class LoginRequest(BaseModel):
    code: str
    password: str

class LoginResponse(BaseModel):
    success: bool
    message: str
    user: Optional[dict] = None

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "ODG Python Backend API", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "database": "connected" if connection_pool else "disconnected"}

@app.post("/api/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    User login endpoint
    
    !!! SECURITY WARNING: This implementation uses plain text password comparison
    which is a major security risk. In production, always use proper password
    hashing (e.g., bcrypt) and secure comparison methods.
    """
    print(f"Received login attempt with: code={request.code}, password={request.password}")
    
    if not connection_pool:
        raise HTTPException(status_code=503, detail="Database not available")
    
    connection = None
    try:
        connection = connection_pool.getconn()
        cursor = connection.cursor()
        
        query = """
        SELECT code, name_1, ic_wht, ic_shelf 
        FROM erp_user 
        WHERE code = %s AND password = %s
        """
        cursor.execute(query, (request.code, request.password))
        result = cursor.fetchone()
        
        if result:
            user_data = {
                "code": result[0],
                "name_1": result[1],
                "ic_wht": result[2],
                "ic_shelf": result[3]
            }
            print(f"User logged in: Code={result[0]}, Name={result[1]}")
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
    finally:
        if connection:
            connection_pool.putconn(connection)

@app.get("/api/transactions")
async def get_transactions():
    """Get transaction data"""
    if not connection_pool:
        raise HTTPException(status_code=503, detail="Database not available")
    
    connection = None
    try:
        connection = connection_pool.getconn()
        cursor = connection.cursor()
        
        query = """
        SELECT item_code, item_name, qty, unit_code, trans_flag 
        FROM ic_trans_detail 
        LIMIT 20
        """
        cursor.execute(query)
        results = cursor.fetchall()
        
        # Convert to list of dictionaries
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in results]
        
    except Exception as e:
        print(f"Error executing query: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if connection:
            connection_pool.putconn(connection)

@app.get("/api/analysis-data")
async def get_analysis_data(
    doc_date: Optional[str] = None,
    wh_code: Optional[str] = None,
    user_wh_code: Optional[str] = None,
    limit: int = 20,
    offset: int = 0
):
    """Get analysis data for inventory"""
    if not connection_pool:
        raise HTTPException(status_code=503, detail="Database not available")
    
    connection = None
    try:
        connection = connection_pool.getconn()
        cursor = connection.cursor()
        
        current_date = f"'{doc_date}'" if doc_date else 'CURRENT_DATE'
        previous_date = f"'{doc_date}'::date - 1" if doc_date else 'CURRENT_DATE - 1'
        
        # Use user's warehouse or default to '1301' for main data
        user_warehouse = user_wh_code if user_wh_code else '1301'
        
        # Use selected warehouse for comparison or default to '1302'
        compare_warehouse = wh_code if wh_code else '1302'
        
        # Check if there are sales for the date
        sales_check_query = f"SELECT 1 FROM ic_trans_detail WHERE doc_date = {current_date} LIMIT 1"
        cursor.execute(sales_check_query)
        sales_check_result = cursor.fetchone()
        
        if not sales_check_result:
            return []
        
        query = f"""
        WITH StockBalances AS (
            SELECT ic_code, ic_name, ic_unit_code, warehouse, balance_qty AS balance_qty_start
            FROM sml_ic_function_stock_balance_warehouse_location({previous_date}, '', %s, %s)
            WHERE balance_qty > 0
        ),
        SalesData AS (
            SELECT item_code, SUM(qty) AS sale_qty
            FROM ic_trans_detail
            WHERE trans_flag IN (44) AND doc_date = {current_date} AND wh_code = %s
            GROUP BY item_code
        )
        SELECT
            {current_date} as doc_date, a.ic_code as item_code, a.ic_name as item_name, a.ic_unit_code as unit_code,
            round(a.balance_qty_start, 2) as balance_qty_start, COALESCE(b.sale_qty, 0) AS sale_qty,
            (SELECT round(balance_qty, 2) FROM sml_ic_function_stock_balance_warehouse_location({current_date}, a.ic_code, %s, %s)) AS balance_qty,
            (SELECT COALESCE(round(balance_qty, 2), 0) FROM sml_ic_function_stock_balance_warehouse_location({current_date}, a.ic_code, %s, %s)) AS balance_qty_compare
        FROM StockBalances a
        LEFT JOIN SalesData b ON a.ic_code = b.item_code
        ORDER BY a.ic_code ASC
        LIMIT %s OFFSET %s
        """
        
        # Parameters for the query:
        # 1. user_warehouse for StockBalances CTE
        # 2. location code for user warehouse
        # 3. user_warehouse for SalesData WHERE clause
        # 4. user_warehouse for balance_qty subquery
        # 5. location code for user warehouse
        # 6. compare_warehouse for balance_qty_compare subquery
        # 7. location code for compare warehouse
        # 8. limit
        # 9. offset
        
        user_location_code = user_warehouse + '01' if len(user_warehouse) >= 4 else '130101'
        compare_location_code = compare_warehouse + '01' if len(compare_warehouse) >= 4 else '130101'
        cursor.execute(query, (
            user_warehouse, user_location_code,
            user_warehouse,
            user_warehouse, user_location_code,
            compare_warehouse, compare_location_code,
            limit, offset
        ))
        results = cursor.fetchall()
        
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in results]
        
    except Exception as e:
        print(f"Error executing analysis query: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if connection:
            connection_pool.putconn(connection)

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

@app.get("/api/generate-transfer-no")
async def generate_transfer_no():
    """Generate new transfer number with format FR{YYMM}{sequential}"""
    if not connection_pool:
        raise HTTPException(status_code=503, detail="Database not available")
    
    connection = None
    try:
        connection = connection_pool.getconn()
        cursor = connection.cursor()
        
        query = """
        WITH last_doc AS (
            SELECT max(doc_no) AS max_doc
            FROM ic_trans
            WHERE doc_format_code = 'FR'
              AND trans_flag = 124
              AND to_char(doc_date, 'yyyy-mm') = to_char(current_date, 'yyyy-mm')
        )
        SELECT 
            CASE 
                WHEN max_doc IS NULL 
                    THEN 'FR' || to_char(current_date, 'YYMM') || '0001'
                ELSE 'FR' || to_char(current_date, 'YYMM') || 
                     lpad((right(max_doc, 4)::int + 1)::text, 4, '0')
            END AS new_doc_no
        FROM last_doc
        """
        
        cursor.execute(query)
        result = cursor.fetchone()
        
        if result:
            return {"transfer_no": result[0]}
        else:
            raise HTTPException(status_code=500, detail="Failed to generate transfer number")
            
    except Exception as e:
        print(f"Error generating transfer number: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if connection:
            connection_pool.putconn(connection)

@app.post("/api/transfers")
async def create_transfer(request: TransferRequest):
    """Create a new transfer"""
    if not connection_pool:
        raise HTTPException(status_code=503, detail="Database not available")
    
    connection = None
    try:
        connection = connection_pool.getconn()
        connection.autocommit = False
        cursor = connection.cursor()
        
        print(f"Received transfer payload: {request.dict()}")
        
        doc_date = datetime.now()
        doc_time = doc_date.strftime("%H:%M")
        
        # Insert header
        trans_header_query = """
        INSERT INTO ic_trans (
            trans_type, trans_flag, doc_date, doc_no, doc_ref, doc_ref_date, 
            branch_code, project_code, sale_code, remark, doc_time, doc_format_code, 
            wh_from, location_from, wh_to, location_to, creator_code, 
            create_datetime, last_editor_code, lastedit_datetime
        ) VALUES (
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
        """
        
        cursor.execute(trans_header_query, (
            3, 124, doc_date, request.transfer_no, request.creator, doc_date, 
            '00', '', request.creator, f'Web: {request.transfer_no}', doc_time, 'FR',
            request.wh_from, request.location_from, request.wh_to, request.location_to, 
            request.creator, doc_date, request.creator, doc_date
        ))
        
        # Insert details
        for item in request.details:
            print(f"Processing item: {item.dict()}")
            trans_detail_query = """
            INSERT INTO ic_trans_detail (
                trans_type, trans_flag, doc_date, doc_no, item_code, item_name, 
                unit_code, qty, branch_code, wh_code, shelf_code, wh_code_2, 
                shelf_code_2, stand_value, divide_value, doc_time, sale_code, 
                create_datetime, last_editor_code, lastedit_datetime
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            """
            
            cursor.execute(trans_detail_query, (
                3, 124, doc_date, request.transfer_no, item.item_code, item.item_name,
                item.unit_code, item.quantity, '00', item.wh_code, item.shelf_code,
                item.wh_code_2, item.shelf_code_2, 1, 1, doc_time, request.creator,
                doc_date, request.creator, doc_date
            ))
        
        connection.commit()
        
        # Get result
        result_query = """
        SELECT doc_no AS transfer_no, doc_no AS id, 
               to_char(create_datetime, 'YYYY-MM-DD HH24:MI:SS') AS doc_date_time, 
               creator_code AS creator, 
               (SELECT SUM(qty) FROM ic_trans_detail WHERE doc_no = %s) AS quantity 
        FROM ic_trans WHERE doc_no = %s
        """
        cursor.execute(result_query, (request.transfer_no, request.transfer_no))
        result = cursor.fetchone()
        
        if result:
            columns = [desc[0] for desc in cursor.description]
            return dict(zip(columns, result))
        else:
            raise HTTPException(status_code=500, detail="Failed to create transfer")
            
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Error during transaction: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during transaction")
    finally:
        if connection:
            connection_pool.putconn(connection)

@app.get("/api/transfers/{transfer_id}")
async def get_transfer_details(transfer_id: str):
    """Get transfer details by ID"""
    if not connection_pool:
        raise HTTPException(status_code=503, detail="Database not available")
    
    connection = None
    try:
        connection = connection_pool.getconn()
        cursor = connection.cursor()
        
        # Get header with warehouse and location names
        header_query = """
        SELECT t1.*, 
               to_char(t1.create_datetime, 'YYYY-MM-DD HH24:MI:SS') AS doc_date_time_formatted,
               COALESCE(u1.name_1, t1.creator_code) AS creator_name,
               wh_from.name_1 AS wh_from_name,
               wh_to.name_1 AS wh_to_name,
               loc_from.name_1 AS location_from_name,
               loc_to.name_1 AS location_to_name
        FROM ic_trans t1
        LEFT JOIN erp_user u1 ON t1.creator_code = u1.code
        LEFT JOIN ic_warehouse wh_from ON t1.wh_from = wh_from.code
        LEFT JOIN ic_warehouse wh_to ON t1.wh_to = wh_to.code
        LEFT JOIN ic_shelf loc_from ON t1.location_from = loc_from.code AND t1.wh_from = loc_from.whcode
        LEFT JOIN ic_shelf loc_to ON t1.location_to = loc_to.code AND t1.wh_to = loc_to.whcode
        WHERE t1.doc_no = %s
        """
        cursor.execute(header_query, (transfer_id,))
        header_result = cursor.fetchone()
        
        if not header_result:
            raise HTTPException(status_code=404, detail="Transfer not found")
        
        header_columns = [desc[0] for desc in cursor.description]
        header = dict(zip(header_columns, header_result))
        
        # Get details
        detail_query = """
        SELECT item_code, item_name, unit_code, qty, wh_code, shelf_code, wh_code_2, shelf_code_2 
        FROM ic_trans_detail WHERE doc_no = %s ORDER BY item_code
        """
        cursor.execute(detail_query, (transfer_id,))
        detail_results = cursor.fetchall()
        
        detail_columns = [desc[0] for desc in cursor.description]
        details = [dict(zip(detail_columns, row)) for row in detail_results]
        
        total_quantity = sum(float(item['qty']) for item in details)
        
        return {**header, "quantity": total_quantity, "details": details}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error executing query for transfer {transfer_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if connection:
            connection_pool.putconn(connection)

@app.get("/api/transfers")
async def get_transfers(date: Optional[str] = None):
    """Get list of transfers with status information"""
    if not connection_pool:
        raise HTTPException(status_code=503, detail="Database not available")
    
    connection = None
    try:
        connection = connection_pool.getconn()
        cursor = connection.cursor()
        
        # Use the improved query from senior colleague
        if date:
            query = """
            SELECT a.doc_date, a.doc_no as transfer_no, a.doc_no as id, a.creator_code,
                   u.name_1 as creator_name, u.name_1 as creator,
                   (SELECT sum(qty) FROM ic_trans_detail WHERE doc_no = a.doc_no) as all_qty,
                   (SELECT sum(qty) FROM ic_trans_detail WHERE doc_no = a.doc_no) as quantity,
                   CASE WHEN a.doc_success = 0 THEN 'ລໍຖ້າໂອນ' 
                        WHEN a.doc_success = 1 THEN 'ໂອນສຳເລັດ' 
                        ELSE '' END AS status_name,
                   to_char(a.create_datetime, 'YYYY-MM-DD HH24:MI:SS') as doc_date_time,
                   wh_from.name_1 as wh_from_name, wh_to.name_1 as wh_to_name,
                   loc_from.name_1 as location_from_name, loc_to.name_1 as location_to_name,
                   a.wh_from, a.wh_to, a.location_from, a.location_to
            FROM ic_trans a
            LEFT JOIN erp_user u ON u.code = a.creator_code
            LEFT JOIN ic_warehouse wh_from ON a.wh_from = wh_from.code
            LEFT JOIN ic_warehouse wh_to ON a.wh_to = wh_to.code
            LEFT JOIN ic_shelf loc_from ON a.location_from = loc_from.code AND a.wh_from = loc_from.whcode
            LEFT JOIN ic_shelf loc_to ON a.location_to = loc_to.code AND a.wh_to = loc_to.whcode
            WHERE a.trans_flag = 124 AND a.doc_date = %s
            ORDER BY a.doc_date, a.doc_no
            """
            query_params = [date]
        else:
            query = """
            SELECT a.doc_date, a.doc_no as transfer_no, a.doc_no as id, a.creator_code,
                   u.name_1 as creator_name, u.name_1 as creator,
                   (SELECT sum(qty) FROM ic_trans_detail WHERE doc_no = a.doc_no) as all_qty,
                   (SELECT sum(qty) FROM ic_trans_detail WHERE doc_no = a.doc_no) as quantity,
                   CASE WHEN a.doc_success = 0 THEN 'ລໍຖ້າໂອນ' 
                        WHEN a.doc_success = 1 THEN 'ໂອນສຳເລັດ' 
                        ELSE '' END AS status_name,
                   to_char(a.create_datetime, 'YYYY-MM-DD HH24:MI:SS') as doc_date_time,
                   wh_from.name_1 as wh_from_name, wh_to.name_1 as wh_to_name,
                   loc_from.name_1 as location_from_name, loc_to.name_1 as location_to_name,
                   a.wh_from, a.wh_to, a.location_from, a.location_to
            FROM ic_trans a
            LEFT JOIN erp_user u ON u.code = a.creator_code
            LEFT JOIN ic_warehouse wh_from ON a.wh_from = wh_from.code
            LEFT JOIN ic_warehouse wh_to ON a.wh_to = wh_to.code
            LEFT JOIN ic_shelf loc_from ON a.location_from = loc_from.code AND a.wh_from = loc_from.whcode
            LEFT JOIN ic_shelf loc_to ON a.location_to = loc_to.code AND a.wh_to = loc_to.whcode
            WHERE a.trans_flag = 124
            ORDER BY a.doc_date DESC, a.doc_no DESC
            """
            query_params = []
        
        cursor.execute(query, query_params)
        results = cursor.fetchall()
        
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in results]
        
    except Exception as e:
        print(f"Error executing transfers query: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if connection:
            connection_pool.putconn(connection)

class UpdateTransferRequest(BaseModel):
    """Model for updating transfer request"""
    wh_from: str
    location_from: str
    wh_to: str
    location_to: str

@app.put("/api/transfers/{transfer_id}")
async def update_transfer(transfer_id: str, request: UpdateTransferRequest):
    """Update transfer details"""
    if not connection_pool:
        raise HTTPException(status_code=503, detail="Database not available")
    
    connection = None
    try:
        connection = connection_pool.getconn()
        connection.autocommit = False
        cursor = connection.cursor()
        
        # Update transfer header
        update_query = """
        UPDATE ic_trans 
        SET wh_from = %s, location_from = %s, wh_to = %s, location_to = %s,
            lastedit_datetime = CURRENT_TIMESTAMP
        WHERE doc_no = %s
        """
        cursor.execute(update_query, (
            request.wh_from, 
            request.location_from, 
            request.wh_to, 
            request.location_to, 
            transfer_id
        ))
        
        # Check if any row was updated
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Transfer not found")
        
        connection.commit()
        
        # Return updated transfer
        return {"message": "Transfer updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        if connection:
            connection.rollback()
        print(f"Error updating transfer {transfer_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if connection:
            connection_pool.putconn(connection)

@app.get("/api/warehouses")
async def get_warehouses():
    """Get list of warehouses"""
    if not connection_pool:
        raise HTTPException(status_code=503, detail="Database not available")
    
    connection = None
    try:
        connection = connection_pool.getconn()
        cursor = connection.cursor()
        
        query = """
        SELECT code, name_1 as name
        FROM ic_warehouse 
        ORDER BY code
        """
        cursor.execute(query)
        results = cursor.fetchall()
        
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in results]
        
    except Exception as e:
        print(f"Error fetching warehouses: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if connection:
            connection_pool.putconn(connection)

@app.get("/api/locations/{warehouse}")
async def get_locations(warehouse: str):
    """Get locations for a specific warehouse"""
    if not connection_pool:
        raise HTTPException(status_code=503, detail="Database not available")
    
    connection = None
    try:
        connection = connection_pool.getconn()
        cursor = connection.cursor()
        
        query = """
        SELECT code, name_1 as name
        FROM ic_shelf 
        WHERE whcode = %s
        ORDER BY code
        """
        cursor.execute(query, (warehouse,))
        results = cursor.fetchall()
        
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in results]
        
    except Exception as e:
        print(f"Error fetching locations for warehouse {warehouse}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if connection:
            connection_pool.putconn(connection)

@app.get("/api/destination-warehouses")
async def get_destination_warehouses():
    """Get destination warehouses"""
    if not connection_pool:
        raise HTTPException(status_code=503, detail="Database not available")
    
    connection = None
    try:
        connection = connection_pool.getconn()
        cursor = connection.cursor()
        
        query = """
        SELECT code, name_1 as name
        FROM ic_warehouse 
        ORDER BY code
        """
        cursor.execute(query)
        results = cursor.fetchall()
        
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in results]
        
    except Exception as e:
        print(f"Error fetching destination warehouses: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if connection:
            connection_pool.putconn(connection)

@app.get("/api/destination-locations/{warehouse}")
async def get_destination_locations(warehouse: str):
    """Get destination locations for a specific warehouse"""
    if not connection_pool:
        raise HTTPException(status_code=503, detail="Database not available")
    
    connection = None
    try:
        connection = connection_pool.getconn()
        cursor = connection.cursor()
        
        query = """
        SELECT code, name_1 as name
        FROM ic_shelf 
        WHERE whcode = %s
        ORDER BY code
        """
        cursor.execute(query, (warehouse,))
        results = cursor.fetchall()
        
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in results]
        
    except Exception as e:
        print(f"Error fetching destination locations for warehouse {warehouse}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    finally:
        if connection:
            connection_pool.putconn(connection)

@app.get("/api/units", response_model=List[str])
async def get_units():
    """
    API endpoint to get all unique unit codes (categories).
    """
    if not connection_pool:
        print("Database not available, returning mock units")
        return ["PCS", "BOX", "SET"]
    
    connection = None
    try:
        connection = connection_pool.getconn()
        cursor = connection.cursor()
        
        # Using unit_code_1 from ic_master as it's the master table for items
        query = """
        SELECT DISTINCT unit_code_1 
        FROM ic_master 
        WHERE unit_code_1 IS NOT NULL AND unit_code_1 <> ''
        ORDER BY unit_code_1 ASC;
        """
        cursor.execute(query)
        results = cursor.fetchall()
        
        # The result from fetchall is a list of tuples, e.g., [('PCS',), ('BOX',)]
        return [row[0] for row in results]
        
    except Exception as e:
        print(f"Error fetching units: {e}")
        return ["PCS", "BOX", "SET"] # Fallback mock data
    finally:
        if connection:
            connection_pool.putconn(connection)

@app.get("/api/pos-products")
async def get_pos_products(limit: int = 30, offset: int = 0):
    """
    API endpoint to get products for POS with pagination.
    This endpoint fetches product data specifically for the POS page.
    """
    if not connection_pool:
        # Return mock data when database is not available
        print("Database not available, returning mock data for POS")
        mock_products = []
        for i in range(min(limit, 20)):  # Return at most 20 mock products
            mock_products.append({
                "item_code": f"ITEM{i+offset:03d}",
                "item_name": f"สินค้า {i+offset}",
                "unit_code": "PCS",
                "price": 100.0 + (i * 10),
                "stock_quantity": 50 - i,
                "image": "/image/exam.jpg"
            })
        return mock_products
    
    connection = None
    try:
        connection = connection_pool.getconn()
        cursor = connection.cursor()
        
        # Query to fetch products for POS - using the same approach as analysis-data endpoint
        query = """
        SELECT 
            ic_code AS item_code,
            ic_name AS item_name,
            ic_unit_code AS unit_code,
            0 AS price,  -- We'll set a default price of 0 for now
            balance_qty AS stock_quantity,
            '/image/exam.jpg' AS image
        FROM sml_ic_function_stock_balance_warehouse_location(CURRENT_DATE, '', '1301', '')
        WHERE balance_qty > 0
        ORDER BY ic_code
        LIMIT %s OFFSET %s
        """
        cursor.execute(query, (limit, offset))
        results = cursor.fetchall()
        
        # Convert to list of dictionaries
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in results]
        
    except Exception as e:
        print(f"Error fetching POS products: {e}")
        # Return mock data when database query fails
        mock_products = []
        for i in range(min(limit, 20)):  # Return at most 20 mock products
            mock_products.append({
                "item_code": f"ITEM{i+offset:03d}",
                "item_name": f"สินค้า {i+offset}",
                "unit_code": "PCS",
                "price": 100.0 + (i * 10),
                "stock_quantity": 50 - i,
                "image": "/image/exam.jpg"
            })
        return mock_products
    finally:
        if connection:
            connection_pool.putconn(connection)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)