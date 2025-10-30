import { initializeSchema, seedSampleData } from '../db/schema.js';

async function initDatabase() {
  console.log('Initializing database...');
  await initializeSchema();
  await seedSampleData();
  console.log('Database ready!');
  process.exit(0);
}

initDatabase().catch(err => {
  console.error('Error initializing database:', err);
  process.exit(1);
});
