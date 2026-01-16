// Persistent socket connections after pairing
let socket = null;
let currentRole = null;
let connectionCode = null;
let sessionToken = null; // Secure session token after pairing
let timerInterval = null;
let codeExpirationInterval = null;
let codeExpirationDisplayInterval = null;
let keepAliveInterval = null; // Keep-alive interval
let reminderTimeMinutes = 30; // Default 30 minutes
let alertTimeMinutes = 60; // Default 60 minutes
let reminderTimeEnd = null;
let alertTimeEnd = null;
let codeExpiresAt = null;
let isConnected = false;
let settingsConfigured = false;

// DOM elements
const roleSelection = document.getElementById('roleSelection');
const trackedCodeScreen = document.getElementById('trackedCodeScreen');
const trackedInterface = document.getElementById('trackedInterface');
const trackedSettings = document.getElementById('trackedSettings');
const trackerCodeScreen = document.getElementById('trackerCodeScreen');
const trackerInterface = document.getElementById('trackerInterface');

// Buttons
const btnTracked = document.getElementById('btnTracked');
const btnTracker = document.getElementById('btnTracker');
const btnGenerateCode = document.getElementById('btnGenerateCode');
const btnConnectTracker = document.getElementById('btnConnectTracker');
const checkInBtn = document.getElementById('checkInBtn');
const settingsBtn = document.getElementById('settingsBtn');
const closePopupBtn = document.getElementById('closePopupBtn');

// Navigation buttons
const backFromTrackedCode = document.getElementById('backFromTrackedCode');
const backFromTracked = document.getElementById('backFromTracked');
const backFromSettings = document.getElementById('backFromSettings');
const backFromTrackerCode = document.getElementById('backFromTrackerCode');
const backFromTracker = document.getElementById('backFromTracker');

// Form elements
const connectionCodeDisplay = document.getElementById('connectionCode');
const codeExpirationDisplay = document.getElementById('codeExpiration');
const trackerCodeInput = document.getElementById('trackerCodeInput');
const reminderTimeMinutesInput = document.getElementById('reminderTimeMinutes');
const alertTimeMinutesInput = document.getElementById('alertTimeMinutes');
const settingsForm = document.getElementById('settingsForm');

// Display elements
const timer = document.getElementById('timer');
const connectionStatus = document.getElementById('connectionStatus');
const lastCheckInTime = document.getElementById('lastCheckInTime');
const trackerConnectionStatus = document.getElementById('trackerConnectionStatus');
const trackerLastCheckIn = document.getElementById('trackerLastCheckIn');
const alertCard = document.getElementById('alertCard');
const checkinPopup = document.getElementById('checkinPopup');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Load saved state
    loadSavedState();
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
        // Will request on user interaction
    }

    // Event listeners
    btnTracked.addEventListener('click', () => selectRole('tracked'));
    btnTracker.addEventListener('click', () => selectRole('tracker'));
    btnGenerateCode.addEventListener('click', generateCode);
    btnConnectTracker.addEventListener('click', connectAsTracker);
    checkInBtn.addEventListener('click', handleCheckIn);
    settingsBtn.addEventListener('click', showSettings);
    closePopupBtn.addEventListener('click', hideCheckinPopup);
    settingsForm.addEventListener('submit', handleSettingsSubmit);

    // Navigation
    backFromTrackedCode.addEventListener('click', () => showScreen('roleSelection'));
    backFromTracked.addEventListener('click', () => {
        if (currentRole === 'tracked') {
            showScreen('trackedCodeScreen');
        }
    });
    backFromSettings.addEventListener('click', () => {
        if (currentRole === 'tracked') {
            showScreen('trackedInterface');
        }
    });
    backFromTrackerCode.addEventListener('click', () => showScreen('roleSelection'));
    backFromTracker.addEventListener('click', () => {
        if (currentRole === 'tracker') {
            showScreen('trackerCodeScreen');
        }
    });

    // Allow Enter key in code input
    trackerCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            connectAsTracker();
        }
    });
});

