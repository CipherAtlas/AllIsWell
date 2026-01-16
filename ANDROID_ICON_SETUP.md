# Android Icon Setup Guide

To use your custom icons from the `public` folder in the Android app:

## Option 1: Use @capacitor/assets (Recommended)

1. Install the plugin:
```bash
npm install --save-dev @capacitor/assets
```

2. The plugin will automatically convert your icons from `public/icon-192.png` and `public/icon-512.png` to all Android required sizes when you run:
```bash
npx cap sync
```

3. Make sure you have PNG versions of your icons:
   - `public/icon-192.png` (192x192)
   - `public/icon-512.png` (512x512)

## Option 2: Manual Setup

If you want to manually set Android icons:

1. Convert your `.ico` files to PNG using an online converter or image editor
2. Use Android Studio's Image Asset Studio:
   - Open Android Studio
   - Right-click `res` folder → New → Image Asset
   - Select your icon PNG file
   - Generate all sizes automatically

3. Or manually copy to these folders:
   - `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` (48x48)
   - `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72)
   - `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96)
   - `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144)
   - `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192x192)

## Current Status

✅ Web icons are configured:
- Favicon: `/icon-192.ico`
- PWA icons: `/icon-192.ico` and `/icon-512.ico` (in manifest.json)
- Notification icons: `/icon-192.ico` (in app.js)

⚠️ For better Android icon support:
- Convert `.ico` files to `.png` format
- Update manifest.json to use `.png` files
- Run `npx cap sync` to sync to Android project
