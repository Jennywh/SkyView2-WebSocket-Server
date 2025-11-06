const WebSocket = require('ws');

console.log('🧪 Starting Collision Points Test Client...');

// Configuration
const SERVER_URL = process.env.WS_URL || 'ws://localhost:8082';
const HANGARS_TO_SUBSCRIBE = ['hangar_1', 'hangar_2', 'hangar_3'];

// Create WebSocket connection
console.log(`📡 Connecting to collision server at ${SERVER_URL}...`);
const ws = new WebSocket(SERVER_URL);

ws.on('open', () => {
  console.log('✅ Connected to collision server');
  
  // Subscribe to collision data from all hangars
  console.log(`📱 Subscribing to collision data from: ${HANGARS_TO_SUBSCRIBE.join(', ')}`);
  
  ws.send(JSON.stringify({
    type: 'subscribe',
    hangar_ids: HANGARS_TO_SUBSCRIBE
  }));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    
    switch (message.type) {
      case 'subscription_confirmed':
        console.log(`✅ Subscription confirmed for hangars: ${message.hangar_ids.join(', ')}`);
        break;
        
      case 'collision_points':
        console.log(`\n💥 COLLISION ALERT from ${message.hangar_id}:`);
        console.log(`   Timestamp: ${new Date(message.timestamp).toLocaleTimeString()}`);
        console.log(`   Number of collision points: ${message.data.length}`);
        
        message.data.forEach((point, index) => {
          console.log(`\n   Collision Point ${index + 1}:`);
          console.log(`     ID: ${point.id}`);
          console.log(`     Severity: ${point.severity.toUpperCase()}`);
          console.log(`     Confidence: ${(point.confidence * 100).toFixed(1)}%`);
          console.log(`     Position: (${point.position.x.toFixed(1)}, ${point.position.y.toFixed(1)}, ${point.position.z.toFixed(1)})`);
          console.log(`     Time to collision: ${point.time_to_collision.toFixed(1)}s`);
          console.log(`     Aircraft involved: ${point.aircraft_involved.length}`);
          console.log(`     Risk factors: ${point.risk_factors.join(', ') || 'None'}`);
          
          if (point.severity === 'critical') {
            console.log(`     🚨 CRITICAL COLLISION IMMINENT! 🚨`);
          }
        });
        break;
        
      default:
        console.log(`📥 Received message: ${message.type}`);
        break;
    }
  } catch (error) {
    console.error('❌ Error parsing message:', error.message);
    console.error('Raw data:', data.toString());
  }
});

ws.on('close', (code, reason) => {
  console.log(`❌ Connection closed (${code}${reason ? ': ' + reason : ''})`);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Disconnecting from collision server...');
  ws.close();
  process.exit(0);
});

console.log('🧪 Collision test client ready');
console.log('📡 Listening for collision points...');
console.log('Press Ctrl+C to stop');
