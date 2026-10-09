// Re-enable Duelo first, then Mundo, only after the local diagnosis.
export const ONLINE_MODES=Object.freeze({duel:false,world:false});
export const ONLINE_ENABLED=Object.values(ONLINE_MODES).some(Boolean);
export const ONLINE_NOTICE='Duelo y Mundo · En construcción. Prueba VS máquina o Sin conexión.';
export const onlineMode=mode=>['duel','world'].includes(mode);
export const modeAvailable=mode=>!onlineMode(mode)||ONLINE_MODES[mode]===true;
export function requireOnline(){if(!ONLINE_ENABLED)throw new Error(ONLINE_NOTICE);}
