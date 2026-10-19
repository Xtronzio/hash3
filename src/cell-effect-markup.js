// Shared by Original and Inverso. Geometry and timing belong to presentation,
// never to the referee or the persisted game.
export const CELL_EFFECT_MS=1800;
export const ACTION_EFFECT_MS=900;
export const FEEDBACK_PULSE_MS=650;
export const cellWarningMarkup=(kind='',extra='')=>`<svg class="cell-warning ${extra}" viewBox="0 0 48 48" aria-hidden="true"><rect class="warning-underlay" x="5" y="5" width="38" height="38" rx="4"/><rect class="warning-dashes" x="5" y="5" width="38" height="38" rx="4"/>${kind?`<path d="${kind==='restore'?'M19 10h10m-5-5v10':'M19 10h10'}"/>`:''}</svg>`;
export const cellEffectMarkup=kind=>`<svg viewBox="0 0 48 48" aria-hidden="true"><rect class="effect-ring" x="5" y="5" width="38" height="38" rx="6"/><g class="effect-shards"><path d="M8 15V8h7M33 8h7v7M40 33v7h-7M15 40H8v-7"/></g>${kind==='wild'?'<text x="24" y="32" text-anchor="middle">#</text>':kind==='place'?'':`<path class="effect-sign" d="M17 24h14${kind==='create'?'m-7-7v14':''}"/>`}</svg>`;
