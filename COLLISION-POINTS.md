# Collision Points WebSocket Server

A dedicated WebSocket server for real-time collision point detection and broadcasting in the SkyView2 system.

## Overview

The collision points server runs on port 8082 and provides real-time collision detection data to connected clients. It receives collision point data from collision detection systems (publishers) and broadcasts it to subscribed clients.

## Features

- 💥 **Real-time collision detection** - Continuously monitors and reports collision points
- 📡 **WebSocket broadcasting** - Sends collision alerts to all subscribed clients
- 🏢 **Multi-hangar support** - Handles collision data from multiple hangars
- 🚨 **Severity classification** - Categorizes collisions as critical, high, or medium
- ⚡ **High-frequency updates** - Publishes at 2Hz for responsive collision detection
- 🏥 **Health check endpoint** - HTTP endpoint for monitoring server status

## Quick Start

### 1. Start the Collision Points Server

```bash
npm run collision
```

The server will start on `http://localhost:8082` with WebSocket support.

### 2. Start Mock Collision Data Publisher

```bash
npm run mock-collision
```

This will start mock publishers for hangar_1, hangar_2, and hangar_3.

### 3. Test the System

```bash
npm run test-collision
```

This will start a test client that subscribes to collision data from all hangars.

## API Endpoints

### HTTP Endpoints

- **GET /** - Health check and server status
  - Returns: Server status, connected publishers/subscribers, active hangars, uptime

### WebSocket Messages

#### Publisher → Server Messages

**Register as Publisher:**
```json
{
  "type": "register_publisher",
  "hangar_id": "hangar_1",
  "service": "collision-points"
}
```

**Send Collision Points:**
```json
{
  "type": "collision_points",
  "hangar_id": "hangar_1",
  "data": [
    {
      "id": "collision_abc123",
      "position": {
        "x": 15.5,
        "y": -8.2,
        "z": -3.1
      },
      "severity": "critical",
      "confidence": 0.95,
      "aircraft_involved": [
        {
          "tail_number": "N717NT",
          "position": {
            "x": 10.0,
            "y": -5.0,
            "z": -2.5
          },
          "velocity": {
            "x": 5.0,
            "y": -2.0,
            "z": 0.0
          }
        }
      ],
      "time_to_collision": 12.5,
      "risk_factors": ["speed_difference", "altitude_convergence"],
      "timestamp": 1640995200000
    }
  ],
  "timestamp": 1640995200000
}
```

#### Client → Server Messages

**Subscribe to Collision Data:**
```json
{
  "type": "subscribe",
  "hangar_ids": ["hangar_1", "hangar_2"]
}
```

**Unsubscribe from Collision Data:**
```json
{
  "type": "unsubscribe",
  "hangar_ids": ["hangar_1"]
}
```

#### Server → Client Messages

**Subscription Confirmation:**
```json
{
  "type": "subscription_confirmed",
  "hangar_ids": ["hangar_1", "hangar_2"],
  "service": "collision-points",
  "timestamp": 1640995200000
}
```

**Collision Points Broadcast:**
```json
{
  "type": "collision_points",
  "hangar_id": "hangar_1",
  "data": [
    {
      "id": "collision_abc123",
      "position": {
        "x": 15.5,
        "y": -8.2,
        "z": -3.1
      },
      "severity": "critical",
      "confidence": 0.95,
      "aircraft_involved": [
        {
          "tail_number": "N717NT",
          "position": {
            "x": 10.0,
            "y": -5.0,
            "z": -2.5
          },
          "velocity": {
            "x": 5.0,
            "y": -2.0,
            "z": 0.0
          }
        }
      ],
      "time_to_collision": 12.5,
      "risk_factors": ["speed_difference", "altitude_convergence"],
      "timestamp": 1640995200000
    }
  ],
  "timestamp": 1640995200000
}
```

## Collision Data Structure

### Collision Point Object

- **id**: Unique identifier for the collision point
- **position**: 3D coordinates (x, y, z) in meters
- **severity**: Risk level ("critical", "high", "medium")
- **confidence**: Detection confidence (0.0 to 1.0)
- **aircraft_involved**: Array of aircraft involved in the potential collision
- **time_to_collision**: Time until collision in seconds
- **risk_factors**: Array of contributing risk factors
- **timestamp**: Unix timestamp of detection

### Aircraft Object

- **tail_number**: Aircraft tail number (e.g., "N717NT")
- **position**: Current 3D position
- **velocity**: Current velocity vector

### Risk Factors

- **speed_difference**: Significant speed difference between aircraft
- **altitude_convergence**: Aircraft converging at similar altitudes
- **heading_conflict**: Conflicting flight paths

## Configuration

### Environment Variables

- `PORT` - Server port (default: 8082)
- `WS_URL` - WebSocket server URL for publishers (default: ws://localhost:8082)

### Publishing Rate

- **Collision Points**: 2 Hz (every 500ms)
- **Mock Data**: Generates 1-3 collision points per update

## Usage Examples

### Start All Services

```bash
# Terminal 1: Start collision server
npm run collision

# Terminal 2: Start mock publisher
npm run mock-collision

# Terminal 3: Start test client
npm run test-collision
```

### Integration with Existing System

The collision points server runs independently from the main aircraft tracking server (port 8080). You can run both simultaneously:

```bash
# Terminal 1: Main aircraft tracking server
npm start

# Terminal 2: Collision points server
npm run collision

# Terminal 3: Mock aircraft data publisher
npm run mock-orin

# Terminal 4: Mock collision data publisher
npm run mock-collision
```

## Monitoring

### Health Check

```bash
curl http://localhost:8082/
```

Response:
```json
{
  "status": "running",
  "service": "collision-points",
  "publishers": 3,
  "subscribers": 1,
  "activeHangars": ["hangar_1", "hangar_2", "hangar_3"],
  "uptime": 123.45
}
```

### Logs

The server provides detailed logging:
- ✅ Connection confirmations
- 📤 Publisher registrations
- 📱 Client subscriptions
- 💥 Collision point broadcasts
- 🚨 Critical collision alerts

## Error Handling

- Automatic reconnection for publishers
- Graceful handling of malformed messages
- Connection state monitoring
- Detailed error logging

## Security Considerations

- No authentication required (for development)
- CORS headers for web client access
- Input validation for all messages
- Rate limiting should be considered for production use
