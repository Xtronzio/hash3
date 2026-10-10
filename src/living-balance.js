// Local R0.21.35 only. The prepared SQL/online rules remain isolated.
export const localLiving=room=>['solo','local'].includes(room?.mode);
export const LIVING_FREQUENCIES=Object.freeze({rodent:66,worm:33,work:66,bomb:66});
export const LIVING_CLOCKS=Object.freeze({rodent:132000,worm:198000,work:165000});
export const livingFactor=size=>Math.max(1,Math.round(Math.sqrt(Math.max(0,size)/333)));
export const livingInterval=(frequency,size)=>3*Math.ceil(frequency*Math.sqrt(livingFactor(size))/3);
export const livingClock=(kind,size)=>33000*Math.ceil(LIVING_CLOCKS[kind]*Math.sqrt(livingFactor(size))/33000);
export const livingMinimum=room=>localLiving(room)?33:99;
export const livingAttempt=(room,family)=>localLiving(room)?family==='invaders'?33:99:null;
export const livingEventClock=(room,family)=>family==='invaders'?99000:room.matchGoal?.type==='time'&&room.matchGoal.target===180?99000:198000;
export const livingFirstClock=(room,family)=>family==='invaders'?66000:livingEventClock(room,family);
export function livingImpact(room,kind,rule){
 const n=room.terrain?.length||0,f=livingFactor(n);
 if(kind==='invader-rain')return 3*f;
 if(kind==='invader-colony')return f;
 if(kind==='blackhole')return 9*f;
 if(kind==='tornado')return 9;
 if(kind==='contagion')return 3*f;
 const size=rule.basis==='pieces'?room.cells.length:n;
 const rate=rule.effect==='demolish'?.03:rule.effect==='vacate'?.06:.09;
 const cap=(rule.effect==='demolish'?33:rule.effect==='vacate'?66:99)*f;
 return Math.min(cap,3*Math.floor(size*rate/3));
}
export function livingBirthBudget(zone,kind,size,weights){
 zone.credit||={};
 const credit=(zone.credit[kind]||0)+livingFactor(size)*weights[kind];
 const unit=kind==='rodent'?3:1,count=unit*Math.floor(credit/unit);
 zone.credit[kind]=credit-count;return count;
}
export function freezeLiving(room,now){
 if(!localLiving(room))return;
 for(const key of ['territoryNextNaturalAt','territoryNextInvaderAt'])if(Number.isFinite(room[key]))room[key+'Remaining']=Math.max(0,room[key]-now);
 for(const z of room.habitatZones||[])z.clockRemaining=Object.fromEntries(Object.entries(z.clockNext||{}).map(([k,v])=>[k,Math.max(0,v-now)]));
}
export function resumeLiving(room,now){
 if(!localLiving(room))return;
 for(const key of ['territoryNextNaturalAt','territoryNextInvaderAt'])if(room[key+'Remaining']!=null){room[key]=now+room[key+'Remaining'];delete room[key+'Remaining'];}
 for(const z of room.habitatZones||[])if(z.clockRemaining){z.clockNext=Object.fromEntries(Object.entries(z.clockRemaining).map(([k,v])=>[k,now+v]));delete z.clockRemaining;}
}
