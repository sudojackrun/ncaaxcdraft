# 🏃 Cross Country Draft - Quick Start

## First Time Setup

### 1. Set Admin Password

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and set your admin password
# Change ADMIN_PASSWORD=changeme123 to something secure!
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

This will start both the backend (port 3001) and frontend (port 5173).

### 4. Access the App

- **Main App**: http://localhost:5173
- **API**: http://localhost:3001

## Using the App

### Import Data (Admin Only)
1. Go to **Import** page
2. Enter your admin password at the top
3. Paste a TFRRS meet URL and click Import
4. Athletes and results will be automatically imported

### Create a Draft
1. Go to **Home** page
2. Click "Create New Draft"
3. Add teams and configure draft settings
4. Click "Start Draft" when ready

### Draft Night - TV Board 📺
1. Once draft is started, click **"📺 TV Board"** button
2. Opens in new tab - perfect for projecting on TV
3. Shows all picks in a large, clean grid
4. Updates in real-time as picks are made
5. Press F11 for full-screen mode

### Regular Users (No Password Needed)
Friends can:
- View athletes
- Participate in drafts
- View their team rosters
- See live race results

No admin password needed for these features!

## Admin Features (Password Required)

- ✅ Import meets from TFRRS
- ✅ Delete athletes
- ✅ Migrate grades
- ✅ Bulk operations

## Project Structure

```
cross-country-draft/
├── client/           # React frontend
│   ├── src/
│   │   ├── pages/    # Page components
│   │   │   ├── DraftBoard.jsx        # NEW: TV-optimized draft board
│   │   │   ├── DraftRoomEnhanced.jsx # Regular draft interface
│   │   │   ├── Athletes.jsx          # Athlete management
│   │   │   └── ImportDataImproved.jsx # Data import
│   │   └── components/
│   └── public/
├── server/           # Express backend
│   ├── routes/       # API endpoints
│   ├── db/          # SQLite database
│   ├── utils/       # TFRRS scraper, etc.
│   └── middleware/  # Admin auth middleware
└── .env             # Environment variables (create this!)
```

## Development Tips

### Database Location
`server/db/draft.db` - This is your SQLite database. Backup regularly!

### Admin Password
Set in `.env` file:
```
ADMIN_PASSWORD=your_secure_password_here
```

### WebSocket for Real-Time Updates
The app uses WebSockets for live draft updates. Both DraftRoom and DraftBoard update automatically when picks are made.

## Ready for Production?

See **DEPLOYMENT.md** for full deployment guide!

## Common Tasks

### Backup Database
```bash
cp server/db/draft.db backups/draft-backup-$(date +%Y%m%d).db
```

### Reset Database (CAUTION!)
```bash
rm server/db/draft.db
# Database will be recreated on next server start
```

### Check Server Logs
Server logs appear in the terminal where you ran `npm run dev`

## Security Notes

- Admin password protects all dangerous operations
- Rate limiting: 100 requests per 15 minutes per IP
- Regular users don't need passwords for drafting
- Never commit `.env` file to git

## Features

✨ **Core Features**:
- Import NCAA D1 XC meet results from TFRRS
- Automatic athlete profile creation with PRs
- Snake draft with auto-draft timer
- Real-time WebSocket updates
- Live race tracking integration

📺 **TV Board** (NEW!):
- Large, clean grid view of all draft picks
- Perfect for projecting during draft night
- Real-time updates
- Dark theme with color-coded picks

🔒 **Security**:
- Admin password protection
- Rate limiting
- Role-based access control

🎯 **For Your Friends**:
- No login required
- Just share the URL
- They can participate in drafts immediately

## Questions?

Check the **DEPLOYMENT.md** file for more details!
