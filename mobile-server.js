const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

console.log('📱 Starting Mobile Test Server...');

// Create HTTP server for serving the mobile test page
const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/mobile-test.html' : req.url;
  let contentType = 'text/html';
  
  // Set content type based on file extension
  if (filePath.endsWith('.css')) {
    contentType = 'text/css';
  } else if (filePath.endsWith('.js')) {
    contentType = 'application/javascript';
  } else if (filePath.endsWith('.json')) {
    contentType = 'application/json';
  }
  
  // Add CORS headers for mobile access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Serve files from current directory
  const fullPath = path.join(__dirname, filePath);
  
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }
    
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

// No WebSocket server needed - mobile clients connect directly to port 8080

// Start the HTTP server
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`📱 Mobile test server running on http://0.0.0.0:${PORT}`);
  console.log(`📱 Mobile test page: http://0.0.0.0:${PORT}/mobile-test.html`);
  console.log(`📡 Mobile clients connect directly to port 8080 for WebSocket data`);
  console.log('📱 Ready for mobile connections!');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down mobile server...');
  server.close(() => {
    console.log('✅ Mobile server shut down gracefully');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

