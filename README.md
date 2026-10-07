# #3 — R0.19.9

## Fila de navegación · R0.19.9

El catálogo reúne sus tres accesos y la casa en el mismo pie. La casa queda a la derecha. Se guarda en AGENTS.md el criterio de agrupar los iconos en una línea siempre que haya espacio, manteniendo el tamaño táctil y evitando desbordamientos; la vuelta al inicio ocupa el extremo derecho.

## Destruir celda y accesos · R0.19.8

Destruir celda entra en la recarga de VS máquina y Sin conexión, conservando las ocho cartas iniciales. Solo elimina celdas vacías del territorio conectado y respeta Inmunidad. Conserva fichas, puntuación, figuras ya pagadas y reloj; cuenta como herramienta y después se coloca la ficha. El hueco puede recuperarse construyendo o ampliando. Si se elimina la referencia del territorio, se conserva una referencia de navegación válida sin mover el marco activo; las zonas aisladas se recuperan al reconectarlas. Si no quedan celdas jugables, se pasa a ampliación.

Se quita la flecha de abandonar en la partida local; quedan Pausa y la bandera de Finalizar. Los accesos del catálogo son iconos con etiquetas accesibles, el icono de partidas es una carpeta, y catálogo y métricas vuelven al inicio con la casa. Mis partidas muestra iconos, etiquetas Ancladas, Activas, Pausadas y Cerradas y sus contadores.

## Marcador desplegable · R0.19.7

La puntuación inferior incorpora una pestaña que despliega y recoge una sección informativa sobre la propia botonera. Se elimina el emergente, el fondo oscurecido, la flecha de salida, el botón de volver y los controles de navegación y compartir del marcador. El panel solo muestra datos, conserva la cámara y permite seguir navegando por el tablero y usando la botonera. Escape recoge la sección; el reloj continúa.

## Inventario y partidas · R0.19.6

El catálogo del hall muestra las herramientas con contraste completo y sin acciones «Usar» deshabilitadas. Las restricciones del inventario durante la partida se conservan. Mis partidas usa iconos con contadores para ancladas, en curso, pausadas y cerradas, con etiquetas accesibles; se eliminan las instrucciones repetidas y los mensajes de grupos vacíos. El pie vuelve al inicio con un icono de casa.

## Tablero y marcador · R0.19.5

La partida usa una sola franja superior para el turno, símbolo y cuenta atrás. La puntuación inferior abre el marcador con #MAX, combo récord y detalles de modalidad, figuras, identidad, rival y reloj. Las opciones de compartir sala permanecen en este panel; Abandonar pasa a la botonera inferior y Finalizar conserva su acción separada. Se elimina el menú «…», el marcador superior repetido y el aviso de ampliación cuando ya se muestra el estado. El panel conserva la cámara, puntos y turno; abrirlo no pausa la partida ni su reloj.

## Arrastre táctil y métricas · R0.19.4

El arrastre con un dedo conserva el gesto cuando la captura táctil pasa de la celda al tablero. Solo la pérdida de captura del propio tablero termina el arrastre. Se conserva el toque para colocar fichas y el pellizco con dos dedos.

Las cuatro modalidades abren sus métricas directamente. Se elimina el botón «Mis métricas» y la selección usa el color del hall en texto, icono y marco: Mundo verde, Duelo rojo, VS máquina cian y Sin conexión plata. La clasificación de Mundo conserva un acceso independiente; los selectores permanecen visibles para volver directamente a cualquier modalidad.

## Arrastre del tablero · R0.19.3

El arrastre agrupa los movimientos por fotograma y aplica la última posición antes de terminar el gesto. La ventana detallada se actualiza al cruzar el borde de una celda; reutiliza el contenido de las fichas que siguen visibles y conserva una caché limitada a esa ventana. El mapa oculto deja de medir y actualizar sus elementos durante la navegación. El pellizco dibuja las nuevas celdas en el mismo fotograma de su transformación. Se mantiene la colocación con un toque, sin colocar tras un arrastre, y el marco activo blanco de R0.19.2.

## Marco activo · R0.19.2

El territorio activo se encuadra en blanco tanto en el mapa de la partida como en el visor de pausa. La referencia del rival conserva el azul. Se mantiene el acceso para localizar habitantes; este pase no cambia sus ciclos.

## Interfaz y métricas · R0.19.1

- Deslizar una partida a la derecha descubre una chincheta; tocarla ancla o desancla. Deslizar a la izquierda descubre la papelera. Los gestos no abren ni borran partidas.
- Zoom extensión, pantalla completa y salir de pantalla completa tienen iconos distintos. En el mapa de pausa, el rival conserva una referencia azul incluso si su última ficha ha desaparecido.
- «Activar celda» se llama ahora «Construir celda», sin cambiar su comportamiento, stock guardado ni identificador interno. «Destruir celda» aparece como carta pendiente en el catálogo; no se reparte hasta cerrar sus reglas.
- Ranking abre Mis métricas por modalidad: VS máquina, Sin conexión, Duelo y Mundo. Las locales usan partidas guardadas en este navegador; las compartidas distinguen participantes. Una consulta autenticada de solo lectura devuelve métricas propias online sin cargar tableros ni avanzar relojes. Ocultar una sala no borra estas métricas.
- La clasificación de Mundo y sus periodos permanecen independientes; las referencias #MAX de práctica y Duelo no cambian el #MAX oficial. Registros antiguos ausentes se muestran como —.
- Los eventos 33/66/99 y sus indicadores múltiples siguen pendientes del bloque de habitantes; este pase no cambia el calendario actual de roedores.

Juego de figuras y territorio. Repositorio: `Xtronzio/hash3`.

## Navegación y reloj · R0.19.0

El tablero detallado dibuja solo las celdas visibles con un margen de dos celdas. Un índice espacial por grupos de 16×16 evita recorrer todo el terreno al navegar. Arrastre, rueda y pellizco actualizan la ventana; las celdas que permanecen visibles conservan sus nodos. La cámara se conserva en coordenadas del juego al recibir actualizaciones o cambiar el tamaño de la pantalla.

