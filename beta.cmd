@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
echo ==========================================
echo  Ferrous Arena - Bulwark beta deploy
echo ==========================================

rem ---- locate Blender -----------------------------------------------------
rem Set this by hand to override detection:
set "BLENDER="

if not defined BLENDER (
  where blender >nul 2>&1 && set "BLENDER=blender"
)
rem any "Blender <version>" folder, in either Program Files tree - last match wins
if not defined BLENDER (
  for %%R in ("C:\Program Files\Blender Foundation" "C:\Program Files (x86)\Blender Foundation") do (
    if exist %%~R (
      for /d %%D in ("%%~R\Blender *") do (
        if exist "%%~D\blender.exe" set "BLENDER=%%~D\blender.exe"
      )
    )
  )
)
rem Steam and Microsoft Store installs
if not defined BLENDER (
  for %%P in (
    "C:\Program Files (x86)\Steam\steamapps\common\Blender\blender.exe"
    "%LOCALAPPDATA%\Microsoft\WindowsApps\blender.exe"
    "%ProgramFiles%\WindowsApps\blender.exe"
  ) do if exist "%%~P" set "BLENDER=%%~P"
)

if not defined BLENDER (
  echo ERROR: Blender not found.
  echo Set BLENDER= at the top of this script to the full path of blender.exe and re-run.
  goto :fail
)
echo Using Blender: !BLENDER!
"!BLENDER!" --version 2>nul | findstr /B /C:"Blender"
echo.

rem ---- 1. bind the mesh to the Spacesuit rig -------------------------------
echo [1/4] Binding bulwark.obj to the Spacesuit armature...
"!BLENDER!" --background --python tools\blender\rig_character.py -- ^
  --mesh  Assets\custom\bulwark\bulwark.obj ^
  --donor "Assets\Modular male\Individual Characters\glTF\Spacesuit.gltf" ^
  --out   Assets\custom\bulwark\bulwark.gltf  > bind.log 2>&1
type bind.log
if not exist "Assets\custom\bulwark\bulwark.gltf" (
  echo.
  echo ERROR: no bulwark.gltf produced - see bind.log above.
  goto :fail
)
findstr /C:"unweighted vertices 0" bind.log >nul
if errorlevel 1 (
  echo.
  echo STOPPING: 'unweighted vertices' was not 0.
  echo Part of the mesh is bound to nothing and would hang in the air while the rest animates.
  echo Send Claude bind.log before pushing this.
  goto :fail
)
echo   OK - all vertices weighted.
echo.

rem ---- 2. pack -------------------------------------------------------------
echo [2/4] Packing assets...
call node tools\pack-quaternius.js || goto :fail
echo.

rem ---- 3. build the beta site ---------------------------------------------
echo [3/4] Building docs\beta ...
call node tools\build-beta.js || goto :fail
echo.

rem ---- 4. commit and push --------------------------------------------------
echo [4/4] Pushing to GitHub...
git add -A
git commit -m "beta: custom Bulwark mech (ComfyUI -> Hunyuan3D -> Quaternius rig)" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
if errorlevel 1 echo   (nothing new to commit - pushing anyway)
git push || goto :fail

echo.
echo ==========================================
echo  Done. Live in about a minute at:
echo  https://hamdanmalmansouri-lab.github.io/ferrous-arena/beta/
echo  The stable build at /ferrous-arena/ is untouched.
echo ==========================================
pause
exit /b 0

:fail
echo.
echo FAILED - nothing was pushed.
pause
exit /b 1
