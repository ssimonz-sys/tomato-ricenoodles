import {error,send} from '../../lib/common.js';
const TABLE='trn_books';
export async function onRequestGet({request,env}){
  if(!env.DB)return error('Database is not configured.',503);
  const lang=new URL(request.url).searchParams.get('lang')||'zh';
  if(!['zh','en'].includes(lang))return error('Invalid language.');
  const ready=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(TABLE).first();
  if(!ready)return send({enabled:false,books:[],chapters:[],sections:[]});
  const seriesAvailable=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trn_series'").first();
  const series=seriesAvailable?(await env.DB.prepare("SELECT t.language,t.slug,t.title,t.description,t.art,t.theme,t.category,t.sort_order, "+activity+" AS last_activity FROM trn_series t WHERE t.language=? AND t.status='published' ORDER BY last_activity DESC,t.created_at DESC,t.slug").bind(lang).all()).results||[]:[];
  const hiddenParents=seriesAvailable?" AND (series_slug='' OR EXISTS (SELECT 1 FROM trn_series t WHERE t.language=trn_books.language AND t.slug=trn_books.series_slug AND t.status='published'))":"";
  const [b,c,s]=await Promise.all([
    env.DB.prepare("SELECT id,language,series_slug,title,description,cover_url,status,sort_order FROM trn_books WHERE language=? AND status='published'"+hiddenParents+" ORDER BY sort_order,title").bind(lang).all(),
    env.DB.prepare("SELECT ch.id,ch.book_id,ch.title,ch.description,ch.sort_order FROM trn_chapters ch JOIN trn_books b ON ch.book_id=b.id WHERE b.language=? AND b.status='published' AND ch.status='published'"+(seriesAvailable?" AND (b.series_slug='' OR EXISTS (SELECT 1 FROM trn_series t WHERE t.language=b.language AND t.slug=b.series_slug AND t.status='published'))":"")+" ORDER BY ch.created_at,ch.id").bind(lang).all(),
    env.DB.prepare("SELECT l.post_id,l.chapter_id,l.sort_order,p.slug,p.title,p.excerpt,p.word_count,p.published_at FROM trn_section_links l JOIN posts p ON p.id=l.post_id JOIN trn_chapters c ON c.id=l.chapter_id JOIN trn_books b ON b.id=c.book_id WHERE p.language=? AND p.status='published' AND b.language=? AND b.status='published' AND c.status='published'"+(seriesAvailable?" AND (b.series_slug='' OR EXISTS (SELECT 1 FROM trn_series t WHERE t.language=b.language AND t.slug=b.series_slug AND t.status='published'))":"")+" ORDER BY l.sort_order,p.title").bind(lang,lang).all()
  ]);
  return send({enabled:true,series,books:b.results||[],chapters:c.results||[],sections:s.results||[]},200,{'Cache-Control':'public,max-age=60'});
}
