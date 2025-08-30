# Dead-Click Radar

[![npm version](https://img.shields.io/npm/v/@asouei/dead-click-radar)](https://www.npmjs.com/package/@asouei/dead-click-radar)
[![npm downloads](https://img.shields.io/npm/dt/@asouei/dead-click-radar)](https://www.npmjs.com/package/@asouei/dead-click-radar)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](/LICENSE)

**English** | [Русский](#русский)

> Catch dead clicks. Fix UX before users rage.

A lightweight TypeScript library that detects "dead clicks" in real-time and visualizes them with an interactive heatmap overlay.

## What is a "Dead Click"?

A dead click occurs when a user clicks on an element that looks interactive but doesn't provide the expected response within a reasonable time window. Common examples:

- Buttons that look clickable but have no event handlers
- Links that lead nowhere or are broken
- Interactive-looking elements with `cursor: pointer` but no functionality
- Elements with slow response times that frustrate users

## Features

- **Real-time Detection** - Catches dead clicks as they happen using smart heuristics
- **Visual Heatmap** - Canvas-based overlay shows problem areas directly on your page
- **Zero Dependencies** - Pure TypeScript, works with any framework or vanilla JS
- **Privacy First** - No PII collection, runs entirely client-side by default
- **Export Capabilities** - JSON reports and PNG heatmaps for analysis
- **Optional Telemetry** - Batch reports to your analytics endpoint
- **Production Ready** - Memory-safe, performance optimized, SSR compatible

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
  onDeadClick: (event) => {
    console.log('Dead click detected:', event.selector);
  },
  onReportUpdate: (report) => {
    console.log(`Dead rate: ${(report.deadClicks / report.totalClicks * 100).toFixed(1)}%`);
  }
});

radar.start();
```

## Configuration

```typescript
interface DeadClickRadarOptions {
  // Core settings
  observationWindowMs?: number;        // Default: 500ms
  heatmapAlpha?: number;              // Default: 0.35
  autoStart?: boolean;                // Default: true
  
  // Detection heuristics
  targetPredicate?: (el: Element) => boolean;
  sanitizeText?: boolean;             // Remove text content from reports
  ignoredSelectors?: string[];        // CSS selectors to ignore
  minClickDistancePx?: number;        // Dedupe nearby clicks
  minClickIntervalMs?: number;        // Dedupe rapid clicks
  
  // Data & telemetry
  storage?: 'memory' | 'localStorage';
  sampling?: number;                  // 0-1, fraction of sessions to track
  batch?: {
    enabled: boolean;
    endpoint: string;
    headers?: Record<string, string>;
    maxEvents?: number;               // Send batch every N events
    maxIntervalMs?: number;           // Send batch every N milliseconds
    useBeaconOnUnload?: boolean;      // Send final batch on page unload
  };
  
  // Callbacks
  onDeadClick?: (event: DeadClickEvent) => void;
  onReportUpdate?: (report: DeadClickReport) => void;
}
```

## API Reference

### Methods

```typescript
radar.start()                    // Begin tracking
radar.stop()                     // Stop tracking
radar.clear()                    // Clear collected data
radar.getReport()               // Get current report object
radar.exportJSON(pretty?)       // Export as JSON string
radar.exportPNG()               // Export heatmap as PNG data URL
radar.exportFullPagePNG()       // Export full page heatmap
radar.destroy()                 // Clean up and remove from DOM
```

### Report Format

```typescript
interface DeadClickReport {
  page: string;
  sessionId: string;
  totalClicks: number;
  deadClicks: number;
  hotspots: Array<{
    selector: string;
    count: number;
    sampleText?: string;
  }>;
  events: Array<{
    selector: string;
    text?: string;
    x: number;
    y: number;
    ts: number;
  }>;
  viewport: { w: number; h: number };
  ua: string;
  ts: number;
}
```

## Framework Integration

### React

```tsx
import { useEffect, useRef } from 'react';
import { DeadClickRadar } from '@asouei/dead-click-radar';

function App() {
  const radarRef = useRef<DeadClickRadar>();

  useEffect(() => {
    radarRef.current = new DeadClickRadar({
      onReportUpdate: (report) => {
        console.log(`${report.deadClicks}/${report.totalClicks} dead clicks`);
      }
    });

    return () => radarRef.current?.destroy();
  }, []);

  return <div>Your app content</div>;
}
```

### Vue

```vue
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { DeadClickRadar } from '@asouei/dead-click-radar';

let radar: DeadClickRadar;

onMounted(() => {
  radar = new DeadClickRadar();
});

onUnmounted(() => {
  radar?.destroy();
});
</script>
```

### Vanilla JavaScript

```html
<script type="module">
import { DeadClickRadar } from '@asouei/dead-click-radar';

const radar = new DeadClickRadar({
  onDeadClick: (event) => {
    console.log('Dead click on:', event.selector);
  }
});
</script>
```

## Server Integration

### Next.js API Route

```typescript
// pages/api/dead-click-reports.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const report = req.body;
  
  // Store in your database
  await db.deadClickReports.create({
    data: {
      page: report.page,
      deadClicks: report.deadClicks,
      totalClicks: report.totalClicks,
      events: report.events
    }
  });
  
  return res.status(204).end();
}
```

### Express.js

```typescript
app.post('/api/dead-click-reports', async (req, res) => {
  const report = req.body;
  
  // Process the report
  console.log(`Page ${report.page}: ${report.deadClicks}/${report.totalClicks} dead clicks`);
  
  res.status(204).end();
});
```

## Privacy & Compliance

Dead-Click Radar is designed with privacy in mind:

- **No PII Collection** - Only CSS selectors and coordinates are stored by default
- **Client-side Only** - Works completely in the browser without server dependency
- **Sanitization Options** - Remove all text content with `sanitizeText: true`
- **Sampling Control** - Limit data collection to a percentage of sessions
- **Ignore Lists** - Exclude sensitive areas with `ignoredSelectors`

## Browser Support

Works in all modern browsers:
- Chrome/Chromium 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Performance

- **Bundle size**: ~8KB gzipped
- **Memory usage**: Automatic cleanup with configurable limits
- **CPU impact**: Minimal, uses RAF for smooth animations
- **Network**: Optional batching with automatic retry

## License

MIT

---

# Русский

[English](#dead-click-radar) | **Русский**

> Ловите мёртвые клики. Исправляйте UX до того, как пользователи разозлятся.

Лёгкая TypeScript библиотека для обнаружения "мёртвых кликов" в реальном времени с интерактивной тепловой картой.

## Что такое "мёртвый клик"?

Мёртвый клик происходит, когда пользователь кликает по элементу, который выглядит интерактивным, но не даёт ожидаемого отклика в разумные сроки. Примеры:

- Кнопки, которые выглядят кликабельными, но не имеют обработчиков событий
- Ссылки, которые никуда не ведут или сломаны
- Элементы с `cursor: pointer`, но без функциональности
- Элементы с медленным временем отклика, которые расстраивают пользователей

## Возможности

- **Обнаружение в реальном времени** - Ловит мёртвые клики с помощью умной эвристики
- **Визуальная тепловая карта** - Canvas-оверлей показывает проблемные области прямо на странице
- **Без зависимостей** - Чистый TypeScript, работает с любым фреймворком или vanilla JS
- **Конфиденциальность** - Никаких персональных данных, работает полностью на клиенте
- **Экспорт данных** - JSON отчёты и PNG карты для анализа
- **Опциональная телеметрия** - Пакетная отправка отчётов на ваш сервер
- **Готов к продакшену** - Безопасен по памяти, оптимизирован, совместим с SSR

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
  onDeadClick: (event) => {
    console.log('Обнаружен мёртвый клик:', event.selector);
  },
  onReportUpdate: (report) => {
    console.log(`Мёртвых кликов: ${(report.deadClicks / report.totalClicks * 100).toFixed(1)}%`);
  }
});

radar.start();
```

## Настройка

```typescript
interface DeadClickRadarOptions {
  // Основные настройки
  observationWindowMs?: number;        // По умолчанию: 500мс
  heatmapAlpha?: number;              // По умолчанию: 0.35
  autoStart?: boolean;                // По умолчанию: true
  
  // Эвристика обнаружения
  targetPredicate?: (el: Element) => boolean;
  sanitizeText?: boolean;             // Удалить текст из отчётов
  ignoredSelectors?: string[];        // CSS селекторы для игнорирования
  minClickDistancePx?: number;        // Дедупликация близких кликов
  minClickIntervalMs?: number;        // Дедупликация быстрых кликов
  
  // Данные и телеметрия
  storage?: 'memory' | 'localStorage';
  sampling?: number;                  // 0-1, доля сессий для отслеживания
  batch?: {
    enabled: boolean;
    endpoint: string;
    headers?: Record<string, string>;
    maxEvents?: number;               // Отправлять пакет каждые N событий
    maxIntervalMs?: number;           // Отправлять пакет каждые N миллисекунд
    useBeaconOnUnload?: boolean;      // Отправить финальный пакет при закрытии
  };
  
  // Колбеки
  onDeadClick?: (event: DeadClickEvent) => void;
  onReportUpdate?: (report: DeadClickReport) => void;
}
```

## Лицензия

MIT