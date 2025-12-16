from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Set
import json

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store active rooms: {room_code: {username: websocket}}
rooms: Dict[str, Dict[str, WebSocket]] = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, room_code: str, username: str, websocket: WebSocket):
        await websocket.accept()
        
        # Create room if it doesn't exist
        if room_code not in self.active_connections:
            self.active_connections[room_code] = {}
        
        # Check if username already exists (case-insensitive)
        existing_users = [u.lower() for u in self.active_connections[room_code].keys()]
        if username.lower() in existing_users:
            await websocket.send_json({
                "type": "error",
                "message": "A person with the same name already exists in this room"
            })
            await websocket.close()
            return False
        
        # Add user to room
        self.active_connections[room_code][username] = websocket
        
        # Notify others
        await self.broadcast_to_room(
            room_code,
            {
                "type": "system",
                "message": f"{username} joined the room"
            },
            exclude=username
        )
        
        return True

    def disconnect(self, room_code: str, username: str):
        if room_code in self.active_connections:
            if username in self.active_connections[room_code]:
                del self.active_connections[room_code][username]
            
            # Remove room if empty
            if not self.active_connections[room_code]:
                del self.active_connections[room_code]

    async def broadcast_to_room(self, room_code: str, message: dict, exclude: str = None):
        if room_code not in self.active_connections:
            return
        
        for username, connection in self.active_connections[room_code].items():
            if username != exclude:
                try:
                    await connection.send_json(message)
                except:
                    pass

    async def send_to_user(self, room_code: str, username: str, message: dict):
        if room_code in self.active_connections:
            if username in self.active_connections[room_code]:
                try:
                    await self.active_connections[room_code][username].send_json(message)
                except:
                    pass

manager = ConnectionManager()

@app.get("/")
async def root():
    return {"message": "Chatroom API is running"}

@app.websocket("/ws/{room_code}/{username}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, username: str):
    # Try to connect
    connected = await manager.connect(room_code, username, websocket)
    
    if not connected:
        return
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            if message_data.get("type") == "message":
                # Broadcast message to all users in the room
                await manager.broadcast_to_room(
                    room_code,
                    {
                        "type": "message",
                        "name": username,
                        "message": message_data.get("message", "")
                    }
                )
    
    except WebSocketDisconnect:
        # User disconnected
        manager.disconnect(room_code, username)
        await manager.broadcast_to_room(
            room_code,
            {
                "type": "system",
                "message": f"{username} left the room"
            }
        )
    except Exception as e:
        print(f"Error: {e}")
        manager.disconnect(room_code, username)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)