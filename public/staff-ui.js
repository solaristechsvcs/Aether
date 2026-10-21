export function badge(role) {
 if(!['Admin','Moderator','Owner'].includes(role))return document.createTextNode('');
 const span=document.createElement('span');span.className='staff-badge '+role.toLowerCase();span.title='Aether '+role;span.setAttribute('aria-label','Aether '+role);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
 const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',role!=='Moderator'?'M12 1 21 5v7c0 5-5 9-9 11-4-2-9-6-9-11V5Z M12 6l1.6 3.5 3.9.5-2.9 2.7.8 3.8-3.4-1.9-3.4 1.9.8-3.8L6.5 10l3.9-.5Z':'M12 1 21 5v7c0 5-5 9-9 11-4-2-9-6-9-11V5Z M7 12l3 3 7-7-1.5-1.5-5.5 5.5-1.5-1.5Z');path.setAttribute('fill-rule','evenodd');svg.append(path);span.append(svg,document.createTextNode(role));return span;
}
export async function showProfile(api,id) {
 const p=await api('profile?id='+encodeURIComponent(id));
 document.getElementById('profile-dialog')?.remove();
 const d=document.createElement('dialog');d.id='profile-dialog';const h=document.createElement('h2');h.textContent=p.username;h.append(badge(p.role));
 const info=document.createElement('p');info.textContent='Member since '+new Date(p.created_at).toLocaleDateString();const close=document.createElement('button');close.textContent='Close';close.onclick=()=>d.close();d.append(h,info,close);document.body.append(d);d.showModal();
}
export function setupStaff({user,api,ask,guarded,button,community,status,staffPage=false}) {
 const account=staffPage?document.getElementById('staff-navigation'):document.querySelector('.account');document.querySelectorAll('.staff-control').forEach(e=>e.remove());
 const add=(label,fn)=>{const b=button(label,fn);b.className='secondary staff-control';account.prepend(b);};
 const show=(title)=>{if(staffPage){document.getElementById('staff-title').textContent=title;const content=document.getElementById('staff-content');content.replaceChildren();return content;}let d=document.getElementById('staff-dialog');if(d)d.remove();d=document.createElement('dialog');d.id='staff-dialog';d.className='staff-panel';const h=document.createElement('h2');h.textContent=title;const close=button('Close',()=>d.close());const content=document.createElement('div');d.append(h,close,content);document.body.append(d);d.showModal();return content;};
 if(!staffPage){
 add('My profile',async()=>{const p=await api('profile');const box=show(p.username);box.append(badge(p.role));const line=document.createElement('p');line.textContent='Member since '+new Date(p.created_at).toLocaleDateString();box.append(line);});
 add('Report community',async()=>{const c=community();if(!c)return status('Choose a community first');const reason=await ask('Report '+c.name,'Describe the issue (10-2000 characters)');if(!reason)return;await api('reports',{community:c.id,reason});status('Report submitted to Aether staff.');});
 }
 if(!['Moderator','Admin','Owner'].includes(user.role))return;
 if(!staffPage){const link=document.createElement('a');link.href='/staff';link.textContent='Staff Panel';link.className='secondary staff-control staff-panel-link';account.prepend(link);return;}
 add('Staff reports',async()=>{
  const reports=await api('staff/reports'),box=show('Trust & Safety ? Reports');
  if(!reports.length)box.textContent='No reports.';
  for(const r of reports){const card=document.createElement('article');card.className='report-card';const h=document.createElement('h3');h.textContent=r.community_name+' ? '+r.status;const p=document.createElement('p');p.textContent=r.reporter+': '+r.reason;card.append(h,p);
   if(r.status==='open'){
    card.append(button('Investigate',async()=>{const channels=await api('staff/investigate?report='+r.id);const section=document.createElement('section');section.className='investigation';section.textContent='Read-only investigation. Access is recorded in the audit log.';const log=document.createElement('div');for(const c of channels)section.append(button('# '+c.name,async()=>{const messages=await api('staff/investigate?report='+r.id+'&channel='+c.id);log.replaceChildren();for(const m of messages){const line=document.createElement('p');line.textContent=new Date(m.created_at).toLocaleString()+' ? '+m.username+': '+m.content;log.append(line);}}));section.append(log);card.querySelector('.investigation')?.remove();card.append(section);}));
    card.append(button('Resolve report',async()=>{await api('staff/resolve',{report:r.id});card.querySelector('.investigation')?.remove();card.replaceChildren(document.createTextNode(r.community_name+' ? resolved'));status('Report resolved. Investigation access revoked.');}));
   }box.append(card);
  }
 });
 if(['Admin','Owner'].includes(user.role)) {
  add('Manage staff',async()=>{const box=show('Staff accounts');const form=document.createElement('form');const label=document.createElement('label');label.textContent='Existing account username';const input=document.createElement('input');input.required=true;input.maxLength=32;label.append(input);const select=document.createElement('select');select.setAttribute('aria-label','Staff role');for(const role of (user.role==='Owner'?['Moderator','Admin','None']:['Moderator','None'])){const o=document.createElement('option');o.value=role;o.textContent=role==='None'?'Remove staff role':role;select.append(o);}const submit=document.createElement('button');submit.textContent='Save role';form.append(label,select,submit);form.onsubmit=guarded(async e=>{e.preventDefault();await api('staff/role',{username:input.value,role:select.value});status('Staff role updated.');});box.append(form);});
  add('Staff audit log',async()=>{const list=await api('staff/audit'),box=show('Staff audit log');for(const a of list){const p=document.createElement('p');p.textContent=new Date(a.created_at).toLocaleString()+' ? '+a.actor+' ? '+a.action+' ? '+a.target_id+' '+a.details;box.append(p);}});
 }
}
