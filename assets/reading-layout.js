/* Preserve author-entered soft line breaks and paragraph indentation in rendered Markdown.
   Leaves headings, lists, blockquotes and fenced code in their normal Markdown form. */
(() => {
  'use strict';
  function prepare(source) {
    const rows=String(source??'').replace(/\r\n?/g,'\n').split('\n');
    let fence='';
    const processed=[];
    for(const line of rows){
      const marker=line.match(/^ {0,3}(`{3,}|~{3,})(?:[ \t]|$)/);
      if(marker){
        if(!fence)fence=marker[1][0];
        else if(marker[1][0]===fence)fence='';
        processed.push(line);
        continue;
      }
      if(fence){processed.push(line);continue;}
      const leading=line.match(/^([ \t]+)(?=\S)/);
      if(!leading){processed.push(line);continue;}
      const text=line.slice(leading[1].length);
      // Keep native Markdown syntax for block structures and explicitly authored HTML.
      if(/^(?:#{1,6}[ \t]|[-*+][ \t]|\d+[.)][ \t]|>[ \t]?|\||<|`{3,}|~{3,})/.test(text)){
        processed.push(line);
        continue;
      }
      const prefix=leading[1].replace(/ /g,'&nbsp;').replace(/\t/g,'&nbsp;&nbsp;&nbsp;&nbsp;');
      processed.push(prefix+text);
    }
    return processed.join('\n');
  }
  function render(markdown,marked,DOMPurify){
    if(!marked||!DOMPurify)return null;
    return DOMPurify.sanitize(marked.parse(prepare(markdown),{gfm:true,breaks:true}),{USE_PROFILES:{html:true}});
  }
  window.TRNReadingLayout={prepare,render};
})();