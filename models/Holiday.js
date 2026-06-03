const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  date: {
    type: String, // Format: YYYY-MM-DD
    required: [true, 'Please specify the holiday date'],
    unique: true,
  },
  description: {
    type: String,
    required: [true, 'Please add a holiday description'],
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Holiday', holidaySchema);
