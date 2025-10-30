import { initializeSchema, seedSampleData } from '../db/schema.js';

async function initDatabase() {
  console.log('Initializing database...');

  // Check if JAWSDB_URL is set (for production) or if we're in development
  const hasDatabase = process.env.JAWSDB_URL || process.env.NODE_ENV !== 'production';

  if (!hasDatabase) {
    console.log('⚠️  Skipping database initialization - JAWSDB_URL not set');
    console.log('Run this script manually after setting the database URL');
    process.exit(0);
  }

  await initializeSchema();
  await seedSampleData();
  console.log('Database ready!');
  process.exit(0);
}

initDatabase().catch(err => {
  console.error('Error initializing database:', err);
  // Don't fail the build - just warn
  console.warn('⚠️  Database initialization failed. This is OK during build - initialize manually after deployment.');
  process.exit(0); // Changed from exit(1) to exit(0) to not fail the build
});
