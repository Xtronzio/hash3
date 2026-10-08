# Incidencia proporcional de fauna y obras

Fecha: 8 de octubre de 2026. Estado: cálculo inicial y propuesta de calibración; no aplicado a R0.21.12. La aclaración posterior de Jorge sustituye la propuesta temporal para roedores y la retirada del gusano: véase la actualización al final. Las tablas originales quedan como referencia histórica, no reglas vigentes.

## Origen del 198

El mínimo común múltiplo de 33, 66 y 99 es 198. En esa colocación coinciden las tres apariciones. El asistente reutilizó ese valor como frecuencia de OBRA. Es una elección de implementación, no una cifra solicitada por Jorge ni una deducción del equilibrio de constructores/destructores. El reloj de los obreros es de 33 segundos; 198 solo determina el nacimiento de un proyecto.

## Incidencia actual

Cada jugador genera, por 198 colocaciones aceptadas:

| Tipo | Apariciones | Capacidad por aparición | Capacidad total |
|---|---:|---:|---:|
| Roedor | 6 | 3 fichas | 18 fichas |
| Bomba | 3 | Hasta 3 fichas | Hasta 9 fichas |
| Gusano | 2 | 3 fichas | 6 fichas |
| Total | 11 | | Hasta 33 fichas |

33 / 198 = 1 / 6 = 16,67 % de las fichas colocadas. Es capacidad máxima atribuible a esos nacimientos, no consumo inmediato ni garantizado: faltan ciclos, alimento adyacente o fichas dentro de explosiones; algunos habitantes pueden permanecer esperando. No es un porcentaje por segundo. La fauna actual escala con las colocaciones, no con la superficie de una partida de actividad fija.

Una OBRA tiene 3 parejas y 3 ciclos: construye hasta 9 celdas y destruye hasta 9 celdas vacías. El balance de superficie es cero. Mayor cantidad de obreros aumenta la transformación del mapa; no controla su crecimiento neto.

## Por qué no basta multiplicar todos los nacimientos

Tomando 333 celdas como referencia provisional, un multiplicador sin límite N / 333 retiraría potencialmente 33 × N / 333 fichas por cada 198 colocaciones. A partir de 1.998 celdas esa capacidad iguala las 198 colocaciones; a mayor superficie la supera. Las limitaciones de alimento impiden ejecutar toda esa capacidad, pero quedarían generaciones esperando. No usar ese multiplicador de nacimientos como controlador de población.

## Propuesta: población por superficie y reposición

Referencia de calibración elegida para pruebas, no equilibrio demostrado: por cada 333 celdas activas, 3 roedores, 1 bomba, 1 gusano y 3 parejas constructor/destructor. Las capacidades individuales siguen siendo de 3 y el ciclo sigue siendo de 33 segundos.

Con N celdas de la zona activa y m = N / 333:

- Roedores objetivo: 3m.
- Bombas pendientes objetivo: m.
- Gusanos objetivo: m.
- Parejas de obreros objetivo: 3m.

| Celdas activas | Roedores | Bombas | Gusanos | Parejas de obreros | Construidas y eliminadas por 3 ciclos |
|---:|---:|---:|---:|---:|---:|
| 333 | 3 | 1 | 1 | 3 | 9 + 9 |
| 999 | 9 | 3 | 3 | 9 | 27 + 27 |
| 2.997 | 27 | 9 | 9 | 27 | 81 + 81 |
| 8.991 | 81 | 27 | 27 | 81 | 243 + 243 |

Se cuentan parejas, no proyectos ni individuos: 3 parejas son 3 constructores y 3 destructores. Las cifras de fauna son poblaciones objetivo mantenidas, no nuevas generaciones en cada ciclo. La reposición solo cubre vacantes tras la retirada/explosión; no suma indefinidamente encima de habitantes existentes.

### Incidencia temporal de la propuesta

Con alimento continuo y reposición sin retraso, en régimen estable:

- Cada roedor come 1 ficha por ciclo y se sustituye después de 3 comidas.
- Cada bomba puede retirar 3 fichas por ciclo y se sustituye después de explotar.
- Cada gusano come 3 fichas en 4 ciclos: el cuarto es su retirada. La media ideal por gusano activo es 3/4 de ficha por ciclo.

Capacidad media ideal por ciclo de 33 segundos: 3m + 3m + 0,75m = 6,75m fichas. Dividiendo por N = 333m resulta 6,75 / 333 = 2,027 % de la superficie por ciclo. En 99 segundos, la media ideal es 6,081 %. Son medias de régimen estable y capacidades máximas; no garantizan ese consumo en cada intervalo ni en una zona vacía. Si las generaciones nacen sincronizadas, las comidas también oscilan.

Los obreros mantenidos realizan hasta 3m construcciones y 3m eliminaciones por ciclo, o 9m + 9m por 99 segundos. Cada dirección transforma el 2,703 % del terreno en tres ciclos y el tamaño neto permanece igual.

