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


## #3_12 · Identidad visual R0.21.36 (9 de octubre)

Jorge reserva morado para Muro y Frontera. Muro usa una diagonal / grande y gruesa, compartida por tablero, inventario, localizadores y mapas; liberar el rombo. Frontera conserva la geometría direccional entre celdas y el morado. Ocupación invasora conserva símbolo * con dibujo vectorial centrado y grueso comparable al #, siempre amarillo; todos los fenómenos y sus efectos/avisos/mapas usan amarillo. Mantener sombreado de eventos inactivos, colores X/O, geometría y reglas de barreras, ventanas acotadas y aislamiento online. Cambio estético, sin migrar reglas ni guardados.

## #3_12 · Evolución local R0.21.37 (9 de octubre)

Jorge autoriza implementar y publicar el bloque completo para seguir probando su partida de 25.912 puntos, 1.422 colocaciones y 991 celdas. Las reglas siguientes sustituyen las mecánicas locales de R35/R36; Duelo/Mundo y SQL online mantienen su aislamiento. ruleVersion11 para partidas locales activas/nuevas; no reclasificar resultados terminados.

Recarga: una carta por turno propio manual, límites18/12tipos/3unidades y ocho iniciales conservados. Triple peso para Doble, Ficha contraria, Ficha rival, Borrar, Desplazar y Combo; restantes tipos peso1, respetando elegibilidad/cupos. Mezclas de Tornado, lluvia de tornados y Huracán puntúan figuras nuevas en la geometría final para ambos símbolos, bonus/créditos incluidos; deduplicar ventanas solapadas y figuras anteriores aunque estuvieran sin cobrar. El halo de agujero negro aplica el mismo criterio. Detectar figuras que cruzan el límite de mezcla; preparar índices de símbolos/componentes para el comando. No puntuar estados intermedios ni descontar puntos históricos. Aviso muestra X/O y sus ganancias. Cartas no generan combos de Inmunidad; fenómeno automático no cambia MAX manual.

Invasores: una bomba/semilla * por foco (F colonias o3F bombardeos). Después, una casilla por turno terminado, vecina por lado de una marca viva, hasta nueve ocupaciones por semilla. Sin plantilla3×3, sin inventar terreno ni invadir la última colocación del turno; respetar muros/barreras, reservas de habitantes, Escudo e Inmunidad. Retirar crecimiento sin marcas vivas o tras tres intentos bloqueados, mantener las estrellas existentes. Mostrar progreso real n/9 sin segundos. Construcciones nuevas priorizan estrellas: constructor limpia símbolo conservando terreno; destructor retira símbolo y casilla, respetando anclas/protección. El crecimiento acompaña estrellas recolocadas por mezcla. Estrellas históricas no reciben crecimiento inventado; avisos de colonia antiguos se reducen a semillas manteniendo su vencimiento.

Frontera: tres pulsaciones sobre casillas vacías contiguas por lado, también L; tercer toque aplica una sola carta. Elegir/previsualizar/cancelar no gasta. Se guarda type:border,cells[3], actúa como tres muros, no borra fichas ni bloquea todas las ampliaciones. Mantener barreras antiguas edges y sus rutas/protecciones; no convertirlas ni reembolsarlas como muros antiguos. Bot y ayudas usan cadenas legales de tres puntos. Geometría y diagonal / morada compartidas en tablero/mapa/pausa; solo Muro/Frontera morados.

Gusanos: una comida cada tres turnos completos, Doble avanza al acabar sus dos colocaciones. Cartas/ampliaciones/espera no avanzan; pausa y recuperación congelan progreso. Primera aparición efectiva3 comidas, segunda6, tercera y siguientes9. Aparición cuenta lote nacido, no individuo ni intento fallido. Solo últimas3 casillas del cuerpo protegidas; salir al agotar comidas o tres intentos seguidos sin alimento legal. Migrar gusanos vivos antiguos con límite3 y contador de turnos0, conservar comida/cuerpo, sin simular tiempo cerrado; nuevas apariciones siguen6/9. Guardar conversión atómica e idempotente sin alterar tablero/puntos/bolsa/anclajes; registros terminados intactos. Localizadores/cabeza/mapas/próximos eventos muestran comidas/turnos, sin cuenta temporal de comidas. Relojes de intento de nacimiento conservados.

Navegación conserva ventana visible+margen2 e índices por snapshot, incluyendo selección de tres puntos y colonias activas. Verificar con pruebas de árbitro/guardados y CI Chromium táctil emulado; no presentarlo como QA de dispositivo físico. Publicar por pipeline y comprobar version.json público.

## #3_12 · Reconquista local R0.21.38 (9 de octubre)

Jorge pide revertir invasiones. Estas reglas sustituyen # bloqueador, vaciado por Pandemia y destrucción de casillas por habitantes de R37, solo para VS máquina/Sin conexión. Detalle y validación: design/local-reclaim-r38.md. ruleVersion12 para partidas locales activas/nuevas; finales históricos intactos.

Comodín # compartido: intento cada9 colocaciones propias, sin figuras/puntos al aparecer. Al colocar X/O (humano, máquina, automático y cambios de ficha del inventario) cuenta como ese signo; permanece # para ambos. Bonus/créditos/deduplicación habituales; no cobrar figuras remotas creadas por aparición. IA y ayudas usan las mismas figuras. Las mezclas conservan aterrizajes X/O y no disparan comodines espontáneamente. Online conserva # bloqueador/cadencia33.

Pandemia local intercambia X↔O y *↔#, mismo presupuesto disperso6 %. Conserva terreno/puntos/identidades, actualiza propiedad X/O y referencias. No puntúa contagio. # recuperado pierde identidad de colonia; nuevas * por contagio son estáticas, sin crecimiento inventado ni resurrección de colonias. Mantener inmunidad, escudo, reservas y cuerpo de gusano.

Habitantes locales amplían y reconquistan: promoción hasta3 constructores +3 reconquistadores, tres ciclos33s, hasta9 terrenos añadidos y9 asteriscos limpiados sin perder terreno. No borrar otro signo cuando cambie el destino. Construcción independiente de limpieza, adyacente y limitada por muros/reservas/objetivo. Mantener frecuencia y población R35. Migrar obras locales una vez y persistir atómicamente con la colección, respetando pausa/relojes/puntos/bolsa/anclajes. Defensores antiguos conservan terreno incluso en anclas. Última marca viva eliminada termina colonia inmediatamente. No añadir una familia independiente de guerreros.

Retirar números de comidas/crecimiento de tablero, cabezas, mapas y localizadores. Marco amarillo discontinuo en estrellas de colonias activas con vecino legal por invadir; estáticas/completas/bloqueadas sin marco. Cálculo/indexación por snapshot, consultas acotadas durante navegación. Mapas pausados permiten localizar colonias activas. Mantener morado exclusivamente para Muro/Frontera, signos y fenómenos amarillos, cuerpo continuo de gusanos y reglas3/6/9 por apariciones.

Publicar mediante CI y Pages, comprobar versión pública; no afirmar ensayo físico. Jorge continúa calibrando el equilibrio en partidas reales.

Actualización del 10 de octubre: las puntuaciones al aterrizar Tornado/Huracán/lluvias usan brillo/flotación normal y solo +N grandes rojo X / verde O en el aviso, sin origen ni desglose. Integrar ganancias manuales coincidentes; no repetir eventos guardados. Iconos #3 verificados, referencias nuevas hash3-r38 para favicon/Apple/manifest y fallback estándar, manteniendo identidad de app. No se conoce la causa exacta del ? de Dilema en el favorito del iPhone. Validar rutas Pages y PNG publicados; sugerir volver a guardar solo el favorito correcto si persiste, sin borrar datos ni partidas de Safari.

## #3_12 · Estrategia por turnos R0.21.39 (10 de octubre)

