const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * Google Drive backup storage service using OAuth 2.0
 * Uses personal Google account credentials (stored as refresh token)
 */

let auth = null;

/**
 * Initialize OAuth 2.0 authentication with stored refresh token
 */
function initializeAuth() {
  try {
    const credentialsPath = process.env.BACKUP_CREDENTIALS_PATH || path.join(__dirname, 'config/google-oauth.json');
    
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`OAuth credentials file not found at ${credentialsPath}. Run setup first: see BACKUP_SETUP.md`);
    }

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
    
    // Validate required fields
    if (!credentials.client_id || !credentials.client_secret || !credentials.refresh_token) {
      throw new Error('Invalid OAuth credentials file. Missing client_id, client_secret, or refresh_token');
    }

    auth = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      credentials.redirect_uri
    );

    // Set stored refresh token for automatic token refresh
    auth.setCredentials({
      refresh_token: credentials.refresh_token
    });

    return auth;
  } catch (error) {
    console.error('Failed to initialize Google Drive OAuth:', error.message);
    throw error;
  }
}

/**
 * Get or create backup folder in Google Drive
 */
async function getBackupFolder() {
  try {
    if (!auth) initializeAuth();
    
    const drive = google.drive({
      version: 'v3',
      auth
    });

    // Search for existing backup folder in user's Drive
    const folderQuery = "name = 'Finance-Tracker-Backups' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and 'me' in owners";
    const result = await drive.files.list({
      q: folderQuery,
      spaces: 'drive',
      fields: 'files(id, name)'
    });

    if (result.data.files && result.data.files.length > 0) {
      console.log('Found existing Finance-Tracker-Backups folder');
      return result.data.files[0].id;
    }

    // Create folder if it doesn't exist
    console.log('Creating Finance-Tracker-Backups folder');
    const folderResult = await drive.files.create({
      resource: {
        name: 'Finance-Tracker-Backups',
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    });

    return folderResult.data.id;
  } catch (error) {
    console.error('Error managing backup folder:', error.message);
    throw error;
  }
}

/**
 * Upload backup file to Google Drive
 */
async function uploadBackup(dbPath, fileName) {
  try {
    if (!auth) initializeAuth();

    const drive = google.drive({
      version: 'v3',
      auth
    });

    // Get or create backup folder
    const folderId = await getBackupFolder();

    // Compress database file
    const fileStream = fs.createReadStream(dbPath);
    const compressed = zlib.createGzip();

    // Upload compressed file to folder
    const res = await drive.files.create({
      resource: {
        name: fileName,
        mimeType: 'application/gzip',
        parents: [folderId]
      },
      media: {
        body: fileStream.pipe(compressed)
      },
      fields: 'id, webViewLink, modifiedTime, size'
    });

    return {
      id: res.data.id,
      name: fileName,
      link: res.data.webViewLink,
      modified: res.data.modifiedTime,
      size: res.data.size
    };
  } catch (error) {
    console.error('Error uploading backup:', error.message);
    throw error;
  }
}

/**
 * List backups from Google Drive
 */
async function listBackups(limit = 10) {
  try {
    if (!auth) initializeAuth();

    const drive = google.drive({
      version: 'v3',
      auth
    });

    const folderId = await getBackupFolder();

    const result = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      spaces: 'drive',
      fields: 'files(id, name, modifiedTime, size)',
      orderBy: 'modifiedTime desc',
      pageSize: limit
    });

    return result.data.files || [];
  } catch (error) {
    console.error('Error listing backups:', error.message);
    throw error;
  }
}

/**
 * Download latest backup from Google Drive
 */
async function downloadLatestBackup(outputPath) {
  try {
    if (!auth) initializeAuth();

    const drive = google.drive({
      version: 'v3',
      auth
    });

    // Get latest backup
    const backups = await listBackups(1);
    
    if (!backups || backups.length === 0) {
      throw new Error('No backups found on Google Drive');
    }

    const latestBackup = backups[0];
    console.log(`Downloading backup: ${latestBackup.name}`);

    // Download file
    const dest = fs.createWriteStream(outputPath);
    
    await new Promise((resolve, reject) => {
      drive.files.get(
        { fileId: latestBackup.id, alt: 'media' },
        { responseType: 'stream' },
        (err, res) => {
          if (err) reject(err);
          else {
            res.data
              .pipe(zlib.createGunzip())
              .pipe(dest)
              .on('error', reject)
              .on('finish', resolve);
          }
        }
      );
    });

    return {
      fileName: latestBackup.name,
      size: latestBackup.size,
      modified: latestBackup.modifiedTime,
      outputPath
    };
  } catch (error) {
    console.error('Error downloading backup:', error.message);
    throw error;
  }
}

/**
 * Delete old backups, keeping only latest
 */
