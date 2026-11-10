/* Reader-side navigation for series, books, chapters and sections. */
(() => {
'use strict';
const d=document, lang=d.body.dataset.lang==='zh'?'zh':'en', zh=lang==='zh';
const page=d.body.dataset.page;
const $=s=>d.querySelector(s);
const q=new URLSearchParams(location.search);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const route=s=>'/'+lang+'/'+s;
const bookUrl=id=>route('book.html?id='+encodeURIComponent(id));
const chapterUrl=id=>route('chapter.html?id='+encodeURIComponent(id));
const postUrl=slug=>route('read.html?slug='+encodeURIComponent(slug));
const seriesUrl=slug=>route('collections.html?slug='+encodeURIComponent(slug));
let content=null;
const bookBy=id=>content.books.find(b=>b.id===id);
const chapterBy=id=>content.chapters.find(c=>c.id===id);
const sectionFor=id=>content.sections.filter(s=>s.chapter_id===id).sort((a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||''))||String(a.post_id).localeCompare(String(b.post_id)));
const seriesFor=slug=>(content?.series||window.TRN?.collections?.[lang]||[]).find(c=>c.slug===slug);
function title(t,defaultText){d.title=(t||defaultText)+' | '+(zh?'番茄米线':'Tomato Ricenoodles');}
function breadcrumb(links){
 return '<nav class="hier-breadcrumb" aria-label="'+(zh?'路径导航':'Breadcrumbs')+'">'+links.map(([name,url])=>url?'<a href="'+esc(url)+'">'+esc(name)+'</a>':'<span>'+esc(name)+'</span>').join('<span class="hier-sep">›</span>')+'</nav>';
}
function sectionItem(s,n){
 return '<a class="hier-section-row" href="'+postUrl(s.slug)+'"><span class="hier-section-number">'+String(n).padStart(2,'0')+'</span><span><strong>'+esc(s.title)+'</strong><small>'+esc(s.excerpt||'')+'</small></span><span aria-hidden="true">↗</span></a>';
}
function bookCard(b){
 const chapterCount=content.chapters.filter(ch=>ch.book_id===b.id).length;
 const art=seriesFor(b.series_slug)?.art;
 const cover=/^\/assets\/(?:graphics|covers)\/[a-zA-Z0-9_./-]+\.(svg|png|jpe?g|webp|gif)$/i.test(b.cover_url||'')||/^\/media\/covers\/[0-9a-f-]{36}\.(jpg|png|webp|gif)$/i.test(b.cover_url||'')||/^https:\/\/[^\s<>"']+$/i.test(b.cover_url||'')?b.cover_url:art||'/assets/graphics/'+(zh?'zh-basic-humanities.svg':'en-basic-human-science.svg');
 return '<a class="hier-book-card" href="'+bookUrl(b.id)+'"><img src="'+esc(cover)+'" alt="" loading="lazy"><span><strong>'+esc(b.title)+'</strong><small>'+esc(b.description||'')+'</small><em>'+chapterCount+' '+(zh?'章':'chapters')+' ↗</em></span></a>';
}
function showBook(){
 const root=$('#hier-public-root'), book=bookBy(q.get('id'));
 if(!root)return;
 if(!content.enabled){root.textContent=zh?'书籍目录尚未启用。':'Books are not enabled yet.';return;}
 if(!book){root.textContent=zh?'找不到这本书，或书籍尚未公开。':'Book not found or not published.';return;}
 title(book.title);
 const series=seriesFor(book.series_slug);
 const trail=[[zh?'系列文集':'Collections',route('collections.html')]];
 if(series)trail.push([series.title,seriesUrl(series.slug)]);
 trail.push([book.title,null]);
 const chapters=content.chapters.filter(ch=>ch.book_id===book.id);
 root.innerHTML=breadcrumb(trail)+'<div class="hier-hero"><div class="hier-eyebrow">'+(zh?'书籍':'THE BOOK')+'</div><h1>'+esc(book.title)+'</h1><p>'+esc(book.description||'')+'</p></div><div class="hier-section-heading"><h2>'+(zh?'全书目录':'Contents')+'</h2><span>'+chapters.length+' '+(zh?'章':'chapters')+'</span></div><div id="hier-chapter-list">'+(chapters.length?chapters.map((ch,i)=>'<section class="hier-chapter-block"><div class="hier-chapter-heading"><a href="'+chapterUrl(ch.id)+'"><small>'+(zh?'第 '+(i+1)+' 章':'CHAPTER '+(i+1))+'</small><h3>'+esc(ch.title)+'</h3><p>'+esc(ch.description||'')+'</p></a></div><div>'+sectionFor(ch.id).map(sectionItem).join('')+'</div></section>').join(''):'<p class="hier-empty">'+(zh?'本书尚未公开章节。':'No published chapters yet.')+'</p>')+'</div>';
}
function showChapter(){
 const root=$('#hier-public-root'),ch=chapterBy(q.get('id'));
 if(!root)return;
 if(!ch){root.textContent=zh?'章节不存在，或尚未公开。':'Chapter not found or unpublished.';return;}
 const book=bookBy(ch.book_id);
 if(!book){root.textContent=zh?'书籍尚未公开。':'The book is not published.';return;}
 title(ch.title);
 const secs=sectionFor(ch.id);
 const serie=seriesFor(book.series_slug);
 const trail=[[zh?'系列文集':'Collections',route('collections.html')]];
 if(serie)trail.push([serie.title,seriesUrl(serie.slug)]);
 trail.push([book.title,bookUrl(book.id)],[ch.title,null]);
 root.innerHTML=breadcrumb(trail)+'<div class="hier-hero"><div class="hier-eyebrow">'+(zh?'章节目录':'CHAPTER')+'</div><h1>'+esc(ch.title)+'</h1><p>'+esc(ch.description||'')+'</p></div><div class="hier-section-heading"><h2>'+(zh?'本章节':'Sections')+'</h2><span>'+secs.length+' '+(zh?'节':'sections')+'</span></div><div>'+ (secs.length?secs.map(sectionItem).join(''):'<p class="hier-empty">'+(zh?'还没有公开的小节。':'No published sections yet.')+'</p>')+'</div>';
}
function decorateCollections(){
 const slug=q.get('slug'),root=$('#collection-page');
 if(!root||!content.enabled)return;
 function attach(){
   if(slug){
     const landing=root.querySelector('.collection-landing-header');
     if(!landing||root.querySelector('.hier-series-books'))return;
     const set=content.books.filter(b=>b.series_slug===slug);
     if(!set.length)return;
     const area=d.createElement('section');area.className='hier-series-books';
     area.innerHTML='<div class="hier-section-heading"><h2>'+(zh?'系列书籍':'Books in this series')+'</h2><span>'+set.length+'</span></div><div class="hier-book-list">'+set.map(bookCard).join('')+'</div>';
     landing.after(area);
   }else{
     const directory=root.querySelector('#collection-directory');
     if(!directory||root.querySelector('.hier-standalone-books'))return;
     const set=content.books.filter(b=>!b.series_slug);
     if(!set.length)return;
     const area=d.createElement('section');area.className='hier-standalone-books';
     area.innerHTML='<div class="hier-section-heading"><h2>'+(zh?'独立书籍':'Standalone Books')+'</h2></div><div class="hier-book-list">'+set.map(bookCard).join('')+'</div>';
     directory.after(area);
   }
 }
 const observer=new MutationObserver(attach);
 observer.observe(root,{childList:true,subtree:true});
 attach();
}
function decorateSection(){
 const slug=q.get('slug');
 if(!slug)return;
 const section=content.sections.find(s=>s.slug===slug);
 if(!section)return;
 const chapter=chapterBy(section.chapter_id),book=chapter?bookBy(chapter.book_id):null;
 if(!chapter||!book)return;
 const trail=[[book.title,bookUrl(book.id)],[chapter.title,chapterUrl(chapter.id)],[section.title,null]];
 const nav=d.createElement('div');nav.className='hier-read-nav';
 const siblings=sectionFor(chapter.id);
 const ix=siblings.findIndex(s=>s.post_id===section.post_id);
 const previous=siblings[ix-1],next=siblings[ix+1];
 nav.innerHTML=breadcrumb(trail)+'<div class="hier-read-neighbors">'+(previous?'<a href="'+postUrl(previous.slug)+'">← '+esc(previous.title)+'</a>':'<span></span>')+(next?'<a href="'+postUrl(next.slug)+'">'+esc(next.title)+' →</a>':'<span></span>')+'</div>';
 const tools=$('.article-wrap .read-tools');
 if(tools)tools.after(nav);
 const bottom=$('.bottom-back');
 if(bottom){bottom.href=bookUrl(book.id);bottom.textContent=zh?'← 返回全书目录':'← Back to book contents';}
}
(async()=>{
 if(!['book','chapter','collections','read'].includes(page))return;
 try{
  const resp=await fetch('/api/hierarchy?lang='+lang,{headers:{Accept:'application/json'}});
  if(!resp.ok)throw Error('HTTP '+resp.status);
  content=await resp.json();
  if(page==='book')showBook();
  else if(page==='chapter')showChapter();
  else if(page==='collections')decorateCollections();
  else if(page==='read')decorateSection();
 }catch(e){
  const root=$('#hier-public-root');
  if(root)root.textContent=zh?'目录暂时无法加载。':'Unable to load the contents.';
 }
})();
})();
