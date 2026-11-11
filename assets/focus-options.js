/* Distraction-free writer for Chinese and English editions.
   Works with the full Toast UI studio and with the original textarea fallback.
   Reuses the existing form fields and server-side save workflow. */
(() => {
  'use strict';
  const form=document.querySelector('#editor');
  const top=form?.querySelector('.form-top');
  if(!form||!top||!window.TRNFocus?.subscribe)return;

  const en=window.TRNAdminSite?.lang==='en';
  const txt=(zh,english)=>en?english:zh;
  const $=selector=>document.querySelector(selector);
  const moved=[];
  let focused=false,tab='content';
  const titleInput=form.elements.namedItem('title');
  const excerptInput=form.elements.namedItem('excerpt');
  const bodyInput=form.elements.namedItem('body');
  const originalPlaceholders=[
    [titleInput,titleInput?.placeholder],
    [excerptInput,excerptInput?.placeholder],
    [bodyInput,bodyInput?.placeholder]
  ];

  const create=(tag,className='',label)=>{
    const el=document.createElement(tag);
    if(className)el.className=className;
    if(label!==undefined)el.textContent=label;
    return el;
  };
  function place(el,target){
    if(!el||!target||el.parentNode===target)return;
    if(!moved.some(entry=>entry.el===el)){
      const marker=document.createComment('zen-original-location');
      el.parentNode?.insertBefore(marker,el);
      moved.push({el,marker});
    }
    target.append(el);
  }
  function restore(){
    for(const entry of [...moved].reverse()){
      if(entry.marker.parentNode){
        entry.marker.parentNode.insertBefore(entry.el,entry.marker);
        entry.marker.remove();
      }
    }
    moved.length=0;
  }
  const toolbar=create('div','zen-header-actions');
  toolbar.id='zen-header-actions';
  const optionBtn=create('button','zen-action zen-option',txt('选项','Options'));
  optionBtn.id='zen-option-button';optionBtn.type='button';
  optionBtn.setAttribute('aria-expanded','false');
  optionBtn.setAttribute('aria-controls','zen-settings');
  const exitBtn=create('button','zen-action zen-exit',txt('退出专注','Exit focus'));
  exitBtn.type='button';
  const buttonSlot=create('div','zen-save-slot');
  toolbar.append(optionBtn,buttonSlot,exitBtn);
  top.append(toolbar);

  const sidebar=create('aside','zen-settings');
  sidebar.id='zen-settings';
  sidebar.setAttribute('aria-label',txt('写作选项','Writing options'));
  sidebar.setAttribute('aria-hidden','true');
  const header=create('div','zen-settings-header');
  header.append(create('h2','',txt('选项','Options')));
  const closeBtn=create('button','zen-collapse',txt('收起 ›','Collapse ›'));
  closeBtn.type='button';
  header.append(closeBtn);
  const tabs=create('div','zen-tabs');
  tabs.setAttribute('role','tablist');
  const contentBtn=create('button','zen-tab',txt('内容与排版','Content & Layout'));
  const workBtn=create('button','zen-tab',txt('作品设置','Post Settings'));
  contentBtn.type='button';workBtn.type='button';
  contentBtn.id='zen-tab-content';workBtn.id='zen-tab-work';
  contentBtn.setAttribute('role','tab');workBtn.setAttribute('role','tab');
  const content=create('div','zen-tab-pane');content.id='zen-content';
  const work=create('div','zen-tab-pane');work.id='zen-work';
  content.setAttribute('role','tabpanel');work.setAttribute('role','tabpanel');
  contentBtn.setAttribute('aria-controls',content.id);
  workBtn.setAttribute('aria-controls',work.id);
  tabs.append(contentBtn,workBtn);
  sidebar.append(header,tabs,content,work);
  form.append(sidebar);

  const card=(name,destination)=>{
    const c=create('section','zen-card');
    c.append(create('h3','',name));
    destination.append(c);
    return c;
  };
  const coverCard=card(txt('选择封面','Cover image'),content);
  const tagsCard=card(txt('添加标签','Tags'),content);
  const collectionCard=card(txt('加入系列或书籍','Collection & book'),content);
  const layoutCard=card(txt('内容与排版','Layout'),content);
  layoutCard.append(create('p','zen-help',txt(
    '正文默认为宽松排版。需要修改标题或对齐方式时，可以临时显示工具栏。',
    'The editor uses spacious typography. Reveal formatting tools to change headings or alignment.'
  )));
  const formatBtn=create('button','zen-format-button',txt('显示排版工具','Show formatting tools'));
  formatBtn.type='button';layoutCard.append(formatBtn);

  const publishCard=card(txt('发布状态','Publication'),work);
  const detailsCard=card(txt('文章信息','Post information'),work);

  function fieldLabel(name){
    const field=form.elements.namedItem(name);
    return field?.closest('label')||null;
  }
  function moveSettings(){
    // This resolves both versions of the editor: full studio and raw form.
    place(fieldLabel('cover_url'),coverCard);
    const tags=form.querySelector('.form-pair');
    if(tags)place(tags,tagsCard);
    place($('#studio-placement'),collectionCard);
    const publication=$('#studio-publication-bar');
    if(publication){
      place(publication,publishCard);
    }else{
      place(form.querySelector('.publishing-controls'),publishCard);
      place(form.querySelector('.publish-feedback'),publishCard);
      place($('#editor-message'),publishCard);
    }
    place(fieldLabel('type'),detailsCard);
    place(fieldLabel('slug'),detailsCard);
    // Use the single existing Save / Publish button; move, never clone.
    place(form.querySelector('.editor-buttons'),buttonSlot);
  }
  function switchTab(which){
    tab=which==='work'?'work':'content';
    content.hidden=tab!=='content';
    work.hidden=tab!=='work';
    contentBtn.setAttribute('aria-selected',String(tab==='content'));
    workBtn.setAttribute('aria-selected',String(tab==='work'));
    contentBtn.tabIndex=tab==='content'?0:-1;
    workBtn.tabIndex=tab==='work'?0:-1;
  }
  function close(){
    sidebar.classList.remove('open');
    document.body.classList.remove('zen-options-open');
    sidebar.setAttribute('aria-hidden','true');
    optionBtn.setAttribute('aria-expanded','false');
  }
  function open(){
    if(!focused)return;
    moveSettings();
    sidebar.classList.add('open');
    document.body.classList.add('zen-options-open');
    sidebar.setAttribute('aria-hidden','false');
    optionBtn.setAttribute('aria-expanded','true');
    switchTab(tab);
  }
  optionBtn.addEventListener('click',()=>sidebar.classList.contains('open')?close():open());
  closeBtn.addEventListener('click',()=>{close();optionBtn.focus();});
  exitBtn.addEventListener('click',()=>window.TRNFocus.set(false));
  contentBtn.addEventListener('click',()=>switchTab('content'));
  workBtn.addEventListener('click',()=>switchTab('work'));
  tabs.addEventListener('keydown',event=>{
    if(event.key!=='ArrowRight'&&event.key!=='ArrowLeft')return;
    event.preventDefault();
    switchTab(tab==='content'?'work':'content');
    (tab==='content'?contentBtn:workBtn).focus();
  });
  formatBtn.addEventListener('click',()=>{
    const showing=document.body.classList.toggle('studio-focus-tools-visible');
    formatBtn.textContent=showing?txt('收起排版工具','Hide formatting tools'):txt('显示排版工具','Show formatting tools');
    formatBtn.setAttribute('aria-pressed',String(showing));
  });

  function update(active){
    focused=!!active;
    // The old stacked focus styles conflicted with this clean page.
    // One class now owns its layout, so the raw textarea also has a fallback.
    document.body.classList.remove('studio-focus-mode');
    document.body.classList.toggle('zen-paper-mode',focused);
    toolbar.hidden=!focused;
    sidebar.hidden=!focused;
    if(focused){
      if(titleInput)titleInput.placeholder=txt('输入简单明了的标题','Enter a clear, concise title');
      if(excerptInput)excerptInput.placeholder=txt('摘要，让读者快速掌握主题','A short summary for your readers');
      if(bodyInput)bodyInput.placeholder=txt('写下你的故事…','Write your story…');
      moveSettings();
      switchTab('content');
      close();
      // Keep source Markdown hidden even when the optional visual editor fails.
      form.classList.remove('zen-textarea-fallback');
      const textarea=$('#content-body');
      if(textarea)textarea.hidden=true;
    }else{
      close();
      document.body.classList.remove('studio-focus-tools-visible');
      form.classList.remove('zen-textarea-fallback');
      restore();
      for(const [node,placeholder] of originalPlaceholders){
        if(node)node.placeholder=placeholder||'';
      }
    }
  }
  window.TRNFocus.subscribe(update);
  window.TRNZenOptions={open,close,selectTab:switchTab,isOpen:()=>focused&&sidebar.classList.contains('open')};
})();