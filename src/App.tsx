import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine';
import {
  EliminationAccolade,
  EnemyBot,
  EnvironmentState,
  FloatingDamageNumberItem,
  GameMode,
  GameSettings,
  HitmarkerEvent,
  KillFeedItem,
  PlayerStats,
  ScorestreakItem,
  TrainingTelemetryData,
  WeaponCamo,
  WeaponType,
  WeatherType,
} from './types';
import { HUD } from './components/HUD';
import { Scoreboard } from './components/Scoreboard';
import { GunsmithModal } from './components/GunsmithModal';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal } from './components/GameOverModal';
import { PauseMenu } from './components/PauseMenu';
import {
  Play,
  Crosshair,
  Sparkles,
  Zap,
  Shield,
  Bomb,
  Radio,
  CloudSunRain,
  Sliders,
  Users,
  Target,
  Flame,
  Award,
  Wind,
  Sun,
  Sunset,
  CloudLightning,
  Moon,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { soundManager } from './game/audio';
import { WEAPON_REGISTRY } from './game/weapons';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Game Life Cycle States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState<boolean>(false);
  const [isGunsmithOpen, setIsGunsmithOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);

  // Environment & Weather State
  const [environment, setEnvironment] = useState<EnvironmentState>({
    weather: 'dynamic_cycle',
    timeOfDay: 'noon',
    timeString: '12:00 HRS',
    weatherName: 'Clear High Noon',
    rainIntensity: 0,
    fogDensity: 0.008,
    windSpeedKts: 10,
    windDirection: '10 KTS NE',
    visibilityPct: 98,
    isLightningActive: false,
    temperatureStr: '26°C (79°F)',
  });

  // Gameplay States
  const [stats, setStats] = useState<PlayerStats>({
    health: 100,
    maxHealth: 100,
    armor: 100,
    maxArmor: 100,
    kills: 0,
    deaths: 0,
    headshots: 0,
    score: 0,
    currentStreak: 0,
    highestStreak: 0,
    shotsFired: 0,
    shotsHit: 0,
  });

  const [currentWeapon, setCurrentWeapon] = useState<WeaponType>('m4');
  const [currentCamo, setCurrentCamo] = useState<WeaponCamo>('standard');
  const [ammoInMag, setAmmoInMag] = useState<number>(30);
  const [ammoReserve, setAmmoReserve] = useState<number>(120);
  const [grenadesCount, setGrenadesCount] = useState<number>(2);
  const [tacticalCount, setTacticalCount] = useState<number>(2);
  const [tacticalType, setTacticalType] = useState<'smoke' | 'motion_sensor'>('smoke');
  const [laserActive, setLaserActive] = useState<boolean>(true);
  const [isAiming, setIsAiming] = useState<boolean>(false);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [isSprinting, setIsSprinting] = useState<boolean>(false);
  const [hitmarker, setHitmarker] = useState<HitmarkerEvent | null>(null);
  const [pickupNotice, setPickupNotice] = useState<{ text: string; type: 'ammo' | 'armor' | 'stimpack' | 'tactical' } | null>(null);
  const [accolades, setAccolades] = useState<EliminationAccolade[]>([]);
  const [damageAngle, setDamageAngle] = useState<number | null>(null);

  const [streaks, setStreaks] = useState<ScorestreakItem[]>([
    { id: 'uav', name: 'UAV Radar Sweep', cost: 3, ready: false, icon: 'radar', description: '' },
    { id: 'airstrike', name: 'Precision Airstrike', cost: 5, ready: false, icon: 'plane', description: '' },
    { id: 'sentry', name: 'Automated Sentry Gun', cost: 7, ready: false, icon: 'shield-alert', description: '' },
    { id: 'nuke', name: 'Tactical Nuke', cost: 25, ready: false, icon: 'flame', description: '' },
  ]);

  const [alliesScore, setAlliesScore] = useState<number>(0);
  const [axisScore, setAxisScore] = useState<number>(0);
  const [matchTime, setMatchTime] = useState<number>(600);
  const [killfeed, setKillfeed] = useState<KillFeedItem[]>([]);
  const [bots, setBots] = useState<EnemyBot[]>([]);
  const [playerPos, setPlayerPos] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 1.7, z: 34 });
  const [playerYaw, setPlayerYaw] = useState<number>(0);
  const [playerPitch, setPlayerPitch] = useState<number>(0);
  const [uavActive, setUavActive] = useState<boolean>(false);

  // Training Mode Telemetry & Floating 3D Numbers
  const [trainingTelemetry, setTrainingTelemetry] = useState<TrainingTelemetryData>({
    totalDamage: 0,
    targetsHit: 0,
    targetsNeutralized: 0,
    headshots: 0,
    lastHitDamage: 0,
    lastHitDistance: 0,
    lastHitZone: 'READY',
    currentDps: 0,
    accuracy: 100,
    shotsFired: 0,
    shotsHit: 0,
    infiniteAmmo: true,
    movingTargetSpeed: 3.5,
  });
  const [floatingDamageNumbers, setFloatingDamageNumbers] = useState<FloatingDamageNumberItem[]>([]);

  // Settings & Mode
  const [gameMode, setGameMode] = useState<GameMode>('tdm');
  const [settings, setSettings] = useState<GameSettings>({
    mouseSensitivity: 1.0,
    masterVolume: 0.8,
    sfxVolume: 0.9,
    musicVolume: 0.7,
    fieldOfView: 85,
    invertY: false,
    motionBlur: true,
    crosshairStyle: 'tactical',
    hitmarkerAudio: true,
    botCount: 6,
    botDifficulty: 'regular',
    graphicsQuality: 'ultra',
    weatherPreset: 'dynamic_cycle',
  });

  // Start / Init Engine
  const startMission = () => {
    soundManager.init();
    setIsPlaying(true);
    setIsGameOver(false);
    setIsPaused(false);
  };

  useEffect(() => {
    if (!isPlaying || !canvasContainerRef.current) return;

    const engine = new GameEngine(canvasContainerRef.current, settings, gameMode);
    engineRef.current = engine;

    engine.onStatsUpdate = newStats => setStats(newStats);
    engine.onKillfeedEvent = item => setKillfeed(prev => [...prev, item]);
    engine.onHitmarkerEvent = e => setHitmarker(e);
    engine.onAccoladeEvent = acc => {
      setAccolades(prev => [...prev.slice(-2), acc]);
      setTimeout(() => {
        setAccolades(prev => prev.filter(a => a.id !== acc.id));
      }, 2200);
    };
    engine.onDamageTaken = angle => {
      setDamageAngle(angle);
    };
    engine.onScoreUpdate = (allies, axis, time) => {
      setAlliesScore(allies);
      setAxisScore(axis);
      setMatchTime(time);
    };
    engine.onStreakUpdate = updatedStreaks => setStreaks([...updatedStreaks]);
    engine.onMatchEnd = (victory, finalStats) => {
      setIsVictory(victory);
      setIsGameOver(true);
      setStats(finalStats);
      document.exitPointerLock?.();
    };

    engine.onEnvironmentUpdate = (envState) => {
      setEnvironment(envState);
    };

    engine.onTacticalUpdate = (count, type) => {
      setTacticalCount(count);
      setTacticalType(type);
    };

    engine.onMotionDetectNotice = (detectedIds) => {
      setPickupNotice({
        text: `MOTION SENSOR TRIGGERED // ${detectedIds.length} HOSTILE(S) DETECTED`,
        type: 'tactical',
      });
      setTimeout(() => setPickupNotice(null), 3000);
    };

    engine.onTrainingTelemetry = (data) => {
      setTrainingTelemetry(data);
    };

    engine.onFloatingNumbersUpdate = (items) => {
      setFloatingDamageNumbers(items);
    };

    engine.controller.onAmmoChange = (mag, res) => {
      setAmmoInMag(mag);
      setAmmoReserve(res);
    };

    engine.controller.onGrenadeChange = count => {
      setGrenadesCount(count);
    };

    engine.onPickupNotice = (text, type) => {
      setPickupNotice({ text, type });
      setTimeout(() => setPickupNotice(null), 2500);
    };

    // Frame synchronization loop for HUD positioning & Minimap
    let frameId: number;
    const syncHud = () => {
      if (engine && !engine.isMatchOver && !engine.isPaused) {
        setPlayerPos({
          x: engine.controller.position.x,
          y: engine.controller.position.y,
          z: engine.controller.position.z,
        });
        setPlayerYaw(engine.controller.yaw);
        setPlayerPitch(engine.controller.pitch);
        setBots(engine.botManager.getBotData());
        setIsAiming(engine.controller.isAiming);
        setIsReloading(engine.controller.isReloading);
        setIsSprinting(engine.controller.isSprinting);
        setCurrentWeapon(engine.controller.currentWeapon);
        setGrenadesCount(engine.controller.grenadesCount);
        setTacticalCount(engine.grenadeManager.getTacticalCount());
        setTacticalType(engine.grenadeManager.getTacticalType());
        setLaserActive(engine.controller.laserActive);
        setUavActive(engine.streakManager.uavActive);
      }
      frameId = requestAnimationFrame(syncHud);
    };
    frameId = requestAnimationFrame(syncHud);

    // Global Key Handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        setIsScoreboardOpen(true);
      }
      if (e.code === 'KeyB') {
        setIsGunsmithOpen(prev => !prev);
      }
      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (!isGameOver) {
          setIsPaused(prev => {
            const next = !prev;
            engine.setPaused(next);
            return next;
          });
        }
      }
      if (e.code === 'Digit6') engine.activateScorestreak('uav');
      if (e.code === 'Digit7') engine.activateScorestreak('airstrike');
      if (e.code === 'Digit8') engine.activateScorestreak('sentry');
      if (e.code === 'Digit9') engine.activateScorestreak('nuke');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Tab') {
        setIsScoreboardOpen(false);
      }
    };

    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === canvasContainerRef.current;
      if (!isLocked && !isGameOver) {
        setIsPaused(true);
        engine.setPaused(true);
      } else if (isLocked && !isGameOver) {
        setIsPaused(false);
        engine.setPaused(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    document.addEventListener('pointerlockchange', handlePointerLockChange);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      engine.destroy();
      engineRef.current = null;
    };
  }, [isPlaying, gameMode]);

  // Pause synchronizer when submodals open
  useEffect(() => {
    if (isGunsmithOpen || isSettingsOpen) {
      if (engineRef.current && !engineRef.current.isPaused) {
        engineRef.current.setPaused(true);
        setIsPaused(true);
      }
    }
  }, [isGunsmithOpen, isSettingsOpen]);

  const handleResume = () => {
    setIsPaused(false);
    if (engineRef.current) {
      engineRef.current.setPaused(false);
    }
    canvasContainerRef.current?.requestPointerLock();
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setIsGameOver(false);
    setIsPaused(false);
    setTimeout(() => {
      startMission();
    }, 100);
  };

  const handleReturnToHomescreen = () => {
    setIsPlaying(false);
    setIsGameOver(false);
    setIsPaused(false);
    if (engineRef.current) {
      engineRef.current.destroy();
      engineRef.current = null;
    }
  };

  const handleSelectWeapon = (weapon: WeaponType, camo: WeaponCamo) => {
    setCurrentWeapon(weapon);
    setCurrentCamo(camo);
    if (engineRef.current) {
      engineRef.current.controller.equipWeapon(weapon, camo);
    }
  };

  const handleDeployTactical = () => {
    if (engineRef.current) {
      engineRef.current.controller.deployTactical();
    }
  };

  const handleToggleTacticalType = () => {
    if (engineRef.current) {
      engineRef.current.controller.toggleTacticalType();
    }
  };

  const handleActivateStreak = (id: 'uav' | 'airstrike' | 'sentry' | 'nuke') => {
    if (engineRef.current) {
      engineRef.current.activateScorestreak(id);
    }
  };

  const handleToggleWeather = () => {
    if (engineRef.current) {
      const nextW = engineRef.current.toggleWeatherPreset();
      setPickupNotice({ text: `WEATHER SHIFT // ${nextW.toUpperCase().replace('_', ' ')}`, type: 'ammo' });
    }
  };

  const handleResetTrainingTargets = () => {
    if (engineRef.current?.trainingManager) {
      engineRef.current.trainingManager.resetAllTargets();
    }
  };

  const handleSelectWeather = (weather: WeatherType) => {
    if (engineRef.current) {
      engineRef.current.setWeatherPreset(weather);
      setPickupNotice({ text: `ENVIRONMENT SET // ${weather.toUpperCase().replace('_', ' ')}`, type: 'ammo' });
    }
    setSettings(prev => ({ ...prev, weatherPreset: weather }));
  };

  const activeWeaponCfg = WEAPON_REGISTRY[currentWeapon];

  return (
    <main id="app-root" className="relative w-screen h-screen bg-black overflow-hidden font-sans select-none">
      {/* 3D WebGL Canvas Viewport */}
      {isPlaying && (
        <div
          id="webgl-canvas-container"
          ref={canvasContainerRef}
          className="absolute inset-0 w-full h-full cursor-crosshair z-0"
        />
      )}

      {/* TACTICAL HUD */}
      {isPlaying && !isGameOver && (
        <HUD
          stats={stats}
          gameMode={gameMode}
          currentWeapon={currentWeapon}
          ammoInMag={ammoInMag}
          ammoReserve={ammoReserve}
          grenadesCount={grenadesCount}
          tacticalCount={tacticalCount}
          tacticalType={tacticalType}
          laserActive={laserActive}
          isAiming={isAiming}
          isReloading={isReloading}
          isSprinting={isSprinting}
          hitmarker={hitmarker}
          pickupNotice={pickupNotice}
          accolades={accolades}
          damageAngle={damageAngle}
          streaks={streaks}
          alliesScore={alliesScore}
          axisScore={axisScore}
          matchTime={matchTime}
          killfeed={killfeed}
          bots={bots}
          playerPos={playerPos}
          playerYaw={playerYaw}
          playerPitch={playerPitch}
          uavActive={uavActive}
          environment={environment}
          trainingTelemetry={trainingTelemetry}
          floatingDamageNumbers={floatingDamageNumbers}
          onResetTrainingTargets={handleResetTrainingTargets}
          onSwitchWeapon={handleSelectWeapon}
          onToggleWeather={handleToggleWeather}
          onDeployTactical={handleDeployTactical}
          onToggleTacticalType={handleToggleTacticalType}
          onActivateStreak={handleActivateStreak}
          onOpenGunsmith={() => setIsGunsmithOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* SCOREBOARD (TAB) */}
      {isScoreboardOpen && isPlaying && !isGameOver && (
        <Scoreboard
          stats={stats}
          bots={bots}
          alliesScore={alliesScore}
          axisScore={axisScore}
          matchTime={matchTime}
        />
      )}

      {/* GUNSMITH MODAL */}
      {isGunsmithOpen && (
        <GunsmithModal
          currentWeapon={currentWeapon}
          currentCamo={currentCamo}
          onSelectWeapon={handleSelectWeapon}
          onClose={() => {
            setIsGunsmithOpen(false);
            if (isPlaying && !isGameOver) {
              canvasContainerRef.current?.requestPointerLock();
            }
          }}
        />
      )}

      {/* SETTINGS MODAL */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={newS => {
            setSettings(newS);
            if (newS.weatherPreset && engineRef.current) {
              engineRef.current.setWeatherPreset(newS.weatherPreset);
            }
          }}
          onClose={() => {
            setIsSettingsOpen(false);
            if (isPlaying && !isGameOver) {
              canvasContainerRef.current?.requestPointerLock();
            }
          }}
        />
      )}

      {/* PAUSE MENU */}
      {isPaused && isPlaying && !isGameOver && !isGunsmithOpen && !isSettingsOpen && (
        <PauseMenu
          gameMode={gameMode}
          currentWeather={environment.weather}
          onResume={handleResume}
          onOpenGunsmith={() => setIsGunsmithOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onRestart={handleRestart}
          onReturnToHome={handleReturnToHomescreen}
          onSelectWeather={handleSelectWeather}
          onChangeMode={m => {
            setGameMode(m);
            handleRestart();
          }}
        />
      )}

      {/* GAME OVER MODAL */}
      {isGameOver && (
        <GameOverModal
          victory={isVictory}
          stats={stats}
          onPlayAgain={handleRestart}
        />
      )}

      {/* HOMESCREEN - AAA CALL OF DUTY TACTICAL MILITARY LOBBY */}
      {!isPlaying && (
        <div
          id="start-screen"
          className="absolute inset-0 z-40 flex items-center justify-center bg-[#07090e] p-4 sm:p-8 text-slate-200 overflow-y-auto"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(6, 182, 212, 0.14) 0%, rgba(15, 23, 42, 0.7) 45%, rgba(3, 7, 18, 0.99) 100%)',
          }}
        >
          {/* Tactical Background Grid & Ambient Scanlines */}
          <div className="absolute inset-0 tactical-scanlines pointer-events-none opacity-30" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b18_1px,transparent_1px),linear-gradient(to_bottom,#1e293b18_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

          <div className="relative w-full max-w-5xl bg-slate-950/95 border border-slate-800/90 rounded-3xl shadow-2xl p-6 sm:p-10 flex flex-col gap-6 backdrop-blur-2xl my-auto">
            {/* Top Navigation & Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-black text-2xl shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                  FO
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
                      FRONTLINE OPS
                    </h1>
                    <span className="text-[10px] bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/50 font-mono font-black tracking-widest uppercase">
                      WARZONE TACTICAL
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 font-mono mt-0.5">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                      128-TICK DEDICATED
                    </span>
                    <span>•</span>
                    <span className="text-amber-400 font-bold">RANK 55 PRESTIGE</span>
                    <span>•</span>
                    <span>CLAN [TASK-141]</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  id="btn-open-settings"
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-800 transition-all flex items-center gap-2 cursor-pointer font-mono"
                >
                  <Sliders className="w-4 h-4 text-cyan-400" /> Settings
                </button>
                <button
                  id="btn-open-gunsmith"
                  onClick={() => setIsGunsmithOpen(true)}
                  className="px-4 py-2.5 bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 font-bold text-xs uppercase tracking-wider rounded-xl border border-cyan-500/40 transition-all flex items-center gap-2 cursor-pointer font-mono shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                >
                  <Crosshair className="w-4 h-4 text-cyan-400" /> Gunsmith Armory
                </button>
              </div>
            </div>

            {/* Main Interactive Briefing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Card 1: Game Mode Selection */}
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col gap-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> Combat Deployment Mode
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 font-bold">SELECT PLAYLIST</span>
                </div>

                <div className="flex flex-col gap-2">
                  {[
                    { id: 'training', title: '🎯 Ballistic Training Range', desc: '0 Enemies. Dynamic moving steel targets, humanoid mannequins & hit telemetry.', icon: Target },
                    { id: 'tdm', title: 'Team Deathmatch', desc: '5v5 Tactical squad elimination. First team to 50 score.', icon: Users },
                    { id: 'ffa', title: 'Free For All', desc: 'Solo combat arena. Eliminate every hostile bot on sight.', icon: Flame },
                    { id: 'gungame', title: 'Gun Game Escalation', desc: 'Weapon tier progression on every elimination up to Deagle.', icon: Award },
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setGameMode(m.id as GameMode)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        gameMode === m.id
                          ? 'bg-cyan-950/60 border-cyan-500/80 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold font-mono uppercase text-cyan-300">{m.title}</span>
                        {gameMode === m.id && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
                      </div>
                      <span className="text-[10px] text-slate-400 leading-tight">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Card 2: Operator Loadout & Tactical Utility */}
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between text-left gap-3">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                      <Crosshair className="w-3.5 h-3.5" /> Operator Loadout
                    </span>
                    <button
                      onClick={() => setIsGunsmithOpen(true)}
                      className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer font-bold"
                    >
                      MODIFY IN GUNSMITH →
                    </button>
                  </div>

                  {/* Weapon Slot */}
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">PRIMARY FIREARM</span>
                      <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase">{activeWeaponCfg.category}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-white font-mono">{activeWeaponCfg.name}</span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-400 font-bold">
                        {currentCamo}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-900">
                      <span>DMG: <b className="text-cyan-300">{activeWeaponCfg.damage}</b></span>
                      <span>•</span>
                      <span>RPM: <b className="text-cyan-300">{activeWeaponCfg.fireRateRpm}</b></span>
                      <span>•</span>
                      <span>MAG: <b className="text-cyan-300">{activeWeaponCfg.magSize}</b></span>
                    </div>
                  </div>

                  {/* Tactical Equipment Slot */}
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2">
                    <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">TACTICAL UTILITY LOADOUT</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col gap-0.5">
                        <span className="text-[9px] font-mono text-orange-400 font-bold flex items-center gap-1">
                          <Bomb className="w-3 h-3" /> [G] LETHAL
                        </span>
                        <span className="text-xs font-bold text-white font-mono">Frag Grenade (x2)</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col gap-0.5">
                        <span className="text-[9px] font-mono text-cyan-400 font-bold flex items-center gap-1">
                          <Radio className="w-3 h-3" /> [Q/X] TACTICAL
                        </span>
                        <span className="text-xs font-bold text-white font-mono">Smoke / Sensor (x2)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Procedural CS2/COD reload & tactical AI perception enabled</span>
                </div>
              </div>

              {/* Card 3: Dynamic Weather & Environment Engine */}
              <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800/80 flex flex-col justify-between text-left gap-3">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                      <CloudSunRain className="w-3.5 h-3.5" /> Atmospheric Simulator
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-bold">[T] IN COMBAT</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'dynamic_cycle', label: 'Dynamic Cycle', icon: Sparkles },
                      { id: 'tactical_storm', label: 'Tactical Storm', icon: CloudLightning },
                      { id: 'clear_day', label: 'High Noon', icon: Sun },
                      { id: 'golden_sunset', label: 'Golden Sunset', icon: Sunset },
                      { id: 'midnight_fog', label: 'Midnight Ops', icon: Moon },
                      { id: 'sandstorm', label: 'Sandstorm', icon: Wind },
                    ].map(w => (
                      <button
                        key={w.id}
                        onClick={() => handleSelectWeather(w.id as WeatherType)}
                        className={`p-2 rounded-lg border flex items-center gap-2 transition-all cursor-pointer ${
                          settings.weatherPreset === w.id
                            ? 'bg-cyan-950/70 border-cyan-500 text-white shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <w.icon className={`w-3.5 h-3.5 ${settings.weatherPreset === w.id ? 'text-cyan-400' : 'text-slate-500'}`} />
                        <span className="text-[11px] font-mono font-bold uppercase">{w.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tactical Features Check */}
                <div className="flex flex-col gap-1 text-[10px] font-mono text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  <div className="flex justify-between">
                    <span>HOSTILE OPERATIVES:</span>
                    <span className="text-cyan-300 font-bold">{settings.botCount} AI Operatives</span>
                  </div>
                  <div className="flex justify-between">
                    <span>DIFFICULTY:</span>
                    <span className="text-cyan-300 font-bold uppercase">{settings.botDifficulty}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>GRAPHICS ENGINE:</span>
                    <span className="text-cyan-300 font-bold uppercase">{settings.graphicsQuality}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Launch Action Bar */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button
                id="btn-start-game"
                onClick={startMission}
                className="flex-1 py-4 px-8 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-base uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_30px_rgba(6,182,212,0.35)] hover:shadow-[0_0_40px_rgba(6,182,212,0.5)] flex items-center justify-center gap-3 cursor-pointer font-mono hover:scale-[1.01]"
              >
                <Play className="w-5 h-5 fill-slate-950" /> DEPLOY TO OPERATIONAL COMBAT
              </button>

              <button
                id="btn-gunsmith-action"
                onClick={() => setIsGunsmithOpen(true)}
                className="py-4 px-6 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-sm uppercase tracking-widest rounded-2xl border border-slate-800 transition-all flex items-center justify-center gap-2 cursor-pointer font-mono hover:border-slate-700"
              >
                <Crosshair className="w-4 h-4 text-cyan-400" /> ARMORY & CAMOS
              </button>
            </div>

            {/* Keybindings Quick Reference Footer */}
            <div className="pt-3 border-t border-slate-900 text-[11px] font-mono text-slate-400 flex flex-wrap justify-between items-center gap-2">
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span><b className="text-cyan-400">WASD</b>: Move</span>
                <span><b className="text-cyan-400">R-Click</b>: ADS</span>
                <span><b className="text-cyan-400">G</b>: Frag Grenade</span>
                <span><b className="text-cyan-400">Q</b>: Tactical (Smoke/Sensor)</span>
                <span><b className="text-cyan-400">X</b>: Switch Tactical</span>
                <span><b className="text-cyan-400">F</b>: Laser Sight</span>
                <span><b className="text-cyan-400">V / M-Click</b>: Melee</span>
                <span><b className="text-cyan-400">T</b>: Weather Shift</span>
                <span><b className="text-cyan-400">TAB</b>: Scoreboard</span>
                <span><b className="text-cyan-400">ESC / P</b>: Pause & Return Home</span>
              </div>
              <span className="text-[10px] text-slate-600 font-bold">FRONTLINE OPS • TACTICAL ENGINE</span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
