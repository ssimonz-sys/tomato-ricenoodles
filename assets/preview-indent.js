/* Restore Markdown source indentation in TOAST UI's built-in live preview.
   Reader/full-page preview use reading-layout.js, which has its own renderer.
   This adapter only styles preview elements. It never edits the saved article. */
(() => {
  'use strict';
  function normalize(value) {
    return String(value??'')
      .replace(/<[^>]*>/g,'')
      .replace(/&(?:nbsp|ensp|emsp);|&#(?:160|xA0);/gi,' ')
      .replace(/!\[([^\]]*)\]\([^)]*\)/g,'$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
      .replace(/(?:\*\*|__|~~|`)/g,'')
      .replace(/[ \t\r\n\u00a0\u3000]/g,'').trim();
  }
  const prefixPattern=/^((?:[ \t\u00a0\u3000]|&nbsp;|&ensp;|&emsp;|&#160;|&#xA0;)+)(?=\S)/i;
  function indentWidth(prefix) {
    const units=prefix.match(/&(?:nbsp|ensp|emsp);|&#(?:160|xA0);|[ \t\u00a0\u3000]/gi)||[];
    return Math.min(30,units.reduce((sum,unit)=>{
      if(unit==='\t')return sum+4;
      if(unit==='\u3000'||/^&emsp;$/i.test(unit))return sum+2;
      return sum+1;
    },0));
  }
  function indentedLines(markdown) {
    const records=[];
    const rows=String(markdown??'').replace(/\r\n?/g,'\n').split('\n');
    let inFence='';
    for(const row of rows) {
      // Quote markers are structural, but spaces after them are authorial indent.
      const quote=row.match(/^ {0,3}(?:>[ \t]?)+/);
      const body=quote?row.slice(quote[0].length):row;
      const fence=body.match(/^ {0,3}(`{3,}|~{3,})/);
      if(fence){
        const type=fence[1][0];
        if(!inFence)inFence=type;
        else if(type===inFence)inFence='';
        continue;
      }
      if(inFence)continue;
      const match=body.match(prefixPattern);
      if(!match)continue;
      const content=body.slice(match[0].length);
      // Real lists, headings, quotes, HTML blocks and tables keep native markup.
      if(/^(?:#{1,6}[ \t]|[-*+][ \t]|\d+[.)][ \t]|>[ \t]?|\||<)/.test(content))continue;
      const key=normalize(content);
      if(!key)continue;
      records.push({text:key, em:indentWidth(match[1])/2});
    }
    return records;
  }
  function apply(root,markdown) {
    if(!root?.querySelectorAll)return 0;
    const records=indentedLines(markdown);
    const paragraphs=Array.from(root.querySelectorAll('p')).filter(p=>!p.closest('li,table,pre'));
    let next=0,done=0;
    for(const p of paragraphs){
      if(p.dataset.trnPreviewIndent==='1'){
        p.style.removeProperty('padding-inline-start');
        delete p.dataset.trnPreviewIndent;
      }
      const content=normalize(p.textContent);
      if(!content)continue;
      let found=-1;
      for(let i=next;i<records.length;i++){
        if(content===records[i].text || (content.startsWith(records[i].text)&&records[i].text.length>=8)){
          found=i;break;
        }
      }
      if(found<0)continue;
      next=found+1;
      // When the renderer has already kept nonbreaking spaces, don't double them.
      if(/^[\u00a0\u3000 ]/.test(p.textContent||''))continue;
      if(p.querySelector('span[data-trn-indent]'))continue;
      p.style.setProperty('padding-inline-start',records[found].em+'em');
      p.dataset.trnPreviewIndent='1';
      done++;
    }
    return done;
  }
  window.TRNLiveIndent={normalize,indentedLines,apply};
})();