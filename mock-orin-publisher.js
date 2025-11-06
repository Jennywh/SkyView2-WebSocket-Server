const WebSocket = require('ws');

console.log('🤖 Starting Mock Orin Publishers...');

// Configuration
const SERVER_URL = process.env.WS_URL || 'wss://skyview2-websocket-server.onrender.com';
const COMPANY = process.env.HANGAR_COMPANY || 'dev-jenny';
const LOCATION = process.env.HANGAR_LOCATION || 'KJEN';
const HANGAR_INDICES = [0, 1, 2];
const HANGARS = HANGAR_INDICES.map((index) => `${COMPANY}-${LOCATION}-${index}`);
const PUBLISH_RATE_HZ = 10; // 10 Hz
const PUBLISH_INTERVAL_MS = 1000 / PUBLISH_RATE_HZ;

// Object ID generator
function generateObjectId() {
  return 'oid_' + Math.random().toString(16).substr(2, 8);
}

// Generate realistic tracked objects for a hangar
function generateTrackedObjects(hangarId, previousObjects = null) {
  const numObjects = previousObjects ? Object.keys(previousObjects).length : Math.floor(Math.random() * 6) + 5; // 5-10 objects
  const objects = {};
  
  if (previousObjects) {
    // Update existing objects with slight position changes
    Object.keys(previousObjects).forEach(oid => {
      const prev = previousObjects[oid];
      
      if (prev.type === 'aircraft') {
        // Handle aircraft movement with rotations
        objects[oid] = {
          position: {
            x: prev.position.x + (Math.random() - 0.5) * 2.0, // Larger movement for aircraft
            y: prev.position.y + (Math.random() - 0.5) * 2.0,
            z: prev.position.z + (Math.random() - 0.5) * 0.5
          },
          rotation: {
            roll: prev.rotation.roll + (Math.random() - 0.5) * 0.1, // Small rotation changes
            pitch: prev.rotation.pitch + (Math.random() - 0.5) * 0.1,
            yaw: prev.rotation.yaw + (Math.random() - 0.5) * 0.2
          },
          type: 'aircraft'
        };
      } else {
        // Handle unknown objects
        objects[oid] = {
          position: {
            x: prev.position.x + (Math.random() - 0.5) * 0.5, // Small movement
            y: prev.position.y + (Math.random() - 0.5) * 0.5,
            z: prev.position.z + (Math.random() - 0.5) * 0.1
          },
          dimensions: prev.dimensions, // Dimensions stay the same
          type: prev.type
        };
      }
    });
  } else {
    // Generate new objects
    for (let i = 0; i < numObjects; i++) {
      const oid = generateObjectId();
      objects[oid] = {
        position: {
          x: (Math.random() - 0.5) * 60, // -30 to 30
          y: (Math.random() - 0.5) * 60,
          z: -(Math.random() * 8 + 1) // -1 to -9
        },
        dimensions: {
          length: Math.random() * 20 + 5, // 5-25
          width: Math.random() * 15 + 5,  // 5-20
          height: Math.random() * 8 + 1    // 1-9
        },
        type: 'unknown'
      };
    }
    
    // Add the aircraft N717NT
    objects['N717NT'] = {
      position: {
        x: (Math.random() - 0.5) * 20, // -10 to 10 (smaller area for aircraft)
        y: (Math.random() - 0.5) * 20,
        z: -(Math.random() * 3 + 1) // -1 to -4 (higher up)
      },
      rotation: {
        roll: (Math.random() - 0.5) * 0.2, // Small random rotations
        pitch: (Math.random() - 0.5) * 0.2,
        yaw: (Math.random() - 0.5) * 0.4
      },
      type: 'aircraft'
    };
  }
  
  return objects;
}

// Hangar publisher class
class HangarPublisher {
  constructor(hangarId) {
    this.hangarId = hangarId;
    this.ws = null;
    this.isConnected = false;
    this.trackedObjects = null;
    this.publishInterval = null;
    this.reconnectTimeout = null;
    
    this.connect();
  }
  
