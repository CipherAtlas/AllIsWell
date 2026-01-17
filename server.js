const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const crypto = require('crypto');

// Optional Redis support - gracefully degrade if not available
let redis = null;
let redisClient = null;
try {
  redis = require('redis');
} catch (error) {
  console.warn('Redis module not found, continuing without persistence');
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Parse JSON bodies for REST API
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Redis client (if available)
// Railway provides REDIS_URL environment variable
if (redis) {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
    // Continue without Redis if connection fails (graceful degradation)
  });

  redisClient.on('connect', () => {
    console.log('Redis Client Connected');
  });

  // Connect to Redis (with error handling)
  (async () => {
    try {
      await redisClient.connect();
      console.log('Redis connected successfully');
      // Load all sessions from Redis on startup
      await loadAllSessionsFromRedis();
    } catch (error) {
      console.warn('Redis connection failed, continuing without persistence:', error.message);
      // Server will continue to work, just without persistence
    }
  })();
} else {
  console.log('Running without Redis persistence (in-memory only)');
}

// Session persistence helpers
async function saveSessionToRedis(sessionToken, sessionData) {
  if (!redisClient) return;
  try {
    if (redisClient.isOpen) {
      // Save session with 30 day expiration
      await redisClient.setEx(
        `session:${sessionToken}`,
        30 * 24 * 60 * 60, // 30 days in seconds
        JSON.stringify(sessionData)
      );
    }
  } catch (error) {
    console.error('Error saving session to Redis:', error);
  }
}

async function loadSessionFromRedis(sessionToken) {
  if (!redisClient) return null;
  try {
    if (redisClient.isOpen) {
      const data = await redisClient.get(`session:${sessionToken}`);
      if (data) {
        return JSON.parse(data);
      }
    }
  } catch (error) {
    console.error('Error loading session from Redis:', error);
  }
  return null;
}

async function deleteSessionFromRedis(sessionToken) {
  if (!redisClient) return;
  try {
    if (redisClient.isOpen) {
      await redisClient.del(`session:${sessionToken}`);
    }
  } catch (error) {
    console.error('Error deleting session from Redis:', error);
  }
}

// Load all sessions from Redis on startup
async function loadAllSessionsFromRedis() {
  if (!redisClient) return;
  try {
    if (redisClient.isOpen) {
      const keys = await redisClient.keys('session:*');
      console.log(`Loading ${keys.length} sessions from Redis...`);
      
      for (const key of keys) {
        const sessionToken = key.replace('session:', '');
        const sessionData = await loadSessionFromRedis(sessionToken);
        if (sessionData) {
          // Clear socket IDs (they'll be updated on reconnection)
          sessionData.trackedSocketId = null;
          if (sessionData.trackerSocketIds) {
            sessionData.trackerSocketIds = [];
          }
          sessions.set(sessionToken, sessionData);
        }
      }
      console.log(`Loaded ${sessions.size} sessions into memory`);
    }
  } catch (error) {
    console.error('Error loading sessions from Redis:', error);
  }
}

// REST API endpoint for background service status checks
app.get('/api/status/:sessionToken', async (req, res) => {
  const { sessionToken } = req.params;
  
  // Check memory first, then Redis
  let sessionData = sessions.get(sessionToken);
  
  if (!sessionData) {
    // Try loading from Redis
    sessionData = await loadSessionFromRedis(sessionToken);
    if (sessionData) {
      // Restore to memory
      sessions.set(sessionToken, sessionData);
    }
  }
  
  if (!sessionData) {
    return res.status(404).json({ error: 'Invalid session token' });
  }
  
  // Use sessionData (already loaded above)
  const now = Date.now();
  
  // Calculate if alert expired
  let alertExpired = false;
  if (sessionData.lastCheckIn && sessionData.alertTimeMinutes && sessionData.settingsConfigured) {
    const alertTimeMs = sessionData.alertTimeMinutes * 60 * 1000;
    const timeSinceCheckIn = now - sessionData.lastCheckIn;
    if (timeSinceCheckIn > alertTimeMs) {
      alertExpired = true;
      // Mark as pending alert if not already
      if (!pendingAlerts.has(sessionToken)) {
        pendingAlerts.set(sessionToken, { timestamp: now });
      }
    }
  }
  
  res.json({
    sessionToken,
    lastCheckIn: sessionData.lastCheckIn,
    alertExpired: alertExpired,
    settingsConfigured: sessionData.settingsConfigured
  });
});

