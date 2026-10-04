# #3 — R0.4

Juego de figuras y territorio. Código privado: `Xtronzio/hash3`.

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

## Figuras y aviso de puntos

Cada jugada que puntúa resalta durante 500 ms las celdas de las figuras realmente cobradas. Si completa varias figuras, se iluminan sus celdas y el aviso desglosa cada tipo de figura y el bonus. Un +puntos aparece junto a la ficha nueva durante 1,4 s. El resaltado usa el color del símbolo y conserva la referencia azul del ranking. El mismo evento no vuelve a animarse al recibirlo de nuevo por polling o al recuperar la partida. Funciona en salas online, modo solo, dos jugadores locales y jugadas por tiempo agotado.

## Versión y actualización automática

La versión aparece al pie en todas las pantallas. `src/version.js` es la fuente de la etiqueta y del identificador de publicación. Incrementar ambos al publicar una revisión; las correcciones de R0.3 deben usar una etiqueta nueva (R0.3.1, etc.). La compilación genera `version.json`, que queda fuera de la caché offline.

La web consulta la versión cada 60 segundos y al recuperar foco, conexión o visibilidad. Si cambia, actualiza el service worker y recarga. Espera mientras hay un comando, un formulario o una confirmación abiertos. Conserva la sala online y restaura automáticamente la partida local de ese dispositivo. Sin conexión sigue usando la versión guardada.

## Publicación en GitHub Pages

`npm run build:github` compila una copia con base `/hash3/` en `docs/`, crea `.nojekyll` y deja también la compilación habitual para Sites en `dist/`. Los archivos de `docs/` son los que debe servir GitHub Pages; no usar la raíz, cuyo HTML de desarrollo importa código sin compilar.

Configuración necesaria en GitHub: **Settings → Pages → Deploy from a branch → main → /docs → Save**. La conexión usada aquí puede subir archivos, pero no activar esa configuración. Una vez activada, los commits que actualizan `docs/` publican la web. En un repositorio privado, Pages requiere un plan de GitHub que lo admita; no cambiar automáticamente la visibilidad del repositorio.

El enlace previsto es `https://xtronzio.github.io/hash3/`; solo estará disponible una vez que GitHub termine la primera publicación. Todos los dispositivos deben usar ese mismo origen, crear una sala y unirse con su código. Las sesiones y las partidas locales de Sites no se transfieren a GitHub Pages, porque cada origen tiene su propio almacenamiento.

## Reglas

- Online: de 2 a 12 jugadores, número par. El anfitrión inicia y finaliza. Se sortean parejas y símbolos X/O; cada pareja empieza con un 3×3 y alterna turnos independientemente.
- Las fichas son permanentes. Puedes usar **cualquier celda vacía del territorio conectado** a tu pareja, incluidas celdas de bloques anteriores. Territorios que se tocan lateralmente se unen; las islas separadas siguen perteneciendo a sus respectivas parejas.
- Figuras: líneas rectas de tres o más (también diagonales), L de tres y cuatro, cuadrados 2×2 y cruces ortogonales de cinco. Se reconocen rotaciones y reflejos y se pueden usar fichas de cualquier compañero con el mismo símbolo.
- Cada figura suma su número de celdas a quien la completa. Cada tercera figura del jugador añade +3 (3.ª, 6.ª, 9.ª…). Una jugada puede completar varias figuras distintas, aunque compartan fichas. Cada geometría exacta y símbolo se cobra una vez. Una línea se evalúa como el tramo completo que contiene la ficha nueva; prolongarla crea una nueva geometría.
- Una figura acumula una ampliación, **pero no permite ampliar mientras queden movimientos**. Cuando todo el territorio conectado está ocupado, se habilita una ampliación 3×3; si no quedan ampliaciones acumuladas, se concede una para continuar.
- El último jugador que ocupó una celda coloca la ampliación antes del turno del rival. Se sitúa celda a celda y puede solaparse sobre terreno existente: únicamente añade las celdas nuevas y nunca sustituye fichas. Debe tocar el territorio conectado y añadir al menos una celda. Antes de confirmar, la pantalla muestra el número de celdas nuevas y existentes.
- Tras una ampliación hay que usar las nuevas celdas antes de colocar otra, incluso con ampliaciones acumuladas. Si une el territorio de otra pareja, también se habilitan sus huecos.
- Cada turno dura **30 segundos**. Cuando vence, se coloca una ficha del jugador correspondiente en una celda vacía elegida al azar. El contador se pausa durante la colocación del territorio.
- Online, el reloj lo valida Supabase. El comando `tick` de las pestañas conectadas procesa vencimientos bajo bloqueo de fila; un cliente no puede escoger una jugada después del plazo. Si todas las pestañas se cierran o pierden conexión, el vencimiento pendiente se procesa al reconectar; no hay un proceso autónomo haciendo turnos mientras nadie está conectado.
- «Finalizar» abre una confirmación dentro de la pantalla y muestra el resultado. Solo el anfitrión puede cerrar una sala online; en modo local está disponible durante cualquier turno.
- Ranking individual por puntos; en empate, orden de entrada solo para visualizar. Rojo X, verde O, gris otras parejas. Azul: última jugada del jugador inmediatamente superior. Medallas únicamente en el ranking.