Zoom extensión encaja el tablero completo en Duelo y modos locales; cuando las celdas serían menores de 14 píxeles muestra una vista simplificada. Tocar una zona vuelve a la escala de juego allí, sin colocar ficha. Mundo no tiene extensión en el tablero principal y limita el alejamiento al 55 %. El minimapa permite ver y explorar el mundo completo; su representación agrupa celdas en trazados SVG por color.

Los turnos humanos y ampliaciones con reloj pasan a 33 segundos en local y servidor. Las partidas sin reloj se mantienen. Las partidas existentes conservan su plazo en curso y milisegundos de pausa; los turnos siguientes usan 33 segundos. El reloj total del duelo y la respuesta de dos segundos de la máquina online se conservan. La migración incluye comprobaciones de estos casos y conserva privilegios y comprobaciones de pertenencia.

Roedores periódicos, bombas, gusanos, obras, fronteras y cambios de Mundo siguen pendientes del siguiente bloque; esta versión mejora la navegación y los relojes.


## Inmunidad del territorio · R0.16.9

En VS máquina y Sin conexión, una colocación manual de al menos 33 puntos cuenta como un combo, incluidos sus bonus. Los puntos logrados usando cartas, las colocaciones automáticas y el símbolo propio colocado por el rival no avanzan objetivos. No se exige número de turnos ni antigüedad; las dos colocaciones de Doble se evalúan por separado, sin sumar jugadas menores.

| Objetivo repetible | Protecciones ganadas |
| --- | --- |
| Cada 3 combos de ≥33 puntos | 1 protección de una ronda |
| Cada 33 combos de ≥33 puntos | 3 protecciones de una ronda |
| Cada 333 combos de ≥33 puntos | 33 protecciones de una ronda |

Una misma colocación avanza los tres contadores. Los premios se suman a la reserva de Inmunidad, aparte del máximo de ocho cartas de recarga; no entran en el sorteo. Ganar 3 o 33 protecciones entrega unidades independientes de una ronda. Nunca activa una inmunidad larga ni se activa automáticamente. En la partida, la bolsa abre un panel de iconos y cantidades. Inmunidad aparece al final con su icono de territorio protegido y el total guardado; tocarlo activa una sola ronda. Sus tres contadores muestran el premio (+1 / +3 / +33), los combos que faltan (−N) y una barra de progreso. La guía del hall conserva las explicaciones completas, incluida Inmunidad. El tablero no muestra una franja de inmunidad ni marcas de inmunidad sobre sus fichas. Cada colocación que avanza objetivos añade un aviso breve al aviso de puntos, también si todavía no entrega premio. El número de la bolsa suma todas las unidades; ganar protecciones resalta la bolsa y anuncia la cantidad recibida con el color del modo. En un dispositivo compartido, el aviso espera al turno del dueño.

**Escudo** protege una celda concreta con una ficha propia; **Inmunidad** protege todo el territorio del jugador contra los ataques de inventario: borrar, convertir, desplazar, bloqueo rival y Ficha rival. Los rivales siguen colocando fichas normalmente. Cada activación de Inmunidad consume solo una unidad y ocupa una herramienta según el límite normal o Combo; no se apila ni sustituye una protección activa. Termina tras un turno rival completado, haya ataques o no, también automático o pase. Doble cuenta un turno; ampliar y pausar no cuentan. Las unidades guardadas se conservan y solo se gasta otra si eliges activarla. Gastar conserva el progreso de todos los objetivos. La idea inicial del Espía queda integrada en esta protección; no se desarrollará como otra carta ni como aviso previo independiente.

La máquina respeta las mismas reglas si tiene permitido el inventario. Los guardados previos a R0.16.8 parten de cero combos y protecciones, sin reconstruir premios desde el marcador. Las cartas antiguas de 3 o 33 rondas de R0.16.8 se convierten en 3 o 33 unidades de una ronda por carta. Si había una inmunidad larga activa, conserva una ronda activa y guarda las rondas restantes como unidades de reserva. La conversión es única, conserva los puntos, el turno y el progreso, y no anuncia un premio nuevo al abrir o retomar.

## Una herramienta por turno y Combo · R0.16.7

El límite normal es una herramienta por turno, incluida Ayuda. La nueva carta Combo se obtiene en las recargas y debe activarse primero: consume una carta y permite otras dos herramientas distintas en ese turno. Doble mantiene sus dos colocaciones. Las ocho cartas iniciales y el máximo de ocho cartas de recarga se mantienen; los guardados antiguos incorporan Combo con cero unidades, sin alterar sus cartas ni efectos ya utilizados. La máquina respeta el mismo límite y solo puede ampliarlo gastando Combo.

## Contador y aviso de recarga · R0.16.6

La bolsa del tablero muestra el total de cartas restantes, contando también unidades repetidas. El número baja al consumir una herramienta y se actualiza con cada recarga real. El contador, la bolsa y el aviso conservan el color del modo: cian en VS máquina, rojo en Duelo y blanco en Sin conexión. La recarga resalta el contador durante 3,5 segundos y muestra la carta recibida, sin abrir el inventario ni tapar el aviso de puntos. En dos jugadores en el mismo dispositivo, el aviso espera al siguiente turno del dueño de la carta. Abrir un guardado o reanudar una pausa no repite recargas antiguas. Se respeta la preferencia de movimiento reducido.

## Borrado, salida de Mundo e inventario de práctica · R0.12

Cada entrada de Mis partidas tiene papelera y confirmación. Los guardados locales se borran de este navegador; la colección es la fuente principal para impedir que el antiguo guardado único reaparezca después de borrar. Las salas online se quitan solo de la lista del invitado: si sigue activo, también sale usando la misma lógica de abandono existente. No se borra la sala compartida, su resultado ni el #MAX oficial de Mundo. Abrir de nuevo una sala por su código o volver a Mundo recupera la entrada en Mis partidas. El servidor comprueba pertenencia y limita el cambio al usuario autenticado.

Mundo muestra **Salir de Mundo** en la botonera inferior. Conserva puntos, figuras y territorio; la plaza queda disponible y la sala continúa.

