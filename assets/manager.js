/* Tomato Ricenoodles: independent series, book, chapter and article management. */
(() => {
'use strict';
const $=s=>document.querySelector(s);
const state={csrf:'',posts:[],series:[],books:[],chapters:[],links:[],enabled:false,seriesEnabled:false,lang:'zh',tab:'structure',category:'all',publication:'all',commentFilter:'pending',engagementEnabled:false,comments:[],stats:[]};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types={essay:'政论与随笔',fiction:'小说',poetry:'诗歌',note:'笔记与杂记'};
const langLabel=l=>l==='zh'?'中文站':'英文站';
const rank=(a,b)=>(a.sort_order||0)-(b.sort_order||0)||a.title.localeCompare(b.title,'zh-CN');
const newest=(a,b)=>String(b.last_activity||b.created_at||'').localeCompare(String(a.last_activity||a.created_at||''))||String(b.created_at||'').localeCompare(String(a.created_at||''))||a.title.localeCompare(b.title,'zh-CN');
const chapterOrder=(a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||''))||String(a.id).localeCompare(String(b.id));
const sectionLink=id=>state.links.find(link=>link.post_id===id);
const bookFor=id=>state.books.find(book=>book.id===id);
const chapterFor=id=>state.chapters.find(chapter=>chapter.id===id);
const postFor=id=>state.posts.find(post=>post.id===id);
const writeLink=(id=null,lang=state.lang,chapterId=null)=>'/admin/?'+(id?'id='+encodeURIComponent(id):'new=1&lang='+encodeURIComponent(lang)+(chapterId?'&chapter='+encodeURIComponent(chapterId):''));
const payload=(op,data)=>({op,...data});
const button=(action,id,text,kind='')=>'<button type="button" class="manager-mini '+kind+'" data-action="'+esc(action)+'" data-id="'+esc(id)+'">'+esc(text)+'</button>';
async function request(path,options={}){
  const response=await fetch(path,{credentials:'same-origin',...options,headers:{
    Accept:'application/json',...(options.body?{'Content-Type':'application/json'}:{}),
    ...(state.csrf?{'X-CSRF-Token':state.csrf}:{}),...(options.headers||{})
  }});
  const json=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(json.error||'请求失败（HTTP '+response.status+'）');
  return json;
}
const api=data=>request('/api/admin/hierarchy',{method:'POST',body:JSON.stringify(data)});
function note(message,isError=false){
  const box=$('#manager-notice');box.hidden=!message;box.classList.toggle('error',isError);
  box.textContent=message||'';
}
async function verify(){
  try{
    const me=await request('/api/admin/me');
    state.csrf=me.csrf;
    $('#manager-workspace').hidden=false;$('#manager-login').hidden=true;$('#logout').hidden=false;
    await refresh();
  }catch(e){
    $('#manager-workspace').hidden=true;$('#manager-login').hidden=false;$('#logout').hidden=true;
    if(!/Please sign in|HTTP 401|Unauthorized|not authenticated/i.test(e.message))$('#manager-login-error').textContent=e.message;
  }
}
async function refresh(){
  try{
    const [hierarchy,entries,engagement]=await Promise.all([
      request('/api/admin/hierarchy'),request('/api/admin/posts'),request('/api/admin/comments')
    ]);
    state.enabled=!!hierarchy.enabled;
    state.seriesEnabled=!!hierarchy.seriesEnabled;
    state.series=state.seriesEnabled?hierarchy.series||[]:['zh','en'].flatMap(lang=>(window.TRN?.collections?.[lang]||[]).map((item,i)=>({...item,language:lang,status:'published',sort_order:i*10})));
    state.books=hierarchy.books||[];state.chapters=hierarchy.chapters||[];
    state.links=hierarchy.links||[];state.posts=entries.posts||[];
    state.engagementEnabled=!!engagement.enabled;state.comments=engagement.comments||[];state.stats=engagement.stats||[];
    render();note('');
  }catch(e){note('读取作品失败：'+e.message,true);}
}
function coverURL(value){
  if(/^https:\/\/[^\s<>"']+$/i.test(value||'')||/^\/assets\/(?:covers|graphics)\/[a-z0-9_./-]+\.(?:svg|png|jpe?g|webp|gif)$/i.test(value||'')||/^\/media\/covers\/[0-9a-f-]{36}\.(?:jpg|png|webp|gif)$/i.test(value||''))return value;
  return '';
}
function selectedSeries(){
  return state.series.filter(x=>x.language===state.lang).sort(newest);
}
function count(id){
  const lang=state.lang;
  const total=key=>state[key].filter(x=>key==='posts'?x.language===lang:key==='series'?x.language===lang:key==='books'?x.language===lang:true).length;
  const ownedChapters=state.chapters.filter(ch=>bookFor(ch.book_id)?.language===lang).length;
  return {series:total('series'),books:total('books'),chapters:ownedChapters,posts:total('posts')};
}
function render(){
  const counts=count();
  for(const key of ['series','books','chapters','posts'])$('#manager-stat-'+key).textContent=counts[key];
  $('#manager-language').value=state.lang;
  $('#manager-add-article').href=writeLink(null,state.lang);
  const quickCreate=document.querySelector('.manager-heading-actions a.primary');
  if(quickCreate)quickCreate.href=writeLink(null,state.lang);
  $('#manager-tab-structure').classList.toggle('active',state.tab==='structure');
  $('#manager-tab-articles').classList.toggle('active',state.tab==='articles');
  $('#manager-tab-comments').classList.toggle('active',state.tab==='comments');
  $('#manager-tab-structure').setAttribute('aria-selected',String(state.tab==='structure'));
  $('#manager-tab-articles').setAttribute('aria-selected',String(state.tab==='articles'));
  $('#manager-tab-comments').setAttribute('aria-selected',String(state.tab==='comments'));
  $('#manager-structure').hidden=state.tab!=='structure';
  $('#manager-articles').hidden=state.tab!=='articles';
  $('#manager-comments').hidden=state.tab!=='comments';
  $('#manager-init-engagement').hidden=state.engagementEnabled;
  $('#manager-pending-count').textContent=state.comments.filter(c=>c.status==='pending').length||'';
  $('#manager-category-tabs').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.category===state.category));
  $('#manager-publication-tabs').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.status===state.publication));
  $('#manager-comment-tabs').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.commentStatus===state.commentFilter));
  renderStructure();renderArticles();renderComments();
}
function renderStructure(){
  const slot=$('#manager-series-list'),standalone=$('#manager-standalone');
  const requestedBook=new URLSearchParams(location.search).get('book');
  if(requestedBook && state.enabled){
    const selected=bookFor(requestedBook);
    if(!selected){
      slot.innerHTML='<div class="manager-empty">书籍不存在或已被删除。<a href="/admin/manage/">返回书架</a></div>';
      standalone.innerHTML='';return;
    }
    if(selected.language!==state.lang)state.lang=selected.language;
    $('#manager-language').value=state.lang;
    slot.innerHTML=renderBookDetails(selected);
    standalone.innerHTML='';
    return;
  }
  if(!state.enabled){
    slot.innerHTML='<div class="manager-empty">书籍管理数据库尚未初始化。请先完成之前的书、章、节 D1 升级。</div>';
    standalone.innerHTML='';return;
  }
  const series=selectedSeries();
  if(!state.seriesEnabled){
    slot.innerHTML='<div class="manager-empty"><strong>系列管理尚未启用。</strong><p>原来的文章和书籍可以正常使用。</p><button type="button" class="primary" data-action="series-init" data-id="">启用系列管理</button></div>';
  }else{
    slot.innerHTML=series.length?series.map(renderSeries).join(''):'<div class="manager-empty">这个语言站点还没有系列。点击「新建系列」开始整理作品。</div>';
  }
  const other=state.books.filter(b=>b.language===state.lang&&(!b.series_slug||!series.some(s=>s.slug===b.series_slug))).sort(rank);
  standalone.innerHTML=other.length?'<div class="manager-standalone-head"><h2>独立书籍与待归档书籍</h2><span>'+other.length+' 本</span></div>'+other.map(renderBook).join(''):'';
}
function renderSeries(item){
  const seriesBooks=state.books.filter(b=>b.language===item.language&&b.series_slug===item.slug).sort(rank);
  const id=item.language+'::'+item.slug;
  const art=coverURL(item.art);
  return '<section class="manager-series-card">'+
    '<div class="manager-series-intro">'+
      (art?'<img class="manager-series-cover" src="'+esc(art)+'" loading="lazy" alt="">':'<div class="manager-series-placeholder" aria-hidden="true">✳</div>')+
      '<div class="manager-series-copy"><span class="manager-kicker">'+(item.status==='published'?'已公开':'草稿')+' · '+esc(types[item.category]||'系列')+'</span>'+
      '<h3>'+esc(item.title)+'</h3><p>'+esc(item.description||'暂无简介')+'</p>'+
      '<span class="manager-hint">'+esc(item.slug)+' · '+seriesBooks.length+' 本书</span></div>'+
      '<div class="manager-actions">'+button('book-new-in-series',id,'＋ 书')+button('series-edit',id,'编辑')+button('series-delete',id,'删除','danger')+'</div>'+
    '</div>'+
    (seriesBooks.length?'<div class="manager-books" data-book-list="'+esc(id)+'"><p class="manager-reorder-hint">拖动书名前的 ⠿ 调整顺序，松开后自动保存。</p>'+seriesBooks.map(b=>renderBook(b,true)).join('')+'</div>':'<p class="manager-subempty">这里还没有书籍，也可以先把系列建立起来。</p>')+
  '</section>';
}
function renderBook(book,reorderable=false){
  const chapters=state.chapters.filter(c=>c.book_id===book.id).sort(chapterOrder);
  const count=chapters.length;
  return '<div class="manager-book manager-book-card" data-book-id="'+esc(book.id)+'">'+
    (reorderable?'<span class="manager-drag-handle" draggable="true" title="拖动排序" aria-label="拖动排序 '+esc(book.title)+'">⠿</span>':'')+
    '<a class="manager-book-open" href="/admin/manage/?book='+encodeURIComponent(book.id)+'">'+
      '<strong>书 · '+esc(book.title)+'</strong>'+
      '<small>'+count+' 章 · '+(book.status==='published'?'公开':'草稿')+'</small></a>'+
    '<span class="manager-book-next" aria-hidden="true">›</span>'+
  '</div>';
}
function renderBookDetails(book){
  const chapters=state.chapters.filter(c=>c.book_id===book.id).sort(chapterOrder);
  const series=state.series.find(s=>s.language===book.language&&s.slug===book.series_slug);
  return '<section class="manager-book-details">'+
    '<a href="/admin/manage/" class="manager-book-back">← 返回系列书架</a>'+
    '<div class="manager-book-details-header"><div>'+
      '<p class="manager-kicker">'+(series?'所属系列 · '+esc(series.title):'独立书籍')+'</p>'+
      '<h2>'+esc(book.title)+'</h2><p>'+esc(book.description||'')+'</p>'+
      '<small>'+chapters.length+' 章 · '+(book.status==='published'?'公开':'草稿')+'</small></div>'+
      '<div class="manager-actions">'+button('chapter-new',book.id,'＋ 添加章节')+button('book-edit',book.id,'编辑书籍')+button('book-delete',book.id,'删除书籍','danger')+'</div>'+
    '</div>'+
    '<div class="manager-book-detail-chapters">'+
      (chapters.length?chapters.map(renderChapter).join(''):'<p class="manager-subempty">还没有章节。可以添加一章，再把文章放进去。单篇作品也照此管理。</p>')+
    '</div></section>';
}
function renderChapter(chapter){
  const links=state.links.filter(l=>l.chapter_id===chapter.id).sort(rank);
  return '<details class="manager-chapter" open><summary><span class="manager-expand-symbol" aria-hidden="true"></span><span><strong>章 · '+esc(chapter.title)+'</strong><small>'+links.length+' 节 · '+(chapter.status==='published'?'公开':'草稿')+'</small></span></summary><div class="manager-chapter-contents">'+
  '<div class="manager-nested-actions">'+button('section-new',chapter.id,'＋ 写新节')+button('section-link',chapter.id,'关联文章')+button('chapter-edit',chapter.id,'编辑章')+button('chapter-delete',chapter.id,'删除章','danger')+'</div>'+
  (links.length?links.map(link=>{
    const p=postFor(link.post_id);
    if(!p)return '';
    return '<div class="manager-section-row"><span><strong>节 · '+esc(p.title)+'</strong><small>'+ (p.status==='published'?'已发布':'草稿')+'</small></span><div class="manager-actions"><a class="manager-mini" href="'+writeLink(p.id)+'">写作</a>'+button('section-move',p.id,'调整归属')+button('section-unlink',p.id,'移出','danger')+'</div></div>';
  }).join(''):'<p class="manager-subempty">暂无小节。可以新建一节，也可以将已有文章关联过来。</p>')+
  '</div></details>';
}
function renderArticles(){
  const text=($('#manager-search').value||'').trim().toLowerCase();
  const onlyUnlinked=$('#manager-only-unlinked').checked;
  const result=state.posts.filter(p=>p.language===state.lang&&(state.category==='all'||p.type===state.category)&&(state.publication==='all'||p.status===state.publication)&&(!onlyUnlinked||!sectionLink(p.id))&&(!text||[p.title,p.slug,...(p.tags||[])].some(x=>String(x).toLowerCase().includes(text))));
  $('#manager-article-list').innerHTML=result.length?result.map(p=>{
    const relation=sectionLink(p.id);
    const chapter=relation&&chapterFor(relation.chapter_id);
    const book=chapter&&bookFor(chapter.book_id);
    const directSeries=(p.collection_slugs||[]).map(slug=>state.series.find(row=>row.language===p.language&&row.slug===slug)?.title).filter(Boolean);
    const where=book?'收录：'+book.title+' / '+chapter.title:directSeries.length?'收录系列：'+directSeries.join('、'):'独立文章';
    const metrics=state.stats.find(s=>s.post_id===p.id);
    const stats=metrics?' · '+metrics.views+' 阅读 · '+metrics.likes+' 点赞 · '+metrics.comments+' 评论':' · '+(p.views||0)+' 阅读 · '+(p.likes||0)+' 点赞';
    return '<article class="manager-article-row"><div class="manager-article-main"><div class="manager-article-meta"><span class="manager-status '+(p.status==='draft'?'is-draft':'')+'">'+(p.status==='published'?'已发布':'草稿')+'</span><span>'+esc(types[p.type]||p.type)+'</span><span>'+esc(where)+'</span></div><h3>'+esc(p.title)+'</h3><p>'+esc(p.excerpt||'')+'</p><small>'+esc(p.slug)+' · '+(p.word_count||0)+' 字'+stats+'</small></div><div class="manager-article-actions"><a class="manager-outline-button" href="'+writeLink(p.id)+'">编辑正文</a>'+button('article-link',p.id,'设置归属')+button('article-delete',p.id,'删除文章','danger')+'</div></article>';
  }).join(''):'<div class="manager-empty">没有找到符合条件的文章。</div>';
}
function renderComments(){
 const root=$('#manager-comments-list');
 if(!state.engagementEnabled){
   root.innerHTML='<div class="manager-empty">尚未启用阅读量、点赞和匿名评论。请点击上方按钮初始化数据库。</div>';
   return;
 }
 const matches=state.comments.filter(c=>(state.commentFilter==='all'||c.status===state.commentFilter)&&(c.language===state.lang));
 root.innerHTML=matches.length?matches.map(c=>
 '<article class="manager-comment-row"><div><div class="manager-article-meta"><span>'+esc(c.title||'文章')+'</span><span>'+esc(c.language==='zh'?'中文站':'英文站')+'</span><span>'+esc({pending:'待审核',approved:'已公开',rejected:'已拒绝'}[c.status]||c.status)+'</span></div>'+
 '<p>'+esc(c.content)+'</p><small>'+new Date(c.created_at*1000).toLocaleString('zh-CN')+'</small></div>'+
 '<div class="manager-article-actions">'+(c.status!=='approved'?button('comment-approve',c.id,'批准',''):'')+
 (c.status!=='rejected'?button('comment-reject',c.id,'拒绝',''):'')+
 button('comment-delete',c.id,'删除','danger')+'</div></article>'
 ).join(''):'<div class="manager-empty">这一栏还没有评论。</div>';
}
async function moderate(action,id){
 if(action==='delete'&&!confirm('永久删除这条评论吗？'))return;
 try{
  await request('/api/admin/comments',{method:'POST',body:JSON.stringify({action,id})});
  await refresh();
 }catch(error){note('评论操作失败：'+error.message,true);}
}
async function initEngagement(){
 if(state.engagementEnabled)return;
 if(!confirm('启用独立的阅读统计、点赞和匿名评论数据库？不会修改已有文章。'))return;
 const btn=$('#manager-init-engagement');btn.disabled=true;
 try{
  await request('/api/admin/comments',{method:'POST',body:JSON.stringify({action:'initialize'})});
  await refresh();note('互动功能已启用。每篇已发布的文章都可以显示阅读量、点赞和匿名评论。');
 }catch(error){note('初始化失败：'+error.message,true);}
 finally{btn.disabled=false;}
}
const dialog=$('#manager-dialog'),fields=$('#manager-dialog-fields');
let saveHandler=null;
function field({name,label,value='',type='text',required=false,readonly=false,options}){
 const wrap=document.createElement('label');wrap.className='manager-field';
 const title=document.createElement('span');title.textContent=label;wrap.append(title);
 const control=options?document.createElement('select'):type==='textarea'?document.createElement('textarea'):document.createElement('input');
 if(!options&&type!=='textarea')control.type=type;
 control.name=name;control.value=String(value??'');
 control.required=required;control.readOnly=readonly;
 if(type==='number')control.min='0';
 if(options)for(const [key,title] of options){const option=document.createElement('option');option.value=key;option.textContent=title;control.append(option);}
 if(options)control.value=String(value??options[0]?.[0]??'');
 if(readonly)control.title='为保护已有作品链接，此标识创建后固定';
 wrap.append(control);return wrap;
}
function present(title,items,handler){
 $('#manager-dialog-title').textContent=title;
 $('#manager-dialog-error').textContent='';
 fields.replaceChildren(...items);
 saveHandler=handler;
 dialog.showModal();
 for(const input of fields.querySelectorAll('input[name="art"], input[name="cover_url"]')){
  window.TRNCoverUpload?.attach(input,{getCsrf:()=>state.csrf});
 }
 fields.querySelector('input:not([readonly]),select,textarea')?.focus();
}
const statusOptions=[['draft','草稿'],['published','公开']];
const categoryOptions=[['essay','政论与随笔'],['fiction','小说'],['poetry','诗歌'],['note','笔记与杂记']];
const themeOptions=[['sage','柔和绿'],['stone','宣纸灰'],['copper','朱红'],['ink','墨色'],['blue','蓝色']];
async function ensureSeries(){
 if(!state.enabled){note('请先执行书、章、节的数据库升级。',true);return false;}
 if(state.seriesEnabled)return true;
 if(!confirm('首次使用需要初始化系列目录，并导入已有的中英文系列。现有文章和书籍会保留。是否继续？'))return false;
 const defaults=['zh','en'].flatMap(language=>(window.TRN?.collections?.[language]||[]).map(x=>({...x,language})));
 try{await api(payload('series-init',{defaults}));await refresh();return state.seriesEnabled;}
 catch(error){note('初始化失败：'+error.message,true);return false;}
}
async function seriesEditor(item=null){
 if(!await ensureSeries())return;
 const fieldsDef=[
  field({name:'title',label:'系列名称',value:item?.title,required:true}),
  field({name:'slug',label:'系列网址标识（英文小写及连字符）',value:item?.slug,required:true,readonly:!!item}),
  field({name:'description',label:'系列简介',value:item?.description,type:'textarea'}),
  field({name:'art',label:'系列封面（上传图片或填网址）',value:item?.art}),
  field({name:'category',label:'系列类别',options:categoryOptions,value:item?.category||'essay'}),
  field({name:'theme',label:'封面主题配色',options:themeOptions,value:item?.theme||'sage'}),
  field({name:'status',label:'公开状态',options:statusOptions,value:item?.status||'published'})
 ];
 const titleInput=fieldsDef[0].querySelector('input'),slugInput=fieldsDef[1].querySelector('input');
 if(!item)titleInput.addEventListener('blur',()=>{
  if(slugInput.value.trim())return;
  const candidate=titleInput.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  slugInput.value=candidate||'series-'+Date.now().toString(36);
 });
 present(item?'编辑系列':'新建系列',fieldsDef,data=>api(payload(item?'series-update':'series-create',{...data,language:state.lang,slug:item?.slug||data.slug})));
}
function bookEditor(item=null,defaultSlug=''){
 const options=[['','独立书籍'],...selectedSeries().map(x=>[x.slug,x.title])];
 if(item?.series_slug&&!options.some(x=>x[0]===item.series_slug))options.push([item.series_slug,item.series_slug+'（原有关联）']);
 present(item?'编辑书籍':'新建书籍',[
  field({name:'title',label:'书名',value:item?.title,required:true}),
  field({name:'series_slug',label:'所属系列',options,value:item?.series_slug??defaultSlug}),
  field({name:'description',label:'书籍简介',type:'textarea',value:item?.description}),
  field({name:'cover_url',label:'书籍封面（上传图片或填网址）',value:item?.cover_url}),
  field({name:'status',label:'公开状态',options:statusOptions,value:item?.status||'draft'})
 ],data=>api(payload(item?'book-update':'book-create',{...data,...(item?{id:item.id}:{language:state.lang})})));
}
function chapterEditor(book,item=null){
 present(item?'编辑章节':'新建章节',[
  field({name:'title',label:'章节标题',required:true,value:item?.title}),
  field({name:'description',label:'章节简介',type:'textarea',value:item?.description}),
  field({name:'status',label:'公开状态',options:statusOptions,value:item?.status||'draft'})
 ],data=>api(payload(item?'chapter-update':'chapter-create',{...data,...(item?{id:item.id}:{book_id:book.id})})));
}
function linkEditor(chapter=null,post=null){
 const candidates=state.posts.filter(p=>p.language===state.lang).map(p=>[p.id,p.title]);
 const possible=state.chapters.filter(ch=>bookFor(ch.book_id)?.language===state.lang).map(ch=>[ch.id,(bookFor(ch.book_id)?.title||'')+' / '+ch.title]);
 if(!candidates.length){note('还没有文章。先新建一节或一篇文章。',true);return;}
 if(!possible.length){note('请先创建书籍和章节。',true);return;}
 const old=post&&sectionLink(post.id);
 present(post?'调整文章所属章节':'将文章关联到章节',[
  field({name:'post_id',label:'选择文章',options:candidates,value:post?.id??candidates[0][0]}),
  field({name:'chapter_id',label:'目标章节',options:possible,value:chapter?.id??old?.chapter_id??possible[0][0]}),
  field({name:'sort_order',label:'节的排序',type:'number',value:old?.sort_order??0})
 ],data=>api(payload('section-link',data)));
}
async function remove(op,data,question){
 if(!confirm(question))return;
 try{await api(payload(op,data));await refresh();}
 catch(error){note(error.message,true);}
}
async function removeArticle(post){
 const linked=!!sectionLink(post.id);
 if(!confirm('确定永久删除文章「'+post.title+'」吗？'+(linked?'它同时会从所属章节中移除。':'')+'此操作无法撤销。'))return;
 try{await request('/api/admin/posts/'+encodeURIComponent(post.id),{method:'DELETE'});await refresh();}
 catch(error){note('删除失败：'+error.message,true);}
}
async function act(action,id){
 const [code,slug]=id.split('::');
 const series=state.series.find(s=>s.language===code&&s.slug===slug);
 const book=bookFor(id),chapter=chapterFor(id),post=postFor(id);
 switch(action){
  case 'comment-approve':await moderate('approve',id);break;
  case 'comment-reject':await moderate('reject',id);break;
  case 'comment-delete':await moderate('delete',id);break;
  case 'series-init':await ensureSeries();break;
  case 'series-new':await seriesEditor();break;
  case 'series-edit':if(series)await seriesEditor(series);break;
  case 'series-delete':if(series)await remove('series-delete',{language:series.language,slug:series.slug},'删除系列「'+series.title+'」？如果仍有关联作品，服务器会阻止删除。');break;
  case 'book-new':bookEditor();break;
  case 'book-new-in-series':if(series)bookEditor(null,series.slug);break;
  case 'book-edit':if(book)bookEditor(book);break;
  case 'book-delete':if(book)await remove('book-delete',{id:book.id},'删除书籍「'+book.title+'」？需要先移除所有章节，正文不会因此删除。');break;
  case 'chapter-new':if(book)chapterEditor(book);break;
  case 'chapter-edit':if(chapter)chapterEditor(bookFor(chapter.book_id),chapter);break;
  case 'chapter-delete':if(chapter)await remove('chapter-delete',{id:chapter.id},'删除章节「'+chapter.title+'」？有小节的章节无法删除。');break;
  case 'section-new':if(chapter)location.href=writeLink(null,bookFor(chapter.book_id)?.language||state.lang,chapter.id);break;
  case 'section-link':if(chapter)linkEditor(chapter);break;
  case 'section-move':if(post)linkEditor(null,post);break;
  case 'article-link':if(post)location.href=writeLink(post.id);break;
  case 'section-unlink':if(post)await remove('section-unlink',{post_id:post.id},'将「'+post.title+'」移出章节目录？文章正文仍会保留。');break;
  case 'article-delete':if(post)await removeArticle(post);break;
 }
}
let draggedBook=null;
document.addEventListener('dragstart',e=>{
 const handle=e.target.closest('.manager-drag-handle');if(!handle)return;
 const list=handle.closest('[data-book-list]'),card=handle.closest('.manager-book');
 if(!list||!card)return;
 draggedBook={list,id:card.dataset.bookId};card.classList.add('is-dragging');
 e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',card.dataset.bookId);
});
document.addEventListener('dragover',e=>{
 if(!draggedBook)return;
 const list=e.target.closest('[data-book-list]');if(list!==draggedBook.list)return;
 e.preventDefault();
 const target=e.target.closest('.manager-book'),moving=list.querySelector('.is-dragging');
 if(!target||!moving||target===moving)return;
 const rect=target.getBoundingClientRect();
 list.insertBefore(moving,e.clientY<rect.top+rect.height/2?target:target.nextSibling);
});
document.addEventListener('drop',async e=>{
 if(!draggedBook)return;
 const current=draggedBook;draggedBook=null;
 if(e.target.closest('[data-book-list]')!==current.list){renderStructure();return;}
 e.preventDefault();
 const ids=[...current.list.querySelectorAll(':scope > .manager-book')].map(x=>x.dataset.bookId);
 const [language,series_slug]=current.list.dataset.bookList.split('::');
 current.list.querySelector('.is-dragging')?.classList.remove('is-dragging');
 try{
  await api(payload('book-reorder',{language,series_slug,ids}));
  state.books.filter(b=>b.language===language&&b.series_slug===series_slug).forEach(b=>{b.sort_order=(ids.indexOf(b.id)+1)*10;});
  note('书籍顺序已保存。');
 }catch(err){note('排序保存失败：'+err.message,true);await refresh();}
});
document.addEventListener('dragend',()=>{if(draggedBook){draggedBook=null;renderStructure();}});
$('#manager-dialog-close').addEventListener('click',()=>dialog.close());
$('#manager-dialog-cancel').addEventListener('click',()=>dialog.close());
$('#manager-dialog-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const values=Object.fromEntries(new FormData(event.currentTarget).entries());
 const save=$('#manager-dialog-save');
 save.disabled=true;$('#manager-dialog-error').textContent='正在保存……';
 try{await saveHandler(values);dialog.close();await refresh();}
 catch(error){$('#manager-dialog-error').textContent=error.message;}
 finally{save.disabled=false;}
});
document.addEventListener('click',event=>{
 const b=event.target.closest('[data-action]');
 if(!b)return;
 event.preventDefault();act(b.dataset.action,b.dataset.id||'').catch(error=>note(error.message,true));
});
$('#manager-add-series').addEventListener('click',()=>act('series-new',''));
$('#manager-add-book').addEventListener('click',()=>act('book-new',''));
$('#manager-reload').addEventListener('click',refresh);
$('#manager-tab-structure').addEventListener('click',()=>{state.tab='structure';render();});
$('#manager-tab-articles').addEventListener('click',()=>{state.tab='articles';render();});
$('#manager-tab-comments').addEventListener('click',()=>{state.tab='comments';render();});
$('#manager-category-tabs').addEventListener('click',e=>{const button=e.target.closest('button[data-category]');if(!button)return;state.category=button.dataset.category;render();});
$('#manager-publication-tabs').addEventListener('click',e=>{const button=e.target.closest('button[data-status]');if(!button)return;state.publication=button.dataset.status;render();});
$('#manager-comment-tabs').addEventListener('click',e=>{const button=e.target.closest('button[data-comment-status]');if(!button)return;state.commentFilter=button.dataset.commentStatus;render();});
$('#manager-init-engagement').addEventListener('click',initEngagement);
$('#manager-language').addEventListener('change',value=>{
  if(new URLSearchParams(location.search).has('book'))history.replaceState({},'',location.pathname);
  state.lang=value.target.value;render();
});
$('#manager-search').addEventListener('input',renderArticles);
$('#manager-only-unlinked').addEventListener('change',renderArticles);
$('#manager-login-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const pw=$('#manager-password');
 $('#manager-login-error').textContent='正在登录……';
 try{
   const result=await request('/api/admin/login',{method:'POST',body:JSON.stringify({password:pw.value})});
   pw.value='';state.csrf=result.csrf;$('#manager-login-error').textContent='';
   $('#manager-login').hidden=true;$('#manager-workspace').hidden=false;$('#logout').hidden=false;
   await refresh();
 }catch(error){$('#manager-login-error').textContent=error.message;}
});
$('#logout').addEventListener('click',async()=>{
 try{await request('/api/admin/logout',{method:'POST',body:'{}'});}catch{}
 state.csrf='';$('#manager-workspace').hidden=true;$('#manager-login').hidden=false;$('#logout').hidden=true;
});
verify();
})();
