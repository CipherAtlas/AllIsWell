const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

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

// Store code mappings: code -> { trackedSocketId: string | null, trackerSocketId: string | null, lastCheckIn: timestamp, reminderTimeMinutes: number, alertTimeMinutes: number, reminderTimeEnd: timestamp, alertTimeEnd: timestamp, expiresAt: timestamp, isConnected: boolean, settingsConfigured: boolean }
const codes = new Map();

// Store pending alerts: code -> { timestamp, message }
const pendingAlerts = new Map();

// Store reminder timers by code: code -> timer instance (for tracked person)
const reminderTimers = new Map();

// Store alert timers by code: code -> timer instance (for tracker)
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
        socket.emit('codeRegistered', { code, expiresAt });
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
      lastCheckIn: null,
      reminderTimeMinutes: null,
      alertTimeMinutes: null,
      reminderTimeEnd: null,
      alertTimeEnd: null,
      expiresAt: expiresAt,
      isConnected: false,
      settingsConfigured: false
    });
    
    // Set expiration timer (only if not connected)
    const expirationTimer = setTimeout(() => {
      expireCode(code);
    }, 5 * 60 * 1000);
    
    codeExpirationTimers.set(code, expirationTimer);
    
    socket.emit('codeRegistered', { code, expiresAt });
    console.log(`Code registered: ${code}, expires at ${new Date(expiresAt).toLocaleTimeString()}`);
  });

  // Tracker connects with code
  socket.on('trackCode', (code) => {
    if (!codes.has(code)) {
      socket.emit('error', 'Invalid or expired code');
      return;
    }
    
    const codeData = codes.get(code);
    
    // Check if code expired
    if (Date.now() > codeData.expiresAt && !codeData.isConnected) {
      socket.emit('error', 'Code has expired');
      expireCode(code);
      return;
    }
    
    // Mark as connected - code no longer expires
    codeData.isConnected = true;
    codeData.trackerSocketId = socket.id;
    
    // Clear expiration timer
    if (codeExpirationTimers.has(code)) {
      clearTimeout(codeExpirationTimers.get(code));
      codeExpirationTimers.delete(code);
    }
    
    codes.set(code, codeData);
    socket.emit('trackingStarted', { code });
    
    // Notify tracked person
    if (codeData.trackedSocketId) {
      const trackedSocket = io.sockets.sockets.get(codeData.trackedSocketId);
      if (trackedSocket) {
        trackedSocket.emit('trackerConnected');
      }
    }
    
    // Send any pending alerts
    if (pendingAlerts.has(code)) {
      const alert = pendingAlerts.get(code);
      socket.emit('checkInMissed', { code, timestamp: alert.timestamp });
      pendingAlerts.delete(code);
    }
    
    console.log(`Tracker connected for code: ${code} - connection established`);
  });

  // Tracked person checks in
  socket.on('checkIn', (code) => {
    if (!codes.has(code)) {
      socket.emit('error', 'Invalid code');
      return;
    }

    const codeData = codes.get(code);
    if (codeData.trackedSocketId !== socket.id) {
      socket.emit('error', 'Not authorized');
      return;
    }

    const now = Date.now();
    codeData.lastCheckIn = now;
    
    // Clear any existing timers
    if (reminderTimers.has(code)) {
      clearTimeout(reminderTimers.get(code));
      reminderTimers.delete(code);
    }
    if (alertTimers.has(code)) {
      clearTimeout(alertTimers.get(code));
      alertTimers.delete(code);
    }
    
    // Restart timers if settings are configured
    if (codeData.settingsConfigured && codeData.reminderTimeMinutes && codeData.alertTimeMinutes) {
      const reminderMinutes = codeData.reminderTimeMinutes;
      const alertMinutes = codeData.alertTimeMinutes;
      
      // Restart reminder timer
      const newReminderTimeEnd = now + (reminderMinutes * 60 * 1000);
      const reminderTimer = setTimeout(() => {
        const currentCodeData = codes.get(code);
        if (currentCodeData && currentCodeData.trackedSocketId) {
          const trackedSocket = io.sockets.sockets.get(currentCodeData.trackedSocketId);
          if (trackedSocket) {
            trackedSocket.emit('reminderTimeReached', { code, timestamp: Date.now() });
          }
        }
        reminderTimers.delete(code);
      }, reminderMinutes * 60 * 1000);
      reminderTimers.set(code, reminderTimer);
      
      // Restart alert timer
      const newAlertTimeEnd = now + (alertMinutes * 60 * 1000);
      const alertTimer = setTimeout(() => {
        const currentCodeData = codes.get(code);
        if (currentCodeData && currentCodeData.trackerSocketId) {
          const trackerSocket = io.sockets.sockets.get(currentCodeData.trackerSocketId);
          if (trackerSocket) {
            trackerSocket.emit('checkInMissed', { code, timestamp: Date.now() });
          }
        } else {
          pendingAlerts.set(code, { timestamp: Date.now() });
        }
        alertTimers.delete(code);
      }, alertMinutes * 60 * 1000);
      alertTimers.set(code, alertTimer);
      
      codeData.reminderTimeEnd = newReminderTimeEnd;
      codeData.alertTimeEnd = newAlertTimeEnd;
      
      // Notify client of new timer ends
      if (codeData.trackedSocketId) {
        const trackedSocket = io.sockets.sockets.get(codeData.trackedSocketId);
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
      codeData.reminderTimeEnd = null;
      codeData.alertTimeEnd = null;
    }
    
    // Notify tracker if connected
    if (codeData.trackerSocketId) {
      const trackerSocket = io.sockets.sockets.get(codeData.trackerSocketId);
      if (trackerSocket) {
        trackerSocket.emit('checkInReceived', { code, timestamp: now });
      }
    }
    
    codes.set(code, codeData);
    socket.emit('checkInConfirmed', { timestamp: now });
    console.log(`Check-in received for code: ${code}`);
  });

  // Tracked person sets reminder and alert times
  socket.on('setTimers', ({ code, reminderTimeMinutes, alertTimeMinutes }) => {
    if (!codes.has(code)) {
      socket.emit('error', 'Invalid code');
      return;
    }

    const codeData = codes.get(code);
    if (codeData.trackedSocketId !== socket.id) {
      socket.emit('error', 'Not authorized');
      return;
    }

    // Clear existing timers
    if (reminderTimers.has(code)) {
      clearTimeout(reminderTimers.get(code));
      reminderTimers.delete(code);
    }
    if (alertTimers.has(code)) {
      clearTimeout(alertTimers.get(code));
      alertTimers.delete(code);
    }

    const now = Date.now();
    const lastCheckIn = codeData.lastCheckIn || now;
    
    // Set reminder timer (for tracked person)
    const reminderTimeEnd = lastCheckIn + (reminderTimeMinutes * 60 * 1000);
    const reminderTimer = setTimeout(() => {
      const currentCodeData = codes.get(code);
      if (currentCodeData && currentCodeData.trackedSocketId) {
        const trackedSocket = io.sockets.sockets.get(currentCodeData.trackedSocketId);
        if (trackedSocket) {
          trackedSocket.emit('reminderTimeReached', { code, timestamp: Date.now() });
        }
      }
      reminderTimers.delete(code);
      console.log(`Reminder timer expired for code: ${code}`);
    }, reminderTimeEnd - now);
    
    reminderTimers.set(code, reminderTimer);

    // Set alert timer (for tracker)
    const alertTimeEnd = lastCheckIn + (alertTimeMinutes * 60 * 1000);
    const alertTimer = setTimeout(() => {
      const currentCodeData = codes.get(code);
      if (currentCodeData && currentCodeData.trackerSocketId) {
        const trackerSocket = io.sockets.sockets.get(currentCodeData.trackerSocketId);
        if (trackerSocket) {
          trackerSocket.emit('checkInMissed', { code, timestamp: Date.now() });
        }
      } else {
        // Store alert for when tracker connects
        pendingAlerts.set(code, { timestamp: Date.now() });
      }
      alertTimers.delete(code);
      console.log(`Alert timer expired for code: ${code}`);
    }, alertTimeEnd - now);
    
    alertTimers.set(code, alertTimer);

    codeData.reminderTimeMinutes = reminderTimeMinutes;
    codeData.alertTimeMinutes = alertTimeMinutes;
    codeData.reminderTimeEnd = reminderTimeEnd;
    codeData.alertTimeEnd = alertTimeEnd;
    codeData.settingsConfigured = true;
    codes.set(code, codeData);
    
    socket.emit('timersSet', { reminderTimeMinutes, alertTimeMinutes, reminderTimeEnd, alertTimeEnd });
    console.log(`Timers set for code: ${code}, reminder: ${reminderTimeMinutes}min, alert: ${alertTimeMinutes}min`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Update connection state
    for (const [code, codeData] of codes.entries()) {
      if (codeData.trackedSocketId === socket.id) {
        // Tracked person disconnected
        codeData.trackedSocketId = null;
        // If tracker is still connected, notify them
        if (codeData.trackerSocketId) {
          const trackerSocket = io.sockets.sockets.get(codeData.trackerSocketId);
          if (trackerSocket) {
            trackerSocket.emit('trackedPersonDisconnected');
          }
          // Don't mark as disconnected yet - tracker might reconnect
        }
        codes.set(code, codeData);
        break;
      } else if (codeData.trackerSocketId === socket.id) {
        // Tracker disconnected
        codeData.trackerSocketId = null;
        codeData.isConnected = false; // Allow code to expire again if tracked person is also disconnected
        // If tracked person is still connected, notify them
        if (codeData.trackedSocketId) {
          const trackedSocket = io.sockets.sockets.get(codeData.trackedSocketId);
          if (trackedSocket) {
            trackedSocket.emit('trackerDisconnected');
          }
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
