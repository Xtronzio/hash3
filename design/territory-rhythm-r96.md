# Ritmo del territorio · R0.21.96

Jorge21/10 pide término medio, autoriza implementar y seguir calibrando jugando.
R95 corregía el silencio de tableros densos, pero llenaba toda familia libre:
en tres secuencias de120turnos hubo48–54anuncios, actividad120/120 y coincidencia
117–118/120. Esas pruebas comprobaban legalidad, no descanso.

La decisión incluye esperar, con probabilidad dependiente de densidad. Se evalúa
como máximo una vez por turno ecológico aceptado, sin tirar de nuevo por cada
carta. Primera ampliación y requisitos legales R94 siguen vigentes. La reserva
porcentual eliminada en R95 no vuelve: nueve huecos permiten decisiones.

Memoria rhythm.version1 dentro del director: load0..33, último turno observado,
última decisión, episodio0..2 y hasta12identidades de informes ya vistos.
Anunciar añade2/4por pequeño/grande más hasta2por huella prevista relativa al
tamaño. Cada respuesta completa recupera0,9+0,6×fracción libre. Cada impacto nuevo
añade sqrt(celdas afectadas únicas/3), máximo4; se unen las coordenadas de los
informes de fauna/meteo para no duplicar una intervención. Ocultamiento también
requiere atención. No cobrar informes históricos ni extrapolar turnos cerrados.

Para un episodio nuevo, carga0 y sorteo .25+.45×densidad. Para una segunda
intervención compatible, carga≤1 y sorteo .12+.18×densidad; máximo dos anuncios
por episodio, sin sustituir a uno terminado mientras continúe el otro. La carga
se sigue recuperando durante avisos/efectos y aumenta cuando realmente impactan.
Una vez vacía la actividad y recuperada la carga puede decidir de nuevo. Estos
coeficientes son un primer ajuste medido, no el equilibrio definitivo prometido.

Preaviso3, duraciones, zonas comprometidas, cantidades, protecciones, puntos y
opciones de fauna/fenómenos conservados. Tablero lleno mantiene prioridad de
ampliación. Cartas, ampliación, Doble parcial, pausa, tick inactivo y cámara no
recuperan carga. Doble completo una respuesta. No consultar marcador, identidad
humana o dificultad para favorecer participantes.

Guardados R94/R95 adoptan al aceptar acción: informes presentes se marcan ya
vistos; actividad heredada termina antes de añadir otra. Persistir pausa/traslado,
validar carga/cotas/turnos sin futuros, conservar finales. ruleVersion27 separa
resultados nuevos. Solo Original local/máquina; Inverso y servidor no cambian.

scripts/simulate-territory-r96.mjs usa comandos reales y varias semillas. Criterios
amplios de regresión: actividad30–80%, coincidencia≤25%, calma de3..33acciones
en los casos probados y menos de un anuncio por cada tres acciones. Son umbrales
del ensayo, no fechas programadas ni garantía de experiencia humana. Medidas
iniciales:49–68%activo y1–9%coincidencia en partidas medianas;33.333 usa33acciones
por coste y no demuestra equilibrio de una partida larga. Validar además motor,
traslado y UI en Chromium/Firefox/WebKit, seis tamaños emulados, sin atribuir
prueba física a Safari/iPhone.
