import * as THREE from 'three';
import { EnvironmentState, TimeOfDay, WeatherType } from '../types';
import { soundManager } from './audio';
import { ParticleSystem } from './particles';

export interface WeatherPresetConfig {
  id: WeatherType;
  name: string;
  timeOfDay: TimeOfDay;
  timeString: string;
  temperatureStr: string;
  ambientColor: number;
  ambientIntensity: number;
  sunColor: number;
  sunIntensity: number;
  sunPos: [number, number, number];
  fillColor: number;
  fillIntensity: number;
  fogColor: number;
  fogDensity: number;
  skyTopColor: string;
  skyMidColor: string;
  skyHorizonColor: string;
  sunFlareColor: string;
  sunFlareSize: number;
  hasStars: boolean;
  rainIntensity: number; // 0 to 1
  dustIntensity: number; // 0 to 1
  windSpeedKts: number;
  windDir: THREE.Vector3;
  windDirStr: string;
  visibilityPct: number;
  groundRoughness: number;
  groundMetalness: number;
}

export const WEATHER_PRESETS: Record<WeatherType, WeatherPresetConfig> = {
  clear_day: {
    id: 'clear_day',
    name: 'Clear High Noon',
    timeOfDay: 'noon',
    timeString: '12:00 HRS',
    temperatureStr: '28°C (82°F)',
    ambientColor: 0x94a3b8,
    ambientIntensity: 0.95,
    sunColor: 0xffedd5,
    sunIntensity: 2.4,
    sunPos: [20, 75, -20],
    fillColor: 0x38bdf8,
    fillIntensity: 0.8,
    fogColor: 0x334155,
    fogDensity: 0.008,
    skyTopColor: '#0369a1',
    skyMidColor: '#38bdf8',
    skyHorizonColor: '#bae6fd',
    sunFlareColor: 'rgba(255, 255, 240, 0.95)',
    sunFlareSize: 180,
    hasStars: false,
    rainIntensity: 0,
    dustIntensity: 0.05,
    windSpeedKts: 6,
    windDir: new THREE.Vector3(1, 0, 0.5).normalize(),
    windDirStr: '06 KTS NE',
    visibilityPct: 98,
    groundRoughness: 0.8,
    groundMetalness: 0.15,
  },
  golden_sunset: {
    id: 'golden_sunset',
    name: 'Golden Sunset / Twilight',
    timeOfDay: 'sunset',
    timeString: '18:45 HRS',
    temperatureStr: '22°C (71°F)',
    ambientColor: 0x7c2d12,
    ambientIntensity: 0.85,
    sunColor: 0xfb923c,
    sunIntensity: 2.8,
    sunPos: [55, 24, -45],
    fillColor: 0x6366f1,
    fillIntensity: 0.7,
    fogColor: 0x451a03,
    fogDensity: 0.014,
    skyTopColor: '#0f172a',
    skyMidColor: '#431407',
    skyHorizonColor: '#ea580c',
    sunFlareColor: 'rgba(251, 146, 60, 0.9)',
    sunFlareSize: 260,
    hasStars: false,
    rainIntensity: 0,
    dustIntensity: 0.1,
    windSpeedKts: 11,
    windDir: new THREE.Vector3(-1, 0, 0.8).normalize(),
    windDirStr: '11 KTS WNW',
    visibilityPct: 86,
    groundRoughness: 0.75,
    groundMetalness: 0.2,
  },
  tactical_storm: {
    id: 'tactical_storm',
    name: 'Tactical Thunderstorm',
    timeOfDay: 'storm',
    timeString: '21:15 HRS',
    temperatureStr: '16°C (61°F)',
    ambientColor: 0x1e293b,
    ambientIntensity: 0.65,
    sunColor: 0x64748b,
    sunIntensity: 1.1,
    sunPos: [10, 45, -30],
    fillColor: 0x0284c7,
    fillIntensity: 0.6,
    fogColor: 0x0f172a,
    fogDensity: 0.026,
    skyTopColor: '#020617',
    skyMidColor: '#0f172a',
    skyHorizonColor: '#1e293b',
    sunFlareColor: 'rgba(100, 116, 139, 0.2)',
    sunFlareSize: 60,
    hasStars: false,
    rainIntensity: 1.0,
    dustIntensity: 0,
    windSpeedKts: 28,
    windDir: new THREE.Vector3(-1.2, 0, -0.6).normalize(),
    windDirStr: '28 KTS W (GUSTS 38)',
    visibilityPct: 52,
    groundRoughness: 0.2, // Wet asphalt sheen!
    groundMetalness: 0.55,
  },
  midnight_fog: {
    id: 'midnight_fog',
    name: 'Midnight Ops (Night Fog)',
    timeOfDay: 'night',
    timeString: '01:30 HRS',
    temperatureStr: '13°C (55°F)',
    ambientColor: 0x0f172a,
    ambientIntensity: 0.45,
    sunColor: 0x38bdf8, // Moonlight
    sunIntensity: 1.2,
    sunPos: [-35, 55, 35],
    fillColor: 0x1e1b4b,
    fillIntensity: 0.5,
    fogColor: 0x020617,
    fogDensity: 0.022,
    skyTopColor: '#000000',
    skyMidColor: '#020617',
    skyHorizonColor: '#0f172a',
    sunFlareColor: 'rgba(186, 230, 253, 0.7)',
    sunFlareSize: 100,
    hasStars: true,
    rainIntensity: 0,
    dustIntensity: 0.04,
    windSpeedKts: 8,
    windDir: new THREE.Vector3(0.5, 0, -1).normalize(),
    windDirStr: '08 KTS SSE',
    visibilityPct: 65,
    groundRoughness: 0.65,
    groundMetalness: 0.3,
  },
  sandstorm: {
    id: 'sandstorm',
    name: 'Desert Sandstorm',
    timeOfDay: 'sandstorm',
    timeString: '15:20 HRS',
    temperatureStr: '37°C (99°F)',
    ambientColor: 0x78350f,
    ambientIntensity: 0.8,
    sunColor: 0xd97706,
    sunIntensity: 1.5,
    sunPos: [40, 50, -40],
    fillColor: 0x92400e,
    fillIntensity: 0.9,
    fogColor: 0x451a03,
    fogDensity: 0.042,
    skyTopColor: '#451a03',
    skyMidColor: '#78350f',
    skyHorizonColor: '#b45309',
    sunFlareColor: 'rgba(217, 119, 6, 0.4)',
    sunFlareSize: 140,
    hasStars: false,
    rainIntensity: 0,
    dustIntensity: 1.0,
    windSpeedKts: 35,
    windDir: new THREE.Vector3(1.5, 0, 0.3).normalize(),
    windDirStr: '35 KTS ENE (HEAVY DUST)',
    visibilityPct: 38,
    groundRoughness: 0.95,
    groundMetalness: 0.05,
  },
  dynamic_cycle: {
    id: 'dynamic_cycle',
    name: 'Dynamic Time Cycle',
    timeOfDay: 'noon',
    timeString: '12:00 HRS',
    temperatureStr: '26°C (79°F)',
    ambientColor: 0x94a3b8,
    ambientIntensity: 0.95,
    sunColor: 0xffedd5,
    sunIntensity: 2.4,
    sunPos: [20, 75, -20],
    fillColor: 0x38bdf8,
    fillIntensity: 0.8,
    fogColor: 0x334155,
    fogDensity: 0.01,
    skyTopColor: '#0369a1',
    skyMidColor: '#38bdf8',
    skyHorizonColor: '#bae6fd',
    sunFlareColor: 'rgba(255, 255, 240, 0.95)',
    sunFlareSize: 180,
    hasStars: false,
    rainIntensity: 0,
    dustIntensity: 0.05,
    windSpeedKts: 12,
    windDir: new THREE.Vector3(1, 0, 0.5).normalize(),
    windDirStr: '12 KTS NE',
    visibilityPct: 95,
    groundRoughness: 0.8,
    groundMetalness: 0.15,
  },
};

