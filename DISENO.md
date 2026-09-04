# Una constelación para Génesis

Dirección aprobada por el encargo: aventura de pixel art con los sprites existentes, siete corazones de colores en lugar de la vela, música del enlace de YouTube y acciones de ritmo. La portada será una escena viva de la ciudad con Génesis bajo una constelación de corazones. Durante el juego manda el escenario; la interfaz solo muestra lugar, objetivo, corazones y conversación.

Paleta: noche #141c36, tinta #0a1023, lavanda #8b92c9, pergamino #f8eccd, ámbar #f5bf69 y follaje #427e76. Los siete corazones aportan rojo, naranja, amarillo, verde, celeste, azul y violeta. Cielo y luz evolucionan con el viaje. Tipografía pixel para títulos cortos y una tipografía legible para diálogos.

Composición: escena horizontal en el centro, interlocutor y diálogo abajo, controles discretos arriba. El reproductor musical permanece visible cuando se usa YouTube y ocupa una columna propia en escritorio. En móvil se coloca debajo del escenario. Ninguna superposición tapará sus controles. Revisión del brief: conservar protagonistas y lugares con profundidad, evitando una sucesión de tarjetas o una calle plana.

La banda sonora solicitada es «Undertale All Human Soul Themes», video gCS3ow7lSZA, que sustituye al primer enlace por indicación del usuario. Se integra con el reproductor oficial, sin copiar el audio al proyecto. Su reloj controla el pulso; el tempo y el desfase son calibrables porque la API no entrega muestras de audio para detectar transitorios. Un archivo local opcional permite analizar audio y obtener una cuadrícula de pulsos por fragmentos. La melodía original de respaldo permite jugar cuando YouTube no esté disponible. No se afirma sincronización exacta de una grabación que no se pudo analizar.

Implementación: módulos JS y Canvas 2D a 480×270, atlas original de personajes con una escala común y pivote en los pies; interfaz HTML accesible. Ocho escenarios, siete encuentros musicales, paseo manual y automático, guardado, pausa, carta final, controles táctiles y movimiento reducido.

## Revisión del 3 de septiembre · segunda pasada

Se revisaron las capturas del juego ya construido y se corrigió lo que se veía mal en pantalla, sin tocar la historia ni las versiones anteriores.

- **La conversación ya no tapa a Génesis.** El mundo se eleva lo justo mientras alguien habla, medido a partir de la altura real del panel, así que ella y el suelo que pisa siguen a la vista en escritorio y en teléfono. Los fondos se dibujan más altos para que no aparezca ningún vacío al elevarse.
- **Panel de diálogo más bajo** (23 % en escritorio, 27 % en móvil), con más escenario visible.
- **Portada en teléfono legible**: título y subtítulo separados, bloques repartidos con `space-evenly` y un fondo algo más oscuro detrás del texto sobre la ciudad iluminada.
- **Encuentros musicales más claros**: carriles sólidos con zona de recepción marcada, aros de más contraste y una barra que muestra cuánto queda de la melodía.
- **Puente y amanecer**: el río devuelve reflejos de la ciudad y de la luna, la tarima tiene tablones y el pavimento del amanecer se vuelve cálido con el cielo. La luna es un creciente redondo y no dos bloques.

Comprobado en navegador: recorrido automático completo hasta la carta con los siete corazones, sin caídas en el puente, sin errores de página, guardado y pausa correctos, y **12,8 minutos de duración medida** en el modo historia. Las pruebas ahora reescriben siempre las capturas, verifican que nadie se caiga y que Génesis quede por encima del panel de conversación en móvil.

## Revisión del 4 de septiembre · el juego, jugado

La versión anterior se contaba sola: bonita, pero no había nada que hacer. Esta
pasada la convierte en el videojuego que pedía el encargo, sin tocar ni una
palabra de la historia ni perder lo que ya funcionaba.

- **Movimiento nativo.** Génesis se mueve de verdad: acelera, frena, salta 45
  píxeles con perdón de borde (coyote) y memoria de salto (buffer), y aterriza
  sobre cajas, rocas, piedras del arroyo y la tarima de la plaza. Los mismos
  mandos valen con teclado, con los botones de la pantalla y con un mando de
  consola; un toque muy corto no se pierde aunque caiga entre dos fotogramas.
- **Cinco actos con cosas que hacer.** Pedir el deseo abre la puerta del cuarto;
  del camino no se sale sin las cinco luces; de la plaza no se sale mientras
  alguien siga a oscuras. Por el camino hay cosas que mirar —la ventana, el
  regalo, la foto, el buzón, el banco— que no hacen falta pero cuentan más.
