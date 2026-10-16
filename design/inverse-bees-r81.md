# R0.21.81 · Abejas de Inverso

Jorge autoriza el16/10/2026 introducir presión externa tras turnos sin cobrar: propuesta individual aprobada, aviso y redistribución de fichas propias. Respaldo remoto previo: backup/pre-inverso-bees-r80-20261016,5c2a1e83dbc4cc99acc10eeafba0db0b6065e9f2 (R0.21.80/r291).

## Primer ajuste de ritmo

Cada jugador sortea9/12/15turnos propios completos hasta su enjambre. No se muestra ni usa por IA el plazo oculto de calma. Cuando quedan3turnos se anuncia3/2/1; puede cobrar con puntos en cualquiera de esas tres oportunidades para reiniciar solo su cuenta con un nuevo plazo. El cobro por0consume turno sin reiniciar. Cobrar con puntos nunca borra historial ni mueve fichas adicionales. El rival no controla ni reinicia este contador.

Solo completar una colocación/turno o confirmar un cobro avanza. Doble cuenta una vez al acabar; cartas, trueques, mirar, marcar, mapas y pausa no avanzan. Un turno automático cuenta igual. Pausa y restauración conservan el sorteo y el aviso; no hay paso de tiempo real ni acciones offline.

## Enjambre

Al terminar el último turno sin cobro con puntos, redistribuir todas las X/O del símbolo afectado sobre posiciones del dibujo que no contengan otro símbolo o#. Incluye zonas previamente vaciadas; excluye huecos exteriores o interiores de la geometría. Fisher-Yates y reparación de posiciones fijas aseguran que cada ficha cambia de celda cuando es posible. Fichas rivales y# inmóviles. Mantener ids, propietarios y cantidades; conservar terreno, relleno, puntos, figuras, stocks y cadencia de#. Actualizar referencias de última ficha movida. Ningún cobro, relleno nuevo ni recarga al aterrizar. Con cero fichas o una atrapada, consumir el ciclo sin inventar destinos ni eliminar contenido.

Persistencia compacta: inverseBees.version1 con turns/since/limit/cycles por X/O; inverseBeeEvent solo id,jugador,símbolo,turno,ciclo,cantidad y movidas. Sin miles de coordenadas extra. El recorrido O(N) existe solo al impacto; navegación conserva ventana+margen2 e índices por snapshot. Animación breve de tres abejas y resalte de fichas visibles, sin nodos por todo el tablero, sin gasto ni repetición al restaurar. Movimiento reducido conserva señal estática. Avisos accesibles en cabecera, mapa y pausa; indicador compacto junto al contador de#.

## Compatibilidad e IA

Nuevas partidas inverseVersion3 activan abejas. R79/R80 activas o pausadas sin estado inician una sola vez en el próximo comando aceptado, desde0sin turnos históricos. Leer y ticks inactivos no migran. Inversos automáticos1/2, Original y finales históricos intactos. Final nuevo marca inverseBeeVersion1 y se compara por separado. Traslado conserva y valida contadores y evento.

Alto/PRO y turnos automáticos cobran un combo con puntos ante el último aviso si es legal. La valoración reduce el valor de la preparación durante3/2/1. La búsqueda oculta el plazo aleatorio de calma; usa el mismo árbitro para turnos, inventario, fichas y cobros. No hay información de destinos futuros ni garantía de victoria.

## Validación

14casos nuevos del motor: plazos/avisos, turno completo/Doble, independencia, cobro real/cero, conservación/colisiones, huecos, casos0/1ficha, pausa y tiempo, migración/legado, Alto/PRO/automático, plazo oculto/UI, resultados, traslado y33333fichas/evento compacto. Batería total642pruebas. QA remota en Chromium/Firefox/WebKit a320/390/428/740horizontal/1280/1920: aviso de ambos jugadores, mapa, pausa/recarga, cobro, impacto real y conservación, animación sin repetición, movimiento reducido, migración y Worker real. Pipeline completo y versión/assets públicos antes de finalizar. No equivale a dispositivos físicos.

Fuera de este bloque: hormigas de Original, duración Nubes/Niebla, frecuencias generales, Duelos/Mundo y SQL remoto.
