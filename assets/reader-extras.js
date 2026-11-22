/* Bottom navigation, persistent reading tools, and accessible sharing for both editions. */
(() => {
  'use strict';
  const d=document;
  if(d.body.dataset.page!=='read')return;
  const lang=d.body.dataset.lang==='zh'?'zh':'en';
  const zh=lang==='zh';
  const ui=zh?{
    nav:'正文翻页',previousBook:'上一章',nextBook:'下一章',previousPost:'上一篇',nextPost:'下一篇',
    contents:'返回目录',last:'已到末尾 · 返回目录',
    like:'点赞这篇文章',share:'分享文章',jump:'跳转评论',tools:'阅读工具',
    shareTitle:'分享这篇文章',native:'系统分享',copy:'复制链接',email:'通过邮件分享',
    copied:'文章链接已复制',copyError:'复制失败，请从地址栏复制链接',
    open:'在社交平台分享',loading:'加载中'
  }:{
    nav:'Reading navigation',previousBook:'Previous chapter',nextBook:'Next chapter',
    previousPost:'Previous article',nextPost:'Next article',contents:'Back to contents',
    last:'End of collection · Contents',like:'Like this article',share:'Share article',
    jump:'Jump to comments',tools:'Reading tools',shareTitle:'Share this article',
    native:'Share with your device',copy:'Copy link',email:'Share by email',
    copied:'Article link copied',copyError:'Unable to copy. Copy the URL from the address bar.',
    open:'Share on a platform',loading:'Loading'
  };
  let article=null,shareMenu=null,toastTimer=null;
  const urlFor=slug=>'/'+lang+'/read.html?slug='+encodeURIComponent(slug);
  const bookFor=id=>'/'+lang+'/book.html?id='+encodeURIComponent(id);
  const home='/'+lang+'/';
  const link=()=>location.origin+location.pathname+location.search;
  const sortByOrder=(a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0) ||
    String(a.created_at||a.published_at||'').localeCompare(String(b.created_at||b.published_at||'')) ||
    String(a.id||a.post_id||'').localeCompare(String(b.id||b.post_id||''));
  async function readJson(url){
    const response=await fetch(url,{headers:{Accept:'application/json'},credentials:'same-origin'});
    if(!response.ok)throw Error('HTTP '+response.status);
    return response.json();
  }
  function cell(target,heading,title,back){
    const a=d.createElement('a');
    a.className='trn-pager-link'+(back?' trn-pager-contents':'');
    a.href=target;
    const h=d.createElement('span');h.className='trn-pager-heading';h.textContent=heading;
    const t=d.createElement('small');t.textContent=title||'';
    a.append(h,t);
    return a;
  }
  async function addPager(post){
    let hierarchy=null,posts=[];
    const requests=await Promise.allSettled([
      readJson('/api/hierarchy?lang='+encodeURIComponent(lang)),
      readJson('/api/posts?lang='+encodeURIComponent(lang))
    ]);
    if(requests[0].status==='fulfilled'&&requests[0].value.enabled)hierarchy=requests[0].value;
    if(requests[1].status==='fulfilled')posts=requests[1].value.posts||[];
    let sequence=[],back=home,prevHeading=ui.previousPost,nextHeading=ui.nextPost;
    const section=(hierarchy?.sections||[]).find(s=>s.slug===post.slug);
    if(section){
      const chapter=(hierarchy.chapters||[]).find(c=>c.id===section.chapter_id);
      const book=(hierarchy.books||[]).find(b=>b.id===chapter?.book_id);
      if(book){
        back=bookFor(book.id);
        prevHeading=ui.previousBook;nextHeading=ui.nextBook;
        const chapters=hierarchy.chapters.filter(c=>c.book_id===book.id).sort(sortByOrder);
        for(const ch of chapters){
          const sections=hierarchy.sections.filter(s=>s.chapter_id===ch.id).sort(sortByOrder);
          sequence.push(...sections);
        }
      }
    }else{
      const inBooks=new Set((hierarchy?.sections||[]).map(s=>s.slug));
      sequence=posts.filter(p=>!inBooks.has(p.slug)).sort((a,b)=>
        String(a.published_at||'').localeCompare(String(b.published_at||'')) ||
        String(a.slug).localeCompare(String(b.slug)));
      if(!sequence.some(p=>p.slug===post.slug)){
        sequence=posts.sort((a,b)=>
          String(a.published_at||'').localeCompare(String(b.published_at||'')) ||
          String(a.slug).localeCompare(String(b.slug)));
      }
    }
    const ix=sequence.findIndex(p=>p.slug===post.slug);
    const prev=ix>0?sequence[ix-1]:null;
    const next=ix>=0&&ix<sequence.length-1?sequence[ix+1]:null;
    const pager=d.createElement('nav');pager.className='trn-reader-pager';
    pager.setAttribute('aria-label',ui.nav);
    pager.append(
      prev?cell(urlFor(prev.slug),'‹ '+prevHeading,prev.title):cell(back,'‹ '+ui.contents,'',true),
      next?cell(urlFor(next.slug),nextHeading+' ›',next.title):cell(back,ui.last,'',true)
    );
    const engagement=d.getElementById('trn-reader-engagement');
    const root=d.getElementById('post-detail');
    if(engagement)engagement.before(pager);
    else root?.after(pager);
    d.querySelector('.article-wrap .bottom-back')?.remove();
    d.querySelector('.article-wrap .end-mark')?.remove();
  }
  function toast(message){
    const node=d.getElementById('trn-share-toast');
    if(!node)return;
    clearTimeout(toastTimer);
    node.textContent=message;
    node.classList.add('is-visible');
    toastTimer=setTimeout(()=>node.classList.remove('is-visible'),3500);
  }
  function closeShare(){
    if(shareMenu){shareMenu.remove();shareMenu=null;}
    d.removeEventListener('pointerdown',outside);
    d.removeEventListener('keydown',escKey);
  }
  function outside(event){
    if(shareMenu&&!shareMenu.contains(event.target)&&!event.target.closest('[data-trn-share]'))closeShare();
  }
  function escKey(event){if(event.key==='Escape')closeShare();}
  async function copyUrl(){
    const value=link();
    try{
      if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(value);
      else{
        const box=d.createElement('textarea');box.value=value;box.style.position='fixed';
        box.style.opacity='0';d.body.append(box);box.focus();box.select();
        const copied=d.execCommand('copy');box.remove();
        if(!copied)throw Error('Copy unavailable');
      }
      closeShare();toast(ui.copied);
    }catch{toast(ui.copyError);}
  }
  async function nativeShare(){
    try{
      await navigator.share({title:article?.title||d.title,url:link()});
      closeShare();
    }catch(e){if(e.name!=='AbortError')toast(ui.copyError);}
  }
  function addAction(menu,tag,title,callback,href){
    const node=d.createElement(tag);
    node.className='trn-share-option';
    node.textContent=title;
    if(tag==='button'){node.type='button';node.addEventListener('click',callback);}
    else{node.href=href;node.target='_blank';node.rel='noopener noreferrer';
      node.addEventListener('click',closeShare);}
    menu.append(node);
  }
  function share(trigger){
    if(shareMenu){closeShare();return;}
    const menu=d.createElement('div');menu.className='trn-share-menu';
    menu.setAttribute('role','group');menu.setAttribute('aria-label',ui.shareTitle);
    const heading=d.createElement('strong');heading.textContent=ui.shareTitle;menu.append(heading);
    if(typeof navigator.share==='function')addAction(menu,'button',ui.native,nativeShare);
    addAction(menu,'button',ui.copy,copyUrl);
    const subject=encodeURIComponent(article?.title||d.title);
    const uri=encodeURIComponent(link());
    const email=d.createElement('a');email.className='trn-share-option';email.textContent=ui.email;
    email.href='mailto:?subject='+subject+'&body='+uri;email.addEventListener('click',closeShare);menu.append(email);
    addAction(menu,'a','X / Twitter',null,'https://twitter.com/intent/tweet?text='+subject+'&url='+uri);
    addAction(menu,'a','Bluesky',null,'https://bsky.app/intent/compose?text='+encodeURIComponent((article?.title||d.title)+' '+link()));
    d.body.append(menu);shareMenu=menu;
    const rect=(trigger||d.getElementById('trn-floating-share')||d.body).getBoundingClientRect();
    const menuWidth=menu.getBoundingClientRect().width,menuHeight=menu.getBoundingClientRect().height;
    const left=Math.min(window.innerWidth-menuWidth-12,Math.max(12,rect.left-menuWidth-12));
    const top=rect.bottom+menuHeight+12<window.innerHeight?rect.bottom+8:Math.max(12,rect.top-menuHeight-8);
    menu.style.left=Math.max(12,left)+'px';menu.style.top=top+'px';
    d.addEventListener('pointerdown',outside);
    d.addEventListener('keydown',escKey);
  }
  function addFloating(){
    if(d.getElementById('trn-floating-tools'))return;
    const dock=d.createElement('aside');dock.className='trn-floating-tools';
    dock.id='trn-floating-tools';dock.setAttribute('aria-label',ui.tools);
    dock.innerHTML='<button type="button" id="trn-floating-like" aria-pressed="false" title="'+ui.like+'"><span class="trn-float-heart" aria-hidden="true">♡</span><small id="trn-floating-count">0</small></button>'+
      '<button type="button" data-trn-share id="trn-floating-share" title="'+ui.share+'" aria-label="'+ui.share+'">↗</button>'+
      '<button type="button" id="trn-floating-comments" title="'+ui.jump+'" aria-label="'+ui.jump+'">☷</button>'+
      '<span class="trn-float-caption">'+ui.tools+'</span>';
    d.body.append(dock);
    const note=d.createElement('div');note.id='trn-share-toast';note.className='trn-share-toast';note.setAttribute('role','status');note.setAttribute('aria-live','polite');d.body.append(note);
    const mainLike=d.getElementById('trn-like');
    const mainCount=d.getElementById('trn-count-likes');
    const floatLike=d.getElementById('trn-floating-like');
    const sync=()=>{
      floatLike.disabled=Boolean(mainLike?.disabled);
      const liked=mainLike?.getAttribute('aria-pressed')==='true';
      floatLike.setAttribute('aria-pressed',String(liked));
      floatLike.querySelector('.trn-float-heart').textContent=liked?'♥':'♡';
      d.getElementById('trn-floating-count').textContent=mainCount?.textContent||'0';
    };
    if(mainLike)new MutationObserver(sync).observe(mainLike,{attributes:true,childList:true,subtree:true});
    if(mainCount)new MutationObserver(sync).observe(mainCount,{childList:true,characterData:true,subtree:true});
    sync();
    floatLike.addEventListener('click',()=>{if(!floatLike.disabled)mainLike?.click();});
    d.getElementById('trn-floating-share').addEventListener('click',e=>share(e.currentTarget));
    d.getElementById('trn-floating-comments').addEventListener('click',()=>
      d.querySelector('.trn-comments')?.scrollIntoView({behavior:'smooth',block:'start'}));
  }
  function mount(post){
    if(!post?.slug||article)return;
    article=post;addFloating();
    addPager(post).catch(e=>console.warn('Reader navigation unavailable:',e));
  }
  window.TRNReaderExtras={mount,share};
})();