La proporción propuesta entre especies es una nueva calibración sencilla en escala del 3, no una reproducción de las frecuencias relativas ni de las poblaciones simultáneas de los hitos antiguos. Hay que medir su efecto con distintas velocidades de colocación antes de adoptarla.

### Requisitos de implementación y prueba

1. Contar celdas construidas reales; excluir huecos y proyectos todavía no construidos. Compartir un único presupuesto por zona activa, evitando multiplicar el mismo tablero por sus jugadores. Si se separan o unen zonas, redistribuir los cupos sin repetir nacimientos.
2. Mantener el factor lineal también entre los tamaños de la tabla. Usar crédito fraccionario persistente o alternancia de cupos; no saltar exclusivamente entre potencias de 3, porque la densidad caería durante cada tramo. Los tableros menores de 333 necesitan cupos enteros intermitentes y entrada gradual, no redondear todos los tipos hacia arriba desde el 3×3 inicial.
3. Limitar entradas por alimento legal, disponibilidad de explosiones y suficientes celdas vacías para obras. No crear generaciones pendientes sin límite. Respetar fronteras y reservas. Una superficie casi vacía tendrá una incidencia efectiva inferior a la capacidad máxima calculada.
4. Conservar las pausas y la ausencia de recuperación de ciclos atrasados. Reponer gradualmente mientras la zona esté activa; al abrir un guardado no ejecutar una ráfaga de comida o explosiones.
5. Al disminuir la superficie por cataclismo, recalcular los cupos. Los supervivientes sobrantes no se reponen; resolver por separado los habitantes directamente afectados por la demolición.
6. Medir población simultánea, fichas efectivamente consumidas, ocupación, tiempo de simulación y capacidad de mantener actividad humana. Comparar 333/999/2.997/8.991 celdas con distinta ocupación, ritmo de juego y número de jugadores. La incidencia respecto de nuevas colocaciones depende del ritmo; no será constante además de ser constante por superficie y por tiempo.
7. Consultar índices por snapshot en la pantalla. No añadir recorridos de fauna/terreno completos durante arrastre o pellizco. Representación agrupada en mapas y detalle limitado a pantalla más 2 celdas.

## OVNI y cataclismo

Requisito confirmado por Jorge: ambos afectarán una zona extensa y se incorporarán próximamente.

- OVNI: retira fichas dentro de la zona; no elimina ninguna celda. Controla ocupación, no superficie.
- Cataclismo: elimina celdas y sus fichas en toda la zona afectada. Es el mecanismo para controlar la superficie.

La extensión debe aumentar con el tablero. Falta definir el porcentaje y la frecuencia. Para controlar tamaño, las celdas demolidas por unidad de tiempo deben compensar el crecimiento neto por ampliaciones; para reducirlo, deben superarlo. Más obreros equilibrados no aportan esa reducción. Conservar los criterios de navegación y definir continuidad de zonas, anclajes, fronteras y reservas antes de activar estos eventos.

## Actualización posterior: personalidad de roedores y tres inventarios

Jorge aclara que los roedores no usan tiempo. Cada hito propio de 33 colocaciones aumenta su grupo: 1/2/3 a las 33/66/99, y sucesivos. Durante tres movimientos jugados del territorio, cada roedor aparece, consume una ficha y desaparece en cada visita, usando sitios distintos. El movimiento que activa el hito cuenta como la primera visita. Capacidad por grupo: hasta 3/6/9 fichas. Solo consumen alimento legal existente, excluyen la ficha recién colocada y la #, y las visitas sin alimento no se acumulan. Esto reemplaza la propuesta anterior de población temporal para roedores.

El gusano se retira inmediatamente con su tercera comida. Con alimento continuo son 3 ciclos/99 segundos, no 4 ciclos/132 segundos; el cálculo anterior de consumo por gusano activo de 0,75 por ciclo ya no se aplica.

Por 198 colocaciones de un jugador, los seis grupos de roedores tienen tamaños 1+2+3+4+5+6=21 y capacidad de hasta 63 comidas, más hasta 9 de bombas y 6 de gusanos: 78/198=39,39 % de las colocaciones, una vez completadas todas las visitas y los ciclos con alimento suficiente. Esta incidencia teórica cambia con el hito; no equivale a un consumo garantizado ni a un porcentaje temporal fijo. La nueva regla de hitos es explícita y debe medirse al probar partidas largas. La calibración por superficie de los otros habitantes/cartas todavía está pendiente.

Los grupos conceptuales son inventario del jugador, fauna local e inventario del territorio. Lluvia de bombas, #, OVNI y cataclismo son cartas automáticas del territorio. Obreros, roedores y gusanos son habitantes. OVNI/cataclismo siguen pendientes de desarrollo. Mantener animaciones breves y elementales para explicar las acciones sin romper el minimalismo ni el rendimiento.
