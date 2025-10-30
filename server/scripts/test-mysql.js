import mysql from 'mysql2/promise';

// JawsDB connection details
const config = {
  host: 'k2fqe1if4c7uowsh.cbetxkdyhwsb.us-east-1.rds.amazonaws.com',
  user: 'xfelkh3jgbfmibxt',
  password: 'gkxwa00z10e71bci',
  port: 3306,
  database: 'puwi2dasthtgdauv'
};

async function testConnection() {
  let connection;
  try {
    console.log('Attempting to connect to MySQL...');
    connection = await mysql.createConnection(config);
    console.log('✅ Successfully connected to MySQL!');

    // Test query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Test query successful:', rows);

    // Check existing tables
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📊 Existing tables:', tables);

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Connection closed');
    }
  }
}

testConnection();
