import {guard} from '../../../lib/auth.js';
import {error,send} from '../../../lib/common.js';

const MAX_BYTES=5*1024*1024;
function detect(bytes) {
  if(bytes.length>=8 && [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return {ext:'png',mime:'image/png'};
  if(bytes.length>=3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255)return {ext:'jpg',mime:'image/jpeg'};
  if(bytes.length>=12 && String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return {ext:'webp',mime:'image/webp'};
  if(bytes.length>=6 && ['GIF87a','GIF89a'].includes(String.fromCharCode(...bytes.slice(0,6))))return {ext:'gif',mime:'image/gif'};
  return null;
}

export async function onRequestPost(context) {
  const auth=await guard(context,true);
  if(auth.failed)return auth.failed;
  if(!context.env.COVERS)return error('图片存储尚未配置。请先将 R2 bucket trn-covers 绑定为 COVERS，并重新部署 Pages。',503);
  const request=context.request;
  const contentType=request.headers.get('content-type')||'';
  if(!/^multipart\/form-data\b/i.test(contentType))return error('请使用图片上传表单。',415);
  const length=Number(request.headers.get('content-length')||0);
  if(length>MAX_BYTES+1024*128)return error('图片不能超过 5 MB。',413);
  let form;
  try{form=await request.formData();}catch{return error('无法读取图片文件。',400);}
  const file=form.get('file');
  if(!file||typeof file.arrayBuffer!=='function'||typeof file.size!=='number')return error('请先选择图片文件。',400);
  if(file.size===0||file.size>MAX_BYTES)return error('图片大小须在 0 至 5 MB 之间。',413);
  // Never trust a filename extension or user-supplied MIME type.
  const buffer=await file.arrayBuffer();
  const kind=detect(new Uint8Array(buffer,0,Math.min(buffer.byteLength,16)));
  if(!kind)return error('仅支持 JPG、PNG、WebP 或 GIF 图片。',415);
  const filename=crypto.randomUUID()+'.'+kind.ext;
  try{
    await context.env.COVERS.put('covers/'+filename,buffer,{
      httpMetadata:{contentType:kind.mime,cacheControl:'public, max-age=31536000, immutable'}
    });
  }catch(e){
    console.error('R2 cover upload failed',e);
    return error('封面上传失败，请检查 R2 绑定和存储状态。',502);
  }
  return send({ok:true,url:'/media/covers/'+filename,size:buffer.byteLength,type:kind.mime},201);
}
