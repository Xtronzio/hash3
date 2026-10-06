# Pendientes de #3

## Modo inverso / puzle

Anotado por Jorge el 5 de octubre de 2026. Pendiente de diseñar y desarrollar.

Partir de un tablero o figura predefinida que se transforme borrando y colocando fichas, formando nuevas figuras. Quedan por definir los objetivos, las reglas de borrado, la puntuación y cómo se completa cada reto. No está activado en el juego.

## Destructores para partidas largas

Idea para valorar en pruebas: liberar casillas sin quitar los puntos ya ganados, permitiendo nuevas construcciones y frenando el crecimiento del tablero. Puede evolucionar desde una herramienta de inventario a un actor automático que empiece tras cierta duración y actúe cada 30 segundos. Quedan por definir el momento de activación, los objetivos y el aviso previo. No está activado automáticamente.

## Inventario online

Equilibrar y extender las herramientas de práctica a Duelo y después a Mundo. R0.16 limita las pruebas de VS máquina y Sin conexión a ocho cartas iniciales iguales, dos por turno y una reposición cada cuatro turnos propios. En la herramienta Borrar, las colocaciones propias están protegidas: solo elimina fichas rivales del territorio conectado.
