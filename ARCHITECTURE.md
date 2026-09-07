# talk2play-portal — la ley de diseno

Reglas **numeradas**, y lo de numeradas no es cosmetico: una regla con numero se cita
en una revision ("esto viola la 3") y una cita decide. Un principio en prosa no se cita,
y lo que no se cita no ata.

Una regla entra aqui solo si alguna vez vas a poder decir que algo la incumple.

1. **El flujo de datos va en un solo sentido:** `update.py → data/videos.js → app.js`.
   Nada en `assets/` escribe datos; nada en `scripts/` sabe de presentación.
2. **La portada no toca red.** `app.js` y `noticia.html` cargan solo ficheros locales
   más miniaturas de `i.ytimg.com`; ningún `fetch()`. Las únicas piezas con red son
   `scripts/update.py` (YouTube) y `assets/admin.js` (api.github.com para publicar;
   ampliado el 2026-09-07 por ADR-0002).
3. **El sitio abre por `file://` sin servidor.** Cualquier cambio que exija un
   servidor local para ver la portada incumple esta regla (por eso los datos son un
   `.js` con `window.T2P_DATA`, no un `.json` fetcheado).
4. **Cero dependencias:** `update.py` solo stdlib, el frontend solo vanilla. La única
   excepción son las fuentes de Google Fonts, con fallback de sistema declarado.
5. **Los ficheros de `data/` no se editan a mano.** `videos.js` lo genera `update.py`;
   `noticias.js` lo escribe el panel de redacción (o su botón de descarga). Lo que esté
   mal ahí se arregla en su escritor y se regenera.
6. **Todo texto visible en español**, incluida la salida de los scripts.
7. **La identidad es negro/blanco/rojo** (tokens en `:root` de `style.css`); un color
   nuevo entra como token o no entra.

## Como se cambia esto

Una regla se cambia editando este fichero en el mismo commit que el código que la
contradice, explicando en el mensaje por qué la regla ya no aplica. Mientras la regla
esté escrita, se cumple; "es que era más cómodo" no la retira. Las decisiones con
contexto largo van a `docs/adr/`.
