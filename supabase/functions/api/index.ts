/**
 * DUO independent Edge Function — deploy into the NEW OWNER's Supabase project.
 * Environment: SESSION_SECRET, ALLOWED_ORIGIN, USER_ONE_PASSWORD, USER_TWO_PASSWORD,
 * plus Supabase-provided SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * Never expose any of these secrets in browser files or a repository.
 */
const enc=new TextEncoder();
const BASE=Deno.env.get('SUPABASE_URL')||'';
const SERVICE=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const SIGNING=Deno.env.get('SESSION_SECRET')||'';
const ORIGIN=Deno.env.get('ALLOWED_ORIGIN')||'';
const INIT={one:Deno.env.get('USER_ONE_PASSWORD')||'',two:Deno.env.get('USER_TWO_PASSWORD')||''};
const b64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=(v:string)=>Uint8Array.from(atob(v.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin'}});
const dbHeaders={'apikey':SERVICE,'Authorization':`Bearer ${SERVICE}`};
async function db(path:string,options:RequestInit={}){
 const r=await fetch(BASE+'/rest/v1/'+path,{...options,headers:{...dbHeaders,...(options.headers||{})},cache:'no-store'});
 if(!r.ok)throw Error('Database '+r.status);
 return await r.json();
}
async function sign(payload:string){const k=await crypto.subtle.importKey('raw',enc.encode(SIGNING),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(new Uint8Array(await crypto.subtle.sign('HMAC',k,enc.encode(payload))));}
function eq(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
async function hash(password:string,salt?:Uint8Array){const s=salt||crypto.getRandomValues(new Uint8Array(16));const k=await crypto.subtle.importKey('raw',enc.encode(password),'PBKDF2',false,['deriveBits']);const output=await crypto.subtle.deriveBits({name:'PBKDF2',salt:s,iterations:250000,hash:'SHA-256'},k,256);return `pbkdf2$250000$${b64(s)}$${b64(new Uint8Array(output))}`;}
async function matches(password:string,stored:string){const p=stored.split('$');if(p.length!==4||p[0]!=='pbkdf2'||p[1]!=='250000')return false;try{return eq((await hash(password,decode(p[2]))).split('$')[3],p[3])}catch{return false}}
async function creds(username:string){return (await db('duo_users?select=username,password_hash,session_version&username=eq.'+encodeURIComponent(username)))[0]||null}
async function authPassword(username:string,password:string){if(!['one','two'].includes(username)||password.length<12||password.length>200)return false;const row=await creds(username);return !!row&&(row.password_hash?await matches(password,row.password_hash):eq(password,INIT[username as 'one'|'two'])&&INIT[username as 'one'|'two'].length>=12)}
async function token(username:string){const row=await creds(username);const payload=b64(enc.encode(JSON.stringify({user:username,version:row.session_version,exp:Date.now()+7*86400000})));return payload+'.'+await sign(payload)}
async function identify(req:Request){const raw=(req.headers.get('Authorization')||'').replace(/^Bearer /,'');if(raw.length>350||!/^[-\w.]+$/.test(raw))return null;const i=raw.lastIndexOf('.');if(i<0)return null;try{const p=raw.slice(0,i);if(!eq(raw.slice(i+1),await sign(p)))return null;const v=JSON.parse(new TextDecoder().decode(decode(p)));if(!['one','two'].includes(v.user)||!Number.isFinite(v.exp)||v.exp<Date.now()||v.exp>Date.now()+7*86400000+10000)return null;const row=await creds(v.user);return row?.session_version===v.version?v.user:null}catch{return null}}
function validState(s:any){
 if(!s||s.version!==1||!Array.isArray(s.people)||s.people.length!==2||s.people.some((n:any)=>typeof n!=='string'||!n.trim()||n.length>32)||!s.tasks||!Array.isArray(s.tasks.one)||!Array.isArray(s.tasks.two)||!Array.isArray(s.events))return false;
 for(const k of ['one','two']){if(s.tasks[k].length>500)return false;const ids=new Set();for(const t of s.tasks[k]){if(!t||typeof t.id!=='string'||t.id.length>80||!t.id||ids.has(t.id)||typeof t.text!=='string'||!t.text.trim()||t.text.length>200||typeof t.done!=='boolean')return false;if(t.stages!==undefined){if(!Array.isArray(t.stages)||t.stages.length>30)return false;const stageIds=new Set();for(const st of t.stages){if(!st||typeof st.id!=='string'||!st.id||st.id.length>80||stageIds.has(st.id)||typeof st.text!=='string'||!st.text.trim()||st.text.length>150||typeof st.done!=='boolean')return false;stageIds.add(st.id)}}ids.add(t.id)}}
 if(s.events.length>500)return false;const ids=new Set();for(const e of s.events){if(!e||typeof e.id!=='string'||!e.id||e.id.length>80||ids.has(e.id)||typeof e.title!=='string'||!e.title.trim()||e.title.length>140||typeof e.date!=='string'||!/^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(e.date)||Number.isNaN(Date.parse(e.date+'T00:00:00Z'))||new Date(e.date+'T00:00:00Z').toISOString().slice(0,10)!==e.date||typeof e.note!=='string'||e.note.length>500)return false;ids.add(e.id)}return true;
}
Deno.serve(async req=>{
 try{
  if(!BASE||!SERVICE||SIGNING.length<40||!ORIGIN.startsWith('https://')||INIT.one.length<12||INIT.two.length<12)return response({error:'Сервер не настроен'},503);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization','Access-Control-Max-Age':'300','Vary':'Origin'}});
  if(req.method!=='POST')return response({error:'Метод не поддерживается'},405);
  if(req.headers.get('origin')!==ORIGIN)return response({error:'Недопустимый источник'},403);
  const raw=await req.text();if(raw.length>270000)return response({error:'Слишком много данных'},413);
  let data;try{data=JSON.parse(raw)}catch{return response({error:'Некорректный JSON'},400)}
  if(!data||typeof data!=='object'||Array.isArray(data))return response({error:'Некорректный запрос'},400);
  if(data.action==='login'){
   const username=String(data.user||'');const password=String(data.password||'');
   if(!['one','two'].includes(username))return response({error:'Неверный пароль'},401);
   // Avoid indefinite growth of the login-attempt log.
   await db('duo_login_attempts?created_at=lt.'+encodeURIComponent(new Date(Date.now()-7*86400000).toISOString()),{method:'DELETE',headers:{'Prefer':'return=representation'}});
   const attempts=await db('duo_login_attempts?select=id&username=eq.'+username+'&created_at=gte.'+encodeURIComponent(new Date(Date.now()-15*60000).toISOString())+'&limit=11');
   if(attempts.length>=10)return response({error:'Слишком много попыток. Повторите через 15 минут.'},429);
   await db('duo_login_attempts',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({username})});
   if(!(await authPassword(username,password)))return response({error:'Неверный пароль'},401);
   return response({token:await token(username)});
  }
  const user=await identify(req);if(!user)return response({error:'Войдите заново'},401);
  if(data.action==='read'){
   const [s,h]=await Promise.all([db('duo_state?select=revision,data&id=eq.1'),db('duo_history?select=created_at,description&order=id.desc&limit=100')]);
   return response({revision:s[0].revision,state:s[0].data,history:h});
  }
  if(data.action==='save'){
   if(!Number.isSafeInteger(data.revision)||data.revision<0||!validState(data.state))return response({error:'Некорректные данные'},400);
   const result=await db('duo_state?id=eq.1&revision=eq.'+data.revision,{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({revision:data.revision+1,data:data.state,updated_at:new Date().toISOString()})});
   if(result.length!==1)return response({error:'Конфликт версий. Сохраните копию и обновите данные.'},409);
   await db('duo_history',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({revision:data.revision+1,description:'Изменения сохранены: '+(user==='one'?'Участник 1':'Участник 2')})});
   return response({revision:data.revision+1});
  }
  if(data.action==='password'){
   const cur=String(data.current||''),next=String(data.next||'');
   if(next.length<12||next.length>128)return response({error:'Новый пароль: от 12 до 128 символов'},400);
   if(!(await authPassword(user,cur)))return response({error:'Неверный текущий пароль'},401);
   const row=await creds(user);const result=await db('duo_users?username=eq.'+user+'&session_version=eq.'+row.session_version,{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({password_hash:await hash(next),session_version:row.session_version+1})});
   if(result.length!==1)return response({error:'Пароль уже изменён с другого устройства'},409);
   return response({token:await token(user)});
  }
  return response({error:'Неизвестное действие'},400);
 }catch(e){console.error('Duo API error',String(e));return response({error:'Сервис временно недоступен'},503)}
});
