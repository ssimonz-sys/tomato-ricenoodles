/* Persistent paragraph alignment and indentation for Tomato Ricenoodles.
   The harmless inline span markers survive Markdown, rich editing, and D1 storage. */
(() => {
  'use strict';
  const ALIGN=/^<span data-trn-align="(left|center|right)"><\/span>/;
  const INDENT=/^<span data-trn-indent="([1-4])"><\/span>/;
  const STRUCTURAL=/^\s{0,3}(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|`{3,}|~{3,}|\|)/;
  function parts(line) {
    let text=line,align='left',indent=0;
    const first=text.match(ALIGN);
    if(first){align=first[1];text=text.slice(first[0].length);}
    const second=text.match(INDENT);
    if(second){indent=Number(second[1]);text=text.slice(second[0].length);}
    return {text,align,indent};
  }
  function formattedLine(line,command) {
    const current=parts(line);
    if(command==='left'||command==='center'||command==='right')current.align=command;
    else if(command==='indent')current.indent=Math.min(4,current.indent+1);
    else if(command==='outdent')current.indent=Math.max(0,current.indent-1);
    else return line;
    return (current.align==='left'?'':'<span data-trn-align="'+current.align+'"></span>')+
      (current.indent?'<span data-trn-indent="'+current.indent+'"></span>':'')+current.text;
  }
  function apply(markdown,selection,command){
    const text=String(markdown||'');
    const lines=text.split('\n');
    const begin=Math.max(0,Math.min(lines.length-1,Number(selection?.[0]?.[0]||1)-1));
    let end=Math.max(begin,Math.min(lines.length-1,Number(selection?.[1]?.[0]||begin+1)-1));
    if(end>begin&&Number(selection?.[1]?.[1])===1)end--;
    const touched=new Set();
    let fence='';
    const fenced=[];
    for(let i=0;i<lines.length;i++){
      const match=lines[i].match(/^\s{0,3}(`{3,}|~{3,})/);
      if(match){if(!fence)fence=match[1][0];else if(match[1][0]===fence)fence='';fenced[i]=true;}
      else fenced[i]=!!fence;
    }
    for(let i=begin;i<=end;i++){
      if(!lines[i].trim()||fenced[i])continue;
      let start=i;
      while(start>0&&lines[start-1].trim()&&!fenced[start-1]&&!STRUCTURAL.test(lines[start-1]))start--;
      if(fenced[start]||STRUCTURAL.test(parts(lines[start]).text)||/^\s*</.test(parts(lines[start]).text))continue;
      touched.add(start);
    }
    const changes=[];
    for(const line of [...touched].sort((a,b)=>a-b)){
      const next=formattedLine(lines[line],command);
      if(next!==lines[line]){changes.push({line:line+1,old:lines[line],next});lines[line]=next;}
    }
    return {markdown:lines.join('\n'),changes};
  }
  window.TRNParagraphLayout={apply,formattedLine,parts};
})();