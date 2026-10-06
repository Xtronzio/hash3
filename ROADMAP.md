# Pendientes de #3

## Modo inverso / puzle

Anotado por Jorge el 5 de octubre de 2026. Pendiente de diseñar y desarrollar.

Partir de un tablero o figura predefinida que se transforme borrando y colocando fichas, formando nuevas figuras. Quedan por definir los objetivos, las reglas de borrado, la puntuación y cómo se completa cada reto. No está activado en el juego.

## Destructores para partidas largas

Idea para valorar en pruebas: liberar casillas sin quitar los puntos ya ganados, permitiendo nuevas construcciones y frenando el crecimiento del tablero. Puede evolucionar desde una herramienta de inventario a un actor automático que empiece tras cierta duración y actúe cada 30 segundos. Quedan por definir el momento de activación, los objetivos y el aviso previo. No está activado automáticamente.

## Inventario online

Equilibrar y extender las herramientas de práctica a Duelo y después a Mundo. R0.16.8 mantiene ocho cartas iniciales iguales, una herramienta por turno y una reposición cada cuatro turnos propios. La carta Combo, que se obtiene en las recargas, permite usar otras dos herramientas distintas tras activarla primero. En la herramienta Borrar, las colocaciones propias están protegidas: solo elimina fichas rivales del territorio conectado.

## Inmunidad ganada por buen juego

Implementada en R0.16.8 para VS máquina y Sin conexión: cada 3 / 33 / 333 colocaciones manuales de al menos 33 puntos entrega una carta de 1 / 3 / 33 rondas rivales. Los objetivos avanzan juntos, se repiten sin antigüedad mínima y conservan el progreso al gastar cartas. Las tres duraciones tienen existencias independientes, aparte de las ocho cartas de recarga. Cada carta indica existencias y combos restantes; el tablero resume progreso y protección. Ganar inmunidad anuncia el premio y resalta la bolsa en el color del modo. Pendiente: extensión a Duelo y Mundo junto con el resto del inventario.

## Espía

Idea de Jorge del 6 de octubre de 2026: avisar de ataques de inventario antes de resolverlos para elegir defensa o una jugada diferente. Pendiente de definir y desarrollar; no está activo.
