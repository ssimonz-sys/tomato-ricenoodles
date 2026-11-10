/* Reader engagement, loaded on zh/en reading pages. */
(() => {
'use strict';
const root=document.getElementById('post-detail');if(!root)return;
const language=document.body.dataset.lang==='zh'?'zh':'en',zh=language==='zh';
const label=zh?{views:'阅读',likes:'喜欢',like:'♡ 点赞',liked:'♥ 已点赞',share:'分享文章',comments:'读者评论',send:'提交评论',empty:'还没有公开评论。',placeholder:'留下你的想法（2 至 1000 字）',pending:'评论提交成功，等待作者审核。',unavailable:'互动功能尚未启用，分享功能仍可使用。',copy:'已复制文章链接',fail:'暂时无法加载读者互动。'}:{views:'Reads',likes:'Likes',like:'♡ Like',liked:'♥ Liked',share:'Share',comments:'Reader comments',send:'Submit comment',empty:'No approved comments yet.',placeholder:'Share your thoughts (2 to 1,000 characters)',pending:'Comment submitted for moderation.',unavailable:'Reader interactions are not active yet. Sharing still works.',copy:'Article link copied',fail:'Interactions are temporarily unavailable.'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let slug=null,enabled=false;
const endpoint=()=>'/api/engagement?lang='+encodeURIComponent(language)+'&slug='+encodeURIComponent(slug||'');
async function submit(data){
 const response=await fetch(endpoint(),{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},credentials:'same-origin',body:JSON.stringify(data)});
 const json=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(json.error||'HTTP '+response.status);
 return json;
}
function notify(text){const el=document.querySelector('#trn-interaction-status');if(el)el.textContent=text;}
function paintCounts(data){
 for(const [key,id] of [['views','#trn-count-views'],['likes','#trn-count-likes']]){
  const el=document.querySelector(id);if(el)el.textContent=Number(data[key]||0).toLocaleString();
 }
 const like=document.querySelector('#trn-like');
 if(like){like.disabled=!!data.liked||!enabled;like.textContent=data.liked?label.liked:label.like;like.setAttribute('aria-pressed',String(!!data.liked));}
}
function comments(list){
 const area=document.querySelector('#trn-comments-list');if(!area)return;
 area.replaceChildren();
 if(!list?.length){const p=document.createElement('p');p.className='trn-comment-empty';p.textContent=label.empty;area.append(p);return;}
 for(const item of list){
  const block=document.createElement('article');block.className='trn-comment-entry';
  const head=document.createElement('div');head.className='trn-comment-head';
  const by=document.createElement('strong');by.textContent=zh?'读者评论':'Reader comment';
  const time=document.createElement('time');
  const date=new Date(Number(item.created_at)*1000);
  time.textContent=Number.isFinite(date.valueOf())?date.toLocaleDateString(zh?'zh-CN':'en-CA'):'';
  head.append(by,time);
  const content=document.createElement('p');content.textContent=item.content;
  block.append(head,content);area.append(block);
 }
}
async function share(){
 const url=location.href.split('#')[0];
 try{
  if(navigator.share){await navigator.share({title:document.title,url});return;}
  if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);notify(label.copy);return;}
  const input=document.createElement('textarea');input.value=url;document.body.append(input);input.select();
  document.execCommand('copy');input.remove();notify(label.copy);
 }catch(err){if(err.name!=='AbortError')notify(url);}
}
async function mount(article){
 if(!article||!article.slug||document.querySelector('#trn-reader-engagement'))return;
 slug=article.slug;
 const card=document.createElement('section');
 card.id='trn-reader-engagement';card.className='trn-reader-engagement';
 card.setAttribute('aria-label',label.comments);
 card.innerHTML='<div class="trn-engagement-bar"><div class="trn-engagement-count"><strong id="trn-count-views">0</strong><small>'+label.views+'</small></div><div class="trn-engagement-count"><strong id="trn-count-likes">0</strong><small>'+label.likes+'</small></div><div class="trn-engagement-actions"><button id="trn-like" type="button" disabled>'+label.like+'</button><button id="trn-share" type="button">'+label.share+'</button></div></div>'+
 '<p class="trn-interaction-status" id="trn-interaction-status" role="status"></p>'+
 '<div class="trn-comments"><h2>'+label.comments+'</h2><div id="trn-comments-list"></div><form id="trn-comment-form"><label for="trn-comment-body">'+(zh?'匿名留言':'Anonymous comment')+'</label><textarea id="trn-comment-body" rows="4" maxlength="1000" minlength="2" required placeholder="'+label.placeholder+'"></textarea><label class="trn-honey" aria-hidden="true">Website <input type="text" name="website" autocomplete="off" tabindex="-1"></label><div class="trn-comment-actions"><small>'+(zh?'无需注册，评论经作者审核后公开。':'No account needed. Comments appear after approval.')+'</small><button type="submit">'+label.send+'</button></div></form></div>';
 root.after(card);
 card.querySelector('#trn-share').addEventListener('click',share);
 const form=card.querySelector('#trn-comment-form');
 const like=card.querySelector('#trn-like');
 try{
  const response=await fetch(endpoint(),{credentials:'same-origin',headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('Interactions unavailable');
  const data=await response.json();
  enabled=true;
  paintCounts(data);comments(data.comments);
  await submit({action:'view'}).then(paintCounts).catch(()=>{});
 }catch{
  enabled=false;paintCounts({views:0,likes:0,liked:false});
  form.hidden=true;notify(label.unavailable);return;
 }
 like.addEventListener('click',async()=>{
  like.disabled=true;
  try{const data=await submit({action:'like'});paintCounts(data);notify('');}
  catch(e){like.disabled=false;notify(e.message);}
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();const input=form.querySelector('#trn-comment-body');
  const button=form.querySelector('button[type="submit"]');
  button.disabled=true;
  try{const data=await submit({action:'comment',content:input.value,website:form.elements.website.value});
    input.value='';notify(zh?(data.message||label.pending):label.pending);
  }catch(e){notify(e.message);}
  finally{button.disabled=false;}
 });
}
window.TRNReaderEngagement={mount};
})();
