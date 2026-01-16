# Railway Quick Start Guide

Your project is now ready for Railway deployment! Follow these steps:

## Step 1: Push to GitHub (Required for Auto-Deploy)

Railway works best when connected to a GitHub repository. If you haven't already:

1. **Create a GitHub repository**:
   - Go to https://github.com/new
   - Name it (e.g., `AllIsWell`)
   - Don't initialize with README (we already have files)
   - Click "Create repository"

2. **Connect your local repo to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/AllIsWell.git
   git branch -M main
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` with your GitHub username.

## Step 2: Deploy to Railway

### Option A: Web Interface (Easiest)

1. Go to https://railway.app
2. Sign up/Login (use GitHub for easy connection)
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Select your `AllIsWell` repository
6. Railway will automatically:
   - Detect Node.js
   - Install dependencies
   - Deploy using `npm start`

### Option B: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize (from project root)
railway init

# Deploy
railway up
```

## Step 3: Get Your Railway URL

After deployment:

1. Go to your service in Railway dashboard
2. Click "Settings" → "Generate Domain"
3. Copy your URL (e.g., `https://all-is-well-production.up.railway.app`)

## Step 4: Update Server URL

Update these two files with your Railway URL:

1. **`public/config.js`** (line 20):
   ```javascript
   return 'https://your-actual-railway-url.up.railway.app';
   ```

2. **`capacitor.config.json`** (line 7):
   ```json
   "server": {
     "url": "https://your-actual-railway-url.up.railway.app"
   }
   ```

3. **Commit and push**:
   ```bash
   git add public/config.js capacitor.config.json
   git commit -m "Update server URL for Railway"
   git push
   ```
   Railway will auto-redeploy!

## Step 5: Sync Mobile App

```bash
npm run cap:sync
```

## Step 6: Test

1. Visit your Railway URL in a browser
2. Test code generation and connection
3. Test mobile app
4. Verify Socket.IO connections work

## Troubleshooting

- **Can't connect?** Check that server URL matches exactly in both files
- **Deployment fails?** Check Railway logs in dashboard
- **Need help?** See `RAILWAY_DEPLOYMENT.md` for detailed guide

## What's Already Configured

✅ Git repository initialized  
✅ Railway configuration (`railway.json`)  
✅ Server configured for production  
✅ Socket.IO CDN setup for mobile  
✅ Environment-based server URL detection  
✅ All necessary files committed  

You're ready to deploy! 🚀
