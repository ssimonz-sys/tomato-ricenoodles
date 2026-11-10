import {error,normalizePost,send} from '../../../lib/common.js';
export async function onRequestGet({request,env,params}){
  if(!env.DB)return error('Database is not configured.',503);
  const lang=new URL(request.url).searchParams.get('lang')||'en';
  if(!['en','zh'].includes(lang))return error('Invalid language.');
  const slug=decodeURIComponent(params.slug||'');
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return error('Invalid article slug.');
  const p=await env.DB.prepare("SELECT * FROM posts WHERE language=? AND slug=? AND status='published'").bind(lang,slug).first();
  if(!p)return error('Article not found.',404);
  return send({post:normalizePost(p,true)},200,{'Cache-Control':'public,max-age=60'});
}
