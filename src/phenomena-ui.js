import {SELECTABLE_FAUNA,normalizeFauna,FAUNA_NAMES} from './fauna-selection.js';
import {SELECTABLE_PHENOMENA,normalizePhenomena} from './phenomena-selection.js';
import {ecologyIcon,ecologyNames} from './ecology-navigation.js';
export function phenomenaPickerMarkup(value){
 let selected;try{selected=normalizePhenomena(value);}catch{selected=[...SELECTABLE_PHENOMENA];}
 return `<details class="phenomena-picker"><summary>Elegir fenómenos · <span class="phenomena-count" aria-live="polite">${selected.length}/${SELECTABLE_PHENOMENA.length}</span></summary><div class="phenomena-picker-actions"><button type="button" data-phenomena-preset="all">Todos</button><button type="button" data-phenomena-preset="none">Ninguno</button></div><div class="phenomena-picker-grid" role="group" aria-label="Fenómenos que intervienen">${SELECTABLE_PHENOMENA.map(kind=>`<label class="phenomenon-choice">${ecologyIcon(kind)}<span>${ecologyNames[kind]}</span><input type="checkbox" data-phenomenon="${kind}" aria-label="${ecologyNames[kind]}" ${selected.includes(kind)?'checked':''}></label>`).join('')}</div><p>Los desactivados dejan pasar su intento: los demás conservan su frecuencia. Se guarda con la partida.</p></details>`;
}
export function bindPhenomenaPicker(root){
 const picker=root.querySelector('.phenomena-picker'),master=root.querySelector('#territory-enabled');if(!picker||!master)return;
 const inputs=[...picker.querySelectorAll('[data-phenomenon]')],refresh=()=>{picker.querySelector('.phenomena-count').textContent=inputs.filter(n=>n.checked).length+'/'+SELECTABLE_PHENOMENA.length;picker.classList.toggle('is-off',!master.checked);};
 picker.addEventListener('change',()=>{master.checked=inputs.some(n=>n.checked);refresh();});master.addEventListener('change',refresh);
 picker.addEventListener('click',e=>{const preset=e.target.closest('[data-phenomena-preset]');if(!preset)return;inputs.forEach(n=>n.checked=preset.dataset.phenomenaPreset==='all');master.checked=inputs.some(n=>n.checked);refresh();});refresh();
}
export const readPhenomenaPicker=root=>[...root.querySelectorAll('[data-phenomenon]:checked')].map(n=>n.dataset.phenomenon);

export function faunaPickerMarkup(value){
 let selected;try{selected=normalizeFauna(value);}catch{selected=[...SELECTABLE_FAUNA];}
 return `<details class="fauna-picker"><summary>Elegir fauna · <span class="fauna-count" aria-live="polite">${selected.length}/${SELECTABLE_FAUNA.length}</span></summary><div class="phenomena-picker-actions"><button type="button" data-fauna-preset="all">Todos</button><button type="button" data-fauna-preset="none">Ninguno</button></div><div class="phenomena-picker-grid" role="group" aria-label="Fauna y habitantes que intervienen">${SELECTABLE_FAUNA.map(kind=>`<label class="phenomenon-choice">${ecologyIcon(kind)}<span>${FAUNA_NAMES[kind]}</span><input type="checkbox" data-fauna="${kind}" aria-label="${FAUNA_NAMES[kind]}" ${selected.includes(kind)?'checked':''}></label>`).join('')}</div><p>Cada tipo y su plaga se eligen por separado. Los desactivados dejan pasar su intento, sin acelerar los demás. Se guarda con la partida.</p></details>`;
}
export function bindFaunaPicker(root){
 const picker=root.querySelector('.fauna-picker'),master=root.querySelector('#fauna-enabled');if(!picker||!master)return;
 const inputs=[...picker.querySelectorAll('[data-fauna]')],refresh=()=>{picker.querySelector('.fauna-count').textContent=inputs.filter(n=>n.checked).length+'/'+SELECTABLE_FAUNA.length;picker.classList.toggle('is-off',!master.checked);};
 picker.addEventListener('change',()=>{master.checked=inputs.some(n=>n.checked);refresh();});master.addEventListener('change',refresh);
 picker.addEventListener('click',e=>{const preset=e.target.closest('[data-fauna-preset]');if(!preset)return;inputs.forEach(n=>n.checked=preset.dataset.faunaPreset==='all');master.checked=inputs.some(n=>n.checked);refresh();});refresh();
}
export const readFaunaPicker=root=>[...root.querySelectorAll('[data-fauna]:checked')].map(n=>n.dataset.fauna);
