/**
 * Создает короткий CSS-селектор для элемента
 */
export function buildCssPath(element: Element, maxDepth = 5): string {
    const parts: string[] = [];
    let current: Element | null = element;
    let depth = 0;

    while (current && depth < maxDepth) {
        let selector = current.tagName.toLowerCase();

        // Добавляем ID если есть
        const id = (current as HTMLElement).id;
        if (id && /^[a-zA-Z][\w-]*$/.test(id)) {
            selector += `#${id}`;
            parts.unshift(selector);
            break; // ID уникален, можно остановиться
        }

        // Добавляем первые 2 класса если есть
        const classes = (current as HTMLElement).className;
        if (typeof classes === 'string' && classes.trim()) {
            const validClasses = classes
                .split(/\s+/)
                .filter(cls => cls && /^[a-zA-Z_-][\w-]*$/.test(cls))
                .slice(0, 2)
                .map(cls => `.${cls}`)
                .join('');

            if (validClasses) {
                selector += validClasses;
            }
        }

        parts.unshift(selector);
        current = current.parentElement;
        depth++;
    }

    return parts.join(' > ');
}

/**
 * Определяет, выглядит ли элемент интерактивным
 */
export function looksInteractive(element: Element): boolean {
    // Явно интерактивные элементы
    const interactive = element.closest('button,a,[role="button"],[onclick],input,select,textarea,summary,[tabindex]');
    if (interactive) return true;

    // Проверяем стили курсора
    const style = window.getComputedStyle(element as HTMLElement);
    if (style.cursor === 'pointer') return true;

    return false;
}

/**
 * Извлекает текст рядом с элементом для контекста
 */
export function extractSampleText(element: Element): string {
    // Сначала пробуем текст самого элемента
    let text = element.textContent?.trim() || '';

    // Если пусто, ищем в ближайших элементах
    if (!text) {
        const parent = element.parentElement;
        if (parent) {
            text = parent.textContent?.trim() || '';
        }
    }

    // Обрезаем до разумной длины
    return text.slice(0, 60);
}

/**
 * Проверяет, нужно ли игнорировать элемент
 */
export function shouldIgnoreElement(
    element: Element,
    ignoredSelectors: string[] = []
): boolean {
    // Игнорируем элементы с специальным атрибутом
    if (element.closest('[data-dcr-ignore]')) return true;

    // Игнорируем contenteditable
    if ((element as HTMLElement).isContentEditable) return true;

    // Проверяем кастомные селекторы
    for (const selector of ignoredSelectors) {
        try {
            if (element.matches(selector) || element.closest(selector)) {
                return true;
            }
        } catch (e) {
            console.warn('[DCR] Invalid ignored selector:', selector);
        }
    }

    return false;
}

/**
 * Генерирует уникальный ID сессии
 */
export function generateSessionId(): string {
    return `dcr_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Проверяет дистанцию между кликами для дедупликации
 */
export function getClickDistance(
    x1: number, y1: number,
    x2: number, y2: number
): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2); // Manhattan distance
}

/**
 * Throttle функция для оптимизации
 */
export function throttle<T extends (...args: any[]) => void>(
    func: T,
    delay: number
): T {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let lastExecTime = 0;

    return ((...args: Parameters<T>) => {
        const currentTime = Date.now();

        if (currentTime - lastExecTime > delay) {
            func(...args);
            lastExecTime = currentTime;
        } else {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func(...args);
                lastExecTime = Date.now();
            }, delay - (currentTime - lastExecTime));
        }
    }) as T;
}