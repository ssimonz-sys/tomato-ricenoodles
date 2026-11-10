import {error,normalizePost,send} from '../../lib/common.js';
export async function onRequestGet({request,env}){
  if(!env.DB)return error('Database is not configured.',503);
  const u=new URL(request.url);const lang=u.searchParams.get('lang')||'en';
  if(!['en','zh'].includes(lang))return error('Invalid language.');
  const enabled=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trn_section_links'").first();
  const base="SELECT id,language,type,slug,title,excerpt,cover_url,tags,collection_slugs,word_count,created_at,updated_at,published_at FROM posts WHERE language=? AND status='published'";
  const access=enabled?" AND NOT EXISTS (SELECT 1 FROM trn_section_links l JOIN trn_chapters c ON c.id=l.chapter_id JOIN trn_books b ON b.id=c.book_id WHERE l.post_id=posts.id AND (c.status<>'published' OR b.status<>'published' OR b.language<>posts.language))":"";
  const {results}=await env.DB.prepare(base+access+" ORDER BY published_at DESC LIMIT 200").bind(lang).all();
  return send({posts:(results||[]).map(r=>normalizePost(r))},200,{'Cache-Control':'public, max-age=60'});
}
