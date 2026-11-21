/**
 * Gamepad - Base Controller
 * Ported & typed from https://github.com/rokobuljan/gamepad
 */
import { el, elNew, norm, TAU, userSelectNoneForAllBrowsers } from './utils';

export type ControllerType = 'button' | 'joystick' | 'dpad';
export type ControllerAxis = 'all' | 'x' | 'y';
export type ControllerStyle = Partial<CSSStyleDeclaration> & Record<`--${string}`, string>;

export interface ControllerOptions<T extends Controller = Controller> {
  id?: string;
  type?: ControllerType;
  parent?: string | HTMLElement;
  axis?: ControllerAxis;
  radius?: number;
  text?: string;
  position?: ControllerStyle;
  style?: ControllerStyle;
  fixed?: boolean;
  spring?: boolean;
  draggableHandle?: boolean;
  dragRadius?: number;
  deadZone?: number;
  directionsTot?: number;
  isPress?: boolean;
  isActive?: boolean;
  isDrag?: boolean;
  value?: number;
  angle?: number;
  angleDirection?: number;
  direction?: number;
  xStart?: number;
  yStart?: number;
  xDrag?: number;
  yDrag?: number;
  xDiff?: number;
  yDiff?: number;
  distanceDrag?: number;
  onInput?: (this: T) => void;
  onInit?: (this: T) => void;
  onStart?: (this: T) => void;
  onMove?: (this: T) => void;
  onEnd?: (this: T) => void;
  onDragMove?: (dx: number, dy: number, controller: T) => void;
}

export class Controller {
  #elEventStarter: HTMLElement | null = null;
  #pointerId: number | null = null;
  #isInitialized = false;
  #isTouchMovable = false;
  #elParent: HTMLElement | null = null;
  #elAnchor: HTMLDivElement | null = null;
  #lastClientX = 0;
  #lastClientY = 0;

  protected el: HTMLDivElement | null = null;

  public type: ControllerType | undefined;
  public parent: string | HTMLElement = 'body';
  public axis: ControllerAxis = 'all';
  public radius = 50;
  public text = '';
  public position: ControllerStyle = { top: '50%', left: '50%' };
  public style: ControllerStyle;
  public fixed = true;
  public spring = true;
  public draggableHandle = false;
  public dragRadius = 40;
  public isPress = false;
  public isActive = false;
  public isDrag = false;
  public deadZone = 0;
  public value = 0;
  public angle = 0;
  public angleDirection = 0;
  public direction = 0;
  public directionsTot = 8;
  public xStart = 0;
  public yStart = 0;
  public xDiff = 0;
  public yDiff = 0;
  public distanceDrag = 0;
  public xDrag?: number;
  public yDrag?: number;
  public id: string;

  public onInput: (this: Controller) => void = function () {};
  public onDragMove?: (dx: number, dy: number, controller: Controller) => void;

  constructor(options: ControllerOptions<any> = {}) {
    Object.assign(this, options);
    const randomId =
      typeof crypto !== 'undefined' && crypto.getRandomValues
        ? Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-')
        : `${Math.random().toString(36).slice(2)}-${Date.now()}`;
    this.id = options.id || `gamepad-${randomId}`;
    this.style = {
      border: '2px solid currentColor',
      ...(options.style || {}),
    } as ControllerStyle;
    this.#isTouchMovable =
      this.type === 'joystick' ||
      this.type === 'dpad' ||
      Boolean(options.onDragMove) ||
      Boolean(options.draggableHandle);
  }

  public get element(): HTMLDivElement | null {
    return this.el;
  }

  public get anchorElement(): HTMLDivElement | null {
    return this.#elAnchor;
  }

  public setActive(active: boolean): void {
    this.isActive = active;
    if (!this.spring) {
      this.value = active ? 1 : 0;
    }
    this.el?.classList.toggle('is-active', active);
  }

  public setText(html: string): void {
    this.text = html;
    if (this.el) {
      this.el.innerHTML = html;
    }
  }

  protected onInit(): void {}
  protected onStart(): void {}
  protected onMove(): void {}
  protected onEnd(): void {}

