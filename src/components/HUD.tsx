import React, { useEffect, useState } from 'react';
import {
  EliminationAccolade,
  EnemyBot,
  EnvironmentState,
  FloatingDamageNumberItem,
  GameMode,
  HitmarkerEvent,
  KillFeedItem,
  PlayerStats,
  ScorestreakItem,
  TrainingTelemetryData,
  WeaponType,
} from '../types';
import { WEAPON_REGISTRY } from '../game/weapons';
import {
  Shield,
  Heart,
  Crosshair as CrosshairIcon,
  Bomb,
  Zap,
  Flame,
  Radio,
  Sun,
  Moon,
  Sunset,
  CloudLightning,
  Wind,
  Skull,
  Award,
  Target,
  Plane,
  ShieldAlert,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Activity,
  Gauge,
} from 'lucide-react';
import { Minimap } from './Minimap';
import { Killfeed } from './Killfeed';

interface HUDProps {
  stats: PlayerStats;
  gameMode?: GameMode;
  currentWeapon: WeaponType;
  ammoInMag: number;
  ammoReserve: number;
  grenadesCount: number;
  tacticalCount?: number;
  tacticalType?: 'smoke' | 'motion_sensor';
  laserActive: boolean;
  isAiming: boolean;
  isReloading: boolean;
  isSprinting: boolean;
  hitmarker: HitmarkerEvent | null;
  pickupNotice: { text: string; type: 'ammo' | 'armor' | 'stimpack' | 'tactical' } | null;
  accolades?: EliminationAccolade[];
  damageAngle?: number | null;
  streaks: ScorestreakItem[];
  alliesScore: number;
  axisScore: number;
  matchTime: number;
  killfeed: KillFeedItem[];
  bots: EnemyBot[];
  playerPos: { x: number; y: number; z: number };
  playerYaw: number;
  playerPitch?: number;
  uavActive: boolean;
  environment?: EnvironmentState;
  trainingTelemetry?: TrainingTelemetryData;
  floatingDamageNumbers?: FloatingDamageNumberItem[];
  onResetTrainingTargets?: () => void;
  onSwitchWeapon?: (type: WeaponType) => void;
  onToggleWeather?: () => void;
  onDeployTactical?: () => void;
  onToggleTacticalType?: () => void;
  onActivateStreak: (id: 'uav' | 'airstrike' | 'sentry' | 'nuke') => void;
  onOpenGunsmith: () => void;
  onOpenSettings: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  gameMode = 'tdm',
  currentWeapon,
  ammoInMag,
  ammoReserve,
  grenadesCount,
  tacticalCount = 2,
  tacticalType = 'smoke',
  laserActive,
  isAiming,
  isReloading,
  isSprinting,
  hitmarker,
  pickupNotice,
  accolades = [],
  damageAngle = null,
  streaks,
  alliesScore,
  axisScore,
  matchTime,
  killfeed,
  bots,
  playerPos,
  playerYaw,
  playerPitch = 0,
  uavActive,
  environment,
  trainingTelemetry,
  floatingDamageNumbers = [],
  onResetTrainingTargets,
  onSwitchWeapon,
  onToggleWeather,
  onActivateStreak,
}) => {
  const [hitmarkerVisible, setHitmarkerVisible] = useState(false);
  const [hitType, setHitType] = useState<'body' | 'headshot' | 'kill' | 'armor' | 'destructible'>('body');
  const [activeDamageAngle, setActiveDamageAngle] = useState<number | null>(null);

  const wpnCfg = WEAPON_REGISTRY[currentWeapon];

  useEffect(() => {
    if (hitmarker) {
      setHitmarkerVisible(true);
      setHitType(hitmarker.type);
      const timer = setTimeout(() => setHitmarkerVisible(false), 130);
      return () => clearTimeout(timer);
    }
  }, [hitmarker]);

  useEffect(() => {
    if (damageAngle !== null && damageAngle !== undefined) {
      setActiveDamageAngle(damageAngle);
      const timer = setTimeout(() => setActiveDamageAngle(null), 450);
      return () => clearTimeout(timer);
    }
  }, [damageAngle]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const healthPercent = (stats.health / stats.maxHealth) * 100;
  const armorPercent = (stats.armor / stats.maxArmor) * 100;
  const isLowHealth = stats.health <= 35;
  const headingDeg = Math.round(((-playerYaw * 180) / Math.PI + 360) % 360);

  // Score limit progress (target: 50)
  const scoreLimit = 50;
  const alliesPct = Math.min(100, (alliesScore / scoreLimit) * 100);
  const axisPct = Math.min(100, (axisScore / scoreLimit) * 100);

  // Calculate bot compass blips (threat diamonds on compass tape)
  const compassThreats: { offsetPx: number; id: string }[] = [];
  bots.forEach(bot => {
    if (bot.state === 'dead') return;
    const dx = bot.position.x - playerPos.x;
    const dz = bot.position.z - playerPos.z;
    const botWorldAngle = Math.atan2(dx, dz);
    let relAngle = (botWorldAngle - playerYaw + Math.PI * 4) % (Math.PI * 2);
    if (relAngle > Math.PI) relAngle -= Math.PI * 2;
    // Map radians (-PI/2 to PI/2) to compass tape width (+- 160px)
    if (Math.abs(relAngle) < Math.PI / 2.5) {
      const offset = (relAngle / (Math.PI / 2.5)) * 160;
      compassThreats.push({ offsetPx: offset, id: bot.id });
    }
  });

  // Calculate 3D Screen-Space Hostile Tactical Indicators & Reticle Lock-On
  const fovX = isAiming ? (wpnCfg.adsFov * Math.PI) / 180 : (85 * Math.PI) / 180;
  const fovY = fovX * (typeof window !== 'undefined' ? window.innerHeight / Math.max(1, window.innerWidth) : 0.5625);

  let targetLockedBot: { bot: EnemyBot; dist: number } | null = null;

  const enemyMarkers = bots
    .filter(bot => bot.state !== 'dead' && (bot.isVisibleToPlayer || bot.spottedByRadar || uavActive))
    .map(bot => {
      const dx = bot.position.x - playerPos.x;
      const dz = bot.position.z - playerPos.z;
      const distXZ = Math.sqrt(dx * dx + dz * dz);
      const dy = (bot.position.y + 2.05) - (playerPos.y + 1.6);
      const distTotal = Math.sqrt(dx * dx + dz * dz + dy * dy);

      const botWorldAngle = Math.atan2(dx, dz);
      let relYaw = (botWorldAngle - playerYaw + Math.PI * 4) % (Math.PI * 2);
      if (relYaw > Math.PI) relYaw -= Math.PI * 2;

      const pitchToBot = Math.atan2(dy, distXZ);
      const relPitch = pitchToBot - playerPitch;

      // Reticle Target Acquisition (Center Aim Cone)
      const aimCone = isAiming ? 0.05 : 0.075;
      if (Math.abs(relYaw) < aimCone && Math.abs(relPitch) < aimCone && distTotal < 65) {
        if (!targetLockedBot || distTotal < targetLockedBot.dist) {
          targetLockedBot = { bot, dist: distTotal };
        }
      }

      // Check if in camera field of view in front of player
      const inView = Math.abs(relYaw) < fovX * 0.52 && Math.abs(relPitch) < fovY * 0.55 && Math.cos(relYaw) > 0;
      if (!inView || distTotal > 55) return null;

      const screenX = (0.5 + Math.tan(relYaw) / (2 * Math.tan(fovX * 0.5))) * 100;
      const screenY = (0.5 - Math.tan(relPitch) / (2 * Math.tan(fovY * 0.5))) * 100;

      if (screenX < 3 || screenX > 97 || screenY < 3 || screenY > 97) return null;

      const hpPct = Math.max(0, Math.min(100, (bot.health / bot.maxHealth) * 100));

      return {
        id: bot.id,
        name: bot.name,
        archetype: bot.archetype,
        hpPct,
        health: Math.ceil(bot.health),
        dist: Math.round(distTotal),
        state: bot.state,
        alertLevel: bot.alertLevel,
        isAiming: bot.isAiming,
        isReloading: bot.isReloading,
        screenX,
        screenY,
      };
    })
    .filter(Boolean) as {
      id: string;
      name: string;
      archetype: string;
      hpPct: number;
      health: number;
      dist: number;
      state: string;
      alertLevel: string;
      isAiming: boolean;
      isReloading?: boolean;
      screenX: number;
      screenY: number;
    }[];

  // Floating Damage Numbers screen-space projection
  const projectedDamageNumbers = floatingDamageNumbers
    .map(num => {
      const dx = num.position.x - playerPos.x;
      const dz = num.position.z - playerPos.z;
      const distXZ = Math.sqrt(dx * dx + dz * dz);
      const dy = num.position.y - (playerPos.y + 1.6);
      const distTotal = Math.sqrt(dx * dx + dz * dz + dy * dy);

      const worldAngle = Math.atan2(dx, dz);
      let relYaw = (worldAngle - playerYaw + Math.PI * 4) % (Math.PI * 2);
      if (relYaw > Math.PI) relYaw -= Math.PI * 2;

      const pitchToPoint = Math.atan2(dy, distXZ);
      const relPitch = pitchToPoint - playerPitch;

      const inView = Math.abs(relYaw) < fovX * 0.6 && Math.abs(relPitch) < fovY * 0.6 && Math.cos(relYaw) > 0;
      if (!inView || distTotal > 80) return null;

      const screenX = (0.5 + Math.tan(relYaw) / (2 * Math.tan(fovX * 0.5))) * 100;
      const screenY = (0.5 - Math.tan(relPitch) / (2 * Math.tan(fovY * 0.5))) * 100;

      if (screenX < 2 || screenX > 98 || screenY < 2 || screenY > 98) return null;

      return {
        ...num,
        screenX,
        screenY,
        opacity: Math.max(0, num.life / num.maxLife),
      };
    })
    .filter(Boolean);

  const isTrainingMode = gameMode === 'training' || gameMode === 'targetrange';

  return (
    <div id="game-hud" className="absolute inset-0 pointer-events-none select-none overflow-hidden font-sans text-slate-100">
      {/* Subtle Military Vignette & Grid */}
      <div className="absolute inset-0 tactical-scanlines pointer-events-none opacity-40" />
      <div className="absolute inset-0 tactical-vignette pointer-events-none opacity-60" />

      {/* Low Health Blood Spatter Vignette */}
      {isLowHealth && (
        <div
          id="hud-low-health-vignette"
          className="absolute inset-0 transition-opacity duration-200 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 30%, rgba(153, 27, 27, 0.4) 75%, rgba(127, 29, 29, 0.88) 100%)',
            animation: 'pulse 1.0s infinite ease-in-out',
          }}
        />
      )}

      {/* DIRECTIONAL DAMAGE INDICATOR ARC (COD RED THREAT ARCS) */}
      {activeDamageAngle !== null && (
        <div
          id="hud-directional-damage"
          className="absolute inset-0 pointer-events-none flex items-center justify-center transition-opacity duration-300"
        >
          <div
            className="w-96 h-96 rounded-full border-4 border-t-red-600 border-x-transparent border-b-transparent animate-pulse filter drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]"
            style={{
              transform: `rotate(${activeDamageAngle}rad)`,
            }}
          />
        </div>
      )}

      {/* =========================================================================
          TOP COMPASS RULER & SCORE HEADER / TRAINING TELEMETRY
          ========================================================================= */}
      <div id="hud-top-center" className="absolute top-4 left-0 right-0 flex flex-col items-center pointer-events-none z-30">
        {isTrainingMode && trainingTelemetry ? (
          /* TRAINING RANGE TELEMETRY CONSOLE */
          <div className="flex items-center gap-5 bg-black/90 backdrop-blur-md px-6 py-2 rounded-lg border border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
            <div className="flex items-center gap-2 border-r border-slate-700/80 pr-4">
              <Target className="w-5 h-5 text-cyan-400 animate-pulse" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">BALLISTIC RANGE</span>
                <span className="text-xs font-mono font-bold text-slate-300">0 HOSTILES ACTIVE</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-mono uppercase text-slate-400 tracking-wider">DPS (3s)</span>
                <span className="text-xl font-black font-mono text-cyan-300">{trainingTelemetry.currentDps}</span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[9px] font-mono uppercase text-slate-400 tracking-wider">ACCURACY</span>
                <span className="text-xl font-black font-mono text-emerald-400">{trainingTelemetry.accuracy}%</span>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[9px] font-mono uppercase text-slate-400 tracking-wider">HEADSHOTS</span>
                <span className="text-xl font-black font-mono text-amber-400">{trainingTelemetry.headshots}</span>
              </div>

              <div className="flex flex-col items-center border-l border-slate-700/80 pl-4">
                <span className="text-[9px] font-mono uppercase text-slate-400 tracking-wider">LAST HIT</span>
                <span className="text-xs font-black font-mono text-sky-300">
                  {trainingTelemetry.lastHitDamage} DMG [{trainingTelemetry.lastHitDistance}M]
                </span>
                <span className="text-[9px] font-mono text-slate-400 uppercase">{trainingTelemetry.lastHitZone}</span>
              </div>
            </div>

            <button
              onClick={onResetTrainingTargets}
              className="ml-2 pointer-events-auto flex items-center gap-1.5 px-3 py-1 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/80 rounded text-cyan-300 hover:text-white text-xs font-mono font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET [K]</span>
            </button>
          </div>
        ) : (
          /* COD Match Score Banner */
          <div className="flex items-center gap-6 bg-black/85 backdrop-blur-md px-6 py-2 rounded-lg border border-slate-700/80 shadow-2xl">
            {/* Allied Team (Blue / Cyan) */}
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase tracking-widest text-sky-400">TF-141</span>
                <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5 border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                    style={{ width: `${alliesPct}%` }}
                  />
                </div>
              </div>
              <span className="text-2xl font-black font-mono text-sky-300 leading-none">{alliesScore}</span>
            </div>

            {/* Center Match Clock & Objective Limit */}
            <div className="flex flex-col items-center px-4 border-x border-slate-700/60">
              <span className="text-xs font-mono font-bold text-slate-100 tracking-wider">{formatTime(matchTime)}</span>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">LIMIT {scoreLimit}</span>
            </div>

            {/* Axis Team (Red / Orange) */}
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black font-mono text-red-500 leading-none">{axisScore}</span>
              <div className="flex flex-col items-start">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400">KORTAC</span>
                <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-0.5 border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-amber-500 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                    style={{ width: `${axisPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COD Horizontal Compass Ruler */}
        <div className="relative mt-2 w-[420px] h-9 bg-black/75 backdrop-blur-md rounded-md border border-slate-700/70 shadow-lg flex flex-col items-center justify-center overflow-hidden">
          {/* Compass Center Pointer Pip */}
          <div className="absolute top-0 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-cyan-400 z-20" />
          <div className="absolute bottom-0.5 w-[1px] h-3 bg-cyan-400/90 z-20" />

          {/* Horizontal Cardinal Ruler Tape */}
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Ticks tape */}
            <div className="flex items-center space-x-8 text-xs font-mono font-bold text-slate-300">
              <span className="text-[10px] text-slate-500 font-mono">{(headingDeg - 45 + 360) % 360}°</span>
              <span className="text-xs text-slate-400 font-mono">{getCompassCardinal((headingDeg - 30 + 360) % 360)}</span>
              <div className="flex items-center gap-1">
                <span className="text-sm font-black text-cyan-300 font-mono tracking-wider">{headingDeg}°</span>
                <span className="text-sm font-black text-cyan-400 font-mono">{getCompassHeading(playerYaw)}</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">{getCompassCardinal((headingDeg + 30 + 360) % 360)}</span>
              <span className="text-[10px] text-slate-500 font-mono">{(headingDeg + 45 + 360) % 360}°</span>
            </div>

            {/* Red Threat Diamond Indicators on Compass */}
            {compassThreats.map(threat => (
              <div
                key={threat.id}
                className="absolute top-1 w-2.5 h-2.5 bg-red-500 rotate-45 border border-white/80 shadow-[0_0_6px_#ef4444] transition-all duration-75"
                style={{
                  transform: `translateX(${threat.offsetPx}px) rotate(45deg)`,
                }}
              />
            ))}
          </div>

          {/* Ruler bottom tick lines */}
          <div className="absolute bottom-0 w-full flex justify-between px-4">
            {Array.from({ length: 17 }).map((_, i) => (
              <div
                key={i}
                className={`w-[1px] ${i % 4 === 0 ? 'h-2 bg-slate-400' : 'h-1 bg-slate-600/60'}`}
              />
            ))}
          </div>
        </div>

        {/* Pickup Notice Toast */}
        {pickupNotice && (
          <div className="mt-2.5 px-4 py-1 bg-black/90 border border-cyan-400/80 backdrop-blur-xl rounded-md text-cyan-300 font-mono text-xs font-bold tracking-wider animate-bounce shadow-[0_0_12px_rgba(6,182,212,0.5)] flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>{pickupNotice.text}</span>
          </div>
        )}
      </div>

      {/* =========================================================================
          TOP-LEFT: MINIMAP & ENVIRONMENTAL OPS
          ========================================================================= */}
      <div id="hud-top-left" className="absolute top-5 left-6 flex flex-col gap-2 pointer-events-none">
        <Minimap
          playerPos={playerPos}
          playerYaw={playerYaw}
          bots={bots}
          uavActive={uavActive}
        />

        {/* Tactical Keybind Pill */}
        <div className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-md text-[10px] font-mono text-slate-400 flex items-center gap-2.5 border border-slate-700/80 shadow-md">
          <span><kbd className="bg-slate-800 text-cyan-400 px-1 rounded border border-slate-700">TAB</kbd> SCORE</span>
          <span><kbd className="bg-slate-800 text-cyan-400 px-1 rounded border border-slate-700">B</kbd> ARMORY</span>
          <span><kbd className="bg-slate-800 text-cyan-400 px-1 rounded border border-slate-700">ESC</kbd> OPS</span>
        </div>

        {/* Environmental Telemetry */}
        {environment && (
          <div
            id="hud-environmental-telemetry"
            onClick={onToggleWeather}
            title="Click to shift weather and time of day"
            className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-md border border-slate-700/80 shadow-md flex items-center justify-between gap-3 pointer-events-auto cursor-pointer hover:border-cyan-400 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-slate-300">
              {environment.timeOfDay === 'storm' ? (
                <CloudLightning className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              ) : environment.timeOfDay === 'sunset' ? (
                <Sunset className="w-3.5 h-3.5 text-amber-400" />
              ) : environment.timeOfDay === 'night' ? (
                <Moon className="w-3.5 h-3.5 text-sky-300" />
              ) : environment.timeOfDay === 'sandstorm' ? (
                <Wind className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-yellow-300" />
              )}
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-200">
                {environment.weatherName}
              </span>
            </div>
            <span className="text-[9px] font-mono text-cyan-400 font-semibold bg-cyan-950/60 px-1 rounded border border-cyan-800/40">
              {environment.timeString}
            </span>
          </div>
        )}
      </div>

      {/* =========================================================================
          TOP-RIGHT: TELEMETRY & KILLFEED
          ========================================================================= */}
      <div id="hud-top-right" className="absolute top-5 right-6 flex flex-col items-end gap-2.5 pointer-events-none w-80">
        <div className="text-right flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
          <span className="text-[10px] font-mono text-emerald-400 font-bold">ONLINE 128-TICK</span>
          <span className="text-slate-600">|</span>
          <span className="text-[10px] font-mono text-slate-400">18MS</span>
        </div>

        <Killfeed items={killfeed} />
      </div>

      {/* =========================================================================
          CENTER: CALL OF DUTY ELIMINATION ACCOLADES & XP MEDALS
          ========================================================================= */}
      <div id="hud-center-accolades" className="absolute top-1/3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-40">
        {accolades.slice(-2).map(acc => (
          <div
            key={acc.id}
            className="flex flex-col items-center bg-black/80 backdrop-blur-md px-6 py-2 rounded-md border border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.35)] animate-in fade-in zoom-in duration-150"
          >
            <div className="flex items-center gap-2">
              {acc.icon === 'headshot' ? (
                <Skull className="w-5 h-5 text-red-500 animate-pulse" />
              ) : acc.icon === 'streak' ? (
                <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
              ) : (
                <Target className="w-5 h-5 text-yellow-400" />
              )}
              <span className="text-sm font-black font-mono tracking-widest text-amber-300 uppercase">
                {acc.title}
              </span>
            </div>
            {acc.subtext && (
              <span className="text-xs font-mono font-bold text-amber-400/90 tracking-wide mt-0.5">
                {acc.subtext}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* =========================================================================
          IN-WORLD TACTICAL ENEMY OVERHEAD MARKERS & HEALTHBARS
          ========================================================================= */}
      {enemyMarkers.map(m => (
        <div
          key={m.id}
          className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none transition-all duration-75 z-20"
          style={{
            left: `${m.screenX}%`,
            top: `${m.screenY}%`,
          }}
        >
          {/* Hostile Diamond Indicator Pip */}
          <div className="w-2.5 h-2.5 bg-red-600 rotate-45 border border-white/90 shadow-[0_0_8px_#ef4444] mb-1 animate-pulse" />

          {/* Enemy Tactical Tag & Health/Armor Gauge */}
          <div className="flex flex-col items-center bg-black/85 backdrop-blur-md px-2 py-0.5 rounded border border-red-500/70 shadow-[0_0_12px_rgba(239,68,68,0.35)] min-w-[86px]">
            <div className="flex items-center justify-between w-full gap-1.5 text-[9px] font-mono font-black text-red-400 uppercase tracking-wider leading-none">
              <span className="truncate max-w-[80px]">{m.name}</span>
              <span className="text-[8px] text-slate-300 font-bold">{m.dist}m</span>
            </div>

            {/* Health Bar */}
            <div className="w-full h-1 bg-slate-900 rounded-sm overflow-hidden border border-slate-700/80 mt-1">
              <div
                className={`h-full transition-all duration-100 ${
                  m.hpPct > 50 ? 'bg-emerald-400' : m.hpPct > 25 ? 'bg-amber-400' : 'bg-red-500 animate-pulse'
                }`}
                style={{ width: `${m.hpPct}%` }}
              />
            </div>

            {/* Tactical Status Pill */}
            {m.isReloading ? (
              <span className="text-[7.5px] font-mono text-amber-300 font-black tracking-widest mt-0.5 animate-pulse uppercase">
                RELOADING
              </span>
            ) : m.isAiming ? (
              <span className="text-[7.5px] font-mono text-red-400 font-black tracking-widest mt-0.5 uppercase">
                ENGAGING
              </span>
            ) : null}
          </div>
        </div>
      ))}

      {/* =========================================================================
          CENTER: CALL OF DUTY PRECISION RETICLE & DYNAMIC CROSSHAIR
          ========================================================================= */}
      {!isAiming && (
        <div id="hud-crosshair-center" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
          {/* Center Precision Dot */}
          <div
            className={`w-1.5 h-1.5 rounded-full transition-colors duration-75 ${
              targetLockedBot
                ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                : 'bg-white/90 shadow-[0_0_6px_white]'
            }`}
          />

          {/* Top Tick */}
          <div
            className={`absolute w-[1px] transition-all duration-75 ${
              targetLockedBot ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-white/80'
            }`}
            style={{
              height: isSprinting ? '14px' : '9px',
              top: isSprinting ? '-16px' : targetLockedBot ? '-8px' : '-11px',
            }}
          />
          {/* Bottom Tick */}
          <div
            className={`absolute w-[1px] transition-all duration-75 ${
              targetLockedBot ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-white/80'
            }`}
            style={{
              height: isSprinting ? '14px' : '9px',
              bottom: isSprinting ? '-16px' : targetLockedBot ? '-8px' : '-11px',
            }}
          />
          {/* Left Tick */}
          <div
            className={`absolute h-[1px] transition-all duration-75 ${
              targetLockedBot ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-white/80'
            }`}
            style={{
              width: isSprinting ? '14px' : '9px',
              left: isSprinting ? '-16px' : targetLockedBot ? '-8px' : '-11px',
            }}
          />
          {/* Right Tick */}
          <div
            className={`absolute h-[1px] transition-all duration-75 ${
              targetLockedBot ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : 'bg-white/80'
            }`}
            style={{
              width: isSprinting ? '14px' : '9px',
              right: isSprinting ? '-16px' : targetLockedBot ? '-8px' : '-11px',
            }}
          />

          {/* Target Lock Reticle Brackets & Hostile Info Readout */}
          {targetLockedBot && (
            <div className="absolute top-6 flex flex-col items-center pointer-events-none animate-in fade-in zoom-in duration-75">
              <div className="flex items-center gap-1.5 bg-red-950/90 border border-red-500/80 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(239,68,68,0.6)] backdrop-blur-md">
                <Target className="w-3 h-3 text-red-400 animate-pulse" />
                <span className="text-[9px] font-mono font-black text-red-300 tracking-wider uppercase">
                  LOCKED // {targetLockedBot.bot.name} [{Math.round(targetLockedBot.dist)}M]
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CALL OF DUTY AUTHENTIC HITMARKER */}
      {hitmarkerVisible && (
        <div id="hud-hitmarker" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none scale-125 z-50">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <div
              className={`absolute w-3.5 h-0.5 transform rotate-45 -translate-x-2 -translate-y-2 rounded ${
                hitType === 'kill'
                  ? 'bg-red-500 shadow-[0_0_12px_#ef4444]'
                  : hitType === 'headshot'
                  ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b]'
                  : hitType === 'armor'
                  ? 'bg-sky-400 shadow-[0_0_10px_#38bdf8]'
                  : 'bg-white shadow-[0_0_8px_white]'
              }`}
            />
            <div
              className={`absolute w-3.5 h-0.5 transform -rotate-45 translate-x-2 -translate-y-2 rounded ${
                hitType === 'kill'
                  ? 'bg-red-500 shadow-[0_0_12px_#ef4444]'
                  : hitType === 'headshot'
                  ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b]'
                  : hitType === 'armor'
                  ? 'bg-sky-400 shadow-[0_0_10px_#38bdf8]'
                  : 'bg-white shadow-[0_0_8px_white]'
              }`}
            />
            <div
              className={`absolute w-3.5 h-0.5 transform -rotate-45 -translate-x-2 translate-y-2 rounded ${
                hitType === 'kill'
                  ? 'bg-red-500 shadow-[0_0_12px_#ef4444]'
                  : hitType === 'headshot'
                  ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b]'
                  : hitType === 'armor'
                  ? 'bg-sky-400 shadow-[0_0_10px_#38bdf8]'
                  : 'bg-white shadow-[0_0_8px_white]'
              }`}
            />
            <div
              className={`absolute w-3.5 h-0.5 transform rotate-45 translate-x-2 translate-y-2 rounded ${
                hitType === 'kill'
                  ? 'bg-red-500 shadow-[0_0_12px_#ef4444]'
                  : hitType === 'headshot'
                  ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b]'
                  : hitType === 'armor'
                  ? 'bg-sky-400 shadow-[0_0_10px_#38bdf8]'
                  : 'bg-white shadow-[0_0_8px_white]'
              }`}
            />

            {/* Kill skull symbol */}
            {hitType === 'kill' && (
              <Skull className="w-4 h-4 text-red-500 animate-in zoom-in duration-100" />
            )}
          </div>
        </div>
      )}

      {/* 3D FLOATING DAMAGE NUMBERS OVERLAY (TRAINING & BALLISTIC HIT FEEDBACK) */}
      {projectedDamageNumbers.map(num => (
        <div
          key={num.id}
          className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-40 transition-transform duration-75"
          style={{
            left: `${num.screenX}%`,
            top: `${num.screenY}%`,
            opacity: num.opacity,
          }}
        >
          <span
            className={`font-mono font-black tracking-tight ${
              num.isHeadshot
                ? 'text-2xl text-amber-300 scale-110 drop-shadow-[0_0_10px_rgba(245,158,11,0.9)]'
                : 'text-xl text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]'
            }`}
          >
            {num.damage}
          </span>
          <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-cyan-300 bg-black/80 px-1 rounded border border-cyan-500/40">
            {num.hitZone}
          </span>
        </div>
      ))}

      {/* TRAINING QUICK WEAPON ARSENAL RACK */}
      {isTrainingMode && onSwitchWeapon && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-1.5 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/40 shadow-xl z-30">
          <span className="text-[10px] font-mono font-black uppercase text-cyan-400 mr-1 flex items-center gap-1">
            <CrosshairIcon className="w-3 h-3" /> ARSENAL:
          </span>
          {[
            { id: 'ak47' as WeaponType, label: '1. AK-47' },
            { id: 'm4a1' as WeaponType, label: '2. M4A1' },
            { id: 'sniper' as WeaponType, label: '3. AWP' },
            { id: 'shotgun' as WeaponType, label: '4. M870' },
            { id: 'deagle' as WeaponType, label: '5. DEAGLE' },
          ].map(w => (
            <button
              key={w.id}
              onClick={() => onSwitchWeapon(w.id)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                currentWeapon === w.id
                  ? 'bg-cyan-500 text-black font-black shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                  : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-slate-700/60'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      )}

      {/* =========================================================================
          AAA TACTICAL OPTICAL SCOPE OVERLAYS (COD / CS2 FIDELITY)
          ========================================================================= */}
      {/* 1. HIGH-MAGNIFICATION PRECISION SNIPER SCOPE OVERLAY */}
      {isAiming && currentWeapon === 'sniper' && (
        <div id="hud-sniper-scope-overlay" className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/95 z-30">
          <div className="relative w-[86vh] h-[86vh] rounded-full border-[6px] border-neutral-950 overflow-hidden shadow-[0_0_0_100vw_rgba(0,0,0,0.99)] bg-neutral-900/10">
            {/* Optical Glass Lens Distortion & Vignette */}
            <div className="absolute inset-0 bg-radial from-transparent via-black/10 to-black/80 pointer-events-none" />
            <div className="absolute inset-0 border-[24px] border-black/70 rounded-full pointer-events-none" />
            
            {/* Reticle Crosshair System */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Primary Crosshairs */}
              <div className="w-full h-[1px] bg-black/90 shadow-[0_0_1px_rgba(255,255,255,0.4)]" />
              <div className="h-full w-[1px] bg-black/90 absolute shadow-[0_0_1px_rgba(255,255,255,0.4)]" />
              
              {/* Illuminated Red Center Chevron & Micro Dot */}
              <div className="w-2 h-2 rounded-full border border-red-500 bg-red-500/80 shadow-[0_0_8px_#ef4444] absolute z-10" />
              
              {/* Mil-Dot Elevation & Windage Graduations */}
              {[-120, -80, -40, 40, 80, 120].map(offset => (
                <div
                  key={`h-mil-${offset}`}
                  className="w-[1px] h-3 bg-black/90 absolute shadow-[0_0_1px_rgba(255,255,255,0.4)]"
                  style={{ transform: `translateX(${offset}px)` }}
                />
              ))}
              {[-120, -80, -40, 40, 80, 120, 160, 200].map(offset => (
                <div
                  key={`v-mil-${offset}`}
                  className="h-[1px] w-3 bg-black/90 absolute shadow-[0_0_1px_rgba(255,255,255,0.4)]"
                  style={{ transform: `translateY(${offset}px)` }}
                />
              ))}

              {/* Range Estimation Hash Lines (100m, 200m, 300m, 400m) */}
              <div className="absolute top-1/2 left-1/2 translate-y-10 -translate-x-1/2 flex flex-col items-center gap-6">
                <div className="w-12 h-[1px] bg-red-600/70 relative">
                  <span className="absolute -right-7 -top-2 text-[8px] font-mono text-red-500 font-bold">100M</span>
                </div>
                <div className="w-9 h-[1px] bg-red-600/70 relative">
                  <span className="absolute -right-7 -top-2 text-[8px] font-mono text-red-500 font-bold">200M</span>
                </div>
                <div className="w-6 h-[1px] bg-red-600/70 relative">
                  <span className="absolute -right-7 -top-2 text-[8px] font-mono text-red-500 font-bold">300M</span>
                </div>
                <div className="w-4 h-[1px] bg-red-600/70 relative">
                  <span className="absolute -right-7 -top-2 text-[8px] font-mono text-red-500 font-bold">400M</span>
                </div>
              </div>
            </div>

            {/* Scope Peripheral Telemetry Readouts */}
            <div className="absolute top-8 left-12 text-[10px] font-mono text-red-400/90 font-bold flex flex-col gap-0.5">
              <span>MAG: 8.5X TACTICAL</span>
              <span className="text-[9px] text-slate-400 font-normal">MIL-SPEC DUAL-FOCAL</span>
            </div>

            <div className="absolute top-8 right-12 text-[10px] font-mono text-red-400/90 font-bold text-right flex flex-col gap-0.5">
              <span>WIND: 2.1 MPH [L]</span>
              <span className="text-[9px] text-slate-400 font-normal">ELEV: +0.4 MIL</span>
            </div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2 bg-black/80 px-3 py-1 rounded border border-red-500/40 text-[10px] font-mono text-red-300">
                <span className="font-bold text-amber-400">[SHIFT]</span>
                <span>STEADY AIM / HOLD BREATH</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TACTICAL REFLEX / HOLOGRAPHIC RED DOT OPTIC (M4 / MP5 / DEAGLE / SHOTGUN ADS) */}
      {isAiming && currentWeapon !== 'sniper' && (
        <div id="hud-reflex-optic-overlay" className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <div className="relative flex items-center justify-center">
            {/* EOTech-style 68 MOA Outer Tactical Circle */}
            <div className="w-16 h-16 rounded-full border border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.5)] flex items-center justify-center">
              {/* 4 Quadrant Reticle Ticks */}
              <div className="w-full h-[1px] bg-red-500/80" />
              <div className="h-full w-[1px] bg-red-500/80 absolute" />
              {/* Inner 1 MOA Center Dot */}
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] absolute z-10" />
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          BOTTOM-LEFT: COD OPERATOR VITALITY & STREAK ACCUMULATOR
          ========================================================================= */}
      <div id="hud-bottom-left" className="absolute bottom-6 left-6 flex flex-col space-y-2 pointer-events-none">
        {/* Streak / XP Multiplier Badge */}
        <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-t-md border-t border-x border-slate-700/80 w-fit text-xs font-mono">
          <span className="text-amber-400 font-black">STREAK: {stats.currentStreak}</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 font-bold">SCORE: {stats.score}</span>
        </div>

        <div className="bg-black/85 backdrop-blur-md p-3.5 rounded-md rounded-tl-none border border-slate-700/80 shadow-2xl flex flex-col space-y-2.5 w-72">
          {/* Health Bar */}
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-center text-[10px] font-bold tracking-wider uppercase font-mono">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" /> HEALTH
              </span>
              <span className="text-sm font-bold text-white font-mono">{Math.ceil(stats.health)}</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-sm overflow-hidden border border-slate-700/60 p-0.5">
              <div
                className={`h-full rounded-sm transition-all duration-150 ${
                  isLowHealth ? 'bg-red-600 animate-pulse' : 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                }`}
                style={{ width: `${healthPercent}%` }}
              />
            </div>
          </div>

          {/* Armor Bar */}
          <div className="flex flex-col space-y-1">
            <div className="flex justify-between items-center text-[10px] font-bold tracking-wider uppercase font-mono">
              <span className="text-sky-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 fill-sky-400 text-sky-400" /> ARMOR PLATES
              </span>
              <span className="text-sm font-bold text-sky-300 font-mono">{Math.ceil(stats.armor)}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-900 rounded-sm overflow-hidden border border-slate-700/60 p-0.5">
              <div
                className="h-full bg-sky-400 rounded-sm transition-all duration-150 shadow-[0_0_6px_rgba(56,189,248,0.5)]"
                style={{ width: `${armorPercent}%` }}
              />
            </div>
          </div>

          {/* Tactical & Lethal Quick Status */}
          <div className="flex items-center justify-between pt-1.5 border-t border-slate-800 text-[10px] font-mono">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Bomb className="w-3.5 h-3.5 text-amber-400" />
              <span>[G] FRAG: <b className="text-amber-300">{grenadesCount}</b></span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-300">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>[Q] {tacticalType === 'motion_sensor' ? 'SENSOR' : 'SMOKE'}: <b className="text-cyan-300">{tacticalCount}</b></span>
              <span className="text-[9px] text-slate-500 bg-slate-800 px-1 py-0.5 rounded border border-slate-700">[X]</span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          BOTTOM-RIGHT: COD WEAPON CARD & SCORESTREAK COLUMN
          ========================================================================= */}
      <div id="hud-bottom-right" className="absolute bottom-6 right-6 flex items-end space-x-5 pointer-events-none">
        {/* COD Scorestreak Column (Vertical HUD Stack on Right) */}
        <div className="flex flex-col gap-1.5 items-end">
          {streaks.map((s, idx) => (
            <div
              key={s.id}
              onClick={() => s.ready && onActivateStreak(s.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono tracking-wider transition-all border ${
                s.ready
                  ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse pointer-events-auto cursor-pointer hover:scale-105'
                  : 'bg-black/75 border-slate-800 text-slate-500'
              }`}
            >
              <span className="bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-700">
                {idx + 6}
              </span>
              <span className="font-bold uppercase text-[11px]">{s.name}</span>
              <span className="text-[10px] opacity-75">[{s.cost} KILLS]</span>
            </div>
          ))}
        </div>

        {/* COD Weapon & Ammunition Card */}
        <div className="bg-black/85 backdrop-blur-md px-5 py-3.5 rounded-md border border-slate-700/80 shadow-2xl flex items-end space-x-5 min-w-[250px]">
          <div className="flex flex-col items-end w-full">
            {/* Weapon Title & Firemode */}
            <div className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between w-full">
              <span className="text-slate-400">{wpnCfg.category}</span>
              <span className="bg-slate-800 text-cyan-400 px-1.5 py-0.5 rounded text-[9px] border border-slate-700 font-bold">
                {wpnCfg.fullAuto ? 'FULL-AUTO' : 'SEMI-AUTO'}
              </span>
            </div>

            {/* Weapon Name */}
            <div className="text-xs font-black uppercase tracking-wider text-slate-100 mb-1 w-full text-right">
              {wpnCfg.name}
            </div>

            {/* Ammo Large Readout */}
            <div className="flex items-baseline space-x-2">
              <span className={`text-5xl font-mono font-black ${ammoInMag <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {ammoInMag}
              </span>
              <span className="text-2xl font-mono font-bold text-slate-500">/ {ammoReserve}</span>
            </div>

            {/* Segmented Ammo Bars */}
            <div className="flex space-x-1.5 mt-2 w-full justify-end">
              <div className={`w-7 h-1 rounded-sm ${ammoInMag > 15 ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.5)]' : 'bg-slate-800'}`} />
              <div className={`w-7 h-1 rounded-sm ${ammoInMag > 5 ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.5)]' : 'bg-slate-800'}`} />
              <div className={`w-7 h-1 rounded-sm ${ammoInMag > 0 ? (ammoInMag <= 5 ? 'bg-red-500 animate-pulse' : 'bg-cyan-400') : 'bg-slate-800'}`} />
            </div>

            {/* Reloading Alert Banner */}
            {isReloading ? (
              <div className="text-amber-400 text-center text-[10px] font-mono font-black uppercase tracking-widest mt-1.5 animate-pulse">
                RELOADING...
              </div>
            ) : ammoInMag <= 5 && ammoInMag > 0 ? (
              <div className="text-red-400 text-center text-[10px] font-mono font-black uppercase tracking-widest mt-1.5">
                LOW AMMO [R]
              </div>
            ) : (
              <div className="text-slate-500 text-center text-[9px] font-mono uppercase tracking-widest mt-1.5">
                [F] LASER: {laserActive ? 'ON' : 'OFF'} • [I] INSPECT
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

function getCompassHeading(yaw: number): string {
  const deg = ((-yaw * 180) / Math.PI + 360) % 360;
  if (deg >= 337.5 || deg < 22.5) return 'N';
  if (deg >= 22.5 && deg < 67.5) return 'NE';
  if (deg >= 67.5 && deg < 112.5) return 'E';
  if (deg >= 112.5 && deg < 157.5) return 'SE';
  if (deg >= 157.5 && deg < 202.5) return 'S';
  if (deg >= 202.5 && deg < 247.5) return 'SW';
  if (deg >= 247.5 && deg < 292.5) return 'W';
  return 'NW';
}

function getCompassCardinal(deg: number): string {
  if (deg >= 337.5 || deg < 22.5) return 'N';
  if (deg >= 22.5 && deg < 67.5) return 'NE';
  if (deg >= 67.5 && deg < 112.5) return 'E';
  if (deg >= 112.5 && deg < 157.5) return 'SE';
  if (deg >= 157.5 && deg < 202.5) return 'S';
  if (deg >= 202.5 && deg < 247.5) return 'SW';
  if (deg >= 247.5 && deg < 292.5) return 'W';
  return 'NW';
}
