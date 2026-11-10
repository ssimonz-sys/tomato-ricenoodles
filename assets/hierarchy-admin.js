(() => {
'use strict';
const $=s=>document.querySelector(s);
const sidebar=$('.draft-list');
if(!sidebar)return;
let books=[],chapters=[],links=[],posts=[],series=[],seriesEnabled=false,enabled=false,active=false,pending=null;
const tabs=document.createElement('div');
tabs.className='hier-tabs';
tabs.innerHTML='<button class="active" type="button" data-tab="posts">全部文章</button><button type="button" data-tab="hier">系列书架</button>';
const toolbar=document.createElement('div');
toolbar.className='hier-toolbar';
toolbar.innerHTML='<button type="button" id="hier-init-series" hidden>启用系列管理</button><button type="button" id="hier-create-series">＋ 新建系列</button><button type="button" id="hier-create-book">＋ 新建书籍</button><button type="button" id="hier-refresh">刷新</button>';
toolbar.hidden=true;
const tree=document.createElement('div');tree.className='hier-tree';tree.hidden=true;
sidebar.querySelector('.draft-top').after(tabs,toolbar);
sidebar.append(tree);
const standalone=$('#post-admin-list');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nameFor=(lang,slug)=>!slug?'独立书籍':series.find(x=>x.language===lang&&x.slug===slug)?.title||slug;
const lableLang=lang=>lang==='zh'?'中文站':'英文站';
const order=(a,b)=>a.sort_order-b.sort_order;
const action=(a,id,t)=>'<button type="button" data-action="'+a+'" data-id="'+esc(id)+'">'+t+'</button>';
async function api(body){const api=window.TRNDesk;if(!api)throw Error('后台尚未准备好。');return api.request('/api/admin/hierarchy',body?{method:'POST',body:JSON.stringify(body)}:{});}
async function reload(){
  if(!window.TRNDesk)return;
  tree.textContent='正在读取目录……';
  try{
    const data=await api();
    enabled=!!data.enabled;seriesEnabled=!!data.seriesEnabled;
    books=data.books||[];chapters=data.chapters||[];links=data.links||[];
    series=seriesEnabled?(data.series||[]):['zh','en'].flatMap(lang=>(window.TRN?.collections?.[lang]||[]).map((item,i)=>({...item,language:lang,status:'published',sort_order:i*10})));
    updateArticleSeriesOptions();
    draw();
  }catch(e){tree.textContent='读取失败：'+e.message;}
}
function draw(){
  if(!enabled){
    tree.innerHTML='<p class="hier-help">数据库尚未运行书、章、节升级脚本，单篇文章仍可编辑。</p><a class="hier-help" target="_blank" rel="noopener" href="https://github.com/ssimonz-sys/tomato-ricenoodles/blob/main/migrations/2026-11-09-hierarchy.sql">查看结构升级 SQL</a>';
    $('#hier-create-book').disabled=true;
    $('#hier-create-series').disabled=true;
    $('#hier-init-series').hidden=true;
    return;
  }
  $('#hier-create-book').disabled=false;
  $('#hier-create-series').disabled=!enabled;
  $('#hier-init-series').hidden=seriesEnabled;
  const out=[];
  if(!seriesEnabled)out.push('<p class="hier-help">点击上方「启用系列管理」，即可自动创建系列数据表并保留现有系列。你原有的书籍和文章不会改变。</p>');
  function drawBook(book){
    out.push('<div class="hier-item"><strong>书 · '+esc(book.title)+'</strong><small>'+(book.status==='published'?'公开':'草稿')+'</small><span>'+action('chapter-new',book.id,'＋章')+action('book-edit',book.id,'编辑')+'</span></div>');
    const chs=chapters.filter(c=>c.book_id===book.id).sort(order);
    for(const ch of chs){
      out.push('<div class="hier-item sub"><strong>章 · '+esc(ch.title)+'</strong><small>'+(ch.status==='published'?'公开':'草稿')+'</small><span>'+action('section-new',ch.id,'＋节')+action('section-link',ch.id,'关联')+action('chapter-edit',ch.id,'编辑')+'</span></div>');
      for(const l of links.filter(link=>link.chapter_id===ch.id).sort(order)){
        const p=posts.find(x=>x.id===l.post_id);if(!p)continue;
        out.push('<div class="hier-item deep"><strong>节 · '+esc(p.title)+'</strong><small>'+(p.status==='published'?'公开':'草稿')+'</small><span>'+action('section-open',p.id,'写作')+action('section-unlink',p.id,'移出')+'</span></div>');
      }
    }
  }
  for(const lang of ['zh','en']){
    out.push('<div class="hier-lang">'+lableLang(lang)+'</div>');
    const allBooks=books.filter(b=>b.language===lang).sort(order);
    const catalog=series.filter(v=>v.language===lang).sort(order);
    if(!catalog.length&&!allBooks.length)out.push('<p class="hier-help">还没有系列或书籍。</p>');
    for(const item of catalog){
      const number=allBooks.filter(b=>b.series_slug===item.slug).length;
      const operations=seriesEnabled?action('book-in-series',lang+'::'+item.slug,'＋书')+action('series-edit',lang+'::'+item.slug,'编辑')+action('series-delete',lang+'::'+item.slug,'删除'):'';
      out.push('<div class="hier-series hier-managed-series"><div class="hier-series-info"><strong>系列 · '+esc(item.title)+'</strong><small>'+esc(item.slug)+' · '+(item.status==='draft'?'草稿':'公开')+' · '+number+' 本书</small></div><div class="hier-series-actions">'+operations+'</div></div>');
      for(const book of allBooks.filter(b=>b.series_slug===item.slug))drawBook(book);
    }
    const unknown=allBooks.filter(b=>!b.series_slug||!catalog.some(v=>v.slug===b.series_slug));
    if(unknown.length){
      out.push('<div class="hier-series">'+(unknown.some(b=>b.series_slug)?'独立及待归档书籍':'独立书籍')+'</div>');
      for(const book of unknown)drawBook(book);
    }
  }
  tree.innerHTML=out.join('');
}
const dialog=document.createElement('dialog');
dialog.className='hier-dialog';
dialog.innerHTML='<form id="hier-editor"><h2 id="hier-form-title"></h2><div id="hier-form-fields"></div><p id="hier-form-error" role="status"></p><div class="hier-dialog-actions"><button type="button" id="hier-cancel">取消</button><button type="submit" class="primary">保存</button></div></form>';
document.body.append(dialog);
const form=dialog.querySelector('form'),fields=$('#hier-form-fields');
let handler=null;
function line(label,name,value='',type='text'){
 const wrap=document.createElement('label');wrap.textContent=label;
 const x=document.createElement(type==='textarea'?'textarea':'input');if(type!=='textarea')x.type=type;
 x.name=name;x.value=value??'';if(name==='title')x.required=true;wrap.append(x);return wrap;
}
function chooser(label,name,options,value){
 const wrap=document.createElement('label');wrap.textContent=label;
 const x=document.createElement('select');x.name=name;
 for(const [id,title] of options){const opt=document.createElement('option');opt.value=id;opt.textContent=title;x.append(opt);}
 if(value!==undefined)x.value=value;
 wrap.append(x);return wrap;
}
function popup(title,items,save){
 $('#hier-form-title').textContent=title;fields.replaceChildren(...items);
 $('#hier-form-error').textContent='';handler=save;dialog.showModal();
}
$('#hier-cancel').addEventListener('click',()=>dialog.close());
form.addEventListener('submit',async e=>{
 e.preventDefault();const data=Object.fromEntries(new FormData(form).entries());
 $('#hier-form-error').textContent='保存中……';
 try{await handler(data);dialog.close();await reload();}
 catch(err){$('#hier-form-error').textContent=err.message;}
});
async function ensureSeriesReady(){
 if(!enabled){
   alert('请先在 Cloudflare D1 完成书、章、节的数据库升级。');
   return false;
 }
 if(seriesEnabled)return true;
 if(!confirm('首次使用需要建立系列数据表并导入现有中英文系列。不会删除文章、书籍或草稿。现在启用吗？'))return false;
 const defaults=['zh','en'].flatMap(lang=>(window.TRN?.collections?.[lang]||[]).map(v=>({...v,language:lang})));
 const launch=$('#hier-init-series'),create=$('#hier-create-series');
 launch.disabled=true;create.disabled=true;
 try{
   await api({op:'series-init',defaults});
   await reload();
   if(!seriesEnabled)throw Error('初始化后仍未找到系列数据表，请刷新页面重试。');
   return true;
 }catch(error){
   alert('系列初始化失败：'+error.message+'。若仍失败，可在 Cloudflare D1 Console 中执行 migrations/2026-11-09-series.sql。');
   return false;
 }finally{
   launch.disabled=false;
   create.disabled=!enabled;
 }
}
async function seriesEditor(item=null){
 const editing=!!item;
 if(!await ensureSeriesReady())return;
 const lang=chooser('所属站点','language',[['zh','中文站'],['en','英文站']],item?.language||'zh');
 const slug=line('系列标识（小写英文、数字、连字符）','slug',item?.slug||'');
 const slugInput=slug.querySelector('input');
 if(editing){lang.querySelector('select').disabled=true;slugInput.readOnly=true;}
 const titleInput=line('系列名称','title',item?.title||'');
 if(!editing){
   titleInput.querySelector('input').addEventListener('blur',()=>{
     if(slugInput.value.trim())return;
     const candidate=titleInput.querySelector('input').value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
     slugInput.value=candidate||'series-'+Date.now().toString(36);
   });
 }
 popup(editing?'编辑系列':'新建系列',[
   lang,titleInput,slug,
   line('简介','description',item?.description||'','textarea'),
   line('封面图片地址（选填）','art',item?.art||''),
   chooser('封面配色','theme',[['sage','柔和绿'],['stone','宣纸灰'],['copper','朱红'],['ink','墨色'],['blue','蓝色']],item?.theme||'sage'),
   chooser('内容类型','category',[['essay','政论与随笔'],['fiction','小说'],['poetry','诗歌'],['note','笔记与杂记']],item?.category||'essay'),
   chooser('公开状态','status',[['published','公开'],['draft','草稿']],item?.status||'published'),
   line('排序（数字越小越靠前）','sort_order',String(item?.sort_order??0),'number')
 ],data=>api({op:editing?'series-update':'series-create',...data,...(editing?{slug:item.slug,language:item.language}:{})}));
}
async function deleteSeries(item){
 if(!item)return;
 if(!confirm('确定删除系列「'+item.title+'」吗？如果仍有关联书籍或文章，系统会拒绝删除。'))return;
 try{await api({op:'series-delete',language:item.language,slug:item.slug});await reload();}
 catch(e){alert(e.message);}
}
function bookEditor(book=null,defaultLang='zh',defaultSlug=''){
 const lang=chooser('所属站点','language',[['zh','中文站'],['en','英文站']],book?.language||defaultLang);
 if(book)lang.querySelector('select').disabled=true;
 const seriesSelect=chooser('所属系列','series_slug',[],'');
 function refill(){
  const l=lang.querySelector('select').value,sel=seriesSelect.querySelector('select');
  sel.replaceChildren();
  const available=series.filter(x=>x.language===l);
  const selected=book?.series_slug??defaultSlug;
  for(const [id,t] of [['','独立书籍'],...available.map(x=>[x.slug,x.title])]){
    const option=document.createElement('option');option.value=id;option.textContent=t;sel.append(option);
  }
  if(selected&&!available.some(x=>x.slug===selected)){
    const option=document.createElement('option');option.value=selected;option.textContent=selected+'（原有系列）';sel.append(option);
  }
  sel.value=selected;
 }
 lang.querySelector('select').addEventListener('change',()=>{if(!book)defaultSlug='';refill();});
 popup(book?'编辑书籍':'新建书籍',[lang,seriesSelect,line('书名','title',book?.title),line('书籍简介','description',book?.description,'textarea'),line('封面地址','cover_url',book?.cover_url),
 chooser('公开状态','status',[['draft','草稿'],['published','公开']],book?.status||'draft'),line('排序','sort_order',String(book?.sort_order||0),'number')],
 data=>api({op:book?'book-update':'book-create',...data,...(book?{id:book.id,language:book.language}:{})}));
 refill();
}
function chapterEditor(book,chapter=null){
 popup(chapter?'编辑章节':'新建章节',[line('章名','title',chapter?.title),line('章节简介','description',chapter?.description,'textarea'),
 chooser('公开状态','status',[['draft','草稿'],['published','公开']],chapter?.status||'draft'),line('排序','sort_order',String(chapter?.sort_order||0),'number')],
 data=>api({op:chapter?'chapter-update':'chapter-create',...data,...(chapter?{id:chapter.id}:{book_id:book.id})}));
}
function linkEditor(chapter){
 const book=books.find(b=>b.id===chapter.book_id);
 const list=posts.filter(p=>p.language===book.language);
 if(!list.length){alert('还没有可关联的文章。可以点击“＋节”新建。');return;}
 popup('将已有文章作为本章的一节',[
 chooser('选择文章','post_id',list.map(p=>[p.id,p.title])),
 line('排序','sort_order','0','number')
 ],data=>api({op:'section-link',chapter_id:chapter.id,...data}));
}
function createSection(chapter){
 const book=books.find(b=>b.id===chapter.book_id);
 if(!window.TRNDesk?.newPost(book.language))return;
 pending=chapter.id;
 const info=$('#editor-message');if(info)info.textContent='正在创建「'+chapter.title+'」下的新节，保存文章后将自动归入此章。';
}
tree.addEventListener('click',async e=>{
 const b=e.target.closest('button[data-action]');if(!b)return;
 const id=b.dataset.id,a=b.dataset.action;
 const book=books.find(x=>x.id===id),chapter=chapters.find(x=>x.id===id);
 const seriesKey=(id||'').split('::'),seriesItem=series.find(x=>x.language===seriesKey[0]&&x.slug===seriesKey.slice(1).join('::'));
 if(a==='series-edit')seriesEditor(seriesItem);
 else if(a==='series-delete')deleteSeries(seriesItem);
 else if(a==='book-in-series'&&seriesItem)bookEditor(null,seriesItem.language,seriesItem.slug);
 else if(a==='book-edit')bookEditor(book);
 else if(a==='chapter-new')chapterEditor(book);
 else if(a==='chapter-edit')chapterEditor(books.find(x=>x.id===chapter.book_id),chapter);
 else if(a==='section-new')createSection(chapter);
 else if(a==='section-link')linkEditor(chapter);
 else if(a==='section-open')window.TRNDesk?.edit(id);
 else if(a==='section-unlink'&&confirm('把这一节移出章节目录吗？文章本身会保留。')){
  try{await api({op:'section-unlink',post_id:id});await reload();}catch(err){alert(err.message);}
 }
});
const seriesInput=document.querySelector('#editor [name="collection_slugs"]');
const articleSeriesAdd=document.createElement('select');
articleSeriesAdd.id='hier-article-series-add';
articleSeriesAdd.setAttribute('aria-label','添加所属系列');
if(seriesInput){
  seriesInput.after(articleSeriesAdd);
  const caption=document.createElement('small');caption.className='hier-series-caption';
  caption.textContent='可从已有系列中选择，也可手动输入多个系列标识。';
  articleSeriesAdd.after(caption);
  articleSeriesAdd.addEventListener('change',()=>{
    const slug=articleSeriesAdd.value;
    if(!slug)return;
    const existing=seriesInput.value.split(',').map(v=>v.trim()).filter(Boolean);
    if(!existing.includes(slug)){
      existing.push(slug);
      seriesInput.value=existing.join(', ');
      seriesInput.dispatchEvent(new Event('input',{bubbles:true}));
    }
    articleSeriesAdd.value='';
  });
  document.querySelector('#editor [name="language"]')?.addEventListener('change',updateArticleSeriesOptions);
}
function updateArticleSeriesOptions(){
  if(!seriesInput)return;
  const l=document.querySelector('#editor [name="language"]')?.value||'zh';
  const opts=series.filter(x=>x.language===l);
  articleSeriesAdd.replaceChildren();
  const def=document.createElement('option');def.value='';def.textContent='＋ 选择一个所属系列';articleSeriesAdd.append(def);
  for(const item of opts){
    const option=document.createElement('option');option.value=item.slug;option.textContent=item.title+(item.status==='draft'?'（草稿）':'');articleSeriesAdd.append(option);
  }
}
$('#hier-init-series').addEventListener('click',ensureSeriesReady);
$('#hier-create-series').addEventListener('click',()=>seriesEditor());
$('#hier-create-book').addEventListener('click',()=>bookEditor());
$('#hier-refresh').addEventListener('click',reload);
tabs.addEventListener('click',e=>{
 const b=e.target.closest('button[data-tab]');if(!b)return;
 active=b.dataset.tab==='hier';
 tabs.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));
 toolbar.hidden=!active;tree.hidden=!active;standalone.hidden=active;
 if(active)reload();
});
window.TRNHierarchy={
 onPostsLoaded(value){posts=value||[];if(active)reload();},
 clearPending(){pending=null;},
 async onPostSaved(id){
  if(!pending)return;
  const chapterId=pending;pending=null;
  try{await api({op:'section-link',post_id:id,chapter_id:chapterId,sort_order:0});if(active)await reload();}
  catch(e){alert('正文已保存，但自动关联章节失败：'+e.message);}
 }
};
})();
