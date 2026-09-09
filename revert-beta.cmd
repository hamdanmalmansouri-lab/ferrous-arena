@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo  Ferrous Arena - revert to pre-beta models
echo ==========================================
echo.
echo This will:
echo   - delete docs\beta  (the beta site comes down)
echo   - repack assets WITHOUT custom_bulwark
echo   - rebuild docs\index.html  (stable site, stock Quaternius cast)
echo   - commit and push
echo.
echo Kept on disk: Assets\custom\bulwark\  (mesh, rig, renders - nothing deleted)
echo Kept: beta.cmd and tools\build-beta.js, for the next beta
echo.
pause

if exist "docs\beta" (
  echo Removing docs\beta ...
  rmdir /s /q "docs\beta" || goto :fail
) else (
  echo docs\beta already gone.
)
echo.

echo [1/3] Repacking assets ^(stock cast only^)...
call node tools\pack-quaternius.js || goto :fail
echo.

echo [2/3] Rebuilding the stable site...
call node build.js || goto :fail
echo.

echo [3/3] Pushing...
git add -A
git commit -m "revert: drop custom Bulwark mech from the bundle, remove beta site" -m "Mesh and rig kept in Assets/custom/bulwark for later." -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
if errorlevel 1 echo   (nothing new to commit - pushing anyway)
git push || goto :fail

echo.
echo ==========================================
echo  Reverted. https://hamdanmalmansouri-lab.github.io/ferrous-arena/
echo  runs the stock cast again; /beta/ will 404 once Pages redeploys.
echo ==========================================
pause
exit /b 0

:fail
echo.
echo FAILED - check the message above. Nothing was pushed.
pause
exit /b 1
