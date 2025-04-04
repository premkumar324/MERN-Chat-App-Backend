require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

// ✅ CORS Config
const allowedOrigins = [
  "http://localhost:5173",
  "https://chat-app-frontend-vite.vercel.app"
];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST"],
  credentials: true
}));
app.use(express.json());

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB Atlas"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Message Schema
const messageSchema = new mongoose.Schema({
  user: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// ✅ Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"]
  }
});

const users = {};

io.on('connection', (socket) => {
  console.log("🔌 User connected:", socket.id);

  // Load messages on connection
  Message.find().sort({ timestamp: 1 }).limit(100)
    .then(messages => socket.emit('loadMessages', messages))
    .catch(err => console.error("❌ Load error:", err));

  socket.on('getMessages', () => {
    Message.find().sort({ timestamp: 1 }).limit(100)
      .then(messages => socket.emit('loadMessages', messages))
      .catch(err => console.error("❌ Load error:", err));
  });

  socket.on('userJoined', (email) => {
    if (email) {
      users[socket.id] = email;
      io.emit('updateUsers', Object.values(users));
    }
  });

  socket.on('userTyping', (email) => {
    socket.broadcast.emit('userTyping', email);
  });

  socket.on('chatMessage', (msg) => {
    const messageData = {
      user: msg.sender,
      text: msg.text,
      timestamp: msg.timestamp || new Date()
    };

    const newMessage = new Message(messageData);
    newMessage.save().catch(console.error);

    io.emit('chatMessage', messageData);
  });

  socket.on('userLeft', (email) => {
    console.log("👋 User left:", email);
    delete users[socket.id];
    io.emit('updateUsers', Object.values(users));
  });

  socket.on('disconnect', () => {
    console.log("❌ Disconnected:", socket.id);
    delete users[socket.id];
    io.emit('updateUsers', Object.values(users));
  });
});

// ✅ Default Route
app.get('/', (req, res) => {
  res.send("🚀 Chat App Backend is Live!");
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🌐 Server running on http://localhost:${PORT}`);
});
