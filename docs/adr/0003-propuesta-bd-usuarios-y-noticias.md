# ADR-0003 · Base de datos para registro de usuarios y noticias persistentes

**Fecha:** 2026-09-07 · **Estado:** PROPUESTA (pendiente de decidir e implementar)

## Qué se pide

1. **Registro de usuarios nuevos** (cuentas en el portal).
2. **Noticias persistentes en base de datos** (además de, o en lugar de, el
   fichero `data/noticias.js` commiteado — ADR-0002).

## Por qué no se puede resolver solo con GitHub Pages

Pages sirve ficheros estáticos: no hay dónde ejecutar autenticación ni guardar
credenciales. El registro de usuarios exige un backend gestionado.

## Propuesta

**Supabase** (tier gratuito): Auth para el registro/login (email+contraseña,
confirmación por correo) y Postgres con Row Level Security para la tabla
`noticias` (lectura pública, escritura solo editores) y `perfiles`.
El frontend seguiría siendo estático — el SDK de Supabase funciona desde
GitHub Pages sin servidor propio.

## Qué desbloquea la implementación

- Crear el proyecto en supabase.com (cuenta del equipo) y traer **URL del
  proyecto + anon key** para `assets/` (la anon key es pública por diseño;
  la seguridad la ponen las políticas RLS).

## Qué habrá que revisar al implementarlo (no antes)

- **SCOPE.md**: "cuentas de usuario" está hoy en la lista de lo que NO entra.
- **ARCHITECTURE.md regla 2**: la portada pasaría a hablar con Supabase.
- **RGPD en serio**: con cuentas hay datos personales — política de privacidad
  real, base jurídica, derechos ARCO y el aviso de cookies deja de ser solo
  informativo.
- Migración de las noticias de `data/noticias.js` a la tabla (o doble fuente
  con el fichero como caché de build).
