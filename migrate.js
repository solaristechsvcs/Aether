import { readFile } from 'node:fs/promises';
import { db } from './db.js';
try {
  for (const sql of (await readFile(new URL('./schema.sql', import.meta.url), 'utf8')).split(';').filter(x => x.trim())) await db.query(sql);
  console.log('Aether schema ready.');
} finally { await db.end(); }