Jorge autoriza implementar y publicar el bloque; detalles en design/local-strategy-r39.md. Solo motor local, ruleVersion13 y turnEcologyVersion1. Quitar tiempo de intentos/avisos/intervenciones/recuperación, conservar relojes de turno/partida e Inmunidad33s. Tres turnos completos de preaviso, marcando zona prevista; el turno que anuncia no descuenta el aviso. Doble cuenta una vez al acabar dos fichas, cartas/ampliaciones/espera/pausa cero; turno automático y pase sí. Gusanos siguen comidas3/6/9 por lote efectivo y cola3. Habitantes tres ciclos de tres turnos. Fenómenos naturales suspenden fauna hasta impacto+recuperación3turnos; invasión no. Frecuencias de colocaciones vigentes; no recalibrarlas sin nueva valoración de Jorge.

Dos columnas para herramientas de jugador y otras dos separadas para territorio: nunca mezclar ambos. Jugador muestra stock; territorio muestra colocaciones/figuras hasta siguiente intento de aparición, también durante eventos activos. Avisos/anuncios muestran turnos restantes de intervención/comida. Pares pequeños/grandes: ratón/plaga, gusano/plaga, meteoritos/cataclismo, tornado/huracán, contagio/pandemia, agujero negro/OVNI. Apariciones pequeñas de fauna1 y plagas hasta3F alternan; cupos/alimento mandan. Ampliadores + amarillo sin casco, área añadida con puntos; Soldados espadas amarillas, solo limpian * sin destruir terreno. Morado solo barreras.

Desplazar solo añade permiso sobre bomba individual de Bombardeo aún anunciada, conservando cuenta y demás bombas; gasto habitual. Fauna/meteo restantes no manipulables. Dianas máximo3, posiciones propias/rivales/huecos/invasión, saltos directos y mapas/pausa persistidos. Cartas ampliación1×1/2×1/3×1 adyacentes, exactas sin solape, girables2/3, propuesta/preview/cancelar sin gasto; confirmar consume carta sin turno/score y respeta límites/barreras/reservas. Caps e iniciales conservados.

Migración atómica/idempotente de avisos activos a3turnos, fauna viva/progreso/puestos conservados, sin turnos históricos ni cambios en puntuaciones/stock/pins/finales. Catálogo local de8 fenómenos, catálogo SQL/online anterior sin cambios. Mantener índices por snapshot, ventana+margen2 y mapas acotados. Publicar por CI/Pages y verificar version.json; emulación no es QA físico.


## #3_12 · Corrección visual y Permutar R0.21.40 (10 de octubre)

Jorge sustituye las columnas por dos filas horizontales en cada inventario independiente, incluidos tablero/mapa/pausa/hall. Sin rótulos Ataque/Defensa/Ampliación/Eliminación/Ayuda; iconos y contadores. Jugador encima del tablero, territorio debajo; ambos reservan espacio y no cubren el lienzo. Conservar posición del desplazamiento horizontal entre snapshots, controles táctiles y navegación acotada. Muro / y Frontera /// juntos en cada catálogo; # en un acceso separado. Contagio usa un germen con flecha, distinto del virus de Pandemia. Avisos por turnos arriba del tablero, con el panel detallado vigente.

Ampliaciones1/2/3 identificadas +1/+2/+3 en iconos, hall y partida. Permutar id swap: dos fichas distintas elegibles, intercambia posiciones/símbolos/propietarios intactos y puntúa figuras nuevas de ambos al aterrizar, una vez; conserva terreno/turno/avisos. Respeta Escudo/Inmunidad/habitantes/bloqueos, no mueve eventos. Carta con cupos normales, sorteo táctico peso3, sin recargas históricas; máquina usa búsqueda acotada. # conserva símbolo/función compartida; wildcardSymbol guarda último signo que cobró una figura con él. Gris sin uso conocido, rojo X, verde O, guardado y mapas. Migrar usos pagados conocidos una vez sin puntos/stock extra; contagio borra la marca visual al convertirlo.

Ratón anuncia1 individuo; Plaga anuncia hasta3F simultáneos, cupos y alimento pueden reducirla. Cada individuo hace3 visitas en9turnos, por tanto potencial máximo3 vs9F comidas. Conservar alternancia, frecuencias y preaviso3turnos; ayuda sin menciones de segundos. Aislamiento online vigente. Publicar por CI y verificar Pages; ensayo Chromium emulado, no dispositivo físico.
## R0.21.41 · Pulsar y poner, Inmunidad flotante e inventario opcional

Jorge sustituye el giro de +2/+3 por pulsaciones en casillas sin construir contiguas por lado, empezando junto al territorio. +3 admite L. La última pulsación aplica; previsualizar/cancelar no gasta. Cantidad exacta, sin repetición/solape, barreras/reservas/cupo; no cambia turno, reloj, puntos ni avisos.

Inmunidad tiene accesos flotantes arrastrables sobre el tablero, uno por humano, conservando posición relativa por partida/jugador en el navegador. No mueve el mapa ni activa al arrastrar. Pulsación activa33s fuera de turno/cupo; pausa congela y retomar conserva posición. No recorrer terreno al arrastrar.

Nuevo ajuste playerInventory, activo por defecto y para guardados sin bandera. VS máquina controla al humano X/O independientemente de machineInventory; Sin conexión controla ambos humanos. Desactivado: sin cartas iniciales, recargas, premios de Inmunidad ni acceso/uso; no afecta fauna/fenómenos ni crecimiento obligatorio. Conservar bolsas antiguas, sin regalos históricos. Resultados comparan la bandera (ausente=activo). Publicar por CI/Pages con pruebas emuladas; online sigue aislado.
## R0.21.42 · Diana en inventario, acercamiento por color y avisos de impacto

Jorge pide acceso Diana en el inventario, para gestionar los tres marcadores ya acordados. Utilidad de navegación, sin gastar cartas normales, cupo ni turno. Rojo/verde/azul son las tres dianas; el icono Acercarse despliega esos destinos más blanco, que lleva a la última colocación propia (navigationLastMove), no al bloque activo. Mantener posiciones antiguas, colores por number1/2/3, mapas y pausa. No añadir sorteos/regalos retroactivos.

Al intervenir invasores/fenómenos, guardar informe acotado de resultado real y mostrarlo arriba8s, independiente de avisos previos y puntuaciones: OVNI libera casillas ocupadas; cataclismo/meteoritos destruyen terreno; contagio convierte; mezclas reordenan; invasores ocupan. Protecciones y geometría perdida reducen la cantidad. No mostrar anuncios históricos al abrir guardados; no medir desde relojes/pan/zoom. Mantener índices, aislamiento online y publicar por CI/Pages.

## R0.21.43 · Descripciones de todo el inventario

Jorge pide explicaciones desplegables para todos los elementos del hall y la mochila. Conservar dos filas de iconos; cada icono abre/cierra su descripción debajo, también cuando está agotado. Empiezan cerradas, accesibles por teclado y con aria-expanded/controls. Abrir no ejecuta cartas ni cambia stock, turno, relojes o guardados. Mochila ofrece botón Usar separado con disponibilidad real; hall solo consulta. Incluir Diana, Inmunidad y los tres premios. Mantener accesos rápidos directos del tablero y la inmunidad flotante. Publicar por CI/Pages, sin reactivar online.

## #3_13 · Inventario y conversiones R0.21.44 (11 de octubre)

Jorge autoriza revisión crítica, implementación y pruebas antes de publicar, solo VS máquina/Sin conexión. Design/local-economy-r44.md documenta decisiones y límites del ensayo. Tres cartas iniciales distintas elegibles/recomendadas, por inventario independiente. Preservar todas las bolsas de guardados, incluso excesos; sin premios históricos. Una recarga por colocación manual propia ≥33 con bonus; cartas/fenómenos/tiempo/turnos no recargan. Máximo una recarga ganada pendiente, límites18/12tipos/3unidades. Trueque por pulsación mantenida1s, exactamente una unidad, gasto voluntario registrado aparte tradeSpent; precio3/33/333, tramo3333 reservado por falta de potencia justificable. Inmunidad no se compra.

