/* Tomato Ricenoodles: paste text only in the article editor.
   Rich HTML, source fonts, inline colors and copied heading styles are discarded. */
(() => {
  'use strict';

  function clipboardText(clipboard) {
    if(!clipboard)return null;
    const plain=clipboard.getData('text/plain');
    if(typeof plain==='string' && plain.length)return plain.replace(/\r\n?/g,'\n');
    const html=clipboard.getData('text/html');
    if(!html)return typeof plain==='string'?plain:null;
    // Some apps put only HTML on the clipboard. Extract visible text and line
    // breaks without ever inserting external HTML into the editor or the page.
    const doc=new DOMParser().parseFromString(html,'text/html');
    doc.querySelectorAll('script,style,iframe,object,svg').forEach(el=>el.remove());
    doc.querySelectorAll('br').forEach(br=>br.replaceWith('\n'));
    doc.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,li,blockquote').forEach(el=>{
      if(el.nextSibling)el.after(doc.createTextNode('\n'));
    });
    return (doc.body.textContent||'').replace(/\r\n?/g,'\n');
  }

  function pastePlain(event, getEditor, sourceTextarea, onChange) {
    const target=event.target;
    if(!target || typeof target.closest!=='function')return false;
    const richTarget=target.closest('.toastui-editor-ww-container [contenteditable="true"],.toastui-editor-md-container .CodeMirror');
    const sourceTarget=target===sourceTextarea;
    if(!richTarget && !sourceTarget)return false;
    if(event.clipboardData && event.clipboardData.files && event.clipboardData.files.length &&
       !(event.clipboardData.types||[]).includes('text/plain') &&
       !(event.clipboardData.types||[]).includes('text/html'))return false;
    const text=clipboardText(event.clipboardData);
    if(text===null)return false;
    event.preventDefault();
    event.stopImmediatePropagation?.();
    if(sourceTarget){
      const from=sourceTextarea.selectionStart,to=sourceTextarea.selectionEnd;
      sourceTextarea.setRangeText(text,from,to,'end');
      sourceTextarea.dispatchEvent(new Event('input',{bubbles:true}));
      onChange?.();
      return true;
    }
    const editor=getEditor?.();
    if(!editor || typeof editor.insertText!=='function')return false;
    editor.insertText(text);
    onChange?.();
    return true;
  }

  function install(mount,getEditor,sourceTextarea,onChange) {
    const handler=event=>pastePlain(event,getEditor,sourceTextarea,onChange);
    mount.addEventListener('paste',handler,true);
    sourceTextarea?.addEventListener('paste',handler,true);
  }

  window.TRNPlainTextPaste={install,pastePlain,clipboardText};
})();
