# Dead-Click Radar

**English** | [Русский](#русский)

> Catch dead clicks. Fix UX before users rage.

Lightweight TypeScript library that detects "dead clicks" in real-time and visualizes them with a heatmap overlay.

**Full documentation & demo** → [GitHub](https://github.com/asouei/dead-click-radar)

## Installation

```bash
npm install @asouei/dead-click-radar
```

## Quick Start

```typescript
import { DeadClickRadar } from '@asouei/dead-click-radar';

const radar = new DeadClickRadar({
  observationWindowMs: 500,
  heatmapAlpha: 0.35,
  onReportUpdate: (report) => {
    console.log(`Dead clicks: ${report.deadClicks}/${report.totalClicks}`);
  }
});

radar.start();
```

## Features

- Real-time dead click detection with smart heuristics
- Canvas-based heatmap overlay
- JSON/PNG export capabilities
- Optional server-side batching
- Framework agnostic (React, Vue, vanilla JS)
- TypeScript ready
- SSR compatible

## API

```typescript
// Methods
radar.start()              // Begin tracking
radar.stop()               // Stop tracking  
radar.clear()              // Clear data
radar.getReport()          // Get report object
radar.exportJSON()         // Export as JSON
radar.exportPNG()          // Export heatmap as PNG
radar.destroy()            // Clean up

// Events
onDeadClick?: (event) => void
onReportUpdate?: (report) => void
```

## License

MIT

---

# Русский

[English](#dead-click-radar) | **Русский**

> Ловите мёртвые клики. Исправляйте UX до того, как пользователи разозлятся.

Лёгкая TypeScript библиотека для обнаружения "мёртвых кликов" в реальном времени с тепловой картой.

**Полная документация и демо** → [GitHub](https://github.com/asouei/dead-click-radar)

## Установка

```bash
npm install @asouei/dead-click-radar
```

## Быстрый старт

```typescript
import { DeadClickRadar } from '@asouei/dead-click-radar';

const radar = new DeadClickRadar({
  observationWindowMs: 500,
  heatmapAlpha: 0.35,
  onReportUpdate: (report) => {
    console.log(`Мёртвых кликов: ${report.deadClicks}/${report.totalClicks}`);
  }
});

radar.start();
```

## Возможности

- Обнаружение мёртвых кликов в реальном времени
- Canvas тепловая карта
- Экспорт в JSON/PNG
- Опциональная отправка на сервер
- Работает с любым фреймворком (React, Vue, vanilla JS)
- Поддержка TypeScript
- Совместим с SSR

## API

```typescript
// Методы
radar.start()              // Начать отслеживание
radar.stop()               // Остановить отслеживание
radar.clear()              // Очистить данные
radar.getReport()          // Получить отчёт
radar.exportJSON()         // Экспорт в JSON
radar.exportPNG()          // Экспорт карты в PNG
radar.destroy()            // Очистка ресурсов

// События
onDeadClick?: (event) => void
onReportUpdate?: (report) => void
```

## Лицензия

MIT