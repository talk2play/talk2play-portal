@echo off
rem Bot del portal Talk2Play: refresca videos del canal y lanzamientos de Steam
rem y publica el commit si hay cambios. Lo lanza el Programador de tareas a diario.
cd /d "%~dp0.."
set PYTHONUTF8=1

python scripts\update.py || exit /b 1
python scripts\lanzamientos.py || exit /b 1
python scripts\temas.py || exit /b 1
python scripts\metricas.py || exit /b 1
python scripts\check.py || exit /b 1

git add data\videos.js data\lanzamientos.js data\temas.js data\metricas.js
git diff --cached --quiet && echo Sin cambios que publicar. && exit /b 0

git commit -m "Bot: actualiza videos del canal y lanzamientos de Steam" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>" || exit /b 1
git push || exit /b 1
echo Publicado.
