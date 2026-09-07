# ADR-0001 · Sitio estático + scraper stdlib, en vez de API oficial o framework

**Fecha:** 2026-09-07 · **Estado:** aceptada

## Contexto

El portal refleja el contenido de un canal de YouTube pequeño (@Talk2PlayPodcast).
Había tres formas de traer los datos y dos de construir el frontend:

- Datos: (a) YouTube Data API v3, (b) feed RSS del canal, (c) scrapear `ytInitialData`
  de las páginas públicas.
- Frontend: (a) framework con build (Next/Vite), (b) HTML/CSS/JS vanilla.

## Decisión

Scraping de `ytInitialData` con Python stdlib (`scripts/update.py`) que genera un
`data/videos.js` estático, y frontend vanilla que lo lee de `window.T2P_DATA`.

## Por qué

- **La API oficial exige clave, cuota y proyecto en Google Cloud** para un canal que es
  del propio equipo; y no da el texto localizado de "hace 2 días" que la portada usa.
- **El RSS solo trae los últimos 15 vídeos, sin duración, visitas ni Shorts.** El
  scraping da los ~30 de la primera página de cada pestaña con todos los metadatos.
- **`data/videos.js` en vez de `.json`** para que la portada abra por `file://` sin
  pelearse con CORS: un `<script src>` local no está sujeto a fetch policy.
- **Sin framework** porque el sitio es una portada que pinta una lista: tres ficheros,
  cero build, cero dependencias que caduquen.

## Consecuencias asumidas

- El parser depende del formato interno de YouTube (`ytInitialData`, `lockupViewModel`).
  Si cambia, `update.py` falla con error claro y hay que ajustar selectores. Mitigación:
  la gate (`check.py`) tiene un canario que detecta cuándo el parser deja de traer visitas.
- YouTube A/B-testea los textos de metadatos; los parsers casan por regex laxa
  (evidencia del 2026-09-07 en docs/evidencia.md).
- La cookie `SOCS=CAI` salta el muro de consentimiento UE; si YouTube cambia el
  mecanismo, el scraper devolverá la página de consentimiento y `ytInitialData` no
  aparecerá (mismo error claro).
