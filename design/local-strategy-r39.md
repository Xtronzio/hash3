# #3_12 · Estrategia local R0.21.39

Solo VS máquina y Sin conexión. Duelo/Mundo y consultas de aplicación a Supabase siguen desactivados. SQL autoritativo y sus siete fenómenos históricos no cambian.

## Turnos y anuncios

Los intentos conservan los contadores de colocaciones existentes: ratón66, gusano33, habitantes66 por zona (escala raíz de F); invasión33 y fenómenos99 compartidas, habilitados desde33 figuras. Se retiran los disparadores por segundos. No se modifica el reloj de turno, el objetivo temporal de partida ni Inmunidad33s.

Cada aparición se anuncia con tres turnos completos y posiciones previstas. El turno que crea el aviso no lo descuenta. Colocaciones normales, automáticas y pases completados avanzan; Doble solo al terminar sus dos fichas. Cartas, ampliaciones, pausa y tiempo cerrado no avanzan. Ratones/gusanos esperan tres turnos antes de actuar; obras intervienen cada tres turnos durante tres ciclos. Recuperación tras un fenómeno natural: tres turnos completos. Invasiones no suspenden fauna; fenómenos naturales sí.

Ratón/gusano alternan una aparición pequeña (un individuo) y plaga (hasta3F); cupos compartidos y alimento pueden reducirla. El cupo de gusanos permite3F para su versión de plaga. Las comidas siguen3/6/9 por lote efectivamente activado, cada tres turnos; rastro protegido máximo3. No contar anuncios como aparición efectiva. Nuevas variantes locales Tornado3×3 y Contagio hasta3F próximos; Huracán/Pandemia conservan presupuestos grandes. Meteoritos y Cataclismo conservan sus efectos y presupuestos, con geometrías dispersa/compacta. Alias antiguos siguen reconocidos.

## Dos inventarios independientes

Jugador: dos columnas con ataque, defensa, ampliación, eliminación y ayuda; cada icono muestra stock ×N. Territorio: dos columnas próximas, pequeño/grande, sin cartas de jugador: ratón/plaga, gusano/plaga, ampliador/soldado, meteoritos/cataclismo, tornado/huracán, contagio/pandemia, agujero negro/OVNI, colonia/bombardeo. Sus números indican el próximo intento de aparición (colocaciones o figuras), incluso si hay eventos activos. Son intentos de familia; no prometen el tipo aleatorio siguiente. Avisos/anuncios independientes muestran lo que queda hasta el impacto, la próxima intervención o la comida.

Ampliadores: + amarillo sin casco. Solo la zona que añaden tiene contorno punteado amarillo. Soldados: espadas amarillas, limpian exclusivamente * y conservan terreno; nunca destruyen su territorio. Solo Muro/Frontera morados.

## Herramientas y seguimiento

Ampliación1×1 existente más cartas2×1/3×1: terreno nuevo exacto, adyacente a zona jugable, orientación horizontal/vertical, límites y barreras/reservas. Previsualizar, girar, proponer y cancelar no gastan; confirmar consume la carta/cupo habitual sin colocar ficha ni avanzar evento. Ocho iniciales y caps18cartas/12tipos/3unidades conservados; nuevas cartas entran por sorteo sin recargas históricas.

Desplazar puede mover una bomba individual de Bombardeo pendiente a otra celda válida existente, aunque esté ocupada. Conserva turno restante y otras bombas, no mueve las fichas. Gasta una carta como Desplazar normal. No permite manipular fauna ni otros fenómenos.

Hasta tres dianas de posición, sobre terreno propio/rival/vacío/invadido. Conservan coordenada al cambiar/mover/borrar ficha o demoler terreno, con salto directo y retirada desde modo marcado; guardados/mapas/pausa las conservan. No puntúan ni avanzan turnos.

## Guardados y rendimiento

Migración local turnEcologyVersion1/ruleVersion13, atómica/idempotente en la colección de partidas: reemplaza avisos/reloj de obras por tres turnos, elimina relojes de nacimiento y recuperación, conserva scores/stock/geometría/pins/historial. Finales históricos intactos. Obras existentes conservan sus puestos; fauna viva conserva progreso. No simular turnos de inactividad.

Ventana visible+margen2, índices por snapshot incluidos bombas/dianas, máximo33 pins de ecología. Navegación no recorre todo el tablero ni prepara mapas ocultos. QA unitario, SQL desechable sin deriva, simulaciones y Chromium táctil en CI; no equivale a ensayo en Safari/iPhone físico.
