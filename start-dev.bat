@echo off
wt ^
  new-tab --title "server" -d "%~dp0server" -- bun run dev ^; ^
  new-tab --title "client" -d "%~dp0client" -- bun run dev ^; ^
  new-tab --title "rtc-service" -d "%~dp0rtc-service" -- bun run dev ^; ^
  new-tab --title "matching-service" -d "%~dp0matching-service" -- bun run dev
