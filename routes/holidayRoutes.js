const express = require('express');
const router = express.Router();
const Holiday = require('../models/Holiday');

// @desc    Get all holidays
// @route   GET /api/holidays
router.get('/', async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ date: 1 });
    res.json(holidays);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Add a holiday
// @route   POST /api/holidays
router.post('/', async (req, res) => {
  const { date, description } = req.body;

  try {
    const holidayExists = await Holiday.findOne({ date });
    if (holidayExists) {
      return res.status(400).json({ message: 'This date is already marked as a holiday' });
    }

    const holiday = new Holiday({
      date,
      description,
    });

    const newHoliday = await holiday.save();
    res.status(201).json(newHoliday);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Remove a holiday
// @route   DELETE /api/holidays/:id
router.delete('/:id', async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    await Holiday.deleteOne({ _id: req.params.id });
    res.json({ message: 'Holiday removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
