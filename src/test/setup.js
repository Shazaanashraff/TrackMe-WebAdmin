import '@testing-library/jest-dom/vitest';

// cmdk v1 uses ResizeObserver and scrollIntoView — not in JSDOM
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
