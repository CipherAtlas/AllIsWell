# Railway Deployment Guide

This guide will help you deploy the All Is Well server to Railway.

## Prerequisites

- Node.js installed locally
- Git installed
- Railway account (sign up at https://railway.app - free tier available)

## Quick Start (Web Interface - Recommended)

### Step 1: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub (recommended) or email
3. Verify your email if needed

### Step 2: Create New Project

1. Click "New Project" in Railway dashboard
2. Select "Deploy from GitHub repo"
3. Authorize Railway to access your GitHub if prompted
4. Select your `AllIsWell` repository
5. Railway will automatically detect it's a Node.js project

### Step 3: Configure Deployment

Railway will automatically:
- Detect `package.json`
- Use the `start` script (`node server.js`)
- Install dependencies
- Deploy your app

### Step 4: Get Your Railway URL

1. After deployment, Railway will provide a public URL
2. Click on your service → Settings → Generate Domain
3. You'll get a URL like: `https://all-is-well-production.up.railway.app`
4. Copy this URL - you'll need it in the next step

### Step 5: Update Server URL in Code

1. **Update `public/config.js`**:
   ```javascript
   return 'https://your-actual-railway-url.up.railway.app';
   ```
   Replace with your actual Railway URL.

2. **Update `capacitor.config.json`**:
   ```json
   "server": {
     "url": "https://your-actual-railway-url.up.railway.app"
   }
   ```

3. **Commit and push changes**:
   ```bash
   git add .
   git commit -m "Update server URL for Railway"
   git push
   ```
   Railway will automatically redeploy.

### Step 6: Sync Capacitor

```bash
npm run cap:sync
```

## Alternative: Railway CLI

If you prefer using the CLI:

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

### Step 2: Login

```bash
railway login
```

### Step 3: Initialize Project

```bash
# From your project root
railway init
```

### Step 4: Deploy

```bash
railway up
```

### Step 5: Get URL

```bash
railway domain
```

Or check the Railway dashboard for your URL.

## Environment Variables (Optional)

Railway automatically provides:
- `PORT` - Port to listen on (Railway sets this automatically)
- `NODE_ENV` - Set to "production" in Railway

You can add custom environment variables in Railway dashboard:
1. Go to your service → Variables
2. Add any variables you need
3. They'll be available as `process.env.VARIABLE_NAME`

## Monitoring and Logs

### View Logs

**Web Interface:**
1. Go to your service in Railway dashboard
2. Click on "Deployments" tab
3. Click on a deployment to see logs

**CLI:**
```bash
railway logs
```

### View Metrics

Railway dashboard shows:
- CPU usage
- Memory usage
- Network traffic
- Request metrics

## Updating Your Deployment

### Automatic (Recommended)

If you connected Railway to GitHub:
1. Make changes to your code
2. Commit and push to GitHub
3. Railway automatically detects changes and redeploys

### Manual

**Using CLI:**
```bash
railway up
```

**Using Web Interface:**
1. Go to your service
2. Click "Redeploy" button

## Railway Free Tier

- **$5 free credit per month**
- Pay-as-you-go pricing after free credit
- No credit card required for free tier
- Apps may sleep after inactivity (depends on usage)
- Auto-wakes on first request

## Troubleshooting

### Deployment Fails

1. **Check logs**:
   ```bash
   railway logs
   ```
   Or view in Railway dashboard

2. **Verify package.json**:
   - Ensure `start` script exists
   - Check dependencies are correct

3. **Check Node.js version**:
   Railway auto-detects, but you can specify in `package.json`:
   ```json
   "engines": {
     "node": "18.x"
   }
   ```

### Connection Issues

1. **Verify server URL**:
   - Check `public/config.js` has correct Railway URL
   - Check `capacitor.config.json` has correct URL
   - URLs should match exactly

2. **Test in browser**:
   - Visit your Railway URL directly
   - Should see the All Is Well app

3. **Check CORS**:
   - Server already configured to allow all origins
   - Should work from mobile app

### App Not Responding

1. **Check if app is sleeping**:
   - First request after inactivity may be slow
   - Subsequent requests should be fast

2. **View metrics**:
   - Check CPU/Memory usage in Railway dashboard
   - May need to upgrade if hitting limits

## Production Checklist

- [ ] Railway account created
- [ ] Project deployed to Railway
- [ ] Railway URL obtained
- [ ] Server URL updated in `config.js`
- [ ] Server URL updated in `capacitor.config.json`
- [ ] Changes committed and pushed
- [ ] Railway auto-redeployed
- [ ] Web version tested at Railway URL
- [ ] Capacitor synced: `npm run cap:sync`
- [ ] Mobile app tested
- [ ] Socket.IO connections working
- [ ] Code generation working
- [ ] Check-in functionality working

## Next Steps

After successful deployment:

1. Test the web version at your Railway URL
2. Update mobile app with new server URL
3. Test mobile app connections
4. Monitor Railway dashboard for any issues
5. Set up custom domain (optional, paid feature)

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Check Railway dashboard for service status
