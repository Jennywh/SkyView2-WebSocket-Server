import asyncio
import websockets
import json
import random
import time
import os
import signal
import sys
from typing import Dict, Optional, Any

print('🤖 Starting Mock Orin Publishers...')

# Configuration
SERVER_URL = os.getenv('WS_URL', 'wss://skyview2-websocket-server.onrender.com')
HANGARS = ['hangar_1', 'hangar_2', 'hangar_3']
PUBLISH_RATE_HZ = 10  # 10 Hz
PUBLISH_INTERVAL_MS = 1000 / PUBLISH_RATE_HZ

def generate_object_id() -> str:
    """Generate a random object ID"""
    return 'oid_' + hex(random.randint(0, 0xFFFFFFFF))[2:].zfill(8)

def generate_tracked_objects(hangar_id: str, previous_objects: Optional[Dict] = None) -> Dict:
    """Generate realistic tracked objects for a hangar"""
    if previous_objects:
        num_objects = len(previous_objects)
    else:
        num_objects = random.randint(5, 10)  # 5-10 objects
    
    objects = {}
    
    if previous_objects:
        # Update existing objects with slight position changes
        for oid, prev in previous_objects.items():
            if prev['type'] == 'aircraft':
                # Handle aircraft movement with rotations
                objects[oid] = {
                    'position': {
                        'x': prev['position']['x'] + (random.random() - 0.5) * 2.0,
                        'y': prev['position']['y'] + (random.random() - 0.5) * 2.0,
                        'z': prev['position']['z'] + (random.random() - 0.5) * 0.5
                    },
                    'rotation': {
                        'roll': prev['rotation']['roll'] + (random.random() - 0.5) * 0.1,
                        'pitch': prev['rotation']['pitch'] + (random.random() - 0.5) * 0.1,
                        'yaw': prev['rotation']['yaw'] + (random.random() - 0.5) * 0.2
                    },
                    'type': 'aircraft'
                }
            else:
                # Handle unknown objects
                objects[oid] = {
                    'position': {
                        'x': prev['position']['x'] + (random.random() - 0.5) * 0.5,
                        'y': prev['position']['y'] + (random.random() - 0.5) * 0.5,
                        'z': prev['position']['z'] + (random.random() - 0.5) * 0.1
                    },
                    'dimensions': prev['dimensions'],  # Dimensions stay the same
                    'type': prev['type']
                }
    else:
        # Generate new objects
        for i in range(num_objects):
            oid = generate_object_id()
            objects[oid] = {
                'position': {
                    'x': (random.random() - 0.5) * 60,  # -30 to 30
                    'y': (random.random() - 0.5) * 60,
                    'z': -(random.random() * 8 + 1)  # -1 to -9
                },
                'dimensions': {
                    'length': random.random() * 20 + 5,  # 5-25
                    'width': random.random() * 15 + 5,   # 5-20
                    'height': random.random() * 8 + 1    # 1-9
                },
                'type': 'unknown'
            }
        
        # Add the aircraft N717NT
        objects['N717NT'] = {
            'position': {
                'x': (random.random() - 0.5) * 20,  # -10 to 10
                'y': (random.random() - 0.5) * 20,
                'z': -(random.random() * 3 + 1)  # -1 to -4
            },
            'rotation': {
                'roll': (random.random() - 0.5) * 0.2,
                'pitch': (random.random() - 0.5) * 0.2,
                'yaw': (random.random() - 0.5) * 0.4
            },
            'type': 'aircraft'
        }
    
    return objects

