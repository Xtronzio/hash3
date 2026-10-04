import {VERSION_LABEL,BUILD_ID} from './version.js';

export function startUpdates({canReload,beforeReload,onReady}) {
  const base=new URL(import.meta.env.BASE_URL,location.origin),label=document.querySelector('#version-label'),status=document.querySelector('#version-status');
  label.textContent=VERSION_LABEL;
  let checking=false,pending=false,reloading=false,registration=null,controller=navigator.serviceWorker?.controller;
  const tryReload=()=>{
    if(!pending||reloading||document.hidden||!canReload())return;
    reloading=true;status.textContent='Actualizando…';beforeReload();location.reload();
  };
  const queueReload=()=>{pending=true;status.textContent='Nueva versión · actualizando…';tryReload();};
  async function check() {
    if(checking||document.hidden||!navigator.onLine)return;
    checking=true;
    try {
      const url=new URL('version.json',base);url.searchParams.set('t',String(Date.now()));
      const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(8000)});
      if(!response.ok)return;
      const next=await response.json();
      if(typeof next.build!=='string'||next.build===BUILD_ID)return;
      // A ready worker ensures the updated offline assets are stored before reload.
      if(registration&&navigator.serviceWorker.controller) {
        await registration.update();
        const installing=registration.installing;
        if(installing)await new Promise(resolve=>{
          const done=()=>{if(['activated','redundant'].includes(installing.state)){clearTimeout(timeout);installing.removeEventListener('statechange',done);resolve();}};
          const timeout=setTimeout(resolve,8000);installing.addEventListener('statechange',done);done();
        });
      }
      queueReload();
    }catch{/* Keep the cached version and local game when there is no connection. */}
    finally{checking=false;}
  }
  if('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      const previous=controller;controller=navigator.serviceWorker.controller;
      onReady();if(previous&&controller!==previous)queueReload();
    });
    const register=()=>navigator.serviceWorker.register(new URL('sw.js',base),{scope:base.pathname,updateViaCache:'none'}).then(r=>{registration=r;return navigator.serviceWorker.ready;}).then(onReady).catch(()=>{});
    if(document.readyState==='complete')register();else window.addEventListener('load',register,{once:true});
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){tryReload();check();}});
  window.addEventListener('online',check);
  window.addEventListener('focus',check);
  setInterval(check,60000);setInterval(tryReload,1000);check();
}
