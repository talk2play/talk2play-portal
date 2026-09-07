# Evidencia — la libreta

Cada medicion real: que se probo, que salio, que cambio por ello.

**Los resultados negativos se escriben con el mismo detalle que los positivos, o mas.**
Un proyecto que solo registra lo que funciono no tiene evidencia: tiene publicidad. Y el
dato que no esta en el repo, no existe — la memoria de nadie cuenta.

## Formato

`## AAAA-MM-DD · que se probo — VEREDICTO`, y debajo: montaje, resultado, consecuencia.

---

## 2026-09-07 · YouTube sirve variantes distintas de metadatos entre peticiones — PARSER ENDURECIDO

**Montaje:** dos ejecuciones de `scripts/update.py` contra `/@Talk2PlayPodcast/videos`
con las mismas cabeceras (`Accept-Language: es-ES`, cookie `SOCS=CAI`), separadas por
minutos.

**Resultado:** la primera devolvió `"hace 1 d"` y un texto de visitas que NO contenía
la subcadena `visualiza` → el campo `views` salió vacío en los 30 vídeos y la portada
perdió las visitas y el orden de "lo más visto". La segunda devolvió `"hace 1 día"` y
`"5 visualizaciones"`. Mismo canal, mismo código: YouTube A/B-testea el formato del
texto por petición, no por cliente.

**Consecuencia:** los filtros de `update.py` dejaron de casar por subcadena exacta y
pasaron a regex laxa (`visualiza|vista|view` + dígito para visitas; `hace…|ago` para
antigüedad), y `check.py` ganó un canario: si ningún vídeo trae `views`, la gate se pone
en rojo en vez de publicar una portada sin visitas en silencio.

## 2026-09-07 · YouTube también A/B-testea el ENVOLTORIO de ytInitialData — PARSER REESCRITO

**Montaje:** el bot de métricas falló en `/shorts` con "No se encontró ytInitialData";
gb capturó el estado (`gb show 20260907T213651-7bf315`): la página llegó completa
(1,09 M chars, es-ES) pero la regex estricta `var ytInitialData = ({...});</script>`
devolvió None.

**Resultado:** además del texto de los metadatos (entrada anterior), YouTube varía el
wrapper del JSON entre peticiones (`var x = ...;`, `window["ytInitialData"] = ...;`,
con o sin `</script>` pegado). Cualquier regex que case el cierre es frágil.

**Consecuencia:** `initial_data()` ya no casa el cierre: localiza la primera llave y
balancea llaves respetando strings JSON. Cubierto con 4 tests unitarios (wrappers
clásico y window, llaves dentro de strings, fallo claro sin datos).

## 2026-09-07 · Vistazo único renderizado (Edge headless, 1280px) — VERDE CON UN HALLAZGO

**Montaje:** captura del `index.html` con `msedge --headless --screenshot` tras generar
los datos reales (30 vídeos, 41 shorts).

**Resultado:** portada, secciones, top-5 y strip de Shorts pintan correctamente con
miniaturas reales de `i.ytimg.com`; el hallazgo fue precisamente el campo `views` vacío
de la entrada anterior (visible como metas sin visitas).

**Consecuencia:** ninguna sobre el frontend — el fallo era del scraper, ya cubierto
arriba. El renderizado no ha vuelto a mirarse tras el retema negro/blanco/rojo salvo una
segunda captura puntual pedida por el retema; ambas capturas viven fuera del repo.
