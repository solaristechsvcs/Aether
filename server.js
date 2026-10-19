import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { config } from './config.js';
import { db } from './db.js';
import { hashToken, passwordHash, passwordMatches, seal, unseal } from './security.js';
const limits = new Map();
setInterval(() => { for (const [k,v] of limits) if(v.until < Date.now()) limits.delete(k); }, 60000).unref();
const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };
const rows = async (sql, args=[]) => (await db.execute(sql,args))[0];
async function body(req) {
 let data=''; for await (const chunk of req) { data+=chunk; if(Buffer.byteLength(data)>16384) fail(413,'Request too large'); }
 try { return JSON.parse(data || '{}'); } catch { fail(400,'Invalid JSON'); }
}
const text = (v,min,max) => { if(typeof v!=='string' || v.trim().length<min || v.length>max) fail(400,`Expected ${min}-${max} characters`); return v.trim(); };
async function channelAccess(id,user) {
 const found=await rows('SELECT c.* FROM channels c JOIN members m ON m.community_id=c.community_id WHERE c.id=? AND m.user_id=?',[id,user]);
 if(!found.length) fail(404,'Channel unavailable');
}
const server=http.createServer(async(req,res)=>{
 res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
 res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('Cache-Control','no-store');
 const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
 try {
  const url=new URL(req.url,'http://localhost'), p=url.pathname;
  if(!p.startsWith('/api/')) {
   if(req.method!=='GET') fail(405,'Method unavailable');
   const files={'/':['index.html','text/html'],'/app.js':['app.js','text/javascript'],'/style.css':['style.css','text/css']};
   if(!files[p]) fail(404,'Not found');
   res.setHeader('Content-Type',files[p][1]);return res.end(await readFile(new URL('./public/'+files[p][0],import.meta.url)));
  }
  if(req.method!=='GET' && req.headers.origin!==config.origin) fail(403,'Origin rejected');
  const key=req.socket.remoteAddress, now=Date.now();
  const rate=limits.get(key)||{count:0,until:now+60000}; if(rate.until<now){rate.count=0;rate.until=now+60000;} limits.set(key,rate);
  if(++rate.count>240) fail(429,'Too many requests. Try again shortly.');
  if(p==='/api/health') { await db.query('SELECT 1'); return send(200,{ok:true}); }
  if(['/api/register','/api/login'].includes(p) && req.method==='POST') {
   const authKey='auth:'+key, auth=limits.get(authKey)||{count:0,until:now+60000}; limits.set(authKey,auth); if(++auth.count>10) fail(429,'Too many login attempts');
   const b=await body(req), username=text(b.username,3,32).toLowerCase();
   if(!/^[a-z0-9_]+$/.test(username)) fail(400,'Use letters, numbers and underscores');
   if(typeof b.password!=='string'||b.password.length<12||b.password.length>128) fail(400,'Password must contain 12-128 characters');
   let user;
   if(p==='/api/register') {
    if(!config.registrationOpen) fail(403,'Registration is closed');
    user={id:randomUUID(),username};
    try { await rows('INSERT INTO users(id,username,password_hash) VALUES(?,?,?)',[user.id,username,await passwordHash(b.password)]); }
    catch(e) { if(e.code==='ER_DUP_ENTRY') fail(409,'Username unavailable'); throw e; }
   } else {
    [user]=await rows('SELECT * FROM users WHERE username=?',[username]);
    const dummy='00000000000000000000000000000000:'+ '00'.repeat(64);
    const valid=await passwordMatches(b.password,user?.password_hash || dummy);
    if(!user||!valid) fail(401,'Invalid credentials');
   }
   const token=randomBytes(32).toString('hex');
   await rows('DELETE FROM sessions WHERE expires_at < UTC_TIMESTAMP()');
   await rows('INSERT INTO sessions VALUES(?,?,DATE_ADD(UTC_TIMESTAMP(),INTERVAL 7 DAY))',[hashToken(token),user.id]);
   res.setHeader('Set-Cookie',`aether=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${config.secureCookies?'; Secure':''}`);
   return send(200,{id:user.id,username:user.username});
  }
  const token=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('aether='))?.slice(7)||'';
  const [user]=await rows('SELECT u.id,u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP()',[hashToken(token)]);
  if(!user) fail(401,'Please sign in');
  if(p==='/api/me' && req.method==='GET') return send(200,user);
  if(p==='/api/logout' && req.method==='POST') {await rows('DELETE FROM sessions WHERE token_hash=?',[hashToken(token)]);res.setHeader('Set-Cookie','aether=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(200,{ok:true});}
  if(p==='/api/communities' && req.method==='GET') return send(200,await rows('SELECT c.id,c.name,c.owner_id,CASE WHEN c.owner_id=? THEN c.invite ELSE NULL END AS invite FROM communities c JOIN members m ON m.community_id=c.id WHERE m.user_id=?',[user.id,user.id]));
  if(p==='/api/communities' && req.method==='POST') {
   const b=await body(req), id=randomUUID(), name=text(b.name,2,80), invite=randomBytes(24).toString('hex');
   const conn=await db.getConnection();
   try {await conn.beginTransaction();await conn.execute('INSERT INTO communities VALUES(?,?,?,?)',[id,name,user.id,invite]);await conn.execute('INSERT INTO members VALUES(?,?)',[id,user.id]);await conn.execute('INSERT INTO channels VALUES(?,?,?)',[randomUUID(),id,'general']);await conn.commit();}catch(e){await conn.rollback();throw e;}finally{conn.release();}
   return send(201,{id,name,invite});
  }
  if(p==='/api/join' && req.method==='POST') {const b=await body(req);const [c]=await rows('SELECT id FROM communities WHERE invite=?',[text(b.invite,48,48)]);if(!c)fail(404,'Invalid invite');await rows('INSERT IGNORE INTO members VALUES(?,?)',[c.id,user.id]);return send(200,{id:c.id});}
  if(p==='/api/channels' && req.method==='GET') return send(200,await rows('SELECT c.* FROM channels c JOIN members m ON m.community_id=c.community_id WHERE c.community_id=? AND m.user_id=?',[url.searchParams.get('community')||'',user.id]));
  if(p==='/api/channels' && req.method==='POST') {const b=await body(req);const [c]=await rows('SELECT id FROM communities WHERE id=? AND owner_id=?',[text(b.community,36,36),user.id]);if(!c)fail(403,'Only the owner can create channels');const id=randomUUID();await rows('INSERT INTO channels VALUES(?,?,?)',[id,c.id,text(b.name,1,40)]);return send(201,{id});}
  if(p==='/api/messages' && req.method==='GET') {
   const channel=url.searchParams.get('channel')||'';await channelAccess(channel,user.id);
   const result=await rows('SELECT m.id,m.ciphertext,m.created_at,u.username FROM messages m JOIN users u ON u.id=m.user_id WHERE m.channel_id=? ORDER BY m.id DESC LIMIT 100',[channel]);
   return send(200,result.reverse().map(({ciphertext,...m})=>({...m,content:unseal(ciphertext,config.messageKey)})));
  }
  if(p==='/api/messages' && req.method==='POST') {const b=await body(req);await channelAccess(text(b.channel,36,36),user.id);await rows('INSERT INTO messages(channel_id,user_id,ciphertext) VALUES(?,?,?)',[b.channel,user.id,seal(text(b.content,1,4000),config.messageKey)]);return send(201,{ok:true});}
  fail(404,'Not found');
 } catch(e) {if(!e.status) console.error('Request failed:',e.code||e.name);send(e.status||500,{error:e.status?e.message:'Server error'});}
});
server.requestTimeout=15000;server.headersTimeout=10000;
server.listen(config.port,config.host,()=>console.log(`Aether listening on ${config.host}:${config.port}`));
async function stop(){server.close(async()=>{await db.end();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}
process.on('SIGTERM',stop);process.on('SIGINT',stop);
