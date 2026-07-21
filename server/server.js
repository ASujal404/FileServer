const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const { PORT, STORAGE_DIR, LOGS_DIR } = require('./config/constants');
const { initializeDatabase } = require('./database/initDb');

// Ensure storage and logs directories exist
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

const app = express();
const server = http.createServer(app);

// Configure Socket.IO for real-time LAN communication
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware Setup
app.use(helmet({
  crossOriginResourcePolicy: false // Allow network file downloads
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Attach Socket.IO instance to HTTP request pipeline
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Import Routes
const authRoutes = require('./routes/auth.routes');
const fileRoutes = require('./routes/file.routes');
const folderRoutes = require('./routes/folder.routes');
const shareRoutes = require('./routes/share.routes');
const storageRoutes = require('./routes/storage.routes');
const auditRoutes = require('./routes/audit.routes');
const adminRoutes = require('./routes/admin.routes');
const qrRoutes = require('./routes/qr.routes');
const errorHandler = require('./middlewares/errorHandler');

// Root API Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    system: 'Enterprise Network File Server',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes (Mount qrRoutes first so QR mobile endpoints use verifyQrSession)
app.use('/', qrRoutes);
app.use('/', authRoutes);
app.use('/', fileRoutes);
app.use('/', folderRoutes);
app.use('/', shareRoutes);
app.use('/', storageRoutes);
app.use('/', auditRoutes);
app.use('/admin', adminRoutes);

// Global Error Handler
app.use(errorHandler);

// Socket.IO Connection Listener
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Server Error Event Handler (e.g. EADDRINUSE)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ [Server Error] Port ${PORT} is already in use by another process.`);
    console.error(`   To resolve, kill the process on port ${PORT} or specify a different PORT in server/.env\n`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

// Initialize Database & Start Listening on LAN (0.0.0.0)
async function startServer() {
  await initializeDatabase();

  server.listen(PORT, '0.0.0.0', () => {
    console.log('=====================================================');
    console.log(`🚀 File Server running on http://0.0.0.0:${PORT}`);
    console.log(`📁 Local Storage path: ${STORAGE_DIR}`);
    console.log('=====================================================');
  });
}

startServer();

module.exports = { app, server };
