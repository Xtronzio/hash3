# Pendientes de #3

## Inventario: bloque R0.20.0

Orden acordado por Jorge el 7 de octubre de 2026: cerrar primero el inventario y después desarrollar el bloque completo de habitantes. Implementadas para VS máquina y Sin conexión:

- Tornado: selección 3×3 como al ampliar; mezcla fichas y huecos existentes, conserva símbolos, dueños, terreno y puntos. Las fichas con Escudo o Inmunidad y las reservas de Bloqueo permanecen en su lugar.
- Bomba: elimina tres fichas en un grupo conectado al azar por vecindad de ocho direcciones, sin plantillas de línea, L o diagonal. No elimina terreno ni descuenta puntos. Junto a una Frontera puede alcanzar huecos y romper los tres segmentos de la barrera. Respeta Escudo e Inmunidad.
- Frontera: tres segmentos en una cara seleccionable y giratoria. Bloquea las ampliaciones que crucen esa cara y el paso de habitantes en ambos sentidos; se puede rodear. Es permanente y solo Bomba la rompe. Debe dejar alguna salida para ampliar. El mapa y los guardados conservan las barreras.
- Ayuda de ampliación: durante esa fase propone una ubicación favorable y legal para el 3×3. Consume su carta al mostrar la sugerencia; el jugador confirma la ampliación o elige otra.
- Súper Ayuda: analiza movimientos y cartas disponibles, propone una secuencia para el turno actual con los recursos y puntos previstos, y la ejecuta tras confirmar. Cancelar no consume nada. La ejecución consume su carta y las herramientas propuestas, respeta Combo, Doble, protecciones, reloj y turno. No juega por el rival ni amplía automáticamente.

Las tres ayudas están agrupadas bajo Ayuda. Se mantienen las ocho cartas iniciales, una herramienta ordinaria por turno o dos tras Combo, recarga cada cuatro turnos propios, máximo ocho cartas y dos de cada tipo. Las cinco nuevas cartas entran por la recarga; los guardados anteriores las incorporan con reserva cero. Desplazar ficha ya existía y no se duplica. Tornado y Bomba no puntúan directamente; las figuras rotas pueden reconstruirse y cobrarse con una colocación posterior.

Pendiente independiente: extender el inventario a Duelo y Mundo.

## Siguiente bloque: habitantes

Decisiones posteriores al comportamiento original de Roedores: aparición cada 33 colocaciones propias; tres comidas separadas por 33 segundos. Bomba habitante cada 66, que vacía tres fichas; Gusano cada 99, con tres comidas adyacentes de ocho direcciones y cuerpo que bloquea. OBRA coordina tres constructores y tres destructores, con tres pasos cada 33 segundos: nueve celdas construidas y nueve eliminadas. Los proyectos deben mostrarse completos. Queda concretar la desaparición del Gusano tras la tercera comida y el reloj de zonas inactivas. Al salir de una partida personal no debe avanzar en ausencia ni ejecutar acciones acumuladas al regresar. Estas reglas todavía no están implementadas; el Roedor actual conserva su comportamiento anterior hasta completar el bloque.

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
