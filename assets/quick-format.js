/* Source-safe Markdown formatting when the rich editor is unavailable. */
(() => {
  'use strict';
  function transform(value,start,end,kind,level=2,lang='zh'){
    const text=String(value??'');
    start=Math.max(0,Math.min(text.length,Number(start)||0));
    end=Math.max(start,Math.min(text.length,Number(end)||0));
    if(kind==='bold'||kind==='italic'){
      const mark=kind==='bold'?'**':'*';
      if(start===end){
        const sample=lang==='en'?(kind==='bold'?'bold text':'italic text'):(kind==='bold'?'加粗文字':'斜体文字');
        return {text:text.slice(0,start)+mark+sample+mark+text.slice(end),
          start:start+mark.length,end:start+mark.length+sample.length};
      }
      const selected=text.slice(start,end);
      if(text.slice(start-mark.length,start)===mark&&text.slice(end,end+mark.length)===mark){
        return {text:text.slice(0,start-mark.length)+selected+text.slice(end+mark.length),
          start:start-mark.length,end:end-mark.length};
      }
      return {text:text.slice(0,start)+mark+selected+mark+text.slice(end),
        start:start+mark.length,end:end+mark.length};
    }
    if(kind!=='heading'&&kind!=='quote')return null;
    const from=text.lastIndexOf('\n',Math.max(0,start-1))+1;
    const effectiveEnd=end>start&&text[end-1]==='\n'?end-1:end;
    const nextBreak=text.indexOf('\n',effectiveEnd);
    const to=nextBreak===-1?text.length:nextBreak;
    const lines=text.slice(from,to).split('\n');
    const emptySingleLine=lines.length===1&&!lines[0].trim();
    const headingLevel=Math.max(1,Math.min(6,Math.round(Number(level)||2)));
    const marker='#'.repeat(headingLevel)+' ';
    let newLines;
    if(kind==='heading'){
      const original=lines.length===1&&lines[0].match(/^([ \t]*)(#{1,6})[ \t]+/);
      const toggleOff=!!original&&original[2].length===headingLevel;
      newLines=lines.map(line=>{
        if(!line.trim())return emptySingleLine?line+marker:line;
        const base=line.replace(/^([ \t]*)#{1,6}[ \t]+/,'$1');
        const indent=base.match(/^[ \t]*/)[0];
        return toggleOff?base:indent+marker+base.slice(indent.length);
      });
    }else{
      const quoted=line=>/^([ \t]*)>[ \t]?/.test(line);
      const toggleOff=lines.some(x=>x.trim())&&lines.filter(x=>x.trim()).every(quoted);
      newLines=lines.map(line=>{
        if(!line.trim())return emptySingleLine?line+'> ':line;
        if(toggleOff)return line.replace(/^([ \t]*)>[ \t]?/,'$1');
        const indent=line.match(/^[ \t]*/)[0];
        return indent+'> '+line.slice(indent.length);
      });
    }
    const replacement=newLines.join('\n');
    const first=lines[0]||'',updated=newLines[0]||'';
    const unmarked=s=>s.replace(/^([ \t]*)(?:#{1,6}[ \t]+|>[ \t]?)?/,'');
    const delta=(updated.length-unmarked(updated).length)-(first.length-unmarked(first).length);
    const newStart=start===end?Math.min(from+replacement.length,Math.max(from,start+delta)):from;
    const newEnd=start===end?newStart:from+replacement.length;
    return {text:text.slice(0,from)+replacement+text.slice(to),start:newStart,end:newEnd};
  }
  function applyToTextarea(textarea,kind,level=2,lang='zh'){
    if(!textarea)return false;
    const old=textarea.value;
    const result=transform(old,textarea.selectionStart||0,textarea.selectionEnd||0,kind,level,lang);
    if(!result)return false;
    textarea.focus();
    if(typeof textarea.setRangeText==='function')textarea.setRangeText(result.text,0,old.length,'end');
    else textarea.value=result.text;
    textarea.setSelectionRange?.(result.start,result.end);
    textarea.dispatchEvent(new Event('input',{bubbles:true}));
    return true;
  }
  window.TRNQuickFormat={transform,applyToTextarea};
})();