function connectSocket() {
    // If socket exists and is connected, we can reuse it
    // But we need to ensure event listeners are set up
    if (socket && socket.connected) {
        // Re-establish connection state if needed
        if (sessionToken) {
            // If we have a sessionToken, use it to reconnect
            socket.emit('reconnectSession', { sessionToken, role: currentRole });
        } else if (currentRole === 'tracked' && connectionCode) {
            socket.emit('registerCode', connectionCode);
        } else if (currentRole === 'tracker' && connectionCode) {
            socket.emit('trackCode', connectionCode);
        }
        return;
    }
    
    // Use server URL from config.js
    const serverUrl = window.SERVER_URL || 'http://localhost:3000';
    // Enable auto-reconnect with aggressive settings for persistent connection
    socket = io(serverUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        timeout: 20000,
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log('Connected to server, socket ID:', socket.id);
        // Always re-establish connection state when socket connects (including reconnects)
        if (sessionToken) {
            // If we have a sessionToken, use it to reconnect
            socket.emit('reconnectSession', { sessionToken, role: currentRole });
        } else if (currentRole === 'tracked' && connectionCode) {
            // Re-register code after connection/reconnection
            socket.emit('registerCode', connectionCode);
        } else if (currentRole === 'tracker' && connectionCode) {
            // Always re-establish tracker connection on reconnect
            socket.emit('trackCode', connectionCode);
        }
    });

    socket.on('reconnect', (attemptNumber) => {
        console.log('Reconnected after', attemptNumber, 'attempts');
        // Re-establish connection state after reconnection
        if (sessionToken) {
            // If we have a sessionToken, use it to reconnect
            socket.emit('reconnectSession', { sessionToken, role: currentRole });
        } else if (currentRole === 'tracked' && connectionCode) {
            socket.emit('registerCode', connectionCode);
        } else if (currentRole === 'tracker' && connectionCode) {
            socket.emit('trackCode', connectionCode);
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('Disconnected from server:', reason);
        if (isConnected) {
            showStatus('Connection lost. Reconnecting...', 'error');
            // Update UI but keep trying to reconnect
            if (currentRole === 'tracker') {
                trackerConnectionStatus.textContent = 'Reconnecting...';
                trackerConnectionStatus.style.color = '#ffc107';
            }
        }
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('Reconnection attempt', attemptNumber);
        if (currentRole === 'tracker') {
            trackerConnectionStatus.textContent = `Reconnecting... (${attemptNumber})`;
            trackerConnectionStatus.style.color = '#ffc107';
        }
    });

    socket.on('codeRegistered', (data) => {
        codeExpiresAt = data.expiresAt;
        // If we have a sessionToken from reconnection, store it
        if (data.sessionToken) {
            sessionToken = data.sessionToken;
            saveState();
        }
        // Start code expiration display and refresh timer if not connected
        if (!isConnected) {
            startCodeExpirationDisplay();
            startCodeRefreshTimer();
        } else {
            stopCodeExpirationDisplay();
        }
    });
    
    socket.on('sessionReconnected', (data) => {
        sessionToken = data.sessionToken;
        saveState();
        console.log('Session reconnected:', sessionToken);
    });

    socket.on('trackerConnected', (data) => {
        isConnected = true;
        // Safely extract sessionToken from data
        if (data && data.sessionToken) {
            sessionToken = data.sessionToken;
            saveState(); // Save connection state
        } else {
            console.warn('trackerConnected event received without sessionToken');
            // Try to get sessionToken from sessionReconnected if available
            if (!sessionToken) {
                console.warn('No sessionToken available, connection may not persist properly');
            }
        }
        connectionStatus.textContent = 'Tracker connected';
        connectionStatus.style.color = '#28a745';
        // Stop code refresh and expiration display - connection is established
        stopCodeRefreshTimer();
        stopCodeExpirationDisplay();
        if (codeExpirationDisplay) {
            codeExpirationDisplay.textContent = 'Connected - code no longer expires';
            codeExpirationDisplay.style.color = '#28a745';
        }
        
        // Start keep-alive mechanism
        startKeepAlive();
        
        // Show settings screen if not configured
        if (!settingsConfigured) {
            showStatus('Tracker connected! Please configure your alert times.', 'success');
            setTimeout(() => {
                showScreen('trackedSettings');
            }, 1500);
        } else {
            showStatus('Tracker connected!', 'success');
        }
        console.log('Tracker connected - connection established, sessionToken:', sessionToken);
    });

    socket.on('trackerDisconnected', () => {
        isConnected = false;
        saveState(); // Save disconnected state
        stopKeepAlive(); // Stop keep-alive when disconnected
        connectionStatus.textContent = 'Tracker disconnected';
        connectionStatus.style.color = '#dc3545';
        showStatus('Tracker disconnected', 'error');
        // Resume code refresh and expiration display
        if (currentRole === 'tracked' && connectionCode) {
            if (codeExpirationDisplay) {
                codeExpirationDisplay.textContent = '';
                codeExpirationDisplay.style.color = '';
            }
            generateCode();
        }
    });

    socket.on('trackingStarted', (data) => {
        isConnected = true;
        // Safely extract sessionToken from data
        if (data && data.sessionToken) {
            sessionToken = data.sessionToken;
            saveState(); // Save connection state
        } else {
            console.error('trackingStarted event received without sessionToken');
            showStatus('Connection error: Missing session token', 'error');
            return;
        }
        showScreen('trackerInterface');
        showStatus('Connected successfully!', 'success');
        trackerConnectionStatus.textContent = 'Connected';
        trackerConnectionStatus.style.color = '#28a745';
        console.log('Tracker connection established, sessionToken:', sessionToken);
        // Start keep-alive mechanism
        startKeepAlive();
    });

    socket.on('checkInConfirmed', (data) => {
        showCheckinPopup();
        updateLastCheckInTime();
        // Restart timers if settings are configured
        if (currentRole === 'tracked' && settingsConfigured) {
            startTimers();
        }
    });

    socket.on('reminderTimeReached', (data) => {
        showNotification('Reminder: Time to Check In!', 'You should check in to let your tracker know you\'re OK.');
        // Restart timers after reminder
        if (settingsConfigured) {
            startTimers();
        }
    });

    socket.on('checkInReceived', (data) => {
        trackerLastCheckIn.textContent = new Date(data.timestamp).toLocaleString();
        alertCard.style.display = 'none';
        showNotification('Check-in received!', 'Your tracked person checked in.');
    });

    socket.on('checkInMissed', (data) => {
        alertCard.style.display = 'block';
        showNotification('Alert: Check-in Missed!', 'The person you\'re tracking has not checked in. Please check on them.');
    });

    socket.on('timersSet', (data) => {
        reminderTimeEnd = data.reminderTimeEnd;
        alertTimeEnd = data.alertTimeEnd;
        settingsConfigured = true;
        saveState();
        startLocalTimers();
        showStatus('Settings saved! Timers started.', 'success');
    });

    socket.on('trackedPersonDisconnected', () => {
        trackerConnectionStatus.textContent = 'Tracked person disconnected';
        trackerConnectionStatus.style.color = '#dc3545';
        showStatus('Tracked person disconnected', 'error');
        isConnected = false;
        saveState(); // Save disconnected state
        stopKeepAlive(); // Stop keep-alive when disconnected
    });

    socket.on('error', (message) => {
        showStatus(message, 'error');
        // If code generation error, try generating new code
        if (message.includes('Code already in use') && currentRole === 'tracked') {
            setTimeout(() => generateCode(), 1000);
        }
    });
}

