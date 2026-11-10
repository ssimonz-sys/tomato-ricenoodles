import {error,parseJson,sameOrigin,send} from './common.js';
const COOKIE='__Host-trn_session';
const WEEK=7*24*60*60;
const encoder=new TextEncoder();
export async function digest(raw){const bytes=await crypto.subtle.digest('SHA-256',encoder.encode(raw));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function constantTimeEqual(a,b){const x=encoder.encode(a),y=encoder.encode(b);let diff=x.length^y.length;for(let i=0;i<Math.max(x.length,y.length);i++)diff|=(x[i]||0)^(y[i]||0);return diff===0;}
export const loginCookie=(token)=>`${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${WEEK}`;
export const clearCookie=()=>`${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
export async function getSession(context){
  const cookie=context.request.headers.get('Cookie')||'';
  const token=cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';
  if(!/^[a-f0-9]{64}$/.test(token))return null;
  const tokenHash=await digest(token);
  const row=await context.env.DB.prepare('SELECT token_hash, csrf_token FROM admin_sessions WHERE token_hash=? AND expires_at>?').bind(tokenHash,Math.floor(Date.now()/1000)).first();
  return row||null;
}
export async function guard(context,mutating=false){
  if(!context.env.DB)return {failed:error('Database is not configured.',503)};
  if(mutating && !sameOrigin(context.request))return {failed:error('Cross-origin request rejected.',403)};
  const session=await getSession(context);
  if(!session)return {failed:error('Please sign in.',401)};
  if(mutating && (!context.request.headers.get('X-CSRF-Token')||!constantTimeEqual(context.request.headers.get('X-CSRF-Token'),session.csrf_token)))return {failed:error('Invalid security token.',403)};
  return {session};
}
export async function onLogin(context){
  const {request,env}=context;
  if(!env.DB||!env.ADMIN_PASSWORD)return error('Set up D1 and ADMIN_PASSWORD before signing in.',503);
  if(!sameOrigin(request))return error('Cross-origin login rejected.',403);
  let body;try{body=await parseJson(request,3000);}catch{return error('Invalid JSON.',400);}
  const password=String(body?.password||'');if(password.length>500)return error('Invalid credentials.',401);
  const ip=request.headers.get('CF-Connecting-IP')||'unknown';const ipKey=await digest(ip);
  const now=Math.floor(Date.now()/1000);
  const attempts=await env.DB.prepare('SELECT failures,window_started FROM login_attempts WHERE ip_key=?').bind(ipKey).first();
  if(attempts&&attempts.failures>=6&&now-attempts.window_started<900)return error('Too many sign-in attempts. Try again later.',429);
  if(!constantTimeEqual(password,env.ADMIN_PASSWORD)){
    const sameWindow=attempts&&now-attempts.window_started<900;
    const failures=sameWindow?attempts.failures+1:1;
    const started=sameWindow?attempts.window_started:now;
    await env.DB.prepare('INSERT INTO login_attempts(ip_key,failures,window_started) VALUES(?,?,?) ON CONFLICT(ip_key) DO UPDATE SET failures=excluded.failures,window_started=excluded.window_started').bind(ipKey,failures,started).run();
    return error('Invalid credentials.',401);
  }
  await env.DB.prepare('DELETE FROM login_attempts WHERE ip_key=?').bind(ipKey).run();
  const token=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');
  const tokenHash=await digest(token),csrf=crypto.randomUUID();
  await env.DB.prepare('INSERT INTO admin_sessions(token_hash,csrf_token,created_at,expires_at) VALUES(?,?,?,?)').bind(tokenHash,csrf,now,now+WEEK).run();
  return send({ok:true,csrf},200, {'Set-Cookie':loginCookie(token)});
}
