import {guard} from '../../../lib/auth.js';
import {error,parseJson,send} from '../../../lib/common.js';
import {active,initialize} from '../../../lib/engagement.js';
export async function onRequestGet(context){
 const a=await guard(context);if(a.failed)return a.failed;
 const db=context.env.DB;
 if(!await active(db))return send({enabled:false,comments:[],stats:[]});
 const [comments,stats]=await Promise.all([
   db.prepare("SELECT c.id,c.post_id,c.content,c.status,c.created_at,p.title,p.language FROM trn_comments c JOIN posts p ON p.id=c.post_id ORDER BY CASE c.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,c.created_at DESC LIMIT 300").all(),
   db.prepare("SELECT s.post_id,s.views,s.likes, (SELECT count(*) FROM trn_comments c WHERE c.post_id=s.post_id AND c.status='approved') AS comments FROM trn_engagement_stats s").all()
 ]);
 return send({enabled:true,comments:comments.results||[],stats:stats.results||[]});
}
export async function onRequestPost(context){
 const a=await guard(context,true);if(a.failed)return a.failed;
 let data;try{data=await parseJson(context.request,10000);}catch{return error('请求格式错误。');}
 const db=context.env.DB;
 if(data.action==='initialize'){
  if(!await active(db))await initialize(db);
  return send({ok:true});
 }
 if(!await active(db))return error('读者互动尚未启用。',409);
 const id=String(data.id||'');
 if(!/^[0-9a-f-]{36}$/.test(id))return error('评论 ID 无效。');
 if(data.action==='approve'||data.action==='reject'){
  const status=data.action==='approve'?'approved':'rejected';
  await db.prepare("UPDATE trn_comments SET status=?,reviewed_at=? WHERE id=?").bind(status,Math.floor(Date.now()/1000),id).run();
  return send({ok:true});
 }
 if(data.action==='delete'){
  await db.prepare("DELETE FROM trn_comments WHERE id=?").bind(id).run();
  return send({ok:true});
 }
 return error('无效操作。');
}
