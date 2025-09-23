```python
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

        # Get warehouse and location from the main payload, with defaults
        wh_code = data.get('wh_code', '1301')
        shelf_code = data.get('shelf_code', '01')

        # เพิ่มข้อมูลลงในตาราง ic_trans_detail (รายละเอียด)
        for idx, item in enumerate(items):
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
                %s, %s, 
                0, 0, 
                '', 0, 
                0, 0, 
                0, 0, 
                %s, %s, 
                %s, %s, %s, %s, 1, 1, -1, 0, 0, 0, LEFT(CAST(CURRENT_TIME AS VARCHAR), 5), 0, 
                %s, '', 
                %s, '', %s, CURRENT_TIMESTAMP
            )
            """
            
            params = (
                3, 44, doc_date, doc_no, customer_code, 0, 
                item['item_code'], item['item_name'], item['unit_code'], item['qty'],
                item['price'], item['amount'],
                item['price'], item['amount'], # price_exclude_vat, sum_amount_exclude_vat
                idx + 1, '00', wh_code, shelf_code, # line_number, branch, wh, shelf
                doc_date, # doc_date_calc
                user_code, # sale_code
                user_code # creator_code
            )

            cur.execute(detail_query, params)



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
```