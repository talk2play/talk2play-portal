# talk2play-portal — alcance

## En una frase

Una portada estática estilo portal de noticias (negro/blanco/rojo, tipo 3DJuegos) que
muestra los vídeos y Shorts públicos del canal @Talk2PlayPodcast con enlace directo a
YouTube, actualizable con un comando.

## Lo que NO entra

- **Backend o base de datos externa (Supabase/Firebase/servidor propio).** GitHub
  Pages sirve estático y el repo hace de base de datos (ADR-0002). Un servidor
  convertiría un sitio que se abre con doble clic en algo que hay que desplegar y mantener.
- **Framework de frontend (React/Next/Vite).** Tres ficheros vanilla lo cubren; el build
  añadiría dependencias y pasos sin añadir capacidad. (Apetece. No entra.)
- **Reproductor embebido.** El objetivo es mandar tráfico AL canal, no retenerlo aquí:
  cada carta enlaza a youtube.com.
- ~~Artículos de texto propios / CMS~~ — **revisado el 2026-09-07 (ADR-0002):** entra
  una redacción mínima: noticias en `data/noticias.js` publicadas desde `admin.html`
  commiteando via API de GitHub. El repo es la base de datos; el registro, el historial git.
- **Comentarios, cuentas de usuario, analítica.** Nada que requiera consentimientos,
  cookies propias o RGPD. El registro de USUARIOS sigue fuera (ADR-0002 explica qué
  haría falta si algún día entra).
- **Actualización automática en cliente.** El navegador nunca scrapea; refrescar datos
  es ejecutar `scripts/update.py` (a mano o en CI programada).

## Criterio de terminado

El MVP está terminado cuando la portada pinta los vídeos reales del canal con miniatura,
categoría, duración y visitas; las secciones filtran; el sidebar muestra top-5 y Shorts;
y todo ello se verifica sin abrir el navegador:

```gb:terminado
python scripts/check.py
```

La gate valida que `data/videos.js` existe, parsea, trae ≥5 vídeos con id/título/categoría
válidos, que al menos un vídeo conserva el dato de visitas (canario del parser contra los
A/B de YouTube) y que `index.html` referencia ficheros que existen y conserva los nodos
que `app.js` rellena.

Que el criterio sea BUENO sigue sin poder juzgarlo ninguna herramienta (`exit 0`
tambien pasa), asi que esta capa del suelo no se marca en verde nunca.
