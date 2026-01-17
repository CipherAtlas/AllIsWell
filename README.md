# All Is Well - Backend Server

Real-time WebSocket backend server for the All Is Well wellness check-in application.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- Railway account (for deployment)
- Redis service (Railway provides this automatically)

### Local Development

```bash
# Install dependencies
npm install

# Start server (requires Redis)
REDIS_URL=redis://localhost:6379 npm start
```

### Railway Deployment

1. **Connect Repository**: Railway Dashboard → New Project → Connect GitHub
2. **Add Redis**: Railway Dashboard → "+ New" → "Database" → "Add Redis"
3. **Deploy**: Railway automatically detects and deploys

Railway automatically provides:
- `REDIS_URL` - Redis connection URL
- `PORT` - Server port
- `NODE_ENV` - Set to "production"

## 📦 What This Backend Does

- **Real-time Communication**: WebSocket server using Socket.IO
- **Session Management**: Secure session tokens for user pairing
- **Session Persistence**: Redis storage for session data
- **Check-in Tracking**: Tracks user check-ins and alerts
- **Timer Management**: Manages reminder and alert timers

## 🔒 Security

- ✅ No hardcoded credentials
- ✅ All sensitive data uses environment variables
- ✅ Redis URL from `process.env.REDIS_URL`
- ✅ Secure session token generation
- ✅ Safe to expose code publicly

## 📋 API Endpoints

### REST API
- `GET /api/status/:sessionToken` - Get session status

### WebSocket Events
- `registerCode` - Register a 6-digit connection code
- `trackCode` - Connect tracker with code
- `reconnectSession` - Reconnect with session token
- `checkIn` - User check-in
- `setTimers` - Set reminder/alert timers
- `getStatus` - Get current session status

## 🏗️ Architecture

```
┌─────────────────┐
│  Client Apps    │
│  (Web/Mobile)   │
└────────┬────────┘
         │ WebSocket
         ↓
┌─────────────────┐
│  Node.js Server │
│  (Express +     │
│   Socket.IO)    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│     Redis       │
│  (Sessions)     │
└─────────────────┘
```

## 📁 Project Structure

```
.
├── server.js          # Main server file
├── package.json       # Dependencies
├── railway.json      # Railway configuration
├── .gitignore        # Git ignore rules
├── REDIS_SETUP.md    # Redis setup guide
└── README.md         # This file
```

## 🔧 Configuration

All configuration uses environment variables:
- `REDIS_URL` - Redis connection (provided by Railway)
- `PORT` - Server port (provided by Railway)

No manual configuration needed!

## 📚 Documentation

- `REDIS_SETUP.md` - Detailed Redis setup instructions

## ✅ Deployment Checklist

- [x] No hardcoded credentials
- [x] Environment variables configured
- [x] Redis service added
- [x] Railway deployment configured

## 🚀 Ready to Deploy

Your backend is secure and ready for Railway deployment!