Inventario está disponible desde el hall y dentro de las partidas locales. Incluye **Doble**, **Ficha contraria**, **Borrar** y **Ayuda**, sin coste durante las pruebas. Máximo dos herramientas por turno; Ayuda no cuenta para ese límite. Doble conserva el turno hasta la segunda colocación y comparte el reloj original. Ficha contraria cambia solo la siguiente marca: la identidad sigue igual y las figuras se atribuyen al símbolo colocado. Borrar se limita a marcas rivales en el territorio conectado y protege todas las colocaciones propias, incluso las contrarias; no mueve el turno ni reinicia el plazo. Conserva puntuación, figuras y geometrías cobradas para evitar cobrar una figura reconstruida. El motor de la máquina también respeta esa historia. DOBLE registra cada ficha como una acción; Borrar registra una acción sin puntos y Ficha contraria no añade al #MAX del actor los puntos del rival. Las ayudas y herramientas se indican en el #MAX de referencia. Al pausar y guardar se conservan las herramientas activas. El inventario online queda pendiente.

`supabase/session-removal.sql` añade visibilidad personal de salas. `tests/session-removal.sql` comprueba retirada, reentrada, permisos y conservación de resultados dentro de una transacción revertida. `tests/inventory.test.js` comprueba sugerencias legales, relojes, restricciones y borrado sin resurrección del guardado anterior.

## Partidas, pausas y turnos sin reloj · R0.11

**Mis partidas** reúne todas las salas del invitado y las partidas locales de este navegador. En curso y pausadas se muestran por separado; cerradas se conservan dentro de un bloque plegado. Abrir una partida pausada no la reanuda sin pulsar Retomar.

En máquina y sin conexión, pausar conserva tablero, puntos, turno y milisegundos restantes. Ir a Mis partidas u ocultar la página pausa la partida local. En Duelo se abre una votación de 60 segundos entre los humanos activos: hace falta mayoría absoluta (6 de 10; 2 de 2); el solicitante aporta su voto a favor. La sala continúa durante la solicitud de pausa. Reanudar exige la misma mayoría y recupera ambos relojes. Un cambio de participantes cancela la votación vigente. Mundo nunca se pausa.

Duelo ofrece **Por turnos · sin reloj**: no hay límite por turno ni duración total. Cada movimiento se guarda y queda esperando al siguiente jugador; ningún humano recibe una jugada por tiempo agotado. La máquina responde cuando le toca y vuelve a esperar. Este modo también admite pausa por mayoría. Desde R0.15 las partidas locales nuevas usan 30 segundos por turno y pausa inmediata; los guardados antiguos sin reloj mantienen sus reglas. Desde Partida pausada se puede volver directamente al hall sin pasar por Mis partidas, manteniendo el guardado y el tiempo restante.

Las celdas vacías utilizables muestran un punto blanco durante el propio turno. Tocar una celda no utilizable solo produce un destello rojo de 320 ms; en el turno del rival, tocar el tablero no hace nada. Una ampliación se previsualiza al primer toque y se confirma con el segundo toque en la misma posición; el botón Colocar sigue disponible.

El Ranking de Mundo ofrece General, Anual, Mensual, Semanal, Diario y Por horas, con fecha elegible y hora peninsular (Europe/Madrid). Ordena por #MAX exacto y presenta tu posición y el rival inmediatamente superior incluso fuera de la página de resultados visible. General conserva el #MAX oficial de las últimas 100 acciones; los periodos calculan las últimas 100 acciones registradas dentro del intervalo elegido. El historial comienza en R0.11: no se reconstruyen periodos anteriores. Las salas Duelo y las partidas locales no aportan acciones a este ranking.

`supabase/session-management.sql` actualiza relojes, votaciones, consultas de sesiones e historial privado de Mundo. `tests/sessions.sql` verifica estas operaciones con usuarios reales simulados en una transacción revertida; `tests/sessions.test.js` comprueba conservación local, almacenamiento múltiple y expansión en dos toques.

## Ejecutar

Node.js 22.12 o superior.

```sh
npm ci
npm run dev
npm test
npm run build
```

El sitio estático publicable queda en `dist/`, incluido su service worker. `scripts/build-offline.mjs` genera una caché por versión a partir de los archivos compilados. El proyecto usa Sites para alojamiento y Supabase para el juego online. Google y Apple todavía no están configurados.

`src/config.js` contiene exclusivamente la URL y la clave publicable de Supabase; no contiene claves secretas. La autorización online se comprueba en el servidor. Para otro entorno, copia `.env.example` a `.env`.

## Niveles y combinaciones

Al crear Mundo, Duelo o una partida local se elige Normal (por defecto) o Avanzado. Toda la sala comparte ese nivel; no cambia durante la partida. Las salas y partidas guardadas anteriores conservan las reglas normales.

Normal suma todas las figuras básicas nuevas, incluidas las que se solapan. Avanzado añade el componente completo del mismo símbolo conectado por los lados que contiene la ficha recién colocada, con al menos cuatro celdas y una forma distinta de las básicas. No enumera subconjuntos arbitrarios ni enlaza diagonales. Cada geometría se cobra una vez; ampliar o fusionar un grupo crea una geometría nueva. Ambos niveles conservan el bonus por cada tercera figura y el resaltado de todas las figuras cobradas.

Las migraciones de R0.7 son `supabase/migrations/20261004170617_scoring_levels.sql` y `supabase/migrations/20261004170821_scoring_levels_clock.sql`, aplicadas en ese orden. El servidor usa el mismo nivel para jugadas manuales, máquinas y turnos vencidos; los jugadores no pueden cambiarlo mediante el payload de una jugada. `tests/levels.sql` comprueba puntuaciones y permisos dentro de una transacción revertida.

## Figuras y aviso de puntos

«Cómo se juega» explica los puntos en una tabla, el bonus de la 3.ª, 6.ª, 9.ª figura y la suma de figuras que comparten celdas. Incluye ejemplos: línea de tres con bonus = +6; cuadrado y tres L nuevas de tres = +13 antes del bonus. Los valores y las reglas de puntuación se conservan.

