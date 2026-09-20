// Realistic Web Audio Tactical Sound Synthesizer & 3D Spatial Acoustic Engine
// High-fidelity physical modeling with HRTF binaural spatialization, sound occlusion,
// supersonic bullet flyby doppler effects, multi-surface directional footsteps, and authentic weapon acoustics.

import * as THREE from 'three';
import { WeaponType } from '../types';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private listenerPos: THREE.Vector3 = new THREE.Vector3();
  private listenerForward: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  private listenerUp: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

  private isMuted: boolean = false;
  private heartbeatInterval: number | null = null;

  // Ambient Weather Nodes
  private weatherRainNode: AudioNode | null = null;
  private weatherRainGain: GainNode | null = null;
  private weatherWindNode: AudioNode | null = null;
  private weatherWindGain: GainNode | null = null;
  private weatherNightGain: GainNode | null = null;
  private weatherNightNode: AudioNode | null = null;
  private weatherLfoNode: OscillatorNode | null = null;

  // Cached Impulse Buffers for Reverb & Noise
  private noiseBuffers: Map<string, AudioBuffer> = new Map();

  // --- MaterialFoundry/SoundFxLibrary Weapon Reloads & Free Fire Audio Assets ---
  private reloadBuffers: Map<string, AudioBuffer> = new Map();
  private freefireBuffers: Map<string, AudioBuffer> = new Map();
  private reloadLoadingStarted: boolean = false;

  // --- PUBG Gun Sound Dataset (https://github.com/junwoopark92/PUBG-Gun-Sound-Dataset.git) ---
  private pubgGunBuffers: Map<string, AudioBuffer[]> = new Map();
  private pubgPreloadedRaw: Map<string, ArrayBuffer> = new Map();
  private pubgLoadingStarted: boolean = false;
  private pubgSoundsReady: boolean = false;
  private activePlayerGunshots: { source: AudioBufferSourceNode; gain: GainNode }[] = [];

  constructor() {
    // Early network prefetch of PUBG and MaterialFoundry audio assets so they are ready before first fire
    this.prefetchPubgAssets();
  }

  private prefetchPubgAssets() {
    const allPaths = [
      '/sounds/weapons/m4_0.mp3', '/sounds/weapons/m4_1.mp3', '/sounds/weapons/m4_2.mp3', '/sounds/weapons/m4_3.mp3',
      '/sounds/weapons/m4_dist.mp3', '/sounds/weapons/m4_far.mp3',
      '/sounds/weapons/mp5_0.mp3', '/sounds/weapons/mp5_1.mp3', '/sounds/weapons/mp5_2.mp3', '/sounds/weapons/mp5_3.mp3',
      '/sounds/weapons/ak47_0.mp3', '/sounds/weapons/ak47_1.mp3', '/sounds/weapons/ak47_2.mp3', '/sounds/weapons/ak47_3.mp3',
      '/sounds/weapons/ak47_dist.mp3', '/sounds/weapons/ak47_far.mp3',
      '/sounds/weapons/scar_0.mp3', '/sounds/weapons/scar_1.mp3', '/sounds/weapons/scar_2.mp3', '/sounds/weapons/scar_3.mp3',
      '/sounds/weapons/scar_dist.mp3', '/sounds/weapons/scar_far.mp3',
      '/sounds/weapons/vector_0.mp3', '/sounds/weapons/vector_1.mp3', '/sounds/weapons/vector_2.mp3', '/sounds/weapons/vector_3.mp3',
      '/sounds/weapons/vector_dist.mp3', '/sounds/weapons/vector_far.mp3',
      '/sounds/weapons/sniper_0.mp3', '/sounds/weapons/sniper_1.mp3', '/sounds/weapons/sniper_2.mp3', '/sounds/weapons/sniper_3.mp3',
      '/sounds/weapons/sniper_dist.mp3', '/sounds/weapons/sniper_far.mp3',
      '/sounds/weapons/shotgun_0.mp3', '/sounds/weapons/shotgun_1.mp3', '/sounds/weapons/shotgun_2.mp3', '/sounds/weapons/shotgun_3.mp3',
      '/sounds/weapons/deagle_0.mp3', '/sounds/weapons/deagle_1.mp3', '/sounds/weapons/deagle_2.mp3', '/sounds/weapons/deagle_3.mp3',
      // MaterialFoundry / Free Fire
      '/audio/reloads/mag_out.mp3',
      '/audio/reloads/mag_in.mp3',
      '/audio/reloads/slide_rack.mp3',
      '/audio/reloads/bolt_cycle.mp3',
      '/audio/reloads/shell_insert.mp3',
      '/audio/freefire/gloowall_hit.mp3',
      '/audio/freefire/danger_airstrike.mp3',
    ];
    for (const p of allPaths) {
      fetch(p)
        .then(res => res.ok ? res.arrayBuffer() : null)
        .then(ab => {
          if (ab) this.pubgPreloadedRaw.set(p, ab);
        })
        .catch(() => {});
    }
  }

  public init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();

    // Master Bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // SFX Bus
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.95, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    // Voice & Radio Bus
    this.voiceGain = this.ctx.createGain();
    this.voiceGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.voiceGain.connect(this.masterGain);

    // Ambient Bus
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
    this.ambientGain.connect(this.masterGain);

    // Load authentic PUBG weapon sound dataset from https://github.com/junwoopark92/PUBG-Gun-Sound-Dataset.git
    this.loadPubgSoundDataset();
    // Load MaterialFoundry/SoundFxLibrary reload sounds and Free Fire audio
    this.loadReloadAndFreeFireAssets();
  }

  public async loadReloadAndFreeFireAssets(): Promise<void> {
    if (this.reloadLoadingStarted || !this.ctx) return;
    this.reloadLoadingStarted = true;

    const reloadFiles: [string, string][] = [
      ['mag_out', '/audio/reloads/mag_out.mp3'],
      ['mag_in', '/audio/reloads/mag_in.mp3'],
      ['slide_rack', '/audio/reloads/slide_rack.mp3'],
      ['bolt_cycle', '/audio/reloads/bolt_cycle.mp3'],
      ['shell_insert', '/audio/reloads/shell_insert.mp3'],
    ];

    const freefireFiles: [string, string][] = [
      ['gloowall_hit', '/audio/freefire/gloowall_hit.mp3'],
      ['danger_airstrike', '/audio/freefire/danger_airstrike.mp3'],
    ];

    const fetchAndDecode = async (path: string): Promise<AudioBuffer | null> => {
      try {
        const raw = this.pubgPreloadedRaw.get(path);
        let arrayBuf: ArrayBuffer;
        if (raw) {
          arrayBuf = raw.slice(0);
        } else {
          const res = await fetch(path);
          if (!res.ok) return null;
          arrayBuf = await res.arrayBuffer();
        }
        if (!this.ctx) return null;
        return await this.ctx.decodeAudioData(arrayBuf);
      } catch (e) {
        console.warn(`[Audio] Failed loading ${path}:`, e);
        return null;
      }
    };

    for (const [key, path] of reloadFiles) {
      fetchAndDecode(path).then(buf => {
        if (buf) this.reloadBuffers.set(key, buf);
      });
    }

    for (const [key, path] of freefireFiles) {
      fetchAndDecode(path).then(buf => {
        if (buf) this.freefireBuffers.set(key, buf);
      });
    }
  }

  public async loadPubgSoundDataset(): Promise<void> {
    if (this.pubgLoadingStarted || !this.ctx) return;
    this.pubgLoadingStarted = true;

    const PUBG_WEAPON_AUDIO_MAP: Record<string, string[]> = {
      m4: [
        '/sounds/weapons/m4_0.mp3',
        '/sounds/weapons/m4_1.mp3',
        '/sounds/weapons/m4_2.mp3',
        '/sounds/weapons/m4_3.mp3',
      ],
      mp5: [
        '/sounds/weapons/mp5_0.mp3',
        '/sounds/weapons/mp5_1.mp3',
        '/sounds/weapons/mp5_2.mp3',
        '/sounds/weapons/mp5_3.mp3',
      ],
      ak47: [
        '/sounds/weapons/ak47_0.mp3',
        '/sounds/weapons/ak47_1.mp3',
        '/sounds/weapons/ak47_2.mp3',
        '/sounds/weapons/ak47_3.mp3',
      ],
      scar: [
        '/sounds/weapons/scar_0.mp3',
        '/sounds/weapons/scar_1.mp3',
        '/sounds/weapons/scar_2.mp3',
        '/sounds/weapons/scar_3.mp3',
      ],
      vector: [
        '/sounds/weapons/vector_0.mp3',
        '/sounds/weapons/vector_1.mp3',
        '/sounds/weapons/vector_2.mp3',
        '/sounds/weapons/vector_3.mp3',
      ],
      sniper: [
        '/sounds/weapons/sniper_0.mp3',
        '/sounds/weapons/sniper_1.mp3',
        '/sounds/weapons/sniper_2.mp3',
        '/sounds/weapons/sniper_3.mp3',
      ],
      shotgun: [
        '/sounds/weapons/shotgun_0.mp3',
        '/sounds/weapons/shotgun_1.mp3',
        '/sounds/weapons/shotgun_2.mp3',
        '/sounds/weapons/shotgun_3.mp3',
      ],
      deagle: [
        '/sounds/weapons/deagle_0.mp3',
        '/sounds/weapons/deagle_1.mp3',
        '/sounds/weapons/deagle_2.mp3',
        '/sounds/weapons/deagle_3.mp3',
      ],
      m4_dist: ['/sounds/weapons/m4_dist.mp3', '/sounds/weapons/m4_far.mp3'],
      ak47_dist: ['/sounds/weapons/ak47_dist.mp3', '/sounds/weapons/ak47_far.mp3'],
      scar_dist: ['/sounds/weapons/scar_dist.mp3', '/sounds/weapons/scar_far.mp3'],
      vector_dist: ['/sounds/weapons/vector_dist.mp3', '/sounds/weapons/vector_far.mp3'],
      sniper_dist: ['/sounds/weapons/sniper_dist.mp3', '/sounds/weapons/sniper_far.mp3'],
    };

    const promises: Promise<void>[] = [];
    for (const [key, paths] of Object.entries(PUBG_WEAPON_AUDIO_MAP)) {
      const bufferList: AudioBuffer[] = [];
      this.pubgGunBuffers.set(key, bufferList);

      for (const path of paths) {
        const getArrayBuffer = async (): Promise<ArrayBuffer> => {
          const preloaded = this.pubgPreloadedRaw.get(path);
          if (preloaded) return preloaded.slice(0);
          const res = await fetch(path);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.arrayBuffer();
        };

        const p = getArrayBuffer()
          .then((ab) => {
            if (!this.ctx) return null;
            return this.ctx.decodeAudioData(ab);
          })
          .then((decoded) => {
            if (decoded) bufferList.push(decoded);
          })
          .catch((err) => {
            console.warn(`[PUBG Audio] Load notice for ${path}:`, err);
          });
        promises.push(p);
      }
    }

    await Promise.allSettled(promises);
    this.pubgSoundsReady = true;
  }

  public setVolumes(master: number, sfx: number) {
    if (!this.ctx || !this.masterGain || !this.sfxGain) return;
    this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, master)), this.ctx.currentTime, 0.05);
    this.sfxGain.gain.setTargetAtTime(Math.max(0, Math.min(1, sfx)), this.ctx.currentTime, 0.05);
  }

  // --- 3D SPATIAL LISTENER UPDATE ---
  public updateListener(
    pos: THREE.Vector3,
    forward: THREE.Vector3,
    up: THREE.Vector3 = new THREE.Vector3(0, 1, 0),
    vel?: THREE.Vector3
  ) {
    if (!this.ctx) return;
    this.listenerPos.copy(pos);
    this.listenerForward.copy(forward).normalize();
    this.listenerUp.copy(up).normalize();

    const listener = this.ctx.listener;
    const t = this.ctx.currentTime;

    // Modern AudioParam API
    if ('positionX' in listener) {
      listener.positionX.setTargetAtTime(pos.x, t, 0.02);
      listener.positionY.setTargetAtTime(pos.y, t, 0.02);
      listener.positionZ.setTargetAtTime(pos.z, t, 0.02);
      listener.forwardX.setTargetAtTime(this.listenerForward.x, t, 0.02);
      listener.forwardY.setTargetAtTime(this.listenerForward.y, t, 0.02);
      listener.forwardZ.setTargetAtTime(this.listenerForward.z, t, 0.02);
      listener.upX.setTargetAtTime(this.listenerUp.x, t, 0.02);
      listener.upY.setTargetAtTime(this.listenerUp.y, t, 0.02);
      listener.upZ.setTargetAtTime(this.listenerUp.z, t, 0.02);
    } else {
      // Legacy fallback
      (listener as unknown as { setPosition: (x: number, y: number, z: number) => void }).setPosition(pos.x, pos.y, pos.z);
      (listener as unknown as { setOrientation: (fx: number, fy: number, fz: number, ux: number, uy: number, uz: number) => void }).setOrientation(
        this.listenerForward.x,
        this.listenerForward.y,
        this.listenerForward.z,
        this.listenerUp.x,
        this.listenerUp.y,
        this.listenerUp.z
      );
    }
  }

  // --- 3D SPATIAL PANNER & OCCLUSION NODE FACTORY ---
  private create3DPanner(
    pos: THREE.Vector3,
    isOccluded: boolean = false,
    occlusionAmount: number = 0,
    customRefDist: number = 2.5,
    customMaxDist: number = 90
  ): { panner: PannerNode; occlusionFilter: BiquadFilterNode; outputGain: GainNode } | null {
    if (!this.ctx || !this.sfxGain) return null;

    const panner = this.ctx.createPanner();
    panner.panningModel = 'HRTF'; // Head-Related Transfer Function for authentic 3D binaural hearing
    panner.distanceModel = 'inverse';
    panner.refDistance = customRefDist;
    panner.maxDistance = customMaxDist;
    panner.rolloffFactor = 1.15;
    panner.coneInnerAngle = 360;

    const t = this.ctx.currentTime;
    if ('positionX' in panner) {
      panner.positionX.setValueAtTime(pos.x, t);
      panner.positionY.setValueAtTime(pos.y, t);
      panner.positionZ.setValueAtTime(pos.z, t);
    } else {
      (panner as unknown as { setPosition: (x: number, y: number, z: number) => void }).setPosition(pos.x, pos.y, pos.z);
    }

    // Dynamic Occlusion Filter (Muffles high frequencies when wall/obstacle blocks direct line of sight)
    const occlusionFilter = this.ctx.createBiquadFilter();
    occlusionFilter.type = 'lowpass';

    const outputGain = this.ctx.createGain();

    if (isOccluded || occlusionAmount > 0) {
      const occl = Math.max(0.3, Math.min(1.0, isOccluded ? 0.85 : occlusionAmount));
      // Occluded sound: cutoff drops from 20000Hz down to 550Hz - 850Hz with volume attenuation
      const cutoff = 650 + (1 - occl) * 1200;
      occlusionFilter.frequency.setValueAtTime(cutoff, t);
      occlusionFilter.Q.setValueAtTime(1.2, t);
      outputGain.gain.setValueAtTime(Math.max(0.2, 1 - occl * 0.55), t);
    } else {
      // Clear line of sight: full fidelity
      occlusionFilter.frequency.setValueAtTime(20000, t);
      occlusionFilter.Q.setValueAtTime(0.7, t);
      outputGain.gain.setValueAtTime(1.0, t);
    }

    panner.connect(occlusionFilter);
    occlusionFilter.connect(outputGain);
    outputGain.connect(this.sfxGain);

    return { panner, occlusionFilter, outputGain };
  }

  // --- 1. FIRST-PERSON WEAPON SHOOT SOUNDS ---
  public playGunshot(type: WeaponType, isSilenced: boolean = false) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // --- STRICTLY USE PUBG WEAPON SOUND DATASET (junwoopark92/PUBG-Gun-Sound-Dataset) ---
    const pubgList = this.pubgGunBuffers.get(type);
    if (pubgList && pubgList.length > 0) {
      const buffer = pubgList[Math.floor(Math.random() * pubgList.length)];
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      // Custom physical pitch and timbre calibration per firearm caliber
      let baseRate = 0.98 + Math.random() * 0.04;
      if (type === 'ak47') baseRate = 0.86 + Math.random() * 0.03; // Deep, punchy 7.62x39mm bolt clatter
      else if (type === 'scar') baseRate = 0.82 + Math.random() * 0.03; // Heavy 7.62x51mm NATO thunder
      else if (type === 'vector') baseRate = 1.25 + Math.random() * 0.04; // Snappy, ultra-high 1200 RPM cyclic crack
      source.playbackRate.setValueAtTime(baseRate, t);

      const gain = this.ctx.createGain();
      let volume = 1.0;
      if (type === 'sniper') volume = 1.35;
      else if (type === 'shotgun') volume = 1.25;
      else if (type === 'deagle') volume = 1.15;
      else if (type === 'mp5') volume = 0.95;
      else if (type === 'm4') volume = 1.05;
      else if (type === 'ak47') volume = 1.25;
      else if (type === 'scar') volume = 1.28;
      else if (type === 'vector') volume = 1.05;

      if (isSilenced) {
        // Silencer acoustic muzzle damping
        const silencerFilter = this.ctx.createBiquadFilter();
        silencerFilter.type = 'lowpass';
        silencerFilter.frequency.setValueAtTime(1900, t);
        silencerFilter.Q.setValueAtTime(1.1, t);
        gain.gain.setValueAtTime(volume * 0.72, t);
        source.connect(silencerFilter);
        silencerFilter.connect(gain);
      } else {
        gain.gain.setValueAtTime(volume, t);
        source.connect(gain);
      }

      gain.connect(this.sfxGain);

      // Voice limiting for rapid automatic fire: choke oldest active voice so gunshots remain articulate and never clip
      if (this.activePlayerGunshots.length >= 3) {
        const oldest = this.activePlayerGunshots.shift();
        if (oldest) {
          try {
            oldest.gain.gain.setValueAtTime(oldest.gain.gain.value, t);
            oldest.gain.gain.linearRampToValueAtTime(0.001, t + 0.015);
            setTimeout(() => {
              try { oldest.source.stop(); oldest.source.disconnect(); oldest.gain.disconnect(); } catch (_) {}
            }, 20);
          } catch (_) {}
        }
      }

      this.activePlayerGunshots.push({ source, gain });
      source.onended = () => {
        const idx = this.activePlayerGunshots.findIndex(item => item.source === source);
        if (idx !== -1) this.activePlayerGunshots.splice(idx, 1);
        try { source.disconnect(); gain.disconnect(); } catch (_) {}
      };

      source.start(t);

      // Weapon mechanical cycle and casing ejection
      if (type === 'shotgun') {
        setTimeout(() => this.playPumpAction(), 310);
      } else if (type === 'sniper') {
        this.createBulletCasingDrop(t + 0.35);
      } else {
        this.createBulletCasingDrop(t + 0.12);
      }
      return;
    }

    // Immediate fallback while initial asset decoding completes in first frame
    switch (type) {
      case 'm4': {
        // High-energy 5.56x45mm NATO Assault Rifle
        // Layer 1: Supersonic bore blast transient
        this.createGunshotNoiseTransient(t, 0.11, 2400, 320, 0.95);
        // Layer 2: Punchy chamber sub-bass
        this.createGunshotSubBass(t, 148, 46, 0.22, 0.9);
        // Layer 3: Steel bolt recoil slap
        this.createMechanicalClick(t + 0.015, 0.045, 3400, 0.55);
        // Layer 4: Early reflections & acoustic tail
        this.createAcousticReverb(t, 0.32, 0.55);
        // Layer 5: Spent brass casing ejection ping
        this.createBulletCasingDrop(t + 0.14);
        break;
      }
      case 'mp5': {
        // Snappy 9x19mm Parabellum Submachine Gun
        this.createGunshotNoiseTransient(t, 0.08, 3100, 450, 0.8);
        this.createGunshotSubBass(t, 175, 58, 0.16, 0.7);
        this.createMechanicalClick(t + 0.012, 0.035, 4600, 0.6);
        this.createAcousticReverb(t, 0.22, 0.38);
        this.createBulletCasingDrop(t + 0.11);
        break;
      }
      case 'sniper': {
        // Massive .50 BMG Anti-Materiel Rifle
        this.createGunshotNoiseTransient(t, 0.32, 1400, 140, 1.35);
        this.createGunshotSubBass(t, 85, 24, 0.72, 1.55);
        this.createMechanicalClick(t + 0.035, 0.09, 1900, 0.7);
        this.createAcousticReverb(t, 0.95, 0.95);
        this.createBulletCasingDrop(t + 0.38);
        break;
      }
      case 'shotgun': {
        // 12-Gauge Tactical Combat Shotgun (Heavy dual blast)
        this.createGunshotNoiseTransient(t, 0.24, 1650, 190, 1.2);
        this.createGunshotSubBass(t, 120, 32, 0.42, 1.25);
        this.createMechanicalClick(t + 0.025, 0.06, 2600, 0.6);
        this.createAcousticReverb(t, 0.55, 0.75);
        setTimeout(() => this.playPumpAction(), 310);
        break;
      }
      case 'deagle': {
        // .50 Action Express Semi-Automatic Hand Cannon
        this.createGunshotNoiseTransient(t, 0.16, 2600, 280, 1.05);
        this.createGunshotSubBass(t, 155, 42, 0.28, 1.05);
        this.createMechanicalClick(t + 0.02, 0.055, 3600, 0.65);
        this.createAcousticReverb(t, 0.42, 0.65);
        this.createBulletCasingDrop(t + 0.18);
        break;
      }
      case 'ak47': {
        // Heavy 7.62x39mm Soviet Assault Rifle (Deep punch & metallic bolt rattle)
        this.createGunshotNoiseTransient(t, 0.14, 2100, 260, 1.1);
        this.createGunshotSubBass(t, 132, 38, 0.28, 1.05);
        this.createMechanicalClick(t + 0.018, 0.05, 3000, 0.65);
        this.createAcousticReverb(t, 0.45, 0.65);
        this.createBulletCasingDrop(t + 0.15);
        break;
      }
      case 'vector': {
        // High cyclic rate 1200 RPM .45 ACP CQB (Super snappy high crack)
        this.createGunshotNoiseTransient(t, 0.065, 3300, 480, 0.85);
        this.createGunshotSubBass(t, 180, 62, 0.13, 0.75);
        this.createMechanicalClick(t + 0.01, 0.03, 4800, 0.55);
        this.createAcousticReverb(t, 0.18, 0.35);
        this.createBulletCasingDrop(t + 0.09);
        break;
      }
      case 'scar': {
        // 7.62x51mm NATO Battle Rifle (Authoritative heavy thud & long resonance)
        this.createGunshotNoiseTransient(t, 0.16, 1950, 240, 1.15);
        this.createGunshotSubBass(t, 122, 34, 0.32, 1.15);
        this.createMechanicalClick(t + 0.02, 0.055, 2900, 0.6);
        this.createAcousticReverb(t, 0.5, 0.7);
        this.createBulletCasingDrop(t + 0.16);
        break;
      }
    }
  }

  // --- 2. 3D SPATIAL BOT GUNSHOT (WITH OCCLUSION & DISTANCE ATTENUATION) ---
  public playSpatialGunshot(
    type: WeaponType,
    botPos: THREE.Vector3,
    isOccluded: boolean = false
  ) {
    if (!this.ctx || !this.sfxGain) return;
    const distance = this.listenerPos.distanceTo(botPos);
    const spatial = this.create3DPanner(botPos, isOccluded, isOccluded ? 0.9 : 0, 3.0, 110);
    if (!spatial) return;

    const t = this.ctx.currentTime;
    const { panner } = spatial;

    // Determine if distance sound from PUBG dataset should be selected
    let soundKey: string = type;
    if (distance > 35) {
      if (type === 'm4' && (this.pubgGunBuffers.get('m4_dist')?.length ?? 0) > 0) {
        soundKey = 'm4_dist';
      } else if (type === 'ak47' && (this.pubgGunBuffers.get('ak47_dist')?.length ?? 0) > 0) {
        soundKey = 'ak47_dist';
      } else if (type === 'scar' && (this.pubgGunBuffers.get('scar_dist')?.length ?? 0) > 0) {
        soundKey = 'scar_dist';
      } else if (type === 'vector' && (this.pubgGunBuffers.get('vector_dist')?.length ?? 0) > 0) {
        soundKey = 'vector_dist';
      } else if (type === 'sniper' && (this.pubgGunBuffers.get('sniper_dist')?.length ?? 0) > 0) {
        soundKey = 'sniper_dist';
      }
    }

    // --- STRICTLY USE PUBG WEAPON SOUND DATASET FOR 3D SPATIAL GUNFIRE ---
    const pubgList = this.pubgGunBuffers.get(soundKey) || this.pubgGunBuffers.get(type);
    if (pubgList && pubgList.length > 0) {
      const buffer = pubgList[Math.floor(Math.random() * pubgList.length)];
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      let spatialRate = 0.97 + Math.random() * 0.06;
      if (type === 'ak47') spatialRate = 0.86 + Math.random() * 0.04;
      else if (type === 'scar') spatialRate = 0.82 + Math.random() * 0.04;
      else if (type === 'vector') spatialRate = 1.25 + Math.random() * 0.05;
      source.playbackRate.setValueAtTime(spatialRate, t);

      const gain = this.ctx.createGain();
      let volume = 0.95;
      if (type === 'sniper') volume = 1.35;
      else if (type === 'shotgun') volume = 1.15;
      else if (type === 'deagle') volume = 1.05;
      else if (type === 'ak47') volume = 1.20;
      else if (type === 'scar') volume = 1.22;
      else if (type === 'vector') volume = 1.0;
      gain.gain.setValueAtTime(volume, t);

      source.connect(gain);
      gain.connect(panner);
      source.onended = () => {
        try { source.disconnect(); gain.disconnect(); } catch (_) {}
      };
      source.start(t);
      return;
    }

    // Caliber specific sound parameters spatialized through PannerNode
    let subStart = 140, subEnd = 45, subDuration = 0.2, transientFreq = 2200, transientDur = 0.1;
    if (type === 'sniper') {
      subStart = 85; subEnd = 24; subDuration = 0.65; transientFreq = 1200; transientDur = 0.28;
    } else if (type === 'mp5' || type === 'vector') {
      subStart = 170; subEnd = 60; subDuration = 0.14; transientFreq = 2800; transientDur = 0.07;
    } else if (type === 'ak47' || type === 'scar') {
      subStart = 130; subEnd = 36; subDuration = 0.26; transientFreq = 2000; transientDur = 0.13;
    } else if (type === 'shotgun') {
      subStart = 115; subEnd = 35; subDuration = 0.35; transientFreq = 1500; transientDur = 0.2;
    } else if (type === 'deagle') {
      subStart = 150; subEnd = 44; subDuration = 0.24; transientFreq = 2400; transientDur = 0.14;
    }

    // 1. Spatial Sub Bass Wave
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(subStart, t);
    osc.frequency.exponentialRampToValueAtTime(subEnd, t + subDuration);
    oscGain.gain.setValueAtTime(0.85, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + subDuration);
    osc.connect(oscGain);
    oscGain.connect(panner);
    osc.start(t);
    osc.stop(t + subDuration);

    // 2. Spatial Muzzle Crack Transient
    const bufferSize = Math.floor(this.ctx.sampleRate * transientDur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isOccluded ? 850 : transientFreq, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + transientDur);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.9, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + transientDur);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(panner);
    noise.start(t);
    noise.stop(t + transientDur);

    // 3. Mechanical Click Action
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(3200, t + 0.01);
    clickOsc.frequency.exponentialRampToValueAtTime(400, t + 0.05);
    clickGain.gain.setValueAtTime(0.4, t + 0.01);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    clickOsc.connect(clickGain);
    clickGain.connect(panner);
    clickOsc.start(t + 0.01);
    clickOsc.stop(t + 0.05);
  }

  // Backward compatibility alias
  public playBotGunshot(type: WeaponType, distance: number) {
    if (!this.ctx) return;
    const dummyPos = this.listenerPos.clone().add(new THREE.Vector3(distance * 0.8, 0, distance * 0.6));
    this.playSpatialGunshot(type, dummyPos, false);
  }

  // --- 3. SUPERSONIC BULLET FLYBY & DOPPLER WHIZ-BY EFFECT ---
  public playSupersonicFlyby(
    flybyPos: THREE.Vector3,
    bulletDir: THREE.Vector3,
    relativeSpeed: number = 750
  ) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const spatial = this.create3DPanner(flybyPos, false, 0, 1.2, 35);
    if (!spatial) return;
    const { panner } = spatial;

    // Compute Doppler pitch shift: approaching bullet has higher pitch, receding drops sharply
    // Physical supersonic crack-thump signature
    const duration = 0.075;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';

    // Sharp whip snap downshift (3400 Hz down to 320 Hz)
    osc.frequency.setValueAtTime(3200, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + duration);

    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(panner);
    osc.start(t);
    osc.stop(t + duration);

    // Shockwave air displacement thump
    const thump = this.ctx.createOscillator();
    const thumpGain = this.ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(160, t + 0.015);
    thump.frequency.exponentialRampToValueAtTime(45, t + 0.09);
    thumpGain.gain.setValueAtTime(0.5, t + 0.015);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    thump.connect(thumpGain);
    thumpGain.connect(panner);
    thump.start(t + 0.015);
    thump.stop(t + 0.09);
  }

  public playWhizBy() {
    // Default close flyby fallback
    const offset = new THREE.Vector3((Math.random() - 0.5) * 2, 0.3, (Math.random() - 0.5) * 2);
    const flyPos = this.listenerPos.clone().add(offset);
    this.playSupersonicFlyby(flyPos, new THREE.Vector3(0, 0, 1));
  }

  // --- 4. 3D SPATIAL ENEMY FOOTSTEPS & MULTI-SURFACE ACOUSTICS ---
  public playSpatialFootstep(
    pos: THREE.Vector3,
    isSprinting: boolean = false,
    surface: 'concrete' | 'metal' | 'dirt' = 'concrete',
    isOccluded: boolean = false
  ) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const dist = this.listenerPos.distanceTo(pos);
    if (dist > 38) return; // Beyond audible footstep distance

    const spatial = this.create3DPanner(pos, isOccluded, isOccluded ? 0.85 : 0, 1.5, 42);
    if (!spatial) return;
    const { panner } = spatial;

    const vol = isSprinting ? 0.55 : 0.32;

    if (surface === 'metal') {
      // Metal Catwalk / Industrial floor: resonant hollow clink + tap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(950, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.06);
      gain.gain.setValueAtTime(vol * 0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
      osc.connect(gain);
      gain.connect(panner);
      osc.start(t);
      osc.stop(t + 0.06);

      // High harmonic ring
      const ring = this.ctx.createOscillator();
      const ringGain = this.ctx.createGain();
      ring.type = 'sine';
      ring.frequency.setValueAtTime(1850, t);
      ringGain.gain.setValueAtTime(vol * 0.35, t);
      ringGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      ring.connect(ringGain);
      ringGain.connect(panner);
      ring.start(t);
      ring.stop(t + 0.08);
    } else if (surface === 'dirt') {
      // Soft dirt / sand crunch
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(190, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);
      gain.gain.setValueAtTime(vol * 0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(panner);
      osc.start(t);
      osc.stop(t + 0.08);
    } else {
      // Hard tactical concrete boot heel impact
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.065);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.065);
      osc.connect(gain);
      gain.connect(panner);
      osc.start(t);
      osc.stop(t + 0.065);

      // Rubber friction scuff
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, t);
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(vol * 0.45, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(panner);
      noise.start(t);
      noise.stop(t + 0.04);
    }
  }

  // First-person player footstep
  public playFootstep(isSprinting: boolean, surface: 'concrete' | 'metal' | 'dirt' = 'concrete') {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const freq = surface === 'metal' ? 880 : surface === 'dirt' ? 180 : 360;
    const vol = isSprinting ? 0.38 : 0.22;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = surface === 'metal' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.07);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.07);

    // Friction scuff
    this.createGunshotNoiseTransient(t, 0.04, 1400, 400, vol * 0.5);
  }

  // --- 5. HITMARKER & ELIMINATION AUDIO ---
  public playHitmarker(isHeadshot: boolean = false, isKill: boolean = false, isArmor: boolean = false) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    if (isKill) {
      // Deep satisfying COD Kill Confirmation Crunch
      const subCrunch = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subCrunch.type = 'triangle';
      subCrunch.frequency.setValueAtTime(isHeadshot ? 920 : 540, t);
      subCrunch.frequency.exponentialRampToValueAtTime(110, t + 0.2);
      subGain.gain.setValueAtTime(0.85, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      subCrunch.connect(subGain);
      subGain.connect(this.sfxGain);
      subCrunch.start(t);
      subCrunch.stop(t + 0.2);

      // High-Frequency Confirmed Ring Chime
      const chime = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(isHeadshot ? 2800 : 2100, t);
      chime.frequency.exponentialRampToValueAtTime(3600, t + 0.14);
      chimeGain.gain.setValueAtTime(0.45, t);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      chime.connect(chimeGain);
      chimeGain.connect(this.sfxGain);
      chime.start(t);
      chime.stop(t + 0.16);

      // Extra helmet dink if headshot kill
      if (isHeadshot) {
        this.playHeadshotDink(t);
      }
    } else if (isHeadshot) {
      // Iconic Metallic Helmet Dink + Red Hitmarker
      this.playHeadshotDink(t);
    } else if (isArmor) {
      // Ceramic / Kevlar Plate Shatter
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(750, t);
      osc.frequency.exponentialRampToValueAtTime(180, t + 0.11);
      gain.gain.setValueAtTime(0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.11);

      this.createMechanicalClick(t, 0.04, 3800, 0.6);
    } else {
      // Crisp Tactical Double-Tick Hitmarker
      for (let i = 0; i < 2; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const st = t + i * 0.024;
        osc.frequency.setValueAtTime(2000 + i * 400, st);
        osc.frequency.exponentialRampToValueAtTime(950, st + 0.04);
        gain.gain.setValueAtTime(0.48, st);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.04);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(st);
        osc.stop(st + 0.04);
      }
    }
  }

  private playHeadshotDink(t: number) {
    if (!this.ctx || !this.sfxGain) return;
    // Resonant ballistic helmet ping (2400Hz - 3800Hz)
    const bell = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(2600, t);
    bell.frequency.exponentialRampToValueAtTime(3400, t + 0.05);
    bell.frequency.exponentialRampToValueAtTime(1900, t + 0.22);
    bellGain.gain.setValueAtTime(0.75, t);
    bellGain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    bell.connect(bellGain);
    bellGain.connect(this.sfxGain);
    bell.start(t);
    bell.stop(t + 0.24);

    // Sharp bullet lead deform crunch
    this.createMechanicalClick(t, 0.05, 4200, 0.6);
  }

  private playSampleBuffer(buf: AudioBuffer, volume: number = 1.0, playbackRate: number = 1.0) {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.setValueAtTime(playbackRate, this.ctx.currentTime);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      src.connect(gain);
      gain.connect(this.sfxGain);
      src.start();
    } catch {
      // safe fallback
    }
  }

  // --- PROCEDURAL TACTICAL RELOAD SYNTHESIS SUITE ---
  private createProceduralMagFriction(t: number, duration: number, startFreq: number, endFreq: number, vol: number) {
    if (!this.ctx || !this.sfxGain) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const p = i / bufferSize;
      output[i] = (Math.random() * 2 - 1) * Math.sin(p * Math.PI) * 0.45;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(startFreq, t);
    filter.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
    filter.Q.setValueAtTime(4.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + duration);
  }

  private createProceduralMetalSnap(t: number, freq: number, decay: number, vol: number) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.28, t + decay);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + decay);
  }

  private createProceduralChamberThump(t: number, startFreq: number, endFreq: number, decay: number, vol: number) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + decay);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + decay);
  }

  // --- 6. WEAPON RELOADS (AUTHENTIC 100% PROCEDURAL MECHANICAL CHOREOGRAPHY) ---
  public playReload(type: string, stage: 'mag_out' | 'mag_in' | 'cock' | 'hk_slap' | 'slide_rack' | 'shell_insert' | 'bolt_cycle' | 'ak_mag_out' | 'ak_mag_in' | 'ak_rack' | 'scar_bolt' | 'vector_charge') {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // AK-47 specific rock-and-lock choreography
    if (type === 'ak47' || stage === 'ak_mag_out' || stage === 'ak_mag_in' || stage === 'ak_rack') {
      if (stage === 'mag_out' || stage === 'ak_mag_out') {
        // AK-47 paddle release latch click + curved steel mag rocking out
        this.createProceduralMetalSnap(t, 2900, 0.032, 0.75);
        this.createProceduralMagFriction(t + 0.012, 0.09, 1800, 950, 0.5);
        this.createProceduralMetalSnap(t + 0.048, 2200, 0.035, 0.45);
        return;
      } else if (stage === 'mag_in' || stage === 'ak_mag_in') {
        // Front lug contact + rock-and-lock rear retention latch engagement
        this.createProceduralMetalSnap(t, 2100, 0.028, 0.6);
        this.createProceduralMagFriction(t + 0.015, 0.06, 1200, 2400, 0.45);
        this.createProceduralMetalSnap(t + 0.045, 3800, 0.04, 0.95);
        this.createProceduralChamberThump(t + 0.048, 220, 55, 0.11, 0.75);
        return;
      } else if (stage === 'cock' || stage === 'ak_rack') {
        // Heavy right-side reciprocating bolt carrier pull + spring slam into battery
        this.createProceduralMetalSnap(t, 2700, 0.038, 0.7);
        this.createProceduralMagFriction(t + 0.015, 0.06, 1700, 1100, 0.5);
        this.createProceduralMetalSnap(t + 0.065, 4200, 0.045, 0.95);
        this.createProceduralChamberThump(t + 0.07, 260, 60, 0.12, 0.85);
        return;
      }
    }

    // SCAR-17 specific heavy battle rifle reload
    if (type === 'scar' || stage === 'scar_bolt') {
      if (stage === 'cock' || stage === 'scar_bolt') {
        this.createProceduralMetalSnap(t, 3200, 0.03, 0.8);
        this.createProceduralMagFriction(t + 0.01, 0.045, 2200, 1300, 0.45);
        this.createProceduralMetalSnap(t + 0.05, 4600, 0.04, 0.9);
        this.createProceduralChamberThump(t + 0.052, 290, 65, 0.1, 0.75);
        return;
      }
    }

    // Vector CRB snappy SMG reload
    if (type === 'vector' || stage === 'vector_charge') {
      if (stage === 'cock' || stage === 'vector_charge') {
        this.createProceduralMetalSnap(t, 4200, 0.022, 0.75);
        this.createProceduralMagFriction(t + 0.008, 0.035, 3400, 1800, 0.4);
        this.createProceduralMetalSnap(t + 0.035, 5100, 0.03, 0.85);
        this.createProceduralChamberThump(t + 0.038, 340, 85, 0.07, 0.6);
        return;
      }
    }

    switch (stage) {
      case 'mag_out': {
        // 1. Magazine release lever detent disengagement click
        this.createProceduralMetalSnap(t, 3600, 0.028, 0.7);
        // 2. Magazine body friction sliding out of the lower receiver magwell
        this.createProceduralMagFriction(t + 0.015, 0.08, 2400, 1100, 0.45);
        // 3. Guide lip release tick
        this.createProceduralMetalSnap(t + 0.045, 1900, 0.03, 0.35);
        break;
      }
      case 'mag_in': {
        // 1. Guide lip contact against receiver mouth + insertion friction
        this.createProceduralMetalSnap(t, 2600, 0.025, 0.55);
        this.createProceduralMagFriction(t + 0.01, 0.05, 1400, 2900, 0.4);
        // 2. High-precision positive magazine retention catch locking snap
        this.createProceduralMetalSnap(t + 0.042, 4400, 0.035, 0.85);
        // 3. Solid receiver chamber lower-body resonant thump
        this.createProceduralChamberThump(t + 0.044, 280, 65, 0.08, 0.6);
        break;
      }
      case 'hk_slap': {
        // MP5 HK Slap: Palm strike onto charging handle + detent spring release into battery
        this.createProceduralChamberThump(t, 220, 90, 0.04, 0.6);
        this.createProceduralMagFriction(t, 0.03, 3200, 1200, 0.5);
        this.createProceduralMetalSnap(t + 0.018, 4800, 0.025, 0.8);
        this.createProceduralMetalSnap(t + 0.045, 3800, 0.04, 0.85);
        this.createProceduralChamberThump(t + 0.048, 310, 75, 0.09, 0.65);
        break;
      }
      case 'slide_rack': {
        // Slide rearward travel ratchet + spring compression + forward release into battery lock
        this.createProceduralMetalSnap(t, 2900, 0.03, 0.65);
        this.createProceduralMagFriction(t + 0.01, 0.045, 1800, 3200, 0.4);
        this.createProceduralMetalSnap(t + 0.045, 3500, 0.025, 0.7);
        this.createProceduralMetalSnap(t + 0.075, 4600, 0.04, 0.9);
        this.createProceduralChamberThump(t + 0.078, 240, 70, 0.085, 0.65);
        break;
      }
      case 'bolt_cycle': {
        // AX-50 Sniper Bolt cycle: handle lift cam unlock + sliding bolt draw + lock into battery
        this.createProceduralMetalSnap(t, 2800, 0.035, 0.65);
        this.createProceduralChamberThump(t, 190, 80, 0.05, 0.5);
        this.createProceduralMagFriction(t + 0.04, 0.07, 2100, 1200, 0.45);
        this.createProceduralMetalSnap(t + 0.11, 3400, 0.025, 0.6);
        this.createProceduralMetalSnap(t + 0.16, 4400, 0.045, 0.85);
        this.createProceduralChamberThump(t + 0.165, 290, 60, 0.11, 0.75);
        break;
      }
      case 'shell_insert': {
        // Shotgun 12GA loading gate click + brass casing rim snap
        this.createProceduralMetalSnap(t, 2700, 0.025, 0.6);
        this.createProceduralMagFriction(t + 0.01, 0.04, 1500, 3100, 0.45);
        this.createProceduralMetalSnap(t + 0.038, 4100, 0.032, 0.75);
        break;
      }
      case 'cock':
      default: {
        // M4 ping-pong bolt catch release + buffer spring thrust + rotating bolt lock into chamber
        this.createProceduralMetalSnap(t, 3800, 0.025, 0.75);
        this.createProceduralMagFriction(t + 0.012, 0.05, 2600, 1100, 0.4);
        this.createProceduralMetalSnap(t + 0.045, 4900, 0.038, 0.9);
        this.createProceduralChamberThump(t + 0.048, 320, 70, 0.09, 0.7);
        break;
      }
    }
  }

  // --- TACTICAL EQUIPMENT SOUND DESIGN ---
  public playFlashbangDetonate() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Magnesium sharp blast transient + concussive air punch
    this.createGunshotNoiseTransient(t, 0.08, 4500, 800, 1.2);
    this.createGunshotSubBass(t, 190, 48, 0.16, 1.0);
    this.createProceduralMetalSnap(t + 0.01, 5200, 0.04, 0.9);
    this.playTinnitus();
  }

  public playTinnitus(duration: number = 3.2) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // High-pitched acoustic trauma ringing (4.2 kHz pure sine)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(4200, t);
    osc.frequency.linearRampToValueAtTime(3900, t + duration);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.setValueAtTime(0.35, t + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  public playConcussionDetonate() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Massive concussive shockwave: low-frequency heavy air displacement
    this.createGunshotSubBass(t, 95, 28, 0.55, 1.4);
    this.createGunshotNoiseTransient(t, 0.22, 1400, 220, 1.1);
    this.createAcousticReverb(t, 0.6, 0.85);
  }

  public playHeartbeatSensorBeep(distance: number = 20) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Bio-telemetry sonar ping: frequency rises as hostile gets closer
    const freq = Math.max(480, Math.min(1400, 1400 - distance * 25));
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.3, t + 0.08);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  public playPumpAction() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Fore-end slide rearward racking stroke + forward ejection port lock
    this.createProceduralMetalSnap(t, 2600, 0.03, 0.7);
    this.createProceduralMagFriction(t + 0.01, 0.05, 1900, 1100, 0.45);
    this.createProceduralMetalSnap(t + 0.058, 4200, 0.04, 0.85);
    this.createProceduralChamberThump(t + 0.062, 260, 65, 0.08, 0.65);
  }

  // --- FREE FIRE SOUND EFFECTS ---
  public playGlooWallDeploy() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Cryo-expansion burst + crystalline locking transient
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(780, t + 0.12);
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.28);

    this.createMechanicalClick(t + 0.05, 0.06, 3800, 0.85);
    this.createMechanicalClick(t + 0.10, 0.08, 5200, 0.9);
    this.createGunshotSubBass(t + 0.08, 150, 40, 0.14, 0.7);
  }

  public playGlooWallHit() {
    const sample = this.freefireBuffers.get('gloowall_hit');
    if (sample) {
      const pitch = 0.92 + Math.random() * 0.16;
      this.playSampleBuffer(sample, 1.1, pitch);
    } else if (this.ctx && this.sfxGain) {
      const t = this.ctx.currentTime;
      this.createMechanicalClick(t, 0.06, 4200, 0.8);
      this.createGunshotNoiseTransient(t, 0.12, 2800, 600, 0.7);
    }
  }

  public playDangerAirstrike() {
    const sample = this.freefireBuffers.get('danger_airstrike');
    if (sample) {
      this.playSampleBuffer(sample, 1.2, 0.95);
    } else if (this.ctx && this.sfxGain) {
      const t = this.ctx.currentTime;
      this.createGunshotSubBass(t, 90, 25, 0.8, 1.0);
      this.createGunshotNoiseTransient(t, 0.6, 900, 80, 0.9);
    }
  }

  public playBooyah() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Free Fire Booyah triumphant fanfare brass chord
    const freqs = [392.00, 523.25, 659.25, 783.99, 1046.50]; // G4, C5, E5, G5, C6
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + idx * 0.06);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.4 / (idx + 1), t + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 2.4);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + idx * 0.06);
      osc.stop(t + 2.5);
    });
    this.createGunshotSubBass(t, 140, 45, 0.4, 0.8);
  }

  public playInhaler() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Aerated aerosol hiss + vital chime
    this.createGunshotNoiseTransient(t, 0.35, 3400, 900, 0.5);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, t + 0.1);
    osc.frequency.exponentialRampToValueAtTime(880.00, t + 0.35);
    gain.gain.setValueAtTime(0.2, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t + 0.1);
    osc.stop(t + 0.45);
  }

  public playMedkit() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Medical zipper + bandage wrap flutter
    this.createGunshotNoiseTransient(t, 0.15, 2200, 600, 0.4);
    this.createMechanicalClick(t + 0.12, 0.04, 3000, 0.5);
    this.createGunshotNoiseTransient(t + 0.2, 0.18, 1600, 400, 0.4);
  }

  public playLaunchPad() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // High-thrust pneumatic jump pad launch
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(580, t + 0.22);
    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.35);
    this.createGunshotNoiseTransient(t, 0.3, 1800, 300, 0.7);
  }

  // --- 7. TACTICAL MOVEMENT SOUNDS ---
  public playDolphinDive() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // High-speed air whoosh + heavy chest rig impact
    this.createGunshotNoiseTransient(t, 0.24, 1300, 200, 0.65);
    this.createGunshotSubBass(t + 0.15, 150, 38, 0.26, 0.85);
    this.createGunshotNoiseTransient(t + 0.18, 0.16, 750, 150, 0.75);
  }

  public playMount() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Foregrip resting on hard barrier surface + weapon brace click
    this.createMechanicalClick(t, 0.04, 2000, 0.6);
    this.createGunshotNoiseTransient(t + 0.02, 0.06, 1300, 300, 0.45);
  }

  public playSlide() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createGunshotNoiseTransient(t, 0.36, 1900, 300, 0.55);
    this.createGunshotSubBass(t, 145, 52, 0.3, 0.45);
  }

  public playSlideCancel() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createGunshotNoiseTransient(t, 0.08, 2300, 600, 0.6);
    this.createMechanicalClick(t + 0.02, 0.03, 2500, 0.45);
  }

  public playMantle() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Glove slap on concrete/metal ledge + vault effort
    this.createGunshotSubBass(t, 170, 52, 0.15, 0.65);
    this.createGunshotNoiseTransient(t, 0.12, 1500, 300, 0.7);
    this.createGunshotNoiseTransient(t + 0.12, 0.18, 850, 200, 0.5);
  }

  public playTacStanceToggle() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createMechanicalClick(t, 0.03, 3500, 0.55);
    this.createMechanicalClick(t + 0.025, 0.04, 4800, 0.65);
  }

  public playLean(direction: 'left' | 'right' | 'center') {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // PUBG/BGMI tactical body lean: cloth rustle, vest flex and subtle sling movement
    const centerPitch = direction === 'center' ? 1100 : direction === 'left' ? 1250 : 1350;
    this.createGunshotNoiseTransient(t, 0.09, centerPitch, 320, 0.38);
    this.createMechanicalClick(t + 0.02, 0.03, direction === 'center' ? 2200 : 2800, 0.35);
  }

  public playTacSprintStart() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Heavy tactical combat sprint burst: deep foot push-off and gear rustle, no synthetic beeps
    this.createGunshotNoiseTransient(t, 0.12, 600, 140, 0.35);
  }

  public playJump() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createGunshotNoiseTransient(t, 0.1, 850, 200, 0.35);
  }

  public playLand() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createGunshotSubBass(t, 170, 48, 0.2, 0.65);
    this.createGunshotNoiseTransient(t, 0.12, 650, 150, 0.45);
  }

  public playDrawWeapon() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createGunshotNoiseTransient(t, 0.08, 1700, 400, 0.4);
    this.createMechanicalClick(t + 0.04, 0.03, 3400, 0.65);
  }

  public playKnifeSlash(isHit: boolean = false) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createGunshotNoiseTransient(t, 0.14, 2900, 500, 0.85);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1300, t);
    osc.frequency.exponentialRampToValueAtTime(3400, t + 0.08);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);

    if (isHit) {
      this.createGunshotSubBass(t + 0.04, 190, 52, 0.18, 0.95);
      this.createGunshotNoiseTransient(t + 0.04, 0.12, 1500, 200, 0.75);
    }
  }

  public playFleshImpact() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createGunshotSubBass(t, 160, 45, 0.1, 0.65);
    this.createGunshotNoiseTransient(t, 0.08, 1200, 250, 0.55);
  }

  public playBotPain(isSevere: boolean = false) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createGunshotSubBass(t, isSevere ? 190 : 140, 45, 0.12, 0.7);
    this.createGunshotNoiseTransient(t, 0.1, isSevere ? 1800 : 1100, 200, 0.6);
  }

  public playPain() {
    this.playFleshImpact();
  }

  // --- 8. SPATIAL EXPLOSIONS & GRENADES ---
  public playSpatialExplosion(pos: THREE.Vector3, isOccluded: boolean = false) {
    if (!this.ctx || !this.sfxGain) return;
    const spatial = this.create3DPanner(pos, isOccluded, isOccluded ? 0.9 : 0, 4.0, 120);
    if (!spatial) return;
    const { panner } = spatial;
    const t = this.ctx.currentTime;

    // Seismic sub rumble
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(82, t);
    osc.frequency.exponentialRampToValueAtTime(18, t + 1.25);
    oscGain.gain.setValueAtTime(1.65, t);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
    osc.connect(oscGain);
    oscGain.connect(panner);
    osc.start(t);
    osc.stop(t + 1.25);

    // Shockwave fire burst noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.9);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isOccluded ? 450 : 900, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + 0.9);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(1.45, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(panner);
    noise.start(t);
    noise.stop(t + 0.9);

    // Tinnitus Ring if player is near explosion
    const dist = this.listenerPos.distanceTo(pos);
    if (dist < 14) {
      const ring = this.ctx.createOscillator();
      const ringGain = this.ctx.createGain();
      ring.type = 'sine';
      ring.frequency.setValueAtTime(3800, t + 0.08);
      ringGain.gain.setValueAtTime(0.32 * (1 - dist / 14), t + 0.08);
      ringGain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
      ring.connect(ringGain);
      ringGain.connect(this.sfxGain);
      ring.start(t + 0.08);
      ring.stop(t + 2.0);
    }
  }

  public playExplosion() {
    this.playSpatialExplosion(this.listenerPos.clone().add(new THREE.Vector3(0, 0, 5)), false);
  }

  public playSpatialGrenadeBounce(pos: THREE.Vector3) {
    if (!this.ctx || !this.sfxGain) return;
    const spatial = this.create3DPanner(pos, false, 0, 1.5, 40);
    if (!spatial) return;
    const t = this.ctx.currentTime;
    const { panner } = spatial;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(panner);
    osc.start(t);
    osc.stop(t + 0.08);

    const click = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    click.type = 'sine';
    click.frequency.setValueAtTime(2300, t);
    clickGain.gain.setValueAtTime(0.45, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    click.connect(clickGain);
    clickGain.connect(panner);
    click.start(t);
    click.stop(t + 0.05);
  }

  public playGrenadeBounce() {
    this.playSpatialGrenadeBounce(this.listenerPos.clone());
  }

  public playGrenadePin() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createMechanicalClick(t, 0.08, 3900, 0.65);
  }

  // --- 9. UTILITY & EQUIPMENT SOUNDS ---
  public playSmokeDeploy() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
    this.playSmokeHiss();
  }

  public playSmokeHiss() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const duration = 2.5;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const p = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-p * 1.6) * 0.28;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3400, t);
    filter.frequency.linearRampToValueAtTime(1200, t + duration);
    filter.Q.setValueAtTime(1.8, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + duration);
  }

  public playMotionSensorDeploy() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1250, t);
    osc.frequency.setValueAtTime(1850, t + 0.08);
    osc.frequency.setValueAtTime(2500, t + 0.16);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.28);
  }

  public playSonarPing() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.35);
    gain.gain.setValueAtTime(0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.38);
  }

  public playTacticalSwitch() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(820, t);
    osc.frequency.setValueAtTime(1450, t + 0.04);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // --- 9. PRECISION SCOPE & HOLD-BREATH ACOUSTICS ---
  public playInhale() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const duration = 0.55;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const p = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.sin(p * Math.PI) * 0.22;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.linearRampToValueAtTime(750, t + duration);
    filter.Q.setValueAtTime(2.2, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.35, t + duration * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + duration);
  }

  public playExhale() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const duration = 0.65;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const p = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * Math.exp(-p * 3.0) * 0.25;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(680, t);
    filter.frequency.linearRampToValueAtTime(320, t + duration);
    filter.Q.setValueAtTime(1.8, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.32, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + duration);
  }

  public playHeavyExhaleGasp() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const duration = 0.85;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const p = i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * (1 - p * 0.8) * 0.35;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(850, t);
    filter.frequency.linearRampToValueAtTime(280, t + duration);
    filter.Q.setValueAtTime(2.0, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + duration);
  }

  public playHeartbeat(intensity: number = 1.0) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // Lub (first ventricle contraction thump)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(62, t);
    osc1.frequency.exponentialRampToValueAtTime(36, t + 0.12);
    gain1.gain.setValueAtTime(0.65 * intensity, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc1.connect(gain1);
    gain1.connect(this.sfxGain);
    osc1.start(t);
    osc1.stop(t + 0.12);

    // Dub (second ventricle valve thump 140ms later)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(54, t + 0.14);
    osc2.frequency.exponentialRampToValueAtTime(32, t + 0.28);
    gain2.gain.setValueAtTime(0.55 * intensity, t + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc2.connect(gain2);
    gain2.connect(this.sfxGain);
    osc2.start(t + 0.14);
    osc2.stop(t + 0.28);
  }

  public playOpticZoomClick() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // High mechanical dial detent snap
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(3200, t);
    osc.frequency.exponentialRampToValueAtTime(1400, t + 0.035);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.035);

    // Metallic ring friction
    this.createGunshotNoiseTransient(t, 0.04, 4500, 800, 0.35);
  }

  public playOpticClick() {
    this.playOpticZoomClick();
  }

  public playScopeRaise() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createGunshotNoiseTransient(t, 0.08, 1800, 400, 0.25);
  }

  public playThermalToggle() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(4200, t + 0.12);
    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  public playPickup(type: string) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    if (type === 'ammo') {
      this.createMechanicalClick(t, 0.05, 3500, 0.65);
      this.createMechanicalClick(t + 0.06, 0.06, 4300, 0.75);
      this.createGunshotSubBass(t + 0.08, 230, 110, 0.1, 0.45);
    } else if (type === 'armor') {
      this.createGunshotSubBass(t, 170, 65, 0.22, 0.85);
      this.createMechanicalClick(t + 0.03, 0.08, 1900, 0.65);
      this.createMechanicalClick(t + 0.1, 0.06, 2700, 0.55);
    } else if (type === 'tactical') {
      this.createMechanicalClick(t, 0.04, 2900, 0.6);
      this.playTacticalSwitch();
    } else if (type === 'inhaler') {
      this.playInhaler();
    } else if (type === 'medkit') {
      this.playMedkit();
    } else {
      // Stim injector hiss & heart surge
      this.createGunshotNoiseTransient(t, 0.25, 3200, 600, 0.65);
      const tone = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      tone.type = 'sine';
      tone.frequency.setValueAtTime(540, t);
      tone.frequency.exponentialRampToValueAtTime(1080, t + 0.2);
      gain.gain.setValueAtTime(0.38, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      tone.connect(gain);
      gain.connect(this.sfxGain);
      tone.start(t);
      tone.stop(t + 0.25);
    }
  }

  public playLaserToggle() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createMechanicalClick(t, 0.04, 4900, 0.55);
  }

  public playInspect() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createMechanicalClick(t, 0.06, 2300, 0.45);
    setTimeout(() => this.createMechanicalClick(this.ctx?.currentTime || t + 0.4, 0.06, 1900, 0.4), 400);
  }

  public startHeartbeat() {
    if (this.heartbeatInterval !== null) return;
    this.heartbeatInterval = window.setInterval(() => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      this.createGunshotSubBass(t, 78, 28, 0.18, 0.85);
      this.createGunshotSubBass(t + 0.22, 68, 24, 0.22, 1.0);
    }, 750);
  }

  public stopHeartbeat() {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  public playVoiceCallout(text: string) {
    if ('speechSynthesis' in window) {
      this.playRadioChirp();
      setTimeout(() => {
        try {
          const utter = new SpeechSynthesisUtterance(text);
          utter.rate = 1.15;
          utter.pitch = 0.85;
          utter.volume = 0.95;
          const voices = window.speechSynthesis.getVoices();
          const usVoice = voices.find(v => v.lang.includes('en') && (v.name.includes('Male') || v.name.includes('Natural')));
          if (usVoice) utter.voice = usVoice;
          window.speechSynthesis.speak(utter);
        } catch {
          // Fallback
        }
      }, 120);
    }
  }

  public playUIClick() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1850, t);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  public playUIHover() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(980, t);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.03);
  }

  // --- 10. ENVIRONMENTAL & WEATHER AUDIO ---
  public setWeatherAudio(weatherType: string, intensity: number = 1.0) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.ensureWeatherAudioNodes();
    if (!this.weatherRainGain || !this.weatherWindGain || !this.weatherNightGain) return;

    if (weatherType === 'tactical_storm') {
      this.weatherRainGain.gain.setTargetAtTime(0.48 * intensity, t, 1.2);
      this.weatherWindGain.gain.setTargetAtTime(0.38 * intensity, t, 1.2);
      this.weatherNightGain.gain.setTargetAtTime(0.0, t, 1.0);
    } else if (weatherType === 'sandstorm') {
      this.weatherRainGain.gain.setTargetAtTime(0.0, t, 0.8);
      this.weatherWindGain.gain.setTargetAtTime(0.65 * intensity, t, 1.2);
      this.weatherNightGain.gain.setTargetAtTime(0.0, t, 1.0);
    } else if (weatherType === 'midnight_fog') {
      this.weatherRainGain.gain.setTargetAtTime(0.0, t, 1.0);
      this.weatherWindGain.gain.setTargetAtTime(0.14, t, 1.5);
      this.weatherNightGain.gain.setTargetAtTime(0.28 * intensity, t, 1.5);
    } else if (weatherType === 'golden_sunset') {
      this.weatherRainGain.gain.setTargetAtTime(0.0, t, 1.0);
      this.weatherWindGain.gain.setTargetAtTime(0.09, t, 1.5);
      this.weatherNightGain.gain.setTargetAtTime(0.06, t, 1.5);
    } else {
      this.weatherRainGain.gain.setTargetAtTime(0.0, t, 1.0);
      this.weatherWindGain.gain.setTargetAtTime(0.06, t, 1.5);
      this.weatherNightGain.gain.setTargetAtTime(0.0, t, 1.0);
    }
  }

  private ensureWeatherAudioNodes() {
    if (!this.ctx || !this.sfxGain || this.weatherRainGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const rainBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const rainData = rainBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      rainData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }

    const rainSrc = this.ctx.createBufferSource();
    rainSrc.buffer = rainBuffer;
    rainSrc.loop = true;

    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(2500, this.ctx.currentTime);

    this.weatherRainGain = this.ctx.createGain();
    this.weatherRainGain.gain.setValueAtTime(0, this.ctx.currentTime);

    rainSrc.connect(rainFilter);
    rainFilter.connect(this.weatherRainGain);
    this.weatherRainGain.connect(this.sfxGain);
    rainSrc.start();
    this.weatherRainNode = rainSrc;

    // Wind Synthesizer
    const windBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const windData = windBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) windData[i] = Math.random() * 2 - 1;

    const windSrc = this.ctx.createBufferSource();
    windSrc.buffer = windBuffer;
    windSrc.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(460, this.ctx.currentTime);
    windFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    const windLfo = this.ctx.createOscillator();
    windLfo.frequency.setValueAtTime(0.24, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(230, this.ctx.currentTime);
    windLfo.connect(lfoGain);
    lfoGain.connect(windFilter.frequency);
    windLfo.start();
    this.weatherLfoNode = windLfo;

    this.weatherWindGain = this.ctx.createGain();
    this.weatherWindGain.gain.setValueAtTime(0, this.ctx.currentTime);

    windSrc.connect(windFilter);
    windFilter.connect(this.weatherWindGain);
    this.weatherWindGain.connect(this.sfxGain);
    windSrc.start();
    this.weatherWindNode = windSrc;

    // Night ambience
    const nightBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const nightData = nightBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) nightData[i] = (Math.random() * 2 - 1) * 0.04;
    const nightSrc = this.ctx.createBufferSource();
    nightSrc.buffer = nightBuffer;
    nightSrc.loop = true;
    const nightFilter = this.ctx.createBiquadFilter();
    nightFilter.type = 'highpass';
    nightFilter.frequency.setValueAtTime(1250, this.ctx.currentTime);

    this.weatherNightGain = this.ctx.createGain();
    this.weatherNightGain.gain.setValueAtTime(0, this.ctx.currentTime);

    nightSrc.connect(nightFilter);
    nightFilter.connect(this.weatherNightGain);
    this.weatherNightGain.connect(this.sfxGain);
    nightSrc.start();
    this.weatherNightNode = nightSrc;
  }

  public playThunder(distanceRatio: number = 0.5) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const vol = Math.max(0.35, 1.25 - distanceRatio * 0.7);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(98, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.85);
    gain.gain.setValueAtTime(vol * 0.95, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 1.25);

    const bufferSize = Math.floor(this.ctx.sampleRate * 3.4);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const p = i / bufferSize;
      const envelope = Math.sin(p * Math.PI) * Math.exp(-p * 1.8);
      const mod = (Math.sin(p * 28) + Math.cos(p * 14)) * 0.3 + 0.7;
      data[i] = (Math.random() * 2 - 1) * envelope * mod;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, t);
    filter.frequency.exponentialRampToValueAtTime(75, t + 3.4);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(vol * 1.15, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 3.4);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + 3.4);
  }

  public playWeatherShiftNotice() {
    if (!this.ctx || !this.voiceGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(590, t);
    osc.frequency.setValueAtTime(890, t + 0.12);
    osc.frequency.setValueAtTime(730, t + 0.24);
    gain.gain.setValueAtTime(0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(gain);
    gain.connect(this.voiceGain);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  public pauseAllCombatAudio() {
    this.stopHeartbeat();
    if (this.weatherRainGain) this.weatherRainGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    if (this.weatherWindGain) this.weatherWindGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    if (this.weatherNightGain) this.weatherNightGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
  }

  // --- CORE HELPER SYNTHESIZERS ---
  private createGunshotSubBass(startT: number, startFreq: number, endFreq: number, duration: number, volume: number) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, startT);
    osc.frequency.exponentialRampToValueAtTime(endFreq, startT + duration);
    gain.gain.setValueAtTime(volume, startT);
    gain.gain.exponentialRampToValueAtTime(0.0001, startT + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(startT);
    osc.stop(startT + duration);
  }

  private createGunshotNoiseTransient(startT: number, duration: number, filterFreq: number, filterQ: number, volume: number) {
    if (!this.ctx || !this.sfxGain) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, startT);
    filter.frequency.exponentialRampToValueAtTime(90, startT + duration);
    filter.Q.setValueAtTime(filterQ / 100, startT);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, startT);
    gain.gain.exponentialRampToValueAtTime(0.0001, startT + duration);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    whiteNoise.start(startT);
    whiteNoise.stop(startT + duration);
  }

  private createMechanicalClick(startT: number, duration: number, freq: number, volume: number) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, startT);
    osc.frequency.exponentialRampToValueAtTime(280, startT + duration);
    gain.gain.setValueAtTime(volume, startT);
    gain.gain.exponentialRampToValueAtTime(0.0001, startT + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(startT);
    osc.stop(startT + duration);
  }

  private createAcousticReverb(startT: number, duration: number, volume: number) {
    if (!this.ctx || !this.sfxGain) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const data = buffer.getChannelData(c);
      for (let i = 0; i < bufferSize; i++) {
        const decay = Math.exp(-i / (this.ctx.sampleRate * (duration * 0.4)));
        data[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1050, startT);
    filter.Q.setValueAtTime(1.5, startT);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.45, startT);
    gain.gain.exponentialRampToValueAtTime(0.0001, startT + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(startT);
    noise.stop(startT + duration);
  }

  private createBulletCasingDrop(startT: number) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(4300, startT);
    osc.frequency.setValueAtTime(3700, startT + 0.03);
    gain.gain.setValueAtTime(0.14, startT);
    gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(startT);
    osc.stop(startT + 0.08);
  }

  // --- KILLCAM REPLAY SFX ---
  public playKillcamStart() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // Deep whoosh down to 35Hz
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(160, t);
    subOsc.frequency.exponentialRampToValueAtTime(38, t + 0.45);
    subGain.gain.setValueAtTime(0.7, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(t);
    subOsc.stop(t + 0.5);

    // Tape rewind / tape scratch screech
    const noise = this.ctx.createBufferSource();
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.35, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.sin((i / data.length) * Math.PI * 80);
    }
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.exponentialRampToValueAtTime(3200, t + 0.3);
    filter.Q.value = 4.5;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(t);
    noise.stop(t + 0.35);
  }

  public playKillcamImpact() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // Heavy cinematic slow-motion thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.65);
    gain.gain.setValueAtTime(0.85, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.7);

    // Resonant low-pass crunch
    this.createGunshotNoiseTransient(t, 0.18, 400, 80, 0.5);
  }

  public playKillcamSkip() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Fast tactical click + glitch exit
    this.createMechanicalClick(t, 0.04, 3800, 0.7);
    this.createGunshotNoiseTransient(t, 0.06, 2400, 900, 0.25);
  }

  // --- AAA TACTICAL SQUAD RADIO COMMS SFX ---
  public playRadioChirp(spatialPos?: THREE.Vector3) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const destNode = spatialPos
      ? this.create3DPanner(spatialPos, false, 0, 4.0, 75)?.panner || this.sfxGain
      : this.sfxGain;

    // 1. Radio Mic PTT Key Click
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2450, t);
    osc.frequency.setValueAtTime(1820, t + 0.025);
    oscGain.gain.setValueAtTime(0.18, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(oscGain);
    oscGain.connect(destNode);
    osc.start(t);
    osc.stop(t + 0.05);

    // 2. Radio Squelch Noise Burst
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.06);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2800, t);
    filter.Q.setValueAtTime(2.5, t);
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.16, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(destNode);
    noise.start(t);
    noise.stop(t + 0.06);
  }

  public playRadioTacticalBark(actionType: string, spatialPos?: THREE.Vector3) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    const pannerData = spatialPos
      ? this.create3DPanner(spatialPos, false, 0, 6.0, 85)
      : null;
    const destNode = pannerData ? pannerData.panner : this.sfxGain;

    // Opening squelch
    this.playRadioChirp(spatialPos);

    // Synthesized radio vocal transmission envelope
    const duration = actionType === 'contact' ? 0.38 : actionType === 'flank' ? 0.45 : 0.32;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Pitched formant pulses simulating realistic radio voice modulation
    const basePitch = actionType === 'pinned' ? 240 : actionType === 'contact' ? 220 : 190;
    for (let i = 0; i < bufferSize; i++) {
      const timeSec = i / this.ctx.sampleRate;
      const mod = Math.sin(2 * Math.PI * basePitch * timeSec) * (0.5 + 0.5 * Math.sin(timeSec * 35));
      const radioNoise = (Math.random() * 2 - 1) * 0.3;
      data[i] = (mod * 0.7 + radioNoise) * (0.8 + 0.2 * Math.sin(timeSec * 12));
    }

    const voiceSource = this.ctx.createBufferSource();
    voiceSource.buffer = buffer;

    // Military radio bandpass telephone filter (300Hz - 3400Hz with resonance)
    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1600, t + 0.04);
    bandpass.Q.setValueAtTime(1.8, t + 0.04);

    const voiceGain = this.ctx.createGain();
    voiceGain.gain.setValueAtTime(0.01, t + 0.04);
    voiceGain.gain.linearRampToValueAtTime(0.22, t + 0.08);
    voiceGain.gain.setValueAtTime(0.22, t + duration * 0.85);
    voiceGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    voiceSource.connect(bandpass);
    bandpass.connect(voiceGain);
    voiceGain.connect(destNode);

    voiceSource.start(t + 0.04);
    voiceSource.stop(t + duration);

    // Closing roger-beep mic squelch
    setTimeout(() => {
      if (this.ctx && this.sfxGain) {
        const tEnd = this.ctx.currentTime;
        const endOsc = this.ctx.createOscillator();
        const endGain = this.ctx.createGain();
        endOsc.type = 'sine';
        endOsc.frequency.setValueAtTime(1680, tEnd);
        endOsc.frequency.exponentialRampToValueAtTime(840, tEnd + 0.04);
        endGain.gain.setValueAtTime(0.12, tEnd);
        endGain.gain.exponentialRampToValueAtTime(0.001, tEnd + 0.04);
        endOsc.connect(endGain);
        endGain.connect(destNode);
        endOsc.start(tEnd);
        endOsc.stop(tEnd + 0.04);
      }
    }, Math.floor(duration * 1000));
  }
}

export const soundManager = new SoundEngine();
