# La odisea de Génesis · Una luz para ti

Una película interactiva de pixel art que se cuenta sola y dura exactamente lo
mismo que su banda sonora: **3 minutos y 12 segundos**.

Se abre, se pulsa **Empezar la historia** y ya está. Génesis camina, habla,
recoge luces y atraviesa la ciudad mientras el escenario cambia con la música.
No hay controles que aprender ni acciones que puedan detener la historia.

La historia parte del cumpleaños que nadie recordó. Una llama guía a Génesis
hasta siete almas de luz —Amabilidad, Justicia, Valentía, Perseverancia,
Integridad, Paciencia y Determinación—. Cada una representa un don que ya vive
en ella. En la plaza escucha a los seis invitados que faltaron y después
comparte un don con cada uno; Determinación permanece y conduce a la carta.

## El viaje

| Acto | Lugar |
| --- | --- |
| I · La espera | La habitación de las promesas |
| II · La chispa | El callejón de las ventanas |
| III · La señal | El barrio que seguía despierto |
| IV · La travesía | El jardín de las luces perdidas |
| V · El puente | El puente sobre la ciudad |
| VI · Los otros | La plaza de los otros |
| VII · El amanecer | El mirador donde Enmanuel por fin se deja ver |

Durante el camino Enmanuel permanece invisible y siempre va unos pasos por
delante. Solo deja alteraciones de luz en el entorno. Su personaje aparece por
primera vez en el amanecer, justo antes de entregar la carta.

## Música

El archivo **assets/una-luz-para-ti.ogg** es una banda sonora chiptune original
incluida en el repositorio. Se precarga con la página, funciona sin YouTube y su
reloj controla la historia completa.

La pista no se corta al cambiar de escenario y continúa en bucle mientras se
lee la carta. Si el navegador no permite reproducir el archivo, la síntesis de
respaldo toma el relevo automáticamente para que el recorrido no se detenga.

Desde el panel de música también se puede elegir:

- la canción solicitada mediante el reproductor oficial de YouTube;
- una melodía sintetizada de respaldo, sin archivos externos.

El audio de YouTube no se copia ni se redistribuye dentro del proyecto.

## Cómo verla

- En línea: cada cambio en main se publica automáticamente.
- En local: ejecutar **node server.mjs** y abrir http://127.0.0.1:4177.
- **F** activa la pantalla completa y **Escape** pausa la historia.

## Cómo está hecho

- Canvas 2D a 480 × 270, escalado sin suavizado para conservar el pixel art.
- Siete entornos con parallax, luces, reflejos, viento, partículas y amanecer.
- Seis invitados con sprites propios y siete almas con colores distintos.
- Ciclos de caminar anclados a los pies y pequeños rastros de cada paso.
- Diálogos temporizados para no exigir más de 21 caracteres por segundo.
- **src/story.js** contiene el guion.
- **src/timeline.js** reparte el viaje dentro de la duración real de la pista.
- **src/render.js** dibuja fondos, personajes y animaciones.
- **src/audio.js** administra la pista incluida, YouTube y el respaldo sintetizado.
- **tools/generate-soundtrack.mjs** regenera la banda sonora original.
- **npm test** comprueba duración, escenas, transiciones, sprites y audio.

La carta de San Valentín anterior ya no se publica. Sigue disponible en el
historial de Git.
