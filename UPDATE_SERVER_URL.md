# Quick Guide: Updating Server URL

After deploying your server to Heroku or Railway, you need to update the server URL in two places:

## 1. Update `public/config.js`

Find this line:
```javascript
return 'https://your-server-url.herokuapp.com';
```

Replace with your actual server URL:
```javascript
return 'https://alliswell-server.herokuapp.com';  // Your actual URL
```

## 2. Update `capacitor.config.json`

Find this section:
```json
"server": {
  "url": "https://your-server-url.herokuapp.com"
}
```

Replace with your actual server URL:
```json
"server": {
  "url": "https://alliswell-server.herokuapp.com"  // Your actual URL
}
```

## 3. Sync Capacitor

After updating the URLs, run:
```bash
npm run cap:sync
```

## 4. Rebuild APK (if needed)

If you've already built the APK, rebuild it:
```bash
npm run cap:build
```

## Testing

1. Test in browser: Visit your server URL
2. Test in mobile app: Build and test the app
3. Verify connections work from both web and mobile

## Notes

- The server URL in `config.js` is used at runtime by the JavaScript code
- The server URL in `capacitor.config.json` is used by Capacitor for the mobile app
- Both should match your deployed server URL
