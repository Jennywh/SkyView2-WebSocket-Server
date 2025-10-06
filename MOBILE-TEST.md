# 📱 Mobile Testing Guide

## Quick Start for Mobile Testing

### 1. Start the Mobile Server

```bash
npm run mobile
```

This will start the server on `http://0.0.0.0:8080` (accessible from any device on your network).

### 2. Find Your Computer's IP Address

**On Mac:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**On Windows:**
```bash
ipconfig
```

**On Linux:**
```bash
hostname -I
```

### 3. Access from Mobile Device

Open your mobile browser and go to:
```
http://YOUR_IP_ADDRESS:8080/mobile-test.html
```

For example: `http://192.168.1.100:8080/mobile-test.html`

## Mobile Features

### 📱 **Mobile-Optimized Interface**
- Responsive design for all screen sizes
- Touch-friendly buttons and cards
- Optimized for portrait and landscape modes
- Fast loading and smooth scrolling

### ✈️ **Real-Time Aircraft Data**
- Live aircraft position updates every 2 seconds
- Beautiful card-based layout for each aircraft
- Color-coded status indicators
- Connection status and statistics

### 🔄 **Auto-Reconnection**
- Automatically reconnects if connection is lost
- Visual connection status indicators
- Manual refresh button
- Connection time tracking

### 📊 **Live Statistics**
- Message count
- Aircraft count
- Last update time
- Connection duration

## Testing Different Scenarios

### 1. **Network Testing**
- Test on WiFi and cellular data
- Test with poor network conditions
- Test connection drops and recovery

### 2. **Device Testing**
- Test on different screen sizes
- Test in portrait and landscape
- Test touch interactions
- Test scrolling performance

### 3. **Data Format Testing**
- Verify aircraft data structure
- Check coordinate precision
- Validate timestamp accuracy
- Test message frequency

## Troubleshooting

### Can't Connect from Mobile
1. **Check Firewall**: Make sure port 8080 is open
2. **Check IP Address**: Verify you're using the correct IP
3. **Check Network**: Ensure mobile device is on same network
4. **Check Server**: Verify server is running with `npm run mobile`

### WebSocket Connection Issues
1. **Check Server Logs**: Look for connection errors
2. **Check Network**: Ensure stable WiFi/cellular connection
3. **Check Browser**: Try different mobile browsers
4. **Check Port**: Verify port 8080 is accessible

### Data Not Updating
1. **Check Connection**: Look for connection status indicators
2. **Check Console**: Open browser developer tools
3. **Check Server**: Verify server is broadcasting data
4. **Refresh Page**: Try refreshing the mobile page

## Server Commands

```bash
# Start mobile server
npm run mobile

# Start regular server
npm start

# Test with Node.js client
npm test

# Development mode with auto-restart
npm run dev
```

## Mobile Browser Compatibility

- ✅ **Safari** (iOS)
- ✅ **Chrome** (Android/iOS)
- ✅ **Firefox** (Android/iOS)
- ✅ **Edge** (Android/iOS)
- ✅ **Samsung Internet** (Android)

## Data Format

The mobile page receives WebSocket messages in this format:

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

This is the same format that your SkyView2 app will receive!

