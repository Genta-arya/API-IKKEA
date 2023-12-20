const mysql = require('mysql2');
const util = require('util');

const dbPool = mysql.createPool({
  host: 'bzizaxbwlogkymgc0hfm-mysql.services.clever-cloud.com',
  user: 'ud4bcst5oh325rxe',
  password: 'TiNeGhH0Bax414lNtHQ9',
  database: 'bzizaxbwlogkymgc0hfm',
  waitForConnections: true,
 
  queueLimit: 0,
});

// const dbPool = mysql.createPool({
//     host: 'localhost',  // Change this to the hostname or IP address of your local MySQL server
//     user: 'root',  // Replace with your local MySQL username
//     password: '',  // Replace with your local MySQL password
//     database: 'bzizaxbwlogkymgc0hfm',  // Replace with the name of your local MySQL database
//     waitForConnections: true,
//     queueLimit: 0,
//   });
  
function handleDisconnect() {
  dbPool.getConnection((err, connection) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      setTimeout(handleDisconnect, 2000);
    } else {
      console.log('Connected to MySQL');
      connection.release();

      // Tambahkan event listener untuk menangani pemutusan koneksi
      connection.on('error', (err) => {
        console.error('MySQL Connection Error:', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
          handleDisconnect();
        } else {
          throw err;
        }
      });
    }
  });
}

// Panggil handleDisconnect untuk membuat koneksi awal
handleDisconnect();

dbPool.query = util.promisify(dbPool.query);

module.exports = dbPool;
