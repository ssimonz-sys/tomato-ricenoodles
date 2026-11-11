/* Safety net for author actions.
   Normal writing and focus controllers own clicks when initialized.
   This file only handles missing controllers and gives VISIBLE errors.
   It does not change post content or save anything. */
(() => {
  'use strict';
  const $=selector=>document.querySelector(selector);
  const language=window.TRNAdminSite?.lang||'zh';
  const en=language==='en';
  function show(msg){
    const form=$('#editor');
    const target=form&&!form.hidden?$('#editor-message'):$('#editor-empty');
    const fallback=target||$('#login-message');
    if(fallback){
      fallback.textContent=msg;
      fallback.setAttribute('role','alert');
      fallback.hidden=false;
    }
    console.error('[Author Studio]',msg);
  }
  function openNew(){
    if(!window.TRNDesk?.newPost){
      if(window.TRNAdminBootError){
        show((en?'Writing editor initialization error: ':'写作编辑器启动错误：')+window.TRNAdminBootError);
        return;
      }
      show(en?
        'The writing editor failed to start. Please reload the page. Your saved posts have not been changed.':
        '写作编辑器未能正常启动，请刷新页面。已有文章未被修改。');
      return;
    }
    try{
      const ok=window.TRNDesk.newPost(language);
      if(ok===false)return;
      if($('#editor')?.hidden){
        show(en?'The writing form did not open. Please reload the page.':
          '写作表单未能打开，请刷新页面。');
        return;
      }
      try{history.replaceState({},'',location.pathname+'?new=1');}
      catch(error){console.warn('Unable to update new-post URL',error);}
    }catch(error){
      show((en?'Unable to create a new post: ':'无法新建文章：')+String(error?.message||error));
    }
  }
  function toggleFallbackFocus(){
    try{
      if(window.TRNStudio?.toggleFocus){
        window.TRNStudio.toggleFocus();
        return;
      }
      show(en?'Focus mode failed to initialize. Please reload the page.':
        '专注模式未能初始化，请刷新页面。');
    }catch(error){
      show((en?'Unable to open focus mode: ':'无法进入专注模式：')+String(error?.message||error));
    }
  }
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('#new-post,#studio-header-focus');
    if(!button||$('#desk-view')?.hidden!==false)return;
    if(button.id==='new-post'){
      // Once admin.js is bound, let its native handler preserve dirty-change
      // confirmation, URL state, autosave, and existing article data.
      if(button.dataset.trnNewPostReady==='1')return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openNew();
      return;
    }
    // Let the single independent focus controller handle this click.
    if(window.TRNFocus?.toggle)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toggleFallbackFocus();
  },true);
  window.addEventListener('load',()=>{
    if($('#desk-view')?.hidden===false&&!window.TRNDesk?.newPost){
      show(en?'Writing controls failed to initialize. Reload before editing.':
        '写作功能初始化失败，请刷新后再编辑文章。');
    }
  });
})();
