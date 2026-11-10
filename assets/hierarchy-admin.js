(() => {
'use strict';
const $=s=>document.querySelector(s);
const sidebar=$('.draft-list');
if(!sidebar)return;
let books=[],chapters=[],links=[],posts=[],enabled=false,active=false,pending=null;
const tabs=document.createElement('div');
tabs.className='hier-tabs';
tabs.innerHTML='<button class="active" type="button" data-tab="posts">单篇文章</button><button type="button" data-tab="hier">系列书架</button>';
const toolbar=document.createElement('div');
toolbar.className='hier-toolbar';
toolbar.innerHTML='<button type="button" id="hier-create-book">＋ 新建书籍</button><button type="button" id="hier-refresh">刷新</button>';
toolbar.hidden=true;
const tree=document.createElement('div');tree.className='hier-tree';tree.hidden=true;
sidebar.querySelector('.draft-top').after(tabs,toolbar);
sidebar.append(tree);
const standalone=$('#post-admin-list');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nameFor=(lang,slug)=>!slug?'独立书籍':(window.TRN?.collections?.[lang]||[]).find(x=>x.slug===slug)?.title||slug;
const lableLang=lang=>lang==='zh'?'中文站':'英文站';
const order=(a,b)=>a.sort_order-b.sort_order;
const action=(a,id,t)=>'<button type="button" data-action="'+a+'" data-id="'+esc(id)+'">'+t+'</button>';
async function api(body){const api=window.TRNDesk;if(!api)throw Error('后台尚未准备好。');return api.request('/api/admin/hierarchy',body?{method:'POST',body:JSON.stringify(body)}:{});}
async function reload(){
  if(!window.TRNDesk)return;
  tree.textContent='正在读取目录……';
  try{
    const data=await api();
    enabled=!!data.enabled;books=data.books||[];chapters=data.chapters||[];links=data.links||[];
    draw();
  }catch(e){tree.textContent='读取失败：'+e.message;}
}
function draw(){
  if(!enabled){
    tree.innerHTML='<p class="hier-help">数据库尚未运行新版结构升级。单篇文章编辑不受影响。</p><a class="hier-help" target="_blank" rel="noopener" href="https://github.com/ssimonz-sys/tomato-ricenoodles/blob/main/migrations/2026-11-09-hierarchy.sql">查看升级 SQL</a>';
    $('#hier-create-book').disabled=true;return;
  }
  $('#hier-create-book').disabled=false;
  const out=[];
  for(const lang of ['zh','en']){
    out.push('<div class="hier-lang">'+lableLang(lang)+'</div>');
    const own=books.filter(b=>b.language===lang).sort(order);
    if(!own.length)out.push('<p class="hier-help">尚无书籍</p>');
    const series=[...new Set(own.map(b=>b.series_slug||''))];
    for(const slug of series){
      out.push('<div class="hier-series">'+esc(nameFor(lang,slug))+'</div>');
      for(const book of own.filter(b=>(b.series_slug||'')===slug)){
        out.push('<div class="hier-item"><strong>书 · '+esc(book.title)+'</strong><small>'+ (book.status==='published'?'公开':'草稿') +'</small><span>'+action('chapter-new',book.id,'＋章')+action('book-edit',book.id,'编辑')+'</span></div>');
        const chs=chapters.filter(c=>c.book_id===book.id).sort(order);
        for(const ch of chs){
          out.push('<div class="hier-item sub"><strong>章 · '+esc(ch.title)+'</strong><small>'+(ch.status==='published'?'公开':'草稿')+'</small><span>'+action('section-new',ch.id,'＋节')+action('section-link',ch.id,'关联')+action('chapter-edit',ch.id,'编辑')+'</span></div>');
          for(const l of links.filter(link=>link.chapter_id===ch.id).sort(order)){
            const p=posts.find(x=>x.id===l.post_id);if(!p)continue;
            out.push('<div class="hier-item deep"><strong>节 · '+esc(p.title)+'</strong><small>'+(p.status==='published'?'公开':'草稿')+'</small><span>'+action('section-open',p.id,'写作')+action('section-unlink',p.id,'移出')+'</span></div>');
          }
        }
      }
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
function bookEditor(book=null){
 const lang=chooser('所属站点','language',[['zh','中文站'],['en','英文站']],book?.language||'zh');
 if(book)lang.querySelector('select').disabled=true;
 const series=chooser('所属系列','series_slug',[],'');
 function refill(){
  const l=lang.querySelector('select').value,sel=series.querySelector('select');
  sel.replaceChildren();
  for(const [id,t] of [['','独立书籍'],...(window.TRN?.collections?.[l]||[]).map(x=>[x.slug,x.title])]){const option=document.createElement('option');option.value=id;option.textContent=t;sel.append(option);}
  sel.value=book?.series_slug||'';
 }
 lang.querySelector('select').addEventListener('change',refill);
 popup(book?'编辑书籍':'新建书籍',[lang,series,line('书名','title',book?.title),line('书籍简介','description',book?.description,'textarea'),line('封面地址','cover_url',book?.cover_url),
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
 if(a==='book-edit')bookEditor(book);
 else if(a==='chapter-new')chapterEditor(book);
 else if(a==='chapter-edit')chapterEditor(books.find(x=>x.id===chapter.book_id),chapter);
 else if(a==='section-new')createSection(chapter);
 else if(a==='section-link')linkEditor(chapter);
 else if(a==='section-open')window.TRNDesk?.edit(id);
 else if(a==='section-unlink'&&confirm('把这一节移出章节目录吗？文章本身会保留。')){
  try{await api({op:'section-unlink',post_id:id});await reload();}catch(err){alert(err.message);}
 }
});
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
