(() => {
  'use strict';
  const $ = s=>document.querySelector(s);
  const state={csrf:'',posts:[],editing:null,dirty:false,preview:false,version:0,autoSaving:false};
  const form=$('#editor');
  let autoTimer=null;
  const startParams=new URLSearchParams(location.search);
  let pendingChapter=/^[0-9a-f-]{36}$/.test(startParams.get('chapter')||'')?startParams.get('chapter'):null;
  let requestedId=/^[0-9a-f-]{36}$/.test(startParams.get('id')||'')?startParams.get('id'):null;
  const requestedLanguage=['zh','en'].includes(startParams.get('lang'))?startParams.get('lang'):'zh';
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
    try {const r=await req('/api/admin/me');state.csrf=r.csrf;showDesk();await load(requestedId);}
    catch {$('#login-view').hidden=false;$('#desk-view').hidden=true;}
  }
  function showDesk(){ $('#login-view').hidden=true;$('#desk-view').hidden=false;$('#logout').hidden=false; }
  $('#login-form').addEventListener('submit',async e=>{
    e.preventDefault();message('#login-message','正在登录…');
    try{const result=await req('/api/admin/login',{method:'POST',body:JSON.stringify({password:$('#password').value})});state.csrf=result.csrf;$('#password').value='';showDesk();await load(requestedId);}
    catch(e){message('#login-message',e.message);}
  });
  $('#logout').addEventListener('click',async()=>{
    try{await req('/api/admin/logout',{method:'POST',body:'{}'});}catch{}
    state.csrf='';state.posts=[];state.editing=null;$('#desk-view').hidden=true;$('#login-view').hidden=false;$('#logout').hidden=true;$('#editor').hidden=true;
  });
  async function load(selectedId=state.editing){
    const r=await req('/api/admin/posts');state.posts=r.posts||[];renderList();
    const found=selectedId&&state.posts.some(p=>p.id===selectedId);
    if(found)edit(selectedId);
    else if(startParams.get('new')==='1'||pendingChapter||!state.editing) {
      edit();
      form.elements.language.value=requestedLanguage;
      updatePublishControls();
    }
  }
  function renderList(){ /* All post management lives at /admin/manage/. */ }
  function draftKey(id=state.editing){return 'trn-backup:'+ (id||('new-'+(pendingChapter||requestedLanguage)));}
  function collect(){
    const f=form.elements;
    return {language:f.language.value,type:f.type.value,title:f.title.value,slug:f.slug.value,
      excerpt:f.excerpt.value,cover_url:f.cover_url.value,body:window.TRNStudio?.getMarkdown()??f.body.value,
      tags:f.tags.value,collection_slugs:f.collection_slugs.value,status:f.status.value};
  }
  function backup(){
    if(form.hidden)return;
    try{localStorage.setItem(draftKey(),JSON.stringify({time:Date.now(),data:collect()}));}catch{}
  }
  function discardBackup(key=draftKey()){try{localStorage.removeItem(key)}catch{}}
  function recover(p){
    let raw;try{raw=localStorage.getItem(draftKey(p?.id))}catch{}
    if(!raw)return;
    try{
      const saved=JSON.parse(raw),copy=saved?.data;
      if(!copy)return;
      const changed=copy.title!==(p?.title||'')||copy.body!==(p?.body||'')||copy.excerpt!==(p?.excerpt||'');
      if(!changed||saved.time<=(p?.updated_at?Date.parse(p.updated_at)||0:0)){discardBackup(draftKey(p?.id));return;}
      if(!confirm('发现未保存的本机写作副本，要恢复吗？'))return;
      for(const key of ['language','type','title','slug','excerpt','cover_url','collection_slugs','status','tags']){
        if(form.elements[key] && copy[key]!==undefined)form.elements[key].value=copy[key];
      }
      window.TRNStudio?.load(copy.body||'');
      state.dirty=true;state.version++;
      $('#save-status').textContent='已恢复本机副本';updatePublishControls();
    }catch{}
  }
  function changed(){
    state.dirty=true;state.version++;
    backup();clearTimeout(autoTimer);updatePublishControls();
    if(form.elements.status.value==='draft'){
      $('#save-status').textContent='待自动保存…';
      autoTimer=setTimeout(autoSave,3500);
    }else $('#save-status').textContent='修改暂存在本机，请手动保存已发表文章';
  }
  async function autoSave(){
    if(state.autoSaving||!state.dirty||form.hidden||form.elements.status.value!=='draft')return;
    const f=form.elements;
    if(!f.title.value.trim()){
      $('#save-status').textContent='已本机暂存，填写标题后保存到云端';return;
    }
    if(!f.slug.value.trim()){
      f.slug.value=f.title.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'piece-'+Date.now().toString(36);
    }
    if(!f.slug.checkValidity()||!f.title.checkValidity())return;
    const stamp=state.version,priorKey=draftKey(),isEdit=!!state.editing,value=collect();
    state.autoSaving=true;$('#save-status').textContent='正在自动保存草稿…';
    try{
      const result=await req(isEdit?'/api/admin/posts/'+state.editing:'/api/admin/posts',{method:isEdit?'PUT':'POST',body:JSON.stringify(value)});
      if(!isEdit){
        state.editing=result.id;
        history.replaceState({},'',location.pathname+'?id='+encodeURIComponent(result.id));
        if(pendingChapter){
          try{
            await req('/api/admin/hierarchy',{method:'POST',body:JSON.stringify({op:'section-link',post_id:result.id,chapter_id:pendingChapter,sort_order:0})});
            pendingChapter=null;
          }catch(e){message('#editor-message','草稿已保存，但未能加入章节：'+e.message);}
        }
      }
      const updated={...value,id:result.id,tags:value.tags.split(',').map(x=>x.trim()).filter(Boolean),
        collection_slugs:value.collection_slugs.split(',').map(x=>x.trim()).filter(Boolean),updated_at:new Date().toISOString()};
      const ix=state.posts.findIndex(p=>p.id===result.id);
      if(ix>=0)state.posts[ix]={...state.posts[ix],...updated};else state.posts.unshift(updated);
      discardBackup(priorKey);
      state.dirty=state.version!==stamp;
      if(state.dirty)backup();else discardBackup();
      $('#save-status').textContent=state.dirty?'修改待保存…':'草稿已自动保存到云端';
      updatePublishControls();
    }catch(e){
      $('#save-status').textContent='自动保存失败，本机副本已保留';
      message('#editor-message',e.message);
    }finally{
      state.autoSaving=false;
      if(state.dirty&&form.elements.status.value==='draft'){
        clearTimeout(autoTimer);autoTimer=setTimeout(autoSave,5000);
      }
    }
  }
  function canChange(){return !state.dirty||confirm('当前修改尚未保存，确定放弃修改吗？');}
  function edit(id=null){
    clearTimeout(autoTimer);
    const p=state.posts.find(post=>post.id===id)||null;
    state.editing=p?.id||null;state.dirty=false;state.preview=false;state.version=0;
    $('#editor-empty').hidden=true;form.hidden=false;$('#markdown-preview').hidden=true;$('#content-body').hidden=false;$('#preview-toggle').textContent='预览';
    form.reset();
    for(const name of ['language','type','slug','title','excerpt','cover_url','body','collection_slugs','status'])form.elements[name].value=p?.[name]??({language:'en',type:'essay',status:'draft'}[name]||'');
    form.elements.tags.value=p?.tags?.join(', ')||'';form.elements.collection_slugs.value=p?.collection_slugs?.join(', ')||'';
    window.TRNStudio?.load(p?.body||'');
    $('#edit-label').textContent=p?'编辑文章':'新建文章';
    $('#delete-post').hidden=!p;
    $('#save-status').textContent='';$('#editor-message').textContent='';
    renderList();
    updatePublishControls();recover(p);
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
  $('#new-post').addEventListener('click',()=>{
    if(!canChange())return;
    pendingChapter=null;
    history.replaceState({},'',location.pathname+'?new=1');
    edit();form.elements.language.value='zh';updatePublishControls();
  });
  form.addEventListener('input',changed);
  form.addEventListener('change',changed);
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
    e.preventDefault();clearTimeout(autoTimer);
    if(state.autoSaving){message('#editor-message','正在自动保存，请稍后再保存。');return;}
    message('#editor-message','正在保存…');
    const f=form.elements,priorKey=draftKey();
    const value=collect();
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
      state.dirty=false;state.editing=r.id;discardBackup(priorKey);discardBackup();
      let linkWarning='';
      if(pendingChapter){
        try{await req('/api/admin/hierarchy',{method:'POST',body:JSON.stringify({op:'section-link',post_id:r.id,chapter_id:pendingChapter,sort_order:0})});pendingChapter=null;}
        catch(linkError){linkWarning=' 正文保存成功，但加入章节失败：'+linkError.message;}
      }
      const savedLanguage=value.language;
      history.replaceState({},'',location.pathname+'?id='+encodeURIComponent(r.id));
      await load(r.id);
      if(linkWarning)message('#editor-message',linkWarning);
      if(!$('#editor-message').textContent.trim())message('#editor-message',value.status==='published'?('已发布到'+(savedLanguage==='zh'?'中文站':'英文站')+'。'):'私密草稿已保存。');
      $('#save-status').textContent='已保存';updatePublishControls();
    }catch(e){message('#editor-message',e.message);}
    finally{$('#save-post').disabled=false;}
  });
  $('#delete-post').addEventListener('click',async()=>{
    clearTimeout(autoTimer);
    if(!state.editing || !confirm('删除后将无法恢复，确定永久删除这篇文章吗？'))return;
    try{await req(`/api/admin/posts/${state.editing}`,{method:'DELETE'});discardBackup();state.editing=null;state.dirty=false;pendingChapter=null;history.replaceState({},'',location.pathname+'?new=1');edit();}
    catch(e){message('#editor-message',e.message);}
  });
  window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
  window.TRNDesk={request:req,edit(id){if(!canChange())return false;edit(id);return true;},newPost(language='zh'){if(!canChange())return false;edit();form.elements.language.value=language;updatePublishControls();return true;}};
  check();
})();
