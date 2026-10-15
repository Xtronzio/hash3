export const INVERSE_BOARD_KEY='hash3_inverse_boards';
export const MAX_INVERSE_CELLS=33333;
export function validateInverseBoard(input){
 if(!input||!Array.isArray(input.terrain)||!input.terrain.length||input.terrain.length>MAX_INVERSE_CELLS)throw new Error('El dibujo necesita entre 1 y 33.333 celdas.');
 const seen=new Set(),terrain=[];
 for(const c of input.terrain){if(!Number.isSafeInteger(c?.x)||!Number.isSafeInteger(c?.y)||Math.abs(c.x)>166||Math.abs(c.y)>166)throw new Error('El dibujo debe caber en una cuadrícula de 333 × 333.');const k=`${c.x},${c.y}`;if(seen.has(k))throw new Error('El dibujo contiene celdas repetidas.');seen.add(k);terrain.push({x:c.x,y:c.y});}
 return {id:typeof input.id==='string'?input.id:crypto.randomUUID(),name:String(input.name||'Mi dibujo').trim().slice(0,40)||'Mi dibujo',terrain};
}
const fromRows=(id,name,rows)=>({id,name,terrain:rows.flatMap((row,y)=>[...row].flatMap((c,x)=>c==='1'?[{x,y}]:[]))});
export const INVERSE_PRESETS=Object.freeze([
 fromRows('heart','Corazón',['01100110','11111111','11111111','01111110','00111100','00011000']),
 fromRows('rocket','Cohete',['0001000','0011100','0011100','0011100','0111110','1111111','1101011','0001000']),
 fromRows('hash','Almohadilla',['00100100','00100100','11111111','00100100','00100100','11111111','00100100','00100100']),
 fromRows('square','Cuadrado',['111111','111111','111111','111111','111111','111111'])
]);
export function loadInverseBoards(storage){
 const raw=storage.getItem(INVERSE_BOARD_KEY);if(raw==null)return [];
 const list=JSON.parse(raw);if(!Array.isArray(list))throw new Error('No se pueden leer tus dibujos. Los datos se conservan.');
 return list.map(validateInverseBoard);
}
export function saveInverseBoard(storage,input){
 const board=validateInverseBoard(input),list=loadInverseBoards(storage),i=list.findIndex(b=>b.id===board.id);
 if(i<0)list.push(board);else list[i]=board;
 storage.setItem(INVERSE_BOARD_KEY,JSON.stringify(list));return board;
}
