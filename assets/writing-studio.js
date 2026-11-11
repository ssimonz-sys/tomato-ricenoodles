/* Tomato Ricenoodles: long-form writing studio. Uses the existing Markdown + D1 API. */
(() => {
  'use strict';
  const form = document.querySelector('#editor');
  if (!form) return;
  const $ = selector => document.querySelector(selector);
  // Keep stable references before moving fields into temporarily detached
  // publishing and settings panels. form.elements only contains controls that
  // are currently connected to this form. Without caching, moving .form-pair
  // makes collection_slugs unavailable and aborts studio initialization while
  // the language selector is still detached in publicationBar.
  const originalFields = Object.create(null);
  for (const control of form.querySelectorAll('[name]')) {
    if (control.name && !originalFields[control.name]) originalFields[control.name] = control;
  }
  const field = name => originalFields[name] || form.elements.namedItem(name);
  const textarea = $('#content-body');
  let rich = null;
  let loading = false;
  let readingPreview = false;
  let outlineTimer = null;
  let focused = false;
  let legacyLayoutSource='';
  const specialLayout=/<span data-trn-(?:align|indent)=/;
  const visuallyEquivalent=(a,b)=>String(a||'').replace(/<span data-trn-(?:align|indent)="[^"]+"><\/span>/g,'').replace(/\s+/g,' ').trim()===
    String(b||'').replace(/<span data-trn-(?:align|indent)="[^"]+"><\/span>/g,'').replace(/\s+/g,' ').trim();
  const htmlEscape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // Move metadata into a drawer while keeping every field inside the existing form.
  const layout = document.createElement('div');
  layout.className = 'studio-layout';
  const paper = document.createElement('div');
  paper.className = 'studio-paper';
  const outline = document.createElement('aside');
  outline.className = 'studio-outline';
  outline.setAttribute('aria-label', '文章大纲');
  outline.innerHTML = '<div class="studio-outline-head"><strong>文章大纲</strong><span id="studio-heading-count">0 节</span></div><div id="studio-outline-items"></div><p class="studio-outline-tip">标题支持六级层次，点击可跳转。</p>';
  const richMount = document.createElement('div');
  richMount.id = 'studio-rich-editor';
  const settings = document.createElement('aside');
  settings.id = 'studio-settings';
  settings.className = 'studio-settings';
  settings.setAttribute('aria-label', '作品设置');
  settings.setAttribute('aria-hidden', 'true');
  settings.innerHTML = '<div class="studio-settings-head"><div><strong>作品设置</strong><p>发布站点、分类与文章信息</p></div><button type="button" id="studio-settings-close" aria-label="关闭设置">×</button></div>';
  const backdrop = document.createElement('div');
  backdrop.className = 'studio-backdrop';
  backdrop.hidden = true;
  const topbar = form.querySelector('.form-top');
  // Mount destinations first. Moving controls between CONNECTED descendants
  // keeps them in form.elements throughout startup, even if a later step fails.
  layout.append(paper, outline);
  topbar.after(layout);
  form.append(backdrop, settings);

  function addSettingsGroup(label, elements) {
    const section = document.createElement('section');
    section.className = 'studio-settings-group';
    const h = document.createElement('h3');
    h.textContent = label;
    section.append(h);
    elements.filter(Boolean).forEach(el => section.append(el));
    settings.append(section);
  }
  // Keep publication fields visible: hiding native required inputs blocked
  // the submit event entirely and made clicking Publish appear to do nothing.
  const publicationBar=document.createElement('section');
  publicationBar.id='studio-publication-bar';
  publicationBar.className='studio-publication-bar';
  publicationBar.setAttribute('aria-label','发布与归档');
  publicationBar.innerHTML='<div class="studio-publication-head"><strong>发布与归档</strong><span>选择语言和公开状态，然后把作品收进系列或书籍</span></div>';
  paper.append(publicationBar);
  const publishingControls=form.querySelector('.publishing-controls');
  publicationBar.append(publishingControls);
  addSettingsGroup('分类与专题', [field('type').closest('label'),form.querySelector('.form-pair')]);
  const slugLabel=field('slug').closest('label');
  slugLabel.classList.add('studio-slug-field');
  publicationBar.append(slugLabel);
  // The structured placement selector replaces manual comma-separated slugs.
  field('collection_slugs').closest('label').hidden=true;
  addSettingsGroup('封面图片', [field('cover_url').closest('label')]);
  const help = form.querySelector('.pair-help');
  if (help) settings.append(help);

  const title = field('title').closest('label');
  const excerpt = field('excerpt').closest('label');
  const bodyTop = form.querySelector('.body-top');
  const previewNode = $('#markdown-preview');
  const info = document.createElement('div');
  info.className = 'studio-paper-info';
  info.innerHTML = '<span id="studio-word-count">0 字</span><span id="studio-live-headings">0 个标题</span><span>支持长篇与附录分节</span>';
  paper.append(title, excerpt, publicationBar, bodyTop, richMount, textarea, previewNode, info);
  const publishFeedback=form.querySelector('.publish-feedback');
  if(publishFeedback)publicationBar.append(publishFeedback);
  const editorMessage=form.querySelector('#editor-message');
  if(editorMessage){
    editorMessage.setAttribute('aria-live','assertive');
    editorMessage.setAttribute('role','status');
    publicationBar.append(editorMessage);
  }

  const actions = document.createElement('div');
  actions.className = 'studio-top-actions';
  actions.innerHTML = '<button type="button" class="studio-small-button" id="studio-focus">专注写作</button><button type="button" class="studio-small-button" id="studio-settings-open">作品设置</button>';
  const focusFormatting = document.createElement('button');
  focusFormatting.type = 'button';
  focusFormatting.className = 'studio-small-button';
  focusFormatting.id = 'studio-focus-format';
  focusFormatting.textContent = '显示排版工具';
  focusFormatting.setAttribute('aria-pressed', 'false');
  focusFormatting.hidden = true;
  actions.insertBefore(focusFormatting, actions.querySelector('#studio-settings-open'));
  const oldButtons = form.querySelector('.editor-buttons');
  if (oldButtons) actions.append(oldButtons);
  const bottom = form.querySelector('.editor-bottom');
  if (bottom) bottom.hidden = true;
  topbar.append(actions);

  // All formatting is handled directly in the visual editor toolbar.
  const hint=document.createElement('p');
  hint.className='studio-editor-hint';
  hint.textContent='直接编辑正文，可在工具栏设置标题、粗体、斜体和引用。';
  const layoutStatus=document.createElement('p');
  layoutStatus.id='studio-layout-status';
  layoutStatus.className='studio-layout-status';
  layoutStatus.setAttribute('role','status');
  layoutStatus.setAttribute('aria-live','polite');
  bodyTop.before(hint,layoutStatus);
  // Intercept clipboard events before Toast UI processes rich HTML. Keep only
  // Unicode text, line breaks and spaces; styling comes from this editor.
  window.TRNPlainTextPaste?.install(richMount,()=>rich,textarea,()=>{
    syncEditor();
    scheduleOutline();
  });

  function closeSettings() {
    settings.classList.remove('open');
    settings.setAttribute('aria-hidden', 'true');
    backdrop.hidden = true;
    document.body.classList.remove('studio-panel-open');
  }
  function openSettings() {
    settings.classList.add('open');
    settings.setAttribute('aria-hidden', 'false');
    backdrop.hidden = false;
    document.body.classList.add('studio-panel-open');
    $('#studio-settings-close').focus();
  }
  $('#studio-settings-open').addEventListener('click', openSettings);
  $('#studio-settings-close').addEventListener('click', closeSettings);
  backdrop.addEventListener('click', closeSettings);
  document.addEventListener('keydown', event => { if(event.key === 'Escape') closeSettings(); });
  function setFocusMode(next) {
    focused = next;
    document.body.classList.toggle('studio-focus-mode', next);
    document.body.classList.remove('studio-focus-tools-visible');
    $('#studio-focus').textContent = next ? '退出专注' : '专注写作';
    $('#studio-focus').setAttribute('aria-pressed', String(next));
    if(headerFocus){
      headerFocus.textContent=next?'退出专注':'专注写作';
      headerFocus.setAttribute('aria-pressed',String(next));
      headerFocus.setAttribute('title',next?'退出专注写作':'进入专注写作');
    }
    focusFab.textContent=next?'退出专注':'专注写作';
    focusFab.title=next?'退出专注模式':'进入专注写作';
    focusFab.setAttribute('aria-pressed',String(next));
    focusFormatting.hidden = !next;
    focusFormatting.textContent = '显示排版工具';
    focusFormatting.setAttribute('aria-pressed', 'false');
    if (next) {
      closeSettings();
      // The rich editor stays mounted, keeping the draft, cursor and undo history.
      requestAnimationFrame(() => {
        const target = richMount.querySelector('.toastui-editor-ww-container [contenteditable="true"]')
          || richMount.querySelector('.toastui-editor-md-container .CodeMirror textarea')
          || (!rich ? textarea : null);
        target?.focus({preventScroll:true});
      });
    }
  }
  $('#studio-focus').addEventListener('click', () => setFocusMode(!focused));
  const headerFocus=$('#studio-header-focus');
  if(headerFocus){
    headerFocus.addEventListener('click',()=>setFocusMode(!focused));
    headerFocus.setAttribute('aria-pressed','false');
  }
  const focusFab=document.createElement('button');
  focusFab.type='button';focusFab.id='studio-focus-fab';
  focusFab.className='studio-focus-fab';
  focusFab.textContent='专注写作';
  focusFab.title='进入专注写作';
  focusFab.setAttribute('aria-label','切换专注写作模式');
  focusFab.setAttribute('aria-pressed','false');
  document.body.append(focusFab);
  focusFab.addEventListener('click',()=>setFocusMode(!focused));
  focusFormatting.addEventListener('click', () => {
    const visible = document.body.classList.toggle('studio-focus-tools-visible');
    focusFormatting.textContent = visible ? '收起排版工具' : '显示排版工具';
    focusFormatting.setAttribute('aria-pressed', String(visible));
  });
  document.addEventListener('keydown', event => {
    // The standalone controller owns keyboard shortcuts when available.
    if(window.TRNFocus)return;
    // Alt + Shift + F toggles focus without touching the document.
    if(event.altKey&&event.shiftKey&&event.key.toLowerCase()==='f'&&!event.metaKey&&!event.ctrlKey){
      if(!form.hidden&&$('#desk-view')?.hidden===false){
        event.preventDefault();
        setFocusMode(!focused);
      }
      return;
    }
    // Capturing before the settings drawer's own Escape handler avoids exiting
    // focus mode on the same keypress that merely closes the drawer.
    if (event.key === 'Escape' && focused && !settings.classList.contains('open')) setFocusMode(false);
  }, true);

  // Store the same Markdown representation for compatibility with existing
  // published articles. Readers and the database remain unchanged.
  function validateContent(){
    if(!rich)throw Error('所见即所得编辑器加载失败，请刷新页面后再保存。');
    const next=rich.getMarkdown();
    if(legacyLayoutSource&&specialLayout.test(legacyLayoutSource)&&
       !specialLayout.test(next)&&!visuallyEquivalent(legacyLayoutSource,next)){
      throw Error('此文章含有旧版段落缩进或对齐标记。当前修改会丢失这些格式，暂时禁止覆盖保存，请先备份文章。');
    }
  }
  function getMarkdown(){
    if(!rich)return textarea.value;
    const value=rich.getMarkdown();
    if(legacyLayoutSource&&specialLayout.test(legacyLayoutSource)&&
       !specialLayout.test(value)&&visuallyEquivalent(legacyLayoutSource,value))return legacyLayoutSource;
    return value;
  }
  function syncEditor(){
    if(loading||!rich)return;
    const next=getMarkdown();
    if(textarea.value!==next){
      textarea.value=next;
      textarea.dispatchEvent(new Event('input',{bubbles:true}));
    }
    scheduleOutline();
  }
  function initRich() {
    if (rich || !window.toastui || !window.toastui.Editor) return;
    try {
      rich = new window.toastui.Editor({
        el: richMount,
        initialValue: textarea.value || '',
        height: '650px',
        minHeight: '440px',
        initialEditType: 'wysiwyg',
        previewStyle: 'vertical',
        language: 'zh-CN',
        usageStatistics: false,
        hideModeSwitch: true,
        toolbarItems: [
          ['heading','bold','italic','strike'],
          ['quote','hr'],
          ['ul','ol'],
          ['table','link']
        ],
        customHTMLRenderer:{
          htmlInline:{
            span(node,{entering}){
              return entering?{type:'openTag',tagName:'span',attributes:node.attrs}:{type:'closeTag',tagName:'span'};
            }
          }
        },
        hooks: {addImageBlobHook: () => { alert('请先上传图片并通过图片网址插入，目前不支持直接粘贴图片文件。'); return false; }}
      });
      rich.on('change',syncEditor);
      textarea.classList.add('studio-source-hidden');
      textarea.hidden=true;
      richMount.classList.add('is-ready');
      window.TRNAdminTheme?.applyEditor();
    } catch(error) {
      rich = null;
      richMount.textContent = '';
      textarea.hidden=true;
      textarea.classList.add('studio-source-hidden');
      const notice=$('#studio-layout-status');
      if(notice)notice.textContent='可视化编辑器加载失败，请刷新页面。为保护原文已停止保存。';
      console.error('WYSIWYG editor unavailable',error);
    }
  }

  function headingsOf(markdown) {
    const entries = [];
    let fence = null;
    String(markdown || '').split(/\r?\n/).forEach((line, index) => {
      const trimmed = line.trim();
      const marker = trimmed.match(/^(`{3,}|~{3,})/);
      if (marker) {
        if (!fence) fence = {char:marker[1][0],length:marker[1].length};
        else if (marker[1][0] === fence.char && marker[1].length >= fence.length) fence = null;
        return;
      }
      if (fence) return;
      const m = line.match(/^\s{0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/);
      if (m) entries.push({level:m[1].length, text:m[2].replace(/[*_~`]/g, '').trim(), line:index});
    });
    return entries;
  }
  function jumpToHeading(item, index) {
    if (rich) {
      requestAnimationFrame(() => {
        const nodes = richMount.querySelectorAll('.toastui-editor-ww-container h1,.toastui-editor-ww-container h2,.toastui-editor-ww-container h3,.toastui-editor-ww-container h4,.toastui-editor-ww-container h5,.toastui-editor-ww-container h6');
        const target = nodes[index];
        if (target) {
          target.scrollIntoView({behavior:'smooth', block:'center'});
          target.classList.add('studio-flash');
          setTimeout(() => target.classList.remove('studio-flash'), 1400);
        }
      });
    } else {
      const lines = textarea.value.split(/\r?\n/);
      const start = lines.slice(0,item.line).reduce((count,s) => count+s.length+1,0);
      textarea.focus();
      textarea.setSelectionRange(start,start+(lines[item.line]||'').length);
    }
  }
  function refreshOutline() {
    const markdown = getMarkdown();
    const headings = headingsOf(markdown);
    const container = $('#studio-outline-items');
    container.replaceChildren();
    if (headings.length) {
      const minLevel = Math.min(...headings.map(h => h.level));
      headings.forEach((heading,index) => {
        const button = document.createElement('button');
        button.type='button';
        button.className='studio-outline-link';
        button.style.setProperty('--level',String(heading.level-minLevel));
        button.textContent=heading.text;
        button.title='跳转到：'+heading.text;
        button.addEventListener('click', () => jumpToHeading(heading,index));
        container.append(button);
      });
    } else {
      const p = document.createElement('p');
      p.className = 'studio-outline-empty';
      p.textContent = '使用一至六级标题后，章节会在这里出现。';
      container.append(p);
    }
    $('#studio-heading-count').textContent = headings.length+' 节';
    $('#studio-live-headings').textContent = headings.length+' 个标题';
    const plain=markdown.replace(/<span data-trn-(?:align|indent)="(?:left|center|right|[1-4])"><\/span>/g,'');
    const countHan = (plain.match(/[\u3400-\u9fff]/g)||[]).length;
    const countWords = (plain.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)||[]).length;
    $('#studio-word-count').textContent = (countHan+countWords).toLocaleString('zh-CN')+' 字';
  }
  function scheduleOutline() { clearTimeout(outlineTimer); outlineTimer = setTimeout(refreshOutline,220); }
  textarea.addEventListener('input', () => {if(!rich) scheduleOutline();});
  function load(markdown=''){
    closeSettings();
    legacyLayoutSource=String(markdown||'');
    loading=true;
    textarea.value=legacyLayoutSource;
    textarea.hidden=true;
    initRich();
    if(rich)rich.setMarkdown(legacyLayoutSource,false);
    if(readingPreview){
      readingPreview=false;
      $('#markdown-preview').hidden=true;
      richMount.hidden=false;
    }
    const notice=$('#studio-layout-status');
    if(notice&&rich)notice.textContent=specialLayout.test(legacyLayoutSource)?
      '这篇旧文章含有特殊段落格式。为防止原文丢失，不兼容的编辑将被阻止保存。':'';
    queueMicrotask(()=>{loading=false;refreshOutline();});
  }
  $('#preview-toggle').textContent='阅读预览';
  $('#preview-toggle').addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    readingPreview = !readingPreview;
    const panel = $('#markdown-preview');
    if (readingPreview) {
      const markdown = getMarkdown();
      panel.innerHTML = (window.marked && window.DOMPurify)
        ? (window.TRNReadingLayout?.render(markdown,window.marked,window.DOMPurify)??window.DOMPurify.sanitize(window.marked.parse(markdown,{gfm:true,breaks:true})))
        : '<p>预览功能需要加载 Markdown 组件。</p>';
      panel.hidden = false;
      richMount.hidden = true;
      textarea.hidden = true;
      $('#preview-toggle').textContent = '返回写作';
    } else {
      panel.hidden = true;
      richMount.hidden = false;
      textarea.hidden=true;
      $('#preview-toggle').textContent = '阅读全文预览';
    }
  }, true);
  // These compact commands are available in both full and focus editors.
  // Use Toast UI's native commands to keep selections and undo history intact.
  function format(kind,level=2){
    if(!['bold','italic','heading','quote'].includes(kind))return false;
    if(rich){
      try{
        if(kind==='heading')rich.exec('heading',{level:Math.max(1,Math.min(6,Number(level)||2))});
        else rich.exec(kind==='quote'?'blockQuote':kind);
        syncEditor();
        rich.focus();
        return true;
      }catch(error){
        console.warn('Rich-text formatting command failed',kind,error);
        return false;
      }
    }
    return false;
  }
  window.TRNStudio = {load, getMarkdown,validateContent, refreshOutline,format,
    toggleFocus:()=>setFocusMode(!focused),
    exitFocus:()=>{if(focused)setFocusMode(false);},
    isFocused:()=>focused
  };
  // Core author buttons now initialize before optional third-party CDN scripts.
  // Mount the visual editor after vendor scripts finish; source remains hidden.
  window.addEventListener('load',()=>{
    if(rich||!window.toastui?.Editor||form.hidden||$('#desk-view')?.hidden!==false)return;
    initRich();
    refreshOutline();
  });
  refreshOutline();
})();
