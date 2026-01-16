// Comprehensive test of the full All Is Well flow
const io = require('socket.io-client');

const SERVER_URL = 'https://web-production-e764d.up.railway.app';

console.log('🧪 Testing All Is Well Server - Full Flow Test\n');
console.log('Server URL:', SERVER_URL);
console.log('─'.repeat(50));

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  return new Promise((resolve) => {
    console.log(`\n📋 Test: ${name}`);
    try {
      fn((passed, message) => {
        if (passed) {
          console.log(`   ✅ ${message}`);
          testsPassed++;
        } else {
          console.log(`   ❌ ${message}`);
          testsFailed++;
        }
        resolve();
      });
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      testsFailed++;
      resolve();
    }
  });
}

async function runTests() {
  // Test 1: Tracked person generates code
  await test('Tracked Person - Code Generation', (done) => {
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    socket.on('connect', () => {
      socket.emit('registerCode', testCode);
    });
    
    socket.on('codeRegistered', (data) => {
      if (data.code === testCode && data.expiresAt) {
        done(true, `Code ${testCode} registered, expires at ${new Date(data.expiresAt).toLocaleTimeString()}`);
        socket.disconnect();
      } else {
        done(false, 'Invalid response data');
        socket.disconnect();
      }
    });
    
    socket.on('error', (error) => {
      done(false, error);
      socket.disconnect();
    });
    
    setTimeout(() => {
      if (socket.connected) {
        done(false, 'Timeout waiting for code registration');
        socket.disconnect();
      }
    }, 5000);
  });

  // Test 2: Tracker connects with code
  await test('Tracker - Connect with Code', (done) => {
    const trackedSocket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    const trackerSocket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    let codeRegistered = false;
    
    // First, register code as tracked person
    trackedSocket.on('connect', () => {
      trackedSocket.emit('registerCode', testCode);
    });
    
    trackedSocket.on('codeRegistered', () => {
      codeRegistered = true;
      // Now connect as tracker
      trackerSocket.on('connect', () => {
        trackerSocket.emit('trackCode', testCode);
      });
    });
    
    trackerSocket.on('trackingStarted', (data) => {
      if (data.code === testCode) {
        done(true, `Tracker connected to code ${testCode}`);
        trackedSocket.disconnect();
        trackerSocket.disconnect();
      } else {
        done(false, 'Invalid tracking response');
        trackedSocket.disconnect();
        trackerSocket.disconnect();
      }
    });
    
    trackerSocket.on('error', (error) => {
      done(false, `Tracker error: ${error}`);
      trackedSocket.disconnect();
      trackedSocket.disconnect();
    });
    
    setTimeout(() => {
      if (!codeRegistered) {
        done(false, 'Timeout waiting for code registration');
        trackedSocket.disconnect();
        trackerSocket.disconnect();
      }
    }, 10000);
  });

  // Test 3: Check-in flow
  await test('Tracked Person - Check-in', (done) => {
    const trackedSocket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    const trackerSocket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    let connectionEstablished = false;
    
    // Setup connection
    trackedSocket.on('connect', () => {
      trackedSocket.emit('registerCode', testCode);
    });
    
    trackedSocket.on('codeRegistered', () => {
      trackerSocket.on('connect', () => {
        trackerSocket.emit('trackCode', testCode);
      });
    });
    
    trackerSocket.on('trackingStarted', () => {
      connectionEstablished = true;
      // Now test check-in
      trackedSocket.emit('checkIn', testCode);
    });
    
    trackedSocket.on('checkInReceived', (data) => {
      if (data.code === testCode && data.timestamp) {
        done(true, `Check-in received by tracker at ${new Date(data.timestamp).toLocaleTimeString()}`);
        trackedSocket.disconnect();
        trackedSocket.disconnect();
      } else {
        done(false, 'Invalid check-in response');
        trackedSocket.disconnect();
        trackedSocket.disconnect();
      }
    });
    
    trackedSocket.on('error', (error) => {
      done(false, `Error: ${error}`);
      trackedSocket.disconnect();
      trackedSocket.disconnect();
    });
    
    setTimeout(() => {
      if (!connectionEstablished) {
        done(false, 'Timeout waiting for connection');
        trackedSocket.disconnect();
        trackerSocket.disconnect();
      }
    }, 15000);
  });

  // Test 4: Timer setting
  await test('Tracked Person - Set Timers', (done) => {
    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    const testCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    socket.on('connect', () => {
      socket.emit('registerCode', testCode);
    });
    
    socket.on('codeRegistered', () => {
      socket.emit('setTimers', {
        code: testCode,
        reminderTimeMinutes: 30,
        alertTimeMinutes: 60
      });
    });
    
    socket.on('timersSet', (data) => {
      if (data.reminderTimeMinutes === 30 && data.alertTimeMinutes === 60) {
        done(true, `Timers set: reminder ${data.reminderTimeMinutes}min, alert ${data.alertTimeMinutes}min`);
        socket.disconnect();
      } else {
        done(false, 'Invalid timer response');
        socket.disconnect();
      }
    });
    
    socket.on('error', (error) => {
      done(false, `Error: ${error}`);
      socket.disconnect();
    });
    
    setTimeout(() => {
      done(false, 'Timeout waiting for timer response');
      socket.disconnect();
    }, 10000);
  });

  // Summary
  console.log('\n' + '─'.repeat(50));
  console.log('📊 Test Summary:');
  console.log(`   ✅ Passed: ${testsPassed}`);
  console.log(`   ❌ Failed: ${testsFailed}`);
  console.log(`   📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! Server is working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
    process.exit(1);
  }
}

// Run all tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
