// Restore only known paid uses from saved forms; never award historical points.
export function initializeWildcardUsage(room){
 if(room.wildcardUsageVersion===1||!['solo','local'].includes(room.mode)||room.status==='finished')return false;
 const wildcards=new Map((room.cells||[]).filter(c=>c.symbol==='#').map(c=>[`${c.x},${c.y}`,c]));
 const explicit=new Set([...wildcards].filter(([,c])=>c.wildcardSymbol).map(([key])=>key));
 for(const form of room.forms||[])if(['X','O'].includes(form[0]))for(const key of form.slice(form.lastIndexOf(':')+1).split(';')){const c=wildcards.get(key);if(c&&!explicit.has(key))c.wildcardSymbol=form[0];}
 room.wildcardUsageVersion=1;return true;
}
export const wildcardFill=c=>c?.wildcardSymbol==='X'?'var(--red)':c?.wildcardSymbol==='O'?'var(--green)':'#c5cbd4';
