/* Unified article placement: standalone, directly in a series, or inside
   any book/chapter. A one-chapter book needs no special content type. */
(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function create(form,{request}){
    const root=document.createElement('section');
    root.className='studio-placement';
    root.id='studio-placement';
    root.setAttribute('aria-label','作品归属');
    root.innerHTML='<div class="studio-placement-heading"><strong>作品归属</strong><span>可以直接收进系列，也可以放入系列中的某本书</span></div>'+
      '<div class="studio-placement-fields">'+
      '<label>系列<select id="place-series" aria-label="选择所属系列"><option value="">独立文章 / 不加入系列</option></select></label>'+
      '<label>书籍<select id="place-book" aria-label="选择所属书籍"><option value="">不选择书籍</option></select></label>'+
      '<label>章节<select id="place-chapter" aria-label="选择所属章节" disabled><option value="">无需选择章节</option></select></label>'+
      '</div>'+
      '<div class="studio-placement-footer"><p id="place-hint">独立文章会直接显示在所选语言站点。</p>'+
      '<div class="studio-placement-actions"><button type="button" id="place-add-series">＋新建系列</button><button type="button" id="place-add-book">＋新建书籍</button><button type="button" id="place-refresh">↻刷新目录</button><a href="'+(window.TRNAdminSite?.manager||'/admin/manage/')+'" target="_blank" rel="noopener">完整管理</a></div></div>';
    const target=form.querySelector('#studio-publication-bar')||form.querySelector('.body-top');
    target.after(root);
    const s=root.querySelector('#place-series'),b=root.querySelector('#place-book'),c=root.querySelector('#place-chapter');
    const hint=root.querySelector('#place-hint');
    const meta={enabled:false,seriesEnabled:false,series:[],books:[],chapters:[],links:[]};
    let loaded=false;
    const language=()=>form.elements.language.value;
    const published=()=>form.elements.status.value==='published';
    const fields=(options,selected='')=>options.map(([value,title])=>'<option value="'+esc(value)+'"'+(value===selected?' selected':'')+'>'+esc(title)+'</option>').join('');
    const fallbackSeries=()=>window.TRN?.collections?.[language()]||[];
    function fillSeries(value=''){
      const catalog=meta.seriesEnabled?meta.series.filter(row=>row.language===language()):fallbackSeries();
      s.innerHTML=fields([['','独立文章 / 不加入系列'],...catalog.map(row=>[row.slug,row.title+(row.status==='draft'?'（系列草稿）':'')])],value);
      if(s.value!==value)s.value='';
    }
    function fillBook(value=''){
      const bookList=meta.books.filter(row=>row.language===language()&&(row.series_slug||'')===s.value);
      b.innerHTML=fields([['',s.value?'直接收入系列（不选书）':'独立文章（不选书）'],...bookList.map(row=>[row.id,row.title+(row.status==='draft'?'（书籍草稿）':'')])],value);
      if(b.value!==value)b.value='';
      b.disabled=!meta.enabled||!bookList.length;
      return bookList;
    }
    function fillChapter(value=''){
      const chapters=meta.chapters.filter(row=>row.book_id===b.value).sort((x,y)=>String(x.created_at||'').localeCompare(String(y.created_at||'')));
      if(!b.value){
        c.innerHTML='<option value="">独立文章不需要章节</option>';
        c.disabled=true;
      }else{
        c.innerHTML=fields([['auto','作为新章节（使用文章标题）'],...chapters.map(row=>[row.id,row.title+(row.status==='draft'?'（章节草稿）':'')])],value||'auto');
        if(c.value!==(value||'auto'))c.value='auto';
        c.disabled=false;
      }
      updateHint();
    }
    function updateHint(){
      if(b.value){
        const book=meta.books.find(row=>row.id===b.value);
        const chapter=meta.chapters.find(row=>row.id===c.value);
        const privateParents=[book,chapter,meta.series.find(row=>row.slug===s.value&&row.language===language())].filter(row=>row?.status==='draft');
        hint.textContent=published()?
          (privateParents.length?'发布时会询问是否同时公开所属的草稿书籍、章节或系列。':'发布后文章会出现在这本书中。'):
          '默认把这篇文章作为新章节加入书籍，也可以选择一个现有章节。';
      }else if(s.value){
        const serie=meta.series.find(row=>row.slug===s.value&&row.language===language());
        hint.textContent=published()&&serie?.status==='draft'?'发布时会询问是否公开这个系列。':'文章将直接收入该系列，不需要先创建书籍。';
      }else hint.textContent=published()?'文章将公开显示在'+(language()==='zh'?'中文站':'英文站')+'的文章列表。':'独立文章保存为草稿，暂不对读者显示。';
    }
    async function refresh(){
      try{
        const result=await request('/api/admin/hierarchy');
        Object.assign(meta,result);
        loaded=true;
        const sv=s.value,bv=b.value,cv=c.value;
        fillSeries(sv);fillBook(bv);fillChapter(cv);
        root.classList.remove('is-unavailable');
      }catch(e){
        hint.textContent='目录读取失败：'+e.message;
        root.classList.add('is-unavailable');
      }
    }
    function load(post,{pendingChapter=null,pendingBook=null}={}){
      const link=meta.links.find(row=>row.post_id===post?.id);
      const chapter=meta.chapters.find(row=>row.id===(pendingChapter||link?.chapter_id));
      const linkedBook=meta.books.find(row=>row.id===chapter?.book_id);
      const requestedBook=meta.books.find(row=>row.id===pendingBook&&row.language===language());
      const book=linkedBook||requestedBook;
      let series='';
      if(book&&book.language===language())series=book.series_slug||'';
      else series=(post?.collection_slugs||[]).find(slug=>(meta.seriesEnabled?meta.series:fallbackSeries()).some(x=>x.slug===slug&&(!x.language||x.language===language())))||'';
      fillSeries(series);
      fillBook(book?.language===language()?book.id:'');
      fillChapter(chapter?.id||'auto');
    }
    function getSelection(){
      const book=meta.books.find(x=>x.id===b.value);
      return {
        mode:book?'book':s.value?'series':'independent',
        series_slug:book?book.series_slug||'':s.value,
        book_id:book?.id||'',
        chapter_id:book?c.value:''
      };
    }
    s.addEventListener('change',()=>{fillBook();fillChapter();});
    b.addEventListener('change',()=>fillChapter());
    c.addEventListener('change',updateHint);
    form.elements.language.addEventListener('change',()=>{fillSeries();fillBook();fillChapter();});
    form.elements.status.addEventListener('change',updateHint);
    root.querySelector('#place-refresh').addEventListener('click',async()=>{await refresh();hint.textContent='目录已刷新。';});
    async function ensureReady(){
      if(!meta.enabled){
        await request('/api/admin/hierarchy',{method:'POST',body:JSON.stringify({op:'hierarchy-init'})});
        await refresh();
      }
      if(!meta.seriesEnabled){
        const defaults=['zh','en'].flatMap(lang=>(window.TRN?.collections?.[lang]||[]).map(row=>({...row,language:lang})));
        await request('/api/admin/hierarchy',{method:'POST',body:JSON.stringify({op:'series-init',defaults})});
        await refresh();
      }
    }
    root.querySelector('#place-add-series').addEventListener('click',async()=>{
      const title=prompt('新系列名称（例如：早期作品）');
      if(!title?.trim())return;
      const normalized=title.trim().toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      const slug=normalized&&normalized.length<=80?normalized:'series-'+crypto.randomUUID().slice(0,8);
      try{
        await ensureReady();
        await request('/api/admin/hierarchy',{method:'POST',body:JSON.stringify({
          op:'series-create',language:language(),slug,title:title.trim(),status:'draft',description:'',category:form.elements.type.value
        })});
        await refresh();fillSeries(slug);fillBook();fillChapter();
        hint.textContent='系列已创建。发布文章时可以一并公开它。';
      }catch(e){alert('创建系列失败：'+e.message);}
    });
    root.querySelector('#place-add-book').addEventListener('click',async()=>{
      const title=prompt('新书名称（单篇、多章的书都在这里创建）');
      if(!title?.trim())return;
      try{
        await ensureReady();
        const result=await request('/api/admin/hierarchy',{method:'POST',body:JSON.stringify({
          op:'book-create',language:language(),series_slug:s.value,title:title.trim(),status:'draft',description:''
        })});
        await refresh();fillBook(result.id);fillChapter();
        hint.textContent='书籍已创建。新写的文章会自动作为一章加入。';
      }catch(e){alert('创建书籍失败：'+e.message);}
    });
    fillSeries();fillBook();fillChapter();
    return {refresh,load,getSelection,root,meta,hasLoaded:()=>loaded,chooseBook(id){
      const item=meta.books.find(x=>x.id===id&&x.language===language());
      if(!item)return false;
      fillSeries(item.series_slug||'');fillBook(item.id);fillChapter('auto');
      return true;
    }};
  }
  window.TRNPlacement={create};
})();
