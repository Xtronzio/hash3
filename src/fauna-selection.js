// Historical keys remain readable in saves/results, but are not new choices.
export const STORED_FAUNA=Object.freeze(['rodent','rodent-plague','worm','worm-plague','rhino','rhino-plague','beaver','beaver-plague','anaconda','ants','ants-plague','build','destroy']);
export const SELECTABLE_FAUNA=Object.freeze(STORED_FAUNA.filter(k=>!k.startsWith('beaver')));
export const beaversRetired=room=>['solo','local'].includes(room?.mode)&&room.variant!=='inverse'&&(room.ruleVersion||0)>=28&&room.status!=='finished';
export function retireBeavers(room){
 if(!beaversRetired(room))return;
 if(room.faunaEvents?.some(e=>e.kind==='beaver'||e.kind==='beaver-plague'))room.faunaEvents=room.faunaEvents.filter(e=>!['beaver','beaver-plague'].includes(e.kind));
 if(room.frontiers?.some(f=>f.type==='beaver'))room.frontiers=room.frontiers.filter(f=>f.type!=='beaver');
 if(Array.isArray(room.fauna))room.fauna=room.fauna.filter(k=>!k.startsWith('beaver'));
 for(const z of room.habitatZones||[])for(const field of ['next','credit','birthScale','clockNext','clockRemaining'])if(z[field])delete z[field].beaver;
 // Do not reset rhythm, reroll pending events, refund stock or alter history.
}
export const FAUNA_NAMES=Object.freeze({rodent:'Ratón','rodent-plague':'Plaga de ratones',worm:'Gusano','worm-plague':'Plaga de gusanos',rhino:'Rinoceronte','rhino-plague':'Plaga de rinocerontes',beaver:'Castor','beaver-plague':'Plaga de castores',anaconda:'Anaconda',ants:'Hormigas','ants-plague':'Plaga de hormigas',build:'Ampliadores',destroy:'Soldados'});
export function normalizeFauna(value){
 if(value==null)return [...SELECTABLE_FAUNA];
 if(!Array.isArray(value)||value.some(k=>!STORED_FAUNA.includes(k)))throw Error('La selección de fauna no es válida.');
 return SELECTABLE_FAUNA.filter(k=>value.includes(k));
}
export function faunaKindEnabled(room,kind){
 if(room.variant==='inverse'||room.faunaEnabled===false)return false;
 if(beaversRetired(room)&&kind.startsWith('beaver'))return false;
 if(!['solo','local'].includes(room.mode)||!Array.isArray(room.fauna))return true;
 if(kind==='work')return room.fauna.includes('build')||room.fauna.includes('destroy');
 if(kind==='beaver-barrier')return room.fauna.includes('beaver')||room.fauna.includes('beaver-plague');
 return room.fauna.includes(kind);
}
export const faunaFamilyEnabled=(room,kind)=>faunaKindEnabled(room,kind)||faunaKindEnabled(room,kind+'-plague');
export function skipFaunaBirth(room,kind,zone){
 const variant=(zone.birthScale?.[kind]||0)%2?kind+'-plague':kind;
 if(faunaKindEnabled(room,variant))return false;
 // Consume the original variant's slot without replacing it or changing cadence.
 zone.birthScale||={};zone.birthScale[kind]=(zone.birthScale[kind]||0)+1;return true;
}
export function faunaComparison(room){
 if(room.faunaEnabled===false||room.fauna==null)return null;
 const catalogue=(room.ruleVersion||0)>=28?SELECTABLE_FAUNA:STORED_FAUNA;
 const selected=catalogue.filter(k=>room.fauna.includes(k));return selected.length===catalogue.length?null:selected.join(',');
}
export const faunaDescription=room=>((room.ruleVersion||0)>=28?normalizeFauna(room.fauna):STORED_FAUNA.filter(k=>room.fauna==null||room.fauna.includes(k))).map(k=>FAUNA_NAMES[k]).join(', ');
