# Google OAuth Credentials

Place your Google OAuth 2.0 credentials here for Google Drive backups.

## Files

- `google-oauth.json` - OAuth 2.0 credentials with refresh token (created during setup)

## Setup Process

See [../BACKUP_SETUP.md](../BACKUP_SETUP.md) for complete setup instructions:

1. Create OAuth 2.0 credentials in Google Cloud Console
2. Extract client_id, client_secret, redirect_uri
3. Get authorization code from browser
4. Exchange code for refresh token
5. Place resulting credentials in `google-oauth.json`

## Security Note

- This file contains sensitive credentials (refresh token)
- It is ignored by Git for security
- Keep it secure and don't commit it to version control
- File permissions are set to 600 (owner read/write only)

```bash
chmod 600 google-oauth.json
```

