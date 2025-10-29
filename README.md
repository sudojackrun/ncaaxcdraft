# Cross Country Draft

A full-stack fantasy draft application for cross country running. Draft your favorite runners, track their performances in real meets, and compete with friends!

## Features

- **Snake Draft System**: Fair draft order that reverses each round
- **Live Draft Room**: Real-time updates via WebSocket during the draft
- **Athlete Database**: Browse and search cross country runners with stats
- **TFRRS Data Import**: Import real NCAA D1 cross country results from TFRRS.org
- **Meet Management**: Track race results and performances
- **Team Rosters**: View your team and drafted athletes
- **Live Scoring**: Calculate team scores based on actual race results
- **2025 Championship Ready**: Pre-configured to import 2024-2025 season data

## Tech Stack

### Backend
- Node.js with Express
- SQLite database (better-sqlite3)
- WebSocket support for live draft updates
- RESTful API architecture

### Frontend
- React 18
- React Router for navigation
- Vite for fast development
- Vanilla CSS with responsive design

## Project Structure

```
cross-country-draft/
├── server/                 # Backend API
│   ├── db/                # Database and schema
│   ├── routes/            # API endpoints
│   ├── scripts/           # Utility scripts
│   └── index.js           # Server entry point
├── client/                # Frontend React app
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── App.jsx       # Main app component
│   │   └── main.jsx      # Entry point
│   └── index.html
└── package.json           # Workspace configuration
```

## Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
cd cross-country-draft
```

2. Install dependencies:
```bash
npm install
npm install --workspace=server
npm install --workspace=client
```

3. Initialize the database:
```bash
cd server
npm run init-db
```

This will create the SQLite database and seed it with sample athletes.

### Running the Application

Start both the backend and frontend in development mode:

```bash
# From the root directory
npm run dev
```

This will start:
- Backend API server on `http://localhost:3001`
- Frontend dev server on `http://localhost:3000`

Or run them separately:

```bash
# Backend only
npm run dev:server

# Frontend only
npm run dev:client
```

## Usage Guide

### Creating a Draft

1. Click "Create New Draft" on the home page
2. Enter a draft name and configure settings:
   - Number of rounds (how many athletes each team drafts)
   - Draft type (snake or linear)
3. Add teams with team names and owner names
4. Click "Create Draft" to proceed to the draft room

### Conducting the Draft

1. The draft order is randomized when created
2. Click "Start Draft" to begin
3. The current team on the clock is highlighted
4. Select an available athlete and click "Draft" to make your pick
5. The draft automatically advances to the next pick
6. Use "Undo Last Pick" if you need to reverse a pick

### Adding Athletes

1. Navigate to "Athletes" in the menu
2. Click "+ Add Athlete"
3. Fill in athlete details:
   - Name, school, grade, gender
   - 5K PR time (in MM:SS format)
   - Ranking (your custom ranking)
4. Athletes are immediately available for drafting

### Importing NCAA D1 Data from TFRRS

**NEW FEATURE**: Import real NCAA Division I cross country data directly from TFRRS.org!

1. Navigate to "Import Data" in the menu
2. Choose one of the predefined 2024 meets:
   - NCAA D1 Championships
   - Regional Championships (Northeast, Mid-Atlantic, Mountain, West, South, Great Lakes)
3. Click "Import Results" on any meet
4. Wait for the import to complete (may take 1-2 minutes)
5. All athletes and results are automatically added to your database!

**Custom Import:**
- You can also import any NCAA D1 XC meet from TFRRS
- Find meet URLs at [xc.tfrrs.org](https://xc.tfrrs.org/)
- Copy the meet URL (e.g., `https://tfrrs.org/results/xc/25334/NCAA_DI_Championships`)
- Paste into the custom import form

**What Gets Imported:**
- All athlete names, schools, and times
- Meet results with places and times
- Automatic PR tracking (updates if faster times found)
- TFRRS profile links for each athlete

**Note:** TFRRS may rate-limit automated requests. If imports fail, wait a few minutes before trying again.

### Tracking Meets and Results

1. Go to "Meets" and click "+ Add Meet"
2. Enter meet details (name, date, location, distance)
3. Click on a meet to view details
4. Add results by selecting an athlete, their place, and time
5. Results can be used to calculate team scores

### Scoring System

Cross country uses "low score wins" scoring:
- A team's score is the sum of their top runners' finishing places
- For example, if your athletes finish 1st, 3rd, 5th, your score is 9
- Lower scores are better!

## API Endpoints

### Athletes
- `GET /api/athletes` - Get all athletes
- `GET /api/athletes/:id` - Get single athlete
- `POST /api/athletes` - Add new athlete
- `PUT /api/athletes/:id` - Update athlete

### Teams
- `GET /api/teams` - Get all teams
- `GET /api/teams/:id` - Get team with roster
- `POST /api/teams` - Create team
- `GET /api/teams/standings/:draftId` - Get standings

### Draft
- `POST /api/draft` - Create new draft
- `GET /api/draft/:id` - Get draft details
- `POST /api/draft/:id/start` - Start draft
- `POST /api/draft/:id/pick` - Make a pick
- `POST /api/draft/:id/undo` - Undo last pick
- `POST /api/draft/:id/order` - Set draft order

### Meets
- `GET /api/meets` - Get all meets
- `GET /api/meets/:id` - Get meet with results
- `POST /api/meets` - Create new meet
- `POST /api/meets/:id/results` - Add result
- `POST /api/meets/:meetId/calculate-scores/:draftId` - Calculate team scores

### Data Import (TFRRS)
- `GET /api/import/meets/2024` - Get predefined 2024 NCAA D1 meets
- `POST /api/import/meet` - Import custom meet from TFRRS URL
- `POST /api/import/athlete` - Import specific athlete from TFRRS
- `POST /api/import/bulk/2024/:meetKey` - Bulk import predefined 2024 meet

## Database Schema

The application uses SQLite with the following main tables:

- **athletes** - Runner information and PRs
- **teams** - Draft participants
- **drafts** - Draft configurations
- **draft_picks** - Record of picks made
- **draft_order** - Team draft order
- **meets** - Cross country races
- **results** - Athlete performances in meets
- **team_scores** - Aggregated team scores per meet

## WebSocket Events

The application uses WebSocket for real-time draft updates:

- `draft_update` - Broadcast when a pick is made
- `pick_made` - Details of the latest pick
- `pick_undone` - When a pick is reversed

## Development

### Adding New Features

The codebase is organized for easy extension:

- Add new API routes in `server/routes/`
- Add new pages in `client/src/pages/`
- Update database schema in `server/db/schema.js`

### Database Reset

To reset the database and start fresh:

```bash
cd server
rm db/draft.db
npm run init-db
```

## Future Enhancements

Potential features to add:

- User authentication and authorization
- Draft chat/messaging
- Auto-draft functionality
- Draft timer per pick
- Email notifications
- Export draft results
- Historical season tracking
- Advanced statistics and analytics
- Mobile responsive improvements
- Dark mode

## License

MIT

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

## Support

For questions or issues, please open an issue on GitHub.