Emboscada hasta3*, Reconquista hasta33* (333ptos; reemplaza nombre propuesto Súper Reconquista), conservando terreno/puntos/otros símbolos. Antídoto33ptos protege una celda de un aviso concreto antes del impacto; no toca plazo ni resto. Contagio tres grupos separados de3 fichas; Pandemia conserva6%disperso y techo66F. Ambos X↔O y *↔#, puntúan figuras finales nuevas como Huracán, sin recargas pasivas ni pérdida histórica. Hall descripciones/resalte independientes, varias abiertas. Máquina usa mismos límites, recarga y puntos propios; trueque prudente desde Medio, máximo una compra por turno antes de herramientas.

ruleVersion14 y inventoryEconomyVersion1 activos; acabados intactos. Derrota territorial común sigue SIN ACTIVAR: umbral/plazo pendientes de aprobación y validación con partidas reales; tres turnos compartidos dan margen desigual y33celdas no escala. Duelo/equipos/Mundo/suscripción desactivados, sin cambios de servidor. Mantener ventana+margen2 e índices de snapshot, incluidos antidotos. Publicar por CI/Pages después de pruebas; Chromium táctil emulado no es QA físico.

## R0.21.45 · Dianas, recarga flotante e iconos (11 de octubre)

Jorge pide quitar dianas directamente, evitar duplicar cartas activas y sacar el trueque de la mochila. Acercarse ofrece × por diana, también en pausa; la descripción Diana añade los mismos accesos. Borrado por identidad idempotente, incluso si el terreno marcado desapareció, sin cambiar fichas/turnos/puntos/inventario/reservas. Historial de cartas junto a mochila omite efectos ya representados en la franja de efectos; las cartas preparadas y las instantáneas siguen visibles.

Recarga tiene botón flotante circular independiente de Inmunidad, icono de cartas/flechas, anillo de progreso de3s y tirador para moverlo; posiciones por partida/jugador, sin mover el tablero. Mantener3s abre selector propio con precio/stock/disponibilidad; tocar una carta compra una unidad y cierra. Abrir/cerrar/soltar antes/arrastrar/ocultar no compra. Se eliminan compras desde descripciones de mochila. Precios, caps, gasto voluntario y sorteos por combo≥33 de R44 intactos. Máquina espera3s antes de validar una compra, sin congelar relojes ni adelantar turno.

Antídoto usa frasco/gota/cruz, Emboscada daga/tres celdas, Reconquista bandera/territorio/flecha de recuperación, vectores comunes en todas las superficies. Mantener rendimiento por snapshot/ventana+margen2 y partidas existentes. Solo VS máquina/Sin conexión; online y derrota común siguen desactivados. Verificar conservación, cancelación del gesto, compra y borrado real con Chromium táctil emulado, publicar Pages y comprobar versión pública.

## R0.21.46 · Recarga compacta (11 de octubre)

Jorge pide recarga ágil, no otra mochila de descripciones. Mantener botón y acceso3s; bandeja inferior de máximo46% de altura, sin oscurecer el tablero. Catálogo de iconos con stock×N (incluido0) y precio, sin nombres/descripciones visibles; etiquetas accesibles conservan nombre, precio y causa de indisponibilidad. Cada espera3s habilita hasta3 compras de una unidad, iguales o distintas, sin superar caps. Bandeja actualiza stock/puntos/cupo restante, cierra tras tercera compra; nuevas compras requieren nuevo gesto3s. Cerrar/cambiar turno/pausar descarta cupo restante. No comprar con el clic residual de apertura. Únicamente Reconquista333; Bomba/Tornado/Combo/Ampliación inteligente/Súper Ayuda pasan33. Recarga automática por colocación manual propia≥33 permanece. Sin migraciones, regalos ni recortes de partidas. Verificar tamaño táctil, conservación y compras con CI Chromium emulado; publicar Pages.

Diana conserva tres marcas guardadas numeradas, navegación separada de papeleras grises, sin X de colores. Acercarse reúne referencias X roja/O verde, objetivo inmediato superior azul (incluye máquina en ranking local; líder sin superior) y última puesta propia blanca. Marcas guardadas debajo, cada una con diana y papelera aparte. Tablero y pausa comparten destinos; no duplicar flecha azul fuera del selector. Preservar coordenadas/identidades guardadas, no crear marcadores retroactivos.

# Pausa, Artificieros e identidad R0.21.47

Jorge pide mapa protagonista en pausa y puntos visibles; recoger ranking/datos/inventario en un desplegable cerrado por defecto que no reduzca el mapa al abrir. Diana del mapa pausado abre hacia abajo dentro de la pantalla. Mantener fila de acciones, casita a la derecha y navegación acotada por snapshot.

Recarga flotante: círculo de 88 px en vertical y 70 px en horizontal corto, aro de progreso visible, separado de Inmunidad. Conserva 3 segundos para habilitar hasta tres compras, precios y recargas por combos de ≥33. Avisos muestran cuenta grande y destacan el último turno; ordenarlos por impacto próximo. Bombas anunciadas tienen marco al elegir y conservan marco al seleccionar Desplazar.

Nueva Artificieros local: primera regla de equilibrio 33 puntos, hasta tres bombas del mismo Bombardeo pendiente (la tocada y las dos más cercanas). Quitar sus regiones, grupos, caminos y aproximaciones; las demás conservan su plazo. No altera terreno, fichas, puntos cobrados ni turno; cuenta como herramienta y luego se coloca ficha. Compra permitida tras anuncio bajo las mismas reglas de trueque; máquina usa el mismo árbitro. Guardados activos reciben stock cero sin premios históricos; conservar bolsas excedidas y resultados finalizados. Nuevos resultados ruleVersion 15.

Identidad pública #33 con logo y favicon/iconos versionados. Mantener ruta /hash3/, claves de almacenamiento, manifest id/scope/start_url y archivos antiguos de iconos para preservar accesos y partidas. Duelo/equipos/Mundo y derrota común siguen desactivados. Verificar motor, migración y entrada táctil en Chromium remoto; no presentar emulación como prueba física.

Contador solicitado por Jorge durante esta revisión: cartas normales guardadas/18 junto a la mochila, dentro de ella y en selector de Recarga. Inmunidad queda aparte, sin ocupar el cupo de 18. Actualizar al gastar, comprar o recibir por combo; si hay recarga por combo esperando hueco, mostrar +1 pendiente. Mostrar reservas antiguas que exceden 18 sin recortarlas. El contador no concede ni consume premios.


## R0.21.48 · Lectura de partida e inventarios visibles

Jorge recupera la tipografía Barlow Condensed anterior en la cabecera #33, sin subrayado decorativo. Avisos de recarga manual y por combos en cian. Puntuaciones de colocación muestran solo puntos y salto a la jugada; botón de información aparte abre el desglose cobrado bajo demanda, sin caducar mientras se consulta. No cambiar puntuación, navegación ni recargas existentes.

Inventario de pausa siempre visible sobre el mapa, fuera del desplegable de ranking/datos; mantener mapa protagonista y controles/diana dentro de pantalla también en horizontal. Muros y Fronteras del territorio aparecen como pilas separadas con cantidad de barreras colocadas, no número de celdas ni cartas guardadas. Navegar entre ubicaciones existentes, conservar geometría y dueños de barreras antiguas. Presentación solamente: ruleVersion15, claves de guardado, reservas, instalación y modos locales intactos. Validar con pruebas y Chromium táctil remoto antes de publicar; emulación no es prueba física.

## R0.21.49 · Capas del marcador pausado

