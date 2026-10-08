import * as THREE from 'three';
import { WeaponType } from '../types';
import { soundManager } from './audio';

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  alpha: number;
  maxLife: number;
  life: number;
  gravity?: number;
  rotation?: number;
  rotSpeed?: number;
}

export interface BulletTracer {
  start: THREE.Vector3;
  end: THREE.Vector3;
  current: THREE.Vector3;
  speed: number;
  progress: number;
  mesh: THREE.Line;
}

export interface BloodParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  alpha: number;
  maxLife: number;
  life: number;
  gravity: number;
  drag: number;
  type: 'burst' | 'mist' | 'streak';
  canDecal?: boolean;
}

export interface DebrisParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotVel: THREE.Vector3;
  life: number;
  maxLife: number;
  isCeramic: boolean;
}

export interface BloodDecal {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  targetScale: number;
  currentScale: number;
  initialOpacity: number;
}

export interface ShockwaveRing {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  targetScale: number;
  currentScale: number;
  growthSpeed: number;
  initialOpacity: number;
}

export interface GroundScorchDecal {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  targetScale: number;
  currentScale: number;
  initialOpacity: number;
}

export interface CaliberImpactProfile {
  caliberName: string;
  intensityScale: number;
  bloodCount: number;
  mistCount: number;
  streakCount: number;
  debrisKevlarCount: number;
  debrisCeramicCount: number;
  velocityMin: number;
  velocityMax: number;
  coneSpread: number;
  dropletSize: number;
  decalChance: number;
  decalRadius: number;
}