## Modos sin cobertura

- **Contra la máquina:** el humano usa X y la máquina O. La máquina busca completar figuras y bloquear las del rival; desempata al azar. El movimiento por tiempo agotado es siempre aleatorio, también para el humano.
- **Dos en este dispositivo:** se pasa el dispositivo en cada turno; ambos jugadores comparten pantalla.
- La partida local se guarda en ese navegador y puede retomarse desde el inicio. No se envía a Supabase ni se incorpora al ranking online.
- Para reabrir la web sin conexión, debe haberse cargado con internet y aparecer «Preparado para jugar sin conexión». Es necesario un navegador que permita service workers; algunas vistas embebidas restringen su uso. No se ha verificado aún la instalación y recuperación offline en un teléfono real.
- Si se oculta la pestaña, los callbacks se suspenden; al volver se procesa un turno vencido, no todos los turnos del tiempo transcurrido. Para dos móviles distintos sin internet haría falta una conexión local adicional, todavía no implementada.

## Datos y permisos

Supabase: `vyzugvepzylidyxitojo`.

`supabase/schema.sql` es la instalación inicial. **No ejecutarlo de nuevo sobre un proyecto instalado.** La revisión de R0.2 está en `supabase/migrations/20261004_terrain_figures_timer.sql`: convierte coordenadas de bloques a celdas, conserva fichas, puntuaciones, figuras cobradas y miembros, y desbloquea los huecos de las partidas anteriores.

Las tablas están en `hash3_private`, con RLS activado y sin acceso directo para `anon` ni `authenticated`. «RLS enabled, no policy» es intencional. La API `public.hash3_command` comprueba identidad, pertenencia, anfitrión, turno, territorio, figuras y tiempos en una función privada. Los cambios de una sala se serializan mediante bloqueo de fila. Los ayudantes privados no están expuestos a los jugadores.

La sesión invitada se guarda en el dispositivo: borrar los datos del navegador elimina esa identidad. Las cuentas Google/Apple y su vínculo con el invitado se incorporarán después.

## Verificación

- `npm test`: geometrías, reutilización de huecos anteriores, expansión parcial de una sola celda, conservación de fichas, bloqueo de ampliaciones prematuras, reloj, máquina, finalización y ranking.
- `tests/database.sql`: RPC reales como `authenticated`, permisos, figuras, turnos, idempotencia, expansión parcial, reloj y conservación durante la migración. Sus fixtures se revierten con `ROLLBACK`.
- Compilación de producción y generación de caché offline verificadas. No hubo un navegador compatible disponible para comprobar visualmente esta revisión ni probar la recuperación offline del sitio alojado.
- WebMCP de consulta se activa si el navegador lo soporta; no fue posible probarlo aquí.

La protección de contraseñas filtradas de Supabase está desactivada; el juego usa invitados sin contraseña. Revisar [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) antes de añadir acceso por contraseña.

## Móvil

La web se puede empaquetar con Capacitor para iOS/Android. Publicarla en las tiendas requerirá empaquetado, pruebas nativas, cuentas de desarrollador y los requisitos de cada tienda. Los modos locales usan un motor independiente de la red, mientras las salas online siguen siendo autoritativas en Supabase.
