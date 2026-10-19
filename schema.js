import { readFile } from 'node:fs/promises';
export async function migrate(db) {
 for (const sql of (await readFile(new URL('./schema.sql',import.meta.url),'utf8')).split(';').filter(x=>x.trim())) await db.query(sql);
}
