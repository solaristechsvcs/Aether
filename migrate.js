import { migrate } from './schema.js';
import { db } from './db.js';
try {
  await migrate(db);
  console.log('Aether schema ready.');
} finally { await db.end(); }
