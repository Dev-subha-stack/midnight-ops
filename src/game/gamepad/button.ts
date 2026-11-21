/**
 * Gamepad - Button Controller
 * Ported & typed from https://github.com/rokobuljan/gamepad
 */
import { Controller, ControllerOptions } from './controller';

export class Button extends Controller {
  constructor(options: ControllerOptions<Button> = {}) {
    super({ ...options, type: 'button' });
  }

  protected override onStart(): void {
    super.onStart();
    this.value = this.spring ? 1 : this.isActive ? 1 : 0;
    this.onInput();
  }

  protected override onEnd(): void {
    super.onEnd();
    if (!this.spring) return;
    this.value = 0;
    this.onInput();
  }
}
