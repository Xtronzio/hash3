# El territorio decide · R0.21.94

Acuerdo de Jorge21/10: partidas de33segundos con turnos obligatorios de3segundos,
incluida ampliación automática; las restantes conservan su reloj. Mantener
pausa, traslado, tiempo total y originales; adoptar guardados rápidos sin
alargar el plazo restante. Separar resultados nuevos mediante reglas26.

En Original local/VS máquina, el territorio decide apariciones por ocupación,
espacio, presión activa, variedad y cambios aceptados del tablero. No usar
intervalos de33/66/etc como disparadores. Una familia meteorológica y una de
fauna como máximo; grande+pequeña es válido, grande+grande no. Plagas, rinos,
anaconda y promociones de obras son grandes. Preservar actuaciones/duración
propias, aviso de3turnos completos, regiones anunciadas y cantidades publicadas.

Decidir después de una reacción real: colocación, herramienta que modifica
tablero/protección o ampliación completada. No decidir por lecturas, cámara,
pausa o tiempo. Aleatoriedad acotada entre candidatos viables, sesgo a variedad;
sin consultar marcador, dificultad o identidad humana para favorecer jugadores.
Un candidato imposible se omite sin cola ni ráfagas posteriores.

Primera construcción inicial antes de limpiar. Al llenarse el tablero o quedar
una ampliación obligatoria pendiente, suspender impactos/limpiezas del entorno
y conservar sus avisos hasta completar ampliación. No cancelar ni sustituir sus
regiones. Reanudar después del crecimiento; ampliación no consume un turno de
aviso. Las acciones voluntarias del inventario conservan sus reglas.

Migrar activas/pausadas a futuro, respetar avisos heredados aunque se solapen y
no añadir más presión hasta que se normalicen. Guardar decisión/historial
acotados y validarlos al trasladar. No calcular política desde pan/relojes.
No inventar cuentas de aparición futura: mostrar sin fecha hasta anuncio.
Inverso, online y SQL aislados. Avisos nuevos/menú contextual de celda se harán
en la siguiente fase solicitada por Jorge.

Corrección R95: no reservar un porcentaje de huecos para decidir apariciones.
En450celdas el6% exigía27huecos y una ampliación solo añadía9; el territorio
podía quedar permanentemente silencioso. La espera de crecimiento se aplica
solo al tablero sin colocaciones o con ampliación obligatoria pendiente. Tras
ampliar puede anunciar con sus3turnos de reacción, sin limpieza inmediata.
