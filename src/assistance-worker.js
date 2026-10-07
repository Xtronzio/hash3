import {planSuperHelp,suggestExpansion} from './assistance.js';
self.onmessage=({data})=>{
 try{self.postMessage({id:data.room.id,version:data.room.version,result:data.kind==='expand'?suggestExpansion(data.room,data.player):planSuperHelp(data.room,data.player,data.now)});}
 catch(error){self.postMessage({error:error.message});}
};
