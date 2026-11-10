/* Shared cover chooser for post, series and book metadata. */
(() => {
  'use strict';
  const attached=new WeakMap();
  const MAX_SIZE=5*1024*1024;
  const MAX_STORED=1200000; // D1 per-row limit is 2MB; use a safer 1.2MB ceiling.
  const allowed=new Set(['image/png','image/jpeg','image/webp','image/gif']);

  async function compressForD1(source){
    if(source.size<=MAX_STORED)return source;
    if(source.type==='image/gif')throw Error('动态 GIF 需要小于 1.2 MB。请先压缩 GIF，或换用 JPG、PNG、WebP。');
    const objectUrl=URL.createObjectURL(source);
    let image;
    try{
      image=await new Promise((resolve,reject)=>{
        const img=new Image();
        img.onload=()=>resolve(img);
        img.onerror=()=>reject(Error('无法读取图片，请换一个文件。'));
        img.src=objectUrl;
      });
      if(!image.naturalWidth||!image.naturalHeight)throw Error('图片尺寸不正确。');
      const canvas=document.createElement('canvas');
      const ctx=canvas.getContext('2d');
      if(!ctx)throw Error('当前浏览器无法压缩图片。');
      const sourceLong=Math.max(image.naturalWidth,image.naturalHeight);
      for(const limit of [1600,1280,960,768,600]){
        const ratio=Math.min(1,limit/sourceLong);
        canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));
        canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(image,0,0,canvas.width,canvas.height);
        for(const quality of [0.85,0.72,0.60,0.46]){
          let blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
          if(blob && blob.type!=='image/webp'){
            ctx.globalCompositeOperation='destination-over';
            ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
            blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
            ctx.globalCompositeOperation='source-over';
          }
          if(blob && blob.size>0 && blob.size<=MAX_STORED){
            const ext=blob.type==='image/webp'?'webp':'jpg';
            return new File([blob],'cover.'+ext,{type:blob.type});
          }
        }
      }
      throw Error('图片压缩后仍然过大，请选择分辨率更低的封面。');
    }finally{
      URL.revokeObjectURL(objectUrl);
    }
  }
  const supportedUrl=value=>/^https:\/\/[^\s<>"']+$/i.test(value||'')||
    /^\/assets\/(?:graphics|covers)\/[a-z0-9_./-]+\.(?:svg|png|jpe?g|webp|gif)$/i.test(value||'')||
    /^\/media\/covers\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp|gif)$/i.test(value||'');

  function attach(input,{getCsrf=()=>'',onUploaded=()=>{}}={}){
    if(!input)return;
    if(attached.has(input)){attached.get(input).refresh();return attached.get(input);}
    const box=document.createElement('div');
    box.className='trn-cover-picker';
    const preview=document.createElement('img');
    preview.className='trn-cover-preview';
    preview.alt='当前封面预览';
    preview.loading='lazy';
    preview.hidden=true;
    const actions=document.createElement('div');
    actions.className='trn-cover-actions';
    const choose=document.createElement('button');
    choose.type='button';
    choose.className='trn-cover-choose';
    choose.textContent='↑ 从电脑上传封面';
    const hint=document.createElement('small');
    hint.textContent='支持 JPG、PNG、WebP、GIF。原图最多 5 MB，自动压缩后保存到 D1（无需绑定银行卡）；动态图需小于 1.2 MB。';
    const status=document.createElement('p');
    status.className='trn-cover-status';
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    const file=document.createElement('input');
    file.type='file';
    file.accept='image/jpeg,image/png,image/webp,image/gif';
    file.className='trn-cover-file';
    file.setAttribute('aria-label','选择封面图片');
    file.hidden=true;
    actions.append(choose,hint,status,file);
    box.append(preview,actions);
    input.after(box);

    function refresh(){
      const value=input.value.trim();
      if(supportedUrl(value)){
        preview.src=value;preview.hidden=false;
        box.classList.add('has-cover');
      }else{
        preview.removeAttribute('src');preview.hidden=true;
        box.classList.remove('has-cover');
      }
    }
    preview.addEventListener('error',()=>{
      preview.hidden=true;
      status.textContent='当前图片地址无法预览，请检查链接或重新上传。';
    });
    input.addEventListener('input',refresh);
    input.addEventListener('change',refresh);
    choose.addEventListener('click',()=>file.click());

    async function upload(selected){
      if(!selected)return;
      if(selected.size===0||selected.size>MAX_SIZE){
        status.textContent='图片最大支持 5 MB，请选择更小的文件。';
        return;
      }
      if(!allowed.has(selected.type)){
        status.textContent='请选择 JPG、PNG、WebP 或 GIF 图片。';
        return;
      }
      const csrf=getCsrf();
      if(!csrf){
        status.textContent='登录状态尚未就绪，请刷新后台后重试。';
        return;
      }
      choose.disabled=true;status.textContent='正在准备图片…';
      try{
        const ready=await compressForD1(selected);
        status.textContent=ready.size<selected.size?'已压缩图片，正在上传…':'图片上传中…';
        const body=new FormData();
        body.append('file',ready,ready.name);
        const result=await fetch('/api/admin/upload-cover',{
          method:'POST',credentials:'same-origin',headers:{'Accept':'application/json','X-CSRF-Token':csrf},body
        });
        const data=await result.json().catch(()=>({}));
        if(!result.ok)throw Error(data.error||'HTTP '+result.status);
        if(!supportedUrl(data.url))throw Error('服务器返回了无效图片地址。');
        input.value=data.url;
        input.dispatchEvent(new Event('input',{bubbles:true}));
        refresh();
        status.textContent='上传成功！'+(input.closest('#manager-dialog')?' 点击保存后应用封面。':'');
        onUploaded(data.url);
      }catch(error){
        status.textContent='上传失败：'+error.message;
      }finally{
        choose.disabled=false;
        file.value='';
      }
    }
    file.addEventListener('change',()=>upload(file.files?.[0]));
    box.addEventListener('dragover',event=>{event.preventDefault();box.classList.add('dragging');});
    box.addEventListener('dragleave',event=>{if(!box.contains(event.relatedTarget))box.classList.remove('dragging');});
    box.addEventListener('drop',event=>{
      event.preventDefault();box.classList.remove('dragging');
      upload(event.dataTransfer?.files?.[0]);
    });
    refresh();
    const api={refresh,upload};
    attached.set(input,api);
    return api;
  }
  window.TRNCoverUpload={attach,refresh(input){attached.get(input)?.refresh();}};
})();