Cada jugada que puntúa resalta durante 500 ms las celdas de las figuras realmente cobradas. Si completa varias figuras, se iluminan sus celdas y el aviso desglosa cada tipo de figura y el bonus. Un +puntos aparece junto a la ficha nueva durante 1,4 s. El resaltado usa el color del símbolo y conserva la referencia azul del ranking. El mismo evento no vuelve a animarse al recibirlo de nuevo por polling o al recuperar la partida. Funciona en salas online, modo solo, dos jugadores locales y jugadas por tiempo agotado.

## Iconos de navegador e iPhone

R0.8 usa el logo #3 blanco sobre negro suministrado por Jorge. `public/icons/hash3-logo.jpg` conserva el original; sus copias PNG se exportan sin cambiar el diseño a 32, 48, 180, 192 y 512 píxeles. Sustituyen el antiguo # con punto verde. El HTML declara favicon PNG y `apple-touch-icon`; `public/manifest.webmanifest` declara los iconos de aplicación, alcance y URL inicial relativos para funcionar tanto bajo `/hash3/` como en la raíz de Sites. Todos se incluyen en la caché offline. Los nombres de icono de R0.8 evitan reutilizar la URL del favicon anterior.

Si un acceso ya instalado en la pantalla de inicio del iPhone conserva el icono antiguo, eliminar ese acceso y añadir de nuevo la web desde Safari. No borrar los datos del navegador: contienen la identidad invitada y las partidas locales. No se ha probado físicamente la instalación en iPhone.

## Versión y actualización automática

La versión aparece al pie en todas las pantallas. `src/version.js` es la fuente de la etiqueta y del identificador de publicación. Incrementar ambos al publicar una revisión; las correcciones de R0.3 deben usar una etiqueta nueva (R0.3.1, etc.). La compilación genera `version.json`, que queda fuera de la caché offline.

La web consulta la versión cada 60 segundos y al recuperar foco, conexión o visibilidad. Si cambia, actualiza el service worker y recarga. Espera mientras hay una partida en curso, un comando, un formulario o una confirmación abiertos. Conserva la sala online y restaura automáticamente la partida local de ese dispositivo. Sin conexión sigue usando la versión guardada.

## Publicación en GitHub Pages

`npm run build:github` compila una copia con base `/hash3/` en `docs/`, crea `.nojekyll` y deja también la compilación habitual para Sites en `dist/`. Los archivos de `docs/` son los que debe servir GitHub Pages; no usar la raíz, cuyo HTML de desarrollo importa código sin compilar.

Para GitHub Pages gratuito, el repositorio debe ser público: **Settings → General → Danger Zone → Change repository visibility → Make public**. Esto hace visible el código de `hash3`. Después: **Settings → Pages → Deploy from a branch → main → /docs → Save**. La conexión usada aquí puede subir archivos, pero no activar esa configuración. Una vez activada, los commits que actualizan `docs/` publican la web. Un repositorio privado necesita un plan de GitHub que admita Pages; no se cambia automáticamente la visibilidad del repositorio. El número de móviles no exige GitHub Pro.

El enlace previsto es `https://xtronzio.github.io/hash3/`; solo estará disponible una vez que GitHub termine la primera publicación. Todos los dispositivos deben usar ese mismo origen, crear una sala y unirse con su código. Las sesiones y las partidas locales de Sites no se transfieren a GitHub Pages, porque cada origen tiene su propio almacenamiento.

## Reglas

- Online: el límite de admisión es de 200 humanos activos por mundo, todavía sin validación de carga. El anfitrión inicia y finaliza. Se sortean parejas y símbolos X/O; cada pareja empieza con un 3×3 y alterna turnos independientemente.
- Las fichas son permanentes. Puedes usar **cualquier celda vacía del territorio conectado** a tu pareja, incluidas celdas de bloques anteriores. Territorios que se tocan lateralmente se unen; las islas separadas siguen perteneciendo a sus respectivas parejas.
- Figuras: líneas rectas de tres o más (también diagonales), L de tres y cuatro, cuadrados 2×2 y cruces ortogonales de cinco. Se reconocen rotaciones y reflejos y se pueden usar fichas de cualquier compañero con el mismo símbolo.
- Cada figura suma su número de celdas a quien la completa. Cada tercera figura del jugador añade +3 (3.ª, 6.ª, 9.ª…). Una jugada puede completar varias figuras distintas, aunque compartan fichas. Cada geometría exacta y símbolo se cobra una vez. Una línea se evalúa como el tramo completo que contiene la ficha nueva; prolongarla crea una nueva geometría.
- Una figura acumula una ampliación, **pero no permite ampliar mientras queden movimientos**. Cuando todo el territorio conectado está ocupado, se habilita una ampliación 3×3; si no quedan ampliaciones acumuladas, se concede una para continuar.
- El último jugador que ocupó una celda coloca la ampliación antes del turno del rival. Se sitúa celda a celda y puede solaparse sobre terreno existente: únicamente añade las celdas nuevas y nunca sustituye fichas. Debe tocar el territorio conectado y añadir al menos una celda. Antes de confirmar, la pantalla muestra el número de celdas nuevas y existentes.
- Tras una ampliación hay que usar las nuevas celdas antes de colocar otra, incluso con ampliaciones acumuladas. Si une el territorio de otra pareja, también se habilitan sus huecos.
- Cada turno dura **30 segundos**. Cuando vence, se coloca una ficha del jugador correspondiente en una celda vacía elegida al azar. La ampliación también dispone de 30 segundos; si vence el plazo, se coloca una ampliación válida al azar.
- Online, el reloj lo valida Supabase. El comando `tick` de las pestañas conectadas procesa vencimientos bajo bloqueo de fila; un cliente no puede escoger una jugada después del plazo. El trabajo privado `hash3-world-clock` comprueba plazos cada 2 segundos en Supabase; procesa una acción por pareja vencida y continúa sin pestañas abiertas. Las máquinas online juegan al azar en unos 2 segundos. Los sectores sin ningún humano activo no generan jugadas de dos máquinas; el resto del mundo sigue. No se simulan retroactivamente todos los turnos si el servidor se interrumpe.
- «Finalizar» abre una confirmación dentro de la pantalla y muestra el resultado. Solo el anfitrión puede cerrar una sala online; «Abandonar» únicamente retira al jugador. En modo local la finalización está disponible durante cualquier turno.
- Ranking individual por puntos; en empate, orden de entrada solo para visualizar. Rojo X, verde O, gris otras parejas. Azul: última jugada del jugador inmediatamente superior. Medallas únicamente en el ranking.

