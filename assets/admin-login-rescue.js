/* Minimal login rescue. Loads independently of writing editor components.
   Never stores the password; only processes user-initiated sign-in.
   It is dormant once admin.js has registered the normal login handler. */
(() => {
  'use strict';
  const form=document.querySelector('#login-form');
  if(!form)return;
  const notice=document.querySelector('#login-message');
  const submit=form.querySelector('button[type="submit"]');
  form.addEventListener('submit',async event=>{
    if(form.dataset.trnJsReady==='1')return;
    event.preventDefault();
    const input=document.querySelector('#password');
    if(!input||!input.value)return;
    submit.disabled=true;
    notice.textContent='正在登录…';
    try{
      const response=await fetch('/api/admin/login',{
        method:'POST',credentials:'same-origin',
        headers:{'Accept':'application/json','Content-Type':'application/json'},
        body:JSON.stringify({password:input.value})
      });
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(body.error||'HTTP '+response.status);
      input.value='';
      notice.textContent='登录成功。写作页面组件暂时不可用，正在打开作品管理…';
      location.assign(window.TRNAdminSite?.manager||'/admin/manage/');
    }catch(err){
      notice.textContent='登录失败：'+err.message;
    }finally{
      submit.disabled=false;
    }
  },true);
  window.addEventListener('error',event=>{
    if(form.dataset.trnJsReady==='1')return;
    if(!notice.textContent.trim())
      notice.textContent='写作编辑器加载出现异常，登录功能仍可使用。'+
        '如果登录成功，会转到作品管理后台。';
  });
})();