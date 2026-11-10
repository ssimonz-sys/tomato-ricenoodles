/* Tomato Ricenoodles: independent series, book, chapter and article management. */
(() => {
'use strict';
const $=s=>document.querySelector(s);
const state={csrf:'',posts:[],series:[],books:[],chapters:[],links:[],enabled:false,seriesEnabled:false,lang:'zh',tab:'structure'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const types={essay:'政论与随笔',fiction:'小说',poetry:'诗歌',note:'笔记与杂记'};
const langLabel=l=>l==='zh'?'中文站':'英文站';
const rank=(a,b)=>(a.sort_order||0)-(b.sort_order||0)||a.title.localeCompare(b.title,'zh-CN');
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
    const [hierarchy,entries]=await Promise.all([
      request('/api/admin/hierarchy'),request('/api/admin/posts')
    ]);
    state.enabled=!!hierarchy.enabled;
    state.seriesEnabled=!!hierarchy.seriesEnabled;
    state.series=state.seriesEnabled?hierarchy.series||[]:['zh','en'].flatMap(lang=>(window.TRN?.collections?.[lang]||[]).map((item,i)=>({...item,language:lang,status:'published',sort_order:i*10})));
    state.books=hierarchy.books||[];state.chapters=hierarchy.chapters||[];
    state.links=hierarchy.links||[];state.posts=entries.posts||[];
    render();note('');
  }catch(e){note('读取作品失败：'+e.message,true);}
}
function coverURL(value){
  if(/^https:\/\/[^\s<>"']+$/i.test(value||'')||/^\/assets\/(?:covers|graphics)\/[a-z0-9_./-]+\.(?:svg|png|jpe?g|webp)$/i.test(value||''))return value;
  return '';
}
function selectedSeries(){
  return state.series.filter(x=>x.language===state.lang).sort(rank);
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
  $('#manager-tab-structure').classList.toggle('active',state.tab==='structure');
  $('#manager-tab-articles').classList.toggle('active',state.tab==='articles');
  $('#manager-tab-structure').setAttribute('aria-selected',String(state.tab==='structure'));
  $('#manager-tab-articles').setAttribute('aria-selected',String(state.tab==='articles'));
  $('#manager-structure').hidden=state.tab!=='structure';
  $('#manager-articles').hidden=state.tab!=='articles';
  renderStructure();renderArticles();
}
function renderStructure(){
  const slot=$('#manager-series-list'),standalone=$('#manager-standalone');
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
    (seriesBooks.length?'<div class="manager-books">'+seriesBooks.map(renderBook).join('')+'</div>':'<p class="manager-subempty">这里还没有书籍，也可以先把系列建立起来。</p>')+
  '</section>';
}
function renderBook(book){
  const chapters=state.chapters.filter(c=>c.book_id===book.id).sort(rank);
  return '<details class="manager-book" open><summary><span class="manager-expand-symbol" aria-hidden="true"></span><span><strong>书 · '+esc(book.title)+'</strong><small>'+chapters.length+' 章 · '+(book.status==='published'?'公开':'草稿')+'</small></span></summary>'+
  '<div class="manager-nested">'+
  '<div class="manager-nested-actions">'+button('chapter-new',book.id,'＋ 新建章')+button('book-edit',book.id,'编辑书籍')+button('book-delete',book.id,'删除书籍','danger')+'</div>'+
  (chapters.length?chapters.map(renderChapter).join(''):'<p class="manager-subempty">这本书还没有章节。</p>')+
  '</div></details>';
}
function renderChapter(chapter){
  const links=state.links.filter(l=>l.chapter_id===chapter.id).sort(rank);
  return '<details class="manager-chapter" open><summary><span class="manager-expand-symbol" aria-hidden="true"></span><span><strong>章 · '+esc(chapter.title)+'</strong><small>'+links.length+' 节 · '+(chapter.status==='published'?'公开':'草稿')+'</small></span></summary><div class="manager-chapter-contents">'+
  '<div class="manager-nested-actions">'+button('section-new',chapter.id,'＋ 写新节')+button('section-link',chapter.id,'关联文章')+button('chapter-edit',chapter.id,'编辑章')+button('chapter-delete',chapter.id,'删除章','danger')+'</div>'+
  (links.length?links.map(link=>{
    const p=postFor(link.post_id);
    if(!p)return '';
    return '<div class="manager-section-row"><span><strong>节 · '+esc(p.title)+'</strong><small>'+ (p.status==='published'?'已发布':'草稿')+' · 排序 '+link.sort_order+'</small></span><div class="manager-actions"><a class="manager-mini" href="'+writeLink(p.id)+'">写作</a>'+button('section-move',p.id,'调整归属')+button('section-unlink',p.id,'移出','danger')+'</div></div>';
  }).join(''):'<p class="manager-subempty">暂无小节。可以新建一节，也可以将已有文章关联过来。</p>')+
  '</div></details>';
}
function renderArticles(){
  const text=($('#manager-search').value||'').trim().toLowerCase();
  const onlyUnlinked=$('#manager-only-unlinked').checked;
  const result=state.posts.filter(p=>p.language===state.lang&&(!onlyUnlinked||!sectionLink(p.id))&&(!text||[p.title,p.slug,...(p.tags||[])].some(x=>String(x).toLowerCase().includes(text))));
  $('#manager-article-list').innerHTML=result.length?result.map(p=>{
    const relation=sectionLink(p.id);
    const chapter=relation&&chapterFor(relation.chapter_id);
    const book=chapter&&bookFor(chapter.book_id);
    const where=book?'收录：'+book.title+' / '+chapter.title:'独立文章';
    return '<article class="manager-article-row"><div class="manager-article-main"><div class="manager-article-meta"><span class="manager-status '+(p.status==='draft'?'is-draft':'')+'">'+(p.status==='published'?'已发布':'草稿')+'</span><span>'+esc(types[p.type]||p.type)+'</span><span>'+esc(where)+'</span></div><h3>'+esc(p.title)+'</h3><p>'+esc(p.excerpt||'')+'</p><small>'+esc(p.slug)+' · '+(p.word_count||0)+' 字</small></div><div class="manager-article-actions"><a class="manager-outline-button" href="'+writeLink(p.id)+'">编辑正文</a>'+button('article-link',p.id,relation?'调整章节':'加入章节')+button('article-delete',p.id,'删除文章','danger')+'</div></article>';
  }).join(''):'<div class="manager-empty">没有找到符合条件的文章。</div>';
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
  field({name:'art',label:'封面图片地址（选填）',value:item?.art}),
  field({name:'category',label:'系列类别',options:categoryOptions,value:item?.category||'essay'}),
  field({name:'theme',label:'封面主题配色',options:themeOptions,value:item?.theme||'sage'}),
  field({name:'status',label:'公开状态',options:statusOptions,value:item?.status||'published'}),
  field({name:'sort_order',label:'排序（数字越小越靠前）',type:'number',value:item?.sort_order??0})
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
  field({name:'cover_url',label:'书籍封面网址（选填）',value:item?.cover_url}),
  field({name:'status',label:'公开状态',options:statusOptions,value:item?.status||'draft'}),
  field({name:'sort_order',label:'排序',type:'number',value:item?.sort_order??0})
 ],data=>api(payload(item?'book-update':'book-create',{...data,...(item?{id:item.id}:{language:state.lang})})));
}
function chapterEditor(book,item=null){
 present(item?'编辑章节':'新建章节',[
  field({name:'title',label:'章节标题',required:true,value:item?.title}),
  field({name:'description',label:'章节简介',type:'textarea',value:item?.description}),
  field({name:'status',label:'公开状态',options:statusOptions,value:item?.status||'draft'}),
  field({name:'sort_order',label:'排序',type:'number',value:item?.sort_order??0})
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
  case 'article-link':if(post)linkEditor(null,post);break;
  case 'section-unlink':if(post)await remove('section-unlink',{post_id:post.id},'将「'+post.title+'」移出章节目录？文章正文仍会保留。');break;
  case 'article-delete':if(post)await removeArticle(post);break;
 }
}
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
$('#manager-language').addEventListener('change',value=>{state.lang=value.target.value;render();});
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
