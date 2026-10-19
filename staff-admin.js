import { db } from './db.js';
const username=process.argv[2]?.toLowerCase();
try {
 if(!username||!/^[a-z0-9_]{3,32}$/.test(username))throw new Error('Usage: node staff-admin.js EXISTING_USERNAME');
 const [users]=await db.execute('SELECT id FROM users WHERE username=?',[username]);if(!users.length)throw new Error('Create this account through Aether first.');
 const [owners]=await db.execute("SELECT user_id FROM staff_roles WHERE role='Owner'");if(owners.length)throw new Error('An Owner already exists. Use the staff panel to manage roles.');
 await db.execute("INSERT INTO staff_roles(user_id,role) VALUES(?,'Owner') ON DUPLICATE KEY UPDATE role='Owner'",[users[0].id]);
 await db.execute("INSERT INTO staff_audit(actor_id,action,target_id,details) VALUES(?,'bootstrap_owner',?,'Console bootstrap')",[users[0].id,users[0].id]);
 console.log('Initial Owner assigned. Sign in again to see the staff panel. SQL setup is also available in staff-owner.sql.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await db.end();}
