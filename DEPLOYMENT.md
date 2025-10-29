# 🚀 Cross Country Draft - Deployment Guide

## Overview
This guide will help you deploy your cross country draft application for ~10 users. The app is now secured with admin password protection and ready for production use.

## Security Features Implemented ✅

### 1. Admin Password Protection
- All dangerous operations require admin password:
  - Import data from TFRRS
  - Delete athletes
  - Migrate grades
  - Bulk operations

### 2. Role-Based Access
- **Admin (You)**: Full access to import, delete, and manage data
- **Regular Users (Friends)**: Can view athletes, participate in drafts, manage their teams

### 3. Rate Limiting
- 100 requests per 15 minutes per IP address
- Prevents abuse and excessive API usage

### 4. Environment Variables
- Sensitive configuration stored in `.env` file
- Not committed to version control

## Before Deployment

### 1. Set Admin Password
Create a `.env` file in the project root:

```bash
cd /Users/jack/cross-country-draft
cp .env.example .env
```

Edit `.env` and set a **strong** admin password:

```env
ADMIN_PASSWORD=your_super_secret_password_here
PORT=3001
NODE_ENV=production
```

**IMPORTANT**:
- Use a strong password (at least 16 characters, mix of letters, numbers, symbols)
- Never share this password publicly
- Don't commit `.env` file to git

### 2. Update CORS for Production
Edit `server/index.js` and update the CORS configuration for your production domain:

```javascript
// Replace this:
app.use(cors());

// With this (replace with your actual domain):
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? 'https://yourdomain.com'
    : 'http://localhost:5173'
}));
```

### 3. Update WebSocket URL
Edit `client/src/pages/DraftBoard.jsx` and `client/src/pages/DraftRoomEnhanced.jsx`:

```javascript
// Replace this:
const websocket = new WebSocket(`ws://localhost:3001/ws`);

// With this (replace with your actual domain):
const websocket = new WebSocket(
  process.env.NODE_ENV === 'production'
    ? `wss://yourdomain.com/ws`
    : `ws://localhost:3001/ws`
);
```

## Deployment Options

### Option 1: Railway.app (Recommended - Easiest)

Railway offers free tier perfect for small apps like yours.

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Initialize Project**:
   ```bash
   cd /Users/jack/cross-country-draft
   railway init
   ```

4. **Set Environment Variables**:
   ```bash
   railway variables set ADMIN_PASSWORD="your_super_secret_password"
   railway variables set NODE_ENV="production"
   ```

5. **Deploy**:
   ```bash
   railway up
   ```

6. **Get Your URL**:
   ```bash
   railway domain
   ```

Railway will automatically:
- Build your client and server
- Set up SQLite database persistence
- Provide HTTPS
- Handle WebSocket connections

### Option 2: Render.com (Also Easy)

1. Create account at https://render.com
2. Connect your GitHub repo
3. Create a "Web Service"
4. Configure:
   - **Build Command**: `npm install && npm run build --workspace=client`
   - **Start Command**: `npm run dev:server`
   - **Environment Variables**: Add `ADMIN_PASSWORD`
5. Deploy!

### Option 3: DigitalOcean App Platform

1. Create account at https://digitalocean.com
2. Create new App
3. Connect GitHub repo
4. Configure environment variables
5. Deploy

### Option 4: VPS (More Control, More Setup)

If you want to run on your own VPS (DigitalOcean, Linode, etc.):

1. **Install Node.js** on server
2. **Clone your repo**
3. **Install dependencies**: `npm install`
4. **Set up PM2** for process management:
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name xc-draft
   pm2 startup
   pm2 save
   ```
5. **Set up Nginx** as reverse proxy
6. **Get SSL certificate** with Let's Encrypt/Certbot

## Post-Deployment Checklist

### Test Everything:
- [ ] Can access the site at your domain
- [ ] Drafts page loads and works
- [ ] TV Board view works (important for projecting!)
- [ ] WebSocket updates work in real-time
- [ ] Admin password protects import page
- [ ] Friends can participate in drafts without password

### Share With Friends:
1. **Send them the URL**: `https://yourdomain.com`
2. **Tell them**: No password needed for drafting
3. **Keep admin password secret**: Only you need it for imports

## Using the App

### For You (Admin):
1. Go to Import page
2. Enter admin password at top
3. Import meets from TFRRS
4. Manage athletes, delete high schoolers, migrate grades

### For Your Friends:
1. Go to main site
2. View athletes and meets (no password needed)
3. Participate in drafts
4. View their team rosters

### During Draft Night:
1. Set up draft at `/draft/setup`
2. Start the draft
3. Open TV Board by clicking "📺 TV Board" button
4. Project TV Board on your TV (full-screen mode with F11)
5. Everyone makes picks from the regular draft room
6. TV Board updates in real-time!

## TV Board Features 🎯
The TV Board (`/draft/:id/board`) is optimized for projection:
- **Large, clean grid** showing all picks
- **Team columns** and **round rows**
- **Color-coded**:
  - Green: Completed picks
  - Orange: Current pick (on the clock)
  - Gray: Upcoming picks
- **Real-time updates** via WebSocket
- **Last pick highlight** at bottom
- **Dark theme** easy on the eyes

## Troubleshooting

### WebSocket Not Connecting
- Check CORS settings
- Ensure WebSocket URL matches your domain
- Use `wss://` for HTTPS sites, `ws://` for HTTP

### Admin Password Not Working
- Check `.env` file exists
- Restart server after changing `.env`
- Clear browser cache

### Rate Limiting Issues
If you hit the rate limit (100 req/15min):
- Wait 15 minutes
- Check for infinite loops in frontend
- Adjust limit in `server/index.js` if needed

### Database Issues
Your SQLite database is at `server/db/draft.db`:
- Backup regularly: `cp server/db/draft.db server/db/draft.db.backup`
- Don't delete this file!

## Maintenance

### Backups
```bash
# Backup database
cp server/db/draft.db backups/draft-$(date +%Y%m%d).db

# Backup weekly (add to cron)
0 0 * * 0 cp /path/to/server/db/draft.db /path/to/backups/draft-$(date +%Y%m%d).db
```

### Updates
```bash
git pull
npm install
# Restart server (method depends on hosting platform)
```

## Security Best Practices

1. **Never commit `.env` file** to git
2. **Use strong admin password** (16+ characters)
3. **Keep admin password secret** - only you need it
4. **Monitor access logs** for suspicious activity
5. **Backup database regularly**
6. **Use HTTPS** in production (most platforms provide this automatically)

## Cost Estimates

For ~10 users with moderate usage:

- **Railway.app**: Free tier should be sufficient ($0/month)
- **Render.com**: Free tier works ($0/month)
- **DigitalOcean**: $4-6/month (cheapest droplet)
- **VPS**: $5-10/month

## Support

If you run into issues:
1. Check browser console for errors
2. Check server logs
3. Verify environment variables are set
4. Test locally first before debugging production

## Summary

Your app is now secure and ready for 10 friends to use! The key features:

✅ Admin password protects dangerous operations
✅ Friends can draft without any passwords
✅ Rate limiting prevents abuse
✅ TV Board perfect for draft night
✅ Real-time WebSocket updates
✅ Professional and polished

**Ready to deploy!** 🎉
