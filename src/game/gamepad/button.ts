/**
 * Gamepad - Button Controller
 * Ported & typed from https://github.com/rokobuljan/gamepad
 * Extended with Free Fire-style Draggable Fire Knob mode.
 */
import { Controller, ControllerOptions } from './controller';
import { elNew } from './utils';

export class Button extends Controller {
  #elKnob: HTMLDivElement | null = null;

  constructor(options: ControllerOptions<Button> = {}) {
    super({ ...options, type: 'button' });
  }

  public override setText(html: string): void {
    this.text = html;
    if (this.draggableHandle && this.#elKnob) {
      this.#elKnob.innerHTML = html;
      return;
    }
    if (this.el) {
      this.el.innerHTML = html;
    }
  }

  protected override onStart(): void {
    super.onStart();
    this.value = this.spring ? 1 : this.isActive ? 1 : 0;
    if (this.draggableHandle && this.el && this.#elKnob) {
      this.el.style.transition = 'box-shadow 80ms ease-out';
      this.#elKnob.style.transition = 'none';
    }
    this.onInput();
  }

  protected override onMove(): void {
    super.onMove();
    if (!this.draggableHandle || !this.el || !this.#elKnob) return;

    const dist = Math.hypot(this.xDiff, this.yDiff);
    const maxKnob = this.dragRadius || Math.round(this.radius * 1.2);
    const knobScale = dist > 0 ? Math.min(dist, maxKnob) / dist : 0;
    const kx = this.xDiff * knobScale;
    const ky = this.yDiff * knobScale;

    this.#elKnob.style.left = `calc(50% + ${kx.toFixed(1)}px)`;
    this.#elKnob.style.top = `calc(50% + ${ky.toFixed(1)}px)`;

    // Soft outer-ring follow so the whole fire pad glides with the thumb drag
    const outerMax = 20;
    const outerScale = dist > 0 ? Math.min(dist * 0.28, outerMax) / dist : 0;
    const ox = this.xDiff * outerScale;
    const oy = this.yDiff * outerScale;
    this.el.style.transform = `translate(calc(-50% + ${ox.toFixed(1)}px), calc(-50% + ${oy.toFixed(1)}px))`;
  }

  protected override onEnd(): void {
    super.onEnd();
    if (this.draggableHandle && this.el && this.#elKnob) {
      this.el.style.transition = 'transform 140ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 80ms ease-out';
      this.el.style.transform = 'translate(-50%, -50%)';
      this.#elKnob.style.transition = 'left 140ms cubic-bezier(0.22, 1, 0.36, 1), top 140ms cubic-bezier(0.22, 1, 0.36, 1)';
      this.#elKnob.style.left = '50%';
      this.#elKnob.style.top = '50%';
    }
    if (!this.spring) return;
    this.value = 0;
    this.onInput();
  }

  public override init(): void {
    super.init();
    if (!this.el || !this.draggableHandle) return;

    this.el.classList.add('Gamepad-fire-draggable');
    this.el.style.overflow = 'visible';
    this.el.innerHTML = '';

    const knobSize = Math.round(this.radius * 1.56);
    this.#elKnob = elNew('div', {
      className: 'Gamepad-fire-knob',
      innerHTML: this.text,
    });

    Object.assign(this.#elKnob.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: `${knobSize}px`,
      height: `${knobSize}px`,
      borderRadius: '9999px',
      transform: 'translate(-50%, -50%)',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
    });

    this.el.append(this.#elKnob);
  }

  public override destroy(): void {
    super.destroy();
    this.#elKnob = null;
  }
}
