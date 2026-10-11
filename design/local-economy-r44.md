# R0.21.44 — Inventario y conversiones locales

Ámbito: VS máquina y Sin conexión. Duelo/equipos y Mundo siguen desactivados. Sin cambios de servidor. R0.21.43 es la base; ruleVersion 14 distingue los resultados nuevos.

## Decisiones implementadas

- Partidas nuevas: tres cartas distintas por inventario activado. Selector independiente para cada humano en dispositivo compartido. Recomendación: Doble / Ficha contraria / Ayuda. Máquina con selección propia recomendada, nunca la bolsa del humano. Inventario propio apagado permite jugar sin cartas aunque la máquina tenga las suyas.
- Guardados: stock, puntuación, protecciones, ampliaciones, geometría, relojes, avisos, anclajes y resultados terminados se conservan. Catálogo ampliado con cero unidades nuevas. Migración de economía idempotente y persistida atómicamente por colección. Los contadores antiguos de turnos no conceden premios históricos.
- Recarga: una carta por colocación manual que sume ≥33 puntos para el símbolo del actor, incluidos bonus. 333 puntos dan una recarga, no diez. Doble puede conseguir una por cada colocación si ambas califican. Cartas, fenómenos, turnos automáticos, tiempo y simples turnos completados no dan recargas. Se conserva una recarga pendiente si no cabe; no se acumulan diez sorteos pendientes. Gastar una carta puede materializar esa recarga ya ganada. Límites 18 unidades / 12 tipos / 3 por carta; excesos históricos preservados.
- Trueque: botón visible en la descripción, coste explícito, mantener 1.000 ms para una unidad; soltar, arrastrar >8 px, desplazamiento, pérdida de foco, ocultar o cancelar anula la pulsación. Teclado Enter/Espacio con la misma espera; repetición no compra más. Valida turno, reloj, estado, puntos y límites de nuevo al comprar. Compra no usa herramienta ni turno ni reinicia plazo. `tradeSpent` conserva el gasto, puntos ganados = score + tradeSpent; score es saldo competitivo. Las protecciones de Inmunidad siguen como premio separado y no se compran.
- Máquina: recarga con las mismas colocaciones válidas; trueque desde Medio, como máximo una compra por turno, antes de usar herramientas, guardando al menos dos veces el precio tras comprar. Prioriza Antídoto sobre una ficha propia amenazada, defensa frente a invasores y Doble. Mismos precios, límites y árbitro. Básico sigue sin esta compra estratégica.
- Emboscada limpia hasta 3 asteriscos; Reconquista hasta 33. Prioridad determinista por distancia Manhattan a la estrella elegida. Pueden limpiar menos si no quedan objetivos; no borran X/O/#, terreno, reservas de habitantes ni puntos. Retirar la última marca termina el crecimiento de la colonia. Reconquista sustituye el nombre propuesto Súper Reconquista, que no existía todavía como carta en R43.
- Antídoto: una posición protegida de un evento concreto de Contagio/Pandemia antes del impacto. Guarda evento/posición/autor; no cambia región, resto de celdas ni turnos. No es inmunidad global ni permanente. Marca + en la celda, indicador de efecto y exclusión de la zona amenazada en mapas; se consume con el aviso. Uso normal de herramienta; debe jugarse durante el turno propio.
- Contagio: exactamente tres grupos de tres fichas conectadas por lado, separados por al menos una celda (incluye separación diagonal). Si no caben tres grupos completos no se anuncia; bolsa intenta otro tipo viable. Pandemia conserva presupuesto disperso 6 % de fichas, múltiplos de tres, techo 66F. Se mantienen frecuencias y tres turnos de preaviso.
- Ambos convierten X↔O y *↔#, conservan identidades, actualizan propiedad y limpian identidad de colonia. Nuevos * estáticos, sin colonias inventadas. Se puntúan las nuevas figuras de ambos símbolos en geometría final, con bonus y créditos, igual que Huracán; nunca figuras preexistentes intactas, estados intermedios, premios de inventario/inmunidad o descuento de puntos.
- Hall: cada descripción tiene estado y resalte propio, permite varias abiertas. Al cerrar desaparece su resalte aunque un toque deje :hover activo. No se usa un único icono seleccionado.