  #noDefault = (evt: Event): void => {
    evt.preventDefault();
  };

  #getPointerXY(evt: PointerEvent, targetEl: Element): { x: number; y: number } {
    const { clientX, clientY } = evt;
    const { left, top } = targetEl.getBoundingClientRect();
    return {
      x: clientX - left,
      y: clientY - top,
    };
  }

  #calculate(evt: PointerEvent): void {
    if (!this.#elParent) return;
    const { x, y } = this.#getPointerXY(evt, this.#elParent);
    this.xDrag = x;
    this.yDrag = y;
    this.xDiff = this.xDrag - this.xStart;
    this.yDiff = this.yDrag - this.yStart;

    if (this.type === 'dpad') {
      if (this.axis === 'x') this.yDiff = 0;
      if (this.axis === 'y') this.xDiff = 0;
    }

    this.distanceDrag = Math.min(this.radius, Math.hypot(this.xDiff, this.yDiff));
    this.angle = norm(Math.atan2(this.yDiff, this.xDiff));
    this.direction = Math.round(this.angle / (TAU / this.directionsTot)) % this.directionsTot;
    this.angleDirection = (TAU * this.direction) / this.directionsTot;
  }

  #handleStart = (evt: PointerEvent): void => {
    if (!this.#elParent || !this.#elEventStarter || !this.el || !this.#elAnchor) return;
    if (this.#pointerId !== null) return;

    if (
      !this.fixed &&
      evt.target instanceof Element &&
      evt.target.closest('.Gamepad-button, .Gamepad-dpad, .Gamepad-fixed-control')
    ) {
      return;
    }

    evt.preventDefault();
    evt.stopPropagation();

    this.#pointerId = evt.pointerId;
    this.#lastClientX = evt.clientX;
    this.#lastClientY = evt.clientY;
    try {
      this.#elEventStarter.setPointerCapture(this.#pointerId);
    } catch {
      // Synthetic pointer events in unit tests may not register pointerId
    }

    const { x, y } = this.#getPointerXY(evt, this.#elParent);
    this.isPress = true;
    this.isActive = this.spring ? true : !this.isActive;
    this.xStart = x;
    this.yStart = y;

    if (this.type === 'dpad') {
      const rect = this.el.getBoundingClientRect();
      const parentRect = this.#elParent.getBoundingClientRect();
      this.xStart = rect.left + rect.width / 2 - parentRect.left;
      this.yStart = rect.top + rect.height / 2 - parentRect.top;
    }

    this.#calculate(evt);
    if (!this.fixed) {
      this.#elAnchor.style.left = `${this.xStart}px`;
      this.#elAnchor.style.top = `${this.yStart}px`;
    }

    const isMovableOnly = this.type === 'joystick' || this.type === 'dpad';
    this.el.classList.toggle('is-active', isMovableOnly ? this.isPress : this.isActive);
    this.onStart();
  };

  #handleMove = (evt: PointerEvent): void => {
    if (evt.pointerId !== this.#pointerId || !this.isPress) return;
    evt.preventDefault();
    this.isDrag = true;

    const dx = evt.clientX - this.#lastClientX;
    const dy = evt.clientY - this.#lastClientY;
    this.#lastClientX = evt.clientX;
    this.#lastClientY = evt.clientY;

    this.#calculate(evt);
    this.onMove();
    if (this.onDragMove && (dx !== 0 || dy !== 0)) {
      this.onDragMove(dx, dy, this);
    }
  };

  #handleEnd = (evt: PointerEvent): void => {
    if (!this.#elEventStarter || !this.el) return;
    if (evt.pointerId !== this.#pointerId) return;

    try {
      this.#elEventStarter.releasePointerCapture(this.#pointerId);
    } catch {
      // Ignore if pointer capture already released
    }

    this.#pointerId = null;
    this.isDrag = false;
    this.isPress = false;
    if (this.spring) this.isActive = false;

    const isMovableOnly = this.type === 'joystick' || this.type === 'dpad';
    this.el.classList.toggle('is-active', isMovableOnly ? this.isPress : this.isActive);
    this.onEnd();
  };

  public init(): void {
    if (this.#isInitialized) {
      this.destroy();
    }

    this.#pointerId = null;
    this.#elParent = el<HTMLElement>(this.parent);
    if (!this.#elParent) throw new Error(`Gamepad: Parent not found: ${String(this.parent)}`);

    this.#elAnchor = elNew('div', {
      className: 'Gamepad-anchor',
    });

    this.el = elNew('div', {
      id: this.id,
      innerHTML: this.text,
      className: `Gamepad-controller Gamepad-${this.type} axis-${this.axis}`,
    });

    const stylesCommon: Record<string, string> = {
      boxSizing: 'content-box',
      transform: 'translate(-50%, -50%)',
      position: 'absolute',
      fontSize: `${Math.max(12, Math.round(this.radius * 0.34))}px`,
      borderRadius: `${this.radius * 2}px`,
      display: 'inline-flex',
      justifyContent: 'center',
      alignItems: 'center',
      touchAction: 'none',
      ...userSelectNoneForAllBrowsers,
    };

    const stylesByAxisType: Record<ControllerAxis, Record<string, string>> = {
      all: { minWidth: `${this.radius * 2}px`, height: `${this.radius * 2}px` },
      x: { width: `${this.radius * 2}px`, height: '6px' },
      y: { height: `${this.radius * 2}px`, width: '6px' },
    };

    Object.assign(this.#elAnchor.style, {
      position: 'absolute',
      width: '0',
      height: '0',
      ...userSelectNoneForAllBrowsers,
      touchAction: 'none',
      ...this.position,
    });

    Object.assign(this.el.style, {
      ...stylesCommon,
      ...stylesByAxisType[this.axis],
      ...this.style,
    });

    this.#elAnchor.append(this.el);
    this.#elParent.append(this.#elAnchor);

    this.#elEventStarter = this.fixed ? this.el : this.#elParent;
    this.#elEventStarter.addEventListener('pointerdown', this.#handleStart, { passive: false });
    if (this.#isTouchMovable) {
      this.#elEventStarter.addEventListener('pointermove', this.#handleMove, { passive: false });
    }
    this.#elEventStarter.addEventListener('pointerup', this.#handleEnd);
    this.#elEventStarter.addEventListener('pointercancel', this.#handleEnd);
    this.#elEventStarter.addEventListener('contextmenu', this.#noDefault);

    this.#isInitialized = true;
    this.onInit();
  }

  public destroy(): void {
    this.#isInitialized = false;
    this.#pointerId = null;
    this.#elEventStarter?.removeEventListener('pointerdown', this.#handleStart);
    if (this.#isTouchMovable) {
      this.#elEventStarter?.removeEventListener('pointermove', this.#handleMove);
    }
    this.#elEventStarter?.removeEventListener('pointerup', this.#handleEnd);
    this.#elEventStarter?.removeEventListener('pointercancel', this.#handleEnd);
    this.#elEventStarter?.removeEventListener('contextmenu', this.#noDefault);

    this.#elAnchor?.remove();
    this.#elEventStarter = null;
    this.#elParent = null;
    this.#elAnchor = null;
    this.el = null;
  }
}
