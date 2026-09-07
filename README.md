# Talk2Play Portal

Portal de noticias gamer (estilo Vandal, estética moderna oscura) alimentado por el contenido
del canal de YouTube [@Talk2PlayPodcast](https://www.youtube.com/@Talk2PlayPodcast).

## Estructura

```
talk2play-portal/
├── index.html          # el portal (portada, secciones, sidebar)
├── assets/
│   ├── style.css       # identidad Talk2Play: índigo + rojo emisión + cian
│   └── app.js          # renderiza portada, filtros, "lo más visto" y shorts
├── data/
│   └── videos.js       # contenido del canal (window.T2P_DATA) — generado
└── scripts/
    └── update.py       # regenera data/videos.js desde YouTube (solo stdlib)
```

## Uso

Abrir `index.html` en el navegador — funciona en local sin servidor
(los datos van en un `.js`, no hay fetch, así que `file://` no da problemas de CORS).

Para refrescar el contenido cuando el canal publique vídeos nuevos:

```
python scripts/update.py
```

El script descarga las pestañas públicas de Vídeos y Shorts del canal, extrae título,
duración, visitas, antigüedad y categoría de cada vídeo, y reescribe `data/videos.js`.
Las categorías (Noticias / Reacciones / Gameplays / Directos) se infieren por palabras
clave del título en `category()` — ajustable ahí mismo.

Las miniaturas se cargan de `i.ytimg.com` a partir del ID de cada vídeo, así que no hay
imágenes que mantener.

## Publicar

Es un sitio estático: sirve cualquier hosting (GitHub Pages, Netlify, Cloudflare Pages).
Para GitHub Pages con actualización automática, añade un workflow que ejecute
`python scripts/update.py` con un `schedule` diario y haga commit de `data/videos.js`.

## Notas

- Si YouTube cambia el formato interno de sus páginas (`ytInitialData`), `update.py`
  fallará con un error claro; habrá que ajustar los selectores en `scrape_videos()`.
- El scraping usa la cookie `SOCS=CAI` para saltar el muro de consentimiento de la UE.
