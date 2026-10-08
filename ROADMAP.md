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

## OVNI y cataclismo: próximos desarrollos

Decisión de Jorge, 8 de octubre de 2026: incorporar próximamente el OVNI y el cataclismo. El OVNI abduce las fichas de una zona extensa y conserva sus celdas. El cataclismo demuele por completo una zona extensa: desaparecen tanto sus fichas como sus celdas; su finalidad es controlar el tamaño del mapa. Pendientes de implementación: superficie afectada proporcional, frecuencia, continuidad de territorios y tratamiento de fronteras, reservas y habitantes de la zona. La navegación virtualizada sigue siendo necesaria por sí misma. No anunciar estas acciones como disponibles.

## Fauna vigente desde R0.21

Sustituye el ciclo antiguo de Roedores descrito arriba: roedor cada 33 colocaciones, bomba automática cada 66, gusano cada 99, obras cada 198. Ciclos de 33 segundos; roedor tres comidas y retirada, gusano tres comidas y retirada en el ciclo siguiente, tres parejas constructor/destructor con tres intervenciones por pareja. La ayuda de R0.21.12 refleja estos ciclos y sus iconos.

## Fauna proporcional: cálculo y propuesta, 8 de octubre de 2026

Nuevo requisito: toda la fauna y los obreros deben crecer con la superficie para mantener la incidencia. El 198 de las obras fue una elección del asistente a partir del m.c.m. de 33, 66 y 99; no procede de un cálculo de equilibrio de obreros. La capacidad actual es de hasta 33 fichas retiradas por cada 198 colocaciones (16,67 % de las colocaciones), sin garantía de alimento ni de ejecución completa.

El cálculo y la calibración propuesta están en [design/fauna-proporcional.md](design/fauna-proporcional.md). Se propone población objetivo por zona activa, compartida entre jugadores, con reposición y límites por alimento/terreno disponible. La referencia inicial propuesta es 333 celdas: 3 roedores, 1 bomba, 1 gusano y 3 parejas de obreros. Triplicar superficie triplica población. Esta calibración aún no modifica el código ni la ayuda publicada; debe probarse antes de sustituir los hitos vigentes. Evitar multiplicar sin límite cada aparición por colocaciones: en tableros grandes puede crear una demanda de consumo superior a las nuevas fichas.

## R0.21.13: comportamientos y protección de guardados

Implementado en el motor local: roedores por movimiento, grupos de 1/2/3 en hitos 33/66/99 (y sucesivos), tres visitas por grupo; cada visita consume una ficha por roedor en posiciones diferentes y se muestra 0,9 segundos. No se recuperan comidas ausentes. Gusanos se retiran con su tercera comida, liberando su rastro a los 99 segundos si encuentran alimento. La ficha neutral # del territorio aparece cada 33 colocaciones como calibración inicial, prioriza completar/bloquear figuras, no pertenece a X/O ni puntúa y deja un hueco legal. Borrar/Bomba la eliminan; Tornado puede desplazarla. El motor de la máquina reconoce su símbolo como obstáculo.

Los tres grupos quedan separados en la ayuda: inventario del jugador, fauna local (roedores/gusanos/obreros) e inventario del territorio (#/lluvia de bombas y próximos OVNI/cataclismo). Animaciones mínimas para comidas, #, explosiones y ejecución de obras; índices espaciales y ventana de pantalla más dos celdas conservados.

Anclar protege contra borrado accidental. Menú y gesto bloquean la acción; el borrado local y la confirmación online comprueban el anclaje actual antes de actuar. Para borrar hay que desanclar.

La migración `20261008082437_turn_rodents_neutral_hash.sql` y `tests/turn-inhabitants.sql` están verificadas en PostgreSQL local. Aplicación remota pendiente mientras las conexiones SQL de Supabase agotan el tiempo de espera. No anunciar estos comportamientos como desplegados en Duelo/Mundo hasta completar la migración. La calibración proporcional de gusanos, obras y lluvia de bombas sigue pendiente; la aclaración de roedores sustituye su propuesta de reposición por reloj.

## R0.21.14: ecología proporcional y selección por iconos

Motor local: sorteo de una carta territorial por nuevo hito de 333 celdas, escala 33/333, lluvia destructiva por grupos de tres, Cataclismo con dos vecinos por celda y OVNI proporcional a fichas. Avisos de 33 s, separación de fauna y recuperación de 33 s + 3 colocaciones con recalibración de población. Presupuestos e intervalos de fauna proporcionales; capacidad ideal conjunta 30,3 % de nuevas colocaciones. Tres checks por iconos y persistidos por partida. Correcciones de # en animación/mapa de pausa y destinos de cartas con punto amarillo. Ver design/fauna-proporcional.md para cuentas y límites.

Pendiente: portar estas reglas y opciones a Duelo/Mundo cuando se restablezca SQL; probar equilibrio real en partidas largas. Propuesto por Jorge: segundo uso de Inmunidad como turno de calma, todavía sin implementar.

R0.21.14 también incorpora ampliación libre cada tres figuras, máximo una guardada, con icono ×1. Se gasta al colocar, admite huecos y no consume créditos normales; la ampliación normal se mantiene.

R0.21.14 en desarrollo: objetivos por celdas, tiempo total y colocaciones, final automático y archivo compacto en Logros; búsqueda de ampliaciones desde bordes y guardado sin copia completa antigua. 33.333 requiere validación móvil; portado online pendiente.
