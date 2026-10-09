# Diagnóstico del enlace y Supabase · 9 de octubre de 2026

Jorge observa que los problemas aparecieron al intentar generar el enlace para otro navegador. Se contrastó esa observación con el historial Git, la función realmente desplegada y los registros del proyecto `vyzugvepzylidyxitojo`. No se modificó el servidor ni se regeneró ningún acceso.

## Cronología comprobada

Consulta de registros unificados en ventana UTC 8/10 10:00–9/10 09:55. Horas de esta tabla convertidas a Europe/Madrid (UTC+2).

| Momento | Evidencia |
| --- | --- |
| 8/10 12:10:24 | Primer 504 de renovación de sesión observado en esta ventana, desde Safari/iPhone. No equivale a primera incidencia de toda la historia. |
| 8/10 12:46:50 | 504 al crear sesión anónima, desde Edge/Windows. |
| 8/10 18:09:19 | Creación y única actualización del servicio `profile-link`, versión 1. |
| 8/10 18:19:24 | Commit `fd8566b`: incorporación de enlaces de perfil R0.21.18. |
| 9/10 10:53:26 | Commit `698edf2`: P1 elimina la dependencia de una sesión antigua para solicitar restauración y mejora errores/recuperación. |

La ventana contiene 815 respuestas 504 en renovaciones y 13 en creación de sesión. Hay cuatro mensajes de arranque/cierre de la función, sin detalle de sus acciones; esos mensajes no prueban generación o restauración correctas. Los registros disponibles sitúan fallos de Auth casi seis horas antes de desplegar el enlace. Por tanto, la instalación del enlace no explica el inicio de esos fallos. No descarta otros cambios previos de nuestra aplicación o tareas del servidor.

## Qué hace realmente el enlace

La función desplegada coincide con `supabase/functions/profile-link/index.ts` y `handler.js` del repositorio. Crear o renovar verifica JWT, lee el usuario y actualiza sus metadatos administrados; para un invitado sin email añade una dirección interna confirmada. Restaurar verifica el hash privado, genera un magic link interno y lo canjea por una sesión del mismo UUID. No crea cron, tablas ni modifica el motor de partidas. Son operaciones sobre Auth; aún pueden fallar si Auth o su base de datos no responden.

En la primera revisión, `profileAccess('restore')` consultaba `getSession()` antes de usar el secreto. Una sesión expirada podía iniciar renovación y bloquear la recuperación antes de llegar al endpoint. P1 ya corrigió esa dependencia en la petición de restauración. La instalación posterior conserva rollback del perfil previo; no se ha probado de extremo a extremo con Auth sano. Este defecto podía hacer visible o agravar un fallo previo, pero no explica 504 anteriores al despliegue.

El cliente Supabase se inicializaba también en modos locales con renovación automática predeterminada. Los numerosos intentos fallidos pueden aumentar tráfico mientras el servidor está caído. R0.21.31 desactiva renovación automática y detección de sesión de URL, bloquea API y rutas online y conserva las sesiones guardadas. La prueba Chromium, con sesión caducada y códigos antiguos, inicia y juega ambos modos locales sin ninguna petición Supabase.

## Lo que sigue sin resolverse

Las consultas SQL mínimas, migraciones y asesores agotan el plazo de conexión, aunque administración muestra ACTIVE_HEALTHY. No hay registros PostgreSQL en la ventana disponible. No es posible distinguir todavía bloqueo, saturación, conectividad o avería del servicio. El cron `hash3-world-clock` existe en las migraciones, con intervalo de dos segundos; no se pudo verificar si sigue activo remotamente. Desactivar Duelo/Mundo en el navegador no detiene ese trabajo del servidor.

Siguiente diagnóstico cuando SQL responda: revisar actividad y bloqueos, planificador y coste de `hash3_private.advance_worlds()`, después probar Auth sin enlace, crear un único enlace y restaurar una vez en otro navegador, midiendo solicitudes y latencias. No borrar usuarios, sesiones, mundos ni enlaces para ocultar el fallo. No habilitar Duelo ni Mundo hasta cerrar su fase correspondiente.
