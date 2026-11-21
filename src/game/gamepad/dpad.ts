/**
 * Gamepad - DPad Controller
 * Ported & typed from https://github.com/rokobuljan/gamepad
 */
import { Controller, ControllerOptions } from './controller';
import { elNew } from './utils';

export class DPad extends Controller {
  #elX: HTMLDivElement | null = null;
  #elY: HTMLDivElement | null = null;

  constructor(options: ControllerOptions<DPad> = {}) {
    const resolvedDeadZone =
      options.deadZone !== undefined ? options.deadZone : (options.axis || 'all') === 'all' ? 0.2 : 0;
    super({
      ...options,
      type: 'dpad',
      fixed: true,
      deadZone: resolvedDeadZone,
    });
  }

  protected override onStart(): void {
    super.onStart();
    this.#update();
  }

  protected override onMove(): void {
    super.onMove();
    this.#update();
  }

  protected override onEnd(): void {
    super.onEnd();
    if (!this.spring) return;
    this.value = 0;
    this.#highlight();
    this.onInput();
  }

  #update(): void {
    this.value = this.distanceDrag > this.radius * this.deadZone ? 1 : 0;
    this.#highlight();
    this.onInput();
  }

  #highlight(): void {
    if (!this.#elX || !this.#elY) return;
    const x = this.value ? Math.round(Math.cos(this.angleDirection)) : 0;
    const y = this.value ? Math.round(Math.sin(this.angleDirection)) : 0;

    const gradient = (side: number) =>
      side
        ? `linear-gradient(to ${side < 0 ? 'right' : 'left'}, currentColor 0%, currentColor 50%, transparent 50%, transparent 100%)`
        : 'none';

    this.#elX.style.backgroundImage = gradient(x);
    this.#elY.style.backgroundImage = gradient(y);
  }

  public override init(): void {
    super.init();
    if (!this.el) return;

    const stylesGP: Record<string, string> = {
      '--border': '2px',
      boxSizing: 'content-box',
      transform: 'translate(-50%, -50%)',
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
      userSelect: 'none',
      width: `${this.radius * (this.axis === 'y' ? 1 : 2)}px`,
      minWidth: `${this.radius * (this.axis === 'y' ? 1 : 2)}px`,
      height: `${this.radius * (this.axis === 'x' ? 1 : 2)}px`,
      border: 'none',
    };

    const shape =
      'calc(25% + (var(--border) / 2)) 0, calc(75% - (var(--border) / 2)) 0, calc(75% - (var(--border) / 2)) 100%, calc(25% - (var(--border) / 2)) 100%, calc(25% + (var(--border) / 2)) 100%, 25% 0';

    const stylesGPxy: Record<string, string> = {
      boxShadow: 'inset 0 0 0 var(--border) currentcolor',
      width: `${this.radius * 2}px`,
      height: `${this.radius}px`,
      borderRadius: '10px',
      '--shape': shape,
      clipPath:
        this.axis === 'all'
          ? 'polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, var(--shape)) content-box'
          : 'none',
    };

    const stylesGPy: Record<string, string> = {
      rotate: '90deg',
      position: 'absolute',
    };

    const elX = (this.#elX = elNew('div', {
      className: 'Gamepad-dpad-x',
    }));
    const elY = (this.#elY = elNew('div', {
      className: 'Gamepad-dpad-y',
    }));

    Object.assign(this.el.style, stylesGP);
    Object.assign(elX.style, stylesGPxy);
    Object.assign(elY.style, stylesGPxy, stylesGPy);

    if (this.axis === 'y') elX.style.display = 'none';
    if (this.axis === 'x') elY.style.display = 'none';

    this.el.style.setProperty('--border', '2px');
    elX.style.setProperty('--shape', shape);
    elY.style.setProperty('--shape', shape);

    this.el.append(elX, elY);
    this.#highlight();
  }

  public override destroy(): void {
    super.destroy();
    this.#elX = null;
    this.#elY = null;
  }
}
