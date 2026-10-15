# #33 · Acuerdo aprobado: fauna, trayectorias y ocultamientos

## Estado y punto de partida

Jorge autorizó implementar este bloque el 15/10/2026, con Sol6.1 Alto. Este archivo conserva el acuerdo para continuar en un chat nuevo. El bloque todavía NO está implementado. Publicación conocida: R0.21.75 / 20261015-r286, main 43cafdc097b3ade0be976fbef91c210009a49c14, PR48. R75 y sus archivos públicos están verificados; 552 pruebas del motor y pipeline Chromium/Firefox/WebKit aprobados. Antes de empezar, consultar main remoto y conservar cambios posteriores si los hubiera.

Repositorio: Xtronzio/hash3. Rama de preparación: feature/local-fauna-fog-r76. Leer AGENTS.md y este acuerdo. El nombre R76 es una referencia de trabajo, no una publicación realizada.

## 1. Anaconda: gusano grande de avance progresivo

- Funciona como un gusano grande y persistente, con cuerpo mayor. No es una intervención instantánea como el rinoceronte.
- Avanza TRES celdas por turno, recorriéndolas una a una. Usar la definición vigente de turno completo de la ecología; Doble no debe acelerar indebidamente su avance.
- Elegir pasos aleatorios entre celdas contiguas por un lado. Sin saltos, diagonales ni volver sobre sus propias celdas recorridas.
- Continúa hasta quedarse sin continuación legal. Si al final solo puede recorrer una o dos celdas, las recorre y termina. No reemplazar esta regla por un número arbitrario de comidas o una desaparición por tiempo.
- Conservar la lógica pertinente del gusano para alimentación, cuerpo, avisos y defensas; comprobar que el cuerpo no suprima la última jugada o salida de ampliación. No eliminar puntos ganados ni inventar terreno.
- El tamaño concreto del cuerpo y la frecuencia no se fijaron numéricamente. Elegirlos mediante simulación y criterio de equilibrio; avisar a Jorge si aparece un problema o hace falta cambiar una regla acordada.

## 2. Rinocerontes y anacondas: variedad real, sin repetir trayectorias

El rinoceronte ya admite horizontal, vertical y las dos diagonales. La monotonía procede de rhinoRoutes: enumera recorridos máximos, ordena por longitud y desempates fijos, y vuelve a escoger los primeros. Corregir la selección, sin atribuir el fallo a falta de diagonales. Mantener dirección fija durante cada embestida y las barreras vigentes.

- Historial persistente de rutas utilizadas durante la partida; pausa, guardado, recarga y traslado no lo reinician.
- Una ruta recorrida al revés también se considera repetida. Tampoco duplicar rutas entre individuos de una misma plaga.
- Variar zonas y orientaciones. Un cambio mínimo de extremo que vuelve a barrer prácticamente el mismo corredor no resuelve la monotonía: favorecer zonas menos recorridas y comprobar solapamiento sustancial.
- Para anacondas, conservar también el recorrido propio durante su vida y evitar repetir trayectorias entre apariciones.
- Si no existe una ruta nueva válida, omitir esa aparición hasta que el tablero ofrezca otra; no reiniciar silenciosamente el historial para permitir repeticiones.
- En guardados antiguos, recuperar únicamente trazas disponibles. No inventar un historial completo que antes no se guardaba ni ejecutar efectos retrospectivos.
- Planificación acotada por snapshot/comando, sin búsquedas de caminos exhaustivas ni nuevos recorridos del tablero durante render, pan, zoom o relojes.

## 3. Nubes y Niebla: fenómenos del territorio