Jorge detecta que la Diana atraviesa el marcador abierto en pausa. Aislar el contexto de apilamiento del mapa: Diana conserva su prioridad sobre controles del mapa, pero todos quedan debajo del desplegable de puntos. Probar hit-testing real sobre el centro de la Diana al abrir el marcador, y conservar navegación/guardados. No cambiar reglas ni activar conexiones del servidor. El enlace de perfil existente recupera solo identidad online, no partidas locales; su ampliación a traslado o sincronización de guardados requiere cerrar ese alcance antes de implementar.

## R0.21.50 · Inventario legible y recarga ágil

Jorge señala que Borrar aplicada seguía blanca. Todos los mensajes de uso/recarga y sus incidencias llevan cian, fondo y borde resaltados, sin recolorear puntos ni avisos amarillos del territorio. Recarga ahora requiere mantener 1 segundo, con el mismo máximo de tres compras por apertura; la máquina espera ese mismo segundo. Soltar antes, arrastrar, ocultar o cancelar no compra. Mantener combos ≥33, precios y caps intactos.

Contador normal guardado/18 en indicador propio, fuera de mochila y fuera del desplazamiento horizontal del catálogo, visible en partida/mapa/pausa; conservar badge de mochila y capacidad de bandeja. Inmunidad aparte, pendiente +1 y exceso histórico sin recortes. Unificar Muros y Fronteras colocados en una sola pila morada del territorio con cantidad total y navegación circular por objeto; tarjetas Muro/Frontera siguen separadas en inventario. No contar celdas como barreras ni alterar geometría antigua, dueños, puntos o guardados. Verificar especialmente el aviso Borrar con interacción táctil real emulada y los controles pausados en tres tamaños antes de publicar Pages. ruleVersion15, identidad instalada y modos locales intactos; no trabajo de servidor/online en esta entrega.

## R0.21.51 · Criterio cromático y mochila sin superposición

Jorge fija inventario cian, territorio amarillo. Iconos/contadores/controles/avisos de inventario son cian en cualquier modo/propietario, también 18/18 y +1 pendiente. Incluye cartas guardadas aunque no utilizables ahora, ayudas, protección, Muro/Frontera como cartas, trueque y descripciones. Agotadas e inactivas siguen atenuadas; abrir/cerrar descripciones conserva resalte independiente. Territorio: localizadores/eventos/pila colocada/Comodín y Próximos eventos en amarillo. No cambiar colores X/O, referencias de Diana ni barreras moradas dibujadas en las celdas: son geometría e identidad del tablero, no controles de inventario.

El contador de mochila está en flujo normal separado por encima del icono, no absoluto sobre él; ambos dentro de un único botón táctil, con protección simultánea sin taparlos. Jorge descarta la nueva franja superior redundante cuando hay mochila: retirarla de partida y mapa activo, ganando altura de tablero. Pausa conserva contador visible fuera de desplegable porque allí no hay mochila. Mantener capacidad dentro de mochila y selector. Ayuda refleja 1 segundo / hasta tres compras, combos ≥33 sin cambios. Verificar colores y ausencia de solapamientos en 320/390 px y horizontal, bolsa llena/pendiente e inmunidad activa, preservación de guardados y cero llamadas online. Presentación solamente: ruleVersion15, precios, caps, reservas y mecanismos locales intactos.

## R0.21.52 · Traslado de partidas y cambio voluntario de cartas (12 de octubre)

Jorge autoriza trasladar una copia completa de VS máquina/Sin conexión a otro navegador, conservando originales y sin sobrescribir el destino. Enlace autónomo comprimido en fragmento #traslado; no identidad Auth, JWT, claves ni sesiones online. Copias grandes ofrecen archivo .hash33 por el mismo protocolo y selección de partidas. Cada generación es un snapshot: nuevas jugadas no sincronizan enlaces anteriores. Antes de añadir, revisar cantidad/fecha/coincidencias; copiar en pausa sin ejecutar reloj, fauna, IA ni premios. Conservar íntegros puntos, inventarios independientes, protecciones, reservas, terreno, barreras, dianas, logros y anclajes. Identidades de partidas coincidentes se remapean con sus logros/anclajes; repetir un traslado no duplica ni retrocede avances. Importar con falta de espacio restaura los valores anteriores. Comprobar recorrido completo Chromium/WebKit/Firefox y 33.333 celdas; no afirmar pruebas físicas de Safari/iPhone. Supabase sigue devolviendo timeout en consulta mínima del 12/10; no reactivar modos ni cambiar cron/servidor para este traslado local.

Jorge añade cambio de una carta por otra y mantiene explícitamente máximo18. En bandeja Recarga: Comprar/Cambiar; elegir una unidad normal guardada a entregar y luego otra carta. Pagar precio vigente de nueva carta, sin reembolso ni descuento automático; conservar cantidad total, cupos de tipos/unidades, protecciones y reservas. No gastar herramienta/turno ni ejecutar la recarga por combo pendiente al sustituir; operación indivisible. Mismo cupo de hasta3 operaciones por apertura tras mantener1s; preparar/cancelar no modifica nada. Guardados con exceso se conservan, una sustitución no aumenta el exceso. Máquina comparte árbitro/coste/espera1s y límite prudente de una compra/cambio propio por turno, usando solo cartas actualmente no utilizables como entrega. Nuevas partidas/acciones locales ruleVersion16; resultados terminados intactos. No aplicar propuestas27 huecos/2tercios acción ni modificar pesos de sorteo: siguen sin aprobación.

## R0.21.53 · Trueque de todo el catálogo e identidad provisional unificada

Jorge exige poder elegir cualquier carta distinta con menos de tres unidades al cambiar, incluidas las agotadas. Retirar el límite adicional de doce tipos en trueque y recarga por combos; la capacidad física sigue siendo dieciocho cartas y tres unidades por carta, con precios actuales y puntos suficientes. Conservación de excesos históricos, pendiente +1, inventarios independientes, protecciones, reservas y operaciones indivisibles intacta. Nuevas partidas/acciones locales ruleVersion17; resultados finalizados intactos. No cambiar pesos de sorteo ni activar Duelo/equipos/Mundo.

Unificar cabecera, favicon, favoritos y accesos de instalación en el #33 blanco sencillo con la tipografía Barlow Condensed ExtraBold anterior, sin detalles rojos/verdes. Un mismo maestro vectorial de glifos para todas las superficies, con fuente OFL fijada para regenerar assets. Versionar nuevas referencias r53 y actualizar fallbacks locales PNG/ICO/Apple; conservar antiguos assets, ruta, claves de guardado y manifest id/scope/start_url. La identidad definitiva y skin comercial siguen pendientes; no presentar esta unificación provisional como diseño final de AppStore/PlayStore. Validar selector de catorce tipos/18 cartas con origen repetido y destino agotado en Chromium/WebKit/Firefox, assets publicados y navegación móvil existente; emulación no equivale a prueba física ni garantiza sustituir iconos que un dispositivo ya haya almacenado.

## R0.21.54 · Límite de valor del cambio

Jorge exige que Cambiar solo permita destinos de valor igual o inferior a la carta entregada: 3→3, 33→3/33, 333→3/33/333, siempre distinta y con menos de tres unidades. Un saldo alto no permite saltar de categoría. Aplicar en árbitro compartido, selector y máquina; mostrar el máximo de valor junto a la carta elegida. Mantener coste vigente de la nueva carta, dieciocho unidades totales, reservas, pendiente +1 y tres operaciones tras mantener1s. La compra directa con puntos no tiene carta de origen y conserva sus reglas. Bloqueos no gastan nada. Nuevas partidas/acciones locales ruleVersion18; finales antiguos intactos. Probar todas las parejas del catálogo, cambios iguales/descendentes y prohibidos, y selector de los tres tramos en Chromium/WebKit/Firefox. Logos r53 y traslado local sin cambios; no reactivar online.

## R0.21.55 · Cabecera legible y favorito de Safari pendiente de prueba nativa

