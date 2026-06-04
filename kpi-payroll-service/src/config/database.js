const mysql = require('mysql2/promise');

// Create a connection pool using environment variables
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'erp_kpi_payroll_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
});

/**
 * Execute a SQL query using the connection pool.
 * @param {string} sql - The SQL statement to execute
 * @param {Array} [params=[]] - Parameterized query values
 * @returns {Promise<Array>} Query result rows
 */
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = { pool, query };
