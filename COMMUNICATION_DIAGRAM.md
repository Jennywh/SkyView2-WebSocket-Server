# WebSocket Communication Flow Diagram

## Three-Way Communication Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           WebSocket Server (Render.com)                        │
│                        aircraft-websocket-server.js                            │
│                                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐            │
│  │   Publishers    │    │   Subscribers   │    │   Message       │            │
│  │   Map           │    │   Map           │    │   Router        │            │
│  │                 │    │                 │    │                 │            │
│  │ hangar_1 → ws1  │    │ ws1 → {hangar_1}│    │ Routes by       │            │
│  │ hangar_2 → ws2  │    │ ws2 → {hangar_1,│    │ hangar_id       │            │
│  │ hangar_3 → ws3  │    │         hangar_2}│    │                 │            │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘            │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ WebSocket Connections
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
    ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐
    │   Mock Publisher    │ │   Client App        │ │   Additional        │
    │   (Orin Device)     │ │   (Mobile/Web)      │ │   Clients           │
    │                     │ │                     │ │                     │
    │ mock-orin-publisher │ │ WebSocketService    │ │ (Multiple           │
    │ .py                 │ │                     │ │  Subscribers)       │
    └─────────────────────┘ └─────────────────────┘ └─────────────────────┘
```

## Message Flow Diagram

### 1. Publisher Registration & Data Flow
```
Mock Publisher ──────► WebSocket Server ──────► Client(s)
     │                        │                      │
     │ register_publisher     │                      │
     │ {type, hangar_id}      │                      │
     │ ──────────────────────►│                      │
     │                        │                      │
     │ ◄──────────────────────│                      │
     │ registration_confirmed │                      │
     │                        │                      │
     │ tracked_objects        │                      │
     │ {type, hangar_id,      │                      │
     │  data, timestamp}      │                      │
     │ ──────────────────────►│                      │
     │                        │                      │
     │                        │ tracked_objects      │
     │                        │ {type, hangar_id,    │
     │                        │  data, timestamp}    │
     │                        │ ────────────────────►│
```

### 2. Client Subscription Flow
```
Client ──────────────────► WebSocket Server
     │                           │
     │ subscribe                  │
     │ {type, hangar_ids: [...]} │
     │ ─────────────────────────►│
     │                           │
     │ ◄─────────────────────────│
     │ subscription_confirmed    │
     │ {type, hangar_ids,        │
     │  timestamp}               │
```

### 3. Object Identification Flow (Client → Publisher)
```
Client ──────────────────► WebSocket Server ──────────────────► Publisher
     │                           │                               │
     │ object_identification     │                               │
     │ {type, hangar_id,         │                               │
     │  data: {object_id,        │                               │
     │         name,             │                               │
     │         isAirplane}}      │                               │
     │ ─────────────────────────►│                               │
     │                           │                               │
     │                           │ object_identification         │
     │                           │ {type, hangar_id,             │
     │                           │  data: {object_id,            │
     │                           │         name,                 │
     │                           │         isAirplane}}          │
     │                           │ ─────────────────────────────►│
```

## Message Types & Data Structures

### Publisher Messages (Mock Orin → Server)
```javascript
// Registration
{
  type: "register_publisher",
  hangar_id: "hangar_1"
}

// Data Publishing (10Hz)
{
  type: "tracked_objects",
  hangar_id: "hangar_1",
  data: [{
    "N717NT": {
      type: "aircraft",
      position: { x: 10.5, y: -5.2, z: -2.1 },
      rotation: { yaw: 45.0, roll: 2.1, pitch: -1.5 }
    },
    "oid_12345678": {
      type: "unknown",
      position: { x: 15.3, y: 8.7, z: -3.2 },
      dimensions: { width: 5.0, height: 2.5, length: 8.0 }
    }
  }],
  timestamp: 1234567890123
}
```

### Client Messages (Client → Server)
```javascript
// Subscription
{
  type: "subscribe",
  hangar_ids: ["hangar_1", "hangar_2"]
}

// Unsubscription
{
  type: "unsubscribe",
  hangar_ids: ["hangar_1"]
}

// Object Identification
{
  type: "object_identification",
  hangar_id: "hangar_1",
  data: {
    object_id: "oid_12345678",
    name: "Ground Support Equipment",
    isAirplane: false
  },
  timestamp: 1234567890123
}
```

### Server Response Messages
```javascript
// Registration Confirmation
{
  type: "registration_confirmed",
  hangar_id: "hangar_1",
  timestamp: 1234567890123
}

// Subscription Confirmation
{
  type: "subscription_confirmed",
  hangar_ids: ["hangar_1", "hangar_2"],
  timestamp: 1234567890123
}

// Routed Data to Subscribers
{
  type: "tracked_objects",
  hangar_id: "hangar_1",
  data: [/* same structure as publisher data */],
  timestamp: 1234567890123
}
```

## Key Features

### 🔄 **Routing System**
- Publishers register with `hangar_id`
- Clients subscribe to specific `hangar_ids`
- Server routes data only to subscribed clients
- Multiple clients can subscribe to same hangar

### 📡 **Real-time Data Flow**
- Mock publisher sends data at 10Hz
- Server immediately routes to all subscribers
- Client receives both `entity_positions` and `tracked_objects` formats

### 🔄 **Bidirectional Communication**
- Publisher → Server → Client (data flow)
- Client → Server → Publisher (object identification)
- Server handles connection management and routing

### 🛡️ **Connection Management**
- Auto-reconnection with exponential backoff
- Graceful disconnect handling
- Publisher/subscriber state tracking
- Health check endpoint for monitoring

## Deployment Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Local/Cloud   │    │   Render.com    │    │   Client Apps   │
│                 │    │                 │    │                 │
│ Mock Publisher  │◄──►│ WebSocket       │◄──►│ Mobile/Web      │
│ (Python)        │    │ Server (Node.js)│    │ Applications    │
│                 │    │                 │    │                 │
│ - hangar_1      │    │ - Port 8080     │    │ - WebSocket     │
│ - hangar_2      │    │ - Health checks │    │   Service       │
│ - hangar_3      │    │ - Message       │    │ - Real-time     │
│                 │    │   routing       │    │   updates       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

This architecture provides a scalable, real-time communication system where multiple publishers can send data to multiple subscribers through a centralized routing server.
