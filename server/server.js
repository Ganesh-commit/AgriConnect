const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');
const { setSocketIO } = require('./utils/notificationHelper');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const cropRoutes = require('./routes/cropRoutes');
const orderRoutes = require('./routes/orderRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatRoutes = require('./routes/chatRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const aiRoutes = require('./routes/aiRoutes');
const priceRoutes = require('./routes/priceRoutes');
const requirementRoutes = require('./routes/requirementRoutes');
const schemeRoutes = require('./routes/schemeRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const { setupSwagger } = require('./config/swagger');

// Optional Sentry Hook (Integration 12: controlled by SENTRY_DSN env)
let Sentry = null;
if (process.env.SENTRY_DSN && !process.env.SENTRY_DSN.startsWith('your_')) {
  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development'
    });
    console.log('[Sentry] Error monitoring initialized');
  } catch (err) {
    console.warn('[Sentry] SENTRY_DSN provided but @sentry/node not installed; continuing without Sentry.');
  }
}

// Connect to Database
connectDB();

const app = express();

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
  })
);

// Rate limiting: max 500 requests per 15 minutes per IP (increased for socket connections)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again in 15 minutes.'
  }
});
app.use('/api', limiter);

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in local dev
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Standard parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logger
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Serve uploaded media locally
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'AgriConnect API is operational and healthy',
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/weather', weatherRoutes);

// Mount Swagger/OpenAPI Documentation at /api/docs
setupSwagger(app);

// Catch-all 404 handler for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.originalUrl}' was not found on this server.`
  });
});

// Centralized error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Share io instance with notification helper
setSocketIO(io);

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map();

// Socket.io authentication middleware
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.split(' ')[1];
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  const joinedConversations = new Set();
  console.log(`[Socket.io] User ${userId} connected (${socket.id})`);

  // Join user's personal room for notifications and direct delivery
  socket.join(`user:${userId}`);
  socket.emit('online_users', Array.from(onlineUsers.keys()));

  // Track online status
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);
  io.emit('user_online', { userId, online: true });

  // Join a chat conversation room
  socket.on('join_conversation', async (conversationId) => {
    try {
      const Conversation = require('./models/Conversation');
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId
      }).select('_id');

      if (!conversation) return;
      joinedConversations.add(String(conversation._id));
      socket.join(`conv:${conversation._id}`);
    } catch (err) {
      console.error('[Socket.io] join_conversation error:', err.message);
    }
  });

  // Leave a chat conversation room
  socket.on('leave_conversation', (conversationId) => {
    joinedConversations.delete(String(conversationId));
    socket.leave(`conv:${conversationId}`);
  });

  // Handle chat message
  socket.on('send_message', async (data, acknowledge) => {
    try {
      const Conversation = require('./models/Conversation');
      const Message = require('./models/Message');

      const { conversationId, text } = data;
      if (!conversationId || typeof text !== 'string' || !text.trim() || text.trim().length > 2000) {
        acknowledge?.({ success: false, message: 'A message between 1 and 2000 characters is required.' });
        return;
      }

      const conversation = await Conversation.findById(conversationId);
      if (!conversation || !conversation.participants.map(String).includes(userId)) {
        acknowledge?.({ success: false, message: 'Conversation not found or access denied.' });
        return;
      }

      const roomSocketIds = io.sockets.adapter.rooms.get(`conv:${conversationId}`) || new Set();
      const activeUsers = new Set();
      for (const [participantId, socketIds] of onlineUsers) {
        if (Array.from(socketIds).some((socketId) => roomSocketIds.has(socketId))) {
          activeUsers.add(participantId);
        }
      }
      const readBy = [userId, ...conversation.participants
        .map(String)
        .filter((participantId) => participantId !== userId && activeUsers.has(participantId))];

      const message = await Message.create({
        conversation: conversationId,
        sender: userId,
        text: text.trim(),
        readBy
      });

      // Update last message and unread counts
      conversation.lastMessage = message._id;
      conversation.participants.forEach((pid) => {
        const pidStr = pid.toString();
        if (pidStr !== userId && !activeUsers.has(pidStr)) {
          conversation.unreadCounts.set(pidStr, (conversation.unreadCounts.get(pidStr) || 0) + 1);
        }
      });
      await conversation.save();

      const populated = await Message.findById(message._id).populate('sender', 'name avatar role');

      // Emit to all members in the conversation room
      io.to(`conv:${conversationId}`).emit('new_message', { message: populated, conversationId });
      acknowledge?.({ success: true, message: populated });

      // Notify offline participants via their personal room
      for (const pid of conversation.participants) {
        const pidStr = pid.toString();
        if (pidStr !== userId) {
          io.to(`user:${pidStr}`).emit('unread_count_update', { conversationId });
        }
      }
    } catch (err) {
      console.error('[Socket.io] send_message error:', err.message);
      acknowledge?.({ success: false, message: 'Message could not be sent.' });
    }
  });

  // Typing indicator
  socket.on('typing', ({ conversationId, isTyping }) => {
    if (!joinedConversations.has(String(conversationId))) return;
    socket.to(`conv:${conversationId}`).emit('typing', {
      userId,
      conversationId,
      isTyping
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] User ${userId} disconnected (${socket.id})`);
    if (onlineUsers.has(userId)) {
      onlineUsers.get(userId).delete(socket.id);
      if (onlineUsers.get(userId).size === 0) {
        onlineUsers.delete(userId);
        io.emit('user_online', { userId, online: false });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`[AgriConnect Server] running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`[Socket.io] Real-time chat enabled`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
});

module.exports = app;
