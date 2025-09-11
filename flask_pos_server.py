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
        # สร้าง query สำหรับดึงข้อมูลสินค้า
        query = """SELECT 
                    b.code as item_code,
                    b.name_1 as item_name,
                    'PCS' as unit_code,  -- ใช้ค่าคงที่ชั่วคราว
                    0 as price,  -- ใช้ค่าคงที่ชั่วคราว
                    a.balance_qty as stock_quantity,
                    '/image/exam.jpg' as image,
                    '/image/exam.jpg' as url_image  -- ใช้ค่า default ชั่วคราว
                   FROM sml_ic_function_stock_balance_warehouse_location('2099-12-31', '', %s, %s) a
                   LEFT JOIN ic_inventory b ON b.code = a.ic_code"""
        
        params = [whcode, loccode]
        
        # เพิ่มเงื่อนไขสำหรับ category ถ้ามี
        if category and category != 'All':
            query += """ LEFT JOIN ic_category f ON f.code = b.item_category 
                         WHERE a.balance_qty > 0 AND f.name_1 = %s"""
            params.append(category)
        else:
            query += " WHERE a.balance_qty > 0"
            
        # เพิ่มเงื่อนไขสำหรับ search ถ้ามี
        if search:
            query += " AND (b.name_1 ILIKE %s OR b.code ILIKE %s)"
            params.extend([f"%{search}%", f"%{search}%"])
            
        query += " ORDER BY b.name_1 LIMIT %s OFFSET %s"
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
    """Process POS billing/transaction"""
    data = request.get_json()
    
    conn = get_connection()
    if not conn:
        return jsonify({'success': False, 'error': 'Database connection failed'}), 500
    
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        # เริ่ม transaction
        conn.autocommit = False
        
        # ดึงข้อมูลจาก request
        doc_no = data.get('doc_no')
        doc_date = data.get('doc_date')
        customer_code = data.get('customer_code')
        total_amount = data.get('total_amount', 0)
        items = data.get('items', [])
        user_code = data.get('user_code', 'SYSTEM')
        
        # เพิ่มข้อมูลลงในตาราง ic_trans (header)
        trans_query = """
        INSERT INTO ic_trans (
            trans_type, trans_flag, doc_date, doc_no, doc_time,
            branch_code, project_code, sale_code, doc_format_code,
            cust_code, amount, creator_code, create_datetime
        ) VALUES (
            3, 44, %s, %s, CURRENT_TIME,
            '00', '', %s, 'POS',
            %s, %s, %s, CURRENT_TIMESTAMP
        )
        """
        
        cur.execute(trans_query, (
            doc_date, doc_no, user_code, customer_code, total_amount, user_code
        ))
        
        # เพิ่มข้อมูลลงในตาราง ic_trans_detail (รายละเอียด)
        for item in items:
            detail_query = """
            INSERT INTO ic_trans_detail (
                trans_type, trans_flag, doc_date, doc_no, doc_time,
                item_code, item_name, unit_code, qty, price,
                amount, branch_code, sale_code, creator_code, create_datetime
            ) VALUES (
                3, 44, %s, %s, CURRENT_TIME,
                %s, %s, %s, %s, %s,
                %s, '00', %s, %s, CURRENT_TIMESTAMP
            )
            """
            
            cur.execute(detail_query, (
                doc_date, doc_no,
                item['item_code'], item['item_name'], item['unit_code'],
                item['qty'], item['price'], item['amount'],
                user_code, user_code
            ))
        
        # Commit transaction
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Transaction completed successfully',
            'doc_no': doc_no
        }), 200

    except Exception as e:
        # Rollback transaction ในกรณีที่มีข้อผิดพลาด
        conn.rollback()
        print(f"Error processing transaction: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# The @app.before_request and @app.after_request for CORS have been removed 
# to rely solely on the Flask-Cors extension, which is already configured.

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)