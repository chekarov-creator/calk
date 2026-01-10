# Калькулятор ПТМ + расход

## Быстрый запуск

**macOS/Linux:**
```bash
./start.sh
```

**Windows:**
```bash
python -m http.server 8000
```

Затем откройте в браузере: `http://localhost:8000/ptm-kalkulyator-engineering.html`

## Альтернативные способы запуска

### Python
```bash
python3 -m http.server 8000
```

### Node.js (npx serve)
```bash
npx serve
```

### PHP
```bash
php -S localhost:8000
```

## Важно

Приложение использует ES6 модули, поэтому **необходимо** запускать через локальный веб-сервер. Открытие файла напрямую через `file://` не будет работать из-за ограничений CORS браузера.

## Структура проекта

- `ptm-kalkulyator-engineering.html` - главный HTML файл
- `js/` - JavaScript модули
- `css/` - стили
- `data/` - JSON данные (профили, шрифты, frizol)
