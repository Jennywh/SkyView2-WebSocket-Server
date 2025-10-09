# Heroku Deployment Guide

This guide will help you deploy the SkyView2 WebSocket Server to Heroku.

## Prerequisites

1. **Install Heroku CLI**:
   ```bash
   brew tap heroku/brew && brew install heroku
   ```
   Or download from: https://devcenter.heroku.com/articles/heroku-cli

2. **Login to Heroku**:
   ```bash
   heroku login
   ```

## Deployment Steps

### 1. Create a Heroku App

```bash
heroku create skyview2-websocket-server
```

Or use a custom name:
```bash
heroku create your-custom-app-name
```

### 2. Add Heroku Remote (if not automatically added)

```bash
heroku git:remote -a skyview2-websocket-server
```

### 3. Deploy to Heroku

```bash
git add .
git commit -m "Add Heroku configuration"
git push heroku main
```

If you're on a different branch:
```bash
git push heroku your-branch:main
```

### 4. Scale the Application

```bash
heroku ps:scale web=1
```

### 5. View Your App

```bash
heroku open
```

Or visit: `https://skyview2-websocket-server.herokuapp.com`

## WebSocket Connection

Your WebSocket will be available at:
```
wss://your-app-name.herokuapp.com
```

**Note**: Heroku automatically provides SSL, so use `wss://` (secure WebSocket) instead of `ws://`

## Useful Commands

### View Logs
```bash
heroku logs --tail
```

### Check App Status
```bash
heroku ps
```

### Restart App
```bash
heroku restart
```

### Set Environment Variables (if needed)
```bash
heroku config:set VARIABLE_NAME=value
```

### View App Info
```bash
heroku info
```

## Important Notes

⚠️ **Heroku Free Tier Limitations** (if using free tier):
- Apps sleep after 30 minutes of inactivity
- Wake up time: ~10-30 seconds
- 550-1000 free dyno hours per month

🔒 **WebSocket Security**:
- Heroku automatically provides SSL/TLS
- All connections use secure WebSocket (wss://)
- Consider adding authentication for production use

📊 **Monitoring**:
- Health check endpoint: `https://your-app-name.herokuapp.com/`
- Returns JSON with server status and connected clients

## Testing Your Deployment

Test the HTTP health endpoint:
```bash
curl https://your-app-name.herokuapp.com/
```

Expected response:
```json
{
  "status": "running",
  "connectedClients": 0,
  "uptime": 123.456,
  "entityCount": 3,
  "pathDataLoaded": true
}
```

## Troubleshooting

### App Not Starting
- Check logs: `heroku logs --tail`
- Verify package.json has correct start script
- Ensure all dependencies are in package.json (not devDependencies)

### WebSocket Connection Issues
- Use `wss://` not `ws://` on Heroku
- Check CORS settings if accessing from browser
- Verify port is using `process.env.PORT`

### Port Binding Errors
- Heroku assigns PORT dynamically via environment variable
- Never hardcode port numbers
- The current config uses `process.env.PORT || 8080` ✓

## Client Connection Example

### JavaScript/Node.js
```javascript
const ws = new WebSocket('wss://your-app-name.herokuapp.com');

ws.onopen = () => {
  console.log('Connected to server');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### React Native / Expo
```javascript
const ws = new WebSocket('wss://your-app-name.herokuapp.com');

ws.onopen = () => {
  console.log('Connected to Heroku server');
};
```

## Cost Optimization

For production deployments:
- **Eco Dynos**: $5/month (don't sleep)
- **Basic Dynos**: $7/month (don't sleep)
- **Standard Dynos**: $25-50/month (better performance)

Keep the app awake (free tier):
- Use a service like UptimeRobot to ping every 25 minutes
- Note: This uses dyno hours

## Next Steps

After deployment:
1. Update your mobile app to use the Heroku WebSocket URL
2. Set up monitoring and alerts
3. Consider implementing authentication
4. Add rate limiting for production use
5. Set up CI/CD for automatic deployments

