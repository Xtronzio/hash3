# Criterios de interfaz acordados con Jorge

Agrupar los iconos de navegación y acción en la misma línea siempre que el espacio disponible lo permita. La casa para volver al inicio debe compartir esa fila y quedar alineada en su extremo derecho. Evitar crear una segunda fila solo para la casa. Permitir el salto de línea únicamente cuando sea necesario para conservar el tamaño táctil y evitar desbordamientos.

Mantener este criterio durante todo el desarrollo y al crear o revisar pantallas, diálogos y botoneras.

# Navegación del tablero: criterio permanente

Renderizar únicamente la pantalla visible más dos celdas de margen de seguridad. Conservar el tablero completo como datos, nunca como nodos de la pantalla de juego. Durante arrastre y pellizco consultar índices espaciales preparados por snapshot; no recorrer terreno, opciones, fronteras o proyectos completos. Agrupar los movimientos en un requestAnimationFrame y reutilizar los nodos que siguen visibles. La caché debe limitarse a la última ventana.

El zoom extensión y los mapas de tableros grandes usan una representación agrupada y acotada; al acercarse recuperan el detalle. El mapa general oculto no prepara su dibujo ni hace mediciones durante la navegación. Mantener estas reglas al añadir cualquier herramienta, habitante o efecto. Verificar con un tablero grande y con herramientas/fronteras, además del tablero inicial.

# Iconos de retorno

Casita cuando el destino es el hall; flecha sin texto cuando se vuelve a la pantalla anterior. Conservar etiquetas accesibles y título. Determinar el destino real usando la pila de pantallas; no reutilizar una flecha para salir al hall. La casita comparte fila y queda a la derecha.

# Anclar protege contra borrado

Una partida anclada no se puede borrar ni quitar de Mis partidas. Bloquear menú, gesto y operación de borrado; comprobar el anclaje actualizado también al confirmar y antes de enviar la operación online. Desanclar es requisito previo. Si no se puede verificar el anclaje, conservar el guardado. Anclar no impide abrir, pausar, retomar ni finalizar.

# Reglas de ecología R0.21.14

Tres controles independientes con iconos: Inventario rival (máquina), Fauna / habitantes y Fenómenos territoriales. Persistirlos con la partida. Valores antiguos por defecto activan ecología, sin ejecutar hitos históricos. Inmunidad: regla R0.21.16 abajo; sustituye la antigua ronda y la propuesta de calma global.

Fauna: contador y cupos compartidos por zona, no por jugador. Presupuesto N/333 con pesos 3/1/1 para roedores/gusanos/proyectos de obras, crédito fraccionario y población acotada. Intervalos de nacimiento 33/99/198 × max(1,N/333), redondeados hacia arriba. El aumento del intervalo mantiene capacidad teórica conjunta de roedores y gusanos en 30,3 % de nuevas colocaciones desde 333 celdas, inferior en tableros pequeños. Los roedores hacen tres visitas por colocaciones, nunca por tiempo; comen una ficha por individuo y visita, excluyen # y la ficha nueva. Gusanos actúan cada 33 segundos y salen inmediatamente con su tercera comida. Obreros construyen y destruyen de manera equilibrada.

Fenómenos: Jorge eligió 33 de cada 333 (9,91 %, no 1/9 exacto), sortear una sola carta en cada nuevo hito 333/666/999… celdas y aviso de 33 segundos. No repetir hitos al reconstruir tras destrucción. Lluvia de bombas demuele terreno y fichas dispersos en grupos de tres; la carta Bomba del jugador conserva el terreno. Cataclismo demuele una región compacta en la que cada celda toca al menos otras dos por los lados; conservar anclajes. OVNI retira esa proporción de fichas ocupadas, sin eliminar terreno. Si no hay región válida, sortear una carta viable. No acumular ráfagas de eventos.

Desde el aviso se suspende la fauna. Tras el impacto recalcular población, descartar excessos y crédito pendiente, reiniciar próximos nacimientos, y dejar 33 segundos y tres colocaciones de recuperación. Congelar avisos y recuperación al pausar. Conservar puntos. No modificar el criterio de navegación: índices por snapshot y solo pantalla más dos celdas. Avisos con icono y cuenta atrás, sin texto explicativo visible; explicaciones en Cómo se juega.

