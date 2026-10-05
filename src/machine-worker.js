import {chooseMachineMove} from './machine.js';
self.onmessage=({data})=>{
  try{self.postMessage({id:data.id,version:data.room.version,choice:chooseMachineMove(data.room)});}
  catch(error){self.postMessage({id:data.id,error:error.message});}
};
