// Главный экспорт библиотеки
export { DeadClickRadar } from './radar.js';
export { HeatmapCanvas } from './heatmap.js';

// Экспорт типов
export type {
    DeadClickEvent,
    DeadClickHotspot,
    DeadClickReport,
    DeadClickRadarOptions,
    BatchConfig,
    RadarState
} from './types.js';

// Экспорт утилит для продвинутого использования
export {
    buildCssPath,
    looksInteractive,
    extractSampleText,
    shouldIgnoreElement,
    generateSessionId,
    getClickDistance,
    throttle
} from './utils.js';

// Версия библиотеки
export const VERSION = '0.1.0';