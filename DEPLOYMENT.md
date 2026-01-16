# Server Deployment Guide

This guide will help you deploy the All Is Well server to Heroku or Railway's free tier.

## Prerequisites

- Node.js installed locally
- Git installed
- Account on Heroku or Railway (both have free tiers)

## Option 1: Deploy to Heroku

### Step 1: Install Heroku CLI

Download and install from: https://devcenter.heroku.com/articles/heroku-cli

### Step 2: Login to Heroku

```bash
heroku login
```

### Step 3: Create Heroku App

```bash
# From your project root directory
heroku create alliswell-server
```

This will create an app and give you a URL like: `https://alliswell-server.herokuapp.com`

### Step 4: Deploy

```bash
# Make sure all changes are committed
git add .
git commit -m "Prepare for Heroku deployment"

# Deploy to Heroku
git push heroku main
```

If your default branch is `master` instead of `main`:
```bash
git push heroku master
```

### Step 5: Update Server URL

After deployment, you'll get a URL like `https://alliswell-server.herokuapp.com`. Update these files:

1. **Update `public/config.js`**:
   ```javascript
   return 'https://alliswell-server.herokuapp.com';
   ```

2. **Update `capacitor.config.json`**:
   ```json
   "server": {
     "url": "https://alliswell-server.herokuapp.com"
   }
   ```

3. **Rebuild and sync Capacitor**:
   ```bash
   npm run cap:sync
   ```

### Step 6: Verify Deployment

Visit your Heroku URL in a browser. You should see the All Is Well app.

### Heroku Free Tier Notes

- App sleeps after 30 minutes of inactivity (free tier)
- First request after sleep may take 10-30 seconds
- 550-1000 hours/month free (varies by region)
- Consider upgrading to Hobby ($7/month) for always-on service

## Option 2: Deploy to Railway

### Step 1: Install Railway CLI (Optional)

```bash
npm i -g @railway/cli
```

Or use the web interface at: https://railway.app

### Step 2: Create Railway Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo" (recommended) or "Empty Project"

### Step 3: Configure Deployment

If using GitHub:
1. Connect your GitHub account
2. Select this repository
3. Railway will auto-detect Node.js and deploy

If using CLI:
```bash
railway login
railway init
railway up
```

### Step 4: Set Environment Variables

Railway will automatically:
- Detect `Procfile`
- Use `package.json` start script
- Assign a public URL

### Step 5: Get Your Railway URL

After deployment, Railway will provide a URL like:
`https://alliswell-server-production.up.railway.app`

### Step 6: Update Server URL

Same as Heroku steps 5-6, but use your Railway URL.

### Railway Free Tier Notes

- $5 free credit per month
- App may sleep after inactivity (depends on plan)
- Auto-deploys on git push (if connected to GitHub)

## Testing the Deployment

1. **Test Web Version**:
   - Visit your deployed URL in a browser
   - Try generating a code and connecting as tracker
   - Verify Socket.IO connections work

2. **Test Mobile App**:
   - Update server URL in `config.js` and `capacitor.config.json`
   - Run `npm run cap:sync`
   - Build and test on Android device/emulator
   - Verify connections work from mobile network

## Troubleshooting

### Server Not Starting

- Check Heroku/Railway logs:
  ```bash
  # Heroku
  heroku logs --tail
  
  # Railway
  railway logs
  ```

### Connection Issues

- Verify server URL is correct in `config.js`
- Check CORS settings in `server.js` (should allow all origins)
- Ensure Socket.IO CDN is loading in mobile app
- Check network connectivity on mobile device

### App Sleeping (Heroku Free Tier)

- First request after sleep will be slow
- Consider upgrading to Hobby plan for always-on
- Or use Railway which may have better free tier behavior

## Environment Variables

You can set environment variables if needed:

**Heroku**:
```bash
heroku config:set NODE_ENV=production
```

**Railway**:
- Use the web dashboard → Variables tab
- Or in `railway.toml` file

## Updating the Server

After making changes:

1. Commit changes:
   ```bash
   git add .
   git commit -m "Update server"
   ```

2. Deploy:
   ```bash
   # Heroku
   git push heroku main
   
   # Railway (if connected to GitHub, auto-deploys)
   # Or use: railway up
   ```

3. Update mobile app:
   - Run `npm run cap:sync` if server URL changed
   - Rebuild APK if needed

## Production Checklist

- [ ] Server deployed and accessible
- [ ] Server URL updated in `config.js`
- [ ] Server URL updated in `capacitor.config.json`
- [ ] Capacitor synced: `npm run cap:sync`
- [ ] Web version tested
- [ ] Mobile app tested
- [ ] Socket.IO connections working
- [ ] Code generation working
- [ ] Check-in functionality working
- [ ] Timer functionality working

## Support

For issues:
- Heroku: https://help.heroku.com
- Railway: https://docs.railway.app
- Check server logs for error messages
