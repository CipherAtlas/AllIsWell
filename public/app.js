// Persistent socket connections after pairing
let socket = null;
let currentRole = null;
let connectionCode = null;
let sessionToken = null; // Secure session token after pairing
let timerInterval = null;
let codeExpirationInterval = null;
let codeExpirationDisplayInterval = null;
let keepAliveInterval = null; // Keep-alive interval
let reminderTimeHours = 0.5; // Default 0.5 hours (30 minutes)
let alertTimeHours = 1; // Default 1 hour
let reminderTimeEnd = null;
let alertTimeEnd = null;
let codeExpiresAt = null;
let isConnected = false;
let settingsConfigured = false;

// Tracker contacts management
let trackerContacts = []; // Array of { id, code, name, lastCheckIn, status, hasAlert }
let currentContactId = null; // ID of currently viewed contact
let editingContactId = null; // ID of contact being edited

// DOM elements
const roleSelection = document.getElementById('roleSelection');
const trackedCodeScreen = document.getElementById('trackedCodeScreen');
const trackedInterface = document.getElementById('trackedInterface');
const trackedSettings = document.getElementById('trackedSettings');
const trackerHomeScreen = document.getElementById('trackerHomeScreen');
const trackerCodeScreen = document.getElementById('trackerCodeScreen');
const trackerInterface = document.getElementById('trackerInterface');
const editContactModal = document.getElementById('editContactModal');

// Buttons
const btnTracked = document.getElementById('btnTracked');
const btnTracker = document.getElementById('btnTracker');
const btnGenerateCode = document.getElementById('btnGenerateCode');
const btnConnectTracker = document.getElementById('btnConnectTracker');
const btnAddContact = document.getElementById('btnAddContact');
const btnAddContactFromHome = document.getElementById('btnAddContactFromHome');
const btnEditContact = document.getElementById('btnEditContact');
const btnDeleteContact = document.getElementById('btnDeleteContact');
const btnCancelEdit = document.getElementById('btnCancelEdit');
const checkInBtn = document.getElementById('checkInBtn');
const settingsBtn = document.getElementById('settingsBtn');
const closePopupBtn = document.getElementById('closePopupBtn');
const btnCopyCode = document.getElementById('btnCopyCode');
const btnDismissWelcome = document.getElementById('btnDismissWelcome');
const welcomeSection = document.getElementById('welcomeSection');

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
const contactNameInput = document.getElementById('contactNameInput');
const editContactNameInput = document.getElementById('editContactNameInput');
const editContactForm = document.getElementById('editContactForm');
const reminderTimeHoursInput = document.getElementById('reminderTimeHours');
const alertTimeHoursInput = document.getElementById('alertTimeHours');
const settingsForm = document.getElementById('settingsForm');
const contactsList = document.getElementById('contactsList');
const trackerContactName = document.getElementById('trackerContactName');

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
    btnAddContact.addEventListener('click', () => showScreen('trackerCodeScreen'));
    btnAddContactFromHome.addEventListener('click', () => showScreen('trackerCodeScreen'));
    btnEditContact.addEventListener('click', () => showEditContactModal(currentContactId));
    btnDeleteContact.addEventListener('click', handleDeleteContact);
    btnCancelEdit.addEventListener('click', hideEditContactModal);
    editContactForm.addEventListener('submit', handleEditContactSubmit);
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
    backFromTrackerCode.addEventListener('click', () => {
        if (currentRole === 'tracker') {
            showScreen('trackerHomeScreen');
        }
    });
    backFromTracker.addEventListener('click', () => {
        if (currentRole === 'tracker') {
            showScreen('trackerHomeScreen');
        }
    });

    // Allow Enter key in code input
    if (trackerCodeInput) {
        trackerCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                connectAsTracker();
            }
            // Only allow numbers
            if (!/[0-9]/.test(e.key) && e.key !== 'Enter' && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab') {
                e.preventDefault();
            }
        });
        
        // Auto-format: only allow numbers
        trackerCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
        });
    }

    // Copy code button
    if (btnCopyCode) {
        btnCopyCode.addEventListener('click', copyCodeToClipboard);
    }

    // Welcome screen
    if (btnDismissWelcome) {
        btnDismissWelcome.addEventListener('click', () => {
            welcomeSection.style.display = 'none';
            localStorage.setItem('allIsWell_welcomeShown', 'true');
        });
    }

    // Show welcome on first visit
    const welcomeShown = localStorage.getItem('allIsWell_welcomeShown');
    if (!welcomeShown && welcomeSection) {
        welcomeSection.style.display = 'block';
    }

    // Handle Android back button
    handleBackButton();
});

