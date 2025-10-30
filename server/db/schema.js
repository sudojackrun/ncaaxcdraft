// Use MySQL for production (Heroku), SQLite for local development
const isProduction = process.env.NODE_ENV === 'production' || process.env.JAWSDB_URL;

export async function initializeSchema() {
  if (isProduction) {
    const { initializeSchema: initMysql } = await import('./schema-mysql.js');
    return initMysql();
  } else {
    const db = (await import('./database.js')).default;

    // Athletes table
    db.exec(`
      CREATE TABLE IF NOT EXISTS athletes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        school TEXT NOT NULL,
        grade TEXT,
        gender TEXT CHECK(gender IN ('M', 'F')),
        conference TEXT,
        pr_5k TEXT,
        pr_5k_seconds INTEGER,
        pr_5k_meet_name TEXT,
        pr_5k_meet_date TEXT,
        pr_6k TEXT,
        pr_6k_seconds INTEGER,
        pr_6k_meet_name TEXT,
        pr_6k_meet_date TEXT,
        pr_8k TEXT,
        pr_8k_seconds INTEGER,
        pr_8k_meet_name TEXT,
        pr_8k_meet_date TEXT,
        pr_10k TEXT,
        pr_10k_seconds INTEGER,
        pr_10k_meet_name TEXT,
        pr_10k_meet_date TEXT,
        season_best TEXT,
        season_best_seconds INTEGER,
        ranking INTEGER,
        tfrrs_id TEXT,
        tfrrs_url TEXT,
        hometown TEXT,
        drafted_team_id INTEGER REFERENCES teams(id),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Teams table (draft participants)
    db.exec(`
      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        draft_id INTEGER,
        logo_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (draft_id) REFERENCES drafts(id)
      )
    `);

    // Drafts table
    db.exec(`
      CREATE TABLE IF NOT EXISTS drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        status TEXT CHECK(status IN ('setup', 'in_progress', 'completed')) DEFAULT 'setup',
        current_round INTEGER DEFAULT 1,
        current_pick INTEGER DEFAULT 1,
        total_rounds INTEGER DEFAULT 7,
        snake_draft BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        completed_at DATETIME
      )
    `);

    // Draft picks table
    db.exec(`
      CREATE TABLE IF NOT EXISTS draft_picks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        draft_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        athlete_id INTEGER NOT NULL,
        round INTEGER NOT NULL,
        pick_number INTEGER NOT NULL,
        overall_pick INTEGER NOT NULL,
        picked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (draft_id) REFERENCES drafts(id),
        FOREIGN KEY (team_id) REFERENCES teams(id),
        FOREIGN KEY (athlete_id) REFERENCES athletes(id)
      )
    `);

    // Draft order table
    db.exec(`
      CREATE TABLE IF NOT EXISTS draft_order (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        draft_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        position INTEGER NOT NULL,
        FOREIGN KEY (draft_id) REFERENCES drafts(id),
        FOREIGN KEY (team_id) REFERENCES teams(id),
        UNIQUE(draft_id, position)
      )
    `);

    // Meets table (cross country races)
    db.exec(`
      CREATE TABLE IF NOT EXISTS meets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        date DATE NOT NULL,
        location TEXT,
        distance TEXT DEFAULT '5K',
        status TEXT CHECK(status IN ('scheduled', 'in_progress', 'completed')) DEFAULT 'scheduled',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Results table (athlete performances in meets)
    db.exec(`
      CREATE TABLE IF NOT EXISTS results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meet_id INTEGER NOT NULL,
        athlete_id INTEGER NOT NULL,
        place INTEGER,
        time TEXT NOT NULL,
        time_seconds INTEGER NOT NULL,
        points INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (meet_id) REFERENCES meets(id),
        FOREIGN KEY (athlete_id) REFERENCES athletes(id),
        UNIQUE(meet_id, athlete_id)
      )
    `);

    // Team scores table (aggregated scores per meet)
    db.exec(`
      CREATE TABLE IF NOT EXISTS team_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        meet_id INTEGER NOT NULL,
        total_points INTEGER DEFAULT 0,
        calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES teams(id),
        FOREIGN KEY (meet_id) REFERENCES meets(id),
        UNIQUE(team_id, meet_id)
      )
    `);

    console.log('✅ Database schema initialized');
  }
}

export async function seedSampleData() {
  if (isProduction) {
    const { seedSampleData: seedMysql } = await import('./schema-mysql.js');
    return seedMysql();
  } else {
    const db = (await import('./database.js')).default;

    // Add some sample athletes
    const insertAthlete = db.prepare(`
      INSERT INTO athletes (name, school, grade, gender, pr_5k, pr_5k_seconds, ranking)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleAthletes = [
      ['Colin Sahlman', 'Northern Arizona', 'SR', 'M', '14:12', 852, 1],
      ['Drew Griffith', 'Oklahoma State', 'JR', 'M', '14:18', 858, 2],
      ['Gary Martin', 'North Carolina', 'SR', 'M', '14:22', 862, 3],
      ['Parker Wolfe', 'North Carolina', 'JR', 'M', '14:25', 865, 4],
      ['Nico Young', 'Northern Arizona', 'SR', 'M', '14:28', 868, 5],
      ['Sadie Engelhardt', 'Stanford', 'JR', 'F', '15:52', 952, 1],
      ['Zariel Macchia', 'Penn State', 'SR', 'F', '16:02', 962, 2],
      ['Taylor Ewert', 'Arkansas', 'JR', 'F', '16:08', 968, 3],
      ['Carmen Alder', 'Stanford', 'SR', 'F', '16:12', 972, 4],
      ['Flomena Asekol', 'Alabama', 'JR', 'F', '16:15', 975, 5],
    ];

    const insertMany = db.transaction((athletes) => {
      for (const athlete of athletes) {
        insertAthlete.run(...athlete);
      }
    });

    insertMany(sampleAthletes);

    console.log('✅ Sample data seeded');
  }
}
