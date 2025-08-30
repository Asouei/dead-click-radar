import { describe, it, expect, beforeEach } from 'vitest';
import { buildCssPath, looksInteractive, getClickDistance } from '../utils.js';

// Настройка DOM для тестов
Object.defineProperty(window, 'getComputedStyle', {
    value: (element: Element) => ({
        cursor: (element as any).style?.cursor || 'auto'
    })
});

describe('buildCssPath', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('создает простой селектор для элемента с ID', () => {
        document.body.innerHTML = '<button id="test-btn">Click me</button>';
        const button = document.getElementById('test-btn')!;

        expect(buildCssPath(button)).toBe('button#test-btn');
    });

    it('создает селектор с классами', () => {
        document.body.innerHTML = '<div class="card primary active">Content</div>';
        const div = document.querySelector('.card')!;

        expect(buildCssPath(div)).toBe('div.card.primary');
    });

    it('строит иерархический путь', () => {
        document.body.innerHTML = `
      <div class="container">
        <section class="content">
          <button class="btn submit">Submit</button>
        </section>
      </div>
    `;
        const button = document.querySelector('.btn')!;
        const path = buildCssPath(button);

        expect(path).toContain('button.btn.submit');
        expect(path).toContain('section.content');
    });
});

describe('looksInteractive', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('определяет интерактивные элементы', () => {
        document.body.innerHTML = `
      <button>Button</button>
      <a href="#">Link</a>
      <div role="button">Div Button</div>
      <span onclick="test()">Clickable</span>
      <input type="text">
    `;

        expect(looksInteractive(document.querySelector('button')!)).toBe(true);
        expect(looksInteractive(document.querySelector('a')!)).toBe(true);
        expect(looksInteractive(document.querySelector('[role="button"]')!)).toBe(true);
        expect(looksInteractive(document.querySelector('[onclick]')!)).toBe(true);
        expect(looksInteractive(document.querySelector('input')!)).toBe(true);
    });

    it('определяет неинтерактивные элементы', () => {
        document.body.innerHTML = `
      <div>Regular div</div>
      <span>Regular span</span>
      <p>Paragraph</p>
    `;

        expect(looksInteractive(document.querySelector('div')!)).toBe(false);
        expect(looksInteractive(document.querySelector('span')!)).toBe(false);
        expect(looksInteractive(document.querySelector('p')!)).toBe(false);
    });
});

describe('getClickDistance', () => {
    it('вычисляет Manhattan distance правильно', () => {
        expect(getClickDistance(0, 0, 3, 4)).toBe(7); // |3-0| + |4-0| = 7
        expect(getClickDistance(10, 10, 10, 10)).toBe(0);
        expect(getClickDistance(5, 5, 2, 8)).toBe(6); // |5-2| + |5-8| = 3+3 = 6
    });
});