export class EnvironmentManager {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private particles: ParticleSystem;

  // Scene Lights
  public ambientLight: THREE.AmbientLight;
  public sunLight: THREE.DirectionalLight;
  public fillLight: THREE.DirectionalLight;
  public skyDome: THREE.Mesh;
  private skyCanvas: HTMLCanvasElement;
  private skyTexture: THREE.CanvasTexture;

  // Current State
  public currentWeather: WeatherType = 'clear_day';
  public targetWeather: WeatherType = 'clear_day';
  public isDynamicCycle: boolean = false;
  public cycleTimeSec: number = 0; // Advances in dynamic mode
  public transitionProgress: number = 1.0; // 0 to 1 lerp
  public transitionDuration: number = 3.5;

  // Lightning system
  private lightningTimer: number = 0;
  private nextLightningDelay: number = 5.0;
  private isLightningFlashing: boolean = false;
  private lightningFlashDuration: number = 0;
  private lightningBaseAmbient: number = 0.65;
  private lightningBaseSun: number = 1.1;

  // Rain Particle System
  private rainGeometry!: THREE.BufferGeometry;
  private rainMaterial!: THREE.PointsMaterial;
  private rainPoints!: THREE.Points;
  private rainCount: number = 3500;
  private rainPositions!: Float32Array;
  private rainVelocities!: Float32Array;

