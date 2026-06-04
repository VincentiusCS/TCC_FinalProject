const mysql = require('mysql2/promise');

// Create a connection pool using environment variables
// Supports both TCP (local dev) and Unix socket (Cloud Run + Cloud SQL)
const dbConfig = {
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'erp_master_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00',
};

// If DB_HOST starts with '/', treat it as a Unix socket path (Cloud SQL)
if (process.env.DB_HOST && process.env.DB_HOST.startsWith('/')) {
  dbConfig.socketPath = process.env.DB_HOST;
} else {
  dbConfig.host = process.env.DB_HOST || 'localhost';
  dbConfig.port = parseInt(process.env.DB_PORT || '3306', 10);
}

const pool = mysql.createPool(dbConfig);

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
