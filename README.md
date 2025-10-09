# SkyView2 WebSocket Server

A real-time WebSocket server for aircraft tracking that continuously broadcasts aircraft position updates.

## Features

- 🚀 **Real-time aircraft tracking** - Continuously updates aircraft positions
- 📡 **WebSocket broadcasting** - Sends updates to all connected clients
- ✈️ **Multiple aircraft support** - Tracks N9UX, N520CX, and N452
- 🔄 **Automatic position updates** - Simulates realistic aircraft movement
- 🏥 **Health check endpoint** - HTTP endpoint for monitoring server status
- 🛡️ **Error handling** - Graceful error handling and recovery

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Server

```bash
npm start
```

The server will start on `http://localhost:8080` with WebSocket support.

### 3. Test the Server

```bash
npm test
```

## API Endpoints

### HTTP Endpoints

- **GET /** - Health check and server status
  - Returns: Server status, connected clients, uptime, aircraft count

### WebSocket Messages

#### Server → Client Messages

**Aircraft Positions Update:**
```json
{
  "type": "aircraft_positions",
  "data": [
    {
      "tailNumber": "N9UX",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "altitude": 1000,
      "heading": 90,
      "pitch": 0,
      "roll": 0,
      "speed": 150,
      "timestamp": 1640995200000
    }
  ],
  "timestamp": 1640995200000
}
```

**Server Response:**
```json
{
  "type": "server_response",
  "message": "Message received",
  "timestamp": 1640995200000
}
```

#### Client → Server Messages

Send any JSON message to the server. The server will respond with a confirmation.

## Configuration

### Environment Variables

- `PORT` - Server port (default: 8080)
- `UPDATE_INTERVAL` - Position update interval in milliseconds (default: 2000)

### Aircraft Data

The server tracks three aircraft by default:
- **N9UX** - Starting position: NYC area
- **N520CX** - Starting position: NYC area  
- **N452** - Starting position: NYC area

Each aircraft has realistic movement simulation with:
- Latitude/longitude changes
- Altitude variations
- Heading adjustments
- Speed variations

## Development

### Development Mode

```bash
npm run dev
```

Uses nodemon for automatic restart on file changes.

### Testing

```bash
npm test
```

Runs the test client for 30 seconds to verify server functionality.

## Production Deployment

### Cloud Deployment (Recommended)

#### 🆓 Render.com (Free Tier)
Deploy for free with auto-SSL and WebSocket support:

```bash
# See RENDER_DEPLOYMENT.md for complete guide
git push origin main
# Then deploy via Render dashboard
```

Your WebSocket will be available at: `wss://your-app-name.onrender.com`

📚 **[Complete Render.com Deployment Guide →](RENDER_DEPLOYMENT.md)**

#### Heroku (Paid - $5+/month)
```bash
# See HEROKU_DEPLOYMENT.md for complete guide
heroku create skyview2-websocket-server
git push heroku main
```

📚 **[Complete Heroku Deployment Guide →](HEROKU_DEPLOYMENT.md)**

### Self-Hosted Deployment

#### Using PM2

```bash
npm install -g pm2
pm2 start aircraft-websocket-server.js --name "skyview2-websocket"
pm2 save
pm2 startup
```

#### Using Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
```

## Monitoring

### Health Check

```bash
curl http://localhost:8080
```

Returns server status and metrics.

### Logs

The server logs:
- ✅ Client connections
- ❌ Client disconnections  
- 📡 Message broadcasts
- 🚀 Server startup
- 🛑 Graceful shutdown

## Integration with SkyView2

To integrate with the SkyView2 app:

1. Update the `websocketUrl` in your JSON configuration:
   ```json
   {
     "websocketUrl": "ws://your-server:8080"
   }
   ```

2. The app will receive `aircraft_positions` messages and update the 3D scene accordingly.

## Troubleshooting

### Port Already in Use

```bash
lsof -ti:8080 | xargs kill -9
```

### Connection Refused

- Ensure the server is running
- Check firewall settings
- Verify the correct port

### No Position Updates

- Check that clients are connected
- Verify the update interval
- Check server logs for errors

## License

MIT