async function cleanupOldBackups(keepCount = 1) {
  try {
    if (!auth) initializeAuth();

    const drive = google.drive({
      version: 'v3',
      auth
    });

    const backups = await listBackups(100);
    
    if (backups.length > keepCount) {
      const toDelete = backups.slice(keepCount);
      
      for (const backup of toDelete) {
        try {
          await drive.files.delete({ fileId: backup.id });
          console.log(`Deleted backup: ${backup.name}`);
        } catch (err) {
          console.error(`Failed to delete backup ${backup.name}:`, err.message);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up backups:', error.message);
    throw error;
  }
}

/**
 * Test Google Drive connection
 */
async function testConnection() {
  try {
    if (!auth) initializeAuth();
    await getBackupFolder();
    return { success: true, message: 'Google Drive connection successful' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  initializeAuth,
  uploadBackup,
  listBackups,
  downloadLatestBackup,
  cleanupOldBackups,
  testConnection,
  getBackupFolder
};

/**
 * Get or create backup folder in Google Drive
 */
async function getBackupFolder() {
  try {
    if (!auth) initializeAuth();
    
    const drive = google.drive({
      version: 'v3',
      auth
    });

    // Search for existing backup folder
    const folderQuery = "name = 'Finance-Tracker-Backups' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    const result = await drive.files.list({
      q: folderQuery,
      spaces: 'drive',
      fields: 'files(id, name)'
    });

    if (result.data.files && result.data.files.length > 0) {
      return result.data.files[0].id;
    }

    // Create folder if it doesn't exist
    const folderResult = await drive.files.create({
      resource: {
        name: 'Finance-Tracker-Backups',
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    });

    return folderResult.data.id;
  } catch (error) {
    console.error('Error managing backup folder:', error.message);
    throw error;
  }
}

/**
 * Upload backup file to Google Drive
 */
async function uploadBackup(dbPath, fileName) {
  try {
    if (!auth) initializeAuth();

    const drive = google.drive({
      version: 'v3',
      auth
    });

    // Get or create backup folder
    const folderId = await getBackupFolder();

    // Compress database file
    const fileStream = fs.createReadStream(dbPath);
    const compressed = zlib.createGzip();

    // Upload compressed file
    const res = await drive.files.create({
      resource: {
        name: fileName,
        mimeType: 'application/gzip',
        parents: [folderId]
      },
      media: {
        body: fileStream.pipe(compressed)
      },
      fields: 'id, webViewLink, modifiedTime, size'
    });

    return {
      id: res.data.id,
      name: fileName,
      link: res.data.webViewLink,
      modified: res.data.modifiedTime,
      size: res.data.size
    };
  } catch (error) {
    console.error('Error uploading backup:', error.message);
    throw error;
  }
}

/**
 * List backups from Google Drive
 */
async function listBackups(limit = 10) {
  try {
    if (!auth) initializeAuth();

    const drive = google.drive({
      version: 'v3',
      auth
    });

    const folderId = await getBackupFolder();

    const result = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      spaces: 'drive',
      fields: 'files(id, name, modifiedTime, size)',
      orderBy: 'modifiedTime desc',
      pageSize: limit
    });

    return result.data.files || [];
  } catch (error) {
    console.error('Error listing backups:', error.message);
    throw error;
  }
}

/**
 * Download latest backup from Google Drive
 */
async function downloadLatestBackup(outputPath) {
  try {
    if (!auth) initializeAuth();

    const drive = google.drive({
      version: 'v3',
      auth
    });

    // Get latest backup
    const backups = await listBackups(1);
    
    if (!backups || backups.length === 0) {
      throw new Error('No backups found on Google Drive');
    }

    const latestBackup = backups[0];

    // Download file
    const dest = fs.createWriteStream(outputPath);
    
    await new Promise((resolve, reject) => {
      drive.files.get(
        { fileId: latestBackup.id, alt: 'media' },
        { responseType: 'stream' },
        (err, res) => {
          if (err) reject(err);
          else {
            res.data
              .pipe(zlib.createGunzip())
              .pipe(dest)
              .on('error', reject)
              .on('finish', resolve);
          }
        }
      );
    });

    return {
      fileName: latestBackup.name,
      size: latestBackup.size,
      modified: latestBackup.modifiedTime,
      outputPath
    };
  } catch (error) {
    console.error('Error downloading backup:', error.message);
    throw error;
  }
}

/**
 * Delete old backups, keeping only latest
 */
async function cleanupOldBackups(keepCount = 1) {
  try {
    if (!auth) initializeAuth();

    const drive = google.drive({
      version: 'v3',
      auth
    });

    const backups = await listBackups(100);
    
    if (backups.length > keepCount) {
      const toDelete = backups.slice(keepCount);
      
      for (const backup of toDelete) {
        try {
          await drive.files.delete({ fileId: backup.id });
          console.log(`Deleted backup: ${backup.name}`);
        } catch (err) {
          console.error(`Failed to delete backup ${backup.name}:`, err.message);
        }
      }
    }
  } catch (error) {
    console.error('Error cleaning up backups:', error.message);
    throw error;
  }
}

/**
 * Test Google Drive connection
 */
async function testConnection() {
  try {
    if (!auth) initializeAuth();
    await getBackupFolder();
    return { success: true, message: 'Google Drive connection successful' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  initializeAuth,
  uploadBackup,
  listBackups,
  downloadLatestBackup,
  cleanupOldBackups,
  testConnection,
  getBackupFolder
};
