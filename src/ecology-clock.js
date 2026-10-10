import {eventTurns} from './turn-ecology.js';
export const ecologySeconds=(event,now=Date.now())=>event.warningTurns!=null||event.turnsRemaining!=null?eventTurns(event):Math.max(0,Math.ceil((event.remainingMs??((event.nextAt??now)-now))/1000));
