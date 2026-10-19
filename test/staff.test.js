import test from 'node:test';
import assert from 'node:assert/strict';
import { isStaff,canInvestigate,canManageRole,staffRoutes } from '../staff.js';
test('only explicit staff roles may investigate open reports',()=>{for(const role of [undefined,null,'Member','admin']){assert.equal(isStaff(role),false);assert.equal(canInvestigate(role,'open'),false);}for(const role of ['Moderator','Admin','Owner']){assert.equal(canInvestigate(role,'open'),true);assert.equal(canInvestigate(role,'resolved'),false);}});
test('staff hierarchy protects Admins and Owners from lower roles',()=>{
 for(const current of [null,'Moderator','Admin','Owner'])for(const next of ['None','Moderator','Admin','Owner']) {
  assert.equal(canManageRole('Moderator',current,next),false);
  assert.equal(canManageRole('Admin',current,next),[null,'Moderator'].includes(current)&&['None','Moderator'].includes(next));
  assert.equal(canManageRole('Owner',current,next),current!=='Owner'&&['None','Moderator','Admin'].includes(next));
 }
});
test('Admin API rejects assigning Admin or altering an existing Admin or Owner',async()=>{
 for(const [current,next] of [[null,'Admin'],['Admin','Moderator'],['Admin','None'],['Owner','None']]) {
  const mutations=[];
  await assert.rejects(staffRoutes({p:'/api/staff/role',req:{method:'POST'},user:{id:'actor',role:'Admin'},body:async()=>({username:'target',role:next}),text:v=>v,rows:async sql=>{if(sql.startsWith('SELECT'))return [{id:'target',role:current}];mutations.push(sql);},fail}),e=>e.status===403);
  assert.equal(mutations.length,0);
 }
});
test('Owner may assign Admin and Admin may assign Moderator',async()=>{
 for(const [actor,next] of [['Owner','Admin'],['Admin','Moderator']]) {
  let sent=false;const mutations=[];
  await staffRoutes({p:'/api/staff/role',req:{method:'POST'},user:{id:'actor',role:actor},body:async()=>({username:'target',role:next}),text:v=>v,rows:async sql=>{if(sql.startsWith('SELECT'))return [{id:'target',role:null}];mutations.push(sql);return {};},fail,send:()=>{sent=true;}});
  assert.equal(sent,true);assert.equal(mutations.length,2);
 }
});
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
test('ordinary users cannot reach staff queue or role management',async()=>{for(const p of ['/api/staff/reports','/api/staff/role'])await assert.rejects(staffRoutes({p,req:{method:'GET'},user:{id:'x'},fail}),e=>e.status===403);});
test('moderators cannot change roles',async()=>{await assert.rejects(staffRoutes({p:'/api/staff/role',req:{method:'POST'},user:{id:'m',role:'Moderator'},rows:async()=>[],fail}),e=>e.status===403);});
test('closed reports and channels outside reported community deny investigation',async()=>{for(const closed of [true,false]){const calls=[];await assert.rejects(staffRoutes({p:'/api/staff/investigate',req:{method:'GET'},url:new URL('http://test/?report=r&channel=c'),user:{id:'m',role:'Moderator'},rows:async(sql)=>{calls.push(sql);return calls.length===1?[{status:closed?'resolved':'open',community_id:'community'}]:[];},fail}),e=>e.status===403);assert.equal(calls.some(x=>x.includes('ciphertext')),false);}});
