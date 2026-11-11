/* Migrate legacy paragraph align/indent tags through WYSIWYG editing.
 * The public reader and D1 continue using the existing Markdown format.
 * This module only reattaches safe, previously stored paragraph markers.
 */
(() => {
  'use strict';
  const MARKER=/<span data-trn-(?:align="(?:left|center|right)"|indent="[1-4]")><\/span>/g;
  const PREFIX=/^(?:(?:<span data-trn-align="(?:left|center|right)"><\/span>)|(?:<span data-trn-indent="[1-4]"><\/span>))+/;
  const STRUCTURAL=/^\s{0,3}(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|`{3,}|~{3,}|\|)/;
  function normalize(line){
    return String(line).replace(MARKER,'').replace(/<\/?[^>]+>/g,'')
      .replace(/&(?:nbsp|emsp);/g,' ').replace(/&amp;/g,'&')
      .replace(/[*_~`]/g,'').replace(/\s+/g,' ').trim().toLowerCase();
  }
  function paragraphs(raw){
    const lines=String(raw||'').replace(/\r\n?/g,'\n').split('\n');
    const units=[];
    let fence='';
    lines.forEach((line,i)=>{
      const mark=line.match(PREFIX)?.[0]||'';
      const rest=line.slice(mark.length),trimmed=rest.trim();
      const fenceMark=trimmed.match(/^(`{3,}|~{3,})/);
      if(fenceMark){
        if(!fence)fence=fenceMark[1][0];
        else if(fence===fenceMark[1][0])fence='';
        return;
      }
      if(fence||!trimmed||STRUCTURAL.test(rest)||/^</.test(trimmed))return;
      units.push({index:i,marker:mark,plain:normalize(rest)});
    });
    return {lines,units};
  }
  function similarity(a,b){
    if(a===b)return 1;
    if(!a||!b)return 0;
    if(a.includes(b)||b.includes(a))return Math.min(a.length,b.length)/Math.max(a.length,b.length);
    const aa=new Set(),bb=new Set();
    for(let i=0;i<a.length-1;i++)aa.add(a.slice(i,i+2));
    for(let i=0;i<b.length-1;i++)bb.add(b.slice(i,i+2));
    let matches=0;
    for(const part of aa)if(bb.has(part))matches++;
    return aa.size+bb.size?2*matches/(aa.size+bb.size):0;
  }
  function align(oldUnits,newUnits){
    const n=oldUnits.length,m=newUnits.length;
    // A bounded alignment prevents very long books from creating a huge DP
    // table; the inexpensive positional path is used for enormous documents.
    if((n+1)*(m+1)>2000000){
      const mapping=new Map(),lookahead=10;
      let j=0;
      for(let i=0;i<n&&j<m;i++){
        let best=j,bestScore=-1;
        for(let k=j;k<Math.min(m,j+lookahead);k++){
          const score=similarity(oldUnits[i].plain,newUnits[k].plain)-(k-j)*0.03;
          if(score>bestScore){bestScore=score;best=k;}
          if(score>=1)break;
        }
        if(bestScore>=0.25||n-i===m-j){mapping.set(i,best);j=best+1;}
      }
      return mapping;
    }
    const width=m+1,back=new Uint8Array((n+1)*width);
    let prev=new Float64Array(width),curr=new Float64Array(width);
    for(let j=1;j<=m;j++)prev[j]=j;
    for(let i=1;i<=n;i++){
      curr[0]=i;
      for(let j=1;j<=m;j++){
        const sim=similarity(oldUnits[i-1].plain,newUnits[j-1].plain);
        const diagonal=prev[j-1]+(sim===1?0:1.15-0.8*sim);
        const removal=prev[j]+1,addition=curr[j-1]+1;
        const pos=i*width+j;
        if(diagonal<=removal&&diagonal<=addition){curr[j]=diagonal;back[pos]=0;}
        else if(removal<=addition){curr[j]=removal;back[pos]=1;}
        else{curr[j]=addition;back[pos]=2;}
      }
      [prev,curr]=[curr,prev];
    }
    const mapping=new Map();
    let i=n,j=m;
    while(i>0&&j>0){
      const direction=back[i*width+j];
      if(direction===0){mapping.set(i-1,j-1);i--;j--;}
      else if(direction===1)i--;
      else j--;
    }
    return mapping;
  }
  function reconcile(original,visual){
    original=String(original||'');visual=String(visual||'');
    if(!original.includes('data-trn-align=')&&!original.includes('data-trn-indent='))return visual;
    const before=paragraphs(original),after=paragraphs(visual);
    if(!before.units.some(unit=>unit.marker))return visual;
    const mapping=align(before.units,after.units);
    let restored=0,missing=0;
    for(const [oldIndex,newIndex] of mapping){
      const unit=before.units[oldIndex],target=after.units[newIndex];
      if(!unit.marker)continue;
      const line=after.lines[target.index];
      // If current text already has a marker, honour its new formatting.
      if(PREFIX.test(line))continue;
      after.lines[target.index]=unit.marker+line;
      restored++;
    }
    for(let i=0;i<before.units.length;i++){
      if(before.units[i].marker&&!mapping.has(i))missing++;
    }
    return after.lines.join('\n');
  }
  window.TRNLegacyLayout={reconcile,paragraphs,align};
})();
