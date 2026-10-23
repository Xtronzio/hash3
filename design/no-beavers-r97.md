# R0.21.97 · Territorio sin castores

Petición de Jorge, 23 de octubre de 2026: retirar los castores y recalcular el
territorio teniendo en cuenta que ya no existen. Base estable R96/r307,
bc3300e6afbcd43f3f2481e621ea6d765af6fa0a. Copia remota previa:
backup/pre-remove-beavers-r96-20261023.

## Alcance

Original local y VS máquina pasan a reglas28; Inverso, SQL y online no cambian.
Castor y plaga dejan de ser seleccionables, candidatos o una presión presente.
El catálogo conserva once opciones. Se retiran de la guía y de la explicación
general; las defensas Muro y Frontera del jugador no cambian.

## Conservación y traslado

La migración local existente aplica la retirada de forma atómica a la colección:
quita solo faunaEvents beaver/beaver-plague y frontiers type beaver, limpia sus
cuentas pendientes y elimina sus claves de la selección actual. Conserva la
bandera maestra de fauna y el resto de la selección. No inventa reembolsos,
acciones, premios, puntos ni cambios de terreno. Guarda las demás regiones,
avisos, relojes, fichas, anclajes y propietarios.

El árbitro también aplica la retirada a una copia antes de aceptar comandos;
acciones rechazadas no escriben la copia. No puede resolverse una barrera nueva
por un aviso de castor inyectado en reglas28. Los originales del traslado no se
modifican: la captura migra únicamente la copia en memoria.

STORED_FAUNA acepta las trece claves históricas para no rechazar enlaces o
archivos anteriores. El director acepta recuerdos last/recent antiguos. Las
comparaciones de resultados anteriores usan el catálogo histórico; no se
reclasifican finales ni se reescribe su fauna. Las funciones de representación
y plazos históricos permanecen para leer datos antiguos, no como fauna actual.

## Equilibrio y ampliación

El territorio decide con once candidatos, sin asignar al resto la cuota del
castor. Los avisos/barreras retirados no ocupan su slot. Se conserva la carga
R96 ya pagada para no provocar una nueva ráfaga al abrir el guardado. No se
reinicia el episodio ni se adelantan avisos del resto. La recuperación continúa
por respuestas completas, nunca por cartas, ampliación, pausa o tiempo cerrado.

Se mantiene el cálculo de ocupación/espacio y la regla de completar la ampliación
obligatoria antes de limpiar. Quitar una barrera libera el punto que bloqueaba,
sin borrar terreno. La ampliación añade nueve celdas sin adelantar impactos.

## Medición reproducible

node scripts/simulate-territory-r96.mjs: mismas trece muestras y límites R96,
ahora con aserción de ausencia de castores durante todas las acciones. Resultado
en benchmarks/territory-no-beavers-r97.json. Doce muestras de180acciones en
9/99/450densas/999celdas: 14–28anuncios, 46–75% de actividad y 0–7,3% de
coincidencia; mayor calma seguida de7–14acciones. La muestra33333 consta solo
de33acciones y comprueba coste/invariantes, no equilibrio de una partida larga.
Se mantienen los coeficientes R96 al pasar las mismas bandas de regresión;
estas simulaciones no sustituyen la valoración de Jorge jugando.

Pruebas dedicadas: once opciones, anuncios directos bloqueados, retirada
idempotente y fallo de cuota sin pérdida, conservación de economía y avisos,
históricos/traslado, presión sin sustitución, ampliación previa a impacto y
aislamiento de Inverso/online/finales. QA R85 ajustado a once opciones; R62/R90
comprueban retirada de guardados antiguos en pantalla y pausa en lugar de
exigir la mecánica eliminada. Mantener el resto de sus regresiones.
