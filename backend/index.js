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

    // Default to today if doc_date is not provided, and handle date formatting
    const currentDate = doc_date ? `'${doc_date}'` : 'CURRENT_DATE';
    const previousDate = doc_date ? `'${doc_date}'::date - 1` : 'CURRENT_DATE - 1';

    // Pre-check for sales transactions on the selected date
    const salesCheckQuery = `SELECT 1 FROM ic_trans_detail WHERE doc_date = ${currentDate} LIMIT 1;`;
    const salesCheckResult = await pool.query(salesCheckQuery);

    if (salesCheckResult.rowCount === 0) {
      // If no sales, return empty array immediately
      return res.json([]);
    }

    // If sales exist, proceed with the main query
    const query = `
      WITH StockBalances AS (
        SELECT
          ic_code,
          ic_name,
          ic_unit_code,
          warehouse,
          balance_qty AS balance_qty_start
        FROM
          sml_ic_function_stock_balance_warehouse_location(${previousDate}, '', '1301', '130101')
        WHERE
          balance_qty > 0
      ),
      SalesData AS (
        SELECT
          item_code,
          SUM(qty) AS sale_qty
        FROM
          ic_trans_detail
        WHERE
          trans_flag IN (44) AND doc_date = ${currentDate} AND wh_code = '1301'
        GROUP BY
          item_code
      )
      SELECT
        ${currentDate} as doc_date,
        a.ic_code as item_code,
        a.ic_name as item_name,
        a.ic_unit_code as unit_code,
        round(a.balance_qty_start, 2) as balance_qty_start,
        COALESCE(b.sale_qty, 0) AS sale_qty,
        (
          SELECT
            round(balance_qty, 2)
          FROM
            sml_ic_function_stock_balance_warehouse_location(${currentDate}, a.ic_code, a.warehouse, '130101')
        ) AS balance_qty,
        (
          SELECT
            COALESCE(round(balance_qty, 2), 0)
          FROM
            sml_ic_function_stock_balance_warehouse_location(${currentDate}, a.ic_code, '1302', '130201')
        ) AS balance_qty_1302
      FROM
        StockBalances a
        LEFT JOIN SalesData b ON a.ic_code = b.item_code
      ORDER BY
        a.ic_code ASC
      LIMIT ${limit} OFFSET ${offset};
    `;

    const result = await pool.query(query);
    console.log('Analysis Data:', result.rows);
    res.json(result.rows);
  } catch (err) {
    console.error('Error executing analysis query', err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.post('/api/login', async (req, res) => {
  const { code, password } = req.body;

  try {
    const query = `SELECT code, name_1, password, ic_wht, ic_shelf FROM erp_user WHERE code = $1 AND password = $2`;
    const result = await pool.query(query, [code, password]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      // In a real application, you would generate a token (e.g., JWT) here
      // and send it to the client for session management.
      res.json({ success: true, message: 'Login successful', user: {
        code: user.code,
        name_1: user.name_1,
        ic_wht: user.ic_wht,
        ic_shelf: user.ic_shelf
      }});
    } else {
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