@echo off
cd /d "%~dp0"
git add -A
git commit -m "v2.7: Quaternius modular-human operatives, Sci-Fi Guns, UAL jump retarget, phase 5 animation layers" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push
echo.
echo Done - GitHub Pages will redeploy from /docs in a minute.
pause
