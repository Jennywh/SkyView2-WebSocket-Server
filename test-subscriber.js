const WebSocket = require('ws');

console.log('📱 Starting Test Subscriber Client...');

// Configuration
const SERVER_URL = process.env.WS_URL || 'ws://localhost:8080';
const SUBSCRIBE_TO = process.env.HANGAR || 'hangar_2'; // Default to hangar_2

let ws;
let messageCount = 0;

function connect() {
  console.log(`📡 Connecting to ${SERVER_URL}...`);
  
  ws = new WebSocket(SERVER_URL);
  
  ws.on('open', () => {
    console.log('✅ Connected to server');
    
    // Subscribe to specific hangar
    const subscribeMessage = {
      type: 'subscribe',
      hangar_ids: [SUBSCRIBE_TO]
    };
    
    console.log(`📝 Subscribing to: ${SUBSCRIBE_TO}`);
    ws.send(JSON.stringify(subscribeMessage));
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'subscription_confirmed':
          console.log(`✅ Subscription confirmed for: ${message.hangar_ids.join(', ')}`);
          console.log('📡 Waiting for tracked objects...\n');
          break;
          
        case 'tracked_objects':
          messageCount++;
          const objectData = message.data[0]; // Data is wrapped in array
          const objectCount = Object.keys(objectData).length;
          
          console.log(`📥 [${messageCount}] Received from ${message.hangar_id}: ${objectCount} objects`);
          
          // Show details every 10 messages (1 second at 10Hz)
          if (messageCount % 10 === 0) {
            console.log(`   Sample objects:`);
            const objectIds = Object.keys(objectData).slice(0, 3);
            objectIds.forEach(oid => {
              const obj = objectData[oid];
              console.log(`     ${oid}:`);
              console.log(`       Position: (${obj.position.x.toFixed(2)}, ${obj.position.y.toFixed(2)}, ${obj.position.z.toFixed(2)})`);
              console.log(`       Dimensions: ${obj.dimensions.length.toFixed(1)}x${obj.dimensions.width.toFixed(1)}x${obj.dimensions.height.toFixed(1)}`);
            });
            console.log('');
          }
          break;
          
        default:
          console.log(`📨 Received message type: ${message.type}`);
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error.message);
    }
  });
  
  ws.on('close', (code, reason) => {
    console.log(`❌ Disconnected (${code}${reason ? ': ' + reason : ''})`);
    console.log('🔄 Reconnecting in 5 seconds...');
    setTimeout(connect, 5000);
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
  });
}

// Test switching hangars after 15 seconds
setTimeout(() => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const newHangar = SUBSCRIBE_TO === 'hangar_1' ? 'hangar_2' : 'hangar_1';
    
    console.log(`\n🔄 Switching subscription to ${newHangar}...\n`);
    
    // Unsubscribe from current
    ws.send(JSON.stringify({
      type: 'unsubscribe',
      hangar_ids: [SUBSCRIBE_TO]
    }));
    
    // Subscribe to new
    ws.send(JSON.stringify({
      type: 'subscribe',
      hangar_ids: [newHangar]
    }));
    
    messageCount = 0; // Reset counter
  }
}, 15000);

// Connect
connect();

console.log(`📱 Test subscriber started`);
console.log(`📡 Server: ${SERVER_URL}`);
console.log(`🏢 Subscribing to: ${SUBSCRIBE_TO}`);
console.log('');
console.log('💡 Tips:');
console.log('   - Set HANGAR env var to subscribe to different hangar');
console.log('   - Example: HANGAR=hangar_1 npm run test-sub');
console.log('   - Will auto-switch hangars after 15 seconds for demo');
console.log('');
console.log('Press Ctrl+C to stop');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  
  if (ws) {
    ws.close();
  }
  
  setTimeout(() => {
    console.log('✅ Subscriber stopped');
    process.exit(0);
  }, 1000);
});

