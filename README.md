# #3 — R0.1

Juego de líneas y expansión territorial. Código privado: `Xtronzio/hash3`.

## Ejecutar

Requiere Node.js 22.12 o superior.

```sh
npm ci
npm run dev
npm test
npm run build
```

La compilación publicable queda en `dist/`. Es una web estática con Supabase como servidor del juego. Puede alojarse en Vercel, Netlify o cualquier servidor HTTPS que sirva esos archivos. El repositorio puede permanecer privado. Google y Apple todavía no están configurados.

`src/config.js` contiene únicamente la URL y la clave publicable de Supabase. La autorización se comprueba en el servidor. Para otro entorno, copia `.env.example` a `.env` y configura sus dos variables. Nunca pongas claves secretas ni `service_role` en el cliente.

## Partida del piloto

- De 2 a 12 jugadores, con número par. El anfitrión inicia y finaliza.
- Parejas y símbolos sorteados. Cada pareja comienza con un 3×3 propio y alterna turnos independientemente.
- Un tablero global: las fichas son permanentes. Cada pareja juega en su bloque activo. Los bloques nuevos pueden unir territorios.
- Líneas horizontales, verticales y diagonales de **exactamente tres posiciones consecutivas**: **+3** para quien las completa. Se pueden aprovechar fichas del mismo símbolo de compañeros cuando los territorios se conectan.
- Cada línea geométrica se registra una sola vez para el equipo. Las ventanas de tres diferentes pueden compartir fichas; una línea larga contiene ventanas distintas. Una jugada puede completar varias líneas.
- **+3 extra cada tercera figura** del jugador (3.ª, 6.ª, 9.ª…). Los puntos individuales, incluido el bonus, suman para X/O.
- Cada figura concede un bloque 3×3. Si hay varias, se colocan sucesivamente. Si se llena el bloque sin figura, se concede uno sin puntos.
- La expansión usa vecinos laterales libres del bloque activo; si está rodeado, busca los huecos más cercanos en su territorio conectado. No se puede solapar ni saltar a una isla lejana.
- El jugador que obtiene la expansión la coloca antes del siguiente turno del rival.
- Ranking ordenado por puntos; en empate conserva el orden de entrada (solo criterio de visualización, no desempate de la victoria).
- Rojo X, verde O, gris otras parejas. Azul: última jugada del jugador inmediatamente superior en el ranking. Oro/plata/bronce se muestran en las posiciones del ranking.

Las figuras adicionales (cuadrados, L, etc.), límites de duración, cambio de parejas, entrenamiento y PISTA quedan fuera de R0.1 y requieren definición antes de activarse.

## Datos y permisos

Supabase: `hash3`, referencia `vyzugvepzylidyxitojo`.

`supabase/schema.sql` es el esquema de instalación inicial; no lo vuelvas a ejecutar sobre un proyecto ya instalado. Las revisiones aplicadas quedan en el historial de migraciones de Supabase.

Las tablas están en `hash3_private`, con RLS activado y sin acceso directo para `anon` ni `authenticated`. Por eso el aviso informativo «RLS enabled, no policy» es intencional en estas dos tablas. La única API expuesta es `public.hash3_command`, que utiliza una función privada con comprobación de `auth.uid()`, pertenencia a la sala, permisos de anfitrión y reglas de juego. Un bloqueo de fila serializa los cambios de cada sala y evita carreras de jugadas o puntuación.

El cliente consulta versiones cada 1,8 segundos, detiene consultas al ocultar la pestaña y actualiza al volver. Guarda la sesión de invitado en el dispositivo; borrar los datos del navegador elimina esa identidad. Las cuentas Google/Apple y el vínculo con la identidad invitada se añadirán después.

## Verificación

- `npm test`: geometría de líneas, expansión conectada, límites de bloques y referencia de ranking.
- `tests/database.sql`: pruebas transaccionales de comandos reales como `authenticated`: permisos, turnos, jugadas idempotentes, líneas, bonus, expansión, empate y finalización. Todo se revierte con `ROLLBACK`.
- Acceso anónimo real probado con la biblioteca cliente y la clave publicable. La consulta opcional WebMCP se activa solo si el navegador la soporta; no hubo contexto WebMCP disponible para validarla en este entorno.

El asesor de Supabase informa de que la protección de contraseñas filtradas está desactivada. R0.1 usa invitados sin contraseña; antes de añadir acceso por contraseña, revisar [protección de contraseñas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Evolución a móvil

Motor autoritativo en Supabase, funciones de geometría independientes de la interfaz, controles táctiles y diseño adaptable. Esta web puede empaquetarse con Capacitor para iOS/Android; publicar en las tiendas requerirá empaquetado, pruebas nativas, configuración de cuentas y requisitos de cada tienda. La arquitectura no garantiza por sí sola la aceptación de una tienda.
