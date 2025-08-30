const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = 3001;

// Replace with your actual DATABASE_URL
const DATABASE_URL = 'postgresql://postgres:od@2022@183.182.125.245:5432/odg_test';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

app.use(cors());
app.use(express.json());

app.post('/api/login', async (req, res) => {
  const { code, password } = req.body;

  // Log incoming data for debugging
  console.log('Received login attempt with:', { code, password });

  // !!! SECURITY WARNING: Storing and comparing plain text passwords is a major security risk.
  // Passwords should always be hashed (e.g., using bcrypt) and compared securely.
  // This is a basic implementation for demonstration purposes based on your query.
  // Please implement proper password hashing in a production environment.

  try {
    const query = `SELECT code, name_1, ic_wht, ic_shelf FROM erp_user WHERE code = $1 AND password = $2`;
    const result = await pool.query(query, [code, password]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log(`User logged in: Code=${user.code}, Name=${user.name_1}`); // Log user login
      res.status(200).json({ message: 'Login successful', user });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Error during login', err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const result = await pool.query('SELECT item_code, item_name, qty, unit_code, trans_flag FROM ic_trans_detail LIMIT 20;');
    console.log(result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/analysis-data', async (req, res) => {
  try {
    const { doc_date, limit = 20, offset = 0 } = req.query;
    const currentDate = doc_date ? `'${doc_date}'` : 'CURRENT_DATE';
    const previousDate = doc_date ? `'${doc_date}'::date - 1` : 'CURRENT_DATE - 1';

    const salesCheckQuery = `SELECT 1 FROM ic_trans_detail WHERE doc_date = ${currentDate} LIMIT 1;`;
    const salesCheckResult = await pool.query(salesCheckQuery);

    if (salesCheckResult.rowCount === 0) {
      return res.json([]);
    }

    const query = `
      WITH StockBalances AS (
        SELECT ic_code, ic_name, ic_unit_code, warehouse, balance_qty AS balance_qty_start
        FROM sml_ic_function_stock_balance_warehouse_location(${previousDate}, '', '1301', '130101')
        WHERE balance_qty > 0
      ),
      SalesData AS (
        SELECT item_code, SUM(qty) AS sale_qty
        FROM ic_trans_detail
        WHERE trans_flag IN (44) AND doc_date = ${currentDate} AND wh_code = '1301'
        GROUP BY item_code
      )
      SELECT
        ${currentDate} as doc_date, a.ic_code as item_code, a.ic_name as item_name, a.ic_unit_code as unit_code,
        round(a.balance_qty_start, 2) as balance_qty_start, COALESCE(b.sale_qty, 0) AS sale_qty,
        (SELECT round(balance_qty, 2) FROM sml_ic_function_stock_balance_warehouse_location(${currentDate}, a.ic_code, a.warehouse, '130101')) AS balance_qty,
        (SELECT COALESCE(round(balance_qty, 2), 0) FROM sml_ic_function_stock_balance_warehouse_location(${currentDate}, a.ic_code, '1302', '130201')) AS balance_qty_1302
      FROM StockBalances a
      LEFT JOIN SalesData b ON a.ic_code = b.item_code
      ORDER BY a.ic_code ASC
      LIMIT ${limit} OFFSET ${offset};
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error executing analysis query', err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/transfers', async (req, res) => {
    const { transfer_no, creator, details, wh_from, location_from, wh_to, location_to } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Received transfer payload:', req.body);

    const docDate = new Date();
    const docTime = new Date().toTimeString().slice(0, 5);
    
    const transHeaderQuery = {
      text: `INSERT INTO ic_trans (trans_type, trans_flag, doc_date, doc_no, doc_ref, doc_ref_date, branch_code, project_code, sale_code, remark, doc_time, doc_format_code, wh_from, location_from, wh_to, location_to, creator_code, create_datetime, last_editor_code, lastedit_datetime) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
      values: [
        3, 124, docDate, transfer_no, creator, docDate, '00', '', creator, `Web: ${transfer_no}`, docTime, 'FRP', wh_from, location_from, wh_to, location_to, creator, docDate, creator, docDate
      ],
    };
    await client.query(transHeaderQuery);

    for (const item of details) {
      console.log(`Processing item ${item.item_code}: shelf_code=${item.shelf_code}, shelf_code_2=${item.shelf_code_2}`);
      const transDetailQuery = {
        text: `INSERT INTO ic_trans_detail (trans_type, trans_flag, doc_date, doc_no, item_code, item_name, unit_code, qty, branch_code, wh_code, shelf_code, wh_code_2, shelf_code_2, stand_value, divide_value, doc_time, sale_code, create_datetime, last_editor_code, lastedit_datetime) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        values: [
          3, 124, docDate, transfer_no, item.item_code, item.item_name, item.unit_code, item.quantity, '00', item.wh_code, item.shelf_code, item.wh_code_2, item.shelf_code_2, 1, 1, docTime, creator, docDate, creator, docDate
        ],
      };
      await client.query(transDetailQuery);
    }

    await client.query('COMMIT');

    const resultQuery = await pool.query('SELECT doc_no AS transfer_no, doc_no AS id, to_char(create_datetime, \'YYYY-MM-DD HH24:MI:SS\') AS doc_date_time, creator_code AS creator, (SELECT SUM(qty) FROM ic_trans_detail WHERE doc_no = $1) AS quantity FROM ic_trans WHERE doc_no = $1', [transfer_no]);
    res.status(201).json(resultQuery.rows[0]);

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error during transaction', e);
    res.status(500).json({ error: 'Internal Server Error during transaction' });
  } finally {
    client.release();
  }
});

app.get('/api/transfers/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const headerQuery = {
      text: `SELECT *, to_char(create_datetime, 'YYYY-MM-DD HH24:MI:SS') AS doc_date_time_formatted FROM ic_trans WHERE doc_no = $1`,
      values: [id],
    };
    const headerResult = await pool.query(headerQuery);

    if (headerResult.rowCount === 0) {
      return res.status(404).json({ error: 'Transfer not found' });
    }
    const header = headerResult.rows[0];

    const detailQuery = {
      text: `SELECT item_code, item_name, unit_code, qty, wh_code, shelf_code, wh_code_2, shelf_code_2 FROM ic_trans_detail WHERE doc_no = $1 ORDER BY item_code`,
      values: [id],
    };
    const detailResult = await pool.query(detailQuery);

    const totalQuantity = detailResult.rows.reduce((sum, item) => sum + parseFloat(item.qty), 0);
    res.json({ ...header, quantity: totalQuantity, details: detailResult.rows });

  } catch (err) {
    console.error(`Error executing query for transfer ${id}`, err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/transfers', async (req, res) => {
  try {
    const { date } = req.query;
    let whereClause = 'WHERE 1=1';
    let queryParams = [];

    if (date) {
      whereClause += ' AND t1.doc_date = $1';
      queryParams.push(date);
    }

    const query = `
      SELECT
          t1.doc_no AS transfer_no, t1.doc_no AS id,
          COALESCE(to_char(t1.create_datetime, 'YYYY-MM-DD HH24:MI:SS'), to_char(t1.doc_date, 'YYYY-MM-DD') || ' ' || t1.doc_time) AS doc_date_time,
          t1.creator_code AS creator,
          (SELECT SUM(t2.qty) FROM ic_trans_detail t2 WHERE t2.doc_no = t1.doc_no) AS quantity
      FROM ic_trans t1
      ${whereClause}
      ORDER BY t1.create_datetime DESC;
    `;
    const { rows } = await pool.query(query, queryParams);
    res.json(rows);
  } catch (err) {
    console.error('Error executing transfers query', err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { code, password } = req.body;
  console.log('Login attempt received:', { code, password }); // Debug log

  try {
    const query = `SELECT code, name_1, password, ic_wht, ic_shelf FROM erp_user WHERE code = $1 AND password = $2`;
    console.log('Executing database query with:', [code, password]); // Debug log
    const result = await pool.query(query, [code, password]);
    console.log('Database query result:', result.rows); // Debug log

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('Login successful for user:', user.code); // Debug log
      // In a real application, you would generate a token (e.g., JWT) here
      // and send it to the client for session management.
      res.json({ success: true, message: 'Login successful', user: {
        code: user.code,
        name_1: user.name_1,
        ic_wht: user.ic_wht,
        ic_shelf: user.ic_shelf
      }});
    } else {
      console.log('Login failed: Invalid credentials for code', code); // Debug log
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Error during login', err.stack);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
