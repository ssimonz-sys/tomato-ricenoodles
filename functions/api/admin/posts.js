import {guard} from '../../../lib/auth.js';
import {error,normalizePost,parseJson,send,validatePost} from '../../../lib/common.js';
export async function onRequestGet(context){
  const a=await guard(context);if(a.failed)return a.failed;
  const {results}=await context.env.DB.prepare('SELECT * FROM posts ORDER BY updated_at DESC LIMIT 300').all();
  return send({posts:(results||[]).map(r=>normalizePost(r,true))});
}
export async function onRequestPost(context){
  const a=await guard(context,true);if(a.failed)return a.failed;
  let p;try{p=validatePost(await parseJson(context.request));}catch(e){return error(e.message);}
  const now=new Date().toISOString();const id=crypto.randomUUID();
  try{
    await context.env.DB.prepare('INSERT INTO posts(id,language,type,slug,title,excerpt,cover_url,body,tags,collection_slugs,status,word_count,created_at,updated_at,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,p.language,p.type,p.slug,p.title,p.excerpt,p.cover_url,p.body,p.tags,p.collection_slugs,p.status,p.word_count,now,now,p.status==='published'?now:null).run();
  }catch(e){if(/UNIQUE|constraint/i.test(e.message||''))return error('An article with this slug already exists in this language.',409);throw e;}
  return send({ok:true,id},201);
}
