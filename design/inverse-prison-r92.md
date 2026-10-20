# Inverso: cárcel y desorden · R0.21.92

Acuerdo de Jorge del20/10/2026: cárcel de tres turnos del rival al vencer el
plazo propio3..33 sin cobrar y habiendo declinado una oportunidad de puntuar.
Registrar la oportunidad antes de cualquier carta/acción del turno; una figura
recién creada al colocar no constituye una oportunidad pasada. Aceptar un cobro
con puntos reinicia el ciclo. Cero no lo reinicia. Sin oportunidad previa, la
cuenta agotada espera. No convertir antiguos enjambres en faltas históricas.

Las fichas del símbolo preso quedan inmóviles y protegidas: ni cartas dirigidas
ni Bomba/Tornado ni erosión/desorden las alteran. Efectos de ficha forzada de ese
símbolo esperan a su salida. El turno pasa automáticamente al jugador libre.
Tres turnos reales completados por el rival liberan al preso y sortean otro
plazo. Doble cuenta una vez; inventario/trueque/pausa/navegación/tiempo no cuentan.

Si el jugador libre recibe una condena, descontar primero el turno real recién
completado de la condena rival; después compensar el mínimo común de ambas.
Ejemplos en el instante de compensar:2/3→0/1;1/3→0/2;3/3→0/0. La compensación
no representa jugadas: no mueve fichas ni contorno, concede premios o adelanta
relojes. El turno pendiente lo recibe un jugador libre. Nunca persistir dos
condenas positivas después de resolver el comando.

Con rival preso, tablero lleno y ningún cobro propio posible, el jugador libre
puede pasar explícitamente. Es un turno real sin ficha/puntos/recarga, también
para IA y reloj automático. Permite cumplir la condena aunque no se pueda tocar
ninguna ficha protegida; no habilita pases libres en otras situaciones.

Desorden independiente: cada66turnos compartidos reales, tres de aviso,
seleccionar una región por lados de hasta33celdas con una ficha como semilla.
Solo terreno original; excluye celdas con presos. Publicar claves concretas;
volver a excluir presos al impactar, sin sustituir las celdas bloqueadas.
Barajar fichas y huecos, conservando id/signo/propietario/cantidad, relleno,
puntuaciones e inventarios. Sin cobros automáticos. Actualizar referencias de
última puesta por id. Reutilizar animación de mezcla; cargas/pausa no la repiten.

Persistir inversePrison(version1) e inverseDisorder(version1), validarlos en
traslados y distinguir resultados. Guardados activos adoptan desde su siguiente
acción aceptada; plazo previo preservado, oportunidad falsa, condena0. Históricos
terminados y modalidades automáticas1/2 no cambian. Original y online intactos.

Comprobar casos de condena/compensación, oportunidad/última colocación, carta
preparatoria/Doble/cobro0, IA y reloj automático, protecciones de área, pausa,
traslado, geometría33333, interfaces en tres motores y seis tamaños y pipeline.
