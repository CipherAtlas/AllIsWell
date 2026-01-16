// Script to convert ICO to PNG and generate Capacitor assets
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Setting up Capacitor assets...\n');

// Check if icon PNGs exist, if not, we'll need to create them from ICO
const icon192ico = path.join(__dirname, 'public', 'icon-192.ico');
const icon512ico = path.join(__dirname, 'public', 'icon-512.ico');
const icon192png = path.join(__dirname, 'public', 'icon-192.png');
const icon512png = path.join(__dirname, 'public', 'public', 'icon-512.png');

console.log('📋 Note: @capacitor/assets requires PNG files.');
console.log('   If you need to convert .ico to .png, you can use:');
console.log('   - Online: https://convertio.co/ico-png/');
console.log('   - ImageMagick: magick public/icon-192.ico public/icon-192.png\n');

// Check if PNG files exist
if (fs.existsSync(icon192png) && fs.existsSync(icon512png)) {
  console.log('✅ PNG icon files found!');
} else {
  console.log('⚠️  PNG icon files not found.');
  console.log('   Please ensure you have:');
  console.log('   - public/icon-192.png (192x192)');
  console.log('   - public/icon-512.png (512x512)\n');
}

// Now run capacitor assets
console.log('🚀 Running Capacitor Assets generator...\n');

try {
  // Use npx to run @capacitor/assets
  execSync('npx @capacitor/assets generate --iconBackgroundColor "#fefefe" --iconBackgroundColorDark "#f8f5f9"', {
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('\n✅ Assets generated successfully!');
} catch (error) {
  console.error('\n❌ Error generating assets. Make sure PNG files exist first.');
  console.error('   If PNG files don\'t exist, convert your .ico files to .png first.');
  process.exit(1);
}
