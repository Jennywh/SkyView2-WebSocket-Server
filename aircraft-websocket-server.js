const WebSocket = require('ws');
const http = require('http');
const aircraftPaths = require('./aircraft-paths');

// When true, restart from the first point after reaching the end
const LOOP_PATHS = true;
// Step size for advancing through the path (e.g., 10 -> every 10th point)
const STEP = 10;

console.log('🚀 Starting Aircraft WebSocket Server with Predetermined Paths...');

// Create HTTP server for health checks
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'running',
    connectedClients: wss.clients.size,
    uptime: process.uptime(),
    entityCount: Object.keys(entityData).length,
    pathDataLoaded: aircraftPaths.length > 0
  }));
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Entity data with predetermined paths (includes aircraft and objects)
const entityData = {
  'N9UX': {
    id: 'N9UX',
    type: 'aircraft',
    position: { x: 0, y: 0, z: 0 },
    rotation: { yaw: 0, roll: 0, pitch: 0 },
    timestamp: Date.now(),
    currentPathIndex: 0,
    isOnPath: true
  },
  'object_123': {
    id: 'object_123',
    type: 'unknown',
    position: { x: 0, y: 0, z: 0 },
    dimensions: { width: 10, height: 10, length: 10 },
    timestamp: Date.now(),
    currentPathIndex: 0,
    isOnPath: true
  },
  'object_456': {
    id: 'object_456',
    type: 'unknown',
    position: { x: 0, y: 0, z: 0 },
    dimensions: { width: 7, height: 12, length: 6 },
    timestamp: Date.now(),
    currentPathIndex: 0,
    isOnPath: true
  }
};

// Safely get a path point at a given index for a specific entity ID
function getPathPointByIndex(index, entityId) {
  if (index < 0 || index >= aircraftPaths.length) return null;
  const entry = aircraftPaths[index];
  if (!entry || typeof entry !== 'object') return null;
  return entry[entityId] || null;
}

// Initialize all entities with first position from path data
function initializeEntities() {
  Object.keys(entityData).forEach(entityId => {
    const entity = entityData[entityId];
    
    if (aircraftPaths.length > 0) {
      // Set initial position to first point
      const firstPoint = getPathPointByIndex(0, entityId);
      if (firstPoint) {
        entity.position.x = firstPoint.position.x;
        entity.position.y = firstPoint.position.y;
        entity.position.z = firstPoint.position.z;
        
        // Only aircraft have rotation
        if (firstPoint.rotation && entity.rotation) {
          entity.rotation.pitch = firstPoint.rotation.pitch;
          entity.rotation.roll = firstPoint.rotation.roll;
          entity.rotation.yaw = firstPoint.rotation.yaw;
        }
        
        // Update dimensions if present
        if (firstPoint.dimensions) {
          entity.dimensions = { ...firstPoint.dimensions };
        }
        
        // Update type if present
        if (firstPoint.type) {
          entity.type = firstPoint.type;
        }
      }
      entity.currentPathIndex = 0;
      
      console.log(`✨ Initialized ${entityId} (${entity.type}) with ${aircraftPaths.length} path points`);
    } else {
      console.error(`❌ Failed to load path data for ${entityId}`);
    }
  });
}

// Function to update entity positions using predetermined paths
function updateEntityPositions() {
  const currentTime = Date.now();
  
  Object.keys(entityData).forEach(entityId => {
    const entity = entityData[entityId];
    
    if (entity.isOnPath && aircraftPaths.length > 0) {
      const pathPoint = getPathPointByIndex(entity.currentPathIndex, entityId);

      if (pathPoint) {
        // Log the streaming data
        const logData = {
          position: pathPoint.position
        };
        if (pathPoint.rotation) logData.rotation = pathPoint.rotation;
        if (pathPoint.dimensions) logData.dimensions = pathPoint.dimensions;
        
        console.log(`📡 Streaming ${entity.type} ${entityId} (point ${entity.currentPathIndex + 1}/${aircraftPaths.length}, step ${STEP}):`, logData);

        entity.position.x = pathPoint.position.x;
        entity.position.y = pathPoint.position.y;
        entity.position.z = pathPoint.position.z;
        
        if (pathPoint.rotation && entity.rotation) {
          entity.rotation.pitch = pathPoint.rotation.pitch;
          entity.rotation.roll = pathPoint.rotation.roll;
          entity.rotation.yaw = pathPoint.rotation.yaw;
        }

        // Move to next index for the next tick (every Nth point)
        entity.currentPathIndex = entity.currentPathIndex + STEP;

        // End reached -> either loop or stop
        if (entity.currentPathIndex >= aircraftPaths.length) {
          if (LOOP_PATHS) {
            entity.currentPathIndex = 0;
            console.log(`🔁 ${entityId} looped back to start`);
          } else {
            entity.isOnPath = false;
            console.log(`✅ ${entityId} completed path`);
          }
        }
      } else {
        // No point found for this entity in the remaining path entries
        if (LOOP_PATHS) {
          entity.currentPathIndex = 0;
        } else {
          entity.isOnPath = false;
        }
      }
    }
    
    entity.timestamp = currentTime;
  });
}

