const schedule = require('node-schedule');
const Student = require('../models/Student');
const Meeting = require('../models/Meeting');
const Holiday = require('../models/Holiday');
const mailer = require('./mailer');
const smsService = require('./sms');
const { getColomboDateString, getColomboDayName, getColomboTimeMinutes } = require('../utils/dateHelpers');

// Helper to convert HH:MM string to minutes from midnight
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Task runner function (can also be triggered manually for testing)
const runScheduleCheck = async () => {
  console.log(`[Scheduler] Run initiated at ${new Date().toISOString()}`);
  
  const todayName = getColomboDayName();
  
  // Rule 1: Exclude weekends
  if (todayName === 'saturday' || todayName === 'sunday') {
    console.log('[Scheduler] Weekend. Skipping schedule check.');
    return;
  }

  const todayStr = getColomboDateString();

  try {
    // Rule 2: Exclude holidays
    const isHoliday = await Holiday.findOne({ date: todayStr });
    if (isHoliday) {
      console.log(`[Scheduler] Today (${todayStr}) is a holiday: ${isHoliday.description}. Skipping schedule check.`);
      return;
    }

    // Step 1: Get all active students
    const activeStudents = await Student.find({ isActive: true });
    
    // Step 2: Ensure meeting records exist for today
    for (const student of activeStudents) {
      if (!student.schedule || !student.schedule[todayName]) continue;

      // Morning meeting
      await Meeting.findOneAndUpdate(
        { student: student._id, date: todayStr, type: 'morning' },
        { 
          $setOnInsert: { 
            scheduledTime: student.schedule[todayName].morning,
            status: 'pending',
            reminderSent: false,
            missedAlertSent: false
          } 
        },
        { upsert: true, new: true }
      );

      // Evening meeting
      await Meeting.findOneAndUpdate(
        { student: student._id, date: todayStr, type: 'evening' },
        { 
          $setOnInsert: { 
            scheduledTime: student.schedule[todayName].evening,
            status: 'pending',
            reminderSent: false,
            missedAlertSent: false
          } 
        },
        { upsert: true, new: true }
      );
    }

    // Step 3: Fetch all of today's meetings to check timers
    const todayMeetings = await Meeting.find({ date: todayStr }).populate('student');

    const currentMinutesFromMidnight = getColomboTimeMinutes();

    for (const meeting of todayMeetings) {
      // If student was deactivated after meeting creation, skip alerts
      if (!meeting.student || !meeting.student.isActive) continue;

      // Determine scheduled meeting time (use rescheduledTime if status is rescheduled)
      const targetTimeStr = (meeting.status === 'rescheduled' && meeting.rescheduledTime) 
        ? meeting.rescheduledTime 
        : meeting.scheduledTime;

      const targetMinutes = timeToMinutes(targetTimeStr);
      const diffMinutes = targetMinutes - currentMinutesFromMidnight;

      // Rule A: Upcoming Meeting Reminder (10–15 minutes before meeting time)
      if (diffMinutes >= 10 && diffMinutes <= 15) {
        // Email reminder
        if (!meeting.reminderSent) {
          console.log(`[Scheduler] Sending email reminder for ${meeting.student.name} (${meeting.type}) at ${targetTimeStr}`);
          await mailer.sendReminder(meeting.student.name, meeting.type, targetTimeStr);
          meeting.reminderSent = true;
        }
        // SMS reminder (independent flag — does not block email)
        if (!meeting.smsReminderSent) {
          const phones = meeting.student.teamLeadPhone || [];
          if (phones.length > 0) {
            console.log(`[Scheduler] Sending SMS reminder for ${meeting.student.name} (${meeting.type}) to ${phones.join(', ')}`);
            await smsService.sendReminderSMS(phones, meeting.student.name, meeting.type, targetTimeStr, todayStr);
          }
          meeting.smsReminderSent = true;
        }
        if (meeting.isModified()) await meeting.save();
      }

      // Rule B: Missed Meeting Alert (if meeting time passes by at least 5 minutes and not completed/rescheduled)
      if (diffMinutes < 0) {
        const isPastDue = Math.abs(diffMinutes) >= 5;
        const isUnresolved = meeting.status === 'pending' || (meeting.status === 'rescheduled' && diffMinutes < 0);

        if (isPastDue && isUnresolved) {
          // Email missed alert
          if (!meeting.missedAlertSent) {
            console.log(`[Scheduler] Sending email missed alert for ${meeting.student.name} (${meeting.type}) at ${targetTimeStr}`);
            await mailer.sendMissedAlert(meeting.student.name, meeting.type, targetTimeStr);
            meeting.status = 'missed';
            meeting.missedAlertSent = true;
          }
          // SMS missed alert (independent flag)
          if (!meeting.smsAlertSent) {
            const phones = meeting.student.teamLeadPhone || [];
            if (phones.length > 0) {
              console.log(`[Scheduler] Sending SMS missed alert for ${meeting.student.name} (${meeting.type}) to ${phones.join(', ')}`);
              await smsService.sendMissedAlertSMS(phones, meeting.student.name, meeting.type, targetTimeStr, todayStr);
            }
            meeting.smsAlertSent = true;
          }
          if (meeting.isModified()) await meeting.save();
        }
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error during execution:', error);
  }
};

// Initialize background scheduler to run every minute
const initScheduler = () => {
  console.log('Initializing scheduler: runs every minute (* * * * *)');
  const job = schedule.scheduleJob('* * * * *', runScheduleCheck);
  
  // Run once immediately on startup for testing/initial logs
  setTimeout(runScheduleCheck, 5000);
  
  return job;
};

module.exports = {
  initScheduler,
  runScheduleCheck,
};