function startCodeExpirationDisplay() {
    stopCodeExpirationDisplay();
    
    if (!codeExpirationDisplay || !codeExpiresAt) return;
    
    const updateExpiration = () => {
        if (!codeExpiresAt || isConnected) return;
        
        const now = Date.now();
        const remaining = codeExpiresAt - now;
        
        if (remaining <= 0) {
            codeExpirationDisplay.textContent = 'Code expired - generating new code...';
            codeExpirationDisplay.style.color = '#dc3545';
            generateCode();
            return;
        }
        
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        codeExpirationDisplay.textContent = `Code expires in ${minutes}:${String(seconds).padStart(2, '0')}`;
        codeExpirationDisplay.style.color = minutes < 1 ? '#dc3545' : '#6c757d';
    };
    
    updateExpiration();
    codeExpirationDisplayInterval = setInterval(updateExpiration, 1000);
}

function stopCodeExpirationDisplay() {
    if (codeExpirationDisplayInterval) {
        clearInterval(codeExpirationDisplayInterval);
        codeExpirationDisplayInterval = null;
    }
}

function startCodeRefreshTimer() {
    stopCodeRefreshTimer();
    
    codeExpirationInterval = setInterval(() => {
        if (!isConnected && connectionCode && currentRole === 'tracked') {
            // Regenerate code every 5 minutes if not connected
            generateCode();
        }
    }, 5 * 60 * 1000); // 5 minutes
}

