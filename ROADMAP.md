# Pendientes de #3

## Modo inverso / puzle

Anotado por Jorge el 5 de octubre de 2026. Pendiente de diseñar y desarrollar.

Partir de un tablero o figura predefinida que se transforme borrando y colocando fichas, formando nuevas figuras. Quedan por definir los objetivos, las reglas de borrado, la puntuación y cómo se completa cada reto. No está activado en el juego.

## Destructores para partidas largas

Idea para valorar en pruebas: liberar casillas sin quitar los puntos ya ganados, permitiendo nuevas construcciones y frenando el crecimiento del tablero. Puede evolucionar desde una herramienta de inventario a un actor automático que empiece tras cierta duración y actúe cada 30 segundos. Quedan por definir el momento de activación, los objetivos y el aviso previo. No está activado automáticamente.

## Inventario online

Equilibrar y extender las herramientas de práctica a Duelo y después a Mundo. R0.16.7 mantiene ocho cartas iniciales iguales, una herramienta por turno y una reposición cada cuatro turnos propios. La carta Combo, que se obtiene en las recargas, permite usar otras dos herramientas distintas tras activarla primero. En la herramienta Borrar, las colocaciones propias están protegidas: solo elimina fichas rivales del territorio conectado.

## Inmunidad ganada por buen juego

Idea de Jorge del 6 de octubre de 2026, pendiente de concretar objetivos e implementar. Ganar una carta de inmunidad mediante objetivos de calidad de las jugadas, por ejemplo completar cierto número de jugadas por encima de un umbral de puntos o de tamaño de figura. Cada nivel tiene un objetivo independiente: inmunidad de una, dos o tres rondas.

La carta se guarda hasta que el jugador decida activarla. Si conserva el nivel uno y completa el siguiente objetivo, mejora a nivel dos; puede continuar hasta nivel tres. La progresión mejora la duración de una misma carta, no suma tres cartas de una, dos y tres rondas. Durante la inmunidad activa no pueden atacarle con inventario. Quedan por definir los umbrales, qué cuenta como ronda y el alcance exacto de los ataques bloqueados; no hay parámetros ni recompensas automáticas implementados todavía.
