import '@testing-library/jest-dom/vitest';

// cmdk v1 uses ResizeObserver and scrollIntoView — not in JSDOM
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
// jsdom has no canvas. A null context is what real browsers return when drawing is
// unavailable, and components must cope with it (see landing/NightRoad.jsx).
window.HTMLCanvasElement.prototype.getContext = function getContext() { return null; };
// Radix UI Select uses hasPointerCapture/releasePointerCapture — not in JSDOM
window.HTMLElement.prototype.hasPointerCapture = function hasPointerCapture() { return false; };
window.HTMLElement.prototype.setPointerCapture = function setPointerCapture() {};
window.HTMLElement.prototype.releasePointerCapture = function releasePointerCapture() {};
