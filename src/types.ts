export type WeaponType = 'm4' | 'mp5' | 'sniper' | 'shotgun' | 'deagle';

export type WeaponCamo = 'standard' | 'damascus' | 'gold' | 'woodland' | 'carbon';

export type OpticType = 'iron_sight' | 'reflex_dot' | 'red_dot_micro' | 'holo_553' | 'acog_4x' | 'sniper_variable' | 'thermal_flir' | 'thermal_ir';

export type ReticleColor = 'red' | 'green' | 'amber' | 'cyan';

export type ReticleStyle = 'dot' | 'cross' | 'chevron' | 'mildot_circle' | 'holo_ring' | 't_post';

export interface OpticAttachmentConfig {
  id: OpticType;
  name: string;
  category: string;
  desc?: string;
  description?: string;
  magnification: number; // e.g. 1.0, 1.35, 1.75, 4.0, 8.5
  adsFov: number; // Target Field of View
  adsSpeedMultiplier: number; // e.g. 1.15 (faster) or 0.85 (slower for heavy optics)
  swayMultiplier: number;
  compatibleWeapons: WeaponType[];
  isVariableZoom?: boolean;
  hasFullScopeOverlay?: boolean;
  hasThermalVision?: boolean;
  variableZoomSteps?: number[];
  zoomLevels?: { label: string; fov: number; mag: number }[];
  isThermal?: boolean;
  hasRangefinder?: boolean;
}

export interface RecoilPatternPoint {
  x: number; // Horizontal drift (yaw offset)
  y: number; // Vertical rise (pitch offset)
}

export interface WeaponConfig {
  id: WeaponType;
  name: string;
  category: 'Assault Rifle' | 'SMG' | 'Sniper Rifle' | 'Shotgun' | 'Handgun';
  damage: number;
  headshotMultiplier: number;
  fireRateRpm: number; // Rounds per minute
  magSize: number;
  totalReserve: number;
  reloadTimeSec: number; // Full empty reload time (with bolt/slide rack)
  tacticalReloadTimeSec: number; // Faster tactical reload time (round already chambered)
  range: number;
  spreadHip: number;
  spreadAds: number;
  recoilVertical: number;
  recoilHorizontal: number;
  recoilSpringRate: number;
  recoilDampingRate: number;
  recoilPattern: RecoilPatternPoint[];
  adsSpeed: number; // Seconds to transition to ADS
  adsTimeSec?: number; // ADS transition duration in seconds
  adsFov: number; // Target FOV when aiming
  fullAuto: boolean;
  burstCount?: number;
  pelletCount?: number;
  soundPitch: number;
  // Advanced Ballistics & Sway Mechanics
  muzzleVelocity: number; // Meters per second (e.g., 880 m/s for 5.56, 950 m/s for .50 BMG)
  bulletDropRate: number; // Gravity multiplier for ballistic arc (e.g., 9.81 * rate)
  dragFactor: number; // Air resistance coefficient
  damageFalloffStart: number; // Range in meters before damage dropoff begins
  damageFalloffEnd: number; // Range in meters where minDamage is reached
  minDamage: number; // Damage at maximum falloff range
  penetrationPower: number; // 0 (none) to 3 (heavy penetration: passes through wooden crates & cracked barriers)
  swayAmplitude: number; // Viewmodel breathing sway intensity
  swaySpeed: number; // Viewmodel breathing sway frequency
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  kills: number;
  deaths: number;
  headshots: number;
  score: number;
  currentStreak: number;
  highestStreak: number;
  shotsFired: number;
  shotsHit: number;
  tacSprintStamina?: number; // 0 to 1
  isTacSprinting?: boolean;
  isTacStance?: boolean;
  isMantling?: boolean;
  // Dynamic Scope & Steady Aim Telemetry
  breathStamina?: number; // 0 to 1
  isHoldingBreath?: boolean;
  isBreathExhausted?: boolean;
  scopeZoomIndex?: number; // 0 or 1 for variable zoom
  scopeZoomLevel?: number; // e.g. 4.5 or 10.0
  targetRangeMeters?: number; // Real-time laser rangefinder reading in meters
  elevationHoldoverMil?: number; // Real-time bullet drop holdover in milliradians
  scopeShadowOffsetX?: number; // Dynamic physical parallax eye-relief offset X
  scopeShadowOffsetY?: number; // Dynamic physical parallax eye-relief offset Y
  equippedOptic?: OpticType;
  reticleColor?: ReticleColor;
  reticleStyle?: ReticleStyle;
  isThermalActive?: boolean;
}

export interface KillFeedItem {
  id: string;
  killer: string;
  victim: string;
  weapon: WeaponType | 'grenade' | 'airstrike' | 'sentry' | 'melee' | 'barrel_explosion';
  isHeadshot: boolean;
  isPlayerKiller: boolean;
  isPlayerVictim: boolean;
  timestamp: number;
}

