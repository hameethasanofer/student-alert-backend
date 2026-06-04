const express = require('express');
const router = express.Router();
const { runScheduleCheck } = require('../services/scheduler');

// This route is called by Vercel Cron Jobs every minute.
// It is protected by a secret token so only Vercel can trigger it.
router.get('/trigger', async (req, res) => {
  // Security: Verify the request comes from Vercel Cron using a shared secret
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.warn('[Cron] Unauthorized cron trigger attempt blocked.');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[Cron] Vercel cron trigger received. Running schedule check...');
    await runScheduleCheck();
    return res.status(200).json({ success: true, message: 'Schedule check completed.' });
  } catch (error) {
    console.error('[Cron] Schedule check failed:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
