# La odisea de Génesis · Una luz para ti

Una aventura de pixel art que se juega: Génesis camina, salta, habla, recoge sus
luces y las reparte hasta llegar al amanecer, donde le espera una carta.

Se abre, se pulsa **Empezar mi aventura** y ya se puede caminar. Si algún día
prefiere solo mirar, el botón **▶ Historia** hace que se cuente sola —dura casi
lo mismo que la canción— y en cuanto se toca una tecla vuelve a mandar ella.

## Cómo se juega

| | Teclado | Teléfono | Mando |
| --- | --- | --- | --- |
| Caminar | ← → · A D | botones ◀ ▶ | cruceta o palanca |
| Saltar | ↑ · W · espacio | botón ▲ | A |
| Hablar y mirar | E · Enter · ↓ | botón ✦ | B / X / Y |
| Pausa | Escape | ✦ de arriba | — |
| Que se cuente sola | H | botón ▶ Historia | — |

El viaje se guarda solo: al volver aparece **Continuar mi viaje**. Nadie pierde
nunca: si se cae por el arroyo, vuelve al suelo firme y sigue.

## La historia

| Acto | Dónde | Qué se hace |
| --- | --- | --- |
| I · La espera | Su cuarto, el pastel y las sillas vacías | Mirar lo que dejó preparado y pedir el deseo |
| II · La chispa | La calle despierta | Seguir la lucecita hasta el final de la avenida |
| III · La travesía | El camino de las luces | Recoger las cinco luces, saltando el arroyo |
| IV · Los otros | La plaza | Dar una luz a cada persona que está a oscuras |
| V · El amanecer | El cielo cambiando | Alcanzarlo y quedarse con la carta |

## Música

Siempre suena la canción que ella eligió, *Undertale All Human Soul Themes*, con
el reproductor oficial de YouTube: se conecta sola al empezar y no hay nada que
elegir. Si el vídeo no puede sonar —sin internet, o porque el navegador lo
bloquea— entra por detrás la melodía del propio juego, sin avisar ni pedir nada.

## En el teléfono

Se puede instalar como una aplicación: **Añadir a la pantalla de inicio** en
Android. Entonces se abre a pantalla completa, con sus botones táctiles, y sigue
funcionando aunque no haya internet (el arte se guarda en el teléfono).

## Cómo verla

- En línea: se publica solo con cada cambio en `main`.
- En local: `npm start` y abrir `http://127.0.0.1:4177`.

## Cómo está hecho

- Canvas 2D a 480×270, JavaScript en módulos, sin dependencias para jugar.
- `src/logic.js` — la física del salto, el mapa sólido y el guardado, sin pantalla.
- `src/story.js` — el guion y los cinco escenarios. `src/game.js` — el mundo y lo que se puede tocar.
- `src/input.js` — teclado, botones táctiles y mando en un solo gesto. `src/auto.js` — quien juega solo en modo historia.
- `src/render.js` — los escenarios y los personajes. `src/audio.js` — la canción y la melodía de respaldo.
- `assets/` — las hojas de sprites originales y sus recortes con el punto de apoyo en los pies.
- `manifest.webmanifest` y `sw.js` — lo que la convierte en aplicación instalable.

## Pruebas

- `npm test` — la aventura entera jugada en Node: física, salidas cerradas, guardado, y una partida completa del modo historia comprobando que no falta ni una frase.
- `npm run test:navegador` — con el servidor levantado: juega el primer acto con el teclado de verdad, termina el resto en modo historia y guarda capturas en `artifacts/`. Necesita `npm install` (Playwright).
- `npm run test:cancion` — comprueba que la canción de YouTube se conecta sola. Sólo tiene sentido en una red que permita YouTube.