Cartas que seleccionan destinos vacíos: punto amarillo además del marco. Aparición de # con glifo y pulso propios; si coincide con comida de roedor, priorizar #. El mapa de pausa muestra # al acercarse, igual que X/O.

Estas reglas se aplican al motor local. Duelo/Mundo mantienen reglas previas mientras la conexión SQL de Supabase siga bloqueando la actualización.

Ampliación libre acordada: cada tres figuras cobradas concede una, acumulables en la reserva. Icono 3×3 con ×N; puede gastarse en el turno propio aunque haya huecos. Previsualizar/cancelar no consume el premio ni reinicia el reloj; colocar sí consume uno y deja continuar el mismo turno. No consume créditos normales ni permite usarla a mitad de Doble. Las ampliaciones normales al llenar permanecen. Los premios históricos no se conceden al abrir guardados. Esta vía de crecimiento por mérito evita depender de llenar huecos mientras actúa la ecología.

Límite clásico: sin fauna y sin fenómenos, objetivo aprobado 33.333 CELDAS CONSTRUIDAS reales en cualquier modalidad excepto Mundo. No medir caja envolvente ni bloques históricos. Expansiones normales, libres y Construir celda respetan el cupo. Al alcanzar el cupo, finalizar por puntos inmediatamente, aunque queden huecos (finishReason board-limit). Variantes con ecología mantienen control por habitantes/fenómenos; no aplicarles este límite por inferencia.

Validación del máximo: Jorge descartó 999 y eligió 33.333 como objetivo tras medir 9.999/33.333/99.999. El cupo de la versión en desarrollo es 33.333, pero no publicar el nuevo máximo como garantizado antes de mejorar guardado/cálculo y verificar móviles. El ensayo sintético Node no valida dispositivos ni cuotas reales.

Objetivos de partida acordados: celdas actuales 33/333/3.333/33.333 (con o sin ecología), tiempo total 3/5/10 minutos o movimientos 33/333/3.333/33.333 en modos locales. Tiempo total independiente del reloj del turno; congelar al pausar. Movimientos son colocaciones aceptadas de ambos participantes; Doble suma dos, cartas/ampliaciones cero. Finalizar inmediatamente al alcanzar objetivo, después de puntuar la última colocación. Resumen compacto inmutable en Logros, agrupado por objetivo, modalidad, nivel/dificultad, reloj, ecología e inventario rival; no comparar con finales manuales. Conservar resumen al borrar tablero; anclaje sigue bloqueando borrado. No portar nuevos modos a Duelo/Mundo sin servidor actualizado. Mundo continúa sin límite.

Minimapa: no agrupar fronteras como si fueran terreno ni desplazar sus marcadores a la esquina de una tesela. En zoom alejado usar una capa independiente acotada, cuyo representante conserva la coordenada de una celda real del muro. Al acercarse recuperar todas las celdas de frontera en la ventana. Conservar el terreno de fondo y anclaje único del SVG al navegar.

# Inmunidad y avisos R0.21.16

Inmunidad dura 33 segundos de partida activa. Cada jugador puede invocarla en cualquier momento, fuera de su turno y del cupo de herramientas; gasta una protección guardada. No apilar ni activar sola. Pausar congela exactamente el tiempo restante. Fauna y fenómenos siguen su curso y sus avisos, sin congelarse por la inmunidad. Protegen por propietario: fichas y celdas que las contienen, celdas propias construidas mientras estén vacías y fronteras propias; el tablero local inicial es compartido. OVNI comprueba propietario de ficha. El rival puede activar su protección independiente. Un gusano superviviente puede afectar otra vez al vencer. Eventos completamente protegidos se consumen, sin reintento ni ráfaga. Conservar la separación fauna/fenómenos y la recuperación.

Localizadores de fauna, obras separadas construir/destruir, lluvia, OVNI, cataclismo, # y fronteras en tablero y mapas activos/pausados. Ciclar ubicaciones de identidad estable; lluvia recorre grupos de tres. Representantes de fenómenos conservan una celda real, nunca la media en un hueco. Casco común con + verde / − rojo en todas las superficies. Mostrar solo iconos y cifras: segundos reales hasta intervenciones temporales; colocaciones hasta intentos de nacimiento y visitas restantes de roedores. No inventar relojes de tiempo para apariciones que dependen de colocaciones ni para fronteras manuales. Preparar índices por snapshot, consultar ventana durante navegación, hasta 33 marcadores en mapas; los relojes no leen terreno ni fichas.

