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


# Equilibrio de crecimiento R0.21.23

Jorge solicita menos ampliaciones y más inventario, habitantes y fenómenos, especialmente en partidas grandes. Ampliación libre: una por cada nueve figuras cobradas (9/18/27…), reservas conservadas sin tope, migración versión 4 al siguiente múltiplo de nueve sin premios históricos. Máximo una ampliación libre colocada por turno propio; guardar ese uso en practiceTurn.freeExpanded. Cancelar/previsualizar no consume ni marca uso. Conserva turno y créditos, y permite usar cartas; Doble sigue excluyendo la ampliación a mitad de colocaciones.

Inventario: recarga una carta por cada turno propio manual completado, máximo doce cartas y dos por tipo. Ocho iniciales iguales, prioridad a las menos recibidas, sin recarga por cartas, ampliaciones, pases, esperas o turnos automáticos. Migración de contador sin conceder sorteos históricos. Los reembolsos de muros siguen preservándose aunque excedan los límites.

Fauna local: bases roedores 33, gusanos 33 y obras 66 colocaciones de zona, intervalos multiplicados por max(1,N/666). Presupuestos y cupos siguen por N/333, pesos 3/1/1. A 999 celdas: 9 roedores cada 50 colocaciones, 3 gusanos cada 50 y 3 proyectos cada 99 como máximos antes de cupos y alimento. Capacidad teórica de comidas conjunta <=8/11 (72,73 %) por colocación, más baja en tableros pequeños; no sumar comidas perdidas. Obras equilibradas sin crecimiento neto. Migrar frecuencia versión 3 proporcionalmente por tamaño real de zona, sin tocar habitantes vivos, relojes, crédito ni repetir nacimientos.

Fenómenos: además de nuevos hitos de 333 celdas, desde 333 celdas hay un ciclo por 333 colocaciones aceptadas entre ambos (Doble dos, ampliaciones/cartas cero). Cada intento de anuncio reinicia el ciclo; nunca crear cola ni solapar fenómenos/fauna. Guardados grandes adoptan el primer intento tras 33 colocaciones nuevas, sin eventos históricos; guardados pequeños/partidas nuevas, 333. Se mantienen 33/333 de incidencia, geometría, inmunidad, aviso 33 s y recuperación 33 s + 3 colocaciones. No anunciar durante recuperación. Si esa colocación anuncia, suprimir también las intervenciones temporales de fauna que estuvieran vencidas antes de ella. Previsión muestra el ciclo de actividad además del umbral de crecimiento, con colocaciones restantes y condición de 333 casillas. No recorrer el tablero desde navegación ni relojes para contar actividad. Resultados nuevos usan ruleVersion 4 para no mezclarlos con reglas anteriores.

Estos cambios siguen siendo locales; Duelo/Mundo requieren actualización del servidor. Nunca simular una copia ni restauración de perfil exitosas cuando Supabase devuelve 504 o su conexión SQL expira. No debilitar el protocolo de enlace privado por una caída de infraestructura.


# Habitantes visibles y ampliación estratégica R0.21.24

Jorge pide habitantes presentes mientras actúan: roedores con tres visitas (aparecer, comer, ocultarse) en nueve turnos completados; Doble cuenta un turno y cartas/ampliaciones/relojes no avanzan el ciclo. Elegir ubicaciones por individuo, conservar identidad, no comer # ni la ficha nueva y respetar inmunidad, reservas y cuerpo de gusanos. Tablero, minimapa y mapas comparten posiciones, fases y turnos restantes; no representar habitantes ocultos. Migrar solo las visitas pendientes de guardados, sin nuevas comidas históricas. Animar en CSS sin bloquear entrada; mantener pantalla más margen, índices por snapshot y marcadores acotados.

Obreros permanecen con casco +/−, cuenta atrás y animación en el puesto de trabajo durante sus ciclos de 33 segundos; cambiar ambos puestos juntos al completar una intervención. Futuras reservas no dibujan obreros trabajando aún. Gusanos mantienen cuerpo y comidas cada 33 segundos. Persistir también los reintentos sin comida/inmunes: no dejar nextAt vencido que dispare intentos cada medio segundo. Un snapshot de ecología no cancela por sí mismo el cálculo del turno de la máquina; validar su elección en el estado actual y recalcular si dejó de ser legal.

