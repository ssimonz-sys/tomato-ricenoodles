/* Tomato Ricenoodles: long-form writing studio. Uses the existing Markdown + D1 API. */
(() => {
  'use strict';
  const form = document.querySelector('#editor');
  if (!form) return;
  const $ = selector => document.querySelector(selector);
  const field = name => form.elements[name];
  const textarea = $('#content-body');
  let rich = null;
  let loading = false;
  let readingPreview = false;
  let outlineTimer = null;
  let focused = false;
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

  function addSettingsGroup(label, elements) {
    const section = document.createElement('section');
    section.className = 'studio-settings-group';
    const h = document.createElement('h3');
    h.textContent = label;
    section.append(h);
    elements.filter(Boolean).forEach(el => section.append(el));
    settings.append(section);
  }
  addSettingsGroup('发布信息', [form.querySelector('.publishing-controls')]);
  addSettingsGroup('分类与专题', [field('type').closest('label'), field('slug').closest('label'), form.querySelector('.form-pair')]);
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
  paper.append(title, excerpt, bodyTop, richMount, textarea, previewNode, info);
  layout.append(paper, outline);
  topbar.after(layout);
  form.append(backdrop, settings);

  const actions = document.createElement('div');
  actions.className = 'studio-top-actions';
  actions.innerHTML = '<button type="button" class="studio-small-button" id="studio-focus">专注写作</button><button type="button" class="studio-small-button" id="studio-settings-open">作品设置</button>';
  const oldButtons = form.querySelector('.editor-buttons');
  if (oldButtons) actions.append(oldButtons);
  const bottom = form.querySelector('.editor-bottom');
  if (bottom) bottom.hidden = true;
  topbar.append(actions);

  const headingTools = document.createElement('div');
  headingTools.className = 'studio-heading-guide';
  headingTools.innerHTML = '<span>长文结构</span><select id="studio-heading-level" aria-label="选择标题级别"><option value="1">一级标题</option><option value="2">二级标题</option><option value="3">三级标题</option><option value="4">四级标题</option><option value="5">五级标题</option><option value="6">六级标题</option></select><button type="button" id="studio-add-heading">插入标题</button><button type="button" id="studio-add-sample">插入分节示例</button>';
  const hint = document.createElement('p');
  hint.className = 'studio-editor-hint';
  hint.textContent = '直接撰写正文，使用工具栏排版。设置一至六级标题后，大纲与公开文章目录会自动生成。';
  bodyTop.before(headingTools, hint);

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
  $('#studio-focus').addEventListener('click', () => {
    focused = !focused;
    document.body.classList.toggle('studio-focus-mode', focused);
    $('#studio-focus').textContent = focused ? '退出专注' : '专注写作';
  });

  function getMarkdown() { return rich ? rich.getMarkdown() : textarea.value; }
  function syncEditor() {
    if (loading || !rich) return;
    const markdown = rich.getMarkdown();
    if (textarea.value !== markdown) {
      textarea.value = markdown;
      textarea.dispatchEvent(new Event('input', {bubbles: true}));
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
        previewStyle: 'tab',
        language: 'zh-CN',
        usageStatistics: false,
        hideModeSwitch: false,
        toolbarItems: [['heading','bold','italic','strike'],['hr','quote'],['ul','ol','indent','outdent'],['table','link'],['code','codeblock']],
        hooks: {addImageBlobHook: () => { alert('请先上传图片并通过图片网址插入，目前不支持直接粘贴图片文件。'); return false; }}
      });
      rich.on('change', syncEditor);
      textarea.classList.add('studio-source-hidden');
      richMount.classList.add('is-ready');
    } catch(error) {
      rich = null;
      richMount.textContent = '';
      console.warn('富文本组件不可用，已回退为 Markdown 输入框。', error);
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
      if (rich.isMarkdownMode()) rich.changeMode('wysiwyg');
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
    const countHan = (markdown.match(/[\u3400-\u9fff]/g)||[]).length;
    const countWords = (markdown.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)||[]).length;
    $('#studio-word-count').textContent = (countHan+countWords).toLocaleString('zh-CN')+' 字';
  }
  function scheduleOutline() { clearTimeout(outlineTimer); outlineTimer = setTimeout(refreshOutline,220); }
  textarea.addEventListener('input', () => {if(!rich) scheduleOutline();});
  function load(markdown='') {
    closeSettings();
    initRich();
    loading = true;
    textarea.value = markdown || '';
    if (rich) rich.setMarkdown(markdown || '', false);
    if (readingPreview) {
      readingPreview = false;
      $('#markdown-preview').hidden = true;
      richMount.hidden = false;
      if (!rich) textarea.hidden = false;
      $('#preview-toggle').textContent = '阅读全文预览';
    }
    queueMicrotask(() => {loading=false;refreshOutline();});
  }
  function insertMarkdown(text) {
    if (rich) {
      rich.changeMode('markdown');
      rich.insertText(text);
    } else {
      const from = textarea.selectionStart, to = textarea.selectionEnd;
      textarea.setRangeText(text,from,to,'end');
      textarea.focus();
      textarea.dispatchEvent(new Event('input',{bubbles:true}));
    }
    scheduleOutline();
  }
  $('#studio-add-heading').addEventListener('click', () => {
    const n = Math.max(1,Math.min(6,Number($('#studio-heading-level').value)||1));
    insertMarkdown('\n\n'+'#'.repeat(n)+' 新标题\n');
  });
  $('#studio-add-sample').addEventListener('click', () => {
    if (getMarkdown().trim() && !confirm('将在当前光标位置插入示例标题结构。确定继续吗？')) return;
    const snippet = [
      '', '# 前言', '', '在这里撰写前言。', '', '# 主目录', '',
      '## 一、家庭篇', '', '### 1. 父母的权威从何而来', '',
      '#### （1）不会反抗的孩子', '', '##### a. 家庭的起源', '',
      '###### （上）虚假的义务', '', '继续写作……', '',
      '# 附录', '', '## （一）参考材料', ''
    ].join('\n');
    insertMarkdown(snippet);
  });

  $('#preview-toggle').textContent = '阅读全文预览';
  $('#preview-toggle').addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    readingPreview = !readingPreview;
    const panel = $('#markdown-preview');
    if (readingPreview) {
      const markdown = getMarkdown();
      panel.innerHTML = (window.marked && window.DOMPurify)
        ? window.DOMPurify.sanitize(window.marked.parse(markdown,{gfm:true}))
        : '<p>预览功能需要加载 Markdown 组件。</p>';
      panel.hidden = false;
      richMount.hidden = true;
      textarea.hidden = true;
      $('#preview-toggle').textContent = '返回写作';
    } else {
      panel.hidden = true;
      richMount.hidden = false;
      if (!rich) textarea.hidden = false;
      $('#preview-toggle').textContent = '阅读全文预览';
    }
  }, true);
  window.TRNStudio = {load, getMarkdown, refreshOutline};
  refreshOutline();
})();
