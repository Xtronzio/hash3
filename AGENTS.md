# Criterios de interfaz acordados con Jorge

Agrupar los iconos de navegación y acción en la misma línea siempre que el espacio disponible lo permita. La casa para volver al inicio debe compartir esa fila y quedar alineada en su extremo derecho. Evitar crear una segunda fila solo para la casa. Permitir el salto de línea únicamente cuando sea necesario para conservar el tamaño táctil y evitar desbordamientos.

Mantener este criterio durante todo el desarrollo y al crear o revisar pantallas, diálogos y botoneras.

# Navegación del tablero: criterio permanente

Renderizar únicamente la pantalla visible más dos celdas de margen de seguridad. Conservar el tablero completo como datos, nunca como nodos de la pantalla de juego. Durante arrastre y pellizco consultar índices espaciales preparados por snapshot; no recorrer terreno, opciones, fronteras o proyectos completos. Agrupar los movimientos en un requestAnimationFrame y reutilizar los nodos que siguen visibles. La caché debe limitarse a la última ventana.

El zoom extensión y los mapas de tableros grandes usan una representación agrupada y acotada; al acercarse recuperan el detalle. El mapa general oculto no prepara su dibujo ni hace mediciones durante la navegación. Mantener estas reglas al añadir cualquier herramienta, habitante o efecto. Verificar con un tablero grande y con herramientas/fronteras, además del tablero inicial.

# Iconos de retorno

Casita cuando el destino es el hall; flecha sin texto cuando se vuelve a la pantalla anterior. Conservar etiquetas accesibles y título. Determinar el destino real usando la pila de pantallas; no reutilizar una flecha para salir al hall. La casita comparte fila y queda a la derecha.
