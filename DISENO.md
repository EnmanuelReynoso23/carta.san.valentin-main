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
