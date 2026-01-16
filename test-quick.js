// Quick connectivity test
const io = require('socket.io-client');

const SERVER_URL = 'https://web-production-e764d.up.railway.app';

console.log('🚀 Quick Server Test\n');
console.log('Server:', SERVER_URL);
console.log('─'.repeat(40));

const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  timeout: 5000
});

socket.on('connect', () => {
  console.log('✅ Socket.IO: Connected');
  console.log('   Socket ID:', socket.id);
  
  // Quick code registration test
  const testCode = '999999';
  console.log(`\n📝 Testing code registration: ${testCode}`);
  socket.emit('registerCode', testCode);
});

socket.on('codeRegistered', (data) => {
  console.log('✅ Code Registration: Working');
  console.log('   Code:', data.code);
  console.log('   Expires:', new Date(data.expiresAt).toLocaleString());
  console.log('\n🎉 Server is fully operational!');
  socket.disconnect();
  process.exit(0);
});

socket.on('connect_error', (error) => {
  console.log('❌ Connection Error:', error.message);
  process.exit(1);
});

socket.on('error', (error) => {
  console.log('❌ Error:', error);
  process.exit(1);
});

setTimeout(() => {
  console.log('⏱️  Timeout waiting for response');
  socket.disconnect();
  process.exit(1);
}, 10000);
