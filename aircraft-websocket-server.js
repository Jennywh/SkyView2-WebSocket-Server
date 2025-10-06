const WebSocket = require('ws');
const http = require('http');

console.log('🚀 Starting Aircraft WebSocket Server...');

// Create HTTP server for health checks
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'running',
    connectedClients: wss.clients.size,
    uptime: process.uptime(),
    aircraftCount: Object.keys(aircraftData).length
  }));
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Aircraft data with initial positions around origin (0,0)
const aircraftData = {
  'N9UX': {
    tailNumber: 'N9UX',
    x: 1.5,
    z: 2.3,
    altitude: 1000,
    heading: 90,
    pitch: 0,
    roll: 0,
    speed: 150,
    timestamp: Date.now()
  },
  'N520CX': {
    tailNumber: 'N520CX',
    x: -0.8,
    z: 3.1,
    altitude: 1200,
    heading: 180,
    pitch: 5,
    roll: 2,
    speed: 200,
    timestamp: Date.now()
  },
  'N452': {
    tailNumber: 'N452',
    x: 2.1,
    z: -1.2,
    altitude: 800,
    heading: 270,
    pitch: -2,
    roll: -1,
    speed: 180,
    timestamp: Date.now()
  }
};

// Function to update aircraft positions (simulate movement around origin)
function updateAircraftPositions() {
  Object.keys(aircraftData).forEach(tailNumber => {
    const aircraft = aircraftData[tailNumber];
    
    // Simulate aircraft movement around origin (0,0)
    const xChange = (Math.random() - 0.5) * 0.1; // Small x changes
    const zChange = (Math.random() - 0.5) * 0.1; // Small z changes
    const altChange = (Math.random() - 0.5) * 20; // Altitude changes
    const headingChange = (Math.random() - 0.5) * 3; // Gradual heading changes
    
    // Update position
    aircraft.x += xChange;
    aircraft.z += zChange;
    aircraft.altitude = Math.max(500, aircraft.altitude + altChange); // Minimum altitude
    aircraft.heading = (aircraft.heading + headingChange) % 360; // Keep heading 0-360
    aircraft.timestamp = Date.now();
    
    // Add some variation to speed
    aircraft.speed += (Math.random() - 0.5) * 10;
    aircraft.speed = Math.max(50, Math.min(300, aircraft.speed)); // Keep speed reasonable
    
    // Keep aircraft within a reasonable range around origin (optional boundary)
    const maxDistance = 10; // Maximum distance from origin
    const distance = Math.sqrt(aircraft.x * aircraft.x + aircraft.z * aircraft.z);
    if (distance > maxDistance) {
      // Pull aircraft back towards origin
      const factor = maxDistance / distance;
      aircraft.x *= factor;
      aircraft.z *= factor;
    }
  });
}

// Function to broadcast aircraft positions to all connected clients
function broadcastAircraftPositions() {
  if (wss.clients.size === 0) return; // No clients connected
  
  // Convert aircraft data to the new format with tail numbers as keys
  const formattedData = {};
  Object.keys(aircraftData).forEach(tailNumber => {
    const aircraft = aircraftData[tailNumber];
    // Use x/z coordinates directly
    formattedData[tailNumber] = {
      x: aircraft.x,
      z: aircraft.z
    };
  });
  
  const message = {
    type: 'aircraft_positions',
    data: formattedData,
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
  console.log(`✅ New client connected from ${clientIP}`);
  
  // Send initial aircraft data to new client
  const formattedData = {};
  Object.keys(aircraftData).forEach(tailNumber => {
    const aircraft = aircraftData[tailNumber];
    formattedData[tailNumber] = {
      x: aircraft.x,
      z: aircraft.z
    };
  });
  
  const initialMessage = {
    type: 'aircraft_positions',
    data: formattedData,
    timestamp: Date.now()
  };
  ws.send(JSON.stringify(initialMessage));
  
  // Handle client disconnect
  ws.on('close', (code, reason) => {
    console.log(`❌ Client disconnected from ${clientIP} (${code}: ${reason})`);
  });
  
  // Handle client errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for client ${clientIP}:`, error.message);
  });
  
  // Handle incoming messages from clients
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`📨 Received message from ${clientIP}:`, message.type);
      
      // Echo back a response
      ws.send(JSON.stringify({
        type: 'server_response',
        message: 'Message received',
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error(`❌ Error parsing message from ${clientIP}:`, error.message);
    }
  });
});

// Handle WebSocket server errors
wss.on('error', (error) => {
  console.error('❌ WebSocket server error:', error);
});

// Start the position update loop
const UPDATE_INTERVAL = 2000; // Update every 2 seconds
setInterval(() => {
  updateAircraftPositions();
  broadcastAircraftPositions();
}, UPDATE_INTERVAL);

// Start the HTTP server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`✅ HTTP server running on http://localhost:${PORT}`);
  console.log(`✅ WebSocket server running on ws://localhost:${PORT}`);
  console.log(`📡 Broadcasting aircraft positions every ${UPDATE_INTERVAL}ms`);
  console.log(`✈️  Tracking ${Object.keys(aircraftData).length} aircraft: ${Object.keys(aircraftData).join(', ')}`);
  console.log('🚀 Server ready for connections!');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  wss.close(() => {
    server.close(() => {
      console.log('✅ Server shut down gracefully');
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

