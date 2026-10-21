import { setupStaff } from './staff-ui.js';
let timer;
const status=message=>{document.getElementById('status').textContent=message;clearTimeout(timer);timer=setTimeout(()=>document.getElementById('status').textContent='',6000);};
async function api(path,body){
 const res=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
 const result=await res.json();
 if(!res.ok){if(res.status===401){document.getElementById('staff-navigation').replaceChildren();document.getElementById('staff-content').textContent='Your session expired. Return to chat to sign in.';}throw new Error(result.error);}
 return result;
}
const guarded=fn=>async(...args)=>{try{await fn(...args);}catch(e){status(e.message);}};
function button(label,fn){const el=document.createElement('button');el.textContent=label;el.onclick=guarded(fn);return el;}
try{
 const user=await api('me');
 if(!['Moderator','Admin','Owner'].includes(user.role)){
  document.getElementById('staff-content').textContent='This page is available to Aether staff only.';
 }else{
  setupStaff({user,api,guarded,button,status,staffPage:true});
  const reports=[...document.querySelectorAll('#staff-navigation button')].find(b=>b.textContent==='Staff reports');reports?.click();
 }
}catch(e){document.getElementById('staff-content').textContent=e.message==='Please sign in'?'Return to chat and sign in to access the staff panel.':e.message;}
