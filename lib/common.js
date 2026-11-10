export function send(data,status=200,headers={}) {
  return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
}
export const error=(message,status=400)=>send({error:message},status);
export function normalizePost(r, withBody=false){
  if(!r)return null;
  const {body, ...meta}=r;
  let tags=[];
  try{const parsed=JSON.parse(r.tags||'[]');if(Array.isArray(parsed))tags=parsed;}catch{}
  let collection_slugs=[];
  try{const parsed=JSON.parse(r.collection_slugs||'[]');if(Array.isArray(parsed))collection_slugs=parsed;}catch{}
  return {...meta,tags,collection_slugs,...(withBody?{body}:{} )};
}
export async function parseJson(request,maxLength=1000000){
  const contentType=request.headers.get('Content-Type')||'';
  if(!contentType.toLowerCase().startsWith('application/json'))throw new Error('Expected a JSON request.');
  const length=Number(request.headers.get('Content-Length')||0);
  if(length>maxLength)throw new Error('Request too large.');
  const raw=await request.text();if(raw.length>maxLength)throw new Error('Request too large.');
  return JSON.parse(raw);
}
export function sameOrigin(request){
  const origin=request.headers.get('Origin');
  return !origin || origin===new URL(request.url).origin;
}
export function validatePost(input){
  const s=v=>String(v??'').trim();
  const language=s(input.language);if(!['en','zh'].includes(language))throw new Error('Language must be English or Chinese.');
  const type=s(input.type);if(!['essay','fiction','poetry','note'].includes(type))throw new Error('Invalid category.');
  const title=s(input.title);if(!title||title.length>220)throw new Error('Title must contain 1 to 220 characters.');
  const slug=s(input.slug).toLowerCase();if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>110)throw new Error('Slug must contain lowercase letters, numbers, and hyphens.');
  const excerpt=s(input.excerpt);if(excerpt.length>1000)throw new Error('Excerpt is too long.');
  const cover_url=s(input.cover_url);
  if(cover_url.length>1000 || (cover_url && !(/^https:\/\/[^\s<>"']+$/i.test(cover_url)||/^\/assets\/(?:graphics|covers)\/[a-zA-Z0-9_./-]+\.(?:svg|png|jpe?g|webp|gif)$/i.test(cover_url)||/^\/media\/covers\/[0-9a-f-]{36}\.(?:jpg|png|webp|gif)$/i.test(cover_url))))throw new Error('封面必须是 HTTPS 图片地址、网站内图片路径或已上传的封面图片。');
  const body=String(input.body??'');if(body.length>500000)throw new Error('Article is too long.');
  const collection_slugs=String(input.collection_slugs||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
  if(collection_slugs.length>15||collection_slugs.some(v=>!(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v))||v.length>90))throw new Error('Invalid collection slugs.');
  const status=s(input.status);if(!['draft','published'].includes(status))throw new Error('Invalid publication status.');
  let tags=input.tags||[];if(typeof tags==='string')tags=tags.split(',').map(v=>v.trim());
  if(!Array.isArray(tags))throw new Error('Tags must be a list.');
  tags=[...new Set(tags.map(t=>s(t)).filter(Boolean))];if(tags.length>12||tags.some(t=>t.length>40))throw new Error('Too many tags or a tag is too long.');
  const words=body.match(/[\p{Script=Han}]|[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/gu)||[];
  return {language,type,slug,title,excerpt,cover_url,body,tags:JSON.stringify(tags),collection_slugs:JSON.stringify([...new Set(collection_slugs)]),status,word_count:words.length};
}
