const fs = require('fs');
const path = require('path');
const cloudStorage = require('./cloudStorage');
const { validateDatabase, getDatabaseMetadata } = require('./databaseValidator');

/**
 * Main backup service orchestrator
 */

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/app.db');

/**
 * Create backup and upload to Google Drive
 */
async function createBackup() {
  try {
    // Validate source database
    const validation = validateDatabase(DB_PATH);
    if (!validation.valid) {
      throw new Error(`Database validation failed: ${validation.error}`);
    }

    // Get metadata
    const metadata = getDatabaseMetadata(DB_PATH);
    
    // Create filename with timestamp and system name
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const systemName = process.env.BACKUP_SYSTEM_NAME || 'default';
    const fileName = `app_backup_${systemName}_${timestamp}.db.gz`;

    console.log(`Starting backup: ${fileName}`);
    console.log(`Database size: ${(metadata.size / 1024 / 1024).toFixed(2)} MB`);

    // Upload to Google Drive
    const uploadResult = await cloudStorage.uploadBackup(DB_PATH, fileName);
    
    console.log(`Backup uploaded successfully: ${uploadResult.name}`);
    
    // Cleanup old backups (keep only latest)
    await cloudStorage.cleanupOldBackups(1);

    return {
      success: true,
      fileName: uploadResult.name,
      size: uploadResult.size,
      modified: uploadResult.modified,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Backup failed:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Restore database from backup
 */
async function restoreBackup() {
  try {
    // Create backup of current database (safety measure)
    const backupDir = path.join(__dirname, '../data/backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const currentBackupPath = path.join(backupDir, `app_backup_current_${Date.now()}.db`);
    
    if (fs.existsSync(DB_PATH)) {
      fs.copyFileSync(DB_PATH, currentBackupPath);
      console.log(`Current database backed up to: ${currentBackupPath}`);
    }

    // Download latest backup
    const tempRestorePath = path.join(backupDir, 'app_restore_temp.db');
    
    console.log('Downloading backup from Google Drive...');
    const downloadResult = await cloudStorage.downloadLatestBackup(tempRestorePath);

    // Validate restored database
    console.log('Validating restored database...');
    const validation = validateDatabase(tempRestorePath);
    
    if (!validation.valid) {
      throw new Error(`Restored database validation failed: ${validation.error}`);
    }

    // Replace current database
    console.log('Replacing current database with restored backup...');
    
    // Close any open connections (if using connection pool)
    // This is handled at application level
    
    fs.copyFileSync(tempRestorePath, DB_PATH);
    
    // Cleanup temp file
    fs.unlinkSync(tempRestorePath);

    console.log('Restore completed successfully');

    return {
      success: true,
      restoredFrom: downloadResult.fileName,
      timestamp: new Date().toISOString(),
      note: `Previous database backed up to: ${currentBackupPath}`
    };
  } catch (error) {
    console.error('Restore failed:', error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get backup status
 */
async function getBackupStatus() {
  try {
    const backups = await cloudStorage.listBackups(1);
    
    if (!backups || backups.length === 0) {
      return {
        lastBackup: null,
        status: 'No backups found'
      };
    }

    const latest = backups[0];
    return {
      lastBackup: {
        name: latest.name,
        modified: latest.modifiedTime,
        size: latest.size
      },
      status: 'Backup found',
      daysOld: Math.floor((Date.now() - new Date(latest.modifiedTime)) / (1000 * 60 * 60 * 24))
    };
  } catch (error) {
    return {
      status: 'Error',
      error: error.message
    };
  }
}

module.exports = {
  createBackup,
  restoreBackup,
  getBackupStatus
};
