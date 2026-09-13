import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Crosshair,
  RotateCcw,
  Bomb,
  Radio,
  Zap,
  Shield,
  Eye,
  Flame,
  Menu,
  Sliders,
  ShieldAlert,
  Target,
  Wind,
  Sun,
  Sword,
  ChevronsUp,
  Compass,
  Flashlight,
  Maximize2
} from 'lucide-react';
import { GameEngine } from '../game/engine';
import { WeaponType, TacticalType, BattleRoyaleState } from '../types';

interface MobileControlsProps {
  engine: GameEngine | null;
  currentWeapon: WeaponType;
  ammoInMag: number;
  ammoReserve: number;
  grenadesCount: number;
  tacticalCount: number;
  tacticalType: TacticalType;
  laserActive: boolean;
  isAiming: boolean;
  isTacStance?: boolean;
  battleRoyaleState?: BattleRoyaleState | null;
  onPause: () => void;
  onOpenGunsmith: () => void;
  onOpenScoreboard: () => void;
  onSwitchWeapon: (w: WeaponType) => void;
  onUseMedkit?: () => void;
  onUseInhaler?: () => void;
  onActivateStreak?: (id: string) => void;
  onToggleWeather?: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  engine,
  currentWeapon,
  ammoInMag,
  ammoReserve,
  grenadesCount,
  tacticalCount,
  tacticalType,
  laserActive,
  isAiming,
  isTacStance,
  battleRoyaleState,
  onPause,
  onOpenGunsmith,
  onOpenScoreboard,
  onSwitchWeapon,
  onUseMedkit,
  onUseInhaler,
  onActivateStreak,
  onToggleWeather,
}) => {
  // Joystick State
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joystickActive, setJoystickActive] = useState<boolean>(false);
  const [joystickPos, setJoystickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [joystickThumb, setJoystickThumb] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSprintLocked, setIsSprintLocked] = useState<boolean>(false);
  const [isTacSprintLocked, setIsTacSprintLocked] = useState<boolean>(false);

  // Look Touch State
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Joystick touch handlers
  const handleJoystickTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (joystickTouchIdRef.current !== null) return;

    const touch = e.changedTouches[0];
    joystickTouchIdRef.current = touch.identifier;
    const origin = { x: touch.clientX, y: touch.clientY };
    joystickOriginRef.current = origin;
    setJoystickPos(origin);
    setJoystickThumb({ x: 0, y: 0 });
    setJoystickActive(true);
    setIsSprintLocked(false);
    setIsTacSprintLocked(false);
  };

  const handleJoystickTouchMove = useCallback((e: TouchEvent) => {
    if (joystickTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        const dx = touch.clientX - joystickOriginRef.current.x;
        const dy = touch.clientY - joystickOriginRef.current.y;
        const maxDist = 55;
        const dist = Math.hypot(dx, dy);
        const angle = Math.atan2(dy, dx);
        const clampedDist = Math.min(maxDist, dist);

        const thumbX = Math.cos(angle) * clampedDist;
        const thumbY = Math.sin(angle) * clampedDist;
        setJoystickThumb({ x: thumbX, y: thumbY });

        // Normalized vector (-1 to 1)
        const normX = thumbX / maxDist;
        const normY = -thumbY / maxDist; // Up is positive in game forward

        const isRunningForward = normY > 0.65;
        const isSuperSprinting = normY > 0.9 && Math.abs(normX) < 0.45;

        setIsSprintLocked(isRunningForward);
        setIsTacSprintLocked(isSuperSprinting);

        if (engine?.controller) {
          engine.controller.handleTouchMove(normX, normY, isRunningForward, isSuperSprinting);
        }
        break;
      }
    }
  }, [engine]);

  const handleJoystickTouchEnd = useCallback((e: TouchEvent) => {
    if (joystickTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchIdRef.current) {
        joystickTouchIdRef.current = null;
        setJoystickActive(false);
        setJoystickThumb({ x: 0, y: 0 });
        setIsSprintLocked(false);
        setIsTacSprintLocked(false);
        if (engine?.controller) {
          engine.controller.handleTouchMove(0, 0, false, false);
        }
        break;
      }
    }
  }, [engine]);

  // Touch Look surface handlers
  const handleLookTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (lookTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    lookTouchIdRef.current = touch.identifier;
    lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookTouchMove = useCallback((e: TouchEvent) => {
    if (lookTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        const dx = touch.clientX - lastLookPosRef.current.x;
        const dy = touch.clientY - lastLookPosRef.current.y;
        lastLookPosRef.current = { x: touch.clientX, y: touch.clientY };

        if (engine?.controller) {
          engine.controller.handleTouchLook(dx, dy, isAiming ? 0.75 : 1.15);
        }
        break;
      }
    }
  }, [engine, isAiming]);

  const handleLookTouchEnd = useCallback((e: TouchEvent) => {
    if (lookTouchIdRef.current === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
        break;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('touchmove', handleJoystickTouchMove, { passive: false });
    window.addEventListener('touchend', handleJoystickTouchEnd);
    window.addEventListener('touchcancel', handleJoystickTouchEnd);
    window.addEventListener('touchmove', handleLookTouchMove, { passive: false });
    window.addEventListener('touchend', handleLookTouchEnd);
    window.addEventListener('touchcancel', handleLookTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleJoystickTouchMove);
      window.removeEventListener('touchend', handleJoystickTouchEnd);
      window.removeEventListener('touchcancel', handleJoystickTouchEnd);
      window.removeEventListener('touchmove', handleLookTouchMove);
      window.removeEventListener('touchend', handleLookTouchEnd);
      window.removeEventListener('touchcancel', handleLookTouchEnd);
    };
  }, [handleJoystickTouchMove, handleJoystickTouchEnd, handleLookTouchMove, handleLookTouchEnd]);

  return (
    <div id="mobile-fps-controls-overlay" className="absolute inset-0 pointer-events-none select-none z-30">
      {/* LEFT HALF: TOUCH JOYSTICK SENSING ZONE */}
      <div
        id="mobile-joystick-touchzone"
        className="absolute top-16 bottom-0 left-0 w-1/2 pointer-events-auto"
        onTouchStart={handleJoystickTouchStart}
      >
        {/* Dynamic / Static Visual Joystick Indicator */}
        {joystickActive ? (
          <div
            className="fixed w-28 h-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-400/40 bg-black/40 backdrop-blur-sm pointer-events-none flex items-center justify-center transition-opacity"
            style={{ left: `${joystickPos.x}px`, top: `${joystickPos.y}px` }}
          >
            {/* Sprint Lock Indicator */}
            <div className={`absolute -top-7 px-2 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase transition-all ${
              isTacSprintLocked
                ? 'bg-amber-500 text-black shadow-[0_0_10px_#f59e0b]'
                : isSprintLocked
                ? 'bg-cyan-500 text-black'
                : 'bg-black/60 text-slate-400 border border-slate-700'
            }`}>
              {isTacSprintLocked ? 'TAC SPRINT' : isSprintLocked ? 'SPRINT' : 'DRAG TO SPRINT'}
            </div>

            {/* Inner Thumbstick */}
            <div
              className={`w-12 h-12 rounded-full border border-white/60 shadow-lg flex items-center justify-center ${
                isTacSprintLocked ? 'bg-amber-400/90' : isSprintLocked ? 'bg-cyan-400/90' : 'bg-white/50'
              }`}
              style={{
                transform: `translate(${joystickThumb.x}px, ${joystickThumb.y}px)`,
              }}
            >
              <div className="w-4 h-4 rounded-full bg-white/80 shadow" />
            </div>
          </div>
        ) : (
          /* Subtle Resting Joystick Hint */
          <div className="absolute bottom-20 left-12 w-24 h-24 rounded-full border border-white/20 bg-black/20 flex items-center justify-center pointer-events-none">
            <div className="w-10 h-10 rounded-full border border-white/30 bg-white/10 flex items-center justify-center">
              <span className="text-[9px] font-mono text-white/50 font-bold">MOVE</span>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT HALF: TOUCH LOOK PULL SURFACE */}
      <div
        id="mobile-look-touchzone"
        className="absolute top-16 bottom-0 right-0 w-1/2 pointer-events-auto"
        onTouchStart={handleLookTouchStart}
      />

      {/* TOP HEADER CONTROLS (Pause, Armory, Scoreboard, Weather) */}
      <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-auto z-40">
        {onToggleWeather && (
          <button
            onClick={onToggleWeather}
            className="w-9 h-9 rounded-lg bg-black/70 border border-slate-700 text-amber-300 flex items-center justify-center active:scale-90 active:bg-amber-500/20"
            title="Weather [T]"
          >
            <Sun className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onOpenScoreboard}
          className="px-2.5 h-9 rounded-lg bg-black/70 border border-slate-700 text-cyan-300 font-mono text-xs font-bold flex items-center gap-1 active:scale-90"
        >
          <span>TAB</span>
        </button>
        <button
          onClick={onOpenGunsmith}
          className="px-2.5 h-9 rounded-lg bg-black/70 border border-slate-700 text-amber-400 font-mono text-xs font-bold flex items-center gap-1 active:scale-90"
        >
          <span>ARMORY</span>
        </button>
        <button
          onClick={onPause}
          className="w-9 h-9 rounded-lg bg-black/80 border border-slate-700 text-white flex items-center justify-center active:scale-90"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* TOP-LEFT WEAPON QUICK SELECTOR BAR */}
      <div className="absolute top-3 left-4 flex items-center gap-1.5 pointer-events-auto z-40">
        {(['m4', 'mp5', 'sniper', 'shotgun', 'deagle'] as WeaponType[]).map((w, idx) => (
          <button
            key={w}
            onClick={() => onSwitchWeapon(w)}
            className={`px-2 py-1 rounded text-[10px] font-mono font-black uppercase transition-all active:scale-95 ${
              currentWeapon === w
                ? 'bg-cyan-400 text-black border border-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                : 'bg-black/70 text-slate-300 border border-slate-800'
            }`}
          >
            {idx + 1}:{w}
          </button>
        ))}
      </div>

      {/* LEFT-SIDE TACTICAL ACTION COLUMN (Laser, Stance, Mount, Steady Aim) */}
      <div className="absolute left-4 top-28 flex flex-col gap-2 pointer-events-auto z-40">
        {/* Laser / Flashlight Button */}
        <button
          onTouchStart={e => {
            e.stopPropagation();
            engine?.controller?.triggerLaser();
          }}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center border shadow-md active:scale-90 transition-all ${
            laserActive
              ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
              : 'bg-black/70 border-slate-800 text-slate-500'
          }`}
          title="Laser [F]"
        >
          <Flashlight className="w-4 h-4" />
          <span className="text-[7.5px] font-mono font-bold">LASER</span>
        </button>

        {/* Tactical Stance / Canted Aim Button */}
        <button
          onTouchStart={e => {
            e.stopPropagation();
            engine?.controller?.triggerTacStance();
          }}
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center border shadow-md active:scale-90 transition-all ${
            isTacStance
              ? 'bg-amber-500/30 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
              : 'bg-black/70 border-slate-800 text-slate-400'
          }`}
          title="Tac Stance [Z]"
        >
          <Compass className="w-4 h-4" />
          <span className="text-[7.5px] font-mono font-bold">CANTED</span>
        </button>

        {/* Cover Mounting Button */}
        <button
          onTouchStart={e => {
            e.stopPropagation();
            engine?.controller?.triggerMount();
          }}
          className="w-11 h-11 rounded-xl bg-black/70 border border-slate-800 text-sky-300 flex flex-col items-center justify-center shadow-md active:scale-90 active:bg-sky-500/20"
          title="Mount [E]"
        >
          <Shield className="w-4 h-4" />
          <span className="text-[7.5px] font-mono font-bold">MOUNT</span>
        </button>

        {/* Steady Aim / Hold Breath */}
        <button
          onTouchStart={e => {
            e.stopPropagation();
            engine?.controller?.triggerHoldBreath();
          }}
          className="w-11 h-11 rounded-xl bg-black/70 border border-slate-800 text-cyan-300 flex flex-col items-center justify-center shadow-md active:scale-90 active:bg-cyan-500/20"
          title="Breath [Shift]"
        >
          <Wind className="w-4 h-4" />
          <span className="text-[7.5px] font-mono font-bold">STEADY</span>
        </button>

        {/* Inspect Weapon */}
        <button
          onTouchStart={e => {
            e.stopPropagation();
            engine?.controller?.triggerInspect();
          }}
          className="w-11 h-11 rounded-xl bg-black/70 border border-slate-800 text-slate-300 flex flex-col items-center justify-center shadow-md active:scale-90"
          title="Inspect [I]"
        >
          <Eye className="w-4 h-4" />
          <span className="text-[7.5px] font-mono font-bold">INSPECT</span>
        </button>
      </div>

      {/* RIGHT-SIDE TACTICAL COMBAT HUD CONTROLS */}
      <div className="absolute right-4 bottom-4 flex flex-col items-end gap-3 pointer-events-auto z-40">
        {/* UPPER ROW: Grenades & Tactical Equipment */}
        <div className="flex items-center gap-2.5 mb-1">
          {/* Tactical Equipment (Smoke / Sensor) */}
          <div className="flex flex-col items-center gap-1">
            <button
              onTouchStart={e => {
                e.stopPropagation();
                engine?.controller?.triggerTactical();
              }}
              className="w-12 h-12 rounded-2xl bg-cyan-950/80 border border-cyan-500/60 text-cyan-300 flex flex-col items-center justify-center shadow-lg active:scale-90"
            >
              <Radio className="w-4 h-4" />
              <span className="text-[8px] font-mono font-bold mt-0.5">
                {tacticalType === 'smoke' ? 'SMK' : 'SNS'} ×{tacticalCount}
              </span>
            </button>
            <button
              onTouchStart={e => {
                e.stopPropagation();
                engine?.controller?.triggerSwapTactical();
              }}
              className="text-[8px] font-mono text-cyan-400 bg-black/70 px-1.5 py-0.5 rounded border border-slate-800 active:scale-95"
            >
              SWAP
            </button>
          </div>

          {/* Frag Grenade */}
          <button
            onTouchStart={e => {
              e.stopPropagation();
              engine?.controller?.triggerGrenade();
            }}
            className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-500/60 text-amber-300 flex flex-col items-center justify-center shadow-lg active:scale-90"
          >
            <Bomb className="w-4 h-4" />
            <span className="text-[8px] font-mono font-bold mt-0.5">FRAG ×{grenadesCount}</span>
          </button>

          {/* Quick Melee Knife Strike */}
          <button
            onTouchStart={e => {
              e.stopPropagation();
              engine?.controller?.triggerMelee();
            }}
            className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-rose-300 flex flex-col items-center justify-center shadow-lg active:scale-90"
          >
            <Sword className="w-4 h-4" />
            <span className="text-[8px] font-mono font-bold mt-0.5">MELEE</span>
          </button>
        </div>

        {/* MIDDLE ROW: Reload, Jump, Crouch/Slide/Dive */}
        <div className="flex items-center gap-3">
          {/* Reload Button with Live Ammo Display */}
          <button
            onTouchStart={e => {
              e.stopPropagation();
              engine?.controller?.triggerReload();
            }}
            className="w-14 h-14 rounded-2xl bg-slate-900/90 border-2 border-slate-700 text-white flex flex-col items-center justify-center shadow-xl active:scale-90 active:border-cyan-400"
          >
            <RotateCcw className="w-5 h-5 text-cyan-400" />
            <span className="text-[9px] font-mono font-black mt-0.5 leading-none">
              {ammoInMag}/{ammoReserve}
            </span>
          </button>

          {/* Jump / Ledge Mantle Button */}
          <button
            onTouchStart={e => {
              e.stopPropagation();
              engine?.controller?.triggerJump();
            }}
            className="w-14 h-14 rounded-2xl bg-sky-950/80 border-2 border-sky-400 text-sky-200 flex flex-col items-center justify-center shadow-xl active:scale-90 active:bg-sky-600"
          >
            <ChevronsUp className="w-6 h-6" />
            <span className="text-[8px] font-mono font-black uppercase">JUMP</span>
          </button>

          {/* Crouch / Slide / Dive Button */}
          <button
            onTouchStart={e => {
              e.stopPropagation();
              engine?.controller?.triggerCrouchOrSlide();
            }}
            className="w-14 h-14 rounded-2xl bg-indigo-950/80 border-2 border-indigo-400 text-indigo-200 flex flex-col items-center justify-center shadow-xl active:scale-90 active:bg-indigo-600"
          >
            <Target className="w-5 h-5" />
            <span className="text-[8px] font-mono font-black uppercase">SLIDE/C</span>
          </button>
        </div>

        {/* PRIMARY FIRE & ADS DUAL TRIGGERS */}
        <div className="flex items-center gap-4 mt-1">
          {/* ADS (Aim Down Sights) Precision Button */}
          <button
            onTouchStart={e => {
              e.stopPropagation();
              engine?.controller?.triggerAim(true);
            }}
            onTouchEnd={e => {
              e.stopPropagation();
              engine?.controller?.triggerAim(false);
            }}
            className={`w-16 h-16 rounded-3xl border-2 flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-all ${
              isAiming
                ? 'bg-cyan-500/40 border-cyan-300 text-white shadow-[0_0_20px_rgba(6,182,212,0.8)]'
                : 'bg-black/80 border-slate-600 text-slate-300'
            }`}
          >
            <Crosshair className="w-7 h-7 text-cyan-300" />
            <span className="text-[9px] font-mono font-black uppercase mt-0.5">AIM</span>
          </button>

          {/* PRIMARY FIRE BUTTON */}
          <button
            onTouchStart={e => {
              e.stopPropagation();
              engine?.controller?.triggerShoot(true);
            }}
            onTouchEnd={e => {
              e.stopPropagation();
              engine?.controller?.triggerShoot(false);
            }}
            className="w-20 h-20 rounded-3xl bg-red-600/90 hover:bg-red-500 active:bg-red-700 border-2 border-red-300 text-white flex flex-col items-center justify-center shadow-[0_0_25px_rgba(239,68,68,0.7)] active:scale-90 transition-transform"
          >
            <Zap className="w-8 h-8 fill-white" />
            <span className="text-[10px] font-mono font-black tracking-wider uppercase mt-0.5">FIRE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
