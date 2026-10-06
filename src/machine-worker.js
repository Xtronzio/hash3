import {chooseMachineMove} from './machine.js';
import {chooseMachineCard} from './bot-inventory.js';
self.onmessage=({data})=>{
  try{self.postMessage({id:data.id,version:data.room.version,choice:chooseMachineCard(data.room)||chooseMachineMove(data.room)});}
  catch(error){self.postMessage({id:data.id,error:error.message});}
};
