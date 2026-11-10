import {error,normalizePost,send} from '../../lib/common.js';
export async function onRequestGet({request,env}){
  if(!env.DB)return error('Database is not configured.',503);
  const u=new URL(request.url);const lang=u.searchParams.get('lang')||'en';
  if(!['en','zh'].includes(lang))return error('Invalid language.');
  const {results}=await env.DB.prepare("SELECT id,language,type,slug,title,excerpt,cover_url,tags,collection_slugs,word_count,created_at,updated_at,published_at FROM posts WHERE language=? AND status='published' ORDER BY published_at DESC LIMIT 200").bind(lang).all();
  return send({posts:(results||[]).map(r=>normalizePost(r))},200,{'Cache-Control':'public, max-age=60'});
}
