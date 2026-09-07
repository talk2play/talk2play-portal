@echo off
rem ============================================================
rem  TALK2PLAY - REGENERAR PAGINAS (doble clic)
rem  Reconstruye las paginas estaticas de las noticias, el
rem  sitemap y el RSS desde data/noticias.js, valida y publica.
rem  Usalo si tocaste noticias fuera del panel de redaccion.
rem ============================================================
cd /d "%~dp0"
set PYTHONUTF8=1

echo [1/2] Generando paginas, sitemap y RSS...
node scripts\build.js || goto :error
echo [2/2] Validando...
python scripts\check.py || goto :error

git add noticias sitemap.xml rss.xml data\noticias.js
git diff --cached --quiet && echo. && echo Sin cambios que publicar. && goto :fin

git commit -m "Regenera paginas estaticas (manual)" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>" || goto :error
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
