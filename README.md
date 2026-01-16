# All Is Well - Wellness Check-In App

A **100% free, local-first** wellness check-in application that sends email alerts to emergency contacts if you don't check in within 48 hours.

## ✨ Features

- ✅ **100% Free** - No backend, no billing, no costs
- ✅ **Local-First** - All data stored on your device (privacy-focused)
- ✅ **Offline Support** - Works without internet connection
- ✅ **Beautiful Modern UI** - Clean, polished interface with smooth animations
- ✅ **Android APK Ready** - Build native Android app with Capacitor
- ✅ **PWA Ready** - Install as an app on your phone/desktop
- ✅ **Simple Setup** - Just configure EmailJS (free tier: 200 emails/month)
- ✅ **Automatic Reminders** - 24h reminder to you, 48h alert to contacts
- ✅ **Mobile-Ready** - Works perfectly on mobile devices

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│     Browser/Phone App (Client)     │
├─────────────────────────────────────┤
│  • localStorage (data storage)     │
│  • Service Worker (background)      │
│  • EmailJS API (send emails)        │
│  • Browser Alarms (scheduled)       │
└─────────────────────────────────────┘
           ↓
    EmailJS API (free)
    or Resend API (free)
```

**No backend required!** Everything runs in the browser.

## 🚀 Quick Start

### 1. Set Up EmailJS (Free)

1. Sign up at [emailjs.com](https://www.emailjs.com) (free: 200 emails/month)
2. Create an Email Service (Gmail, Outlook, etc.)
3. Create an Email Template
4. Get your Service ID, Template ID, and Public Key
5. Update `public/app.js` with your EmailJS credentials:

```javascript
const EMAILJS_SERVICE_ID = 'your_service_id';
const EMAILJS_TEMPLATE_ID = 'your_template_id';
const EMAILJS_PUBLIC_KEY = 'your_public_key';
```

### 2. Run Locally

```bash
# Install dependencies (optional - just for local server)
npm install

# Start local server
npm run serve

# Or use any static file server
npx http-server public -p 8080
```

### 3. Deploy (Free Hosting Options)

**GitHub Pages:**
```bash
# Push to GitHub, enable Pages in repo settings
# Point to /public directory
```

**Netlify:**
```bash
# Drag and drop the public folder to netlify.com
# Or connect GitHub repo
```

**Vercel:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## 📱 Build Android APK

The app is ready to build as an Android APK!

### Quick Build (3 Steps)

1. **Sync files**: `npx cap sync`
2. **Open Android Studio**: `npx cap open android`
3. **Build APK**: In Android Studio → Build → Build APK(s)

See `QUICK_BUILD.md` for detailed instructions or `BUILD_APK.md` for complete guide.

### What You Get

- Native Android app (.apk file)
- Works offline after first load
- All features from web version
- Install on any Android device
- No app store required (sideload)

### Alternative: PWA

- Already works as PWA!
- Users can "Add to Home Screen"
- Works offline with Service Worker
- No build process needed

## 📋 EmailJS Template Setup

Your EmailJS template should include these variables:

- `{{to_email}}` - Recipient email
- `{{subject}}` - Email subject
- `{{message}}` - Email message
- `{{user_email}}` - User's email (for context)

Example template:
```
To: {{to_email}}
Subject: {{subject}}

{{message}}

---
Sent from All Is Well wellness check-in app
User: {{user_email}}
```

## 🔧 Configuration

All configuration is in `public/app.js`:

- **EmailJS Credentials** - Set your Service ID, Template ID, and Public Key
- **Storage Keys** - localStorage keys (can customize if needed)

## 📦 Project Structure

```
AllIsWell/
├── public/
│   ├── index.html        # Main HTML
│   ├── app.js            # Main application logic
│   ├── styles.css        # Styling
│   ├── sw.js             # Service Worker (background tasks)
│   └── manifest.json      # PWA manifest
├── package.json          # Dependencies (minimal)
└── README.md            # This file
```

## 🎯 How It Works

1. **User Setup**: Enter your email and 2 emergency contacts
2. **Check-In**: Click "I'm OK" button
   - Saves timestamp to localStorage
   - Sends "All is well" emails to both contacts via EmailJS
   - Resets 48-hour timer
3. **Automatic Checks**:
   - Service Worker checks every hour
   - Browser Alarms API schedules reminders
   - After 24h: Sends reminder to user
   - After 48h: Sends alert to emergency contacts

## 🔒 Privacy & Security

- ✅ All data stored locally on your device
- ✅ No backend servers
- ✅ No data collection
- ✅ Emails sent directly via EmailJS (no server logs)
- ✅ Works completely offline

## 💰 Cost Breakdown

- **Hosting**: Free (GitHub Pages, Netlify, Vercel)
- **Email Service**: Free (EmailJS: 200/month, Resend: 3000/month)
- **Storage**: Free (localStorage - unlimited)
- **Total Cost**: $0.00

## 🆘 Troubleshooting

### Emails Not Sending
- Check EmailJS configuration in `app.js`
- Verify EmailJS template has correct variables
- Check EmailJS dashboard for errors

### Timer Not Updating
- Check browser console for errors
- Ensure localStorage is enabled
- Refresh the page

### Service Worker Not Working
- Check browser console
- Verify HTTPS (required for service workers)
- Clear cache and reload

## 📚 Resources

- [EmailJS Documentation](https://www.emailjs.com/docs/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Guide](https://web.dev/progressive-web-apps/)

## 📄 License

MIT License - Free to use and modify

## 🙏 Credits

Built with ❤️ for keeping loved ones safe.