Cómo se juega: todos los apartados principales y fichas de fauna/fenómenos empiezan colapsados. Usar details/summary accesibles; abrir de forma independiente sin expandir todo ni crear botones de retorno nuevos.

# Indicadores y previsión R0.21.17

Inventario arriba, fauna y fenómenos abajo, con la misma correspondencia en tablero, mapa activo y pausado. Indicadores de efectos reales por propietario X/O; stock y cartas instantáneas gastadas no representan efectos pendientes. Al finalizar Doble, expirar Escudo/Bloqueo/Inmunidad, consumir Ficha rival o retirar una ayuda/frontera, actualizar su indicador. Preparar desde los registros de efectos por snapshot sin recorrer fichas ni terreno durante navegación o relojes.

Próximos eventos se abre desde el icono inferior junto a inventario y ampliación. Distinguir colocaciones de zona, colocaciones propias, casillas hasta el siguiente múltiplo nuevo de 333, y segundos reales de eventos anunciados. Mostrar intentos de fauna condicionados por presupuesto, población y alimento; no prometer nacimientos ni atribuir reloj a roedores o #. Respetar pausa y recuperación de 33 s y 3 colocaciones. No predecir el fenómeno aleatorio antes de anunciarlo.

Tornado: preservar su animación de mezcla actual. Al seleccionar no cubrir las fichas con botones opacos ni marcar todo el tablero como un destino; mantener únicamente el marco 3×3 y puntos discretos exteriores, sin cambiar opciones legales ni el margen de dos celdas.

# Accesos de inventario y perfiles R0.21.18

La barra superior ofrece las cartas del jugador actual con stock ×N; con stock se ilumina y cuando se puede usar permite activarla sin abrir la bolsa. Actualizar en cada snapshot y recarga. Frontera colocada es territorio, no una carta disponible ni un efecto pendiente en esta barra; quitar las X/O superpuestas. Efectos reales en curso con borde discontinuo, separados del stock. Mismo inventario sobre tablero y mapa, pausa solo consulta. Una fila con desplazamiento horizontal; nunca recorrer el tablero desde pan, zoom o relojes para decidir disponibilidad. Inmunidad conserva sus accesos fuera de turno para ambos jugadores.

Próximos eventos muestra Faltan N colocaciones/casillas (restantes) y En N s para avisos ya activos. Mantener sus unidades, condiciones y los umbrales previos.

Perfil: Guardar tu acceso / Cargar mi acceso. Enlace privado reutilizable en fragmento #perfil, restringido al origen y ruta del juego. Restaura la identidad Supabase original y apodo, sin incrustar JWT, refresh tokens ni claves de servidor. Solo guardar hash de 256 bits en app_metadata administrados por servicio; nunca autorizar con user_metadata. Renovación invalida el enlace previo; copia reutiliza y no sustituye un enlace desconocido. Operaciones copiar/renovar/sincronizar verifican JWT en servidor; restaurar verifica el secreto. Instalar sesión solo después de validar, recuperar la anterior si falla. No promete sincronización de partidas locales; estas permanecen en su dispositivo.

# Acumulación y recarga R0.21.19

Ampliaciones libres: eliminar el tope de una guardada; sumar una por cada nuevo grupo de tres figuras cobradas, incluidos varios grupos cruzados en una sola jugada. Conservar el próximo umbral almacenado y la reserva, sin conceder premios históricos al migrar. Gastar exactamente una al colocar; vista previa y cancelación no gastan. Mantener turno, créditos normales y límite del tablero.

Recargas: conservar cuatro turnos propios pagados, ocho cartas guardadas y dos por tipo. Priorizar los tipos elegibles menos recibidos; sortear solo entre los empatados. Registrar `inventory.received` por jugador y conservarlo al guardar. Inicializar una sola vez con las cartas iniciales y las presentes en guardados, sin inventar sorteos antiguos. Así las ocho cartas adicionales, incluida Bomba y Tornado, aparecen antes de repetir los ocho tipos iniciales en partidas nuevas con huecos de recarga. Bolsa llena sigue esperando hueco; turnos automáticos y ampliaciones no recargan. No cambia el uso, daño, animación ni navegación de las cartas.

