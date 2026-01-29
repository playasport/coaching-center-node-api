// Load environment variables
require('dotenv').config();

const mysql = require('mysql2/promise');

/**
 * Creates and returns a MySQL database connection using environment credentials
 * @returns {Promise<mysql.Connection>} MySQL connection object
 */
async function connectMySQL() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_DB_HOST || 'localhost',
      user: process.env.MYSQL_DB_USER || 'root',
      password: process.env.MYSQL_DB_PASSWORD || '',
      database: process.env.MYSQL_DB_NAME || '',
      // Additional connection options
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });

    console.log('✅ MySQL database connected successfully');
    console.log(`   Host: ${process.env.MYSQL_DB_HOST || 'localhost'}`);
    console.log(`   Database: ${process.env.MYSQL_DB_NAME || '(not specified)'}`);

    return connection;
  } catch (error) {
    console.error('❌ Failed to connect to MySQL database:', error.message);
    throw error;
  }
}

/**
 * Closes the MySQL database connection
 * @param {mysql.Connection} connection - MySQL connection object
 */
async function closeMySQL(connection) {
  try {
    if (connection) {
      await connection.end();
      console.log('✅ MySQL database connection closed');
    }
  } catch (error) {
    console.error('❌ Error closing MySQL connection:', error.message);
    throw error;
  }
}

// Export functions
module.exports = {
  connectMySQL,
  closeMySQL,
};

// Example usage (uncomment to test):
// (async () => {
//   let connection;
//   try {
//     connection = await connectMySQL();
//     // Your migration code here
//   } catch (error) {
//     console.error('Migration error:', error);
//   } finally {
//     if (connection) {
//       await closeMySQL(connection);
//     }
//   }
// })(); 