// Haptic feedback function
function triggerHapticFeedback(type = 'light') {
    if ('vibrate' in navigator) {
        const patterns = {
            light: 10,
            medium: 20,
            heavy: 30,
            success: [20, 50, 20],
            error: [30, 50, 30, 50, 30]
        };
        navigator.vibrate(patterns[type] || patterns.light);
    }
}

// Copy code to clipboard
function copyCodeToClipboard() {
    if (!connectionCode) return;
    
    // Use modern clipboard API if available
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(connectionCode).then(() => {
            showCopySuccess();
            triggerHapticFeedback('success');
        }).catch(() => {
            // Fallback for older browsers
            fallbackCopyCode(connectionCode);
        });
    } else {
        fallbackCopyCode(connectionCode);
    }
}

function fallbackCopyCode(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showCopySuccess();
        triggerHapticFeedback('success');
    } catch (err) {
        showStatus('Unable to copy code. Please write it down manually.', 'error');
    }
    
    document.body.removeChild(textArea);
}

function showCopySuccess() {
    if (!btnCopyCode) return;
    btnCopyCode.textContent = '✓ Copied!';
    btnCopyCode.classList.add('copied');
    showStatus('Code copied! Share it with your tracker.', 'success');
    
    setTimeout(() => {
        btnCopyCode.textContent = '📋 Copy';
        btnCopyCode.classList.remove('copied');
    }, 2000);
}

