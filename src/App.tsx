import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/engine';
import {
  BattleRoyaleState,
  EliminationAccolade,
  EnemyBot,
  EnvironmentState,
  FloatingDamageNumberItem,
  GameMode,
  GameSettings,
  HitmarkerEvent,
  KillFeedItem,
  LeanDirection,
  PlayerEliminatedInfo,
  PlayerStats,
  ScorestreakItem,
  TrainingTelemetryData,
  WeaponCamo,
  WeaponType,
  WeatherType,
  GraphicsMode,
  OpticType,
  ReticleColor,
  ReticleStyle,
  MapType,
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
  Headphones,
  Volume2,
  Layers,
  Cpu,
  Activity,
  ShieldCheck,
  Check,
  MapPin,
} from 'lucide-react';
import { soundManager } from './game/audio';
import { DEFAULT_WEAPON_OPTICS, WEAPON_REGISTRY } from './game/weapons';

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
    weather: 'clear_day',
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
  const [currentOptic, setCurrentOptic] = useState<OpticType>('holo_553');
  const [currentReticleColor, setCurrentReticleColor] = useState<ReticleColor>('red');
  const [currentReticleStyle, setCurrentReticleStyle] = useState<ReticleStyle>('holo_ring');
  const [ammoInMag, setAmmoInMag] = useState<number>(30);
  const [ammoReserve, setAmmoReserve] = useState<number>(120);
  const [grenadesCount, setGrenadesCount] = useState<number>(2);
  const [tacticalCount, setTacticalCount] = useState<number>(2);
  const [tacticalType, setTacticalType] = useState<import('./types').TacticalType>('smoke');
  const [laserActive, setLaserActive] = useState<boolean>(true);
  const [isAiming, setIsAiming] = useState<boolean>(false);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [isSprinting, setIsSprinting] = useState<boolean>(false);
  const [isHoldingBreath, setIsHoldingBreath] = useState<boolean>(false);
  const [breathStamina, setBreathStamina] = useState<number>(1.0);
  const [isHyperventilating, setIsHyperventilating] = useState<boolean>(false);
  const [opticZoomStepIndex, setOpticZoomStepIndex] = useState<number>(0);
  const [isThermalEnabled, setIsThermalEnabled] = useState<boolean>(false);
  const [targetRangeMeters, setTargetRangeMeters] = useState<number>(0);
  const [elevationHoldoverMil, setElevationHoldoverMil] = useState<number>(0);
  const [targetedEnemyId, setTargetedEnemyId] = useState<string | null>(null);
  const [scopeShadowOffsetX, setScopeShadowOffsetX] = useState<number>(0);
  const [scopeShadowOffsetY, setScopeShadowOffsetY] = useState<number>(0);
  const [isTacStance, setIsTacStance] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);
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
  const [battleRoyaleState, setBattleRoyaleState] = useState<BattleRoyaleState | null>(null);
  const [leanState, setLeanState] = useState<LeanDirection>('none');
  const [leanFactor, setLeanFactor] = useState<number>(0);

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

  // Player Elimination State
  const [eliminatedInfo, setEliminatedInfo] = useState<PlayerEliminatedInfo | null>(null);

  // Settings & Mode
  const [gameMode, setGameMode] = useState<GameMode>('tdm');
  const [selectedMap, setSelectedMap] = useState<MapType>('warehouse');
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
    weatherPreset: 'clear_day',
    mapType: 'warehouse',
  });

  // Start / Init Engine
  const startMission = () => {
    soundManager.init();
    const effectiveMap = gameMode === 'battleroyale' ? 'bermuda' : selectedMap;
    setSettings(prev => ({ ...prev, mapType: effectiveMap }));
    setIsPlaying(true);
    setIsGameOver(false);
    setIsPaused(false);
  };

  // Prime audio engine on first user interaction so sounds are pre-decoded
  useEffect(() => {
    const handleGesture = () => {
      soundManager.init();
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
    window.addEventListener('pointerdown', handleGesture, { passive: true });
    window.addEventListener('keydown', handleGesture, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
  }, []);

  // Lobby keyboard shortcut [Enter] to deploy
  useEffect(() => {
    if (isPlaying || isGunsmithOpen || isSettingsOpen) return;
    const handleLobbyKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        startMission();
      }
    };
    window.addEventListener('keydown', handleLobbyKey);
    return () => window.removeEventListener('keydown', handleLobbyKey);
  }, [isPlaying, isGunsmithOpen, isSettingsOpen]);

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

    engine.onPlayerEliminated = (info) => {
      setEliminatedInfo(info);
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
        const activeOptic = engine.controller.equippedOptics[engine.controller.currentWeapon] || DEFAULT_WEAPON_OPTICS[engine.controller.currentWeapon] || 'holo_553';
        setCurrentOptic(activeOptic);
        const activeColor = engine.controller.opticReticleColors[engine.controller.currentWeapon] || 'red';
        setCurrentReticleColor(activeColor);
        const activeStyle = engine.controller.opticReticleStyles[engine.controller.currentWeapon] || 'dot';
        setCurrentReticleStyle(activeStyle);
        setGrenadesCount(engine.controller.grenadesCount);
        setTacticalCount(engine.grenadeManager.getTacticalCount());
        setTacticalType(engine.grenadeManager.getTacticalType());
        setLaserActive(engine.controller.laserActive);
        setUavActive(engine.streakManager.uavActive);
        setBattleRoyaleState(engine.battleRoyaleState);

        // Scope & Steady Aim Telemetry
        setIsHoldingBreath(engine.controller.isHoldingBreath);
        setBreathStamina(engine.controller.breathStamina);
        setIsHyperventilating(engine.controller.isHyperventilating);
        setOpticZoomStepIndex(engine.controller.opticZoomStepIndex);
        setIsThermalEnabled(engine.controller.isThermalEnabled);
        setTargetRangeMeters(engine.controller.targetRangeMeters);
        setElevationHoldoverMil(engine.controller.elevationHoldoverMil);
        setTargetedEnemyId(engine.controller.targetedEnemyId);
        setScopeShadowOffsetX(engine.controller.scopeShadowOffsetX);
        setScopeShadowOffsetY(engine.controller.scopeShadowOffsetY);
        setIsTacStance(engine.controller.isTacStance);
        setIsMounted(engine.controller.isMounted);
        setLeanState(engine.controller.leanState);
        setLeanFactor(engine.controller.currentLeanFactor);
      }
      frameId = requestAnimationFrame(syncHud);
    };
    frameId = requestAnimationFrame(syncHud);

    // Global Key Handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (engine.isPlayerDead) {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          engine.respawnPlayer();
          return;
        }
      }
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
      if (e.code === 'KeyH') engine.useInhaler();
      if (e.code === 'KeyV') engine.useMedkit();
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

  const handleSelectWeapon = (
    weapon: WeaponType,
    camo?: WeaponCamo,
    optic?: OpticType,
    reticleColor?: ReticleColor,
    reticleStyle?: ReticleStyle
  ) => {
    const resolvedCamo = camo ?? currentCamo;
    const resolvedOptic = optic ?? engineRef.current?.controller.equippedOptics[weapon] ?? DEFAULT_WEAPON_OPTICS[weapon] ?? 'holo_553';
    const resolvedColor = reticleColor ?? engineRef.current?.controller.opticReticleColors[weapon] ?? currentReticleColor;
    const resolvedStyle = reticleStyle ?? engineRef.current?.controller.opticReticleStyles[weapon] ?? currentReticleStyle;

    setCurrentWeapon(weapon);
    setCurrentCamo(resolvedCamo);
    setCurrentOptic(resolvedOptic);
    setCurrentReticleColor(resolvedColor);
    setCurrentReticleStyle(resolvedStyle);
    if (engineRef.current) {
      engineRef.current.controller.equipWeapon(weapon, resolvedCamo, resolvedOptic, resolvedColor, resolvedStyle);
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

  const handleSelectGraphicsMode = (mode: GraphicsMode) => {
    const updated = {
      ...settings,
      graphicsMode: mode,
      graphicsQuality: mode === 'smooth' ? ('medium' as const) : mode === 'standard' ? ('high' as const) : ('ultra' as const),
    };
    setSettings(updated);
    if (engineRef.current) {
      engineRef.current.updateSettings(updated);
      setPickupNotice({
        text: `GRAPHICS CALIBRATION // ${mode.toUpperCase()}${mode === 'extreme' ? ' (RTX RAY-TRACING)' : ''}`,
        type: 'ammo',
      });
    }
  };

  const handleInstantRespawn = () => {
    if (engineRef.current) {
      engineRef.current.respawnPlayer();
    }
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
          battleRoyaleState={battleRoyaleState}
          currentWeapon={currentWeapon}
          equippedOptic={currentOptic}
          reticleColor={currentReticleColor}
          reticleStyle={currentReticleStyle}
          ammoInMag={ammoInMag}
          ammoReserve={ammoReserve}
          grenadesCount={grenadesCount}
          tacticalCount={tacticalCount}
          tacticalType={tacticalType}
          laserActive={laserActive}
          isAiming={isAiming}
          isReloading={isReloading}
          isSprinting={isSprinting}
          isHoldingBreath={isHoldingBreath}
          breathStamina={breathStamina}
          isHyperventilating={isHyperventilating}
          opticZoomStepIndex={opticZoomStepIndex}
          isThermalEnabled={isThermalEnabled}
          targetRangeMeters={targetRangeMeters}
          elevationHoldoverMil={elevationHoldoverMil}
          targetedEnemyId={targetedEnemyId}
          scopeShadowOffsetX={scopeShadowOffsetX}
          scopeShadowOffsetY={scopeShadowOffsetY}
          isTacStance={isTacStance}
          isMounted={isMounted}
          leanState={leanState}
          leanFactor={leanFactor}
          onToggleLean={(dir) => engineRef.current?.controller.toggleLean(dir)}
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
          onUseInhaler={() => engineRef.current?.useInhaler()}
          onUseMedkit={() => engineRef.current?.useMedkit()}
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
          currentOptic={currentOptic}
          currentReticleColor={currentReticleColor}
          currentReticleStyle={currentReticleStyle}
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
            if (engineRef.current) {
              engineRef.current.updateSettings(newS);
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
          graphicsMode={settings.graphicsMode || 'standard'}
          onResume={handleResume}
          onOpenGunsmith={() => setIsGunsmithOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onRestart={handleRestart}
          onReturnToHome={handleReturnToHomescreen}
          onSelectWeather={handleSelectWeather}
          onSelectGraphicsMode={handleSelectGraphicsMode}
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
          onReturnToHome={handleReturnToHomescreen}
        />
      )}

      {/* HOMESCREEN - AAA TACTICAL MILITARY LOBBY OVERHAUL */}
      {!isPlaying && (
        <div
          id="start-screen"
          className="absolute inset-0 z-40 flex flex-col justify-between bg-[#070a11] p-4 sm:p-8 text-slate-200 overflow-y-auto"
          style={{
            backgroundImage: 'radial-gradient(circle at 50% 12%, rgba(6, 182, 212, 0.12) 0%, rgba(15, 23, 42, 0.75) 50%, rgba(2, 6, 23, 0.98) 100%)',
          }}
        >
          {/* Subtle Military Tactical Scanlines & Grid Overlay */}
          <div className="absolute inset-0 tactical-scanlines pointer-events-none opacity-20" />
          <div
            className="absolute inset-0 pointer-events-none opacity-5"
            style={{
              backgroundImage: 'linear-gradient(to right, #06b6d4 1px, transparent 1px), linear-gradient(to bottom, #06b6d4 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          {/* TOP GLOBAL COMMAND BAR */}
          <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            {/* Title & Brand */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-slate-900 border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-mono font-black text-xl shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <Target className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black font-mono tracking-tight text-white uppercase flex items-center gap-1.5">
                    FRONTLINE OPS
                  </h1>
                  <span className="text-[9px] bg-cyan-950/90 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/50 font-mono font-black tracking-widest uppercase">
                    v2.4 RTX
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                    ONLINE // 128-TICK
                  </span>
                  <span>•</span>
                  <span className="text-cyan-400">BERMUDA SECTOR 7</span>
                  <span>•</span>
                  <span className="text-amber-400 font-bold">PRESTIGE 55</span>
                </div>
              </div>
            </div>

            {/* Horizontal Global Navigation Tabs */}
            <nav className="flex items-center gap-2 font-mono text-xs">
              <button
                className="px-4 py-2 rounded-lg bg-cyan-950/90 border border-cyan-500 text-cyan-300 font-black tracking-wider uppercase transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>DEPLOYMENT</span>
              </button>

              <button
                id="btn-nav-gunsmith"
                onClick={() => setIsGunsmithOpen(true)}
                className="px-4 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/60 text-slate-300 hover:text-white font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                <span>GUNSMITH [B]</span>
              </button>

              <button
                id="btn-nav-training"
                onClick={() => {
                  setGameMode('training');
                  startMission();
                }}
                className="px-4 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/60 text-slate-300 hover:text-amber-300 font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>FIRING RANGE</span>
              </button>

              <button
                id="btn-nav-settings"
                onClick={() => setIsSettingsOpen(true)}
                className="px-4 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>SETTINGS</span>
              </button>

              <button
                id="btn-test-audio"
                onClick={() => {
                  soundManager.init();
                  soundManager.playGunshot(currentWeapon, false);
                }}
                title="Audition real-time firearm ballistic audio"
                className="px-3.5 py-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 text-cyan-400 font-bold text-xs tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>AUDITION SFX</span>
              </button>
            </nav>

            {/* Player Profile Dossier Card */}
            <div className="flex items-center gap-3 bg-slate-900/90 px-3.5 py-2 rounded-xl border border-slate-800 shadow-md">
              <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-slate-950 font-black font-mono text-sm shadow-md">
                55
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-950" />
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black font-mono text-white leading-tight">GHOST [TF-141]</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">PRESTIGE</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                  <span>K/D: <b className="text-cyan-300">2.85</b></span>
                  <span>•</span>
                  <span>WIN: <b className="text-emerald-400">74%</b></span>
                </div>
              </div>
            </div>
          </header>

          {/* MAIN OPERATIONAL DECK: 2-COLUMN BALANCED TACTICAL HUB */}
          <main className="relative z-10 w-full max-w-7xl mx-auto my-auto py-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COLUMN: MISSION PLAYLISTS & HIGH-IMPACT DEPLOY (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col gap-4 text-left">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                <span className="text-xs font-mono font-black uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" /> OPERATIONAL MISSION THEATERS
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  ACTIVE MODE: <b className="text-white uppercase">{gameMode}</b>
                </span>
              </div>

              {/* Tactical Combat Map Selection */}
              <div className="flex flex-col gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" /> TACTICAL COMBAT MAP
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase font-semibold">
                    {gameMode === 'battleroyale'
                      ? 'BERMUDA ISLAND (BR RESTRICTED)'
                      : selectedMap === 'outpost'
                      ? 'FOB SANDSTORM (DESERT OUTPOST)'
                      : selectedMap === 'bermuda'
                      ? 'BERMUDA ISLAND'
                      : 'CARGO TERMINAL (CQB)'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      id: 'warehouse',
                      name: 'Cargo Terminal',
                      size: '80x80M CQB',
                      desc: 'Container maze, catwalk & sniper tower',
                      disabled: gameMode === 'battleroyale',
                    },
                    {
                      id: 'outpost',
                      name: 'FOB Sandstorm',
                      size: '100x100M DESERT',
                      desc: '2-story TOC, motor pool & west trenches',
                      disabled: gameMode === 'battleroyale',
                    },
                    {
                      id: 'bermuda',
                      name: 'Bermuda Island',
                      size: '220x220M OPEN',
                      desc: 'Clock Tower, Shipyard, Factory & Village',
                      disabled: false,
                    },
                  ].map(m => {
                    const isCur = (gameMode === 'battleroyale' ? 'bermuda' : selectedMap) === m.id;
                    return (
                      <button
                        key={m.id}
                        disabled={m.disabled}
                        onClick={() => setSelectedMap(m.id as MapType)}
                        className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                          m.disabled
                            ? 'opacity-40 cursor-not-allowed bg-slate-950/40 border-slate-800'
                            : isCur
                            ? 'bg-amber-950/40 border-amber-400 text-white shadow-sm ring-1 ring-amber-400/40'
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-white uppercase">{m.name}</span>
                          <span className="text-[9px] font-mono text-amber-400 font-semibold">{m.size}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-sans line-clamp-1">{m.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tactical Playlist Cards */}
              <div className="flex flex-col gap-2.5">
                {[
                  {
                    id: 'tdm',
                    title: 'Team Deathmatch',
                    badge: '5v5 TACTICAL SQUAD',
                    desc: 'Tactical team combat on Cargo Terminal. Allies vs Axis with dynamic squad respawn mechanics.',
                    icon: Users,
                    color: 'from-cyan-950/80 to-slate-900/90',
                  },
                  {
                    id: 'battleroyale',
                    title: 'Battle Royale (Bermuda Island)',
                    badge: 'FREE FIRE RULES // BOOYAH',
                    desc: '220x220m island drop. Inhalers [H], Gliders, Launch Pads, dynamic Danger Zones, and Booyah victory.',
                    icon: ShieldAlert,
                    color: 'from-amber-950/70 to-slate-900/90',
                  },
                  {
                    id: 'ffa',
                    title: 'Free For All',
                    badge: 'SOLO OPERATIVE',
                    desc: 'Every operative for themselves. High-intensity solo survival with instant respawn sequence.',
                    icon: Flame,
                    color: 'from-rose-950/70 to-slate-900/90',
                  },
                  {
                    id: 'gungame',
                    title: 'Gun Game Escalation',
                    badge: 'WEAPON LADDER',
                    desc: 'Advance across 10 weapon tiers with each elimination. Prove master mastery of all weapon classes.',
                    icon: Award,
                    color: 'from-violet-950/70 to-slate-900/90',
                  },
                  {
                    id: 'training',
                    title: 'Ballistic Range & Firing Drills',
                    badge: 'REAL-TIME TELEMETRY & DPS',
                    desc: 'Dynamic moving steel targets with distance indicators, muzzle velocity, bullet drop, and real-time accuracy telemetry.',
                    icon: Target,
                    color: 'from-emerald-950/70 to-slate-900/90',
                  },
                ].map(m => {
                  const isSelected = gameMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setGameMode(m.id as GameMode)}
                      className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-4 group ${
                        isSelected
                          ? `bg-gradient-to-r ${m.color} border-cyan-400 text-white shadow-[0_0_20px_rgba(6,182,212,0.25)]`
                          : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800/80 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`p-2.5 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.6)]'
                              : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                          }`}
                        >
                          <m.icon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black font-mono uppercase text-white tracking-wide">
                              {m.title}
                            </span>
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-slate-950/80 text-cyan-300 border border-slate-700 font-bold">
                              {m.badge}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 font-sans mt-0.5 leading-relaxed">
                            {m.desc}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isSelected ? (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-cyan-500/20 border border-cyan-400/60 text-cyan-300 font-mono text-[10px] font-bold">
                            <Check className="w-3.5 h-3.5" />
                            <span>READY</span>
                          </div>
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Primary High-Impact DEPLOY ACTION CONSOLE */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  id="btn-start-game"
                  onClick={startMission}
                  className="w-full py-4 px-6 bg-gradient-to-r from-cyan-500 via-sky-400 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-black text-base font-mono uppercase tracking-widest rounded-xl transition-all shadow-[0_0_35px_rgba(6,182,212,0.45)] hover:shadow-[0_0_50px_rgba(6,182,212,0.65)] flex items-center justify-center gap-3 cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Play className="w-5 h-5 fill-slate-950" />
                  <span>DEPLOY NOW // QUICK PLAY</span>
                  <span className="text-xs font-bold text-slate-950 px-2 py-0.5 rounded bg-cyan-200/80 font-mono">
                    [SPACE / ENTER]
                  </span>
                </button>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                  <span>TACTICAL ENGINE: <b className="text-emerald-400">SUB-STEPPED KINEMATICS</b></span>
                  <span>SPECTATOR DELAY: <b className="text-cyan-300">0.00 MS</b></span>
                  <span>CONTAINER COLLISION: <b className="text-emerald-400">HARDENED</b></span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: ACTIVE LOADOUT, BOT TUNING & ATMOSPHERE (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4 text-left">
              {/* WEAPON LOADOUT CARD WITH QUICK SWITCHER */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/90 shadow-md flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                    <Crosshair className="w-3.5 h-3.5" /> PRIMARY WEAPON SPEC
                  </span>
                  <button
                    onClick={() => setIsGunsmithOpen(true)}
                    className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer font-bold flex items-center gap-1"
                  >
                    <span>CUSTOMIZE GUNSMITH [B]</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* Quick Weapon Selector Carousel */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  {(['m4', 'ak47', 'scar', 'mp5', 'vector', 'shotgun', 'sniper', 'deagle'] as WeaponType[]).map(wId => {
                    const cfg = WEAPON_REGISTRY[wId];
                    const isCur = currentWeapon === wId;
                    return (
                      <button
                        key={wId}
                        onClick={() => {
                          setCurrentWeapon(wId);
                          soundManager.init();
                          soundManager.playGunshot(wId, false);
                        }}
                        className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer font-mono ${
                          isCur
                            ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-sm font-bold'
                            : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase">{wId === 'sniper' ? 'AX-50' : wId === 'shotgun' ? 'M870' : wId.toUpperCase()}</div>
                        <div className="text-[8px] opacity-75 uppercase">{cfg.category}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Active Weapon Telemetry Box */}
                <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-black font-mono text-white uppercase">{activeWeaponCfg.name}</h3>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">{activeWeaponCfg.category} CLASS</span>
                    </div>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-400 font-bold">
                      {currentCamo} CAMO
                    </span>
                  </div>

                  {/* Weapon Real-Time Ballistic Progress Bars */}
                  <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-900 text-[10px] font-mono">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-0.5">
                        <span>DAMAGE</span>
                        <b className="text-cyan-300">{activeWeaponCfg.damage} HP</b>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${Math.min(100, (activeWeaponCfg.damage / 140) * 100)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-0.5">
                        <span>FIRE RATE</span>
                        <b className="text-cyan-300">{activeWeaponCfg.fireRateRpm} RPM</b>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${Math.min(100, (activeWeaponCfg.fireRateRpm / 950) * 100)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-0.5">
                        <span>EFFECTIVE RANGE</span>
                        <b className="text-cyan-300">{activeWeaponCfg.range} METERS</b>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${Math.min(100, (activeWeaponCfg.range / 220) * 100)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-0.5">
                        <span>MAGAZINE CAPACITY</span>
                        <b className="text-cyan-300">{activeWeaponCfg.magSize} ROUNDS</b>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${Math.min(100, (activeWeaponCfg.magSize / 35) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tactical Utility Info Pills */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 flex items-center gap-2">
                    <Bomb className="w-3.5 h-3.5 text-amber-400" />
                    <span>[G] Frag (×2)</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>[Q] Tactical (×2)</span>
                  </div>
                </div>
              </div>

              {/* BOT MATCH TUNING HUB */}
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800/90 shadow-md flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> AI OPERATIVE SQUAD TUNING
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{settings.botCount} TOTAL TARGETS</span>
                </div>

                {/* Bot Count Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-400 w-12">COUNT:</span>
                  <div className="grid grid-cols-5 gap-1 flex-1">
                    {[2, 4, 6, 8, 10].map(cnt => (
                      <button
                        key={cnt}
                        onClick={() => setSettings(s => ({ ...s, botCount: cnt }))}
                        className={`py-1 rounded border text-center font-mono text-[10px] font-bold transition-all cursor-pointer ${
                          settings.botCount === cnt
                            ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cnt} AI
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bot Difficulty Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-slate-400 w-12">LEVEL:</span>
                  <div className="grid grid-cols-4 gap-1 flex-1">
                    {(['recruit', 'regular', 'hardened', 'veteran'] as const).map(diff => (
                      <button
                        key={diff}
                        onClick={() => setSettings(s => ({ ...s, botDifficulty: diff }))}
                        className={`py-1 rounded border text-center font-mono text-[10px] font-bold transition-all uppercase cursor-pointer ${
                          settings.botDifficulty === diff
                            ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Graphics Engine & Atmosphere Presets */}
              <div className="grid grid-cols-2 gap-3">
                {/* Graphics Mode */}
                <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/90 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase text-cyan-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> GRAPHICS
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase">
                      {(settings.graphicsMode || 'standard') === 'extreme' ? 'RTX' : (settings.graphicsMode || 'standard')}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'smooth', label: '144 FPS' },
                      { id: 'standard', label: 'STD' },
                      { id: 'extreme', label: 'RTX' },
                    ].map(g => (
                      <button
                        key={g.id}
                        onClick={() => handleSelectGraphicsMode(g.id as GraphicsMode)}
                        className={`py-1.5 rounded border text-center font-mono text-[9px] font-bold transition-all cursor-pointer ${
                          (settings.graphicsMode || 'standard') === g.id
                            ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Atmosphere Preset */}
                <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800/90 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase text-cyan-400 flex items-center gap-1">
                      <CloudSunRain className="w-3 h-3" /> ATMOSPHERE
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">[T] KEY</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'clear_day', label: 'DAY', icon: Sun },
                      { id: 'golden_sunset', label: 'DUSK', icon: Sunset },
                      { id: 'midnight_fog', label: 'NIGHT', icon: Moon },
                    ].map(w => (
                      <button
                        key={w.id}
                        onClick={() => handleSelectWeather(w.id as WeatherType)}
                        className={`py-1.5 rounded border flex flex-col items-center justify-center gap-0.5 font-mono text-[9px] font-bold transition-all cursor-pointer ${
                          settings.weatherPreset === w.id
                            ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <w.icon className="w-3 h-3" />
                        <span>{w.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* BOTTOM TACTICAL KEYBINDINGS STRIP */}
          <footer className="relative z-10 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono text-slate-400">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              <span className="flex items-center gap-1">
                <span className="text-slate-500 font-bold">MOVE:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400 font-bold">WASD</kbd>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-slate-500 font-bold">SPRINT:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400 font-bold">SHIFT (×2 TAC)</kbd>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-slate-500 font-bold">SLIDE / CROUCH:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400 font-bold">C / CTRL</kbd>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-slate-500 font-bold">AIM:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400 font-bold">R-CLICK</kbd>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-slate-500 font-bold">FIRE:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400 font-bold">L-CLICK</kbd>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-slate-500 font-bold">RELOAD:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400 font-bold">R</kbd>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-slate-500 font-bold">MELEE:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400 font-bold">V</kbd>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-slate-500 font-bold">GUNSMITH:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400 font-bold">B</kbd>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-slate-500 font-bold">LEAN:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400 font-bold">&lt; / &gt;</kbd>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-slate-500 font-bold">PAUSE:</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-400 font-bold">ESC</kbd>
              </span>
            </div>

            <span className="text-slate-500 font-bold">
              FRONTLINE OPS // SUB-STEPPED RIGID PHYSICS // BUILD 2026.9
            </span>
          </footer>
        </div>
      )}
    </main>
  );
}
