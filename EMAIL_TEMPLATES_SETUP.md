# Email Templates Setup Guide

## Overview

The app now uses **two separate email templates**:

1. **Check-In Template** (`EMAILJS_TEMPLATE_ID_CHECKIN`) - Sent when user clicks "I'm OK"
   - Message: "All is well. Your loved one checked in."
   - Sent to both emergency contacts

2. **Alert Template** (`EMAILJS_TEMPLATE_ID_ALERT`) - Sent when 48 hours pass without check-in
   - Message: Alert that user hasn't checked in
   - Sent to both emergency contacts

## Current Configuration

In `public/app.js`, you have:

```javascript
const EMAILJS_TEMPLATE_ID_CHECKIN = 'template_6d518hr'; // Your current template
const EMAILJS_TEMPLATE_ID_ALERT = 'template_6d518hr'; // ⚠️ Update this with your alert template ID
```

## Setup Steps

### Step 1: Create Alert Template in EmailJS

1. Go to [EmailJS Dashboard](https://dashboard.emailjs.com/admin/template)
2. Click **"Create New Template"**
3. Name it: "48 Hour Alert" or "Emergency Alert"
4. Use this template:

```
To: {{to_email}}
Subject: {{subject}}

{{message}}

---
This is an automated emergency alert from the All Is Well wellness check-in app.
User: {{user_email}}
```

5. Save and copy the **Template ID** (e.g., `template_xyz789`)

### Step 2: Update app.js

Replace the alert template ID in `public/app.js`:

```javascript
const EMAILJS_TEMPLATE_ID_ALERT = 'your_alert_template_id_here';
```

### Step 3: Verify Template Variables

Both templates should use these variables:
- `{{to_email}}` - Recipient email address
- `{{subject}}` - Email subject line
- `{{message}}` - Email message body
- `{{user_email}}` - User's email (for context)

## Template Examples

### Check-In Template (Current)
```
To: {{to_email}}
Subject: All is well - Check-in notification

All is well. Your loved one checked in.

---
All Is Well App
User: {{user_email}}
```

### Alert Template (New - Create This)
```
To: {{to_email}}
Subject: All is not well - Check-in overdue

{{message}}

This is an automated emergency alert. Please check on your loved one immediately.

---
All Is Well App
User: {{user_email}}
```

## Spam Prevention

The app now includes spam prevention:

- **Check-In Cooldown**: 5 minutes between check-ins (prevents rapid clicking)
- **48h Alert Cooldown**: 1 hour between 48h alerts (prevents multiple emergency emails)

Users will see a message if they try to check in too frequently.

## Testing

1. **Test Check-In Email**:
   - Click "I'm OK" button
   - Should send "All is well" email using check-in template
   - Timer should reset to 48:00:00

2. **Test Alert Email** (simulate):
   - Manually set `LAST_CHECK_IN` in localStorage to 48+ hours ago
   - Refresh page
   - Should trigger 48h alert using alert template

## Troubleshooting

### Both templates using same ID?
- Make sure you've created a separate template in EmailJS
- Update `EMAILJS_TEMPLATE_ID_ALERT` with the new template ID

### Timer not resetting?
- Check browser console for errors
- Verify `startTimer()` is called after check-in
- Clear localStorage and try again

### Emails not sending?
- Check EmailJS dashboard → Logs
- Verify both template IDs are correct
- Check template variables match
