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

// Create WebSocket server (same as aircraft server)
const wss = new WebSocket.Server({ server });

// Aircraft data with initial positions
const aircraftData = {
  'N9UX': {
    x: 0,
    z: 0
  },
  'N520CX': {
    x: 0,
    z: 0
  },
  'N452': {
    x: 0,
    z: 0
  }
};

// Function to update aircraft positions (simulate movement)
function updateAircraftPositions() {
  Object.keys(aircraftData).forEach(tailNumber => {
    const aircraft = aircraftData[tailNumber];
    
    // Simulate movement
    const xChange = (Math.random() - 0.5) * 10;
    const zChange = (Math.random() - 0.5) * 10;
    
    // Update position
    aircraft.x += xChange;
    aircraft.z += zChange;
  });
}

// Function to broadcast aircraft positions to all connected clients
function broadcastAircraftPositions() {
  if (wss.clients.size === 0) return;
  
  const message = {
    type: 'aircraft_positions',
    data: Object.values(aircraftData),
    timestamp: Date.now()
  };
  
  const messageString = JSON.stringify(message);
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageString);
    }
  });
}

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const clientIP = req.socket.remoteAddress;
  console.log(`📱 Mobile client connected from ${clientIP}`);
  
  // Send initial aircraft data to new client
  const initialMessage = {
    type: 'aircraft_positions',
    data: Object.values(aircraftData),
    timestamp: Date.now()
  };
  ws.send(JSON.stringify(initialMessage));
  
  // Handle client disconnect
  ws.on('close', (code, reason) => {
    console.log(`📱 Mobile client disconnected (${code}: ${reason})`);
  });
  
  // Handle client errors
  ws.on('error', (error) => {
    console.error(`📱 Mobile client error:`, error.message);
  });
  
  // Handle incoming messages from clients
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`📱 Mobile message received:`, message.type);
      
      // Echo back a response
      ws.send(JSON.stringify({
        type: 'server_response',
        message: 'Mobile message received',
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error(`📱 Error parsing mobile message:`, error.message);
    }
  });
});

// Handle WebSocket server errors
wss.on('error', (error) => {
  console.error('📱 WebSocket server error:', error);
});

// Start the position update loop
const UPDATE_INTERVAL = 2000; // Update every 2 seconds
setInterval(() => {
  updateAircraftPositions();
  broadcastAircraftPositions();
}, UPDATE_INTERVAL);

// Start the HTTP server
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`📱 Mobile test server running on http://0.0.0.0:${PORT}`);
  console.log(`📱 WebSocket server running on ws://0.0.0.0:${PORT}`);
  console.log(`📱 Mobile test page: http://0.0.0.0:${PORT}/mobile-test.html`);
  console.log(`📡 Broadcasting aircraft positions every ${UPDATE_INTERVAL}ms`);
  console.log(`✈️  Tracking ${Object.keys(aircraftData).length} aircraft: ${Object.keys(aircraftData).join(', ')}`);
  console.log('📱 Ready for mobile connections!');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down mobile server...');
  wss.close(() => {
    server.close(() => {
      console.log('✅ Mobile server shut down gracefully');
      process.exit(0);
    });
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

