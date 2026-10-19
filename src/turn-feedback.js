import {FEEDBACK_PULSE_MS} from './cell-effect-markup.js';
let currentRoom=null,currentText=null,started=null;
const duration=FEEDBACK_PULSE_MS;
// Presentation state only: a rerender resumes the same pulse rather than replaying it.
export function resumeTurnFeedback(root,game){
 const node=root.querySelector('.turn-state');
 if(game?.status!=='playing'||!node){currentRoom=null;currentText=null;started=null;return;}
 const text=node.textContent.replace(/\s+/g,' ').trim(),now=performance.now();
 if(currentRoom!==game.id){currentRoom=game.id;currentText=text;started=null;}
 else if(currentText!==text){currentText=text;started=now;}
 if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){started=null;return;}
 if(started==null||now-started>=duration||node.getAnimations?.().some(a=>a.id==='turn-state-change'))return;
 const animation=node.animate?.([{filter:'brightness(1)'},{filter:'brightness(1.65)',boxShadow:'0 0 12px #f2f3f488, inset 0 0 8px #f2f3f455',offset:.5},{filter:'brightness(1)'}],{duration,iterations:1,delay:started-now,easing:'ease-in-out'});
 if(animation)animation.id='turn-state-change';
}
