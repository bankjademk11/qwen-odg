from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import os

import os

app = Flask(__name__)

# Configure CORS
frontend_ip_url = os.getenv("VITE_FRONTEND_IP_URL")
allowed_origins = [
    "http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176", "http://localhost:3000"
]
if frontend_ip_url:
    allowed_origins.append(frontend_ip_url)

CORS(app, origins="*")

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
    image_status = request.args.get('image_status', None) # Filter for image status
    
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

        if image_status == 'missing':
            where_clauses.append("((SELECT url_image FROM product_image WHERE ic_code = a.ic_code AND line_number = 1) IS NULL OR (SELECT url_image FROM product_image WHERE ic_code = a.ic_code AND line_number = 1) = '')")

        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)

        # Add ordering, limit, and offset
        query += " ORDER BY a.ic_name LIMIT %s OFFSET %s"
        params.extend([limit, offset])  # pyright: ignore[reportArgumentType]

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

        # --- Part 1: Insert into ic_trans and ic_trans_detail ---
        doc_no = data.get('doc_no')
        doc_date = data.get('doc_date')
        customer_code = data.get('customer_code')
        total_amount = data.get('total_amount', 0)
        items = data.get('items', [])
        
        # Get user-specific data from the payload
        user_code = data.get('user_code', 'SYSTEM')
        wh_code = data.get('wh_code', '1301') # Use user's warehouse or default
        shelf_code = data.get('shelf_code', '01') # Use user's shelf or default
        branch_code = data.get('branch_code', '00') # Use user's branch or default
        payment_method = data.get('payment_method', 'cash') # Get payment_method, default to 'cash'

        # Fetch side_code and department_code from erp_user based on user_code
        user_info_query = "SELECT side, department FROM erp_user WHERE code = %s LIMIT 1"
        cur.execute(user_info_query, (user_code,))
        user_info_result = cur.fetchone()
        
        side_code = user_info_result['side'] if user_info_result and user_info_result['side'] is not None else ''
        department_code = user_info_result['department'] if user_info_result and user_info_result['department'] is not None else ''

        # Extract additional fields for ic_trans from payload
        remark = data.get('remark', '')

        # Define constants for ic_trans
        INQUIRY_TYPE_IC_TRANS = 1
        VAT_TYPE_IC_TRANS = 2
        VAT_RATE_IC_TRANS = 10
        CURRENCY_CODE_IC_TRANS = '02' # LAK

        # Fetch exchange rate for LAK (code '02')
        exchange_rate_query = "SELECT COALESCE(exchange_rate_present, 0) FROM erp_currency WHERE code='02' LIMIT 1"
        cur.execute(exchange_rate_query)
        exchange_rate_result = cur.fetchone()
        exchange_rate_lak = float(exchange_rate_result['coalesce']) if exchange_rate_result and exchange_rate_result['coalesce'] is not None else 0.0015673 # Default to example rate if not found

        # Calculate total amounts in primary currency (Baht)
        total_amount_lak = float(total_amount) # total_amount from payload is in LAK
        total_amount_baht = total_amount_lak * exchange_rate_lak
        total_value_baht = total_amount_baht # Assuming total_value and total_amount are the same for now

        # Apply rounding to 2 decimal places for ic_trans monetary values
        total_amount_lak = round(total_amount_lak, 2)
        total_amount_baht = round(total_amount_baht, 2)
        total_value_baht = round(total_value_baht, 2)

        # --- ic_trans INSERT ---
        trans_query = """
        INSERT INTO ic_trans (
            trans_type, trans_flag, doc_date, doc_no, doc_time,
            branch_code, project_code, sale_code, doc_format_code,
            cust_code, total_amount_2, creator_code, create_datetime,
            side_code, department_code, inquiry_type, vat_type, vat_rate,
            currency_code, exchange_rate, total_value, total_amount, remark, cashier_code,
            total_value_2
        ) VALUES (
            2, 44, %s, %s, LEFT(CAST(CURRENT_TIME AS VARCHAR), 5),
            %s, %s, %s, %s,
            %s, %s, %s, CURRENT_TIMESTAMP,
            %s, %s, %s, %s, %s,
            %s, %s, %s, %s, %s, %s,
            %s
        )
        """
        cur.execute(trans_query, (
            doc_date, doc_no,
            branch_code, '', user_code, 'POS',
            customer_code, total_amount_lak, user_code,
            side_code, department_code, INQUIRY_TYPE_IC_TRANS, VAT_TYPE_IC_TRANS, VAT_RATE_IC_TRANS,
            CURRENCY_CODE_IC_TRANS, exchange_rate_lak, total_value_baht, total_amount_baht, remark, user_code,
            total_amount_lak
        ))

        # --- ic_trans_detail INSERT ---
        for idx, item in enumerate(items):
            item_price_lak = float(item['price'])
            item_amount_lak = float(item['amount'])
            item_price_baht = item_price_lak * exchange_rate_lak
            item_sum_amount_baht = item_amount_lak * exchange_rate_lak

            # Apply rounding to 2 decimal places for monetary values
            item_price_lak = round(item_price_lak, 2)
            item_amount_lak = round(item_amount_lak, 2)
            item_price_baht = round(item_price_baht, 2)
            item_sum_amount_baht = round(item_sum_amount_baht, 2)

            # Fetch average_cost for the item
            average_cost_query = "SELECT COALESCE(average_cost, 0) FROM ic_inventory WHERE code = %s LIMIT 1"
            cur.execute(average_cost_query, (item['item_code'],))
            average_cost_result = cur.fetchone()
            fetched_average_cost = float(average_cost_result['coalesce']) if average_cost_result and average_cost_result['coalesce'] is not None else 0.0

            item_qty = float(item['qty'])
            calculated_sum_of_cost = fetched_average_cost * item_qty

            # Apply rounding to 4 decimal places for cost values
            fetched_average_cost = round(fetched_average_cost, 4)
            calculated_sum_of_cost = round(calculated_sum_of_cost, 4)

            detail_query = """
            INSERT INTO ic_trans_detail(
                trans_type,trans_flag,doc_date,doc_no,cust_code,inquiry_type,
                item_code,item_name,unit_code,qty,
                price,sum_amount,
                price_2,sum_amount_2,
                discount,discount_amount,
                average_cost,sum_of_cost,
                average_cost_1,sum_of_cost_1,
                price_exclude_vat,sum_amount_exclude_vat,
                line_number,branch_code,wh_code,shelf_code,stand_value,divide_value,calc_flag,set_ref_price,item_type,vat_type,doc_time,is_get_price,
                doc_date_calc,doc_time_calc,
                sale_code,sale_group, creator_code, create_datetime
            ) VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s, -- price, sum_amount (Baht)
                %s, %s, -- price_2, sum_amount_2 (Kip)
                '', 0,
                %s, %s, -- average_cost, sum_of_cost
                %s, %s, -- average_cost_1, sum_of_cost_1
                %s, %s, -- price_exclude_vat, sum_amount_exclude_vat (Baht)
                                %s, %s, %s, %s, 1, 1, -1, 0, 0, %s, LEFT(CAST(CURRENT_TIME AS VARCHAR), 5), 0,
                                %s, LEFT(CAST(CURRENT_TIME AS VARCHAR), 5),
                                %s, '', %s, CURRENT_TIMESTAMP
                            )
                            """
                
            params = (
                2, 44, doc_date, doc_no, customer_code, 1,
                item['item_code'], item['item_name'], item['unit_code'], item_qty,
                item_price_baht, item_sum_amount_baht, # price, sum_amount
                item_price_lak, item_amount_lak, # price_2, sum_amount_2
                fetched_average_cost, calculated_sum_of_cost, # average_cost, sum_of_cost
                fetched_average_cost, calculated_sum_of_cost, # average_cost_1, sum_of_cost_1
                item_price_baht, item_sum_amount_baht, # price_exclude_vat, sum_amount_exclude_vat
                idx + 1, branch_code, wh_code, shelf_code, # line_number, branch, wh, shelf
                2, # vat_type
                doc_date, # doc_date_calc
                user_code, # sale_code
                user_code # creator_code
            )
            cur.execute(detail_query, params)

        # --- Part 1.5: Insert into ic_trans_shipment ---
        shipment_query = """
        INSERT INTO ic_trans_shipment (
            doc_no, doc_date, cust_code, create_date_time_now
        ) VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
        """
        cur.execute(shipment_query, (doc_no, doc_date, customer_code))

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

        total_amount_cb_lak = bill_h["total_amount_2"] # Total amount in Kip
        total_amount_cb_baht = round(total_amount_cb_lak * bill_h["exchange_lak"], 2)

        cash_amount_baht = 0.0
        tranfer_amount_val_baht = 0.0
        card_amount_baht = 0.0

        if payment_method == 'cash':
            cash_amount_baht = total_amount_cb_baht
        elif payment_method == 'transfer':
            tranfer_amount_val_baht = total_amount_cb_baht
        elif payment_method == 'card':
            card_amount_baht = total_amount_cb_baht

        sql_h = """
        INSERT INTO cb_trans
        (trans_type, trans_flag, doc_date, doc_no, total_amount, total_net_amount, tranfer_amount, total_amount_pay, doc_time, ap_ar_code, pay_type, doc_format_code, total_other_currency)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cur.execute(sql_h, (
            CB_TRANS_TYPE, CB_TRANS_FLAG, bill_h["doc_date"], bill_h["doc_no"],
            total_amount_cb_baht, total_amount_cb_baht, tranfer_amount_val_baht, total_amount_cb_baht,
            bill_h["doc_time"], bill_h["cust_code"], CB_PAY_TYPE, bill_h["doc_format_code"],
            round(cash_amount_baht, 2) if payment_method == 'cash' else 0.0 # total_other_currency
        ))

        # --- Logic for payment method ---
        cb_bank_code = None
        cb_bank_branch = None
        if payment_method == 'transfer':
            cb_bank_code = 'BCEL001'
            cb_bank_branch = 'BCEL01'
        
        # Conditional trans_number and doc_type for cb_trans_detail
        cb_trans_detail_doc_type = CB_DOC_TYPE # Default to 1
        cb_trans_detail_trans_number = doc_no # Default to doc_no
        cb_trans_detail_sum_amount = total_amount_cb_baht # Always Baht equivalent

        if payment_method == 'cash':
            cb_trans_detail_doc_type = 19
            cb_trans_detail_trans_number = '02'
        elif payment_method == 'transfer':
            cb_trans_detail_trans_number = '1010201' # As per user's instruction

        sum_amount_2_calculated = round(bill_h["exchange_lak"] * bill_h["total_amount_2"], 2) # sum_amount_2 is Baht, rounded

        sql_detail = """
        INSERT INTO cb_trans_detail
        (trans_type, trans_flag, doc_date, doc_no, trans_number, bank_code, bank_branch, exchange_rate, amount, sum_amount, chq_due_date, doc_type, doc_time, currency_code, sum_amount_2)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cur.execute(sql_detail, (
            CB_TRANS_TYPE, CB_TRANS_FLAG, bill_h["doc_date"], bill_h["doc_no"],
            cb_trans_detail_trans_number,
            cb_bank_code,
            cb_bank_branch,
            bill_h["exchange_lak"],
            round(total_amount_cb_lak, 2), # amount (Kip), rounded
            round(cb_trans_detail_sum_amount, 2), # sum_amount (Baht), rounded
            bill_h["doc_date"],
            cb_trans_detail_doc_type,
            bill_h["doc_time"],
            CURRENCY_CODE_LAK,
            sum_amount_2_calculated # sum_amount_2 (Baht), already rounded
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

import uuid
from werkzeug.utils import secure_filename
from flask import send_from_directory

UPLOAD_FOLDER = 'uploads/image/product'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/uploads/image/product/<filename>')
def uploaded_file(filename):
    """Serves files from the nested product image directory."""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/product/upload-image', methods=['POST'])
def upload_product_image():
    """Handle image upload, save it with a name including item_code, and return the URL."""
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400
    
    if 'item_code' not in request.form:
        return jsonify({'success': False, 'error': 'No item_code provided'}), 400

    file = request.files['file']
    item_code = request.form['item_code']
    
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400
        
    if file:
        # Ensure the upload directory exists
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

        # Create a secure filename
        original_filename = secure_filename(file.filename)
        # Create a new unique filename based on item_code and uuid
        unique_filename = f"{item_code}_{uuid.uuid4().hex[:8]}_{original_filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        try:
            file.save(file_path)
            # Construct the URL for the uploaded file
            file_url = f"{request.host_url}uploads/image/product/{unique_filename}"
            return jsonify({'success': True, 'url': file_url}), 201
        except Exception as e:
            print(f"Error saving file: {e}")
            return jsonify({'success': False, 'error': 'Failed to save file on server'}), 500
            
    return jsonify({'success': False, 'error': 'Unknown error occurred'}), 500

@app.route('/product/update-image', methods=['POST'])
def update_product_image():
    """Update or insert a product image URL."""
    data = request.get_json()
    item_code = data.get('item_code')
    new_image_url = data.get('new_image_url')
    changed_by = data.get('changed_by', 'SYSTEM') # Get changed_by from payload, default to 'SYSTEM'

    if not item_code or not new_image_url:
        return jsonify({'success': False, 'error': 'item_code and new_image_url are required'}), 400

    conn = get_connection()
    if not conn:
        return jsonify({'success': False, 'error': 'Database connection failed'}), 500

    cur = conn.cursor()
    try:
        conn.autocommit = False # Start transaction

        # 1. Fetch current image URL (old_url_image)
        current_image_query = "SELECT url_image FROM product_image WHERE ic_code = %s AND line_number = 1"
        cur.execute(current_image_query, (item_code,))
        current_image_result = cur.fetchone()
        old_url_image = current_image_result[0] if current_image_result else None

        # 2. Record history
        history_query = """
        INSERT INTO product_image_history (item_code, old_url_image, new_url_image, changed_by, action_type)
        VALUES (%s, %s, %s, %s, %s);
        """
        cur.execute(history_query, (item_code, old_url_image, new_image_url, changed_by, 'UPDATE'))

        # 3. Check if a record already exists for this item_code and line_number
        check_query = "SELECT roworder FROM product_image WHERE ic_code = %s AND line_number = 1"
        cur.execute(check_query, (item_code,))
        existing_record = cur.fetchone()
        
        if existing_record:
            # Update existing record
            update_query = """
            UPDATE product_image
            SET url_image = %s
            WHERE ic_code = %s AND line_number = 1;
            """
            cur.execute(update_query, (new_image_url, item_code))
        else:
            # Insert new record
            # First, get the next roworder value
            cur.execute("SELECT COALESCE(MAX(roworder), 0) + 1 FROM product_image")
            next_roworder = cur.fetchone()[0]
            
            insert_query = """
            INSERT INTO product_image (roworder, ic_code, line_number, url_image)
            VALUES (%s, %s, 1, %s);
            """
            cur.execute(insert_query, (next_roworder, item_code, new_image_url))
        
        conn.commit() # Commit transaction

        return jsonify({'success': True, 'message': f'Image for {item_code} updated successfully.'}), 200

    except Exception as e:
        conn.rollback() # Rollback on error
        print(f"Error updating product image: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.route('/product/image-history/<item_code>', methods=['GET'])
def get_product_image_history(item_code):
    """Get the image history for a specific product."""
    conn = get_connection()
    if not conn:
        return jsonify({'success': False, 'error': 'Database connection failed'}), 500
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        query = """
        SELECT id, item_code, old_url_image, new_url_image, changed_by, change_timestamp, action_type
        FROM product_image_history
        WHERE item_code = %s
        ORDER BY change_timestamp DESC;
        """
        cur.execute(query, (item_code,))
        history_records = cur.fetchall()
        
        return jsonify({'success': True, 'history': history_records}), 200

    except Exception as e:
        print(f"Error fetching image history for {item_code}: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.route('/product/image-history-all', methods=['GET'])
def get_all_image_history():
    """Get the image history for all products with pagination."""
    conn = get_connection()
    if not conn:
        return jsonify({'success': False, 'error': 'Database connection failed'}), 500
    
    # Get pagination parameters
    limit = request.args.get('limit', 50, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    # Get filter parameters
    search_term = request.args.get('search', '')
    start_date = request.args.get('start_date', '')
    end_date = request.args.get('end_date', '')
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # Base query with product name join
        query = """
        SELECT 
            h.id, 
            h.item_code, 
            h.old_url_image, 
            h.new_url_image, 
            h.changed_by, 
            h.change_timestamp, 
            h.action_type,
            COALESCE(i.name_1, '') as item_name
        FROM product_image_history h
        LEFT JOIN ic_inventory i ON h.item_code = i.code
        """
        
        # Build WHERE clause
        where_clauses = []
        params = []
        
        if search_term:
            where_clauses.append("(h.item_code ILIKE %s OR h.changed_by ILIKE %s OR i.name_1 ILIKE %s)")
            params.extend([f"%{search_term}%", f"%{search_term}%", f"%{search_term}%"])
            
        if start_date:
            where_clauses.append("h.change_timestamp >= %s")
            params.append(start_date)
            
        if end_date:
            where_clauses.append("h.change_timestamp <= %s")
            params.append(end_date)
        
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
        
        # Add ordering
        query += " ORDER BY h.change_timestamp DESC"
        
        # Add pagination
        query += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        cur.execute(query, params)
        history_records = cur.fetchall()
        
        # Get total count for pagination
        count_query = "SELECT COUNT(*) as count FROM product_image_history h"
        
        # Add join for count query if we have search terms that involve product name
        if search_term:
            count_query += " LEFT JOIN ic_inventory i ON h.item_code = i.code"
        
        count_params = []
        
        if where_clauses:
            count_query += " WHERE " + " AND ".join(where_clauses)
            count_params = params[:-2]  # Remove limit and offset params
        
        cur.execute(count_query, count_params)
        total_count = cur.fetchone()['count']
        
        # Get unique product count
        unique_count_query = "SELECT COUNT(DISTINCT item_code) as unique_count FROM product_image_history h"
        unique_count_params = []
        
        if where_clauses:
            # Remove the search term conditions that involve product name for the unique count
            unique_where_clauses = []
            unique_params = []
            
            for i, clause in enumerate(where_clauses):
                if "name_1" not in clause:
                    unique_where_clauses.append(clause)
                    # Add corresponding params
                    if "ILIKE" in clause:
                        unique_params.extend([params[i*3], params[i*3+1]])  # For item_code and changed_by
                    else:
                        unique_params.append(params[len([c for c in where_clauses[:i] if "name_1" not in c]) * (2 if "ILIKE" in clause else 1)])
            
            if unique_where_clauses:
                unique_count_query += " WHERE " + " AND ".join(unique_where_clauses)
                unique_count_params = unique_params
        
        cur.execute(unique_count_query, unique_count_params)
        unique_product_count = cur.fetchone()['unique_count']
        
        return jsonify({
            'success': True, 
            'history': history_records,
            'total_count': total_count,
            'unique_product_count': unique_product_count,
            'limit': limit,
            'offset': offset
        }), 200

    except Exception as e:
        print(f"Error fetching global image history: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/product/image-revert/<int:history_id>', methods=['POST'])
def revert_product_image(history_id):
    """Revert a product image to a previous version."""
    conn = get_connection()
    if not conn:
        return jsonify({'success': False, 'error': 'Database connection failed'}), 500

    cur = conn.cursor()
    # Initialize variables to avoid "possibly unbound" errors
    item_code = None
    try:
        conn.autocommit = False # Start transaction

        # 1. Fetch the history record
        history_query = "SELECT item_code, old_url_image FROM product_image_history WHERE id = %s"
        cur.execute(history_query, (history_id,))
        history_record = cur.fetchone()
        if not history_record:
            return jsonify({'success': False, 'error': 'History record not found'}), 404

        item_code = history_record['item_code']
        old_url_image = history_record['old_url_image']

        # 2. Record history
        history_query = """
        INSERT INTO product_image_history (item_code, old_url_image, new_url_image, changed_by, action_type)
        VALUES (%s, %s, %s, %s, %s);
        """
        cur.execute(history_query, (item_code, old_url_image, old_url_image, 'SYSTEM', 'REVERT'))

        # 3. Update the product image
        update_query = """
        UPDATE product_image
        SET url_image = %s
        WHERE ic_code = %s AND line_number = 1;
        """
        cur.execute(update_query, (old_url_image, item_code))

        conn.commit() # Commit transaction

        return jsonify({'success': True, 'message': f'Image for {item_code} reverted successfully to history ID {history_id}.'}), 200

    except Exception as e:
        conn.rollback() # Rollback on error
        error_msg = f"Error reverting product image for {item_code}: {str(e)}" if item_code else f"Error reverting product image: {str(e)}"
        print(error_msg)
        return jsonify({'success': False, 'error': str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

@app.route('/api/sales-history-db', methods=['GET'])
def api_sales_history_db():
    """Get sales history from the database with pagination and filtering."""
    conn = get_connection()
    if not conn:
        return jsonify({'success': False, 'error': 'Database connection failed'}), 500

    limit = request.args.get('limit', 20, type=int)
    offset = request.args.get('offset', 0, type=int)
    selected_date = request.args.get('selectedDate', None)
    search_term = request.args.get('searchTerm', None)

    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        base_query = """
        SELECT
            it.doc_no,
            it.doc_date,
            it.doc_time,
            it.cust_code,
            it.total_amount_2,
            it.currency_code,
            ec.symbol AS currency_symbol,
            ac.name_1 AS customer_name
        FROM
            ic_trans it
        LEFT JOIN
            ar_customer ac ON it.cust_code = ac.code
        LEFT JOIN
            erp_currency ec ON it.currency_code = ec.code
        WHERE
            it.trans_flag = 44
        """
        params = []
        where_clauses = []

        if selected_date:
            where_clauses.append("it.doc_date = %s")
            params.append(selected_date)

        if search_term:
            search_pattern = f"%{search_term.lower()}%"
            where_clauses.append("(LOWER(it.doc_no) LIKE %s OR LOWER(ac.name_1) LIKE %s)")
            params.extend([search_pattern, search_pattern])

        if where_clauses:
            base_query += " AND " + " AND ".join(where_clauses)

        base_query += " ORDER BY it.doc_date DESC, it.doc_time DESC"

        # Query for total count (without limit/offset)
        count_query = f"SELECT COUNT(*) FROM ({base_query}) AS subquery"
        cur.execute(count_query, params)
        total_count = cur.fetchone()['count']

        # Add limit and offset for fetching actual data
        base_query += " LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cur.execute(base_query, params)
        result = cur.fetchall()

        # For each transaction, fetch the product details
        for transaction in result:
            detail_query = """
            SELECT
                item_code,
                item_name,
                unit_code,
                qty,
                price_2 as price
            FROM ic_trans_detail
            WHERE doc_no = %s
            ORDER BY line_number
            """
            cur.execute(detail_query, (transaction['doc_no'],))
            transaction['items'] = cur.fetchall()

        return jsonify({'list': result, 'totalCount': total_count}), 200

    except Exception as e:
        print(f"Error fetching sales history: {str(e)}")
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
