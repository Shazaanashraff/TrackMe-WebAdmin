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
// jsdom does not play media and logs "not implemented" if asked to. These stubs behave like a
// browser that allowed autoplay (see landing/HeroFilm.jsx).
window.HTMLMediaElement.prototype.play = function play() { return Promise.resolve(); };
window.HTMLMediaElement.prototype.pause = function pause() {};
// Radix UI Select uses hasPointerCapture/releasePointerCapture — not in JSDOM
window.HTMLElement.prototype.hasPointerCapture = function hasPointerCapture() { return false; };
window.HTMLElement.prototype.setPointerCapture = function setPointerCapture() {};
window.HTMLElement.prototype.releasePointerCapture = function releasePointerCapture() {};
