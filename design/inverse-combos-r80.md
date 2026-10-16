# R0.21.80 · Cobro completo de conjuntos

Jorge16/10/2026: aprobación de mejorar el cobro para recuperar todas las figuras de Original, incluidas diagonales, y mostrar la figura mayor/importe completo. Respaldo remoto de R79: backup/pre-inverso-combos-r79-20261016,37c8a7411ba18290533052704dc4c9d25f5e64d9.

## Mecánica

Cobrar y tocar cualquier X/O propia o # identifica el conjunto de ese signo y # conectados por lado o esquina. Se cobran todas las figuras válidas contenidas, usando el catálogo existente: líneas máximas horizontales, verticales y ambas diagonales, L3/L4, cuadrados, cruces y grupos del nivel Avanzado. Nunca mezclar signos rivales ni conjuntos desconectados. Se retira la unión de figuras detectadas, no los extremos o enlaces sin figura. Figura mayor como referencia y un solo total automático; desaparece el selector de geometrías individuales. Previsualizar/cancelar no gasta, cobrar acaba el turno.

Cada subfigura se evalúa sobre el mismo relleno previo. Solo las que alcanzan relleno pendiente puntúan su tamaño y cuentan para bonus/figuras/recarga. Las demás se retiran por cero. Bonus habitual por cada múltiplo de tres figuras cobradas, incluso varios en un combo. Relleno compartido eliminado una vez. Ejemplo cuadrado2×2 preparado completo:4L3+cuadrado4=16base+3bonus=19puntos y5figuras. Si solo un vértice conserva relleno, califican3L+cuadrado=13base, con bonus según el contador previo. Las figuras ya formadas y retenidas también se cobran, porque no se pagaron antes.

Contorno/posiciones, cartas, cadencia9/cupo3de# y final por relleno intactos. La corrección alcanza partidas inverseVersion3 activas/pausadas de R79, sin inventar pagos ni reiniciar nada. Vista previa de guardado es lectura; al siguiente comando se registra inverseClaimVersion2. Versiones1/2 automáticas mantienen sus reglas. No reclasificar finales archivados; comparaciones incorporan inverseClaimVersion.

## Motor y rendimiento

Enumerar líneas solo desde su inicio y cada plantilla normalizada desde una referencia única. Grupos avanzados se recorren una vez por componente de lados, suprimiendo el grupo cuando coincide con una figura básica. Comparación automática con la unión de figureWindows del catálogo original en24posiciones normales/avanzadas. Contexto e índice de componentes por snapshot; otras pulsaciones y navegación reutilizan el mismo resultado. Sin recorrer terreno durante pan/zoom.

Acumulación en streaming: conservar totales exactos, unión de coordenadas, categorías del desglose y hasta2048figuras del informe transitorio. Si excede128figuras pagadas o se truncó el informe, persistir una geometría agregada y categorías exactas en vez de miles de figuras individuales. La puntuación nunca se trunca. En ensayo sintético Node33333celdas avanzadas:459738figuras,2361044puntos; cálculo≈2,4s, consulta repetida≈0,05ms. No equivale a dispositivo físico ni garantiza esa latencia móvil.

IA, ayuda, Súper Ayuda, confirmación, brillo y desglose usan el mismo cobro calculado. Final ganador disponible se evalúa antes de explorar otras jugadas para evitar trabajo innecesario.

## Validación

628pruebas del motor. Diez casos nuevos: diagonales, comodines, figuras incluidas, grupos separados, punta sin figura, evaluación individual del relleno, catálogo original, guardadosR79, interfaz automática, IA/resultados y guardado de combo grande. QA CI añade cuadrado completo19, ambas diagonales y# en18combinaciones de tamaño/motor; Worker real cobra19y termina. Pipeline completo antes de Pages. Original, fauna, frecuencias y online fuera del alcance.
