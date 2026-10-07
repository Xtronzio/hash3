export const navigationPaths={
 rotate:'<path d="M20 11a8 8 0 1 0-2 6M20 4v7h-7"/>',
 fit:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/><rect x="7" y="7" width="10" height="10" rx="1"/>',
 fullscreen:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8l-5-5m13 5 5-5M8 16l-5 5m13-5 5 5"/>',
 restore:'<path d="M3 8h5V3m13 5h-5V3M3 16h5v5m13-5h-5v5M3 3l5 5m13-5-5 5M3 21l5-5m13 5-5-5"/>'
};
export const navigationIcon=kind=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${navigationPaths[kind]||''}</svg>`;
