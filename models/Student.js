const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a student name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please add an email address'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email address',
    ],
  },
  teamLeadPhone: {
    type: [String],
    default: [],
    validate: {
      validator: (phones) => phones.every(p => /^\+[1-9]\d{1,14}$/.test(p)),
      message: 'Each phone number must be in E.164 format (e.g. +94703101014)',
    },
  },
  schedule: {
    monday: {
      morning: { type: String, default: '09:00' },
      evening: { type: String, default: '17:00' }
    },
    tuesday: {
      morning: { type: String, default: '09:00' },
      evening: { type: String, default: '17:00' }
    },
    wednesday: {
      morning: { type: String, default: '09:00' },
      evening: { type: String, default: '17:00' }
    },
    thursday: {
      morning: { type: String, default: '09:00' },
      evening: { type: String, default: '17:00' }
    },
    friday: {
      morning: { type: String, default: '09:00' },
      evening: { type: String, default: '17:00' }
    }
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Student', studentSchema);
