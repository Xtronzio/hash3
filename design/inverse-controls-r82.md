# R0.21.82 · Cuenta de abejas y Cobrar flotante

Jorge16/10/2026 pide ampliar la cuenta de abejas, sustituir el calendario de Cobrar y permitir sacarlo al tablero mediante la personalización existente. Respaldo R81: backup/pre-inverso-controls-r81-20261016, b8ca4d0280e46ef057eb3c02e8fbb4251e343eb2.

La cuenta anunciada3/2/1usa24px en barra y cabecera, con abeja25px. Calma muestra un guion y etiqueta accesible que explica el plazo variable9/12/15; no revelar ni modificar el sorteo. Mantener aviso y posiciones en móvil, mapa y pausa. La cuenta permanece en la barra al sacar Cobrar.

Icono común collect-figures: tres celdas y flecha hacia bandeja, sin calendario. Componente inverseClaimControl compartido por barra y flotantes. Misma legalidad: turno propio, juego activo, Doble terminado; pausa/rival deshabilitan. Pulsar abre/cierra previsualización; solo confirmar cobra y termina turno.

Personalización: Controles/Cobrar, separado del orden y stock de cartas. Normalizador admite inverse-claim en floating/positions, sin añadirlo al catálogo de cartas, trueque ni árbitro de inventario. Tirador, teclado, separación de otros controles y coordenadas normalizadas reutilizan el sistema actual. Al flotar desaparece de la barra; se puede devolver desde el editor. Preferencias por jugador y traslado con la partida. Funciona sin cartas, con acceso de personalización propio; Original y automáticas1/2 no muestran el control.

No cambiar contorno, relleno, puntos, inventarios, turnos, plazos de abejas, resultados ni IA. Personalizar/previsualizar no altera estado del árbitro; la pausa conserva estado. Navegación por ventana+margen2 sin recorridos nuevos del tablero.

Validación: cinco pruebas nuevas de normalización/catálogo, editor/icono y versiones, disponibilidad sin inventario/pausa/rival/Doble, guardado/traslado sin gasto y contador semántico. Total647pruebas del motor. QA remota: seis tamaños y tres motores, número grande, icono, sacar/devolver, ratón/teclado, previsualización sin gasto, cobro19, mapa, pausa/recarga y sin inventario. Pipeline completo y versión/assets R82/r293 antes de finalizar. Emulación, no dispositivos físicos.
