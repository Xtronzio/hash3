# Identidad aprobada: C sin marco

Jorge eligió C el 13 de octubre de 2026, usando la versión logotipo sin marco
en todas las superficies. Blanco sobre fondo oscuro, sin X/O ni líneas de color.

`master.json` contiene la geometría única. `src/brand.js` compone #3, #33 y
#333 con los mismos signos, altura y separación. Los SVG de esta carpeta son
exportaciones para la familia futura; no activan otros juegos ni modalidades.

Regenerar con `python scripts/create-brand-c.py` (Node, fontTools y Pillow).
El script rasteriza ese mismo SVG para todos los PNG y el ICO, y actualiza
los cuatro nombres estándar de compatibilidad en la raíz pública.

`public/icons/` contiene solo nueve recursos del #33 vigente: logotipo SVG,
icono SVG sin marco, PNG 16/32/48/180/192/512 y un ICO multirresolución.
Los tamaños son adaptaciones técnicas del mismo diseño. No dibujar bordes
ni esquinas de dispositivo dentro de los iconos: el sistema aplica su máscara.

Las variantes históricas se conservan en Git, fuera de los recursos publicados.
Mantener `/hash3/`, las claves de guardado y manifest `id/scope/start_url`.
Una URL nueva de icono ayuda a evitar reutilizar el recurso anterior, pero no
garantiza renovar favoritos existentes de Safari sin prueba en el dispositivo.
