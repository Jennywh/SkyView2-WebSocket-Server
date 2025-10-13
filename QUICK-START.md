# Quick Start Guide - Hangar Routing System

## What Changed?

The WebSocket server has been transformed from a simple broadcast system to a **hub-and-spoke routing system** where:
- **Orins (publishers)** send data tagged with `hangar_id`
- **Clients (subscribers)** receive data only from hangars they subscribe to
- **Server** routes messages intelligently based on `hangar_id`

## Testing the System Locally

### Terminal 1: Start the Server
```bash
npm start
```

You should see:
```
🚀 Starting Hangar WebSocket Routing Server...
✅ HTTP health check: http://0.0.0.0:8080
✅ WebSocket endpoint: ws://0.0.0.0:8080
📡 Routing system: Publishers → Subscribers by hangar_id
🚀 Server ready for connections!
```

### Terminal 2: Start Mock Orins (Simulates 3 Hangars)
```bash
npm run mock-orin
```

You should see:
```
🤖 Started 3 mock Orin publishers
📡 Publishing to: ws://localhost:8080
⚡ Rate: 10 Hz (every 100ms)
🏢 Hangars: hangar_1, hangar_2, hangar_3

✅ [hangar_1] Connected to server
✅ [hangar_2] Connected to server
✅ [hangar_3] Connected to server
📤 [hangar_1] Published 7 objects
📤 [hangar_2] Published 8 objects
```

### Terminal 3: Start Test Subscriber (Mobile Client Simulation)
```bash
# Subscribe to hangar_2 (default)
npm run test-sub

# Or specify a hangar
HANGAR=hangar_1 npm run test-sub
```

You should see:
```
📱 Starting Test Subscriber Client...
✅ Connected to server
📝 Subscribing to: hangar_2
✅ Subscription confirmed for: hangar_2
📡 Waiting for tracked objects...

📥 [1] Received from hangar_2: 8 objects
📥 [2] Received from hangar_2: 8 objects
📥 [10] Received from hangar_2: 8 objects
   Sample objects:
     oid_a1b2c3d4:
       Position: (15.23, -4.56, -7.12)
       Dimensions: 18.5x14.2x5.3
```

### Terminal 4: Check Health Status
```bash
curl http://localhost:8080
```

Response:
```json
{
  "status": "running",
  "publishers": 3,
  "subscribers": 1,
  "activeHangars": ["hangar_1", "hangar_2", "hangar_3"],
  "uptime": 45.678
}
```

## How It Works

### 1. Orin (Publisher) Flow
```python
# Connect to server
ws = websockets.sync.client.connect("wss://your-app.onrender.com")

# Register as publisher
ws.send(json.dumps({
    "type": "register_publisher",
    "hangar_id": "hangar_1"
}))

# Publish tracked objects at 10 Hz
ws.send(json.dumps({
    "type": "tracked_objects",
    "hangar_id": "hangar_1",
    "data": [tracked_objects],
    "timestamp": time.time()
}))
```

### 2. Client (Subscriber) Flow
```javascript
// Connect to server
const ws = new WebSocket('wss://your-app.onrender.com');

// Subscribe to specific hangar
ws.send(JSON.stringify({
  type: 'subscribe',
  hangar_ids: ['hangar_1']
}));

// Receive only hangar_1 data
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'tracked_objects') {
    console.log('Hangar:', message.hangar_id);
    console.log('Objects:', message.data[0]);
  }
};
```

### 3. Server Routes Messages
- Receives `tracked_objects` from Orin with `hangar_id`
- Finds all subscribers interested in that `hangar_id`
- Forwards message only to those subscribers
- No broadcasting to uninterested clients!

## Files Created/Modified

### Modified
- ✅ `aircraft-websocket-server.js` - Complete rewrite with routing logic
- ✅ `package.json` - Added `mock-orin` and `test-sub` scripts

### Created
- ✅ `mock-orin-publisher.js` - Simulates 3 Orins publishing at 10 Hz
- ✅ `test-subscriber.js` - Test client that subscribes to hangars
- ✅ `HANGAR-ROUTING.md` - Complete documentation
- ✅ `QUICK-START.md` - This guide!

## Key Features

### ✅ Selective Data Routing
- Clients only receive data from subscribed hangars
- Saves bandwidth and processing power
- Multiple clients can subscribe to different hangars

### ✅ Multiple Hangar Support
- Unlimited Orins can connect with different `hangar_id`s
- Each Orin publishes independently at 10 Hz
- Server tracks all active hangars

### ✅ Dynamic Subscription
- Clients can subscribe/unsubscribe anytime
- Switch hangars without reconnecting
- Subscribe to multiple hangars simultaneously

### ✅ Production Ready
- Persistent connections (no reconnect overhead)
- Automatic cleanup on disconnect
- Graceful error handling
- Health monitoring endpoint

## Next Steps

### For Your ROS Nodes (Orin)

Update your ROS code to:
1. Use persistent WebSocket connection (not reconnect per message)
2. Include `hangar_id` in registration and data messages
3. Handle reconnection on failure

See `HANGAR-ROUTING.md` for complete ROS integration code.

### For Your Mobile App

Update your app to:
1. Connect to WebSocket server
2. Send `subscribe` message with selected hangar ID
3. Receive and display tracked objects
4. Switch hangars by unsubscribe/subscribe

See `HANGAR-ROUTING.md` for React Native/Expo examples.

### For Deployment

1. Deploy to Render (existing config works!)
2. Update Orin devices with production URL: `wss://your-app.onrender.com`
3. Update mobile app with production URL
4. Test with real Orins!

## Troubleshooting

### Mock Orins Can't Connect
```bash
# Make sure server is running first
npm start

# Then in another terminal
npm run mock-orin
```

### Subscriber Not Receiving Data
```bash
# Check that hangar_id matches
# Server: hangar_1, hangar_2, hangar_3
HANGAR=hangar_1 npm run test-sub
```

### Check What's Running
```bash
# Health check shows active publishers/subscribers
curl http://localhost:8080
```

## Performance Notes

- **10 Orins at 10 Hz**: ~200 KB/s total data in
- **Each client**: ~20 KB/s (only subscribed hangars)
- **Render Free Tier**: Can handle 10-20 Orins comfortably
- **Key**: Use persistent connections (avoid SSL handshake overhead)

## Documentation

- 📚 Full protocol details: `HANGAR-ROUTING.md`
- 🚀 Deployment guide: `RENDER_DEPLOYMENT.md`
- 🔧 This quick start: `QUICK-START.md`

---

**Your hangar routing system is ready to test! 🎉**

