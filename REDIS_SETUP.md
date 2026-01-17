# Redis Setup for Railway

This guide explains how to set up Redis for session persistence on Railway.

## Why Redis?

Redis provides persistent storage for sessions, so your user pairings survive server restarts, deployments, and crashes.

## Railway Setup

### Step 1: Add Redis Service

1. Go to your Railway project dashboard
2. Click **"+ New"** → **"Database"** → **"Add Redis"**
3. Railway will automatically provision a Redis instance

### Step 2: Get Redis URL

Railway automatically provides a `REDIS_URL` environment variable to your Node.js service:

1. Go to your **Node.js service** in Railway
2. Click on **"Variables"** tab
3. You should see `REDIS_URL` automatically added (Railway does this when you add Redis)
4. The format will be: `redis://default:password@host:port`

### Step 3: Verify Connection

The server will automatically connect to Redis on startup. Check your Railway logs:

```
Redis Client Connected
Redis connected successfully
Loading X sessions from Redis...
Loaded X sessions into memory
```

## How It Works

### Session Persistence

- **Sessions are saved to Redis** whenever they're created or updated
- **Sessions are loaded from Redis** on server startup
- **Sessions expire after 30 days** of inactivity (automatic cleanup)

### Graceful Degradation

If Redis is unavailable:
- Server continues to work normally
- Sessions are stored in memory only (no persistence)
- Users can still connect and use the app

### What Gets Persisted

- Session tokens
- Last check-in timestamps
- Timer settings (reminder/alert times)
- Connection state (but socket IDs are cleared on restart)

## Cost

Railway Redis pricing:
- **Free tier**: 25 MB RAM
- **Paid**: ~$5-10/month for 256 MB (sufficient for 10K users)

## Troubleshooting

### Redis Not Connecting

1. **Check environment variable**:
   ```bash
   # In Railway dashboard, verify REDIS_URL is set
   ```

2. **Check Redis service status**:
   - Go to Redis service in Railway
   - Verify it's running (green status)

3. **Check logs**:
   ```bash
   # Look for Redis connection errors in Railway logs
   ```

### Sessions Not Persisting

1. **Verify Redis is connected**:
   - Check startup logs for "Redis connected successfully"

2. **Check session saves**:
   - Sessions are saved automatically on:
     - Session creation (when tracker connects)
     - Check-in updates
     - Timer setting updates
     - Reconnection

3. **Verify Redis has data**:
   - Use Railway's Redis console (if available)
   - Or connect via CLI to check keys

## Manual Redis Connection (for debugging)

If you need to connect to Redis manually:

```bash
# Install redis-cli
npm install -g redis-cli

# Connect using Railway's REDIS_URL
redis-cli -u $REDIS_URL

# List all session keys
KEYS session:*

# Get a specific session
GET session:YOUR_SESSION_TOKEN
```

## Testing

1. **Create a session**: Pair two users
2. **Restart server**: Deploy or restart in Railway
3. **Reconnect**: Users should be able to reconnect with their sessionToken
4. **Verify**: Check logs for "Session restored from Redis"

## Next Steps

- Sessions now persist across restarts ✅
- Users can reconnect after server restarts ✅
- No data loss on deployments ✅
