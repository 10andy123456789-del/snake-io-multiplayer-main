import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path'; // 👈 新增：用來自動尋找資料夾路徑的工具
import { GameServer } from './game/GameServer';
import { SocketHandler } from './network/SocketHandler';

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();

// CORS configuration
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

// 👇 改造重點開始：把後台回報移走，把首頁留給遊戲畫面 👇

// 1. 將原本的報平安網址改到 /api/status (這樣就不會霸佔首頁)
app.get('/api/status', (_req, res) => {
  res.json({ 
    status: 'ok', 
    game: 'Snake.io Multiplayer',
    players: GameServer.getInstance().getPlayerCount()
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy' });
});

// 2. 告訴伺服器：遊戲畫面的資料夾在哪裡 (通常打包後會在 client/dist)
const clientPath = path.join(process.cwd(), 'client/dist');
app.use(express.static(clientPath));

// 3. 任何人來到這個網站，只要找不到網址，就一律發放遊戲畫面 (index.html) 給他！
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// 👆 改造重點結束 👆

// Create HTTP server
const httpServer = createServer(app);

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Initialize game server
const gameServer = GameServer.getInstance();
gameServer.start();

// Initialize socket handlers
new SocketHandler(io, gameServer);

// Start listening
httpServer.listen(PORT, () => {
  console.log(`🐍 Snake.io Server running on port ${PORT}`);
  console.log(`📡 Accepting connections from: ${CLIENT_URL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  gameServer.stop();
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});