# Hangar WebSocket Routing System

This server implements a hub-and-spoke routing architecture where Orin devices (publishers) send tracked object data tagged with a `hangar_id`, and mobile clients (subscribers) receive data only from the hangars they're interested in.

## Architecture

```
┌─────────────────────────────────────────────┐
│      WebSocket Routing Server              │
│      (aircraft-websocket-server.js)         │
│                                              │
│  Publishers Map: hangar_id → WebSocket      │
│  Subscribers Map: WebSocket → Set<hangar_id>│
└─────────────────────────────────────────────┘
         ▲              ▲              ▲
         │              │              │
    ┌────┴───┐     ┌────┴───┐     ┌────┴────┐
    │ Orin 1 │     │ Orin 2 │     │ Client  │
    │hangar_1│     │hangar_2│     │Subscribe│
    └────────┘     └────────┘     └─────────┘
    Publishes      Publishes      to hangar_2
    at 10Hz        at 10Hz
```

## Message Protocol

### Publisher Messages (Orin → Server)

#### 1. Register as Publisher
```json
{
  "type": "register_publisher",
  "hangar_id": "hangar_1"
}
```

**Response:**
```json
{
  "type": "registration_confirmed",
  "hangar_id": "hangar_1",
  "timestamp": 1234567890
}
```

#### 2. Send Tracked Objects
```json
{
  "type": "tracked_objects",
  "hangar_id": "hangar_1",
  "data": [
    {
      "oid_71d703b9": {
        "position": { "x": 15.95, "y": -3.04, "z": -7.01 },
        "dimensions": { "length": 25.18, "width": 19.81, "height": 4.91 },
        "type": "unknown"
      },
      "oid_22969d5b": {
        "position": { "x": -4.24, "y": 6.44, "z": -5.78 },
        "dimensions": { "length": 12.4, "width": 20.19, "height": 4.42 },
        "type": "unknown"
      }
    }
  ],
  "timestamp": 1234567890
}
```

### Subscriber Messages (Client → Server)

#### 1. Subscribe to Hangar(s)
```json
{
  "type": "subscribe",
  "hangar_ids": ["hangar_1", "hangar_2"]
}
```

**Response:**
```json
{
  "type": "subscription_confirmed",
  "hangar_ids": ["hangar_1", "hangar_2"],
  "timestamp": 1234567890
}
```

#### 2. Unsubscribe from Hangar(s)
```json
{
  "type": "unsubscribe",
  "hangar_ids": ["hangar_1"]
}
```

**Response:**
```json
{
  "type": "unsubscription_confirmed",
  "hangar_ids": ["hangar_1"],
  "timestamp": 1234567890
}
```

### Server → Subscriber Messages

#### Tracked Objects Update
```json
{
  "type": "tracked_objects",
  "hangar_id": "hangar_1",
  "data": [
    {
      "oid_71d703b9": {
        "position": { "x": 15.95, "y": -3.04, "z": -7.01 },
        "dimensions": { "length": 25.18, "width": 19.81, "height": 4.91 },
        "type": "unknown"
      }
    }
  ],
  "timestamp": 1234567890
}
```

## Running the System

### 1. Start the Routing Server

```bash
npm start
```

The server will:
- Listen on port 8080 (or `PORT` env variable)
- Provide HTTP health check at `http://localhost:8080`
- Accept WebSocket connections at `ws://localhost:8080`

### 2. Start Mock Orin Publishers (for testing)

```bash
npm run mock-orin
```

This simulates 3 Orins publishing at 10 Hz:
- `hangar_1` - 5-10 tracked objects
- `hangar_2` - 5-10 tracked objects  
- `hangar_3` - 5-10 tracked objects

### 3. Test with Subscriber Client

```bash
# Subscribe to hangar_2 (default)
npm run test-sub

# Subscribe to specific hangar
HANGAR=hangar_1 npm run test-sub
```

The test subscriber will:
- Connect and subscribe to specified hangar
- Display received messages
- Auto-switch hangars after 15 seconds (for demo)

### 4. Health Check

```bash
curl http://localhost:8080
```

**Response:**
```json
{
  "status": "running",
  "publishers": 3,
  "subscribers": 1,
  "activeHangars": ["hangar_1", "hangar_2", "hangar_3"],
  "uptime": 123.456
}
```

## ROS Integration (Orin Devices)

### Python WebSocket Client for ROS

```python
import websockets.sync.client
import ssl
import json
import threading

class HangarPublisher:
    def __init__(self, hangar_id, server_url):
        self.hangar_id = hangar_id
        self.server_url = server_url
        self.ws = None
        self.ws_lock = threading.Lock()
        self.connect()
    
    def connect(self):
        """Establish persistent WebSocket connection"""
        try:
            ssl_context = ssl.create_default_context()
            self.ws = websockets.sync.client.connect(
                self.server_url,
                ssl=ssl_context,
                open_timeout=10,
                ping_interval=20,
                ping_timeout=10
            )
            
            # Register as publisher
            register_msg = json.dumps({
                "type": "register_publisher",
                "hangar_id": self.hangar_id
            })
            self.ws.send(register_msg)
            print(f"✅ Connected: {self.hangar_id}")
            
        except Exception as e:
            print(f"Connection failed: {e}")
            self.ws = None
    
    def publish(self, tracked_objects):
        """Send tracked objects to server"""
        with self.ws_lock:
            if self.ws is None:
                self.connect()
                if self.ws is None:
                    return False
            
            try:
                message = json.dumps({
                    "type": "tracked_objects",
                    "hangar_id": self.hangar_id,
                    "data": [tracked_objects],  # Wrap in array
                    "timestamp": time.time()
                })
                
                self.ws.send(message)
                return True
                
            except Exception as e:
                print(f"Send failed: {e}")
                self.ws = None
                return False
    
    def close(self):
        if self.ws:
            self.ws.close()

# Usage in ROS node
publisher = HangarPublisher("hangar_1", "wss://your-app.onrender.com")

# In your ROS timer callback (10 Hz)
def timer_callback(self):
    tracked_objects = {
        "oid_123": {
            "position": {"x": 1.0, "y": 2.0, "z": 3.0},
            "dimensions": {"length": 5.0, "width": 3.0, "height": 2.0},
            "type": "unknown"
        }
    }
    publisher.publish(tracked_objects)
```

