require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

// Route imports
const studentRoutes = require('./routes/studentRoutes');
const meetingRoutes = require('./routes/meetingRoutes');
const holidayRoutes = require('./routes/holidayRoutes');

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/students', studentRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/holidays', holidayRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Smart Student Meeting Alert API is running'
  });
});

// Root route (fixes "Cannot GET /")
app.get('/', (req, res) => {
  res.send('Backend is running 🚀');
});

// Error handler
app.use((err, req, res, next) => {
  res.status(500).json({
    message: err.message || 'An internal server error occurred',
  });
});

// ❌ DO NOT use app.listen()
// ❌ DO NOT use scheduler on Vercel

module.exports = app;