## Mundos, abandono y duelos

Flujo de creación: **Crear sala → Duelo / Mundo**. Los formatos y la duración se eligen dentro de Duelo; el inicio conserva únicamente Crear sala / Entrar en una sala, además de los modos locales.

- Mundo continuo: el anfitrión puede abrirlo con un solo jugador o un número impar; las plazas vacías las ocupa una máquina. Se puede entrar durante la partida.
- «Abandonar» conserva la identidad, puntos, figuras y fichas del humano y deja su plaza a una máquina con puntuación propia. Las sesiones de invitado requieren el mismo navegador para recuperar esa identidad. Cerrar la pestaña sin abandonar mantiene al jugador activo y sus turnos vencidos se juegan al azar.
- Al volver se intenta recuperar la plaza anterior si sigue ocupada por una máquina y sin reserva ajena. Si otro humano la ocupa, el regreso busca una plaza del mismo símbolo o abre otra pareja en el mismo mundo, sin desplazar a nadie.
- «Entrar con un amigo» abre una pareja nueva con una plaza reservada. «Invitar a mi rival» copia un enlace que contiene el código del mundo y una invitación de pareja. Al entrar el amigo, sustituye a la máquina. Las otras parejas no reciben ese token. La invitación se consume al usarla y la reserva se libera si quien invitó abandona.
- Duelo: 3, 5 o 10 minutos, desde que el anfitrión inicia. Individual exige 2 humanos; equipos exige un número par de al menos 4. Se sortean parejas y símbolos. El resultado usa la suma de puntos de X y O, incluidas las sustituciones por máquina; el ranking humano muestra los puntos personales. El servidor cierra el duelo al vencer el plazo y rechaza nuevas jugadas. Se puede volver si queda una plaza del mismo símbolo; no se añaden nuevas parejas a un duelo en marcha.
- Los cron privados solo se pueden ejecutar por el servidor. Sus registros propios se limpian a los dos días; no se alteran registros de otros trabajos.
- La admisión está limitada a 200 humanos activos. Antes de anunciar una mega sala de 200 móviles durante varios días se necesitan pruebas de carga y pasar el estado completo a consultas y almacenamiento por zonas: este piloto todavía guarda cada mundo como JSON y transmite el tablero completo.

## Modos sin cobertura

- **Contra la máquina:** el humano elige X u O; X siempre empieza. Hay cuatro dificultades: Básico, Medio, Alto y Pro. Pro usa búsqueda nativa en un Worker, amplía el análisis tras completar el bloque y puede encadenar dos ampliaciones simuladas. Analiza más candidatos al ampliar, conserva solo profundidades completadas para todos y reutiliza resultados de búsqueda. Su presupuesto es de 420 000 nodos y unos 3 segundos por decisión; la profundidad real depende del tablero y del dispositivo. Las segundas ampliaciones se limitan a opciones legales del borde ya compilado. No garantiza ganar todas las posiciones. El movimiento por tiempo agotado es siempre aleatorio, también para el humano.
- **Dos en este dispositivo:** se pasa el dispositivo en cada turno; ambos jugadores comparten pantalla.
- La partida local se guarda en ese navegador y puede retomarse desde el inicio. No se envía a Supabase ni se incorpora al ranking online.
- Para reabrir la web sin conexión, debe haberse cargado con internet y aparecer «Preparado para jugar sin conexión». Es necesario un navegador que permita service workers; algunas vistas embebidas restringen su uso. No se ha verificado aún la instalación y recuperación offline en un teléfono real.
- Si se oculta la pestaña, los callbacks se suspenden; al volver se procesa un turno vencido, no todos los turnos del tiempo transcurrido. Para dos móviles distintos sin internet haría falta una conexión local adicional, todavía no implementada.

## Datos y permisos

Supabase: `vyzugvepzylidyxitojo`.

`supabase/schema.sql` es la instalación inicial. **No ejecutarlo de nuevo sobre un proyecto instalado.** La revisión de R0.6 está en `supabase/migrations/20261004155901_persistent_world.sql`: conserva tableros y puntos, incorpora participación, invitaciones y Cron. Se aplica después del esquema inicial, seguida por las correcciones de ampliaciones y plazos de la misma revisión. La revisión de R0.2 está en `supabase/migrations/20261004_terrain_figures_timer.sql`: convierte coordenadas de bloques a celdas, conserva fichas, puntuaciones, figuras cobradas y miembros, y desbloquea los huecos de las partidas anteriores.

Las tablas están en `hash3_private`, con RLS activado y sin acceso directo para `anon` ni `authenticated`. «RLS enabled, no policy» es intencional. La API `public.hash3_command` comprueba identidad, pertenencia, anfitrión, turno, territorio, figuras y tiempos en una función privada. Los cambios de una sala se serializan mediante bloqueo de fila. Los ayudantes privados no están expuestos a los jugadores.

La sesión invitada se guarda en el dispositivo: borrar los datos del navegador elimina esa identidad. Las cuentas Google/Apple y su vínculo con el invitado se incorporarán después.

## Verificación

- `npm test`: geometrías, reutilización de huecos anteriores, expansión parcial de una sola celda, conservación de fichas, bloqueo de ampliaciones prematuras, reloj, máquina, finalización y ranking.
- `tests/participation.sql`: abandono/regreso, conservación, sustitución por máquina, invitaciones y privacidad, entrada a mundos en curso, número impar, reloj autónomo, duelos individuales y cierre automático. Todos los fixtures se revierten. Incluye duelos por equipos, ampliaciones automáticas y protección del reloj ante reintentos o cambios de rival.
- `tests/database.sql`: RPC reales como `authenticated`, permisos, figuras, turnos, idempotencia, expansión parcial, reloj y conservación durante la migración. Sus fixtures se revierten con `ROLLBACK`.
- Compilación de producción y generación de caché offline verificadas. No hubo un navegador compatible disponible para comprobar visualmente esta revisión ni probar la recuperación offline del sitio alojado.
- WebMCP de consulta se activa si el navegador lo soporta; no fue posible probarlo aquí.

