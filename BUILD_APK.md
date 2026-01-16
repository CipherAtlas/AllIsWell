# Building Android APK - All Is Well

Complete guide to build an Android APK from your web app.

## Prerequisites

1. **Node.js** (v18 or higher) - Already installed ✅
2. **Java JDK 17** - Download from [Oracle](https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html) or [OpenJDK](https://adoptium.net/)
3. **Android Studio** - Download from [developer.android.com](https://developer.android.com/studio)
4. **Android SDK** - Installed via Android Studio

## Step 1: Install Capacitor

```bash
npm install
```

This installs Capacitor CLI and Android plugin.

## Step 2: Initialize Capacitor (First Time Only)

```bash
# Add Android platform
npm run cap:add

# Sync web files to Android project
npm run cap:sync
```

## Step 3: Open in Android Studio

```bash
npm run cap:open
```

This opens Android Studio with your project.

## Step 4: Build APK in Android Studio

### Option A: Build Debug APK (For Testing)

1. In Android Studio, go to **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Wait for build to complete
3. Click **locate** in the notification
4. APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`

### Option B: Build Release APK (For Distribution)

1. **Generate Keystore** (first time only):
   ```bash
   keytool -genkey -v -keystore alliswell-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias alliswell
   ```
   - Remember the password and alias name!

2. **Configure signing**:
   - Create `android/key.properties`:
   ```
   storePassword=YOUR_KEYSTORE_PASSWORD
   keyPassword=YOUR_KEY_PASSWORD
   keyAlias=alliswell
   storeFile=../alliswell-release-key.jks
   ```

3. **Update build.gradle**:
   - Open `android/app/build.gradle`
   - Add before `android {` block:
   ```gradle
   def keystoreProperties = new Properties()
   def keystorePropertiesFile = rootProject.file('key.properties')
   if (keystorePropertiesFile.exists()) {
       keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
   }
   ```
   - Inside `android {` block, add:
   ```gradle
   signingConfigs {
       release {
           keyAlias keystoreProperties['keyAlias']
           keyPassword keystoreProperties['keyPassword']
           storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
           storePassword keystoreProperties['storePassword']
       }
   }
   buildTypes {
       release {
           signingConfig signingConfigs.release
       }
   }
   ```

4. **Build Release APK**:
   - In Android Studio: **Build** → **Generate Signed Bundle / APK**
   - Select **APK**
   - Choose your keystore
   - Build variant: **release**
   - APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

## Step 5: Install APK on Device

### Via USB (Debugging Enabled)
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Via File Transfer
1. Copy APK to your Android device
2. Open file manager on device
3. Tap the APK file
4. Allow installation from unknown sources if prompted
5. Install

## Quick Build Commands

```bash
# Sync web files to Android (run after any code changes)
npm run cap:sync

# Open Android Studio
npm run cap:open

# Build debug APK (from Android Studio or command line)
cd android && ./gradlew assembleDebug
```

## Troubleshooting

### "Command not found: cap"
- Run: `npm install -g @capacitor/cli`

### "SDK location not found"
- Open Android Studio
- Go to **File** → **Project Structure** → **SDK Location**
- Copy the Android SDK path
- Set environment variable: `ANDROID_HOME`

### "Gradle build failed"
- Open Android Studio
- Let it sync and download dependencies
- Try building again

### "Web files not updating"
- Run: `npm run cap:sync`
- Rebuild APK

## APK File Locations

- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK**: `android/app/build/outputs/apk/release/app-release.apk`

## Next Steps After Building

1. **Test on device** - Install and test all features
2. **Optimize** - Use Android Studio's APK Analyzer
3. **Distribute** - Upload to Google Play Store (requires Play Console account)

## Notes

- Debug APKs are signed with a debug certificate (not for distribution)
- Release APKs require a keystore (keep it safe!)
- APK size: ~5-10 MB (includes WebView)
- Works offline after first load
- All data stored locally (localStorage)

## Support

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Android Developer Guide](https://developer.android.com/guide)
