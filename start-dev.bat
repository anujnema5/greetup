@echo off
wt ^
  new-tab --title "server" -d "%~dp0apps\server" -- bun run dev ^; ^
  new-tab --title "client" -d "%~dp0apps\client" -- bun run dev ^; ^
  new-tab --title "rtc-service" -d "%~dp0apps\rtc-service" -- bun run dev ^; ^
  new-tab --title "matching-service" -d "%~dp0apps\matching-service" -- bun run dev