Se sustituyen los premios de ampliación libre: no conceder nuevas reservas por figuras ni exponer el botón de ampliación libre. Conservar valores históricos del guardado sin que autoricen crecimiento. Cuando no hay movimientos, ampliación normal como antes. Desde 333 figuras cobradas entre ambos en la partida local, la carta existente hint-expand, denominada Ampliación inteligente, permite proponer un 3×3 estratégico aunque queden huecos. Voluntaria: previsualizar/cancelar conserva la carta; colocar gasta exactamente una, cuenta en el cupo de herramientas, máximo una por turno, conserva turno/créditos/reloj y no entra a mitad de Doble. La ayuda para la ampliación obligatoria sigue disponible antes del umbral. Resultados nuevos ruleVersion 5.

Aplicación del motor en VS máquina y Sin conexión; Duelo/Mundo requieren actualización del servidor. No anunciar los nuevos ciclos como activos en esas modalidades.

Acción y fluidez R0.21.24: Jorge elige fenómenos desde 99 figuras cobradas entre ambos, un intento cada 33 colocaciones aceptadas, además de hitos nuevos de crecimiento. Rotar los tres tipos viables mediante bolsa persistida, sin cola durante aviso/recuperación. Incidencia proporcional 33/333 también antes de 333 celdas; lluvia en grupos completos de tres. Migración territorioActivityVersion 2 al siguiente intento tras 33 colocaciones nuevas, sin ataques históricos. Previsión informa figuras pendientes antes de 99, luego colocaciones pendientes. Mantener inmunidad, geometría, aviso 33 segundos y recuperación 33 segundos más tres colocaciones.

Mochila de recarga ampliada de doce a dieciocho cartas, dos por tipo, ocho iniciales iguales y prioridad a las menos recibidas; conserva una recarga por turno propio manual completo. Inmunidades y reembolsos siguen independientes. Seleccionar una ampliación actualiza propuesta y contador sin reconstruir la pantalla; memorizar opciones, claves del terreno, estado de cartas e índices de mapa por snapshot/versión, nunca recalcular al tocar la propuesta. No presentar ensayos sintéticos como validación en móviles.

# Anclaje de efectos R0.21.25

Las capas de celda que cuelgan directamente del tablero (avisos, fenómenos, intervenciones y habitantes en zoom general) deben posicionarse absolutamente respecto al tablero, sin entrar en el flujo ni agrandar el área desplazable. Mantener las coordenadas de celda y el margen visible. Las reglas de tamaño, fondo y trazo del SVG del mapa/minimapa/pausa/miniatura se aplican solo al lienzo raíz; no propagarlas a los SVG de iconos anidados. Los marcadores de fenómenos y sus avisos se dibujan solo en terreno actual; si desaparece una celda durante el aviso, escoger otro representante del mismo grupo sin cambiar su identidad ni región anunciada. Preparar pertenencia de terreno por snapshot; navegación y relojes no recorren el tablero.

Jorge fija tres unidades máximas por tipo de carta normal, 48 entre los 16 tipos, sin límite para las protecciones de inmunidad. Mantener ocho iniciales, recarga por turno propio manual, sorteo justo y reservas/reembolsos históricos sin recortarlos. Usar ruleVersion 6 para resultados nuevos. Cada carta seleccionada aparece con su icono animado junto a la mochila; preparada con borde discontinuo, usada con borde continuo y stock restante. Persistir mientras se elige o trabaja en ese turno, retirar al cancelar/finalizar/cambiar jugador y sustituir al elegir otra. La protección conserva su icono y cuenta atrás independientes, pudiendo coexistir con la carta. No gastar por mostrar el indicador ni reiniciar su animación con cada render.


# Capas y navegación R0.21.26

El muro morado y todos los efectos del tablero quedan en un contexto de apilado propio, bajo minimapa, herramientas de navegación y controles externos, también durante zoom y al soltarlo. No elevar cada control con z-index arbitrarios. Mantener recorte al área del tablero.

