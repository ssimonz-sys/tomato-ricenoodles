import {error,send} from '../../lib/common.js';
export async function onRequestGet({request,env}) {
  if(!env.DB)return error('Database is not configured.',503);
  const lang=new URL(request.url).searchParams.get('lang')||'zh';
  if(!['en','zh'].includes(lang))return error('Invalid language.',400);
  const existing=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trn_series'").first();
  if(!existing)return send({enabled:false,series:[]});
  const {results}=await env.DB.prepare("SELECT t.language,t.slug,t.title,t.description,t.art,t.theme,t.category,t.sort_order, MAX(COALESCE((SELECT MAX(p.updated_at) FROM posts p WHERE p.language=t.language AND p.status='published' AND EXISTS (SELECT 1 FROM json_each(p.collection_slugs) j WHERE j.value=t.slug)),''),COALESCE((SELECT MAX(p.updated_at) FROM posts p JOIN trn_section_links l ON l.post_id=p.id JOIN trn_chapters ch ON ch.id=l.chapter_id JOIN trn_books b ON b.id=ch.book_id WHERE b.language=t.language AND b.series_slug=t.slug AND p.status='published'),''),t.created_at) AS last_activity FROM trn_series t WHERE t.language=? AND t.status='published' ORDER BY last_activity DESC,t.created_at DESC,t.slug").bind(lang).all();
  return send({enabled:true,series:results||[]},200,{'Cache-Control':'public, max-age=60'});
}