// Function to broadcast entity positions to all connected clients
function broadcastEntityPositions() {
  if (wss.clients.size === 0) return; // No clients connected
  
  // Convert entity data to the format with entity IDs as keys
  const formattedData = {};
  Object.keys(entityData).forEach(entityId => {
    const entity = entityData[entityId];
    
    formattedData[entityId] = {
      type: entity.type,
      position: {
        x: entity.position.x,
        y: entity.position.y,
        z: entity.position.z
      }
    };
    
    // Only include rotation for aircraft
    if (entity.rotation) {
      formattedData[entityId].rotation = {
        yaw: entity.rotation.yaw,
        roll: entity.rotation.roll,
        pitch: entity.rotation.pitch
      };
    }
    
    // Include dimensions for objects
    if (entity.dimensions) {
      formattedData[entityId].dimensions = {
        width: entity.dimensions.width,
        height: entity.dimensions.height,
        length: entity.dimensions.length
      };
    }
  });
  
  const message = {
    type: 'entity_positions',
    data: formattedData,
    timestamp: Date.now()
  };
  
  const messageString = JSON.stringify(message);
  
  // Log the data being broadcast to clients
  console.log(`📤 Broadcasting to ${wss.clients.size} client(s): ${Object.keys(formattedData).join(', ')}`);
  
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
  
  // Send initial entity data to new client
  const formattedData = {};
  Object.keys(entityData).forEach(entityId => {
    const entity = entityData[entityId];
    
    formattedData[entityId] = {
      type: entity.type,
      position: {
        x: entity.position.x,
        y: entity.position.y,
        z: entity.position.z
      }
    };
    
    if (entity.rotation) {
      formattedData[entityId].rotation = {
        yaw: entity.rotation.yaw,
        roll: entity.rotation.roll,
        pitch: entity.rotation.pitch
      };
    }
    
    if (entity.dimensions) {
      formattedData[entityId].dimensions = {
        width: entity.dimensions.width,
        height: entity.dimensions.height,
        length: entity.dimensions.length
      };
    }
  });
  
  const initialMessage = {
    type: 'entity_positions',
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
      
      // Handle specific commands
      switch (message.type) {
        case 'restart_path':
          Object.keys(entityData).forEach(entityId => {
            const entity = entityData[entityId];
            entity.currentPathIndex = 0;
            entity.isOnPath = true;
            console.log(`🔄 Restarted path for ${entityId}`);
          });
          break;
          
        case 'stop_path':
          Object.keys(entityData).forEach(entityId => {
            const entity = entityData[entityId];
            entity.isOnPath = false;
            console.log(`⏹️ Stopped path for ${entityId}`);
          });
          break;
          
        case 'get_path_info':
          const pathInfo = {};
          Object.keys(entityData).forEach(entityId => {
            const entity = entityData[entityId];
            pathInfo[entityId] = {
              pointCount: aircraftPaths.length,
              currentProgress: entity.currentPathIndex,
              isComplete: entity.currentPathIndex >= aircraftPaths.length
            };
          });
          ws.send(JSON.stringify({
            type: 'path_info',
            data: pathInfo,
            timestamp: Date.now()
          }));
          break;
      }
      
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

// Initialize entities with path data
initializeEntities();

// Start the position update loop
const UPDATE_INTERVAL = 1000; // Update every second
setInterval(() => {
  updateEntityPositions();
  broadcastEntityPositions();
}, UPDATE_INTERVAL);

// Start the HTTP server
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0'; // Listen on all network interfaces
server.listen(PORT, HOST, () => {
  console.log(`✅ HTTP server running publicly on http://0.0.0.0:${PORT}`);
  console.log(`✅ WebSocket server running publicly on ws://0.0.0.0:${PORT}`);
  console.log(`🌐 Server accessible from any network interface`);
  console.log(`📡 Broadcasting entity positions every ${UPDATE_INTERVAL}ms`);
  console.log(`✨ Tracking ${Object.keys(entityData).length} entities: ${Object.keys(entityData).join(', ')}`);
  console.log(`📂 Using predetermined path data: ${aircraftPaths.length > 0 ? '✅ Loaded' : '❌ Failed'}`);
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


