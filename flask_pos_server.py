from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import os

app = Flask(__name__)

# Configure CORS
CORS(app, origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:3000"])

# Database connection configuration
DATABASE_CONFIG = {
    "host": "183.182.125.245",
    "port": 5432,
    "database": "odg_test",
    "user": "postgres",
    "password": "od@2022"
}

def get_connection():
    """Create a new database connection"""
    try:
        conn = psycopg2.connect(**DATABASE_CONFIG)
        return conn
    except Exception as e:
        print(f"Error connecting to database: {e}")
        return None

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'flask-pos-api'})

@app.route('/category', methods=['GET'])
def api_pos_category():
    """Get product categories for POS"""
    # รับค่าพารามิเตอร์จาก query string
    whcode = request.args.get('whcode', '1301')  # ค่า default
    loccode = request.args.get('loccode', '01')  # ค่า default
    
    conn = get_connection()
    if not conn:
        return jsonify({'success': False, 'error': 'Database connection failed'}), 500
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""SELECT f.name_1, COUNT(a.ic_code) as count
                       FROM sml_ic_function_stock_balance_warehouse_location('2099-12-31', '', %s, %s) a
                       LEFT JOIN ic_inventory b ON b.code = a.ic_code
                       LEFT JOIN ic_inventory_barcode c ON c.ic_code = b.code
                       LEFT JOIN ic_group d ON d.code = b.group_main
                       LEFT JOIN ic_group_sub e ON e.code = b.group_sub
                       LEFT JOIN ic_category f ON f.code = b.item_category 
                       WHERE a.balance_qty > 0 AND f.name_1 NOT IN ('ຂອງແຖມ')
                       GROUP BY f.name_1
                       ORDER BY f.name_1""", (whcode, loccode))

        result = cur.fetchall()
        return jsonify({'list': result}), 200

    except Exception as e:
        # Log ข้อผิดพลาดสำหรับ debugging
        print(f"Error fetching categories: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.route('/product', methods=['GET'])
def api_pos_product():
    """Get products for POS"""
    # รับค่าพารามิเตอร์จาก query string
    whcode = request.args.get('whcode', '1301')  # ค่า default
    loccode = request.args.get('loccode', '01')  # ค่า default
    category = request.args.get('category', None)  # หมวดหมู่
    search = request.args.get('search', '')  # คำค้นหา
    limit = request.args.get('limit', 30)  # จำนวนรายการต่อหน้า
    offset = request.args.get('offset', 0)  # ตำแหน่งเริ่มต้น
    
    conn = get_connection()
    if not conn:
        return jsonify({'success': False, 'error': 'Database connection failed'}), 500
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # สร้าง query สำหรับดึงข้อมูลสินค้า (เวอร์ชันใหม่ตามที่ผู้ใช้ให้มา)
        query = """
            SELECT
                a.ic_code as item_code,
                a.ic_name as item_name,
                a.ic_unit_code as unit_code,
                a.balance_qty as stock_quantity,
                (SELECT url_image FROM product_image WHERE ic_code = a.ic_code AND line_number = 1) as url_image,
                COALESCE((SELECT sale_price1 FROM ic_inventory_price
                          WHERE current_date BETWEEN from_date AND to_date
                          AND currency_code ='02'
                          AND ic_code=a.ic_code
                          AND unit_code=a.ic_unit_code
                          AND cust_group_1='101'
                          ORDER BY roworder DESC LIMIT 1), 0) as price
            FROM
                sml_ic_function_stock_balance_warehouse_location('2099-12-31', '', %s, %s) a
            LEFT JOIN ic_inventory b ON b.code = a.ic_code
        """

        # Build WHERE clauses
        where_clauses = ["a.balance_qty > 0"]
        params = [whcode, loccode]

        if category and category != 'All':
            # Assuming category name is unique
            where_clauses.append("b.item_category = (SELECT code FROM ic_category WHERE name_1 = %s LIMIT 1)")
            params.append(category)

        if search:
            where_clauses.append("(a.ic_name ILIKE %s OR a.ic_code ILIKE %s)")
            params.extend([f"%{search}%", f"%{search}%"])

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)

        # Add ordering, limit, and offset
        query += " ORDER BY a.ic_name LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cur.execute(query, params)
        result = cur.fetchall()
        return jsonify({'list': result}), 200

    except Exception as e:
        # Log ข้อผิดพลาดสำหรับ debugging
        print(f"Error fetching products: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.route('/warehouse', methods=['GET'])
def api_warehouse():
    """Get list of warehouses"""
    conn = get_connection()
    if not conn:
        return jsonify({'success': False, 'error': 'Database connection failed'}), 500
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT code, name_1 as name FROM ic_warehouse ORDER BY code")
        result = cur.fetchall()
        return jsonify({'list': result}), 200

    except Exception as e:
        print(f"Error fetching warehouses: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.route('/location/<whcode>', methods=['GET'])
def api_location(whcode):
    """Get locations for a specific warehouse"""
    conn = get_connection()
    if not conn:
        return jsonify({'success': False, 'error': 'Database connection failed'}), 500
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT code, name_1 as name FROM ic_shelf WHERE whcode = %s ORDER BY code", (whcode,))
        result = cur.fetchall()
        return jsonify({'list': result}), 200

    except Exception as e:
        print(f"Error fetching locations: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.route('/customer', methods=['GET'])
def api_customer():
    """Get list of customers"""
    conn = get_connection()
    if not conn:
        return jsonify({'success': False, 'error': 'Database connection failed'}), 500
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT code, name_1 as name FROM ar_customer ORDER BY name_1")
        result = cur.fetchall()
        return jsonify({'list': result}), 200

    except Exception as e:
        print(f"Error fetching customers: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.route('/docno', methods=['GET'])
def api_docno():
    """Generate new document number"""
    conn = get_connection()
    if not conn:
        return jsonify({'success': False, 'error': 'Database connection failed'}), 500
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Query สำหรับสร้างเลขที่เอกสารใหม่
        query = """
        WITH last_doc AS (
            SELECT max(doc_no) AS max_doc
            FROM ic_trans
            WHERE doc_format_code = 'POS'
              AND trans_flag = 44
              AND to_char(doc_date, 'yyyy-mm') = to_char(current_date, 'yyyy-mm')
        )
        SELECT 
            CASE 
                WHEN max_doc IS NULL 
                    THEN 'POS' || to_char(current_date, 'YYMM') || '0001'
                ELSE 'POS' || to_char(current_date, 'YYMM') || 
                     lpad((right(max_doc, 4)::int + 1)::text, 4, '0')
            END AS new_doc_no
        FROM last_doc
        """
        
        cur.execute(query)
        result = cur.fetchone()
        return jsonify({'docno': result['new_doc_no']}), 200

    except Exception as e:
        print(f"Error generating document number: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.route('/posbilling', methods=['POST'])
def api_pos_billing():
    """Process POS billing/transaction and create corresponding financial records."""
    data = request.get_json()
    print(f"Received billing data: {data}")

    conn = get_connection()
    if not conn:
        return jsonify({'success': False, 'error': 'Database connection failed'}), 500

    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Start transaction
        conn.autocommit = False

        # --- Part 1: Insert into ic_trans and ic_trans_detail (Original Logic) ---
        doc_no = data.get('doc_no')
        doc_date = data.get('doc_date')
        customer_code = data.get('customer_code')
        total_amount = data.get('total_amount', 0)
        items = data.get('items', [])
        user_code = data.get('user_code', 'SYSTEM')
        payment_method = data.get('payment_method', 'cash') # Get payment_method, default to 'cash'

        trans_query = """
        INSERT INTO ic_trans (
            trans_type, trans_flag, doc_date, doc_no, doc_time,
            branch_code, project_code, sale_code, doc_format_code,
            cust_code, total_amount_2, creator_code, create_datetime
        ) VALUES (3, 44, %s, %s, LEFT(CAST(CURRENT_TIME AS VARCHAR), 5), %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
        """
        cur.execute(trans_query, (doc_date, doc_no, '00', '', user_code, 'POS', customer_code, total_amount, user_code))

        for item in items:
            detail_query = """
            INSERT INTO ic_trans_detail (
                trans_type, trans_flag, doc_date, doc_no, doc_time,
                item_code, item_name, unit_code, qty, price,
                sum_amount, branch_code, sale_code, creator_code, create_datetime,
                doc_date_calc, calc_flag
            ) VALUES (3, 44, %s, %s, LEFT(CAST(CURRENT_TIME AS VARCHAR), 5), %s, %s, %s, %s, %s, %s, '00', %s, %s, CURRENT_TIMESTAMP, %s, -1)
            """
            cur.execute(detail_query, (doc_date, doc_no, item['item_code'], item['item_name'], item['unit_code'], item['qty'], item['price'], item['amount'], user_code, user_code, doc_date))

            # --- DEBUGGING: SELECT and print the inserted row ---
            print(f"--- DEBUG: Checking inserted row for doc_no={doc_no}, item_code={item['item_code']} ---")
            cur.execute("SELECT * FROM ic_trans_detail WHERE doc_no = %s AND item_code = %s", (doc_no, item['item_code']))
            inserted_row = cur.fetchone()
            print(f"--- DEBUG: Fetched row: {inserted_row} ---")
            # --- END DEBUGGING ---

        # --- Part 2: Add financial records in cb_trans and cb_trans_detail (New Logic) ---
        
        sql_head = """SELECT doc_no, doc_date, total_amount_2, doc_time, cust_code, doc_format_code,
                           (SELECT COALESCE(exchange_rate_present, 0) FROM erp_currency WHERE code='02' LIMIT 1) as exchange_lak
                           FROM ic_trans WHERE doc_no=%s"""
        cur.execute(sql_head, (doc_no,))
        bill_h = cur.fetchone()

        if not bill_h:
            raise Exception(f"Failed to retrieve ic_trans record for doc_no: {doc_no}")

        CB_TRANS_TYPE = 2
        CB_TRANS_FLAG = 44
        CB_PAY_TYPE = 1
        CB_DOC_TYPE = 1
        CURRENCY_CODE_LAK = '02'

        sql_h = """
        INSERT INTO cb_trans
        (trans_type, trans_flag, doc_date, doc_no, total_amount, total_net_amount, tranfer_amount, total_amount_pay, doc_time, ap_ar_code, pay_type, doc_format_code)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cur.execute(sql_h, (
            CB_TRANS_TYPE, CB_TRANS_FLAG, bill_h["doc_date"], bill_h["doc_no"],
            bill_h["total_amount_2"], bill_h["total_amount_2"], bill_h["total_amount_2"], bill_h["total_amount_2"],
            bill_h["doc_time"], bill_h["cust_code"], CB_PAY_TYPE, bill_h["doc_format_code"]
        ))

        # --- Logic for payment method ---
        cb_bank_code = None
        cb_bank_branch = None
        if payment_method == 'transfer':
            cb_bank_code = 'BCEL001'
            cb_bank_branch = 'BCEL01'
        
        # Use doc_no for trans_number instead of a test value
        cb_trans_number = doc_no

        sum_amount_2_calculated = bill_h["exchange_lak"] * bill_h["total_amount_2"]

        sql_detail = """
        INSERT INTO cb_trans_detail
        (trans_type, trans_flag, doc_date, doc_no, trans_number, bank_code, bank_branch, exchange_rate, amount, chq_due_date, doc_type, doc_time, currency_code, sum_amount_2)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cur.execute(sql_detail, (
            CB_TRANS_TYPE, CB_TRANS_FLAG, bill_h["doc_date"], bill_h["doc_no"],
            cb_trans_number,
            cb_bank_code,
            cb_bank_branch,
            bill_h["exchange_lak"],
            bill_h["total_amount_2"],
            bill_h["doc_date"],
            CB_DOC_TYPE,
            bill_h["doc_time"],
            CURRENCY_CODE_LAK,
            sum_amount_2_calculated
        ))

        conn.commit()

        return jsonify({
            'success': True,
            'message': 'Transaction completed and financial records created successfully',
            'doc_no': doc_no
        }), 200

    except Exception as e:
        conn.rollback()
        print(f"Error processing transaction: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

import json
import time

# --- Bill Parking APIs (Local File Storage) ---
PARKED_BILLS_FILE = 'parked_bills.json'

def _read_parked_bills():
    """Helper function to read parked bills from the JSON file."""
    try:
        if os.path.exists(PARKED_BILLS_FILE):
            with open(PARKED_BILLS_FILE, 'r') as f:
                # Handle empty file case
                content = f.read()
                if not content:
                    return []
                return json.loads(content)
        return []
    except (IOError, json.JSONDecodeError):
        return []

def _write_parked_bills(bills):
    """Helper function to write parked bills to the JSON file."""
    with open(PARKED_BILLS_FILE, 'w') as f:
        json.dump(bills, f, indent=4)

@app.route('/park-bill', methods=['POST'])
def park_bill():
    """Park a bill for later retrieval."""
    data = request.get_json()
    reference_name = data.get('reference_name')
    cart_data = data.get('cart_data')
    customer_code = data.get('customer_code')
    customer_search = data.get('customer_search') # Get the customer display name

    if not reference_name or not cart_data:
        return jsonify({'success': False, 'error': 'Reference name and cart data are required'}), 400

    bills = _read_parked_bills()
    
    # Generate a unique ID (simple timestamp-based)
    new_id = int(time.time() * 1000)

    new_bill = {
        'id': new_id,
        'reference_name': reference_name,
        'cart_data': cart_data,
        'customer_code': customer_code,
        'customer_search': customer_search, # Save display name
        'created_at': time.strftime('%Y-%m-%d %H:%M:%S')
    }
    
    bills.append(new_bill)
    _write_parked_bills(bills)
    
    return jsonify({'success': True, 'message': 'Bill parked successfully'}), 201

@app.route('/parked-bills', methods=['GET'])
def get_parked_bills():
    """Get a list of all parked bills."""
    bills = _read_parked_bills()
    # Sort by most recent first
    sorted_bills = sorted(bills, key=lambda x: x.get('id', 0), reverse=True)
    
    # Prepare data for display
    display_list = []
    for bill in sorted_bills:
        try:
            created_time = time.strptime(bill['created_at'], '%Y-%m-%d %H:%M:%S')
            time_str = time.strftime('%H:%M:%S', created_time)
        except (ValueError, KeyError):
            time_str = 'N/A'

        display_list.append({
            'id': bill['id'],
            'reference_name': bill['reference_name'],
            'time': time_str,
            'cart_data': bill['cart_data'],
            'customer_code': bill.get('customer_code'),
            'customer_search': bill.get('customer_search')
        })

    return jsonify({'success': True, 'list': display_list}), 200

@app.route('/parked-bills/<int:bill_id>', methods=['DELETE'])
def delete_parked_bill(bill_id):
    """Delete a parked bill after it has been recalled."""
    bills = _read_parked_bills()
    
    bill_found = any(bill['id'] == bill_id for bill in bills)
    if not bill_found:
        return jsonify({'success': False, 'error': 'Bill not found'}), 404
        
    new_bills = [bill for bill in bills if bill['id'] != bill_id]
    _write_parked_bills(new_bills)
    
    return jsonify({'success': True, 'message': 'Parked bill deleted'}), 200


# The @app.before_request and @app.after_request for CORS have been removed 
# to rely solely on the Flask-Cors extension, which is already configured.

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)