Fluidez prioritaria: eventos rápidos de mapa/scroll/pellizco se agrupan en un único pintado por frame, conservando siempre la última cámara y vaciando el último frame al soltar. Cancelar frames al desmontar. Memorizar por snapshot modelos e índices de terreno, habitantes, fenómenos, muros y densidad; reutilizar el dibujo estático del minimapa. Navegar consulta solo ventana más margen; relojes solo cifras. Conservar animaciones, celdas legales y coordenadas. Ensayos de eventos y tamaños grandes no garantizan todos los móviles.


# Muro como carta normal R0.21.27

Jorge autoriza colocar Muro durante el turno propio aunque haya huecos y no exista ampliación pendiente. Sigue siendo una casilla sin construir adyacente al territorio, con propietario y rombo violeta, sin alterar terreno ni puntos. En colocación normal gasta una carta y el cupo de herramienta, permite continuar con la ficha, respeta Combo, reloj, pausa y repetición por tipo. Mantener la posibilidad previa de colocar un muro en la fase de ampliación del expander, una vez por fase; no obliga a iniciar una ampliación para usar la carta. Texto, accesos rápidos, mochila y ayuda deben reflejar esta disponibilidad normal. Usar ruleVersion 7 para resultados nuevos; partidas locales activas adoptan las reglas, finales históricos permanecen. No calcular destinos desde navegación o reloj.

Logros conserva el código de modalidad en todos sus selectores de objetivo, límite y dato: Duelo rojo, Sin conexión blanco, VS máquina cian y Mundo verde. Actualizar color y foco al cambiar modalidad, incluso cuando todavía no hay resultados; no dejar cian fijo en los botones secundarios.

# Variedad y escasez de mochila R0.21.28

Tres por tipo es un máximo, nunca un objetivo de reposición. Jorge pide coexistencia de stocks 0/1/2/3 y parte del catálogo ausente. Sustituir el tope global de 48 por 18 cartas normales y hasta 12 tipos simultáneos. Mantener ocho iniciales y una recarga por turno propio manual completo; sortear uniformemente entre todos los tipos permitidos, incluidos duplicados, sin completar primero los menos recibidos. No introducir un tipo decimotercero hasta agotar alguno; ninguna recarga supera total, tipos o tres unidades. Protecciones aparte sin tope. Conservar reservas y reembolsos históricos que excedan límites; impedir recargas mientras los excedan, sin sorteos acumulados ni premios al abrir guardados. Reglas activas y resultados nuevos versión 8; finales históricos intactos. Mismo sorteo para ambos jugadores y máquina. No calcular recargas en navegación o reloj.

## #3_11 · Territorio vivo (R0.21.29, rama de trabajo)

Referencia de diseño y alcance: `design/3-11-territorio-vivo.md`. Trabajo en rama `feature/3-11-territorio-vivo`, pull request borrador #1. `main` R0.21.28 sigue estable y no debe publicarse la nueva mecánica parcialmente como disponible en todos los modos.

Los jugadores son COLONOS; fauna (roedores dispersos/gusanos localizados), habitantes (promociones 3×3, construir y destruir iguales, dispersos al aparecer/localizados al intervenir), invasores (lluvia dispersa de bombas que deja asteriscos * y colonias localizadas de 3×3). Familias de fenómenos: meteoritos/terremoto destruyen terreno + signos; pandemia/OVNI vacían signos; lluvia de tornados/huracán reordenan signos; agujero negro vacía signos de 3×3 y reordena zona circundante de hasta tres celdas. OVNI y agujero negro son estelares. No confundir bombas del inventario con meteoritos naturales o invasores.

Motor local parametrizado en `src/territory-event-rules.js` + `src/territory-event-actions.js`; frecuencias invasoras heredan un turno de cada tres anuncios de la antigua lluvia de bombas. Inventario X/O junto a mochila, mapas y rendimiento en ampliación revisados. Pruebas: `npm test` + `npm run simulate:ecology -- --quick` + `npm run build:github`.

Para que #3_11 se considere terminado falta reproducir en SQL Supabase el comportamiento en Mundo/Duelo, QA táctil de grandes tableros y animaciones, integrar y publicar Pages. NO confundir rama validada con despliegue online. La simulación de efectos geométricos es base: ampliar a secuencias de turnos para ajustar patrones y frecuencias por separado.

