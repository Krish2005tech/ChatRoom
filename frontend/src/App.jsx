import React, { useState, useEffect, useRef } from 'react';
import { Copy, LogOut, Send, Moon, Sun } from 'lucide-react';

function App() {
  const [view, setView] = useState('home'); // home, join, chat
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [modal, setModal] = useState({ show: false, message: '' });
  const [ws, setWs] = useState(null);
  const [darkMode, setDarkMode] = useState(true);
  const messagesEndRef = useRef(null);

  const API_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

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
        setView('home');
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

  const handleJoinRoomClick = () => {
    if (!name.trim()) {
      showModal('Please enter your name before joining a room');
      return;
    }
    setView('join');
  };

  const handleJoinRoom = () => {
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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  if (view === 'home') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
        <div className={`rounded-2xl shadow-xl p-8 w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-center mb-8">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
              Simple Chatroom
            </h1>
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition`}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className={`w-full px-4 py-3 rounded-lg outline-none transition ${
                  darkMode 
                    ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent' 
                    : 'border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                }`}
              />
            </div>

            <button
              onClick={handleCreateRoom}
              className={`w-full py-3 rounded-lg font-medium transition ${
                darkMode 
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              Create Room
            </button>

            <button
              onClick={handleJoinRoomClick}
              className={`w-full py-3 rounded-lg font-medium border-2 transition ${
                darkMode 
                  ? 'bg-gray-700 text-indigo-400 border-indigo-500 hover:bg-gray-600' 
                  : 'bg-white text-indigo-600 border-indigo-600 hover:bg-indigo-50'
              }`}
            >
              Join Room
            </button>
          </div>
        </div>

        {modal.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`rounded-lg shadow-xl p-6 max-w-sm w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <p className={darkMode ? 'text-gray-200 mb-4' : 'text-gray-800 mb-4'}>{modal.message}</p>
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

  if (view === 'join') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
        <div className={`rounded-2xl shadow-xl p-8 w-full max-w-md ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-center mb-8">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
              Join Room
            </h1>
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition`}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                autoFocus
                className={`w-full px-4 py-3 rounded-lg outline-none transition ${
                  darkMode 
                    ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent' 
                    : 'border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                }`}
              />
            </div>

            <button
              onClick={handleJoinRoom}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition"
            >
              Join
            </button>

            <button
              onClick={() => {
                setView('home');
                setRoomCode('');
              }}
              className={`w-full py-3 rounded-lg font-medium border-2 transition ${
                darkMode 
                  ? 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600' 
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Back
            </button>
          </div>
        </div>

        {modal.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className={`rounded-lg shadow-xl p-6 max-w-sm w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <p className={darkMode ? 'text-gray-200 mb-4' : 'text-gray-800 mb-4'}>{modal.message}</p>
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
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-50 shadow-md p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={copyRoomCode}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-mono font-bold ${
                darkMode 
                  ? 'bg-indigo-900 text-indigo-300 hover:bg-indigo-800' 
                  : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
              }`}
            >
              {currentRoom}
              <Copy size={18} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} transition`}
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={handleLeaveRoom}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                darkMode 
                  ? 'bg-red-900 text-red-300 hover:bg-red-800' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              <LogOut size={18} />
              Leave
            </button>
          </div>
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
                  ? darkMode 
                    ? 'bg-gray-700 text-gray-300 text-center text-sm italic'
                    : 'bg-gray-200 text-gray-600 text-center text-sm italic'
                  : darkMode
                    ? 'bg-gray-800 shadow-lg'
                    : 'bg-white shadow'
              }`}
            >
              {!msg.isSystem && (
                <div className={`font-semibold mb-1 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
                  {msg.name}
                </div>
              )}
              <div className={msg.isSystem ? '' : darkMode ? 'text-gray-200' : 'text-gray-800'}>
                {msg.message}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className={`border-t p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className={`flex-1 px-4 py-3 rounded-lg outline-none transition ${
              darkMode 
                ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent' 
                : 'border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
            }`}
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
          <div className={`rounded-lg shadow-xl p-6 max-w-sm w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <p className={darkMode ? 'text-gray-200 mb-4' : 'text-gray-800 mb-4'}>{modal.message}</p>
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