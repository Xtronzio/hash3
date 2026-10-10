import {advanceEcologyTurn} from '../../src/inhabitants.js';
export function completeEventTurns(room,now=1000,random=()=>0,turns=3){
 for(let i=0;i<turns;i++)advanceEcologyTurn(room,now+i,random);
 return room;
}
