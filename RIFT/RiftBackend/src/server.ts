import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import socialRoutes from './routes/social.routes';
import gameRoutes from './routes/game.routes';
import shopRoutes from './routes/shop.routes';
import { setupSocket } from './sockets/socketHandler';
import prisma from './prisma';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:8080", "https://playrift.no", "http://playrift.no"],
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Make io accessible in routes
app.set('io', io);

// Routes
// Mount on both /api/... and /... to handle different Nginx proxy_pass configurations
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/social', socialRoutes);
app.use('/social', socialRoutes);

app.use('/api/game', gameRoutes);
app.use('/game', gameRoutes);

app.use('/api/shop', shopRoutes);
app.use('/shop', shopRoutes);

// Health check
app.get('/', (req, res) => {
    res.send('RiftBackend Online');
});

// Socket.IO
setupSocket(io);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`RiftBackend running on port ${PORT}`);
});