class HangarPublisher:
    def __init__(self, hangar_id: str):
        self.hangar_id = hangar_id
        self.websocket = None
        self.is_connected = False
        self.tracked_objects = None
        self.publish_task = None
        self.reconnect_task = None
        
    async def connect(self):
        """Connect to the WebSocket server"""
        print(f'📡 [{self.hangar_id}] Connecting to {SERVER_URL}...')
        
        try:
            self.websocket = await websockets.connect(SERVER_URL)
            await self.on_open()
            
            # Start listening for messages
            async for message in self.websocket:
                await self.on_message(message)
                
        except Exception as error:
            print(f'❌ [{self.hangar_id}] Connection error: {error}')
            await self.schedule_reconnect()
    
    async def on_open(self):
        """Handle WebSocket connection opened"""
        print(f'✅ [{self.hangar_id}] Connected to server')
        
        # Register as publisher
        register_message = {
            'type': 'register_publisher',
            'hangar_id': self.hangar_id
        }
        await self.websocket.send(json.dumps(register_message))
        
        self.is_connected = True
        
        # Initialize tracked objects
        self.tracked_objects = generate_tracked_objects(self.hangar_id)
        
        # Start publishing at 10Hz
        await self.start_publishing()
    
    async def on_message(self, data: str):
        """Handle incoming WebSocket messages"""
        try:
            message = json.loads(data)
            
            if message['type'] == 'registration_confirmed':
                print(f'✅ [{self.hangar_id}] Registration confirmed')
            else:
                # Log any other message from client
                print(f'📥 [{self.hangar_id}] Received message: {json.dumps(message, indent=2)}')
                
        except json.JSONDecodeError as error:
            print(f'❌ [{self.hangar_id}] Error parsing message: {error}')
            print(f'📥 [{self.hangar_id}] Raw message data: {data}')
        except Exception as error:
            print(f'❌ [{self.hangar_id}] Error handling message: {error}')
    
    async def on_close(self, code: int, reason: str):
        """Handle WebSocket connection closed"""
        print(f'❌ [{self.hangar_id}] Disconnected ({code}{f": {reason}" if reason else ""})')
        self.is_connected = False
        await self.stop_publishing()
        await self.schedule_reconnect()
    
    async def on_error(self, error: Exception):
        """Handle WebSocket errors"""
        print(f'❌ [{self.hangar_id}] WebSocket error: {error}')
    
    async def start_publishing(self):
        """Start publishing data at the specified rate"""
        if self.publish_task:
            self.publish_task.cancel()
        
        print(f'📤 [{self.hangar_id}] Publishing at {PUBLISH_RATE_HZ} Hz')
        
        self.publish_task = asyncio.create_task(self._publish_loop())
    
    async def stop_publishing(self):
        """Stop publishing data"""
        if self.publish_task:
            self.publish_task.cancel()
            self.publish_task = None
    
    async def _publish_loop(self):
        """Main publishing loop"""
        try:
            while self.is_connected and self.websocket:
                await self.publish_data()
                await asyncio.sleep(PUBLISH_INTERVAL_MS / 1000.0)
        except asyncio.CancelledError:
            pass
        except Exception as error:
            print(f'❌ [{self.hangar_id}] Publishing error: {error}')
    
    async def publish_data(self):
        """Publish tracked objects data"""
        if not self.is_connected or not self.websocket:
            return
        
        # Update object positions slightly (simulating movement)
        self.tracked_objects = generate_tracked_objects(self.hangar_id, self.tracked_objects)
        
        # Wrap in array to match the user's format
        data = [self.tracked_objects]
        
        message = {
            'type': 'tracked_objects',
            'hangar_id': self.hangar_id,
            'data': data,
            'timestamp': int(time.time() * 1000)
        }
        
        try:
            await self.websocket.send(json.dumps(message))
            # Log less frequently to avoid spam
            if random.random() < 0.1:  # 10% of messages (1Hz instead of 10Hz)
                print(f'📤 [{self.hangar_id}] Published {len(self.tracked_objects)} objects')
        except Exception as error:
            print(f'❌ [{self.hangar_id}] Error sending data: {error}')
    
    async def schedule_reconnect(self):
        """Schedule a reconnection attempt"""
        if self.reconnect_task:
            self.reconnect_task.cancel()
        
        print(f'🔄 [{self.hangar_id}] Reconnecting in 5 seconds...')
        
        self.reconnect_task = asyncio.create_task(self._reconnect_after_delay())
    
    async def _reconnect_after_delay(self):
        """Reconnect after a delay"""
        try:
            await asyncio.sleep(5)
            await self.connect()
        except asyncio.CancelledError:
            pass
        except Exception as error:
            print(f'❌ [{self.hangar_id}] Reconnect error: {error}')
    
    async def disconnect(self):
        """Disconnect from the WebSocket server"""
        await self.stop_publishing()
        
        if self.reconnect_task:
            self.reconnect_task.cancel()
            self.reconnect_task = None
        
        if self.websocket:
            await self.websocket.close()
            self.websocket = None

# Global publishers list for cleanup
publishers = []

async def main():
    """Main function to start all publishers"""
    global publishers
    
    # Create publishers for all hangars
    publishers = [HangarPublisher(hangar_id) for hangar_id in HANGARS]
    
    print(f'🤖 Started {len(publishers)} mock Orin publishers')
    print(f'📡 Publishing to: {SERVER_URL}')
    print(f'⚡ Rate: {PUBLISH_RATE_HZ} Hz (every {PUBLISH_INTERVAL_MS}ms)')
    print(f'🏢 Hangars: {", ".join(HANGARS)}')
    print('')
    print('Press Ctrl+C to stop')
    
    # Start all publishers concurrently
    tasks = [asyncio.create_task(publisher.connect()) for publisher in publishers]
    
    try:
        await asyncio.gather(*tasks)
    except asyncio.CancelledError:
        pass

async def shutdown():
    """Graceful shutdown"""
    print('\n🛑 Shutting down publishers...')
    
    for publisher in publishers:
        await publisher.disconnect()
    
    await asyncio.sleep(1)
    print('✅ All publishers stopped')

def signal_handler(signum, frame):
    """Handle interrupt signals"""
    print('\n🛑 Received interrupt signal...')
    for task in asyncio.all_tasks():
        task.cancel()

if __name__ == '__main__':
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        asyncio.run(shutdown())
    except Exception as error:
        print(f'❌ Uncaught Exception: {error}')
        sys.exit(1)
