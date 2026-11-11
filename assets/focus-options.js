/* Matters-inspired focus workspace.
   Reuses the SAME form fields, cover uploader, metadata, and cloud save flow.
   No duplicated inputs, independent drafts, database changes, or hidden content edits. */
(() => {
  'use strict';
  const form=document.querySelector('#editor');
  const panel=document.querySelector('#studio-settings');
  const topbar=form?.querySelector('.form-top');
  const actions=topbar?.querySelector('.studio-top-actions');
  if(!form||!panel||!actions||!window.TRNFocus?.subscribe)return;
  const en=window.TRNAdminSite?.lang==='en';
  const text=(zh,enText)=>en?enText:zh;
  const get=s=>document.querySelector(s);
  const original=[];
  let active=false;
  let tab='content';

  const make=(tag,className,content)=>{
    const element=document.createElement(tag);
    if(className)element.className=className;
    if(content!==undefined)element.textContent=content;
    return element;
  };
  const optionsButton=make('button','zen-options-toggle',text('选项','Options'));
  optionsButton.id='zen-options-toggle';
  optionsButton.type='button';
  optionsButton.setAttribute('aria-controls','studio-settings');
  optionsButton.setAttribute('aria-expanded','false');
  const exitButton=make('button','zen-exit-focus',text('退出专注','Exit focus'));
  exitButton.id='zen-exit-focus';
  exitButton.type='button';
  const saveButtons=actions.querySelector('.editor-buttons');
  if(saveButtons)actions.insertBefore(optionsButton,saveButtons);
  else actions.append(optionsButton);
  actions.append(exitButton);

  const head=panel.querySelector('.studio-settings-head');
  const name=head?.querySelector('strong');
  const description=head?.querySelector('p');
  const collapse=head?.querySelector('#studio-settings-close');
  const oldTitle=name?.textContent;
  const oldDescription=description?.textContent;
  const oldCollapse=collapse?.textContent;

  const tabs=make('div','zen-tabs');
  tabs.setAttribute('role','tablist');
  tabs.setAttribute('aria-label',text('选项分类','Options categories'));
  const contentTab=make('button','zen-tab',text('内容与排版','Content & Layout'));
  contentTab.type='button';contentTab.id='zen-tab-content';
  contentTab.setAttribute('role','tab');
  contentTab.setAttribute('aria-controls','zen-content-pane');
  const workTab=make('button','zen-tab',text('作品设置','Post Settings'));
  workTab.type='button';workTab.id='zen-tab-work';
  workTab.setAttribute('role','tab');
  workTab.setAttribute('aria-controls','zen-work-pane');
  tabs.append(contentTab,workTab);

  const contentPane=make('section','zen-tab-pane');
  contentPane.id='zen-content-pane';
  contentPane.setAttribute('role','tabpanel');
  contentPane.setAttribute('aria-labelledby',contentTab.id);
  const workPane=make('section','zen-tab-pane');
  workPane.id='zen-work-pane';
  workPane.setAttribute('role','tabpanel');
  workPane.setAttribute('aria-labelledby',workTab.id);
  panel.append(tabs,contentPane,workPane);

  const tagsGroup=make('section','studio-settings-group zen-card');
  const tagsHeading=make('h3','',text('添加标签','Tags'));
  tagsGroup.append(tagsHeading);
  const layoutGroup=make('section','studio-settings-group zen-card');
  layoutGroup.append(make('h3','',text('内容与排版','Layout')));
  const layoutDesc=make('p','zen-card-desc',text(
    '正文采用宽敞行距。需要标题、对齐或缩进时，可以临时展开排版工具。',
    'Write with generous spacing. Show formatting tools when you need headings, alignment or indentation.'));
  const formatButton=make('button','zen-format-toggle',text('显示排版工具','Show formatting tools'));
  formatButton.type='button';
  formatButton.setAttribute('aria-pressed','false');
  layoutGroup.append(layoutDesc,formatButton);

  // Placeholder comments remember the exact original DOM positions.
  // Moving nodes inside the same <form> does not change their inputs/values.
  function move(element,destination){
    if(!element||!destination)return;
    const found=original.find(x=>x.element===element);
    if(!found){
      const marker=document.createComment('focus-options-original-position');
      element.parentNode?.insertBefore(marker,element);
      original.push({element,marker});
    }
    destination.append(element);
  }
  function restore(){
    for(const {element,marker} of [...original].reverse()){
      if(marker.parentNode){
        marker.parentNode.insertBefore(element,marker);
        marker.remove();
      }
    }
    original.length=0;
  }
  function collect(){
    const groups=[...panel.querySelectorAll(':scope > .studio-settings-group')];
    const category=groups.find(g=>g.querySelector('[name="type"]'));
    const cover=groups.find(g=>g.querySelector('[name="cover_url"]'));
    const tags=form.querySelector('.form-pair');
    if(tags&&tags.parentNode!==tagsGroup)move(tags,tagsGroup);
    if(category&&category.parentNode!==workPane)move(category,workPane);
    if(cover&&cover.parentNode!==contentPane)move(cover,contentPane);
    if(tagsGroup.parentNode!==contentPane)contentPane.append(tagsGroup);
    if(layoutGroup.parentNode!==contentPane)contentPane.append(layoutGroup);
    const placement=get('#studio-placement');
    if(placement&&placement.parentNode!==contentPane)move(placement,contentPane);
    const publish=get('#studio-publication-bar');
    if(publish&&publish.parentNode!==workPane)move(publish,workPane);
  }
  function showTab(next){
    tab=next==='work'?'work':'content';
    contentPane.hidden=tab!=='content';
    workPane.hidden=tab!=='work';
    for(const [button,selected] of [[contentTab,tab==='content'],[workTab,tab==='work']]){
      button.setAttribute('aria-selected',String(selected));
      button.tabIndex=selected?0:-1;
    }
    if(active)collect();
  }
  contentTab.addEventListener('click',()=>showTab('content'));
  workTab.addEventListener('click',()=>showTab('work'));
  tabs.addEventListener('keydown',event=>{
    if(!['ArrowRight','ArrowLeft'].includes(event.key))return;
    event.preventDefault();
    const to=tab==='content'?'work':'content';
    showTab(to);
    (to==='content'?contentTab:workTab).focus();
  });

  function close(){
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden','true');
    document.body.classList.remove('studio-panel-open','zen-options-open');
    const backdrop=get('.studio-backdrop');
    if(backdrop)backdrop.hidden=true;
    optionsButton.setAttribute('aria-expanded','false');
  }
  function open(){
    if(!active)return;
    collect();
    panel.classList.add('open');
    panel.setAttribute('aria-hidden','false');
    document.body.classList.add('zen-options-open');
    document.body.classList.remove('studio-panel-open');
    const backdrop=get('.studio-backdrop');
    if(backdrop)backdrop.hidden=true;
    optionsButton.setAttribute('aria-expanded','true');
    showTab(tab);
  }
  optionsButton.addEventListener('click',()=>panel.classList.contains('open')?close():open());
  exitButton.addEventListener('click',()=>window.TRNFocus.set(false));
  collapse?.addEventListener('click',()=>{
    if(active)close(); // Standard studio's existing close handler also runs.
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&active&&panel.classList.contains('open')){
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
      optionsButton.focus();
    }
  },true);

  function updateFormatButton(){
    const on=document.body.classList.contains('studio-focus-tools-visible');
    formatButton.textContent=on?text('收起排版工具','Hide formatting tools'):text('显示排版工具','Show formatting tools');
    formatButton.setAttribute('aria-pressed',String(on));
  }
  formatButton.addEventListener('click',()=>{
    document.body.classList.toggle('studio-focus-tools-visible');
    updateFormatButton();
  });

  function onFocusChange(next){
    active=!!next;
    document.body.classList.toggle('zen-writing-mode',active);
    optionsButton.hidden=!active;
    exitButton.hidden=!active;
    if(active){
      collect();
      if(name)name.textContent=text('选项','Options');
      if(description)description.textContent='';
      if(collapse){
        collapse.textContent=text('收起 ›','Collapse ›');
        collapse.setAttribute('aria-label',text('收起选项','Collapse options'));
      }
      showTab('content');
      updateFormatButton();
    }else{
      close();
      restore();
      if(name)name.textContent=oldTitle;
      if(description)description.textContent=oldDescription;
      if(collapse){
        collapse.textContent=oldCollapse;
        collapse.setAttribute('aria-label',text('关闭设置','Close settings'));
      }
    }
  }
  window.TRNFocus.subscribe(onFocusChange);
  window.TRNZenOptions={open,close,selectTab:showTab,isOpen:()=>active&&panel.classList.contains('open')};
})();