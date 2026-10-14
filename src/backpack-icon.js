// Shared unmarked counter backpack, colored by its inventory surface.
export const backpackPath='<rect x="5" y="9" width="22" height="23" rx="4"/><path d="M11 9V6a5 5 0 0 1 10 0v3M9 28h14M2 17v9m28-9v9"/>';
export const backpackIcon=(className='')=>`<svg ${className?`class="${className}" `:''}data-icon="backpack" viewBox="0 0 32 36" aria-hidden="true" focusable="false">${backpackPath}</svg>`;
