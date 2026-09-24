import * as THREE from 'three';
import { EnvironmentState, TimeOfDay, WeatherType, GraphicsMode } from '../types';
import { soundManager } from './audio';
import { ParticleSystem } from './particles';
import { TextureGenerator } from './textures';

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
    ambientColor: 0xb0bec5, // Clean, neutral daylight sky ambient
    ambientIntensity: 0.62,
    sunColor: 0xfffaf0, // Natural warm sunlight
    sunIntensity: 1.26, // Perfectly balanced to eliminate washed-out highlights and pitch shadows
    sunPos: [20, 75, -20],
    fillColor: 0x90caf9,
    fillIntensity: 0.35,
    fogColor: 0x94a3b8,
    fogDensity: 0.0028,
    skyTopColor: '#0369a1',
    skyMidColor: '#38bdf8',
    skyHorizonColor: '#bae6fd',
    sunFlareColor: 'rgba(255, 255, 240, 0.85)',
    sunFlareSize: 180,
    hasStars: false,
    rainIntensity: 0,
    dustIntensity: 0.03,
    windSpeedKts: 6,
    windDir: new THREE.Vector3(1, 0, 0.5).normalize(),
    windDirStr: '06 KTS NE',
    visibilityPct: 98,
    groundRoughness: 0.75,
    groundMetalness: 0.15,
  },
  golden_sunset: {
    id: 'golden_sunset',
    name: 'Golden Sunset (Evening)',
    timeOfDay: 'sunset',
    timeString: '18:45 HRS',
    temperatureStr: '22°C (71°F)',
    ambientColor: 0xa88d7d, // Soft warm dusk ambient - lifted shadows so models and structures retain crisp detail
    ambientIntensity: 0.60,
    sunColor: 0xfcb05c, // Warm golden hour
    sunIntensity: 1.28,
    sunPos: [55, 24, -45],
    fillColor: 0x818cf8,
    fillIntensity: 0.34,
    fogColor: 0x5c3d2e,
    fogDensity: 0.0042,
    skyTopColor: '#0f172a',
    skyMidColor: '#431407',
    skyHorizonColor: '#ea580c',
    sunFlareColor: 'rgba(251, 146, 60, 0.85)',
    sunFlareSize: 240,
    hasStars: false,
    rainIntensity: 0,
    dustIntensity: 0.06,
    windSpeedKts: 11,
    windDir: new THREE.Vector3(-1, 0, 0.8).normalize(),
    windDirStr: '11 KTS WNW',
    visibilityPct: 88,
    groundRoughness: 0.68,
    groundMetalness: 0.20,
  },
  midnight_fog: {
    id: 'midnight_fog',
    name: 'Midnight Ops (Night)',
    timeOfDay: 'night',
    timeString: '01:30 HRS',
    temperatureStr: '13°C (55°F)',
    ambientColor: 0x334155, // Clean moonlit night ambient - clear model silhouette visibility without murky crushed blacks
    ambientIntensity: 0.55,
    sunColor: 0x93c5fd, // Soft moonlit blue
    sunIntensity: 0.76,
    sunPos: [-35, 55, 35],
    fillColor: 0x1e293b,
    fillIntensity: 0.35,
    fogColor: 0x0f172a,
    fogDensity: 0.0068,
    skyTopColor: '#020617',
    skyMidColor: '#0f172a',
    skyHorizonColor: '#1e293b',
    sunFlareColor: 'rgba(186, 230, 253, 0.5)',
    sunFlareSize: 110,
    hasStars: true,
    rainIntensity: 0,
    dustIntensity: 0.02,
    windSpeedKts: 8,
    windDir: new THREE.Vector3(0.5, 0, -1).normalize(),
    windDirStr: '08 KTS SSE',
    visibilityPct: 75,
    groundRoughness: 0.62,
    groundMetalness: 0.25,
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

  // Volumetric Sun Shafts / Godrays (Extreme Graphics)
  public godraysGroup: THREE.Group;
  private godrayBeams: THREE.Mesh[] = [];

  // 3D Celestial Body (Sun / Moon)
  public celestialGroup: THREE.Group;
  private celestialMesh!: THREE.Mesh;
  private celestialCanvas!: HTMLCanvasElement;
  private celestialTexture!: THREE.CanvasTexture;

  // Ray-Traced Global Illumination (RT-GI) & Dynamic Contact Lights
  public giBounceLight: THREE.DirectionalLight;
  public sunRimLight: THREE.DirectionalLight;
  public hdrEnvMap: THREE.Texture | null = null;
  public microDetailNormalMap: THREE.Texture;
  private activeSunVector: THREE.Vector3 = new THREE.Vector3(20, 75, -20);

  // Current State
  public currentWeather: WeatherType = 'clear_day';
  public targetWeather: WeatherType = 'clear_day';
  public graphicsMode: GraphicsMode = 'standard';
  public isDynamicCycle: boolean = false;
  public cycleTimeSec: number = 0;
  public transitionProgress: number = 1.0;
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
  private rainCount: number = 4000;
  private rainPositions!: Float32Array;
  private rainVelocities!: Float32Array;

  // Dust / Sandstorm Particle System
  private dustGeometry!: THREE.BufferGeometry;
  private dustMaterial!: THREE.PointsMaterial;
  private dustPoints!: THREE.Points;
  private dustCount: number = 2200;
  private dustPositions!: Float32Array;
  private dustVelocities!: Float32Array;

  // Wetness & PBR targets
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

    this.sunLight = new THREE.DirectionalLight(0xffedd5, 2.8);
    this.sunLight.position.set(20, 75, -20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 4096;
    this.sunLight.shadow.mapSize.height = 4096;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 220;
    this.sunLight.shadow.camera.left = -75;
    this.sunLight.shadow.camera.right = 75;
    this.sunLight.shadow.camera.top = 75;
    this.sunLight.shadow.camera.bottom = -75;
    this.sunLight.shadow.bias = -0.0003;
    this.sunLight.shadow.normalBias = 0.035;
    this.sunLight.shadow.radius = 2.4;
    this.scene.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    this.fillLight.position.set(-35, 30, 45);
    this.scene.add(this.fillLight);

    // Ray-Traced Ground Indirect GI Bounce Light (illuminates shadow undercuts, weapon receiver, boots)
    this.giBounceLight = new THREE.DirectionalLight(0xecd5b3, 0.4);
    this.giBounceLight.position.set(0, -20, 0);
    this.giBounceLight.target.position.set(0, 10, 0);
    this.scene.add(this.giBounceLight);
    this.scene.add(this.giBounceLight.target);

    // Dynamic Specular Sun Rim Light (highlights metallic silhouettes, gun barrel edge, railings)
    this.sunRimLight = new THREE.DirectionalLight(0xffedd5, 0.3);
    this.sunRimLight.position.set(-20, 15, 20);
    this.scene.add(this.sunRimLight);

    // Initialize procedural textures for Super Extreme mode
    this.microDetailNormalMap = TextureGenerator.createMicroDetailNormalMap();

    // 2. Initialize Fog
    this.scene.fog = new THREE.FogExp2(0x334155, 0.006);

    // 3. Sky Dome Canvas Texture
    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = 1024;
    this.skyCanvas.height = 512;
    this.skyTexture = new THREE.CanvasTexture(this.skyCanvas);

    const skyGeo = new THREE.SphereGeometry(150, 32, 24);
    const skyMat = new THREE.MeshBasicMaterial({
      map: this.skyTexture,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    // 4. Volumetric Godrays Group
    this.godraysGroup = new THREE.Group();
    this.initGodrayBeams();
    this.scene.add(this.godraysGroup);

    // 4.5. 3D Celestial Body (Physical Sun / Moon Billboard)
    this.celestialGroup = new THREE.Group();
    this.celestialCanvas = document.createElement('canvas');
    this.celestialCanvas.width = 256;
    this.celestialCanvas.height = 256;
    this.celestialTexture = new THREE.CanvasTexture(this.celestialCanvas);
    const celestialMat = new THREE.MeshBasicMaterial({
      map: this.celestialTexture,
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    });
    const celestialGeo = new THREE.PlaneGeometry(28, 28);
    this.celestialMesh = new THREE.Mesh(celestialGeo, celestialMat);
    this.celestialGroup.add(this.celestialMesh);
    this.scene.add(this.celestialGroup);

    // 5. Initialize Volumetric Rain & Dust Particles
    this.initRainParticles();
    this.initDustParticles();

    // 6. Apply Initial Preset
    this.setWeather(initialPreset, true);
  }

  // Create procedural volumetric sunbeams
  private initGodrayBeams() {
    const beamCount = 14;
    const beamGeo = new THREE.CylinderGeometry(0.8, 8.0, 85, 16, 1, true);

    // Create soft radial alpha texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, 'rgba(255, 235, 180, 0.65)');
    grad.addColorStop(0.25, 'rgba(255, 215, 145, 0.42)');
    grad.addColorStop(0.7, 'rgba(255, 185, 105, 0.12)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 256);
    const beamTex = new THREE.CanvasTexture(canvas);

    for (let i = 0; i < beamCount; i++) {
      const beamMat = new THREE.MeshBasicMaterial({
        map: beamTex,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      });

      const beam = new THREE.Mesh(beamGeo, beamMat);
      const angle = (i / beamCount) * Math.PI * 2;
      const radius = 5 + (i % 4) * 4.5;
      beam.position.set(Math.cos(angle) * radius, 38, Math.sin(angle) * radius);
      beam.rotation.x = Math.PI * 0.14 + (i % 3) * 0.04;
      beam.rotation.z = Math.sin(angle) * 0.22;
      beam.scale.set(0.9 + (i % 3) * 0.35, 1.0, 0.9 + (i % 3) * 0.35);
      this.godraysGroup.add(beam);
      this.godrayBeams.push(beam);
    }
  }

  // Register map materials (specifically terrain and ground surfaces)
  public registerMapMaterial(mat: THREE.MeshStandardMaterial) {
    if (!this.mapMaterials.includes(mat)) {
      if (mat.userData.baseRoughness === undefined) {
        mat.userData.baseRoughness = mat.roughness;
        mat.userData.baseMetalness = mat.metalness;
        mat.userData.baseNormalMap = mat.normalMap;
        mat.userData.baseEnvIntensity = mat.envMapIntensity ?? 1.0;
      }
      this.mapMaterials.push(mat);
      this.applyMaterialQuality(mat);
    }
  }

  // Backward compatible helper for scene ground registration
  public registerSceneMaterials(root: THREE.Object3D) {
    root.traverse(child => {
      if (child instanceof THREE.Mesh && child.name && child.name.toLowerCase().includes('ground')) {
        if (child.material instanceof THREE.MeshStandardMaterial) {
          this.registerMapMaterial(child.material);
        }
      }
    });
  }

  public setGraphicsMode(mode: GraphicsMode) {
    this.graphicsMode = mode;
    const isExtreme = mode === 'extreme';
    const isSmooth = mode === 'smooth';

    // 1. Shadows & Lights
    if (isSmooth) {
      // Performance Mode: Pure competitive high-visibility, zero shadow overhead
      this.sunLight.castShadow = false;
      this.giBounceLight.visible = false;
      this.sunRimLight.visible = false;
      this.godraysGroup.visible = false;
      this.scene.environment = null;
      this.rainCount = 450;
      this.dustCount = 250;
      this.particles.setPointLightShadows(false);
    } else if (isExtreme) {
      // Super Extreme RTX Mode: Ray-Traced GI, 4K High-Density Contact Shadows, Dynamic Point Light Shadows
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(4096, 4096);
      this.sunLight.shadow.radius = 2.4; // Soft PCF shadow without light leaking
      this.sunLight.shadow.bias = -0.00015;
      this.sunLight.shadow.normalBias = 0.025;
      this.sunLight.shadow.camera.left = -55;
      this.sunLight.shadow.camera.right = 55;
      this.sunLight.shadow.camera.top = 55;
      this.sunLight.shadow.camera.bottom = -55;
      this.sunLight.shadow.camera.updateProjectionMatrix();

      // RT-GI Ground Bounce & Sun Rim Light (balanced to provide gentle upward fill)
      this.giBounceLight.visible = true;
      this.giBounceLight.intensity = 0.28;
      this.sunRimLight.visible = true;
      this.sunRimLight.intensity = 0.20;

      this.godraysGroup.visible = true;
      this.godrayBeams.forEach(b => {
        (b.material as THREE.MeshBasicMaterial).opacity = 0.22;
      });

      if (this.hdrEnvMap) {
        this.scene.environment = this.hdrEnvMap;
      }
      this.rainCount = 6500;
      this.dustCount = 3500;
      this.particles.setPointLightShadows(true);
    } else {
      // Standard: Default balanced look
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(2048, 2048);
      this.sunLight.shadow.radius = 1.8;
      this.sunLight.shadow.bias = -0.0002;
      this.sunLight.shadow.normalBias = 0.025;
      this.sunLight.shadow.camera.left = -65;
      this.sunLight.shadow.camera.right = 65;
      this.sunLight.shadow.camera.top = 65;
      this.sunLight.shadow.camera.bottom = -65;
      this.sunLight.shadow.camera.updateProjectionMatrix();

      this.giBounceLight.visible = true;
      this.giBounceLight.intensity = 0.16;
      this.sunRimLight.visible = true;
      this.sunRimLight.intensity = 0.10;

      this.godraysGroup.visible = true;
      this.godrayBeams.forEach(b => {
        (b.material as THREE.MeshBasicMaterial).opacity = 0.12;
      });

      if (this.hdrEnvMap) {
        this.scene.environment = this.hdrEnvMap;
      }
      this.rainCount = 3200;
      this.dustCount = 1600;
      this.particles.setPointLightShadows(false);
    }

    if (this.sunLight.shadow.map) {
      this.sunLight.shadow.map.dispose();
      this.sunLight.shadow.map = null as any;
    }

    // 2. Material PBR tuning across registered ground surfaces
    this.mapMaterials.forEach(m => this.applyMaterialQuality(m));
  }

  private applyMaterialQuality(mat: THREE.MeshStandardMaterial) {
    const isExtreme = this.graphicsMode === 'extreme';
    const isSmooth = this.graphicsMode === 'smooth';

    const baseRoughness = mat.userData.baseRoughness !== undefined ? mat.userData.baseRoughness : 0.75;
    const baseMetalness = mat.userData.baseMetalness !== undefined ? mat.userData.baseMetalness : 0.2;

    if (isExtreme) {
      // Super Extreme: Subtle surface sheen with realistic ground reflection
      mat.roughness = Math.max(0.35, baseRoughness * 0.88);
      mat.metalness = Math.min(0.35, baseMetalness * 1.1);
      mat.envMapIntensity = 0.75;
      mat.normalMap = mat.userData.baseNormalMap || null;
    } else if (isSmooth) {
      // Performance Mode: Flat diffuse response
      mat.roughness = 0.90;
      mat.metalness = 0.05;
      mat.envMapIntensity = 0.0;
      mat.normalMap = null;
    } else {
      // Standard: Natural terrain response
      mat.roughness = baseRoughness;
      mat.metalness = baseMetalness;
      mat.envMapIntensity = 0.45;
      mat.normalMap = mat.userData.baseNormalMap || null;
    }
    mat.needsUpdate = true;
  }

  private initRainParticles() {
    this.rainPositions = new Float32Array(this.rainCount * 3);
    this.rainVelocities = new Float32Array(this.rainCount * 3);

    for (let i = 0; i < this.rainCount; i++) {
      const idx = i * 3;
      this.rainPositions[idx] = (Math.random() - 0.5) * 80;
      this.rainPositions[idx + 1] = Math.random() * 40;
      this.rainPositions[idx + 2] = (Math.random() - 0.5) * 80;

      this.rainVelocities[idx] = -4 + Math.random() * 2;
      this.rainVelocities[idx + 1] = -42 - Math.random() * 12;
      this.rainVelocities[idx + 2] = -2 + Math.random() * 2;
    }

    this.rainGeometry = new THREE.BufferGeometry();
    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(8, 0, 8, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(0.5, 'rgba(186, 230, 253, 0.75)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.98)');
    ctx.fillStyle = grad;
    ctx.fillRect(6, 0, 4, 64);
    const rainTex = new THREE.CanvasTexture(canvas);

    this.rainMaterial = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.48,
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
    grad.addColorStop(0, 'rgba(245, 158, 11, 0.95)');
    grad.addColorStop(0.5, 'rgba(217, 119, 6, 0.5)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    const dustTex = new THREE.CanvasTexture(canvas);

    this.dustMaterial = new THREE.PointsMaterial({
      color: 0xf59e0b,
      size: 0.38,
      map: dustTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.dustPoints = new THREE.Points(this.dustGeometry, this.dustMaterial);
    this.scene.add(this.dustPoints);
  }

  // --- SET WEATHER / TRANSITIONS ---
  public setWeather(preset: WeatherType, immediate: boolean = false) {
    const validPreset: WeatherType = WEATHER_PRESETS[preset] ? preset : 'clear_day';
    this.targetWeather = validPreset;

    if (immediate) {
      this.currentWeather = validPreset;
      this.transitionProgress = 1.0;
      this.applyPreset(WEATHER_PRESETS[this.currentWeather] || WEATHER_PRESETS['clear_day']);
    } else {
      this.transitionProgress = 0.0;
      soundManager.playWeatherShiftNotice();
    }

    const currentCfg = WEATHER_PRESETS[this.currentWeather] || WEATHER_PRESETS['clear_day'];
    soundManager.setWeatherAudio(this.currentWeather, currentCfg.rainIntensity > 0 ? currentCfg.rainIntensity : currentCfg.dustIntensity);
    this.emitState();
  }

  public toggleNextWeather(): WeatherType {
    const sequence: WeatherType[] = [
      'clear_day',
      'golden_sunset',
      'midnight_fog',
    ];
    const nextIdx = (sequence.indexOf(this.currentWeather) + 1) % sequence.length;
    const nextPreset = sequence[nextIdx];
    this.setWeather(nextPreset);
    return nextPreset;
  }

  private applyPreset(cfg: WeatherPresetConfig) {
    if (!cfg) {
      cfg = WEATHER_PRESETS['clear_day'];
    }

    this.activeSunVector.set(...cfg.sunPos);

    this.ambientLight.color.setHex(cfg.ambientColor);
    this.ambientLight.intensity = cfg.ambientIntensity;

    this.sunLight.color.setHex(cfg.sunColor);
    this.sunLight.intensity = cfg.sunIntensity;
    this.sunLight.position.set(...cfg.sunPos);

    this.fillLight.color.setHex(cfg.fillColor);
    this.fillLight.intensity = cfg.fillIntensity;

    // Dynamic GI Bounce Light (warm ground bounce illuminating shadows from below)
    let bounceColor = 0xd4c4b0;
    if (cfg.timeOfDay === 'sunset') bounceColor = 0x92400e;
    else if (cfg.timeOfDay === 'night') bounceColor = 0x1e293b;
    this.giBounceLight.color.setHex(bounceColor);
    this.giBounceLight.intensity = this.graphicsMode === 'extreme' ? 0.20 : this.graphicsMode === 'standard' ? 0.12 : 0;
    this.giBounceLight.visible = this.graphicsMode !== 'smooth';

    // Specular Rim Light (specular edge glow on weapon, silhouette, foliage)
    this.sunRimLight.color.setHex(cfg.sunColor);
    this.sunRimLight.position.set(-cfg.sunPos[0] * 0.75, 18, -cfg.sunPos[2] * 0.75);
    this.sunRimLight.intensity = this.graphicsMode === 'extreme' ? 0.15 : this.graphicsMode === 'standard' ? 0.08 : 0;
    this.sunRimLight.visible = this.graphicsMode !== 'smooth';

    // Ray-Traced HDR Equirectangular Environment Map
    this.hdrEnvMap = TextureGenerator.createHDREquirectangularTexture(
      cfg.timeOfDay,
      cfg.sunColor,
      cfg.ambientColor,
      cfg.sunPos
    );
    if (this.graphicsMode !== 'smooth') {
      this.scene.environment = this.hdrEnvMap;
    } else {
      this.scene.environment = null;
    }

    // Reposition godrays to align with sun
    this.godraysGroup.position.set(cfg.sunPos[0] * 0.4, 0, cfg.sunPos[2] * 0.4);
    const sunDir = new THREE.Vector3(...cfg.sunPos).normalize();
    this.godrayBeams.forEach(b => {
      (b.material as THREE.MeshBasicMaterial).opacity = cfg.timeOfDay === 'night' ? 0.06 : this.graphicsMode === 'extreme' ? 0.34 : 0.16;
      b.lookAt(this.godraysGroup.position.clone().add(sunDir));
    });

    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(cfg.fogColor);
      this.scene.fog.density = cfg.fogDensity;
    }

    this.rainMaterial.opacity = cfg.rainIntensity * 0.85;
    this.dustMaterial.opacity = cfg.dustIntensity * (this.graphicsMode === 'extreme' ? 0.95 : 0.7);

    // Apply ground wetness & reflection sheen across all registered surfaces
    this.mapMaterials.forEach(mat => {
      mat.userData.baseRoughness = cfg.groundRoughness;
      mat.userData.baseMetalness = cfg.groundMetalness;
      this.applyMaterialQuality(mat);
    });

    this.drawSky(cfg);
    this.updateCelestialDisc(cfg);
  }

  private updateCelestialDisc(cfg: WeatherPresetConfig) {
    if (!this.celestialCanvas || !this.celestialTexture) return;
    const ctx = this.celestialCanvas.getContext('2d')!;
    const w = 256;
    const h = 256;
    const cx = 128;
    const cy = 128;
    ctx.clearRect(0, 0, w, h);

    if (cfg.timeOfDay === 'night') {
      // Photorealistic Moon with lunar surface and cool cyan halo
      const haloGrad = ctx.createRadialGradient(cx, cy, 28, cx, cy, 120);
      haloGrad.addColorStop(0, 'rgba(186, 230, 253, 0.45)');
      haloGrad.addColorStop(0.3, 'rgba(125, 211, 252, 0.20)');
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = haloGrad;
      ctx.fillRect(0, 0, w, h);

      // Moon body
      const moonRadius = 38;
      const moonGrad = ctx.createRadialGradient(cx - 10, cy - 10, 5, cx, cy, moonRadius);
      moonGrad.addColorStop(0, '#f8fafc');
      moonGrad.addColorStop(0.65, '#e2e8f0');
      moonGrad.addColorStop(1, '#94a3b8');
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, moonRadius, 0, Math.PI * 2);
      ctx.fill();

      // Lunar craters & maria topography
      ctx.fillStyle = 'rgba(71, 85, 105, 0.42)';
      ctx.beginPath();
      ctx.arc(cx - 14, cy - 10, 11, 0, Math.PI * 2);
      ctx.arc(cx + 12, cy + 8, 9, 0, Math.PI * 2);
      ctx.arc(cx - 6, cy + 16, 7, 0, Math.PI * 2);
      ctx.arc(cx + 8, cy - 14, 6, 0, Math.PI * 2);
      ctx.arc(cx - 18, cy + 6, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (cfg.timeOfDay === 'sunset') {
      // Golden / Crimson Sunset Sun Disc
      const haloGrad = ctx.createRadialGradient(cx, cy, 32, cx, cy, 126);
      haloGrad.addColorStop(0, 'rgba(254, 215, 170, 0.95)');
      haloGrad.addColorStop(0.35, 'rgba(249, 115, 22, 0.55)');
      haloGrad.addColorStop(0.7, 'rgba(220, 38, 38, 0.25)');
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = haloGrad;
      ctx.fillRect(0, 0, w, h);

      // Sun core
      ctx.fillStyle = '#fff7ed';
      ctx.beginPath();
      ctx.arc(cx, cy, 32, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // High Noon Radiant Solar Orb
      const haloGrad = ctx.createRadialGradient(cx, cy, 26, cx, cy, 124);
      haloGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      haloGrad.addColorStop(0.28, 'rgba(254, 240, 138, 0.65)');
      haloGrad.addColorStop(0.65, 'rgba(56, 189, 248, 0.20)');
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = haloGrad;
      ctx.fillRect(0, 0, w, h);

      // Blazing sun core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 28, 0, Math.PI * 2);
      ctx.fill();
    }

    this.celestialTexture.needsUpdate = true;
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
      for (let i = 0; i < 220; i++) {
        const sx = Math.sin(i * 99) * 512 + 512;
        const sy = (Math.cos(i * 33) * 0.5 + 0.5) * 320;
        const radius = (i % 3 === 0 ? 1.6 : 0.9);
        ctx.globalAlpha = 0.4 + (i % 5) * 0.14;
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1.0;
    }

    // Directional Sun / Moon placement on Sky Dome equirectangular map
    const sunDir = new THREE.Vector3(...cfg.sunPos).normalize();
    const azimuth = Math.atan2(sunDir.z, sunDir.x);
    const u = ((azimuth + Math.PI) / (2 * Math.PI) + 1.0) % 1.0;
    const flareX = Math.round(u * w);
    const elevation = Math.asin(Math.max(-0.95, Math.min(0.95, sunDir.y)));
    const v = 0.5 - (elevation / Math.PI);
    const flareY = Math.max(25, Math.min(h * 0.48, Math.round(v * h)));

    const sunGrad = ctx.createRadialGradient(flareX, flareY, 5, flareX, flareY, cfg.sunFlareSize);
    sunGrad.addColorStop(0, cfg.sunFlareColor);
    sunGrad.addColorStop(0.35, cfg.sunFlareColor.replace('0.9', '0.45').replace('0.95', '0.45'));
    sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, w, h);

    // Mountain silhouettes on horizon
    ctx.fillStyle = cfg.timeOfDay === 'night' ? '#010409' : '#090d16';
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
    // 0. Dynamic High-Density Cascaded Shadow Tracker (Super Extreme Mode)
    if (playerPos) {
      const sunDir = this.activeSunVector.clone().normalize();
      if (this.graphicsMode === 'extreme') {
        const sunDist = 90;
        this.sunLight.position.set(
          playerPos.x + sunDir.x * sunDist,
          playerPos.y + Math.max(50, sunDir.y * sunDist),
          playerPos.z + sunDir.z * sunDist
        );
        this.sunLight.target.position.set(playerPos.x, playerPos.y, playerPos.z);
        this.sunLight.target.updateMatrixWorld();
      } else if (this.graphicsMode === 'standard') {
        this.sunLight.position.set(sunDir.x * 80, 75, sunDir.z * 80);
        this.sunLight.target.position.set(0, 0, 0);
        this.sunLight.target.updateMatrixWorld();
      }
    }

    // Sky Dome & Celestial Body Infinite Horizon Tracking
    if (this.camera) {
      this.skyDome.position.copy(this.camera.position);
      if (this.celestialGroup) {
        const currentSunDir = this.activeSunVector.clone().normalize();
        this.celestialGroup.position.copy(this.camera.position).addScaledVector(currentSunDir, 138);
        this.celestialGroup.lookAt(this.camera.position);
      }
    }

    // 1. Dynamic Time Progression
    if (this.isDynamicCycle) {
      this.cycleTimeSec += dt;
      const cycleStages: WeatherType[] = [
        'clear_day',
        'golden_sunset',
        'midnight_fog',
      ];
      const stageIdx = Math.floor((this.cycleTimeSec / 45) % cycleStages.length);
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
      const fromCfg = WEATHER_PRESETS[this.currentWeather] || WEATHER_PRESETS['clear_day'];
      const toCfg = WEATHER_PRESETS[this.targetWeather] || WEATHER_PRESETS['clear_day'];

      const p = this.transitionProgress;
      // Lerp ambient light
      const curAmb = new THREE.Color(fromCfg.ambientColor).lerp(new THREE.Color(toCfg.ambientColor), p);
      this.ambientLight.color.copy(curAmb);
      this.ambientLight.intensity = THREE.MathUtils.lerp(fromCfg.ambientIntensity, toCfg.ambientIntensity, p);

      // Lerp sun light
      const curSun = new THREE.Color(fromCfg.sunColor).lerp(new THREE.Color(toCfg.sunColor), p);
      this.sunLight.color.copy(curSun);
      this.sunLight.intensity = THREE.MathUtils.lerp(fromCfg.sunIntensity, toCfg.sunIntensity, p);
      this.activeSunVector.set(
        THREE.MathUtils.lerp(fromCfg.sunPos[0], toCfg.sunPos[0], p),
        THREE.MathUtils.lerp(fromCfg.sunPos[1], toCfg.sunPos[1], p),
        THREE.MathUtils.lerp(fromCfg.sunPos[2], toCfg.sunPos[2], p)
      );
      this.sunLight.position.copy(this.activeSunVector);

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
        this.applyPreset(WEATHER_PRESETS[this.currentWeather] || WEATHER_PRESETS['clear_day']);
        soundManager.setWeatherAudio(
          this.currentWeather,
          toCfg.rainIntensity > 0 ? toCfg.rainIntensity : toCfg.dustIntensity
        );
        this.emitState();
      }
    }

    // Gentle pulse and subtle rotation on godrays
    if (this.godraysGroup.visible) {
      this.godraysGroup.rotation.y += dt * 0.02;
    }

    // 3. Lightning Flash in Tactical Storm
    const activeCfg = WEATHER_PRESETS[this.targetWeather] || WEATHER_PRESETS['clear_day'];
    if (activeCfg.rainIntensity > 0.5) {
      this.lightningTimer += dt;
      if (this.lightningTimer >= this.nextLightningDelay && !this.isLightningFlashing) {
        this.triggerLightning();
      }

      if (this.isLightningFlashing) {
        this.lightningFlashDuration -= dt;
        if (this.lightningFlashDuration <= 0) {
          this.isLightningFlashing = false;
          this.ambientLight.intensity = this.lightningBaseAmbient;
          this.sunLight.intensity = this.lightningBaseSun;
          if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
            this.scene.fog.color.setHex(activeCfg.fogColor);
          }
          this.emitState();
        } else {
          const flicker = Math.sin(this.lightningFlashDuration * 60) > 0 ? 1 : 0.4;
          this.ambientLight.intensity = this.lightningBaseAmbient + 2.8 * flicker;
          this.sunLight.intensity = this.lightningBaseSun + 4.2 * flicker;
        }
      }
    }

    // 4. Update Volumetric Rain Particle positions
    if (this.rainMaterial.opacity > 0.05) {
      const posAttr = this.rainGeometry.attributes.position as THREE.BufferAttribute;
      const positions = posAttr.array as Float32Array;

      for (let i = 0; i < this.rainCount; i++) {
        const idx = i * 3;
        positions[idx] += (this.rainVelocities[idx] + activeCfg.windDir.x * 6) * dt;
        positions[idx + 1] += this.rainVelocities[idx + 1] * dt;
        positions[idx + 2] += (this.rainVelocities[idx + 2] + activeCfg.windDir.z * 6) * dt;

        if (positions[idx + 1] <= 0.1) {
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
    this.lightningFlashDuration = 0.22;
    this.lightningBaseAmbient = this.ambientLight.intensity;
    this.lightningBaseSun = this.sunLight.intensity;

    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(0xcffafe);
    }

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
    this.scene.remove(this.godraysGroup);
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