export type GameMode = 'tdm' | 'ffa' | 'survival' | 'gungame' | 'targetrange' | 'training';

export interface FloatingDamageNumberItem {
  id: string;
  damage: number;
  isHeadshot: boolean;
  position: { x: number; y: number; z: number };
  life: number;
  maxLife: number;
  hitZone: string;
  screenX?: number;
  screenY?: number;
}

export interface TrainingTelemetryData {
  totalDamage: number;
  targetsHit: number;
  targetsNeutralized: number;
  headshots: number;
  lastHitDamage: number;
  lastHitDistance: number;
  lastHitZone: string;
  currentDps: number;
  accuracy: number;
  shotsFired: number;
  shotsHit: number;
  infiniteAmmo: boolean;
  movingTargetSpeed: number;
}

export interface GameSettings {
  mouseSensitivity: number;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  fieldOfView: number;
  invertY: boolean;
  motionBlur: boolean;
  crosshairStyle: 'dot' | 'cross' | 'circle' | 'tactical';
  hitmarkerAudio: boolean;
  botCount: number;
  botDifficulty: 'recruit' | 'regular' | 'hardened' | 'veteran';
  graphicsQuality: 'high' | 'ultra' | 'medium';
  weatherPreset?: WeatherType;
}

export interface ScorestreakItem {
  id: 'uav' | 'airstrike' | 'sentry' | 'nuke';
  name: string;
  cost: number;
  ready: boolean;
  icon: string;
  description: string;
}

export type AIArchetype = 'assault' | 'sniper' | 'flanker' | 'heavy';
export type AIAlertLevel = 'unalerted' | 'investigating' | 'combat' | 'retreating';

export interface EnemyBot {
  id: string;
  name: string;
  team: 'allies' | 'axis';
  archetype: AIArchetype;
  health: number;
  maxHealth: number;
  armor: number;
  maxArmor: number;
  weapon: WeaponType;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  state: 'patrol' | 'chase' | 'attack' | 'cover' | 'flank' | 'dead';
  alertLevel: AIAlertLevel;
  isAiming: boolean;
  isReloading?: boolean;
  isVisibleToPlayer?: boolean;
  spottedByRadar?: boolean;
  kills: number;
  deaths: number;
  accuracy: number;
}

export interface HitmarkerEvent {
  type: 'body' | 'headshot' | 'kill' | 'armor' | 'destructible';
  timestamp: number;
}

export interface PlayerEliminatedInfo {
  killerName: string;
  killerWeapon: WeaponType;
  distMeters: number;
  isHeadshot: boolean;
  respawnTimeRemaining: number;
}

export interface DirectionalDamageIndicator {
  id: string;
  sourceAngle: number; // Angle relative to player view in radians
  timestamp: number;
  intensity: number;
  attackerName?: string;
}

export interface EliminationAccolade {
  id: string;
  title: string;
  points: number;
  subtext?: string;
  icon?: 'kill' | 'headshot' | 'streak' | 'revenge' | 'longshot' | 'one_shot';
  timestamp: number;
}

export type PickupType = 'ammo' | 'armor' | 'stimpack' | 'tactical';

export type TacticalType = 'smoke' | 'motion_sensor';

export interface ActiveSmokeCloud {
  id: string;
  position: { x: number; y: number; z: number };
  radius: number;
  maxRadius: number;
  density: number;
  duration: number;
  maxDuration: number;
}

export interface ActiveMotionSensor {
  id: string;
  position: { x: number; y: number; z: number };
  radius: number;
  batteryPct: number;
  detectedBotIds: string[];
  lastPingTime: number;
}

export interface TacticalPickupItem {
  id: string;
  type: PickupType;
  position: { x: number; y: number; z: number };
  isAvailable: boolean;
  cooldownTime: number;
}

export interface FragGrenade {
  id: string;
  position: { x: number; y: number; z: number };
  fuseRemaining: number;
  isExploded: boolean;
}

export type DestructibleType = 'concrete_wall' | 'wooden_crate' | 'explosive_barrel' | 'sandbag_barrier';
export type DestructionStage = 'intact' | 'damaged' | 'critical' | 'destroyed';

export type WeatherType = 'clear_day' | 'golden_sunset' | 'tactical_storm' | 'midnight_fog' | 'sandstorm' | 'dynamic_cycle';
export type TimeOfDay = 'dawn' | 'noon' | 'sunset' | 'night' | 'storm' | 'sandstorm';

export interface EnvironmentState {
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  timeString: string;
  weatherName: string;
  rainIntensity: number;
  fogDensity: number;
  windSpeedKts: number;
  windDirection: string;
  visibilityPct: number;
  isLightningActive: boolean;
  temperatureStr: string;
}

export interface DestructibleProp {
  id: string;
  type: DestructibleType;
  position: { x: number; y: number; z: number };
  health: number;
  maxHealth: number;
  stage: DestructionStage;
  isDestroyed: boolean;
}

