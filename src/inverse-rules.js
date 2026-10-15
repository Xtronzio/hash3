// Inverse is opt-in. Missing flags always retain the Original rules.
export const isInverse=game=>game?.variant==='inverse';
export const INVERSE_TOOLS=Object.freeze(['double','opposite','rival','erase','swap','shift','hint','super-hint','combo','bomb','tornado']);
export const inverseToolAllowed=(game,tool)=>!isInverse(game)||INVERSE_TOOLS.includes(tool);
export const inverseToolDescription=(id,fallback)=>id==='erase'?'Borra una ficha de cualquier color sin quitar su celda. Después coloca tu ficha.':id==='shift'?'Mueve una ficha de cualquier color a una celda vacía del dibujo. Las figuras nuevas puntúan para su símbolo y se vacían.':fallback;
