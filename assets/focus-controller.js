/* Standalone focus-mode controller for both author editions.
   Runs independently of the long-form editor's optional initialization.
   It never modifies article text, form data, or cloud storage. */
(() => {
  'use strict';
  const form=document.querySelector('#editor');
  if(!form)return;
  const $=selector=>document.querySelector(selector);
  const edition=window.TRNAdminSite?.lang||'zh';
  const en=edition==='en';
  let active=false;
  const subscribers=new Set();

  function ensureExitButton(){
    let button=$('#studio-focus-fab');
    if(!button){
      button=document.createElement('button');
      button.id='studio-focus-fab';
      button.type='button';
      button.className='studio-focus-fab';
      document.body.append(button);
    }
    return button;
  }

  function labels(){
    const top=$('#studio-header-focus');
    const inner=$('#studio-focus');
    const floating=ensureExitButton();
    const title=active?(en?'Exit focus':'退出专注'):(en?'Focus mode':'专注写作');
    const description=active?(en?'Exit distraction-free writing':'退出专注写作'):(en?'Enter distraction-free writing':'进入专注写作');
    for(const node of [top,inner,floating]){
      if(!node)continue;
      node.textContent=title;
      node.title=description;
      node.setAttribute('aria-pressed',String(active));
      node.setAttribute('aria-label',description);
    }
    floating.hidden=$('#desk-view')?.hidden!==false||form.hidden;
    const formatting=$('#studio-focus-format');
    if(formatting){
      formatting.hidden=!active;
      formatting.setAttribute('aria-pressed','false');
      formatting.textContent=en?'Show formatting tools':'显示排版工具';
    }
  }

  function openEditorIfNeeded(){
    if($('#desk-view')?.hidden!==false)return false;
    if(!form.hidden)return true;
    const opened=window.TRNDesk?.newPost?.(edition);
    if(opened===false||form.hidden){
      const message=$('#editor-message')||$('#login-message');
      if(message)message.textContent=en?
        'Open an article or create a new post before entering focus mode.':
        '请先打开一篇文章，或新建文章后再进入专注模式。';
      return false;
    }
    return true;
  }

  function set(next){
    next=!!next;
    if(next&&!openEditorIfNeeded())return false;
    active=next;
    document.body.classList.toggle('studio-focus-mode',active);
    document.body.classList.remove('studio-focus-tools-visible');
    document.documentElement.setAttribute('data-trn-focus',active?'on':'off');
    const settings=$('#studio-settings');
    if(active&&settings?.classList.contains('open')){
      settings.classList.remove('open');
      settings.setAttribute('aria-hidden','true');
      const backdrop=$('.studio-backdrop');
      if(backdrop)backdrop.hidden=true;
      document.body.classList.remove('studio-panel-open');
    }
    labels();
    for(const subscriber of subscribers){try{subscriber(active);}catch(err){console.error('Focus layout subscriber failed',err);}}
    if(active){
      // Bring the editor into view; the existing editor element stays mounted
      // so cursor position, undo history and draft autosaving survive.
      requestAnimationFrame(()=>{
        $('#editor')?.scrollIntoView?.({block:'start'});
        const titleField=form.elements.namedItem('title');
        const target=(!titleField?.value?.trim()?titleField:null)||
          $('#studio-rich-editor .toastui-editor-ww-container [contenteditable="true"]')||
          $('#studio-rich-editor .toastui-editor-md-container .CodeMirror textarea')||
          $('#content-body');
        if(target&&!target.hidden)target.focus?.({preventScroll:true});
      });
    }
    return true;
  }

  const toggle=()=>set(!active);
  const controlled='#studio-header-focus,#studio-focus,#studio-focus-fab';
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.(controlled);
    if(!button)return;
    // Capture before older editor listeners so one click means one toggle.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    toggle();
  },true);
  document.addEventListener('keydown',event=>{
    if(event.altKey&&event.shiftKey&&event.key?.toLowerCase()==='f'&&!event.metaKey&&!event.ctrlKey){
      event.preventDefault();
      event.stopImmediatePropagation?.();
      toggle();
      return;
    }
    if(event.key==='Escape'&&active){
      event.preventDefault();
      event.stopImmediatePropagation?.();
      if(window.TRNZenOptions?.isOpen?.()){
        window.TRNZenOptions.close();
        return;
      }
      if(!$('#studio-settings')?.classList.contains('open'))set(false);
    }
  },true);

  const api={set,toggle,isActive:()=>active,refresh:labels,
    subscribe(callback){
      if(typeof callback!=='function')return ()=>{};
      subscribers.add(callback);
      callback(active);
      return ()=>subscribers.delete(callback);
    }
  };
  window.TRNFocus=api;
  if(window.TRNStudio){
    window.TRNStudio.toggleFocus=toggle;
    window.TRNStudio.exitFocus=()=>set(false);
    window.TRNStudio.isFocused=()=>active;
  }
  labels();
})();