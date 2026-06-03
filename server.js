require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const { initScheduler } = require('./services/scheduler');

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Smart Student Meeting Alert API is running' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || 'An internal server error occurred',
  });
});

// Start scheduler
initScheduler();

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
