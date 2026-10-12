import {gzipSync,Gunzip,strToU8,strFromU8} from 'fflate';
import {loadLocalGames} from './sessions.js';
import {loadTerritoryResults} from './achievements.js';
import {freezeHabitats} from './inhabitants.js';
import {freezeImmunities} from './immunity.js';
import {VERSION_LABEL} from './version.js';

export const MAX_TRANSFER_BYTES=16*1024*1024,MAX_TRANSFER_PACKED=8*1024*1024,MAX_TRANSFER_URL=1900000;
const PREFIX='h33t1',RECEIPTS='hash3_transfer_receipts',RESULTS='hash3_completed_territories';
const keys=['hash3_locals','hash3_local','hash3_game_pins',RESULTS,'hash3_name',RECEIPTS];
const fail=()=>{throw Error('La copia no es válida o está incompleta. El navegador conserva sus partidas.');};
const array=(value,max=200000)=>Array.isArray(value)&&value.length<=max;
const text=(value,max=300)=>typeof value==='string'&&value.length>0&&value.length<=max;
const point=p=>Number.isSafeInteger(p?.x)&&Number.isSafeInteger(p?.y)&&Math.abs(p.x)<=1000000&&Math.abs(p.y)<=1000000;
const points=items=>array(items)&&items.every(point);
function safeTree(value,depth=0){
 if(depth>60)fail();
 if(value&&typeof value==='object')for(const k of Object.keys(value)){
  if(['__proto__','prototype','constructor'].includes(k))fail();safeTree(value[k],depth+1);
 }
}
export function validateTransfer(data){
 if(!data||data.format!=='hash33-local-transfer'||data.version!==1||!text(data.id,100)||!text(data.createdAt,40)||!Number.isFinite(Date.parse(data.createdAt))||!array(data.games,333)||!array(data.results,33333)||!array(data.pins,333)||typeof data.name!=='string'||data.name.length>18)fail();
 safeTree(data);const ids=new Set();
 for(const g of data.games){
  if(!text(g.id)||ids.has(g.id)||!['solo','local'].includes(g.mode)||!['paused','finished'].includes(g.status)||!array(g.players,2)||g.players.length!==2||!array(g.pairs,1)||g.pairs.length!==1||!array(g.terrain)||!g.terrain.length||!array(g.cells)||!array(g.forms)||!Number.isFinite(g.version)||g.version<0)fail();
  ids.add(g.id);const players=new Set();
  for(const p of g.players){
   if(!text(p.id,100)||players.has(p.id)||!text(p.name,100)||!['X','O'].includes(p.symbol)||!Number.isFinite(p.score)||p.score<0||!Number.isFinite(p.figures)||p.figures<0||!p.inventory||!p.inventory.cards)fail();
   players.add(p.id);
   for(const n of Object.values(p.inventory.cards))if(!Number.isSafeInteger(n)||n<0)fail();
  }
  const pair=g.pairs[0];if(!pair||!players.has(pair.x)||!players.has(pair.o)||pair.x===pair.o||!['X','O'].includes(pair.turn)||!['normal','advanced'].includes(g.level)||!['timed','untimed'].includes(g.timeMode))fail();
  if(g.players.find(p=>p.id===pair.x).symbol!=='X'||g.players.find(p=>p.id===pair.o).symbol!=='O'||g.mode==='solo'&&!players.has(g.humanId||pair.x))fail();
  for(const p of [...g.terrain,...g.cells])if(!Number.isSafeInteger(p?.x)||!Number.isSafeInteger(p?.y)||Math.abs(p.x)>1000000||Math.abs(p.y)>1000000)fail();
  for(const c of g.cells)if(!text(c.id)||!['X','O','*','#'].includes(c.symbol))fail();
  for(const field of ['worms','works','bombs','rodentRaids','territoryEvents','frontiers','invasions','watchTargets'])if(g[field]!=null&&!array(g[field]))fail();
  if(g.inventoryEffects){for(const field of ['blocks','shields','forced','immunities'])if(g.inventoryEffects[field]!=null&&!array(g.inventoryEffects[field]))fail();}
  for(const w of g.worms||[])if(!point(w)||!text(w.id)||!points(w.body||[]))fail();
  for(const w of g.works||[])if(!text(w.id)||!points(w.build||[])||!points(w.destroy||[])||!Number.isFinite(w.done))fail();
  for(const f of g.frontiers||[])if(!text(f.id)||f.cells!=null&&!points(f.cells)||f.edges!=null&&(!array(f.edges)||f.edges.some(e=>!point(e.a)||!point(e.b))))fail();
  for(const e of g.territoryEvents||[])if(!text(e.id)||!text(e.kind)||!points(e.region)||e.groups!=null&&(!array(e.groups)||e.groups.some(group=>!points(group))))fail();
  for(const e of g.watchTargets||[])if(!point(e)||!text(e.id))fail();
  for(const e of g.rodentRaids||[])if(!text(e.id)||!array(e.members||[])||!points(e.visited||[]))fail();
 }
 for(const r of data.results)if(!text(r?.game)||!['solo','local'].includes(r.mode)||!['board-limit','time-limit','move-limit'].includes(r.kind)||!Number.isFinite(r.limit)||!array(r.players,2)||r.players.some(p=>!Number.isFinite(p.score)||p.score<0))fail();
 for(const pin of data.pins)if(!text(pin)||!ids.has(pin))fail();
 return data;
}
function readArray(storage,key){
 const raw=storage.getItem(key);if(raw==null)return [];
 try{const value=JSON.parse(raw);if(Array.isArray(value))return value;}catch{}
 throw Error('No se pueden leer los guardados de este navegador. No se ha sustituido ninguno.');
}
export function transferGames(storage,now=Date.now()){
 // Existing migration logic can write only to this in-memory copy, never the origin.
 const values=new Map(keys.map(k=>[k,storage.getItem(k)]));
 const memory={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 return loadLocalGames(memory,now);
}
function pausedCopy(game,now){
 const copy=structuredClone(game);if(copy.status!=='playing')return copy;
 // Freeze at the last persisted instant; transport never replays elapsed moves/events.
 const recorded=Date.parse(copy.updatedAt),at=Number.isFinite(recorded)?Math.min(now,recorded):now;
 freezeHabitats(copy,at);freezeImmunities(copy,at);
 if(copy.matchGoal?.type==='time')copy.matchRemainingMs=Math.max(0,Date.parse(copy.endsAt)-at);
 copy.pauseRemainingMs=copy.timeMode==='untimed'?null:Math.max(0,Date.parse(copy.pairs[0].deadline)-at);
 copy.pairs[0].deadline=null;copy.status='paused';copy.pausedAt=new Date(at).toISOString();copy.clockNow=at;
 return copy;
}
export function captureTransfer(storage,{ids=null,now=Date.now(),id=crypto.randomUUID()}={}){
 const all=transferGames(storage,now),selected=ids?new Set(ids):null,games=all.filter(g=>!selected||selected.has(g.id)).map(g=>pausedCopy(g,now));
 const transferred=new Set(games.map(g=>g.id)),allIds=new Set(all.map(g=>g.id));
 const results=loadTerritoryResults(storage,all).filter(r=>transferred.has(r.game)||!allIds.has(r.game));
 const pins=readArray(storage,'hash3_game_pins').filter(p=>typeof p==='string'&&p.startsWith('local:')&&transferred.has(p.slice(6))).map(p=>p.slice(6));
 if(!games.length&&!results.length)throw Error('No hay partidas guardadas para trasladar.');
 return validateTransfer({format:'hash33-local-transfer',version:1,id,createdAt:new Date(now).toISOString(),sourceVersion:VERSION_LABEL,name:(storage.getItem('hash3_name')||'').slice(0,18),games,results,pins});
}
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
async function digest(bytes){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)));}
function base64url(bytes){let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
function from64(value){
 if(!/^[A-Za-z0-9_-]+$/.test(value)||value.length>Math.ceil(MAX_TRANSFER_PACKED*4/3)||value.length%4===1)fail();
 let raw;try{raw=atob(value.replaceAll('-','+').replaceAll('_','/'));}catch{fail();}
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
export async function encodeTransfer(data){
 validateTransfer(data);const raw=strToU8(JSON.stringify(data));if(raw.length>MAX_TRANSFER_BYTES)throw Error('La copia supera el tamaño admitido. Selecciona menos partidas.');
 const packed=gzipSync(raw,{level:6,mtime:0});if(packed.length>MAX_TRANSFER_PACKED)throw Error('La copia es demasiado grande. Selecciona menos partidas.');
 return `${PREFIX}.${await digest(packed)}.${base64url(packed)}`;
}
export async function decodeTransfer(token){
 if(typeof token!=='string'||token.length>Math.ceil(MAX_TRANSFER_PACKED*4/3)+100)fail();
 const parts=token.split('.');if(parts.length!==3||parts[0]!==PREFIX||!/^[a-f0-9]{64}$/.test(parts[1]))fail();
 const packed=from64(parts[2]);if(packed.length<18||await digest(packed)!==parts[1])fail();
 // Bound expansion before JSON parsing, including intentionally forged gzip sizes.
 let length=0,done=false;const chunks=[],inflater=new Gunzip((chunk,last)=>{length+=chunk.length;if(length>MAX_TRANSFER_BYTES)fail();chunks.push(chunk);done=last;});
 try{for(let i=0;i<packed.length;i+=256)inflater.push(packed.subarray(i,i+256),i+256>=packed.length);}catch{fail();}
 if(!done)fail();const raw=new Uint8Array(length);let offset=0;for(const c of chunks){raw.set(c,offset);offset+=c.length;}
 let data;try{data=JSON.parse(strFromU8(raw));}catch{fail();}
 return {data:validateTransfer(data),digest:parts[1],token};
}
const path=p=>p.replace(/\/index\.html$/,'/').replace(/\/?$/,'/');
export function transferToken(input,base){
 try{
  if(typeof input!=='string'||input.length>MAX_TRANSFER_URL)return null;
  const url=new URL(input.trim()),site=new URL(base),params=new URLSearchParams(url.hash.slice(1));
  if(url.origin!==site.origin||path(url.pathname)!==path(site.pathname)||url.username||url.password||url.search||[...params].length!==1)return null;
  const token=params.get('traslado');return token?.startsWith(PREFIX+'.')?token:null;
 }catch{return null;}
}
export function transferUrl(token,base){
 const url=new URL(base);url.search='';url.hash=new URLSearchParams({traslado:token}).toString();return url.href.length<=MAX_TRANSFER_URL?url.href:null;
}
function receipts(storage){
 const raw=storage.getItem(RECEIPTS);if(raw==null)return {};
 try{const value=JSON.parse(raw);if(value&&typeof value==='object'&&!Array.isArray(value)){safeTree(value);return value;}}catch{}
 throw Error('No se puede verificar el traslado anterior. Tus partidas se conservan.');
}
function destinationGames(storage){
 if(storage.getItem('hash3_locals')!=null)return readArray(storage,'hash3_locals');
 const raw=storage.getItem('hash3_local');if(!raw)return [];
 let old;try{old=JSON.parse(raw);}catch{throw Error('No se puede leer la partida antigua de este navegador.');}
 return old?.mode&&old?.players?[old]:[];
}
export function transferPreview(storage,decoded){
 validateTransfer(decoded.data);const ledger=receipts(storage),existing=destinationGames(storage),ids=new Set(existing.map(g=>g?.id));
 return {games:decoded.data.games.length,results:decoded.data.results.length,existing:existing.length,collisions:decoded.data.games.filter(g=>ids.has(g.id)).length,already:!!ledger[decoded.digest]};
}
export function importTransfer(storage,decoded,{now=Date.now(),newId=()=>crypto.randomUUID()}={}){
 const {data,digest:checksum}=decoded;validateTransfer(data);if(!/^[a-f0-9]{64}$/.test(checksum))fail();
 const ledger=receipts(storage);if(ledger[checksum])return {added:0,already:true};
 const original=new Map(keys.map(k=>[k,storage.getItem(k)])),existing=destinationGames(storage),results=readArray(storage,RESULTS),pins=readArray(storage,'hash3_game_pins');
 const occupied=new Set([...existing.map(g=>g?.id),...results.map(r=>r?.game)]),mapping=new Map(),allocate=old=>{
  if(mapping.has(old))return mapping.get(old);let id=old;
  if(occupied.has(id)){for(let tries=0;tries<100;tries++){id='transfer-'+newId();if(text(id)&&!occupied.has(id))break;}if(occupied.has(id)||!text(id))throw Error('No se pudo crear una copia independiente.');}
  occupied.add(id);mapping.set(old,id);return id;
 };
 const incoming=data.games.map(source=>{
  const g=structuredClone(source);g.id=allocate(source.id);
  if(g.finalResult?.game)g.finalResult.game=g.id;
  g.transferOrigin={bundle:data.id,game:source.id,at:new Date(now).toISOString()};return g;
 });
 const incomingResults=data.results.map(source=>({...structuredClone(source),game:allocate(source.game)}));
 const nextPins=[...new Set([...pins,...data.pins.map(id=>'local:'+mapping.get(id))])];
 const writes=new Map([
  ['hash3_locals',JSON.stringify([...existing,...incoming])],
  [RESULTS,JSON.stringify([...results,...incomingResults])],
  ['hash3_game_pins',JSON.stringify(nextPins)],
  [RECEIPTS,JSON.stringify({...ledger,[checksum]:{id:data.id,games:incoming.map(g=>g.id),at:new Date(now).toISOString()}})]
 ]);
 if(!original.get('hash3_name')&&data.name)writes.set('hash3_name',data.name);
 const changed=[];
 try{
  for(const [k,v]of writes){storage.setItem(k,v);changed.push(k);if(storage.getItem(k)!==v)throw Error('El navegador no ha guardado la copia.');}
 }catch{
  // The large collection is a single write. Undo successful ancillary writes if quota fails.
  for(const k of changed.reverse()){const previous=original.get(k);if(previous==null)storage.removeItem(k);else storage.setItem(k,previous);}
  throw Error('No hay espacio para añadir la copia. Las partidas anteriores se conservan; libera espacio o prueba otro navegador.');
 }
 return {added:incoming.length,results:incomingResults.length,already:false};
}
