import { WeaponConfig, WeaponType } from '../types';

export const WEAPON_REGISTRY: Record<WeaponType, WeaponConfig> = {
  m4: {
    id: 'm4',
    name: 'M4A1 Assault Rifle',
    category: 'Assault Rifle',
    damage: 34,
    headshotMultiplier: 2.1,
    fireRateRpm: 800, // ~75ms per shot
    magSize: 30,
    totalReserve: 120,
    reloadTimeSec: 2.3, // Full empty reload (mag out + new mag + bolt release)
    tacticalReloadTimeSec: 1.45, // Tactical reload (round chambered: fast mag swap)
    range: 90,
    spreadHip: 0.035,
    spreadAds: 0.0025,
    recoilVertical: 0.032,
    recoilHorizontal: 0.012,
    recoilSpringRate: 24.0,
    recoilDampingRate: 18.0,
    // Realistic spray pattern curve (x = yaw drift, y = pitch climb)
    recoilPattern: [
      { x: 0.0, y: 0.028 },
      { x: 0.002, y: 0.032 },
      { x: 0.006, y: 0.036 },
      { x: 0.012, y: 0.038 },
      { x: 0.016, y: 0.034 },
      { x: 0.014, y: 0.030 },
      { x: 0.005, y: 0.028 },
      { x: -0.008, y: 0.026 },
      { x: -0.015, y: 0.028 },
      { x: -0.012, y: 0.030 },
      { x: 0.002, y: 0.032 },
      { x: 0.010, y: 0.032 },
    ],
    adsSpeed: 0.22,
    adsFov: 55,
    fullAuto: true,
    soundPitch: 1.0,
    muzzleVelocity: 880, // 880 m/s 5.56 NATO
    bulletDropRate: 1.0,
    dragFactor: 0.0018,
    damageFalloffStart: 40,
    damageFalloffEnd: 85,
    minDamage: 21,
    penetrationPower: 2,
    swayAmplitude: 0.0032,
    swaySpeed: 1.8,
  },
  mp5: {
    id: 'mp5',
    name: 'MP5 Submachine Gun',
    category: 'SMG',
    damage: 26,
    headshotMultiplier: 1.8,
    fireRateRpm: 920, // High cadence
    magSize: 30,
    totalReserve: 150,
    reloadTimeSec: 1.9, // Full empty reload (mag out + slap lock handle)
    tacticalReloadTimeSec: 1.2, // Tactical reload (fast mag retention swap)
    range: 55,
    spreadHip: 0.022,
    spreadAds: 0.004,
    recoilVertical: 0.022,
    recoilHorizontal: 0.016,
    recoilSpringRate: 30.0,
    recoilDampingRate: 22.0,
    recoilPattern: [
      { x: 0.0, y: 0.020 },
      { x: -0.004, y: 0.022 },
      { x: 0.006, y: 0.024 },
      { x: -0.008, y: 0.022 },
      { x: 0.010, y: 0.020 },
      { x: -0.006, y: 0.022 },
      { x: 0.008, y: 0.024 },
      { x: -0.005, y: 0.020 },
    ],
    adsSpeed: 0.16,
    adsFov: 60,
    fullAuto: true,
    soundPitch: 1.1,
    muzzleVelocity: 400, // 400 m/s 9mm Parabellum
    bulletDropRate: 1.4,
    dragFactor: 0.0035,
    damageFalloffStart: 22,
    damageFalloffEnd: 50,
    minDamage: 14,
    penetrationPower: 1,
    swayAmplitude: 0.0026,
    swaySpeed: 2.2,
  },
  sniper: {
    id: 'sniper',
    name: 'AX-50 .50 Cal Sniper',
    category: 'Sniper Rifle',
    damage: 135, // 1-shot kill upper torso/head
    headshotMultiplier: 3.0,
    fireRateRpm: 45, // Bolt action
    magSize: 5,
    totalReserve: 25,
    reloadTimeSec: 3.2, // Full empty reload (heavy box mag + straight pull chambering)
    tacticalReloadTimeSec: 2.0, // Tactical reload
    range: 220,
    spreadHip: 0.14,
    spreadAds: 0.0003,
    recoilVertical: 0.14,
    recoilHorizontal: 0.03,
    recoilSpringRate: 12.0,
    recoilDampingRate: 9.0,
    recoilPattern: [
      { x: 0.01, y: 0.14 },
      { x: -0.015, y: 0.15 },
    ],
    adsSpeed: 0.38,
    adsFov: 24, // High magnification optical zoom
    fullAuto: false,
    soundPitch: 0.85,
    muzzleVelocity: 950, // 950 m/s .50 BMG Heavy round
    bulletDropRate: 0.65, // Flatter trajectory
    dragFactor: 0.0009,
    damageFalloffStart: 100,
    damageFalloffEnd: 220,
    minDamage: 105,
    penetrationPower: 3, // Heavy penetration through multiple covers
    swayAmplitude: 0.0065, // Breathing sway visible in optic
    swaySpeed: 1.2,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Model 680 Breacher',
    category: 'Shotgun',
    damage: 24, // Per pellet
    pelletCount: 8, // Total ~192 max point blank
    headshotMultiplier: 1.5,
    fireRateRpm: 75,
    magSize: 8,
    totalReserve: 32,
    reloadTimeSec: 2.8, // Full empty reload (shell feed + pump cycle)
    tacticalReloadTimeSec: 1.8, // Tactical speed feed reload
    range: 30,
    spreadHip: 0.075,
    spreadAds: 0.032,
    recoilVertical: 0.095,
    recoilHorizontal: 0.025,
    recoilSpringRate: 16.0,
    recoilDampingRate: 12.0,
    recoilPattern: [
      { x: 0.005, y: 0.095 },
      { x: -0.008, y: 0.10 },
    ],
    adsSpeed: 0.24,
    adsFov: 65,
    fullAuto: false,
    soundPitch: 0.95,
    muzzleVelocity: 380, // 380 m/s 12 Gauge buckshot
    bulletDropRate: 1.6,
    dragFactor: 0.006,
    damageFalloffStart: 10,
    damageFalloffEnd: 28,
    minDamage: 6,
    penetrationPower: 1,
    swayAmplitude: 0.004,
    swaySpeed: 1.6,
  },
  deagle: {
    id: 'deagle',
    name: '.50 GS Hand Cannon',
    category: 'Handgun',
    damage: 72,
    headshotMultiplier: 2.2, // 1-shot headshot close range
    fireRateRpm: 240,
    magSize: 7,
    totalReserve: 35,
    reloadTimeSec: 1.7, // Full empty reload (drop mag + insert mag + slide release)
    tacticalReloadTimeSec: 1.05, // Tactical reload (fast combat mag swap)
    range: 50,
    spreadHip: 0.045,
    spreadAds: 0.0035,
    recoilVertical: 0.07,
    recoilHorizontal: 0.02,
    recoilSpringRate: 22.0,
    recoilDampingRate: 15.0,
    recoilPattern: [
      { x: 0.004, y: 0.07 },
      { x: -0.006, y: 0.075 },
      { x: 0.008, y: 0.078 },
      { x: -0.005, y: 0.072 },
    ],
    adsSpeed: 0.14,
    adsFov: 62,
    fullAuto: false,
    soundPitch: 1.05,
    muzzleVelocity: 470, // 470 m/s .50 Action Express
    bulletDropRate: 1.2,
    dragFactor: 0.0028,
    damageFalloffStart: 25,
    damageFalloffEnd: 48,
    minDamage: 36,
    penetrationPower: 2,
    swayAmplitude: 0.0024,
    swaySpeed: 2.0,
  },
};


