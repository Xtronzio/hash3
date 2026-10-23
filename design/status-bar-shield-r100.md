# R100 · Franja superior opaca

La prueba R99 mantiene el desenfoque con texto en lugar del SVG. Jorge pide
una banda negra y dibujar la interfaz encima; se recupera el maestro C aprobado.

Se añade un div real fuera de #app, antes de él, con position:fixed, top:0,
left:0, width:100%, height:6px y fondo #08090b completamente opaco. No captura
punteros, no ocupa espacio en el flujo y permanece durante la navegación. Su
z-index:0 precede a #app, que ya está posicionado en móvil, para que el contenido
de la app se dibuje después. No modifica safe areas, viewport ni stacking de
la app, modales y avisos.

Referencia de la prueba publicada por su autor en iOS27:
https://modernwebweekly.substack.com/p/so-whats-up-with-the-ios27-blur
Describe un elemento fijo ≥6px de alto, ≥80% de ancho y a ≤4px del borde superior.
Esto es una hipótesis de corrección para este caso, no prueba en el iPhone de
Jorge. El z-index web por sí solo no demuestra control sobre el efecto nativo.

La QA compara geometría con la franja visible/oculta, verifica estilo real,
unicidad y persistencia, SVG restaurado, hit-testing y guardados en las tres
pantallas de Original/Inverso, seis tamaños y tres motores. Pipeline completo
y HTTP requeridos antes de publicar. Ritmo del territorio R98, datos e identidad
instalada intactos. R0.21.100 / 20261024-r311; resultado físico pendiente.

## Calaveras dispersas

Jorge añade la concentración progresiva de calaveras. deathRegion ordenaba por
número de vecinos y elegía las primeras nueve, manteniendo el orden del terreno
en los empates. Favorecía repetidamente la misma zona interior.

Se sortea entre el terreno seguro completo, excluyendo las ocho vecinas de
cada calavera existente o muerte anunciada. Muestreo sin reemplazo con hasta33
comprobaciones de jugada/salida legal. Sin sitio separado, se omite el intento.
Conserva inmunidad, escudos, anclajes, fronteras, cuerpos y reservas de obras.
Mismo azar inyectado en director y vía histórica, sin tocar frecuencia, carga,
preaviso ni permanencia. No recolocar las antiguas, retargetear avisos, cambiar
puntos, quitar terreno ni reactivar online. Original nueva/activa reglas30 para
separar resultados; Inverso24 y finales guardados intactos. Probar nacimientos
sucesivos, aviso/impacto real, guardar/cargar/trasladar, falta de sitio y33333.
