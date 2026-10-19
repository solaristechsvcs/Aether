import { randomUUID } from 'node:crypto';
export async function communityRoutes({p,req,url,user,rows,body,text,send,fail}) {
 if(!['/api/members','/api/community-roles','/api/community-roles/save','/api/community-roles/delete','/api/community-roles/assign'].includes(p))return false;
 const b=req.method==='POST'?await body(req):{};
 const id=text(req.method==='GET'?url.searchParams.get('community'):b.community,36,36);
 const [community]=await rows('SELECT c.id,c.owner_id FROM communities c JOIN members m ON m.community_id=c.id WHERE c.id=? AND m.user_id=?',[id,user.id]);
 if(!community)fail(404,'Community unavailable');
 if(p==='/api/members'&&req.method==='GET') {
  const users=await rows('SELECT u.id,u.username,s.role AS staff_role FROM members m JOIN users u ON u.id=m.user_id LEFT JOIN staff_roles s ON s.user_id=u.id WHERE m.community_id=? ORDER BY u.username',[id]);
  const assignments=await rows('SELECT mr.user_id,r.id,r.name,r.color FROM member_roles mr JOIN community_roles r ON r.community_id=mr.community_id AND r.id=mr.role_id WHERE mr.community_id=? ORDER BY r.name',[id]);
  const roles=new Map();for(const r of assignments){if(!roles.has(r.user_id))roles.set(r.user_id,[]);roles.get(r.user_id).push({id:r.id,name:r.name,color:r.color});}
  send(200,users.map(u=>({...u,owner:u.id===community.owner_id,roles:roles.get(u.id)||[]})));return true;
 }
 if(p==='/api/community-roles'&&req.method==='GET'){send(200,await rows('SELECT id,name,color FROM community_roles WHERE community_id=? ORDER BY name',[id]));return true;}
 if(req.method!=='POST')fail(405,'Method unavailable');
 if(community.owner_id!==user.id)fail(403,'Only the community owner can manage roles');
 if(p==='/api/community-roles/save') {
  const name=text(b.name,1,40),color=text(b.color,7,7);if(!/^#[0-9a-f]{6}$/i.test(color))fail(400,'Use a hex color');
  const role=b.role?text(b.role,36,36):randomUUID();
  try {
   if(b.role){const result=await rows('UPDATE community_roles SET name=?,color=? WHERE id=? AND community_id=?',[name,color,role,id]);if(!result.affectedRows)fail(404,'Role unavailable');}
   else {const [count]=await rows('SELECT COUNT(*) AS n FROM community_roles WHERE community_id=?',[id]);if(Number(count.n)>=100)fail(400,'Maximum 100 roles per community');await rows('INSERT INTO community_roles(id,community_id,name,color) VALUES(?,?,?,?)',[role,id,name,color]);}
  }catch(e){if(e.code==='ER_DUP_ENTRY')fail(409,'A role with that name already exists');throw e;}
  send(200,{id:role});return true;
 }
 if(p==='/api/community-roles/delete'){await rows('DELETE FROM community_roles WHERE id=? AND community_id=?',[text(b.role,36,36),id]);send(200,{ok:true});return true;}
 if(p==='/api/community-roles/assign') {
  const role=text(b.role,36,36),target=text(b.user,36,36);
  if(typeof b.assigned!=='boolean')fail(400,'assigned must be a boolean');
  const [found]=await rows('SELECT r.id FROM community_roles r JOIN members m ON m.community_id=r.community_id WHERE r.id=? AND r.community_id=? AND m.user_id=?',[role,id,target]);if(!found)fail(404,'Role or member unavailable in this community');
  if(b.assigned)await rows('INSERT IGNORE INTO member_roles(community_id,user_id,role_id) VALUES(?,?,?)',[id,target,role]);
  else await rows('DELETE FROM member_roles WHERE community_id=? AND user_id=? AND role_id=?',[id,target,role]);
  send(200,{ok:true});return true;
 }
 fail(404,'Not found');
}
