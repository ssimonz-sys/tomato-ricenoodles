import {guard} from '../../../../lib/auth.js';
import {error,parseJson,send,validatePost} from '../../../../lib/common.js';
export async function onRequestPut(context){
  const a=await guard(context,true);if(a.failed)return a.failed;
  const id=context.params.id;if(!/^[0-9a-f-]{36}$/.test(id))return error('Invalid id.');
  const old=await context.env.DB.prepare('SELECT id,language,published_at FROM posts WHERE id=?').bind(id).first();if(!old)return error('Article not found.',404);
  let p;try{p=validatePost(await parseJson(context.request));}catch(e){return error(e.message);}
  if(old.language!==p.language){
    const enabled=await context.env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trn_section_links'").first();
    if(enabled && await context.env.DB.prepare('SELECT post_id FROM trn_section_links WHERE post_id=?').bind(id).first())
      return error('请先将这一节从原章节目录移出，再切换发布语言。',409);
  }
  const now=new Date().toISOString(),published=p.status==='published'?((old.language===p.language?old.published_at:null)||now):null;
  try{await context.env.DB.prepare('UPDATE posts SET language=?,type=?,slug=?,title=?,excerpt=?,cover_url=?,body=?,tags=?,collection_slugs=?,status=?,word_count=?,updated_at=?,published_at=? WHERE id=?').bind(p.language,p.type,p.slug,p.title,p.excerpt,p.cover_url,p.body,p.tags,p.collection_slugs,p.status,p.word_count,now,published,id).run();}
  catch(e){if(/UNIQUE|constraint/i.test(e.message||''))return error('An article with this slug already exists in this language.',409);throw e;}
  return send({ok:true,id});
}
export async function onRequestDelete(context){
  const a=await guard(context,true);if(a.failed)return a.failed;
  const id=context.params.id;if(!/^[0-9a-f-]{36}$/.test(id))return error('Invalid id.');
  await context.env.DB.prepare('DELETE FROM posts WHERE id=?').bind(id).run();
  return send({ok:true});
}
