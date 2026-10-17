# Inverso · Localizador y contorno R87

El contador recorre parches conectados de relleno con zoom y resalte, máximo33por parche y caja9×9 (menor en pantallas bajas). Preparación O(N) por snapshot, ninguna lectura completa desde pan/zoom/reloj. Cada posición pendiente aparece una vez; se conserva geometría con huecos. No consume acciones ni altera el guardado.

Presión inicial para probar: una intervención compartida cada33/66/99turnos completos según intensidad, aviso en los últimos3. Presupuesto min(33,3×ceil(relleno/333)), limitado para reservar al menos3celdas de relleno al jugador. Se anuncian zonas expuestas, priorizando proximidad a fichas X/O sin favorecer un color; recorrido local desde el borde del relleno, no distancia a la cámara. Solo desaparece relleno. Fichas permanecen jugables, no resta puntos; las figuras solo puntúan si queda relleno alcanzado, con el cálculo actual. Anticiparse cobrando salva esas oportunidades; las celdas cobradas se omiten sin reemplazo. Ataque que coincide con movimiento de abejas se aplaza1turno manteniendo objetivos.

Doble cuenta1 al terminar; cobrar1; cartas, compras, pausa y tiempo no avanzan. El último relleno lo quita un jugador, manteniendo final/victoria por puntos. # periódicos ahora solo en celdas libres pendientes; dejan una colocación legal.

Estado inverseContour1 y evento compacto hasta33claves. Nuevas partidas y activas manuales adoptan ciclo futuro; versiones1/2 y finales intactos. Guardado, pausa, traslado validado y resultados separados por versión, sin inferir pagos pasados. IA usa misma cuenta/objetivos públicos y prioriza cobro cuando una figura perdería todo su relleno en el siguiente turno.

Ajuste de diseño inicial, no equilibrio humano demostrado: medir frecuencia de impactos, relleno perdido sin puntos y decisiones de cobrar antes. Backup R86: backup/pre-inverse-contour-r86-20261017.

Medición del ritmo: 33celdas/33turnos llegaba a1celda/turno, superior a la referencia de tres colocaciones + un cobro para vaciar3(0,75celdas/turno). Se limita el caudal a≤1/3celda/turno con intervalo33×max(1,ceil(presupuesto/11)). Con referencia0,75 la proporción máxima teórica del contorno es4/13≈30,8%, antes de cobros que salvan objetivos y aplazamientos por abejas. Es una referencia sintética, no una conclusión de equilibrio humano.
