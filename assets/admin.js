(() => {
  'use strict';
  const $ = s=>document.querySelector(s);
  const state={csrf:'',posts:[],editing:null,dirty:false,preview:false};
  const form=$('#editor');
  const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function zhError(s){ const dict={'Database is not configured.':'数据库尚未配置。','Set up D1 and ADMIN_PASSWORD before signing in.':'请先配置 D1 数据库和管理员密码。','Cross-origin request rejected.':'跨站请求被拒绝。','Cross-origin login rejected.':'跨站登录请求被拒绝。','Invalid security token.':'安全验证失效，请重新登录。','Please sign in.':'请先登录。','Invalid JSON.':'请求数据格式有误。','Invalid credentials.':'密码不正确。','Too many sign-in attempts. Try again later.':'登录失败次数过多，请稍后再试。','An article with this slug already exists in this language.':'当前站点已存在相同网址标识的文章。','Article not found.':'未找到这篇文章。','Invalid id.':'文章编号无效。'};return dict[s]||s;}
  function message(selector,s){$(selector).textContent=zhError(s);}
  async function req(path,options={}) {
    const response=await fetch(path,{credentials:'same-origin',...options,headers:{'Accept':'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...(state.csrf?{'X-CSRF-Token':state.csrf}:{}),...(options.headers||{})}});
    const json=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(json.error||`HTTP ${response.status}`);
    return json;
  }
  async function check() {
    try {const r=await req('/api/admin/me');state.csrf=r.csrf;showDesk();await load();}
    catch {$('#login-view').hidden=false;$('#desk-view').hidden=true;}
  }
  function showDesk(){ $('#login-view').hidden=true;$('#desk-view').hidden=false;$('#logout').hidden=false; }
  $('#login-form').addEventListener('submit',async e=>{
    e.preventDefault();message('#login-message','正在登录…');
    try{const result=await req('/api/admin/login',{method:'POST',body:JSON.stringify({password:$('#password').value})});state.csrf=result.csrf;$('#password').value='';showDesk();await load();}
    catch(e){message('#login-message',e.message);}
  });
  $('#logout').addEventListener('click',async()=>{
    try{await req('/api/admin/logout',{method:'POST',body:'{}'});}catch{}
    state.csrf='';state.posts=[];state.editing=null;$('#desk-view').hidden=true;$('#login-view').hidden=false;$('#logout').hidden=true;$('#editor').hidden=true;
  });
  async function load(selectedId=state.editing){
    const r=await req('/api/admin/posts');state.posts=r.posts||[];renderList();window.TRNHierarchy?.onPostsLoaded?.(state.posts);
    if(selectedId && state.posts.some(p=>p.id===selectedId))edit(selectedId);
  }
  function renderList(){
    $('#post-total').textContent=state.posts.length;
    $('#post-admin-list').innerHTML=state.posts.length?state.posts.map(p=>`<button class="admin-post ${state.editing===p.id?'active':''}" data-id="${esc(p.id)}" type="button"><strong>${esc(p.title)}</strong><small><span class="status-mark ${p.status==='draft'?'draft':''}"></span>${p.language==='en'?'EN':'中文'} · ${({essay:'政论与随笔',fiction:'小说',poetry:'诗歌',note:'笔记与杂记'}[p.type]||p.type)} · ${p.status==='published'?'已发布':'草稿'}</small></button>`).join(''):'<div class="empty-state">暂无文章，点击“新建文章”开始创作。</div>';
    $('#post-admin-list').querySelectorAll('button[data-id]').forEach(btn=>btn.addEventListener('click',()=>{if(canChange())edit(btn.dataset.id);}));
  }
  function canChange(){return !state.dirty||confirm('当前修改尚未保存，确定放弃修改吗？');}
  function edit(id=null){
    window.TRNHierarchy?.clearPending?.();
    const p=state.posts.find(post=>post.id===id)||null;
    state.editing=p?.id||null;state.dirty=false;state.preview=false;
    $('#editor-empty').hidden=true;form.hidden=false;$('#markdown-preview').hidden=true;$('#content-body').hidden=false;$('#preview-toggle').textContent='预览';
    form.reset();
    for(const name of ['language','type','slug','title','excerpt','cover_url','body','collection_slugs','status'])form.elements[name].value=p?.[name]??({language:'en',type:'essay',status:'draft'}[name]||'');
    form.elements.tags.value=p?.tags?.join(', ')||'';form.elements.collection_slugs.value=p?.collection_slugs?.join(', ')||'';
    window.TRNStudio?.load(p?.body||'');
    $('#edit-label').textContent=p?'编辑文章':'新建文章';
    $('#delete-post').hidden=!p;
    $('#save-status').textContent='';$('#editor-message').textContent='';
    renderList();
    updatePublishControls();
    if(!p)form.elements.title.focus();
  }
  function updatePublishControls(){
    const site=form.elements.language.value==='zh'?'中文站':'英文站';
    const published=form.elements.status.value==='published';
    $('#publish-target-note').textContent=published?`文章将公开发布到${site}。`:`将保存为${site}的私密草稿，读者无法查看。`;
    $('#save-post').textContent=published?`发布到${site}`:'保存草稿';
    const link=$('#editor-public-link');
    const slug=form.elements.slug.value;
    const show=!!(state.editing && !state.dirty && published && slug);
    link.hidden=!show;
    if(show){link.href=`/${form.elements.language.value}/read.html?slug=${encodeURIComponent(slug)}`;link.textContent=form.elements.language.value==='zh'?'查看中文站文章 ↗':'查看英文站文章 ↗';}
  }
  form.elements.language.addEventListener('change',updatePublishControls);
  form.elements.status.addEventListener('change',updatePublishControls);
  $('#new-post').addEventListener('click',()=>{if(canChange())edit();});
  form.addEventListener('input',()=>{state.dirty=true;$('#save-status').textContent='有未保存的修改';updatePublishControls();});
  form.addEventListener('change',()=>{state.dirty=true;$('#save-status').textContent='有未保存的修改';updatePublishControls();});
  form.elements.title.addEventListener('blur',()=>{
    const slug=form.elements.slug;
    if(slug.value.trim())return;
    const candidate=form.elements.title.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    slug.value=candidate||'piece-'+Date.now().toString(36);updatePublishControls();
  });
  $('#preview-toggle').addEventListener('click',()=>{
    state.preview=!state.preview;$('#content-body').hidden=state.preview;$('#markdown-preview').hidden=!state.preview;$('#preview-toggle').textContent=state.preview?'返回编辑':'预览';
    if(state.preview){
      const raw=form.elements.body.value;
      $('#markdown-preview').innerHTML=(window.marked&&window.DOMPurify)?window.DOMPurify.sanitize(window.marked.parse(raw)):'<p>Markdown 预览需要网络连接。</p>';
    }
  });
  form.addEventListener('submit',async e=>{
    e.preventDefault();message('#editor-message','正在保存…');
    const f=form.elements;
    const value={language:f.language.value,type:f.type.value,title:f.title.value,slug:f.slug.value,excerpt:f.excerpt.value,cover_url:f.cover_url.value,body:(window.TRNStudio?.getMarkdown() ?? f.body.value),tags:f.tags.value,collection_slugs:f.collection_slugs.value,status:f.status.value};
    const isEditing=!!state.editing;
    const original=state.posts.find(p=>p.id===state.editing);
    if(original?.status==='published' && original.language!==value.language){
      const oldSite=original.language==='zh'?'中文站':'英文站';
      const newSite=value.language==='zh'?'中文站':'英文站';
      if(!confirm(`确定将这篇已发布文章从${oldSite}移到${newSite}吗？移动后原文章链接将失效。`)){
        message('#editor-message','已取消移动文章。');return;
      }
    }
    $('#save-post').disabled=true;
    try{
      const r=await req(isEditing?`/api/admin/posts/${state.editing}`:'/api/admin/posts',{method:isEditing?'PUT':'POST',body:JSON.stringify(value)});
      state.dirty=false;state.editing=r.id;await load(r.id);
      await window.TRNHierarchy?.onPostSaved?.(r.id);
      message('#editor-message',f.status.value==='published'?`已发布到${f.language.value==='zh'?'中文站':'英文站'}。`:'私密草稿已保存。');$('#save-status').textContent='已保存';updatePublishControls();
    }catch(e){message('#editor-message',e.message);}
    finally{$('#save-post').disabled=false;}
  });
  $('#delete-post').addEventListener('click',async()=>{
    if(!state.editing || !confirm('删除后将无法恢复，确定永久删除这篇文章吗？'))return;
    try{await req(`/api/admin/posts/${state.editing}`,{method:'DELETE'});state.editing=null;state.dirty=false;await load(null);$('#editor').hidden=true;$('#editor-empty').hidden=false;}
    catch(e){message('#editor-message',e.message);}
  });
  window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
  window.TRNDesk={request:req,edit(id){if(!canChange())return false;edit(id);return true;},newPost(language='zh'){if(!canChange())return false;edit();form.elements.language.value=language;updatePublishControls();return true;}};
  check();
})();