### Launch with Hangar ID

```bash
# Launch ROS node with specific hangar ID
ros2 run your_package your_node --ros-args -p hangar_id:=hangar_1
```

## Mobile App Integration

### React Native / Expo Example

```javascript
import { useState, useEffect } from 'react';

function useHangarData(hangarId) {
  const [ws, setWs] = useState(null);
  const [trackedObjects, setTrackedObjects] = useState({});
  
  useEffect(() => {
    const websocket = new WebSocket('wss://your-app.onrender.com');
    
    websocket.onopen = () => {
      console.log('Connected');
      
      // Subscribe to hangar
      websocket.send(JSON.stringify({
        type: 'subscribe',
        hangar_ids: [hangarId]
      }));
    };
    
    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'tracked_objects') {
        // Data is wrapped in array, extract first element
        setTrackedObjects(message.data[0]);
      }
    };
    
    setWs(websocket);
    
    return () => websocket.close();
  }, [hangarId]);
  
  return { trackedObjects };
}

// Usage in component
function HangarView({ hangarId }) {
  const { trackedObjects } = useHangarData(hangarId);
  
  return (
    <View>
      <Text>Viewing: {hangarId}</Text>
      <Text>Objects: {Object.keys(trackedObjects).length}</Text>
      <ThreeDScene objects={trackedObjects} />
    </View>
  );
}
```

### Switching Hangars

```javascript
const switchHangar = (oldHangarId, newHangarId) => {
  // Unsubscribe from old
  ws.send(JSON.stringify({
    type: 'unsubscribe',
    hangar_ids: [oldHangarId]
  }));
  
  // Subscribe to new
  ws.send(JSON.stringify({
    type: 'subscribe',
    hangar_ids: [newHangarId]
  }));
};
```

## Data Flow

1. **Orin connects** → Sends `register_publisher` with `hangar_id`
2. **Server stores** → Maps `hangar_id` to WebSocket connection
3. **Orin publishes** → Sends `tracked_objects` at 10 Hz with `hangar_id`
4. **Client connects** → Sends `subscribe` with desired `hangar_ids`
5. **Server routes** → Forwards messages only to subscribed clients
6. **Client receives** → Gets data only from subscribed hangars

## Performance

### Data Volume (per Orin at 10 Hz)

- Message size: ~2 KB (9 objects with positions/dimensions)
- Rate: 10 messages/second
- Bandwidth: ~20 KB/s per Orin

### Server Capacity

| # Orins | Data In | # Clients | Data Out (per client) |
|---------|---------|-----------|----------------------|
| 1       | 20 KB/s | 10        | 20 KB/s             |
| 10      | 200 KB/s| 10        | 20 KB/s             |
| 20      | 400 KB/s| 20        | 20 KB/s             |

**Render Free Tier**: Can handle 10-20 Orins with persistent connections

## Deployment

### Environment Variables

- `PORT` - Server port (default: 8080)
- `WS_URL` - WebSocket server URL for clients/publishers

### Production URLs

**HTTP Health Check:**
```
https://your-app.onrender.com
```

**WebSocket Endpoint:**
```
wss://your-app.onrender.com
```

### Deploy to Render

The existing `render.yaml` configuration works without changes:

```yaml
services:
  - type: web
    name: skyview2-websocket-server
    env: node
    buildCommand: npm install
    startCommand: npm start
```

## Troubleshooting

### Publisher Not Registering

- Ensure `hangar_id` is included in `register_publisher` message
- Check server logs for registration confirmation
- Verify WebSocket connection is open before sending

### Client Not Receiving Data

- Ensure client sent `subscribe` message with valid `hangar_ids`
- Check that `hangar_id` matches between publisher and subscriber
- Verify at least one Orin is publishing to that hangar
- Check server health endpoint for active hangars

### Connection Drops

- Implement reconnection logic with exponential backoff
- Use persistent connections instead of connect/disconnect per message
- Monitor server logs for error messages

### High Latency

- Ensure using persistent WebSocket connections (not reconnecting each message)
- Check network connectivity between Orin and server
- Verify Render app is not sleeping (free tier sleeps after 15 min inactivity)

## Testing Checklist

- [ ] Server starts and shows routing info
- [ ] Health check endpoint returns correct data
- [ ] Mock Orins connect and register
- [ ] Mock Orins publish at 10 Hz
- [ ] Test subscriber can subscribe to specific hangar
- [ ] Test subscriber receives only subscribed hangar data
- [ ] Switching hangars works correctly
- [ ] Disconnection/reconnection handled gracefully
- [ ] Multiple subscribers can connect simultaneously
- [ ] Data routing is selective (no broadcast to all)

