# R0.21.79 · Cobro voluntario y revisión Alto/PRO

Autorización de Jorge16/10/2026: Inverso con cobro a demanda, comodines periódicos e inventario; auditar Alto/PRO porque gana con facilidad. Hormigas solo Original y fuera de esta entrega. Nubes6/Niebla9 y auditoría de frecuencias pendientes, sin aplicar en este bloque.

Respaldo remoto de R78/r289: backup/pre-inverso-claims-r78-20261016,286beafd198a3700ba2be55daec522e38992ed75. Nuevas partidas inverseVersion3; guardados1/2 conservan mecánica, progreso, contorno, puntos e inventario. Las mejoras de búsqueda se aplican también a Alto/PRO de la versión2 sin cambiar sus reglas. Finales y comparaciones distinguen versiones.

## Reglas

Colocar no cobra ni elimina figuras. Cada turno se elige colocar o cobrar una figura propia concreta. Cobrar termina el turno, retira sus fichas/# y el relleno que alcance. Se selecciona desde Cobrar, una ficha de la figura y su geometría; vista previa/cancelación no cambian nada. Las posiciones vaciadas siguen utilizables y el contorno nunca cambia. Solo una figura con relleno pendiente cobra su valor completo y bonus. Una figura enteramente vaciada se retira por cero puntos/figuras/bonus/recargas, gastando el turno. Último relleno termina; gana la puntuación acumulada, no necesariamente quien termina.

Inventario conserva límites/coste/turno. Mover, convertir, Permutar o Tornado preparan geometrías y no cobran automáticamente. Borrar/Bomba no vacían relleno. Doble debe terminar sus colocaciones antes de cobrar; no sirve para colocar y cobrar en el mismo turno. Ayuda puede señalar un cobro, Súper Ayuda lo propone y confirma mediante el árbitro normal. Cobro>=33 permite la recarga de combo, sin recargas por espera o cartas.

Primer ajuste de # comunicado: una aparición neutral por cada9colocaciones aceptadas entre ambos, máximo3simultáneos. Cobros/cartas/pausa no avanzan el contador. Doble suma dos colocaciones. Si hay cupo completo o no se puede dejar una colocación libre, no hay aparición en ese ciclo. Solo posiciones libres del dibujo; relleno eliminado no reaparece. Sirve para ambos signos, pero toda figura necesita al menos una ficha propia X/O. # usados se retiran con la figura cobrada.

## Auditoría IA

Original conserva parámetros Alto4ply/180ms/5000nodos y PRO12ply/3000ms/420000nodos. Encontrado error de simulación: tras la primera colocación de Doble alternaba al rival, aunque el árbitro mantiene el turno. Corregidos cambio de turno, reversión y clave de transposición. Caso normal verificable: X(2,0)(1,1)(0,0), O(0,2)(1,2), turno O con dos colocaciones. Antes elegía(2,1), margen final X−O=-8; continuación óptima(1,0), margen=-10. Otros casos encontrados daban mejora de9y8puntos. Tests con símbolos intercambiados y figuras normales/avanzadas contrastan exhaustivamente con el árbitro.

Inverso antes compartía una búsqueda de una respuesta con listas8/16 para Alto/PRO y tácticas de inventario casi idénticas. Nuevo análisis de colocación/cobro/cartas con árbitro real, profundidad iterativa, respuestas del rival, Doble y stock reales. Alto hasta3acciones/450ms; PRO hasta6/1800ms y más candidatos. Iteraciones incompletas no sustituyen la última completa. Las claves incluyen inventarios, efectos y progreso; no tratar cotas de poda como valores exactos. Límites son presupuestos de búsqueda, la preparación inicial puede añadir coste. La mejora no implica invencibilidad ni certificación en dispositivos físicos.

## Validación

618 pruebas del motor antes de empaquetado, incluyendo14nuevas de Inverso y un grupo que verifica Doble en8combinaciones. Casos de cobro final, figura elegida entre solapes, mayor longitud, cero puntos en vaciado, # para ambos, límite/cadencia, reloj vencido, ayuda y traslado. QA CI de18combinaciones de tamaño/motor Chromium/Firefox/WebKit y cobro del Worker real; regresiones completas Original/guardados Inverso1/2 antes de Pages.

La recuperación tras fallo/timeout del Worker elige ahora puntos y defensa en una muestra legal acotada, en vez de la primera celda libre. No gasta inventario. Se conserva la recuperación sin bloqueos de R64. El cierre de poco relleno puede encadenar compra real/conversión/cobro solo si el coste conserva la victoria; probar50→17→20puntos contra10.
