# Build APK - Quick Steps

## ✅ Everything is Ready!

Icons are in place, Capacitor is synced. Now let's build the APK!

## Step 1: Open Android Studio

Run this command:
```bash
npx cap open android
```

This will:
- Open Android Studio
- Load your Android project
- Start Gradle sync (may take a few minutes first time)

## Step 2: Wait for Gradle Sync

- Look at the bottom status bar in Android Studio
- Wait for "Gradle sync finished" message
- This downloads dependencies (first time only - 5-10 minutes)

## Step 3: Build the APK

### In Android Studio:

1. Click **Build** in the top menu
2. Select **Build Bundle(s) / APK(s)**
3. Click **Build APK(s)**
4. Wait for build to complete (check bottom status bar)
5. When done, click **locate** in the notification popup

### Your APK Location:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

## Step 4: Install on Your Phone

1. **Copy APK to phone** (USB, email, or cloud storage)
2. **On phone**: Open file manager
3. **Tap the APK file**
4. **Allow** "Install from unknown sources" if asked
5. **Tap Install**
6. **Done!** 🎉

## Alternative: Command Line Build

If you prefer terminal:

```bash
cd android
./gradlew assembleDebug
```

Then find APK at: `android/app/build/outputs/apk/debug/app-debug.apk`

## Troubleshooting

### "Android Studio not installed"
- Download: https://developer.android.com/studio
- Install and open it once
- Then run `npx cap open android`

### "Gradle sync failed"
- Check internet connection
- Wait for sync to complete
- Try: **File** → **Invalidate Caches** → **Invalidate and Restart**

### "Build failed - SDK not found"
- In Android Studio: **File** → **Project Structure** → **SDK Location**
- Make sure Android SDK path is set
- Android Studio usually does this automatically

### "Build successful but can't find APK"
- Look in: `android/app/build/outputs/apk/debug/`
- File name: `app-debug.apk`

## What You Get

- ✅ Native Android app
- ✅ All features from web version
- ✅ Works offline
- ✅ Install on any Android device
- ✅ No app store needed

## Next: Test Your App!

1. Install APK on your phone
2. Test check-in functionality
3. Verify emails are sent
4. Check timer works
5. Test offline mode

## For Release Build

See `BUILD_APK.md` for instructions on creating a signed release APK for distribution.

---

**Ready? Run:** `npx cap open android`
