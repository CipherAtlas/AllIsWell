# Quick APK Build Guide

## Prerequisites (One-Time Setup)

1. **Install Android Studio**: https://developer.android.com/studio
2. **Install Java JDK 17**: Comes with Android Studio or download separately
3. **Set up Android SDK**: Android Studio will do this automatically

## Build APK (3 Steps)

### Step 1: Sync Web Files
```bash
npx cap sync
```

### Step 2: Open in Android Studio
```bash
npx cap open android
```

### Step 3: Build APK
In Android Studio:
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Wait for build
3. Click **locate** in notification
4. APK is ready at: `android/app/build/outputs/apk/debug/app-debug.apk`

## Install on Phone

1. Copy APK to your Android phone
2. Open file manager
3. Tap APK file
4. Allow "Install from unknown sources" if prompted
5. Install!

## That's It! 🎉

Your app is now an Android APK!

For release builds and signing, see `BUILD_APK.md`
