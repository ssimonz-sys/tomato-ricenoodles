import {error,send} from './common.js';
export async function active(db){
 return !!await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trn_engagement_stats'").first();
}
export async function initialize(db) {
 const commands=[
 "CREATE TABLE IF NOT EXISTS trn_engagement_stats(post_id TEXT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE, views INTEGER NOT NULL DEFAULT 0, likes INTEGER NOT NULL DEFAULT 0)",
 "CREATE TABLE IF NOT EXISTS trn_read_receipts(post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, visitor_hash TEXT NOT NULL, last_view_at INTEGER NOT NULL, PRIMARY KEY(post_id,visitor_hash))",
 "CREATE TABLE IF NOT EXISTS trn_likes(post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, visitor_hash TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(post_id,visitor_hash))",
 "CREATE TABLE IF NOT EXISTS trn_comments(id TEXT PRIMARY KEY, post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, content TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), visitor_hash TEXT NOT NULL, ip_hash TEXT NOT NULL, created_at INTEGER NOT NULL, reviewed_at INTEGER)",
 "CREATE INDEX IF NOT EXISTS idx_trn_comments_post_status ON trn_comments(post_id,status,created_at DESC)",
 "CREATE INDEX IF NOT EXISTS idx_trn_comments_moderation ON trn_comments(status,created_at DESC)",
 "CREATE INDEX IF NOT EXISTS idx_trn_comments_ip_rate ON trn_comments(ip_hash,created_at DESC)"
 ];
 for(const command of commands)await db.prepare(command).run();
}
export async function sha(text) {
 const bytes=new TextEncoder().encode(String(text));
 const hash=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function readToken(request){
 const header=request.headers.get('Cookie')||'';
 const part=header.split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-trn_reader='));
 const token=part?decodeURIComponent(part.substring('__Host-trn_reader='.length)):'';
 return /^[a-f0-9]{64}$/i.test(token)?token:null;
}
export async function visitor(request){
 const old=readToken(request);
 const token=old||[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('');
 return {
   hash:await sha('trn-v1|'+token),
   cookie:old?null:'__Host-trn_reader='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000'
 };
}
export function withReader(data,identity,status=200){
 const headers={'Cache-Control':'no-store'};
 if(identity.cookie)headers['Set-Cookie']=identity.cookie;
 return send(data,status,headers);
}
export async function article(context,slug,language){
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||!['zh','en'].includes(language))return null;
 const db=context.env.DB;
 const p=await db.prepare("SELECT id FROM posts WHERE language=? AND slug=? AND status='published'").bind(language,slug).first();
 if(!p)return null;
 const exists=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trn_section_links'").first();
 if(exists){
  const parent=await db.prepare("SELECT b.series_slug,b.status AS book_status,b.language AS book_lang,c.status AS chapter_status FROM trn_section_links l JOIN trn_chapters c ON c.id=l.chapter_id JOIN trn_books b ON b.id=c.book_id WHERE l.post_id=?").bind(p.id).first();
  if(parent&&(parent.book_status!=='published'||parent.chapter_status!=='published'||parent.book_lang!==language))return null;
  if(parent?.series_slug){
   const seriesTable=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trn_series'").first();
   if(seriesTable){
    const s=await db.prepare("SELECT status FROM trn_series WHERE language=? AND slug=?").bind(language,parent.series_slug).first();
    if(!s||s.status!=='published')return null;
   }
  }
 }
 return p;
}
export async function ensureCount(db,id){
 await db.prepare("INSERT OR IGNORE INTO trn_engagement_stats(post_id,views,likes) VALUES (?,0,0)").bind(id).run();
}
export const unavailable=()=>error('读者互动尚未启用，请作者在作品管理中初始化。',409);
