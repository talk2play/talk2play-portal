# ADR-0002 · Redacción propia con el repo como base de datos, sobre GitHub Pages

**Fecha:** 2026-09-07 · **Estado:** aceptada · **Revisa:** SCOPE.md (que excluía CMS) y la regla 2 de ARCHITECTURE.md

## Contexto

El proyecto pasa a publicarse en GitHub Pages y se pide: sección de noticias propias,
un panel de administración para publicarlas y una base de datos que registre lo
publicado. GitHub Pages no ejecuta servidor, así que "base de datos" no puede ser un
Postgres al uso sin contratar un tercero (Supabase/Firebase).

## Decisión

**El repositorio es la base de datos.** Las noticias viven en `data/noticias.js`
(mismo patrón `window.*` que los vídeos, regla 3); el panel `admin.html` las edita en
memoria y las publica commiteando el fichero contra la **API de contenidos de GitHub**
con un fine-grained token del editor. Cada publicación es un commit → GitHub Pages
redespliega → el registro completo (quién, qué, cuándo, versión anterior) es el
historial de git.

## Por qué esto y no Supabase/Firebase

- Cero servicios nuevos, cero credenciales de terceros, cero coste, cero RGPD añadido.
- El "registro" pedido lo da git gratis y mejor: diffs, autoría, revert.
- El equipo es 2-3 personas de confianza; no hay usuarios anónimos escribiendo.
- Si algún día hace falta registro de USUARIOS (cuentas, comentarios), esta decisión
  no lo cubre: eso sí exigiría Supabase/Firebase y sería un ADR nuevo.

## Consecuencias asumidas

- El editor necesita un token fine-grained (Contents: RW, solo este repo) guardado en
  el localStorage de SU navegador. En equipo pequeño es aceptable; el token no da
  acceso a nada más. Alternativa sin token: botón "descargar noticias.js" y commit a mano.
- `admin.html` es público (Pages no tiene zonas privadas), pero sin token no puede
  escribir: la autorización real la pone GitHub, no la página.
- La regla 2 de ARCHITECTURE.md se amplía: el panel de redacción habla con
  api.github.com; la portada sigue sin tocar red (solo miniaturas).