La protección de contraseñas filtradas de Supabase está desactivada; el juego usa invitados sin contraseña. Revisar [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) antes de añadir acceso por contraseña.

## Móvil

La web se puede empaquetar con Capacitor para iOS/Android. Publicarla en las tiendas requerirá empaquetado, pruebas nativas, cuentas de desarrollador y los requisitos de cada tienda. Los modos locales usan un motor independiente de la red, mientras las salas online siguen siendo autoritativas en Supabase.

## R0.9: hall y Mundo común

Hall plano con tarjetas centradas, iconos destacados, ayuda visual de figuras y navegación de vuelta al diálogo anterior. El menú no duplica el modo sin conexión. Mundo entra en un único tablero compartido en nivel Normal; su primera entrada inicializa el tablero y arranca con un rival de máquina. Las siguientes entradas reutilizan su identidad de sala. La invitación de pareja funciona dentro de Mundo. Ningún jugador puede cerrarlo. Las salas de Duelo y las salas libres existentes siguen siendo independientes. Mundos privados de pago quedan pendientes de decisión.

`supabase/common-world.sql` corresponde a la migración aplicada `single_common_world_gateway`. El gateway interno verifica la sesión, serializa la primera entrada con bloqueo transaccional y un índice único garantiza un único Mundo común. La función de sala queda inaccesible directamente al rol authenticated.


## R0.10: tablero y antesala de pareja

Mundo → Crear pareja genera un código de antesala. El segundo jugador elige Unirme a una pareja o abre el enlace. Nadie se incorpora al Mundo durante la espera. Solo el creador puede pulsar Entrar al Mundo cuando el compañero está presente (actividad de los últimos 30 segundos). Ambas incorporaciones y el reloj compartido se confirman en una sola transacción; repetir el inicio no crea otra pareja. Una sesión no puede ocupar dos antesalas.

El tablero mantiene sus figuras. Añade desplazamiento por arrastre y pellizco, mapa general con salto, tres niveles de zoom y accesos a Mi territorio y Rival superior. Los puntos X/O pasan debajo. El ranking conserva líder, rival inmediatamente superior y jugador visibles; los demás se despliegan con desplazamiento interno.

R0.15.1 mejora el mapa general: muestra las fichas de tu pareja en rojo/verde, las demás en gris, tu 3×3 activo y el rival superior con marcadores de tamaño constante. El marco de la vista actual se recorta a los límites del mapa. Incluye accesos directos a Mi territorio y Rival superior, cierre con Escape y vista ampliada en pantallas de poca altura. Conserva el tablero y las reglas de juego.

#MAX v1: ventana móvil de 100 jugadas; sin historial muestra — y hasta 100 es provisional. Mundo ordena por el valor con seis decimales; la pantalla muestra dos. Otros modos lo muestran como referencia y siguen ordenados por puntos. Cada jugada humana cuenta una acción; un turno automático por tiempo cuenta con rendimiento cero; no se incluyen bonos ni jugadas de bots en el índice oficial. La escala operativa es 100 × puntos medios por acción × (0,8 + 0,1 × regularidad + 0,1 × combos). Regularidad = 1/(1 + desviación/ media), sobre bloques de diez acciones; combos = proporción de jugadas puntuadas que forman varias figuras. Esta concreción de la ponderación 80/10/10 queda abierta a calibración durante las pruebas; no hay inventario consumible en esta versión.

Migración aplicada: `supabase/pair-lobby-max.sql`. La antesala es privada con RLS, RPC autenticada y comprobación de pertenencia. #MAX se calcula en servidor, incluye turnos automáticos, deduplica eventos y preserva la ventana al abandonar/reentrar. Pruebas en `tests/pair-max.sql` revierten todos sus datos.


## R0.16: cartas y navegación

Inventario de pruebas en VS máquina y Sin conexión, desplegable desde abajo con el tablero visible: Doble, Ficha contraria (convierte una ficha rival puesta), Ficha rival (obliga al adversario a colocar tu símbolo una vez), Borrar, Desplazar, Bloqueo, Escudo y Ayuda. Ambos jugadores empiezan con una de cada carta; se sortean reposiciones cada cuatro turnos propios completados, con máximo ocho cartas y dos de cada tipo. Una herramienta por turno, además de la colocación normal. Combo, que entra en el sorteo de recarga, permite usar otras dos herramientas distintas tras activarla primero. Combo se consume y no cuenta dentro de esas dos; el permiso termina con el turno y no reinicia el reloj. Los turnos automáticos y los pases no dan recarga; Doble cuenta como un turno.

Bloqueo reserva una celda durante dos turnos rivales: el creador no puede ocuparla ese mismo turno, pero sí en el siguiente. Escudo protege una ficha propia durante dos turnos rivales. Desplazar conserva símbolo y dueño. Ficha rival se consume en la siguiente colocación del adversario, también si vence el reloj o usa Doble, y sobrevive a pausa/guardado. Nunca se restan puntos; las geometrías ya cobradas siguen registradas. La máquina usa el mismo stock y valida sus cartas con el mismo árbitro. El inventario online sigue pendiente.

El mapa general admite arrastre, pellizco y rueda sobre su propia vista, con botones de zoom y extensión. Tocar una zona lleva el tablero allí. El nuevo control Zoom extensión del tablero ajusta el terreno manteniendo al menos 18 píxeles por celda; en mundos gigantes centra una zona legible y remite al mapa. El zoom del navegador sigue disponible fuera de estas superficies.


R0.16.2 permite elegir de forma independiente la dificultad del rival, figuras sencillas/complejas y el permiso de inventario para la máquina. Este permiso está desactivado por defecto; se recuerda la elección para partidas nuevas y se conserva en cada guardado. Sin permiso, el árbitro rechaza cartas de la máquina y el jugador mantiene las suyas. Los guardados anteriores sin esa opción se interpretan como máquina sin inventario.


