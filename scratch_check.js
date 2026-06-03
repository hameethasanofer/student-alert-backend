require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./models/Student');
const Meeting = require('./models/Meeting');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/student_meeting_alerts');
  console.log('Connected to DB');

  const student = await Student.findOne({ name: 'hameetha' });
  console.log('Student ID:', student._id.toString());

  const y = new Date().getFullYear();
  const m = String(new Date().getMonth() + 1).padStart(2, '0');
  const d = String(new Date().getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;
  console.log('Computed todayStr:', todayStr);

  const query = { student: student._id, date: todayStr, type: 'morning' };
  console.log('Query:', query);

  const meeting = await Meeting.findOne(query);
  console.log('Found Meeting:', meeting);

  if (meeting) {
    meeting.scheduledTime = '13:20';
    meeting.status = 'pending';
    meeting.reminderSent = false;
    meeting.missedAlertSent = false;
    await meeting.save();
    console.log('Meeting updated manually!');
  } else {
    console.log('No meeting found with this query!');
  }

  await mongoose.disconnect();
};

run().catch(console.error);
