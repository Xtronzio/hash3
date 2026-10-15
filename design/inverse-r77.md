# Inverso · acuerdo de Jorge, 15 de octubre de 2026

## Recuperación

Versión estable anterior: R0.21.76 / 20261015-r287, commit
`306a27a7b233ec756e6706cf0bf864c7f840d925`.
Rama remota de conservación: `backup/pre-inverso-r76-20261015`.
Los cambios se desarrollan en `release/local-inverse-r77`; Original permanece
en reglas24. No hay migración de partidas existentes a Inverso.

## Decisiones cerradas

- El hall no tiene un botón Jugar independiente. VS máquina y Sin conexión
  abren su configuración; dentro se elige Original / Inverso y después Jugar.
- Inverso usa la misma pantalla, mochila de jugador, controles, mapas, puntos,
  turnos, X/O, dificultad, reloj opcional y guardados. Sin inventario territorial,
  fauna, fenómenos, invasiones, ampliaciones ni modificación de terreno.
- La forma del tablero es fija. Colocar sin figura suma cero y pasa turno.
  Cada figura cobra los mismos puntos y bonus; se vacían las fichas de la unión
  de todas las figuras cobradas en el estado final. Nunca se eliminan celdas.
- El objetivo es vaciar contenido; termina al retirar la última ficha. Gana
  quien tenga más puntos acumulados, aunque no haya retirado la última.
- Inventario limitado a fichas: Doble, Ficha contraria, Ficha rival, Borrar,
  Desplazar, Permutar, Bomba, Tornado, Combo y ayudas de movimiento/turno.
  No Escudo/Inmunidad ni herramientas de terreno. Referee, catálogo, selección,
  sorteos, trueque, favoritos y máquina comparten la lista.
- Borrar y Desplazar sirven para cualquier color en Inverso. Bomba no puntúa;
  mezclas y recolocaciones cobran figuras nuevas por símbolo y vacían su unión.
- El editor coloca celdas vacías para dibujar la silueta. Permite corregir,
  deshacer, navegar, zoom, guardar y elegir; editar un prediseñado crea copia.
  Límite33333 celdas, coordenadas en cuadrícula333×333. Geometría personal en
  clave nueva; nunca reemplaza partidas. Juego y pausa mantienen mapas previos.
- Decisión de arranque anunciada a Jorge: el editor solo define geometría; al
  empezar se reparte contenido X/O y huecos, sin puntos ni figuras iniciales.
  Aproximadamente dos tercios ocupados. No se prometen mapas resolubles:
  siluetas con islas o muy pequeñas pueden exigir Borrar. Tablero lleno espera
  inventario; nunca inventa una ampliación, un pase o una victoria. Pausar y
  finalizar manualmente siguen disponibles.
- Copias y traslados conservan la geometría del juego y los resultados. Los
  dibujos personales sin partida siguen siendo locales del editor.

## Pendiente separado, no incluido en esta entrega

1. Auditar frecuencias de Original para ciclos de ampliación, estrategia,
   supervivencia, recuperación y vuelta al crecimiento. No cambiar ahora.
2. Activar Duelos 1vs1 y grupo con condiciones actuales y ambas modalidades;
   resolver rondas, pausas, desconexiones y sincronización antes de activar.
3. Mundo con extensión limitada y techos progresivos hasta33333 celdas,
   respaldado por pruebas de rendimiento. Inverso no se ofrece en Mundo.
4. Sin cambios remotos SQL/Supabase ni reactivación online por esta entrega.

## Validación

Pruebas específicas de puntuación/vaciado, inventario, terreno inmutable,
máquina, relojes, serialización, traslados, resultados y dibujos. Toda la batería
Original sigue siendo obligatoria. QA del selector/editor/partida/pausa en
Chromium/Firefox/WebKit emulados por CI antes de publicar Pages. No implica
prueba física en iPhone ni certifica resolubilidad de mapas del usuario.
