# talk2play-portal — alcance

## En una frase

Una portada estática estilo portal de noticias (negro/blanco/rojo, tipo 3DJuegos) que
muestra los vídeos y Shorts públicos del canal @Talk2PlayPodcast con enlace directo a
YouTube, actualizable con un comando.

## Lo que NO entra

- **Backend, base de datos o API propia.** El contenido vive en YouTube; aquí solo se
  refleja. Un servidor convertiría un sitio que se abre con doble clic en algo que hay
  que desplegar y mantener.
- **Framework de frontend (React/Next/Vite).** Tres ficheros vanilla lo cubren; el build
  añadiría dependencias y pasos sin añadir capacidad. (Apetece. No entra.)
- **Reproductor embebido.** El objetivo es mandar tráfico AL canal, no retenerlo aquí:
  cada carta enlaza a youtube.com.
- **Artículos de texto propios / CMS.** Esto no es una redacción; si algún día Talk2Play
  escribe noticias, será otro proyecto o una revisión de este alcance por escrito.
- **Comentarios, cuentas, analítica.** Nada que requiera consentimientos, cookies
  propias o RGPD.
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
