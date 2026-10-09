# Territorio vivo · R0.21.35

Aplicación autorizada por Jorge tras cambiar el esfuerzo. Solo VS máquina y Sin conexión. Duelo/Mundo siguen en construcción; sin cambios al servidor ni a la migración SQL preparada.

## Reglas de escala

N es el terreno real de la zona para habitantes, y de la partida para fenómenos. F = max(1, redondear(√(N/333))). Población/focos crecen con F; los intervalos de habitantes crecen con √F. Colocaciones se redondean hacia arriba a múltiplos de 3; tiempos a múltiplos de 33 s. Cantidades de afección se redondean hacia abajo a múltiplos de 3.

| Terreno | F | Roedores, máximo | Gusanos, máximo | Promociones, máximo | Intervalo R/G/obras, colocaciones |
|---:|---:|---:|---:|---:|---|
| 333 | 1 | 3 | 1 | 1 | 66 / 33 / 66 |
| 999 | 2 | 6 | 2 | 2 | 96 / 48 / 96 |
| 3.333 | 3 | 9 | 3 | 3 | 117 / 60 / 117 |
| 9.999 | 5 | 15 | 5 | 5 | 150 / 75 / 150 |
| 33.333 | 10 | 30 | 10 | 10 | 210 / 105 / 210 |

## Todos los eventos

Los intentos mixtos se comprueban al aceptar una colocación: gana el contador o el tiempo activo, lo que se cumpla antes. Esperar no genera una cola. Un intento puede no producir aparición por falta de alimento, geometría, cupo o protección. Las invasiones no suspenden habitantes. Los siete fenómenos naturales/estelares sí suspenden fauna durante aviso e impacto, seguidos de 33 s y tres colocaciones de recuperación. Se conserva el avance hacia nacimientos.

| Evento | Intento base (F=1) | Cantidad / afección | Ingesta o intervención |
|---|---|---|---|
| Roedores | 66 colocaciones o 132 s | Hasta 3F individuos | Una ficha por individuo en cada una de tres visitas; nueve turnos completados. No comen # ni la ficha recién puesta. |
| Gusanos | 33 colocaciones o 198 s | Hasta F individuos | Una ficha cada 33 s; salida tras tres comidas o tres intentos consecutivos sin alimento legal. |
| Constructores | 66 colocaciones o 165 s, compartido con destructores | Hasta F promociones; cada una incluye tres parejas de obreros | Tres celdas por promoción cada 33 s, hasta nueve. |
| Destructores | El mismo intento de obras | La misma promoción | Retiran simultáneamente igual cantidad de celdas vacías; una obra inválida se cancela sin crecimiento neto. |
| Bombardeo invasor | Familia invasora: 33 colocaciones o 99 s; primer plazo 66 s | Hasta 3F celdas expuestas | Tras aviso de 33 s, sustituye fichas por * y conserva terreno. |
| Colonia invasora | Comparte intento invasor | Hasta F núcleos 3×3 (9F celdas) | Entrada desde un borde real, tres líneas de profundidad tres; las barreras contienen los recorridos que cruzan. |
| Meteoritos | Familia natural/estelar: 99 colocaciones o 198 s | 3 % de terreno, máximo 33F | Tras aviso de 33 s, demuele terreno y fichas dispersos. |
| Terremoto | Comparte intento natural/estelar | 3 % de terreno, máximo 33F | Demolición compacta; cada celda toca al menos dos de la región por los lados. |
| Pandemia | Comparte intento natural/estelar | 6 % de fichas, máximo 66F | Vacía fichas dispersas, conserva terreno. Icono de virus. |
| OVNI | Comparte intento natural/estelar | 6 % de fichas, máximo 66F | Vacía fichas localizadas, conserva terreno. |
| Lluvia de tornados | Comparte intento natural/estelar | 9 % del terreno, máximo 99F | Mezcla por grupos separados de hasta 3×3, conserva símbolos, dueños y terreno. |
| Huracán | Comparte intento natural/estelar | 9 % del terreno, máximo 99F | Mezcla una región conectada; icono de ciclón diferenciado. |
| Agujero negro | Comparte intento natural/estelar | Hasta F núcleos 3×3 | Vacía núcleos; mezcla el halo de tres celdas de cada núcleo. No une los halos mediante una caja gigante. |
| Ficha neutral # | Cada 33 colocaciones propias | Un hueco legal; conserva al menos otro libre | No ingiere ni puntúa; bloquea una casilla. |

