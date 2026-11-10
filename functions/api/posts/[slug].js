import {error,normalizePost,send} from '../../../lib/common.js';
export async function onRequestGet({request,env,params}){
  if(!env.DB)return error('Database is not configured.',503);
  const lang=new URL(request.url).searchParams.get('lang')||'en';
  if(!['en','zh'].includes(lang))return error('Invalid language.');
  const slug=decodeURIComponent(params.slug||'');
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return error('Invalid article slug.');
  const p=await env.DB.prepare("SELECT * FROM posts WHERE language=? AND slug=? AND status='published'").bind(lang,slug).first();
  if(!p)return error('Article not found.',404);
  const enabled=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trn_section_links'").first();
  if(enabled){
    const parent=await env.DB.prepare("SELECT c.status AS chapter_status,b.status AS book_status,b.language AS book_language,b.series_slug FROM trn_section_links l JOIN trn_chapters c ON c.id=l.chapter_id JOIN trn_books b ON b.id=c.book_id WHERE l.post_id=?").bind(p.id).first();
    if(parent && (parent.chapter_status!=='published'||parent.book_status!=='published'||parent.book_language!==lang))return error('Article not found.',404);
    if(parent?.series_slug){
      const seriesEnabled=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trn_series'").first();
      if(seriesEnabled){
        const series=await env.DB.prepare("SELECT status FROM trn_series WHERE language=? AND slug=?").bind(lang,parent.series_slug).first();
        if(!series || series.status!=='published')return error('Article not found.',404);
      }
    }
  }
  return send({post:normalizePost(p,true)},200,{'Cache-Control':'public,max-age=60'});
}
