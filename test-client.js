const WebSocket = require('ws');

console.log('🧪 Testing Aircraft WebSocket Server...');

const ws = new WebSocket('ws://localhost:8080');

let messageCount = 0;

ws.on('open', function open() {
  console.log('✅ Connected to WebSocket server!');
  
  // Send a test message
  ws.send(JSON.stringify({
    type: 'test_message',
    data: 'Hello from test client'
  }));
});

ws.on('message', function message(data) {
  try {
    const msg = JSON.parse(data);
    messageCount++;
    
    if (msg.type === 'aircraft_positions') {
      console.log(`📡 Received aircraft positions update #${messageCount}`);
      console.log(`   Aircraft count: ${msg.data.length}`);
      msg.data.forEach(aircraft => {
        console.log(`   ✈️  ${aircraft.tailNumber}: Lat ${aircraft.latitude.toFixed(4)}, Lon ${aircraft.longitude.toFixed(4)}, Alt ${aircraft.altitude.toFixed(0)}ft`);
      });
    } else if (msg.type === 'server_response') {
      console.log(`📨 Server response: ${msg.message}`);
    }
  } catch (error) {
    console.log('📡 Raw message:', data.toString());
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
});

ws.on('close', function close(code, reason) {
  console.log(`🔌 WebSocket closed: ${code} ${reason}`);
  console.log(`📊 Total messages received: ${messageCount}`);
});

// Keep the connection alive for 30 seconds
setTimeout(() => {
  console.log('🛑 Closing test connection...');
  ws.close();
}, 30000);

