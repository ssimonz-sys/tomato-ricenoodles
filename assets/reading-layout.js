/* Preserve author-entered soft line breaks and paragraph indentation in rendered Markdown.
   Leaves headings, lists, blockquotes and fenced code in their normal Markdown form. */
(() => {
  'use strict';
  function prepare(source) {
    const rows=String(source??'').replace(/\r\n?/g,'\n').split('\n');
    let fence='';
    const processed=[];
    for(const line of rows){
      const marker=line.match(/^ {0,3}(`{3,}|~{3,})(?:[^\n]*)$/);
      if(marker){
        if(!fence)fence=marker[1][0];
        else if(marker[1][0]===fence)fence='';
        processed.push(line);
        continue;
      }
      if(fence){processed.push(line);continue;}
      const quoted=line.match(/^ {0,3}(?:>[ \t]?)+/);
      const quotePrefix=quoted?quoted[0]:'';
      const body=quoted?line.slice(quotePrefix.length):line;
      const leading=body.match(/^([ \t\u00a0\u3000]+)(?=\S)/);
      if(!leading){processed.push(line);continue;}
      const text=body.slice(leading[1].length);
      // Keep native Markdown syntax for block structures and explicitly authored HTML.
      if(/^(?:#{1,6}[ \t]|[-*+][ \t]|\d+[.)][ \t]|>[ \t]?|\||<|`{3,}|~{3,})/.test(text)){
        processed.push(line);
        continue;
      }
      const prefix=leading[1].replace(/ /g,'&nbsp;').replace(/\t/g,'&nbsp;&nbsp;&nbsp;&nbsp;').replace(/\u00a0/g,'&nbsp;').replace(/\u3000/g,'&emsp;');
      processed.push(quotePrefix+prefix+text);
    }
    // Keep prose newlines as separate paragraphs while preserving structural
    // Markdown and fenced code. Original stored Markdown is untouched.
    const output=[];
    let fenceType='',previousKind='blank',previousLine='';
    for(let i=0;i<processed.length;i++){
      const line=processed[i],original=rows[i];
      const marker=original.match(/^ {0,3}(`{3,}|~{3,})/);
      let kind='prose';
      if(marker)kind='fence';
      else if(fenceType)kind='code';
      else if(!original.trim())kind='blank';
      else if(/^ {0,3}(?:[-*+]\s|\d+[.)]\s)/.test(original))kind='list';
      else if(/^ {0,3}>\s?/.test(original))kind='quote';
      else if(/^ {0,3}\|/.test(original)||/^\s*:?-{3,}:?\s*(?:\||$)/.test(original))kind='table';
      else if(/^ {0,3}#{1,6}\s/.test(original)||/^ {0,3}(?:={3,}|-{3,})\s*$/.test(original))kind='heading';
      else if(/^ {0,3}</.test(original)&&!/^ {0,3}<span data-trn-(?:align|indent)=/.test(original))kind='html';
      else if(/^(?: {2,}|\t)/.test(original)&&previousKind==='list')kind='list';
      const hardBreak=/(?: {2,}|\\)$/.test(previousLine);
      if(previousKind==='prose'&&kind==='prose'&&!hardBreak)output.push('');
      output.push(line);
      if(marker){
        const mark=marker[1][0];
        if(!fenceType)fenceType=mark;
        else if(fenceType===mark)fenceType='';
      }
      previousKind=kind;
      previousLine=original;
    }
    return output.join('\n');
  }
  function render(markdown,marked,DOMPurify){
    if(!marked||!DOMPurify)return null;
    return DOMPurify.sanitize(marked.parse(prepare(markdown),{gfm:true,breaks:true}),{USE_PROFILES:{html:true}});
  }
  window.TRNReadingLayout={prepare,render};
})();