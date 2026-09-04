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

## Revisión del 4 de septiembre · paso, invitados y pantalla completa

Pasada sobre lo que se veía mal en pantalla, sin tocar la historia ni la banda sonora.

- **El paso, arreglado.** La fila de caminar de las hojas no viene en orden. Midiendo la apertura de las piernas en cada dibujo: caminar da 132-142-143-149 (sube y ya: no hay paso, sólo deriva) mientras que correr da 121-153-134-140 (cerrado-abierto-cerrado-abierto, correcto). A ras de suelo la separación de los pies al caminar es 26-36-14-37, así que las poses abiertas son la 5 y la 7 y las cerradas la 6 y la 4. Puestas 4-5-6-7 los pies parecían clavados; alternándolas 5-6-7-4, con el cuerpo subiendo en la pose cerrada, el paso se lee. El ciclo de correr ya estaba bien y no se tocó.
- **Los seis invitados ya no son ellos dos.** Salían de una tira de recortes que son variantes del mismo diseño que Génesis y Enmanuel: cambiaba la ropa, pero la cara, el pelo y la estatura eran iguales. Ahora cada uno se recolorea al cargar y se guarda en caché. El recoloreado va píxel a píxel a propósito: un filtro de tono sobre el recorte entero también gira la piel y deja las caras verdes —se probó y pasó—. Aquí lo cálido se reconoce como piel o pelo y no gira de color; la piel sólo cambia de matiz, el pelo se aclara u oscurece (negro, castaño, rubio, cobrizo) y sólo la ropa gira. Cada uno tiene además su propia estatura, que a este tamaño es lo que más distingue a una persona.
- **Pantalla completa de verdad.** El escenario llenaba la ventana sólo a lo alto y dejaba dos franjas negras a los lados. Ahora la llena entera; de pie sigue entrando completo, porque un 16:9 recortado en vertical deja una rendija inservible. Como el dibujo ya no coincide con la caja, la subida del mundo bajo el panel de diálogo se mide contra el dibujo real y no contra el escenario.
- **La carta deja de ser una felicitación.** Ya era la de las siete virtudes y ya era admiración por lo que ella es; sólo desentonaba el cierre. Ahora termina en «Te quiero por lo que eres» en vez de «Feliz cumpleaños».

**Dos fallos que ya venían de antes**, encontrados al pasar las pruebas:

- A Joel se le entregaba su don **antes de que hablara**: el atajo que existe para que al último le dé tiempo antes de acabar el acto se disparaba con que hablara Génesis en cualquier punto de la plaza. El aviso «Entregaste el don…» salía antes que su frase. Ahora el atajo exige haberle escuchado.
- La prueba de navegador buscaba un botón «Volver a caminar» que ya no existe; el botón se llama «Volver a ver la historia».

### Los invitados, en alta

Los seis seguían viéndose borrosos al lado de los protagonistas, y la causa era de resolución, no de filtros: sus recortes del atlas miden 15-20 x 42 px y había que **ampliarlos** para llegar a los 50 de alto, mientras que Génesis sale de 169 x 319 px y se **reduce**. Una diferencia de unas ocho veces: no hay filtro que invente esos píxeles.

El único arte en alta del repositorio son las hojas de los protagonistas, así que los invitados se construyen ahora desde ahí —tres desde la de ella, tres desde la de él— y se recolorean al cargar, guardando el resultado en caché.

Para que seis copias del mismo cuerpo no parezcan la misma persona hicieron falta tres cosas, y la segunda no era evidente:

1. **El pelo** se aclara u oscurece con un término que suma, no sólo multiplica: multiplicando, un castaño oscuro nunca llega a rubio.
2. **La ropa neutra hay que teñirla, no girarla.** Los protagonistas visten blanco y gris, con saturación casi cero, y a eso girarle el tono no le hace nada: por eso el primer intento dejó a los seis vestidos igual. Ahora lo que ya tiene color se gira y lo neutro recibe un tono propio.
3. **La estatura**, que a este tamaño es lo que más distingue a una persona de otra.

Dos trampas por el camino, las dos corregidas: un `hue-rotate` sobre el recorte entero gira también la piel y deja las caras verdes; y subirle la claridad al pelo sin tope revienta a blanco los brillos de la cara, porque no todo lo claro de la cabeza es pelo.
