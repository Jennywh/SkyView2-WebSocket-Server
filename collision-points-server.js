const WebSocket = require('ws');
const http = require('http');

console.log('💥 Starting Collision Points WebSocket Server...');

// Track collision data publishers and subscribers
const publishers = new Map(); // hangar_id -> WebSocket
const subscribers = new Map(); // WebSocket -> Set<hangar_id>

// Create HTTP server for health checks
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'running',
    service: 'collision-points',
    publishers: publishers.size,
    subscribers: subscribers.size,
    activeHangars: Array.from(publishers.keys()),
    uptime: process.uptime()
  }));
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const clientIP = req.socket.remoteAddress;
  console.log(`✅ New connection from ${clientIP}`);
  
  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'register_publisher':
          // Collision system registering as data publisher
          handlePublisherRegistration(ws, message, clientIP);
          break;
          
        case 'subscribe':
        case 'subscribe_collision_points':
          // Client wants to receive collision data from specific hangar(s)
          handleSubscribe(ws, message, clientIP);
          break;
          
        case 'unsubscribe':
          // Client wants to stop receiving collision data from hangar(s)
          handleUnsubscribe(ws, message, clientIP);
          break;
          
        case 'collision_points':
          // Collision system sending collision point data
          handleCollisionPoints(ws, message, clientIP);
          break;
          
        default:
          console.log(`❓ Unknown message type: ${message.type} from ${clientIP}`);
          break;
      }
    } catch (error) {
      console.error(`❌ Error parsing message from ${clientIP}:`, error.message);
      console.error('Raw data:', data.toString());
    }
  });

  // Handle connection close
  ws.on('close', (code, reason) => {
    console.log(`❌ Connection closed from ${clientIP} (${code}${reason ? ': ' + reason : ''})`);
    
    // Remove from publishers if it was a publisher
    for (const [hangarId, publisherWs] of publishers.entries()) {
      if (publisherWs === ws) {
        publishers.delete(hangarId);
        console.log(`📤 Removed publisher for hangar: ${hangarId}`);
        break;
      }
    }
    
    // Remove from subscribers
    subscribers.delete(ws);
  });

  // Handle connection errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error from ${clientIP}:`, error.message);
  });
});

// Handle publisher registration
function handlePublisherRegistration(ws, message, clientIP) {
  const hangarId = message.hangar_id;
  
  if (!hangarId) {
    console.error(`❌ Publisher registration missing hangar_id from ${clientIP}`);
    return;
  }
  
  publishers.set(hangarId, ws);
  ws.isPublisher = true;
  ws.hangarId = hangarId;
  
  console.log(`📤 Registered collision publisher for hangar: ${hangarId} from ${clientIP}`);
  
  // Send confirmation
  ws.send(JSON.stringify({
    type: 'registration_confirmed',
    hangar_id: hangarId,
    service: 'collision-points',
    timestamp: Date.now()
  }));
}

// Handle client subscription
function handleSubscribe(ws, message, clientIP) {
  const hangarIds = message.hangar_ids || [];
  
  if (!Array.isArray(hangarIds) || hangarIds.length === 0) {
    console.error(`❌ Subscribe message missing hangar_ids from ${clientIP}`);
    return;
  }
  
  if (!subscribers.has(ws)) {
    subscribers.set(ws, new Set());
  }
  
  const subscribedSet = subscribers.get(ws);
  hangarIds.forEach(id => subscribedSet.add(id));
  
  ws.isSubscriber = true;
  
  console.log(`📱 Client ${clientIP} subscribed to collision data from: ${hangarIds.join(', ')}`);
  console.log(`   Total subscriptions for this client: ${subscribedSet.size}`);
  
  // Send confirmation
  ws.send(JSON.stringify({
    type: 'subscription_confirmed',
    hangar_ids: hangarIds,
    service: 'collision-points',
    timestamp: Date.now()
  }));
}

// Handle client unsubscribe
function handleUnsubscribe(ws, message, clientIP) {
  const hangarIds = message.hangar_ids || [];
  
  if (!subscribers.has(ws)) {
    return;
  }
  
  const subscribedSet = subscribers.get(ws);
  hangarIds.forEach(id => subscribedSet.delete(id));
  
  console.log(`📱 Client ${clientIP} unsubscribed from collision data from: ${hangarIds.join(', ')}`);
  console.log(`   Remaining subscriptions for this client: ${subscribedSet.size}`);

  // Send confirmation
  ws.send(JSON.stringify({
    type: 'unsubscription_confirmed',
    hangar_ids: hangarIds,
    service: 'collision-points',
    timestamp: Date.now()
  }));
}

// Handle collision points data from collision system
function handleCollisionPoints(ws, message, clientIP) {
  const hangarId = message.hangar_id;
  const data = message.data;
  
  if (!hangarId) {
    console.error(`❌ Collision points message missing hangar_id from ${clientIP}`);
    return;
  }
  
  if (!data) {
    console.error(`❌ Collision points message missing data from ${clientIP}`);
    return;
  }
  
  // Broadcast to all subscribers of this hangar
  let subscriberCount = 0;
  subscribers.forEach((subscribedHangars, subscriberWs) => {
    if (subscriberWs.readyState === WebSocket.OPEN && subscribedHangars.has(hangarId)) {
      try {
        subscriberWs.send(JSON.stringify({
          type: 'collision_points',
          hangar_id: hangarId,
          data: data,
          timestamp: Date.now()
        }));
        subscriberCount++;
      } catch (error) {
        console.error(`❌ Error sending collision data to subscriber:`, error.message);
      }
    }
  });
  
  console.log(`💥 [${hangarId}] COLLISION POINTS data broadcast to ${subscriberCount} subscribers (not object tracking)`);
}

// Start the server
const PORT = process.env.PORT || 8082;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`💥 Collision Points WebSocket Server running on http://0.0.0.0:${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://0.0.0.0:${PORT}`);
  console.log(`🏥 Health check: http://0.0.0.0:${PORT}/`);
  console.log('💥 Ready for collision point connections!');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down collision points server...');
  
  // Close all WebSocket connections
  wss.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });
  
  // Close the server
  server.close(() => {
    console.log('✅ Collision points server shut down gracefully');
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
