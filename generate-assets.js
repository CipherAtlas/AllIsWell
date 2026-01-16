// Script to generate Capacitor assets
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Setting up Capacitor assets...\n');

const assetsDir = path.join(__dirname, 'assets');
const publicDir = path.join(__dirname, 'public');

// Create assets directory if it doesn't exist
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
  console.log('📁 Created assets directory\n');
}

// Check for source icon files
const icon512ico = path.join(publicDir, 'icon-512.ico');
const iconPng = path.join(assetsDir, 'icon.png');
const splashPng = path.join(assetsDir, 'splash.png');

console.log('📋 Checking for icon files...\n');

// @capacitor/assets expects:
// - assets/icon.png (at least 1024x1024, but 512x512 should work)
// - assets/splash.png (at least 2732x2732, optional)

if (fs.existsSync(icon512ico)) {
  console.log('✅ Found icon-512.ico in public folder');
} else {
  console.log('⚠️  No icon files found in public folder.');
}

// Check if icon.png exists in assets folder
if (!fs.existsSync(iconPng)) {
  console.log('❌ assets/icon.png not found.');
  console.log('\n📝 Next steps:');
  console.log('   1. Convert icon-512.ico to PNG format:');
  console.log('      - Online: https://convertio.co/ico-png/');
  console.log('      - ImageMagick: magick public/icon-512.ico assets/icon.png');
  console.log('      - Or use any image editor\n');
  console.log('   2. Save the PNG as: assets/icon.png (512x512 or larger)\n');
  console.log('   3. Then run: npm run cap:assets\n');
  process.exit(1);
}

console.log('✅ Found assets/icon.png\n');

// Create splash if it doesn't exist (copy from icon)
if (!fs.existsSync(splashPng)) {
  console.log('📝 Creating splash.png from icon.png...');
  if (fs.existsSync(iconPng)) {
    fs.copyFileSync(iconPng, splashPng);
    console.log('   (Created basic splash - you can replace with custom 2732x2732 image later)\n');
  }
}

// Now run capacitor assets
console.log('🚀 Running @capacitor/assets generate...\n');

try {
  execSync('npx @capacitor/assets generate', {
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('\n✅ Assets generated successfully!');
  console.log('   Next step: Run "npm run cap:sync" to sync assets to Android project\n');
} catch (error) {
  console.error('\n❌ Error generating assets.');
  console.error('   Make sure assets/icon.png exists (512x512 or larger PNG file)');
  process.exit(1);
}