function stopCodeRefreshTimer() {
    if (codeExpirationInterval) {
        clearInterval(codeExpirationInterval);
        codeExpirationInterval = null;
    }
}

function startKeepAlive() {
    stopKeepAlive(); // Clear any existing keep-alive
    
    // Send periodic ping to keep connection alive and verify it's still working
    // Socket.IO has built-in ping/pong, but this adds application-level verification
    keepAliveInterval = setInterval(() => {
        if (socket && socket.connected && connectionCode) {
            // Send a lightweight ping to server
            // We can use a custom event or just check if socket is still connected
            if (currentRole === 'tracked') {
                // Just verify socket is still connected - no need to re-register unless disconnected
                if (!socket.connected) {
                    console.warn('Socket disconnected, attempting to reconnect...');
                    connectSocket();
                }
            } else if (currentRole === 'tracker') {
                // For tracker, ensure we're still tracking the code
                if (!socket.connected) {
                    console.warn('Tracker socket disconnected, attempting to reconnect...');
                    connectSocket();
                }
            }
        }
    }, 30000); // Check every 30 seconds
}

function stopKeepAlive() {
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
    }
}

function loadSavedState() {
    const savedRole = localStorage.getItem('allIsWell_role');
    const savedCode = localStorage.getItem('allIsWell_code');
    const savedSessionToken = localStorage.getItem('allIsWell_sessionToken');
    const savedReminderTime = localStorage.getItem('allIsWell_reminderTime');
    const savedAlertTime = localStorage.getItem('allIsWell_alertTime');
    const savedReminderTimeEnd = localStorage.getItem('allIsWell_reminderTimeEnd');
    const savedAlertTimeEnd = localStorage.getItem('allIsWell_alertTimeEnd');
    const savedConnected = localStorage.getItem('allIsWell_connected');
    const savedSettingsConfigured = localStorage.getItem('allIsWell_settingsConfigured');
    
    if (savedRole) {
        currentRole = savedRole;
    }
    if (savedCode) {
        connectionCode = savedCode;
    }
    if (savedSessionToken) {
        sessionToken = savedSessionToken;
    }
    if (savedReminderTime) {
        reminderTimeMinutes = parseInt(savedReminderTime);
        if (reminderTimeMinutesInput) {
            reminderTimeMinutesInput.value = reminderTimeMinutes;
        }
    }
    if (savedAlertTime) {
        alertTimeMinutes = parseInt(savedAlertTime);
        if (alertTimeMinutesInput) {
            alertTimeMinutesInput.value = alertTimeMinutes;
        }
    }
    if (savedReminderTimeEnd) {
        reminderTimeEnd = parseInt(savedReminderTimeEnd);
    }
    if (savedAlertTimeEnd) {
        alertTimeEnd = parseInt(savedAlertTimeEnd);
    }
    if (savedConnected === 'true') {
        isConnected = true;
    }
    if (savedSettingsConfigured === 'true') {
        settingsConfigured = true;
        if (currentRole === 'tracked') {
            showScreen('trackedInterface');
            if (reminderTimeEnd || alertTimeEnd) {
                startLocalTimers();
            }
        } else if (currentRole === 'tracker') {
            // If tracker was connected, show tracker interface and reconnect
            showScreen('trackerInterface');
            trackerConnectionStatus.textContent = 'Reconnecting...';
            trackerConnectionStatus.style.color = '#ffc107';
        }
    }
    
    // If we have a role and code, attempt to reconnect automatically
    if (currentRole && connectionCode) {
        // Delay slightly to ensure DOM is ready
        setTimeout(() => {
            connectSocket();
            // If we have a sessionToken, try to reconnect with it
            if (sessionToken) {
                setTimeout(() => {
                    if (socket && socket.connected) {
                        socket.emit('reconnectSession', { sessionToken, role: currentRole });
                    }
                }, 1000);
            }
        }, 500);
    }
}

