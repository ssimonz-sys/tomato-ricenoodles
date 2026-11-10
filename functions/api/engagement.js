import {error,parseJson,sameOrigin} from '../../lib/common.js';
import {active,article,ensureCount,sha,visitor,withReader,unavailable} from '../../lib/engagement.js';
const slugLang=request=>{
 const u=new URL(request.url);
 return {language:u.searchParams.get('lang')||'zh',slug:u.searchParams.get('slug')||''};
};
async function prepare(context){
 if(!context.env.DB)return {failed:error('Database is not configured.',503)};
 if(!await active(context.env.DB))return {failed:unavailable()};
 const {language,slug}=slugLang(context.request);
 const p=await article(context,slug,language);
 if(!p)return {failed:error('Article not found.',404)};
 const identity=await visitor(context.request);
 return {p,identity};
}
export async function onRequestGet(context){
 const state=await prepare(context);if(state.failed)return state.failed;
 const {p,identity}=state,db=context.env.DB;
 const [stats,liked,comments]=await Promise.all([
  db.prepare("SELECT views,likes FROM trn_engagement_stats WHERE post_id=?").bind(p.id).first(),
  db.prepare("SELECT 1 AS yes FROM trn_likes WHERE post_id=? AND visitor_hash=?").bind(p.id,identity.hash).first(),
  db.prepare("SELECT id,content,created_at FROM trn_comments WHERE post_id=? AND status='approved' ORDER BY created_at DESC LIMIT 80").bind(p.id).all()
 ]);
 return withReader({views:stats?.views||0,likes:stats?.likes||0,liked:!!liked,comments:comments.results||[]},identity);
}
export async function onRequestPost(context){
 if(!sameOrigin(context.request))return error('Invalid origin.',403);
 const state=await prepare(context);if(state.failed)return state.failed;
 const {p,identity}=state,db=context.env.DB;
 let data;try{data=await parseJson(context.request,5000);}catch{return error('请求格式错误。');}
 const now=Math.floor(Date.now()/1000);
 if(data.action==='view'){
   await ensureCount(db,p.id);
   const result=await db.prepare("INSERT INTO trn_read_receipts(post_id,visitor_hash,last_view_at) VALUES (?,?,?) ON CONFLICT(post_id,visitor_hash) DO UPDATE SET last_view_at=excluded.last_view_at WHERE trn_read_receipts.last_view_at<?").bind(p.id,identity.hash,now,now-86400).run();
   if((result.meta?.changes||0)>0)await db.prepare("UPDATE trn_engagement_stats SET views=views+1 WHERE post_id=?").bind(p.id).run();
   const stats=await db.prepare("SELECT views,likes FROM trn_engagement_stats WHERE post_id=?").bind(p.id).first();
   return withReader({ok:true,views:stats.views,likes:stats.likes},identity);
 }
 if(data.action==='like'){
   await ensureCount(db,p.id);
   const result=await db.prepare('INSERT OR IGNORE INTO trn_likes(post_id,visitor_hash,created_at) VALUES(?,?,?)').bind(p.id,identity.hash,now).run();
   if((result.meta?.changes||0)>0)await db.prepare("UPDATE trn_engagement_stats SET likes=likes+1 WHERE post_id=?").bind(p.id).run();
   const stats=await db.prepare('SELECT views,likes FROM trn_engagement_stats WHERE post_id=?').bind(p.id).first();
   return withReader({ok:true,liked:true,views:stats.views,likes:stats.likes},identity);
 }
 if(data.action==='comment'){
   if(data.website||data.honeypot)return error('评论未通过验证。',400);
   const content=String(data.content??'').trim();
   if(content.length<2||content.length>1000)return error('评论需要 2 至 1000 个字符。',400);
   if(/[<>]/.test(content))return error('评论不能包含 HTML 标签。',400);
   const ip=context.request.headers.get('CF-Connecting-IP')||'anonymous';
   const ipHash=await sha('trn-comment|'+(context.env.ADMIN_PASSWORD||'')+'|'+ip);
   const count=await db.prepare('SELECT count(*) AS n FROM trn_comments WHERE ip_hash=? AND created_at>?').bind(ipHash,now-3600).first();
   if((count?.n||0)>=5)return error('评论太频繁，请稍后再试。',429);
   await db.prepare("INSERT INTO trn_comments(id,post_id,content,status,visitor_hash,ip_hash,created_at) VALUES(?,?,?,'pending',?,?,?)")
     .bind(crypto.randomUUID(),p.id,content,identity.hash,ipHash,now).run();
   return withReader({ok:true,pending:true,message:'评论已提交，等待作者审核。'},identity,201);
 }
 return error('无效操作。',400);
}