// Store code mappings: code -> { trackedSocketId: string | null, trackerSocketId: string | null, sessionToken: string | null, expiresAt: timestamp, isConnected: boolean }
const codes = new Map();

// Store session mappings: sessionToken -> { trackedSocketId: string | null, trackerSocketIds: string[], lastCheckIn: timestamp, reminderTimeMinutes: number, alertTimeMinutes: number, reminderTimeEnd: timestamp, alertTimeEnd: timestamp, settingsConfigured: boolean }
const sessions = new Map();

// Store pending alerts: sessionToken -> { timestamp, message }
const pendingAlerts = new Map();

// Store reminder timers by sessionToken: sessionToken -> timer instance (for tracked person)
const reminderTimers = new Map();

// Store alert timers by sessionToken: sessionToken -> timer instance (for tracker)
const alertTimers = new Map();

// Store code expiration timers: code -> timeout instance
const codeExpirationTimers = new Map();

// Track all active codes to ensure uniqueness
const activeCodes = new Set();

// Generate unique 6-digit code
function generateUniqueCode() {
  let code;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (activeCodes.has(code));
  return code;
}

// Generate secure session token
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Clean up expired code
function expireCode(code) {
  const codeData = codes.get(code);
  if (codeData && !codeData.isConnected) {
    // Only expire if not connected
    codes.delete(code);
    activeCodes.delete(code);
    if (codeExpirationTimers.has(code)) {
      clearTimeout(codeExpirationTimers.get(code));
      codeExpirationTimers.delete(code);
    }
    console.log(`Code expired: ${code}`);
  }
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Tracked person registers/refreshes a code
  socket.on('registerCode', (code) => {
    const now = Date.now();
    const expiresAt = now + (5 * 60 * 1000); // 5 minutes
    
    // If code already exists and is connected, don't regenerate
    if (codes.has(code)) {
      const existing = codes.get(code);
      if (existing.isConnected) {
        // Already connected, just update socket ID
        existing.trackedSocketId = socket.id;
        codes.set(code, existing);
        
        // If there's a sessionToken, update the session and send it back
        if (existing.sessionToken) {
          const sessionData = sessions.get(existing.sessionToken);
          if (sessionData) {
            sessionData.trackedSocketId = socket.id;
            sessions.set(existing.sessionToken, sessionData);
            socket.emit('codeRegistered', { code, expiresAt, sessionToken: existing.sessionToken });
          } else {
            socket.emit('codeRegistered', { code, expiresAt });
          }
        } else {
          socket.emit('codeRegistered', { code, expiresAt });
        }
        return;
      }
      // Remove old code entry
      expireCode(code);
    }
    
    // Ensure code is unique
    if (activeCodes.has(code)) {
      socket.emit('error', 'Code already in use. Generating new code...');
      return;
    }
    
    // Register new code
    activeCodes.add(code);
    codes.set(code, {
      trackedSocketId: socket.id,
      trackerSocketId: null,
      sessionToken: null,
      expiresAt: expiresAt,
      isConnected: false
    });
    
    // Set expiration timer (only if not connected)
    const expirationTimer = setTimeout(() => {
      expireCode(code);
    }, 5 * 60 * 1000);
    
    codeExpirationTimers.set(code, expirationTimer);
    
    socket.emit('codeRegistered', { code, expiresAt });
    console.log(`Code registered: ${code}, expires at ${new Date(expiresAt).toLocaleTimeString()}`);
  });
  
  // Handle reconnection with sessionToken
  socket.on('reconnectSession', async ({ sessionToken, role }) => {
    // Check memory first, then Redis
    let sessionData = sessions.get(sessionToken);
    
    if (!sessionData) {
      // Try loading from Redis
      sessionData = await loadSessionFromRedis(sessionToken);
      if (sessionData) {
        // Restore to memory
        sessions.set(sessionToken, sessionData);
        console.log(`Session restored from Redis: ${sessionToken}`);
      }
    }
    
    if (!sessionData) {
      socket.emit('error', 'Invalid session token');
      return;
    }
    
    // Update socket ID based on role
    if (role === 'tracked') {
      sessionData.trackedSocketId = socket.id;
      socket.emit('sessionReconnected', { sessionToken, role: 'tracked' });
    } else if (role === 'tracker') {
      // Initialize trackerSocketIds array if it doesn't exist
      if (!sessionData.trackerSocketIds) {
        sessionData.trackerSocketIds = [];
      }
      // Add this tracker if not already in the array
      if (!sessionData.trackerSocketIds.includes(socket.id)) {
        sessionData.trackerSocketIds.push(socket.id);
      }
      socket.emit('sessionReconnected', { sessionToken, role: 'tracker' });
      
      // Send any pending alerts
      if (pendingAlerts.has(sessionToken)) {
        const alert = pendingAlerts.get(sessionToken);
        socket.emit('checkInMissed', { sessionToken, timestamp: alert.timestamp });
        pendingAlerts.delete(sessionToken);
      }
      
      // Send current state
      if (sessionData.lastCheckIn) {
        socket.emit('checkInReceived', { sessionToken, timestamp: sessionData.lastCheckIn });
      }
    } else {
      socket.emit('error', 'Invalid role');
      return;
    }
    
    sessions.set(sessionToken, sessionData);
    // Save to Redis after update
    await saveSessionToRedis(sessionToken, sessionData);
    console.log(`Session reconnected: ${sessionToken}, role: ${role}`);
  });
  
  // Get status update (for tracker polling)
  socket.on('getStatus', async ({ sessionToken }) => {
    // Check memory first, then Redis
    let sessionData = sessions.get(sessionToken);
    
    if (!sessionData) {
      // Try loading from Redis
      sessionData = await loadSessionFromRedis(sessionToken);
      if (sessionData) {
        // Restore to memory
        sessions.set(sessionToken, sessionData);
      }
    }
    
    if (!sessionData) {
      socket.emit('error', 'Invalid session token');
      return;
    }
    const now = Date.now();
    
    // Calculate if alert expired
    let alertExpired = false;
    if (sessionData.lastCheckIn && sessionData.alertTimeMinutes && sessionData.settingsConfigured) {
      const alertTimeMs = sessionData.alertTimeMinutes * 60 * 1000;
      const timeSinceCheckIn = now - sessionData.lastCheckIn;
      if (timeSinceCheckIn > alertTimeMs) {
        alertExpired = true;
        // Mark as pending alert if not already
        if (!pendingAlerts.has(sessionToken)) {
          pendingAlerts.set(sessionToken, { timestamp: now });
        }
      }
    }
    
    // Send status update
    socket.emit('statusUpdate', {
      sessionToken,
      lastCheckIn: sessionData.lastCheckIn,
      alertExpired: alertExpired
    });
  });

  // Tracker connects with code
  socket.on('trackCode', async (code) => {
    if (!codes.has(code)) {
      socket.emit('error', 'Invalid or expired code');
      return;
    }
    
    const codeData = codes.get(code);
    
    // Check if code expired (only if not already connected)
    if (Date.now() > codeData.expiresAt && !codeData.isConnected) {
      socket.emit('error', 'Code has expired');
      expireCode(code);
      return;
    }
    
    // If tracker was previously connected with this socket, this is a reconnection
    // Update the tracker socket ID to the new socket ID
    const wasReconnecting = codeData.trackerSocketId && codeData.isConnected;
    
    // Mark as connected - code no longer expires
    codeData.isConnected = true;
    codeData.trackerSocketId = socket.id;
    
    // Clear expiration timer
    if (codeExpirationTimers.has(code)) {
      clearTimeout(codeExpirationTimers.get(code));
      codeExpirationTimers.delete(code);
    }
    
    // Generate session token if this is a new connection (not a reconnection)
    let sessionToken = codeData.sessionToken;
    if (!sessionToken) {
      sessionToken = generateSessionToken();
      codeData.sessionToken = sessionToken;
      
      // Create session entry
      const newSessionData = {
        trackedSocketId: codeData.trackedSocketId,
        trackerSocketIds: [socket.id], // Array to support multiple trackers
        lastCheckIn: null,
        reminderTimeMinutes: null,
        alertTimeMinutes: null,
        reminderTimeEnd: null,
        alertTimeEnd: null,
        settingsConfigured: false
      };
      sessions.set(sessionToken, newSessionData);
      // Save to Redis
      await saveSessionToRedis(sessionToken, newSessionData);
      
      console.log(`Session token generated for code: ${code} -> ${sessionToken}`);
    } else {
      // Update existing session with new socket IDs
      const sessionData = sessions.get(sessionToken);
      if (sessionData) {
        sessionData.trackedSocketId = codeData.trackedSocketId;
        // Initialize trackerSocketIds array if it doesn't exist
        if (!sessionData.trackerSocketIds) {
          sessionData.trackerSocketIds = [];
        }
        // Add this tracker if not already in the array
        if (!sessionData.trackerSocketIds.includes(socket.id)) {
          sessionData.trackerSocketIds.push(socket.id);
          console.log(`New tracker added to session ${sessionToken}, total trackers: ${sessionData.trackerSocketIds.length}`);
        }
        // Save to Redis after update
        await saveSessionToRedis(sessionToken, sessionData);
      }
    }
    
    codes.set(code, codeData);
    
    // Always emit trackingStarted with sessionToken, even on reconnection
    socket.emit('trackingStarted', { sessionToken });
    
    // Notify tracked person (always send trackerConnected with sessionToken)
    if (codeData.trackedSocketId) {
      const trackedSocket = io.sockets.sockets.get(codeData.trackedSocketId);
      if (trackedSocket) {
        // Always emit trackerConnected with sessionToken so tracked person can update their UI
        // Even on reconnection, they need to know the connection is active
        trackedSocket.emit('trackerConnected', { sessionToken });
        
        // On reconnection, also send current state to this tracker
        const sessionDataCheck = sessions.get(sessionToken);
        if (sessionDataCheck && sessionDataCheck.lastCheckIn) {
          socket.emit('checkInReceived', { sessionToken, timestamp: sessionDataCheck.lastCheckIn });
        }
      }
    }
    
    // Send any pending alerts to this tracker
    if (pendingAlerts.has(sessionToken)) {
      const alert = pendingAlerts.get(sessionToken);
      socket.emit('checkInMissed', { sessionToken, timestamp: alert.timestamp });
      // Note: Don't delete pending alerts - other trackers might also need them
    }
    
    if (wasReconnecting) {
      console.log(`Tracker reconnected for code: ${code} - connection re-established`);
    } else {
      console.log(`Tracker connected for code: ${code} - connection established`);
    }
  });

  // Tracked person checks in (on-demand mode)
  socket.on('checkIn', async (sessionToken) => {
    // Check memory first, then Redis
    let sessionData = sessions.get(sessionToken);
    
    if (!sessionData) {
      // Try loading from Redis
      sessionData = await loadSessionFromRedis(sessionToken);
      if (sessionData) {
        // Restore to memory
        sessions.set(sessionToken, sessionData);
      }
    }
    
    if (!sessionData) {
      socket.emit('error', 'Invalid session token');
      return;
    }
    // In on-demand mode, we're more lenient - just verify sessionToken matches
    // (socket.id may change with each connection)
    
    const now = Date.now();
    sessionData.lastCheckIn = now;
    
    // Clear pending alerts since check-in happened
    pendingAlerts.delete(sessionToken);
    
    // Calculate timer end times if settings are configured (client will calculate too)
    if (sessionData.settingsConfigured && sessionData.reminderTimeMinutes && sessionData.alertTimeMinutes) {
      const reminderMinutes = sessionData.reminderTimeMinutes;
      const alertMinutes = sessionData.alertTimeMinutes;
      
      sessionData.reminderTimeEnd = now + (reminderMinutes * 60 * 1000);
      sessionData.alertTimeEnd = now + (alertMinutes * 60 * 1000);
      
      // Notify client of new timer ends
      socket.emit('timersSet', { 
        reminderTimeMinutes: reminderMinutes, 
        alertTimeMinutes: alertMinutes, 
        reminderTimeEnd: sessionData.reminderTimeEnd, 
        alertTimeEnd: sessionData.alertTimeEnd 
      });
    }
    
    sessions.set(sessionToken, sessionData);
    // Save to Redis after update
    await saveSessionToRedis(sessionToken, sessionData);
    socket.emit('checkInConfirmed', { timestamp: now });
    console.log(`Check-in received for session: ${sessionToken}`);
  });

  // Tracked person sets reminder and alert times (on-demand mode - no server-side timers)
  socket.on('setTimers', async ({ sessionToken, reminderTimeMinutes, alertTimeMinutes }) => {
    // Check memory first, then Redis
    let sessionData = sessions.get(sessionToken);
    
    if (!sessionData) {
      // Try loading from Redis
      sessionData = await loadSessionFromRedis(sessionToken);
      if (sessionData) {
        // Restore to memory
        sessions.set(sessionToken, sessionData);
      }
    }
    
    if (!sessionData) {
      socket.emit('error', 'Invalid session token');
      return;
    }
    // In on-demand mode, we're more lenient - just verify sessionToken matches

    const now = Date.now();
    const lastCheckIn = sessionData.lastCheckIn || now;
    
    // Calculate timer end times (client will handle timers)
    const reminderTimeEnd = lastCheckIn + (reminderTimeMinutes * 60 * 1000);
    const alertTimeEnd = lastCheckIn + (alertTimeMinutes * 60 * 1000);

    sessionData.reminderTimeMinutes = reminderTimeMinutes;
    sessionData.alertTimeMinutes = alertTimeMinutes;
    sessionData.reminderTimeEnd = reminderTimeEnd;
    sessionData.alertTimeEnd = alertTimeEnd;
    sessionData.settingsConfigured = true;
    sessions.set(sessionToken, sessionData);
    // Save to Redis after update
    await saveSessionToRedis(sessionToken, sessionData);
    
    socket.emit('timersSet', { reminderTimeMinutes, alertTimeMinutes, reminderTimeEnd, alertTimeEnd });
    console.log(`Timers set for session: ${sessionToken}, reminder: ${reminderTimeMinutes}min, alert: ${alertTimeMinutes}min (on-demand mode)`);
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
    
    // Update connection state in sessions
    for (const [sessionToken, sessionData] of sessions.entries()) {
      if (sessionData.trackedSocketId === socket.id) {
        // Tracked person disconnected
        sessionData.trackedSocketId = null;
        // If any trackers are still connected, notify them
        if (sessionData.trackerSocketIds && sessionData.trackerSocketIds.length > 0) {
          sessionData.trackerSocketIds.forEach(trackerSocketId => {
            const trackerSocket = io.sockets.sockets.get(trackerSocketId);
            if (trackerSocket) {
              trackerSocket.emit('trackedPersonDisconnected');
            }
          });
        }
        sessions.set(sessionToken, sessionData);
        break;
      } else if (sessionData.trackerSocketIds && sessionData.trackerSocketIds.includes(socket.id)) {
        // Tracker disconnected - remove from array
        sessionData.trackerSocketIds = sessionData.trackerSocketIds.filter(id => id !== socket.id);
        
        // If tracked person is still connected and this was the last tracker, notify them
        if (sessionData.trackedSocketId && sessionData.trackerSocketIds.length === 0) {
          const trackedSocket = io.sockets.sockets.get(sessionData.trackedSocketId);
          if (trackedSocket) {
            // Only notify if this looks like a permanent disconnection
            // (not a normal reconnection scenario)
            if (reason === 'io server disconnect' || reason === 'transport close') {
              trackedSocket.emit('trackerDisconnected');
            }
          }
        }
        sessions.set(sessionToken, sessionData);
        break;
      }
    }
    
    // Also update code mappings for code expiration logic
    for (const [code, codeData] of codes.entries()) {
      if (codeData.trackedSocketId === socket.id) {
        // Tracked person disconnected
        codeData.trackedSocketId = null;
        // Check if any trackers are still connected in the session
        if (codeData.sessionToken) {
          const sessionData = sessions.get(codeData.sessionToken);
          if (sessionData && sessionData.trackerSocketIds && sessionData.trackerSocketIds.length > 0) {
            // Keep isConnected = true so code doesn't expire - there are still trackers
          } else {
            // No trackers connected - allow code to expire
            codeData.isConnected = false;
          }
        } else if (codeData.trackerSocketId) {
          // Fallback for old code mapping structure
          // Keep isConnected = true so code doesn't expire
        } else {
          // Both disconnected - allow code to expire
          codeData.isConnected = false;
        }
        codes.set(code, codeData);
        break;
      } else if (codeData.trackerSocketId === socket.id) {
        // Tracker disconnected (for code mapping - check session for all trackers)
        codeData.trackerSocketId = null;
        // Check if any trackers are still connected in the session
        if (codeData.sessionToken) {
          const sessionData = sessions.get(codeData.sessionToken);
          if (sessionData && sessionData.trackerSocketIds && sessionData.trackerSocketIds.length > 0) {
            // Still have trackers - keep connected
          } else if (!codeData.trackedSocketId) {
            codeData.isConnected = false; // No trackers and no tracked person
          }
        } else if (!codeData.trackedSocketId) {
          codeData.isConnected = false; // Both disconnected, allow code to expire
        }
        codes.set(code, codeData);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
// Listen on 0.0.0.0 to accept connections from all network interfaces (required for Heroku/Railway)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