Jorge valida el icono de Añadir a pantalla de inicio, denuncia cabecera diminuta y muestra captura de Añadir marcador con la ? de Dilema. Conservar imagen/manifest/iconos de instalación aprobados exactamente. Logo de cabecera en tablero: altura visible28px móvil,32px escritorio,22px horizontal baja; misma fila44/36px y sin solapar título ni reloj. Maestro de glifos intacto.

Los assets publicados de /hash3/ son #33; origen / y sus fallbacks devuelven404 en la comprobación del12/10. No hay prueba de que Dilema esté sirviendo su icono desde el origen actual ni de la causa exacta de la elección nativa. Añadir favicon16 y referencias r55 PNG/ICO explícitas, además de apple-touch-icon-precomposed nuevo con bytes idénticos al icono180 aprobado, para ofrecer candidatos nuevos a Safari. No cambiar otros proyectos, origen, ruta ni almacenamiento; no proponer borrar datos de Safari/partidas. Verificar HTTP/formatos/igualdad de assets y cabecera en320/390/horizontal con tres motores, sin afirmar que eso valida el diálogo nativo Añadir marcador. Favoritos sigue pendiente de comprobar en el iPhone de Jorge hasta evidencia directa; emulación WebKit no es Safari nativo. Presentación solamente: ruleVersion18 y economía intactos.

Jorge añade reparto compacto y equilibrado de las dos filas del catálogo: trece y doce entradas, sin duplicar ni omitir cartas/Diana; mover Antídoto y Artificieros a la fila inferior. En pausa sustituir la franja Inventario X por dos grupos compactos sin fondo: mochila con símbolo dentro, capacidad al lado, espectador/propio a la izquierda y rival a la derecha. X rojo/O verde, también las cifras; esta es una excepción explícita a inventario cian para estos contadores de pausa solamente. Cartas siguen cian y territorio amarillo. Inventario desactivado muestra -/-, incluso si conserva reservas históricas; ambos contadores visibles aunque el propio esté desactivado. Pendiente +1, capacidad18 y excedentes históricos intactos; no contar Inmunidad dentro del cupo. Conservar mapa protagonista y datos fuera de desplegable. La valoración de la configuración sencilla sin inventario/reloj no autoriza eliminar alternancia X/O ni crear un modo nuevo; no cambiar motor.

## R0.21.56 · Bombas reconocibles, Artificieros y tamaño del hall

Jorge señala bombas con marco discontinuo ya invasoras y Artificieros no seleccionable. Ampliar el permiso local a frentes de Bombardeo activos con crecimiento legal: hasta tres del mismo foco, empezando por la seleccionada y las más cercanas. Quitar esas ocupaciones conservando terreno, puntos, turno y progreso del foco restante; retirar solo un foco sin marcas vivas. Mantener el permiso previo sobre hasta tres bombas del mismo aviso, sin cambiar los plazos restantes. Colonias, estrellas estáticas/completas y contagio siguen siendo objetivos de Emboscada/Reconquista. Precios33, cupos18/3 y economía intactos; reglas activas/nuevos resultados19, históricos acabados intactos.

Una misma bomba vectorial gruesa para Bombardeo, avisos, frentes activos del tablero y mapas, y carta Bomba. Amarilla en territorio; carta en cian. Artificieros usa esa bomba tachada con X roja y las bombas elegibles pasan a rojo y muestran esa X al seleccionarlo; excepción visual solicitada para desactivación. Conservar * como dato del motor y asterisco para ocupaciones sin bomba activa. Preparar claves por snapshot, nunca recorrer fuentes durante pan/zoom.

Corregir el selector genérico .hall svg que reducía el wordmark: altura38px móvil/42px escritorio, maestro e iconos de instalación aprobados intactos. Favorito nativo Safari sigue sin prueba directa, no atribuir su icono viejo a una causa no verificada ni borrar datos. La valoración positiva de tornados/meteoritos/pandemias no autoriza cambiar frecuencias. Mantener online desactivado y publicar por CI/Pages con pruebas de árbitro y tres motores emulados; no afirmar ensayo físico.


## #3_14 · Inventario personalizable y Bomba atómica R0.21.57

Jorge pide bomba sin relleno, contorno grueso y X de Artificieros que deje leer la silueta. Maestro común fill none y stroke5.5; X roja pequeña en esquina inferior derecha, sin franja negra que borre el cuerpo. Colores territorio amarillo, inventario cian y selección de desactivación roja conservados.

Inventario: orden libre con tiradores de arrastre, selección y flechas de teclado, accesos favoritos flotantes movibles con tirador independiente. Las cartas flotantes salen de la barra, mantienen stock/referee/coste exactos, sin copias de inventario ni consumo al personalizar/arrastrar. Volver a la barra desde editor. Repartir las cartas que siguen en barra en dos filas equilibradas. Guardar preferencias por colono dentro de partida y defaults del navegador por modalidad; incluir preferencias en traslado local sin ejecutar relojes, turnos, fauna ni premios. Posiciones relativas de favoritos, conservadas al pausar/retomar y girar; en pausa son consulta, sin gasto. Mantener selección/stock actualizado y controles fuera de la geometría del tablero.

Inventario y territorio plegables independientes en tablero/mapa/pausa; conservar elección hasta que el usuario la cambie. Barras plegadas ceden altura real al territorio y dejan tirador de retorno. Avisos activos siguen visibles. Quitar botones zoom +/-; conservar pellizco, rueda/teclado existente y Zoom extensión. Editor no modifica puntos, turnos, relojes, cantidades, reservas ni versión de snapshot; no rebautizar la fecha de la última jugada al guardar preferencias.

