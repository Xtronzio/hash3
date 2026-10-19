# R0.21.90 · Frontera y castores

Acuerdo Jorge19/10: ampliar solo amplía. Ninguna oferta ni permiso de Muro o
Frontera en ampliación pendiente obligatoria o estratégica. Ambas cartas siguen
en el inventario, en el turno normal y con su gasto habitual.

Frontera cubre una celda construida, vacía, con colocación legal, dejando otra
jugada disponible. Impide colocar a ambos; no caduca. Solo el dueño puede
retirarla pulsando y confirmando, gratis, sin consumir turno/carta/cupo ni avanzar
eventos, también fuera de turno. No devuelve la carta gastada. Bomba, Atómica,
fenómenos y fauna conservan frontera y terreno subyacente. Muro conserva su celda
exterior y su vulnerabilidad a bombas. Fronteras previas mantienen su geometría
y propietario, sin conversiones ni reembolsos nuevos.

Cada castor levanta tres celdas y reparte una permutación aleatoria de3/6/9
turnos entre ellas. Se retira cada celda al agotarse su contador, conservando el
resto del grupo. Cuenta cada turno completo de cualquiera de los colonos; Doble
una vez. Cartas, ampliaciones, consultas, reloj y pausa no avanzan. Persistir los
contadores por celda en guardados y traslados; el indicador de grupo representa
la próxima retirada. Las barreras antiguas vivas reparten proporcionalmente su
plazo pendiente, sin extenderlo ni repetir efectos ya resueltos.

Original adopta reglas25 en nuevas y activas; finales históricos intactos.
Inverso conserva reglas24 y sus herramientas permitidas. Online sigue aislado
y el cron remoto hash3-world-clock permanece apagado.

Validación:712 pruebas de motor, comandos de ambos dueños, cancelación y retirada
real en navegador, conservación de clocks/puntos/stock, pausa/traslado,
caducidades3/6/9, ampliación obligatoria/estratégica y navegación33333 acotada.
QA Chromium/Firefox/WebKit en seis tamaños y pipeline antes de publicar; verificar
R0.21.90/r301 y assets públicos. Emulación no equivale a dispositivos físicos.
