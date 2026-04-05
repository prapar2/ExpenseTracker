const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * Google Drive backup storage service using OAuth 2.0
 * Uses personal Google account credentials (stored as refresh token)
 * 
 * First-run setup flow:
 * 1. If credentials missing, provides setup URL
 * 2. User authorizes → Google redirects to /app-api/auth/google/callback
 * 3. Refresh token extracted and stored locally
 * 4. Subsequent app restarts use stored token
 */

let auth = null;
let credentialsReady = false;
let setupInProgress = false;

// OAuth 2.0 client configuration — set via environment variables
const OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const OAUTH_REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3001/app-api/auth/google/callback';

if (!OAUTH_CLIENT_ID || !OAUTH_CLIENT_SECRET) {
  console.warn('⚠️  GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET not set. Backups disabled.');
}

/**
 * Get path for storing credentials (persistent across restarts)
 */
function getCredentialsPath() {
  return process.env.BACKUP_CREDENTIALS_PATH || path.join(__dirname, 'config/google-oauth.json');
}

/**
 * Ensure credentials directory exists
 */
function ensureConfigDirectory() {
  const credentialsPath = getCredentialsPath();
  const configDir = path.dirname(credentialsPath);
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    console.log(`Created config directory: ${configDir}`);
  }
}

/**
 * Check if credentials file exists
 */
function credentialsExist() {
  return fs.existsSync(getCredentialsPath());
}

/**
 * Save credentials to file (used after OAuth callback)
 */
function saveCredentials(credentials) {
  try {
    ensureConfigDirectory();
    const credentialsPath = getCredentialsPath();
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2), 'utf-8');
    fs.chmodSync(credentialsPath, 0o600); // Restrict to owner only
    console.log(`OAuth credentials saved to ${credentialsPath}`);
    credentialsReady = true;
  } catch (error) {
    console.error('Failed to save credentials:', error.message);
    throw error;
  }
}

/**
 * Generate OAuth setup URL for user authorization
 */
function generateSetupUrl() {
  const oauth2Client = new google.auth.OAuth2(
    OAUTH_CLIENT_ID,
    OAUTH_CLIENT_SECRET,
    OAUTH_REDIRECT_URI
  );

  const scopes = ['https://www.googleapis.com/auth/drive'];
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent' // Force consent screen every time
  });

  return authUrl;
}

/**
 * Exchange authorization code for tokens (called from OAuth callback)
 */
async function exchangeAuthorizationCode(code) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      OAUTH_CLIENT_ID,
      OAUTH_CLIENT_SECRET,
      OAUTH_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    // Save credentials with refresh token
    const credentials = {
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      redirect_uri: OAUTH_REDIRECT_URI,
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      token_type: tokens.token_type,
      expiry_date: tokens.expiry_date
    };

    saveCredentials(credentials);
    console.log('✅ OAuth setup complete! Refresh token saved.');
    
    return { success: true, message: 'OAuth authorization successful. You can now use backups.' };
  } catch (error) {
    console.error('OAuth token exchange failed:', error.message);
    throw error;
  }
}

/**
 * Initialize OAuth 2.0 authentication with stored refresh token
 * If credentials don't exist, set up flag for first-run setup
 */
function initializeAuth() {
  try {
    if (!credentialsExist()) {
      credentialsReady = false;
      console.warn('⚠️  OAuth credentials not found. Backups disabled.');
      console.warn('📋 To enable backups, visit: http://localhost:3001/app-api/auth/google/setup');
      console.warn('   (Or see documentation for detailed setup instructions)');
      return null;
    }

    const credentials = JSON.parse(fs.readFileSync(getCredentialsPath(), 'utf-8'));
    
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

    credentialsReady = true;
    console.log('✅ OAuth credentials loaded successfully');
    return auth;
  } catch (error) {
    console.error('Failed to initialize Google Drive OAuth:', error.message);
    credentialsReady = false;
    return null;
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
,
  exchangeAuthorizationCode,
  generateSetupUrl,
  credentialsExist,
  isCredentialsReady: () => credentialsReady
};
