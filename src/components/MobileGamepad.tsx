import React, { useEffect, useRef, useState } from 'react';
import { FPSController } from '../game/controller';
import { Button, ControllerInput, DPad, Gamepad, Joystick } from '../game/gamepad';
import { MobileControlId, MobileControlLayoutConfig } from '../game/mobile_layout';

interface MobileGamepadProps {
  controller: FPSController | null;
  layoutConfig: MobileControlLayoutConfig;
  isAiming: boolean;
  isSprinting: boolean;
  isAutoRunning: boolean;
  isTacSprinting?: boolean;
  isReloading: boolean;
  grenadesCount: number;
  tacticalCount: number;
  tacticalType: string;
  canHoldBreath: boolean;
  isHoldingBreath: boolean;
  onTogglePause: () => void;
  onOpenGunsmith: () => void;
  onToggleScoreboard: () => void;
  onOpenCustomizer: () => void;
}

export const MobileGamepad: React.FC<MobileGamepadProps> = ({
  controller,
  layoutConfig,
  isAiming,
  isSprinting,
  isAutoRunning,
  isTacSprinting,
  isReloading,
  grenadesCount,
  tacticalCount,
  tacticalType,
  canHoldBreath,
  isHoldingBreath,
  onTogglePause,
  onOpenGunsmith,
  onToggleScoreboard,
  onOpenCustomizer,
}) => {
  const leftZoneRef = useRef<HTMLDivElement | null>(null);
  const rightZoneRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const gamepadRef = useRef<Gamepad | null>(null);
  const controllerRef = useRef<FPSController | null>(controller);
  controllerRef.current = controller;

  const [compactViewport, setCompactViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerHeight < 500 || window.innerWidth < 460 : false
  );

  useEffect(() => {
    const onResize = () => {
      setCompactViewport(window.innerHeight < 500 || window.innerWidth < 460);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Keep touch look sensitivity synced live
  useEffect(() => {
    if (controller) {
      controller.mobileLookSensitivity = layoutConfig.lookSensitivity;
    }
  }, [controller, layoutConfig.lookSensitivity]);

  // Build rokobuljan/gamepad virtual controllers from customized Free Fire / BGMI layout
  useEffect(() => {
    const leftEl = leftZoneRef.current;
    const rightEl = rightZoneRef.current;
    const overlayEl = overlayRef.current;
    if (!leftEl || !rightEl || !overlayEl) return;

    const scaleFactor = compactViewport ? 0.88 : 1.0;
    const radiusFor = (id: MobileControlId, minPx = 22) => {
      const cfg = layoutConfig.controls[id];
      return Math.max(minPx, Math.round(cfg.baseRadius * cfg.scale * scaleFactor));
    };
    const posFor = (id: MobileControlId) => ({
      left: `${layoutConfig.controls[id].xPct}%`,
      top: `${layoutConfig.controls[id].yPct}%`,
    });

    const joyCfg = layoutConfig.controls['move-joystick'];
    const joyLeftInZonePct = Math.max(14, Math.min(86, (joyCfg.xPct / 42) * 100));

    let dpadSwitchedThisPress = false;
    const activeControllers: ControllerInput[] = [
      // Left Analog Movement Joystick (floating inside left 42% zone, springs back to customized spot)
      new Joystick({
        id: 'move-joystick',
        type: 'joystick',
        parent: leftEl,
        axis: 'all',
        fixed: false,
        spring: true,
        deadZone: 0.12,
        radius: radiusFor('move-joystick', 34),
        position: {
          left: `${joyLeftInZonePct}%`,
          top: `${joyCfg.yPct}%`,
        },
        style: {
          color: '#A3E635',
          background: 'rgba(10, 12, 16, 0.56)',
          border: '2px solid rgba(163, 230, 53, 0.55)',
          opacity: String(joyCfg.opacity),
        },
        onInput() {
          const ctrl = controllerRef.current;
          if (!ctrl) return;
          const vec = this.getVector();
          const sprint = vec.y > 0.35 && vec.magnitude > 0.78;
          const tacSprint = vec.y > 0.5 && vec.magnitude > 0.94;
          ctrl.setMobileMoveInput(vec.x, vec.y, sprint, tacSprint);
        },
      }),
    ];

    // 1. Dedicated RUN / Auto-Sprint Lock Button (Free Fire / BGMI Style)
    const runCfg = layoutConfig.controls.run;
    if (runCfg.visible) {
      activeControllers.push(
        new Button({
          id: 'run',
          type: 'button',
          parent: overlayEl,
          fixed: true,
          spring: false,
          radius: radiusFor('run'),
          text: '<span class="gp-label">RUN</span>',
          position: posFor('run'),
          style: {
            pointerEvents: 'auto',
            color: '#38bdf8',
            background: 'rgba(10, 16, 24, 0.76)',
            border: '2px solid rgba(56, 189, 248, 0.65)',
            opacity: String(runCfg.opacity),
          },
          onInput() {
            const ctrl = controllerRef.current;
            if (!ctrl) return;
            const enabled = Boolean(this.value);
            ctrl.setMobileAutoRun(enabled);
            if (enabled) gp.vibrate(12);
          },
        })
      );
    }

    // 2. Left Quick Fire Button (two-thumb / 3-finger / 4-finger claw)
    const fireLeftCfg = layoutConfig.controls['fire-left'];
    if (fireLeftCfg.visible) {
      activeControllers.push(
        new Button({
          id: 'fire-left',
          type: 'button',
          parent: overlayEl,
          fixed: true,
          spring: true,
          radius: radiusFor('fire-left'),
          text: '<span class="gp-label">FIRE</span>',
          position: posFor('fire-left'),
          style: {
            pointerEvents: 'auto',
            color: '#ef4444',
            background: 'rgba(28, 12, 14, 0.72)',
            border: '2px solid rgba(239, 68, 68, 0.78)',
            opacity: String(fireLeftCfg.opacity),
          },
          onInput() {
            const ctrl = controllerRef.current;
            if (!ctrl) return;
            ctrl.setMobileFire(Boolean(this.value));
            if (this.value) gp.vibrate(14);
          },
        })
      );
    }

    // 3. Primary Right-Thumb Draggable Fire Button (Free Fire drag-shot / drag-headshot style)
    const fireCfg = layoutConfig.controls.fire;
    const fireRadiusPx = radiusFor('fire', 26);
    activeControllers.push(
      new Button({
        id: 'fire',
        type: 'button',
        parent: overlayEl,
        fixed: true,
        spring: true,
        draggableHandle: true,
        dragRadius: Math.round(fireRadiusPx * 1.25),
        radius: fireRadiusPx,
        text: '<span class="gp-label-lg">FIRE</span>',
        position: posFor('fire'),
        style: {
          pointerEvents: 'auto',
          color: '#ef4444',
          background: 'rgba(127, 29, 29, 0.22)',
          border: '2px dashed rgba(248, 113, 113, 0.78)',
          opacity: String(fireCfg.opacity),
        },
        onDragMove(dx, dy) {
          controllerRef.current?.applyTouchLookDelta(dx, dy);
        },
        onInput() {
          const ctrl = controllerRef.current;
          if (!ctrl) return;
          ctrl.setMobileFire(Boolean(this.value));
          if (this.value) gp.vibrate(16);
        },
      })
    );

    // 4. ADS / Scope Toggle Button
    const adsCfg = layoutConfig.controls.ads;
    if (adsCfg.visible) {
      activeControllers.push(
        new Button({
          id: 'ads',
          type: 'button',
          parent: overlayEl,
          fixed: true,
          spring: false,
          radius: radiusFor('ads'),
          text: '<span class="gp-label">ADS</span>',
          position: posFor('ads'),
          style: {
            pointerEvents: 'auto',
            color: '#A3E635',
            background: 'rgba(10, 12, 16, 0.75)',
            border: '2px solid rgba(255, 255, 255, 0.35)',
            opacity: String(adsCfg.opacity),
          },
          onInput() {
            const ctrl = controllerRef.current;
            if (!ctrl) return;
            ctrl.setMobileAim(Boolean(this.value));
            gp.vibrate(10);
          },
        })
      );
    }

    // 5. Jump / Vault / Glider Button
    const jumpCfg = layoutConfig.controls.jump;
    if (jumpCfg.visible) {
      activeControllers.push(
        new Button({
          id: 'jump',
          type: 'button',
          parent: overlayEl,
          fixed: true,
          spring: true,
          radius: radiusFor('jump'),
          text: '<span class="gp-label">JUMP</span>',
          position: posFor('jump'),
          style: {
            pointerEvents: 'auto',
            color: '#e4e4e7',
            background: 'rgba(10, 12, 16, 0.72)',
            border: '2px solid rgba(255, 255, 255, 0.28)',
            opacity: String(jumpCfg.opacity),
          },
          onInput() {
            if (this.value) {
              controllerRef.current?.triggerMobileJump();
              gp.vibrate(10);
            }
          },
        })
      );
    }

    // 6. Crouch / Sprint-Slide / Tac-Dive Button
    const crouchCfg = layoutConfig.controls.crouch;
    if (crouchCfg.visible) {
      activeControllers.push(
        new Button({
          id: 'crouch',
          type: 'button',
          parent: overlayEl,
          fixed: true,
          spring: true,
          radius: radiusFor('crouch'),
          text: '<span class="gp-label">SLIDE</span>',
          position: posFor('crouch'),
          style: {
            pointerEvents: 'auto',
            color: '#e4e4e7',
            background: 'rgba(10, 12, 16, 0.72)',
            border: '2px solid rgba(255, 255, 255, 0.28)',
            opacity: String(crouchCfg.opacity),
          },
          onInput() {
            if (this.value) {
              controllerRef.current?.triggerMobileCrouchOrSlide();
              gp.vibrate(10);
            }
          },
        })
      );
    }

    // 7. Reload Button
    const reloadCfg = layoutConfig.controls.reload;
    if (reloadCfg.visible) {
      activeControllers.push(
        new Button({
          id: 'reload',
          type: 'button',
          parent: overlayEl,
          fixed: true,
          spring: true,
          radius: radiusFor('reload'),
          text: '<span class="gp-label">RLD</span>',
          position: posFor('reload'),
          style: {
            pointerEvents: 'auto',
            color: '#facc15',
            background: 'rgba(10, 12, 16, 0.72)',
            border: '2px solid rgba(250, 204, 21, 0.45)',
            opacity: String(reloadCfg.opacity),
          },
          onInput() {
            if (this.value) {
              controllerRef.current?.reload();
              gp.vibrate(12);
            }
          },
        })
      );
    }

    // 8. Melee / Variable Zoom Button
    const meleeCfg = layoutConfig.controls.melee;
    if (meleeCfg.visible) {
      activeControllers.push(
        new Button({
          id: 'melee',
          type: 'button',
          parent: overlayEl,
          fixed: true,
          spring: true,
          radius: radiusFor('melee'),
          text: '<span class="gp-label">MEL</span>',
          position: posFor('melee'),
          style: {
            pointerEvents: 'auto',
            color: '#38bdf8',
            background: 'rgba(10, 12, 16, 0.72)',
            border: '2px solid rgba(56, 189, 248, 0.45)',
            opacity: String(meleeCfg.opacity),
          },
          onInput() {
            if (this.value) {
              controllerRef.current?.cycleOpticZoomOrMelee();
              gp.vibrate(12);
            }
          },
        })
      );
    }

    // 9. Frag Grenade Button
    const fragCfg = layoutConfig.controls.frag;
    if (fragCfg.visible) {
      activeControllers.push(
        new Button({
          id: 'frag',
          type: 'button',
          parent: overlayEl,
          fixed: true,
          spring: true,
          radius: radiusFor('frag'),
          text: '<span class="gp-label">FRAG</span>',
          position: posFor('frag'),
          style: {
            pointerEvents: 'auto',
            color: '#fb923c',
            background: 'rgba(10, 12, 16, 0.72)',
            border: '2px solid rgba(251, 146, 60, 0.45)',
            opacity: String(fragCfg.opacity),
          },
          onInput() {
            if (this.value) {
              controllerRef.current?.throwGrenade();
              gp.vibrate(15);
            }
          },
        })
      );
    }

    // 10. Tactical Equipment Button
    const tacCfg = layoutConfig.controls.tactical;
    if (tacCfg.visible) {
      activeControllers.push(
        new Button({
          id: 'tactical',
          type: 'button',
          parent: overlayEl,
          fixed: true,
          spring: true,
          radius: radiusFor('tactical'),
          text: '<span class="gp-label">TAC</span>',
          position: posFor('tactical'),
          style: {
            pointerEvents: 'auto',
            color: '#A3E635',
            background: 'rgba(10, 12, 16, 0.72)',
            border: '2px solid rgba(163, 230, 53, 0.45)',
            opacity: String(tacCfg.opacity),
          },
          onInput() {
            if (this.value) {
              controllerRef.current?.deployTactical();
              gp.vibrate(12);
            }
          },
        })
      );
    }

    // 11. Horizontal D-Pad for Prev/Next Weapon Swap
    const dpadCfg = layoutConfig.controls['weapon-dpad'];
    if (dpadCfg.visible) {
      activeControllers.push(
        new DPad({
          id: 'weapon-dpad',
          type: 'dpad',
          parent: overlayEl,
          axis: 'x',
          spring: true,
          deadZone: 0.15,
          radius: radiusFor('weapon-dpad'),
          position: posFor('weapon-dpad'),
          style: {
            pointerEvents: 'auto',
            color: '#A3E635',
            background: 'rgba(10, 12, 16, 0.65)',
            opacity: String(dpadCfg.opacity),
          },
          onStart() {
            dpadSwitchedThisPress = false;
          },
          onInput() {
            if (!this.value) {
              dpadSwitchedThisPress = false;
              return;
            }
            if (!dpadSwitchedThisPress) {
              dpadSwitchedThisPress = true;
              const dir = this.xDiff < 0 ? -1 : 1;
              controllerRef.current?.cycleWeapon(dir);
              gp.vibrate(10);
            }
          },
        })
      );
    }

    const gp = new Gamepad(activeControllers);
    gamepadRef.current = gp;

    // Right-zone Touch-Look Surface (empty area on right 58% rotates camera)
    let lookPointerId: number | null = null;
    let lastLookX = 0;
    let lastLookY = 0;

    const handleRightPointerDown = (evt: PointerEvent) => {
      if (lookPointerId !== null) return;
      if (evt.target instanceof Element && evt.target.closest('.Gamepad-controller')) return;
      evt.preventDefault();
      lookPointerId = evt.pointerId;
      lastLookX = evt.clientX;
      lastLookY = evt.clientY;
      try {
        rightEl.setPointerCapture(evt.pointerId);
      } catch {
        // Ignore if capture unsupported
      }
    };

    const handleRightPointerMove = (evt: PointerEvent) => {
      if (evt.pointerId !== lookPointerId) return;
      evt.preventDefault();
      const dx = evt.clientX - lastLookX;
      const dy = evt.clientY - lastLookY;
      lastLookX = evt.clientX;
      lastLookY = evt.clientY;
      controllerRef.current?.applyTouchLookDelta(dx, dy);
    };

    const handleRightPointerUp = (evt: PointerEvent) => {
      if (evt.pointerId !== lookPointerId) return;
      try {
        rightEl.releasePointerCapture(evt.pointerId);
      } catch {
        // Ignore
      }
      lookPointerId = null;
    };

    rightEl.addEventListener('pointerdown', handleRightPointerDown, { passive: false });
    rightEl.addEventListener('pointermove', handleRightPointerMove, { passive: false });
    rightEl.addEventListener('pointerup', handleRightPointerUp);
    rightEl.addEventListener('pointercancel', handleRightPointerUp);

    return () => {
      rightEl.removeEventListener('pointerdown', handleRightPointerDown);
      rightEl.removeEventListener('pointermove', handleRightPointerMove);
      rightEl.removeEventListener('pointerup', handleRightPointerUp);
      rightEl.removeEventListener('pointercancel', handleRightPointerUp);
      gp.destroy();
      gamepadRef.current = null;
      controllerRef.current?.setMobileMoveInput(0, 0, false, false);
      controllerRef.current?.setMobileFire(false);
    };
  }, [compactViewport, layoutConfig]);

  // Sync dynamic button visual labels & toggle states cleanly
  useEffect(() => {
    const gp = gamepadRef.current;
    if (!gp) return;
    gp.controllers.run?.setActive(isAutoRunning);
    gp.controllers.run?.setText(
      `<span class="gp-label">${isAutoRunning ? 'RUN<small>LOCK</small>' : 'RUN'}</span>`
    );
    gp.controllers.ads?.setActive(isAiming);
    gp.controllers.crouch?.setActive(Boolean(controller?.isMobileCrouched()));
    gp.controllers.crouch?.setText(
      `<span class="gp-label">${isSprinting || isTacSprinting ? 'SLIDE' : 'CRCH'}</span>`
    );
    gp.controllers.melee?.setText(`<span class="gp-label">${isAiming ? 'ZOOM' : 'KNIFE'}</span>`);
    gp.controllers.reload?.setText(`<span class="gp-label">${isReloading ? '...' : 'RLD'}</span>`);
    gp.controllers.frag?.setText(`<span class="gp-label">FRAG<small>${grenadesCount}</small></span>`);
    const tacLabel = tacticalType === 'smoke' ? 'SMK' : 'TAC';
    gp.controllers.tactical?.setText(`<span class="gp-label">${tacLabel}<small>${tacticalCount}</small></span>`);
  }, [
    controller,
    isAiming,
    isSprinting,
    isAutoRunning,
    isTacSprinting,
    isReloading,
    grenadesCount,
    tacticalCount,
    tacticalType,
  ]);

  return (
    <div
      id="mobile-gamepad-root"
      className="fixed inset-0 z-30 flex pointer-events-none select-none overflow-hidden touch-none"
    >
      {/* Top-Right Touch Action Bar (>=44px hitboxes for HUD Customizer, Scoreboard, Armory, Pause) */}
      <div className="absolute top-2.5 right-3 flex items-center gap-1.5 z-40 pointer-events-auto">
        <button
          id="mobile-btn-customize"
          type="button"
          onClick={onOpenCustomizer}
          title="Customize Controls HUD"
          className="min-w-[44px] min-h-[44px] px-2.5 rounded-sm bg-[#0A0C10]/85 border border-white/20 text-[10px] font-mono font-bold text-zinc-100 uppercase active:scale-95 transition-transform"
        >
          HUD
        </button>
        <button
          id="mobile-btn-scoreboard"
          type="button"
          onClick={onToggleScoreboard}
          className="min-w-[44px] min-h-[44px] px-2.5 rounded-sm bg-[#0A0C10]/85 border border-white/15 text-[10px] font-mono font-bold text-zinc-200 uppercase active:scale-95 transition-transform"
        >
          TAB
        </button>
        <button
          id="mobile-btn-gunsmith"
          type="button"
          onClick={onOpenGunsmith}
          className="min-w-[44px] min-h-[44px] px-2.5 rounded-sm bg-[#0A0C10]/85 border border-white/15 text-[10px] font-mono font-bold text-[#A3E635] uppercase active:scale-95 transition-transform"
        >
          ARMORY
        </button>
        <button
          id="mobile-btn-pause"
          type="button"
          onClick={onTogglePause}
          aria-label="Pause Match"
          className="min-w-[44px] min-h-[44px] px-3 rounded-sm bg-[#0A0C10]/90 border border-[#A3E635]/50 text-xs font-mono font-bold text-white uppercase active:scale-95 transition-transform"
        >
          ||
        </button>
      </div>

      {/* Hold-Breath Touch Trigger (only shown while ADS on 2x+ scopes) */}
      {canHoldBreath && (
        <button
          id="mobile-btn-breath"
          type="button"
          onPointerDown={e => {
            e.preventDefault();
            e.stopPropagation();
            controller?.setMobileHoldBreath(true);
          }}
          onPointerUp={e => {
            e.preventDefault();
            controller?.setMobileHoldBreath(false);
          }}
          onPointerCancel={() => controller?.setMobileHoldBreath(false)}
          className={`pointer-events-auto absolute left-4 bottom-48 z-40 min-w-[56px] min-h-[44px] px-3 rounded-sm border font-mono text-[10px] font-bold uppercase touch-none ${
            isHoldingBreath
              ? 'bg-[#A3E635] text-[#090B0E] border-[#A3E635]'
              : 'bg-[#0A0C10]/85 text-[#A3E635] border-[#A3E635]/60'
          }`}
        >
          STEADY
        </button>
      )}

      {/* Left Zone: Floating Joystick Touch Surface */}
      <div
        id="mobile-controls-left"
        ref={leftZoneRef}
        className="relative w-[42%] h-full pointer-events-auto touch-none"
      />

      {/* Right Zone: Touch-Look Surface */}
      <div
        id="mobile-controls-right"
        ref={rightZoneRef}
        className="relative w-[58%] h-full pointer-events-auto touch-none"
      />

      {/* Full-Screen Fixed Controls Layer (allows placing any button anywhere, Free Fire / BGMI claw style) */}
      <div
        id="mobile-controls-overlay"
        ref={overlayRef}
        className="absolute inset-0 pointer-events-none z-20"
      />
    </div>
  );
};