  // Dust / Sandstorm Particle System
  private dustGeometry!: THREE.BufferGeometry;
  private dustMaterial!: THREE.PointsMaterial;
  private dustPoints!: THREE.Points;
  private dustCount: number = 1800;
  private dustPositions!: Float32Array;
  private dustVelocities!: Float32Array;

  // Wetness targets
  private mapMaterials: THREE.MeshStandardMaterial[] = [];

  // Callback
  public onEnvironmentChange: (state: EnvironmentState) => void = () => {};

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    particles: ParticleSystem,
    initialPreset: WeatherType = 'clear_day'
  ) {
    this.scene = scene;
    this.camera = camera;
    this.particles = particles;

    // 1. Initialize Lights
    this.ambientLight = new THREE.AmbientLight(0x94a3b8, 0.95);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffedd5, 2.4);
    this.sunLight.position.set(20, 75, -20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 170;
    this.sunLight.shadow.camera.left = -60;
    this.sunLight.shadow.camera.right = 60;
    this.sunLight.shadow.camera.top = 60;
    this.sunLight.shadow.camera.bottom = -60;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    this.fillLight.position.set(-35, 30, 45);
    this.scene.add(this.fillLight);

    // 2. Initialize Fog
    this.scene.fog = new THREE.FogExp2(0x334155, 0.008);

    // 3. Sky Dome Canvas Texture
    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = 1024;
    this.skyCanvas.height = 512;
    this.skyTexture = new THREE.CanvasTexture(this.skyCanvas);

    const skyGeo = new THREE.SphereGeometry(145, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      map: this.skyTexture,
      side: THREE.BackSide,
      fog: false,
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    // 4. Initialize Volumetric Rain & Dust Particles
    this.initRainParticles();
    this.initDustParticles();

    // 5. Apply Initial Preset
    this.setWeather(initialPreset, true);
  }

  // Register map materials to receive wetness/reflection changes
  public registerMapMaterial(mat: THREE.MeshStandardMaterial) {
    this.mapMaterials.push(mat);
  }

  private initRainParticles() {
    this.rainPositions = new Float32Array(this.rainCount * 3);
    this.rainVelocities = new Float32Array(this.rainCount * 3);

    for (let i = 0; i < this.rainCount; i++) {
      const idx = i * 3;
      this.rainPositions[idx] = (Math.random() - 0.5) * 80;
      this.rainPositions[idx + 1] = Math.random() * 40;
      this.rainPositions[idx + 2] = (Math.random() - 0.5) * 80;

      this.rainVelocities[idx] = -4 + Math.random() * 2; // Wind drift X
      this.rainVelocities[idx + 1] = -42 - Math.random() * 12; // Falling speed
      this.rainVelocities[idx + 2] = -2 + Math.random() * 2; // Wind drift Z
    }

    this.rainGeometry = new THREE.BufferGeometry();
    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));

    // Vertical elongated streak canvas texture for rain
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(8, 0, 8, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.5, 'rgba(186, 230, 253, 0.7)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(6, 0, 4, 64);
    const rainTex = new THREE.CanvasTexture(canvas);

    this.rainMaterial = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.45,
      map: rainTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.rainPoints = new THREE.Points(this.rainGeometry, this.rainMaterial);
    this.scene.add(this.rainPoints);
  }

  private initDustParticles() {
    this.dustPositions = new Float32Array(this.dustCount * 3);
    this.dustVelocities = new Float32Array(this.dustCount * 3);

    for (let i = 0; i < this.dustCount; i++) {
      const idx = i * 3;
      this.dustPositions[idx] = (Math.random() - 0.5) * 80;
      this.dustPositions[idx + 1] = Math.random() * 25;
      this.dustPositions[idx + 2] = (Math.random() - 0.5) * 80;

      this.dustVelocities[idx] = 12 + Math.random() * 10;
      this.dustVelocities[idx + 1] = (Math.random() - 0.5) * 2;
      this.dustVelocities[idx + 2] = 2 + Math.random() * 4;
    }

    this.dustGeometry = new THREE.BufferGeometry();
    this.dustGeometry.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(16, 16, 2, 16, 16, 15);
    grad.addColorStop(0, 'rgba(217, 119, 6, 0.9)');
    grad.addColorStop(0.5, 'rgba(180, 83, 9, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const dustTex = new THREE.CanvasTexture(canvas);

    this.dustMaterial = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.35,
      map: dustTex,
      transparent: true,
      opacity: 0,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    this.dustPoints = new THREE.Points(this.dustGeometry, this.dustMaterial);
    this.scene.add(this.dustPoints);
  }

  // --- SET WEATHER / TRANSITIONS ---
  public setWeather(preset: WeatherType, immediate: boolean = false) {
    if (preset === 'dynamic_cycle') {
      this.isDynamicCycle = true;
      this.currentWeather = 'dynamic_cycle';
      this.targetWeather = 'clear_day';
      this.cycleTimeSec = 0;
    } else {
      this.isDynamicCycle = false;
      this.targetWeather = preset;
    }

    if (immediate) {
      this.currentWeather = preset === 'dynamic_cycle' ? 'clear_day' : preset;
      this.transitionProgress = 1.0;
      this.applyPreset(WEATHER_PRESETS[this.currentWeather]);
    } else {
      this.transitionProgress = 0.0;
      soundManager.playWeatherShiftNotice();
    }

    const currentCfg = WEATHER_PRESETS[this.currentWeather];
    soundManager.setWeatherAudio(this.currentWeather, currentCfg.rainIntensity > 0 ? currentCfg.rainIntensity : currentCfg.dustIntensity);
    this.emitState();
  }

  public toggleNextWeather(): WeatherType {
    const sequence: WeatherType[] = [
      'clear_day',
      'golden_sunset',
      'tactical_storm',
      'midnight_fog',
      'sandstorm',
      'dynamic_cycle',
    ];
    const nextIdx = (sequence.indexOf(this.currentWeather) + 1) % sequence.length;
    const nextPreset = sequence[nextIdx];
    this.setWeather(nextPreset);
    return nextPreset;
  }

  private applyPreset(cfg: WeatherPresetConfig) {
    this.ambientLight.color.setHex(cfg.ambientColor);
    this.ambientLight.intensity = cfg.ambientIntensity;

    this.sunLight.color.setHex(cfg.sunColor);
    this.sunLight.intensity = cfg.sunIntensity;
    this.sunLight.position.set(...cfg.sunPos);

    this.fillLight.color.setHex(cfg.fillColor);
    this.fillLight.intensity = cfg.fillIntensity;

    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(cfg.fogColor);
      this.scene.fog.density = cfg.fogDensity;
    }

    this.rainMaterial.opacity = cfg.rainIntensity * 0.85;
    this.dustMaterial.opacity = cfg.dustIntensity * 0.75;

    // Apply ground wetness & reflection sheen
    this.mapMaterials.forEach(mat => {
      mat.roughness = cfg.groundRoughness;
      mat.metalness = cfg.groundMetalness;
      mat.needsUpdate = true;
    });

    this.drawSky(cfg);
  }

  private drawSky(cfg: WeatherPresetConfig) {
    const ctx = this.skyCanvas.getContext('2d')!;
    const w = 1024;
    const h = 512;

    // Vertical Sky Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, cfg.skyTopColor);
    grad.addColorStop(0.55, cfg.skyMidColor);
    grad.addColorStop(1, cfg.skyHorizonColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Stars at night
    if (cfg.hasStars) {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 180; i++) {
        const sx = Math.sin(i * 99) * 512 + 512;
        const sy = (Math.cos(i * 33) * 0.5 + 0.5) * 320;
        const radius = (i % 3 === 0 ? 1.5 : 0.8);
        ctx.globalAlpha = 0.4 + (i % 5) * 0.12;
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }

    // Sun / Moon / Flare
    const flareX = 512;
    const flareY = cfg.timeOfDay === 'sunset' ? 380 : cfg.timeOfDay === 'night' ? 140 : 260;
    const sunGrad = ctx.createRadialGradient(flareX, flareY, 5, flareX, flareY, cfg.sunFlareSize);
    sunGrad.addColorStop(0, cfg.sunFlareColor);
    sunGrad.addColorStop(0.35, cfg.sunFlareColor.replace('0.9', '0.4').replace('0.95', '0.4'));
    sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, w, h);

    // Mountain silhouettes on horizon
    ctx.fillStyle = cfg.timeOfDay === 'night' ? '#010409' : cfg.timeOfDay === 'sandstorm' ? '#3d1602' : '#090d16';
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 32) {
      const my = 460 - Math.sin(x * 0.015) * 40 - Math.cos(x * 0.04) * 20;
      ctx.lineTo(x, my);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    this.skyTexture.needsUpdate = true;
  }

  // --- FRAME UPDATE ---
  public update(dt: number, playerPos: THREE.Vector3) {
    // 1. Dynamic Time Progression
    if (this.isDynamicCycle) {
      this.cycleTimeSec += dt;
      // Cycle through Dawn -> Day -> Sunset -> Storm -> Night every 45 seconds
      const cycleStages: WeatherType[] = [
        'clear_day',
        'golden_sunset',
        'tactical_storm',
        'midnight_fog',
        'sandstorm',
      ];
      const stageIdx = Math.floor((this.cycleTimeSec / 35) % cycleStages.length);
      const stage = cycleStages[stageIdx];
      if (stage !== this.targetWeather) {
        this.targetWeather = stage;
        this.transitionProgress = 0;
        soundManager.playWeatherShiftNotice();
        soundManager.playVoiceCallout(`Atmospheric telemetry update: ${WEATHER_PRESETS[stage].name} active`);
      }
    }

    // 2. Smooth Weather Transitions
    if (this.transitionProgress < 1.0) {
      this.transitionProgress = Math.min(1.0, this.transitionProgress + dt / this.transitionDuration);
      const fromCfg = WEATHER_PRESETS[this.currentWeather];
      const toCfg = WEATHER_PRESETS[this.targetWeather];

      const p = this.transitionProgress;
      // Lerp ambient light
      const curAmb = new THREE.Color(fromCfg.ambientColor).lerp(new THREE.Color(toCfg.ambientColor), p);
      this.ambientLight.color.copy(curAmb);
      this.ambientLight.intensity = THREE.MathUtils.lerp(fromCfg.ambientIntensity, toCfg.ambientIntensity, p);

      // Lerp sun light
      const curSun = new THREE.Color(fromCfg.sunColor).lerp(new THREE.Color(toCfg.sunColor), p);
      this.sunLight.color.copy(curSun);
      this.sunLight.intensity = THREE.MathUtils.lerp(fromCfg.sunIntensity, toCfg.sunIntensity, p);
      this.sunLight.position.set(
        THREE.MathUtils.lerp(fromCfg.sunPos[0], toCfg.sunPos[0], p),
        THREE.MathUtils.lerp(fromCfg.sunPos[1], toCfg.sunPos[1], p),
        THREE.MathUtils.lerp(fromCfg.sunPos[2], toCfg.sunPos[2], p)
      );

      // Lerp fill light
      const curFill = new THREE.Color(fromCfg.fillColor).lerp(new THREE.Color(toCfg.fillColor), p);
      this.fillLight.color.copy(curFill);
      this.fillLight.intensity = THREE.MathUtils.lerp(fromCfg.fillIntensity, toCfg.fillIntensity, p);

      // Lerp Fog
      if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
        const curFog = new THREE.Color(fromCfg.fogColor).lerp(new THREE.Color(toCfg.fogColor), p);
        this.scene.fog.color.copy(curFog);
        this.scene.fog.density = THREE.MathUtils.lerp(fromCfg.fogDensity, toCfg.fogDensity, p);
      }

      // Lerp particle opacities
      this.rainMaterial.opacity = THREE.MathUtils.lerp(fromCfg.rainIntensity, toCfg.rainIntensity, p) * 0.85;
      this.dustMaterial.opacity = THREE.MathUtils.lerp(fromCfg.dustIntensity, toCfg.dustIntensity, p) * 0.75;

      if (this.transitionProgress >= 1.0) {
        this.currentWeather = this.targetWeather;
        this.applyPreset(WEATHER_PRESETS[this.currentWeather]);
        soundManager.setWeatherAudio(
          this.currentWeather,
          toCfg.rainIntensity > 0 ? toCfg.rainIntensity : toCfg.dustIntensity
        );
        this.emitState();
      }
    }

    // 3. Lightning Flash in Tactical Storm
    const activeCfg = WEATHER_PRESETS[this.targetWeather];
    if (activeCfg.rainIntensity > 0.5) {
      this.lightningTimer += dt;
      if (this.lightningTimer >= this.nextLightningDelay && !this.isLightningFlashing) {
        this.triggerLightning();
      }

      if (this.isLightningFlashing) {
        this.lightningFlashDuration -= dt;
        if (this.lightningFlashDuration <= 0) {
          this.isLightningFlashing = false;
          // Restore normal ambient & sun intensity
          this.ambientLight.intensity = this.lightningBaseAmbient;
          this.sunLight.intensity = this.lightningBaseSun;
          if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
            this.scene.fog.color.setHex(activeCfg.fogColor);
          }
          this.emitState();
        } else {
          // Rapid multi-strobe lightning flicker
          const flicker = Math.sin(this.lightningFlashDuration * 60) > 0 ? 1 : 0.4;
          this.ambientLight.intensity = this.lightningBaseAmbient + 2.8 * flicker;
          this.sunLight.intensity = this.lightningBaseSun + 4.2 * flicker;
        }
      }
    }

    // 4. Update Volumetric Rain Particle positions (Camera-anchored volume)
    if (this.rainMaterial.opacity > 0.05) {
      const posAttr = this.rainGeometry.attributes.position as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;

      for (let i = 0; i < this.rainCount; i++) {
        const idx = i * 3;
        // Apply velocity & wind
        positions[idx] += (this.rainVelocities[idx] + activeCfg.windDir.x * 6) * dt;
        positions[idx + 1] += this.rainVelocities[idx + 1] * dt;
        positions[idx + 2] += (this.rainVelocities[idx + 2] + activeCfg.windDir.z * 6) * dt;

        // Wrap around player position
        if (positions[idx + 1] <= 0.1) {
          // Spawn tiny ground splash ring occasionally
          if (i % 25 === 0) {
            this.particles.emitSupplyPickup(
              new THREE.Vector3(positions[idx], 0.1, positions[idx + 2]),
              0xbae6fd
            );
          }
          positions[idx + 1] = playerPos.y + 25 + Math.random() * 10;
          positions[idx] = playerPos.x + (Math.random() - 0.5) * 60;
          positions[idx + 2] = playerPos.z + (Math.random() - 0.5) * 60;
        }

        // Horizontal boundary wrap around player
        if (Math.abs(positions[idx] - playerPos.x) > 40) {
          positions[idx] = playerPos.x + (Math.random() - 0.5) * 40;
        }
        if (Math.abs(positions[idx + 2] - playerPos.z) > 40) {
          positions[idx + 2] = playerPos.z + (Math.random() - 0.5) * 40;
        }
      }
      posAttr.needsUpdate = true;
    }

    // 5. Update Dust / Sandstorm Particles
    if (this.dustMaterial.opacity > 0.05) {
      const posAttr = this.dustGeometry.attributes.position as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;

      for (let i = 0; i < this.dustCount; i++) {
        const idx = i * 3;
        positions[idx] += (this.dustVelocities[idx] + activeCfg.windDir.x * 12) * dt;
        positions[idx + 1] += this.dustVelocities[idx + 1] * dt;
        positions[idx + 2] += (this.dustVelocities[idx + 2] + activeCfg.windDir.z * 8) * dt;

        // Boundary wraps
        if (Math.abs(positions[idx] - playerPos.x) > 45) {
          positions[idx] = playerPos.x - 40;
          positions[idx + 1] = Math.random() * 20;
          positions[idx + 2] = playerPos.z + (Math.random() - 0.5) * 60;
        }
        if (Math.abs(positions[idx + 2] - playerPos.z) > 45) {
          positions[idx + 2] = playerPos.z - 40;
        }
      }
      posAttr.needsUpdate = true;
    }
  }

  // Realistic Lightning Discharge
  public triggerLightning() {
    this.lightningTimer = 0;
    this.nextLightningDelay = 4.0 + Math.random() * 9.0;
    this.isLightningFlashing = true;
    this.lightningFlashDuration = 0.22; // 220ms multi-strobe flash
    this.lightningBaseAmbient = this.ambientLight.intensity;
    this.lightningBaseSun = this.sunLight.intensity;

    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(0xcffafe); // Lightning blue-white fog flash
    }

    // Delayed thunder crack based on random simulated distance (0.2s - 1.2s delay)
    const distRatio = Math.random();
    setTimeout(() => {
      soundManager.playThunder(distRatio);
    }, 200 + distRatio * 1000);

    this.emitState();
  }

  public getEnvironmentState(): EnvironmentState {
    const cfg = WEATHER_PRESETS[this.targetWeather] || WEATHER_PRESETS.clear_day;
    return {
      weather: this.currentWeather,
      timeOfDay: cfg.timeOfDay,
      timeString: cfg.timeString,
      weatherName: cfg.name,
      rainIntensity: cfg.rainIntensity,
      fogDensity: cfg.fogDensity,
      windSpeedKts: cfg.windSpeedKts,
      windDirection: cfg.windDirStr,
      visibilityPct: cfg.visibilityPct,
      isLightningActive: this.isLightningFlashing,
      temperatureStr: cfg.temperatureStr,
    };
  }

  private emitState() {
    if (this.onEnvironmentChange) {
      this.onEnvironmentChange(this.getEnvironmentState());
    }
  }

  public resumeAudio() {
    const cfg = WEATHER_PRESETS[this.currentWeather] || WEATHER_PRESETS.clear_day;
    soundManager.setWeatherAudio(this.currentWeather, cfg.rainIntensity > 0 ? cfg.rainIntensity : (cfg.dustIntensity > 0.3 ? 0.6 : 0.2));
  }

  public destroy() {
    this.scene.remove(this.ambientLight);
    this.scene.remove(this.sunLight);
    this.scene.remove(this.fillLight);
    this.scene.remove(this.skyDome);
    this.scene.remove(this.rainPoints);
    this.scene.remove(this.dustPoints);
    this.rainGeometry.dispose();
    this.rainMaterial.dispose();
    this.dustGeometry.dispose();
    this.dustMaterial.dispose();
    this.skyTexture.dispose();
    soundManager.setWeatherAudio('clear_day', 0);
  }
}
