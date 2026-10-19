import { db } from './db.js';
const username=process.argv[2]?.toLowerCase();
try {
 if(!username||!/^[a-z0-9_]{3,32}$/.test(username))throw new Error('Usage: node staff-admin.js EXISTING_USERNAME');
 const [users]=await db.execute('SELECT id FROM users WHERE username=?',[username]);if(!users.length)throw new Error('Create this account through Aether first.');
 const [admins]=await db.execute("SELECT user_id FROM staff_roles WHERE role='Admin'");if(admins.length)throw new Error('An Admin already exists. Use the staff panel to manage roles.');
 await db.execute("INSERT INTO staff_roles(user_id,role) VALUES(?,'Admin') ON DUPLICATE KEY UPDATE role='Admin'",[users[0].id]);
 await db.execute("INSERT INTO staff_audit(actor_id,action,target_id,details) VALUES(?,'bootstrap_admin',?,'Wisp console bootstrap')",[users[0].id,users[0].id]);
 console.log('Initial Admin assigned. Sign in again to see the staff panel.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await db.end();}
