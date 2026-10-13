import geometry from '../design/brand-c/master.json' with {type:'json'};

// Approved C identity. One geometry for the current #33 and future #3 / #333.
export function familyWordmark(count=2){
 if(![1,2,3].includes(count))throw new Error('Brand family supports #3, #33 and #333.');
 const {height,hashWidth,firstGap,digitWidth,digitGap,color,hashRects,digitPath}=geometry;
 const width=hashWidth+firstGap+count*digitWidth+(count-1)*digitGap,label='#'+'3'.repeat(count);
 const hash=hashRects.map(([x,y,w,h,r])=>`<rect data-glyph="#" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`).join('');
 const digits=Array.from({length:count},(_,i)=>`<path data-glyph="3" transform="translate(${hashWidth+firstGap+i*(digitWidth+digitGap)} 0)" d="${digitPath}"/>`).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="brand-mark" data-brand="c-unframed" role="img" aria-label="${label}"><g fill="${color}" stroke="none">${hash}${digits}</g></svg>`;
}
export function familyIcon(count=2){
 const wordmark=familyWordmark(count),width=Number(wordmark.match(/viewBox="0 0 (\d+)/)[1]),scale=Math.min(416/width,240/geometry.height);
 const x=(512-width*scale)/2,y=(512-geometry.height*scale)/2;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" data-brand="c-unframed" role="img" aria-label="#${'3'.repeat(count)}"><rect data-brand-background="true" width="512" height="512" fill="${geometry.background}"/><g transform="translate(${x} ${y}) scale(${scale})">${wordmark.slice(wordmark.indexOf('><g')+1,-6)}</g></svg>`;
}
export const brandMark=familyWordmark(2);
