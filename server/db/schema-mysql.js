import { query } from './database-mysql.js';

export async function initializeSchema() {
  // Create tables in order to satisfy foreign key constraints
  // Drafts table (no dependencies)
  await query(`
    CREATE TABLE IF NOT EXISTS drafts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      status ENUM('setup', 'in_progress', 'completed') DEFAULT 'setup',
      current_round INT DEFAULT 1,
      current_pick INT DEFAULT 1,
      total_rounds INT DEFAULT 7,
      snake_draft TINYINT(1) DEFAULT 1,
      gender ENUM('M', 'F'),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      started_at DATETIME,
      completed_at DATETIME
    )
  `);

  // Teams table (depends on drafts)
  await query(`
    CREATE TABLE IF NOT EXISTS teams (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      owner_name VARCHAR(255) NOT NULL,
      draft_id INT,
      logo_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_draft_id (draft_id),
      FOREIGN KEY (draft_id) REFERENCES drafts(id)
    )
  `);

  // Athletes table (depends on teams)
  await query(`
    CREATE TABLE IF NOT EXISTS athletes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      school VARCHAR(255) NOT NULL,
      grade VARCHAR(10),
      gender ENUM('M', 'F'),
      conference VARCHAR(255),
      pr_5k VARCHAR(20),
      pr_5k_seconds INT,
      pr_5k_meet_name TEXT,
      pr_5k_meet_date VARCHAR(50),
      pr_6k VARCHAR(20),
      pr_6k_seconds INT,
      pr_6k_meet_name TEXT,
      pr_6k_meet_date VARCHAR(50),
      pr_8k VARCHAR(20),
      pr_8k_seconds INT,
      pr_8k_meet_name TEXT,
      pr_8k_meet_date VARCHAR(50),
      pr_10k VARCHAR(20),
      pr_10k_seconds INT,
      pr_10k_meet_name TEXT,
      pr_10k_meet_date VARCHAR(50),
      season_best VARCHAR(20),
      season_best_seconds INT,
      ranking INT,
      tfrrs_id VARCHAR(255),
      tfrrs_url TEXT,
      hometown VARCHAR(255),
      drafted_team_id INT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_drafted_team (drafted_team_id),
      FOREIGN KEY (drafted_team_id) REFERENCES teams(id)
    )
  `);

  // Draft picks table
  await query(`
    CREATE TABLE IF NOT EXISTS draft_picks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      draft_id INT NOT NULL,
      team_id INT NOT NULL,
      athlete_id INT NOT NULL,
      round INT NOT NULL,
      pick_number INT NOT NULL,
      overall_pick INT NOT NULL,
      picked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_draft (draft_id),
      INDEX idx_team (team_id),
      INDEX idx_athlete (athlete_id),
      FOREIGN KEY (draft_id) REFERENCES drafts(id),
      FOREIGN KEY (team_id) REFERENCES teams(id),
      FOREIGN KEY (athlete_id) REFERENCES athletes(id)
    )
  `);

  // Draft order table
  await query(`
    CREATE TABLE IF NOT EXISTS draft_order (
      id INT AUTO_INCREMENT PRIMARY KEY,
      draft_id INT NOT NULL,
      team_id INT NOT NULL,
      position INT NOT NULL,
      INDEX idx_draft_order (draft_id),
      INDEX idx_team_order (team_id),
      FOREIGN KEY (draft_id) REFERENCES drafts(id),
      FOREIGN KEY (team_id) REFERENCES teams(id),
      UNIQUE KEY unique_draft_position (draft_id, position)
    )
  `);

  // Meets table (cross country races)
  await query(`
    CREATE TABLE IF NOT EXISTS meets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      date DATE NOT NULL,
      location VARCHAR(255),
      distance VARCHAR(10) DEFAULT '5K',
      status ENUM('scheduled', 'in_progress', 'completed') DEFAULT 'scheduled',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Results table (athlete performances in meets)
  await query(`
    CREATE TABLE IF NOT EXISTS results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      meet_id INT NOT NULL,
      athlete_id INT NOT NULL,
      place INT,
      time VARCHAR(20) NOT NULL,
      time_seconds INT NOT NULL,
      points INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_meet (meet_id),
      INDEX idx_athlete_result (athlete_id),
      FOREIGN KEY (meet_id) REFERENCES meets(id),
      FOREIGN KEY (athlete_id) REFERENCES athletes(id),
      UNIQUE KEY unique_meet_athlete (meet_id, athlete_id)
    )
  `);

  // Team scores table (aggregated scores per meet)
  await query(`
    CREATE TABLE IF NOT EXISTS team_scores (
      id INT AUTO_INCREMENT PRIMARY KEY,
      team_id INT NOT NULL,
      meet_id INT NOT NULL,
      total_points INT DEFAULT 0,
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_team_score (team_id),
      INDEX idx_meet_score (meet_id),
      FOREIGN KEY (team_id) REFERENCES teams(id),
      FOREIGN KEY (meet_id) REFERENCES meets(id),
      UNIQUE KEY unique_team_meet (team_id, meet_id)
    )
  `);

  console.log('✅ MySQL database schema initialized');
}

export async function seedSampleData() {
  const { run } = await import('./database-mysql.js');

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

  for (const athlete of sampleAthletes) {
    await run(
      `INSERT INTO athletes (name, school, grade, gender, pr_5k, pr_5k_seconds, ranking)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      athlete
    );
  }

  console.log('✅ Sample data seeded');
}
