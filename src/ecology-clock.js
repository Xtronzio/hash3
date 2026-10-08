export const ecologySeconds=(event,now=Date.now())=>Math.max(0,Math.ceil((event.remainingMs??((event.nextAt??now)-now))/1000));
