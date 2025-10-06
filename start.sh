#!/bin/bash

echo "🚀 Starting SkyView2 WebSocket Server..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "✈️  Starting aircraft tracking server..."
echo "📡 WebSocket will be available at: ws://localhost:8080"
echo "🏥 Health check available at: http://localhost:8080"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

node aircraft-websocket-server.js