- **Nadie pierde.** No hay vidas ni derrota. Si se cae por el arroyo vuelve al
  suelo firme con un «Otra vez, sin prisa», y el viaje se guarda en cada paso
  importante: al volver, **Continuar mi viaje**.
- **El modo historia sigue ahí.** Quien juega solo usa exactamente los mismos
  mandos que una persona: camina, salta y pulsa. No se salta un paso, se para a
  mirarlo todo y dura 3,2 minutos, como la canción. Al tocar cualquier tecla,
  ella recupera el control.
- **El pastel está dibujado a mano**, punto a punto: dos pisos, crema que gotea,
  confites y una vela encendida que sólo se apaga —se suelta— cuando sopla.
- **La música es siempre la suya.** Se quitaron los botones de fuente y el
  archivo local: la canción de YouTube se conecta sola al empezar, y si no puede
  sonar entra la melodía del juego por detrás, sin avisos ni preguntas.
- **Para el teléfono.** Se instala como aplicación (manifiesto, iconos propios
  dibujados por código y trabajador de servicio), abre a pantalla completa,
  funciona sin internet y tiene sus botones táctiles bajo el escenario. Tocar el
  reproductor de YouTube ya no pausa la partida.

Comprobado: 14 pruebas en Node —incluida una partida entera del modo historia
que verifica que no falta ni una de las 37 frases, que se recogen las cinco
luces, que se reparten las cuatro y que nadie se cae— y una pasada en navegador
que juega el primer acto con el teclado de verdad, termina el resto solo, y
revisa el guardado, la pausa, el teléfono y los botones táctiles. Sin errores de
página.

## Revisión del 4 de septiembre · pantalla completa y las siete cualidades

Pasada sobre el juego ya jugable, a partir de lo que se veía mal en pantalla.

- **Pantalla completa siempre.** Fuera la barra lateral y los márgenes: el escenario ocupa el 100 % de la ventana y la interfaz flota encima. Al pulsar *Empezar* se pide además pantalla completa real. En una pantalla vertical el dibujo entra entero en vez de recortarse, porque un 16:9 recortado en vertical deja una rendija inservible; tumbado sí llena la pantalla.
- **Se cuenta sola por defecto**, con los textos grandes pasando solos (29 px en escritorio, 24 px en la carta). Mover las flechas sigue devolviendo el control al instante.
- **El paso, arreglado.** La fila de caminar de las hojas no venía en orden: midiendo la separación de los pies en cada dibujo salen dos poses abiertas (5 y 7) y dos cerradas (6 y 4). Puestas 4-5-6-7 los pies parecían quedarse quietos; alternando 5-6-7-4, con el cuerpo subiendo en la pose cerrada y una nubecita de polvo en la pisada, el paso por fin se lee.
- **La gente de la plaza ya no son ellos dos.** Salían de una tira de sprites que eran variantes de los protagonistas, y encima el guion usaba dos fotogramas *del mismo* personaje para dos vecinos distintos. Ahora los cuatro están dibujados a mano, con su estatura, su pelo, su ropa, su sombra y su brillo: Simón y su bastón, Nora y su moño, Lía y sus coletas, el guardián y su gorra. Cada uno tiene además su propio retrato en la conversación.
- **Él no se asoma antes de tiempo.** Iba por delante como una silueta en los actos II, III y IV; ahora sólo aparece en el amanecer, que es lo que cuenta la narración.
- **El amanecer, coherente.** Los edificios cercanos se quedaban en color de noche con el cielo ya rosa, y flotaban seis píxeles por encima de la acera: ahora reciben la luz del alba, apagan ventanas según amanece y se apoyan en el suelo. El sol tiene halo y núcleo en vez de ser un disco plano, y la acera tiene juntas de losa en vez de ser una franja lisa.
- **Un solo botón de música.** Había dos iconos de nota casi idénticos (silenciar y reproductor). Ahora el ♫ abre una pastilla mínima con el reproductor, el volumen, el enlace y el silenciador dentro.

**Las siete cualidades.** Las luces del camino pasaron de cinco a siete y son las mismas siete de las que habla la carta, una por párrafo y en orden. La carta se reescribió a partir de la que él ya le había escrito: es admiración por lo que ella es, no una declaración. El guardado sube a la versión 5 porque cambia de forma.