- Nubes: tres focos de tres celdas repartidos aleatoriamente, nueve celdas en total.
- Niebla: una zona compacta de treinta y tres celdas.
- Propuesta aceptada al autorizar el bloque: preaviso de tres turnos y efecto durante tres turnos completos, con contador. Congelar correctamente al pausar y conservar plazos al guardar/trasladar.
- Se conoce si una celda está libre u ocupada, pero se oculta qué signo y propietario contiene. Todas las fichas ocultas comparten representación neutra; tampoco revelar X/O/*/# mediante colores.
- Las celdas vacías continúan jugándose normalmente y las figuras se cobran con el tablero real. El fenómeno no modifica signos, propiedad, terreno o puntuaciones por activarse ni por terminar.
- Mantener reglas de defensas, fauna/fenómenos y planificación territorial existentes; integrar los nuevos fenómenos en la rotación sin añadir ráfagas o recargas pasivas.

### Aspecto aprobado expresamente por Jorge

El signo/velo tiene que sugerir NIEBLA. Usar un SVG/glifo del lenguaje gráfico del juego: velo suave y trazos horizontales de bruma, en tonos neutros. El PUNTO DE COLOCACIÓN de una celda libre debe distinguirse claramente por encima del velo. La celda ocupada se reconoce por la marca de niebla, sin descubrir su signo. No sustituir todo por puntos idénticos que confundan libre con ocupado.

Aplicar coherentemente a tablero, zoom, minimapa, mapa general, pausa y otras representaciones visibles. Cuidar marcas, descripciones accesibles y ayudas para que no revelen automáticamente el signo oculto. Conservar iconos/avisos de peligro y controles necesarios para jugar. Usar SVG/código nativo, no una imagen raster ajena al sistema maestro.

### Máquina y ayudas

El árbitro conserva la verdad del tablero para validar y puntuar. La máquina puede recordar información vista antes del ocultamiento, pero no consultar información oculta nueva para decidir. Adaptar su percepción/evaluación sin degradar las dificultades normales cuando no hay niebla. Examinar también las ayudas del inventario y mensajes para no revelar signos accidentalmente. Explicar cualquier limitación real antes de dar por cerrado este bloque.

## 4. Auditoría de puntuación al aterrizar

Comprobar integración real de Contagio, Pandemia, Tornados manuales y territoriales, Huracanes y Agujeros negros; incluir las cartas que recolocan (Permutar/Desplazar). Nuevas figuras X/O y bonus se cobran una sola vez tras el cambio final. Nunca descontar puntos históricos, cobrar por mover sin figura, duplicar pagos al repintar/restaurar o conceder recargas pasivas por fenómenos. Figuras realizadas bajo ocultamiento puntúan normalmente.

Ya existe scoreLandings; R74 integró Desplazar con su aviso de aterrizaje y añadió tests/landing-integration-r74.test.js. No reescribir una vía correcta sin evidencia. Añadir casos significativos para este bloque y comprobar eventos/avisos, no solo el helper aislado.

## 5. Cierre y conservación

Con este bloque se cierra el catálogo de cartas y de fauna/fenómenos, para pasar a equilibrio y depuración de apariencia. Nubes/Niebla y Anaconda son territorio/fauna, no compras nuevas del inventario del jugador.

Preservar R75: TU TURNO no cambia posición al aparecer avisos; estos lo cubren y al desaparecer vuelve a verse. Logo/relojes visibles, acciones accesibles de 44 px, cartas entre mochilas y recargas unificadas arriba. Brillo estático y pulso del turno solo al cambiar. Conservar contorno de Ampliadores y configuración de participantes.

Conservar partidas, puntos, stocks, reservas, excesos históricos, preferencias, anclaje y protección contra borrado, identidad C e independencia de inventarios humano/máquina, también humano O. Nuevos datos se migran idempotentemente; no retocar resultados terminados ni volver a disparar efectos/recompensas antiguos. Revisar si la ampliación de reglas requiere una nueva ruleVersion.

Solo Sin conexión/VS máquina. Duelo/Mundo y Supabase remoto continúan desactivados; no hacer trabajo SQL remoto ni reactivar modos online. Autorización de implementación/publicación vigente; respetar AGENTS.md y completar pipeline antes de integrar/publicar.

Criterio permanente de Jorge: si una propuesta plantea un problema de diseño, coherencia, uso o funcionamiento, avisar ANTES de aplicarla y proponer una alternativa. No aceptar todas las ideas automáticamente.

## Validación requerida

- Simular rutas, duración, ingesta, cobertura y agotamiento en tableros pequeños y grandes; verificar no repetición, orientación/zona, barreras/protecciones y salidas.
- Probar avance 3/turno, final con 1 o 2 pasos, pausa, guardado y traslado de fauna/rutas/ocultamientos.
- Verificar diferencias de percepción y memoria de máquina, ayudas, ocultamiento visual y accesible; el punto de colocación sigue siendo visible y pulsable.
- Comprobar pagos únicos X/O y bonus finales, sin pérdidas previas ni recarga pasiva.
- Motor, compilación, preservación/migración y pipeline completo Chromium/Firefox/WebKit emulados: 320/390/428/740 horizontal/1280/1920, mapa, pausa, reloj, movimiento reducido y 33.333 celdas con navegación acotada. No afirmar prueba física de iPhone/Safari.
- Solo después de pasar, integrar y verificar versión, HTML y archivos públicos por HTTP.
