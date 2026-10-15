# Inverso con relleno · R0.21.78

Acuerdo final de Jorge del15/10/2026,18:12–18:16 Madrid. Sustituye la mecánica de
nuevas partidas de R77. Estado estable previo preservado en
backup/pre-inverso-fill-r77-20261015 (665f775).

## Motor

La silueta y sus huecos interiores definen coordenadas construidas inmutables.
Las celdas del dibujo empiezan sin X/O, con relleno neutro pendiente.
Cada figura que toque relleno pendiente cobra su puntuación habitual y bonus;
las figuras solapadas se evalúan todas sobre la misma instantánea de relleno.
Un combo solo en posiciones ya vaciadas limpia sus fichas pero da0puntos,0figuras,
0bonus y0recargas. Se retira la unión de fichas de todas las figuras resueltas,
incluidas las gratuitas; se quita relleno alcanzado, nunca se repone.

Las zonas vaciadas siguen siendo jugables para poner/mover/reunir fichas y
resolver los últimos objetivos. Borrar/Bomba modifican fichas y no quitan relleno
por sí mismas. Desplazar, Permutar, Tornado y conversiones siguen la misma regla
de puntos y progreso en su estado final. Termina al quedar relleno0, aunque aún
queden fichas. Mayor puntuación gana; el último movimiento no otorga victoria.

Datos: inverseVersion2 e inverseFill (claves de coordenadas). Version1 continúa
con su árbitro anterior para no inventar progreso ni perder puntos/stock.
Original conserva reglas24. Pausa, traslado y resultados guardan la versión y
el relleno; resultados de ambas versiones no se comparan juntos.

## Dibujos y selección

22 prediseñados: Corazón, Cohete, Almohadilla, Cuadrado, Estrella, Anillo, Luna,
Mariposa, Pez, Gato, Búho, Tortuga, Árbol, Flor, Castillo, Calavera, Robot, Mando,
Velero, Planeta, Copo de nieve y Laberinto. Huecos diseñados como parte de la
geometría, distintos del relleno eliminado durante la partida.

Escalas prefijadas S/M/L/XL: objetivos aproximados33/333/3333/9999; mostrar
siempre la cantidad real, sin deformar para forzar cantidades. Corazón pequeño32,
mediano330 y grande3326. Más resolución en prediseñados grandes, no bloques de
píxeles ampliados. Dibujos del editor conservan su matriz y se amplían por bloques;
si no caben en33333celdas/cuadrícula333×333, desactivar esa opción sin recortar.

Hall conserva entrada por rival. Dentro: Original/Inverso, miniaturas de dibujo,
botones de tamaño con conteo, opciones por icono+etiqueta para figuras, reloj,
objetivo y límites. Dificultad, símbolo e inventario/ecología mantienen controles
visuales. Cartas iniciales se despliegan solo al querer personalizarlas.

Contorno permanente y relleno diferenciado en tablero/mapas/pausa/miniaturas.
Indexación por instantánea; navegación consulta ventana+margen, sin nuevos
recorridos completos. Editor no cambia partidas guardadas.

## Verificación y límites

Pruebas de motor, legado, simetría de puntuación, relleno, almacenamiento y
traslado. QA de selector, escalas, cero fichas iniciales, cero puntos en vacío,
contornos, pausa, final y tablero grande en Chromium/Firefox/WebKit emulados.
Original mantiene toda su batería. No equivalen a prueba en iPhone físico ni
certifican que un dibujo libre sea resoluble. Frecuencias/Duelos/Mundo pendientes
conservados en design/inverse-r77.md; no se implementan en esta entrega.
