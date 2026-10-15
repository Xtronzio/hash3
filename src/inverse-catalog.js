import {validateInverseBoard,MAX_INVERSE_CELLS,INVERSE_PRESETS} from './inverse-boards.js';
export const INVERSE_SCALES=Object.freeze([{id:'s',label:'S',target:33,factor:1},{id:'m',label:'M',target:333,factor:3},{id:'l',label:'L',target:3333,factor:10},{id:'xl',label:'XL',target:9999,factor:16}]);
const ellipse=(x,y,cx,cy,rx,ry)=>((x-cx)/rx)**2+((y-cy)/ry)**2<=1;
const box=(x,y,cx,cy,w,h)=>Math.abs(x-cx)<=w&&Math.abs(y-cy)<=h;
const polygon=(x,y,points)=>{let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
const star=Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?.43:.95;return [Math.cos(a)*r,Math.sin(a)*r];});
export const INVERSE_DRAWINGS=Object.freeze([
 {id:'heart',name:'Corazón',mask:(x,y)=>{const a=x*1.15,b=-y*1.15;return (a*a+b*b-1)**3-a*a*b**3<=0;}},
 {id:'rocket',name:'Cohete',mask:(x,y)=>(ellipse(x,y,0,-.12,.36,.79)||polygon(x,y,[[-.22,.05],[-.8,.75],[-.3,.64],[0,.95],[.3,.64],[.8,.75],[.22,.05]]))&&!ellipse(x,y,0,-.26,.14,.17)},
 {id:'hash',name:'Almohadilla',mask:(x,y)=>box(x,y,-.32,0,.13,.9)||box(x,y,.32,0,.13,.9)||box(x,y,0,-.32,.9,.13)||box(x,y,0,.32,.9,.13)},
 {id:'square',name:'Cuadrado',mask:(x,y)=>box(x,y,0,0,.9,.9)},
 {id:'star',name:'Estrella',mask:(x,y)=>polygon(x,y,star)},
 {id:'ring',name:'Anillo',mask:(x,y)=>x*x+y*y<.9**2&&x*x+y*y>.47**2},
 {id:'moon',name:'Luna',mask:(x,y)=>ellipse(x,y,0,0,.88,.9)&&!ellipse(x,y,.37,-.2,.74,.76)},
 {id:'butterfly',name:'Mariposa',mask:(x,y)=>ellipse(x,y,0,0,.10,.85)||((ellipse(x,y,-.49,-.3,.44,.53)||ellipse(x,y,.49,-.3,.44,.53)||ellipse(x,y,-.4,.47,.34,.37)||ellipse(x,y,.4,.47,.34,.37))&&!ellipse(x,y,Math.sign(x)*.5,-.3,.15,.2))},
 {id:'fish',name:'Pez',mask:(x,y)=>(ellipse(x,y,.15,0,.68,.43)||polygon(x,y,[[-.42,0],[-.95,-.57],[-.95,.57]]))&&!ellipse(x,y,.58,-.10,.08,.09)},
 {id:'cat',name:'Gato',mask:(x,y)=>(ellipse(x,y,0,.12,.76,.75)||polygon(x,y,[[-.69,-.08],[-.76,-.95],[-.12,-.49]])||polygon(x,y,[[.69,-.08],[.76,-.95],[.12,-.49]]))&&!ellipse(x,y,-.28,-.05,.12,.14)&&!ellipse(x,y,.28,-.05,.12,.14)},
 {id:'owl',name:'Búho',mask:(x,y)=>(ellipse(x,y,0,.18,.67,.75)||polygon(x,y,[[-.63,-.1],[-.72,-.9],[0,-.55],[.72,-.9],[.63,-.1]]))&&!ellipse(x,y,-.27,-.20,.18,.22)&&!ellipse(x,y,.27,-.20,.18,.22)},
 {id:'turtle',name:'Tortuga',mask:(x,y)=>ellipse(x,y,0,0,.60,.71)||ellipse(x,y,0,-.84,.23,.18)||[[-.6,-.43],[.6,-.43],[-.6,.45],[.6,.45]].some(([a,b])=>ellipse(x,y,a,b,.27,.22))},
 {id:'tree',name:'Árbol',mask:(x,y)=>box(x,y,0,.58,.16,.36)||ellipse(x,y,0,-.32,.72,.6)||ellipse(x,y,-.50,0,.38,.38)||ellipse(x,y,.5,0,.38,.38)},
 {id:'flower',name:'Flor',mask:(x,y)=>box(x,y,0,.43,.09,.48)||ellipse(x,y,-.26,.48,.27,.12)||Array.from({length:6},(_,i)=>i*Math.PI/3).some(a=>ellipse(x,y,.42*Math.cos(a),-.30+.42*Math.sin(a),.27,.27))||ellipse(x,y,0,-.3,.25,.25)},
 {id:'castle',name:'Castillo',mask:(x,y)=>(box(x,y,0,.30,.85,.6)||box(x,y,-.65,-.52,.2,.4)||box(x,y,0,-.50,.19,.41)||box(x,y,.65,-.52,.2,.4))&&!(y>.28&&Math.abs(x)<.20)&&!box(x,y,-.65,-.35,.07,.10)&&!box(x,y,.65,-.35,.07,.10)},
 {id:'skull',name:'Calavera',mask:(x,y)=>(ellipse(x,y,0,-.15,.81,.73)||box(x,y,0,.61,.51,.27))&&!ellipse(x,y,-.3,-.17,.20,.23)&&!ellipse(x,y,.3,-.17,.20,.23)&&!polygon(x,y,[[0,.06],[-.12,.32],[.12,.32]])&&!(y>.65&&(Math.abs(x-.25)<.055||Math.abs(x+.25)<.055))},
 {id:'robot',name:'Robot',mask:(x,y)=>(box(x,y,0,-.10,.70,.62)||box(x,y,0,-.83,.08,.15)||box(x,y,-.85,-.05,.14,.22)||box(x,y,.85,-.05,.14,.22))&&!box(x,y,-.3,-.25,.14,.14)&&!box(x,y,.3,-.25,.14,.14)&&!box(x,y,0,.25,.33,.07)},
 {id:'gamepad',name:'Mando',mask:(x,y)=>(ellipse(x,y,-.47,0,.45,.6)||ellipse(x,y,.47,0,.45,.6)||box(x,y,0,-.1,.5,.4))&&!(box(x,y,-.45,-.1,.22,.07)||box(x,y,-.45,-.1,.07,.22))&&!ellipse(x,y,.42,-.22,.08,.08)&&!ellipse(x,y,.61,.01,.08,.08)},
 {id:'ship',name:'Velero',mask:(x,y)=>polygon(x,y,[[-.94,.44],[.94,.44],[.59,.86],[-.59,.86]])||box(x,y,0,-.09,.035,.64)||polygon(x,y,[[-.07,-.88],[-.07,.28],[-.77,.28]])||polygon(x,y,[[.07,-.7],[.07,.28],[.71,.28]])},
 {id:'planet',name:'Planeta',mask:(x,y)=>ellipse(x,y,0,0,.60,.60)||(ellipse(x,y,0,0,.96,.3)&&!ellipse(x,y,0,0,.77,.16))},
 {id:'snowflake',name:'Copo de nieve',mask:(x,y)=>[0,Math.PI/3,2*Math.PI/3].some(a=>{const u=x*Math.cos(a)+y*Math.sin(a),v=-x*Math.sin(a)+y*Math.cos(a);return Math.abs(u)<.91&&Math.abs(v)<.095||Math.abs(u)>.4&&Math.abs(u)<.75&&Math.abs(Math.abs(v)-(.75-Math.abs(u)))<.06;})},
 {id:'maze',name:'Laberinto',mask:(x,y)=>{const r=Math.max(Math.abs(x),Math.abs(y));return r<.9&&(r>.72&&!(x>.1&&y<-.72)||r<.57&&r>.39&&!(x<-.39&&y>.1)||r<.24);}}
]);
const cache=new Map();
function raster(recipe,width){const terrain=[];for(let y=0;y<width;y++)for(let x=0;x<width;x++)if(recipe.mask((x+.5)/width*2-1,(y+.5)/width*2-1))terrain.push({x:x-Math.floor(width/2),y:y-Math.floor(width/2)});return terrain;}
export function scaledInverseBoard(board,scaleId='m'){
 const scale=INVERSE_SCALES.find(s=>s.id===scaleId)||INVERSE_SCALES[1],recipe=INVERSE_DRAWINGS.find(d=>d.id===board.id);
 if(scale.id==='s'&&!recipe)return validateInverseBoard(board);
 const cacheKey=recipe?`${recipe.id}:${scale.id}`:null;if(cacheKey&&cache.has(cacheKey))return cache.get(cacheKey);
 let terrain;
 if(recipe){
  if(scale.id==='s'&&(INVERSE_PRESETS.find(b=>b.id===board.id)?.terrain||board.terrain)?.length)terrain=INVERSE_PRESETS.find(b=>b.id===board.id)?.terrain||board.terrain;
  else{let low=3,high=333,best=null,difference=Infinity;while(low<=high){const width=Math.floor((low+high)/2),points=raster(recipe,width),d=Math.abs(points.length-scale.target);if(points.length<=MAX_INVERSE_CELLS&&d<difference){best=points;difference=d;}if(points.length<scale.target)low=width+1;else high=width-1;}terrain=best;}
 }else{
  const factor=scale.factor,points=board.terrain;if(points.length*factor*factor>MAX_INVERSE_CELLS)throw new Error('Este tamaño supera 33.333 celdas.');const minX=Math.min(...points.map(c=>c.x)),minY=Math.min(...points.map(c=>c.y));terrain=points.flatMap(c=>Array.from({length:factor*factor},(_,i)=>({x:(c.x-minX)*factor+i%factor,y:(c.y-minY)*factor+Math.floor(i/factor)})));
  if(terrain.length>MAX_INVERSE_CELLS)throw new Error('Este tamaño supera 33.333 celdas.');const maxX=Math.max(...terrain.map(c=>c.x)),maxY=Math.max(...terrain.map(c=>c.y));if(maxX>=333||maxY>=333)throw new Error('Este tamaño supera la cuadrícula de 333 × 333.');terrain=terrain.map(c=>({x:c.x-Math.floor(maxX/2),y:c.y-Math.floor(maxY/2)}));
 }
 const result=validateInverseBoard({id:board.id,name:board.name,terrain});result.scale=scale.id;result.scaleLabel=scale.label;if(cacheKey)cache.set(cacheKey,result);return result;
}
