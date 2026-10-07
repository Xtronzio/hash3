// Shared across list redraws: never duplicate a room read or exceed two reads.
export function createSnapshotQueue(read,onSnapshot=()=>{}){
 const pending=new Map(),jobs=[];let active=0;
 const pump=()=>{
   while(active<2&&jobs.length){
     const job=jobs.shift();
     if(!job.current()){pending.delete(job.key);job.resolve(null);continue;}
     active++;
     Promise.resolve().then(()=>read(job.code)).then(snapshot=>{onSnapshot(job.key,snapshot);job.resolve(snapshot);},job.reject).finally(()=>{pending.delete(job.key);active--;pump();});
   }
 };
 return {
   get:key=>pending.get(key),
   request(key,code,current=()=>true){
     if(pending.has(key))return pending.get(key);
     let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
     pending.set(key,promise);jobs.push({key,code,current,resolve,reject});pump();return promise;
   }
 };
}
