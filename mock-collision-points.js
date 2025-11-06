const WebSocket = require('ws');

console.log('💥 Starting Mock Collision Points Publisher...');

// Configuration
const SERVER_URL = process.env.WS_URL || 'ws://localhost:8082';
const HANGARS = ['hangar_1', 'hangar_2', 'hangar_3'];
const PUBLISH_RATE_HZ = 2; // 2 Hz for collision points (less frequent than tracking data)
const PUBLISH_INTERVAL_MS = 1000 / PUBLISH_RATE_HZ;

// Collision point ID generator
function generateCollisionId() {
  return 'collision_' + Math.random().toString(16).substr(2, 8);
}

// Generate realistic collision points for a hangar
function generateCollisionPoints(hangarId, previousPoints = null) {
  const numPoints = Math.floor(Math.random() * 3) + 1; // 1-3 collision points
  const points = [];
  
  for (let i = 0; i < numPoints; i++) {
    const pointId = generateCollisionId();
    
    // Generate collision point with realistic aircraft proximity data
    // This is COLLISION-SPECIFIC data, not general object tracking data
    const point = {
      id: pointId,
      position: {
        x: (Math.random() - 0.5) * 40, // -20 to 20 meters
        y: (Math.random() - 0.5) * 40,
        z: -(Math.random() * 6 + 1) // -1 to -7 meters altitude
      },
      severity: Math.random() > 0.7 ? 'critical' : Math.random() > 0.4 ? 'high' : 'medium',
      confidence: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
      aircraft_involved: [
        {
          tail_number: 'N717NT',
          position: {
            x: (Math.random() - 0.5) * 10,
            y: (Math.random() - 0.5) * 10,
            z: -(Math.random() * 3 + 1)
          },
          velocity: {
            x: (Math.random() - 0.5) * 20,
            y: (Math.random() - 0.5) * 20,
            z: (Math.random() - 0.5) * 5
          },
          collision_risk: 'high'
        }
      ],
      time_to_collision: Math.random() * 30 + 5, // 5-35 seconds
      risk_factors: [
        Math.random() > 0.5 ? 'speed_difference' : null,
        Math.random() > 0.5 ? 'altitude_convergence' : null,
        Math.random() > 0.5 ? 'heading_conflict' : null
      ].filter(factor => factor !== null),
      timestamp: Date.now()
    };
    
    points.push(point);
  }
  
  return points;
}

// Hangar collision publisher class
class CollisionPublisher {
  constructor(hangarId) {
    this.hangarId = hangarId;
    this.ws = null;
    this.isConnected = false;
    this.publishInterval = null;
    this.reconnectTimeout = null;
    
    this.connect();
  }
  
  connect() {
    console.log(`💥 [${this.hangarId}] Connecting to collision server at ${SERVER_URL}...`);
    
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
    console.log(`✅ [${this.hangarId}] Connected to collision server`);
    
    // Register as collision data publisher
    this.ws.send(JSON.stringify({
      type: 'register_publisher',
      hangar_id: this.hangarId,
      service: 'collision-points'
    }));
    
    this.isConnected = true;
    
    // Start publishing collision points at 2Hz
    this.startPublishing();
  }
  
  onMessage(data) {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'registration_confirmed') {
        console.log(`✅ [${this.hangarId}] Collision publisher registration confirmed`);
      } else {
        // Log any other message from server
        console.log(`📥 [${this.hangarId}] Received message:`, JSON.stringify(message, null, 2));
      }
    } catch (error) {
      console.error(`❌ [${this.hangarId}] Error parsing message:`, error.message);
      console.log(`📥 [${this.hangarId}] Raw message data:`, data.toString());
    }
  }
  
  onClose(code, reason) {
    console.log(`❌ [${this.hangarId}] Disconnected from collision server (${code}${reason ? ': ' + reason : ''})`);
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
    
    console.log(`📤 [${this.hangarId}] Publishing collision points at ${PUBLISH_RATE_HZ} Hz`);
    
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
    
    // Generate new collision points
    const collisionPoints = generateCollisionPoints(this.hangarId);
    
    const message = JSON.stringify({
      type: 'collision_points',
      hangar_id: this.hangarId,
      data: collisionPoints,
      timestamp: Date.now()
    });
    
    try {
      this.ws.send(message);
      
      // Log collision points being sent
      console.log(`💥 [${this.hangarId}] Published ${collisionPoints.length} COLLISION POINTS (not object tracking data)`);
      
      // Log details for critical collisions
      collisionPoints.forEach(point => {
        if (point.severity === 'critical') {
          console.log(`🚨 [${this.hangarId}] CRITICAL collision detected: ${point.id}`);
          console.log(`   Time to collision: ${point.time_to_collision.toFixed(1)}s`);
          console.log(`   Position: (${point.position.x.toFixed(1)}, ${point.position.y.toFixed(1)}, ${point.position.z.toFixed(1)})`);
        }
      });
    } catch (error) {
      console.error(`❌ [${this.hangarId}] Error sending collision data:`, error.message);
    }
  }
  
  scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    console.log(`🔄 [${this.hangarId}] Reconnecting to collision server in 5 seconds...`);
    
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

// Create collision publishers for all hangars
const publishers = HANGARS.map(hangarId => new CollisionPublisher(hangarId));

console.log(`💥 Started ${publishers.length} mock collision point publishers`);
console.log(`📡 Publishing to: ${SERVER_URL}`);
console.log(`⚡ Rate: ${PUBLISH_RATE_HZ} Hz (every ${PUBLISH_INTERVAL_MS}ms)`);
console.log(`🏢 Hangars: ${HANGARS.join(', ')}`);
console.log('');
console.log('Press Ctrl+C to stop');

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down collision publishers...');
  
  publishers.forEach(publisher => {
    publisher.disconnect();
  });
  
  setTimeout(() => {
    console.log('✅ All collision publishers stopped');
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