function saveState() {
    if (currentRole) {
        localStorage.setItem('allIsWell_role', currentRole);
    }
    if (connectionCode) {
        localStorage.setItem('allIsWell_code', connectionCode);
    }
    if (sessionToken) {
        localStorage.setItem('allIsWell_sessionToken', sessionToken);
    }
    if (reminderTimeMinutes) {
        localStorage.setItem('allIsWell_reminderTime', reminderTimeMinutes.toString());
    }
    if (alertTimeMinutes) {
        localStorage.setItem('allIsWell_alertTime', alertTimeMinutes.toString());
    }
    if (reminderTimeEnd) {
        localStorage.setItem('allIsWell_reminderTimeEnd', reminderTimeEnd.toString());
    }
    if (alertTimeEnd) {
        localStorage.setItem('allIsWell_alertTimeEnd', alertTimeEnd.toString());
    }
    localStorage.setItem('allIsWell_connected', isConnected.toString());
    localStorage.setItem('allIsWell_settingsConfigured', settingsConfigured.toString());
}

function selectRole(role) {
    currentRole = role;
    isConnected = false;
    saveState();
    
    // Connect socket
    connectSocket();
    
    if (role === 'tracked') {
        showScreen('trackedCodeScreen');
        if (!connectionCode) {
            generateCode();
        } else {
            connectionCodeDisplay.textContent = connectionCode;
            // Register code on server
            if (socket && socket.connected) {
                socket.emit('registerCode', connectionCode);
            }
        }
    } else if (role === 'tracker') {
        showScreen('trackerCodeScreen');
        trackerCodeInput.value = '';
        trackerCodeInput.focus();
    }
}

function generateCode() {
    // Generate a 6-digit code
    connectionCode = Math.floor(100000 + Math.random() * 900000).toString();
    connectionCodeDisplay.textContent = connectionCode;
    saveState();
    
    // Register code on server
    if (socket && socket.connected) {
        socket.emit('registerCode', connectionCode);
    } else {
        connectSocket();
    }
}

function connectAsTracker() {
    const code = trackerCodeInput.value.trim();
    if (!code || code.length !== 6) {
        showStatus('Please enter a valid 6-digit code', 'error');
        return;
    }
    
    connectionCode = code;
    saveState();
    
    // Connect socket if not connected
    connectSocket();
    
    // Ensure we have a socket before emitting
    const emitTrackCode = () => {
        if (socket && socket.connected) {
            console.log('Emitting trackCode for:', code);
            socket.emit('trackCode', code);
        } else {
            // Wait for connection, then emit
            if (socket) {
                socket.once('connect', () => {
                    console.log('Socket connected, emitting trackCode for:', code);
                    socket.emit('trackCode', code);
                });
            }
        }
    };
    
    // If already connected, emit immediately
    if (socket && socket.connected) {
        emitTrackCode();
    } else if (socket) {
        // Wait for connection
        socket.once('connect', emitTrackCode);
    } else {
        // Socket not created yet, connectSocket will create it
        setTimeout(() => {
            if (socket) {
                socket.once('connect', emitTrackCode);
            } else {
                showStatus('Failed to connect to server', 'error');
            }
        }, 100);
    }
}

function handleCheckIn() {
    if (!sessionToken || !socket || !socket.connected) {
        showStatus('Not connected. Please check your connection.', 'error');
        return;
    }

    checkInBtn.disabled = true;
    checkInBtn.querySelector('.btn-text').textContent = 'Checking in...';
    
    socket.emit('checkIn', sessionToken);
    
    setTimeout(() => {
        checkInBtn.disabled = false;
        checkInBtn.querySelector('.btn-text').textContent = 'All Is Well';
    }, 1000);
}

function showSettings() {
    showScreen('trackedSettings');
}