## Precios fijados para esta revisión

| Precio | Cartas |
| --- | --- |
| 3 | Ayuda de movimiento, Destruir celda vacía, Muro de una celda, Ampliación +1 |
| 33 | Doble, Ficha contraria, Ficha rival, Borrar, Permutar, Desplazar, Bloqueo, Escudo, Ampliación +2/+3, Frontera, Emboscada, Antídoto |
| 333 | Bomba, Tornado, Combo, Ampliación inteligente, Súper Ayuda, Reconquista |
| 3.333 | Reservado; ninguna carta actual justifica el salto |

Reconquista aporta hasta 11 veces la limpieza de Emboscada por aproximadamente 10 veces el coste (10,09 frente a 11 puntos por celda al usar su capacidad completa). Ambas mantienen el límite de herramientas. Súper Ayuda sigue gastando además las cartas que su plan usa. No se considera equilibrado cobrarle 3.333 solo por automatizar la decisión. La selección inicial puede elegir cartas caras, pero sus objetivos y condiciones siguen restringidos.

## Ensayos reproducibles

`scripts/simulate-economy-r44.mjs` y `local-economy-r44-simulations.json`: 10.989 sorteos ganados con consumo simulado, todos los 23 tipos alcanzados, cantidades 0/1/2/3 y límites invariantes. Esto prueba variedad y límites, no la tasa de combos de jugadores reales.

27 ensayos de conversión en 333/999/3.333 celdas, ocupación aleatoria del 80 % y cuatro símbolos con probabilidad igual (estrés deliberado de comodines): Contagio consigue nueve objetivos cuando la geometría permite; Pandemia promedia 15/45,67/158,33 fichas. Puntos jamás decrecen y bolsas/terreno permanecen. Ganancias medias totales 338,22/1.051,44/3.747; los comodines abundantes producen muchas figuras. Estas cifras no representan partidas reales y justifican excluir las recargas automáticas por fenómenos.

Pruebas del árbitro incluyen una colocación real ≥33 manual frente a la misma colocación automática, sin premio por tiempo, cartas ni figuras de otro actor. Se verifica guardado pausado de 25.912 puntos, 991 celdas, 1.422 colocaciones y reservas fuera de límites; no se alteran anclajes ni el resultado terminado. Test de gestos sin navegador cubre cancelación y exactamente una compra por pulsación. CI Chromium emula pantalla táctil de 320 px, selector inicial, lectura independiente y compras 1/2/3; no es ensayo físico de iPhone.

## Derrota común — evaluada, NO activada

No se habilita ningún umbral/plazo. Se modelan 33,3 / 66,6 / 90 % de * sobre terreno realmente construido para 333/999/3.333 celdas. Una Reconquista retira hasta 9,91 / 3,30 / 0,99 % respectivamente. Tres solo 29,73 / 9,91 / 2,97 %. Un aviso fijo de tres turnos compartidos da dos respuestas a un colono y una al otro; además, una cantidad fija de recuperación pierde fuerza al crecer el tablero.

Recomendación pendiente de aprobación: medir presión por * (no X/O, # ni una caja envolvente), aviso con una diana clara, contar tres oportunidades de respuesta PROPIAS para cada participante, permitir cancelar el peligro al reducir la presión y finalizar con derrota conjunta sin pérdida de puntos históricos. Antes de elegir umbral hay que medir partidas reales y considerar escalado o presión regional; no aprobar 66,6 % / tres turnos por inferencia. Tampoco terminar por falta temporal de huecos: la ampliación y herramientas pueden resolverla.

No se activan suscripciones, Duelo humano/equipos, Mundo ni un final nuevo. La validación sintética no sustituye las pruebas de disfrute y estrategias reales de Jorge.
