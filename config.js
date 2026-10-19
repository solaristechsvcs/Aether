import { access, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
const exists = async path => { try { await access(new URL(path, import.meta.url)); return true; } catch { return false; } };
// Keep existing installations and explicitly selected configs working.
const file = process.env.AETHER_CONFIG || (await exists('./config.wisp.js') ? './config.wisp.js' : await exists('./config.local.js') ? './config.local.js' : './config.wisp.js');
if (!await exists(file)) {
 if (process.env.AETHER_CONFIG) { console.error('Aether: the selected AETHER_CONFIG file does not exist.'); process.exit(1); }
 const initial = {host:'0.0.0.0',port:Number(process.env.SERVER_PORT)||3000,origin:'https://CHANGE-ME.example.com',secureCookies:true,registrationOpen:true,autoMigrate:true,database:{host:'CHANGE-ME',port:3306,user:'CHANGE-ME',password:'CHANGE-ME',database:'CHANGE-ME',connectionLimit:10},messageKey:randomBytes(32).toString('hex')};
 await writeFile(new URL(file,import.meta.url),'// Private Wisp settings. Do not commit or share this file.\nexport default '+JSON.stringify(initial,null,2)+';\n',{flag:'wx',mode:0o600});
 console.error('Aether created config.wisp.js with a permanent random message key. Open it in Wisp File Manager, enter your MySQL settings, public HTTPS origin, and allocated port, then restart. Keep this file across deployments.');
 process.exit(1);
}
export const config = (await import(new URL(file, import.meta.url))).default;
function invalid(message) { console.error('Aether configuration: '+message); process.exit(1); }
if (!/^[a-f0-9]{64}$/i.test(config.messageKey)) invalid('messageKey must be a random 64-character hex key. Preserve any key already used for messages.');
if (!config.database || Object.values(config.database).some(v=>typeof v==='string'&&v.includes('CHANGE-ME'))) invalid('Fill in the MySQL settings in '+file+'.');
let origin; try { origin=new URL(config.origin); } catch { invalid('origin must be a complete URL.'); }
if (!['http:','https:'].includes(origin.protocol)||origin.origin!==config.origin||config.origin.includes('CHANGE-ME')) invalid('Set origin to the exact public URL, with no path or trailing slash.');
if (origin.protocol==='https:'&&!config.secureCookies) invalid('HTTPS requires secureCookies: true.');
if (!['localhost','127.0.0.1','[::1]'].includes(origin.hostname)&&origin.protocol!=='https:') invalid('Public testing requires an HTTPS origin.');
if (!Number.isInteger(config.port)||config.port<1||config.port>65535) invalid('port must be your numeric Wisp allocation.');
