export const WORM_TURN_INTERVAL=3,WORM_TAIL_LIMIT=3;
export const isTurnWorm=w=>w?.turnDriven===true;
export const wormTurnsToMeal=w=>Math.max(0,WORM_TURN_INTERVAL-(w.turnsSinceMeal||0));
export const wormMealsLeft=w=>Math.max(0,(w.mealLimit||3)-(w.eaten||0));
export function initializeTurnWorms(room){
 if(!['solo','local'].includes(room.mode)||room.status==='finished')return;
 room.wormAppearances??=(room.worms?.length?1:0);
 for(const w of room.worms||[]){
  if(isTurnWorm(w))continue;
  w.turnDriven=true;w.mealLimit=3;w.turnsSinceMeal=0;w.failedMeals||=0;w.body=(w.body||[{x:w.x,y:w.y}]).slice(-WORM_TAIL_LIMIT);
  delete w.nextAt;delete w.remainingMs;
 }
 room.wormLifecycleVersion=1;
}
