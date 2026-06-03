// Centralized Date Helpers for Asia/Colombo timezone

/**
 * Returns the current date in YYYY-MM-DD format for Asia/Colombo.
 */
const getColomboDateString = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  // en-CA outputs YYYY-MM-DD natively
  return formatter.format(new Date());
};

/**
 * Returns the current day name in lowercase (e.g. 'monday', 'tuesday') for Asia/Colombo.
 */
const getColomboDayName = () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    weekday: 'long'
  });
  return formatter.format(new Date()).toLowerCase();
};

/**
 * Returns the current minutes from midnight (0-1439) in Asia/Colombo timezone.
 */
const getColomboTimeMinutes = () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Example output: "14:30" or "24:15"
  let timeStr = formatter.format(new Date());
  
  // Intl sometimes returns 24 instead of 00 for midnight in hour12: false
  let [hours, minutes] = timeStr.split(':').map(Number);
  if (hours === 24) hours = 0;
  
  return hours * 60 + minutes;
};

module.exports = {
  getColomboDateString,
  getColomboDayName,
  getColomboTimeMinutes
};
