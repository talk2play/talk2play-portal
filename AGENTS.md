# talk2play-portal

Portal estático de noticias gamer alimentado por el canal de YouTube @Talk2PlayPodcast.
Sin framework, sin build, sin dependencias: HTML + CSS + JS vanilla y un scraper en
Python stdlib. Eso es deliberado (ADR-0001) — no lo "modernices".

Contexto ejecutable para agentes. Formato [AGENTS.md](https://agents.md), que leen
Claude Code, Codex, Cursor, Copilot, Gemini CLI y Aider — a diferencia de un fichero
de una sola herramienta.

## Comandos

Lo de esta seccion se EJECUTA, asi que no puede pudrirse en silencio: si miente, falla.

```bash
python -m unittest discover -s tests   # tests (categorias + gate), <1 s, sin red
python scripts/check.py                # gate: valida data/videos.js y referencias de index.html
python scripts/update.py               # refresca data/videos.js desde YouTube (red, ~5 s)
```

(Los mismos, via npm: `npm test`, `npm run gate`, `npm run update` — package.json es
solo manifiesto de comandos, no hay node_modules.)

Ver el sitio: abrir `index.html` en el navegador (funciona por `file://`, sin servidor).

## Gates

`python scripts/check.py` es la única gate y es determinista (no toca red).
El pre-commit la ejecuta junto con `gb graph --gate` y `gb check --staged`.

## Cuando algo pete (contrato con gb)

- Si muere un script, CLI o servidor: lee el estado YA capturado — `gb show <id>` (el aviso
  trae el id) o `gb last` — antes de re-ejecutar con prints. La ficha llega con su nodo del
  grafo y quien le llama.
- Para saber quien llama a un simbolo o que rompes al tocarlo: `gb calls <simbolo> [--depth 2]`
  antes de grepear o abrir ficheros a mano.
- De vez en cuando, `gb list`: el embudo capturada→leida→intervenida→en-silencio es el
  termometro del proyecto. No usar gb tambien es dato: se investiga, no se esconde.

## Arquitectura

Tres piezas y un flujo en un solo sentido (la ley numerada está en ARCHITECTURE.md):

```
scripts/update.py --escribe--> data/videos.js  --lo lee--> assets/app.js --pinta--> index.html
admin.html/admin.js --commitea via API GitHub--> data/noticias.js --lo leen--> app.js y noticia.html
```

La "base de datos" de noticias es el propio repo (ADR-0002): publicar = commit,
registro = historial git, despliegue = GitHub Pages al recibir el push.

- `assets/app.js` solo LEE `window.T2P_DATA`; nunca escribe datos ni toca red (las
  miniaturas de i.ytimg.com son la única carga externa).
- `scripts/update.py` es el único que habla con YouTube. Scrapea `ytInitialData` de las
  pestañas públicas del canal con la cookie `SOCS=CAI` (muro de consentimiento UE).
- YouTube A/B-testea los textos de metadatos ("5 visualizaciones" / "hace 1 d"):
  los parsers de update.py casan por regex laxa a propósito (ver docs/evidencia.md).

## Convenciones de commit y PR

- Mensajes de commit en español, imperativo, primera línea ≤ 72 caracteres
  ("Añade filtro por categoría", no "added filter").
- Un commit no entra con la gate en rojo: `python scripts/check.py` primero.
- Si un cambio altera qué se considera terminado o qué queda fuera, toca SCOPE.md
  en el mismo commit; si contradice una regla numerada, se cita la regla en el mensaje.
