import { HeatmapCanvas } from './heatmap.js';
import {
    buildCssPath,
    looksInteractive,
    extractSampleText,
    shouldIgnoreElement,
    generateSessionId,
    getClickDistance
} from './utils.js';
import type {
    DeadClickRadarOptions,
    DeadClickEvent,
    DeadClickReport,
    RadarState,
    DeadClickHotspot,
    BatchConfig
} from './types.js';

export class DeadClickRadar {
    private state: RadarState;
    private options: {
        observationWindowMs: number;
        heatmapAlpha: number;
        autoStart: boolean;
        targetPredicate: (el: Element) => boolean;
        sanitizeText: boolean;
        ignoredSelectors: string[];
        minClickDistancePx: number;
        minClickIntervalMs: number;
        storage: 'memory' | 'localStorage';
        sampling: number;
        batch: Required<BatchConfig>;
        onDeadClick?: (event: DeadClickEvent) => void;
        onReportUpdate?: (report: DeadClickReport) => void;
    };
    private heatmap!: HeatmapCanvas;
    private cleanup: Array<() => void> = [];
    private batchTimer?: ReturnType<typeof setTimeout>;
    private lastClickTime = 0;
    private lastClickPos = { x: 0, y: 0 };
    private maxStoredEvents = 2000;
    private navFlag = 0;
    private isBrowser: boolean;

    constructor(options: DeadClickRadarOptions = {}) {
        this.isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

        if (!this.isBrowser) {
            console.warn('[DCR] Browser-only library');
            this.state = {
                isActive: false,
                totalClicks: 0,
                deadEvents: [],
                hotspotMap: new Map(),
                lastUrl: '',
                lastFocusTs: 0,
                networkStarts: [],
                sessionId: 'ssr-dummy'
            };
            this.options = {
                observationWindowMs: 500,
                heatmapAlpha: 0.35,
                autoStart: false,
                targetPredicate: () => false,
                sanitizeText: false,
                ignoredSelectors: [],
                minClickDistancePx: 8,
                minClickIntervalMs: 100,
                storage: 'memory',
                sampling: 0,
                batch: {
                    enabled: false,
                    endpoint: '',
                    headers: {},
                    maxEvents: 50,
                    maxIntervalMs: 15000,
                    useBeaconOnUnload: false
                },
                onDeadClick: undefined,
                onReportUpdate: undefined
            };
            return;
        }

        this.options = {
            observationWindowMs: options.observationWindowMs ?? 500,
            heatmapAlpha: options.heatmapAlpha ?? 0.35,
            autoStart: options.autoStart ?? true,
            targetPredicate: options.targetPredicate ?? looksInteractive,
            sanitizeText: options.sanitizeText ?? false,
            ignoredSelectors: options.ignoredSelectors ?? [],
            minClickDistancePx: options.minClickDistancePx ?? 8,
            minClickIntervalMs: options.minClickIntervalMs ?? 100,
            storage: options.storage ?? 'memory',
            sampling: options.sampling ?? 1.0,
            batch: {
                enabled: options.batch?.enabled ?? false,
                endpoint: options.batch?.endpoint ?? '',
                headers: options.batch?.headers ?? {},
                maxEvents: options.batch?.maxEvents ?? 50,
                maxIntervalMs: options.batch?.maxIntervalMs ?? 15000,
                useBeaconOnUnload: options.batch?.useBeaconOnUnload ?? true
            },
            onDeadClick: options.onDeadClick,
            onReportUpdate: options.onReportUpdate
        };

        this.state = {
            isActive: false,
            totalClicks: 0,
            deadEvents: [],
            hotspotMap: new Map(),
            lastUrl: window.location.href,
            lastFocusTs: 0,
            networkStarts: [],
            sessionId: generateSessionId()
        };

        this.heatmap = new HeatmapCanvas(this.options.heatmapAlpha);

        if (Math.random() > this.options.sampling) {
            console.debug('[DCR] Session excluded by sampling');
            return;
        }

        if (this.options.autoStart) {
            this.start();
        }
    }

    start(): void {
        if (!this.isBrowser || this.state.isActive) return;

        this.state.isActive = true;
        this.setupEventListeners();
        this.heatmap.show();

        console.debug('[DCR] Started tracking');
    }

    stop(): void {
        if (!this.isBrowser || !this.state.isActive) return;

        this.state.isActive = false;
        this.removeEventListeners();
        this.heatmap.hide();

        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }

        console.debug('[DCR] Stopped tracking');
    }

    clear(): void {
        if (!this.isBrowser) return;

        this.state.deadEvents = [];
        this.state.hotspotMap.clear();
        this.state.totalClicks = 0;
        this.heatmap.clear();

        this.notifyReportUpdate();
    }

    private setupEventListeners(): void {
        const handleClick = (e: MouseEvent) => this.onDocumentClick(e);
        document.addEventListener('click', handleClick, true);
        this.cleanup.push(() => document.removeEventListener('click', handleClick, true));

        const handleFocus = () => { this.state.lastFocusTs = performance.now(); };
        document.addEventListener('focus', handleFocus, true);
        this.cleanup.push(() => document.removeEventListener('focus', handleFocus, true));

        this.interceptNetworkRequests();
        this.patchHistoryAPI();

        const handlePopState = () => this.checkUrlChange();
        window.addEventListener('popstate', handlePopState);
        this.cleanup.push(() => window.removeEventListener('popstate', handlePopState));

        if (this.options.batch.enabled && this.options.batch.useBeaconOnUnload) {
            const handleUnload = () => this.sendBatchOnUnload();
            window.addEventListener('beforeunload', handleUnload);
            this.cleanup.push(() => window.removeEventListener('beforeunload', handleUnload));
        }
    }

    private patchHistoryAPI(): void {
        const markNav = () => {
            this.state.lastUrl = location.href;
            this.navFlag = performance.now();
        };

        const wrap = (fn: Function) => function(this: History, ...args: any[]) {
            const result = fn.apply(this, args);
            markNav();
            return result;
        };

        const oldPush = history.pushState;
        const oldReplace = history.replaceState;

        history.pushState = wrap(oldPush);
        history.replaceState = wrap(oldReplace);

        this.cleanup.push(() => {
            history.pushState = oldPush;
            history.replaceState = oldReplace;
        });
    }

    private removeEventListeners(): void {
        this.cleanup.forEach(fn => fn());
        this.cleanup = [];
    }

    private interceptNetworkRequests(): void {
        const state = this.state;

        const originalFetch = window.fetch;
        window.fetch = (...args: Parameters<typeof fetch>) => {
            state.networkStarts.push(performance.now());
            return originalFetch(...args);
        };
        this.cleanup.push(() => { window.fetch = originalFetch; });

        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function(
            method: string,
            url: string | URL,
            async: boolean = true,
            username?: string | null,
            password?: string | null
        ) {
            (this as any).__dcr_start = performance.now();
            return originalOpen.call(this, method, url, async, username, password);
        };

        XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
            const startTime = (this as any).__dcr_start || performance.now();
            state.networkStarts.push(startTime);
            return originalSend.call(this, body);
        };

        this.cleanup.push(() => {
            XMLHttpRequest.prototype.open = originalOpen;
            XMLHttpRequest.prototype.send = originalSend;
        });
    }

    private onDocumentClick(e: MouseEvent): void {
        const target = e.target as Element;
        const now = performance.now();
        const clickPos = { x: e.pageX, y: e.pageY };

        if (this.isDuplicateClick(now, clickPos)) return;

        this.lastClickTime = now;
        this.lastClickPos = clickPos;
        this.state.totalClicks++;

        if (!this.shouldAnalyzeClick(target)) return;

        this.scheduleDeadClickCheck(target, clickPos, now);
    }

    private isDuplicateClick(now: number, pos: { x: number; y: number }): boolean {
        const timeDiff = now - this.lastClickTime;
        const distance = getClickDistance(pos.x, pos.y, this.lastClickPos.x, this.lastClickPos.y);

        return timeDiff < this.options.minClickIntervalMs && distance < this.options.minClickDistancePx;
    }

    private shouldAnalyzeClick(target: Element): boolean {
        if (!this.options.targetPredicate(target)) return false;
        if (shouldIgnoreElement(target, this.options.ignoredSelectors)) return false;

        return true;
    }

    private scheduleDeadClickCheck(target: Element, pos: { x: number; y: number }, clickTime: number): void {
        const targetRoot = this.findNearestInteractive(target) || target;
        let localMutationDetected = false;

        const mutationObserver = new MutationObserver(() => {
            localMutationDetected = true;
        });

        mutationObserver.observe(targetRoot, {
            attributes: true,
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            mutationObserver.disconnect();

            const isDead = !this.somethingHappened(clickTime, localMutationDetected);

            if (isDead) {
                this.recordDeadClick(target, pos);
            }

            this.cleanupOldNetworkStarts(clickTime);
        }, this.options.observationWindowMs);
    }

    private findNearestInteractive(element: Element): Element | null {
        let current = element.parentElement;
        while (current) {
            if (looksInteractive(current)) return current;
            current = current.parentElement;
        }
        return null;
    }

    private somethingHappened(sinceTime: number, localMutation: boolean): boolean {
        if (this.checkUrlChange()) return true;
        if (this.navFlag > sinceTime) return true;
        if (this.state.lastFocusTs > sinceTime) return true;
        if (this.state.networkStarts.some(ts => ts > sinceTime)) return true;
        if (localMutation) return true;

        return false;
    }

    private checkUrlChange(): boolean {
        const currentUrl = window.location.href;
        if (currentUrl !== this.state.lastUrl) {
            this.state.lastUrl = currentUrl;
            return true;
        }
        return false;
    }

    private cleanupOldNetworkStarts(threshold: number): void {
        this.state.networkStarts = this.state.networkStarts.filter(ts => ts > threshold);
    }

    private recordDeadClick(target: Element, pos: { x: number; y: number }): void {
        const selector = buildCssPath(target);
        const text = this.options.sanitizeText ? undefined : extractSampleText(target);

        const event: DeadClickEvent = {
            selector,
            text,
            x: pos.x,
            y: pos.y,
            ts: Date.now()
        };

        this.state.deadEvents.push(event);
        if (this.state.deadEvents.length > this.maxStoredEvents) {
            this.state.deadEvents.shift();
        }

        const hotspot = this.state.hotspotMap.get(selector) || { selector, count: 0, sampleText: text };
        hotspot.count++;
        this.state.hotspotMap.set(selector, hotspot);

        this.heatmap.addDot(pos.x, pos.y);

        if (this.options.onDeadClick) {
            this.options.onDeadClick(event);
        }
        this.notifyReportUpdate();

        this.checkBatching();

        console.debug('[DCR] Dead click recorded:', selector, text);
    }

    private notifyReportUpdate(): void {
        if (this.options.onReportUpdate) {
            this.options.onReportUpdate(this.getReport());
        }
    }

    private checkBatching(): void {
        if (!this.options.batch.enabled) return;

        if (!this.batchTimer) {
            this.batchTimer = setTimeout(() => {
                this.sendBatch();
            }, this.options.batch.maxIntervalMs);
        }

        if (this.state.deadEvents.length >= this.options.batch.maxEvents) {
            this.sendBatch();
        }
    }

    private async sendBatch(): Promise<void> {
        if (!this.options.batch.enabled || this.state.deadEvents.length === 0) return;

        const report = this.getReport();

        try {
            await fetch(this.options.batch.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.options.batch.headers
                },
                body: JSON.stringify(report)
            });

            console.debug('[DCR] Batch sent successfully');
        } catch (error) {
            console.warn('[DCR] Failed to send batch:', error);
        } finally {
            if (this.batchTimer) {
                clearTimeout(this.batchTimer);
                this.batchTimer = undefined;
            }
            this.state.deadEvents = [];
            this.state.hotspotMap.clear();
            this.notifyReportUpdate();
        }
    }

    private sendBatchOnUnload(): void {
        if (!this.options.batch.enabled || this.state.deadEvents.length === 0) return;

        const report = this.getReport();

        try {
            navigator.sendBeacon(
                this.options.batch.endpoint,
                new Blob([JSON.stringify(report)], { type: 'application/json' })
            );
        } catch (error) {
            console.warn('[DCR] Failed to send beacon:', error);
        }
    }

    getReport(): DeadClickReport {
        if (!this.isBrowser) {
            return {
                page: '',
                sessionId: 'ssr-dummy',
                totalClicks: 0,
                deadClicks: 0,
                hotspots: [],
                events: [],
                viewport: { w: 0, h: 0 },
                ua: '',
                ts: Date.now()
            };
        }

        return {
            page: window.location.href,
            sessionId: this.state.sessionId,
            totalClicks: this.state.totalClicks,
            deadClicks: this.state.deadEvents.length,
            hotspots: Array.from(this.state.hotspotMap.values())
                .sort((a, b) => b.count - a.count),
            events: this.state.deadEvents.slice(),
            viewport: {
                w: window.innerWidth,
                h: window.innerHeight
            },
            ua: navigator.userAgent,
            ts: Date.now()
        };
    }

    exportJSON(pretty = false): string {
        return JSON.stringify(this.getReport(), null, pretty ? 2 : 0);
    }

    exportPNG(): string {
        if (!this.isBrowser) return '';
        return this.heatmap.exportPNG();
    }

    exportFullPagePNG(): string {
        if (!this.isBrowser) return '';
        return this.heatmap.exportFullPagePNG();
    }

    destroy(): void {
        if (!this.isBrowser) return;
        this.stop();
        this.heatmap.destroy();
    }
}