// Loading overlay functions
function showLoading(message = 'Loading...') {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `
            <div style="text-align: center;">
                <div class="loading-spinner"></div>
                <div class="loading-message">${message}</div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    overlay.querySelector('.loading-message').textContent = message;
    overlay.classList.add('active');
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// Handle Android back button
function handleBackButton() {
    // Listen for popstate (browser back button)
    window.addEventListener('popstate', (e) => {
        e.preventDefault();
        handleBackNavigation();
    });

    // For Capacitor apps, we might need to use Capacitor App plugin
    // This is a basic implementation
    document.addEventListener('backbutton', handleBackNavigation, false);
}

function handleBackNavigation() {
    const visibleScreen = document.querySelector('.screen[style*="flex"]');
    if (!visibleScreen) return;

    const screenId = visibleScreen.id;
    
    // Close modals first
    if (editContactModal && editContactModal.style.display === 'flex') {
        hideEditContactModal();
        return;
    }
    
    if (checkinPopup && checkinPopup.style.display !== 'none') {
        hideCheckinPopup();
        return;
    }

    // Navigate back based on current screen
    if (screenId === 'trackedCodeScreen') {
        showScreen('roleSelection');
    } else if (screenId === 'trackedInterface') {
        if (currentRole === 'tracked') {
            showScreen('trackedCodeScreen');
        } else {
            showScreen('roleSelection');
        }
    } else if (screenId === 'trackedSettings') {
        showScreen('trackedInterface');
    } else if (screenId === 'trackerCodeScreen') {
        showScreen('trackerHomeScreen');
    } else if (screenId === 'trackerInterface') {
        showScreen('trackerHomeScreen');
    } else if (screenId === 'trackerHomeScreen') {
        if (trackerContacts.length === 0) {
            showScreen('roleSelection');
        } else {
            // Can't go back from home if there are contacts
            // Optionally show confirmation
            if (confirm('Exit app? You can always come back later.')) {
                // This would typically close the app, but we'll just show role selection
                showScreen('roleSelection');
            }
        }
    }
}

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
        // Socket ID may not be available immediately, log it with a small delay
        setTimeout(() => {
            console.log('Connected to server, socket ID:', socket.id);
        }, 100);
        
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
            showStatus('Connection lost. Don\'t worry, we\'re reconnecting...', 'error');
            // Update UI but keep trying to reconnect
            if (currentRole === 'tracker') {
                if (trackerConnectionStatus) {
                    trackerConnectionStatus.textContent = 'Reconnecting...';
                    trackerConnectionStatus.style.color = '#ffc107';
                }
            } else if (currentRole === 'tracked' && connectionStatus) {
                connectionStatus.textContent = 'Reconnecting...';
                connectionStatus.style.color = '#ffc107';
                connectionStatus.style.background = 'rgba(255, 212, 184, 0.2)';
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
        triggerHapticFeedback('success');
        
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
        
        // Stop code refresh and expiration display - connection is established
        stopCodeRefreshTimer();
        stopCodeExpirationDisplay();
        if (codeExpirationDisplay) {
            codeExpirationDisplay.textContent = '✓ Connected - code is now active';
            codeExpirationDisplay.style.color = '#28a745';
        }
        
        // Start keep-alive mechanism
        startKeepAlive();
        
        // Switch to main interface first
        showScreen('trackedInterface');
        
        // Update connection status
        if (connectionStatus) {
            connectionStatus.textContent = '✓ Connected';
            connectionStatus.style.color = '#28a745';
            connectionStatus.style.background = 'rgba(141, 212, 184, 0.2)';
            connectionStatus.className = 'info-value connection-status-display';
        }
        
        // Show settings screen if not configured, otherwise show success message
        if (!settingsConfigured) {
            showStatus('Great! Your tracker is connected. Please set your reminder times next.', 'success');
            // Show settings after a brief moment
            setTimeout(() => {
                showScreen('trackedSettings');
            }, 2000);
        } else {
            showStatus('Tracker connected! Everything is set up.', 'success');
            // Start timers if they were previously configured
            if (reminderTimeEnd || alertTimeEnd) {
                startLocalTimers();
            }
        }
        console.log('Tracker connected - connection established, sessionToken:', sessionToken);
    });

    socket.on('trackerDisconnected', () => {
        isConnected = false;
        saveState(); // Save disconnected state
        stopKeepAlive(); // Stop keep-alive when disconnected
        if (connectionStatus) {
            connectionStatus.textContent = 'Tracker disconnected';
            connectionStatus.style.color = '#dc3545';
            connectionStatus.style.background = 'rgba(255, 179, 179, 0.2)';
        }
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
        
        // Update contact status
        if (connectionCode) {
            const contact = trackerContacts.find(c => c.code === connectionCode);
            if (contact) {
                updateTrackerContact(contact.id, { status: 'connected' });
                if (currentContactId === contact.id) {
                    trackerConnectionStatus.textContent = 'Connected';
                    trackerConnectionStatus.style.color = 'var(--success)';
                }
            }
        }
        
        // If viewing this contact, show interface, otherwise just update home
        if (currentContactId) {
            showScreen('trackerInterface');
            showStatus('Connected successfully!', 'success');
        } else {
            renderContactsList();
            showStatus('Connected successfully!', 'success');
        }
        trackerConnectionStatus.textContent = 'Connected';
        trackerConnectionStatus.style.color = '#28a745';
        console.log('Tracker connection established, sessionToken:', sessionToken);
        // Start keep-alive mechanism
        startKeepAlive();
    });

    socket.on('checkInConfirmed', (data) => {
        triggerHapticFeedback('success');
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
        const checkInTime = new Date(data.timestamp);
        const code = data.code;
        
        // Update contact
        const contact = trackerContacts.find(c => c.code === code);
        if (contact) {
            updateTrackerContact(contact.id, { 
                lastCheckIn: data.timestamp,
                hasAlert: false
            });
            
            // Update UI if this is the current contact
            if (currentContactId === contact.id) {
                trackerLastCheckIn.textContent = checkInTime.toLocaleString();
                alertCard.style.display = 'none';
            }
            
            showNotification(`Check-in from ${contact.name}!`, 'They checked in successfully.');
        } else {
            trackerLastCheckIn.textContent = checkInTime.toLocaleString();
            alertCard.style.display = 'none';
            showNotification('Check-in received!', 'Your tracked person checked in.');
        }
        
        // Store check-in in localStorage log for tracker
        saveCheckInLog(data.timestamp);
    });

    socket.on('checkInMissed', (data) => {
        const code = data.code;
        const contact = trackerContacts.find(c => c.code === code);
        
        if (contact) {
            updateTrackerContact(contact.id, { hasAlert: true });
            
            // Update UI if this is the current contact
            if (currentContactId === contact.id) {
                alertCard.style.display = 'block';
            }
            
            showNotification(`Alert: ${contact.name} missed check-in!`, 'Please check on them.');
            renderContactsList(); // Update list to show alert indicator
        } else {
            alertCard.style.display = 'block';
            showNotification('Alert: Check-in Missed!', 'The person you\'re tracking has not checked in. Please check on them.');
        }
    });

    socket.on('timersSet', (data) => {
        reminderTimeEnd = data.reminderTimeEnd;
        alertTimeEnd = data.alertTimeEnd;
        settingsConfigured = true;
        saveState();
        startLocalTimers();
        showStatus('Settings saved! Timers started.', 'success');
        // Redirect back to main interface after a brief delay
        setTimeout(() => {
            showScreen('trackedInterface');
        }, 1000);
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
        reminderTimeHours = parseFloat(savedReminderTime);
        if (reminderTimeHoursInput) {
            reminderTimeHoursInput.value = reminderTimeHours;
        }
    }
    if (savedAlertTime) {
        alertTimeHours = parseFloat(savedAlertTime);
        if (alertTimeHoursInput) {
            alertTimeHoursInput.value = alertTimeHours;
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
            loadTrackerContacts();
            showScreen('trackerHomeScreen');
            renderContactsList();
        }
    } else if (currentRole === 'tracker') {
        loadTrackerContacts();
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
    if (reminderTimeHours) {
        localStorage.setItem('allIsWell_reminderTime', reminderTimeHours.toString());
    }
    if (alertTimeHours) {
        localStorage.setItem('allIsWell_alertTime', alertTimeHours.toString());
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
    triggerHapticFeedback('medium');
    
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
            if (connectionCodeDisplay) {
                connectionCodeDisplay.textContent = connectionCode;
            }
            if (btnCopyCode) {
                btnCopyCode.style.display = 'block';
            }
            // Register code on server
            if (socket && socket.connected) {
                socket.emit('registerCode', connectionCode);
            }
        }
    } else if (role === 'tracker') {
        loadTrackerContacts();
        showScreen('trackerHomeScreen');
        renderContactsList();
    }
}

// Tracker Contacts Management
function loadTrackerContacts() {
    const saved = localStorage.getItem('allIsWell_trackerContacts');
    if (saved) {
        try {
            trackerContacts = JSON.parse(saved);
        } catch (e) {
            trackerContacts = [];
        }
    } else {
        trackerContacts = [];
    }
}

function saveTrackerContacts() {
    localStorage.setItem('allIsWell_trackerContacts', JSON.stringify(trackerContacts));
}

function addTrackerContact(code, name) {
    // Check if contact with this code already exists
    const existing = trackerContacts.find(c => c.code === code);
    if (existing) {
        showStatus('Contact with this code already exists', 'error');
        return false;
    }
    
    const contact = {
        id: Date.now().toString(),
        code: code,
        name: name || `Contact ${trackerContacts.length + 1}`,
        lastCheckIn: null,
        status: 'disconnected',
        hasAlert: false
    };
    
    trackerContacts.push(contact);
    saveTrackerContacts();
    renderContactsList();
    
    // Connect to this contact
    if (socket && socket.connected) {
        socket.emit('trackCode', code);
        contact.status = 'connecting';
    }
    
    return true;
}

function updateTrackerContact(id, updates) {
    const contact = trackerContacts.find(c => c.id === id);
    if (contact) {
        Object.assign(contact, updates);
        saveTrackerContacts();
        renderContactsList();
        return true;
    }
    return false;
}

function deleteTrackerContact(id) {
    const index = trackerContacts.findIndex(c => c.id === id);
    if (index !== -1) {
        // Disconnect from this contact if currently viewing it
        if (currentContactId === id) {
            if (socket && socket.connected) {
                // Note: Server will handle disconnection when socket disconnects
            }
            currentContactId = null;
        }
        
        trackerContacts.splice(index, 1);
        saveTrackerContacts();
        renderContactsList();
        
        // If we deleted the current contact, go back to home
        if (currentContactId === id) {
            showScreen('trackerHomeScreen');
        }
        
        return true;
    }
    return false;
}

function renderContactsList() {
    if (!contactsList) return;
    
    if (trackerContacts.length === 0) {
        contactsList.innerHTML = `
            <div class="empty-state">
                <p>No contacts yet. Add your first contact to start tracking!</p>
            </div>
        `;
        return;
    }
    
    contactsList.innerHTML = trackerContacts.map(contact => {
        const statusColor = contact.status === 'connected' ? 'var(--success)' : 
                           contact.status === 'connecting' ? 'var(--warning)' : 
                           'var(--text-tertiary)';
        const statusText = contact.status === 'connected' ? 'Connected' :
                          contact.status === 'connecting' ? 'Connecting...' :
                          'Disconnected';
        
        return `
            <div class="contact-item ${contact.hasAlert ? 'contact-alert' : ''}" data-contact-id="${contact.id}">
                <div class="contact-info" onclick="viewContact('${contact.id}')">
                    <div class="contact-name">${escapeHtml(contact.name)}</div>
                    <div class="contact-meta">
                        <span class="contact-code">Code: ${contact.code}</span>
                        <span class="contact-status" style="color: ${statusColor}">${statusText}</span>
                    </div>
                    ${contact.lastCheckIn ? `<div class="contact-checkin">Last check-in: ${new Date(contact.lastCheckIn).toLocaleString()}</div>` : ''}
                </div>
                <div class="contact-actions">
                    <button class="btn-icon-small" onclick="event.stopPropagation(); showEditContactModal('${contact.id}')" title="Edit">✎</button>
                </div>
            </div>
        `;
    }).join('');
}

function viewContact(contactId) {
    const contact = trackerContacts.find(c => c.id === contactId);
    if (!contact) return;
    
    currentContactId = contactId;
    connectionCode = contact.code;
    trackerContactName.textContent = contact.name;
    
    // Update UI with contact info
    trackerLastCheckIn.textContent = contact.lastCheckIn ? 
        new Date(contact.lastCheckIn).toLocaleString() : 'Waiting...';
    trackerConnectionStatus.textContent = contact.status === 'connected' ? 'Connected' : 'Disconnected';
    trackerConnectionStatus.style.color = contact.status === 'connected' ? 'var(--success)' : 'var(--error)';
    
    if (contact.hasAlert) {
        alertCard.style.display = 'block';
    } else {
        alertCard.style.display = 'none';
    }
    
    showScreen('trackerInterface');
    
    // Connect to this contact if not connected
    if (socket && socket.connected && contact.status !== 'connected') {
        socket.emit('trackCode', contact.code);
    }
}

function showEditContactModal(contactId) {
    const contact = trackerContacts.find(c => c.id === contactId);
    if (!contact) return;
    
    editingContactId = contactId;
    editContactNameInput.value = contact.name;
    editContactModal.style.display = 'flex';
}

function hideEditContactModal() {
    editContactModal.style.display = 'none';
    editingContactId = null;
}

function handleEditContactSubmit(e) {
    e.preventDefault();
    const newName = editContactNameInput.value.trim();
    
    if (!newName) {
        showStatus('Contact name cannot be empty', 'error');
        return;
    }
    
    if (editingContactId) {
        updateTrackerContact(editingContactId, { name: newName });
        hideEditContactModal();
        showStatus('Contact updated', 'success');
        
        // Update display if this is the current contact
        if (currentContactId === editingContactId) {
            trackerContactName.textContent = newName;
        }
    }
}

function handleDeleteContact() {
    if (!editingContactId) return;
    
    const contact = trackerContacts.find(c => c.id === editingContactId);
    if (!contact) return;
    
    const contactName = contact.name || 'this contact';
    const confirmed = confirm(`Are you sure you want to delete "${contactName}"?\n\nThis cannot be undone.`);
    
    if (confirmed) {
        triggerHapticFeedback('medium');
        deleteTrackerContact(editingContactId);
        hideEditContactModal();
        showStatus('Contact deleted successfully', 'success');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function generateCode() {
    // Show loading state
    if (connectionCodeDisplay) {
        connectionCodeDisplay.textContent = 'Generating...';
    }
    if (btnCopyCode) {
        btnCopyCode.style.display = 'none';
    }
    
    triggerHapticFeedback('light');
    
    // Generate a 6-digit code
    connectionCode = Math.floor(100000 + Math.random() * 900000).toString();
    if (connectionCodeDisplay) {
        connectionCodeDisplay.textContent = connectionCode;
    }
    
    // Show copy button
    if (btnCopyCode) {
        btnCopyCode.style.display = 'block';
    }
    
    saveState();
    
    // Register code on server
    if (socket && socket.connected) {
        socket.emit('registerCode', connectionCode);
    } else {
        connectSocket();
    }
}

function connectAsTracker() {
    const code = trackerCodeInput.value.trim().replace(/\D/g, ''); // Remove non-digits
    
    // Update input with cleaned code
    if (trackerCodeInput.value !== code) {
        trackerCodeInput.value = code;
    }
    
    if (!code || code.length !== 6) {
        showStatus('Please enter a 6-digit code (numbers only)', 'error');
        trackerCodeInput.focus();
        triggerHapticFeedback('error');
        return;
    }
    
    if (!/^\d{6}$/.test(code)) {
        showStatus('Code must be exactly 6 numbers (0-9)', 'error');
        trackerCodeInput.focus();
        triggerHapticFeedback('error');
        return;
    }
    
    const name = contactNameInput ? contactNameInput.value.trim() : '';
    
    triggerHapticFeedback('medium');
    
    // Show loading state
    const btnConnect = document.getElementById('btnConnectTracker');
    if (btnConnect) {
        const btnText = btnConnect.querySelector('.btn-text-inner');
        const btnSpinner = btnConnect.querySelector('.btn-loading-spinner');
        if (btnText) btnText.textContent = 'Adding...';
        if (btnSpinner) btnSpinner.style.display = 'inline-block';
        btnConnect.disabled = true;
    }
    
    // Add contact
    if (addTrackerContact(code, name)) {
        // Clear inputs
        trackerCodeInput.value = '';
        if (contactNameInput) contactNameInput.value = '';
        
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
        
        emitTrackCode();
        
        // Reset button state
        if (btnConnect) {
            const btnText = btnConnect.querySelector('.btn-text-inner');
            const btnSpinner = btnConnect.querySelector('.btn-loading-spinner');
            if (btnText) btnText.textContent = 'Add Contact';
            if (btnSpinner) btnSpinner.style.display = 'none';
            btnConnect.disabled = false;
        }
        
        // Go back to home screen
        showScreen('trackerHomeScreen');
        showStatus('Contact added! You can now track them.', 'success');
        triggerHapticFeedback('success');
    } else {
        // Reset button state on error
        if (btnConnect) {
            const btnText = btnConnect.querySelector('.btn-text-inner');
            const btnSpinner = btnConnect.querySelector('.btn-loading-spinner');
            if (btnText) btnText.textContent = 'Add Contact';
            if (btnSpinner) btnSpinner.style.display = 'none';
            btnConnect.disabled = false;
        }
    }
}

function handleCheckIn() {
    if (!sessionToken || !socket || !socket.connected) {
        showStatus('Not connected. Please check your internet connection and try again.', 'error');
        triggerHapticFeedback('error');
        return;
    }

    triggerHapticFeedback('heavy');
    
    checkInBtn.disabled = true;
    const btnText = checkInBtn.querySelector('.btn-text');
    if (btnText) {
        btnText.textContent = 'Checking in...';
    }
    
    socket.emit('checkIn', sessionToken);
    
    setTimeout(() => {
        checkInBtn.disabled = false;
        if (btnText) {
            btnText.textContent = 'All Is Well';
        }
    }, 1500);
}

function showSettings() {
    showScreen('trackedSettings');
}

function handleSettingsSubmit(e) {
    e.preventDefault();
    const reminderTime = parseFloat(reminderTimeHoursInput.value);
    const alertTime = parseFloat(alertTimeHoursInput.value);
    
    if (!reminderTime || isNaN(reminderTime) || reminderTime < 0.5 || reminderTime > 24) {
        showStatus('Reminder time must be a number between 0.5 and 24 hours. Example: 0.5 for 30 minutes, 1 for 1 hour.', 'error');
        reminderTimeHoursInput.focus();
        triggerHapticFeedback('error');
        return;
    }
    
    if (!alertTime || isNaN(alertTime) || alertTime < 0.5 || alertTime > 24) {
        showStatus('Alert time must be a number between 0.5 and 24 hours. Example: 1 for 1 hour, 2 for 2 hours.', 'error');
        alertTimeHoursInput.focus();
        triggerHapticFeedback('error');
        return;
    }
    
    if (reminderTime >= alertTime) {
        showStatus('Alert time must be longer than reminder time. For example, if reminder is 0.5 hours, alert should be at least 1 hour.', 'error');
        alertTimeHoursInput.focus();
        triggerHapticFeedback('error');
        return;
    }
    
    triggerHapticFeedback('medium');
    
    reminderTimeHours = reminderTime;
    alertTimeHours = alertTime;
    saveState();
    
    // Convert hours to minutes for server (server expects minutes)
    const reminderTimeMinutes = reminderTime * 60;
    const alertTimeMinutes = alertTime * 60;
    
    // Set timers on server
    if (socket && socket.connected && sessionToken) {
        showStatus('Saving settings...', 'info');
        socket.emit('setTimers', { 
            sessionToken: sessionToken, 
            reminderTimeMinutes: reminderTimeMinutes,
            alertTimeMinutes: alertTimeMinutes
        });
        // Timers will start after server confirms via timersSet event
    } else {
        showStatus('Not connected to server. Please check your internet connection.', 'error');
        triggerHapticFeedback('error');
    }
}

function startTimers() {
    // Set timers on server
    if (!sessionToken || !socket || !socket.connected || !settingsConfigured) return;
    
    // Convert hours to minutes for server
    const reminderTimeMinutes = reminderTimeHours * 60;
    const alertTimeMinutes = alertTimeHours * 60;
    
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
    // Convert hours to milliseconds for calculation
    const alertTimeMs = alertTimeHours * 60 * 60 * 1000;
    if (!alertTimeEnd) {
        const hours = Math.floor(alertTimeHours);
        const minutes = Math.floor((alertTimeHours - hours) * 60);
        timer.textContent = formatTime(hours, minutes, 0);
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
        const percentageRemaining = remaining / alertTimeMs;
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

// Function to save check-in log to localStorage for tracker
function saveCheckInLog(timestamp) {
    if (currentRole !== 'tracker') return;
    
    const logKey = `allIsWell_checkInLog_${sessionToken || connectionCode}`;
    let checkInLog = [];
    
    try {
        const saved = localStorage.getItem(logKey);
        if (saved) {
            checkInLog = JSON.parse(saved);
        }
    } catch (e) {
        console.warn('Error loading check-in log:', e);
    }
    
    // Add new check-in to log
    checkInLog.push({
        timestamp: timestamp,
        date: new Date(timestamp).toISOString(),
        display: new Date(timestamp).toLocaleString()
    });
    
    // Keep only last 100 check-ins to avoid storage issues
    if (checkInLog.length > 100) {
        checkInLog = checkInLog.slice(-100);
    }
    
    try {
        localStorage.setItem(logKey, JSON.stringify(checkInLog));
        console.log('Check-in log saved, total entries:', checkInLog.length);
    } catch (e) {
        console.warn('Error saving check-in log:', e);
    }
}

function showScreen(screenName) {
    // Hide all screens
    if (roleSelection) roleSelection.style.display = 'none';
    if (trackedCodeScreen) trackedCodeScreen.style.display = 'none';
    if (trackedInterface) trackedInterface.style.display = 'none';
    if (trackedSettings) trackedSettings.style.display = 'none';
    if (trackerHomeScreen) trackerHomeScreen.style.display = 'none';
    if (trackerCodeScreen) trackerCodeScreen.style.display = 'none';
    if (trackerInterface) trackerInterface.style.display = 'none';
    
    // Hide modals
    if (editContactModal) editContactModal.style.display = 'none';
    if (checkinPopup) checkinPopup.style.display = 'none';
    
    // Hide welcome section when navigating away from role selection
    if (welcomeSection && screenName !== 'roleSelection') {
        welcomeSection.style.display = 'none';
    }
    
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
        
        // If showing tracker home, refresh contacts list
        if (screenName === 'trackerHomeScreen') {
            renderContactsList();
        }
        
        // Focus on input if it's a code entry screen
        if (screenName === 'trackerCodeScreen' && trackerCodeInput) {
            setTimeout(() => {
                trackerCodeInput.focus();
                // Scroll to input on mobile
                trackerCodeInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
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



























