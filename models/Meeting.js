const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    type: {
      type: String,
      enum: ['morning', 'evening'],
      required: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD to avoid timezone shifting
      required: true,
    },
    scheduledTime: {
      type: String, // Format: HH:MM
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'missed', 'rescheduled'],
      default: 'pending',
    },
    rescheduledTime: {
      type: String, // Format: HH:MM, active only if status is 'rescheduled'
      default: null,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    missedAlertSent: {
      type: Boolean,
      default: false,
    },
    smsReminderSent: {
      type: Boolean,
      default: false,
    },
    smsAlertSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure a student has at most one morning and one evening meeting per calendar date
meetingSchema.index({ student: 1, date: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Meeting', meetingSchema);
