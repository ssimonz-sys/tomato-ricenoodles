/* Recover the two essential author actions when a larger studio module fails.
   Registered early in capture phase, but delegates to the existing model.
   It never submits/saves an article and does not modify stored work. */
(() => {
  'use strict';
  const $=selector=>document.querySelector(selector);
  const language=window.TRNAdminSite?.lang||'zh';
  const en=language==='en';
  const show=msg=>{
    const target=$('#editor-message')||$('#editor-empty');
    if(target){
      target.textContent=msg;
      target.setAttribute('role','status');
    }
    console.error('[Author Studio]',msg);
  };
  const openingError=error=>(en?'Could not open the editor: ':'无法打开写作编辑器：')+
    String(error?.message||error||'Unknown error');
  function openNew(){
    if($('#desk-view')?.hidden!==false)return;
    if(!window.TRNDesk?.newPost){
      show(en?'Writing editor is unavailable. Reload the page before writing or publishing.':
        '写作脚本尚未正常启动。请刷新页面，暂时不要在此页面写作或发布。');
      return;
    }
    try{
      const ok=window.TRNDesk.newPost(language);
      if(ok===false)return; // Existing unsaved-change warning was declined.
      if($('#editor')?.hidden){
        show(en?'New post could not be displayed. Please refresh the page.':
          '已调用新建文章，但编辑区仍未显示。请刷新页面。');
        return;
      }
      $('#editor-message')?.setAttribute('role','status');
    }catch(error){show(openingError(error));}
  }
  function toggleFocus(){
    if($('#desk-view')?.hidden!==false)return;
    try{
      if(!window.TRNFocus?.toggle){
        show(en?'Focus mode is unavailable. Reload the editor.':
          '专注模式尚未正常启动，请刷新页面。');
        return;
      }
      const before=window.TRNFocus.isActive?.();
      window.TRNFocus.toggle();
      const after=window.TRNFocus.isActive?.();
      if(before===after&&$('#editor')?.hidden){
        // The controller has handled its own warning or a confirmation was rejected.
        return;
      }
    }catch(error){show(openingError(error));}
  }
  // Capture before the large editor modules. This prevents a partially bound
  // old handler from accidentally processing the same click a second time.
  document.addEventListener('click',event=>{
    const btn=event.target?.closest?.('#new-post,#studio-header-focus');
    if(!btn)return;
    if($('#desk-view')?.hidden!==false)return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    if(btn.id==='new-post')openNew();
    else toggleFocus();
  },true);
  // A visible error on startup is better than buttons that look functional
  // while their controller has failed to register.
  window.addEventListener('load',()=>{
    if($('#desk-view')?.hidden===false && !window.TRNDesk?.newPost){
      const target=$('#editor-empty');
      if(target)target.textContent=en?
        'The writing controls did not initialize. Reload the page.':
        '写作功能初始化失败，请刷新页面后再使用。';
    }
  });
})();