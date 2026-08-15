# Zona Zero — notas técnicas breves

## URLs
- Biblioteca: `/juegos/`
- Juego: `/juegos/zona-zero/`
- API: `/juegos/zona-zero/api/`

## Auth
Reutiliza sesión de Intocables (`includes/auth.php`).
Local: `W:\intocables\includes`
Producción: `/includes` (document root)

## BD
Tabla `zona_zero_saves` (prefijo `zona_zero_*`).
Se crea automáticamente al primer acceso API si faltan permisos CREATE;
también en `sql/schema.sql`.

## Deploy
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "W:\juegos\deploy\winscp_deploy_juegos.ps1"
```
Usa credenciales de `W:\anabel\deploy\hostalia.publish.local.json`.

## Contenido / balance
Editar JSON en `content/` sin tocar el motor.
