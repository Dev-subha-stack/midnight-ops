import React, { useEffect, useState } from 'react';
import {
  EliminationAccolade,
  EnemyBot,
  EnvironmentState,
  FloatingDamageNumberItem,
  GameMode,
  HitmarkerEvent,
  KillFeedItem,
  LeanDirection,
  OpticType,
  PlayerStats,
  ReticleColor,
  ReticleStyle,
  ScorestreakItem,
  TrainingTelemetryData,
  WeaponType,
  BattleRoyaleState,
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
  AlertTriangle,
  ShieldAlert,
  Users,
  Sparkles,
} from 'lucide-react';
import { Minimap } from './Minimap';
import { Killfeed } from './Killfeed';

interface HUDProps {
  stats: PlayerStats;
  gameMode?: GameMode;
  battleRoyaleState?: BattleRoyaleState | null;
  currentWeapon: WeaponType;
  equippedOptic?: OpticType;
  reticleColor?: ReticleColor;
  reticleStyle?: ReticleStyle;
  ammoInMag: number;
  ammoReserve: number;
  grenadesCount: number;
  tacticalCount?: number;
  tacticalType?: import('../types').TacticalType;
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
  isMounted?: boolean;
  leanState?: LeanDirection;
  leanFactor?: number;
  onToggleLean?: (direction: 'left' | 'right') => void;
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
  radioCallout?: { name: string; team: 'allies' | 'axis'; role?: string; text: string; time: number } | null;
  environment?: EnvironmentState;
  trainingTelemetry?: TrainingTelemetryData;
  floatingDamageNumbers?: FloatingDamageNumberItem[];
  minimapShape?: 'circular' | 'square';
  onResetTrainingTargets?: () => void;
  onSwitchWeapon?: (type: WeaponType) => void;
  onToggleWeather?: () => void;
  onDeployTactical?: () => void;
  onToggleTacticalType?: () => void;
  onUseInhaler?: () => void;
  onUseMedkit?: () => void;
  onActivateStreak: (id: 'uav' | 'airstrike' | 'sentry' | 'nuke') => void;
  onOpenGunsmith: () => void;
  onOpenSettings: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  gameMode = 'tdm',
  battleRoyaleState,
  minimapShape = 'square',
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
  leanState = 'none',
  leanFactor = 0,
  onToggleLean,
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
  radioCallout,
  environment,
  trainingTelemetry,
  floatingDamageNumbers = [],
  onResetTrainingTargets,
  onSwitchWeapon,
  onToggleWeather,
  onToggleTacticalType,
  onUseInhaler,
  onUseMedkit,
  onActivateStreak,
}) => {
  const wpnCfg = WEAPON_REGISTRY[currentWeapon] || WEAPON_REGISTRY['m4'];
  const opticCfg = OPTIC_REGISTRY[equippedOptic] || OPTIC_REGISTRY['iron_sight'];

  const healthPercent = Math.max(0, Math.min(100, (stats.health / stats.maxHealth) * 100));
  const isLowHealth = stats.health <= 30;
  const plateCount = Math.ceil((stats.armor / stats.maxArmor) * 3);

  const [activeDamageAngle, setActiveDamageAngle] = useState<number | null>(null);
  const [activeRadioBark, setActiveRadioBark] = useState<{
    name: string;
    team: 'allies' | 'axis';
    role?: string;
    text: string;
    time: number;
  } | null>(null);

  useEffect(() => {
    const talkingBot = bots.find(b => b.voiceCallout && b.state !== 'dead');
    if (talkingBot && talkingBot.voiceCallout) {
      setActiveRadioBark({
        name: talkingBot.name,
        team: talkingBot.team,
        role: talkingBot.squadRole,
        text: talkingBot.voiceCallout,
        time: Date.now(),
      });
    }
  }, [bots]);

  useEffect(() => {
    if (radioCallout) {
      setActiveRadioBark(radioCallout);
    }
  }, [radioCallout]);

  useEffect(() => {
    if (!activeRadioBark) return;
    const timer = setTimeout(() => {
      if (Date.now() - activeRadioBark.time >= 3500) {
        setActiveRadioBark(null);
      }
    }, 3600);
    return () => clearTimeout(timer);
  }, [activeRadioBark]);

  useEffect(() => {
    if (damageAngle !== null && damageAngle !== undefined) {
      setActiveDamageAngle(damageAngle);
      const timer = setTimeout(() => setActiveDamageAngle(null), 550);
      return () => clearTimeout(timer);
    }
  }, [damageAngle]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const scoreLimit = gameMode === 'tdm' ? 50 : gameMode === 'freeforall' || gameMode === 'ffa' ? 30 : 25;
  const alliesPct = Math.min(100, (alliesScore / scoreLimit) * 100);
  const axisPct = Math.min(100, (axisScore / scoreLimit) * 100);
  const headingDeg = Math.round(((-playerYaw * 180) / Math.PI + 360) % 360);

  const compassThreats: { offsetPx: number; id: string }[] = [];
  const fwdX = -Math.sin(playerYaw);
  const fwdZ = -Math.cos(playerYaw);
  const rightX = Math.cos(playerYaw);
  const rightZ = -Math.sin(playerYaw);

  bots.forEach(bot => {
    if (bot.state === 'dead' || bot.team === 'allies') return;
    if (!bot.isVisibleToPlayer && !bot.spottedByRadar && !uavActive) return;
    const dx = bot.position.x - playerPos.x;
    const dz = bot.position.z - playerPos.z;
    const localForward = dx * fwdX + dz * fwdZ;
    const localRight = dx * rightX + dz * rightZ;
    if (localForward <= 0.1) return;

    const relAngle = Math.atan2(localRight, localForward);
    if (Math.abs(relAngle) < Math.PI / 2.8) {
      const offset = (relAngle / (Math.PI / 2.8)) * 140;
      compassThreats.push({ offsetPx: offset, id: bot.id });
    }
  });

  const currentFovDeg = isAiming
    ? opticCfg.variableZoomSteps
      ? 68 / opticCfg.variableZoomSteps[opticZoomStepIndex % opticCfg.variableZoomSteps.length]
      : 68 / opticCfg.magnification
    : 85;
  const fovX = (currentFovDeg * Math.PI) / 180;
  const fovY = fovX * (typeof window !== 'undefined' ? window.innerHeight / Math.max(1, window.innerWidth) : 0.5625);

  let targetLockedBot: { bot: EnemyBot; dist: number } | null = null;
  const isNight = environment?.weather === 'midnight_fog';

  const playerMarkers = bots
    .filter(bot => {
      if (bot.state === 'dead') return false;
      if (bot.team === 'allies') return true;
      if (isNight && !laserActive && !uavActive) {
        const d = Math.hypot(bot.position.x - playerPos.x, bot.position.z - playerPos.z);
        return d < 18 && bot.isVisibleToPlayer;
      }
      return bot.isVisibleToPlayer || bot.spottedByRadar || uavActive;
    })
    .map(bot => {
      const isAlly = bot.team === 'allies';
      const dx = bot.position.x - playerPos.x;
      const dz = bot.position.z - playerPos.z;
      const dy = bot.position.y + 2.05 - (playerPos.y + 1.6);
      const distTotal = Math.sqrt(dx * dx + dz * dz + dy * dy);

      const localForward = dx * fwdX + dz * fwdZ;
      const localRight = dx * rightX + dz * rightZ;
      if (localForward <= 0.2) return null;

      const relYaw = Math.atan2(localRight, localForward);
      const relPitch = Math.atan2(dy, localForward) - playerPitch;

      const aimCone = isAiming ? 0.05 : 0.075;
      if (!isAlly && Math.abs(relYaw) < aimCone && Math.abs(relPitch) < aimCone && distTotal < 65) {
        if (!targetLockedBot || distTotal < targetLockedBot.dist) {
          targetLockedBot = { bot, dist: distTotal };
        }
      }

      const inView = Math.abs(relYaw) < fovX * 0.52 && Math.abs(relPitch) < fovY * 0.55 && Math.cos(relYaw) > 0;
      if (!inView || distTotal > (isAlly ? 55 : isNight ? 26 : 60)) return null;

      const screenX = (0.5 + Math.tan(relYaw) / (2 * Math.tan(fovX * 0.5))) * 100;
      const screenY = (0.5 - Math.tan(relPitch) / (2 * Math.tan(fovY * 0.5))) * 100;

      if (screenX < 4 || screenX > 96 || screenY < 4 || screenY > 96) return null;

      const hpPct = Math.max(0, Math.min(100, (bot.health / bot.maxHealth) * 100));
      const armorPct = Math.max(0, Math.min(100, (bot.armor / bot.maxArmor) * 100));

      return {
        id: bot.id,
        name: bot.name,
        team: bot.team,
        isAlly,
        hpPct,
        armorPct,
        dist: Math.round(distTotal),
        screenX,
        screenY,
        squadRole: bot.squadRole,
        tacticalAction: bot.tacticalAction,
        isSuppressed: bot.isSuppressed,
        isFlanking: bot.isFlanking,
      };
    })
    .filter(Boolean) as {
    id: string;
    name: string;
    team: 'allies' | 'axis';
    isAlly: boolean;
    hpPct: number;
    armorPct: number;
    dist: number;
    screenX: number;
    screenY: number;
    squadRole?: string;
    tacticalAction?: string;
    isSuppressed?: boolean;
    isFlanking?: boolean;
  }[];

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

  const reticleColorHexMap: Record<ReticleColor, string> = {
    red: '#ef4444',
    green: '#a3e635',
    amber: '#f59e0b',
    cyan: '#38bdf8',
  };
  const activeColorHex = reticleColorHexMap[reticleColor] || '#ef4444';

  const hasScopeOverlay = isAiming && Boolean(opticCfg?.hasFullScopeOverlay || (opticCfg?.magnification && opticCfg.magnification >= 3.0));
  const isThermalScope = (isThermalEnabled || opticCfg?.hasThermalVision || opticCfg?.isThermal) && hasScopeOverlay;

  const currentMagnification = opticCfg.variableZoomSteps
    ? opticCfg.variableZoomSteps[opticZoomStepIndex % opticCfg.variableZoomSteps.length]
    : opticCfg.magnification;

  const canHoldBreath = isAiming && (opticCfg.magnification >= 2.0 || !!opticCfg.variableZoomSteps);

  const magRatio = Math.max(0, Math.min(1, ammoInMag / Math.max(1, wpnCfg.magSize)));

  return (
    <div id="game-hud" className="absolute inset-0 pointer-events-none select-none overflow-hidden text-zinc-100">
      {/* Low Health Vignette */}
      {isLowHealth && (
        <div
          id="hud-low-health-vignette"
          className="absolute inset-0 transition-opacity duration-200 pointer-events-none z-20"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(185, 28, 28, 0.42) 75%, rgba(127, 29, 29, 0.85) 100%)',
          }}
        />
      )}

      {/* TOP-CENTER: COD SCORE STRIP & COMPASS TAPE */}
      <div id="hud-top-center" className="absolute top-3 left-0 right-0 flex flex-col items-center pointer-events-none z-30">
        {gameMode === 'battleroyale' && battleRoyaleState ? (
          <div className="flex items-center gap-4 bg-[#0A0C10]/88 backdrop-blur-md px-5 py-1.5 rounded-sm border border-white/15 tabular-nums">
            <div className="flex items-center gap-2 pr-3 border-r border-white/10">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-[10px] uppercase text-zinc-400">Alive</span>
                <span className="text-sm font-bold text-white">
                  {battleRoyaleState.aliveCount}
                  <span className="text-[11px] text-zinc-500 font-normal">/{battleRoyaleState.totalPlayers}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pr-3 border-r border-white/10">
              <ShieldAlert className={`w-3.5 h-3.5 ${battleRoyaleState.isShrinking ? 'text-red-500' : 'text-sky-400'}`} />
              <div className="flex items-baseline gap-1.5 font-mono">
                <span className="text-[10px] uppercase text-zinc-400">
                  {battleRoyaleState.isShrinking ? 'Closing' : `Phase ${battleRoyaleState.phase}`}
                </span>
                <span className={`text-sm font-bold ${battleRoyaleState.isShrinking ? 'text-red-400' : 'text-sky-300'}`}>
                  {battleRoyaleState.isShrinking ? 'MOVE' : `${Math.ceil(battleRoyaleState.shrinkTimer)}s`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-mono">
              <Target className="w-3.5 h-3.5 text-[#A3E635]" />
              <span className="text-[10px] uppercase text-zinc-400">Elims</span>
              <span className="text-sm font-bold text-[#A3E635]">{stats.kills}</span>
            </div>
          </div>
        ) : isTrainingMode && trainingTelemetry ? (
          <div className="flex items-center gap-4 bg-[#0A0C10]/88 backdrop-blur-md px-5 py-1.5 rounded-sm border border-white/15 text-xs font-mono tabular-nums">
            <span className="text-[#A3E635] font-bold uppercase flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Firing Range
            </span>
            <span className="text-zinc-400">
              DPS <b className="text-white">{trainingTelemetry.currentDps}</b>
            </span>
            <span className="text-zinc-400">
              ACC <b className="text-[#A3E635]">{trainingTelemetry.accuracy}%</b>
            </span>
            <span className="text-zinc-400">
              CRIT <b className="text-amber-400">{trainingTelemetry.headshots}</b>
            </span>
            <button
              onClick={onResetTrainingTargets}
              className="pointer-events-auto px-2 py-0.5 bg-[#192014] hover:bg-[#25301C] border border-[#A3E635]/40 rounded-sm text-[#A3E635] text-[10px] font-bold cursor-pointer transition-colors"
            >
              RESET [K]
            </button>
          </div>
        ) : (
          /* COD Match Score Bar */
          <div className="flex items-center gap-3 bg-[#0A0C10]/85 backdrop-blur-md px-4 py-1.5 rounded-sm border border-white/12 tabular-nums">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-sky-400 tracking-wider">TF-141</span>
              <div className="w-16 h-1.5 bg-zinc-900 overflow-hidden">
                <div className="h-full bg-sky-400 transition-all" style={{ width: `${alliesPct}%` }} />
              </div>
              <span className="font-display text-xl font-bold text-white leading-none">{alliesScore}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 border-x border-white/10 text-[11px] font-mono text-zinc-300">
              <Timer className="w-3 h-3 text-[#A3E635]" />
              <span className="font-semibold text-white">{formatTime(matchTime)}</span>
              <span className="text-zinc-500 text-[10px]">/{scoreLimit}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold text-red-400 leading-none">{axisScore}</span>
              <div className="w-16 h-1.5 bg-zinc-900 overflow-hidden">
                <div className="h-full bg-red-500 transition-all" style={{ width: `${axisPct}%` }} />
              </div>
              <span className="text-[11px] font-mono font-bold text-red-400 tracking-wider">KORTAC</span>
            </div>
          </div>
        )}

        {/* COD Horizontal Compass Tape */}
        <div className="relative mt-1.5 w-80 h-6 bg-[#0A0C10]/70 backdrop-blur-md border-y border-white/10 flex items-center justify-center overflow-hidden tabular-nums">
          <div className="absolute top-0 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-[#A3E635] z-20" />

          <div className="flex items-center space-x-8 text-[10px] font-mono font-semibold text-zinc-500">
            <span>{(headingDeg - 40 + 360) % 360}°</span>
            <div className="flex items-center gap-1 text-white font-bold">
              <span className="text-[#A3E635]">{headingDeg}°</span>
              <span>{getCompassHeading(playerYaw)}</span>
            </div>
            <span>{(headingDeg + 40 + 360) % 360}°</span>
          </div>

          {compassThreats.map(threat => (
            <div
              key={threat.id}
              className="absolute top-1.5 w-1.5 h-1.5 bg-red-500 rotate-45 border border-white/80"
              style={{
                transform: `translateX(${threat.offsetPx}px) rotate(45deg)`,
              }}
            />
          ))}
        </div>

        {/* Status / Pickup Notice */}
        {pickupNotice && (
          <div className="mt-2 px-3 py-1 bg-[#0C0F14]/95 border border-[#A3E635]/60 rounded-sm text-[#A3E635] font-mono text-[11px] font-bold tracking-wider uppercase flex items-center gap-1.5">
            <Zap className="w-3 h-3" />
            <span>{pickupNotice.text}</span>
          </div>
        )}
      </div>

      {/* TOP-LEFT: COD MINIMAP & RADIO */}
      <div id="hud-top-left" className="absolute top-3 left-4 flex flex-col gap-1.5 pointer-events-none z-20">
        <Minimap
          playerPos={playerPos}
          playerYaw={playerYaw}
          bots={bots}
          uavActive={uavActive}
          battleRoyaleState={battleRoyaleState}
          shape={minimapShape}
        />

        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400 bg-[#0A0C10]/80 px-2 py-0.5 rounded-sm border border-white/10 w-fit">
          <span>
            <b className="text-zinc-200">TAB</b> Score
          </span>
          <span className="text-zinc-600">·</span>
          <span>
            <b className="text-zinc-200">B</b> Gunsmith
          </span>
          <span className="text-zinc-600">·</span>
          <span>
            <b className="text-zinc-200">ESC</b> Pause
          </span>
        </div>

        {environment && (
          <div
            id="hud-environmental-telemetry"
            onClick={onToggleWeather}
            title="Shift Atmosphere [T]"
            className="bg-[#0A0C10]/80 px-2 py-0.5 rounded-sm border border-white/10 hover:border-[#A3E635]/50 flex items-center gap-1.5 pointer-events-auto cursor-pointer text-[10px] font-mono text-zinc-300 transition-colors w-fit"
          >
            {environment.timeOfDay === 'storm' ? (
              <CloudLightning className="w-3 h-3 text-sky-400" />
            ) : environment.timeOfDay === 'sunset' ? (
              <Sunset className="w-3 h-3 text-amber-400" />
            ) : environment.timeOfDay === 'night' ? (
              <Moon className="w-3 h-3 text-sky-300" />
            ) : environment.timeOfDay === 'sandstorm' ? (
              <Wind className="w-3 h-3 text-amber-500" />
            ) : (
              <Sun className="w-3 h-3 text-amber-300" />
            )}
            <span className="uppercase">{environment.weatherName}</span>
            <span className="text-[#A3E635] tabular-nums">{environment.timeString}</span>
          </div>
        )}

        {activeRadioBark && (
          <div className="flex items-start gap-2 max-w-[270px] bg-[#0A0C10]/92 backdrop-blur-md px-3 py-2 rounded-sm border border-white/15 text-[11px] font-mono pointer-events-none">
            <Radio className="w-3.5 h-3.5 text-[#A3E635] mt-0.5 shrink-0" />
            <div className="flex flex-col overflow-hidden">
              <span
                className={`font-bold text-[10px] uppercase truncate ${
                  activeRadioBark.team === 'allies' ? 'text-sky-400' : 'text-red-400'
                }`}
              >
                {activeRadioBark.name} {activeRadioBark.role ? `· ${activeRadioBark.role.toUpperCase()}` : ''}
              </span>
              <span className="text-zinc-200 leading-snug mt-0.5">"{activeRadioBark.text}"</span>
            </div>
          </div>
        )}
      </div>

      {/* TOP-RIGHT: TELEMETRY & KILLFEED */}
      <div id="hud-top-right" className="absolute top-3 right-4 flex flex-col items-end gap-1.5 pointer-events-none w-72 z-20">
        <div className="text-[10px] font-mono text-zinc-400 bg-[#0A0C10]/80 px-2.5 py-0.5 rounded-sm border border-white/10 tabular-nums">
          <span className="text-[#A3E635] font-semibold">128-TICK</span> · 12 MS
        </div>
        <Killfeed items={killfeed} />
      </div>

      {/* CENTER: ACCOLADES */}
      <div id="hud-center-accolades" className="absolute top-1/4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none z-40">
        {accolades.slice(-2).map(acc => (
          <div
            key={acc.id}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-sm border border-amber-400/50 bg-[#0D1015]/92 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider"
          >
            {acc.icon === 'headshot' ? (
              <Skull className="w-3.5 h-3.5 text-red-400" />
            ) : acc.icon === 'streak' ? (
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            ) : acc.icon === 'easter_egg' ? (
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            ) : (
              <Target className="w-3.5 h-3.5 text-[#A3E635]" />
            )}
            <span>{acc.title}</span>
            {acc.subtext && <span className="text-[10px] text-zinc-400 font-normal">({acc.subtext})</span>}
          </div>
        ))}
      </div>

      {/* BATTLE ROYALE ALERTS */}
      {battleRoyaleState?.isOutsideSafeZone && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-red-950/95 border border-red-500 rounded-sm text-red-100 font-mono font-bold text-xs uppercase flex items-center gap-2 z-40 pointer-events-none">
          <AlertTriangle className="w-4 h-4 text-red-400" />
          <span>Outside Safe Zone · Move Inside Circle</span>
        </div>
      )}

      {battleRoyaleState?.dangerZone && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-red-950/90 border border-amber-400 rounded-sm text-amber-200 font-mono font-bold text-xs uppercase flex items-center gap-2 z-40 pointer-events-none">
          <AlertTriangle className="w-4 h-4 text-amber-300" />
          <span>
            {battleRoyaleState.dangerZone.isWarning
              ? 'Red Danger Zone · Airstrike Incoming'
              : 'Artillery Bombardment Active'}
          </span>
        </div>
      )}

      {battleRoyaleState?.isGliding && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#0C1219]/90 border border-sky-400/60 rounded-sm text-sky-200 font-mono font-bold text-xs uppercase flex items-center gap-2 z-40 pointer-events-none tabular-nums">
          <Wind className="w-3.5 h-3.5 text-sky-300" />
          <span>Glider Active · {battleRoyaleState.glideAltitude}m</span>
        </div>
      )}

      {/* IN-WORLD OVERHEAD INDICATORS */}
      {playerMarkers.map(m => (
        <div
          key={m.id}
          className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none transition-all duration-75 z-20"
          style={{
            left: `${m.screenX}%`,
            top: `${m.screenY}%`,
          }}
        >
          <div
            className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded-sm backdrop-blur-sm border text-[9px] font-mono font-bold tracking-tight ${
              m.isAlly
                ? 'bg-[#0C141D]/90 border-sky-400/60 text-sky-200'
                : 'bg-[#1D0D0E]/90 border-red-500/60 text-red-200'
            }`}
          >
            <span>{m.isAlly ? `${m.name}` : m.name}</span>
            {m.isSuppressed && <span className="text-[8px] text-amber-300">PINNED</span>}
            {m.isFlanking && <span className="text-[8px] text-rose-300">FLANK</span>}
            <span className="text-[8px] opacity-75 tabular-nums">{m.dist}m</span>
          </div>

          <div className="w-14 h-1 bg-zinc-950/90 overflow-hidden mt-0.5">
            <div
              className={`h-full transition-all ${m.isAlly ? 'bg-sky-400' : m.hpPct > 50 ? 'bg-red-500' : 'bg-red-600'}`}
              style={{ width: `${m.hpPct}%` }}
            />
          </div>

          <div
            className={`w-1.5 h-1.5 rotate-45 mt-0.5 ${
              m.isAlly ? 'bg-sky-400' : 'bg-red-500'
            }`}
          />
        </div>
      ))}

      {/* FLOATING DAMAGE NUMBERS */}
      {projectedDamageNumbers.map(num => (
        <div
          key={num.id}
          className="absolute pointer-events-none font-mono font-bold -translate-x-1/2 -translate-y-1/2 z-30 select-none tabular-nums"
          style={{
            left: `${num.screenX}%`,
            top: `${num.screenY}%`,
            opacity: num.opacity,
            transform: `translate(-50%, -50%) scale(${1 + (1 - num.life / num.maxLife) * 0.25})`,
            color: num.isHeadshot ? '#ef4444' : num.isShield ? '#38bdf8' : '#facc15',
            textShadow: '0 1px 3px black',
          }}
        >
          <div className="flex items-center gap-0.5 text-xs sm:text-sm">
            {num.isHeadshot && <Skull className="w-3 h-3 text-red-500 inline" />}
            <span>{num.damage}</span>
          </div>
        </div>
      ))}

      {/* HIPFIRE RETICLE */}
      {!isAiming && (
        <div
          id="hud-crosshair-center"
          className="absolute top-1/2 left-1/2 flex items-center justify-center pointer-events-none transition-transform duration-75"
          style={{
            transform: `translate(-50%, -50%) rotate(${-(leanFactor || 0) * 15.5}deg)`,
          }}
        >
          <div className={`w-1 h-1 rounded-full ${targetLockedBot ? 'bg-red-500' : 'bg-white/95'}`} />
          <div
            className={`absolute w-[1.5px] ${targetLockedBot ? 'bg-red-500' : 'bg-white/90'}`}
            style={{ height: isSprinting ? '11px' : '7px', top: isSprinting ? '-17px' : '-12px' }}
          />
          <div
            className={`absolute w-[1.5px] ${targetLockedBot ? 'bg-red-500' : 'bg-white/90'}`}
            style={{ height: isSprinting ? '11px' : '7px', bottom: isSprinting ? '-17px' : '-12px' }}
          />
          <div
            className={`absolute h-[1.5px] ${targetLockedBot ? 'bg-red-500' : 'bg-white/90'}`}
            style={{ width: isSprinting ? '11px' : '7px', left: isSprinting ? '-17px' : '-12px' }}
          />
          <div
            className={`absolute h-[1.5px] ${targetLockedBot ? 'bg-red-500' : 'bg-white/90'}`}
            style={{ width: isSprinting ? '11px' : '7px', right: isSprinting ? '-17px' : '-12px' }}
          />
        </div>
      )}

      {/* COD 4-TICK HITMARKER */}
      {hitmarker && (
        <div id="hud-hitmarker" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
          <div className="relative w-7 h-7 flex items-center justify-center">
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
          </div>
        </div>
      )}

      {/* DIRECTIONAL DAMAGE ARC */}
      {activeDamageAngle !== null && (
        <div id="hud-directional-damage-indicator" className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
          <div
            className="relative w-72 h-72 flex items-center justify-center transition-all duration-75"
            style={{ transform: `rotate(${activeDamageAngle}rad)` }}
          >
            <div className="absolute -top-4 flex flex-col items-center">
              <div className="w-24 h-4 bg-gradient-to-b from-red-600 via-red-500/75 to-transparent rounded-t-full" />
            </div>
          </div>
        </div>
      )}

      {/* OPTICAL SCOPE OVERLAY (ADS >= 3x) */}
      {hasScopeOverlay && (
        <div
          id="hud-sniper-scope-overlay"
          className="absolute inset-0 pointer-events-none flex items-center justify-center z-30 overflow-hidden"
          style={{ filter: isThermalScope ? 'contrast(140%) saturate(20%)' : 'none' }}
        >
          <div
            className="relative w-[76vh] h-[76vh] rounded-full border-[10px] border-[#070b14] overflow-hidden shadow-[0_0_0_9999px_rgba(2,4,8,0.98)] bg-transparent transition-transform duration-75 flex items-center justify-center"
            style={{ transform: `translate(${scopeShadowOffsetX * 16}px, ${scopeShadowOffsetY * 16}px)` }}
          >
            {isThermalScope && (
              <>
                <div className="absolute inset-0 bg-emerald-950/25 mix-blend-screen pointer-events-none z-10" />
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,0)_50%,rgba(0,0,0,0.3)_51%,rgba(0,0,0,0.3))] bg-[length:100%_4px] pointer-events-none opacity-25 z-10" />
              </>
            )}

            <div
              className="absolute inset-0 rounded-full pointer-events-none transition-all duration-75 z-10"
              style={{
                background: `radial-gradient(circle at ${50 + scopeShadowOffsetX * 35}% ${50 + scopeShadowOffsetY * 35}%, transparent 58%, rgba(0, 0, 0, 0.35) 82%, rgba(0, 0, 0, 0.95) 100%)`,
              }}
            />

            <div className="absolute inset-0 border-[16px] border-black/85 rounded-full pointer-events-none ring-1 ring-white/10 z-10" />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute left-0 w-[calc(50%-100px)] h-[3px] bg-black/95" />
              <div className="absolute right-0 w-[calc(50%-100px)] h-[3px] bg-black/95" />
              <div className="absolute bottom-0 h-[calc(50%-100px)] w-[3px] bg-black/95" />
              <div className="absolute top-0 h-[calc(50%-100px)] w-[3px] bg-black/95" />

              <div className="w-full h-[1px] bg-black/90 absolute" />
              <div className="h-full w-[1px] bg-black/90 absolute" />

              <div
                className="w-1.5 h-1.5 rounded-full absolute z-20"
                style={{ backgroundColor: activeColorHex, boxShadow: `0 0 6px ${activeColorHex}` }}
              />

              {[-120, -80, -40, 40, 80, 120].map(offset => (
                <div key={`h-${offset}`} className="w-[1px] h-3 bg-black/90 absolute" style={{ transform: `translateX(${offset}px)` }} />
              ))}
              {[-120, -80, -40, 40, 80, 120, 160].map(offset => (
                <div key={`v-${offset}`} className="h-[1px] w-3 bg-black/90 absolute" style={{ transform: `translateY(${offset}px)` }} />
              ))}
            </div>

            <div
              className="absolute top-9 left-12 text-[10px] font-mono font-bold flex flex-col gap-0.5 tracking-wider z-20"
              style={{ color: activeColorHex }}
            >
              <span className="flex items-center gap-1.5 uppercase">
                <ZoomIn className="w-3.5 h-3.5" />
                {currentMagnification.toFixed(1)}X {opticCfg.name}
              </span>
              {opticCfg.variableZoomSteps && (
                <span className="text-[8px] text-zinc-300 opacity-80">[V / SCROLL] ZOOM</span>
              )}
            </div>

            <div
              className="absolute top-9 right-12 text-[10px] font-mono font-bold text-right flex flex-col gap-0.5 tracking-wider z-20 tabular-nums"
              style={{ color: activeColorHex }}
            >
              <span>{targetRangeMeters > 0 ? `RANGE ${targetRangeMeters.toFixed(1)}M` : 'RANGE ---'}</span>
              {elevationHoldoverMil > 0 && <span className="text-[9px] opacity-85">DROP +{elevationHoldoverMil.toFixed(1)} MIL</span>}
            </div>

            {canHoldBreath && (
              <div className="absolute bottom-9 inset-x-0 flex flex-col items-center gap-1 text-[9px] font-mono tracking-widest text-zinc-200 z-20">
                <span className="font-bold">[SHIFT] {isHoldingBreath ? 'STEADY' : 'HOLD BREATH'}</span>
                <div className="w-28 h-1 bg-black/80 overflow-hidden border border-white/15">
                  <div
                    className="h-full transition-all duration-75"
                    style={{
                      width: `${Math.round(breathStamina * 100)}%`,
                      backgroundColor: breathStamina > 0.4 ? '#a3e635' : breathStamina > 0.2 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REFLEX / HOLOGRAPHIC SIGHT OVERLAY */}
      {isAiming && !hasScopeOverlay && equippedOptic !== 'iron_sight' && (
        <div id="hud-reflex-optic-overlay" className="absolute inset-0 pointer-events-none flex items-center justify-center z-20">
          <div className="relative flex items-center justify-center">
            {reticleStyle === 'holo_ring' ? (
              <div
                className="w-14 h-14 rounded-full border border-dashed flex items-center justify-center relative"
                style={{ borderColor: `${activeColorHex}bb` }}
              >
                <div className="w-full h-[1.5px] absolute" style={{ backgroundColor: `${activeColorHex}cc` }} />
                <div className="h-full w-[1.5px] absolute" style={{ backgroundColor: `${activeColorHex}cc` }} />
                <div className="w-8 h-8 rounded-full bg-black/20 absolute" />
                <div className="w-1.5 h-1.5 rounded-full absolute bg-white" style={{ boxShadow: `0 0 6px ${activeColorHex}` }} />
              </div>
            ) : reticleStyle === 'chevron' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 4L4 18H8L12 11L16 18H20L12 4Z" fill={activeColorHex} />
              </svg>
            ) : reticleStyle === 'cross' ? (
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="w-full h-[1px] absolute" style={{ backgroundColor: `${activeColorHex}bb` }} />
                <div className="h-full w-[1px] absolute" style={{ backgroundColor: `${activeColorHex}bb` }} />
                <div className="w-1.5 h-1.5 rounded-full absolute bg-white" style={{ boxShadow: `0 0 6px ${activeColorHex}` }} />
              </div>
            ) : (
              <div className="relative flex items-center justify-center">
                <div className="w-2 h-2 rounded-full absolute" style={{ backgroundColor: activeColorHex }} />
                <div className="w-1 h-1 rounded-full absolute bg-white" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* BREATH GAUGE */}
      {canHoldBreath && (isHoldingBreath || breathStamina < 0.95) && (
        <div
          id="hud-breath-stamina-bar"
          className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 bg-[#0A0C10]/85 px-3 py-1 rounded-sm border border-white/10 text-[9px] font-mono tabular-nums"
        >
          <div className="flex justify-between w-32 font-bold">
            <span className={isHyperventilating ? 'text-red-400' : 'text-[#A3E635]'}>BREATH</span>
            <span>{Math.round(breathStamina * 100)}%</span>
          </div>
          <div className="w-32 h-1 bg-zinc-900 overflow-hidden">
            <div
              className={`h-full ${isHyperventilating ? 'bg-red-500' : 'bg-[#A3E635]'}`}
              style={{ width: `${Math.max(4, breathStamina * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* BOTTOM-LEFT: COD WARZONE / MW3 OPERATOR PLATE & HEALTH STACK */}
      <div id="hud-bottom-left" className="absolute bottom-4 left-4 flex flex-col gap-1 pointer-events-none z-20">
        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-300 bg-[#0A0C10]/85 px-2.5 py-0.5 rounded-sm border border-white/10 w-fit tabular-nums">
          <span className="text-white font-bold">GHOST</span>
          <span className="text-zinc-600">·</span>
          <span className="text-[#A3E635] font-bold flex items-center gap-1">
            <Flame className="w-3 h-3" /> {stats.currentStreak}
          </span>
          {stats.isTacSprinting && <span className="text-[#A3E635] font-bold">TAC-SPRINT</span>}
          {stats.isMantling && <span className="text-amber-300 font-bold">VAULT</span>}
          {leanState !== 'none' && <span className="text-sky-400 font-bold">PEEK {leanState.toUpperCase()}</span>}
        </div>

        <div className="bg-[#0A0C10]/88 backdrop-blur-md px-3.5 py-2.5 rounded-sm border border-white/12 flex flex-col gap-2 w-64 cod-chamfer-sm tabular-nums">
          {stats.tacSprintStamina !== undefined && stats.tacSprintStamina < 0.98 && (
            <div className="w-full h-1 bg-zinc-900 overflow-hidden">
              <div className="h-full bg-[#A3E635] transition-all" style={{ width: `${Math.max(4, stats.tacSprintStamina * 100)}%` }} />
            </div>
          )}

          {/* 3-Plate Armor Bars (Signature COD Warzone Blue) */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono font-bold text-sky-400">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 fill-sky-400/20" />
                {battleRoyaleState ? `VEST LVL ${battleRoyaleState.vestLevel}` : 'ARMOR'}
              </span>
              <span>{Math.ceil(stats.armor)}</span>
            </div>
            <div className="flex items-center gap-1 w-full">
              {[0, 1, 2].map(plateIdx => (
                <div key={plateIdx} className="flex-1 h-1.5 bg-zinc-900 overflow-hidden">
                  <div className={`h-full transition-all ${plateCount > plateIdx ? 'bg-sky-400' : 'bg-transparent'}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Crisp Health Bar */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-mono font-bold">
              <span className="text-zinc-400 flex items-center gap-1">
                <Heart className="w-3 h-3 text-white" /> HP
              </span>
              <span className={isLowHealth ? 'text-red-400' : 'text-white'}>{Math.ceil(stats.health)}</span>
            </div>
            <div className="w-full h-2 bg-zinc-900 overflow-hidden">
              <div
                className={`h-full transition-all ${isLowHealth ? 'bg-red-500' : 'bg-white'}`}
                style={{ width: `${healthPercent}%` }}
              />
            </div>
          </div>

          {/* Free Fire EP Bar */}
          {battleRoyaleState && (
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-[9px] font-mono font-bold text-amber-400">
                <span className="flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> EP
                </span>
                <span>
                  {Math.ceil(battleRoyaleState.ep)} / {battleRoyaleState.maxEp}
                </span>
              </div>
              <div className="w-full h-1 bg-zinc-900 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${(battleRoyaleState.ep / battleRoyaleState.maxEp) * 100}%` }}
                />
              </div>
            </div>
          )}

          {battleRoyaleState && (
            <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px] font-mono pointer-events-auto">
              <button
                onClick={onUseInhaler}
                disabled={battleRoyaleState.inhalerCount <= 0}
                className={`px-1.5 py-0.5 rounded-sm border ${
                  battleRoyaleState.inhalerCount > 0
                    ? 'bg-[#1D1810] border-amber-500/40 text-amber-300 cursor-pointer'
                    : 'bg-zinc-900/40 border-white/5 text-zinc-600 cursor-not-allowed'
                }`}
              >
                [H] INH ×{battleRoyaleState.inhalerCount}
              </button>
              <button
                onClick={onUseMedkit}
                disabled={battleRoyaleState.medkitCount <= 0}
                className={`px-1.5 py-0.5 rounded-sm border ${
                  battleRoyaleState.medkitCount > 0
                    ? 'bg-[#121D14] border-emerald-500/40 text-emerald-300 cursor-pointer'
                    : 'bg-zinc-900/40 border-white/5 text-zinc-600 cursor-not-allowed'
                }`}
              >
                [V] MED ×{battleRoyaleState.medkitCount}
              </button>
            </div>
          )}

          {/* Lethals / Tacticals / Laser */}
          <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px] font-mono text-zinc-300">
            <span className="flex items-center gap-1">
              <Bomb className="w-3 h-3 text-amber-400" /> [G] ×{grenadesCount}
            </span>
            <span
              onClick={onToggleTacticalType}
              className="flex items-center gap-1 cursor-pointer pointer-events-auto hover:text-[#A3E635]"
              title="Swap Tactical [X]"
            >
              <Radio className="w-3 h-3 text-[#A3E635]" /> [Q] {tacticalType === 'smoke' ? 'SMK' : 'TAC'} ×{tacticalCount ?? 0}
            </span>
            <span className={laserActive ? 'text-[#A3E635] font-bold' : 'text-zinc-600'}>[F] IR</span>
          </div>
        </div>
      </div>

      {/* BOTTOM-RIGHT: COD WEAPON TRAY & SCORESTREAKS */}
      <div id="hud-bottom-right" className="absolute bottom-4 right-4 flex items-end gap-3 pointer-events-none z-20">
        {/* Vertical Scorestreaks */}
        <div className="flex flex-col gap-1 items-end">
          {streaks.map((s, idx) => (
            <div
              key={s.id}
              onClick={() => onActivateStreak(s.id)}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-sm text-[10px] font-mono tracking-wider transition-all border pointer-events-auto cursor-pointer ${
                s.ready
                  ? 'bg-[#1D2413] border-[#A3E635] text-[#A3E635]'
                  : 'bg-[#0A0C10]/75 border-white/10 text-zinc-500 hover:border-white/25'
              }`}
            >
              <span className={`font-bold ${s.ready ? 'text-[#A3E635]' : 'text-zinc-400'}`}>[{idx + 6}]</span>
              <span className="font-semibold uppercase">{s.name}</span>
              {s.ready && <span className="text-[9px] font-bold text-white uppercase">READY</span>}
            </div>
          ))}
        </div>

        {/* COD Weapon & Ammo Tray */}
        <div className="bg-[#0A0C10]/88 backdrop-blur-md px-4 py-3 rounded-sm border border-white/12 flex flex-col gap-1.5 min-w-[230px] cod-chamfer-sm tabular-nums">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase">
            <span>{wpnCfg.category}</span>
            <span className="text-[#A3E635] font-bold">{wpnCfg.fullAuto ? 'FULL AUTO' : 'SEMI'}</span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="font-display text-lg font-bold uppercase text-white tracking-wider leading-none">
              {wpnCfg.name}
            </span>
            <span className="text-[9px] font-mono text-zinc-500 uppercase">
              {currentWeapon === 'ak47'
                ? '7.62×39'
                : currentWeapon === 'scar'
                ? '7.62 NATO'
                : currentWeapon === 'vector'
                ? '.45 ACP'
                : currentWeapon === 'sniper'
                ? '.50 BMG'
                : currentWeapon === 'mp5'
                ? '9MM'
                : currentWeapon === 'shotgun'
                ? '12-GA'
                : currentWeapon === 'deagle'
                ? '.50 AE'
                : '5.56 NATO'}
            </span>
          </div>

          {/* Oversized COD Ammo Numeral */}
          <div className="flex items-baseline justify-end gap-2 my-0.5">
            <span
              className={`font-display text-5xl font-extrabold tracking-tight leading-none ${
                ammoInMag <= 5 ? 'text-red-500' : 'text-white'
              }`}
            >
              {ammoInMag}
            </span>
            <span className="font-mono text-base font-semibold text-zinc-500">/ {ammoReserve}</span>
          </div>

          {/* Magazine Progress Bar */}
          <div className="w-full h-1 bg-zinc-900 overflow-hidden">
            <div
              className={`h-full transition-all ${ammoInMag <= 5 ? 'bg-red-500' : 'bg-[#A3E635]'}`}
              style={{ width: `${magRatio * 100}%` }}
            />
          </div>

          {isReloading ? (
            <div className="text-amber-400 text-center text-[10px] font-mono font-bold uppercase tracking-widest py-0.5">
              Reloading...
            </div>
          ) : ammoInMag <= 5 && ammoInMag > 0 ? (
            <div className="text-red-400 text-center text-[10px] font-mono font-bold uppercase tracking-widest py-0.5">
              Low Ammo [R]
            </div>
          ) : (
            <div className="pt-1.5 border-t border-white/10 flex items-center justify-between gap-1 pointer-events-auto">
              {[
                { id: 'm4' as WeaponType, label: '1', name: 'M4' },
                { id: 'ak47' as WeaponType, label: '2', name: 'AK' },
                { id: 'scar' as WeaponType, label: '3', name: 'SCAR' },
                { id: 'mp5' as WeaponType, label: '4', name: 'MP5' },
                { id: 'vector' as WeaponType, label: '5', name: 'VEC' },
                { id: 'shotgun' as WeaponType, label: '6', name: 'SG' },
                { id: 'sniper' as WeaponType, label: '7', name: 'SNP' },
                { id: 'deagle' as WeaponType, label: '8', name: '.50' },
              ].map(w => (
                <button
                  key={w.id}
                  title={`Equip ${w.name} [${w.label}]`}
                  onClick={() => onSwitchWeapon && onSwitchWeapon(w.id)}
                  className={`px-1.5 py-0.5 rounded-sm text-[9px] font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                    currentWeapon === w.id
                      ? 'bg-[#A3E635] text-[#090B0E]'
                      : 'bg-[#141820] text-zinc-400 hover:text-white'
                  }`}
                >
                  {w.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM-CENTER: PUBG PEEK CONTROLS */}
      <div
        id="pubg-peek-controls"
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30 pointer-events-auto select-none"
      >
        <button
          id="btn-lean-left"
          type="button"
          onClick={e => {
            e.stopPropagation();
            onToggleLean?.('left');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm backdrop-blur-md transition-all font-mono border cursor-pointer text-[10px] font-bold uppercase ${
            leanState === 'left'
              ? 'bg-[#1D2413] border-[#A3E635] text-[#A3E635]'
              : 'bg-[#0A0C10]/80 border-white/12 text-zinc-300 hover:text-white'
          }`}
        >
          <span>◄ Peek L</span>
          <span className="opacity-60">[&lt;]</span>
        </button>

        <button
          id="btn-lean-right"
          type="button"
          onClick={e => {
            e.stopPropagation();
            onToggleLean?.('right');
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm backdrop-blur-md transition-all font-mono border cursor-pointer text-[10px] font-bold uppercase ${
            leanState === 'right'
              ? 'bg-[#1D2413] border-[#A3E635] text-[#A3E635]'
              : 'bg-[#0A0C10]/80 border-white/12 text-zinc-300 hover:text-white'
          }`}
        >
          <span className="opacity-60">[&gt;]</span>
          <span>Peek R ►</span>
        </button>
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
