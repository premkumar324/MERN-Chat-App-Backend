require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Store active users
const users = {};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle user joining
    socket.on('join', (username) => {
        users[socket.id] = username;
        io.emit('userList', Object.values(users));
    });

    // Handle chat messages (Fixed event name to match frontend)
    socket.on('chatMessage', (msg) => {
        io.emit('chatMessage', msg);
    });
    

    // Handle user disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete users[socket.id];
        io.emit('userList', Object.values(users));
    });
});

// Default route
app.get('/', (req, res) => {
    res.send("Chat App Backend is Running!");
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
