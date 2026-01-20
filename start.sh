#!/bin/bash
echo "Запуск локального веб-сервера..."
echo "Откройте в браузере: http://localhost:8000"
echo "Для остановки нажмите Ctrl+C"
python3 -m http.server 8000