// Viewmodel positioning offsets for standard hipfire and ADS alignment
export const WEAPON_VIEWMODEL_OFFSETS: Record<
  WeaponType,
  {
    hip: { x: number; y: number; z: number; rx: number; ry: number; rz: number };
    ads: { x: number; y: number; z: number; rx: number; ry: number; rz: number };
    sprint: { x: number; y: number; z: number; rx: number; ry: number; rz: number };
  }
> = {
  m4: {
    hip: { x: 0.22, y: -0.22, z: -0.42, rx: 0.04, ry: -0.04, rz: 0.02 },
    ads: { x: 0.0, y: -0.13, z: -0.28, rx: 0, ry: 0, rz: 0 },
    sprint: { x: 0.24, y: -0.28, z: -0.36, rx: 0.65, ry: -0.5, rz: 0.3 },
  },
  mp5: {
    hip: { x: 0.2, y: -0.2, z: -0.38, rx: 0.03, ry: -0.03, rz: 0.02 },
    ads: { x: 0.0, y: -0.045, z: -0.25, rx: 0, ry: 0, rz: 0 },
    sprint: { x: 0.22, y: -0.25, z: -0.32, rx: 0.7, ry: -0.55, rz: 0.35 },
  },
  sniper: {
    hip: { x: 0.24, y: -0.24, z: -0.48, rx: 0.05, ry: -0.05, rz: 0.03 },
    ads: { x: 0.0, y: -0.14, z: -0.2, rx: 0, ry: 0, rz: 0 },
    sprint: { x: 0.26, y: -0.3, z: -0.4, rx: 0.8, ry: -0.6, rz: 0.4 },
  },
  shotgun: {
    hip: { x: 0.22, y: -0.2, z: -0.42, rx: 0.04, ry: -0.04, rz: 0.02 },
    ads: { x: 0.0, y: -0.03, z: -0.3, rx: 0, ry: 0, rz: 0 },
    sprint: { x: 0.24, y: -0.26, z: -0.36, rx: 0.68, ry: -0.52, rz: 0.32 },
  },
  deagle: {
    hip: { x: 0.16, y: -0.18, z: -0.35, rx: 0.02, ry: -0.02, rz: 0.01 },
    ads: { x: 0.0, y: -0.08, z: -0.26, rx: 0, ry: 0, rz: 0 },
    sprint: { x: 0.18, y: -0.24, z: -0.3, rx: 0.6, ry: -0.45, rz: 0.28 },
  },
};