## #3_11 · Frecuencias por impacto (9 de octubre, R0.21.30 en desarrollo)

Jorge autoriza distribuir las frecuencias a favor del juego y mantener los efectos ligados al 3. Fauna, habitantes e invasores deben aparecer más que los fenómenos de gran impacto. Sustituye el sorteo conjunto y los ataques por hitos de expansión: ciclos independientes por colocaciones aceptadas, base 33 roedores/gusanos, 66 obras/invasores, 333 naturales/estelares. Escalar por max(1,N/666); invasores/fenómenos redondeados a múltiplos de tres. Las ampliaciones no adelantan anuncios; una sola advertencia activa, sin ráfagas históricas. Rotación persistida por familia. Aviso 33 s, impactos invasores de 3 o 3×3; no congelan fauna ni reinician nacimientos. Solo los fenómenos grandes aplican suspensión y recuperación 33 s + 3 colocaciones. Migración local territoryActivityVersion 4, catálogo 2 y resultados nuevos ruleVersion 9; conservar finales históricos.

SQL autoritativo preparado en `20261009081642_territorio_vivo.sql`, generado de plantilla y configuración JS. Comprobar deriva con `npm run verify:sql`; prueba PostgreSQL desechable incluye RPC, idempotencia y permisos. No sustituye la verificación del Supabase real. Secuencias completas: `npm run simulate:turns`, resultados en benchmarks; juego aleatorio no equivale a estrategia humana. El servidor sigue dando timeout y falta QA táctil real; mantener PR borrador y no publicar Pages parcialmente.

La rama incorpora la corrección de Perfil R0.21.28-P1 de main (698edf2), con pruebas del conjunto. Conservar los archivos públicos de esa versión estable mientras siguen pendientes SQL remoto y QA táctil.


## #3_11 · Continuación con navegador y pantalla móvil P2

La rama incorpora `main` R0.21.28-P2 (92d9eef), conservando R0.21.30 de desarrollo y Pages estable P2. No sobrescribir pantalla móvil fija, paneles con scroll propio ni Perfil sin autofocus editable. `npm run verify:browser` ejecuta Chromium con tacto emulado sobre 999/33.333 celdas, nueve eventos, ampliación, Tornado y Perfil móvil. Capturas y resultados adjuntos al workflow; resumen en benchmarks/territory-r02130-browser.json. Node, navegador emulado y SQL local pasan; no presentar esta emulación como ensayo en iPhone/iPad físicos ni Safari.

La descarga alternativa de Chromium ya funciona; para reproducir: `npx playwright install chromium`, luego `npm run verify:browser`. El Supabase remoto sigue devolviendo timeout incluso para SQL mínimo, lista de migraciones y asesores. Administración lo marca ACTIVE_HEALTHY y logs muestran 504 de renovación de sesión, sin registros PostgreSQL disponibles. Causa no determinada. Mantener PR borrador y no publicar el bloque territorial parcialmente antes de validar migración remota y juego en dispositivo físico.


## #3_11 · R0.21.31: autorización de diagnóstico local (9 de octubre)

Jorge cambia explícitamente el alcance: publicar territorio vivo para probar VS máquina y Sin conexión, después habilitar Duelo y finalmente Mundo. Esta instrucción sustituye el bloqueo previo de publicación conjunta: el SQL remoto puede seguir pendiente porque las modalidades online permanecen desactivadas y etiquetadas En construcción. `src/online-availability.js` centraliza los dos controles. No reactivar ninguno sin la siguiente fase autorizada.

Durante diagnóstico, sin llamadas Supabase de la aplicación: guardas en API, refresh automático de sesión apagado, sin consultas de salas, rankings, métricas ni antesalas antiguas. Perfil conserva apodo y accesos guardados; generación/renovación/restauración online quedan en construcción. Copiar un enlace ya guardado es local. El navegador comprueba cero peticiones Supabase al iniciar/jugar ambas modalidades con restos de sesión/enlaces anteriores. No afirmar consumo cero del servidor: el cron ya instalado puede seguir activo, y sigue inaccesible por SQL.

