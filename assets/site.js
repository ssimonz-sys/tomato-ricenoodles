(() => {
  'use strict';
  const d=document, body=d.body, lang=body.dataset.lang==='zh'?'zh':'en', zh=lang==='zh';
  const page=body.dataset.page, root=`/${lang}/`, cfg=window.TRN||{penName:'Tomato Ricenoodles',penNameZh:'番茄米线',links:{},collections:{en:[],zh:[]}};
  const qs=new URLSearchParams(location.search), demo=qs.get('demo')==='1', sampleSuffix=demo?'?demo=1':'';
  const collections=[...(cfg.collections?.[lang]||[])];
  const $=s=>d.querySelector(s), escape=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const u=zh?{
    home:'首页',essay:'政论与随笔',fiction:'小说',poetry:'诗歌',note:'杂记',collections:'专题文集',about:'关于作者',all:'全部',reading:'分钟阅读',empty:'作品正在整理，文章发表后会出现在这里。',error:'暂时无法加载文章。',demo:'设计预览 · 以下文章是版式占位示例',count:n=>`共 ${n} 篇`,type:{essay:'政论随笔',fiction:'小说',poetry:'诗歌',note:'杂记'},noCollection:'这个专题还没有发布的文章。',back:'返回目录',night:'切换深色模式'
  }:{
    home:'Home',essay:'Essays',fiction:'Fiction',poetry:'Poetry',note:'Notes',collections:'Collections',about:'About',all:'All writing',reading:'min read',empty:'The shelf is ready. Published writing will appear here.',error:'The archive is temporarily unavailable.',demo:'DESIGN PREVIEW · SAMPLE ARTICLE TITLES',count:n=>`${n} piece${n===1?'':'s'}`,type:{essay:'Essay',fiction:'Fiction',poetry:'Poetry',note:'Note'},noCollection:'No published writing in this collection yet.',back:'Back to the archive',night:'Toggle dark mode'
  };
  const route=(file)=>root+file+(demo?(file.includes('?')?'&':'?')+'demo=1':'');
  const colRoute=(slug)=>route(`collections.html?slug=${encodeURIComponent(slug)}`);
  const artUrl=c=>/^(?:https:\/\/[^\s<>"']+|\/assets\/(?:graphics|covers)\/[a-zA-Z0-9_./-]+\.(?:svg|png|jpe?g|webp|gif)|\/media\/covers\/[0-9a-f-]{36}\.(?:jpg|png|webp|gif))$/i.test(c.art||'')?c.art:'';
  const postRoute=p=>route(`read.html?slug=${encodeURIComponent(p.slug)}`);
  const themeKey=`trn-theme-${lang}`;
  try{if(localStorage.getItem(themeKey)==='dark')d.documentElement.dataset.theme='dark';}catch{}
  const header=$('#site-header');
  if(header){
    const nav=[[u.essay,'essay'],[u.fiction,'fiction'],[u.poetry,'poetry']].map(([label,type])=>`<a href="${route(`index.html?type=${type}`)}">${label}</a>`).join('');
    header.innerHTML=`<div class="topline">${zh?'番茄米线 · 独立写作与个人文集':'TOMATO RICENOODLES · AN INDEPENDENT WRITING ARCHIVE'}</div><header class="site-header ${zh?'zh-header':''}"><div class="nav-inner wrapper"><a class="brand" href="${route('')}" aria-label="${u.home}"><span class="brand-symbol">${zh?'番':'✳'}</span><span class="brand-text"><strong>${zh?'番茄米线':'Tomato Ricenoodles'}</strong><small>${zh?'TOMATO RICENOODLES':'ESSAYS · FICTION · POETRY'}</small></span></a><nav class="nav-links" aria-label="${zh?'主导航':'Main navigation'}"><a href="${route('')}" class="${page==='home'?'current':''}">${u.home}</a>${nav}<a href="${route('collections.html')}" class="${page==='collections'?'current':''}">${u.collections}</a><a href="${route('about.html')}" class="${page==='about'?'current':''}">${u.about}</a></nav><div class="nav-right">${page==='home'?`<a class="switch-site" href="/${zh?'en':'zh'}/${demo?'?demo=1':''}" lang="${zh?'en':'zh'}">${zh?'ENGLISH SITE ↗':'中文站 ↗'}</a>`:''}<button id="theme-toggle" style="border:0;background:transparent;color:var(--muted);font-size:20px" type="button" aria-label="${u.night}" title="${u.night}">◐</button></div></div></header>`;
    $('#theme-toggle')?.addEventListener('click',()=>{const dark=d.documentElement.dataset.theme!=='dark';if(dark)d.documentElement.dataset.theme='dark';else d.documentElement.removeAttribute('data-theme');try{localStorage.setItem(themeKey,dark?'dark':'light');}catch{}});
  }
  const footer=$('#site-footer');
  if(footer)footer.innerHTML=`<footer class="site-footer"><div class="footer-inner wrapper"><div><strong>${zh?'番茄米线':'Tomato Ricenoodles'}</strong><p>© ${new Date().getFullYear()} · ${zh?'文字自有其去处。':'An independent home for words and ideas.'}</p></div><div class="footer-links"><a href="${route('about.html')}">${u.about}</a><a href="${route('collections.html')}">${u.collections}</a><a href="${route('')}">${u.home}</a></div></div></footer>`;
  function social(){const links=cfg.links?.[lang]||{};return [['Medium',links.medium],['Matters',links.matters]].filter(([,url])=>/^https:\/\//i.test(url||'')).map(([name,url])=>`<a class="social-link" target="_blank" rel="noopener noreferrer" href="${escape(url)}">${name}<span>↗</span></a>`).join('')||`<span class="social-empty">${zh?'平台主页链接配置后显示':'Medium & Matters links will appear when configured.'}</span>`;}
  ['#social-links','#about-links'].forEach(sel=>{if($(sel))$(sel).innerHTML=social();});
  const displayDate=v=>{if(!v)return '';let dt=new Date(v);return isNaN(dt.valueOf())?'':new Intl.DateTimeFormat(zh?'zh-CN':'en-CA',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(dt)};
  const previewPosts=zh?[
    {id:'sample-1',slug:'sample-chinese-essay',type:'essay',title:'这里展示政论与随笔文章标题',excerpt:'网站会按发表时间展示你的原创文章。此处只是排版示例，尚未导入真实作品。',collection_slugs:['basic-humanities'],published_at:'2026-11-01T12:00:00Z',word_count:1850,tags:['随笔']},
    {id:'sample-2',slug:'sample-chinese-fiction',type:'fiction',title:'这里展示短篇小说标题',excerpt:'小说将直接进入正文阅读，适合短篇与中篇作品，也支持独立文集。',collection_slugs:['short-fiction'],published_at:'2026-10-22T12:00:00Z',word_count:3200,tags:['短篇']},
    {id:'sample-3',slug:'sample-chinese-poetry',type:'poetry',title:'这里展示古体诗或现代诗标题',excerpt:'诗歌拥有适合分行排版的独立阅读空间。',collection_slugs:['poems'],published_at:'2026-10-14T12:00:00Z',word_count:200,tags:['诗词']}
  ]:[
    {id:'sample-1',slug:'sample-english-essay',type:'essay',title:'A Sample Heading for an Essay',excerpt:'Your published essays will appear here, with their own summaries, dates and reading time. This is a layout sample, not an imported article.',collection_slugs:['basic-human-science'],published_at:'2026-11-01T12:00:00Z',word_count:1800,tags:['Thoughts']},
    {id:'sample-2',slug:'sample-english-fiction',type:'fiction',title:'A Place for Short Stories',excerpt:'Short fiction and novellas have their own shelf, with room for quieter, more narrative work.',collection_slugs:[],published_at:'2026-10-18T12:00:00Z',word_count:2800,tags:['Fiction']},
    {id:'sample-3',slug:'sample-english-poetry',type:'poetry',title:'A Page Reserved for Poetry',excerpt:'Poems can live here without being folded into essays or longer fiction.',collection_slugs:[],published_at:'2026-10-02T12:00:00Z',word_count:160,tags:['Poetry']}
  ];
  async function getPosts(){if(demo)return previewPosts;const r=await fetch(`/api/posts?lang=${lang}`,{headers:{Accept:'application/json'}});if(!r.ok)throw Error('API '+r.status);return (await r.json()).posts||[];}
  function card(c,posts){const count=posts.filter(p=>(p.collection_slugs||[]).includes(c.slug)).length;const symbol={copper:'↗',sage:'◌',ink:'§',stone:'文',blue:'✦'}[c.theme]||'✳';const art=artUrl(c);return `<a class="collection-card" href="${colRoute(c.slug)}"><div class="cover ${escape(c.theme)} ${art?'has-art':''}">${art?`<img src="${art}" alt="" loading="lazy" decoding="async">`:''}<span class="cover-label">${zh?'专题文集':'THE COLLECTION'}</span><span class="cover-ornament" aria-hidden="true">${symbol}</span><span class="cover-mark" aria-hidden="true">${String(count).padStart(2,'0')}</span></div><div class="collection-info"><strong>${escape(c.title)}</strong><p>${escape(c.description||'')}</p><small>${count} ${zh?'篇文章':'PIECES'} &nbsp; ↗</small></div></a>`;}
  const fallbackCover={en:{essay:'/assets/graphics/en-basic-human-science.svg',fiction:'/assets/graphics/en-organziology.svg',poetry:'/assets/graphics/en-on-ethics.svg',note:'/assets/graphics/en-hero.svg'},zh:{essay:'/assets/graphics/zh-basic-humanities.svg',fiction:'/assets/graphics/zh-short-fiction.svg',poetry:'/assets/graphics/zh-poems.svg',note:'/assets/graphics/zh-on-morality.svg'}};
  function coverFor(p){const url=p.cover_url||'';return /^(?:https:\/\/[^\s<>"']+|\/assets\/(?:graphics|covers)\/[a-zA-Z0-9_./-]+\.(?:svg|png|jpe?g|webp|gif)|\/media\/covers\/[0-9a-f-]{36}\.(?:jpg|png|webp|gif))$/i.test(url)?url:fallbackCover[lang][p.type]||fallbackCover[lang].essay;}
  function listing(p){const minutes=Math.max(1,Math.ceil(Number(p.word_count||1)/(zh?360:230)));return `<a class="post-card has-thumb" href="${postRoute(p)}"><div class="post-copy"><div class="post-meta"><span>${escape(u.type[p.type]||p.type)}</span><span>${escape(displayDate(p.published_at))}</span><span>${minutes} ${u.reading}</span><span>${zh?'阅读':'Reads'} ${Number(p.views||0).toLocaleString()}</span><span>♥ ${Number(p.likes||0).toLocaleString()}</span></div><h3>${escape(p.title)}</h3><p>${escape(p.excerpt||'')}</p><span class="post-arrow" aria-hidden="true">↗</span></div><img class="post-thumb" src="${escape(coverFor(p))}" alt="" loading="lazy" decoding="async"></a>`;}

  function previewBanner(container){if(demo){const n=d.createElement('p');n.className='eyebrow';n.style.cssText='padding:10px 0;color:var(--accent)';n.textContent=u.demo;container.parentNode.insertBefore(n,container);}}
  async function home(){let posts=[];try{posts=await getPosts();}catch{if($('#post-list'))$('#post-list').innerHTML=`<div class="empty-state">${u.error}</div>`;}
    const cols=$('#featured-collections');if(cols)cols.innerHTML=collections.slice(0,3).map(c=>card(c,posts)).join('');
    const list=$('#post-list');if(!list)return;
    const btns=Array.from(d.querySelectorAll('[data-filter]'));const search=$('#search-writing');let current=qs.get('type')||'all';if(!['essay','fiction','poetry','note'].includes(current))current='all';
    const refresh=()=>{btns.forEach(b=>{b.classList.toggle('active',b.dataset.filter===current);b.setAttribute('aria-pressed',String(b.dataset.filter===current));});const q=(search?.value||'').trim().toLocaleLowerCase();const visible=posts.filter(p=>(current==='all'||p.type===current)&&(!q||`${p.title} ${p.excerpt} ${(p.tags||[]).join(' ')}`.toLocaleLowerCase().includes(q)));list.innerHTML=visible.length?visible.map(listing).join(''):`<div class="empty-state">${u.empty}</div>`;if($('#list-count'))$('#list-count').textContent=u.count(visible.length);};
    btns.forEach(b=>b.addEventListener('click',()=>{current=b.dataset.filter;refresh();}));search?.addEventListener('input',refresh);refresh();previewBanner(list);
    if(qs.get('type'))setTimeout(()=>$('#writing')?.scrollIntoView({block:'start'}),20);
  }
  async function collectionPage(){let posts=[];try{posts=await getPosts();}catch{}const slug=qs.get('slug'),detail=slug?collections.find(c=>c.slug===slug):null;
    if(!detail){const dir=$('#collection-directory');if(dir)dir.innerHTML=collections.map(c=>card(c,posts)).join('');return;}
    const rootNode=$('#collection-page');if(!rootNode)return;d.title=`${detail.title} | ${zh?'番茄米线':'Tomato Ricenoodles'}`;
    const own=posts.filter(p=>(p.collection_slugs||[]).includes(slug));
    rootNode.innerHTML=`<section class="collection-landing wrapper"><div class="collection-landing-header"><div class="cover ${escape(detail.theme)} ${artUrl(detail)?'has-art':''}">${artUrl(detail)?`<img src="${artUrl(detail)}" alt="" decoding="async">`:''}<span class="cover-label">${zh?'专题文集':'COLLECTION'}</span><span class="cover-ornament">✳</span></div><div><a href="${route('collections.html')}" class="back-link">← ${u.collections}</a><h1>${escape(detail.title)}</h1><p>${escape(detail.description)}</p><span class="eyebrow">${u.count(own.length)}</span></div></div><div class="section-rule"><h2>${zh?'文集目录':'Inside this collection'}</h2></div><div class="post-list">${own.length?own.map(listing).join(''):`<div class="empty-state">${u.noCollection}</div>`}</div></section>`;
  }
  function safeMarkdown(raw){if(window.marked&&window.DOMPurify){const html=window.TRNReadingLayout?.render(raw||'',window.marked,window.DOMPurify)??window.DOMPurify.sanitize(window.marked.parse(raw||'',{gfm:true,breaks:true}),{USE_PROFILES:{html:true}});const temp=d.createElement('div');temp.innerHTML=html;temp.querySelectorAll('a').forEach(a=>{const href=a.getAttribute('href')||'';if(!/^https?:\/\//i.test(href))a.removeAttribute('href');else{a.target='_blank';a.rel='noopener noreferrer';}});return temp.innerHTML;}
    return String(raw||'').split(/\n\s*\n/).map(par=>`<p>${escape(par).replace(/\n/g,'<br>')}</p>`).join('');}
  async function readPage(){const slot=$('#post-detail');if(!slot)return;const slug=qs.get('slug');if(!slug){slot.innerHTML=`<div class="empty-state">${u.empty}</div>`;return;}let p;
    try{if(demo)p=previewPosts.find(item=>item.slug===slug);else{const resp=await fetch(`/api/posts/${encodeURIComponent(slug)}?lang=${lang}`);if(!resp.ok)throw Error('Article unavailable');p=(await resp.json()).post;}}catch{slot.innerHTML=`<div class="empty-state">${u.error}</div>`;return;}
    if(!p){slot.innerHTML=`<div class="empty-state">${u.empty}</div>`;return;}d.title=`${p.title} | ${zh?'番茄米线':'Tomato Ricenoodles'}`;const raw=demo?(zh?'（设计预览）\n\n这里是未来文章的阅读区域。发布真实文章后会显示你的正文。\n\n## 让文字拥有自己的空间\n\n文章按照原文呈现，不进行自动翻译。':'(Design preview)\n\nThis is a placeholder for your article’s body. Your published writing will replace this sample content.\n\n## A space of its own\n\nEach edition is independently written and curated.'):p.body;
    slot.innerHTML=`<header class="article-header">${demo?`<p class="eyebrow">${u.demo}</p>`:''}<p class="eyebrow">${escape(u.type[p.type]||p.type)}</p><h1>${escape(p.title)}</h1><p class="dek">${escape(p.excerpt||'')}</p><div class="post-meta"><span>${escape(displayDate(p.published_at))}</span><span>${zh?'番茄米线':'Tomato Ricenoodles'}</span></div></header>${p.cover_url?`<figure class="reader-cover"><img src="${escape(coverFor(p))}" alt=""></figure>`:''}<div class="article-body" id="reader-body">${safeMarkdown(raw)}</div>`;
    // Derive an independent, accessible six-level outline from the rendered article headings.
    // Keeping the text of each heading preserves the author's own Chinese numbering.
    const readerBody=$('#reader-body');
    const headings=[...readerBody.querySelectorAll('h1,h2,h3,h4,h5,h6')];
    if(headings.length>=2){
      const toc=d.createElement('details');toc.className='reader-toc';toc.open=headings.length<=18;
      const summary=d.createElement('summary');
      const headingTitle=d.createElement('span');headingTitle.textContent=zh?'本文目录':'Contents';
      const count=d.createElement('span');count.className='reader-toc-subtitle';count.textContent=zh?headings.length+' 节':headings.length+' sections';
      summary.append(headingTitle,count);toc.append(summary);
      const links=d.createElement('nav');links.className='reader-toc-links';
      links.setAttribute('aria-label',zh?'文章章节目录':'Article table of contents');
      const minLevel=Math.min(...headings.map(h=>Number(h.tagName.slice(1))));
      headings.forEach((heading,i)=>{
        const id='trn-section-'+(i+1);heading.id=id;
        const link=d.createElement('a');link.href='#'+id;link.textContent=heading.textContent.trim();
        link.style.setProperty('--depth',String(Number(heading.tagName.slice(1))-minLevel));
        links.append(link);
      });
      toc.append(links);readerBody.before(toc);
    }
    if(!demo)window.TRNReaderEngagement?.mount(p);
    let size=Number.parseInt(localStorage.getItem('trn-size-'+lang)||'18',10);if(!Number.isFinite(size)||size<14||size>28)size=18;
    const apply=()=>d.documentElement.style.setProperty('--read-size',size+'px');apply();$('#font-less')?.addEventListener('click',()=>{size=Math.max(14,size-1);apply();localStorage.setItem('trn-size-'+lang,size);});$('#font-more')?.addEventListener('click',()=>{size=Math.min(28,size+1);apply();localStorage.setItem('trn-size-'+lang,size);});
  }
  async function boot(){
    if(page==='home'||page==='collections'){
      try{
        const response=await fetch('/api/series?lang='+lang,{headers:{Accept:'application/json'}});
        if(response.ok){
          const result=await response.json();
          if(result.enabled && Array.isArray(result.series))collections.splice(0,collections.length,...result.series);
        }
      }catch(error){console.warn('Series list unavailable; using site defaults.',error);}
    }
    if(page==='home')await home();else if(page==='collections')await collectionPage();else if(page==='read')await readPage();
  }
  boot();
})();
