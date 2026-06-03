const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const { getColomboDateString, getColomboDayName } = require('../utils/dateHelpers');

// @desc    Get all students
// @route   GET /api/students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find().sort({ name: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get single student
// @route   GET /api/students/:id
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create student
// @route   POST /api/students
router.post('/', async (req, res) => {
  const { name, email, morningTime, eveningTime, schedule, teamLeadPhone, isActive } = req.body;

  try {
    const studentExists = await Student.findOne({ email });
    if (studentExists) {
      return res.status(400).json({ message: 'A student with this email already exists' });
    }

    let finalSchedule = schedule;
    if (!finalSchedule) {
      const mt = morningTime || '09:00';
      const et = eveningTime || '17:00';
      finalSchedule = {
        monday: { morning: mt, evening: et },
        tuesday: { morning: mt, evening: et },
        wednesday: { morning: mt, evening: et },
        thursday: { morning: mt, evening: et },
        friday: { morning: mt, evening: et },
      };
    }

    // teamLeadPhone can be passed as an array or a comma-separated string
    let phones = [];
    if (teamLeadPhone) {
      phones = Array.isArray(teamLeadPhone)
        ? teamLeadPhone
        : teamLeadPhone.split(',').map(p => p.trim()).filter(Boolean);
    }

    const student = new Student({
      name,
      email,
      teamLeadPhone: phones,
      schedule: finalSchedule,
      isActive: isActive !== undefined ? isActive : true,
    });

    const newStudent = await student.save();
    res.status(201).json(newStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Update student
// @route   PUT /api/students/:id
router.put('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    let morningChanged = false;
    let eveningChanged = false;

    // Update fields
    if (req.body.name) student.name = req.body.name;
    if (req.body.email) student.email = req.body.email;
    
    if (req.body.schedule) {
      student.schedule = req.body.schedule;
      morningChanged = true;
      eveningChanged = true;
    } else {
      // Fallback for old frontend format: update all days
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      if (req.body.morningTime) {
        days.forEach(day => {
          if (!student.schedule[day]) student.schedule[day] = {};
          student.schedule[day].morning = req.body.morningTime;
        });
        morningChanged = true;
      }
      if (req.body.eveningTime) {
        days.forEach(day => {
          if (!student.schedule[day]) student.schedule[day] = {};
          student.schedule[day].evening = req.body.eveningTime;
        });
        eveningChanged = true;
      }
    }

    if (req.body.isActive !== undefined) student.isActive = req.body.isActive;

    // Update teamLeadPhone — accepts array or comma-separated string
    if (req.body.teamLeadPhone !== undefined) {
      const raw = req.body.teamLeadPhone;
      student.teamLeadPhone = Array.isArray(raw)
        ? raw
        : raw.split(',').map(p => p.trim()).filter(Boolean);
    }

    const updatedStudent = await student.save();

    // Sync today's active meeting records if schedules changed
    if (morningChanged || eveningChanged) {
      const Meeting = require('../models/Meeting');
      const todayStr = getColomboDateString();
      const todayName = getColomboDayName();

      if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].includes(todayName)) {
        if (morningChanged) {
          await Meeting.findOneAndUpdate(
            { student: student._id, date: todayStr, type: 'morning' },
            { 
              scheduledTime: student.schedule[todayName].morning,
              status: 'pending',
              reminderSent: false,
              missedAlertSent: false
            }
          );
        }
        if (eveningChanged) {
          await Meeting.findOneAndUpdate(
            { student: student._id, date: todayStr, type: 'evening' },
            { 
              scheduledTime: student.schedule[todayName].evening,
              status: 'pending',
              reminderSent: false,
              missedAlertSent: false
            }
          );
        }
      }
    }

    res.json(updatedStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Delete student
// @route   DELETE /api/students/:id
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await Student.deleteOne({ _id: req.params.id });
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
