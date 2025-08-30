import { throttle } from './utils.js';

export class HeatmapCanvas {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private kernel: HTMLCanvasElement;
    private allDots: Array<{ x: number; y: number }> = [];
    private maxDots = 5000;
    private paused = false;
    private cleanup: Array<() => void> = [];
    private rafId: number | null = null;

    private scheduleRedraw = () => {
        if (this.paused || this.rafId) return;
        this.rafId = requestAnimationFrame(() => {
            this.rafId = null;
            this.redrawAll();
        });
    };

    private onResize = () => {
        if (this.paused) return;
        this.updateCanvasSize();
        this.scheduleRedraw();
    };
    private onScroll = this.scheduleRedraw;
    private onVisibility = () => {
        if (document.hidden) {
            this.paused = true;
        } else {
            this.paused = false;
            this.redrawAll();
        }
    };

    constructor(
        private alpha: number = 0.35,
        private dotRadius: number = 24,
        private zIndex: number = 999999
    ) {
        this.canvas = this.createCanvas();
        this.ctx = this.canvas.getContext('2d')!;
        this.kernel = this.createKernel();

        this.updateCanvasSize();

        window.addEventListener('resize', this.onResize);
        window.addEventListener('scroll', this.onScroll, { passive: true });
        document.addEventListener('visibilitychange', this.onVisibility);

        // Отслеживаем изменения DPR
        const mq = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
        const onResChange = () => { this.updateCanvasSize(); this.redrawAll(); };
        mq.addEventListener?.('change', onResChange);
        // Добавляем в cleanup (будет создан ниже в методах)
        this.cleanup = [
            () => mq.removeEventListener?.('change', onResChange)
        ];
    }

    private createCanvas(): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: ${this.zIndex};
      opacity: ${this.alpha};
    `;
        return canvas;
    }

    private updateCanvasSize() {
        const dpr = window.devicePixelRatio || 1;
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Устанавливаем реальный размер canvas с учетом DPR
        this.canvas.width = Math.max(1, Math.floor(w * dpr));
        this.canvas.height = Math.max(1, Math.floor(h * dpr));

        // CSS размеры остаются как есть
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';

        // Сбрасываем трансформацию и устанавливаем масштаб для DPR
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
    }

    private createKernel(): HTMLCanvasElement {
        const size = this.dotRadius * 2;
        const kernel = document.createElement('canvas');
        kernel.width = kernel.height = size;

        const ctx = kernel.getContext('2d')!;
        const gradient = ctx.createRadialGradient(
            size / 2, size / 2, 0,
            size / 2, size / 2, size / 2
        );

        gradient.addColorStop(0, 'rgba(255, 50, 50, 0.8)');
        gradient.addColorStop(0.4, 'rgba(255, 100, 50, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 150, 50, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        return kernel;
    }

    private handleResize() {
        this.updateCanvasSize();
        this.redrawAll();
    }

    private renderDots(dots: Array<{ x: number; y: number }> = this.allDots) {
        if (!dots.length) return;

        this.ctx.globalCompositeOperation = 'lighter';

        // Кэшируем размеры для оптимизации
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const radius = this.dotRadius;

        for (const dot of dots) {
            // Переводим координаты страницы в координаты вьюпорта
            const x = dot.x - scrollX;
            const y = dot.y - scrollY;

            // Рисуем только если точка видна во вьюпорте (с небольшим буфером)
            if (x >= -radius && x <= vw + radius && y >= -radius && y <= vh + radius) {
                this.ctx.drawImage(this.kernel, x - radius, y - radius);
            }
        }

        this.ctx.globalCompositeOperation = 'source-over';
    }

    private redrawAll() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.renderDots();
    }

    show() {
        if (!this.canvas.parentElement) {
            document.body.appendChild(this.canvas);
        }
    }

    hide() {
        if (this.canvas.parentElement) {
            this.canvas.parentElement.removeChild(this.canvas);
        }
    }

    addDot(xPage: number, yPage: number) {
        // Сохраняем координаты в системе координат страницы
        this.allDots.push({ x: xPage, y: yPage });

        // Применяем лимит для предотвращения утечек памяти
        if (this.allDots.length > this.maxDots) {
            this.allDots.shift();
        }

        // Рисуем новую точку
        this.renderDots([{ x: xPage, y: yPage }]);
    }

    clear() {
        this.allDots = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // API для динамического изменения параметров
    setAlpha(alpha: number) {
        this.alpha = alpha;
        this.canvas.style.opacity = String(alpha);
        this.redrawAll();
    }

    setDotRadius(radius: number) {
        this.dotRadius = radius;
        this.kernel = this.createKernel(); // пересоздаем ядро с новым радиусом
        this.redrawAll();
    }

    setZIndex(zIndex: number) {
        this.zIndex = zIndex;
        this.canvas.style.zIndex = String(zIndex);
    }

    setMaxDots(maxDots: number) {
        this.maxDots = maxDots;
        // Обрезаем существующий массив если нужно
        if (this.allDots.length > maxDots) {
            this.allDots = this.allDots.slice(-maxDots);
            this.redrawAll();
        }
    }

    // Экспорт полной карты страницы с защитой от огромных размеров
    exportFullPagePNG(maxSidePx: number = 16384): string {
        const de = document.documentElement;
        const dpr = window.devicePixelRatio || 1;

        let width = de.scrollWidth;
        let height = de.scrollHeight;

        // Защита от слишком больших canvas
        const scale = Math.min(1, maxSidePx / Math.max(width, height));
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);

        const fullCanvas = document.createElement('canvas');
        const fullCtx = fullCanvas.getContext('2d')!;

        fullCanvas.width = Math.floor(width * dpr);
        fullCanvas.height = Math.floor(height * dpr);

        fullCtx.scale(dpr * scale, dpr * scale);
        fullCtx.globalCompositeOperation = 'lighter';

        // Рисуем все точки без учета скролла, с учетом масштаба
        const radiusScaled = this.dotRadius * scale;
        for (const dot of this.allDots) {
            // Создаем временное ядро нужного размера если масштабируем
            if (scale !== 1) {
                const scaledKernel = this.createScaledKernel(radiusScaled);
                fullCtx.drawImage(scaledKernel, dot.x - radiusScaled, dot.y - radiusScaled);
            } else {
                fullCtx.drawImage(this.kernel, dot.x - this.dotRadius, dot.y - this.dotRadius);
            }
        }

        return fullCanvas.toDataURL('image/png');
    }

    private createScaledKernel(radius: number): HTMLCanvasElement {
        const size = radius * 2;
        const kernel = document.createElement('canvas');
        kernel.width = kernel.height = size;

        const ctx = kernel.getContext('2d')!;
        const gradient = ctx.createRadialGradient(
            size / 2, size / 2, 0,
            size / 2, size / 2, size / 2
        );

        gradient.addColorStop(0, 'rgba(255, 50, 50, 0.8)');
        gradient.addColorStop(0.4, 'rgba(255, 100, 50, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 150, 50, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        return kernel;
    }

    exportPNG(): string {
        return this.canvas.toDataURL('image/png');
    }

    destroy() {
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }

        window.removeEventListener('resize', this.onResize);
        window.removeEventListener('scroll', this.onScroll);
        document.removeEventListener('visibilitychange', this.onVisibility);

        // Выполняем дополнительную очистку (например, DPR listener)
        this.cleanup.forEach(fn => fn());
        this.cleanup = [];

        this.hide();
    }
}