# Muro y frecuencia R0.21.20

Jorge sustituye la carta Frontera por Muro: una sola casilla sin construir adyacente al territorio, sin giro. Conservar id interno `frontier`, stock y barreras guardadas (arrays de tres celdas y segmentos antiguos) con su geometría y reglas. Un muro nuevo bloquea construir y ampliar sobre su casilla. Mantener propietario, protección, bomba, una carta por fase y uso exclusivo del expander sin consumir turno ni reiniciar reloj.

Inventario superior de tablero y mapas: blanco con stock, cian cuando usable o con efecto activo; agotadas atenuadas. Colores independientes del símbolo X/O, que sigue en etiquetas accesibles. Mantener navegación y preparación por snapshot.

Recarga cada tres turnos propios pagados (sustituye cuatro), conservando sorteo equilibrado, ocho cartas y dos por tipo. Ampliación libre: una por cada nueva figura cobrada (sustituye grupos de tres), acumulación sin tope. Migrar el próximo umbral una sola vez a figuras actuales + 1, conservar reservas sin premios históricos. Mantener colocación/cancelación, créditos, turno y límites.

# Ampliaciones, conversión de barreras y fauna R0.21.21

Jorge fija una ampliación por grupo de tres figuras (3/6/9…; nueve figuras = tres ampliaciones acumuladas en total). Conservar reservas existentes y migrar una sola vez al siguiente múltiplo de tres, sin premios históricos.

Retirar fronteras antiguas de tres celdas/segmentos y devolver una carta Muro por barrera a su dueño en cada guardado local, incluidos pausados. Conversión persistente e idempotente, sin alterar terreno, fichas, puntos, turnos, relojes ni anclajes. Devolver todas aunque se supere temporalmente ocho cartas/dos por tipo; los sorteos siguen esperando hueco. Una barrera de propietario desconocido no se elimina sin poder devolverla. Muro nuevo de una celda permanece. No aplicar a Duelo/Mundo sin soporte de servidor.

Más fauna: roedores 33, gusanos 66, obras 99 colocaciones de zona, intervalos escalados por max(1,N/333), mismos pesos/cupos y comidas. Migrar cuentas pendientes de gusanos/obras proporcionalmente una sola vez, sin nacimientos retroactivos ni acumulación. Capacidad teórica máxima conjunta 7/22 = 31,82 % desde 333 celdas, antes de alimento, cupos, inmunidad y separación con fenómenos. Obras equilibradas no crecen neto. Fenómenos continúan por nuevos hitos de 333 celdas, con aviso de 33 segundos y recuperación intacta. Compartir constantes del motor con previsión, localizadores y recalibración.

# Copia, logros y avisos R0.21.22

Preparar la copia del enlace privado dentro del gesto de pulsación, con ClipboardItem de contenido diferido cuando esté disponible. Nunca anunciar copia si fallan portapapeles y alternativa; dejar el enlace preparado seleccionable y un botón de copia directa sin nueva espera del servidor. Generación y renovación mantienen validación de sesión y protocolo de secretos. Informar del fallo de perfiles y liberar botones, sin confundirlo con un enlace copiado.

Logros usa los mismos selectores de modalidad que Ranking, y botones de objetivo y límite. Botones adicionales eligen un único dato (puntos, figuras, colocaciones, combo o #MAX); tabla compacta de jugador/dato/fecha sin desplazamiento horizontal. Mostrar una sola combinación de reglas a la vez; conservar archivo, comparación justa y resultados antiguos. Mundo continúa sin objetivo de final.

Roedores siempre con icono propio, nunca usar gusano como alternativa. Roedores por colocaciones, sin reloj; gusanos y obras muestran segundos hasta intervención en celda, localizadores y avisos compactos junto a eventos. Avisos fuera de la ventana visibles sin dibujar todo el tablero. Preparar por snapshot; cada actualización del reloj solo modifica cifras y consulta eventos, nunca terreno o fichas. Mantener pausas, inmunidad, frecuencias y cupos.
