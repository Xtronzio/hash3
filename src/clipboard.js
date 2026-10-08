// Call at click time, before waiting for network work, to retain Safari's gesture.
export async function copyPreparedText(textPromise,{clipboard=globalThis.navigator?.clipboard,Item=globalThis.ClipboardItem,fallback=()=>false}={}){
 const text=Promise.resolve(textPromise);let attempt;
 if(clipboard?.write&&Item){
  const blob=text.then(value=>new Blob([value],{type:'text/plain'}));
  // The preparation can fail even if the clipboard rejects before reading it.
  blob.catch(()=>{});
  try{attempt=Promise.resolve(clipboard.write([new Item({'text/plain':blob})])).then(()=>true,()=>false);}catch{attempt=Promise.resolve(false);}
 }
 const value=await text;
 if(attempt&&await attempt)return true;
 return copyText(value,{clipboard,fallback});
}
export async function copyText(text,{clipboard=globalThis.navigator?.clipboard,fallback=()=>false}={}){
 try{if(clipboard?.writeText){await clipboard.writeText(text);return true;}}catch{}
 try{return !!fallback(text);}catch{return false;}
}
export function legacyCopyText(text,document=globalThis.document){
 const field=document.createElement('textarea'),focus=document.activeElement;
 field.value=text;field.readOnly=true;field.style.cssText='position:fixed;left:0;top:0;opacity:0;font-size:16px';
 document.body.append(field);field.focus();field.select();field.setSelectionRange(0,field.value.length);
 try{return document.execCommand('copy');}finally{field.remove();focus?.focus({preventScroll:true});}
}
