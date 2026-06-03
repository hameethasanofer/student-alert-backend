const express = require('express');
const router = express.Router();
const Meeting = require('../models/Meeting');
const Student = require('../models/Student');
const { getColomboDateString, getColomboDayName } = require('../utils/dateHelpers');

// @desc    Get today's meetings (forces generation for active students if not present)
// @route   GET /api/meetings/today
router.get('/today', async (req, res) => {
  try {
    const todayStr = getColomboDateString();
    const todayName = getColomboDayName();
    
    // Auto-generate meetings for today if any active student is missing records
    // Only generate for Monday to Friday
    if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(todayName)) {
      const activeStudents = await Student.find({ isActive: true });
      for (const student of activeStudents) {
        if (!student.schedule || !student.schedule[todayName]) continue;

        // Morning
        await Meeting.findOneAndUpdate(
          { student: student._id, date: todayStr, type: 'morning' },
          { $setOnInsert: { scheduledTime: student.schedule[todayName].morning, status: 'pending', reminderSent: false, missedAlertSent: false } },
          { upsert: true }
        );
        // Evening
        await Meeting.findOneAndUpdate(
          { student: student._id, date: todayStr, type: 'evening' },
          { $setOnInsert: { scheduledTime: student.schedule[todayName].evening, status: 'pending', reminderSent: false, missedAlertSent: false } },
          { upsert: true }
        );
      }
    }

    const meetings = await Meeting.find({ date: todayStr }).populate('student');
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get meeting history (filterable by student, status, date range)
// @route   GET /api/meetings/history
router.get('/history', async (req, res) => {
  const { studentId, status, startDate, endDate } = req.query;
  const query = {};

  if (studentId) query.student = studentId;
  if (status) query.status = status;
  
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = startDate;
    if (endDate) query.date.$lte = endDate;
  }

  try {
    const meetings = await Meeting.find(query)
      .populate('student')
      .sort({ date: -1, scheduledTime: 1 });
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update meeting status (mark completed, reschedule, mark missed)
// @route   PUT /api/meetings/:id/status
router.put('/:id/status', async (req, res) => {
  const { status, rescheduledTime } = req.body;

  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    meeting.status = status;
    
    if (status === 'rescheduled') {
      if (!rescheduledTime) {
        return res.status(400).json({ message: 'Please provide a rescheduled time' });
      }
      meeting.rescheduledTime = rescheduledTime;
      // Reset flags so the reminder and missed check works for the new time
      meeting.reminderSent = false;
      meeting.missedAlertSent = false;
    } else {
      // If status is set back to pending, completed, or missed, reset rescheduledTime
      meeting.rescheduledTime = null;
    }

    const updatedMeeting = await meeting.save();
    const populated = await Meeting.findById(updatedMeeting._id).populate('student');
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Get meetings statistics (active students, completed vs missed)
// @route   GET /api/meetings/stats
router.get('/stats', async (req, res) => {
  try {
    const activeStudentsCount = await Student.countDocuments({ isActive: true });
    const totalStudentsCount = await Student.countDocuments();
    
    const todayStr = getColomboDateString();
    
    // Today's counts
    const todayMeetings = await Meeting.find({ date: todayStr });
    const todayTotal = todayMeetings.length;
    const todayCompleted = todayMeetings.filter(m => m.status === 'completed').length;
    const todayMissed = todayMeetings.filter(m => m.status === 'missed').length;
    const todayPending = todayMeetings.filter(m => m.status === 'pending').length;
    const todayRescheduled = todayMeetings.filter(m => m.status === 'rescheduled').length;

    // Historical counts
    const historicalCompleted = await Meeting.countDocuments({ status: 'completed' });
    const historicalMissed = await Meeting.countDocuments({ status: 'missed' });
    const historicalTotal = await Meeting.countDocuments();

    res.json({
      activeStudents: activeStudentsCount,
      totalStudents: totalStudentsCount,
      today: {
        total: todayTotal,
        completed: todayCompleted,
        missed: todayMissed,
        pending: todayPending,
        rescheduled: todayRescheduled
      },
      history: {
        total: historicalTotal,
        completed: historicalCompleted,
        missed: historicalMissed,
        rate: historicalTotal > 0 ? Math.round((historicalCompleted / historicalTotal) * 100) : 100
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
