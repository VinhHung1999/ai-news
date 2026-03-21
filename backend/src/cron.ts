import cron from 'node-cron';
import { runAllCollectors } from './services/collector-runner';
import { closePool } from './db/database';

if (process.argv.includes('--now')) {
  console.log('[cron] Manual trigger: running collectors now...');
  runAllCollectors()
    .then(async () => {
      console.log('[cron] Manual collection finished.');
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[cron] Error:', err);
      await closePool();
      process.exit(1);
    });
} else {
  cron.schedule('0 5 * * *', async () => {
    console.log(`[cron] Scheduled run at ${new Date().toISOString()}`);
    try {
      await runAllCollectors();
    } catch (err) {
      console.error('[cron] Scheduled collection error:', err);
    }
  });

  console.log('[cron] Scheduler active. Next run: 5:00 AM daily.');
  console.log('[cron] Use "tsx src/cron.ts --now" to run immediately.');
}
