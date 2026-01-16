# Quick Start - 5 Minutes

Get your wellness check-in app running in 5 minutes!

## Step 1: EmailJS Setup (3 minutes)

1. **Sign up**: [emailjs.com](https://www.emailjs.com) (free)
2. **Create Service**: Email Services → Add New → Gmail
3. **Create Template**: Use this template:

```
To: {{to_email}}
Subject: {{subject}}

{{message}}

---
All Is Well App
User: {{user_email}}
```

4. **Copy IDs**: Service ID, Template ID, and Public Key

## Step 2: Configure App (1 minute)

Open `public/app.js` and replace:

```javascript
const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
```

With your actual values from EmailJS.

## Step 3: Run (1 minute)

```bash
npm install
npm run serve
```

Visit: `http://localhost:8080`

## Done! 🎉

1. Enter your email and 2 emergency contacts
2. Click "I'm OK"
3. Check email inboxes!

## Deploy (Optional)

**Netlify**: Drag `public` folder to [netlify.com](https://netlify.com)

**GitHub Pages**: Push to GitHub, enable Pages

**Vercel**: `vercel --prod`

That's it! 100% free, no backend needed.
