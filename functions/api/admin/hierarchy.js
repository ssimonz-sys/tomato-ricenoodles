import {guard} from '../../../lib/auth.js';
import {error,parseJson,send} from '../../../lib/common.js';
const str=(v,max=220)=>{const s=String(v??'').trim();if(s.length>max)throw Error('字段内容过长。');return s;};
const order=v=>{const n=Number(v??0);if(!Number.isInteger(n)||n<0||n>999999)throw Error('排序必须是非负整数。');return n;};
const uuid=v=>{const s=str(v,40);if(!/^[0-9a-f-]{36}$/.test(s))throw Error('编号无效。');return s;};
const lang=v=>{const s=str(v,2);if(!['zh','en'].includes(s))throw Error('语言必须是中文或英文。');return s;};
const status=v=>{const s=str(v,20);if(!['draft','published'].includes(s))throw Error('发布状态无效。');return s;};
const series=v=>{const s=str(v,90).toLowerCase();if(s&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s))throw Error('系列标识无效。');return s;};
const title=v=>{const s=str(v,200);if(!s)throw Error('请填写名称。');return s;};
const cover=v=>{const s=str(v,900);if(s&&!/^https:\/\/[^\s<>"']+$/i.test(s)&&!/^\/assets\/(?:graphics|covers)\/[a-zA-Z0-9_./-]+\.(svg|png|jpe?g|webp|gif)$/i.test(s)&&!/^\/media\/covers\/[0-9a-f-]{36}\.(jpg|png|webp|gif)$/i.test(s))throw Error('封面地址格式错误。');return s;};
async function enabled(db){return !!await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trn_section_links'").first();}
async function seriesEnabled(db){return !!await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='trn_series'").first();}
const seriesData=data=>{
  const slug=series(data.slug);if(!slug)throw Error('系列标识不能为空。');
  const theme=str(data.theme||'sage',20);if(!['sage','ink','copper','stone','blue'].includes(theme))throw Error('封面主题无效。');
  const category=str(data.category||'essay',20);if(!['essay','fiction','poetry','note'].includes(category))throw Error('类别无效。');
  return {slug,title:title(data.title),description:str(data.description,3000),art:cover(data.art),theme,category,status:status(data.status||'published'),sort_order:order(data.sort_order)};
};

export async function onRequestGet(context){
  const a=await guard(context);if(a.failed)return a.failed;
  const db=context.env.DB;
  if(!await enabled(db))return send({enabled:false,seriesEnabled:false,series:[],books:[],chapters:[],links:[]});
  const hasSeries=await seriesEnabled(db);
  const [books,chapters,links]=await Promise.all([
    db.prepare('SELECT * FROM trn_books ORDER BY language,series_slug,sort_order,title').all(),
    db.prepare('SELECT * FROM trn_chapters ORDER BY book_id,created_at,id').all(),
    db.prepare('SELECT * FROM trn_section_links ORDER BY chapter_id,created_at,post_id').all()
  ]);
  const series=hasSeries?(await db.prepare("SELECT t.*, MAX(COALESCE((SELECT MAX(p.updated_at) FROM posts p WHERE p.language=t.language AND p.status='published' AND EXISTS (SELECT 1 FROM json_each(p.collection_slugs) j WHERE j.value=t.slug)),''),COALESCE((SELECT MAX(p.updated_at) FROM posts p JOIN trn_section_links l ON l.post_id=p.id JOIN trn_chapters ch ON ch.id=l.chapter_id JOIN trn_books b ON b.id=ch.book_id WHERE b.language=t.language AND b.series_slug=t.slug AND p.status='published'),''),t.created_at) AS last_activity FROM trn_series t ORDER BY t.language,last_activity DESC,t.created_at DESC,t.slug").all()).results||[]:[];
  return send({enabled:true,seriesEnabled:hasSeries,series,books:books.results||[],chapters:chapters.results||[],links:links.results||[]});
}
export async function onRequestPost(context){
  const a=await guard(context,true);if(a.failed)return a.failed;
  const db=context.env.DB;
  let data;try{data=await parseJson(context.request,20000);}catch{return error('请求格式有误。');}
  if(data.op==='hierarchy-init'){
    // Safe, idempotent setup for existing Cloudflare D1 without manual SQL.
    const statements=[
      "CREATE TABLE IF NOT EXISTS trn_books (id TEXT PRIMARY KEY,language TEXT NOT NULL CHECK(language IN ('en','zh')),series_slug TEXT NOT NULL DEFAULT '',title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',cover_url TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
      "CREATE INDEX IF NOT EXISTS idx_trn_books_series ON trn_books(language,series_slug,sort_order)",
      "CREATE TABLE IF NOT EXISTS trn_chapters (id TEXT PRIMARY KEY,book_id TEXT NOT NULL REFERENCES trn_books(id) ON DELETE RESTRICT,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL)",
      "CREATE INDEX IF NOT EXISTS idx_trn_chapters_book ON trn_chapters(book_id,sort_order)",
      "CREATE TABLE IF NOT EXISTS trn_section_links (post_id TEXT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,chapter_id TEXT NOT NULL REFERENCES trn_chapters(id) ON DELETE RESTRICT,sort_order INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL)",
      "CREATE INDEX IF NOT EXISTS idx_trn_section_links_chapter ON trn_section_links(chapter_id,sort_order)"
    ];
    try{for(const sql of statements)await db.prepare(sql).run();}
    catch(e){console.error('Hierarchy initialization failed',e);return error('目录初始化失败，请检查 D1 数据库权限。',500);}
    return send({ok:true,enabled:true});
  }
  if(!await enabled(db))return error('书籍目录还没有初始化，请在写作页面创建书籍以自动开启。',409);
  const now=new Date().toISOString();
  try{
    switch(data.op){
      case 'series-init':{
        const already=await seriesEnabled(db);
        if(already)return send({ok:true,already:true});
        const defaults=Array.isArray(data.defaults)?data.defaults:[];
        if(defaults.length>30)return error('系列数量过多。',400);
        const seeds=defaults.map((item,i)=>({language:lang(item.language),...seriesData({...item,status:'published',sort_order:i*10})}));
        await db.prepare("CREATE TABLE IF NOT EXISTS trn_series (language TEXT NOT NULL CHECK (language IN ('en','zh')), slug TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', art TEXT NOT NULL DEFAULT '', theme TEXT NOT NULL DEFAULT 'sage', category TEXT NOT NULL DEFAULT 'essay' CHECK (category IN ('essay','fiction','poetry','note')), status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published')), sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT '', PRIMARY KEY(language,slug))").run();
        await db.prepare('CREATE INDEX IF NOT EXISTS idx_trn_series_list ON trn_series(language,status,sort_order,title)').run();
        const insert=db.prepare('INSERT OR IGNORE INTO trn_series(language,slug,title,description,art,theme,category,status,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)');
        for(const p of seeds){
          await insert.bind(p.language,p.slug,p.title,p.description,p.art,p.theme,p.category,p.status,p.sort_order,now,now).run();
        }
        return send({ok:true,seeded:seeds.length});
      }
      case 'series-create':{
        if(!await seriesEnabled(db))return error('请先执行系列数据库升级脚本。',409);
        const p=seriesData(data),language=lang(data.language);
        const nowDate=new Date().toISOString();
        await db.prepare("INSERT INTO trn_series(language,slug,title,description,art,theme,category,status,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
          .bind(language,p.slug,p.title,p.description,p.art,p.theme,p.category,p.status,p.sort_order,nowDate,nowDate).run();
        return send({ok:true},201);
      }
      case 'series-update':{
        if(!await seriesEnabled(db))return error('请先执行系列数据库升级脚本。',409);
        const p=seriesData(data),language=lang(data.language);
        const old=await db.prepare('SELECT slug FROM trn_series WHERE language=? AND slug=?').bind(language,p.slug).first();
        if(!old)return error('未找到系列。',404);
        await db.prepare('UPDATE trn_series SET title=?,description=?,art=?,theme=?,category=?,status=?,sort_order=?,updated_at=? WHERE language=? AND slug=?')
          .bind(p.title,p.description,p.art,p.theme,p.category,p.status,p.sort_order,now,language,p.slug).run();
        return send({ok:true});
      }
      case 'series-delete':{
        if(!await seriesEnabled(db))return error('请先执行系列数据库升级脚本。',409);
        const language=lang(data.language),slug=series(data.slug);
        if(!slug)return error('系列标识不能为空。',400);
        const [bookLinks,articleLinks]=await Promise.all([
          db.prepare('SELECT count(*) AS n FROM trn_books WHERE language=? AND series_slug=?').bind(language,slug).first(),
          db.prepare('SELECT count(*) AS n FROM posts p WHERE p.language=? AND EXISTS (SELECT 1 FROM json_each(p.collection_slugs) j WHERE j.value=?)').bind(language,slug).first()
        ]);
        if(bookLinks?.n||articleLinks?.n)return error('该系列仍有关联书籍或文章，请先移动相关内容后再删除。',409);
        await db.prepare('DELETE FROM trn_series WHERE language=? AND slug=?').bind(language,slug).run();
        return send({ok:true});
      }
      case 'book-reorder':{
        const language=lang(data.language),slug=series(data.series_slug);
        if(!slug||!Array.isArray(data.ids)||!data.ids.length||data.ids.length>500)return error('书籍排序数据无效。',400);
        const ids=data.ids.map(uuid);
        if(new Set(ids).size!==ids.length)return error('排序包含重复书籍。',400);
        const current=(await db.prepare('SELECT id FROM trn_books WHERE language=? AND series_slug=?').bind(language,slug).all()).results||[];
        if(current.length!==ids.length||current.some(b=>!ids.includes(b.id)))return error('书籍列表已改变，请刷新重试。',409);
        await db.batch(ids.map((id,i)=>db.prepare('UPDATE trn_books SET sort_order=? WHERE id=? AND language=? AND series_slug=?').bind((i+1)*10,id,language,slug)));
        return send({ok:true});
      }
      case 'book-create':{
        const id=crypto.randomUUID();
        const chosenLanguage=lang(data.language),chosenSeries=series(data.series_slug);
        if(chosenSeries && await seriesEnabled(db) && !await db.prepare('SELECT slug FROM trn_series WHERE language=? AND slug=?').bind(chosenLanguage,chosenSeries).first())return error('所选系列不存在，请先在系列书架中创建。',409);
        const existingOrder=await db.prepare('SELECT COALESCE(MAX(sort_order),0) AS max_order FROM trn_books WHERE language=? AND series_slug=?').bind(chosenLanguage,chosenSeries).first();
        await db.prepare('INSERT INTO trn_books(id,language,series_slug,title,description,cover_url,status,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
          .bind(id,lang(data.language),series(data.series_slug),title(data.title),str(data.description,3000),cover(data.cover_url),status(data.status||'draft'),(existingOrder?.max_order||0)+10,now,now).run();
        return send({ok:true,id},201);
      }
      case 'book-update':{
        const id=uuid(data.id);
        const old=await db.prepare('SELECT id,language,sort_order FROM trn_books WHERE id=?').bind(id).first();
        if(!old)return error('找不到这本书。',404);
        const chosenSeries=series(data.series_slug);
        if(chosenSeries && await seriesEnabled(db) && !await db.prepare('SELECT slug FROM trn_series WHERE language=? AND slug=?').bind(old.language,chosenSeries).first())return error('所选系列不存在，请先创建该系列。',409);
        await db.prepare('UPDATE trn_books SET series_slug=?,title=?,description=?,cover_url=?,status=?,sort_order=?,updated_at=? WHERE id=?')
          .bind(series(data.series_slug),title(data.title),str(data.description,3000),cover(data.cover_url),status(data.status||'draft'),old.sort_order,now,id).run();
        return send({ok:true,id});
      }
      case 'book-delete':{
        const id=uuid(data.id);
        const count=await db.prepare('SELECT count(*) AS total FROM trn_chapters WHERE book_id=?').bind(id).first();
        if(count?.total)return error('请先移动或删除书中的章节。',409);
        await db.prepare('DELETE FROM trn_books WHERE id=?').bind(id).run();
        return send({ok:true});
      }
      case 'chapter-create':{
        const id=crypto.randomUUID(),bookId=uuid(data.book_id);
        if(!await db.prepare('SELECT id FROM trn_books WHERE id=?').bind(bookId).first())return error('找不到所属书籍。',404);
        await db.prepare('INSERT INTO trn_chapters(id,book_id,title,description,status,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)')
          .bind(id,bookId,title(data.title),str(data.description,2000),status(data.status||'draft'),0,now,now).run();
        return send({ok:true,id},201);
      }
      case 'chapter-update':{
        const id=uuid(data.id);
        if(!await db.prepare('SELECT id FROM trn_chapters WHERE id=?').bind(id).first())return error('找不到章节。',404);
        await db.prepare('UPDATE trn_chapters SET title=?,description=?,status=?,updated_at=? WHERE id=?')
          .bind(title(data.title),str(data.description,2000),status(data.status||'draft'),now,id).run();
        return send({ok:true,id});
      }
      case 'chapter-delete':{
        const id=uuid(data.id);
        const count=await db.prepare('SELECT count(*) AS total FROM trn_section_links WHERE chapter_id=?').bind(id).first();
        if(count?.total)return error('请先移动或取消归属该章的节。',409);
        await db.prepare('DELETE FROM trn_chapters WHERE id=?').bind(id).run();
        return send({ok:true});
      }
      case 'section-link':{
        const postId=uuid(data.post_id),chapterId=uuid(data.chapter_id);
        const post=await db.prepare('SELECT id,language FROM posts WHERE id=?').bind(postId).first();
        const chapter=await db.prepare('SELECT ch.id,b.language FROM trn_chapters ch JOIN trn_books b ON b.id=ch.book_id WHERE ch.id=?').bind(chapterId).first();
        if(!post||!chapter)return error('文章或章节不存在。',404);
        if(post.language!==chapter.language)return error('中文站和英文站的内容不能混用。',409);
        await db.prepare('INSERT INTO trn_section_links(post_id,chapter_id,sort_order,created_at) VALUES(?,?,?,?) ON CONFLICT(post_id) DO UPDATE SET chapter_id=excluded.chapter_id,created_at=CASE WHEN trn_section_links.chapter_id<>excluded.chapter_id THEN excluded.created_at ELSE trn_section_links.created_at END')
          .bind(postId,chapterId,order(data.sort_order),now).run();
        return send({ok:true});
      }
      case 'section-unlink':{
        await db.prepare('DELETE FROM trn_section_links WHERE post_id=?').bind(uuid(data.post_id)).run();
        return send({ok:true});
      }
      default:return error('未知操作。');
    }
  }catch(e){
    if(/UNIQUE constraint failed: trn_series/i.test(e.message||''))return error('该站点已有相同系列标识，请换一个。',409);
    return error(/constraint|FOREIGN KEY/i.test(e.message||'')?'关联关系有冲突，请检查后重试。':e.message);
  }
}
