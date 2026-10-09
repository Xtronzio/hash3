# HASH3 · #3_11 · Territorio vivo (R0.21.29)

## Propósito

Los jugadores son **COLONOS**. #3 es un territorio dinámico: fauna, promociones inmobiliarias, ataques invasores y fenómenos naturales/estelares interactúan con X, O, huecos, puntuación, protecciones, inventario y expansión.

**Fuente de implementación:** rama `feature/3-11-territorio-vivo`; `main` sigue en R0.21.28 hasta verificar/promover. El catálogo de variantes y sus frecuencias se configura en `src/territory-event-rules.js`. No duplicar cálculos de probabilidad o geometría dentro del pintado.

## Matriz oficial

| Familia | Consecuencia | Disperso | Localizado |
| --- | --- | --- | --- |
| Fauna | Come fichas | Roedores | Gusanos |
| Habitantes | Construcción y demolición en equilibrio | Aparecen promociones en distintas áreas | Cada promoción ejecuta obra concentrada, 9 destruidas y 9 construidas |
| Invasores | Ataque y ocupación `*` | Bombardeo disperso, bomba → `*` | Colonización de 3×3, `*` |
| Naturales | Destruye signos **y terreno** | Lluvia de meteoritos | Terremoto |
| Naturales + estelares | Vacía fichas pero **mantiene terreno** | Pandemia | OVNI (estelar, geometría original) |
| Naturales | Desordena fichas sin perder terreno | Lluvia de tornados | Huracán |
| Estelares | Vacía + desordena | — | Agujero negro, vacía centro 3×3 y desordena anillo de hasta 3 celdas |

El antiguo Cataclismo se renombra **Terremoto** (no duplicar fenómeno). La antigua lluvia de bombas pasa a ser ataque de los invasores, y lluvia de **meteoritos** es el fenómeno destructor disperso. Los códigos de eventos `rain` y `cataclysm` quedan como alias **históricos** para no romper guardados antiguos.

Los habitantes aparecen dispersos como promociones inmobiliarias, pero cada equipo opera de forma localizada; siguen intercambiando una celda demolida por una nueva, sin crecimiento neto.

## Ritmo inicial (provisional, pendiente de revisión en conjunto)

- **Actividad cotidiana:** fauna y constructores/destructores conservan por ahora los contadores anteriores `HABITAT_FREQUENCIES` y sus restricciones de población/recuperación.
- **Invasores:** ocupa **el turno de sorteo** de la antigua lluvia de bombas; provisionalmente una posición de cada tres anuncios territoriales, alternando bombardero disperso (3 posiciones) y colonia localizada (3×3).
- **Otros fenómenos:** los dos turnos restantes rotan entre meteoritos, terremoto, pandemia, OVNI, tornados y huracán, agujero negro; la ocurrencia sigue condicionada a hitos existentes de la partida (figuras, colocaciones, territorio) y a la elegibilidad del área.
- **Impacto natural:** referencia 33/333 en base a terreno (meteoritos/terremoto/reordenamiento) o piezas (pandemia/OVNI); el agujero negro usa núcleo 3×3 y anillo de hasta tres celdas. Configuración en `EVENT_BALANCE`. El nuevo volumen de ataque invasor es de pequeña incidencia.
- Aviso de 33 segundos y recuperación de 33 segundos y tres colocaciones tras el evento; suspensión temporal de fauna, sin pérdida de puntos.
- Respetar inmunidades, anclas protegidas y reservas; nunca repetir eventos históricos al cargar un guardado.

No afirmar que el equilibrio se ha optimizado: **los patrones y frecuencias todavía deben calibrarse con simulación y prueba de juego**.

## Qué está implementado en esta rama

- Motor **Solo / Sin conexión**: selección, huella, aplicación, protección, anuncio y recuperación de los nuevos eventos, conservando compatibilidad con los eventos viejos.
- Iconos localizadores, marcadores y cuenta atrás, mapa activo, mapa en pausa, símbolos `*` y animaciones de invasores, meteoritos, terremoto, pandemia y reorganizaciones.
- Mochila: últimas cartas usadas por **ambos** X/O, coloreadas; incluye uso de inventario de la máquina cuando el evento llega a la interfaz.
- Dibujado más ligero del mapa alejado y reutilización de índices espaciales en fases de ampliación.
- La lógica de promociones prefiere cuadrantes 3×3 contiguos, con fallback seguro si el tablero es irregular, construye/demuele el mismo número de celdas.
- Batería automatizada `npm test`, construcción `npm run build:github`, calibración rápida `npm run simulate:ecology -- --quick`; simulación extensa `npm run simulate:ecology -- --json`.

## Limitaciones y siguiente paso obligatorio ANTES de llamarlo definitivo

1. **No está desplegado en la web pública**: trabajar en rama y verificar PR antes de integrar a `main`; generar y publicar `docs/` con pipeline oficial. R0.21.28 es la versión jugable estable.
2. La lógica de **Duelo y Mundo conectados a Supabase** funciona en PostgreSQL, no en `src/local.js`. La versión actual de esta rama **no modifica** esa lógica remota. Hay que portar los nuevos tipos al SQL, generar migración, test SQL, revisar RLS/seguridad y verificar **antes** de activar el nuevo ecosistema en modos online. No presentar el comportamiento de Solo como disponible online.
3. El simulador actual compara **efectos geométricos por tamaño y densidad**; para equilibrar incidencias reales de largo plazo conviene extenderlo a secuencias de miles de colocaciones que incluyan fauna, obras, inventario, recuperación y desorden. Evitar adivinar tasas. 
4. Confirmar en móvil/táctil: fluidez al arrastrar durante ampliación de tableros grandes; animación bomba → `*`; protección/última carta del rival, ampliación conservada y mapas con `*`.
5. Guardados grandes anteriores: los nuevos sorteos comienzan desde actividad posterior a actualizar el guardado, sin reanunciar hitos pasados. Históricos conservan reglas/estadísticas.

## Siguiente conversación

Abrir **#3_11** con esta rama como referencia. Completar homologación Supabase, QA táctil, publicación y simulación de partidas completas. **Después** modificar solo lo que salga de los datos: patrones, frecuencias e intensidades.

## Compatibilidad con corrección de perfiles publicada

El 9/10/2026 se publicó por separado en `main` la revisión `R0.21.28-P1` (PR #2, commit `698edf259cad0c9b47fc43ab4b114daf8f77bbe0`): acceso entre navegadores más fiable y Perfil rediseñado. **Antes de integrar #3_11, conservar/cherry-pick las mejoras de** `src/profile-access-ui.js`, `src/profile-link.js`, `src/api.js`, `src/hall.js`, `src/hall.css`, `src/main.js`, las pruebas y versión. No sobrescribirlas con el `main.js` antiguo de esta rama. Las ramas comparten `hall.js`/`main.js`; resolver conflictos con prioridad al flujo de perfil más reciente.
