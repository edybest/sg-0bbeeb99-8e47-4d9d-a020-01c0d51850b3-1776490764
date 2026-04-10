# 🔔 Push Notification Setup Guide

## ⚡ Quick Start (5 Minutes)

### Step 1: Generate VAPID Keys

**Option A - Online (Recommended):**
1. Visit: https://www.attheminute.com/vapid-key-generator
2. Click "Generate Keys"
3. Copy both Public and Private keys

**Option B - Command Line:**
```bash
npx web-push generate-vapid-keys
```

You will get:
```
Public Key: BKxF7cR... (87 characters)
Private Key: aBcD1234... (43 characters)
```

---

### Step 2: Add Keys to Supabase

1. **Go to Supabase Dashboard**
2. **Navigate to:** Database tab → Secrets section (or use navbar "Database" → "Secrets")
3. **Create 2 secrets:**

   **Secret 1:**
   - Name: `VAPID_PUBLIC_KEY`
   - Value: [Paste your Public Key]

   **Secret 2:**
   - Name: `VAPID_PRIVATE_KEY`
   - Value: [Paste your Private Key]

---

### Step 3: Update Frontend Code

1. **Open file:** `src/config/vapid.ts`
2. **Replace line 9:**
   ```typescript
   export const VAPID_PUBLIC_KEY = "REPLACE_WITH_YOUR_VAPID_PUBLIC_KEY";
   ```
   With:
   ```typescript
   export const VAPID_PUBLIC_KEY = "BKxF7cR..."; // Your actual public key
   ```

---

### Step 4: Test Push Notifications

1. **Deploy changes** (if on production)
2. **Open app as member** (not admin)
3. **Install PWA** (if not already installed)
4. **Click "Aktifkan Notifications"** when prompted
5. **Grant permission** when browser asks
6. **Go to Admin Panel** → Push Message
7. **Send test message**
8. **Check your device** - notification should appear!

---

## 🎯 How It Works

### Architecture

```
Admin Panel (Web)
    ↓ (sends message)
Push Message Panel
    ↓ (calls Edge Function)
Supabase Edge Function
    ↓ (fetches subscriptions from DB)
push_subscriptions table
    ↓ (sends push to each subscription)
Web Push API (Browser Service)
    ↓ (delivers notification)
Member's Device 📱
```

---

## 🔐 Security Notes

1. **Private Key:** NEVER commit to code, ONLY in Supabase secrets
2. **Public Key:** Safe to include in frontend code
3. **Subscriptions:** Encrypted in database with RLS policies
4. **Permissions:** Users must explicitly grant notification permission

---

## 🐛 Troubleshooting

### "Permission Denied"
- User needs to manually enable notifications in browser settings
- Guide: Chrome → Settings → Privacy → Site Settings → Notifications

### "Service Worker Not Found"
- Ensure `public/sw.js` exists
- Check browser console for registration errors
- Try hard refresh (Ctrl+Shift+R)

### "VAPID Key Invalid"
- Verify public key is exactly 87 characters
- No spaces or line breaks in the key
- Key format: Base64 URL-safe string

### "No Subscriptions Found"
- User needs to click "Aktifkan Notifications" in PWA card
- Check `push_subscriptions` table in database
- Verify RLS policies allow reading subscriptions

---

## 📊 Testing Checklist

- [ ] VAPID keys generated
- [ ] Keys added to Supabase secrets
- [ ] Public key updated in `src/config/vapid.ts`
- [ ] PWA installed on test device
- [ ] Notification permission granted
- [ ] Subscription saved to database (check `push_subscriptions` table)
- [ ] Test message sent from admin panel
- [ ] Notification received on device
- [ ] Notification click opens app
- [ ] Badge icon displays correctly

---

## 🎨 Customization

### Change Notification Sound
Edit `public/sw.js`:
```javascript
registration.showNotification(title, {
  // ... other options
  sound: "/custom-sound.mp3", // Add your custom sound
});
```

### Change Vibration Pattern
Edit `public/sw.js`:
```javascript
vibrate: [200, 100, 200], // [vibrate, pause, vibrate] in milliseconds
```

### Change Icon/Badge
Edit notification options in Edge Function or Service Worker:
```javascript
icon: "/custom-icon.png",
badge: "/custom-badge.png",
```

---

## 📈 Monitoring

### Check Subscription Count
```sql
SELECT COUNT(*) FROM push_subscriptions WHERE member_id IS NOT NULL;
```

### See Active Subscriptions
```sql
SELECT 
  m.username,
  ps.created_at,
  ps.updated_at
FROM push_subscriptions ps
JOIN members m ON m.id = ps.member_id
ORDER BY ps.updated_at DESC;
```

### Test Individual Subscription
Use `pushNotificationService.sendTest()` in browser console:
```javascript
import { pushNotificationService } from '@/services/pushNotificationService';
await pushNotificationService.sendTest();
```

---

## 🚀 Production Deployment

### Vercel Deployment
1. Ensure all environment variables are set
2. VAPID keys remain in Supabase (not Vercel)
3. Service Worker auto-deployed with static files
4. No additional configuration needed

### Browser Support
- ✅ Chrome/Edge (Desktop & Android)
- ✅ Firefox (Desktop & Android)
- ✅ Safari (Desktop & iOS 16.4+)
- ❌ iOS Safari < 16.4 (no support)

---

## 📞 Support

If notifications still not working after following this guide:
1. Check browser console for errors
2. Verify VAPID keys are correct (no typos)
3. Test on different browser/device
4. Check Supabase Edge Function logs
5. Contact developer for assistance

---

**Last Updated:** 2026-04-10
**Version:** 1.0.0