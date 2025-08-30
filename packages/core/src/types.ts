export interface DeadClickEvent {
    selector: string;
    text?: string;
    x: number;
    y: number;
    ts: number;
}

export interface DeadClickHotspot {
    selector: string;
    count: number;
    sampleText?: string;
}

export interface DeadClickReport {
    page: string;
    sessionId: string;
    totalClicks: number;
    deadClicks: number;
    hotspots: DeadClickHotspot[];
    events: DeadClickEvent[];
    viewport?: { w: number; h: number };
    ua?: string;
    ts: number;
}

export interface BatchConfig {
    enabled: boolean;
    endpoint: string;
    headers?: Record<string, string>;
    maxEvents?: number;
    maxIntervalMs?: number;
    useBeaconOnUnload?: boolean;
}

export interface DeadClickRadarOptions {
    // Основные настройки
    observationWindowMs?: number;
    heatmapAlpha?: number;
    autoStart?: boolean;

    // Эвристики
    targetPredicate?: (el: Element) => boolean;
    sanitizeText?: boolean;
    ignoredSelectors?: string[];
    minClickDistancePx?: number;
    minClickIntervalMs?: number;

    // Хранение и отправка
    storage?: 'memory' | 'localStorage';
    sampling?: number;
    batch?: BatchConfig;
    onDeadClick?: (event: DeadClickEvent) => void;
    onReportUpdate?: (report: DeadClickReport) => void;
}

// Внутренние типы
export interface RadarState {
    isActive: boolean;
    totalClicks: number;
    deadEvents: DeadClickEvent[];
    hotspotMap: Map<string, DeadClickHotspot>;
    lastUrl: string;
    lastFocusTs: number;
    networkStarts: number[];
    sessionId: string;
}