/**
 * Gamepad Utilities
 * Ported & typed from https://github.com/rokobuljan/gamepad
 */

export const elNew = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  prop?: Partial<HTMLElementTagNameMap[K]>
): HTMLElementTagNameMap[K] => Object.assign(document.createElement(tag), prop);

export const el = <T extends Element = Element>(
  sel: string | HTMLElement,
  PAR?: ParentNode | null
): T | null => {
  if (typeof sel !== 'string') return sel as unknown as T;
  return (PAR || document).querySelector<T>(sel);
};

export const userSelectNoneForAllBrowsers: Record<string, string> = {
  userSelect: 'none',
  '-webkit-touch-callout': 'none',
  '-webkit-user-select': 'none',
  '-khtml-user-select': 'none',
  '-moz-user-select': 'none',
  '-ms-user-select': 'none',
  'user-select': 'none',
};

export const TAU = Math.PI * 2;

export const norm = (rad: number): number => rad - TAU * Math.floor(rad / TAU);

export const lerpAngles = (A: number, B: number, w: number): number => {
  const CS = (1 - w) * Math.cos(A) + w * Math.cos(B);
  const SN = (1 - w) * Math.sin(A) + w * Math.sin(B);
  return Math.atan2(SN, CS);
};

export const isTouchCapableDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hasCoarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const hasTouch = 'ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0);
  return Boolean(hasCoarse || hasTouch);
};