Incluir estética final de #3_10: Colono = cuadrícula # con X roja y O verde en celdas; enlace privado = icono de celdas X/O conectadas con fill none y stroke explícito. No sobrescribir correcciones de pantalla móvil P2. Publicar R0.21.31 con el pipeline, comprobar versión pública, y continuar el ajuste de patrones/frecuencias con partidas locales.

## Investigación cronológica del enlace (9 de octubre)

Detalle en `design/supabase-link-diagnosis.md`. Logs unificados sitúan 504 de refresh a las 12:10 y signup a las 12:46 del 8/10 (Madrid), antes de crear `profile-link` a las 18:09 y del commit R0.21.18 a las 18:19. Ventana consultada 8/10 10:00–9/10 09:55 UTC: 815 refresh 504 y 13 signup 504. No atribuir la caída inicial al enlace: precede a su despliegue. El enlace original sí consultaba sesión antes de recuperar y podía bloquear por refresh; P1 eliminó esa dependencia en la petición. No hay diagnóstico definitivo de SQL/infraestructura ni generación/restauración reales verificadas.

Ampliación histórica: desde el 4/10 hay logs disponibles. Primer 5xx interno de refresh localizado 8/10 00:07:14 Madrid, 502 a las 00:10:10 y 504 a las 00:12:10. Antes: SQL habitantes R0.21.0 aplicado 7/10 23:32–23:33; cron agota plazo a las 23:36:31 en advance_worlds → advance_state (línea 24) → habitat_reserved; PostgreSQL registra recuperación tras cierre incorrecto a las 23:37:34 y reinicios posteriores. Principal sospecha: filtro nuevo por cada celda, no el enlace. No afirmar OOM probado. Intento reversible de desactivar cron el 9/10 volvió a dar timeout: pausa NO confirmada. Antes de reactivar Duelo/Mundo, resolver esta consulta y verificar reloj/recursos.

## R0.21.32 · Selector local y duraciones del 3 (9 de octubre)

Jorge pide todo el bloque de PR #1 y actualizar los iconos de la selección de partida. PR #1 ya está integrada en main desde R0.21.31; conservar motor/catalogo/frecuencias, indicadores de inventario empleado, localizadores y mapas. Se vuelve a verificar el conjunto en VS máquina y Sin conexión; Duelo/Mundo continúan bloqueados y la reparación del servidor queda para después.

Duraciones de nuevas partidas locales: Relámpago 33 segundos, 3/6/9 minutos (targets 33/180/360/540 en segundos), independientes del reloj por turno. Sustituye 3/5/10 en el selector. Conservar los objetivos antiguos de partidas guardadas y su acceso en Logros; nunca mostrar 0,55 minutos para Relámpago. Duraciones centralizadas en src/match-durations.js. Selector usa los iconos reales del catálogo: roedor/gusano, constructores/destructores, colonia invasora/meteoritos/huracán/OVNI, con etiquetas accesibles y colores de obras. Mantener los controles previos y ajustes guardados.

## R0.21.33 · Mapas e indicadores por turno (9 de octubre)

Jorge pide unificar minimapa activo y tablero al alejarse con el mapa de antesala/pausa, manteniendo fluidez. src/map-render.js comparte colores, huecos, símbolos X/O/#/* cuando son legibles, marco activo y referencia azul. Preparar índices/densidad por snapshot; dibujar ventana más dos celdas y agrupar superficies grandes. No crear un nodo por celda del tablero completo ni recorrer fuentes durante navegación. Miniaturas usan el mismo dibujo.

Mostrar invasores y fenómenos antes del primer aviso con lo que falta para su intento: colocaciones compartidas o figuras hasta habilitar el mínimo de 99; nunca inventar segundos para aparición ni prometer el tipo futuro. Avisos anunciados conservan su icono propio y segundos. Dos celdas fijas rojas a la izquierda de mochila (X) y verdes a la derecha (O) muestran las dos últimas cartas usadas del turno; registrar gasto en spendCard para incluir máquina, ayudas y guardados. Combo y ayudas pueden producir más registros, sin alterar reglas: solo dos iconos visibles por lado. Vaciar uso anterior al completar un turno sin cartas; pausa no lo borra. Preparar/cancelar no registra gasto. Inmunidad conserva indicador independiente.