  connect() {
    console.log(`📡 [${this.hangarId}] Connecting to ${SERVER_URL}...`);
    
    try {
      this.ws = new WebSocket(SERVER_URL);
      
      this.ws.on('open', () => {
        this.onOpen();
      });
      
      this.ws.on('message', (data) => {
        this.onMessage(data);
      });
      
      this.ws.on('close', (code, reason) => {
        this.onClose(code, reason);
      });
      
      this.ws.on('error', (error) => {
        this.onError(error);
      });
    } catch (error) {
      console.error(`❌ [${this.hangarId}] Connection error:`, error.message);
      this.scheduleReconnect();
    }
  }
  
  onOpen() {
    console.log(`✅ [${this.hangarId}] Connected to server`);
    
    // Register as publisher
    this.ws.send(JSON.stringify({
      type: 'register_publisher',
      hangar_id: this.hangarId
    }));
    
    this.isConnected = true;
    
    // Initialize tracked objects
    this.trackedObjects = generateTrackedObjects(this.hangarId);
    
    // Start publishing at 10Hz
    this.startPublishing();
  }
  
  onMessage(data) {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'registration_confirmed') {
        console.log(`✅ [${this.hangarId}] Registration confirmed`);
      } else {
        // Log any other message from client
        console.log(`📥 [${this.hangarId}] Received message:`, JSON.stringify(message, null, 2));
      }
    } catch (error) {
      console.error(`❌ [${this.hangarId}] Error parsing message:`, error.message);
      // Also log the raw data if JSON parsing fails
      console.log(`📥 [${this.hangarId}] Raw message data:`, data.toString());
    }
  }
  
  onClose(code, reason) {
    console.log(`❌ [${this.hangarId}] Disconnected (${code}${reason ? ': ' + reason : ''})`);
    this.isConnected = false;
    this.stopPublishing();
    this.scheduleReconnect();
  }
  
  onError(error) {
    console.error(`❌ [${this.hangarId}] WebSocket error:`, error.message);
  }
  
  startPublishing() {
    if (this.publishInterval) {
      clearInterval(this.publishInterval);
    }
    
    console.log(`📤 [${this.hangarId}] Publishing at ${PUBLISH_RATE_HZ} Hz`);
    
    this.publishInterval = setInterval(() => {
      this.publishData();
    }, PUBLISH_INTERVAL_MS);
  }
  
  stopPublishing() {
    if (this.publishInterval) {
      clearInterval(this.publishInterval);
      this.publishInterval = null;
    }
  }
  
  publishData() {
    if (!this.isConnected || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    
    // Update object positions slightly (simulating movement)
    this.trackedObjects = generateTrackedObjects(this.hangarId, this.trackedObjects);
    
    // Wrap in array to match the user's format
    const data = [this.trackedObjects];
    
    const message = JSON.stringify({
      type: 'tracked_objects',
      hangar_id: this.hangarId,
      data: data,
      timestamp: Date.now()
    });
    
    try {
      this.ws.send(message);
      // Log less frequently to avoid spam
      if (Math.random() < 0.1) { // 10% of messages (1Hz instead of 10Hz)
        console.log(`📤 [${this.hangarId}] Published ${Object.keys(this.trackedObjects).length} objects`);
      }
    } catch (error) {
      console.error(`❌ [${this.hangarId}] Error sending data:`, error.message);
    }
  }
  
  scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    console.log(`🔄 [${this.hangarId}] Reconnecting in 5 seconds...`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 5000);
  }
  
  disconnect() {
    this.stopPublishing();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Create publishers for all hangars
const publishers = HANGARS.map(hangarId => new HangarPublisher(hangarId));

console.log(`🤖 Started ${publishers.length} mock Orin publishers`);
console.log(`📡 Publishing to: ${SERVER_URL}`);
console.log(`⚡ Rate: ${PUBLISH_RATE_HZ} Hz (every ${PUBLISH_INTERVAL_MS}ms)`);
console.log(`🏢 Hangars: ${HANGARS.join(', ')}`);
console.log('');
console.log('Press Ctrl+C to stop');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down publishers...');
  
  publishers.forEach(publisher => {
    publisher.disconnect();
  });
  
  setTimeout(() => {
    console.log('✅ All publishers stopped');
    process.exit(0);
  }, 1000);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

