# Background Service Setup

## ✅ What's Implemented

The app now has **24/7 background monitoring** on Android devices:

### 1. **CheckInMonitorService** (Foreground Service)
- Runs continuously in the background
- Monitors check-in status every hour
- Automatically restarts if killed by the system
- Uses `START_STICKY` to ensure persistence

### 2. **AlarmManager Integration**
- Schedules hourly checks using Android's AlarmManager
- Uses `setExactAndAllowWhileIdle()` for reliable scheduling (Android 6.0+)
- Works even when the app is closed or device is in Doze mode

### 3. **Boot Receiver**
- Automatically starts the service after device reboot
- Ensures monitoring continues after power cycles

### 4. **Data Synchronization**
- JavaScript `localStorage` syncs with Android `SharedPreferences`
- Native service can access check-in timestamps
- WebView and native service share the same data

## 🔧 How It Works

1. **On App Launch**: `MainActivity` starts `CheckInMonitorService`
2. **Service Lifecycle**: Service runs continuously, checking every hour
3. **Alarm Scheduling**: AlarmManager triggers hourly checks
4. **Data Sync**: Service reads from SharedPreferences (synced from localStorage)
5. **Alert Triggering**: When overdue, service triggers JavaScript checks via broadcast

## 📱 Battery Optimization

**Important**: Users need to disable battery optimization for the app:

### Manual Steps (User):
1. Settings → Apps → All Is Well
2. Battery → Unrestricted
3. Or: Settings → Battery → Battery Optimization → All Is Well → Don't Optimize

### Programmatic (Optional):
The app requests battery optimization exemption, but users may need to manually approve it.

## 🚨 Permissions Required

All permissions are already added to `AndroidManifest.xml`:
- `WAKE_LOCK` - Keep device awake for checks
- `RECEIVE_BOOT_COMPLETED` - Restart after reboot
- `FOREGROUND_SERVICE` - Run service in foreground
- `FOREGROUND_SERVICE_DATA_SYNC` - Data sync service type
- `POST_NOTIFICATIONS` - Show alerts
- `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` - Request battery exemption

## 🔍 Testing Background Service

### Test 1: Service Persistence
1. Open app
2. Check-in
3. Close app completely
4. Wait 1 hour
5. Service should trigger check (check logs)

### Test 2: Reboot Persistence
1. Check-in
2. Restart device
3. Service should auto-start
4. Monitoring continues

### Test 3: Battery Optimization
1. Enable battery optimization for app
2. Service may be delayed
3. Disable optimization
4. Service should run reliably

## 📊 Monitoring

Check Android logs for service activity:
```bash
adb logcat | grep CheckInMonitor
```

You should see:
- `CheckInMonitorService created`
- `CheckInMonitorService started`
- `Alarms scheduled`
- `Hours since check-in: X`

## ⚠️ Limitations

1. **Battery Optimization**: Android may still delay checks if battery optimization is enabled
2. **Doze Mode**: Very aggressive battery saving may delay alarms
3. **App Uninstall**: Service stops if app is uninstalled
4. **Force Stop**: If user force-stops app, service won't restart until app is opened

## 🎯 Best Practices for Users

1. **Disable Battery Optimization** (most important)
2. **Keep App Installed** (don't uninstall)
3. **Don't Force Stop** the app
4. **Allow Notifications** for alerts

## 🔄 Service Restart Behavior

- **Normal Close**: Service restarts automatically (START_STICKY)
- **System Kill**: Service restarts automatically (START_STICKY)
- **Force Stop**: Service won't restart until app is opened
- **Reboot**: BootReceiver restarts service

## 📝 Code Locations

- **Service**: `android/app/src/main/java/com/alliswell/app/CheckInMonitorService.java`
- **Alarm Receiver**: `android/app/src/main/java/com/alliswell/app/CheckInAlarmReceiver.java`
- **Boot Receiver**: `android/app/src/main/java/com/alliswell/app/BootReceiver.java`
- **Main Activity**: `android/app/src/main/java/com/alliswell/app/MainActivity.java`
- **Manifest**: `android/app/src/main/AndroidManifest.xml`
- **JavaScript Sync**: `public/app.js` (syncWithNativeService function)
