// UI preparation belongs to the accepted snapshot, not to each preview tap or
// zoom. The WeakMap drops the old board when its snapshot is no longer retained.
const snapshots=new WeakMap();
export function snapshotMemo(snapshot,key,prepare){
 let entry=snapshots.get(snapshot);
 if(!entry||entry.version!==snapshot.version){entry={version:snapshot.version,values:new Map()};snapshots.set(snapshot,entry);}
 if(!entry.values.has(key))entry.values.set(key,prepare());
 return entry.values.get(key);
}
