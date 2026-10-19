import { readFile } from 'node:fs/promises';
export async function migrate(db) {
 for (const sql of (await readFile(new URL('./schema.sql',import.meta.url),'utf8')).split(';').filter(x=>x.trim())) await db.query(sql);
 const [columns]=await db.query("SHOW COLUMNS FROM staff_roles LIKE 'role'");
 if(!columns[0].Type.includes("'Owner'"))await db.query("ALTER TABLE staff_roles MODIFY COLUMN role ENUM('Moderator','Admin','Owner') NOT NULL");
}
