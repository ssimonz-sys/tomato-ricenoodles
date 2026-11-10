// Public cover delivery from the existing D1 DB. No R2 or public bucket needed.
export async function onRequestGet({params,env,request}) {
  if(!env.DB)return new Response('Storage unavailable',{status:503});
  const name=String(params.file||'');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif)$/.test(name))
    return new Response('Not found',{status:404});
  let row;
  try {
    row=await env.DB.prepare('SELECT content_type,image_data FROM trn_cover_images WHERE filename=?').bind(name).first();
  } catch (e) {
    // The table will be created on the first successful upload.
    return new Response('Not found',{status:404});
  }
  if(!row?.image_data)return new Response('Not found',{status:404});
  const allowed={'jpg':'image/jpeg','png':'image/png','webp':'image/webp','gif':'image/gif'};
  const ext=name.split('.').pop();
  const mime=allowed[ext];
  if(row.content_type!==mime)return new Response('Not found',{status:404});
  const bytes=row.image_data instanceof Uint8Array?row.image_data:new Uint8Array(row.image_data);
  const etag='"'+name+'"';
  const headers=new Headers({
    'Content-Type':mime,
    'Content-Length':String(bytes.byteLength),
    'Cache-Control':'public, max-age=31536000, immutable',
    'ETag':etag,
    'X-Content-Type-Options':'nosniff',
    'Cross-Origin-Resource-Policy':'same-origin'
  });
  if(request?.headers?.get('if-none-match')===etag)return new Response(null,{status:304,headers});
  return new Response(bytes,{status:200,headers});
}
