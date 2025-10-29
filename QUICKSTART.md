# Quick Start Guide

Get your Cross Country Draft app running in 3 steps!

## Step 1: Install Dependencies

```bash
cd cross-country-draft
npm install
npm install --workspace=server
npm install --workspace=client
```

## Step 2: Initialize Database

```bash
cd server
npm run init-db
cd ..
```

This creates a SQLite database with sample athletes including:
- Top NCAA cross country runners
- Both men's and women's divisions
- PR times and rankings

## Step 3: Start the App

```bash
npm run dev
```

The app will open at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Try It Out!

1. Click "Create New Draft" on the home page
2. Name your draft (e.g., "Friends League 2024")
3. Add at least 2 teams with names and owners
4. Click "Create Draft"
5. Click "Start Draft" to begin
6. Select an athlete from the list and click "Draft [name]"
7. Watch the draft progress in real-time!

## What's Next?

- Browse athletes at http://localhost:3000/athletes
- Add your own athletes with the "+ Add Athlete" button
- Create meets to track race results
- View team rosters and standings

## Need Help?

Check the full README.md for:
- Complete API documentation
- Database schema details
- Feature explanations
- Development guide

Enjoy your draft!
