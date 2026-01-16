# Setup Guide - All Is Well

Complete setup instructions for the local-first wellness check-in app.

## Prerequisites

- A web browser (Chrome, Firefox, Safari, Edge)
- An EmailJS account (free)
- A static file server (for local testing) or free hosting

## Step 1: Set Up EmailJS (5 minutes)

### 1.1 Create EmailJS Account

1. Go to [emailjs.com](https://www.emailjs.com)
2. Click "Sign Up" (free account)
3. Verify your email

### 1.2 Create Email Service

1. In EmailJS dashboard, go to **Email Services**
2. Click **"Add New Service"**
3. Choose your email provider:
   - **Gmail** (recommended - easy setup)
   - **Outlook**
   - **Custom SMTP**
4. Follow the setup instructions for your provider
5. Note your **Service ID** (e.g., `service_abc123`)

### 1.3 Create Email Template

1. Go to **Email Templates**
2. Click **"Create New Template"**
3. Use this template:

```
To: {{to_email}}
Subject: {{subject}}

{{message}}

---
This is an automated message from the All Is Well wellness check-in app.
User: {{user_email}}
```

4. Save and note your **Template ID** (e.g., `template_xyz789`)

### 1.4 Get Public Key

1. Go to **Account** → **General**
2. Copy your **Public Key** (e.g., `abcdefghijklmnop`)

## Step 2: Configure the App

1. Open `public/app.js`
2. Find these lines at the top:

```javascript
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
```

3. Replace with your actual values:

```javascript
const EMAILJS_SERVICE_ID = 'service_abc123';
const EMAILJS_TEMPLATE_ID = 'template_xyz789';
const EMAILJS_PUBLIC_KEY = 'abcdefghijklmnop';
```

4. Save the file

## Step 3: Test Locally

### Option A: Using npm (Recommended)

```bash
# Install dependencies
npm install

# Start server
npm run serve
```

Visit: `http://localhost:8080`

### Option B: Using Python

```bash
cd public
python -m http.server 8080
```

Visit: `http://localhost:8080`

### Option C: Using Node.js http-server

```bash
npx http-server public -p 8080
```

Visit: `http://localhost:8080`

## Step 4: Test the App

1. Open the app in your browser
2. Enter your email and 2 emergency contact emails
3. Click "Save Contacts"
4. Click "I'm OK" button
5. Check your emergency contacts' email inboxes!

## Step 5: Deploy (Optional)

### GitHub Pages (Free)

1. Create a new GitHub repository
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/all-is-well.git
   git push -u origin main
   ```
3. Go to repository Settings → Pages
4. Select source: `main` branch, `/public` folder
5. Your app will be live at: `https://yourusername.github.io/all-is-well/`

### Netlify (Free)

1. Go to [netlify.com](https://netlify.com)
2. Drag and drop the `public` folder
3. Your app is live instantly!

### Vercel (Free)

```bash
npm i -g vercel
vercel --prod
```

## Troubleshooting

### "EmailJS not configured" Error

- Make sure you've updated the three constants in `app.js`
- Check for typos in Service ID, Template ID, or Public Key
- Verify your EmailJS account is active

### Emails Not Sending

1. Check EmailJS dashboard → **Logs** for errors
2. Verify your email service is connected
3. Check template variables match: `{{to_email}}`, `{{subject}}`, `{{message}}`, `{{user_email}}`
4. Ensure you haven't exceeded free tier (200 emails/month)

### Service Worker Not Registering

- Service workers require HTTPS (or localhost)
- Clear browser cache
- Check browser console for errors
- Some browsers block service workers in private mode

### Timer Not Working

- Check browser console for JavaScript errors
- Ensure localStorage is enabled
- Try clearing localStorage and setting up again

## Alternative: Use Resend Instead of EmailJS

If you prefer Resend (3000 emails/month free):

1. Sign up at [resend.com](https://resend.com)
2. Get your API key
3. Update `app.js` to use Resend API instead of EmailJS

Example Resend integration:
```javascript
async function sendEmail(to, subject, message) {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
            from: 'All Is Well <noreply@yourdomain.com>',
            to: [to],
            subject: subject,
            html: `<p>${message}</p>`
        })
    });
    return response.json();
}
```

## Next Steps

- Customize the UI in `styles.css`
- Add more features to `app.js`
- Convert to mobile app (see README.md)
- Set up custom domain (optional)

## Support

- EmailJS Docs: https://www.emailjs.com/docs/
- Service Worker Guide: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- PWA Guide: https://web.dev/progressive-web-apps/