Bomba atómica id nuclear:333 puntos, carta normal con máximo3 y capacidad18, elegible en catálogo, selección inicial, sorteos y trueque. RuleVersion20 para nuevas/activas; finales históricos intactos. Demoler hasta33 celdas construidas conectadas por lados, seleccionadas determinísticamente desde el centro más cercano; vista previa exacta y confirmación/cancelación. Elimina terreno y fichas X/O/*/# sin restar puntos cobrados. Menos de33 elegibles: afecta las disponibles. Respeta Inmunidad, Escudo, habitantes/reservas/cuerpo de gusano y anclaje. Barreras alcanzadas sin protección se rompen con la convención de Bomba. Limpiar referencias/efectos/focos derrotados y figuras rotas, conservar dianas para volver y reconstruir. No genera puntos ni premios ni avanza turno; después ficha o ampliación si no quedan movimientos. Uso también antes de ampliar en saturación, con stock y cupo de herramienta normales. La máquina usa el mismo árbitro sin privilegios; búsqueda acotada48 centros desde Alto.

Reconquista continúa quitando hasta33 invasores y conserva terreno. Diana: propuesta de clasificar sus tres marcas como expansión/ataque/defensa pendiente de valoración; no implementar nuevas funciones ni costes por inferencia. Frecuencias vigentes y modos online desactivados intactos. Validar conservación y cancelación con motor, móviles y horizontal con Chromium/WebKit/Firefox emulados, tablero33333 y traslado, publicar por CI/Pages; no afirmar ensayo físico.

Jorge reitera durante R57: una carta de3/33 no se cambia por Bomba atómica o Reconquista333, aunque haya saldo suficiente. Mantener bloqueo de valor en árbitro, selector y máquina; compra directa con puntos es operación distinta. Comprobar ambas cartas333 con un origen33 en el navegador.

En pausa horizontal baja, catálogos a un lado del mapa en pistas independientes, sin salir de pantalla ni ocultar contadores. Plegar reduce su pista y ensancha el mapa; nunca modifica preferencias al girar. Mantener dos filas, scroll propio, diana bajo marcador y mapa navegable, también a pantalla completa.


## R0.21.58 · Inmunidad elegida por el colono

Jorge pide devolver Inmunidad a la barra y decidir personalmente si la saca como flotante. Añadir immunity al orden personalizable; preferencias anteriores la reciben en la barra, sin alterar otros flotantes, orden, plegado ni posiciones. Retirar flotantes obligatorios. Inmunidad usa el mismo editor, tirador, persistencia, mapa y pausa que las demás cartas. Mantener stock independiente sin cupo18/3, activación fuera de turno, contador33s y pausa sin consumo. No cambiar economía, motor ni ruleVersion20. Publicar por CI/Pages tras comprobar preferencia explícita y conservación del guardado.

En Sin conexión conservar el acceso a la protección del otro colono dentro de la barra, identificado X/O, para permitir activación fuera de turno sin imponer flotantes. En VS máquina mostrar solo la protección humana como acción.


## R0.21.59 · Checks alineados del selector

Jorge pide alinear los checks de inventario propio/rival, fauna y fenómenos. Las etiquetas se estiran en la fila flex y justifican su contenido al final: los cuatro inputs comparten la misma base pese a distintas alturas de los iconos. Conservar agrupaciones, títulos, estados y configuración. Cambio CSS de presentación, sin modificar motor ni ruleVersion20.


## R0.21.60 · Cuenta atrás, avisos compactos e iconos

Jorge pide que las cifras de las cartas del territorio sean turnos para salir, avisos más compactos y revisar espadas de Soldados/Bomba atómica. En el motor por turnos, la barra muestra solo los turnos reales del aviso anunciado del tipo concreto (mínimo si hay varios); no sobrescribirlos con el siguiente sorteo de familia ni requisitos de figuras. Sin aviso no prometer aparición con número: previsiones de intento siguen en Próximos eventos y etiquetas accesibles con sus unidades reales. Obras filtran tareas pendientes del tipo, descartando las terminadas. Mantener ×N de barreras construidas. Avisos de44px y ancho acotado176, cuenta legible y superficie táctil44, conservar urgencia, orden, navegación y todos los eventos por scroll. Espadas vectoriales más sencillas y símbolo nuclear de tres sectores sin marco; mismos maestros en tablero, avisos, mapas, cartas y trueque. Presentación solamente, ruleVersion20, frecuencias, motor y guardados intactos.


## R0.21.61 · Previsiones y norma universal de amenazas

Jorge aclara que necesita planificar fenómenos antes del aviso. Sustituye el criterio R60 de ocultar previsiones: reservar y persistir el próximo tipo de cada familia sin consumir la bolsa hasta el anuncio. Mostrar −N hasta la aparición prevista, incluidos los tres turnos de aviso; destacar avisos reales. Si faltan figuras, espacio o población, la previsión es condicionada y el panel explica la espera. Fenómenos naturales cada33 turnos completos e invasiones cada66; bolsa de ocho naturales sin repetir hasta recorrerla. Doble avanza una vez también en intentos de fauna/comodín. Migrar activos sin repetir actividad pasada ni cambiar avisos, stock, puntos o históricos terminados; ruleVersion21. Conservar frecuencias históricas en datos previos al árbitro nuevo.

Norma general: celda amenazada, marco amarillo discontinuo. Usar un índice de amenazas preparado por snapshot para fenómenos, bombas, soldados y celdas ocupadas por fauna; incluir coordenadas fuera de terreno como overlays, sin crear terreno. Excluir inmunidad, escudos, antídotos y entradas invasoras bloqueadas. Compartirlo con mapas; navegación solo consulta índices. Ampliaciones amistosas no son amenazas. Mantener QA de ahorro de nodos y protección de guardados.


## R0.21.62 · Fauna breve, bombardeo separado y celdas muertas

Jorge valida rinoceronte y castor, individuales y plagas de exactamente tres. Ratón: tres intervenciones, una celda por turno, se retira después. Gusano: trayectoria anunciada de tres celdas, recorre todas en una intervención y desaparece. Rinoceronte: territorio elige la recta o diagonal continua más larga disponible, admite una corta y no pone límite; avisa tres turnos y resuelve todo en un turno. Barreras, huecos y muerte interrumpen la trayectoria; protección conserva las fichas. Castor: barrera de tres celdas por miembro en una intervención, símbolo amarillo //; mantener jugada y salida de ampliación legales. Caducidad inicial nueve turnos completos, calibrable. Intentos base: gusano33, ratón66, obras66, rinoceronte99, castor132; mismos factores de población/figuras y alternancia individual/plaga tras nacimiento exitoso. No prometer nacimiento si faltan condiciones.

Muerte: intento independiente cada333 turnos completos, aviso3, una sola celda permanente con calavera. Ninguna herramienta, fauna, fenómeno, invasión o ampliación modifica/ocupa/elimina esa celda. Mantener anclaje, movimiento y salida legales; si no hay sitio seguro, omitir ese intento.

Bombardeo cada66: oleada de bombas manipulables, tres celdas por bomba (3F bombas si caben). Aviso3 → explotan liberando fichas sin quitar terreno → aviso1 → * invasor estático en las tres celdas susceptibles. Mover desplaza el grupo entero; Artificieros desactiva hasta tres bombas del mismo aviso y evita su invasión. No hay crecimiento invasor automático nuevo. Mantener marcos amarillos discontinuos de toda celda amenazada, también fuera del terreno y en mapas.

Inmunidad total: compra directa333; escudo de una celda33. No se recargan mediante combos. Total conserva reserva independiente sin cupo18/3 y activación fuera de turno; no admite trueque. Nuevas protecciones duran tres turnos completos. Conservar exactamente los efectos históricos cronometrados pendientes, reservas, puntos y avisos existentes. Migración activa idempotente a ruleVersion22, nunca reejecutar eventos ni modificar partidas terminadas. Gusanos históricos conservan progreso con tope de27 turnos activos desde migración. Barras, pausa, mapa, favoritos, traslados y árbitro de máquina comparten las reglas. Doble solo avanza la ecología una vez al completar turno.

Mantener solo local/VS máquina; no tocar SQL/servicios online ni activar Duelo/Mundo. Las búsquedas de trayectorias ocurren al anunciar, nunca al hacer pan/pinch/tick. Validar motor, migración, rendimiento33333, compras y navegador móvil Chromium/WebKit/Firefox emulado por CI; no afirmar pruebas físicas.


## R0.21.63 · Identidad C sin marco

Jorge elige explícitamente C, usando la versión logotipo SIN MARCO en todas las superficies. Sustituye los glifos Barlow anteriores por geometría recta y redondeada blanca; no X/O rojas/verdes, subrayados ni recuadros. Maestro único design/brand-c/master.json, compositor src/brand-family.js y generador scripts/create-brand-c.py. Familia #3/#33/#333 con los mismos trazos; solo #33 se publica como juego actual. No activar futuras modalidades ni cambiar reglas22.

Cabecera, hall, favicon PNG/ICO, Apple/favoritos, manifest e iconos de instalación usan el mismo maestro. Nombres c1 propios de hash3 dentro de /hash3/icons/, conservando ruta, almacenamiento e identidad id/scope/start_url. Depurar public/icons y docs/icons a nueve recursos vigentes, eliminando variantes históricas de la publicación y generadores antiguos; quedan recuperables en Git. Esta petición sustituye conservar todos los antiguos iconos publicados. Cuatro fallbacks estándar raíz contienen el mismo diseño C. No cambiar otros proyectos ni borrar datos de Safari. La causa de la ? nativa de Dilema sigue sin demostrar; prueba WebKit/HTTP no confirma el diálogo nativo.

Conservar alturas de logo vigentes y controles táctiles, recortando el apodo con elipsis si hace falta en móvil. Verificar geometría común entre SVG y PNG, iconos válidos, 320/390/horizontal, manifiesto/guardados y publicación HTTP. Cambio de presentación solamente: puntos, reservas, inventario, preferencias, fauna, reloj y reglas R62 intactos.

## R0.21.64 · Marcador de guardados y turno de máquina recuperable

Jorge muestra Mis partidas sin puntos y una copia importada detenida en el turno de O. Todas las filas locales, incluidas ancladas/pausadas, muestran saldo real X/O rojo/verde. Compactar estado, reloj y copia importada mediante iconos con descripción accesible; conservar nombres, modalidad, nivel, detalles y protección de borrado de ancladas. No alterar guardados para dibujar la lista.

Reproducido: la búsqueda de máquina omitía celdas muertas y podía proponer una jugada que el árbitro rechazaba repetidamente. No atribuir sin guardado ese diagnóstico a la captura concreta. Excluir muertas en la posición de búsqueda. Planificador con límite de respuesta8s, error de Worker/mensaje y validación de acción; si falla, una alternativa legal del árbitro sobre el tablero actual, sin gastar cartas, saltar turnos ni conceder privilegios. Pausa/salida/ocultación cancelan, reanudación inicia, callbacks antiguos no juegan. No perder Doble ni espera1s del trueque; ecología/protecciones pueden invalidar la elección y se vuelven a validar. Un fallo incluso del árbitro avisa y conserva la partida, no bucle infinito.

Reglas22, identidad C, puntuaciones, reservas, inventarios, preferencias y originales del traslado intactos. Probar guardados importados en turno X/O, tablero con huecos/barreras/muerte, Doble, Worker colgado/error y pausa durante cálculo; verificar tres motores emulados por CI y publicación Pages. No afirmar pruebas físicas ni que una captura revele el guardado completo.

## R0.21.65 · Guía del territorio, mochila inferior y representación única

Jorge pide explicar cada evento del territorio igual que las cartas de jugador, en hall y tablero. Catálogo compartido: efecto, frecuencia/condiciones, duración, incidencia y respuesta estratégica; mismas descripciones plegables, territorio amarillo. Mochila amarilla inferior abre directamente esa guía y conserva mochila de jugador, plegado y navegación. −N solo para una previsión concreta/aviso; … sin turno asignado, ∞ permanente, ×N cantidad, — ausencia. No inventar fechas para otros miembros de la bolsa ni recalibrar frecuencias.

Un único icono por celda: prevalece el último presentado; conservar todos los efectos lógicos y sus localizadores. Índice por snapshot compartido con mapas/pausa; guardar procedencia visual solo para nuevos/movidos marcadores, no reordenar por ticks ni reanimar actividad histórica. Efectos de acción temporales sustituyen el icono durante su animación y restauran el marcador vigente al terminar. Muerte conserva representación y regla inalterable; amenazas mantienen su marco discontinuo.

Animar todos los efectos efectivos del territorio con lenguaje propio (mordisco, recorrido, carrera, construcción, corte, caída, sacudida, viento, contagio, colapso, invasión y muerte); conservar OVNI aprobado y Tornado manual siguiendo fichas reales. Herramientas posicionales animan sus celdas y toda carta utilizada anima su acceso. Sin repetir comandos ni puntuar animaciones; respetar movimiento reducido, pausa/cambio de partida, ventana visible+margen2, cachés acotadas y 33333 celdas. Reglas22, economía, reservas, referencias, identidad C, traslados y servicios online intactos. Publicar tras pruebas y tres motores emulados, verificar Pages, no afirmar QA físico.


## R0.21.66 · Dos zonas, mochilas separadas y lectura de impactos

Jorge autoriza reunir inventario/mochila azul y todas las cartas usadas del turno arriba; avisos y mochila/inventario/calendario amarillos debajo del tablero. Marcador independiente y fila final solo navegación, casa a la derecha. Franjas compactas con scroll, plegado y preferencias preservados en tablero/mapa/pausa. Las cartas usadas llevan identificación X/O; mantener el último turno rival hasta la siguiente colocación propia, sin borrar el uso al pausar. Mochila azul solo catálogo de jugador; amarilla solo territorio. Hall conserva ambos catálogos diferenciados.

Avisos reales de impacto pulsables: encuadrar/resaltar4,5s las coordenadas realmente afectadas, incluidos huecos de celdas demolidas. Persistir coordenadas compactas en los seis informes existentes, excluir inmunes/escudos/antídotos/sin cambio; nunca crear terreno ni ejecutar comandos al mirar. Preparar índice/densidad una vez al pulsar, consultar ventana+margen2 en navegación, geometría fuera de terreno incluida en encuadre.

Contagio/Pandemia conceden figuras nuevas y combos finales para ambos signos, nunca puntos por convertir sin figura, pagos duplicados ni descuentos históricos. Esta vía ya existe en scoreLandings: cubrirla con integración desde turno y mostrar ganancias X/O en el propio informe; corregir guía que decía lo contrario. No recarga por fenómenos ni modifica MAX manual. Reglas22 y frecuencias vigentes, reservas, stocks, originales de traslado e identidad C intactos; sin trabajo SQL/Supabase ni reactivación online. Validar motor, guardados, tres motores emulados y pipeline completo antes de Pages; verificar versión pública, sin afirmar prueba física.


## R0.21.67 · Herramientas alineadas en PC y móvil

Jorge pide equilibrar tablero/pausa, mochila y calendario del territorio, mochilas en la fila del zoom, contador sin desbordar al plegar y Bomba con el trazo del catálogo. Controles de44px: en tablero/mapa general, mochila propia, plegado y ajustes comparten fila con zoom/Diana; las dos filas de cartas quedan debajo. Pausa: las dos mochilas X/O y sus cantidades comparten fila con zoom/Diana/pantalla completa. La mochila propia abre su catálogo y sustituye el acceso azul duplicado; rival conserva consulta. Contadores, pendiente+1, reservas desactivadas-/- y excesos históricos mantienen espacio propio, también plegados. Territorio: plegado/mochila/calendario alineados y44px, dos filas de cartas con scroll. En pausa horizontal corta, cabecera común encima de mapa y dos catálogos laterales independientes; plegar cede anchura sin cambiar preferencias.

Maestro Bomba sin relleno con trazo3.6 en64 unidades (=1.8 en32 como las demás herramientas), compartido con territorio, cartas, avisos, mapas y Artificieros. X roja y geometría intactas. Retirar reglas anteriores que imponían mochila de80/84px y botones de40px. No migraciones ni nuevas reglas: ruleVersion22, guardados, puntos, bolsas, protecciones, preferencias, traslado e identidad C intactos. Solo Sin conexión/VS máquina, sin trabajo de servidor ni reactivar Duelo/Mundo. Validar seis tamaños320/390/428/740horizontal/1280/1920, barras abiertas/plegadas, pause/fullscreen/mapa, contadores y tablero33333 con tres motores emulados y pipeline antes de Pages. No afirmar prueba física de Safari/iPhone.

Validación local de R67:539 pruebas del motor, compilación Pages y QA de alineación en Chromium/Firefox/WebKit pasan. Incluye capacidad excedida99/18, recarga pendiente e Inmunidad, inventario desactivado, pausa VS máquina X/O y navegación33333. La subida del14/10 fue bloqueada por revisión automática por falta de autorización explícita para publicar en GitHub; no hubo push ni despliegue. Versión pública sigue R0.21.66/r277 hasta autorización de Jorge y pipeline remoto.

Jorge autoriza expresamente el14/10 subir R0.21.67 a Xtronzio/hash3 y publicarla en GitHub Pages. Esta autorización resuelve el bloqueo anterior; completar pipeline remoto e integración y comprobar r278 público.

## R0.21.68 · Tres Tornados, mochila común y ajustes de guardados

Jorge pide que Tornado territorial sea exactamente tres tornados, como los tres focos de Contagio. Nuevas partidas y activas adoptan ruleVersion23: reservar al anunciar tres zonas completas3×3, sin solapamiento, mezclar fichas/huecos dentro de cada zona por separado, nunca entre zonas. Si no caben tres, omitir ese candidato y usar la selección viable existente. Conservar frecuencia, aviso y respuesta; la carta Tornado manual mantiene su regla. Puntuar figuras nuevas/combos finales de ambos signos una sola vez con scoreLandings, sin recarga pasiva ni alterar pagos previos. Planificación acotada por fases y búsqueda exacta pequeña; no búsquedas en pan/zoom/ticks. Mantener geometría/grupos y cuenta atrás de avisos ya guardados, aunque sean de una sola zona; migración activa idempotente sin eventos retrospectivos. Partidas terminadas conservan su versión.

Mochila maestra compartida src/backpack-icon.js: forma de los contadores, sin X/O dentro. Cian para inventarios de jugador, amarillo para territorio, mismo SVG en hall, barras, pausa y contadores; los números X/O mantienen rojo/verde y capacidades independientes. Mis partidas incorpora iconos de inventario propio y rival/máquina con distintivo exterior de participante, fauna, fenómenos, figuras normales/avanzadas y dificultad de máquina. Mostrar valores reales guardados, marca roja de desactivación, títulos y descripciones accesibles; no escribir guardados para dibujar iconos. Fila de ajustes bajo datos, compacta desde320px. Conservar saldos, ancladas sin borrado y menú existente.

Solo Sin conexión/VS máquina, sin SQL remoto/Supabase ni activar Duelo/Mundo. Guardados, preferencias, puntos, reservas/excesos e identidad C se conservan. Validar tres focos/aterrizajes y pago X/O, protección, migración/serialización, ajustes verdaderos en guardados y navegadores Chromium/Firefox/WebKit emulados con pipeline completo antes de Pages. Autorización de publicación de Jorge vigente; comprobar versión pública, sin afirmar pruebas físicas.

R67 ya integrada y r278 público verificado. R68:545 pruebas locales del motor y QA de alineación en tres motores pasan. El entorno local se desconectó después; completar validación en CI antes de integrar/publicar r279.

## R0.21.69 · Cajones laterales independientes

Jorge aprueba redistribuir los accesos auxiliares para ampliar las cartas visibles. Dos plegados independientes por barra y colono: vertical de cartas y lateral de accesos. Cajón lateral recogido por defecto en preferencias antiguas; mochila amarilla/calendario abajo, mochila cian/personalización para sacar cartas al tablero arriba. Mantener contadores legibles junto al zoom, capacidades independientes y acceso existente desde el contador. Un tirador de flecha horizontal visible recupera los auxiliares. En vertical y PC alto, carril de44px con plegado vertical arriba y tirador debajo, compartiendo altura con las dos filas de cartas. Cajón abierto añade una sola columna de44px. Recoger cartas mantiene sus auxiliares accesibles y no cambia el estado lateral; viceversa tampoco cambia el vertical.

En horizontal de poca altura, tablero usa fila de controles de44px y cartas con scroll en48px para preservar espacio de juego; pausa conserva las dos columnas laterales independientes y mapa visible. Mismo comportamiento en tablero, mapa general, pausa y pantalla completa. Guardar inventoryDrawerCollapsed/territoryDrawerCollapsed mediante la vía de personalización existente, conservando orden, flotantes, posiciones y preferencias verticales, también en traslado. Leer preferencias antiguas no escribe partidas. Ancladas, saldos, stocks/excesos, turnos, reglas23, efectos y fenómenos de R68 intactos. R68/r279 integrada y versión/assets públicos confirmados por QA HTTP en GitHub.

Validar tamaños320/390/428/740horizontal/1280/1920, ambas barras/cajones abiertos/recogidos, controles44px, acceso a mochilas/calendario/editor, flotantes sin gastar, persistencia tras pausa/recarga/traslado y rendimiento33333; tres motores emulados y pipeline antes de Pages. Solo local/VS máquina, sin Supabase remoto ni reactivar online. Autorización de Jorge para implementar/publicar vigente. No afirmar QA físico.

Validación local R69:545 pruebas del motor y compilación Pages aprobadas. QA de cajones en Chromium/Firefox/WebKit:48 combinaciones de tamaño/estado por motor, controles44px, foco en fullscreen, aux independientes, flotantes sin gasto, persistencia y33333. QA anterior de alineación/Tornado en Chromium y navegador general pasan; completar pipeline remoto y versión HTTP antes de dar por publicada r280.

## R0.21.70 · Marcos, mochilas sin duplicados y personalización anterior

Jorge corrige R69: las flechas laterales deben tener marco como el resto de controles44px. Quitar la mochila propia redundante del cajón azul, conservar el acceso desde su contador junto al zoom y recuperar allí el contador/mochila rival también en tablero y mapa general. Pausa mantiene ambos contadores originales. El cajón azul conserva solo Personalizar, colocado arriba y con el icono anterior de tres deslizadores; ordenar y sacar cartas al tablero mantiene las mismas acciones, no sustituirlo por el símbolo de flotante. Mochila/calendario amarillos y los dos plegados independientes intactos.

Mostrar valores guardados reales: -/- significa inventario desactivado, incluso con reservas; nunca activar la máquina ni alterar su stock para mostrar el contador. Cubrir ambos signos humanos, inventarios propio/máquina activados/desactivados, excesos históricos y guardado sin cambios. Solo presentación, reglas23/economía/turnos/preferencias conservados. R69/r280 integrada y pública verificada. Publicar r281 solo tras pipeline y QA Chromium/Firefox/WebKit emulados; no afirmar ensayo físico.

## R0.21.71 · Peticiones recuperadas de las capturas

Jorge recupera tres peticiones que faltaban después de R70: flechas laterales y verticales del mismo tamaño (SVG24px dentro de control44px con marco); mochilas separadas en juego igual que en pausa, iconos cian comunes y cantidades/pending X rojos/O verdes; mismo brillo del inventario territorial anunciado para avisos reales inminentes, automáticamente sin pulsar, y cartas de jugador al usarlas. Inminente significa último turno de un aviso real, nunca una previsión condicionada. El pulso automático persiste hasta que se resuelve; pausa y movimiento reducido detienen animación conservando resalte. Las cartas brillan en cian tres pulsos650ms al gastar/usar realmente, incluidos ayuda y efectos, sin animar consultas, trueque o historial al abrir un guardado ni confundir participantes. No cambiar marcos, deslizadores, cajones, stocks, puntuaciones, preferencias ni reglas23.

Solo local/VS máquina. Conservar guardados/traslados y aislamiento online. Autorización vigente para implementar/publicar. QA en seis tamaños, pausa/tablero/mapas, uso real y aviso sin toque, conservación y tres motores emulados; pipeline completo antes de integrar y verificar R71/r282 público. No afirmar pruebas físicas.

## R0.21.72 · Contorno de Ampliadores e iconos del marcador

Jorge señala que el icono opaco de Ampliadores tapa el contorno discontinuo de la construcción reservada. El contorno se pinta por encima del glifo sin mover, crear ni consumir terreno; conservarlo aunque una Diana posterior sustituya al +. Construcción amistosa conserva borde punteado amarillo, separado de la amenaza discontinua; ninguna recalibración o comando por mirar. No añadir recorridos de terreno durante navegación. Marcadores compactos de Ampliadores conservan contorno propio.

En las zonas subrayadas del marcador, mostrar la configuración con los iconos maestros de Mis partidas, en cada participante y en juego/pausa: una mochila de su inventario real, fauna, fenómenos, figuras, reloj y dificultad solo para máquina. Preservar nombres, saldos, #MAX, combo y fichas. Respetar inventario humano/máquina independiente, también humano O; leer no cambia guardados. Reglas23, stocks, puntos, preferencias, marcos y cajones R71 intactos. Solo local/VS máquina; autorización de publicación vigente. QA de píxeles para contornos, seis anchuras, tres motores emulados y pipeline completo antes de Pages; verificar R72/r283 público.