Selector local: ⚡ sustituye palabra Relámpago para 33 segundos; ◷ identifica duración total de 3/6/9 minutos y reloj de turno. Mantener los cuatro valores y aislamiento online R0.21.31. Publicar y verificar R0.21.33 por pipeline.

## R0.21.34 · Estado visual de fenómenos e invasores (9 de octubre)

Jorge sustituye los indicadores de previsión siempre iluminados por iconos individuales sombreados cuando no hay evento. Mostrar los nueve tipos actuales; conservar alias antiguos solo si hay un aviso guardado. Un aviso real ilumina únicamente su icono, con cuenta atrás y pulso breve anclado al tiempo del aviso; no reiniciar la animación con cada snapshot. Mantener resalte mientras exista el evento, recuperar sombreado al consumirse; pausa conserva contador/resalte y detiene animación, movimiento reducido suprime pulso. No mostrar segundos ni actividad ficticios antes del anuncio. Conservar previsión por colocaciones/figuras en etiquetas y Próximos eventos, localizadores reales y la misma representación en tablero/mapa/pausa. Mantener navegación acotada y aislamiento online. Publicar y verificar por pipeline.


## R0.21.35 · Gusanos, equilibrio local y Frontera (9 de octubre)

Jorge autorizó implementar el bloque tras cambiar el esfuerzo. Aplicar solo a VS máquina/Sin conexión; Duelo/Mundo y servicios online continúan aislados. Reglas vigentes y simulación en design/living-r35.md y living-r35-simulations.json; sustituyen frecuencias/incidencias locales anteriores. F = max(1,round(sqrt(N/333))); poblaciones/focos por F, intervalos de fauna por sqrt(F), redondeados a 3 colocaciones/33 s. Roedores 66/132 s, gusanos 33/198 s, obras 66/165 s; comprobar intento al aceptar colocación. Invasores 33 colocaciones/99 s, primer plazo66; naturales99/198 s (99 s en tres minutos), mínimo33 figuras, aviso33 s y sin avisos que terminarían después del final. Bolsa aleatoria de cada familia sin repetir tipos viables hasta agotarla. Demolición3 %, vaciado6 %, mezcla9 %, cantidades múltiplos3 con topes33F/66F/99F. Conservar progreso hacia fauna tras recuperación. Migrar hacia plazos futuros, sin premios/ataques históricos, y congelar relojes nuevos al pausar. Resultados nuevos ruleVersion10.

Excluir cuerpo de gusano y reservas de obras en todas las elecciones de IA, además de la validación final del árbitro. Gusano sale con tres comidas o tres fallos consecutivos de alimento legal; una comida reinicia fallos. Cabeza con icono, cuerpo con línea continua/nodos compartidos por tablero y mapas; liberar toda la geometría al retirarse. Mantener índices por snapshot y ventana visible+margen.

Frontera es nueva carta id border; Muro sigue frontier. Tres segmentos entre celdas construidas, rotación cuatro lados, no ocupa fichas. Previsualizar/girar/cancelar no consume. Gasto/cupo/registro por turno normales; como Muro, una barrera antes de ampliación pendiente propia. Guardar type:border y excluirla de migración de barreras antiguas. Invasiones desde borde real guardan rutas por línea de profundidad≤3; comprobar barreras al impactar, sin desviar/reaparecer detrás. F núcleos3×3 o3F bombardeos expuestos. Fenómenos naturales no quedan bloqueados por Frontera; halos de agujero negro por núcleo, nunca una caja gigante entre focos.

Pandemia usa virus, agujero negro núcleo/orbitas, lluvia de tornados dos embudos, huracán ciclón. Nueve iconos en selector y localizadores comunes; inactivos sombreados, aviso real animado mientras existe. Mantener invariantes de stock18/12tipos/3porcarta, ocho iniciales, inmunidad independiente, mochila con dos celdas a cada lado y colores X/O. Publicar con pipeline y verificar Pages; pruebas táctiles son emulación, no garantía física.