R0.16.3 devuelve la elección Con reloj / Sin reloj a la creación de partidas locales. Sin reloj no hay jugadas por timeout; la máquina responde cuando le toca y espera la siguiente jugada humana. La elección se recuerda y es independiente del nivel de figuras, dificultad e inventario rival. La pausa funciona en ambos ritmos.

## Roedores y referencias — R0.17.0

Cada jugador cuenta sus colocaciones efectivas desde esta versión (Doble suma dos; ampliar no suma). Cada 333 colocaciones aparece un roedor, máximo uno por jugador. El animal busca fichas de cualquiera de los dos símbolos dentro del territorio conectado; los destinos de otros roedores despiertos se reservan para evitar solapamientos. Su próxima comida se anuncia en amarillo; no consume la ficha recién colocada. No hay carta de control de roedores en esta versión.

Cada turno propio completado avanza una fase: come una ficha en tres turnos y duerme los tres siguientes. Doble avanza una vez, pausa y expansión no avanzan. El contador registra ingestas reales; se retira al comer 33 fichas (63 turnos si siempre hay alimento, sin contar el turno de aparición). Sin alimento busca otra ficha; si no hay ninguna, continúa el ciclo sin incrementar el contador. Los puntos ganados permanecen. Una figura rota por un roedor puede volver a cobrarse al reconstruirla; las figuras intactas siguen protegidas contra cobros repetidos.

Los roedores son amarillos y su celda muestra el contador; los huecos liberados tienen marco amarillo hasta ocuparse de nuevo. Tablero y mapa general distinguen sueño, objetivo y huecos; el acceso al mapa muestra ahora una miniatura real. La ficha de referencia del inmediato superior se representa como una celda azul.

En Duelo y modos locales el #MAX es una referencia calculada con la misma fórmula y no altera el oficial de Mundo. Se muestra también en el marcador plegado y el resultado final. Combo máx. registra los puntos de una sola colocación o acción de carta que puntúa, incluidos bonus, excluyendo colocaciones por demora. Doble tiene dos resultados independientes. El récord se conserva por partida; en Mundo es persistente y los rankings por periodos muestran el mejor combo del periodo. Los nuevos registros no reconstruyen resultados antiguos desde puntos acumulados.

La migración `supabase/migrations/20261006171644_rodents_and_combo_records.sql` junto con `20261006172126_optimize_rodent_search.sql` se aplica al servidor existente, conservando permisos, salas, turnos y puntuaciones. `tests/rodents.sql` verifica el ciclo completo mediante RPC en un duelo de cuatro dentro de una transacción revertida.

Corrección de servidor de R0.17.0: `20261006182139_fix_world_entry_terrain_performance.sql` evita el timeout al entrar en MUNDO con miles de celdas. El recorrido conectado usa uniones por coordenadas adyacentes y la normalización materializa las fichas ocupadas; conserva conectividad, tablero, puntos y reglas de ampliación. `tests/terrain-performance.sql` comprueba islas, coordenadas negativas, una zona de 5.151 celdas y la entrada real de una pareja, con límite de ocho segundos y rollback.

## Mapa compacto y partidas guardadas — R0.17.1

El mapa general muestra únicamente casillas y dimensiones, cierre, zoom, extensión y los mismos iconos del tablero para ir al territorio propio o al rival superior. Se eliminan título, instrucciones, leyenda y botones con texto; se conserva navegación por arrastre, pellizco y toque.

En partidas locales guardadas antes de esta versión se recupera una sola vez un mínimo de colocaciones propias a partir de las fichas que siguen en el tablero, sin reducir el contador existente. Si esa recuperación supera un hito pendiente de 333, el roedor aparece en la siguiente colocación válida del jugador. Los hitos siguientes siguen siendo 666, 999, etc.; no se repiten los ya registrados. El tamaño del terreno no cuenta como fichas colocadas. Los contadores y el ciclo del servidor online conservan la lógica de R0.17.0.

## Activar celda, mapa y roedores — R0.17.2

ACTIVAR CELDA entra en las recargas del inventario de VS máquina y Sin conexión, manteniendo ocho cartas iniciales y el máximo de ocho cartas de recarga. Permite elegir un hueco que no sea terreno y toque por un lado el territorio conectado: incorpora una sola celda vacía y permanente para ambos jugadores. No añade un 3×3, no coloca una ficha, no cambia el turno ni reinicia el reloj. La puntuación llega al colocar después la ficha normal. Respeta el límite de herramientas, Combo, pausas, stock y la restricción de no utilizar inventario durante la ampliación pendiente. La máquina puede obtenerla y usarla cuando tiene inventario activado.

El mapa conserva las estadísticas y una sola fila de iconos: extensión, territorio propio, rival superior, localizador de roedores y cierre. No tiene +/− ni porcentaje; mantiene pellizco, arrastre y zoom con rueda. Los roedores cuentan con un marcador amarillo de tamaño legible incluso cuando el mapa está alejado o están dormidos; tocar el localizador recorre los animales presentes, priorizando el propio. Los avisos de puntuación no tapan el mapa. El ranking desplegado muestra el contador real de fichas propias y el próximo hito, o comidas y estado del animal activo. Entre la retirada tras 33 comidas y el siguiente hito puede no haber animales: el tamaño del mapa no determina los nacimientos.

El árbitro local busca la pareja del roedor por sus integrantes y reintenta un nacimiento pendiente si no encuentra alimento, en vez de perder el hito. No se cambian los contadores ni la cadencia de las salas online. La ausencia observada en una partida concreta no puede diagnosticarse solo con una captura del mapa; los nuevos contadores permiten comprobarla sin reiniciar esa partida.


## Navegación unificada e inmunidad visible — R0.17.3

El ranking desplegado comparte iconos, botones circulares, tamaño y colores con el tablero para ir al territorio propio, al rival superior y a los roedores. El acceso al mapa usa su mismo icono, sin etiquetas visibles; todos los botones conservan nombres accesibles.

La inmunidad activa muestra su icono junto a la bolsa, en rojo para X o verde para O. Se conserva durante el turno propio y desaparece al completar el turno rival, según las reglas existentes. La señal permanece visible con el inventario cerrado y no se confunde con el contador de cartas disponibles.


## Mis partidas y pausa compacta — R0.17.5

