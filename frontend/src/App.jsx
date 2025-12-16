import React, { useState, useEffect, useRef } from 'react';
import { Copy, LogOut, Send } from 'lucide-react';
// import './App.css';

function App() {
  const [view, setView] = useState('home'); // home, chat
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [modal, setModal] = useState({ show: false, message: '' });
  const [ws, setWs] = useState(null);
  const messagesEndRef = useRef(null);

  const API_URL = 'ws://localhost:8000/ws'; // Change to your deployed URL

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const showModal = (message) => {
    setModal({ show: true, message });
  };

  const closeModal = () => {
    setModal({ show: false, message: '' });
  };

  const generateRoomCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const connectToRoom = (code, userName) => {
    const websocket = new WebSocket(`${API_URL}/${code}/${userName}`);

    websocket.onopen = () => {
      setCurrentRoom(code);
      setView('chat');
      setMessages([]);
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'error') {
        showModal(data.message);
        websocket.close();
        return;
      }

      if (data.type === 'message') {
        setMessages(prev => [...prev, { name: data.name, message: data.message }]);
      } else if (data.type === 'system') {
        setMessages(prev => [...prev, { name: 'System', message: data.message, isSystem: true }]);
      }
    };

    websocket.onclose = () => {
      setWs(null);
      if (view === 'chat') {
        showModal('Disconnected from room');
        setView('home');
      }
    };

    websocket.onerror = () => {
      showModal('Connection error');
      websocket.close();
    };

    setWs(websocket);
  };

  const handleCreateRoom = () => {
    if (!name.trim()) {
      showModal('Please enter your name before creating a room');
      return;
    }
    const code = generateRoomCode();
    connectToRoom(code, name.trim());
  };

  const handleJoinRoom = () => {
    if (!name.trim()) {
      showModal('Please enter your name before joining a room');
      return;
    }
    if (!roomCode.trim() || roomCode.length !== 6) {
      showModal('Please enter a valid 6-digit room code');
      return;
    }
    connectToRoom(roomCode.trim(), name.trim());
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !ws) return;

    ws.send(JSON.stringify({
      type: 'message',
      message: newMessage.trim()
    }));

    setNewMessage('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleLeaveRoom = () => {
    if (ws) {
      ws.close();
    }
    setView('home');
    setCurrentRoom('');
    setRoomCode('');
    setMessages([]);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(currentRoom);
    showModal('Room code copied to clipboard!');
  };

  if (view === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <h1 className="text-3xl font-bold text-center text-indigo-600 mb-8">
            Simple Chatroom
          </h1>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              />
            </div>

            <button
              onClick={handleCreateRoom}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              Create Room
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">OR</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              />
            </div>

            <button
              onClick={handleJoinRoom}
              className="w-full bg-white text-indigo-600 py-3 rounded-lg font-medium border-2 border-indigo-600 hover:bg-indigo-50 transition"
            >
              Join Room
            </button>
          </div>
        </div>

        {modal.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
              <p className="text-gray-800 mb-4">{modal.message}</p>
              <button
                onClick={closeModal}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-md p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={copyRoomCode}
              className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-200 transition font-mono font-bold"
            >
              {currentRoom}
              <Copy size={18} />
            </button>
          </div>
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 transition"
          >
            <LogOut size={18} />
            Leave
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-3">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg ${
                msg.isSystem
                  ? 'bg-gray-200 text-gray-600 text-center text-sm italic'
                  : 'bg-white shadow'
              }`}
            >
              {!msg.isSystem && (
                <div className="font-semibold text-indigo-600 mb-1">
                  {msg.name}
                </div>
              )}
              <div className={msg.isSystem ? '' : 'text-gray-800'}>
                {msg.message}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
          <button
            onClick={handleSendMessage}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      {modal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
            <p className="text-gray-800 mb-4">{modal.message}</p>
            <button
              onClick={closeModal}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;