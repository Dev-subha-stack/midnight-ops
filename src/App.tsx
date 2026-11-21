import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
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
  OperatorCamo,
} from './types';
import { HUD } from './components/HUD';
import { Scoreboard } from './components/Scoreboard';
import { GunsmithModal } from './components/GunsmithModal';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal } from './components/GameOverModal';
import { PauseMenu } from './components/PauseMenu';
import { MobileGamepad } from './components/MobileGamepad';
import { MobileHudCustomizer } from './components/MobileHudCustomizer';
import { CharacterModelLoader } from './game/character_loader';
import { ModelFactory } from './game/models';
import { isTouchCapableDevice } from './game/gamepad';
import {
  loadMobileLayout,
  MobileControlLayoutConfig,
  saveMobileLayout,
} from './game/mobile_layout';
import {
  Play,
  Crosshair,
  Sliders,
  Users,
  Target,
  Flame,
  Award,
  Sun,
  Sunset,
  Moon,
  ShieldAlert,
  Volume2,
  Link2,
  Check,
  ChevronRight,
  Gamepad2,
} from 'lucide-react';
import { soundManager } from './game/audio';
import { DEFAULT_WEAPON_OPTICS, OPTIC_REGISTRY, WEAPON_REGISTRY } from './game/weapons';

const GAME_VERSION_NUM = '3.5';
const GAME_VERSION = `v${GAME_VERSION_NUM}`;

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Game Life Cycle States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isPointerLocked, setIsPointerLocked] = useState<boolean>(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState<boolean>(false);
  const [isGunsmithOpen, setIsGunsmithOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHudCustomizerOpen, setIsHudCustomizerOpen] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isVictory, setIsVictory] = useState<boolean>(false);
  const [easterEggVictory, setEasterEggVictory] = useState<string | null>(null);
  const [lobbyModelRevision, setLobbyModelRevision] = useState<number>(0);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  const [detectedTouchDevice, setDetectedTouchDevice] = useState<boolean>(() => isTouchCapableDevice());
  const [mobileControlLayout, setMobileControlLayout] = useState<MobileControlLayoutConfig>(() => loadMobileLayout());

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
  const [currentOperatorCamo, setCurrentOperatorCamo] = useState<OperatorCamo>('allies_multicam');
  const [ammoInMag, setAmmoInMag] = useState<number>(30);
  const [ammoReserve, setAmmoReserve] = useState<number>(120);
  const [grenadesCount, setGrenadesCount] = useState<number>(2);
  const [tacticalCount, setTacticalCount] = useState<number>(2);
  const [tacticalType, setTacticalType] = useState<import('./types').TacticalType>('smoke');
  const [laserActive, setLaserActive] = useState<boolean>(true);
  const [isAiming, setIsAiming] = useState<boolean>(false);
  const [isReloading, setIsReloading] = useState<boolean>(false);
  const [isSprinting, setIsSprinting] = useState<boolean>(false);
  const [isAutoRunning, setIsAutoRunning] = useState<boolean>(false);
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
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [hitmarker, setHitmarker] = useState<HitmarkerEvent | null>(null);
  const [pickupNotice, setPickupNotice] = useState<{ text: string; type: 'ammo' | 'armor' | 'stimpack' | 'tactical' } | null>(null);
  const [accolades, setAccolades] = useState<EliminationAccolade[]>([]);
  const [damageAngle, setDamageAngle] = useState<number | null>(null);

  const [streaks, setStreaks] = useState<ScorestreakItem[]>([
    { id: 'uav', name: 'UAV Radar', cost: 3, ready: false, icon: 'radar', description: '' },
    { id: 'airstrike', name: 'Precision Airstrike', cost: 5, ready: false, icon: 'plane', description: '' },
    { id: 'sentry', name: 'Sentry Turret', cost: 7, ready: false, icon: 'shield-alert', description: '' },
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
  const [radioCallout, setRadioCallout] = useState<{ name: string; team: 'allies' | 'axis'; role?: string; text: string; time: number } | null>(null);
  const [battleRoyaleState, setBattleRoyaleState] = useState<BattleRoyaleState | null>(null);
  const [leanState, setLeanState] = useState<LeanDirection>('none');
  const [leanFactor, setLeanFactor] = useState<number>(0);

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
    minimapShape: 'square',
    touchControlsMode: 'auto',
  });

  const touchMode = settings.touchControlsMode || 'auto';
  const isMobileControlsActive =
    touchMode === 'on' || (touchMode === 'auto' && detectedTouchDevice);

  // Start / Init Engine
  const startMission = async (overrideMode?: GameMode) => {
    soundManager.init();
    await Promise.allSettled([
      !CharacterModelLoader.hasCustomModel() ? CharacterModelLoader.initDefaultModel() : Promise.resolve(null),
      CharacterModelLoader.preloadAllBotModels(),
    ]);
    const modeToUse = overrideMode || gameMode;
    const effectiveMap = modeToUse === 'battleroyale' ? 'bermuda' : selectedMap;
    setSettings(prev => ({ ...prev, mapType: effectiveMap }));
    setIsPlaying(true);
    setIsGameOver(false);
    setIsPaused(false);
  };

  useEffect(() => {
    const handleGesture = () => {
      soundManager.init();
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('keydown', handleGesture);
    };
    const handlePointerDetect = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        setDetectedTouchDevice(true);
      }
    };
    const coarseMq = typeof window.matchMedia === 'function' ? window.matchMedia('(pointer: coarse)') : null;
    const handleMqChange = () => setDetectedTouchDevice(isTouchCapableDevice());

    window.addEventListener('pointerdown', handleGesture, { passive: true });
    window.addEventListener('pointerdown', handlePointerDetect, { passive: true });
    window.addEventListener('keydown', handleGesture, { passive: true });
    coarseMq?.addEventListener?.('change', handleMqChange);
    return () => {
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('pointerdown', handlePointerDetect);
      window.removeEventListener('keydown', handleGesture);
      coarseMq?.removeEventListener?.('change', handleMqChange);
    };
  }, []);

  // Preload default 3D soldier & enemy GLB roster & refresh Lobby 3D Stage once loaded
  useEffect(() => {
    Promise.allSettled([
      CharacterModelLoader.initDefaultModel(),
      CharacterModelLoader.preloadAllBotModels(),
    ])
      .then(() => setLobbyModelRevision(r => r + 1))
      .catch(err => {
        console.warn('[App] Preloading default 3D model:', err);
      });
  }, []);

  // Refresh lobby stage whenever Gunsmith closes (in case custom model or orientation changed)
  useEffect(() => {
    if (!isGunsmithOpen) {
      setLobbyModelRevision(r => r + 1);
    }
  }, [isGunsmithOpen]);

  // Lobby keyboard shortcut [Enter] / [Space] to deploy
  useEffect(() => {
    if (isPlaying || isGunsmithOpen || isSettingsOpen || isHudCustomizerOpen) return;
    const handleLobbyKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
        e.preventDefault();
        startMission();
      }
    };
    window.addEventListener('keydown', handleLobbyKey);
    return () => window.removeEventListener('keydown', handleLobbyKey);
  }, [isPlaying, isGunsmithOpen, isSettingsOpen, isHudCustomizerOpen, gameMode, selectedMap]);

  // Sync URL game version (?v=3.1) & auto-deploy via URL parameter (?play=1 or ?autostart=1 or ?deploy=1)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.get('v') !== GAME_VERSION_NUM) {
        url.searchParams.set('v', GAME_VERSION_NUM);
        window.history.replaceState({}, '', `${url.pathname}?${url.searchParams.toString()}`);
      }
      if (!isPlaying && (url.searchParams.get('play') === '1' || url.searchParams.get('autostart') === '1' || url.searchParams.get('deploy') === '1')) {
        startMission();
      }
    }
  }, []);

  useEffect(() => {
    if (!isPlaying || !canvasContainerRef.current) return;

    const engine = new GameEngine(canvasContainerRef.current, settings, gameMode);
    engine.controller.setMobileControlsEnabled(isMobileControlsActive);
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
    engine.onRadioCallout = callout => {
      setRadioCallout(callout);
    };
    engine.onStreakUpdate = updatedStreaks => setStreaks([...updatedStreaks]);
    engine.onMatchEnd = (victory, finalStats, reason) => {
      setIsVictory(victory);
      setEasterEggVictory(reason || null);
      setIsGameOver(true);
      setStats(finalStats);
      document.exitPointerLock?.();
    };

    engine.onEnvironmentUpdate = envState => {
      setEnvironment(envState);
    };

    engine.onTacticalUpdate = (count, type) => {
      setTacticalCount(count);
      setTacticalType(type);
    };

    engine.onMotionDetectNotice = detectedIds => {
      setPickupNotice({
        text: `MOTION SENSOR: ${detectedIds.length} HOSTILE(S) DETECTED`,
        type: 'tactical',
      });
      setTimeout(() => setPickupNotice(null), 3000);
    };

    engine.onTrainingTelemetry = data => {
      setTrainingTelemetry(data);
    };

    engine.onFloatingNumbersUpdate = items => {
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
        setIsAutoRunning(engine.controller.isMobileAutoRun());
        setCurrentWeapon(engine.controller.currentWeapon);
        const activeOptic =
          engine.controller.equippedOptics[engine.controller.currentWeapon] ||
          DEFAULT_WEAPON_OPTICS[engine.controller.currentWeapon] ||
          'holo_553';
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
        setIsMounted(engine.controller.isMounted);
        setLeanState(engine.controller.leanState);
        setLeanFactor(engine.controller.currentLeanFactor);
      }
      frameId = requestAnimationFrame(syncHud);
    };
    frameId = requestAnimationFrame(syncHud);

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
      const isLocked =
        document.pointerLockElement === canvasContainerRef.current || document.pointerLockElement === document.body;
      setIsPointerLocked(isLocked);
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

  useEffect(() => {
    engineRef.current?.controller.setMobileControlsEnabled(isMobileControlsActive);
    if (isMobileControlsActive && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }, [isMobileControlsActive]);

  useEffect(() => {
    if (isGunsmithOpen || isSettingsOpen || isHudCustomizerOpen) {
      if (engineRef.current && !engineRef.current.isPaused) {
        engineRef.current.setPaused(true);
        setIsPaused(true);
      }
    }
  }, [isGunsmithOpen, isSettingsOpen, isHudCustomizerOpen]);

  const handleResume = () => {
    setIsPaused(false);
    if (engineRef.current) {
      engineRef.current.setPaused(false);
    }
    if (!isMobileControlsActive) {
      canvasContainerRef.current?.requestPointerLock();
    }
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setIsGameOver(false);
    setIsPaused(false);
    setEasterEggVictory(null);
    setTimeout(() => {
      startMission();
    }, 100);
  };

  const handleReturnToHomescreen = () => {
    setIsPlaying(false);
    setIsGameOver(false);
    setIsPaused(false);
    setEasterEggVictory(null);
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
    reticleStyle?: ReticleStyle,
    _tactical?: import('./types').TacticalType,
    operatorCamo?: OperatorCamo
  ) => {
    const resolvedCamo = camo ?? currentCamo;
    const resolvedOptic =
      optic ?? engineRef.current?.controller.equippedOptics[weapon] ?? DEFAULT_WEAPON_OPTICS[weapon] ?? 'holo_553';
    const resolvedColor = reticleColor ?? engineRef.current?.controller.opticReticleColors[weapon] ?? currentReticleColor;
    const resolvedStyle = reticleStyle ?? engineRef.current?.controller.opticReticleStyles[weapon] ?? currentReticleStyle;

    setCurrentWeapon(weapon);
    setCurrentCamo(resolvedCamo);
    setCurrentOptic(resolvedOptic);
    setCurrentReticleColor(resolvedColor);
    setCurrentReticleStyle(resolvedStyle);
    if (operatorCamo) {
      setCurrentOperatorCamo(operatorCamo);
      if (engineRef.current) {
        engineRef.current.setOperatorCamo(operatorCamo);
      }
    }
    if (engineRef.current) {
      engineRef.current.controller.equipWeapon(weapon, resolvedCamo, resolvedOptic, resolvedColor, resolvedStyle);
    }
  };

  const handleDeployTactical = () => {
    engineRef.current?.controller.deployTactical();
  };

  const handleToggleTacticalType = () => {
    engineRef.current?.controller.toggleTacticalType();
  };

  const handleActivateStreak = (id: 'uav' | 'airstrike' | 'sentry' | 'nuke') => {
    engineRef.current?.activateScorestreak(id);
  };

  const handleToggleWeather = () => {
    if (engineRef.current) {
      const nextW = engineRef.current.toggleWeatherPreset();
      setPickupNotice({ text: `ATMOSPHERE: ${nextW.toUpperCase().replace('_', ' ')}`, type: 'ammo' });
    }
  };

  const handleResetTrainingTargets = () => {
    engineRef.current?.trainingManager?.resetAllTargets();
  };

  const handleSelectWeather = (weather: WeatherType) => {
    if (engineRef.current) {
      engineRef.current.setWeatherPreset(weather);
      setPickupNotice({ text: `ATMOSPHERE: ${weather.toUpperCase().replace('_', ' ')}`, type: 'ammo' });
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
        text: `GRAPHICS: ${mode.toUpperCase()}${mode === 'extreme' ? ' (RTX)' : ''}`,
        type: 'ammo',
      });
    }
  };

  const handleCopyVersionUrl = () => {
    const cleanUrl = `${window.location.origin}/?v=${GAME_VERSION_NUM}`;
    navigator.clipboard?.writeText(cleanUrl).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const activeWeaponCfg = WEAPON_REGISTRY[currentWeapon];

  const playlistModes: {
    id: GameMode;
    title: string;
    subtitle: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    {
      id: 'tdm',
      title: 'Team Deathmatch',
      subtitle: '5v5 Squad Combat',
      desc: 'Task Force 141 vs KORTAC. First squad to 50 eliminations secures the sector.',
      icon: Users,
    },
    {
      id: 'battleroyale',
      title: 'Battle Royale',
      subtitle: 'Bermuda · Free Fire Rules',
      desc: '220×220m island drop with EP inhalers, gliders, red danger zones & Booyah victory.',
      icon: ShieldAlert,
    },
    {
      id: 'ffa',
      title: 'Free For All',
      subtitle: 'Solo Skirmish',
      desc: 'Every operative for themselves. Fast respawns and relentless close-quarters action.',
      icon: Flame,
    },
    {
      id: 'gungame',
      title: 'Gun Game',
      subtitle: '10-Tier Escalation',
      desc: 'Advance through 10 firearms with every elimination to claim tactical supremacy.',
      icon: Award,
    },
    {
      id: 'training',
      title: 'Firing Range',
      subtitle: 'Live DPS & Ballistics',
      desc: 'Moving armored steel targets, rangefinder telemetry, and real-time accuracy tracking.',
      icon: Target,
    },
  ];

  const activePlaylist = playlistModes.find(p => p.id === gameMode) || playlistModes[0];

  const activeOpticCfg = OPTIC_REGISTRY[currentOptic];
  const canHoldBreath = isAiming && Boolean(activeOpticCfg && (activeOpticCfg.magnification >= 2.0 || activeOpticCfg.variableZoomSteps));

  return (
    <main id="app-root" className="fixed inset-0 w-full h-full bg-[#090B0E] overflow-hidden select-none">
      {/* 3D WebGL Game Viewport */}
      {isPlaying && (
        <div
          id="webgl-canvas-container"
          ref={canvasContainerRef}
          onClick={() => {
            if (!isPointerLocked && !isMobileControlsActive) {
              try {
                canvasContainerRef.current?.requestPointerLock();
              } catch {
                // Iframe sandbox fallback
              }
            }
          }}
          className="absolute inset-0 w-full h-full cursor-crosshair z-0"
        />
      )}

      {/* Pointer Lock Prompt (Desktop Only) */}
      {isPlaying && !isGameOver && !isPaused && !isPointerLocked && !isGunsmithOpen && !isSettingsOpen && !isHudCustomizerOpen && !isMobileControlsActive && (
        <div
          onClick={() => {
            try {
              canvasContainerRef.current?.requestPointerLock();
            } catch {
              // Iframe sandbox fallback
            }
          }}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-sm bg-[#0C0F14]/92 border border-[#A3E635]/70 text-[#A3E635] font-mono text-xs font-bold tracking-widest uppercase backdrop-blur-md cursor-pointer flex items-center gap-2"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>Click Viewport to Lock Aim</span>
        </div>
      )}

      {/* IN-GAME HUD */}
      {isPlaying && !isGameOver && (
        <HUD
          stats={stats}
          gameMode={gameMode}
          battleRoyaleState={battleRoyaleState}
          minimapShape={settings.minimapShape || 'square'}
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
          isMounted={isMounted}
          leanState={leanState}
          leanFactor={leanFactor}
          onToggleLean={dir => engineRef.current?.controller.toggleLean(dir)}
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
          radioCallout={radioCallout}
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
          mobileControlsActive={isMobileControlsActive}
        />
      )}

      {/* VIRTUAL MOBILE GAMEPAD (rokobuljan/gamepad template + Free Fire / BGMI Layout) */}
      {isPlaying && !isGameOver && !isPaused && !isGunsmithOpen && !isSettingsOpen && !isHudCustomizerOpen && isMobileControlsActive && (
        <MobileGamepad
          controller={engineRef.current?.controller || null}
          layoutConfig={mobileControlLayout}
          isAiming={isAiming}
          isSprinting={isSprinting}
          isAutoRunning={isAutoRunning}
          isTacSprinting={stats.isTacSprinting}
          isReloading={isReloading}
          grenadesCount={grenadesCount}
          tacticalCount={tacticalCount}
          tacticalType={tacticalType}
          canHoldBreath={canHoldBreath}
          isHoldingBreath={isHoldingBreath}
          onTogglePause={() => {
            if (!isGameOver && engineRef.current) {
              setIsPaused(true);
              engineRef.current.setPaused(true);
            }
          }}
          onOpenGunsmith={() => setIsGunsmithOpen(true)}
          onToggleScoreboard={() => setIsScoreboardOpen(prev => !prev)}
          onOpenCustomizer={() => setIsHudCustomizerOpen(true)}
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
          currentTactical={tacticalType}
          currentOperatorCamo={currentOperatorCamo}
          onSelectWeapon={handleSelectWeapon}
          onSelectTactical={t => setTacticalType(t)}
          onSelectOperatorCamo={camo => {
            setCurrentOperatorCamo(camo);
            if (engineRef.current) {
              engineRef.current.setOperatorCamo(camo);
            }
          }}
          onClose={() => {
            setIsGunsmithOpen(false);
            if (isPlaying && !isGameOver && !isMobileControlsActive) {
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
          onOpenHudCustomizer={() => {
            setIsSettingsOpen(false);
            setIsHudCustomizerOpen(true);
          }}
          onClose={() => {
            setIsSettingsOpen(false);
            if (isPlaying && !isGameOver && !isMobileControlsActive) {
              canvasContainerRef.current?.requestPointerLock();
            }
          }}
        />
      )}

      {/* FREE FIRE / BGMI MOBILE CONTROLS CUSTOMIZER */}
      {isHudCustomizerOpen && (
        <MobileHudCustomizer
          initialLayout={mobileControlLayout}
          onSave={nextLayout => {
            const saved = saveMobileLayout(nextLayout);
            setMobileControlLayout(saved);
            if (engineRef.current) {
              engineRef.current.controller.mobileLookSensitivity = saved.lookSensitivity;
            }
            setIsHudCustomizerOpen(false);
            if (isPlaying && !isGameOver) {
              setIsPaused(false);
              engineRef.current?.setPaused(false);
            }
          }}
          onCancel={() => {
            setIsHudCustomizerOpen(false);
          }}
        />
      )}

      {/* PAUSE MENU */}
      {isPaused && isPlaying && !isGameOver && !isGunsmithOpen && !isSettingsOpen && !isHudCustomizerOpen && (
        <PauseMenu
          gameMode={gameMode}
          currentWeather={environment.weather}
          graphicsMode={settings.graphicsMode || 'standard'}
          onResume={handleResume}
          onOpenGunsmith={() => setIsGunsmithOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenHudCustomizer={() => setIsHudCustomizerOpen(true)}
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
          easterEgg={easterEggVictory}
          onPlayAgain={handleRestart}
          onReturnToHome={handleReturnToHomescreen}
        />
      )}

      {/* CALL OF DUTY HQ LOBBY */}
      {!isPlaying && (
        <div
          id="start-screen"
          className="absolute inset-0 z-40 h-screen w-screen overflow-hidden flex flex-col justify-between bg-[#090B0E] text-zinc-100"
        >
          {/* Live Full-Bleed 3D Operator Backdrop Stage */}
          <LobbyOperatorStage
            weapon={currentWeapon}
            operatorCamo={currentOperatorCamo}
            revision={lobbyModelRevision}
          />

          {/* Subtle Studio Grid & Directional Contrast Scrims */}
          <div className="absolute inset-0 cod-grid-bg pointer-events-none opacity-45" />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, rgba(9,11,14,0.92) 0%, rgba(9,11,14,0.72) 38%, rgba(9,11,14,0.12) 72%, rgba(9,11,14,0.55) 100%)',
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(180deg, rgba(9,11,14,0.88) 0%, rgba(9,11,14,0) 18%, rgba(9,11,14,0) 64%, rgba(9,11,14,0.96) 100%)',
            }}
          />

          {/* TOP THREE-ZONE COD HQ BAR */}
          <header className="relative z-10 flex items-center justify-between gap-4 px-5 sm:px-8 py-3.5 border-b border-white/10">
            {/* Zone 1: Brand Wordmark (No Pill Badge) */}
            <div className="flex items-baseline gap-3 shrink-0">
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-wider text-white uppercase leading-none">
                FRONTLINE OPS
              </h1>
              <span className="font-mono text-[11px] font-bold text-[#A3E635] uppercase tracking-widest">
                {GAME_VERSION}
              </span>
            </div>

            {/* Zone 2: Single-Line Navigation Tabs */}
            <nav className="flex items-center gap-1 sm:gap-2 font-mono text-xs overflow-x-auto">
              <button
                className="px-3.5 py-1.5 border-b-2 border-[#A3E635] text-white font-bold tracking-wider uppercase whitespace-nowrap shrink-0 cursor-pointer"
              >
                Play
              </button>

              <button
                id="btn-nav-gunsmith"
                onClick={() => setIsGunsmithOpen(true)}
                className="px-3.5 py-1.5 border-b-2 border-transparent hover:border-white/30 text-zinc-400 hover:text-white font-semibold tracking-wider uppercase transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Gunsmith [B]
              </button>

              <button
                id="btn-nav-training"
                onClick={() => {
                  setGameMode('training');
                  startMission('training');
                }}
                className="px-3.5 py-1.5 border-b-2 border-transparent hover:border-white/30 text-zinc-400 hover:text-white font-semibold tracking-wider uppercase transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Firing Range
              </button>

              <button
                id="btn-nav-settings"
                onClick={() => setIsSettingsOpen(true)}
                className="px-3.5 py-1.5 border-b-2 border-transparent hover:border-white/30 text-zinc-400 hover:text-white font-semibold tracking-wider uppercase transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Settings
              </button>
            </nav>

            {/* Zone 3: Operator & Utility Cluster */}
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                id="btn-toggle-touch-gamepad"
                onClick={() =>
                  setSettings(prev => ({
                    ...prev,
                    touchControlsMode: isMobileControlsActive ? 'off' : 'on',
                  }))
                }
                title="Toggle Mobile Touch Controls"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[34px] ${
                  isMobileControlsActive
                    ? 'bg-[#192014] border-[#A3E635] text-[#A3E635]'
                    : 'bg-[#141820]/90 hover:bg-[#1C222D] border-white/10 text-zinc-300 hover:text-white'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isMobileControlsActive ? 'Touch Pad On' : 'Touch Pad'}</span>
              </button>

              <button
                id="btn-lobby-custom-hud"
                onClick={() => setIsHudCustomizerOpen(true)}
                title="Customize Free Fire / BGMI Mobile Controls Layout"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-[#141820]/90 hover:bg-[#1C222D] border border-white/10 hover:border-[#A3E635]/60 text-[11px] font-mono text-zinc-200 hover:text-[#A3E635] transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[34px]"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Custom HUD</span>
              </button>

              <button
                id="btn-test-audio"
                onClick={() => {
                  soundManager.init();
                  soundManager.playGunshot(currentWeapon, false);
                }}
                title="Audition weapon gunshot audio"
                className="p-2 rounded-sm bg-[#141820]/90 hover:bg-[#1C222D] border border-white/10 text-zinc-300 hover:text-[#A3E635] transition-colors cursor-pointer shrink-0"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleCopyVersionUrl}
                title={`Copy ${GAME_VERSION} launch link`}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm bg-[#141820]/90 hover:bg-[#1C222D] border border-white/10 text-[11px] font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {linkCopied ? <Check className="w-3.5 h-3.5 text-[#A3E635]" /> : <Link2 className="w-3.5 h-3.5 text-zinc-400" />}
                <span>{linkCopied ? `Copied ${GAME_VERSION}` : `Share ${GAME_VERSION}`}</span>
              </button>

              <div className="flex items-center gap-2.5 bg-[#12151B]/90 px-3 py-1.5 rounded-sm border border-white/10 tabular-nums shrink-0">
                <div className="w-7 h-7 rounded-sm bg-[#A3E635] text-[#090B0E] font-display font-extrabold text-base flex items-center justify-center leading-none">
                  55
                </div>
                <div className="hidden md:flex flex-col text-left leading-tight">
                  <span className="text-[11px] font-mono font-bold text-white uppercase">GHOST · TF-141</span>
                  <span className="text-[10px] font-mono text-zinc-400">
                    K/D <b className="text-[#A3E635]">2.85</b> · WIN <b className="text-white">74%</b>
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* CENTER WORKSPACE: LEFT MISSION CONFIG + LIVE 3D OPERATOR CENTER-RIGHT */}
          <div className="relative z-10 flex-1 flex items-center justify-between px-5 sm:px-8 py-4 overflow-y-auto lg:overflow-hidden pointer-events-none">
            {/* Left Tactical Config Column */}
            <div className="w-full max-w-md flex flex-col gap-3.5 pointer-events-auto">
              {/* Active Mode Headline */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.2em] text-[#A3E635]">
                  {activePlaylist.subtitle}
                </span>
                <h2 className="font-display text-4xl sm:text-5xl font-extrabold uppercase tracking-wide text-white leading-none">
                  {activePlaylist.title}
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mt-1">
                  {activePlaylist.desc}
                </p>
              </div>

              {/* Combat Map Selector */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase text-zinc-400">
                  <span>Operation Map</span>
                  <span className="text-zinc-300">
                    {gameMode === 'battleroyale' ? 'BERMUDA LOCKED' : 'SELECT THEATER'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'warehouse', name: 'Cargo Terminal', size: '80×80M', disabled: gameMode === 'battleroyale' },
                    { id: 'outpost', name: 'FOB Sandstorm', size: '100×100M', disabled: gameMode === 'battleroyale' },
                    { id: 'bermuda', name: 'Bermuda Island', size: '220×220M', disabled: false },
                  ].map(m => {
                    const isCur = (gameMode === 'battleroyale' ? 'bermuda' : selectedMap) === m.id;
                    return (
                      <button
                        key={m.id}
                        disabled={m.disabled}
                        onClick={() => setSelectedMap(m.id as MapType)}
                        className={`p-2 rounded-sm border text-left transition-all cursor-pointer ${
                          m.disabled
                            ? 'opacity-35 cursor-not-allowed bg-[#0D1014] border-white/5'
                            : isCur
                            ? 'bg-[#192014]/95 border-[#A3E635] text-white'
                            : 'bg-[#11141A]/85 border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-200'
                        }`}
                      >
                        <div className="text-[11px] font-mono font-bold uppercase text-white truncate">{m.name}</div>
                        <div className="text-[9px] font-mono text-zinc-400 tabular-nums">{m.size}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Loadout Quick Switcher */}
              <div className="bg-[#101319]/90 backdrop-blur-md p-3 rounded-sm border border-white/10 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase">
                  <span className="text-zinc-400 font-semibold">
                    Loadout · <b className="text-white">{activeWeaponCfg.name}</b>
                  </span>
                  <button
                    onClick={() => setIsGunsmithOpen(true)}
                    className="text-[#A3E635] hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Gunsmith [B]</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
                  {(['m4', 'ak47', 'scar', 'mp5', 'vector', 'shotgun', 'sniper', 'deagle'] as WeaponType[]).map(wId => {
                    const isCur = currentWeapon === wId;
                    return (
                      <button
                        key={wId}
                        onClick={() => {
                          setCurrentWeapon(wId);
                          soundManager.init();
                          soundManager.playGunshot(wId, false);
                        }}
                        className={`py-1 rounded-sm border text-center font-mono text-[10px] font-bold uppercase transition-all cursor-pointer ${
                          isCur
                            ? 'bg-[#A3E635] border-[#A3E635] text-[#090B0E]'
                            : 'bg-[#151921] border-white/8 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {wId === 'sniper' ? 'AX50' : wId === 'shotgun' ? 'M870' : wId.toUpperCase()}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-1 border-t border-white/8 tabular-nums">
                  <span>
                    DMG <b className="text-white">{activeWeaponCfg.damage}</b> · RPM{' '}
                    <b className="text-white">{activeWeaponCfg.fireRateRpm}</b> · MAG{' '}
                    <b className="text-white">{activeWeaponCfg.magSize}</b>
                  </span>
                  <button
                    onClick={() => setIsGunsmithOpen(true)}
                    className="text-zinc-300 hover:text-[#A3E635] truncate max-w-[140px] cursor-pointer"
                    title="Change 3D Operator Model"
                  >
                    Rig: {CharacterModelLoader.getActiveModelName()}
                  </button>
                </div>
              </div>

              {/* Match Tuning Strip: Bots, Difficulty, Graphics, Atmosphere */}
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div className="bg-[#101319]/90 p-2.5 rounded-sm border border-white/10 flex flex-col gap-1.5">
                  <div className="flex justify-between text-zinc-400 uppercase">
                    <span>Bots</span>
                    <span className="text-white font-bold tabular-nums">{settings.botCount} AI</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[2, 4, 6, 8, 10].map(cnt => (
                      <button
                        key={cnt}
                        onClick={() => setSettings(s => ({ ...s, botCount: cnt }))}
                        className={`py-1 rounded-sm border text-center font-bold cursor-pointer tabular-nums ${
                          settings.botCount === cnt
                            ? 'bg-[#1A2115] border-[#A3E635] text-[#A3E635]'
                            : 'bg-[#141820] border-white/8 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#101319]/90 p-2.5 rounded-sm border border-white/10 flex flex-col gap-1.5">
                  <div className="flex justify-between text-zinc-400 uppercase">
                    <span>AI Skill</span>
                    <span className="text-white font-bold uppercase">{settings.botDifficulty}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {(['recruit', 'regular', 'hardened', 'veteran'] as const).map(diff => (
                      <button
                        key={diff}
                        onClick={() => setSettings(s => ({ ...s, botDifficulty: diff }))}
                        className={`py-1 rounded-sm border text-center font-bold uppercase cursor-pointer ${
                          settings.botDifficulty === diff
                            ? 'bg-[#1A2115] border-[#A3E635] text-[#A3E635]'
                            : 'bg-[#141820] border-white/8 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {diff.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#101319]/90 p-2.5 rounded-sm border border-white/10 flex flex-col gap-1.5">
                  <div className="flex justify-between text-zinc-400 uppercase">
                    <span>Graphics</span>
                    <span className="text-[#A3E635] font-bold uppercase">
                      {(settings.graphicsMode || 'standard') === 'extreme'
                        ? 'RTX'
                        : settings.graphicsMode === 'smooth'
                        ? '144FPS'
                        : 'HD'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'smooth', label: '144' },
                      { id: 'standard', label: 'HD' },
                      { id: 'extreme', label: 'RTX' },
                    ].map(g => (
                      <button
                        key={g.id}
                        onClick={() => handleSelectGraphicsMode(g.id as GraphicsMode)}
                        className={`py-1 rounded-sm border text-center font-bold cursor-pointer ${
                          (settings.graphicsMode || 'standard') === g.id
                            ? 'bg-[#1A2115] border-[#A3E635] text-[#A3E635]'
                            : 'bg-[#141820] border-white/8 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#101319]/90 p-2.5 rounded-sm border border-white/10 flex flex-col gap-1.5">
                  <div className="flex justify-between text-zinc-400 uppercase">
                    <span>Lighting</span>
                    <span className="text-zinc-300">[T]</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'clear_day', label: 'Day', icon: Sun },
                      { id: 'golden_sunset', label: 'Dusk', icon: Sunset },
                      { id: 'midnight_fog', label: 'Night', icon: Moon },
                    ].map(w => (
                      <button
                        key={w.id}
                        onClick={() => handleSelectWeather(w.id as WeatherType)}
                        className={`py-1 rounded-sm border flex items-center justify-center gap-1 font-bold uppercase cursor-pointer ${
                          settings.weatherPreset === w.id
                            ? 'bg-[#1A2115] border-[#A3E635] text-[#A3E635]'
                            : 'bg-[#141820] border-white/8 text-zinc-400 hover:text-white'
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

            {/* Right Interactive Operator Info Caption */}
            <div className="hidden lg:flex flex-col items-end text-right pointer-events-none self-end pb-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">
                Drag Character to Inspect
              </span>
              <span className="font-display text-2xl font-bold uppercase text-white tracking-wider">
                {CharacterModelLoader.getActiveModelName()}
              </span>
              <span className="text-xs font-mono text-[#A3E635]">
                Equipped: {activeWeaponCfg.name}
              </span>
            </div>
          </div>

          {/* BOTTOM COD HQ PLAYLIST DOCK + DEPLOY CTA */}
          <footer className="relative z-10 px-5 sm:px-8 pb-4 pt-2 flex flex-col gap-2.5">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-end gap-2.5">
              {/* Horizontal 5-Mode COD Playlist Strip */}
              <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-2">
                {playlistModes.map(m => {
                  const Icon = m.icon;
                  const isSelected = gameMode === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setGameMode(m.id)}
                      className={`relative text-left p-3 rounded-sm border transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'bg-[#171D15]/95 border-[#A3E635] text-white'
                          : 'bg-[#11141A]/90 border-white/10 text-zinc-400 hover:bg-[#171C24] hover:text-zinc-100'
                      }`}
                    >
                      {isSelected && <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#A3E635]" />}
                      <div className="flex items-center justify-between gap-2">
                        <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#A3E635]' : 'text-zinc-400'}`} />
                        <span className="text-[9px] font-mono uppercase text-zinc-500 truncate">{m.subtitle}</span>
                      </div>
                      <span className="font-display text-lg font-bold uppercase tracking-wide text-white leading-tight truncate">
                        {m.title}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Signature COD DEPLOY Button */}
              <button
                id="btn-start-game"
                onClick={() => startMission()}
                className="lg:w-64 py-4 px-6 bg-[#A3E635] hover:bg-[#BEF264] text-[#090B0E] font-display font-extrabold text-2xl uppercase tracking-widest rounded-sm cod-chamfer transition-all flex items-center justify-center gap-3 cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Play className="w-5 h-5 fill-[#090B0E]" />
                <span>DEPLOY</span>
                <span className="font-mono text-[10px] font-bold opacity-75">[ENTER]</span>
              </button>
            </div>

            {/* Quiet Bottom Controls & Build Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-zinc-500 border-t border-white/10 pt-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  <b className="text-zinc-300">WASD</b> Move
                </span>
                <span>
                  <b className="text-zinc-300">SHIFT</b> Tac Sprint
                </span>
                <span>
                  <b className="text-zinc-300">C</b> Slide
                </span>
                <span>
                  <b className="text-zinc-300">L-CLICK / R-CLICK</b> Fire / ADS
                </span>
                <span>
                  <b className="text-zinc-300">R</b> Reload
                </span>
                <span>
                  <b className="text-zinc-300">&lt; / &gt;</b> Peek
                </span>
                <span>
                  <b className="text-zinc-300">B</b> Gunsmith
                </span>
                <span>
                  <b className="text-zinc-300">ESC</b> Pause
                </span>
              </div>

              <span className="text-zinc-400 uppercase tracking-wider">
                Frontline Ops · {GAME_VERSION} · Sub-Stepped 3D Engine
              </span>
            </div>
          </footer>
        </div>
      )}
    </main>
  );
}

/**
 * Full-bleed live 3D COD Lobby Operator Backdrop Stage.
 * Renders the equipped 3D character holding the active firearm with drag-to-rotate.
 */
const LobbyOperatorStage: React.FC<{
  weapon: WeaponType;
  operatorCamo: OperatorCamo;
  revision: number;
}> = ({ weapon, operatorCamo, revision }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rotYRef = useRef<number>(-0.35);
  const draggingRef = useRef<boolean>(false);
  const lastXRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    // Offset camera left so the operator stands gracefully on the center-right open viewport
    camera.position.set(-0.55, 1.18, 3.1);
    camera.lookAt(-0.45, 0.96, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xdce3ec, 0.9);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.3);
    keyLight.position.set(2.5, 4.5, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const limeRim = new THREE.DirectionalLight(0xa3e635, 1.45);
    limeRim.position.set(-2.5, 2.4, -2.5);
    scene.add(limeRim);

    const coolFill = new THREE.DirectionalLight(0x38bdf8, 0.75);
    coolFill.position.set(2.0, 1.2, -2.2);
    scene.add(coolFill);

    // Subtle Hangar Pedestal
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.92, 0.05, 48),
      new THREE.MeshStandardMaterial({ color: 0x101318, roughness: 0.4, metalness: 0.85 })
    );
    pedestal.position.y = -0.025;
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.83, 0.85, 48),
      new THREE.MeshBasicMaterial({ color: 0xa3e635, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.002;
    scene.add(ring);

    const charGroup = new THREE.Group();
    scene.add(charGroup);

    const team = operatorCamo === 'axis_shadow' ? 'axis' : 'allies';
    const archetype =
      operatorCamo === 'spec_ops' ? 'flanker' : operatorCamo === 'desert_tan' ? 'sniper' : 'assault';
    const operatorMesh = ModelFactory.createBotMesh(team, archetype, weapon, {
      modelPreference: 'active',
    });
    charGroup.add(operatorMesh);

    let mixer: THREE.AnimationMixer | null = null;
    if (operatorMesh.userData.animations && operatorMesh.userData.animations.length > 0) {
      mixer = new THREE.AnimationMixer(operatorMesh);
      const clips = operatorMesh.userData.animations as THREE.AnimationClip[];
      const idleClip =
        clips.find((a) => a.name.toLowerCase().includes('idle')) ||
        clips.find((a) => a.name.toLowerCase().includes('tpose')) ||
        clips.find((a) => !/dance|samba/i.test(a.name));
      if (idleClip) {
        mixer.clipAction(idleClip).play();
      }
    }

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const onPointerDown = (e: PointerEvent) => {
      draggingRef.current = true;
      lastXRef.current = e.clientX;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - lastXRef.current;
      rotYRef.current += dx * 0.012;
      lastXRef.current = e.clientX;
    };
    const onPointerUp = () => {
      draggingRef.current = false;
    };

    window.addEventListener('resize', handleResize);
    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const clock = new THREE.Clock();
    let animId = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      if (!draggingRef.current) {
        rotYRef.current += 0.0025;
      }
      charGroup.rotation.y = rotYRef.current;
      if (mixer) {
        mixer.update(dt);
      }
      ModelFactory.alignHandWeaponSocket(operatorMesh, 0, 0, {
        stance: 'ready',
        weaponType: weapon,
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      if (mixer) mixer.stopAllAction();
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [weapon, operatorCamo, revision]);

  return <div ref={containerRef} className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing touch-none" />;
};
