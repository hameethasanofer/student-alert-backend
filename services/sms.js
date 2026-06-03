// SMS Service using Twilio
// Sends alert messages to all team lead phone numbers for a given student.

const twilio = require('twilio');

let twilioClient = null;

/**
 * Lazy-initialize the Twilio client.
 * Returns null (with a log) if credentials are not configured, so the
 * rest of the system continues to work without SMS.
 */
const getClient = () => {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.warn('[SMS] Twilio credentials not configured. SMS will be skipped.');
    return null;
  }

  twilioClient = twilio(accountSid, authToken);
  return twilioClient;
};

/**
 * Send an SMS to an array of phone numbers.
 * @param {string[]} phones  - E.164 formatted numbers e.g. ["+94703101014"]
 * @param {string}   message - Plain-text body to send
 */
const sendSMS = async (phones, message) => {
  const client = getClient();
  if (!client) return;

  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) {
    console.warn('[SMS] TWILIO_PHONE_NUMBER not set. Skipping SMS.');
    return;
  }

  const results = await Promise.allSettled(
    phones.map((to) =>
      client.messages.create({ from, to, body: message })
    )
  );

  results.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      console.log(`[SMS] Sent to ${phones[idx]} — SID: ${result.value.sid}`);
    } else {
      console.error(`[SMS] Failed to send to ${phones[idx]}:`, result.reason?.message);
    }
  });
};

/**
 * Build and send a REMINDER SMS.
 */
const sendReminderSMS = async (phones, studentName, type, time, date) => {
  if (!phones || phones.length === 0) return;
  const displayType = type.charAt(0).toUpperCase() + type.slice(1);
  const message =
    `[Apptron Alert] REMINDER: ${displayType} meeting with ${studentName} on ${date} at ${time}. Please prepare to join. — Smart Alert System`;
  await sendSMS(phones, message);
};

/**
 * Build and send a MISSED MEETING SMS.
 */
const sendMissedAlertSMS = async (phones, studentName, type, time, date) => {
  if (!phones || phones.length === 0) return;
  const displayType = type.charAt(0).toUpperCase() + type.slice(1);
  const message =
    `[Apptron Alert] ⚠️ MISSED: ${displayType} meeting with ${studentName} on ${date} at ${time} was not completed. Check dashboard. — Smart Alert System`;
  await sendSMS(phones, message);
};

module.exports = { sendReminderSMS, sendMissedAlertSMS };
