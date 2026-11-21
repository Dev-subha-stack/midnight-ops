/**
 * Gamepad - Joystick Controller
 * Ported & typed from https://github.com/rokobuljan/gamepad
 */
import { Controller, ControllerOptions, ControllerStyle } from './controller';
import { elNew } from './utils';

export class Joystick extends Controller {
  #elHandle: HTMLDivElement | null = null;
  #initialPosition: ControllerStyle = {};

  constructor(options: ControllerOptions<Joystick> = {}) {
    super({ ...options, type: 'joystick' });
    this.#initialPosition = { ...(this.position || {}) };
  }

  public getVector(): { x: number; y: number; magnitude: number } {
    if (this.axis === 'x') {
      return { x: this.value, y: 0, magnitude: Math.abs(this.value) };
    }
    if (this.axis === 'y') {
      return { x: 0, y: this.value, magnitude: Math.abs(this.value) };
    }
    const raw = Math.max(0, Math.min(1, this.value));
    if (raw <= this.deadZone) {
      return { x: 0, y: 0, magnitude: 0 };
    }
    const scaled = (raw - this.deadZone) / Math.max(0.001, 1 - this.deadZone);
    return {
      x: Math.cos(this.angle) * scaled,
      y: -Math.sin(this.angle) * scaled, // +1 is UP/forward on screen
      magnitude: scaled,
    };
  }

  protected override onStart(): void {
    super.onStart();
    this.value = 0;
    this.onInput();
  }

  protected override onMove(): void {
    super.onMove();
    if (!this.#elHandle) return;

    if (this.axis === 'all') {
      this.value = this.distanceDrag / this.radius;
      const xPos = this.distanceDrag * Math.cos(this.angle) + this.radius;
      const yPos = this.distanceDrag * Math.sin(this.angle) + this.radius;
      this.#elHandle.style.left = `${xPos}px`;
      this.#elHandle.style.top = `${yPos}px`;
    } else if (this.axis === 'x') {
      this.value = Math.max(Math.min(this.xDiff / this.radius, 1), -1);
      const xPos = this.value * this.radius + this.radius;
      this.#elHandle.style.left = `${xPos}px`;
    } else if (this.axis === 'y') {
      this.value = Math.max(Math.min(-this.yDiff / this.radius, 1), -1);
      const yPos = -this.value * this.radius + this.radius;
      this.#elHandle.style.top = `${yPos}px`;
    }
    this.onInput();
  }

  protected override onEnd(): void {
    super.onEnd();
    if (!this.spring || !this.#elHandle) return;
    this.value = 0;
    this.#elHandle.style.left = '50%';
    this.#elHandle.style.top = '50%';
    if (!this.fixed && this.anchorElement) {
      Object.assign(this.anchorElement.style, {
        top: '',
        right: '',
        bottom: '',
        left: '',
        ...this.#initialPosition,
      });
    }
    this.onInput();
  }

  public override init(): void {
    super.init();
    if (!this.el) return;

    this.#elHandle = elNew('div', {
      className: 'Gamepad-joystick-handle',
    });

    Object.assign(this.#elHandle.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: `${this.radius * 2 * 0.48}px`,
      height: `${this.radius * 2 * 0.48}px`,
      background: 'currentColor',
      color: 'inherit',
      transform: 'translate(-50%, -50%)',
      borderRadius: 'inherit',
      pointerEvents: 'none',
    });

    this.el.append(this.#elHandle);
  }

  public override destroy(): void {
    super.destroy();
    this.#elHandle = null;
  }
}
