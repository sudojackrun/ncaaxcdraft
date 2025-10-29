import { initializeSchema, seedSampleData } from '../db/schema.js';

console.log('Initializing database...');
initializeSchema();
seedSampleData();
console.log('Database ready!');
