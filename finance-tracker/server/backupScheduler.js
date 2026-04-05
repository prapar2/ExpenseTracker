const cron = require('node-cron');
const backupService = require('./backupService');

/**
 * Backup scheduler using node-cron
 */

let backupJob = null;

/**
 * Start backup scheduler
 * Default: Every Sunday at midnight (0 0 * * 0)
 */
function startBackupScheduler(schedule = '0 0 * * 0') {
  try {
    if (backupJob) {
      backupJob.stop();
    }

    backupJob = cron.schedule(schedule, async () => {
      console.log(`[${new Date().toISOString()}] Running scheduled backup...`);
      const result = await backupService.createBackup();
      
      if (result.success) {
        console.log(`[${new Date().toISOString()}] Backup completed: ${result.fileName}`);
      } else {
        console.error(`[${new Date().toISOString()}] Backup failed: ${result.error}`);
      }
    });

    console.log(`Backup scheduler started. Schedule: ${schedule}`);
    return backupJob;
  } catch (error) {
    console.error('Failed to start backup scheduler:', error.message);
    throw error;
  }
}

/**
 * Stop backup scheduler
 */
function stopBackupScheduler() {
  if (backupJob) {
    backupJob.stop();
    backupJob = null;
    console.log('Backup scheduler stopped');
  }
}

/**
 * Check if backup scheduler is running
 */
function isBackupSchedulerRunning() {
  return backupJob !== null;
}

module.exports = {
  startBackupScheduler,
  stopBackupScheduler,
  isBackupSchedulerRunning
};
