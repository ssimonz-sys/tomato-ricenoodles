/* Presentation-only English localization for the shared author applications.
   User-authored titles, paragraphs, article body, code, and input values are
   never translated. The database keeps the author's original text. */
(() => {
  'use strict';
  if(window.TRNAdminSite?.lang!=='en')return;
  const dictionary={
    '作品归属':'Placement',
    '可以直接收进系列，也可以放入系列中的某本书':'Assign this post to a collection or a book within it',
    '系列':'Collection',
    '书籍':'Book',
    '章节':'Chapter',
    '独立文章 / 不加入系列':'Standalone post / No collection',
    '不选择书籍':'No book',
    '无需选择章节':'No chapter required',
    '独立文章不需要章节':'No chapter needed for a standalone post',
    '独立文章（不选书）':'Standalone post',
    '直接收入系列（不选书）':'Add directly to collection',
    '作为新章节（使用文章标题）':'Create a new chapter using the post title',
    '独立文章会直接显示在所选语言站点。':'Standalone posts appear in the chosen edition.',
    '＋新建系列':'＋ New collection',
    '＋新建书籍':'＋ New book',
    '↻刷新目录':'↻ Refresh catalog',
    '完整管理':'Library manager',
    '发布时会询问是否同时公开所属的草稿书籍、章节或系列。':'Publishing will ask to make draft parents public.',
    '发布后文章会出现在这本书中。':'This post will appear inside the selected book.',
    '默认把这篇文章作为新章节加入书籍，也可以选择一个现有章节。':'By default this post becomes a new chapter. You can also select an existing one.',
    '发布时会询问是否公开这个系列。':'Publishing will ask to make this collection public.',
    '文章将直接收入该系列，不需要先创建书籍。':'Add this post directly to the collection. No book required.',
    '独立文章保存为草稿，暂不对读者显示。':'Drafts are private until published.',
    '目录已刷新。':'Catalog refreshed.',
    '系列已创建。发布文章时可以一并公开它。':'Collection created. You can publish it with the post.',
    '书籍已创建。新写的文章会自动作为一章加入。':'Book created. The next post becomes a chapter.',
    '文章大纲':'Outline',
    '标题支持六级层次，点击可跳转。':'Use up to six heading levels. Click to jump.',
    '作品设置':'Post settings',
    '发布站点、分类与文章信息':'Edition, category, and post details',
    '分类与专题':'Category and tags',
    '封面图片':'Cover image',
    '发布与归档':'Publish & organize',
    '选择语言和公开状态，然后把作品收进系列或书籍':'Choose visibility and assign to a collection or book',
    '关闭设置':'Close settings',
    '支持长篇与附录分节':'Long-form and appendix support',
    '专注写作':'Focus mode',
    '退出专注':'Exit focus',
    '进入专注写作':'Enter focus mode',
    '退出专注模式':'Exit focus mode',
    '切换专注写作模式':'Toggle focus mode',
    '显示排版工具':'Show formatting',
    '收起排版工具':'Hide formatting',
    '长文结构':'Document structure',
    '一级标题':'Heading 1',
    '二级标题':'Heading 2',
    '三级标题':'Heading 3',
    '四级标题':'Heading 4',
    '五级标题':'Heading 5',
    '六级标题':'Heading 6',
    '选择标题级别':'Select heading level',
    '插入标题':'Insert heading',
    '插入分节示例':'Insert outline sample',
    '新标题':'New heading',
    '粘贴内容自动去除外部格式，只保留文字和换行。正文可对齐、缩进；保存与发布请使用上方的「发布与归档」。':'Pasted text keeps plain text and line breaks. Alignment and indentation are available; use Publish & organize above.',
    '左对齐':'Align left',
    '右对齐':'Align right',
    '居中':'Center',
    '增加段落缩进':'Increase paragraph indent',
    '减少段落缩进':'Decrease paragraph indent',
    '阅读全文预览':'Full preview',
    '返回写作':'Back to writing',
    '编辑文章':'Edit post',
    '新建文章':'New post',
    '删除文章':'Delete post',
    '保存草稿':'Save draft',
    '发布成功':'Published',
    '已保存':'Saved',
    '正在保存到云端…':'Saving to the cloud…',
    '已保存到云端':'Saved to cloud',
    '草稿已自动保存到云端':'Draft autosaved to cloud',
    '草稿保存成功，已保存到云端。':'Draft saved to cloud.',
    '查看已发布文章 ↗':'View published post ↗',
    '查看英文站文章 ↗':'View English post ↗',
    '修改待保存…':'Unsaved changes…',
    '待自动保存…':'Waiting to autosave…',
    '保存失败，请检查提示':'Save failed. Check the error.',
    '发布前请检查填写内容':'Check the fields before publishing',
    '中文站':'Chinese edition',
    '英文站':'English edition',
    '正在验证登录…':'Signing in…',
    '登录失败：':'Sign-in failed: ',
    '已登录。':'Signed in. ',
    '独立书籍与待归档书籍':'Standalone / Unfiled books',
    '返回系列书架':'Back to library',
    '所属系列 · ':'Collection · ',
    '独立书籍':'Standalone book',
    '＋ 写新章':'＋ Write chapter',
    '＋ 添加节':'＋ Add section',
    '开始写本章':'Write this chapter',
    '关联已有文章':'Link existing post',
    '编辑书籍':'Edit book',
    '删除书籍':'Delete book',
    '编辑章节':'Edit chapter',
    '删除章节':'Delete chapter',
    '编辑系列':'Edit collection',
    '新建系列':'New collection',
    '新建书籍':'New book',
    '新建章节':'New chapter',
    '＋ 书':'＋ Book',
    '公开':'Public',
    '已公开':'Published',
    '草稿':'Draft',
    '已发布':'Published',
    '政论与随笔':'Essays & Commentary',
    '小说':'Fiction',
    '诗歌':'Poetry',
    '笔记与杂记':'Notes',
    '暂无简介':'No description',
    '拖动书名前的 ⠿ 调整顺序，松开后自动保存。':'Drag the ⠿ handle to reorder books. Changes save on release.',
    '拖动排序':'Drag to reorder',
    '这里还没有书籍，也可以先把系列建立起来。':'No books yet. You can create the collection first.',
    '还没有章节。你可以在写作页新建文章并选择这本书，系统会自动把文章作为一章加入。':'No chapters yet. Start a post in this book to create its first chapter.',
    '这一章还没有正文，可以点击「开始写本章」。':'No text yet. Choose Write this chapter.',
    '写作':'Write',
    '编辑':'Edit',
    '删除':'Delete',
    '调整归属':'Change placement',
    '移出':'Unlink',
    '关联文章':'Link post',
    '设置归属':'Placement',
    '编辑正文':'Edit text',
    '删除文章':'Delete post',
    '没有找到符合条件的文章。':'No matching posts.',
    '尚未启用阅读量、点赞和匿名评论。请点击上方按钮初始化数据库。':'Reads, likes, and comments are not enabled. Use the button above to initialize.',
    '这一栏还没有评论。':'No comments in this view.',
    '批准':'Approve',
    '拒绝':'Reject',
    '阅读':'Reads',
    '点赞':'Likes',
    '评论':'Comments',
    '系列名称':'Collection title',
    '系列网址标识（英文小写及连字符）':'Collection URL slug (lowercase letters and hyphens)',
    '系列简介':'Collection description',
    '系列封面（上传图片或填网址）':'Collection cover (upload or URL)',
    '系列类别':'Collection category',
    '封面主题配色':'Cover color theme',
    '公开状态':'Visibility',
    '书名':'Book title',
    '所属系列':'Collection',
    '书籍简介':'Book description',
    '书籍封面（上传图片或填网址）':'Book cover (upload or URL)',
    '章节标题':'Chapter title',
    '章节简介':'Chapter description',
    '目标章节':'Target chapter',
    '选择文章':'Choose post',
    '独立书籍':'Standalone book',
    '柔和绿':'Sage',
    '宣纸灰':'Stone',
    '朱红':'Copper',
    '墨色':'Ink',
    '蓝色':'Blue',
    '正在保存……':'Saving…',
    '正在登录……':'Signing in…',
    '书籍顺序已保存。':'Book order saved.',
    '标题支持六级层次，点击可跳转。':'Six heading levels supported.',
    '↑ 从电脑上传封面':'↑ Upload cover',
    '当前封面预览':'Cover preview',
    '选择封面图片':'Choose a cover',
    '上传成功！':'Uploaded!',
    '正在准备图片…':'Preparing image…',
    '新系列名称（例如：早期作品）':'New collection title (e.g. Early Works)',
    '新书名称（单篇、多章的书都在这里创建）':'New book title (single-chapter and multi-chapter books use the same structure)',
    '首次使用需要初始化系列目录，并导入已有的中英文系列。现有文章和书籍会保留。是否继续？':'Initialize the collection catalog? Existing posts and books will be preserved.',
    '确定永久删除这篇文章吗？':'Permanently delete this post?',
    '删除后将无法恢复，确定永久删除这篇文章吗？':'Permanently delete this post? This cannot be undone.',
    '当前修改尚未保存，确定放弃修改吗？':'Discard unsaved changes?',
    '发现未保存的本机写作副本，要恢复吗？':'An unsaved local draft was found. Restore it?',
    '启用独立的阅读统计、点赞和匿名评论数据库？不会修改已有文章。':'Enable reads, likes, and comments? Existing posts will not change.',
    '永久删除这条评论吗？':'Permanently delete this comment?',
    '请先上传图片并通过图片网址插入，目前不支持直接粘贴图片文件。':'Please upload the image and insert its URL. Direct image pasting is unavailable.',
    '将在当前光标位置插入示例标题结构。确定继续吗？':'Insert sample headings at the cursor?',
    '为保护已有作品链接，此标识创建后固定':'This URL identifier stays fixed to protect existing links',
    '编辑系列':'Edit collection',
    '编辑书籍':'Edit book',
    '编辑章节':'Edit chapter',
    '已保存本机副本':'Local draft retained',
    '图片上传中…':'Uploading image…',
    '已压缩图片，正在上传…':'Compressed; uploading…'
  };
  const pieces=[
    [/^(\d+)\s*章\s*·\s*/g,'$1 chapters · '],
    [/^(\d+)\s*章$/g,'$1 chapters'],
    [/^(\d+)\s*节$/g,'$1 sections'],
    [/^所属系列\s*·\s*/g,'Collection · '],
    [/^已公开\s*·\s*/g,'Published · '],
    [/^草稿\s*·\s*/g,'Draft · '],
    [/^公开\s*·\s*/g,'Public · '],
    [/^(\d+)\s*节\s*·\s*/g,'$1 sections · '],
    [/^(\d+)\s*本书/g,'$1 books'],
    [/^(\d+)\s*本$/g,'$1 books'],
    [/^(\d+)\s*字$/g,'$1 words'],
    [/^(\d+)\s*个标题$/g,'$1 headings'],
    [/^书\s*·\s*/g,'Book · '],
    [/^章\s*·\s*/g,'Chapter · '],
    [/^节\s*·\s*/g,'Section · '],
    [/^收录系列：/g,'Collection: '],
    [/^收录：/g,'Filed in: '],
    [/^(\s*·\s*)(\d+)\s*阅读/g,'$1$2 reads'],
    [/(\d+)\s*点赞/g,'$1 likes'],
    [/(\d+)\s*评论/g,'$1 comments'],
    [/（系列草稿）/g,' (collection draft)'],
    [/（书籍草稿）/g,' (book draft)'],
    [/（章节草稿）/g,' (chapter draft)'],
    [/^目录读取失败：/g,'Catalog loading failed: '],
    [/^删除系列「/g,'Delete collection “'],
    [/^删除书籍「/g,'Delete book “'],
    [/^删除章节「/g,'Delete chapter “'],
    [/^确定永久删除文章「/g,'Permanently delete post “'],
    [/^将「/g,'Move “'],
    [/^此操作无法撤销。$/g,'This action cannot be undone.'],
    [/^登录失败：/g,'Sign-in failed: '],
    [/^读取作品失败：/g,'Unable to load posts: '],
    [/^创建系列失败：/g,'Cannot create collection: '],
    [/^创建书籍失败：/g,'Cannot create book: '],
    [/^上传失败：/g,'Upload failed: '],
    [/^发布或保存失败：/g,'Save or publish failed: '],
    [/^发布到英文站$/g,'Publish to English edition'],
    [/^文章将公开发布到英文站。$/g,'This post will be published to the English edition.'],
    [/^将保存为英文站的私密草稿，读者无法查看。$/g,'This will be saved privately as an English draft.'],
    [/^发布成功，文章已收录到英文站。点击下方链接查看。$/g,'Published to the English edition. Open the link below to view it.'],
    [/^已成功登录，但作品读取失败：/g,'Signed in, but could not load posts: '],
    [/^已登录，但作品加载失败：/g,'Signed in, but could not load posts: '],
    [/^(.+)\s*·\s*草稿$/g,'$1 · Draft'],
    [/^(.+)\s*·\s*公开$/g,'$1 · Public'],
    [/^(.+)\s*·\s*已发布$/g,'$1 · Published'],
    [/^保存失败：/g,'Save failed: ']
  ];
  const skipSelector='.toastui-editor-contents,.ProseMirror,.CodeMirror,.toastui-editor-md-container,.toastui-editor-ww-container,.markdown-preview,.studio-outline-items,#studio-outline-items,.manager-article-main h3,.manager-article-main p,.manager-comment-row p,.manager-series-copy h3,.manager-series-copy p,.manager-book-details-header h2,.manager-book-details-header p';
  function transform(value){
    if(!value||!(/[\u3400-\u9fff]/.test(value)))return value;
    if(Object.hasOwn(dictionary,value))return dictionary[value];
    const trimmed=value.trim();
    if(Object.hasOwn(dictionary,trimmed))return value.replace(trimmed,dictionary[trimmed]);
    let result=value;
    for(const [re,out] of pieces)result=result.replace(re,out);
    return result.replace(/ {2,}·/g,' ·');
  }
  function translateNode(node){
    if(node.nodeType!==3)return;
    const parent=node.parentElement;
    if(!parent||parent.closest(skipSelector))return;
    if(parent.closest('textarea,script,style,option[data-no-translate]'))return;
    const old=node.nodeValue,next=transform(old);
    if(next!==old)node.nodeValue=next;
  }
  function inspect(root){
    if(root.nodeType===3){translateNode(root);return;}
    if(root.nodeType!==1)return;
    if(root.closest(skipSelector))return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode()))translateNode(node);
    for(const el of root.querySelectorAll('[aria-label],[title],[placeholder]')){
      if(el.closest(skipSelector))continue;
      for(const key of ['aria-label','title','placeholder']){
        const old=el.getAttribute(key);
        if(old){const next=transform(old);if(next!==old)el.setAttribute(key,next);}
      }
    }
  }
  function start(){
    inspect(document.body);
    const observer=new MutationObserver(records=>{
      for(const r of records){
        if(r.type==='characterData')translateNode(r.target);
        else for(const n of r.addedNodes)inspect(n);
      }
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    // Localize native confirmation dialogs without altering their behavior.
    // Only the English author pages load this module.
    for(const method of ['alert','confirm','prompt']){
      if(typeof window[method]!=='function')continue;
      const original=window[method].bind(window);
      window[method]=(message,...args)=>original(transform(String(message??'')),...args);
    }
    window.TRNAdminTranslate={transform,inspect};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();