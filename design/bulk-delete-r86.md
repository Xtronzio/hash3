# Mis partidas · R0.21.86

Selección múltiple mediante Seleccionar o mantener pulsada una partida en dispositivos táctiles. Tocar filas en selección marca/desmarca, sin abrir la partida. Seleccionar todas incluye Cerradas, pero excluye Ancladas. Borrar (N) pide una única confirmación con el número. Cancelar/Escape vuelve a la selección. Escape posterior sale de selección.

Tras borrar una o varias, conservar lista, posición de scroll (limitada al contenido restante) y apertura de Cerradas. Mantener selección vacía para continuar limpiando. Borrado individual mantiene menú y gestos previos. La operación no usa el render del tablero al finalizar.

Anclajes se verifican antes de confirmar y de escribir; fallo de acceso preserva juegos. Lotes locales archivan resultados y realizan una única escritura de colección; si falla, siguen disponibles todos. El puntero antiguo no resucita partidas. Eliminaciones online conservan RPC existente, verificación por sala y reporte de éxito parcial, sin habilitar online. No cambia motor, dificultad, reglas ni SQL.

Copia estable R85: backup/pre-bulk-delete-r85-20261017. Validación: tests Node y pipeline remoto completo; escenario específico de tres motores × seis tamaños con selección, cancelación, borrado consecutivo, anclaje posterior a selección, error de almacenamiento, persistencia de Cerradas y pulsación táctil.
