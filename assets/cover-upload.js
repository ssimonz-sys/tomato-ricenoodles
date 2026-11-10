/* Shared cover chooser for post, series and book metadata. */
(() => {
  'use strict';
  const attached=new WeakMap();
  const MAX_SIZE=5*1024*1024;
  const allowed=new Set(['image/png','image/jpeg','image/webp','image/gif']);
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
    hint.textContent='支持 JPG、PNG、WebP、GIF，最大 5 MB。也可以直接粘贴图片网址。';
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
      choose.disabled=true;status.textContent='图片上传中…';
      try{
        const body=new FormData();
        body.append('file',selected,selected.name);
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
