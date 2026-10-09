// Run once per local save, after inventory initialization. Refunds are not draws:
// preserve every returned card even when it exceeds normal bag/type caps.
export function migrateLegacyWalls(game){
 if(!['solo','local'].includes(game.mode)||game.wallMigrationVersion===1)return false;
 const removed=new Map();
 game.frontiers=(game.frontiers||[]).filter(wall=>{
  const legacy=wall.type!=='border'&&(wall.cells?.length===3||!wall.cells&&wall.edges?.length===3);
  const owner=game.players.find(p=>p.id===wall.by);
  // Never destroy a barrier whose owner cannot be recovered from the save.
  if(!legacy||!owner)return true;
  removed.set(owner.id,(removed.get(owner.id)||0)+1);return false;
 });
 for(const [id,count]of removed){
  const player=game.players.find(p=>p.id===id);
  player.inventory.cards.frontier=(player.inventory.cards.frontier||0)+count;
  player.inventory.wallRefunds=(player.inventory.wallRefunds||0)+count;
  for(const pair of game.pairs||[])if(pair.pending&&pair.expander===id)delete pair.frontierUsed;
 }
 game.wallMigrationVersion=1;return true;
}
