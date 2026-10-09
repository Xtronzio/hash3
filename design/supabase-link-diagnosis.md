# Diagnóstico del enlace y Supabase · 9 de octubre de 2026

Jorge observa que los problemas aparecieron al intentar generar el enlace para otro navegador. Se contrastó esa observación con el historial Git, la función realmente desplegada y los registros del proyecto `vyzugvepzylidyxitojo`. La investigación leyó registros y código; se intentó pausar únicamente el reloj de Mundo, pero su ejecución no se pudo confirmar. No se regeneró ningún acceso.

## Cronología comprobada

Se amplió la búsqueda a ventanas diarias desde la creación del proyecto el 4/10. Hay registros históricos de Auth, PostgreSQL y cron. Los días 4–6 no muestran errores de servidor (5xx) de renovación en los registros revisados. Horas de esta tabla convertidas a Europe/Madrid (UTC+2).

| Momento | Evidencia |
| --- | --- |
| 7/10 23:00:31 | Última renovación correcta (200) observada antes del incidente. |
| 7/10 23:32:58–23:33:45 | Intentos de aplicación del SQL R0.21.0 de habitantes; la función nueva aparece después en el stack del reloj. |
| 7/10 23:33:58 | Arranca una ejecución del cron `advance_worlds()` que no termina a tiempo. |
| 7/10 23:36:31 | Timeout del cron dentro de `habitat_reserved`, llamado desde `advance_state`, línea 24. |
| 7/10 23:37:34 | PostgreSQL informa interrupción, cierre incorrecto y recuperación automática. Después se repite el ciclo de reinicios. |
| 8/10 00:07:14 | Primer fallo interno de renovación de Auth localizado: 500, `error finding refresh token: context canceled`. |
| 8/10 00:10:10 | Primera respuesta 502 de renovación en el gateway. |
| 8/10 00:12:10 | Primera respuesta 504 de renovación en el gateway. |
| 8/10 18:09:19 | Creación y única actualización de `profile-link`, versión 1. |
| 8/10 18:19:24 | Commit `fd8566b`: incorporación de enlaces R0.21.18. |
| 9/10 10:53:26 | Commit `698edf2`: P1 elimina la dependencia de sesión antigua en la petición de restauración. |

El primer error del gateway no es el primer síntoma: la base de datos y el reloj fallan antes de Auth. El cambio inmediatamente relevante es `20261007213210_board_inhabitants_33_66_99.sql`, incorporado en `31ab5b2` (R0.21.0, 7/10 23:44 Madrid). La hora de commit es posterior a la aplicación SQL y no debe usarse como hora de despliegue del servidor.

El registro del timeout da el recorrido exacto `advance_worlds → advance_state → habitat_reserved`. El nuevo filtro ejecuta esa comprobación para cada celda del terreno conectado al buscar movimientos. Se registran 13 timeouts de pg_cron con ese contexto entre 23:36 y 00:59; en la misma ventana también fallan PostgREST y administración. Esto confirma un problema en nuestra consulta online. La relación de esa carga con los reinicios y la caída general es la principal hipótesis; no está confirmado agotamiento de memoria ni un motivo de reinicio específico.

La ventana posterior 8/10 10:00–9/10 09:55 UTC contiene otros 815 refresh 504 y 13 signup 504. Los mensajes de arranque/cierre de la función de enlace no prueban generación o recuperación correctas. El enlace se instaló muchas horas después del comienzo de los errores; no explica su inicio.

## Qué hace realmente el enlace

La función desplegada coincide con `supabase/functions/profile-link/index.ts` y `handler.js` del repositorio. Crear o renovar verifica JWT, lee el usuario y actualiza sus metadatos administrados; para un invitado sin email añade una dirección interna confirmada. Restaurar verifica el hash privado, genera un magic link interno y lo canjea por una sesión del mismo UUID. No crea cron, tablas ni modifica el motor de partidas. Son operaciones sobre Auth; aún pueden fallar si Auth o su base de datos no responden.

En la primera revisión, `profileAccess('restore')` consultaba `getSession()` antes de usar el secreto. Una sesión expirada podía iniciar renovación y bloquear la recuperación antes de llegar al endpoint. P1 ya corrigió esa dependencia en la petición de restauración. La instalación posterior conserva rollback del perfil previo; no se ha probado de extremo a extremo con Auth sano. Este defecto podía hacer visible o agravar un fallo previo, pero no explica 504 anteriores al despliegue.

El cliente Supabase se inicializaba también en modos locales con renovación automática predeterminada. Los numerosos intentos fallidos pueden aumentar tráfico mientras el servidor está caído. R0.21.31 desactiva renovación automática y detección de sesión de URL, bloquea API y rutas online y conserva las sesiones guardadas. La prueba Chromium, con sesión caducada y códigos antiguos, inicia y juega ambos modos locales sin ninguna petición Supabase.

## Lo que sigue sin resolverse

Las consultas SQL mínimas, migraciones y asesores agotan el plazo de conexión, aunque administración muestra ACTIVE_HEALTHY. La ventana reciente no contiene registros PostgreSQL, pero las ventanas históricas sí permitieron encontrar los timeouts y reinicios anteriores. Todavía no se confirmó el mecanismo que provoca el reinicio (memoria, bloqueo u otro). El cron `hash3-world-clock`, cada dos segundos, está confirmado en los registros históricos. El 9/10 se intentó desactivarlo reversiblemente con `cron.alter_job(..., active := false)` y consultar su estado; la conexión volvió a agotar el plazo. No hay confirmación de pausa ni del estado actual. No repetir cambios a ciegas. Desactivar Duelo/Mundo en el navegador no detiene ese trabajo del servidor.

Siguiente diagnóstico cuando SQL responda: confirmar/desactivar el cron, revisar actividad y bloqueos, y corregir el filtro de reservas identificado en `advance_state` para preparar reservas/ocupación una vez por estado, evitando recorridos repetidos por celda. Medir terreno real grande con/sin habitantes antes de reactivarlo. Después probar Auth sin enlace, crear un único enlace y restaurar una vez en otro navegador, midiendo solicitudes y latencias. No borrar usuarios, sesiones, mundos ni enlaces para ocultar el fallo. No habilitar Duelo ni Mundo hasta cerrar su fase correspondiente.
