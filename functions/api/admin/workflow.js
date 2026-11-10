/* Unified publish + placement transaction.
   A published post must have publicly visible parents, or the API asks for
   explicit confirmation to publish those parents. */
import {guard} from '../../../lib/auth.js';
import {error,parseJson,send,validatePost} from '../../../lib/common.js';

const validId=x=>/^[0-9a-f-]{36}$/.test(String(x||''));
const validSeries=x=>x===''||/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x);
const name=x=>String(x??'').trim();
async function hasTable(db,table){
  return !!await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(table).first();
}
function uniqueError(e){
  return /UNIQUE|constraint/i.test(e?.message||'');
}
export async function onRequestPost(context){
  const authorized=await guard(context,true);
  if(authorized.failed)return authorized.failed;
  const db=context.env.DB;
  let input,p;
  try{
    input=await parseJson(context.request,1000000);
    p=validatePost(input.post||{});
  }catch(e){return error(e.message||'保存请求格式有误。',400);}

  const oldId=input.id?name(input.id):'';
  if(oldId&&!validId(oldId))return error('文章编号无效。',400);
  const id=oldId||crypto.randomUUID();
  const mode=name(input.placement?.mode||'independent');
  if(!['independent','series','book'].includes(mode))return error('请重新选择文章归属。',400);
  const selectedSeries=name(input.placement?.series_slug||'');
  if(!validSeries(selectedSeries)||selectedSeries.length>90)return error('系列标识无效。',400);
  if(mode==='series'&&!selectedSeries)return error('请选择一个系列。',400);
  if(mode==='independent'&&selectedSeries)return error('独立文章不能同时指定系列。',400);
  const bookId=name(input.placement?.book_id||'');
  const chapterId=name(input.placement?.chapter_id||'');
  if(mode==='book'&&!validId(bookId))return error('请先选择所属书籍。',400);
  if(mode!=='book'&&(bookId||chapterId))return error('请重新选择书籍和章节。',400);
  if(chapterId&&chapterId!=='auto'&&!validId(chapterId))return error('章节编号无效。',400);

  const hasHierarchy=await hasTable(db,'trn_section_links');
  const hasSeries=await hasTable(db,'trn_series');
  if(mode==='book'&&!hasHierarchy)return error('书籍目录尚未初始化，请先在作品管理中启用。',409);
  const previous=oldId?await db.prepare('SELECT id,language,published_at FROM posts WHERE id=?').bind(oldId).first():null;
  if(oldId&&!previous)return error('文章不存在，可能已被删除。请刷新后重试。',404);

  let book=null,chapter=null,serie=null;
  let newChapterId=null;
  if(mode==='book'){
    book=await db.prepare('SELECT id,language,series_slug,title,status FROM trn_books WHERE id=?').bind(bookId).first();
    if(!book||book.language!==p.language)return error('所选书籍不存在，或与发布语言不一致。',409);
    if(selectedSeries!==book.series_slug)return error('所属系列与书籍不一致，请重新选择。',409);
    const chapters=(await db.prepare('SELECT id,title,status FROM trn_chapters WHERE book_id=? ORDER BY created_at,id').bind(bookId).all()).results||[];
    if(chapterId&&chapterId!=='auto'){
      chapter=chapters.find(ch=>ch.id===chapterId);
      if(!chapter)return error('所选章节已不存在，请刷新目录。',409);
    }else if(chapters.length===1){
      chapter=chapters[0];
    }else if(chapters.length===0){
      newChapterId=crypto.randomUUID();
    }else return error('这本书有多个章节，请选择文章所属章节。',400);
  }
  const effectiveSeries=mode==='series'?selectedSeries:mode==='book'?book.series_slug:'';
  if(effectiveSeries&&hasSeries){
    serie=await db.prepare('SELECT language,slug,title,status FROM trn_series WHERE language=? AND slug=?').bind(p.language,effectiveSeries).first();
    if(!serie)return error('所属系列已不存在，请重新选择。',409);
  }
  // Publication can surface other content in a previously private parent.
  // Require a conscious confirmation before changing any parent visibility.
  const hiddenParents=[];
  if(p.status==='published'){
    if(serie?.status==='draft')hiddenParents.push('系列「'+serie.title+'」');
    if(book?.status==='draft')hiddenParents.push('书籍《'+book.title+'》');
    if(chapter?.status==='draft')hiddenParents.push('章节「'+chapter.title+'」');
    if(hiddenParents.length&&!input.publish_parents){
      return send({
        error:'要让文章在网站公开显示，需要同时公开：'+hiddenParents.join('、')+'。',
        needs_parent_publication:true,
        parents:hiddenParents
      },409);
    }
  }

  // Series-only pieces are included in that collection. Pieces inside a book
  // appear under the book instead, avoiding duplicate "independent" listings.
  const collectionSlugs=mode==='series'?[effectiveSeries]:[];
  const now=new Date().toISOString();
  const published=p.status==='published'?
    ((previous?.language===p.language?previous.published_at:null)||now):null;
  const steps=[];
  if(previous){
    steps.push(db.prepare('UPDATE posts SET language=?,type=?,slug=?,title=?,excerpt=?,cover_url=?,body=?,tags=?,collection_slugs=?,status=?,word_count=?,updated_at=?,published_at=? WHERE id=?')
      .bind(p.language,p.type,p.slug,p.title,p.excerpt,p.cover_url,p.body,p.tags,JSON.stringify(collectionSlugs),p.status,p.word_count,now,published,id));
  }else{
    steps.push(db.prepare('INSERT INTO posts(id,language,type,slug,title,excerpt,cover_url,body,tags,collection_slugs,status,word_count,created_at,updated_at,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(id,p.language,p.type,p.slug,p.title,p.excerpt,p.cover_url,p.body,p.tags,JSON.stringify(collectionSlugs),p.status,p.word_count,now,now,published));
  }
  if(mode==='book'&&newChapterId){
    steps.push(db.prepare('INSERT INTO trn_chapters(id,book_id,title,description,status,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)')
      .bind(newChapterId,bookId,'正文','',p.status==='published'?'published':'draft',0,now,now));
  }
  if(hasHierarchy){
    if(mode==='book'){
      const targetChapter=chapter?.id||newChapterId;
      steps.push(db.prepare('INSERT INTO trn_section_links(post_id,chapter_id,sort_order,created_at) VALUES(?,?,?,?) ON CONFLICT(post_id) DO UPDATE SET chapter_id=excluded.chapter_id,created_at=CASE WHEN trn_section_links.chapter_id<>excluded.chapter_id THEN excluded.created_at ELSE trn_section_links.created_at END')
        .bind(id,targetChapter,0,now));
    }else{
      steps.push(db.prepare('DELETE FROM trn_section_links WHERE post_id=?').bind(id));
    }
  }
  if(p.status==='published'&&input.publish_parents){
    if(serie?.status==='draft')steps.push(db.prepare("UPDATE trn_series SET status='published',updated_at=? WHERE language=? AND slug=?").bind(now,p.language,effectiveSeries));
    if(book?.status==='draft')steps.push(db.prepare("UPDATE trn_books SET status='published',updated_at=? WHERE id=?").bind(now,bookId));
    if(chapter?.status==='draft')steps.push(db.prepare("UPDATE trn_chapters SET status='published',updated_at=? WHERE id=?").bind(now,chapter.id));
  }
  try{await db.batch(steps);}
  catch(e){
    console.error('Publication transaction failed',e);
    if(uniqueError(e))return error('当前站点已有相同的网址标识。请到作品设置修改文章网址。',409);
    return error('保存失败，请稍后再试。文章原有内容不会因此删除。',500);
  }
  return send({
    ok:true,id,status:p.status,language:p.language,
    url:'/'+p.language+'/read.html?slug='+encodeURIComponent(p.slug),
    placement:{mode,series_slug:effectiveSeries,book_id:book?.id||'',chapter_id:chapter?.id||newChapterId||''},
    visible:p.status==='published',
    auto_created_chapter:!!newChapterId
  },previous?200:201);
}
