(() => {
  'use strict';
  try {
  const $ = s=>document.querySelector(s);
  const edition=window.TRNAdminSite?.lang||null;
  const editionWriter=lang=>'/admin/'+lang+'/';
  const state={csrf:'',posts:[],editing:null,dirty:false,preview:false,version:0,autoSaving:false};
  const form=$('#editor');
  // Browser validation used to silently stop submit for hidden required fields.
  // Validate explicitly, report useful errors, and always allow submit handler.
  form.noValidate=true;
  // Focus mode moves existing inputs between panels. Resolve by name, and
  // restore form association when an input lives outside the form.
  // Optional fields may be missing in a partly cached older editor build.
  const optionalFields=new Set(['type','slug','excerpt','cover_url','tags','collection_slugs']);
  function editorField(name){
    let field=form.elements.namedItem(name)||form.querySelector('[name="'+name+'"]');
    if(!field){
      const outside=document.querySelector('[name="'+name+'"]');
      if(outside){
        outside.setAttribute('form',form.id);
        field=outside;
      }
    }
    if(!field&&optionalFields.has(name)){
      field=document.createElement('input');
      field.type='hidden';
      field.name=name;
      field.dataset.trnRecovered='1';
      form.append(field);
      console.warn('Restored missing optional editor field:',name);
    }
    if(!field)throw Error('写作表单缺少「'+name+'」字段，请强制刷新页面。');
    return field;
  }
  function repairEditorFields(){
    for(const name of ['language','type','slug','title','excerpt','cover_url','body','tags','collection_slugs','status'])
      editorField(name);
  }
  // Authentication must be wired before optional editor components initialize.
  // A component error must never turn login into a native browser form refresh.
  let placement=null,editorIntegrationsReady=false,editorInitError='';
  function initializeEditor(){
    if(editorIntegrationsReady)return;
    editorIntegrationsReady=true;
    try{
      if(!window.TRNPlacement?.create)throw Error('作品归属组件未加载。');
      placement=window.TRNPlacement.create(form,{request:req});
    }catch(e){
      editorInitError='作品归属组件初始化失败：'+e.message;
      console.error(editorInitError,e);
      placement=null;
    }
    try{window.TRNCoverUpload?.attach(form.elements.cover_url,{getCsrf:()=>state.csrf});}
    catch(e){console.error('封面上传组件初始化失败',e);}
    if(editorInitError)message('#editor-message','已登录。'+editorInitError+' 请刷新页面后再尝试保存。');
  }
  let autoTimer=null;
  const startParams=new URLSearchParams(location.search);
  let pendingChapter=/^[0-9a-f-]{36}$/.test(startParams.get('chapter')||'')?startParams.get('chapter'):null;
  let pendingBook=/^[0-9a-f-]{36}$/.test(startParams.get('book')||'')?startParams.get('book'):null;
  let requestedId=/^[0-9a-f-]{36}$/.test(startParams.get('id')||'')?startParams.get('id'):null;
  const requestedLanguage=edition||(['zh','en'].includes(startParams.get('lang'))?startParams.get('lang'):'zh');
  const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function zhError(s){ const dict={'Database is not configured.':'数据库尚未配置。','Set up D1 and ADMIN_PASSWORD before signing in.':'请先配置 D1 数据库和管理员密码。','Cross-origin request rejected.':'跨站请求被拒绝。','Cross-origin login rejected.':'跨站登录请求被拒绝。','Invalid security token.':'安全验证失效，请重新登录。','Please sign in.':'请先登录。','Invalid JSON.':'请求数据格式有误。','Invalid credentials.':'密码不正确。','Too many sign-in attempts. Try again later.':'登录失败次数过多，请稍后再试。','An article with this slug already exists in this language.':'当前站点已存在相同网址标识的文章。','Article not found.':'未找到这篇文章。','Invalid id.':'文章编号无效。'};return dict[s]||s;}
  function message(selector,s){$(selector).textContent=zhError(s);}
  async function req(path,options={}) {
    const response=await fetch(path,{credentials:'same-origin',...options,headers:{'Accept':'application/json',...(options.body?{'Content-Type':'application/json'}:{}),...(state.csrf?{'X-CSRF-Token':state.csrf}:{}),...(options.headers||{})}});
    const json=await response.json().catch(()=>({}));
    if(!response.ok){const err=new Error(json.error||`HTTP ${response.status}`);err.details=json;err.status=response.status;throw err;}
    return json;
  }
  async function check() {
    let session;
    try{session=await req('/api/admin/me');}
    catch(e){
      $('#login-view').hidden=false;$('#desk-view').hidden=true;
      if(e.status!==401)message('#login-message','登录状态检查失败：'+e.message);
      return;
    }
    state.csrf=session.csrf;
    showDesk();
    try{await load(requestedId);}
    catch(e){message('#editor-message','已登录，但作品加载失败：'+e.message);console.error('作品加载失败',e);}
  }
  function showDesk(){ $('#login-view').hidden=true;$('#desk-view').hidden=false;$('#logout').hidden=false;window.TRNFocus?.refresh?.(); }
  const loginForm=$('#login-form');
  loginForm.dataset.trnJsReady='1';
  loginForm.addEventListener('submit',async e=>{
    e.preventDefault();
    const submit=loginForm.querySelector('button[type="submit"]');
    if(submit.disabled)return;
    submit.disabled=true;
    message('#login-message','正在验证登录…');
    try{
      const result=await req('/api/admin/login',{method:'POST',body:JSON.stringify({password:$('#password').value})});
      state.csrf=result.csrf;
      $('#password').value='';
      showDesk();
      message('#login-message','');
      try{await load(requestedId);}
      catch(loadError){
        message('#editor-message','已成功登录，但作品读取失败：'+loadError.message);
        console.error('登录后初始化错误',loadError);
      }
    }catch(authError){
      message('#login-message','登录失败：'+authError.message);
    }finally{submit.disabled=false;}
  });
  $('#logout').addEventListener('click',async()=>{
    try{await req('/api/admin/logout',{method:'POST',body:'{}'});}catch{}
    state.csrf='';state.posts=[];state.editing=null;$('#desk-view').hidden=true;$('#login-view').hidden=false;$('#logout').hidden=true;$('#editor').hidden=true;
  });
  async function load(selectedId=state.editing){
    initializeEditor();
    const r=await req('/api/admin/posts');
    const allPosts=r.posts||[];
    const other=edition&&selectedId&&allPosts.find(x=>x.id===selectedId&&x.language!==edition);
    if(other){
      location.replace(editionWriter(other.language)+'?id='+encodeURIComponent(other.id));
      return;
    }
    state.posts=edition?allPosts.filter(x=>x.language===edition):allPosts;
    renderList();
    if(placement)await placement.refresh();
    const found=selectedId&&state.posts.some(p=>p.id===selectedId);
    if(found)edit(selectedId);
    else if(startParams.get('new')==='1'||pendingChapter||!state.editing) {
      edit();
      form.elements.language.value=requestedLanguage;
      placement?.load(null,{pendingChapter,pendingBook});
      updatePublishControls();
    }
  }
  function renderList(){ /* All post management lives at /admin/manage/. */ }
  function draftKey(id=state.editing){return 'trn-backup:'+ (id||('new-'+(pendingChapter||requestedLanguage)));}
  function collect(){
    repairEditorFields();
    return {language:edition||editorField('language').value,type:editorField('type').value,
      title:editorField('title').value,slug:editorField('slug').value,
      excerpt:editorField('excerpt').value,cover_url:editorField('cover_url').value,
      body:window.TRNStudio?.getMarkdown()??editorField('body').value,
      tags:editorField('tags').value,collection_slugs:editorField('collection_slugs').value,
      status:editorField('status').value};
  }
  function backup(){
    if(form.hidden)return;
    try{localStorage.setItem(draftKey(),JSON.stringify({time:Date.now(),data:{...collect(),__placement:placement?.getDraftState?.()}}));}catch{}
  }
  function discardBackup(key=draftKey()){try{localStorage.removeItem(key)}catch{}}
  function recover(p){
    let raw;try{raw=localStorage.getItem(draftKey(p?.id))}catch{}
    if(!raw)return;
    try{
      const saved=JSON.parse(raw),copy=saved?.data;
      if(!copy)return;
      const currentPlacement=placement?.getDraftState?.();
      const placementChanged=!!(copy.__placement&&currentPlacement&&
        Object.keys(copy.__placement).some(key=>String(copy.__placement[key]??'')!==String(currentPlacement[key]??'')));
      const changed=copy.title!==(p?.title||'')||copy.body!==(p?.body||'')||copy.excerpt!==(p?.excerpt||'')||placementChanged;
      if(!changed||saved.time<=(p?.updated_at?Date.parse(p.updated_at)||0:0)){discardBackup(draftKey(p?.id));return;}
      if(!confirm('发现未保存的本机写作副本，要恢复吗？'))return;
      for(const key of ['language','type','title','slug','excerpt','cover_url','collection_slugs','status','tags']){
        if(form.elements[key] && copy[key]!==undefined)form.elements[key].value=copy[key];
      }
      window.TRNStudio?.load(copy.body||'');
      placement?.restoreDraftState?.(copy.__placement);
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
  function ensureSlug(){
    const f=form.elements;
    if(!f.slug.value.trim()){
      const guess=f.title.value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      f.slug.value=guess||'piece-'+Date.now().toString(36);
    }
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug.value)&&f.slug.value.length<=110;
  }
  function validateEditor(){
    const f=form.elements;
    if(!placement)throw Error(editorInitError||'作品归属组件尚未就绪，请刷新后台。');
    if(!placement.hasLoaded())throw Error('作品目录尚未加载成功，请点击「刷新目录」后再保存，避免丢失归属信息。');
    if(!f.title.value.trim())throw Error('请先填写文章标题。');
    if(f.title.value.trim().length>220)throw Error('文章标题过长。');
    if(!ensureSlug())throw Error('文章网址只能使用小写英文字母、数字和短横线。');
    if(!['zh','en'].includes(f.language.value))throw Error('请选择发布站点。');
    if(edition&&f.language.value!==edition)throw Error('此后台仅能发布到当前语言站点。');
    if(!['draft','published'].includes(f.status.value))throw Error('请选择发布状态。');
    const p=placement?.getSelection();
    if(p?.mode==='book'&&!p.chapter_id)throw Error('请选择将文章作为新章节，或收入现有章节。');
    if(p?.mode==='book'&&!p.book_id)throw Error('请先选择所属书籍。');
    if(p?.multiple_sections&&!p.chapter_title?.trim())throw Error('请填写多节章节的章标题。');
    if(p?.multiple_sections&&p.chapter_title.length>200)throw Error('章标题不能超过200个字符。');
    if(!window.TRNStudio?.validateContent)throw Error('所见即所得编辑器未能启动，请刷新页面后再保存。');
    window.TRNStudio.validateContent();
    return true;
  }
  function makeWorkflow(value,publishParents=false){
    return {
      ...(state.editing?{id:state.editing}:{}),
      post:value,
      placement:placement?.getSelection()||{
        mode:value.collection_slugs?'series':'independent',
        series_slug:(value.collection_slugs||'').split(',')[0]||'',
        book_id:'',
        chapter_id:''
      },
      publish_parents:publishParents
    };
  }
  async function saveWorkflow(value,{askParents=false}={}){
    try{
      await placement?.prepareSave?.();
      return await req('/api/admin/workflow',{method:'POST',body:JSON.stringify(makeWorkflow(value))});
    }catch(e){
      if(askParents&&e.details?.needs_parent_publication){
        if(!confirm(e.details.error+'\n\n确定同时公开以上内容吗？')){
          throw Error('已取消公开所属目录。你的文章没有丢失。');
        }
        return await req('/api/admin/workflow',{method:'POST',body:JSON.stringify(makeWorkflow(value,true))});
      }
      throw e;
    }
  }
  let autoSavePending=null;
  async function autoSave(){
    if(autoSavePending||!state.dirty||form.hidden||form.elements.status.value!=='draft')return;
    try{validateEditor();}catch(e){
      $('#save-status').textContent='已暂存在本机，填写完整后可保存草稿';
      return;
    }
    const stamp=state.version,priorKey=draftKey(),isEdit=!!state.editing,value=collect();
    state.autoSaving=true;$('#save-status').textContent='正在自动保存草稿…';
    const pending=(async()=>{
      try{
        const result=await saveWorkflow(value);
        if(!isEdit){
          state.editing=result.id;
          history.replaceState({},'',location.pathname+'?id='+encodeURIComponent(result.id));
          pendingChapter=null;
        }
        const updated={...value,id:result.id,tags:value.tags.split(',').map(x=>x.trim()).filter(Boolean),
          collection_slugs:result.placement.mode==='series'?[result.placement.series_slug]:[],
          updated_at:new Date().toISOString()};
        const ix=state.posts.findIndex(p=>p.id===result.id);
        if(ix>=0)state.posts[ix]={...state.posts[ix],...updated};else state.posts.unshift(updated);
        if(result.placement?.mode==='book' && result.auto_created_chapter && placement){
          await placement.refresh();
          placement.load({...updated,id:result.id},{pendingChapter:result.placement.chapter_id});
        }
        placement?.markSaved?.(result);
        discardBackup(priorKey);
        state.dirty=state.version!==stamp;
        if(state.dirty)backup();else discardBackup();
        $('#save-status').textContent=state.dirty?'修改待保存…':'草稿已自动保存到云端';
        updatePublishControls();
      }catch(e){
        $('#save-status').textContent='自动保存失败，已保留本机副本';
        message('#editor-message','草稿保存失败：'+e.message);
      }
    })();
    autoSavePending=pending;
    try{await pending;}finally{
      autoSavePending=null;state.autoSaving=false;
      if(state.dirty&&form.elements.status.value==='draft'){
        clearTimeout(autoTimer);autoTimer=setTimeout(autoSave,5000);
      }
    }
  }
  function canChange(){return !state.dirty||confirm('当前修改尚未保存，确定放弃修改吗？');}
  function edit(id=null){
    clearTimeout(autoTimer);
    repairEditorFields();
    const p=state.posts.find(post=>post.id===id)||null;
    state.editing=p?.id||null;state.dirty=false;state.preview=false;state.version=0;
    try{window.TRNStudio?.exitFocus?.();}catch(error){console.warn('Unable to exit previous focus state',error);}
    // Opening a document must remain possible even if a rich-text, placement,
    // cover, or focus component fails. Reveal the basic form first.
    $('#editor-empty').hidden=true;form.hidden=false;
    try{window.TRNFocus?.refresh?.();}catch(error){console.warn('Focus UI refresh failed',error);}
    $('#markdown-preview').hidden=true;$('#content-body').hidden=false;$('#preview-toggle').textContent='预览';
    form.reset();
    for(const name of ['language','type','slug','title','excerpt','cover_url','body','collection_slugs','status'])
      editorField(name).value=p?.[name]??({language:requestedLanguage,type:'essay',status:'draft'}[name]||'');
    if(edition)form.elements.language.value=edition;
    editorField('tags').value=Array.isArray(p?.tags)?p.tags.join(', '):String(p?.tags||'');
    editorField('collection_slugs').value=Array.isArray(p?.collection_slugs)?p.collection_slugs.join(', '):String(p?.collection_slugs||'');
    try{window.TRNStudio?.load(p?.body||'');}
    catch(error){
      console.error('Rich editor failed during document load',error);
      editorField('body').value=p?.body||'';
      $('#content-body').hidden=true;
      const mount=document.querySelector('#studio-rich-editor');
      if(mount)mount.hidden=true;
      message('#editor-message','可视化正文编辑器加载失败，请刷新页面。为防止误覆盖文章，保存功能暂不可用：'+error.message);
    }
    try{placement?.load(p,{pendingChapter,pendingBook});}
    catch(error){
      console.error('Placement selector failed during document load',error);
      message('#editor-message','作品归属暂不可用：'+error.message+'。可以先撰写正文。');
    }
    $('#edit-label').textContent=p?'编辑文章':'新建文章';
    $('#delete-post').hidden=!p;
    $('#save-status').textContent='';
    renderList();
    updatePublishControls();
    try{recover(p);}catch(error){console.warn('Local draft restore failed',error);}
    try{window.TRNCoverUpload?.refresh(form.elements.cover_url);}
    catch(error){console.warn('Cover preview failed',error);}
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
  if(edition){
    form.elements.language.value=edition;
    form.elements.language.disabled=true;
    form.elements.language.closest('label')?.setAttribute('hidden','');
  }
  form.elements.language.addEventListener('change',updatePublishControls);
  form.elements.status.addEventListener('change',updatePublishControls);
  const newPostButton=$('#new-post');
  newPostButton.dataset.trnNewPostReady='1';
  newPostButton.addEventListener('click',()=>{
    if(!canChange())return;
    pendingChapter=null;pendingBook=null;
    try{history.replaceState({},'',location.pathname+'?new=1'+(edition?'':'&lang=zh'));}
    catch(error){console.warn('Cannot update new-post URL',error);}
    try{
      edit();
      editorField('language').value=edition||'zh';
      updatePublishControls();
    }catch(error){
      console.error('Unable to initialize new post',error);
      // Keep the author's writing form reachable; only supplementary editing
      // controls may be unavailable.
      $('#editor-empty').hidden=true;
      form.hidden=false;
      const notice='新建文章时部分组件加载失败：'+error.message+'。请先检查正文输入框。';
      $('#editor-message').textContent=notice;
      $('#save-status').textContent=notice;
      form.scrollIntoView?.({block:'start'});
      editorField('title').focus();
    }
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
      $('#markdown-preview').innerHTML=(window.marked&&window.DOMPurify)?(window.TRNReadingLayout?.render(raw,window.marked,window.DOMPurify)??window.DOMPurify.sanitize(window.marked.parse(raw,{gfm:true,breaks:true}))):'<p>阅读预览暂时无法加载。</p>';
    }
  });
  form.addEventListener('submit',async e=>{
    e.preventDefault();clearTimeout(autoTimer);
    if(autoSavePending)await autoSavePending;
    $('#editor-message').textContent='';
    try{validateEditor();}catch(problem){
      message('#editor-message',problem.message);
      $('#save-status').textContent='发布前请检查填写内容';
      // Publishing errors live inside the options panel while focused.
      // Reveal the real form field and error instead of silently failing.
      if(window.TRNFocus?.isActive?.()){
        window.TRNZenOptions?.open?.();
        window.TRNZenOptions?.selectTab?.('work');
      }else{
        document.querySelector('#studio-publication-bar')?.scrollIntoView({behavior:'smooth',block:'center'});
      }
      return;
    }
    const f=form.elements,priorKey=draftKey();
    const value=collect(),isEditing=!!state.editing;
    const original=state.posts.find(p=>p.id===state.editing);
    if(original?.status==='published'&&original.language!==value.language){
      if(!confirm('这篇文章已经发布。确定要切换到'+(value.language==='zh'?'中文站':'英文站')+'吗？旧站点的文章链接将失效。'))return;
    }
    $('#save-post').disabled=true;
    $('#save-status').textContent='正在保存到云端…';
    message('#editor-message','正在'+(value.status==='published'?'发布':'保存')+'…');
    try{
      const result=await saveWorkflow(value,{askParents:true});
      state.dirty=false;
      state.editing=result.id;
      pendingChapter=null;
      discardBackup(priorKey);
      discardBackup();
      history.replaceState({},'',location.pathname+'?id='+encodeURIComponent(result.id));
      await load(result.id);
      const link=$('#editor-public-link');
      if(value.status==='published'){
        link.hidden=false;
        link.href=result.url;
        link.textContent='查看已发布文章 ↗';
      }
      message('#editor-message',value.status==='published'?'发布成功，文章已收录到'+(value.language==='zh'?'中文站':'英文站')+'。点击下方链接查看。':'草稿保存成功，已保存到云端。');
      $('#save-status').textContent=value.status==='published'?'发布成功':'已保存';
      updatePublishControls();
    }catch(problem){
      message('#editor-message','发布或保存失败：'+problem.message);
      $('#save-status').textContent='保存失败，请检查提示';
      // Publishing errors live inside the options panel while focused.
      // Reveal the real form field and error instead of silently failing.
      if(window.TRNFocus?.isActive?.()){
        window.TRNZenOptions?.open?.();
        window.TRNZenOptions?.selectTab?.('work');
      }else{
        document.querySelector('#studio-publication-bar')?.scrollIntoView({behavior:'smooth',block:'center'});
      }
    }finally{$('#save-post').disabled=false;}
  });
  $('#delete-post').addEventListener('click',async()=>{
    clearTimeout(autoTimer);
    if(!state.editing || !confirm('删除后将无法恢复，确定永久删除这篇文章吗？'))return;
    try{await req(`/api/admin/posts/${state.editing}`,{method:'DELETE'});discardBackup();state.editing=null;state.dirty=false;pendingChapter=null;history.replaceState({},'',location.pathname+'?new=1');edit();}
    catch(e){message('#editor-message',e.message);}
  });
  window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
  window.TRNDesk={request:req,edit(id){if(!canChange())return false;edit(id);return true;},newPost(language='zh'){
    if(!canChange())return false;
    try{
      pendingChapter=null;pendingBook=null;
      edit();editorField('language').value=edition||language;updatePublishControls();
      return true;
    }catch(error){
      console.error('Focus new-post initialization failed',error);
      $('#editor-empty').hidden=true;form.hidden=false;
      message('#editor-message','已打开基本编辑区，附加组件初始化失败：'+error.message);
      return true;
    }
  }};
  // Run the authenticated data load after all deferred studio modules exist.
  document.addEventListener('DOMContentLoaded',()=>{check();},{once:true});
  } catch (error) {
    window.TRNAdminBootError = String(error?.message || error);
    console.error('[Author Studio] Core initialization failed:',error);
    const notice=document.querySelector('#editor-empty')||document.querySelector('#login-message');
    if(notice)notice.textContent='写作后台初始化出错：'+window.TRNAdminBootError;
  }
})();
