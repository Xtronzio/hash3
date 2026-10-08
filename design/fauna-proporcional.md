# Ecología proporcional de #3 — R0.21.14

Reglas acordadas con Jorge, 8 de octubre de 2026. Implementación local (VS máquina / Sin conexión); actualización online pendiente de conexión SQL. Inmunidad como turno de calma: propuesta pendiente de implementar.

## Control de complejidad

Tres checks independientes, representados por iconos: Inventario rival (máquina), Fauna / habitantes, Fenómenos territoriales. Se guardan con cada partida. En dos humanos el primer check no aplica a una máquina y aparece deshabilitado; ambos humanos conservan su inventario.

## Fenómenos

Jorge eligió 33 de cada 333: 9,9099 %. Es distinto de 1/9 exacto (11,1111 %, 37 de 333). En cada nuevo hito de superficie 333/666/999… se sortea UNA carta viable, no tres simultáneas. Aviso de 33 segundos con icono, cuenta atrás y celdas marcadas; tocar el icono localiza la región. El hito se consume una sola vez, aunque una demolición obligue a reconstruir hasta esa misma superficie. No ejecutar hitos anteriores al cargar un guardado. No acumular eventos pendientes; la región anunciada queda fijada.

| Hito de terreno | Lluvia o Cataclismo | Terreno tras impacto máximo | OVNI si todas esas celdas están ocupadas |
|---:|---:|---:|---:|
| 333 | 33 celdas y sus fichas | 300 | 33 fichas; terreno intacto |
| 666 | 66 celdas y sus fichas | 600 | 66 fichas; terreno intacto |
| 999 | 99 celdas y sus fichas | 900 | 99 fichas; terreno intacto |
| 3.330 | 330 celdas y sus fichas | 3.000 | 330 fichas; terreno intacto |

- Lluvia: celdas distintas dispersas al azar, en grupos visuales de tres; elimina terreno y fichas. La carta Bomba del jugador conserva su regla anterior: vacía tres celdas y rompe frontera, sin demoler terreno.
- Cataclismo: región compacta conectada; cada celda debe tener al menos DOS vecinos de la propia región por sus lados. Sin diagonales ni puntas de un solo vecino. Conservar anclajes, revisar de nuevo antes del impacto y cancelar obras/cuerpos/fronteras afectados. Si no hay parche válido se elige otra carta viable.
- OVNI: floor(fichas ocupadas × 33/333), incluida #. 100 fichas → 9; 333 → 33; 1.000 → 99. Retira fichas de la zona anunciada y conserva TODAS las celdas. Si la región se vacía antes, no busca víctimas adicionales.

El máximo territorial por carta es aproximadamente 9,91 % de la superficie del hito. Si los tres tipos resultaran equiprobables y siempre viables, la demolición esperada sería 6,61 %: dos cartas demuelen y una no. No usar ese promedio como garantía en un mapa cuya geometría sesgue el sorteo. La demolición por hito preserva al menos alrededor del 90 % de terreno, pero no fija un máximo absoluto: sucesivos hitos mayores siguen permitiendo mapas mayores.

## Habitantes sin saturación

Contador y cupos por zona activa, compartidos entre jugadores. Factor m=N/333. Pesos por activación: 3m roedores, m gusanos y m proyectos de obreros (tres parejas por proyecto). Arrastrar la fracción hasta futuras activaciones, en vez de redondear siempre hacia arriba; descartar nacimientos sin espacio/comida, no acumularlos. Población simultánea acotada por superficie. Las bombas automáticas pequeñas anteriores dejan de nacer: las sustituye el sorteo de lluvia territorial.

Para que una población proporcional no devore una partida con actividad fija, también aumenta el intervalo entre nacimientos: techo(33 × max(1,m)) para roedores, techo(99 × max(1,m)) para gusanos y techo(198 × max(1,m)) para obras.

