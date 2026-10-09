# HASH3 · #3_11 · Territorio vivo (R0.21.30, rama de trabajo)

Los jugadores son **COLONOS**. El territorio combina fauna, habitantes, invasores y fenómenos naturales o estelares. Los efectos conservan la relación con el 3; las frecuencias responden al impacto en el juego, según la indicación de Jorge del 9 de octubre de 2026.

Fuente: `feature/3-11-territorio-vivo`, PR borrador #1. `main` continúa en R0.21.28-P2. Esta rama no está publicada ni aplicada al Supabase real.

## Efectos

| Familia | Disperso | Localizado | Consecuencia |
| --- | --- | --- | --- |
| Fauna | Roedores | Gusanos | Comen fichas; tres comidas. Roedores: tres visitas en nueve turnos. |
| Habitantes | Promociones en distintas áreas | Cada promoción opera en una zona conectada | Nueve celdas demolidas y nueve construidas; tres parejas de obreros. |
| Invasores | Bombardeo en tres celdas | Colonia 3×3 | Ocupan con `*` sin propietario, conservando terreno. |
| Naturales | Meteoritos | Terremoto | Destruyen signos y terreno. |
| Naturales y estelares | Pandemia | OVNI | Vacían signos y conservan terreno. |
| Naturales | Lluvia de tornados en grupos 3×3 | Huracán | Desordenan signos y conservan terreno. |
| Estelares | — | Agujero negro | Vacía núcleo 3×3 y desordena el anillo de hasta tres celdas. |

Impacto proporcional de los fenómenos: 33/333 del terreno o de las fichas, según su efecto. Agujero negro e invasiones usan su geometría fija. `rain` y `cataclysm` mantienen su comportamiento histórico para avisos y guardados antiguos. Las bombas del inventario conservan sus reglas propias.

## Frecuencias por impacto

| Aparición | Hasta 666 celdas | 999 celdas | 3.333 celdas |
| --- | ---: | ---: | ---: |
| Roedores y gusanos | 33 | 50 | 166 |
| Obras | 66 | 99 | 331 |
| Invasores | 66 | 99 | 333 |
| Fenómenos naturales y estelares | 333 | 501 | 1.668 |

Valores en colocaciones aceptadas. Fauna y obras comparten el contador de su zona; invasores y fenómenos tienen relojes de colocaciones independientes, con escala `max(1,N/666)` y redondeo a múltiplos de tres para esos dos ciclos. Sus avisos empiezan desde 99 figuras cobradas entre ambos. Son intentos condicionados por geometría, alimento y población, no apariciones garantizadas.

- Las ampliaciones no adelantan fenómenos fuera del ciclo. Se conserva el hito máximo como dato histórico.
- Un solo aviso territorial activo; si coinciden los dos ciclos, el fenómeno grande tiene prioridad. No se acumulan ataques por intervalos perdidos.
- Invasores alternan bombardeo y colonia; los siete fenómenos rotan por separado. Una familia no reinicia el plazo de la otra.
- Todos los avisos duran 33 segundos. Las invasiones pequeñas dejan actuar a la fauna y conservan sus presupuestos y nacimientos.
- Solo los fenómenos grandes suspenden fauna y aplican recuperación de 33 segundos y tres colocaciones, con recalibración posterior.
- Pausar conserva los milisegundos exactos de avisos, fauna, inmunidad y recuperación.
- Guardados previos reciben ciclos futuros, sin ataques ni nacimientos históricos. Resultados locales nuevos usan reglas 9; finales previos permanecen intactos.

Configuración central: `src/territory-event-rules.js` y `src/habitat-budget.js`. El SQL se genera desde esa misma configuración con `node scripts/generate-ecology-sql.mjs`.

## Implementación y comprobación

El motor local y la migración SQL preparada incluyen el catálogo completo, protección por propietario, anclas actuales, reservas de obras, limpieza de formas y conservación de puntos cobrados. Los impactos vuelven a comprobar terreno y protecciones: un tornado anunciado no puede mover fichas a una celda que dejó de existir. Las promociones irregulares conservan una región conectada de nueve celdas; no se demuelen nueve huecos dispersos como sustitución.

