# La odisea de Génesis · Una luz para ti

Una historia de pixel art que se cuenta sola, del tamaño de una canción.

Se abre, se pulsa **Empezar la historia** y ya está: Génesis camina, habla y sigue una lucecita
por la ciudad mientras suena la canción. No hay que jugar nada. Dura lo mismo que la música
(unos 3 minutos y 12 segundos) y termina con una carta.

## La historia

| Acto | Dónde |
| --- | --- |
| I · La espera | Su cuarto, el pastel y las sillas que se quedaron vacías |
| II · La chispa | La calle, y alguien que va por delante sin dejarse ver |
| III · La travesía | El camino donde recoge las luces que siempre fueron suyas |
| IV · Los otros | La plaza: reparte luz, y también le dan a ella |
| V · El amanecer | El que iba delante se detiene, y le entrega la carta |

## Cómo verla

- En línea: se publica solo con cada cambio en `main`.
- En local: `node server.mjs` y abrir `http://127.0.0.1:4177`.

## Cómo está hecho

- Canvas 2D a 480×270, JavaScript en módulos, sin dependencias.
- `src/story.js` — el guion. `src/timeline.js` — reparte el tiempo de la canción entre los pasos.
- `src/render.js` — los escenarios y los personajes. `src/audio.js` — la canción y la melodía de respaldo.
- `assets/` — las hojas de sprites originales y sus recortes con el punto de apoyo en los pies.
- `tests/` — el recorrido completo comprobado en navegador y las pruebas de la línea de tiempo.

La carta de San Valentín anterior ya no se publica. Sigue en el historial de git por si algún día hace falta.
