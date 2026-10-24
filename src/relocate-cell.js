import {key,terrainOf} from './game.js';
import {habitatBlocked} from './habitat-tools.js';
import {protectedTerritoryKeys} from './immunity.js';
import {snapshotMemo} from './snapshot-memo.js';
const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
// Iterative articulation-point analysis: removing a permitted cell cannot split
// an existing component, even in 33333-cell saves with old detached islands.
export function relocationSources(game){return snapshotMemo(game,'relocation-sources:'+game.version,()=>{
 const terrain=terrainOf(game),known=new Map(terrain.map(c=>[key(c.x,c.y),c])),disc=new Map(),low=new Map(),parent=new Map(),children=new Map(),cuts=new Set();let clock=0;
 for(const root of known.keys())if(!disc.has(root)){
  disc.set(root,++clock);low.set(root,clock);const stack=[{k:root,i:0}];
  while(stack.length){const f=stack.at(-1),p=known.get(f.k);
   if(f.i<4){const [dx,dy]=dirs[f.i++],n=key(p.x+dx,p.y+dy);if(!known.has(n))continue;
    if(!disc.has(n)){parent.set(n,f.k);children.set(f.k,(children.get(f.k)||0)+1);disc.set(n,++clock);low.set(n,clock);stack.push({k:n,i:0});}
    else if(parent.get(f.k)!==n)low.set(f.k,Math.min(low.get(f.k),disc.get(n)));
   }else{stack.pop();const par=parent.get(f.k);if(par!=null){low.set(par,Math.min(low.get(par),low.get(f.k)));if(parent.has(par)&&low.get(f.k)>=disc.get(par))cuts.add(par);}else if((children.get(f.k)||0)>1)cuts.add(f.k);}
  }
 }
 const occupied=new Set([...game.cells,...(game.inventoryEffects?.blocks||[]).filter(e=>e.remaining>0)].map(c=>key(c.x,c.y))),safe=protectedTerritoryKeys(game),anchors=new Set(game.pairs.map(p=>{const a=p.terrainAnchor||p.active;return key(a.x,a.y);}));
 return terrain.filter(c=>{const k=key(c.x,c.y);return !cuts.has(k)&&!anchors.has(k)&&!occupied.has(k)&&!safe.has(k)&&!habitatBlocked(game,c.x,c.y)&&!game.rodents?.some(r=>r.x===c.x&&r.y===c.y);});
 });}
