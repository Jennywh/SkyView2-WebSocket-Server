# Render.com Deployment Guide

This guide will help you deploy the SkyView2 WebSocket Server to Render.com for **FREE**.

## ✅ Why Render.com?

- 🆓 **Free tier available** (no credit card required initially)
- 🔄 **Auto-deploy** on git push
- 🌐 **Free SSL/TLS** (wss:// supported)
- 📊 **Easy monitoring** and logs
- ⚡ **Simple setup** - similar to Heroku

## Free Tier Limitations

- ⏰ Apps sleep after **15 minutes** of inactivity
- ⏱️ Wake up time: **30-60 seconds**
- 🕐 **750 hours/month** free usage
- 💾 Automatic HTTPS and WebSocket support

## Deployment Steps

### Step 1: Commit Your Changes

```bash
git add .
git commit -m "Add Render.com configuration"
git push origin main
```

### Step 2: Sign Up for Render.com

1. Go to [https://render.com](https://render.com)
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (recommended) or email

### Step 3: Create a New Web Service

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Click **"Connect account"** to link your GitHub
3. Select your **`SkyView2-WebSocket-Server`** repository
4. Click **"Connect"**

### Step 4: Configure the Service

Render will auto-detect most settings, but verify:

- **Name**: `skyview2-websocket-server` (or custom name)
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: Select **"Free"** ⭐

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will automatically build and deploy
3. Wait **2-5 minutes** for first deployment
4. Status will change to **"Live"** when ready

## 🔗 Your Public URLs

After deployment, you'll receive:

**HTTP Health Check:**
```
https://skyview2-websocket-server.onrender.com
```

**WebSocket Connection:**
```
wss://skyview2-websocket-server.onrender.com
```

## 📱 Connect from Your App

### JavaScript/Node.js
```javascript
const ws = new WebSocket('wss://skyview2-websocket-server.onrender.com');

ws.onopen = () => {
  console.log('Connected to Render server');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received entity data:', data);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from server');
};
```

### React Native / Expo
```javascript
import { useEffect, useState } from 'react';

const useWebSocket = (url) => {
  const [ws, setWs] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const websocket = new WebSocket(url);
    
    websocket.onopen = () => {
      console.log('Connected to Render server');
    };
    
    websocket.onmessage = (event) => {
      const parsed = JSON.parse(event.data);
      setData(parsed);
    };
    
    setWs(websocket);
    
    return () => websocket.close();
  }, [url]);
  
  return { ws, data };
};

// Usage
const { data } = useWebSocket('wss://skyview2-websocket-server.onrender.com');
```

## 🔧 Useful Features

### View Logs
1. Go to your service in Render dashboard
2. Click **"Logs"** tab
3. View real-time logs

### Manual Deploy
1. Go to your service
2. Click **"Manual Deploy"** → **"Deploy latest commit"**

### Environment Variables
1. Go to your service
2. Click **"Environment"** tab
3. Add variables (e.g., custom ports, API keys)

### Auto-Deploy Settings
1. Go to **"Settings"** tab
2. Toggle **"Auto-Deploy"** on/off
3. Choose branch to deploy from

## 📊 Test Your Deployment

### Health Check Endpoint
```bash
curl https://skyview2-websocket-server.onrender.com
```

**Expected Response:**
```json
{
  "status": "running",
  "connectedClients": 0,
  "uptime": 123.456,
  "entityCount": 3,
  "pathDataLoaded": true
}
```

### WebSocket Connection Test
```bash
# Install wscat if needed
npm install -g wscat

# Test WebSocket
wscat -c wss://skyview2-websocket-server.onrender.com
```

## 💡 Keep Your App Awake (Optional)

To prevent your app from sleeping:

### Option 1: Ping Service (cron-job.org)
1. Go to [https://cron-job.org](https://cron-job.org)
2. Create free account
3. Add new cron job:
   - **URL**: `https://skyview2-websocket-server.onrender.com`
   - **Interval**: Every 14 minutes

### Option 2: UptimeRobot
1. Go to [https://uptimerobot.com](https://uptimerobot.com)
2. Create free account
3. Add new monitor:
   - **Type**: HTTP(s)
   - **URL**: Your Render URL
   - **Interval**: 5 minutes

**Note**: This uses your 750 free hours, but ensures faster response times.

## 🚨 Troubleshooting

### App Not Starting
- **Check logs** in Render dashboard
- Verify `package.json` has correct `start` script
- Ensure all dependencies are listed in `dependencies`

### WebSocket Connection Failed
- Use `wss://` not `ws://` (Render provides SSL)
- Check if app is sleeping (first request may take 30-60s)
- Verify CORS settings if connecting from browser

### Port Binding Errors
- Render automatically sets `PORT` environment variable
- Current config uses `process.env.PORT || 8080` ✓
- Never hardcode port numbers

### Slow Cold Starts
- **Free tier limitation**: 30-60s wake time
- Use ping service to keep awake
- Upgrade to paid tier for no sleeping

## 📈 Monitoring

### Render Dashboard Metrics
- **CPU Usage**: View in "Metrics" tab
- **Memory**: Monitor RAM usage
- **Deploy History**: See all deployments
- **Events**: Track service events

### Custom Monitoring
Add application monitoring:
```javascript
// In your server code
setInterval(() => {
  console.log(`📊 Active connections: ${wss.clients.size}`);
}, 60000); // Every minute
```

## 🔐 Security Best Practices

### For Production Use:
1. **Add Authentication**
   ```javascript
   ws.on('connection', (ws, req) => {
     const token = req.headers['authorization'];
     if (!isValidToken(token)) {
       ws.close(4001, 'Unauthorized');
       return;
     }
   });
   ```

2. **Rate Limiting**
   - Limit connections per IP
   - Throttle message frequency

3. **Environment Variables**
   - Store secrets in Render environment variables
   - Never commit API keys to git

4. **CORS Configuration**
   - Whitelist allowed origins
   - Validate request headers

## 💰 Upgrade Options

If you need more:

### Starter Plan - $7/month
- ✅ No sleeping
- ✅ Faster response times
- ✅ More resources

### Standard Plan - $25/month
- ✅ Production-grade
- ✅ Better performance
- ✅ Priority support

## 🆚 Render vs Other Platforms

| Feature | Render Free | Heroku Eco | Railway |
|---------|-------------|------------|---------|
| **Price** | Free | $5/month | $5 credit/month |
| **Sleep Time** | 15 min | 30 min | No sleep |
| **Wake Time** | 30-60s | 10-30s | Instant |
| **SSL** | ✅ | ✅ | ✅ |
| **Auto-Deploy** | ✅ | ✅ | ✅ |

## 🎯 Next Steps

After successful deployment:

1. ✅ Update your mobile app with the Render WebSocket URL
2. ✅ Test the connection from your app
3. ✅ Set up monitoring/alerts
4. ✅ (Optional) Configure ping service to prevent sleeping
5. ✅ Consider adding authentication for security
6. ✅ Monitor logs and performance

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [WebSocket on Render](https://render.com/docs/web-services#websocket-support)
- [Render Community](https://community.render.com/)

## 🆘 Need Help?

- Check [Render Status](https://status.render.com/)
- Join [Render Community](https://community.render.com/)
- View server logs in Render dashboard
- Review this guide's troubleshooting section

---

**Your WebSocket server is now publicly accessible for FREE! 🎉**

