const mysql = require('mysql2/promise');
const { db } = require('./index');
const pool = mysql.createPool({ ...db, waitForConnections: true, connectionLimit: 10, dateStrings: true, decimalNumbers: true });
module.exports = {
  pool,
  query: async (sql, params = []) => (await pool.query(sql, params))[0],
  exec: async (sql, params = []) => (await pool.query(sql, params))[0], // returns ResultSetHeader
};
