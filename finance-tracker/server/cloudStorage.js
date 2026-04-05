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

// OAuth 2.0 client configuration — read from env at call time (not module load time)
// This ensures dotenv has already run before these are accessed
function getOAuthClientId() { return process.env.GOOGLE_OAUTH_CLIENT_ID; }
function getOAuthClientSecret() { return process.env.GOOGLE_OAUTH_CLIENT_SECRET; }
function getOAuthRedirectUri() {
  return process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3001/app-api/auth/google/callback';
}

/**
 * Build OAuth redirect URI dynamically based on request context
 * Handles both direct access and Home Assistant ingress paths
 */
function buildRedirectUri(req) {
  // Always use env var if explicitly set
  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) {
    return process.env.GOOGLE_OAUTH_REDIRECT_URI;
  }

  if (!req) {
    // Fallback for cases without request context
    return 'http://localhost:3001/app-api/auth/google/callback';
  }

  // Build callback URL from request headers, detecting HA ingress from the full request URL
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'localhost:3001';
  const originalUrl = req.originalUrl || req.url || '';

  // Extract HA ingress path if present in the original request URL
  const ingressMatch = originalUrl.match(/^(\/api\/hassio_ingress\/[^/]+)/);
  const basePath = ingressMatch ? ingressMatch[1] + '/app' : '';

  return `${protocol}://${host}${basePath}/app-api/auth/google/callback`;
}

/**
 * Check if a refresh token file exists (indicates user completed OAuth setup)
 * Returns true if token is available, false if OAuth setup still needed
 */
function credentialsExist() {
  if (!getOAuthClientId() || !getOAuthClientSecret()) {
    return false; // Can't do backups without env credentials
  }

  // Check if refresh token file exists
  const credPath = getCredentialsPath();
  try {
    if (fs.existsSync(credPath) && fs.statSync(credPath).isFile()) {
      const creds = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
      return !!creds.refresh_token;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Get path for storing OAuth refresh tokens (optional, for user-managed OAuth)
 * Only used if user completes OAuth flow to store refresh token
 */
function getCredentialsPath() {
  if (process.env.BACKUP_CREDENTIALS_PATH) {
    return process.env.BACKUP_CREDENTIALS_PATH;
  }
  // Check if running in Home Assistant (use writable volume)
  if (fs.existsSync('/data')) {
    return '/data/google-oauth.json';
  }
  // Default to local config directory
  return path.join(__dirname, 'config/google-oauth.json');
}

/**
 * Ensure credentials directory exists (only for file-based credentials)
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
 * Save credentials to file (used after OAuth callback)
 */
function saveCredentials(credentials) {
  try {
    ensureConfigDirectory();
    const credentialsPath = getCredentialsPath();
    // Guard: if path exists as a directory (e.g. created by nodemon), remove it first
    if (fs.existsSync(credentialsPath) && fs.statSync(credentialsPath).isDirectory()) {
      fs.rmSync(credentialsPath, { recursive: true });
    }
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
 * @param {Object} req - Express request object to extract context (HA ingress path, hostname, etc)
 */
function generateSetupUrl(req) {
  const redirectUri = buildRedirectUri(req);

  const oauth2Client = new google.auth.OAuth2(
    getOAuthClientId(),
    getOAuthClientSecret(),
    redirectUri
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
 * @param {string} code - Authorization code from Google OAuth
 * @param {Object} req - Express request object to extract context
 */
async function exchangeAuthorizationCode(code, req) {
  try {
    const redirectUri = buildRedirectUri(req);

    const oauth2Client = new google.auth.OAuth2(
      getOAuthClientId(),
      getOAuthClientSecret(),
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);

    // Save credentials with refresh token
    const credentials = {
      client_id: getOAuthClientId(),
      client_secret: getOAuthClientSecret(),
      redirect_uri: redirectUri,
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
 * Initialize OAuth 2.0 authentication with client credentials + refresh token
 * Client ID + Secret come from env (app identity)
 * Refresh token comes from file (user authorization, saved after OAuth flow)
 */
function initializeAuth() {
  try {
    // Env credentials are required (the app's Google OAuth identity)
    if (!getOAuthClientId() || !getOAuthClientSecret()) {
      credentialsReady = false;
      console.warn('⚠️  GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET not set. Backups disabled.');
      return null;
    }

    // Create OAuth2 client with env credentials
    const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3001/app-api/auth/google/callback';
    auth = new google.auth.OAuth2(
      getOAuthClientId(),
      getOAuthClientSecret(),
      redirectUri
    );

    // Try to load refresh token from file (user's authorization)
    const credPath = getCredentialsPath();
    try {
      if (fs.existsSync(credPath) && fs.statSync(credPath).isFile()) {
        const credentials = JSON.parse(fs.readFileSync(credPath, 'utf-8'));

        if (credentials.refresh_token) {
          auth.setCredentials({
            refresh_token: credentials.refresh_token
          });
          credentialsReady = true;
          console.log('✅ Backups enabled (refresh token loaded)');
          return auth;
        }
      }
    } catch (err) {
      // If file read fails, continue — user just needs to complete OAuth setup
      console.warn('Could not load refresh token from file:', err.message);
    }

    // Env credentials are set, but no refresh token yet
    // User must complete OAuth setup to authorize
    credentialsReady = false;
    console.warn('⚠️  OAuth setup required. No refresh token found.');
    return null;
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
  getBackupFolder,
  generateSetupUrl,
  exchangeAuthorizationCode,
  buildRedirectUri,
  credentialsExist,
  isCredentialsReady: () => credentialsReady
};
