# R99 · Prueba del logo y desenfoque superior

Jorge observa desenfoque en hall, pausa y tablero, posiblemente desde actualizar
iOS, y autoriza probar texto en lugar del SVG. La causa no está confirmada.

Se usa un span de texto real #33 en esas tres cabeceras. La caja conserva la
proporción 252/112 del maestro y las alturas anteriores (hall 38/42 px; tablero
28/32 px o 22 px en horizontal bajo; pausa 36,4 px). Texto Arial blanco, sin
filtro, sombra ni animación propia. Se conservan el resto del diseño, safe areas,
viewport, maestro SVG, iconos y manifest. Otras cabeceras siguen usando el SVG.

No se combina con la propuesta de franja opaca superior, para aislar la variable.
No modifica motor, reglas, territorio R98, persistencia, online ni SQL.

La QA del navegador sustituye momentáneamente el texto por el SVG original,
compara las cajas del logo/cabecera/controles y restaura el texto sin escribir
datos. Comprueba las tres pantallas en Original e Inverso, seis tamaños y tres
motores; captura ambas representaciones en móvil y verifica conservación de
partidas. El pipeline completo continúa siendo requisito para publicar.

R0.21.99 / 20261023-r310 es una prueba reversible. La ausencia de desenfoque en
un navegador emulado no valida su desaparición en iOS. Jorge debe comparar la
app instalada en su iPhone y confirmar el resultado antes de concluir la causa.
