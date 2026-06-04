// Load environment variables first, before any other imports
require('dotenv').config();

const app = require('./app');

const PORT = parseInt(process.env.PORT || '3001', 10);

const server = app.listen(PORT, () => {
  console.log(`auth-employee-service berjalan di port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[ERROR] Port ${PORT} sudah digunakan proses lain.`);
    console.error(`Jalankan: taskkill /IM node.exe /F  lalu coba lagi.\n`);
    process.exit(1);
  } else {
    throw err;
  }
});
