# #3 — R0.12

Juego de figuras y territorio. Repositorio: `Xtronzio/hash3`.

## Una herramienta por turno y Combo · R0.16.7

El límite normal es una herramienta por turno, incluida Ayuda. La nueva carta Combo se obtiene en las recargas y debe activarse primero: consume una carta y permite otras dos herramientas distintas en ese turno. Doble mantiene sus dos colocaciones. Las ocho cartas iniciales y el máximo de ocho se mantienen; los guardados antiguos incorporan Combo con cero unidades, sin alterar sus cartas ni efectos ya utilizados. La máquina respeta el mismo límite y solo puede ampliarlo gastando Combo.

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