| Celdas | Grupo de roedores | Colocaciones entre grupos | Gusanos | Colocaciones entre generaciones | Proyectos de obra / intervalo |
|---:|---:|---:|---:|---:|---:|
| 333 | 3 | 33 | 1 | 99 | 1 / 198 |
| 666 | 6 | 66 | 2 | 198 | 2 / 396 |
| 999 | 9 | 99 | 3 | 297 | 3 / 594 |
| 3.330 | 30 | 330 | 10 | 990 | 10 / 1.980 |

A 100 celdas el presupuesto por activación es 0,9009 roedores y 0,3003 gusanos/proyectos; a 1.000 es diez veces mayor. Son promedios enteros alternantes, no fracciones de animales en pantalla. El intervalo mínimo de tableros pequeños conserva entrada gradual.

Cada roedor consume como máximo tres fichas, en tres visitas ligadas a colocaciones; desaparece visualmente entre ellas. No usa reloj, no come # ni la ficha recién colocada. Cada gusano consume tres, una cada 33 segundos, y desaparece con la tercera (99 s con alimento continuo). Un proyecto transforma hasta nueve celdas construidas y nueve retiradas, con balance neto cero. El 198 procede del mínimo común múltiplo de 33/66/99; fue una decisión previa de implementación, no una deducción del equilibrio.

### Cuenta del equilibrio

Desde N=333, con tamaño fijo, nacimientos regulares, alimento y espacio suficientes:

- Roedores: (3m × 3 comidas) / (33m colocaciones) = 9/33 = 27,27 %.
- Gusanos: (m × 3 comidas) / (99m colocaciones) = 3/99 = 3,03 %.
- Capacidad conjunta: 10/33 = 30,30 % de colocaciones nuevas.
- Obreros: (m × 9)/(198m) = 4,55 % por dirección, sin crecimiento neto.

Queda un balance ideal de 69,70 fichas netas por cada 100 nuevas, antes de fenómenos, cartas y #. Para ocupar 333 huecos a ese ritmo harían falta aproximadamente 333/(23/33)=478 colocaciones, sin contar las pausas ni las nuevas ampliaciones. No es una tasa garantizada: hay ráfagas por generación, limitaciones de alimento/geometría, redondeo y cambios de tamaño. Es un régimen teórico de referencia; las pruebas de jugadas largas deben medir la incidencia efectiva. No sumar la demolición de terreno y el consumo de fichas como si fueran la misma magnitud.

A seis segundos por colocación, 478 jugadas son unos 48 minutos; a 33 segundos, unas 4,4 horas. Por ello no se promete que un mapa grande tarde horas si se juega muy rápido o con muchos jugadores; estas reglas contienen la presión y el crecimiento sin imponer artificialmente una duración.

## Separación temporal

Desde el aviso territorial se congelan visitas, nacimientos y ciclos de fauna. El impacto no se combina con comidas/obras en el mismo comando. Después se recalculan terreno y fichas restantes, habitantes supervivientes, cupos y siguientes nacimientos; se cancela lo demolido, se descarta exceso y crédito acumulado, y se reinician los ciclos supervivientes. Deben pasar 33 segundos Y tres nuevas colocaciones antes de reactivar la fauna. La pausa congela también ese margen. No se recuperan acciones atrasadas de golpe.

## Verificación y límites

Pruebas de presupuestos 100/1.000, regiones de 333/999/3.330, dos vecinos por celda, sorteo único y no repetición de hitos, OVNI por ocupación, limpieza de demolición, pausas, tres checks y recuperación. No se cambia navegación: dibujo por viewport+2 celdas, índices por snapshot y acciones consultadas solo en la ventana. SQL online bloqueado por timeout; estas reglas no están aún en Duelo/Mundo.

## Ampliación libre por mérito

Jorge eligió una ampliación libre cada tres figuras cobradas, máximo una guardada. El icono 3×3 muestra ×1. Puede activarse en el turno propio aunque haya huecos, previsualizarse/cancelarse sin gasto, y consumirse al colocar el bloque. Conserva créditos normales y el mismo jugador continúa su turno. A mitad de Doble no se abre otra fase. No hay premios retroactivos de figuras históricas. Las ampliaciones normales al llenar el terreno se mantienen.