Tocar la información de una partida guardada la resalta brevemente y la abre directamente. Ya no hay un botón separado «Ver y retomar»; el control de apertura sigue siendo accesible por teclado. El menú de papelera, el deslizamiento horizontal y la confirmación de borrado se conservan como acciones independientes. Abrir una partida pausada mantiene la pausa.

La pantalla de pausa reúne retomar, hall, mis partidas y finalizar en una fila de iconos con nombres accesibles. Añade el marcador de la partida con puntos, #MAX, combo máximo y estado del roedor, más una vista del mapa guardado con casillas y dimensiones. El mapa es informativo; la partida permanece detenida hasta retomar (o reanudación compartida en salas online). Finalizar conserva su confirmación.


## Corrección de los objetivos de Activar celda — R0.17.6

Los botones de huecos de ACTIVAR CELDA usan posición absoluta, igual que las celdas del tablero. Antes heredaban posición relativa y se desplazaban en el flujo de la página, pudiendo aparecer sobre fichas aunque sus coordenadas lógicas fueran huecos. Los marcadores y sus zonas de toque coinciden ahora con las coordenadas que activan, también al alejar el tablero.

El árbitro descarta además cualquier hueco que contenga una ficha guardada aunque falte su entrada en el terreno. La carta sigue añadiendo una sola celda vacía adyacente al territorio conectado, conserva las fichas y el turno y permite puntuar con la colocación normal posterior. Verificado en navegador a 320 y 390 px con varios niveles de zoom, además de 124 pruebas de reglas.


## Navegación continua de tableros grandes — R0.17.7

Durante el pellizco, el tablero conserva las celdas existentes y aplica una transformación visual como máximo una vez por fotograma. Al terminar el gesto reconstruye las celdas una sola vez y conserva la coordenada bajo el centro de los dedos, incluido su desplazamiento. Se puede continuar arrastrando con el dedo restante; cancelar y perder la captura liberan el gesto sin colocar fichas. Ctrl/⌘ + rueda aplica el mismo método y confirma la escala al terminar la secuencia, manteniendo el punto bajo el cursor. Los cambios de tamaño de ventana se aplazan durante la interacción.

Verificado en navegador táctil con 1.999 celdas: cero reconstrucciones durante doce movimientos de pellizco y cinco eventos de rueda, una al terminar cada gesto, punto de referencia estable y colocación normal posterior. Las nuevas pruebas cubren agrupación por fotograma, anclaje, toque frente a arrastre y cancelación con un dedo restante. Las reglas y los eventos del juego conservan su funcionamiento.

## Mis partidas y mapa en pausa — R0.18.0

Cada fila muestra una miniatura del tablero guardado. Las salas online consultan el comando de lectura `get` al entrar en la zona visible de la lista, con dos consultas simultáneas como máximo y caché de 30 segundos. No se reingresa al jugador ni se procesan turnos al consultar la miniatura.

El menú «…» permite anclar/desanclar o borrar/quitar una partida. En móvil, deslizar a la derecha ancla/desancla; si la papelera estaba visible, primero la oculta. Deslizar a la izquierda mantiene el borrado con confirmación. Las ancladas aparecen arriba, incluidas las pausadas y cerradas. El anclaje se guarda en este navegador y, para salas online, se separa por identidad. No altera el tablero ni el orden de los guardados.

El mapa de pausa admite arrastre, pellizco, rueda y teclado (flechas, +/− y Home). Puede ampliarse a pantalla completa; acercarse muestra X/O. Los controles permiten extensión, territorio propio, rival y roedores cuando existen. La consulta conserva fichas, puntuación, turno y reloj; solo Retomar reanuda la partida local. En un Duelo online, la pausa sigue sujeta al estado compartido y a la votación existente. Los gestos modifican la cámara y coalescen las actualizaciones por frame sin reconstruir las celdas.

## Habitantes y barrera — R0.21.0

Los contadores son independientes por jugador: roedor cada 33 colocaciones propias, bomba automática cada 66, gusano cada 99 y obra cada 198. La bomba automática sustituye a la antigua lluvia de tandas; la carta Bomba sigue siendo independiente. Los contadores no retroceden cuando se vacían fichas ni se reproducen hitos históricos al actualizar un guardado.

Roedor y gusano tienen tres comidas, una cada 33 segundos. El roedor cambia de ubicación al colocar en su celda sin perder capacidad ni reiniciar su reloj. El gusano recorre fichas adyacentes, también diagonales, deja cuerpo bloqueado hasta retirarse 33 segundos después de su tercera comida y respeta fronteras. Si no encuentra alimento, espera al siguiente intervalo. Los eventos neutrales conservan origen y capacidad y no restan puntos ya cobrados.

Una obra reúne tres pares constructor/destructor: reserva nueve celdas vacías para quitar y nueve huecos para construir. Cada par transforma una celda cada 33 segundos durante tres intervalos, con eliminación y construcción atómicas. No se pueden ocupar, destruir con una carta ni ampliar sobre posiciones reservadas. Un conflicto invalida el resto de ese proyecto; nunca deja una eliminación unilateral. Pueden cortar puentes, conservando las anclas de las parejas.

Los ciclos siguen funcionando en partidas sin reloj. La pausa local y la pausa votada de Duelo conservan el tiempo restante. En Mundo, una zona conectada que conserva humanos activos sigue funcionando; una zona inactiva congela sus ciclos. No se ejecutan tandas acumuladas después de periodos sin actividad. Los eventos online se resuelven por el servidor bajo el bloqueo existente de la sala; no se aceptan estados ni relojes enviados por el cliente.

La barrera se selecciona en un punto fijo del tablero y gira 90° por toque. Las cuatro orientaciones mantienen ese punto, muestran su previsualización y solo permiten Aplicar cuando la geometría es válida. Los guardados anteriores conservan sus segmentos originales. El mapa y el localizador incluyen roedores, gusanos, obras y bombas.

Validación: 176 pruebas de JavaScript y compilaciones normal y GitHub Pages/offline. `tests/habitats.sql` cubre el motor del servidor sin alterar partidas reales; `tests/rodents.sql` comprueba comandos autenticados, duplicados y pausas con fixtures que se revierten.
