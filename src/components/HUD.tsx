import React, { useEffect, useState } from 'react';
import {
  EliminationAccolade,
  EnemyBot,
  EnvironmentState,
  FloatingDamageNumberItem,
  GameMode,
  HitmarkerEvent,
  KillFeedItem,
  OpticType,
  PlayerStats,
  ReticleColor,
  ReticleStyle,
  ScorestreakItem,
  TrainingTelemetryData,
  WeaponType,
} from '../types';
import { OPTIC_REGISTRY, WEAPON_REGISTRY } from '../game/weapons';
import {
  Shield,
  Heart,
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
  Target,
  ZoomIn,
  Timer,
} from 'lucide-react';
import { Minimap } from './Minimap';
import { Killfeed } from './Killfeed';

interface HUDProps {
  stats: PlayerStats;
  gameMode?: GameMode;
  currentWeapon: WeaponType;
  equippedOptic?: OpticType;
  reticleColor?: ReticleColor;
  reticleStyle?: ReticleStyle;
  ammoInMag: number;
  ammoReserve: number;
  grenadesCount: number;
  tacticalCount?: number;
  tacticalType?: 'smoke' | 'motion_sensor';
  laserActive: boolean;
  isAiming: boolean;
  isReloading: boolean;
  isSprinting: boolean;
  isHoldingBreath?: boolean;
  breathStamina?: number;
  isHyperventilating?: boolean;
  opticZoomStepIndex?: number;
  isThermalEnabled?: boolean;
  targetRangeMeters?: number;
  elevationHoldoverMil?: number;
  targetedEnemyId?: string | null;
  scopeShadowOffsetX?: number;
  scopeShadowOffsetY?: number;
  isTacStance?: boolean;
  isMounted?: boolean;
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
  equippedOptic = 'holo_553',
  reticleColor = 'red',
  reticleStyle = 'holo_ring',
  ammoInMag,
  ammoReserve,
  grenadesCount,
  tacticalCount = 2,
  tacticalType = 'smoke',
  laserActive,
  isAiming,
  isReloading,
  isSprinting,
  isHoldingBreath = false,
  breathStamina = 1.0,
  isHyperventilating = false,
  opticZoomStepIndex = 0,
  isThermalEnabled = false,
  targetRangeMeters = 0,
  elevationHoldoverMil = 0,
  scopeShadowOffsetX = 0,
  scopeShadowOffsetY = 0,
  isTacStance = false,
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
  onToggleTacticalType,
  onActivateStreak,
}) => {
  const wpnCfg = WEAPON_REGISTRY[currentWeapon] || WEAPON_REGISTRY['m4'];
  const opticCfg = OPTIC_REGISTRY[equippedOptic] || OPTIC_REGISTRY['iron_sight'];

  const healthPercent = Math.max(0, Math.min(100, (stats.health / stats.maxHealth) * 100));
  const isLowHealth = stats.health <= 30;

  // 3-Segment Armor Plate calculation (Warzone: 3 plates)
  const plateCount = Math.ceil((stats.armor / stats.maxArmor) * 3);

  // Directional damage indicator fading
  const [activeDamageAngle, setActiveDamageAngle] = useState<number | null>(null);

  useEffect(() => {
    if (damageAngle !== null && damageAngle !== undefined) {
      setActiveDamageAngle(damageAngle);
      const timer = setTimeout(() => setActiveDamageAngle(null), 550);
      return () => clearTimeout(timer);
    }
  }, [damageAngle]);

  // Format time mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Score Limit
  const scoreLimit = gameMode === 'tdm' ? 50 : gameMode === 'freeforall' ? 30 : 25;
  const alliesPct = Math.min(100, (alliesScore / scoreLimit) * 100);
  const axisPct = Math.min(100, (axisScore / scoreLimit) * 100);

  // Heading Degree for COD Compass Ribbon
  const headingDeg = Math.round(((-playerYaw * 180) / Math.PI + 360) % 360);

  // Clean compass threat pips
  const compassThreats: { offsetPx: number; id: string }[] = [];
  bots.forEach(bot => {
    if (bot.state === 'dead' || (!bot.isVisibleToPlayer && !bot.spottedByRadar && !uavActive)) return;
    const dx = bot.position.x - playerPos.x;
    const dz = bot.position.z - playerPos.z;
    const botWorldAngle = Math.atan2(dx, dz);
    let relAngle = (botWorldAngle - playerYaw + Math.PI * 4) % (Math.PI * 2);
    if (relAngle > Math.PI) relAngle -= Math.PI * 2;
    if (Math.abs(relAngle) < Math.PI / 2.8) {
      const offset = (relAngle / (Math.PI / 2.8)) * 140;
      compassThreats.push({ offsetPx: offset, id: bot.id });
    }
  });

  // Calculate Screen Coordinates for In-World Minimalist Enemy Markers
  const currentFovDeg = isAiming
    ? (opticCfg.variableZoomSteps
        ? 68 / opticCfg.variableZoomSteps[opticZoomStepIndex % opticCfg.variableZoomSteps.length]
        : 68 / opticCfg.magnification)
    : 85;
  const fovX = (currentFovDeg * Math.PI) / 180;
  const fovY = fovX * (typeof window !== 'undefined' ? window.innerHeight / Math.max(1, window.innerWidth) : 0.5625);

  let targetLockedBot: { bot: EnemyBot; dist: number } | null = null;

  // Clean, unobtrusive enemy markers: only minimal red pip and optional micro-healthbar when damaged
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

      // Reticle Target Acquisition
      const aimCone = isAiming ? 0.05 : 0.075;
      if (Math.abs(relYaw) < aimCone && Math.abs(relPitch) < aimCone && distTotal < 65) {
        if (!targetLockedBot || distTotal < targetLockedBot.dist) {
          targetLockedBot = { bot, dist: distTotal };
        }
      }

      const inView = Math.abs(relYaw) < fovX * 0.52 && Math.abs(relPitch) < fovY * 0.55 && Math.cos(relYaw) > 0;
      if (!inView || distTotal > 55) return null;

      const screenX = (0.5 + Math.tan(relYaw) / (2 * Math.tan(fovX * 0.5))) * 100;
      const screenY = (0.5 - Math.tan(relPitch) / (2 * Math.tan(fovY * 0.5))) * 100;

      if (screenX < 4 || screenX > 96 || screenY < 4 || screenY > 96) return null;

      const hpPct = Math.max(0, Math.min(100, (bot.health / bot.maxHealth) * 100));

      return {
        id: bot.id,
        hpPct,
        dist: Math.round(distTotal),
        screenX,
        screenY,
      };
    })
    .filter(Boolean) as {
      id: string;
      hpPct: number;
      dist: number;
      screenX: number;
      screenY: number;
    }[];

  // Clean 3D Floating Damage Numbers
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
      if (!inView || distTotal > 70) return null;

      const screenX = (0.5 + Math.tan(relYaw) / (2 * Math.tan(fovX * 0.5))) * 100;
      const screenY = (0.5 - Math.tan(relPitch) / (2 * Math.tan(fovY * 0.5))) * 100;

      if (screenX < 3 || screenX > 97 || screenY < 3 || screenY > 97) return null;

      return {
        ...num,
        screenX,
        screenY,
        opacity: Math.max(0, num.life / num.maxLife),
      };
    })
    .filter(Boolean);

  const isTrainingMode = gameMode === 'training' || gameMode === 'targetrange';

  // Reticle color mappings
  const reticleColorHexMap: Record<ReticleColor, string> = {
    red: '#ef4444',
    green: '#10b981',
    amber: '#f59e0b',
    cyan: '#06b6d4',
  };
  const activeColorHex = reticleColorHexMap[reticleColor] || '#ef4444';

  const hasScopeOverlay = isAiming && !isTacStance && opticCfg.hasFullScopeOverlay;
  const isThermalScope = (isThermalEnabled || opticCfg.hasThermalVision) && hasScopeOverlay;

  const currentMagnification = opticCfg.variableZoomSteps
    ? opticCfg.variableZoomSteps[opticZoomStepIndex % opticCfg.variableZoomSteps.length]
    : opticCfg.magnification;

  const canHoldBreath = isAiming && (opticCfg.magnification >= 2.0 || !!opticCfg.variableZoomSteps);

  return (
    <div id="game-hud" className="absolute inset-0 pointer-events-none select-none overflow-hidden font-sans text-slate-100">
      {/* Low Health Vignette */}
      {isLowHealth && (
        <div
          id="hud-low-health-vignette"
          className="absolute inset-0 transition-opacity duration-200 pointer-events-none z-20"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(185, 28, 28, 0.4) 75%, rgba(153, 27, 27, 0.85) 100%)',
            animation: 'pulse 0.9s infinite ease-in-out',
          }}
        />
      )}

      {/* Directional Damage Hit Arc */}
      {activeDamageAngle !== null && (
        <div
          id="hud-directional-damage"
          className="absolute inset-0 pointer-events-none flex items-center justify-center transition-opacity duration-300 z-20"
        >
          <div
            className="w-72 h-72 rounded-full border-4 border-t-red-500 border-x-transparent border-b-transparent animate-pulse filter drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]"
            style={{
              transform: `rotate(${activeDamageAngle}rad)`,
            }}
          />
        </div>
      )}

      {/* TOP-CENTER: MATCH SCORE STRIP & COD COMPASS TAPE */}
      <div id="hud-top-center" className="absolute top-3 left-0 right-0 flex flex-col items-center pointer-events-none z-30">
        {isTrainingMode && trainingTelemetry ? (
          /* Training Range Telemetry */
          <div className="flex items-center gap-4 bg-black/75 backdrop-blur-md px-5 py-1.5 rounded-lg border border-cyan-500/40 shadow-lg text-xs font-mono">
            <span className="text-cyan-400 font-bold uppercase flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> RANGE
            </span>
            <span className="text-slate-400">DPS: <b className="text-cyan-300">{trainingTelemetry.currentDps}</b></span>
            <span className="text-slate-400">ACC: <b className="text-emerald-400">{trainingTelemetry.accuracy}%</b></span>
            <span className="text-slate-400">HEADSHOTS: <b className="text-amber-400">{trainingTelemetry.headshots}</b></span>
            <button
              onClick={onResetTrainingTargets}
              className="pointer-events-auto px-2 py-0.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-600/60 rounded text-cyan-300 text-[10px] font-bold cursor-pointer transition-colors"
            >
              RESET [K]
            </button>
          </div>
        ) : (
          /* Clean Match Score Strip */
          <div className="flex items-center gap-4 bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-lg border border-slate-800 shadow-lg">
            {/* Allies */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black font-mono text-sky-400">TF-141</span>
              <div className="w-16 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-sky-400 rounded-full transition-all" style={{ width: `${alliesPct}%` }} />
              </div>
              <span className="text-base font-black font-mono text-white">{alliesScore}</span>
            </div>

            {/* Time / Score Limit */}
            <div className="flex items-center gap-1 px-2 border-x border-slate-800 text-[11px] font-mono text-slate-300">
              <Timer className="w-3 h-3 text-cyan-400" />
              <span>{formatTime(matchTime)}</span>
              <span className="text-slate-500 text-[9px]">/ {scoreLimit}</span>
            </div>

            {/* Axis */}
            <div className="flex items-center gap-2">
              <span className="text-base font-black font-mono text-red-500">{axisScore}</span>
              <div className="w-16 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${axisPct}%` }} />
              </div>
              <span className="text-xs font-black font-mono text-red-400">KORTAC</span>
            </div>
          </div>
        )}

        {/* Clean COD Compass Ribbon */}
        <div className="relative mt-1.5 w-80 h-7 bg-black/60 backdrop-blur-md rounded border border-slate-800/80 shadow flex items-center justify-center overflow-hidden">
          <div className="absolute top-0 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-amber-400 z-20" />

          <div className="flex items-center space-x-7 text-[11px] font-mono font-bold text-slate-400">
            <span className="text-[9px] text-slate-600 font-mono">{(headingDeg - 40 + 360) % 360}°</span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/90 text-amber-300 font-black">
              <span>{headingDeg}°</span>
              <span>{getCompassHeading(playerYaw)}</span>
            </div>
            <span className="text-[9px] text-slate-600 font-mono">{(headingDeg + 40 + 360) % 360}°</span>
          </div>

          {compassThreats.map(threat => (
            <div
              key={threat.id}
              className="absolute top-1 w-2 h-2 bg-red-500 rotate-45 border border-white/90 shadow-[0_0_6px_#ef4444]"
              style={{
                transform: `translateX(${threat.offsetPx}px) rotate(45deg)`,
              }}
            />
          ))}
        </div>

        {/* Pickup Toast */}
        {pickupNotice && (
          <div className="mt-2 px-3 py-1 bg-black/90 border border-cyan-500/70 rounded text-cyan-300 font-mono text-[11px] font-bold tracking-wide shadow flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>{pickupNotice.text}</span>
          </div>
        )}
      </div>

      {/* TOP-LEFT: MINIMAP & ENVIRONMENTAL OPS */}
      <div id="hud-top-left" className="absolute top-3 left-4 flex flex-col gap-1.5 pointer-events-none">
        <Minimap
          playerPos={playerPos}
          playerYaw={playerYaw}
          bots={bots}
          uavActive={uavActive}
        />

        <div className="flex items-center gap-2 text-[9px] font-mono text-slate-400 bg-black/70 px-2 py-0.5 rounded border border-slate-800">
          <span><kbd className="text-cyan-400 font-bold">TAB</kbd> SCORE</span>
          <span>•</span>
          <span><kbd className="text-cyan-400 font-bold">B</kbd> ARMORY</span>
          <span>•</span>
          <span><kbd className="text-cyan-400 font-bold">ESC</kbd> OPS</span>
        </div>

        {environment && (
          <div
            id="hud-environmental-telemetry"
            onClick={onToggleWeather}
            title="Click to shift weather [T]"
            className="bg-black/70 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1.5 pointer-events-auto cursor-pointer text-[9px] font-mono text-slate-300 hover:border-cyan-500/50 transition-colors w-fit"
          >
            {environment.timeOfDay === 'storm' ? (
              <CloudLightning className="w-3 h-3 text-cyan-400" />
            ) : environment.timeOfDay === 'sunset' ? (
              <Sunset className="w-3 h-3 text-amber-400" />
            ) : environment.timeOfDay === 'night' ? (
              <Moon className="w-3 h-3 text-sky-300" />
            ) : environment.timeOfDay === 'sandstorm' ? (
              <Wind className="w-3 h-3 text-amber-500" />
            ) : (
              <Sun className="w-3 h-3 text-yellow-300" />
            )}
            <span className="uppercase font-bold">{environment.weatherName}</span>
            <span className="text-cyan-400">[{environment.timeString}]</span>
          </div>
        )}
      </div>

      {/* TOP-RIGHT: TELEMETRY & KILLFEED */}
      <div id="hud-top-right" className="absolute top-3 right-4 flex flex-col items-end gap-2 pointer-events-none w-72">
        <div className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-400 bg-black/60 px-2 py-0.5 rounded border border-slate-800">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
          <span>128-TICK</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">12MS</span>
        </div>

        <Killfeed items={killfeed} />
      </div>

      {/* CENTER: ACCOLADES */}
      <div id="hud-center-accolades" className="absolute top-1/4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none z-40">
        {accolades.slice(-2).map(acc => (
          <div
            key={acc.id}
            className="flex items-center gap-2 bg-black/80 px-4 py-1.5 rounded-lg border border-amber-500/60 shadow-lg text-xs font-mono font-black text-amber-300 uppercase animate-in fade-in zoom-in duration-100"
          >
            {acc.icon === 'headshot' ? (
              <Skull className="w-4 h-4 text-red-500" />
            ) : acc.icon === 'streak' ? (
              <Flame className="w-4 h-4 text-amber-400" />
            ) : (
              <Target className="w-4 h-4 text-yellow-400" />
            )}
            <span>{acc.title}</span>
            {acc.subtext && <span className="text-[10px] text-amber-400/80 font-normal">({acc.subtext})</span>}
          </div>
        ))}
      </div>

      {/* IN-WORLD MINIMALIST ENEMY INDICATORS */}
      {enemyMarkers.map(m => (
        <div
          key={m.id}
          className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none transition-all duration-75 z-20"
          style={{
            left: `${m.screenX}%`,
            top: `${m.screenY}%`,
          }}
        >
          <div className="w-2 h-2 bg-red-600 rotate-45 border border-white/80 shadow-[0_0_6px_#ef4444]" />

          {m.hpPct < 100 && (
            <div className="w-7 h-1 bg-slate-950 rounded-full overflow-hidden border border-slate-700/80 mt-0.5">
              <div
                className={`h-full ${m.hpPct > 50 ? 'bg-emerald-400' : 'bg-red-500'}`}
                style={{ width: `${m.hpPct}%` }}
              />
            </div>
          )}

          <span className="text-[8px] font-mono text-slate-300 font-bold drop-shadow leading-tight mt-0.5">
            {m.dist}m
          </span>
        </div>
      ))}

      {/* FLOATING DAMAGE NUMBERS */}
      {projectedDamageNumbers.map(num => (
        <div
          key={num.id}
          className="absolute pointer-events-none font-mono font-black -translate-x-1/2 -translate-y-1/2 z-30 select-none transition-transform"
          style={{
            left: `${num.screenX}%`,
            top: `${num.screenY}%`,
            opacity: num.opacity,
            transform: `translate(-50%, -50%) scale(${1 + (1 - num.life / num.maxLife) * 0.3})`,
            color: num.isHeadshot ? '#ef4444' : num.isShield ? '#38bdf8' : '#eab308',
            textShadow: '0 1px 3px black',
          }}
        >
          <div className="flex items-center gap-0.5 text-xs sm:text-sm">
            {num.isHeadshot && <Skull className="w-3 h-3 text-red-500 inline" />}
            <span>{num.damage}</span>
            {num.isHeadshot && <span className="text-[8px] uppercase tracking-wider">CRIT</span>}
          </div>
        </div>
      ))}

      {/* CENTER: HIPFIRE CLEAN RETICLE */}
      {!isAiming && (
        <div id="hud-crosshair-center" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
          <div
            className={`w-1 h-1 rounded-full ${targetLockedBot ? 'bg-red-500' : 'bg-white/90'}`}
          />
          <div
            className={`absolute w-[1px] ${targetLockedBot ? 'bg-red-500' : 'bg-white/80'}`}
            style={{
              height: isSprinting ? '12px' : '7px',
              top: isSprinting ? '-18px' : '-13px',
            }}
          />
          <div
            className={`absolute w-[1px] ${targetLockedBot ? 'bg-red-500' : 'bg-white/80'}`}
            style={{
              height: isSprinting ? '12px' : '7px',
              bottom: isSprinting ? '-18px' : '-13px',
            }}
          />
          <div
            className={`absolute h-[1px] ${targetLockedBot ? 'bg-red-500' : 'bg-white/80'}`}
            style={{
              width: isSprinting ? '12px' : '7px',
              left: isSprinting ? '-18px' : '-13px',
            }}
          />
          <div
            className={`absolute h-[1px] ${targetLockedBot ? 'bg-red-500' : 'bg-white/80'}`}
            style={{
              width: isSprinting ? '12px' : '7px',
              right: isSprinting ? '-18px' : '-13px',
            }}
          />
        </div>
      )}

      {/* COD 4-TICK HITMARKER */}
      {hitmarker && (
        <div id="hud-hitmarker" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
          <div className="relative w-7 h-7 flex items-center justify-center animate-in zoom-in duration-75">
            <div
              className={`w-3.5 h-[1.5px] absolute -top-1 -left-1 rotate-45 ${
                hitmarker.type === 'headshot' ? 'bg-red-500' : hitmarker.type === 'kill' ? 'bg-amber-400' : 'bg-white'
              }`}
            />
            <div
              className={`w-3.5 h-[1.5px] absolute -top-1 -right-1 -rotate-45 ${
                hitmarker.type === 'headshot' ? 'bg-red-500' : hitmarker.type === 'kill' ? 'bg-amber-400' : 'bg-white'
              }`}
            />
            <div
              className={`w-3.5 h-[1.5px] absolute -bottom-1 -left-1 -rotate-45 ${
                hitmarker.type === 'headshot' ? 'bg-red-500' : hitmarker.type === 'kill' ? 'bg-amber-400' : 'bg-white'
              }`}
            />
            <div
              className={`w-3.5 h-[1.5px] absolute -bottom-1 -right-1 rotate-45 ${
                hitmarker.type === 'headshot' ? 'bg-red-500' : hitmarker.type === 'kill' ? 'bg-amber-400' : 'bg-white'
              }`}
            />
            {hitmarker.type === 'kill' && (
              <Skull className="w-3.5 h-3.5 text-red-500 absolute animate-ping" />
            )}
          </div>
        </div>
      )}

      {/* OPTICAL SCOPE OVERLAYS (ADS) */}
      {hasScopeOverlay && (
        <div
          id="hud-sniper-scope-overlay"
          className="absolute inset-0 pointer-events-none flex items-center justify-center z-30 overflow-hidden"
          style={{
            filter: isThermalScope ? 'contrast(140%) saturate(20%)' : 'none',
          }}
        >
          {/* Scope Aperture Housing */}
          <div
            className="relative w-[76vh] h-[76vh] rounded-full border-[10px] border-[#070b14] overflow-hidden shadow-[0_0_0_9999px_rgba(2,4,8,0.98)] bg-transparent transition-transform duration-75 flex items-center justify-center"
            style={{
              transform: `translate(${scopeShadowOffsetX * 16}px, ${scopeShadowOffsetY * 16}px)`,
            }}
          >
            {/* Thermal Vision Filter */}
            {isThermalScope && (
              <>
                <div className="absolute inset-0 bg-emerald-950/25 mix-blend-screen pointer-events-none z-10" />
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,0)_50%,rgba(0,0,0,0.3)_51%,rgba(0,0,0,0.3))] bg-[length:100%_4px] pointer-events-none opacity-25 z-10" />
              </>
            )}

            {/* Scope Lens Vignette / Shadow */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none transition-all duration-75 z-10"
              style={{
                background: `radial-gradient(circle at ${50 + scopeShadowOffsetX * 35}% ${50 + scopeShadowOffsetY * 35}%, transparent 58%, rgba(0, 0, 0, 0.35) 82%, rgba(0, 0, 0, 0.95) 100%)`,
              }}
            />

            {/* Inner Optic Bezel Ring */}
            <div className="absolute inset-0 border-[16px] border-black/85 rounded-full pointer-events-none ring-1 ring-white/10 z-10" />

            {/* Tactical Mil-Dot / German #4 Reticle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Outer Thick Posts */}
              <div className="absolute left-0 w-[calc(50%-100px)] h-[3px] bg-black/95" />
              <div className="absolute right-0 w-[calc(50%-100px)] h-[3px] bg-black/95" />
              <div className="absolute bottom-0 h-[calc(50%-100px)] w-[3px] bg-black/95" />
              <div className="absolute top-0 h-[calc(50%-100px)] w-[3px] bg-black/95" />

              {/* Center Hairline Crosshairs */}
              <div className="w-full h-[1px] bg-black/90 absolute" />
              <div className="h-full w-[1px] bg-black/90 absolute" />

              {/* Center Illuminated Aiming Dot */}
              <div
                className="w-1.5 h-1.5 rounded-full absolute z-20 pointer-events-none"
                style={{
                  backgroundColor: activeColorHex,
                  boxShadow: `0 0 6px ${activeColorHex}, 0 0 12px ${activeColorHex}`,
                }}
              />

              {/* Horizontal Mil-Dot Stadia Ticks */}
              {[-120, -80, -40, 40, 80, 120].map(offset => (
                <div
                  key={`h-${offset}`}
                  className="w-[1px] h-3 bg-black/90 absolute"
                  style={{ transform: `translateX(${offset}px)` }}
                />
              ))}

              {/* Vertical Elevation Drop Stadia Ticks */}
              {[-120, -80, -40, 40, 80, 120, 160].map(offset => (
                <div
                  key={`v-${offset}`}
                  className="h-[1px] w-3 bg-black/90 absolute"
                  style={{ transform: `translateY(${offset}px)` }}
                />
              ))}
            </div>

            {/* Telemetry: Top-Left Magnification & Variable Zoom */}
            <div
              className="absolute top-9 left-12 text-[10px] font-mono font-bold flex flex-col gap-0.5 tracking-wider select-none drop-shadow z-20"
              style={{ color: activeColorHex }}
            >
              <span className="flex items-center gap-1.5 uppercase">
                <ZoomIn className="w-3.5 h-3.5" />
                {currentMagnification.toFixed(1)}X {opticCfg.name}
              </span>
              {opticCfg.variableZoomSteps && (
                <span className="text-[8px] text-slate-300 font-mono tracking-normal opacity-80">
                  [V / SCROLL] TOGGLE ZOOM
                </span>
              )}
            </div>

            {/* Telemetry: Top-Right Laser Rangefinder & Ballistic Holdover */}
            <div
              className="absolute top-9 right-12 text-[10px] font-mono font-bold text-right flex flex-col gap-0.5 tracking-wider select-none drop-shadow z-20"
              style={{ color: activeColorHex }}
            >
              <span>{targetRangeMeters > 0 ? `RANGE: ${targetRangeMeters.toFixed(1)} M` : 'RANGE: --- M'}</span>
              {elevationHoldoverMil > 0 && (
                <span className="text-[9px] opacity-85">ELEV: +{elevationHoldoverMil.toFixed(1)} MIL</span>
              )}
            </div>

            {/* Telemetry: Bottom Steady Aim Stamina Gauge */}
            {canHoldBreath && (
              <div className="absolute bottom-9 inset-x-0 flex flex-col items-center gap-1 text-[9px] font-mono tracking-widest text-slate-200 drop-shadow select-none z-20">
                <span className="flex items-center gap-1.5 font-bold">
                  <span className="px-1 py-0.5 rounded bg-black/70 border border-white/20 text-[8px] text-white">
                    SHIFT
                  </span>
                  {isHoldingBreath ? 'STEADY AIM ACTIVE' : 'HOLD BREATH'}
                </span>
                <div className="w-28 h-1 bg-black/80 rounded-full overflow-hidden border border-white/15">
                  <div
                    className="h-full transition-all duration-75"
                    style={{
                      width: `${Math.round(breathStamina * 100)}%`,
                      backgroundColor:
                        breathStamina > 0.4 ? '#10b981' : breathStamina > 0.2 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reflex Sight (ADS Holographic) */}
      {isAiming && !hasScopeOverlay && !isTacStance && equippedOptic !== 'iron_sight' && (
        <div id="hud-reflex-optic-overlay" className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <div className="relative flex items-center justify-center">
            {reticleStyle === 'holo_ring' ? (
              <div
                className="w-12 h-12 rounded-full border flex items-center justify-center"
                style={{ borderColor: `${activeColorHex}88` }}
              >
                <div className="w-full h-[1px]" style={{ backgroundColor: `${activeColorHex}88` }} />
                <div className="h-full w-[1px] absolute" style={{ backgroundColor: `${activeColorHex}88` }} />
                <div className="w-1.5 h-1.5 rounded-full absolute" style={{ backgroundColor: activeColorHex }} />
              </div>
            ) : (
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activeColorHex }} />
            )}
          </div>
        </div>
      )}

      {/* Breath Gauge */}
      {canHoldBreath && (isHoldingBreath || breathStamina < 0.95) && (
        <div
          id="hud-breath-stamina-bar"
          className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 bg-black/75 px-3 py-1 rounded border border-slate-800 text-[9px] font-mono"
        >
          <div className="flex justify-between w-32 font-bold">
            <span className={isHyperventilating ? 'text-red-400' : 'text-cyan-300'}>BREATH</span>
            <span>{Math.round(breathStamina * 100)}%</span>
          </div>
          <div className="w-32 h-1 bg-slate-900 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${isHyperventilating ? 'bg-red-500' : 'bg-cyan-400'}`}
              style={{ width: `${Math.max(4, breathStamina * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* BOTTOM-LEFT: OPERATOR HEALTH & 3-PLATE ARMOR BAY */}
      <div id="hud-bottom-left" className="absolute bottom-4 left-4 flex flex-col space-y-1 pointer-events-none z-20">
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 bg-black/60 px-2.5 py-0.5 rounded-t border-t border-x border-slate-800 w-fit">
          <span className="text-amber-400 font-bold">LVL 55</span>
          <span>•</span>
          <span className="text-slate-200 uppercase font-bold">GHOST</span>
          <span>•</span>
          <span className="text-amber-400 font-bold flex items-center gap-0.5">
            <Flame className="w-3 h-3 text-amber-400" /> {stats.currentStreak}
          </span>
        </div>

        <div className="bg-black/75 backdrop-blur-md px-3.5 py-2.5 rounded-lg rounded-tl-none border border-slate-800 shadow-xl flex flex-col space-y-2 w-64">
          {/* Health Bar */}
          <div className="flex flex-col space-y-0.5">
            <div className="flex justify-between text-[9px] font-mono font-bold text-slate-300">
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3 fill-red-500 text-red-500" /> HP
              </span>
              <span className="text-white font-mono">{Math.ceil(stats.health)}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-950 rounded overflow-hidden">
              <div
                className={`h-full transition-all ${isLowHealth ? 'bg-red-600 animate-pulse' : 'bg-emerald-400'}`}
                style={{ width: `${healthPercent}%` }}
              />
            </div>
          </div>

          {/* 3 Armor Plates */}
          <div className="flex flex-col space-y-0.5">
            <div className="flex justify-between text-[9px] font-mono font-bold text-sky-400">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 fill-sky-400 text-sky-400" /> ARMOR
              </span>
              <span>{Math.ceil(stats.armor)}</span>
            </div>
            <div className="flex items-center gap-1 w-full">
              {[0, 1, 2].map(plateIdx => (
                <div key={plateIdx} className="flex-1 h-1.5 rounded bg-slate-950 overflow-hidden">
                  <div
                    className={`h-full transition-all ${plateCount > plateIdx ? 'bg-sky-400' : 'bg-transparent'}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Compact Equipment Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[9px] font-mono text-slate-300">
            <div className="flex items-center gap-1">
              <Bomb className="w-3 h-3 text-amber-400" />
              <span>[G] ×{grenadesCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-cyan-400" />
              <span onClick={onToggleTacticalType} className="cursor-pointer pointer-events-auto hover:text-white" title="Swap Tactical [X]">
                [Q/{tacticalType === 'smoke' ? 'SMK' : 'SNS'}] ×{tacticalCount}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[8px] text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${laserActive ? 'bg-emerald-400' : 'bg-slate-700'}`} />
              <span>[F] LASER</span>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM-RIGHT: WEAPON AMMUNITION BAY & SCORESTREAKS */}
      <div id="hud-bottom-right" className="absolute bottom-4 right-4 flex items-end space-x-3 pointer-events-none z-20">
        {/* Sleek Vertical Scorestreaks */}
        <div className="flex flex-col gap-1 items-end">
          {streaks.map((s, idx) => (
            <div
              key={s.id}
              onClick={() => s.ready && onActivateStreak(s.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono tracking-wider transition-all border ${
                s.ready
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow animate-pulse pointer-events-auto cursor-pointer'
                  : 'bg-black/60 border-slate-850 text-slate-500'
              }`}
            >
              <span className="bg-slate-800 text-amber-400 px-1 py-0.2 rounded text-[8px] font-bold">
                {idx + 6}
              </span>
              <span className="font-bold uppercase text-[9px]">{s.name}</span>
            </div>
          ))}
        </div>

        {/* Clean Weapon Ammunition Box */}
        <div className="bg-black/75 backdrop-blur-md px-4 py-3 rounded-lg border border-slate-800 shadow-xl flex flex-col space-y-1 min-w-[220px]">
          <div className="flex items-center justify-between text-[9px] font-mono font-bold text-slate-400 uppercase">
            <span>{wpnCfg.category}</span>
            <span className="text-cyan-400">{wpnCfg.fullAuto ? 'AUTO' : 'SEMI'}</span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xs font-black font-mono uppercase text-white tracking-wide">
              {wpnCfg.name}
            </span>
            <span className="text-[8px] font-mono text-slate-500 uppercase">
              {currentWeapon === 'sniper' ? '.50 BMG' : currentWeapon === 'mp5' ? '9MM' : currentWeapon === 'shotgun' ? '12-GA' : currentWeapon === 'deagle' ? '.50 AE' : '5.56'}
            </span>
          </div>

          {/* Huge Ammo Numbers */}
          <div className="flex items-baseline justify-end space-x-1.5 my-0.5">
            <span className={`text-4xl sm:text-5xl font-mono font-black tracking-tight leading-none ${ammoInMag <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {ammoInMag}
            </span>
            <span className="text-lg font-mono font-bold text-slate-500">/ {ammoReserve}</span>
          </div>

          {/* Thin Ammo Gauge */}
          <div className="flex space-x-1 w-full justify-end">
            <div className={`h-1 flex-1 rounded-sm ${ammoInMag > 15 ? 'bg-cyan-400' : 'bg-slate-800'}`} />
            <div className={`h-1 flex-1 rounded-sm ${ammoInMag > 5 ? 'bg-cyan-400' : 'bg-slate-800'}`} />
            <div className={`h-1 flex-1 rounded-sm ${ammoInMag > 0 ? (ammoInMag <= 5 ? 'bg-red-500' : 'bg-cyan-400') : 'bg-slate-800'}`} />
          </div>

          {/* Low Ammo / Reloading Alert */}
          {isReloading ? (
            <div className="text-amber-400 text-center text-[10px] font-mono font-black uppercase tracking-widest py-0.5 animate-pulse">
              RELOADING...
            </div>
          ) : ammoInMag <= 5 && ammoInMag > 0 ? (
            <div className="text-red-400 text-center text-[10px] font-mono font-black uppercase tracking-widest py-0.5">
              LOW AMMO [R]
            </div>
          ) : (
            /* Quick Weapon Selector Bar */
            <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-1 pointer-events-auto">
              {[
                { id: 'm4' as WeaponType, label: '1' },
                { id: 'mp5' as WeaponType, label: '2' },
                { id: 'shotgun' as WeaponType, label: '3' },
                { id: 'sniper' as WeaponType, label: '4' },
                { id: 'deagle' as WeaponType, label: '5' },
              ].map(w => (
                <button
                  key={w.id}
                  onClick={() => onSwitchWeapon && onSwitchWeapon(w.id)}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold transition-all cursor-pointer ${
                    currentWeapon === w.id
                      ? 'bg-cyan-400 text-black font-black'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          )}
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
