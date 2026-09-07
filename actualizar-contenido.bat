@echo off
rem ============================================================
rem  TALK2PLAY - ACTUALIZAR CONTENIDO (doble clic)
rem  Refresca videos, lanzamientos, radar de temas y metricas,
rem  valida y publica en la web si hay cambios.
rem  (Es lo mismo que el bot de GitHub hace solo cada dia.)
rem ============================================================
cd /d "%~dp0"
set PYTHONUTF8=1

echo [1/5] Videos del canal...
python scripts\update.py || goto :error
echo [2/5] Lanzamientos de Steam...
python scripts\lanzamientos.py || goto :error
echo [3/5] Radar de temas...
python scripts\temas.py || goto :error
echo [4/5] Foto de metricas...
python scripts\metricas.py || goto :error
echo [5/5] Validando...
python scripts\check.py || goto :error

git add data\videos.js data\lanzamientos.js data\temas.js data\metricas.js
git diff --cached --quiet && echo. && echo Sin cambios que publicar. && goto :fin

git commit -m "Actualiza contenido (manual)" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>" || goto :error
git push || goto :error
echo.
echo PUBLICADO. La web se actualiza en ~1 minuto.
goto :fin

:error
echo.
echo *** ALGO FALLO - revisa el mensaje de arriba ***
:fin
echo.
pause
