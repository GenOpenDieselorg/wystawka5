const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

// SECURITY: Query timeout in milliseconds (default 30 seconds)
const QUERY_TIMEOUT = parseInt(process.env.DB_QUERY_TIMEOUT || '30000', 10);

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 100,
  queueLimit: 0,
  decimalNumbers: true, // Ensure decimals are returned as numbers, not strings
  // SECURITY: Set connection timeout
  connectTimeout: 10000 // 10 seconds to establish connection
});

// SECURITY: Wrapper functions with explicit timeout for all queries
// This prevents long-running queries from causing DoS attacks
const originalExecute = pool.execute.bind(pool);
const originalQuery = pool.query.bind(pool);

// Wrapper for execute() with timeout
pool.execute = async function(sql, params) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Query timeout after ${QUERY_TIMEOUT}ms`));
    }, QUERY_TIMEOUT);
  });

  try {
    const result = await Promise.race([
      originalExecute(sql, params),
      timeoutPromise
    ]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Wrapper for query() with timeout
pool.query = async function(sql, params) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Query timeout after ${QUERY_TIMEOUT}ms`));
    }, QUERY_TIMEOUT);
  });

  try {
    const result = await Promise.race([
      originalQuery(sql, params),
      timeoutPromise
    ]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Check connection
pool.getConnection()
  .then(connection => {
    console.log('Database connected successfully');
    console.log(`Query timeout set to ${QUERY_TIMEOUT}ms`);
    connection.release();
  })
  .catch(err => {
    console.error('Error connecting to database:', err.message);
  });

module.exports = pool;
