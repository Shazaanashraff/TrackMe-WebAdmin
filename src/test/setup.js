import '@testing-library/jest-dom/vitest';

// cmdk v1 uses ResizeObserver and scrollIntoView — not in JSDOM
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
// Radix UI Select uses hasPointerCapture/releasePointerCapture — not in JSDOM
window.HTMLElement.prototype.hasPointerCapture = function hasPointerCapture() { return false; };
window.HTMLElement.prototype.setPointerCapture = function setPointerCapture() {};
window.HTMLElement.prototype.releasePointerCapture = function releasePointerCapture() {};
