# La odisea de Génesis · Una luz para ti

Una aventura de pixel art a pantalla completa. Génesis camina, salta, habla,
recoge sus siete luces y las reparte hasta llegar al amanecer, donde le espera
una carta sobre quién es ella.

Se abre, se pulsa **Empezar mi aventura** y **se cuenta sola de principio a
fin**: los textos van pasando solos y no hay que tocar nada. Si en algún momento
prefiere tomar el control, basta con moverse con ← → (o pulsar **✋ Jugar yo**),
y desde la portada está el botón **Prefiero jugarlo yo** para empezar así.

El juego ocupa siempre toda la pantalla: no hay barra lateral ni márgenes. Todo
—los botones, el objetivo, la conversación— flota sobre el escenario.

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

| Acto | Dónde | Qué pasa |
| --- | --- | --- |
| I · La espera | Su cuarto, el pastel y las sillas vacías | Mirar lo que dejó preparado y pedir el deseo |
| II · La chispa | La calle despierta | Seguir la lucecita hasta el final de la avenida |
| III · La travesía | El camino de las luces | Recoger las siete luces, saltando el arroyo |
| IV · Los otros | La plaza | Dar una luz a cada persona que está a oscuras |
| V · El amanecer | El cielo cambiando | Alcanzarlo y quedarse con la carta |

Él va siempre por delante sin dejarse ver: **no aparece en ningún acto hasta el
último**. Sólo al amanecer se detiene y se deja alcanzar.

## Las siete cualidades

Las siete luces del camino son siete cosas de ella, y son las mismas siete de
las que habla la carta del final —una por párrafo, en orden—: las noches que no
duerme, el esfuerzo que nadie le ve hacer, la fuerza que se fue haciendo, su
manera de cuidar a los demás, la valentía de seguir batallando, ser ejemplo sin
proponérselo y las ganas que todavía le quedan.

La carta no es una declaración: es admiración por lo que ella ya es.

## Música

Siempre suena la canción que ella eligió, *Undertale All Human Soul Themes*, con
el reproductor oficial de YouTube: se conecta sola al empezar y no hay nada que
elegir. El reproductor vive en una pastilla mínima detrás del botón **♫** de
arriba, para que el juego ocupe toda la pantalla. Si el vídeo no puede sonar
—sin internet, o porque el navegador lo bloquea— entra por detrás la melodía del
propio juego, sin avisar ni pedir nada.

## En el teléfono

Se puede instalar como una aplicación: **Añadir a la pantalla de inicio** en
Android. Se abre a pantalla completa, con sus botones táctiles, y sigue
funcionando aunque no haya internet (el arte se guarda en el teléfono).

- **De pie**, el escenario entra entero y la interfaz ocupa el resto: en vertical
  un 16:9 recortado dejaría una rendija inservible.
- **Tumbado**, el dibujo llena la pantalla y el mundo sube lo justo para que
  Génesis no quede detrás del panel de la conversación.

## Cómo verla

- En línea: se publica solo en Vercel con cada cambio en `main`.
- En local: `npm start` y abrir `http://127.0.0.1:4177`.

## Cómo está hecho

- Canvas 2D a 480×270, JavaScript en módulos, sin dependencias para jugar.
- `src/logic.js` — la física del salto, el mapa sólido y el guardado, sin pantalla.
- `src/story.js` — el guion, los cinco escenarios, las siete cualidades y la carta.
- `src/game.js` — el mundo y lo que se puede tocar. `src/auto.js` — quien juega solo.
- `src/input.js` — teclado, botones táctiles y mando en un solo gesto.
- `src/render.js` — los escenarios y los personajes. `src/audio.js` — la canción y la melodía de respaldo.
- `assets/` — las hojas de sprites originales y sus recortes con el punto de apoyo en los pies.
- `manifest.webmanifest` y `sw.js` — lo que la convierte en aplicación instalable.

## Pruebas

- `npm test` — la aventura entera jugada en Node: física, salidas cerradas, guardado, las siete cualidades, que él no se asome antes de tiempo, y una partida completa del modo historia comprobando que no falta ni una frase.
- `npm run test:navegador` — con el servidor levantado: comprueba que ocupa toda la pantalla y arranca sola, juega el primer acto con el teclado de verdad, termina el resto en modo historia, revisa la carta, el teléfono de pie y tumbado, y guarda capturas en `artifacts/`. Necesita `npm install` (Playwright).
- `npm run test:cancion` — comprueba que la canción de YouTube se conecta sola. Sólo tiene sentido en una red que permita YouTube.