En partidas de tres minutos, el plazo natural es 99 s. Las familias necesitan 33 figuras cobradas entre ambos. Un aviso no comienza si quedan menos de 33 s de partida. Cada familia usa una bolsa aleatoria sin repetir tipos viables hasta agotarla; los imposibles se prueban por alternativas, sin cola. La frecuencia de un tipo concreto depende de viabilidad y orden de la bolsa; no se promete una probabilidad independiente en cada intento. Focos, impactos y población son máximos antes de protección, reservas y geometría.

## Frontera, IA y rastro

Frontera es una carta independiente, de tres segmentos entre celdas construidas, con cuatro orientaciones. Previsualizar, girar y cancelar no gastan; colocar gasta una carta y registra el uso del turno. No tapa ni ocupa fichas. Contiene las líneas invasoras que crucen su segmento, incluso si se coloca durante el aviso. El recorrido anunciado no se desvía ni reaparece detrás. Muro conserva su casilla sin construir; Bomba rompe la barrera completa alcanzada. La migración de barreras antiguas excluye las nuevas Fronteras etiquetadas.

La IA compilaba huecos sin excluir cuerpo de gusanos y reservas de obras. Ahora ambos se excluyen antes de elegir movimientos, en los cuatro niveles. El árbitro sigue validando contra el estado actualizado si un Worker termina después de cambiar el tablero. La cabeza del gusano conserva su icono; el cuerpo se representa con conexiones continuas y nodos pequeños, en tablero y mapas. Al retirarse se libera todo el cuerpo.

## Simulación reproducible

Reproducir: `npm run simulate:living` (o `-- --quick` para dos escenarios). Datos completos: [living-r35-simulations.json](living-r35-simulations.json). Comandos reales del árbitro local; juego aleatorio con semillas 33/66/99, densidad inicial 35 %, seis segundos activos por acción y un intento de carta cada cinco colocaciones. Las pruebas de tamaño parten explícitamente tras la apertura (99 figuras); no son partidas humanas ni medidas de diversión o victoria.

| Tamaño inicial | Semillas | Colocaciones por ensayo | Comidas R+G, media | Comidas / colocación | Anuncios invasores / naturales | Construcción / destrucción media |
|---:|---|---:|---:|---:|---|---|
| 333 | 33/66/99 | 180 | 71.3 | 39.6% | 10 / 5 | 36.0 / 36.0 |
| 999 | 33/66/99 | 180 | 90.0 | 50.0% | 10 / 5 | 50.0 / 50.0 |
| 3,333 | 33/66/99 | 180 | 125.0 | 69.4% | 10 / 5 | 81.0 / 81.0 |
| 9,999 | 33 | 180 | 160.0 | 88.9% | 10 / 5 | 90.0 / 90.0 |
| 33,333 | 33 | 180 | 208.0 | 115.6% | 10 / 5 | 90.0 / 90.0 |

Todos los ensayos completaron sus colocaciones/finales, mantuvieron terreno y fichas únicos, fichas sobre terreno, puntos ya cobrados, límites de inventario y como máximo un aviso. La escala mayor produce más actividad absoluta: a 33.333 celdas este estrés alcanzó 208 comidas por 180 colocaciones, pero con unas 11.666 fichas iniciales. No implica que una partida humana mantenga ese ritmo; requiere valoración jugando, y no se declara equilibrio definitivo.

| Duración | Figuras iniciales | Colocaciones aceptadas | Anuncios invasores / naturales | Comidas R+G |
|---|---:|---:|---|---:|
| 33 s | 0 | 5 | 0 / 0 | 0 |
| 33 s | 99 | 5 | 0 / 0 | 0 |
| 180 s | 0 | 29 | 0 / 0 | 6 |
| 180 s | 99 | 29 | 1 / 1 | 0 |
| 360 s | 0 | 59 | 1 / 1 | 20 |
| 360 s | 99 | 59 | 3 / 1 | 20 |
| 540 s | 0 | 89 | 3 / 2 | 31 |
| 540 s | 99 | 89 | 5 / 2 | 31 |

El ensayo de tres minutos antes de superar la apertura no generó fenómenos: el requisito de 33 figuras prevalece. Tras la apertura produjo un aviso de cada familia; seis/nueve minutos tuvieron fases sucesivas. Relámpago conservó su final sin anunciar un ataque tardío.

## Validación

Pruebas del motor: IA contra cuerpo/reservas, elección obsoleta, tres fallos de ingesta y reinicio por comida, pausa/guardado, escala y geometría, cuatro entradas invasoras, defensa parcial, carta/stock/migración, IA defensiva, halos acotados y catálogo completo. Chromium verifica Workers, vista táctil móvil/escritorio, 999/33.333 celdas, selección/giro/cancelación de Frontera, mapas/rastro, iconos y cero peticiones Supabase. La emulación no sustituye una prueba física de iPhone. La SQL preparada continúa validándose sin publicar nuevas reglas online.
