# Criterios de interfaz acordados con Jorge

Agrupar los iconos de navegación y acción en la misma línea siempre que el espacio disponible lo permita. La casa para volver al inicio debe compartir esa fila y quedar alineada en su extremo derecho. Evitar crear una segunda fila solo para la casa. Permitir el salto de línea únicamente cuando sea necesario para conservar el tamaño táctil y evitar desbordamientos.

Mantener este criterio durante todo el desarrollo y al crear o revisar pantallas, diálogos y botoneras.

# Navegación del tablero: criterio permanente

Renderizar únicamente la pantalla visible más dos celdas de margen de seguridad. Conservar el tablero completo como datos, nunca como nodos de la pantalla de juego. Durante arrastre y pellizco consultar índices espaciales preparados por snapshot; no recorrer terreno, opciones, fronteras o proyectos completos. Agrupar los movimientos en un requestAnimationFrame y reutilizar los nodos que siguen visibles. La caché debe limitarse a la última ventana.

El zoom extensión y los mapas de tableros grandes usan una representación agrupada y acotada; al acercarse recuperan el detalle. El mapa general oculto no prepara su dibujo ni hace mediciones durante la navegación. Mantener estas reglas al añadir cualquier herramienta, habitante o efecto. Verificar con un tablero grande y con herramientas/fronteras, además del tablero inicial.

# Iconos de retorno

Casita cuando el destino es el hall; flecha sin texto cuando se vuelve a la pantalla anterior. Conservar etiquetas accesibles y título. Determinar el destino real usando la pila de pantallas; no reutilizar una flecha para salir al hall. La casita comparte fila y queda a la derecha.

# Incidencia proporcional de habitantes

Requisito de Jorge, 8 de octubre de 2026: roedores, gusanos, bombas y obreros deben aumentar con la superficie del tablero para conservar su incidencia relativa. Mantener la escala del 3 siempre que sea posible. Los cupos se comparten por zona activa, sin multiplicarlos otra vez por cada jugador. Separar población, aparición por colocaciones y reloj de actuación. Las cifras de calibración propuestas en design/fauna-proporcional.md todavía requieren validación y no son reglas publicadas. Mantener la navegación virtualizada al incorporar esta dinámica.

OVNI: abduce fichas de una zona extensa y conserva todas sus celdas. Cataclismo: demolición total de una zona extensa, retirando sus celdas y fichas, para controlar la superficie. Son desarrollos próximos; no confundir sus efectos ni anunciar que están implementados.

# Grupos del juego y animaciones

Inventario del jugador: cartas para ayudar al jugador y perjudicar al rival. Fauna local: roedores, gusanos y obreros, habitantes con comportamientos característicos. Inventario del territorio: #, lluvia de bombas, OVNI y cataclismo, cartas del propio tablero para controlar ocupación y crecimiento. No presentar bombas, OVNI o cataclismo como fauna. Las acciones que lo requieran muestran una animación breve y elemental, respetando el minimalismo y el renderizado por ventana.

Aclaración de Jorge sobre roedores, 8 de octubre de 2026: hitos propios de 33/66/99 activan grupos de 1/2/3; el grupo aumenta en uno cada 33 colocaciones. Cada roedor hace una visita por movimiento jugado, come una ficha y desaparece; tres movimientos completan hasta tres comidas por roedor en posiciones diferentes. No tienen reloj. Gusanos: comidas cada 33 segundos y retirada inmediata al completar la tercera, a los 99 segundos con alimento continuo. Esta aclaración sustituye la propuesta de población por tiempo para roedores.

# Anclar protege contra borrado

Una partida anclada no se puede borrar ni quitar de Mis partidas. Bloquear menú, gesto y operación de borrado; comprobar el anclaje actualizado también al confirmar y antes de enviar la operación online. Desanclar es requisito previo. Si no se puede verificar el anclaje, conservar el guardado. Anclar no impide abrir, pausar, retomar ni finalizar.
