/**
 * Gamepad - Multi-touch virtual controller manager
 * Ported & typed from https://github.com/rokobuljan/gamepad
 */
import { Button } from './button';
import { Controller, ControllerOptions, ControllerType } from './controller';
import { DPad } from './dpad';
import { Joystick } from './joystick';

export type GamepadController = Button | Joystick | DPad;
export type ControllerInput = ControllerOptions<any> | GamepadController;

const isController = (ob: unknown): ob is GamepadController =>
  ob instanceof Button || ob instanceof Joystick || ob instanceof DPad;

const DEFAULT_TYPE: ControllerType = 'joystick';

export class Gamepad {
  public controllers: Record<string, GamepadController> = {};

  constructor(controllersArray: ControllerInput[] = []) {
    controllersArray.forEach(options => this.add(options));
  }

  public add(...args: ControllerInput[]): Gamepad {
    args.forEach(options => {
      let controller: GamepadController;
      if (isController(options)) {
        controller = options;
      } else {
        const type = ((options.type || DEFAULT_TYPE).trim().toLowerCase()) as ControllerType;
        const normalized: ControllerOptions<any> = { ...options, type };
        if (type === 'button') {
          controller = new Button(normalized);
        } else if (type === 'dpad') {
          controller = new DPad(normalized);
        } else {
          controller = new Joystick(normalized);
        }
      }
      this.controllers[controller.id] = controller;
      controller.init();
    });
    return this;
  }

  public remove(...args: Array<string | GamepadController>): Gamepad {
    args.forEach(id => {
      const controllerId = typeof id === 'string' ? id : id.id;
      if (Object.prototype.hasOwnProperty.call(this.controllers, controllerId)) {
        this.controllers[controllerId].destroy();
        delete this.controllers[controllerId];
      }
    });
    return this;
  }

  public destroy(id?: string | GamepadController): Gamepad {
    if (id) return this.remove(id);
    Object.keys(this.controllers).forEach(key => this.remove(key));
    if (typeof removeEventListener === 'function') {
      removeEventListener('click', this.#handleFullscreen);
    }
    return this;
  }

  #handleFullscreen = (): void => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  };

  public requestFullScreen(): Gamepad {
    addEventListener('click', this.#handleFullscreen);
    return this;
  }

  public exitFullScreen(): Gamepad {
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    return this;
  }

  public isVibrationSupported(): boolean {
    return typeof window !== 'undefined' && Boolean(window.navigator && 'vibrate' in window.navigator);
  }

  public vibrate(vibrationPattern: number | number[]): Gamepad {
    if (this.isVibrationSupported()) {
      try {
        window.navigator.vibrate(vibrationPattern);
      } catch {
        // Ignore browser vibration policy blocks
      }
    }
    return this;
  }
}

export { Button, Controller, DPad, Joystick };
export type { ControllerAxis, ControllerOptions, ControllerStyle, ControllerType } from './controller';
export { isTouchCapableDevice, lerpAngles, norm, TAU } from './utils';
