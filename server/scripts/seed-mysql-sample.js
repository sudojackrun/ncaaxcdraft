// Quick script to add sample athlete data to MySQL
import dotenv from 'dotenv';
dotenv.config();

process.env.JAWSDB_URL = 'mysql://xfelkh3jgbfmibxt:gkxwa00z10e71bci@k2fqe1if4c7uowsh.cbetxkdyhwsb.us-east-1.rds.amazonaws.com:3306/puwi2dasthtgdauv';

async function seedSampleData() {
  try {
    const { run } = await import('../db/database-mysql.js');

    console.log('🌱 Seeding sample athlete data...');

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
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = name`,  // Skip if already exists
        athlete
      );
    }

    console.log('✅ Sample data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedSampleData();
