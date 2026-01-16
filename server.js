const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Store code mappings: code -> { trackedSocketId: string | null, trackerSocketId: string | null, sessionToken: string | null, expiresAt: timestamp, isConnected: boolean }
const codes = new Map();

// Store session mappings: sessionToken -> { trackedSocketId: string | null, trackerSocketId: string | null, lastCheckIn: timestamp, reminderTimeMinutes: number, alertTimeMinutes: number, reminderTimeEnd: timestamp, alertTimeEnd: timestamp, settingsConfigured: boolean }
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
  socket.on('reconnectSession', ({ sessionToken, role }) => {
    if (!sessions.has(sessionToken)) {
      socket.emit('error', 'Invalid session token');
      return;
    }
    
    const sessionData = sessions.get(sessionToken);
    
    // Update socket ID based on role
    if (role === 'tracked') {
      sessionData.trackedSocketId = socket.id;
      socket.emit('sessionReconnected', { sessionToken, role: 'tracked' });
    } else if (role === 'tracker') {
      sessionData.trackerSocketId = socket.id;
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
    console.log(`Session reconnected: ${sessionToken}, role: ${role}`);
  });

  // Tracker connects with code
  socket.on('trackCode', (code) => {
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
      sessions.set(sessionToken, {
        trackedSocketId: codeData.trackedSocketId,
        trackerSocketId: socket.id,
        lastCheckIn: null,
        reminderTimeMinutes: null,
        alertTimeMinutes: null,
        reminderTimeEnd: null,
        alertTimeEnd: null,
        settingsConfigured: false
      });
      
      console.log(`Session token generated for code: ${code} -> ${sessionToken}`);
    } else {
      // Update existing session with new socket IDs
      const sessionData = sessions.get(sessionToken);
      if (sessionData) {
        sessionData.trackedSocketId = codeData.trackedSocketId;
        sessionData.trackerSocketId = socket.id;
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
        
        // On reconnection, also send current state to tracker (not tracked person)
        if (wasReconnecting) {
          const sessionData = sessions.get(sessionToken);
          if (sessionData && sessionData.lastCheckIn) {
            socket.emit('checkInReceived', { sessionToken, timestamp: sessionData.lastCheckIn });
          }
        }
      }
    }
    
    // Send any pending alerts
    if (pendingAlerts.has(sessionToken)) {
      const alert = pendingAlerts.get(sessionToken);
      socket.emit('checkInMissed', { sessionToken, timestamp: alert.timestamp });
      pendingAlerts.delete(sessionToken);
    }
    
    if (wasReconnecting) {
      console.log(`Tracker reconnected for code: ${code} - connection re-established`);
    } else {
      console.log(`Tracker connected for code: ${code} - connection established`);
    }
  });

  // Tracked person checks in
  socket.on('checkIn', (sessionToken) => {
    if (!sessions.has(sessionToken)) {
      socket.emit('error', 'Invalid session token');
      return;
    }

    const sessionData = sessions.get(sessionToken);
    if (sessionData.trackedSocketId !== socket.id) {
      socket.emit('error', 'Not authorized');
      return;
    }

    const now = Date.now();
    sessionData.lastCheckIn = now;
    
    // Clear any existing timers
    if (reminderTimers.has(sessionToken)) {
      clearTimeout(reminderTimers.get(sessionToken));
      reminderTimers.delete(sessionToken);
    }
    if (alertTimers.has(sessionToken)) {
      clearTimeout(alertTimers.get(sessionToken));
      alertTimers.delete(sessionToken);
    }
    
    // Restart timers if settings are configured
    if (sessionData.settingsConfigured && sessionData.reminderTimeMinutes && sessionData.alertTimeMinutes) {
      const reminderMinutes = sessionData.reminderTimeMinutes;
      const alertMinutes = sessionData.alertTimeMinutes;
      
      // Restart reminder timer
      const newReminderTimeEnd = now + (reminderMinutes * 60 * 1000);
      const reminderTimer = setTimeout(() => {
        const currentSessionData = sessions.get(sessionToken);
        if (currentSessionData && currentSessionData.trackedSocketId) {
          const trackedSocket = io.sockets.sockets.get(currentSessionData.trackedSocketId);
          if (trackedSocket) {
            trackedSocket.emit('reminderTimeReached', { sessionToken, timestamp: Date.now() });
          }
        }
        reminderTimers.delete(sessionToken);
      }, reminderMinutes * 60 * 1000);
      reminderTimers.set(sessionToken, reminderTimer);
      
      // Restart alert timer
      const newAlertTimeEnd = now + (alertMinutes * 60 * 1000);
      const alertTimer = setTimeout(() => {
        const currentSessionData = sessions.get(sessionToken);
        if (currentSessionData && currentSessionData.trackerSocketId) {
          const trackerSocket = io.sockets.sockets.get(currentSessionData.trackerSocketId);
          if (trackerSocket) {
            trackerSocket.emit('checkInMissed', { sessionToken, timestamp: Date.now() });
          }
        } else {
          pendingAlerts.set(sessionToken, { timestamp: Date.now() });
        }
        alertTimers.delete(sessionToken);
      }, alertMinutes * 60 * 1000);
      alertTimers.set(sessionToken, alertTimer);
      
      sessionData.reminderTimeEnd = newReminderTimeEnd;
      sessionData.alertTimeEnd = newAlertTimeEnd;
      
      // Notify client of new timer ends
      if (sessionData.trackedSocketId) {
        const trackedSocket = io.sockets.sockets.get(sessionData.trackedSocketId);
        if (trackedSocket) {
          trackedSocket.emit('timersSet', { 
            reminderTimeMinutes: reminderMinutes, 
            alertTimeMinutes: alertMinutes, 
            reminderTimeEnd: newReminderTimeEnd, 
            alertTimeEnd: newAlertTimeEnd 
          });
        }
      }
    } else {
      // Reset timer end times if not configured
      sessionData.reminderTimeEnd = null;
      sessionData.alertTimeEnd = null;
    }
    
    // Notify tracker if connected
    if (sessionData.trackerSocketId) {
      const trackerSocket = io.sockets.sockets.get(sessionData.trackerSocketId);
      if (trackerSocket) {
        trackerSocket.emit('checkInReceived', { sessionToken, timestamp: now });
      }
    }
    
    sessions.set(sessionToken, sessionData);
    socket.emit('checkInConfirmed', { timestamp: now });
    console.log(`Check-in received for session: ${sessionToken}`);
  });

  // Tracked person sets reminder and alert times
  socket.on('setTimers', ({ sessionToken, reminderTimeMinutes, alertTimeMinutes }) => {
    if (!sessions.has(sessionToken)) {
      socket.emit('error', 'Invalid session token');
      return;
    }

    const sessionData = sessions.get(sessionToken);
    if (sessionData.trackedSocketId !== socket.id) {
      socket.emit('error', 'Not authorized');
      return;
    }

    // Clear existing timers
    if (reminderTimers.has(sessionToken)) {
      clearTimeout(reminderTimers.get(sessionToken));
      reminderTimers.delete(sessionToken);
    }
    if (alertTimers.has(sessionToken)) {
      clearTimeout(alertTimers.get(sessionToken));
      alertTimers.delete(sessionToken);
    }

    const now = Date.now();
    const lastCheckIn = sessionData.lastCheckIn || now;
    
    // Set reminder timer (for tracked person)
    const reminderTimeEnd = lastCheckIn + (reminderTimeMinutes * 60 * 1000);
    const reminderTimer = setTimeout(() => {
      const currentSessionData = sessions.get(sessionToken);
      if (currentSessionData && currentSessionData.trackedSocketId) {
        const trackedSocket = io.sockets.sockets.get(currentSessionData.trackedSocketId);
        if (trackedSocket) {
          trackedSocket.emit('reminderTimeReached', { sessionToken, timestamp: Date.now() });
        }
      }
      reminderTimers.delete(sessionToken);
      console.log(`Reminder timer expired for session: ${sessionToken}`);
    }, reminderTimeEnd - now);
    
    reminderTimers.set(sessionToken, reminderTimer);

    // Set alert timer (for tracker)
    const alertTimeEnd = lastCheckIn + (alertTimeMinutes * 60 * 1000);
    const alertTimer = setTimeout(() => {
      const currentSessionData = sessions.get(sessionToken);
      if (currentSessionData && currentSessionData.trackerSocketId) {
        const trackerSocket = io.sockets.sockets.get(currentSessionData.trackerSocketId);
        if (trackerSocket) {
          trackerSocket.emit('checkInMissed', { sessionToken, timestamp: Date.now() });
        }
      } else {
        // Store alert for when tracker connects
        pendingAlerts.set(sessionToken, { timestamp: Date.now() });
      }
      alertTimers.delete(sessionToken);
      console.log(`Alert timer expired for session: ${sessionToken}`);
    }, alertTimeEnd - now);
    
    alertTimers.set(sessionToken, alertTimer);

    sessionData.reminderTimeMinutes = reminderTimeMinutes;
    sessionData.alertTimeMinutes = alertTimeMinutes;
    sessionData.reminderTimeEnd = reminderTimeEnd;
    sessionData.alertTimeEnd = alertTimeEnd;
    sessionData.settingsConfigured = true;
    sessions.set(sessionToken, sessionData);
    
    socket.emit('timersSet', { reminderTimeMinutes, alertTimeMinutes, reminderTimeEnd, alertTimeEnd });
    console.log(`Timers set for session: ${sessionToken}, reminder: ${reminderTimeMinutes}min, alert: ${alertTimeMinutes}min`);
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, 'Reason:', reason);
    
    // Update connection state in sessions
    for (const [sessionToken, sessionData] of sessions.entries()) {
      if (sessionData.trackedSocketId === socket.id) {
        // Tracked person disconnected
        sessionData.trackedSocketId = null;
        // If tracker is still connected, notify them
        if (sessionData.trackerSocketId) {
          const trackerSocket = io.sockets.sockets.get(sessionData.trackerSocketId);
          if (trackerSocket) {
            trackerSocket.emit('trackedPersonDisconnected');
          }
        }
        sessions.set(sessionToken, sessionData);
        break;
      } else if (sessionData.trackerSocketId === socket.id) {
        // Tracker disconnected
        sessionData.trackerSocketId = null;
        // If tracked person is still connected, notify them
        if (sessionData.trackedSocketId) {
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
        // If tracker is still connected, keep code active
        if (codeData.trackerSocketId) {
          // Keep isConnected = true so code doesn't expire
        } else {
          // Both disconnected - allow code to expire
          codeData.isConnected = false;
        }
        codes.set(code, codeData);
        break;
      } else if (codeData.trackerSocketId === socket.id) {
        // Tracker disconnected
        codeData.trackerSocketId = null;
        // Only mark as disconnected if both are disconnected
        if (!codeData.trackedSocketId) {
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
