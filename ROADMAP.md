# Pendientes de #3

## Modo inverso / puzle

Anotado por Jorge el 5 de octubre de 2026. Pendiente de diseñar y desarrollar.

Partir de un tablero o figura predefinida que se transforme borrando y colocando fichas, formando nuevas figuras. Quedan por definir los objetivos, las reglas de borrado, la puntuación y cómo se completa cada reto. No está activado en el juego.

## Roedores

Implementados en R0.17.0 para partidas locales, Duelo y Mundo. Cada 333 colocaciones efectivas aparece uno por jugador. Come 1+1+1 y duerme 3 turnos propios; se retira tras 33 ingestas reales. Busca alimento dentro del territorio conectado y marca el destino en amarillo. Sus huecos permiten reconstruir y puntuar figuras rotas, sin descontar los puntos anteriores. El mapa permite localizarlos y consultar su contador. Pendientes: equilibrar aparición con pruebas reales, tipos por perímetro/figura y herramientas para frenarlos. El cambio de nombre a #33 se ha valorado; no está aplicado.

## Inventario online

Equilibrar y extender las herramientas de práctica a Duelo y después a Mundo. R0.16.8 mantiene ocho cartas iniciales iguales, una herramienta por turno y una reposición cada cuatro turnos propios. La carta Combo, que se obtiene en las recargas, permite usar otras dos herramientas distintas tras activarla primero. En la herramienta Borrar, las colocaciones propias están protegidas: solo elimina fichas rivales del territorio conectado.

## Inmunidad ganada por buen juego

Implementada en R0.16.9 para VS máquina y Sin conexión con la aclaración de Jorge: cada 3 / 33 / 333 colocaciones manuales de al menos 33 puntos entrega 1 / 3 / 33 protecciones independientes, todas de una ronda. Los tres objetivos avanzan juntos, se repiten sin antigüedad mínima y conservan el progreso al gastar. Los premios se acumulan en una reserva aparte de las ocho cartas de recarga. El inventario de partida usa solo iconos y cantidades; la carta de Inmunidad va al final con el total guardado y activa una sola protección cada vez. Sus objetivos indican los combos restantes. El tablero queda sin franja ni marcas de inmunidad; cada combo válido muestra un aviso breve de avance. Las explicaciones completas y el icono de territorio protegido están en la guía del hall. Ganar unidades anuncia la cantidad y resalta la bolsa en el color del modo. Pendiente: extensión a Duelo y Mundo junto con el resto del inventario.

## Inmunidad del territorio y Escudo de una celda

Decisión de Jorge del 6 de octubre de 2026: Escudo protege una celda concreta con una ficha propia; Inmunidad protege todo el territorio frente a ataques de inventario. Guardada no se gasta. Cada activación consume una unidad de reserva y termina tras una ronda rival completa aunque no haya ataques. Las unidades restantes no se activan automáticamente. La función propuesta inicialmente como Espía queda integrada en Inmunidad; no se desarrollará como otra carta ni como aviso previo independiente. Los guardados de R0.16.8 convierten las cartas largas en unidades de una ronda, conservando los premios restantes.
