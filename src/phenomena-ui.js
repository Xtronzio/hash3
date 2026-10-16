import {SELECTABLE_PHENOMENA,normalizePhenomena} from './phenomena-selection.js';
import {ecologyIcon,ecologyNames} from './ecology-navigation.js';
export function phenomenaPickerMarkup(value){
 let selected;try{selected=normalizePhenomena(value);}catch{selected=[...SELECTABLE_PHENOMENA];}
 return `<details class="phenomena-picker"><summary>Elegir fenómenos · <output>${selected.length}/${SELECTABLE_PHENOMENA.length}</output></summary><div class="phenomena-picker-actions"><button type="button" data-phenomena-preset="all">Todos</button><button type="button" data-phenomena-preset="none">Ninguno</button></div><div class="phenomena-picker-grid" role="group" aria-label="Fenómenos que intervienen">${SELECTABLE_PHENOMENA.map(kind=>`<label class="phenomenon-choice">${ecologyIcon(kind)}<span>${ecologyNames[kind]}</span><input type="checkbox" data-phenomenon="${kind}" aria-label="${ecologyNames[kind]}" ${selected.includes(kind)?'checked':''}></label>`).join('')}</div><p>Los desactivados dejan pasar su intento: los demás conservan su frecuencia. Se guarda con la partida.</p></details>`;
}
export function bindPhenomenaPicker(root){
 const picker=root.querySelector('.phenomena-picker'),master=root.querySelector('#territory-enabled');if(!picker||!master)return;
 const inputs=[...picker.querySelectorAll('[data-phenomenon]')],refresh=()=>{picker.querySelector('output').textContent=inputs.filter(n=>n.checked).length+'/'+SELECTABLE_PHENOMENA.length;picker.classList.toggle('is-off',!master.checked);};
 picker.addEventListener('change',()=>{master.checked=inputs.some(n=>n.checked);refresh();});master.addEventListener('change',refresh);
 picker.addEventListener('click',e=>{const preset=e.target.closest('[data-phenomena-preset]');if(!preset)return;inputs.forEach(n=>n.checked=preset.dataset.phenomenaPreset==='all');master.checked=inputs.some(n=>n.checked);refresh();});refresh();
}
export const readPhenomenaPicker=root=>[...root.querySelectorAll('[data-phenomenon]:checked')].map(n=>n.dataset.phenomenon);