- `npm test`: reglas, interacción, pausas, navegación, inventario, guardados y secuencias reproducibles.
- `npm run verify:sql`: deriva de configuración, aplicación y reaplicación de migración en PostgreSQL desechable, RPC público, reintentos, permisos, reloj, protecciones, efectos y convivencia de fauna con invasores. Usa PGlite; la planificación cron se sustituye por una función de prueba, por lo que no valida el planificador remoto.
- `npm run simulate:turns`: secuencias de 1.500 colocaciones en 333/999 celdas y 2.000 en 3.333, dos semillas, con/sin territorio activo. Incluye herramientas, Doble, expansiones, pausas de una hora y comprobaciones de integridad. UUID y azar reproducibles; seis segundos activos por colocación, ocupación inicial del 35 %, comienzo tras la apertura de 99 figuras. Es juego aleatorio, no mide decisiones humanas ni tasa de victoria.
- `npm run verify:browser`: Chromium real con pantallas táctiles emuladas de 390×844 y 1024×768. Tableros de 999 y 33.333 celdas; arrastre, pellizco, mapa, pausa y reanudación, cancelación de carta, nueve localizadores de eventos, ampliación y animación de Tornado. Comprueba límites de nodos y ausencia de desbordamiento; captura pantallas y las adjunta al pipeline. Incluye Perfil móvil sin autofocus editable, campos de 16 px y diálogo dentro de la pantalla. No equivale a Safari ni a hardware móvil real.
- `npm run build:github`: genera y verifica los paquetes de Pages y de raíz. Los archivos públicos se mantienen en la versión estable hasta promoción completa.
- `node scripts/benchmark-board.mjs`: consulta de ventana y comandos sintéticos en 9.999/33.333/99.999 celdas. No valida hardware móvil.

Resultados de secuencias y rendimiento: `benchmarks/territory-r02130-turns.json` y `benchmarks/territory-r02130-board.json`. La batería suma 20.000 colocaciones aceptadas sin fallos de integridad ni desequilibrio de obras. El ensayo corto de 180 colocaciones confirma fauna y obras junto a dos invasiones y ningún fenómeno grande. Las pruebas ayudan a ajustar la convivencia; el equilibrio final requiere partidas humanas.

## Bloqueos antes de integrar y publicar

1. El Supabase real `vyzugvepzylidyxitojo` devuelve timeout incluso en consultas simples. La migración está preparada y probada localmente, **no aplicada**. Verificar migraciones previas, aplicar con el flujo de migraciones y validar Mundo/Duelo y asesores sobre el servidor antes de promoción.
2. QA de navegador completada: la descarga alternativa de Playwright ha permitido ejecutar Chromium. Pasan los gestos táctiles emulados y la revisión de capturas; sigue pendiente una partida en dispositivo físico (especialmente Safari/iOS). Los resultados están en `benchmarks/territory-r02130-browser.json`.
3. Mantener PR borrador, sin integrar a `main` ni publicar Pages parcialmente. Una vez resueltos servidor y comprobación física, ejecutar el pipeline oficial y verificar la versión pública.

## Compatibilidad con Perfil

Conservar la corrección publicada el 9 de octubre en `main`, R0.21.28-P1 (PR #2, commit `698edf259cad0c9b47fc43ab4b114daf8f77bbe0`): acceso entre navegadores y Perfil rediseñado. La rama incorpora esa revisión de `main`, incluidos `src/profile-access-ui.js`, `src/profile-link.js`, `src/api.js`, `src/hall.js`, `src/hall.css`, `src/main.js` y sus pruebas. Se resolvió únicamente el identificador de versión para mantener R0.21.30; el flujo nuevo de Perfil se conserva. La versión de desarrollo sigue identificada como R0.21.30.

## Continuación del 9 de octubre: navegador y compatibilidad móvil

La rama incorpora también `main` R0.21.28-P2, commit `92d9eef52871191646b416496249e715e3b39dc3`: pantalla móvil fija, paneles con desplazamiento propio y Perfil sin apertura automática del teclado. Se conserva la versión de desarrollo R0.21.30; los archivos de Pages permanecen en P2. Se ejecutaron 326 pruebas tras esa integración, validación SQL desechable y construcción de ambos paquetes.

Diagnóstico remoto de esta continuación: consulta mínima SQL, lista de migraciones y asesores de rendimiento agotan el plazo de conexión. La API de administración marca el proyecto ACTIVE_HEALTHY. Los registros recientes contienen HTTP 504 de renovación de sesión en iPhone; en la ventana de 24 horas no aparecen registros PostgreSQL. Esto confirma un fallo remoto de acceso pero no establece si hay saturación, bloqueo o un problema de infraestructura. No se ha reiniciado el servicio ni aplicado la migración.

## Compatibilidad móvil (R0.21.28-P2, 9/10/2026)

En `main` se integró el hotfix de pantalla completa móvil (`PR #3`, commit `92d9eef52871191646b416496249e715e3b39dc3`): `src/mobile-viewport.css` importado **en último lugar** en `src/main.js`, pantallas/diálogos limitados a `100dvh`, controles de Perfil de ≥16px para evitar autozoom de Safari, y foco inicial del botón cerrar en Perfil móvil. **Al integrar #3_11, conservar este hotfix**: ni reemplazar el import CSS ni restaurar el autofocus de `#profile-name` ni el `max-height:94dvh` efectivo del diálogo. Mantener las pruebas `tests/mobile-viewport.test.js`.
