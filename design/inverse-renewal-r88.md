# Inverso · Contorno que resta y repone · R0.21.88

Solicitud de Jorge, 18/10/2026: complementar las restas con sumas dentro del contorno, recorrer comodines y restos con las dianas, mejorar eliminación/creación y trazos discontinuos. Base respaldada: `backup/pre-inverse-renewal-r87-20261018`, SHA `6c507bc`.

## Reglas

La geometría original es inmutable. Reponer significa devolver relleno a celdas ya vaciadas, no construir territorio. Solo Inverso manual3; Original y cobro automático1/2 conservan reglas.

- Restas y # mantienen las frecuencias R87. Reposición: presupuesto 3×ceil(N inicial/3333), máximo33 por intervención; intervalo doble del actual ciclo de restas (66/132/198 turnos completos compartidos).
- Reserva de partida finita: 3×floor(N inicial/27), como máximo N/9. No se recarga al puntuar. Así no puede alargarse indefinidamente mediante relleno reciclado.
- Aviso3turnos con destinos públicos y concretos. Priorizar vacíos junto al relleno restante, desempate estable por ciclo/coordenadas. Solo celdas originales vaciadas y sin ninguna ficha. Si se ocupa un destino anunciado, no reponerlo ni sustituirlo.
- Con nueve pendientes o menos, o tras vaciar la última, no anunciar ni ejecutar sumas. El final del jugador prevalece. Enjambre efectivo pospone un turno, conservando destinos. Doble cuenta1; cartas, mapa, dianas, pausa y tiempo0.
- Fichas, stock y puntos cobrados intactos. El relleno repuesto puntúa cuando se vacía de nuevo mediante combo; no da puntos al aparecer ni bajo una ficha preexistente.
- `inverseContour.renewal` versión1 guarda turnos futuros, reserva gastada y objetivos; `inverseRenewalEvent` guarda último impacto. Guardados activos previos se inicializan a futuro en una acción aceptada; leer/abrir no ejecuta historia. Traslados validan cuotas, coordenadas, plazos y unicidad. Pérdida acumulada admite N+repuesto. Finales con `inverseRenewalVersion`/`inverseRestored`; comparación separada de R87 y anteriores.

## Interfaz y rendimiento

Dianas: #, relleno, restas y sumas, además de referencias/posiciones guardadas existentes. Tablero usa parches ajustados a la altura y hasta33celdas; mapas usan grupos3×3 para mantener detalle. Cada tipo conserva su recorrido durante la sesión. No gastan acciones ni cartas, también sin inventario. «Por vaciar» conserva acceso directo.

Avisos: marco SVG doble, base oscura y guiones gruesos, oro−/menta+, icono que distingue sin depender del color. Fichas y punto central libres. Eliminación: anillo y fragmentos que salen; creación: convergencia y pulso+; comodín: pulso#. Diferenciar contorno oro y cobro cian. Efectos decorativos no bloquean entrada y duran1,3s. Movimiento reducido usa resalte estático. Solo deltas nuevos de snapshots aceptados; no repetir al cargar, enfocar o desplazar.

Preparar índices de efectos, relleno y navegación por snapshot/acción. Dibujar únicamente ventana+2; efectos grandes limitados a500visibles y33en zoom general. Desfase negativo conserva fase al entrar en la ventana, sin reiniciar la duración durante pan/zoom. No añadir recorridos globales al reloj o scroll.

## Verificación

Pruebas Node de cuota vitalicia, conservación, simultaneidad, fin, cobro, migración, pausa/traslado, rechazo de datos inválidos y tablero máximo válido. QA remota en Chromium/Firefox/WebKit y seis tamaños (18casos), dianas en tablero/mapa/pausa, avisos, impactos, animaciones, movimiento reducido y ausencia de escrituras/calls online al navegar. Pipeline completo y capturas antes de integrar; comprobar versión/assets/servicio offline públicos. Emulación no equivale a prueba física ni demuestra equilibrio de sesiones humanas.
