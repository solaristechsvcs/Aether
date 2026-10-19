import { randomUUID } from 'node:crypto';
import { seal, unseal } from './security.js';
export const isStaff = role => ['Moderator','Admin','Owner'].includes(role);
export function canManageRole(actor, current, next) {
 if(!['Moderator','Admin','None'].includes(next)||current==='Owner')return false;
 if(actor==='Owner')return true;
 return actor==='Admin' && !['Admin','Owner'].includes(current) && ['Moderator','None'].includes(next);
}
export const canInvestigate = (role, status) => isStaff(role) && status==='open';
export async function staffRoutes({p,req,url,user,body,text,rows,send,fail,config}) {
 const audit=async(action,target,details='')=>rows('INSERT INTO staff_audit(actor_id,action,target_id,details) VALUES(?,?,?,?)',[user.id,action,target,details]);
 if(p==='/api/profile'&&req.method==='GET') {
  const [profile]=await rows('SELECT u.id,u.username,u.created_at,s.role FROM users u LEFT JOIN staff_roles s ON s.user_id=u.id WHERE u.id=?',[url.searchParams.get('id')||user.id]);
  if(!profile)fail(404,'User unavailable');send(200,profile);return true;
 }
 if(p==='/api/reports'&&req.method==='POST') {
  const b=await body(req),community=text(b.community,36,36),reason=text(b.reason,10,2000);
  const [membership]=await rows('SELECT user_id FROM members WHERE community_id=? AND user_id=?',[community,user.id]);if(!membership)fail(403,'Join this community before reporting it');
  const [count]=await rows('SELECT COUNT(*) AS n FROM reports WHERE reporter_id=? AND created_at>DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 HOUR)',[user.id]);if(Number(count.n)>=5)fail(429,'Report limit reached. Try again later.');
  const id=randomUUID();await rows('INSERT INTO reports(id,community_id,reporter_id,reason) VALUES(?,?,?,?)',[id,community,user.id,seal(reason,config.messageKey)]);send(201,{id});return true;
 }
 if(!p.startsWith('/api/staff/'))return false;
 if(!isStaff(user.role))fail(403,'Staff access required');
 if(p==='/api/staff/reports'&&req.method==='GET') {
  await audit('view_report_queue',user.id);
  const list=await rows('SELECT r.*,c.name AS community_name,u.username AS reporter FROM reports r JOIN communities c ON c.id=r.community_id JOIN users u ON u.id=r.reporter_id ORDER BY r.created_at DESC LIMIT 100');
  send(200,list.map(r=>({...r,reason:unseal(r.reason,config.messageKey)})));return true;
 }
 if(p==='/api/staff/investigate'&&req.method==='GET') {
  const id=url.searchParams.get('report')||'';const [report]=await rows('SELECT * FROM reports WHERE id=?',[id]);
  if(!report||!canInvestigate(user.role,report.status))fail(403,'An open report is required');
  const cid=url.searchParams.get('channel');
  if(!cid){await audit('view_report_channels',id);send(200,await rows('SELECT id,name FROM channels WHERE community_id=?',[report.community_id]));return true;}
  const [channel]=await rows('SELECT id FROM channels WHERE id=? AND community_id=?',[cid,report.community_id]);if(!channel)fail(403,'Channel outside reported community');
  await audit('read_report_messages',id,JSON.stringify({channel:cid}));
  const messages=await rows('SELECT m.id,m.ciphertext,m.created_at,u.username FROM messages m JOIN users u ON u.id=m.user_id WHERE m.channel_id=? ORDER BY m.id DESC LIMIT 100',[cid]);
  send(200,messages.reverse().map(({ciphertext,...m})=>({...m,content:unseal(ciphertext,config.messageKey)})));return true;
 }
 if(p==='/api/staff/resolve'&&req.method==='POST') {
  const b=await body(req),id=text(b.report,36,36);await audit('resolve_report',id);
  const result=await rows("UPDATE reports SET status='resolved',resolved_by=?,resolved_at=UTC_TIMESTAMP() WHERE id=? AND status='open'",[user.id,id]);if(!result.affectedRows)fail(409,'Report already resolved or unavailable');send(200,{ok:true});return true;
 }
 if(!['Admin','Owner'].includes(user.role))fail(403,'Admin access required');
 if(p==='/api/staff/role'&&req.method==='POST') {
  const b=await body(req),username=text(b.username,3,32).toLowerCase();if(!['Moderator','Admin','None'].includes(b.role))fail(400,'Invalid role');
  const [target]=await rows('SELECT u.id,s.role FROM users u LEFT JOIN staff_roles s ON s.user_id=u.id WHERE u.username=?',[username]);if(!target)fail(404,'Account unavailable');if(target.id===user.id)fail(403,'You cannot change your own staff role');
  if(!canManageRole(user.role,target.role,b.role))fail(403,'Only the Owner can manage Admins. Owner accounts cannot be changed here.');
  await audit('change_staff_role',target.id,b.role);
  if(b.role==='None')await rows('DELETE FROM staff_roles WHERE user_id=?',[target.id]);else await rows('INSERT INTO staff_roles(user_id,role) VALUES(?,?) ON DUPLICATE KEY UPDATE role=?',[target.id,b.role,b.role]);
  send(200,{ok:true});return true;
 }
 if(p==='/api/staff/audit'&&req.method==='GET'){send(200,await rows('SELECT a.*,u.username AS actor FROM staff_audit a JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 200'));return true;}
 fail(404,'Not found');
}
