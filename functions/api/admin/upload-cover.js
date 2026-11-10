import {guard} from '../../../lib/auth.js';
import {error,send} from '../../../lib/common.js';

// Uses the existing D1 binding; no R2 subscription or payment method required.
// D1 has a hard 2MB per-BLOB limit; leave room for row overhead and future changes.
const MAX_INPUT=5*1024*1024;
const MAX_STORED=1200000;
const SQL="CREATE TABLE IF NOT EXISTS trn_cover_images (filename TEXT PRIMARY KEY, content_type TEXT NOT NULL, image_data BLOB NOT NULL, size_bytes INTEGER NOT NULL, created_at INTEGER NOT NULL)";
function detect(bytes) {
  if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return {ext:'png',mime:'image/png'};
  if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return {ext:'jpg',mime:'image/jpeg'};
  if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return {ext:'webp',mime:'image/webp'};
  if(bytes.length>=6&&['GIF87a','GIF89a'].includes(String.fromCharCode(...bytes.slice(0,6))))return {ext:'gif',mime:'image/gif'};
  return null;
}
export async function onRequestPost(context) {
  const auth=await guard(context,true);
  if(auth.failed)return auth.failed;
  if(!context.env.DB)return error('D1 数据库未绑定，请检查 Pages 的 DB 绑定。',503);
  const request=context.request;
  if(!/^multipart\/form-data\b/i.test(request.headers.get('content-type')||''))return error('请使用图片上传表单。',415);
  const length=Number(request.headers.get('content-length')||0);
  if(length>MAX_INPUT+128*1024)return error('请选择小于 5 MB 的原始图片。',413);
  let form;
  try{form=await request.formData();}catch{return error('无法读取图片文件。',400);}
  const file=form.get('file');
  if(!file||typeof file.arrayBuffer!=='function'||typeof file.size!=='number')return error('请先选择图片。',400);
  if(file.size===0||file.size>MAX_STORED)return error('上传图片应在 1.2 MB 以内。请用网站的自动压缩上传，或换一张图片。',413);
  const bytes=new Uint8Array(await file.arrayBuffer());
  const kind=detect(bytes.subarray(0,16));
  if(!kind)return error('仅支持 JPG、PNG、WebP 和 GIF 图片。',415);
  const filename=crypto.randomUUID()+'.'+kind.ext;
  try {
    await context.env.DB.prepare(SQL).run();
    await context.env.DB.prepare("INSERT INTO trn_cover_images(filename,content_type,image_data,size_bytes,created_at) VALUES(?,?,?,?,?)")
      .bind(filename,kind.mime,bytes,bytes.byteLength,Math.floor(Date.now()/1000)).run();
  } catch(e) {
    console.error('D1 cover storage failed',e);
    return error('图片写入 D1 失败，请检查数据库容量。',502);
  }
  return send({ok:true,url:'/media/covers/'+filename,size:bytes.byteLength,type:kind.mime,storage:'D1'},201);
}
