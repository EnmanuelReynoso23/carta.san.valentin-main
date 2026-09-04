# La odisea de Génesis · dirección visual

## Concepto

La experiencia ya no se presenta como una página con un juego incrustado, sino
como una pequeña película de pixel art a pantalla completa. La interfaz queda
reducida a una firma, el capítulo actual, pausa, sonido, música y pantalla
completa. El lienzo siempre es el protagonista.

El motivo narrativo es una presencia que cuida sin dejarse ver. Enmanuel va
delante de Génesis, pero durante el trayecto no se dibuja ninguna silueta
humana: solo reaccionan la luz, los charcos, las hojas y el aire. Su sprite se
revela exclusivamente en el último acto.

Las siete almas representan Amabilidad, Justicia, Valentía, Perseverancia,
Integridad, Paciencia y Determinación. No son premios externos: cada una es un
don que ya vive en Génesis. El encabezado muestra cuáles lleva y cuáles
compartió, después de escuchar, con los seis invitados de la plaza.

## Sistema visual

- Azul tinta: #081125
- Noche: #111a36
- Ciruela: #4d355d
- Oro de luz: #ffd58a
- Coral de amanecer: #eaa183
- Menta espectral: #9fe3c8
- Papel de carta: #fff0d4

Los títulos y nombres usan una voz pixel corta. La narración usa una tipografía
de lectura clara, y la carta final cambia a Georgia para sentirse física y
personal. No hay tarjetas decorativas ni una columna lateral permanente.

## Puesta en escena

La historia recorre siete lugares:

1. habitación;
2. callejón de las ventanas;
3. barrio comercial;
4. jardín;
5. puente;
6. plaza;
7. mirador del amanecer.

Cada lugar combina arte del atlas con capas dibujadas en Canvas: cielo, colinas,
ciudad distante, edificios cercanos, suelo y primer plano. Las capas se mueven
a velocidades distintas. Estrellas fugaces, nubes, guirnaldas, reflejos,
fuentes, cintas, plantas, luces y partículas evitan que el escenario se congele.

En escritorio el fotograma 16:9 ocupa la ventana completa. En teléfonos
verticales se usa un recorte cinematográfico centrado dinámicamente en Génesis,
de modo que el personaje siempre permanece visible y el pixel art conserva
presencia en lugar de reducirse a una franja horizontal.

## Ritmo y sonido

La película dura 192 segundos. La pista original incluida en
assets/una-luz-para-ti.ogg también dura 192 segundos y es la fuente
predeterminada. La posición real del audio determina el progreso; al pausar la
música se pausa la narración.

Al aparecer la carta, la historia deja de avanzar pero la banda sonora continúa
en bucle. Si la reproducción local es bloqueada, la síntesis toma el relevo sin
dejar detenido el relato.

El diálogo recibe más tiempo que los desplazamientos: ninguna línea supera 21
caracteres por segundo y el efecto de escritura termina al inicio de cada turno
para dejar el texto completo visible durante la mayor parte de su duración.

El reproductor oficial de YouTube sigue disponible como alternativa para la
canción elegida, y existe una síntesis en tiempo real como último respaldo. La
grabación de terceros no se copia dentro del repositorio.

## Revisión visual

Se comprobaron en navegador la portada, habitación, callejón, jardín, puente,
plaza, revelación del amanecer, carta final y el encuadre móvil. La banda sonora
incluida se precarga y reproduce tras el gesto inicial. No aparecieron errores
de consola en la pasada final.
