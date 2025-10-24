const WebSocket = require('ws');
const http = require('http');

console.log('🚀 Starting Hangar WebSocket Routing Server...');

// Track publishers (Orins) and subscribers (mobile clients)
const publishers = new Map(); // hangar_id -> WebSocket
const subscribers = new Map(); // WebSocket -> Set<hangar_id>

// Create HTTP server for health checks
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'running',
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
          // Orin device registering as data publisher
          handlePublisherRegistration(ws, message, clientIP);
          break;
          
        case 'subscribe':
          // Client wants to receive data from specific hangar(s)
          handleSubscribe(ws, message, clientIP);
          break;
          
        case 'unsubscribe':
          // Client wants to stop receiving data from hangar(s)
          handleUnsubscribe(ws, message, clientIP);
          break;
          
        case 'tracked_objects':
          // Orin sending tracked object data
          handleTrackedObjects(ws, message, clientIP);
          break;
          
        case 'object_identification':
          // Client sending object identification to publisher
          handleObjectIdentification(ws, message, clientIP);
          break;
          
        default:
          console.log(`📨 Unknown message type from ${clientIP}:`, message.type);
      }
    } catch (error) {
      console.error(`❌ Error parsing message from ${clientIP}:`, error.message);
    }
  });
  
  // Handle client disconnect
  ws.on('close', (code, reason) => {
    handleDisconnect(ws, clientIP, code, reason);
  });
  
  // Handle client errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${clientIP}:`, error.message);
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
  ws.hangarId = hangarId; // Store hangar_id on the WebSocket object
  ws.isPublisher = true;
  
  console.log(`📡 Publisher registered: ${hangarId} from ${clientIP}`);
  
  // Send confirmation
  ws.send(JSON.stringify({
    type: 'registration_confirmed',
    hangar_id: hangarId,
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
  
  console.log(`📱 Client ${clientIP} subscribed to: ${hangarIds.join(', ')}`);
  console.log(`   Total subscriptions for this client: ${subscribedSet.size}`);
  
  // Send confirmation
  ws.send(JSON.stringify({
    type: 'subscription_confirmed',
    hangar_ids: hangarIds,
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
  
  console.log(`📱 Client ${clientIP} unsubscribed from: ${hangarIds.join(', ')}`);
  
  // If no more subscriptions, remove from subscribers map
  if (subscribedSet.size === 0) {
    subscribers.delete(ws);
  }
  
  // Send confirmation
  ws.send(JSON.stringify({
    type: 'unsubscription_confirmed',
    hangar_ids: hangarIds,
    timestamp: Date.now()
  }));
}

// Handle tracked objects data from Orin
function handleTrackedObjects(ws, message, clientIP) {
  const hangarId = message.hangar_id;
  const data = message.data;
  
  if (!hangarId) {
    console.error(`❌ Tracked objects missing hangar_id from ${clientIP}`);
    return;
  }
  
  // Count subscribers interested in this hangar
  let routedCount = 0;
  
  // Broadcast to all clients subscribed to this hangar
  subscribers.forEach((hangarIds, clientWs) => {
    if (hangarIds.has(hangarId) && clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({
        type: 'tracked_objects',
        hangar_id: hangarId,
        data: data,
        timestamp: message.timestamp || Date.now()
      }));
      routedCount++;
    }
  });
  
  if (routedCount > 0) {
    console.log(`📤 Routed ${hangarId} data to ${routedCount} subscriber(s)`);
  }
}

// Handle object identification from client to publisher
function handleObjectIdentification(ws, message, clientIP) {
  const hangarId = message.hangar_id;
  const data = message.data;
  
  if (!hangarId) {
    console.error(`❌ Object identification missing hangar_id from ${clientIP}`);
    return;
  }
  
  // Find the publisher for this hangar
  const publisherWs = publishers.get(hangarId);
  
  if (!publisherWs || publisherWs.readyState !== WebSocket.OPEN) {
    console.log(`⚠️ No active publisher for ${hangarId}, cannot forward object_identification`);
    return;
  }
  
  // Forward the message to the publisher
  publisherWs.send(JSON.stringify({
    type: 'object_identification',
    hangar_id: hangarId,
    data: data,
    timestamp: message.timestamp || Date.now()
  }));
  
  console.log(`📥 Forwarded object_identification to ${hangarId} publisher: ${JSON.stringify(data)}`);
}

// Handle disconnect
function handleDisconnect(ws, clientIP, code, reason) {
  if (ws.isPublisher && ws.hangarId) {
    // Remove publisher
    publishers.delete(ws.hangarId);
    console.log(`❌ Publisher disconnected: ${ws.hangarId} from ${clientIP} (${code})`);
  }
  
  if (ws.isSubscriber) {
    // Remove subscriber
    subscribers.delete(ws);
    console.log(`❌ Subscriber disconnected from ${clientIP} (${code})`);
  }
  
  if (!ws.isPublisher && !ws.isSubscriber) {
    console.log(`❌ Client disconnected from ${clientIP} (${code}) - was not registered`);
  }
}

// Handle WebSocket server errors
wss.on('error', (error) => {
  console.error('❌ WebSocket server error:', error);
});

// Start the HTTP server
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`✅ HTTP health check: http://0.0.0.0:${PORT}`);
  console.log(`✅ WebSocket endpoint: ws://0.0.0.0:${PORT}`);
  console.log(`🌐 Server accessible from any network interface`);
  console.log(`📡 Routing system: Publishers → Subscribers by hangar_id`);
  console.log('🚀 Server ready for connections!');
  console.log('');
  console.log('📋 Message Types:');
  console.log('   Publishers (Orins):');
  console.log('     - register_publisher: { type, hangar_id }');
  console.log('     - tracked_objects: { type, hangar_id, data, timestamp }');
  console.log('   Subscribers (Clients):');
  console.log('     - subscribe: { type, hangar_ids: [...] }');
  console.log('     - unsubscribe: { type, hangar_ids: [...] }');
  console.log('     - object_identification: { type, hangar_id, data }');
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


