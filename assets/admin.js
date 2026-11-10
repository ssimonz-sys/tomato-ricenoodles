(() => {
  'use strict';
  const $ = s=>document.querySelector(s);
  const state={csrf:'',posts:[],editing:null,dirty:false,preview:false};
  const form=$('#editor');
  const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function message(selector,s){$(selector).textContent=s;}
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
    e.preventDefault();message('#login-message','Signing in…');
    try{const result=await req('/api/admin/login',{method:'POST',body:JSON.stringify({password:$('#password').value})});state.csrf=result.csrf;$('#password').value='';showDesk();await load();}
    catch(e){message('#login-message',e.message);}
  });
  $('#logout').addEventListener('click',async()=>{
    try{await req('/api/admin/logout',{method:'POST',body:'{}'});}catch{}
    state.csrf='';state.posts=[];state.editing=null;$('#desk-view').hidden=true;$('#login-view').hidden=false;$('#logout').hidden=true;$('#editor').hidden=true;
  });
  async function load(selectedId=state.editing){
    const r=await req('/api/admin/posts');state.posts=r.posts||[];renderList();
    if(selectedId && state.posts.some(p=>p.id===selectedId))edit(selectedId);
  }
  function renderList(){
    $('#post-total').textContent=state.posts.length;
    $('#post-admin-list').innerHTML=state.posts.length?state.posts.map(p=>`<button class="admin-post ${state.editing===p.id?'active':''}" data-id="${esc(p.id)}" type="button"><strong>${esc(p.title)}</strong><small><span class="status-mark ${p.status==='draft'?'draft':''}"></span>${p.language==='en'?'EN':'中文'} · ${p.type} · ${p.status}</small></button>`).join(''):'<div class="empty-state">Your library is empty.</div>';
    $('#post-admin-list').querySelectorAll('button[data-id]').forEach(btn=>btn.addEventListener('click',()=>{if(canChange())edit(btn.dataset.id);}));
  }
  function canChange(){return !state.dirty||confirm('Discard unsaved changes?');}
  function edit(id=null){
    const p=state.posts.find(post=>post.id===id)||null;
    state.editing=p?.id||null;state.dirty=false;state.preview=false;
    $('#editor-empty').hidden=true;form.hidden=false;$('#markdown-preview').hidden=true;$('#content-body').hidden=false;$('#preview-toggle').textContent='Preview';
    form.reset();
    for(const name of ['language','type','slug','title','excerpt','cover_url','body','collection_slugs','status'])form.elements[name].value=p?.[name]??({language:'en',type:'essay',status:'draft'}[name]||'');
    form.elements.tags.value=p?.tags?.join(', ')||'';form.elements.collection_slugs.value=p?.collection_slugs?.join(', ')||'';
    $('#edit-label').textContent=p?'EDIT PIECE':'NEW PIECE';
    $('#delete-post').hidden=!p;
    $('#save-status').textContent='';$('#editor-message').textContent='';
    renderList();
    updatePublishControls();
    if(!p)form.elements.title.focus();
  }
  function updatePublishControls(){
    const site=form.elements.language.value==='zh'?'中文站':'English Site';
    const published=form.elements.status.value==='published';
    $('#publish-target-note').textContent=published?`Ready to publish to ${site}. / 将发布到${site}。`:`Private draft for ${site}. / ${site}私密草稿，不会向读者展示。`;
    $('#save-post').textContent=published?`Publish to ${site}`:'Save draft / 保存草稿';
    const link=$('#editor-public-link');
    const slug=form.elements.slug.value;
    const show=!!(state.editing && !state.dirty && published && slug);
    link.hidden=!show;
    if(show){link.href=`/${form.elements.language.value}/read.html?slug=${encodeURIComponent(slug)}`;link.textContent=form.elements.language.value==='zh'?'查看中文站文章 ↗':'Open English article ↗';}
  }
  form.elements.language.addEventListener('change',updatePublishControls);
  form.elements.status.addEventListener('change',updatePublishControls);
  $('#new-post').addEventListener('click',()=>{if(canChange())edit();});
  form.addEventListener('input',()=>{state.dirty=true;$('#save-status').textContent='Unsaved changes';updatePublishControls();});
  form.addEventListener('change',()=>{state.dirty=true;$('#save-status').textContent='Unsaved changes';updatePublishControls();});
  form.elements.title.addEventListener('blur',()=>{
    const slug=form.elements.slug;
    if(slug.value.trim())return;
    const candidate=form.elements.title.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
    slug.value=candidate||'piece-'+Date.now().toString(36);updatePublishControls();
  });
  $('#preview-toggle').addEventListener('click',()=>{
    state.preview=!state.preview;$('#content-body').hidden=state.preview;$('#markdown-preview').hidden=!state.preview;$('#preview-toggle').textContent=state.preview?'Edit text':'Preview';
    if(state.preview){
      const raw=form.elements.body.value;
      $('#markdown-preview').innerHTML=(window.marked&&window.DOMPurify)?window.DOMPurify.sanitize(window.marked.parse(raw)):'<p>Markdown preview requires a network connection.</p>';
    }
  });
  form.addEventListener('submit',async e=>{
    e.preventDefault();message('#editor-message','Saving…');
    const f=form.elements;
    const value={language:f.language.value,type:f.type.value,title:f.title.value,slug:f.slug.value,excerpt:f.excerpt.value,cover_url:f.cover_url.value,body:f.body.value,tags:f.tags.value,collection_slugs:f.collection_slugs.value,status:f.status.value};
    const isEditing=!!state.editing;
    const original=state.posts.find(p=>p.id===state.editing);
    if(original?.status==='published' && original.language!==value.language){
      const oldSite=original.language==='zh'?'中文站':'English Site';
      const newSite=value.language==='zh'?'中文站':'English Site';
      if(!confirm(`Move this published article from ${oldSite} to ${newSite}? Its old public URL will stop working.`)){
        message('#editor-message','Move cancelled.');return;
      }
    }
    $('#save-post').disabled=true;
    try{
      const r=await req(isEditing?`/api/admin/posts/${state.editing}`:'/api/admin/posts',{method:isEditing?'PUT':'POST',body:JSON.stringify(value)});
      state.dirty=false;state.editing=r.id;await load(r.id);
      message('#editor-message',f.status.value==='published'?`Published to ${f.language.value==='zh'?'中文站':'English Site'}.`:'Private draft saved.');$('#save-status').textContent='Saved';updatePublishControls();
    }catch(e){message('#editor-message',e.message);}
    finally{$('#save-post').disabled=false;}
  });
  $('#delete-post').addEventListener('click',async()=>{
    if(!state.editing || !confirm('Permanently delete this piece?'))return;
    try{await req(`/api/admin/posts/${state.editing}`,{method:'DELETE'});state.editing=null;state.dirty=false;await load(null);$('#editor').hidden=true;$('#editor-empty').hidden=false;}
    catch(e){message('#editor-message',e.message);}
  });
  window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
  check();
})();
