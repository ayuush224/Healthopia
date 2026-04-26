require('dotenv').config();

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');

const authRoutes = require('../src/routes/authRoutes');
const userRoutes = require('../src/routes/userRoutes');
const communityRoutes = require('../src/routes/communityRoutes');
const postRoutes = require('../src/routes/postRoutes');
const commentRoutes = require('../src/routes/commentRoutes');
const healthRoutes = require('../src/routes/healthRoutes');
const resourceRoutes = require('../src/routes/resourceRoutes');
const { errorHandler } = require('../src/middleware/errorHandler');

// Validate environment variables
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is not set');
}

// MongoDB connection state
let cachedConnection = null;

async function connectDB() {
  // Return cached connection if already established
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  // Prevent multiple connection attempts
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const conn = await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });

    cachedConnection = conn;
    console.log('Database Connected Successfully');
    return conn;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw new Error(`MongoDB Connection Error: ${error.message}`);
  }
}

// Initialize Express app
const app = express();

// Middleware
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/resources', resourceRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use(errorHandler);

// Export for Vercel serverless
module.exports = async (req, res) => {
  try {
    // Ensure database is connected
    await connectDB();
    
    // Call Express app
    app(req, res);
  } catch (error) {
    console.error('Vercel handler error:', error.message);
    
    // Only send response if headers not already sent
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'production' ? undefined : error.message
      });
    }
  }
};
