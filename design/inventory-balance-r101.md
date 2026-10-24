# R101 · Inventario, memoria y rinos

Acuerdo de Jorge,24/10/2026. Versión R0.21.101, compilación20261024-r312.
Respaldo: backup/pre-inventory-balance-r100-20261024, main387b28ac.

## Inventario

Tres favoritas iniciales distintas y nueve cartas ordinarias como máximo,
tres por tipo. La elección inicial existente se conserva. El ciclo anuncia una
carta elegida con el reparto ponderado vigente (las tácticas mantienen peso3).
Las cuatro básicas de precio3 (Ayuda, Desactivar, Activar, Muro) tardan seis
turnos propios completos; las demás nueve. No depende del tamaño del tablero.
Cada turno propio con combo manual≥33 descuenta un turno adicional: máximo uno,
incluso con Doble o un combo enorme. Nunca se recibe antes de tres turnos propios
completos: base6 puede bajar a3, base9 a5. Automáticos avanzan sin descuento;
turnos del rival, pausa, relojes, herramientas y ampliación no avanzan.

Una carta lista espera capacidad total y por tipo, sin sortear otra ni acumular
ciclos. El siguiente empieza al recibirla. Comprar/cambiar sigue disponible con
las reglas de puntos, valor y cupo existentes. No se introduce mercado rotatorio.
Las mochilas históricas>9 se conservan y se vacían jugando, sin nuevas adiciones
hasta dejar hueco. Un combo pendiente antiguo conserva una sola recompensa.

Inmunidad queda fuera de compra, trueque y sorteo: un combo individual propio
manual≥33 gana la primera,≥66 la segunda,≥99 la tercera y todas las siguientes.
Un combo concede una, aunque sea enorme. Máximo tres guardadas, sin deuda al estar
lleno. Gastar no reinicia el escalón. Se conserva la protección vigente de tres
turnos totales. El exceso histórico se archiva en immunity.legacyCards, dejando
tres utilizables, sin cambiar puntos ni registrar nuevas ganancias históricas.

## Trasladar celda

Carta nueva de precio33 y recarga9: seleccionar una celda vacía construida con
punto, después una posición vacante sin construir, adyacente al terreno restante.
Mantener número y dueño del terreno, puntos, turno y colocaciones. Gastar una
carta y un cupo normal de herramienta, después colocar. Cancelar es gratuito.
No mover anclas, articulaciones que separen componentes, reservas, inmunidades,
fronteras ni cuerpos/bloqueos activos. Conservar islas históricas sin separarlas.
Análisis iterativo lineal y caché por snapshot; índice de destinos virtualizado.
Original local/máquina; Inverso mantiene el dibujo fijo. La máquina usa el mismo
árbitro y puede preparar una figura con un traslado legal.

## Nubes y niebla

Nubes nueve turnos totales; Niebla dieciocho (corrección expresa de19). Doble
cuenta una vez, pausa/herramientas cero. No ampliar efectos ya activos ni avisos
guardados de tres turnos al adoptar el nuevo balance.

Inverso manual3: niebla del contorno sin carta comprable. Primer intento tras36
turnos totales, aviso concreto tres antes, región conectada≤33 dentro del dibujo
y al menos tres fichas que ocultar. Intentos siguientes separados33..66turnos,
sin solapar nieblas ni anunciar con desorden ya inminente. Advertencia anclada a
coordenadas copiadas, sin seguir fichas que se muevan. Las apariciones de Original
siguen siendo decisiones contextuales del territorio R98, no este calendario.
Ocultar símbolo/dueño, conservar ocupación y punto blanco de las vacías. Sin
previsualizar combos que toquen niebla; Cobrar permite tocar una ocupada a ciegas
y el árbitro comprueba la figura real. IA y ayudas solo reciben memoria/percepción
de signos; no conocen nuevas identidades ocultas. Tras fallar un cobro recordado,
la recuperación de máquina descarta esa memoria incierta para no repetirlo. En un
dibujo lleno puede comprar/cambiar y usar Bomba a ciegas, con las reglas normales,
cuando no hay un objetivo visible para Borrar. Contadores guardados y exportados.
Turnos de cárcel omitidos/compensados no envejecen efectos ni producen recargas.

## Rinos y conservación

Rutas rectas/diagonales con un paso lateral hacia la mitad y continuación paralela,
si cabe en terreno y barreras. Misma longitud y células únicas; en corredores
estrechos conservar ruta recta. El sorteo de novedad considera la ruta final.
Advertencia y animación siguen coordenadas y esquinas reales, incluido bloqueo
antes del final. Hormigas sin cambios, castores siguen retirados. El director
mantiene límites y carga R98; niebla larga ocupa el canal de fenómenos más tiempo.

## Datos y comprobación

inventoryBalanceVersion1 activa solo partidas locales nuevas/activas. Original
reglas31; Inverso mantiene24 y añade identificadores de balance/niebla a resultados.
Versiones automáticas de Inverso1/2, finales y puntuaciones históricas intactas.
Guardados sin flag adoptan a futuro, sin créditos por turnos pasados. El flag0
solo conserva el motor histórico para fixtures de regresión; no se expone en UI.
La validación del traslado comprueba ciclos, límites, regiones y duraciones.
Resultados con distinto balance no se mezclan. SQL/online y cron mundial intactos.

Pruebas unitarias e integración reales de reglas nuevas, migraciones/traslado,
turnos, Doble, cárceles, IA, animación y33333. QA nueva importa la fábrica real;
las regresiones de la economía anterior usan fixtures históricos explícitos.
Pipeline SQL desechable, simulaciones de turnos/ecología/territorio y navegador
Chromium/Firefox/WebKit,320/390/428/740horizontal/1280/1920. Mantener franja opaca
R100 y SVG; Jorge ya confirmó la corrección física del desenfoque. La emulación
de navegador no sustituye juego físico para afinar sensaciones.
