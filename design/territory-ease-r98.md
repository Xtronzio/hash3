# R0.21.98 · Un poco menos de presión

Jorge23/10 solicita aflojar la intensidad que sigue percibiendo en R97/r308.
Base198ec714b1c0551c21b36fc4337ec54e874ac104; respaldo remoto
backup/pre-territory-ease-r97-20261023. Solo Original local/VS máquina.

## Ajuste

El territorio espera algo más antes de iniciar un episodio o añadir su único
acompañante compatible. Para ocupación d: disposición inicial pasa de.25+.45d
a.20+.35d, y de.12+.18d a.08+.12d con otro efecto presente. Un anuncio nuevo
añade3/5 de carga pequeño/grande en vez de2/4, más la huella prevista existente.
Así una intervención deja algo más de recuperación antes de la siguiente.

Se conserva el cálculo contextual: no hay un calendario fijo nuevo. Misma
recuperación por respuesta, carga de impacto real, límite de dos por episodio,
selección/tamaño de efectos y prohibición de dos grandes simultáneos. Siguen
aviso3, regiones comprometidas, cantidades, duraciones, protecciones y puntos.
Tablero lleno sigue completando ampliación antes de limpiar; ampliar no
adelanta avisos ni recupera carga. Doble parcial/cartas/pausa/reloj tampoco.

## Guardados

Reglas29 separan resultados posteriores. Una activa o pausada conserva su carga,
episodio, últimas decisiones, avisos y efectos anunciados; las nuevas decisiones
aplican los coeficientes nuevos. No existe migración de carga, borrado de avisos,
ataque histórico ni reinicio de partida. Finales mantienen su comparación previa.
Inverso, SQL, cron y servicios online no se modifican.

## Comprobación

scripts/simulate-territory-r96.mjs --compare-r97 compara exactamente las doce
muestras de180acciones R97: tamaños9/99/450densas/999, semillas33/94/333. Exige
una reducción moderada agregada de anuncios y actividad, menos coincidencia,
actividad/calmas dentro de las bandas R96 y crecimiento en partidas nuevas.
La muestra33333/33acciones comprueba invariantes y coste, no equilibrio prolongado.
Resultados en benchmarks/territory-ease-r98.json; juego sembrado sintético, no
prueba humana ni de dispositivo físico.

Medición: anuncios267→235 (-12,0%); acciones con actividad1284→1081 de2160
(59,4%→50,0%); coincidencias90→41 (4,2%→1,9%); ampliaciones42→47 en las muestras.
Las diferencias de trayectorias aleatorias impiden prometer esas cifras para
cada partida. No se persigue una reducción monótona en cada semilla concreta.

La prueba visual R94 se siembra con.1 para conservar su escenario de fauna
pequeña + fenómeno grande anunciado. Su propósito es comprobar avisos, pausa y
ampliación de compromisos reales; la elección de esperar se mide en la simulación
comparada y en las regresiones R96 existentes. Resto del pipeline completo.

El diagnóstico del desenfoque superior iOS es independiente y no se implementa
en esta entrega.
