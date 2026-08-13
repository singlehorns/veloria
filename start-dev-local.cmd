@echo off
cd /d "%~dp0"
set ASTRO_TELEMETRY_DISABLED=1
"C:\Program Files\nodejs\npm.cmd" run dev -- --host 127.0.0.1
