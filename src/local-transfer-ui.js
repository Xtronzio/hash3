import {captureTransfer,transferGames,encodeTransfer,decodeTransfer,transferToken,transferUrl,transferPreview,importTransfer,MAX_TRANSFER_PACKED} from './local-transfer.js';
import {copyText,legacyCopyText} from './clipboard.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=kind=>`<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${{
 link:'<rect x="2" y="2" width="11" height="11" rx="2"/><path d="m5 5 5 5m0-5-5 5m8 3 6 6"/><rect x="19" y="19" width="11" height="11" rx="2"/><circle cx="24.5" cy="24.5" r="2.5"/>',
 copy:'<rect x="9" y="9" width="18" height="18" rx="3"/><path d="M21 9V6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h3"/>',
 file:'<path d="M20 3H6v26h20V9ZM20 3v6h6M16 12v10m-4-4 4 4 4-4"/>',
 share:'<path d="M16 22V3m-6 6 6-6 6 6M8 13H4v16h24V13h-4"/>',
 check:'<path d="m6 16 7 7L27 9"/>'
 }[kind]}</svg>`;
export function localTransferSectionsMarkup(){return `
 <section class="profile-section local-transfer" aria-labelledby="transfer-title">
  <div class="profile-section-title"><span class="profile-section-number">02</span><div><h3 id="transfer-title">Lleva tus partidas contigo</h3><p>Continúa VS máquina y Sin conexión en otro navegador.</p></div></div>
  <p class="transfer-explanation">El enlace lleva una copia con tablero, puntos, inventario, reservas y logros. El original se conserva. Las nuevas jugadas no actualizan esa copia.</p>
  <details class="transfer-selection"><summary>Partidas que llevarás <span id="transfer-selection-count"></span></summary><div id="transfer-game-list"></div></details>
  <div class="profile-link-actions transfer-actions"><button type="button" class="primary" data-transfer-action="generate">${icon('link')}<span>Generar enlace</span></button><button type="button" data-transfer-action="copy" hidden>${icon('copy')}<span>Copiar enlace</span></button><button type="button" data-transfer-action="share" hidden>${icon('share')}<span>Compartir</span></button><button type="button" data-transfer-action="download" hidden>${icon('file')}<span>Guardar copia</span></button></div>
  <div class="profile-ready" id="transfer-ready" hidden><span class="profile-ready-tag">${icon('check')} COPIA PREPARADA</span><p id="transfer-summary"></p><textarea id="transfer-export" aria-label="Enlace de traslado de tus partidas" rows="2" readonly spellcheck="false"></textarea><p>Quien tenga el enlace podrá obtener esta copia. Guárdalo para ti.</p></div>
  <p id="transfer-generate-status" class="profile-status" role="status" aria-live="polite"></p>
 </section>
 <section class="profile-section local-transfer" aria-labelledby="transfer-import-title">
  <div class="profile-section-title"><span class="profile-section-number">03</span><div><h3 id="transfer-import-title">Recupera tu copia</h3><p>Abre el enlace o pégalo aquí en el navegador de destino.</p></div></div>
  <form id="transfer-import-form" class="transfer-import-form"><label class="sr-only" for="transfer-link">Enlace de traslado</label><textarea id="transfer-link" rows="2" autocapitalize="off" spellcheck="false" placeholder="Pega aquí tu enlace de #33" required></textarea><button type="submit">${icon('check')}<span>Revisar copia</span></button></form>
  <label class="transfer-file-choice">${icon('file')} Abrir una copia guardada<input type="file" id="transfer-file" accept=".hash33,text/plain,application/octet-stream"></label>
  <section id="transfer-preview" class="transfer-preview" aria-label="Copia por añadir" hidden></section>
  <p id="transfer-import-status" class="profile-status" role="status" aria-live="polite"></p>
 </section>`;}
export function bindLocalTransfer(root,{storage,base,incoming=null,onImported=()=>{},onCancelled=()=>{}}){
 let prepared=null,pending=null,working=false;
 const find=s=>root.querySelector(s),status=(id,message,state='info')=>{const el=find('#'+id);if(el){el.textContent=message;el.dataset.state=state;}};
 const busy=value=>{working=value;for(const el of root.querySelectorAll('[data-transfer-action],#transfer-import-form button,#transfer-file'))el.disabled=value;};
 try{
  const games=transferGames(storage);find('#transfer-selection-count').textContent=`· ${games.length}`;
  find('#transfer-game-list').innerHTML=games.map(g=>`<label><input type="checkbox" value="${esc(g.id)}" checked><span>${g.mode==='solo'?'VS máquina':'Sin conexión'} · ${esc(g.players.find(p=>p.id===(g.humanId||g.pairs[0].x))?.name)}<small>${g.terrain.length.toLocaleString('es-ES')} celdas · ${g.players.map(p=>`${esc(p.symbol)} ${Number(p.score).toLocaleString('es-ES')}`).join(' · ')}</small></span></label>`).join('')||'<p>Los logros archivados también se incluirán.</p>';
 }catch(error){status('transfer-generate-status',error.message,'error');}
 async function review(token){
  if(working)return;busy(true);pending=null;find('#transfer-preview').hidden=true;status('transfer-import-status','Comprobando la copia…');
  try{
   const decoded=await decodeTransfer(token);if(!root.isConnected)return;
   const preview=transferPreview(storage,decoded);pending=decoded;const box=find('#transfer-preview');
   box.innerHTML=`<h4>${esc(decoded.data.name||'Tu copia')}</h4><p><strong>${preview.games}</strong> partidas · <strong>${preview.results}</strong> logros<br>Preparada el ${esc(new Date(decoded.data.createdAt).toLocaleString('es-ES'))}</p><p>${preview.already?'Esta copia ya se añadió. No se duplicará.':`Se conservan las ${preview.existing} partidas de este navegador.${preview.collisions?' '+preview.collisions+' coincidencias se añadirán como copias independientes.':''} Las partidas activas llegan pausadas.`}</p>${preview.already?'':`<button type="button" class="primary" data-transfer-action="apply">${icon('check')}<span>Añadir mis partidas</span></button>`}<button type="button" data-transfer-action="cancel">Cancelar</button>`;
   box.hidden=false;status('transfer-import-status',preview.already?'Copia ya recuperada. Tus avances actuales se conservan.':'Copia verificada. Puedes añadirla sin sustituir tus partidas.','ok');
   box.scrollIntoView({block:'nearest'});box.querySelector('button')?.focus({preventScroll:true});
   if(new URLSearchParams(location.hash.slice(1)).has('traslado'))history.replaceState(null,'',location.pathname+location.search);
  }catch(error){status('transfer-import-status',error.message,'error');}finally{if(root.isConnected)busy(false);}
 }
 root.addEventListener('click',async event=>{
  const button=event.target.closest('[data-transfer-action]');if(!button||working)return;
  event.preventDefault();const action=button.dataset.transferAction;
  if(action==='cancel'){pending=null;find('#transfer-preview').hidden=true;find('#transfer-link').value='';status('transfer-import-status','Copia cancelada. No se ha añadido ninguna partida.');onCancelled();return;}
  if(action==='copy'){
   if(!prepared?.link)return;
   const copied=await copyText(prepared.link,{fallback:legacyCopyText});if(!copied){find('#transfer-export').focus();find('#transfer-export').select();}
   status('transfer-generate-status',copied?'Enlace copiado. Pégalo en el otro navegador.':'Selecciona el enlace y utiliza Copiar; también puedes guardar la copia.',copied?'ok':'info');return;
  }
  if(action==='share'){
   if(prepared?.link&&navigator.share)try{await navigator.share({title:'#33 · Mis partidas',url:prepared.link});}catch(error){if(error.name!=='AbortError')status('transfer-generate-status','No se pudo compartir el enlace. Usa Copiar enlace o Guardar copia.','error');}return;
  }
  if(action==='download'){
   if(!prepared)return;const url=URL.createObjectURL(new Blob([prepared.token],{type:'text/plain'})),link=document.createElement('a');
   link.href=url;link.download=`hash33-partidas-${prepared.data.createdAt.slice(0,10)}.hash33`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);status('transfer-generate-status','Copia preparada para guardar. Ábrela desde Perfil en el otro navegador.','ok');return;
  }
  if(action==='generate'){
   busy(true);prepared=null;find('#transfer-ready').hidden=true;for(const b of root.querySelectorAll('[data-transfer-action="copy"],[data-transfer-action="share"],[data-transfer-action="download"]'))b.hidden=true;
   status('transfer-generate-status','Preparando la copia completa…');
   try{
    const ids=[...root.querySelectorAll('#transfer-game-list input:checked')].map(el=>el.value),data=captureTransfer(storage,{ids}),token=await encodeTransfer(data),link=transferUrl(token,base);
    if(!root.isConnected)return;prepared={data,token,link};find('#transfer-ready').hidden=false;find('#transfer-export').hidden=!link;find('#transfer-export').value=link||'';
    find('#transfer-summary').textContent=`${data.games.length} partidas · ${data.results.length} logros · ${Math.ceil(token.length/1024).toLocaleString('es-ES')} KB`;
    find('[data-transfer-action="copy"]').hidden=!link;find('[data-transfer-action="share"]').hidden=!link||typeof navigator.share!=='function';find('[data-transfer-action="download"]').hidden=false;
    status('transfer-generate-status',link?'Enlace listo. Copia preparada sin cambiar el original.':'La copia completa es demasiado grande para un enlace. Usa Guardar copia y ábrela en el otro navegador.','ok');
   }catch(error){status('transfer-generate-status',error.message,'error');}finally{if(root.isConnected)busy(false);}return;
  }
  if(action==='apply'&&pending){
   busy(true);try{
    const apply=()=>importTransfer(storage,pending),result=navigator.locks?await navigator.locks.request('hash33-local-transfer',apply):apply();
    pending=null;find('#transfer-preview').hidden=true;status('transfer-import-status',result.already?'Esta copia ya estaba añadida.':`${result.added} partidas añadidas. Abre Mis partidas para continuar.`,'ok');onImported(result);
   }catch(error){status('transfer-import-status',error.message,'error');}finally{if(root.isConnected)busy(false);}
  }
 });
 find('#transfer-import-form').addEventListener('submit',event=>{
  event.preventDefault();const token=transferToken(find('#transfer-link').value,base);
  if(!token){pending=null;find('#transfer-preview').hidden=true;status('transfer-import-status','Pega un enlace de traslado completo de #33. Las partidas actuales se conservan.','error');return;}void review(token);
 });
 find('#transfer-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file||working)return;pending=null;find('#transfer-preview').hidden=true;
  if(file.size>Math.ceil(MAX_TRANSFER_PACKED*4/3)+100){status('transfer-import-status','La copia supera el tamaño admitido. No se ha importado.','error');return;}
  busy(true);try{const token=(await file.text()).trim();busy(false);if(root.isConnected)await review(token);}catch{status('transfer-import-status','No se pudo leer la copia.','error');}finally{if(root.isConnected)busy(false);event.target.value='';}
 });
 if(incoming){find('#transfer-link').value=incoming;const token=transferToken(incoming,base);if(token)void review(token);else status('transfer-import-status','El enlace no está completo o no pertenece a #33. Tus partidas se conservan.','error');}
}
