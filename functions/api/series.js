import {error,send} from '../../lib/common.js';
export async function onRequestGet({request,env}) {
  if(!env.DB)return error('Database is not configured.',503);
  const lang=new URL(request.url).searchParams.get('lang')||'zh';
  if(!['en','zh'].includes(lang))return error('Invalid language.',400);
  const existing=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trn_series'").first();
  if(!existing)return send({enabled:false,series:[]});
  const {results}=await env.DB.prepare("SELECT language,slug,title,description,art,theme,category,sort_order FROM trn_series WHERE language=? AND status='published' ORDER BY sort_order,title").bind(lang).all();
  return send({enabled:true,series:results||[]},200,{'Cache-Control':'public, max-age=60'});
}