function handleSettingsSubmit(e) {
    e.preventDefault();
    const reminderTime = parseInt(reminderTimeMinutesInput.value);
    const alertTime = parseInt(alertTimeMinutesInput.value);
    
    if (!reminderTime || reminderTime < 1 || reminderTime > 1440) {
        showStatus('Reminder time must be between 1 and 1440 minutes', 'error');
        return;
    }
    
    if (!alertTime || alertTime < 1 || alertTime > 1440) {
        showStatus('Alert time must be between 1 and 1440 minutes', 'error');
        return;
    }
    
    if (reminderTime >= alertTime) {
        showStatus('Reminder time must be less than alert time', 'error');
        return;
    }
    
    reminderTimeMinutes = reminderTime;
    alertTimeMinutes = alertTime;
    saveState();
    
    // Set timers on server
    if (socket && socket.connected && sessionToken) {
        socket.emit('setTimers', { 
            sessionToken: sessionToken, 
            reminderTimeMinutes: reminderTime,
            alertTimeMinutes: alertTime
        });
        // Timers will start after server confirms via timersSet event
    } else {
        showStatus('Not connected to server', 'error');
    }
}

function startTimers() {
    // Set timers on server
    if (!sessionToken || !socket || !socket.connected || !settingsConfigured) return;
    
    socket.emit('setTimers', { 
        sessionToken: sessionToken, 
        reminderTimeMinutes: reminderTimeMinutes,
        alertTimeMinutes: alertTimeMinutes
    });
}

function startLocalTimers() {
    // Clear existing timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    // Use alert time for display (time until tracker is alerted)
    if (!alertTimeEnd) {
        timer.textContent = formatTime(alertTimeMinutes, 0, 0);
        return;
    }
    
    const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, alertTimeEnd - now);
        
        if (remaining <= 0) {
            timer.textContent = '00:00:00';
            timer.style.color = '#dc3545';
            alertTimeEnd = null;
            reminderTimeEnd = null;
            localStorage.removeItem('allIsWell_alertTimeEnd');
            localStorage.removeItem('allIsWell_reminderTimeEnd');
            return;
        }
        
        const totalSeconds = Math.floor(remaining / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        timer.textContent = formatTime(hours, minutes, seconds);
        
        // Change color as time runs out
        const percentageRemaining = remaining / (alertTimeMinutes * 60 * 1000);
        if (percentageRemaining < 0.25) {
            timer.style.color = '#dc3545';
        } else if (percentageRemaining < 0.5) {
            timer.style.color = '#ffc107';
        } else {
            timer.style.color = '#212529';
        }
    };
    
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

function formatTime(hours, minutes, seconds) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateLastCheckInTime() {
    lastCheckInTime.textContent = new Date().toLocaleString();
}

function showScreen(screenName) {
    // Hide all screens
    roleSelection.style.display = 'none';
    trackedCodeScreen.style.display = 'none';
    trackedInterface.style.display = 'none';
    trackedSettings.style.display = 'none';
    trackerCodeScreen.style.display = 'none';
    trackerInterface.style.display = 'none';
    
    // Show selected screen
    const screen = document.getElementById(screenName);
    if (screen) {
        screen.style.display = 'flex';
        
        // If showing tracked interface and timers should be running, start them
        if (screenName === 'trackedInterface' && (reminderTimeEnd || alertTimeEnd)) {
            startLocalTimers();
        }
        
        // If showing tracked code screen and not connected, start expiration display
        if (screenName === 'trackedCodeScreen' && codeExpiresAt && !isConnected) {
            startCodeExpirationDisplay();
        }
    }
}

function showCheckinPopup() {
    checkinPopup.style.display = 'flex';
    setTimeout(() => {
        checkinPopup.classList.add('popup-show');
    }, 10);
}

function hideCheckinPopup() {
    checkinPopup.classList.remove('popup-show');
    setTimeout(() => {
        checkinPopup.style.display = 'none';
    }, 300);
}

function showStatus(message, type) {
    // Find the status message in the currently visible screen
    const visibleScreen = document.querySelector('.screen[style*="flex"]');
    if (!visibleScreen) return;
    
    const statusMessage = visibleScreen.querySelector('.status-message');
    if (!statusMessage) return;
    
    if (!message) {
        statusMessage.style.display = 'none';
        return;
    }
    
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
    
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }
}

function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: '/icon-192.ico',
            badge: '/icon-192.ico'
        });
    } else if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(title, {
                    body: body,
                    icon: '/icon-192.ico',
                    badge: '/icon-192.ico'
                });
            }
        });
    }
}



























