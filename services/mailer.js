const nodemailer = require('nodemailer');
const { getColomboDateString } = require('../utils/dateHelpers');

let transporter = null;

// Lazy initialization of transporter
const getTransporter = async () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    console.log('Using configured SMTP settings for mailer.');
    transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: port == 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });
  } else {
    console.log('No SMTP config found. Generating ethereal.email test credentials...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`Ethereal SMTP config generated!`);
      console.log(`Username: ${testAccount.user}`);
      console.log(`Password: ${testAccount.pass}`);
    } catch (err) {
      console.error('Failed to create Ethereal account, falling back to Console Logger:', err.message);
      // Fallback transporter that logs to console
      transporter = {
        sendMail: async (options) => {
          console.log('\n--- EMAIL SENT (MOCK) ---');
          console.log(`To: ${options.to}`);
          console.log(`Subject: ${options.subject}`);
          console.log(`Text: ${options.text}`);
          console.log('--------------------------\n');
          return { messageId: 'mock-id-' + Date.now() };
        },
      };
    }
  }

  return transporter;
};

const sendMail = async ({ to, subject, html, text }) => {
  try {
    const client = await getTransporter();
    const adminEmail = process.env.ADMIN_EMAIL || to || 'admin@apptron.com';
    const info = await client.sendMail({
      from: `"Smart Alert System" <${process.env.SMTP_USER || 'alerts@apptron.com'}>`,
      to: adminEmail,
      subject,
      text,
      html,
    });

    console.log(`Email sent: ${info.messageId}`);
    
    // If using ethereal, output the URL to view the email
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`Preview URL: ${previewUrl}`);
    }
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

const sendReminder = async (studentName, type, time) => {
  const displayType = type.charAt(0).toUpperCase() + type.slice(1);
  const subject = `Meeting Reminder - Starts in 10 Minutes`;
  
  const text = `Hello ${studentName},\n\nThis is a reminder that your scheduled meeting will begin in 10 minutes.\n\nMeeting Type: ${displayType}\nMeeting Time: ${time}\n\nPlease be prepared to join on time.`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <div style="background-color: #6366f1; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">Meeting Reminder - Starts in 10 Minutes</h1>
      </div>
      <div style="padding: 24px; background-color: #ffffff; color: #333333; line-height: 1.6;">
        <p style="font-size: 16px; margin-top: 0;">Hello ${studentName},</p>
        <p style="font-size: 16px;">This is a reminder that your scheduled meeting will begin in 10 minutes.</p>
        
        <div style="background-color: #f3f4f6; border-left: 4px solid #6366f1; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #4b5563;">Meeting Type:</td>
              <td style="padding: 4px 0; font-size: 16px; color: #1f2937;">${displayType}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #4b5563;">Meeting Time:</td>
              <td style="padding: 4px 0; font-size: 16px; font-weight: bold; color: #6366f1;">${time}</td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">Please be prepared to join on time.</p>
      </div>
    </div>
  `;

  return sendMail({ subject, text, html });
};

const sendMissedAlert = async (studentName, type, time) => {
  const displayType = type.charAt(0).toUpperCase() + type.slice(1);
  const currentDate = getColomboDateString();
  const subject = `⚠️ Missed Meeting Alert: ${studentName} (${displayType})`;
  
  const text = `Hi Team Lead,\n\nWarning: The scheduled ${type} meeting with ${studentName} on ${currentDate} at ${time} was missed and has not been marked as completed.\n\nPlease check the attendance log and update the status.\n\nBest regards,\nSmart Alert System`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fee2e2; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      <div style="background-color: #ef4444; color: white; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">⚠️ Missed Meeting Alert</h1>
      </div>
      <div style="padding: 24px; background-color: #ffffff; color: #333333; line-height: 1.6;">
        <p style="font-size: 16px; margin-top: 0;">Hi Team Lead,</p>
        <p style="font-size: 16px; color: #b91c1c; font-weight: bold;">Attention: A meeting session was missed without check-in.</p>
        
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; font-weight: bold; width: 120px; color: #7f1d1d;">Student:</td>
              <td style="padding: 4px 0; font-size: 16px; color: #1f2937;">${studentName}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #7f1d1d;">Session:</td>
              <td style="padding: 4px 0; font-size: 16px; color: #1f2937;">${displayType} Meeting</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #7f1d1d;">Date:</td>
              <td style="padding: 4px 0; font-size: 16px; color: #1f2937;">${currentDate}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-weight: bold; color: #7f1d1d;">Scheduled Time:</td>
              <td style="padding: 4px 0; font-size: 16px; font-weight: bold; color: #ef4444;">${time}</td>
            </tr>
          </table>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">Log into the Dashboard to review, update, or reschedule the meeting.</p>
      </div>
      <div style="background-color: #f9fafb; padding: 16px; text-align: center; border-top: 1px solid #fee2e2; font-size: 12px; color: #9ca3af;">
        Smart Student Meeting Alert System &bull; Apptron Solution
      </div>
    </div>
  `;

  return sendMail({ subject, text, html });
};

module.exports = {
  sendReminder,
  sendMissedAlert,
};