// --- PROCEDURAL TEXTURE GENERATORS ---
function generateScorchCraterDecalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.save();
  ctx.translate(128, 128);

  // Deep soot / charred crater core
  const sootGrad = ctx.createRadialGradient(0, 0, 8, 0, 0, 110);
  sootGrad.addColorStop(0, 'rgba(10, 8, 8, 0.98)');
  sootGrad.addColorStop(0.35, 'rgba(22, 18, 16, 0.90)');
  sootGrad.addColorStop(0.7, 'rgba(42, 36, 32, 0.65)');
  sootGrad.addColorStop(1, 'rgba(30, 25, 25, 0)');

  ctx.fillStyle = sootGrad;
  ctx.beginPath();
  const numSteps = 28;
  for (let i = 0; i < numSteps; i++) {
    const a = (i / numSteps) * Math.PI * 2;
    const r = 72 + Math.sin(i * 3.5) * 20 + Math.cos(i * 5.2) * 12;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Radiating blast fracture fissures
  ctx.strokeStyle = 'rgba(15, 12, 12, 0.95)';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const startR = 15;
    const endR = 85 + Math.random() * 35;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * startR, Math.sin(angle) * startR);
    ctx.lineTo(Math.cos(angle) * endR, Math.sin(angle) * endR);
    ctx.stroke();
  }

  // Scattered burnt ember specks & carbon grains
  for (let i = 0; i < 45; i++) {
    const a = Math.random() * Math.PI * 2;
    const dist = 25 + Math.random() * 85;
    const x = Math.cos(a) * dist;
    const y = Math.sin(a) * dist;
    const r = Math.random() * 3.5 + 1.0;
    ctx.fillStyle = Math.random() < 0.25 ? 'rgba(235, 80, 20, 0.75)' : 'rgba(18, 14, 14, 0.88)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function generateShrapnelTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.moveTo(32, 4);
  ctx.lineTo(58, 20);
  ctx.lineTo(48, 58);
  ctx.lineTo(14, 52);
  ctx.lineTo(6, 24);
  ctx.closePath();
  ctx.fill();

  // Charred molten glowing tip
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.moveTo(32, 4);
  ctx.lineTo(44, 14);
  ctx.lineTo(26, 20);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#78716c';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}
function generateBloodMistTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 58);
  grad.addColorStop(0, 'rgba(145, 8, 8, 0.88)');
  grad.addColorStop(0.35, 'rgba(110, 4, 4, 0.65)');
  grad.addColorStop(0.7, 'rgba(75, 2, 2, 0.3)');
  grad.addColorStop(1, 'rgba(40, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  for (let i = 0; i < 90; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.pow(Math.random(), 0.7) * 54;
    const x = 64 + Math.cos(angle) * dist;
    const y = 64 + Math.sin(angle) * dist;
    const r = Math.random() * 1.8 + 0.5;
    const alpha = (1 - dist / 58) * (Math.random() * 0.4 + 0.6);
    ctx.fillStyle = `rgba(${Math.floor(130 + Math.random() * 40)}, ${Math.floor(5 + Math.random() * 10)}, ${Math.floor(5 + Math.random() * 10)}, ${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function generateBloodBurstTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.save();
  ctx.translate(64, 64);

  // Irregular organic core
  ctx.fillStyle = 'rgba(125, 4, 4, 0.95)';
  ctx.beginPath();
  const numPoints = 14;
  for (let i = 0; i < numPoints; i++) {
    const a = (i / numPoints) * Math.PI * 2;
    const rad = (i % 2 === 0 ? 22 : 12) + (Math.sin(i * 3.7) * 6);
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Outward projectile tendrils
  ctx.strokeStyle = 'rgba(135, 6, 6, 0.85)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const tendrilAngles = [0.2, 0.7, 1.4, 2.1, 2.8, 3.6, 4.3, 5.1, 5.8];
  tendrilAngles.forEach(a => {
    const length = 32 + Math.random() * 24;
    const startRad = 15;
    const x1 = Math.cos(a) * startRad;
    const y1 = Math.sin(a) * startRad;
    const x2 = Math.cos(a) * length;
    const y2 = Math.sin(a) * length;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(120, 2, 2, 0.9)';
    ctx.beginPath();
    ctx.arc(x2 + Math.cos(a) * 3, y2 + Math.sin(a) * 3, 2.2, 0, Math.PI * 2);
    ctx.fill();
  });

  const centerGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 16);
  centerGrad.addColorStop(0, 'rgba(60, 0, 0, 0.95)');
  centerGrad.addColorStop(0.7, 'rgba(100, 2, 2, 0.85)');
  centerGrad.addColorStop(1, 'rgba(120, 4, 4, 0)');
  ctx.fillStyle = centerGrad;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function generateBloodStreakTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(64, 18, 64, 110);
  grad.addColorStop(0, 'rgba(160, 8, 8, 0.95)');
  grad.addColorStop(0.3, 'rgba(120, 4, 4, 0.85)');
  grad.addColorStop(0.7, 'rgba(80, 2, 2, 0.5)');
  grad.addColorStop(1, 'rgba(40, 0, 0, 0)');

  ctx.fillStyle = 'rgba(150, 6, 6, 0.95)';
  ctx.beginPath();
  ctx.arc(64, 28, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(70, 1, 1, 0.9)';
  ctx.beginPath();
  ctx.arc(64, 28, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(56, 32);
  ctx.quadraticCurveTo(60, 70, 63, 112);
  ctx.lineTo(65, 112);
  ctx.quadraticCurveTo(68, 70, 72, 32);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 12; i++) {
    const y = 35 + i * 6;
    const offset = (Math.random() - 0.5) * (i * 1.8 + 4);
    const r = Math.random() * 1.5 + 0.6;
    ctx.fillStyle = 'rgba(130, 4, 4, 0.7)';
    ctx.beginPath();
    ctx.arc(64 + offset, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function generateKevlarDebrisTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e2328';
  ctx.beginPath();
  ctx.moveTo(14, 8);
  ctx.lineTo(52, 12);
  ctx.lineTo(58, 48);
  ctx.lineTo(38, 56);
  ctx.lineTo(8, 42);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#353c45';
  ctx.lineWidth = 1.2;
  for (let i = 8; i < 60; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, 8);
    ctx.lineTo(i - 8, 56);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(8, i);
    ctx.lineTo(56, i - 6);
    ctx.stroke();
  }

  ctx.strokeStyle = '#4e5660';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(10 + i * 6, 8);
    ctx.lineTo(8 + i * 6 + (Math.random() - 0.5) * 6, 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function generateCeramicDebrisTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2b2d31';
  ctx.beginPath();
  ctx.moveTo(32, 6);
  ctx.lineTo(56, 22);
  ctx.lineTo(46, 56);
  ctx.lineTo(16, 52);
  ctx.lineTo(8, 26);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(180, 190, 205, 0.4)';
  ctx.beginPath();
  ctx.moveTo(32, 6);
  ctx.lineTo(56, 22);
  ctx.lineTo(34, 30);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#a6b2c0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function generateGroundSplatterDecalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.save();
  ctx.translate(128, 128);

  const puddleGrad = ctx.createRadialGradient(0, 0, 6, 0, 0, 75);
  puddleGrad.addColorStop(0, 'rgba(65, 2, 2, 0.98)');
  puddleGrad.addColorStop(0.5, 'rgba(85, 4, 4, 0.92)');
  puddleGrad.addColorStop(0.85, 'rgba(110, 6, 6, 0.85)');
  puddleGrad.addColorStop(1, 'rgba(130, 8, 8, 0)');

  ctx.fillStyle = puddleGrad;
  ctx.beginPath();
  const numSteps = 24;
  for (let i = 0; i < numSteps; i++) {
    const a = (i / numSteps) * Math.PI * 2;
    const r = 42 + Math.sin(i * 2.8) * 16 + Math.cos(i * 4.1) * 9;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 35; i++) {
    const a = Math.random() * Math.PI * 2;
    const dist = 55 + Math.random() * 55;
    const x = Math.cos(a) * dist;
    const y = Math.sin(a) * dist;
    const r = Math.random() * 3.5 + 1.0;
    ctx.fillStyle = 'rgba(78, 3, 3, 0.9)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(82, 4, 4, 0.88)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  [0.4, 1.1, 1.9, 2.7, 3.4, 4.2, 5.0, 5.7].forEach(a => {
    const startR = 30;
    const endR = 68 + Math.random() * 38;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * startR, Math.sin(a) * startR);
    ctx.lineTo(Math.cos(a) * endR, Math.sin(a) * endR);
    ctx.stroke();
  });

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export class ParticleSystem {
  public scene: THREE.Scene;
  private particles: Particle[] = [];
  private tracers: BulletTracer[] = [];
  private shellCasings: { mesh: THREE.Mesh; velocity: THREE.Vector3; rotVel: THREE.Vector3; life: number }[] = [];

  // Dynamic Real-time Flash & Explosion Lights
  public muzzleFlashLight: THREE.PointLight;
  public explosionLight: THREE.PointLight;
  private muzzleFlashTimer: number = 0;
  private explosionLightTimer: number = 0;

  private pointsGeo: THREE.BufferGeometry;
  private pointsMat: THREE.PointsMaterial;
  private pointsMesh: THREE.Points;
  private maxParticles: number = 2000;

  private posArray: Float32Array;
  private colorArray: Float32Array;

  // --- PROCEDURAL IMPACT EFFECT SYSTEM: BLOOD & DEBRIS ---
  private bloodBurstTex: THREE.CanvasTexture;
  private bloodMistTex: THREE.CanvasTexture;
  private bloodStreakTex: THREE.CanvasTexture;
  private kevlarDebrisTex: THREE.CanvasTexture;
  private ceramicDebrisTex: THREE.CanvasTexture;
  private groundDecalTex: THREE.CanvasTexture;

  // Dedicated Normal-Blending Blood GPU Buffer
  private bloodParticles: BloodParticle[] = [];
  private maxBloodParticles: number = 900;
  private bloodPosArray: Float32Array;
  private bloodColorArray: Float32Array;
  private bloodPointsGeo: THREE.BufferGeometry;
  private bloodPointsMat: THREE.PointsMaterial;
  private bloodPointsMesh: THREE.Points;

  // Dedicated Arterial Mist GPU Buffer
  private mistParticles: BloodParticle[] = [];
  private maxMistParticles: number = 450;
  private mistPosArray: Float32Array;
  private mistColorArray: Float32Array;
  private mistPointsGeo: THREE.BufferGeometry;
  private mistPointsMat: THREE.PointsMaterial;
  private mistPointsMesh: THREE.Points;

  // Debris & Decal Pools
  private debrisParticles: DebrisParticle[] = [];
  private maxDebrisMeshes: number = 75;
  private bloodDecals: BloodDecal[] = [];
  private maxBloodDecals: number = 40;

  // Explosion Blast FX Pools
  private shockwaveRings: ShockwaveRing[] = [];
  private maxShockwaveRings: number = 24;
  private scorchDecals: GroundScorchDecal[] = [];
  private maxScorchDecals: number = 32;
  private scorchCraterTex: THREE.CanvasTexture;
  private shrapnelTex: THREE.CanvasTexture;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Generate Procedural Textures
    this.bloodBurstTex = generateBloodBurstTexture();
    this.bloodMistTex = generateBloodMistTexture();
    this.bloodStreakTex = generateBloodStreakTexture();
    this.kevlarDebrisTex = generateKevlarDebrisTexture();
    this.ceramicDebrisTex = generateCeramicDebrisTexture();
    this.groundDecalTex = generateGroundSplatterDecalTexture();
    this.scorchCraterTex = generateScorchCraterDecalTexture();
    this.shrapnelTex = generateShrapnelTexture();

    // Real-time dynamic point light for weapons fire (photorealistic powder combustion glow)
    this.muzzleFlashLight = new THREE.PointLight(0xffeedd, 0, 12, 2.0);
    this.scene.add(this.muzzleFlashLight);

    // Real-time dynamic point light for grenade blasts
    this.explosionLight = new THREE.PointLight(0xffedd5, 0, 45, 1.8);
    this.scene.add(this.explosionLight);

    // 2. Standard Additive Particles (Sparks, Muzzle Smoke, Explosions)
    this.posArray = new Float32Array(this.maxParticles * 3);
    this.colorArray = new Float32Array(this.maxParticles * 3);

    this.pointsGeo = new THREE.BufferGeometry();
    this.pointsGeo.setAttribute('position', new THREE.BufferAttribute(this.posArray, 3));
    this.pointsGeo.setAttribute('color', new THREE.BufferAttribute(this.colorArray, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,200,100,0.8)');
    grad.addColorStop(1, 'rgba(255,100,50,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const pTex = new THREE.CanvasTexture(canvas);

    this.pointsMat = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      transparent: true,
      map: pTex,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.pointsMesh = new THREE.Points(this.pointsGeo, this.pointsMat);
    this.scene.add(this.pointsMesh);

    // 3. Normal-Blending Blood Burst Mesh (Rich Viscous Crimson, Non-Glowing)
    this.bloodPosArray = new Float32Array(this.maxBloodParticles * 3);
    this.bloodColorArray = new Float32Array(this.maxBloodParticles * 3);
    this.bloodPointsGeo = new THREE.BufferGeometry();
    this.bloodPointsGeo.setAttribute('position', new THREE.BufferAttribute(this.bloodPosArray, 3));
    this.bloodPointsGeo.setAttribute('color', new THREE.BufferAttribute(this.bloodColorArray, 3));

    this.bloodPointsMat = new THREE.PointsMaterial({
      size: 0.32,
      vertexColors: true,
      transparent: true,
      map: this.bloodBurstTex,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    this.bloodPointsMesh = new THREE.Points(this.bloodPointsGeo, this.bloodPointsMat);
    this.scene.add(this.bloodPointsMesh);

    // 4. Normal-Blending Arterial Mist Mesh (Atmospheric Aerosol Plume)
    this.mistPosArray = new Float32Array(this.maxMistParticles * 3);
    this.mistColorArray = new Float32Array(this.maxMistParticles * 3);
    this.mistPointsGeo = new THREE.BufferGeometry();
    this.mistPointsGeo.setAttribute('position', new THREE.BufferAttribute(this.mistPosArray, 3));
    this.mistPointsGeo.setAttribute('color', new THREE.BufferAttribute(this.mistColorArray, 3));

    this.mistPointsMat = new THREE.PointsMaterial({
      size: 0.65,
      vertexColors: true,
      transparent: true,
      map: this.bloodMistTex,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    this.mistPointsMesh = new THREE.Points(this.mistPointsGeo, this.mistPointsMat);
    this.scene.add(this.mistPointsMesh);
  }

  // --- REAL-TIME POINT LIGHT SHADOWS (SUPER EXTREME RAY-TRACED GRAPHICS) ---
  public setPointLightShadows(enabled: boolean) {
    this.muzzleFlashLight.castShadow = enabled;
    if (enabled) {
      this.muzzleFlashLight.shadow.mapSize.width = 512;
      this.muzzleFlashLight.shadow.mapSize.height = 512;
      this.muzzleFlashLight.shadow.bias = -0.0012;
      this.muzzleFlashLight.shadow.radius = 1.8;
      this.muzzleFlashLight.shadow.camera.near = 0.1;
      this.muzzleFlashLight.shadow.camera.far = 18;
    }

    this.explosionLight.castShadow = enabled;
    if (enabled) {
      this.explosionLight.shadow.mapSize.width = 1024;
      this.explosionLight.shadow.mapSize.height = 1024;
      this.explosionLight.shadow.bias = -0.001;
      this.explosionLight.shadow.radius = 2.4;
      this.explosionLight.shadow.camera.near = 0.3;
      this.explosionLight.shadow.camera.far = 50;
    }
  }

  // --- MUZZLE FLASH FX ---
  public emitMuzzleFlash(pos: THREE.Vector3, dir: THREE.Vector3, isPlayer: boolean = false) {
    // Light up environment around weapon with photorealistic powder bloom
    this.muzzleFlashLight.position.copy(pos);
    this.muzzleFlashLight.intensity = isPlayer ? 1.8 : 1.2;
    this.muzzleFlashTimer = 0.05;

    // Muzzle sparks
    for (let i = 0; i < 8; i++) {
      const spread = new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4
      );
      const vel = dir.clone().add(spread).multiplyScalar(Math.random() * 8 + 4);
      this.particles.push({
        position: pos.clone(),
        velocity: vel,
        color: new THREE.Color(1, 0.8, 0.2),
        size: 0.25,
        alpha: 1.0,
        maxLife: 0.08,
        life: 0.08,
        gravity: 0,
      });
    }

    // Smoke puff
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        position: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1, 0)),
        velocity: dir.clone().multiplyScalar(1.2).add(new THREE.Vector3(0, 0.8, 0)),
        color: new THREE.Color(0.6, 0.6, 0.65),
        size: 0.45,
        alpha: 0.5,
        maxLife: 0.4,
        life: 0.4,
        gravity: -0.2,
      });
    }
  }

  // --- BULLET TRACER & BALLISTIC TRAJECTORY EFFECTS ---
  public spawnBulletTracer(start: THREE.Vector3, end: THREE.Vector3, weaponType: string = 'm4') {
    let color = 0xfef08a;
    let speed = 240;
    let tracerLength = 0.28;

    switch (weaponType) {
      case 'sniper':
        color = 0xfbbf24; // Radiant high-energy .50 BMG gold beam
        speed = 380;
        tracerLength = 0.45;
        break;
      case 'm4':
        color = 0x84cc16; // 5.56 NATO luminous green-gold beam
        speed = 280;
        tracerLength = 0.32;
        break;
      case 'mp5':
        color = 0xfde047; // 9mm bright luminous tracer
        speed = 210;
        tracerLength = 0.25;
        break;
      case 'shotgun':
        color = 0xf87171; // 12GA red-hot buckshot tracer
        speed = 180;
        tracerLength = 0.22;
        break;
      case 'deagle':
        color = 0xf97316; // .50 AE intense orange hypersonic tracer
        speed = 250;
        tracerLength = 0.35;
        break;
    }

    // Dynamic 2-point Line for the high-speed glowing core
    const geo = new THREE.BufferGeometry().setFromPoints([start, start.clone()]);
    const mat = new THREE.LineBasicMaterial({
      color,
      linewidth: 3,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    this.tracers.push({
      start: start.clone(),
      end: end.clone(),
      current: start.clone(),
      speed,
      progress: 0,
      mesh: line,
    });

    // Spawn initial supersonic vapor puff along line of sight
    const dir = end.clone().sub(start).normalize();
    const dist = start.distanceTo(end);
    const stepCount = Math.min(6, Math.floor(dist / 8));
    for (let s = 1; s <= stepCount; s++) {
      const pPos = start.clone().addScaledVector(dir, s * 7);
      this.particles.push({
        position: pPos,
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4),
        color: new THREE.Color(0.85, 0.9, 0.95),
        size: 0.15,
        alpha: 0.4,
        maxLife: 0.2,
        life: 0.2,
        gravity: 0,
      });
    }
  }

  // --- WALL / OBJECT IMPACT IMPACT PARTICLES (SPARKS & DUST) ---
  public emitImpactSparks(pos: THREE.Vector3, normal: THREE.Vector3) {
    for (let i = 0; i < 14; i++) {
      const reflect = normal.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1.5
      )).normalize().multiplyScalar(Math.random() * 9 + 3);

      this.particles.push({
        position: pos.clone(),
        velocity: reflect,
        color: new THREE.Color(1, 0.75, 0.2),
        size: 0.18,
        alpha: 1.0,
        maxLife: 0.25,
        life: 0.25,
        gravity: 9.8,
      });
    }

    // Concrete dust
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        position: pos.clone(),
        velocity: normal.clone().multiplyScalar(1.5).add(new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() * 1.5, (Math.random() - 0.5) * 1.5)),
        color: new THREE.Color(0.7, 0.7, 0.7),
        size: 0.5,
        alpha: 0.6,
        maxLife: 0.6,
        life: 0.6,
        gravity: 0.5,
      });
    }
  }

  public emitSpark(pos: THREE.Vector3, normal?: THREE.Vector3) {
    this.emitImpactSparks(pos, normal || new THREE.Vector3(0, 1, 0));
  }

  // --- PROCEDURAL IMPACT EFFECT SYSTEM: CALIBER SCALING & BLOOD/DEBRIS ---
  public getCaliberProfile(
    weapon: WeaponType | string = 'm4',
    isHeadshot: boolean = false,
    damage: number = 35
  ): CaliberImpactProfile {
    let profile: CaliberImpactProfile;

    switch (weapon) {
      case 'mp5':
        profile = {
          caliberName: '9x19mm Parabellum',
          intensityScale: 1.0,
          bloodCount: 20,
          mistCount: 8,
          streakCount: 4,
          debrisKevlarCount: 2,
          debrisCeramicCount: 0,
          velocityMin: 3.5,
          velocityMax: 6.5,
          coneSpread: 0.42,
          dropletSize: 0.24,
          decalChance: 0.5,
          decalRadius: 0.35,
        };
        break;
      case 'vector':
        profile = {
          caliberName: '.45 ACP FMJ',
          intensityScale: 1.15,
          bloodCount: 24,
          mistCount: 10,
          streakCount: 5,
          debrisKevlarCount: 3,
          debrisCeramicCount: 1,
          velocityMin: 4.0,
          velocityMax: 7.0,
          coneSpread: 0.45,
          dropletSize: 0.26,
          decalChance: 0.55,
          decalRadius: 0.38,
        };
        break;
      case 'm4':
        profile = {
          caliberName: '5.56x45mm NATO',
          intensityScale: 1.45,
          bloodCount: 32,
          mistCount: 14,
          streakCount: 7,
          debrisKevlarCount: 4,
          debrisCeramicCount: 2,
          velocityMin: 5.5,
          velocityMax: 9.0,
          coneSpread: 0.48,
          dropletSize: 0.28,
          decalChance: 0.70,
          decalRadius: 0.46,
        };
        break;
      case 'ak47':
        profile = {
          caliberName: '7.62x39mm Soviet',
          intensityScale: 1.85,
          bloodCount: 42,
          mistCount: 18,
          streakCount: 9,
          debrisKevlarCount: 6,
          debrisCeramicCount: 3,
          velocityMin: 6.5,
          velocityMax: 11.0,
          coneSpread: 0.52,
          dropletSize: 0.32,
          decalChance: 0.85,
          decalRadius: 0.55,
        };
        break;
      case 'scar':
        profile = {
          caliberName: '7.62x51mm NATO',
          intensityScale: 2.1,
          bloodCount: 50,
          mistCount: 22,
          streakCount: 11,
          debrisKevlarCount: 7,
          debrisCeramicCount: 4,
          velocityMin: 7.5,
          velocityMax: 12.5,
          coneSpread: 0.55,
          dropletSize: 0.35,
          decalChance: 0.90,
          decalRadius: 0.62,
        };
        break;
      case 'deagle':
        profile = {
          caliberName: '.50 Action Express',
          intensityScale: 2.5,
          bloodCount: 60,
          mistCount: 26,
          streakCount: 14,
          debrisKevlarCount: 8,
          debrisCeramicCount: 5,
          velocityMin: 8.5,
          velocityMax: 13.5,
          coneSpread: 0.62,
          dropletSize: 0.40,
          decalChance: 0.95,
          decalRadius: 0.72,
        };
        break;
      case 'shotgun':
        profile = {
          caliberName: '12-Gauge Magnum 00 Buck',
          intensityScale: 2.85,
          bloodCount: 72,
          mistCount: 34,
          streakCount: 16,
          debrisKevlarCount: 10,
          debrisCeramicCount: 6,
          velocityMin: 7.0,
          velocityMax: 14.5,
          coneSpread: 0.85,
          dropletSize: 0.44,
          decalChance: 1.0,
          decalRadius: 0.85,
        };
        break;
      case 'sniper':
        profile = {
          caliberName: '.50 BMG Armor-Piercing Incendiary',
          intensityScale: 3.8,
          bloodCount: 90,
          mistCount: 45,
          streakCount: 20,
          debrisKevlarCount: 14,
          debrisCeramicCount: 8,
          velocityMin: 11.0,
          velocityMax: 19.0,
          coneSpread: 0.58,
          dropletSize: 0.48,
          decalChance: 1.0,
          decalRadius: 1.1,
        };
        break;
      case 'melee':
        profile = {
          caliberName: 'Tactical Knife Laceration',
          intensityScale: 2.2,
          bloodCount: 48,
          mistCount: 16,
          streakCount: 12,
          debrisKevlarCount: 5,
          debrisCeramicCount: 0,
          velocityMin: 4.5,
          velocityMax: 8.5,
          coneSpread: 0.95,
          dropletSize: 0.36,
          decalChance: 0.9,
          decalRadius: 0.65,
        };
        break;
      case 'grenade':
      case 'airstrike':
      case 'barrel_explosion':
        profile = {
          caliberName: 'High-Explosive Blast Trauma',
          intensityScale: 4.2,
          bloodCount: 100,
          mistCount: 55,
          streakCount: 24,
          debrisKevlarCount: 16,
          debrisCeramicCount: 10,
          velocityMin: 12.0,
          velocityMax: 22.0,
          coneSpread: Math.PI * 2,
          dropletSize: 0.52,
          decalChance: 1.0,
          decalRadius: 1.35,
        };
        break;
      default: {
        const scale = Math.min(3.5, Math.max(0.8, damage / 35));
        profile = {
          caliberName: 'Ballistic Kinetic Impact',
          intensityScale: scale,
          bloodCount: Math.floor(30 * scale),
          mistCount: Math.floor(14 * scale),
          streakCount: Math.floor(6 * scale),
          debrisKevlarCount: Math.floor(4 * scale),
          debrisCeramicCount: Math.floor(2 * scale),
          velocityMin: 5.0 * scale,
          velocityMax: 9.0 * scale,
          coneSpread: 0.5,
          dropletSize: 0.28 * Math.sqrt(scale),
          decalChance: 0.7,
          decalRadius: 0.45 * Math.sqrt(scale),
        };
        break;
      }
    }

    if (isHeadshot) {
      profile.bloodCount = Math.floor(profile.bloodCount * 1.85);
      profile.mistCount = Math.floor(profile.mistCount * 2.2);
      profile.streakCount = Math.floor(profile.streakCount * 1.6);
      profile.debrisCeramicCount += 3; // Helmet fragments
      profile.dropletSize *= 1.25;
      profile.decalRadius *= 1.35;
      profile.decalChance = 1.0;
    }

    return profile;
  }

  /**
   * Procedural Impact Effect System
   * Emits varied blood spatter textures (bursts, arterial mist, directional streaks),
   * physical debris particles (Kevlar fabric shreds, ceramic armor plate fragments),
   * and surface blood pooling decals, dynamically scaling with weapon caliber.
   */
  public emitProceduralImpact(
    pos: THREE.Vector3,
    dir: THREE.Vector3,
    weapon: WeaponType | string = 'm4',
    isHeadshot: boolean = false,
    hasArmor: boolean = true,
    damage: number = 35
  ) {
    const profile = this.getCaliberProfile(weapon, isHeadshot, damage);

    // Audio acoustic flesh impact
    soundManager.playFleshImpact(weapon, isHeadshot);

    // Compute primary ballistic exit trajectory
    const forwardDir = dir.lengthSq() > 0.001 ? dir.clone().normalize() : new THREE.Vector3(0, 0, 1);
    if (isHeadshot) {
      forwardDir.y += 0.45;
      forwardDir.normalize();
    }

    // 1. BLOOD BURST & DIRECTIONAL DROPLETS (Normal Blending, authentic crimson)
    const bloodCount = profile.bloodCount;
    for (let i = 0; i < bloodCount; i++) {
      if (this.bloodParticles.length >= this.maxBloodParticles) break;

      const isSplashback = Math.random() < 0.25;
      const baseDir = isSplashback ? forwardDir.clone().negate() : forwardDir.clone();

      const spread = profile.coneSpread * (isSplashback ? 1.4 : 1.0);
      const randVec = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).multiplyScalar(spread);

      const velDir = baseDir.add(randVec).normalize();
      const speed = profile.velocityMin + Math.random() * (profile.velocityMax - profile.velocityMin) * (isSplashback ? 0.6 : 1.0);
      const vel = velDir.multiplyScalar(speed);

      // Random visceral crimson variations
      const redVal = 0.52 + Math.random() * 0.38;
      const greenVal = 0.01 + Math.random() * 0.04;
      const blueVal = 0.01 + Math.random() * 0.04;

      this.bloodParticles.push({
        position: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15)),
        velocity: vel,
        color: new THREE.Color(redVal, greenVal, blueVal),
        size: profile.dropletSize * (Math.random() * 0.6 + 0.7),
        alpha: 0.95,
        maxLife: 0.45 + Math.random() * 0.35,
        life: 0.45 + Math.random() * 0.35,
        gravity: 12.0 + Math.random() * 4.0,
        drag: 1.2,
        type: Math.random() < 0.35 ? 'streak' : 'burst',
        canDecal: true,
      });
    }

    // 2. ARTERIAL AEROSOL MIST PLUME (Expanding fine red cloud)
    const mistCount = profile.mistCount;
    for (let i = 0; i < mistCount; i++) {
      if (this.mistParticles.length >= this.maxMistParticles) break;

      const mistVel = forwardDir.clone().multiplyScalar(1.2 + Math.random() * 2.5).add(new THREE.Vector3(
        (Math.random() - 0.5) * 2.0,
        Math.random() * 1.5 - 0.3,
        (Math.random() - 0.5) * 2.0
      ));

      this.mistParticles.push({
        position: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.25)),
        velocity: mistVel,
        color: new THREE.Color(0.65 + Math.random() * 0.25, 0.02, 0.02),
        size: profile.dropletSize * (1.6 + Math.random() * 1.4),
        alpha: 0.65,
        maxLife: 0.7 + Math.random() * 0.5,
        life: 0.7 + Math.random() * 0.5,
        gravity: 2.0,
        drag: 2.8,
        type: 'mist',
      });
    }

    // 3. PHYSICAL DEBRIS PARTICLES (Kevlar weave shards and ceramic armor plate fragments)
    if (hasArmor || isHeadshot) {
      const kevlarCount = profile.debrisKevlarCount;
      for (let i = 0; i < kevlarCount; i++) {
        if (this.debrisParticles.length >= this.maxDebrisMeshes) {
          const oldest = this.debrisParticles.shift();
          if (oldest) {
            this.scene.remove(oldest.mesh);
            oldest.mesh.geometry.dispose();
            (oldest.mesh.material as THREE.Material).dispose();
          }
        }

        const geo = new THREE.PlaneGeometry(0.12 * (Math.random() * 0.5 + 0.8), 0.08 * (Math.random() * 0.5 + 0.8));
        const mat = new THREE.MeshBasicMaterial({
          map: this.kevlarDebrisTex,
          transparent: true,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        this.scene.add(mesh);

        const debVel = forwardDir.clone().multiplyScalar(3.0 + Math.random() * 4.5).add(new THREE.Vector3(
          (Math.random() - 0.5) * 5.0,
          Math.random() * 4.5 + 1.5,
          (Math.random() - 0.5) * 5.0
        ));

        this.debrisParticles.push({
          mesh,
          velocity: debVel,
          rotVel: new THREE.Vector3(
            (Math.random() - 0.5) * 18,
            (Math.random() - 0.5) * 18,
            (Math.random() - 0.5) * 18
          ),
          life: 1.2 + Math.random() * 0.6,
          maxLife: 1.2 + Math.random() * 0.6,
          isCeramic: false,
        });
      }

      const ceramicCount = profile.debrisCeramicCount;
      for (let i = 0; i < ceramicCount; i++) {
        if (this.debrisParticles.length >= this.maxDebrisMeshes) {
          const oldest = this.debrisParticles.shift();
          if (oldest) {
            this.scene.remove(oldest.mesh);
            oldest.mesh.geometry.dispose();
            (oldest.mesh.material as THREE.Material).dispose();
          }
        }

        const geo = new THREE.PlaneGeometry(0.14 * (Math.random() * 0.6 + 0.7), 0.10 * (Math.random() * 0.6 + 0.7));
        const mat = new THREE.MeshBasicMaterial({
          map: this.ceramicDebrisTex,
          transparent: true,
          side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
        this.scene.add(mesh);

        const debVel = forwardDir.clone().multiplyScalar(4.0 + Math.random() * 6.0).add(new THREE.Vector3(
          (Math.random() - 0.5) * 6.0,
          Math.random() * 5.0 + 2.0,
          (Math.random() - 0.5) * 6.0
        ));

        this.debrisParticles.push({
          mesh,
          velocity: debVel,
          rotVel: new THREE.Vector3(
            (Math.random() - 0.5) * 24,
            (Math.random() - 0.5) * 24,
            (Math.random() - 0.5) * 24
          ),
          life: 1.5 + Math.random() * 0.6,
          maxLife: 1.5 + Math.random() * 0.6,
          isCeramic: true,
        });
      }
    }

    // 4. SURFACE BLOOD SPLATTER DECAL (Floor Pooling)
    if (Math.random() < profile.decalChance && pos.y < 3.8) {
      this.spawnGroundBloodDecal(pos, profile.decalRadius);
    }
  }

  public spawnGroundBloodDecal(hitPos: THREE.Vector3, radius: number) {
    if (this.bloodDecals.length >= this.maxBloodDecals) {
      const oldest = this.bloodDecals.shift();
      if (oldest) {
        this.scene.remove(oldest.mesh);
        oldest.mesh.geometry.dispose();
        (oldest.mesh.material as THREE.Material).dispose();
      }
    }

    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({
      map: this.groundDecalTex,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const decalX = hitPos.x + (Math.random() - 0.5) * 0.5;
    const decalZ = hitPos.z + (Math.random() - 0.5) * 0.5;
    mesh.position.set(decalX, 0.025, decalZ);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.random() * Math.PI * 2;

    const targetScale = radius * (Math.random() * 0.35 + 0.85);
    const startScale = targetScale * 0.45;
    mesh.scale.set(startScale, startScale, 1);
    this.scene.add(mesh);

    this.bloodDecals.push({
      mesh,
      life: 14.0 + Math.random() * 6.0,
      maxLife: 14.0 + Math.random() * 6.0,
      targetScale,
      currentScale: startScale,
      initialOpacity: 0.95,
    });
  }

  // --- BLOOD SPLATTER PARTICLES (COMPATIBILITY WRAPPER) ---
  public emitBloodSplatter(pos: THREE.Vector3, dir: THREE.Vector3, isHeadshot: boolean = false) {
    this.emitProceduralImpact(pos, dir, 'm4', isHeadshot, true, isHeadshot ? 75 : 35);
  }

  // --- SHOCKWAVE RING & SCORCH CRATER SPAWNERS ---
  public spawnShockwaveRing(pos: THREE.Vector3, scale: number = 1.0) {
    if (this.shockwaveRings.length >= this.maxShockwaveRings) {
      const oldest = this.shockwaveRings.shift();
      if (oldest) {
        this.scene.remove(oldest.mesh);
        oldest.mesh.geometry.dispose();
        (oldest.mesh.material as THREE.Material).dispose();
      }
    }

    const geo = new THREE.RingGeometry(0.4, 1.1, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffedd5,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, Math.max(0.08, pos.y + 0.05), pos.z);
    mesh.scale.set(0.1, 0.1, 1);

    this.scene.add(mesh);

    this.shockwaveRings.push({
      mesh,
      life: 0.42,
      maxLife: 0.42,
      targetScale: 11.0 * scale,
      currentScale: 0.1,
      growthSpeed: 28.0 * scale,
      initialOpacity: 0.88,
    });
  }

  public spawnGroundScorchDecal(pos: THREE.Vector3, radius: number) {
    if (this.scorchDecals.length >= this.maxScorchDecals) {
      const oldest = this.scorchDecals.shift();
      if (oldest) {
        this.scene.remove(oldest.mesh);
        oldest.mesh.geometry.dispose();
        (oldest.mesh.material as THREE.Material).dispose();
      }
    }

    const geo = new THREE.PlaneGeometry(radius * 2, radius * 2);
    const mat = new THREE.MeshBasicMaterial({
      map: this.scorchCraterTex,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = Math.random() * Math.PI * 2;
    mesh.position.set(pos.x, 0.024, pos.z);
    mesh.scale.set(0.2, 0.2, 1);

    this.scene.add(mesh);

    this.scorchDecals.push({
      mesh,
      life: 28.0,
      maxLife: 28.0,
      targetScale: 1.0,
      currentScale: 0.2,
      initialOpacity: 0.94,
    });
  }

  // --- PROCEDURAL CINEMATIC EXPLOSION SYSTEM ---
  public emitExplosion(pos: THREE.Vector3, scale: number = 1.0) {
    const s = Math.max(0.5, scale);

    // 1. Dynamic Blast Flash Light (White-hot ignition decaying to fire orange)
    this.explosionLight.position.copy(pos);
    this.explosionLight.position.y += 1.2;
    this.explosionLight.color.setHex(0xfff7ed);
    this.explosionLight.intensity = 18.0 * s;
    this.explosionLightTimer = 0.45;

    // 2. Expanding Supersonic Shockwave Ring
    this.spawnShockwaveRing(pos, s);

    // 3. Ground Carbonized Scorch Crater Decal (if explosion is close to ground level)
    if (pos.y < 4.2) {
      this.spawnGroundScorchDecal(pos, 2.6 * s);
    }

    // 4. Dense Incandescent Fireball Core (Multi-temperature plasma expansion)
    const coreCount = Math.floor((80 + Math.random() * 30) * s);
    for (let i = 0; i < coreCount; i++) {
      const spreadDir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.5 + 0.3,
        (Math.random() - 0.5) * 2
      ).normalize();

      const speed = (Math.random() * 16 + 8) * s;
      const vel = spreadDir.multiplyScalar(speed);

      // Color gradation: central white/gold heat -> fiery orange -> dark crimson
      const randType = Math.random();
      let color: THREE.Color;
      if (randType < 0.35) {
        color = new THREE.Color(1.0, 0.98, 0.85); // White-hot core
      } else if (randType < 0.75) {
        color = new THREE.Color(1.0, Math.random() * 0.4 + 0.45, 0.05); // Flaming gold/orange
      } else {
        color = new THREE.Color(0.85 + Math.random() * 0.15, 0.12, 0.04); // Deep crimson flame
      }

      this.particles.push({
        position: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4)),
        velocity: vel,
        color,
        size: (Math.random() * 1.6 + 0.9) * s,
        alpha: 1.0,
        maxLife: 0.55 + Math.random() * 0.3,
        life: 0.55 + Math.random() * 0.3,
        gravity: -2.0, // Hot gas thermal buoyancy rising
      });
    }

    // 5. High-Velocity Incandescent Embers & Sparks (Cascading parabolic trails)
    const sparkCount = Math.floor((90 + Math.random() * 40) * s);
    for (let i = 0; i < sparkCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 1.8 - 0.9);
      const sparkDir = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.abs(Math.cos(phi)) * 0.9 + 0.25,
        Math.sin(phi) * Math.sin(theta)
      ).normalize();

      const speed = (Math.random() * 24 + 14) * s;
      const vel = sparkDir.multiplyScalar(speed);

      this.particles.push({
        position: pos.clone(),
        velocity: vel,
        color: new THREE.Color(1.0, Math.random() * 0.5 + 0.5, 0.08), // Bright gold ember
        size: (Math.random() * 0.35 + 0.2) * s,
        alpha: 1.0,
        maxLife: 1.0 + Math.random() * 0.9,
        life: 1.0 + Math.random() * 0.9,
        gravity: 16.0 + Math.random() * 6.0, // Heavy downward gravity arc
      });
    }

    // 6. Ground Dirt / Earth Dust Kick-up Fountain
    if (pos.y < 3.0) {
      const dustCount = Math.floor(45 * s);
      for (let i = 0; i < dustCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.5;
        const vel = new THREE.Vector3(
          Math.cos(angle) * (Math.random() * 10 + 4) * s,
          (Math.random() * 12 + 5) * s,
          Math.sin(angle) * (Math.random() * 10 + 4) * s
        );

        this.particles.push({
          position: pos.clone().add(new THREE.Vector3(Math.cos(angle) * radius, 0.1, Math.sin(angle) * radius)),
          velocity: vel,
          color: new THREE.Color(0.42 + (Math.random() - 0.5) * 0.08, 0.38 + (Math.random() - 0.5) * 0.08, 0.32),
          size: (Math.random() * 1.2 + 0.6) * s,
          alpha: 0.85,
          maxLife: 1.2 + Math.random() * 0.5,
          life: 1.2 + Math.random() * 0.5,
          gravity: 18.0,
        });
      }
    }

    // 7. Heavy Volumetric Black & Charcoal Smoke Plume
    const smokeCount = Math.floor((45 + Math.random() * 20) * s);
    for (let i = 0; i < smokeCount; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 8 * s,
        (Math.random() * 9 + 4) * s,
        (Math.random() - 0.5) * 8 * s
      );

      const grayTone = Math.random() * 0.12 + 0.10;
      this.particles.push({
        position: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, Math.random() * 0.5, (Math.random() - 0.5) * 0.8)),
        velocity: vel,
        color: new THREE.Color(grayTone, grayTone, grayTone * 1.05),
        size: (Math.random() * 2.4 + 1.6) * s,
        alpha: 0.85,
        maxLife: 2.2 + Math.random() * 1.2,
        life: 2.2 + Math.random() * 1.2,
        gravity: -1.6, // Rising billowing column
      });
    }

    // 8. Flying 3D Jagged Shrapnel & Debris Chunks (Physics-enabled tumbling meshes)
    const shrapnelCount = Math.min(22, Math.floor(14 * s));
    for (let i = 0; i < shrapnelCount; i++) {
      if (this.debrisParticles.length >= this.maxDebrisMeshes) {
        const oldest = this.debrisParticles.shift();
        if (oldest) {
          this.scene.remove(oldest.mesh);
          oldest.mesh.geometry.dispose();
          (oldest.mesh.material as THREE.Material).dispose();
        }
      }

      const geo = new THREE.PlaneGeometry(0.18 * (Math.random() * 0.6 + 0.7) * s, 0.12 * (Math.random() * 0.6 + 0.7) * s);
      const mat = new THREE.MeshBasicMaterial({
        map: this.shrapnelTex,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.scene.add(mesh);

      const shrapnelVel = new THREE.Vector3(
        (Math.random() - 0.5) * 22 * s,
        (Math.random() * 14 + 5) * s,
        (Math.random() - 0.5) * 22 * s
      );

      this.debrisParticles.push({
        mesh,
        velocity: shrapnelVel,
        rotVel: new THREE.Vector3(
          (Math.random() - 0.5) * 32,
          (Math.random() - 0.5) * 32,
          (Math.random() - 0.5) * 32
        ),
        life: 1.8 + Math.random() * 0.8,
        maxLife: 1.8 + Math.random() * 0.8,
        isCeramic: false,
      });
    }
  }

  // --- VOLUMETRIC TACTICAL SMOKE GRENADE BILLOWING PUFFS ---
  public emitSmokeCloudPuff(pos: THREE.Vector3, radius: number = 3.5, color: THREE.Color = new THREE.Color(0.85, 0.88, 0.9)) {
    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius;
      const pPos = pos.clone().add(new THREE.Vector3(
        Math.cos(angle) * dist,
        Math.random() * 2.2 + 0.2,
        Math.sin(angle) * dist
      ));

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 1.2,
        Math.random() * 0.6 + 0.2,
        (Math.random() - 0.5) * 1.2
      );

      this.particles.push({
        position: pPos,
        velocity: vel,
        color: color.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.1),
        size: Math.random() * 2.5 + 2.0,
        alpha: 0.85,
        maxLife: 3.5 + Math.random() * 1.5,
        life: 3.5 + Math.random() * 1.5,
        gravity: -0.05,
      });
    }
  }

  // --- GLOO WALL DEPLOYMENT CRYO SPARKS ---
  public emitGlooWallSparks(pos: THREE.Vector3) {
    for (let i = 0; i < 28; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 4 + 1.5,
        (Math.random() - 0.5) * 6
      );
      this.particles.push({
        position: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.5)),
        velocity: vel,
        color: new THREE.Color(0.25, 0.85, 1.0),
        size: 0.28,
        alpha: 0.95,
        maxLife: 0.65,
        life: 0.65,
        gravity: 4.0,
      });
    }
  }

  // --- MOTION SENSOR RADAR SONAR RING EMISSION ---
  public emitSensorWave(pos: THREE.Vector3, currentRadius: number) {
    const count = 24;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const ringPos = pos.clone().add(new THREE.Vector3(
        Math.cos(angle) * currentRadius,
        0.15,
        Math.sin(angle) * currentRadius
      ));

      this.particles.push({
        position: ringPos,
        velocity: new THREE.Vector3(Math.cos(angle) * 2.0, 0.1, Math.sin(angle) * 2.0),
        color: new THREE.Color(0.1, 0.9, 0.7),
        size: 0.22,
        alpha: 0.8,
        maxLife: 0.35,
        life: 0.35,
        gravity: 0,
      });
    }
  }

  // --- TACTICAL KNIFE SLASH EFFECT ---
  public emitKnifeSlashEffect(pos: THREE.Vector3, forward: THREE.Vector3) {
    for (let i = 0; i < 18; i++) {
      const vel = forward.clone().multiplyScalar(4).add(new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 3
      ));
      this.particles.push({
        position: pos.clone(),
        velocity: vel,
        color: new THREE.Color(0.2, 0.85, 1.0),
        size: 0.22,
        alpha: 0.95,
        maxLife: 0.2,
        life: 0.2,
        gravity: 0,
      });
    }
  }

  // --- SUPPLY PICKUP AURA BURST ---
  public emitSupplyPickup(pos: THREE.Vector3, colorHex: number) {
    const col = new THREE.Color(colorHex);
    for (let i = 0; i < 24; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 4 + 2,
        (Math.random() - 0.5) * 4
      );
      this.particles.push({
        position: pos.clone(),
        velocity: vel,
        color: col,
        size: 0.3,
        alpha: 1.0,
        maxLife: 0.5,
        life: 0.5,
        gravity: 2.0,
      });
    }
  }

  // --- AUTHENTIC BRASS & SHOTSHELL CASING EJECTION ---
  public emitShellCasing(pos: THREE.Vector3, rightDir: THREE.Vector3, weaponType: string = 'm4') {
    let mesh: THREE.Mesh;

    if (weaponType === 'shotgun') {
      // 12-Gauge Red Plastic Hull with Brass Head
      const geo = new THREE.CylinderGeometry(0.012, 0.012, 0.065, 10);
      geo.rotateZ(Math.PI / 2);
      const mat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35, metalness: 0.1 });
      mesh = new THREE.Mesh(geo, mat);
    } else if (weaponType === 'sniper') {
      // Massive .50 BMG Heavy Casing
      const geo = new THREE.CylinderGeometry(0.015, 0.015, 0.095, 10);
      geo.rotateZ(Math.PI / 2);
      const mat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.95, roughness: 0.18 });
      mesh = new THREE.Mesh(geo, mat);
    } else if (weaponType === 'mp5') {
      // Compact 9x19mm Parabellum Brass
      const geo = new THREE.CylinderGeometry(0.007, 0.007, 0.024, 8);
      geo.rotateZ(Math.PI / 2);
      const mat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.22 });
      mesh = new THREE.Mesh(geo, mat);
    } else {
      // 5.56x45mm NATO Bottleneck Brass or .50 AE
      const geo = new THREE.CylinderGeometry(0.008, 0.008, 0.038, 8);
      geo.rotateZ(Math.PI / 2);
      const mat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.92, roughness: 0.2 });
      mesh = new THREE.Mesh(geo, mat);
    }

    mesh.position.copy(pos);
    this.scene.add(mesh);

    const lateralForce = weaponType === 'sniper' ? 4.2 : weaponType === 'shotgun' ? 3.0 : 2.5;
    const vel = rightDir.clone().multiplyScalar(Math.random() * 1.5 + lateralForce).add(new THREE.Vector3(0, Math.random() * 1.5 + 2.0, 0));
    const rotVel = new THREE.Vector3(Math.random() * 24 - 12, Math.random() * 24 - 12, Math.random() * 24 - 12);

    this.shellCasings.push({ mesh, velocity: vel, rotVel, life: 3.5 });
  }

  // --- FRAME UPDATE ---
  public update(dt: number) {
    // 0. Update Dynamic Lights
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlashLight.intensity = 0;
      } else {
        this.muzzleFlashLight.intensity = (this.muzzleFlashTimer / 0.05) * 1.8;
      }
    }

    if (this.explosionLightTimer > 0) {
      this.explosionLightTimer -= dt;
      if (this.explosionLightTimer <= 0) {
        this.explosionLight.intensity = 0;
      } else {
        const ratio = this.explosionLightTimer / 0.45;
        this.explosionLight.intensity = ratio * 18.0;
        if (ratio < 0.45) {
          this.explosionLight.color.setHex(0xf97316);
        }
      }
    }

    // 1. Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.gravity) {
        p.velocity.y -= p.gravity * dt;
      }
      p.position.addScaledVector(p.velocity, dt);
    }

    // Update GPU Buffer
    let idx = 0;
    const len = Math.min(this.particles.length, this.maxParticles);
    for (let i = 0; i < len; i++) {
      const p = this.particles[i];
      const alphaRatio = p.life / p.maxLife;

      this.posArray[idx * 3] = p.position.x;
      this.posArray[idx * 3 + 1] = p.position.y;
      this.posArray[idx * 3 + 2] = p.position.z;

      this.colorArray[idx * 3] = p.color.r * alphaRatio;
      this.colorArray[idx * 3 + 1] = p.color.g * alphaRatio;
      this.colorArray[idx * 3 + 2] = p.color.b * alphaRatio;
      idx++;
    }

    // Zero out unused
    for (let i = idx; i < this.maxParticles; i++) {
      this.posArray[i * 3] = 0;
      this.posArray[i * 3 + 1] = -9999;
      this.posArray[i * 3 + 2] = 0;
    }

    this.pointsGeo.attributes.position.needsUpdate = true;
    this.pointsGeo.attributes.color.needsUpdate = true;

    // 1.1 Update Blood Particles (Normal Blending)
    for (let i = this.bloodParticles.length - 1; i >= 0; i--) {
      const bp = this.bloodParticles[i];
      bp.life -= dt;
      if (bp.life <= 0) {
        this.bloodParticles.splice(i, 1);
        continue;
      }

      bp.velocity.y -= bp.gravity * dt;
      bp.velocity.multiplyScalar(Math.max(0, 1 - bp.drag * dt));
      bp.position.addScaledVector(bp.velocity, dt);

      // Floor ground collision
      if (bp.position.y <= 0.035) {
        if (bp.canDecal && Math.random() < 0.28) {
          this.spawnGroundBloodDecal(bp.position, bp.size * 1.5);
          bp.canDecal = false;
        }
        this.bloodParticles.splice(i, 1);
      }
    }

    // Update Blood GPU Buffer
    let bIdx = 0;
    const bLen = Math.min(this.bloodParticles.length, this.maxBloodParticles);
    for (let i = 0; i < bLen; i++) {
      const bp = this.bloodParticles[i];
      const alphaRatio = bp.life / bp.maxLife;

      this.bloodPosArray[bIdx * 3] = bp.position.x;
      this.bloodPosArray[bIdx * 3 + 1] = bp.position.y;
      this.bloodPosArray[bIdx * 3 + 2] = bp.position.z;

      this.bloodColorArray[bIdx * 3] = bp.color.r * alphaRatio;
      this.bloodColorArray[bIdx * 3 + 1] = bp.color.g * alphaRatio;
      this.bloodColorArray[bIdx * 3 + 2] = bp.color.b * alphaRatio;
      bIdx++;
    }
    for (let i = bIdx; i < this.maxBloodParticles; i++) {
      this.bloodPosArray[i * 3] = 0;
      this.bloodPosArray[i * 3 + 1] = -9999;
      this.bloodPosArray[i * 3 + 2] = 0;
    }
    this.bloodPointsGeo.attributes.position.needsUpdate = true;
    this.bloodPointsGeo.attributes.color.needsUpdate = true;

    // 1.2 Update Arterial Mist Particles
    for (let i = this.mistParticles.length - 1; i >= 0; i--) {
      const mp = this.mistParticles[i];
      mp.life -= dt;
      if (mp.life <= 0) {
        this.mistParticles.splice(i, 1);
        continue;
      }

      mp.velocity.y -= mp.gravity * dt;
      mp.velocity.multiplyScalar(Math.max(0, 1 - mp.drag * dt));
      mp.position.addScaledVector(mp.velocity, dt);
    }

    let mIdx = 0;
    const mLen = Math.min(this.mistParticles.length, this.maxMistParticles);
    for (let i = 0; i < mLen; i++) {
      const mp = this.mistParticles[i];
      const alphaRatio = mp.life / mp.maxLife;

      this.mistPosArray[mIdx * 3] = mp.position.x;
      this.mistPosArray[mIdx * 3 + 1] = mp.position.y;
      this.mistPosArray[mIdx * 3 + 2] = mp.position.z;

      this.mistColorArray[mIdx * 3] = mp.color.r * alphaRatio;
      this.mistColorArray[mIdx * 3 + 1] = mp.color.g * alphaRatio;
      this.mistColorArray[mIdx * 3 + 2] = mp.color.b * alphaRatio;
      mIdx++;
    }
    for (let i = mIdx; i < this.maxMistParticles; i++) {
      this.mistPosArray[i * 3] = 0;
      this.mistPosArray[i * 3 + 1] = -9999;
      this.mistPosArray[i * 3 + 2] = 0;
    }
    this.mistPointsGeo.attributes.position.needsUpdate = true;
    this.mistPointsGeo.attributes.color.needsUpdate = true;

    // 1.3 Update Physical Debris Particles (Kevlar/Ceramic tumbling & bouncing)
    for (let i = this.debrisParticles.length - 1; i >= 0; i--) {
      const dp = this.debrisParticles[i];
      dp.life -= dt;
      if (dp.life <= 0) {
        this.scene.remove(dp.mesh);
        dp.mesh.geometry.dispose();
        (dp.mesh.material as THREE.Material).dispose();
        this.debrisParticles.splice(i, 1);
        continue;
      }

      dp.velocity.y -= 13.0 * dt;
      dp.mesh.position.addScaledVector(dp.velocity, dt);
      dp.mesh.rotation.x += dp.rotVel.x * dt;
      dp.mesh.rotation.y += dp.rotVel.y * dt;
      dp.mesh.rotation.z += dp.rotVel.z * dt;

      // Floor bounce & friction
      if (dp.mesh.position.y <= 0.04) {
        dp.mesh.position.y = 0.04;
        dp.velocity.y = -dp.velocity.y * 0.28;
        dp.velocity.x *= 0.65;
        dp.velocity.z *= 0.65;
        dp.rotVel.multiplyScalar(0.7);
      }
    }

    // 1.4 Update Surface Blood Decals (Expansion & slow fading)
    for (let i = this.bloodDecals.length - 1; i >= 0; i--) {
      const bd = this.bloodDecals[i];
      bd.life -= dt;
      if (bd.life <= 0) {
        this.scene.remove(bd.mesh);
        bd.mesh.geometry.dispose();
        (bd.mesh.material as THREE.Material).dispose();
        this.bloodDecals.splice(i, 1);
        continue;
      }

      if (bd.currentScale < bd.targetScale) {
        bd.currentScale = Math.min(bd.targetScale, bd.currentScale + (bd.targetScale - bd.currentScale) * 14.0 * dt);
        bd.mesh.scale.set(bd.currentScale, bd.currentScale, 1);
      }

      if (bd.life < 3.0) {
        const mat = bd.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = (bd.life / 3.0) * bd.initialOpacity;
      }
    }

    // 1.5 Update Shockwave Rings (Supersonic blast radial expansion & alpha fade)
    for (let i = this.shockwaveRings.length - 1; i >= 0; i--) {
      const ring = this.shockwaveRings[i];
      ring.life -= dt;
      if (ring.life <= 0) {
        this.scene.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        (ring.mesh.material as THREE.Material).dispose();
        this.shockwaveRings.splice(i, 1);
        continue;
      }

      ring.currentScale += ring.growthSpeed * dt;
      ring.mesh.scale.set(ring.currentScale, ring.currentScale, 1);

      const alphaRatio = ring.life / ring.maxLife;
      const mat = ring.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.pow(alphaRatio, 1.4) * ring.initialOpacity;
    }

    // 1.6 Update Ground Scorch Decals (Persistent charred carbon blast craters)
    for (let i = this.scorchDecals.length - 1; i >= 0; i--) {
      const sd = this.scorchDecals[i];
      sd.life -= dt;
      if (sd.life <= 0) {
        this.scene.remove(sd.mesh);
        sd.mesh.geometry.dispose();
        (sd.mesh.material as THREE.Material).dispose();
        this.scorchDecals.splice(i, 1);
        continue;
      }

      if (sd.currentScale < sd.targetScale) {
        sd.currentScale = Math.min(sd.targetScale, sd.currentScale + (sd.targetScale - sd.currentScale) * 16.0 * dt);
        sd.mesh.scale.set(sd.currentScale, sd.currentScale, 1);
      }

      if (sd.life < 6.0) {
        const mat = sd.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = (sd.life / 6.0) * sd.initialOpacity;
      }
    }

    // 2. Update Tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      const distTotal = t.start.distanceTo(t.end);
      t.progress += (t.speed * dt) / Math.max(1, distTotal);

      if (t.progress >= 1) {
        this.scene.remove(t.mesh);
        t.mesh.geometry.dispose();
        (t.mesh.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
        continue;
      }

      const head = t.start.clone().lerp(t.end, Math.min(1, t.progress));
      const tail = t.start.clone().lerp(t.end, Math.max(0, t.progress - 0.2));
      const positions = new Float32Array([tail.x, tail.y, tail.z, head.x, head.y, head.z]);
      t.mesh.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    }

    // 3. Update Shell Casings
    for (let i = this.shellCasings.length - 1; i >= 0; i--) {
      const sc = this.shellCasings[i];
      sc.life -= dt;
      if (sc.life <= 0) {
        this.scene.remove(sc.mesh);
        sc.mesh.geometry.dispose();
        (sc.mesh.material as THREE.Material).dispose();
        this.shellCasings.splice(i, 1);
        continue;
      }

      sc.velocity.y -= 9.8 * dt;
      sc.mesh.position.addScaledVector(sc.velocity, dt);
      sc.mesh.rotation.x += sc.rotVel.x * dt;
      sc.mesh.rotation.y += sc.rotVel.y * dt;
      sc.mesh.rotation.z += sc.rotVel.z * dt;

      // Floor bounce
      if (sc.mesh.position.y <= 0.03) {
        sc.mesh.position.y = 0.03;
        sc.velocity.y = -sc.velocity.y * 0.4;
        sc.velocity.x *= 0.6;
        sc.velocity.z *= 0.6;
      }
    }
  }
}
