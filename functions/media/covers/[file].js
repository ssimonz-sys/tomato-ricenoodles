// Public image URL from a private R2 bucket binding: no public bucket domain needed.
export async function onRequestGet({params,env,request}) {
  if(!env.COVERS)return new Response('Storage unavailable',{status:503});
  const name=String(params.file||'');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif)$/.test(name))
    return new Response('Not found',{status:404});
  const object=await env.COVERS.get('covers/'+name);
  if(!object||!object.body)return new Response('Not found',{status:404});
  const mime={'jpg':'image/jpeg','png':'image/png','webp':'image/webp','gif':'image/gif'}[name.split('.').pop()];
  const headers=new Headers({
    'Content-Type':mime,
    'Cache-Control':'public, max-age=31536000, immutable',
    'X-Content-Type-Options':'nosniff',
    'Cross-Origin-Resource-Policy':'same-origin'
  });
  if(object.httpEtag)headers.set('ETag',object.httpEtag);
  if(request.headers.get('if-none-match')===object.httpEtag)return new Response(null,{status:304,headers});
  return new Response(object.body,{status:200,headers});
}