La cuenta de 478 colocaciones es una referencia de llenado bajo fauna, no una espera impuesta: los premios por mérito permiten crecer antes. Cada premio utilizado añade hasta nueve celdas; solaparlo añade menos. El límite de una reserva evita convertir combinaciones de muchas figuras en una ráfaga de ampliaciones almacenadas.

## Límite sin ecología: objetivo 33.333

Jorge descartó 999 y eligió 33.333 como objetivo, condicionado a mejorar guardado/cálculo y comprobar móviles antes de fijarlo en producción. Aplicable a partidas sin fauna Y sin fenómenos (VS máquina, Sin conexión y Duelo), excluyendo Mundo. Contar terreno real, no caja envolvente ni ampliaciones históricas. El código en desarrollo usa ese cupo; la versión pública no ha recibido este cambio.

Ensayo del 8 de octubre de 2026, Node en el entorno de desarrollo: terreno compacto, ocupación 80 %, una figura histórica por cada tres fichas; mediana de cinco ejecuciones tras calentamiento. Los tiempos no incluyen DOM, almacenamiento físico del navegador, máquina ni prueba de móvil. El guardado se mide con almacenamiento simulado.

| Celdas | Jugada | Opciones de ampliación | Serializar guardado | Consulta de ventana | JSON de partida |
|---:|---:|---:|---:|---:|---:|
| 9.999 | 50,2 ms | 38,3 ms | 5,8 ms | 0,007 ms | 745.072 bytes |
| 33.333 | 163,7 ms | 120,4 ms | 19,8 ms | 0,007 ms | 2.584.348 bytes |
| 99.999 | 530,1 ms | 422,2 ms | 48,0 ms | 0,007 ms | 7.903.533 bytes |

La ventana consultada contiene 308 celdas en los tres tamaños; esto verifica el índice, no el rendimiento del navegador completo. A una colocación cada 10 segundos, ocupar 9.999/33.333/99.999 celdas supone 27,8/92,6/277,8 horas acumuladas sin borrados y sin tiempos de ampliación. Los premios permiten ampliar antes de llenar; no es duración mínima ni una predicción de partida.

El coste por jugada ya crece notablemente a 33.333. El guardado actual serializa toda la colección y duplica la partida más reciente en una clave antigua; varios guardados grandes comparten cuota. Antes de considerar listo el objetivo: eliminar duplicación sin romper recuperación, adoptar guardado adecuado para partidas grandes, reducir trabajo de ampliación/jugada y comprobar dispositivos reales. No inferir un máximo seguro solo del renderizado por ventana. Las expansiones y Construir celda respetan el cupo en desarrollo; un tablero lleno sin ampliación legal termina por puntos. Portado online pendiente.

## Objetivos y Logros (acuerdo posterior)

Elegir final por celdas actuales (33/333/3.333/33.333), duración total (3/5/10 minutos, como Duelo) o movimientos (33/333/3.333/33.333). Modos locales; Duelo requiere servidor. Celdas se pueden combinar con ecología. No esperar al llenado cuando se alcanza la superficie. Cada colocación de ambos participantes cuenta un movimiento, también automática y cada colocación de Doble; cartas y ampliar no cuentan. Tiempo total se congela en pausa y es independiente del reloj por turno. Puntuar la colocación final antes de cerrar. No hay nuevo movimiento ni comida atrasada al agotar la duración total.

Logros archiva un resumen compacto por partida completada: puntos, figuras, colocaciones, combo, #MAX, fecha y configuración. Agrupar solo mismo objetivo y mismas reglas. Guardados finales manuales no obtienen el logro de objetivo. Borrar el tablero mantiene el resumen; borrar una partida anclada sigue prohibido. Datos locales de este navegador, sin promesa de sincronización. Se eliminó la duplicación de tablero en la clave antigua, que ahora contiene únicamente su id; la colección sigue siendo fuente del guardado y conserva importación antigua. La búsqueda de ampliaciones consulta contorno exterior/huecos; pruebas comparan sus resultados con búsqueda anterior exhaustiva, con islas y fronteras.
