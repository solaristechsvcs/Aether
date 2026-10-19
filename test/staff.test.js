import test from 'node:test';
import assert from 'node:assert/strict';
import { isStaff,canInvestigate,staffRoutes } from '../staff.js';
test('only explicit staff roles may investigate open reports',()=>{for(const role of [undefined,null,'Member','admin','Owner']){assert.equal(isStaff(role),false);assert.equal(canInvestigate(role,'open'),false);}for(const role of ['Moderator','Admin']){assert.equal(canInvestigate(role,'open'),true);assert.equal(canInvestigate(role,'resolved'),false);}});
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
test('ordinary users cannot reach staff queue or role management',async()=>{for(const p of ['/api/staff/reports','/api/staff/role'])await assert.rejects(staffRoutes({p,req:{method:'GET'},user:{id:'x'},fail}),e=>e.status===403);});
test('moderators cannot change roles',async()=>{await assert.rejects(staffRoutes({p:'/api/staff/role',req:{method:'POST'},user:{id:'m',role:'Moderator'},rows:async()=>[],fail}),e=>e.status===403);});
test('closed reports and channels outside reported community deny investigation',async()=>{for(const closed of [true,false]){const calls=[];await assert.rejects(staffRoutes({p:'/api/staff/investigate',req:{method:'GET'},url:new URL('http://test/?report=r&channel=c'),user:{id:'m',role:'Moderator'},rows:async(sql)=>{calls.push(sql);return calls.length===1?[{status:closed?'resolved':'open',community_id:'community'}]:[];},fail}),e=>e.status===403);assert.equal(calls.some(x=>x.includes('ciphertext')),false);}});
