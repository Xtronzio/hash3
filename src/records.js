export function recordCombo(player,{points=0,figures=0,automatic=false,moveId=null}={}){
  if(!automatic&&points>(player.bestCombo?.points||0))player.bestCombo={points,figures,moveId};
  return player;
}
export function comboLabel(player){return player.bestCombo?.points==null?'—':String(player.bestCombo.points);}
