// Procedural WebAudio Tactical Sound Synthesizer
// Provides realistic AAA-grade sound effects for all weapons, hits, movement, explosions, and radio voice callouts

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private isMuted: boolean = false;
  private heartbeatNode: OscillatorNode | null = null;
  private heartbeatInterval: number | null = null;

  constructor() {
    // AudioContext will be initialized on first user interaction
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
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    this.voiceGain = this.ctx.createGain();
    this.voiceGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
    this.voiceGain.connect(this.masterGain);
  }

  public setVolumes(master: number, sfx: number) {
    if (!this.ctx || !this.masterGain || !this.sfxGain) return;
    this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, master)), this.ctx.currentTime, 0.05);
    this.sfxGain.gain.setTargetAtTime(Math.max(0, Math.min(1, sfx)), this.ctx.currentTime, 0.05);
  }

  // --- WEAPON SHOOT SOUNDS ---
  public playGunshot(type: 'm4' | 'mp5' | 'sniper' | 'shotgun' | 'deagle', isSilenced: boolean = false) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    switch (type) {
      case 'm4': {
        // High energy 5.56 NATO assault rifle crack with punchy sub-thump and metallic ring
        this.createGunshotSubBass(t, 130, 45, 0.25, 0.8);
        this.createGunshotNoiseTransient(t, 0.12, 1800, 350, 0.9);
        this.createMechanicalClick(t + 0.02, 0.05, 3000, 0.4);
        this.createAcousticReverb(t, 0.35, 0.5);
        this.createBulletCasingDrop(t + 0.15);
        break;
      }
      case 'mp5': {
        // Snappy 9mm rapid submachine gun fire with tight mechanical cycle
        this.createGunshotSubBass(t, 160, 60, 0.18, 0.6);
        this.createGunshotNoiseTransient(t, 0.08, 2600, 500, 0.75);
        this.createMechanicalClick(t + 0.015, 0.04, 4200, 0.5);
        this.createAcousticReverb(t, 0.2, 0.35);
        this.createBulletCasingDrop(t + 0.12);
        break;
      }
      case 'sniper': {
        // Massive .50 BMG heavy anti-material rifle: deep thunder, earth-shaking sub, long rolling echo
        this.createGunshotSubBass(t, 90, 28, 0.65, 1.4);
        this.createGunshotNoiseTransient(t, 0.28, 1200, 150, 1.2);
        this.createMechanicalClick(t + 0.04, 0.08, 1800, 0.6);
        this.createAcousticReverb(t, 0.85, 0.9);
        this.createBulletCasingDrop(t + 0.4);
        break;
      }
      case 'shotgun': {
        // 12-Gauge blast: dual transient crack, wide frequency explosion, lingering smoke rumble
        this.createGunshotSubBass(t, 110, 35, 0.4, 1.1);
        this.createGunshotNoiseTransient(t, 0.22, 1500, 200, 1.1);
        this.createMechanicalClick(t + 0.03, 0.07, 2400, 0.5);
        this.createAcousticReverb(t, 0.5, 0.7);
        // Realistic pump action sound queued
        setTimeout(() => this.playPumpAction(), 320);
        break;
      }
      case 'deagle': {
        // .50 AE Hand Cannon: sharp explosive snap, heavy slide recoil kick
        this.createGunshotSubBass(t, 140, 48, 0.3, 0.95);
        this.createGunshotNoiseTransient(t, 0.15, 2200, 300, 0.9);
        this.createMechanicalClick(t + 0.02, 0.06, 3200, 0.55);
        this.createAcousticReverb(t, 0.4, 0.6);
        this.createBulletCasingDrop(t + 0.2);
        break;
      }
    }
  }

  // --- BOT GUNSHOT (SPATIALIZED / ATTENUATED) ---
  public playBotGunshot(type: 'm4' | 'mp5' | 'sniper' | 'shotgun' | 'deagle', distance: number) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const distFactor = Math.max(0.05, 1 - Math.min(distance, 50) / 50);
    const volume = distFactor * 0.5;

    this.createGunshotSubBass(t, 120, 50, 0.15, volume * 0.7);
    this.createGunshotNoiseTransient(t, 0.1, 1400, 300, volume);
    if (distance < 15) {
      this.playWhizBy();
    }
  }

  // --- HITMARKER AUDIO (Iconic Call of Duty Hit Sound) ---
  public playHitmarker(isHeadshot: boolean = false, isKill: boolean = false, isArmor: boolean = false) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    if (isKill) {
      // Deep satisfying kill confirmation crunch
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isHeadshot ? 880 : 520, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.18);
      gain.gain.setValueAtTime(0.8, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.18);

      // Metallic high ring
      const chime = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(isHeadshot ? 2400 : 1800, t);
      chime.frequency.exponentialRampToValueAtTime(3200, t + 0.12);
      chimeGain.gain.setValueAtTime(0.4, t);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      chime.connect(chimeGain);
      chimeGain.connect(this.sfxGain);
      chime.start(t);
      chime.stop(t + 0.15);
    } else if (isHeadshot) {
      // Red hitmarker distinct snap
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1600, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.08);
      gain.gain.setValueAtTime(0.65, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.08);
    } else if (isArmor) {
      // Armor plate crack
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(700, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.1);
    } else {
      // Standard body hitmarker: crisp high-pitch double tick
      for (let i = 0; i < 2; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        const st = t + i * 0.025;
        osc.frequency.setValueAtTime(1800 + i * 300, st);
        osc.frequency.exponentialRampToValueAtTime(900, st + 0.04);
        gain.gain.setValueAtTime(0.45, st);
        gain.gain.exponentialRampToValueAtTime(0.001, st + 0.04);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(st);
        osc.stop(st + 0.04);
      }
    }
  }

  // --- RELOAD SOUND FX ---
  public playReload(type: string, stage: 'mag_out' | 'mag_in' | 'cock') {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    if (stage === 'mag_out') {
      this.createMechanicalClick(t, 0.08, 1200, 0.5);
      this.createMechanicalClick(t + 0.05, 0.06, 800, 0.3);
    } else if (stage === 'mag_in') {
      this.createMechanicalClick(t, 0.06, 1400, 0.6);
      this.createGunshotSubBass(t + 0.02, 180, 80, 0.1, 0.4);
    } else if (stage === 'cock') {
      this.createMechanicalClick(t, 0.1, 2200, 0.7);
      this.createMechanicalClick(t + 0.08, 0.08, 3000, 0.6);
    }
  }

  public playPumpAction() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createMechanicalClick(t, 0.07, 1600, 0.6);
    this.createMechanicalClick(t + 0.09, 0.07, 2200, 0.7);
  }

  // --- MOVEMENT SOUNDS ---
  public playFootstep(isSprinting: boolean, surface: 'concrete' | 'metal' | 'dirt' = 'concrete') {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const freq = surface === 'metal' ? 800 : surface === 'dirt' ? 180 : 350;
    const vol = isSprinting ? 0.35 : 0.2;

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
    this.createGunshotNoiseTransient(t, 0.04, 1200, 400, vol * 0.5);
  }

  public playSlide() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createGunshotNoiseTransient(t, 0.35, 1800, 300, 0.5);
    this.createGunshotSubBass(t, 140, 50, 0.3, 0.4);
  }

  public playJump() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createGunshotNoiseTransient(t, 0.1, 800, 200, 0.3);
  }

  public playLand() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createGunshotSubBass(t, 160, 45, 0.2, 0.6);
    this.createGunshotNoiseTransient(t, 0.12, 600, 150, 0.4);
  }

  public playWhizBy() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2600, t);
    osc.frequency.exponentialRampToValueAtTime(450, t + 0.08);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // --- EXPLOSION & GRENADE SOUNDS ---
  public playExplosion() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Sub rumble
    this.createGunshotSubBass(t, 80, 20, 1.2, 1.6);
    // Fiery roar noise
    this.createGunshotNoiseTransient(t, 0.9, 800, 80, 1.4);
    // Shockwave high ring (Tinnitus effect)
    const ring = this.ctx.createOscillator();
    const ringGain = this.ctx.createGain();
    ring.type = 'sine';
    ring.frequency.setValueAtTime(3600, t + 0.1);
    ringGain.gain.setValueAtTime(0.25, t + 0.1);
    ringGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    ring.connect(ringGain);
    ringGain.connect(this.sfxGain);
    ring.start(t + 0.1);
    ring.stop(t + 1.8);
  }

  public playGrenadePin() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createMechanicalClick(t, 0.08, 3800, 0.6);
  }

  public playGrenadeBounce() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createGunshotSubBass(t, 240, 110, 0.08, 0.35);
    this.createMechanicalClick(t, 0.05, 2100, 0.4);
  }

  // --- TACTICAL KNIFE MELEE SLASH ---
  public playKnifeSlash(isHit: boolean = false) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Fast whoosh transient
    this.createGunshotNoiseTransient(t, 0.14, 2800, 500, 0.8);
    // Blade metallic slice
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(3200, t + 0.08);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);

    if (isHit) {
      // Flesh / armor impact crunch
      this.createGunshotSubBass(t + 0.04, 180, 50, 0.18, 0.9);
      this.createGunshotNoiseTransient(t + 0.04, 0.12, 1400, 200, 0.7);
    }
  }

  // --- SUPPLY PICKUP AUDIO ---
  public playPickup(type: 'ammo' | 'armor' | 'stimpack' | 'tactical') {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    if (type === 'ammo') {
      // Rapid metallic ammo box clip chime
      this.createMechanicalClick(t, 0.05, 3400, 0.6);
      this.createMechanicalClick(t + 0.06, 0.06, 4200, 0.7);
      this.createGunshotSubBass(t + 0.08, 220, 110, 0.1, 0.4);
    } else if (type === 'armor') {
      // Kevlar plate lock clank
      this.createGunshotSubBass(t, 160, 60, 0.22, 0.8);
      this.createMechanicalClick(t + 0.03, 0.08, 1800, 0.6);
      this.createMechanicalClick(t + 0.1, 0.06, 2600, 0.5);
    } else if (type === 'tactical') {
      // High-tech canister tactical gear reload chime
      this.createMechanicalClick(t, 0.04, 2800, 0.55);
      this.playTacticalSwitch();
    } else {
      // Stim injector hiss & high heart tone
      this.createGunshotNoiseTransient(t, 0.25, 3000, 600, 0.6);
      const tone = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      tone.type = 'sine';
      tone.frequency.setValueAtTime(520, t);
      tone.frequency.exponentialRampToValueAtTime(1040, t + 0.2);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      tone.connect(gain);
      gain.connect(this.sfxGain);
      tone.start(t);
      tone.stop(t + 0.25);
    }
  }

  // --- TACTICAL LASER / FLASHLIGHT TOGGLE ---
  public playLaserToggle() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createMechanicalClick(t, 0.04, 4800, 0.5);
  }

  // --- WEAPON INSPECT / HANDLING CHIME ---
  public playInspect() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    this.createMechanicalClick(t, 0.06, 2200, 0.4);
    setTimeout(() => this.createMechanicalClick(this.ctx?.currentTime || t + 0.4, 0.06, 1800, 0.35), 400);
  }

  // --- LOW HEALTH HEARTBEAT LOOP ---
  public startHeartbeat() {
    if (this.heartbeatInterval !== null) return;
    this.heartbeatInterval = window.setInterval(() => {
      if (!this.ctx || !this.sfxGain) return;
      const t = this.ctx.currentTime;
      // Lub-dub double beat
      this.createGunshotSubBass(t, 75, 30, 0.18, 0.8);
      this.createGunshotSubBass(t + 0.22, 65, 25, 0.22, 0.95);
    }, 750);
  }

  public stopHeartbeat() {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // --- SCORESTREAK RADIO ANNOUNCEMENTS & CALLOUTS ---
  public playVoiceCallout(text: string) {
    if ('speechSynthesis' in window) {
      // Play brief radio beep first
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

  public playRadioChirp() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.setValueAtTime(1750, t + 0.04);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // --- AUDIO SYNTHESIS BUILDING BLOCKS ---
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
    filter.frequency.exponentialRampToValueAtTime(100, startT + duration);
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
    osc.frequency.exponentialRampToValueAtTime(300, startT + duration);
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
    filter.frequency.setValueAtTime(1000, startT);
    filter.Q.setValueAtTime(1.5, startT);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.4, startT);
    gain.gain.exponentialRampToValueAtTime(0.0001, startT + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(startT);
    noise.stop(startT + duration);
  }

  // --- ENVIRONMENTAL & WEATHER AUDIO SYNTHESIS ---
  private weatherRainNode: AudioNode | null = null;
  private weatherRainGain: GainNode | null = null;
  private weatherWindNode: AudioNode | null = null;
  private weatherWindGain: GainNode | null = null;
  private weatherNightGain: GainNode | null = null;
  private weatherNightNode: AudioNode | null = null;
  private weatherLfoNode: OscillatorNode | null = null;

  public setWeatherAudio(weatherType: string, intensity: number = 1.0) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;

    // Ensure ambient nodes exist
    this.ensureWeatherAudioNodes();

    if (!this.weatherRainGain || !this.weatherWindGain || !this.weatherNightGain) return;

    if (weatherType === 'tactical_storm') {
      // Heavy tactical downpour + howling wind
      this.weatherRainGain.gain.setTargetAtTime(0.45 * intensity, t, 1.2);
      this.weatherWindGain.gain.setTargetAtTime(0.35 * intensity, t, 1.2);
      this.weatherNightGain.gain.setTargetAtTime(0.0, t, 1.0);
    } else if (weatherType === 'sandstorm') {
      // Roaring desert wind & grit
      this.weatherRainGain.gain.setTargetAtTime(0.0, t, 0.8);
      this.weatherWindGain.gain.setTargetAtTime(0.6 * intensity, t, 1.2);
      this.weatherNightGain.gain.setTargetAtTime(0.0, t, 1.0);
    } else if (weatherType === 'midnight_fog') {
      // Subtle cool wind + nocturnal ambience
      this.weatherRainGain.gain.setTargetAtTime(0.0, t, 1.0);
      this.weatherWindGain.gain.setTargetAtTime(0.12, t, 1.5);
      this.weatherNightGain.gain.setTargetAtTime(0.25 * intensity, t, 1.5);
    } else if (weatherType === 'golden_sunset') {
      // Gentle twilight breeze
      this.weatherRainGain.gain.setTargetAtTime(0.0, t, 1.0);
      this.weatherWindGain.gain.setTargetAtTime(0.08, t, 1.5);
      this.weatherNightGain.gain.setTargetAtTime(0.05, t, 1.5);
    } else {
      // Clear Day - Calm atmospheric breeze
      this.weatherRainGain.gain.setTargetAtTime(0.0, t, 1.0);
      this.weatherWindGain.gain.setTargetAtTime(0.05, t, 1.5);
      this.weatherNightGain.gain.setTargetAtTime(0.0, t, 1.0);
    }
  }

  private ensureWeatherAudioNodes() {
    if (!this.ctx || !this.sfxGain || this.weatherRainGain) return;

    // 1. Rain Synthesizer (Continuous pink noise + bandpass filtering + droplet modulation)
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
    rainFilter.frequency.setValueAtTime(2400, this.ctx.currentTime);

    this.weatherRainGain = this.ctx.createGain();
    this.weatherRainGain.gain.setValueAtTime(0, this.ctx.currentTime);

    rainSrc.connect(rainFilter);
    rainFilter.connect(this.weatherRainGain);
    this.weatherRainGain.connect(this.sfxGain);
    rainSrc.start();
    this.weatherRainNode = rainSrc;

    // 2. Wind Synthesizer (White noise with sweeping resonant bandpass filter & LFO)
    const windBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const windData = windBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      windData[i] = Math.random() * 2 - 1;
    }

    const windSrc = this.ctx.createBufferSource();
    windSrc.buffer = windBuffer;
    windSrc.loop = true;

    const windFilter = this.ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    windFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    // Wind LFO for dynamic howling modulation
    const windLfo = this.ctx.createOscillator();
    windLfo.frequency.setValueAtTime(0.25, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(220, this.ctx.currentTime);
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

    // 3. Night Ambience Synthesizer (Filtered air hum & subtle pulse)
    const nightBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const nightData = nightBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      nightData[i] = (Math.random() * 2 - 1) * 0.04;
    }
    const nightSrc = this.ctx.createBufferSource();
    nightSrc.buffer = nightBuffer;
    nightSrc.loop = true;

    const nightFilter = this.ctx.createBiquadFilter();
    nightFilter.type = 'highpass';
    nightFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);

    this.weatherNightGain = this.ctx.createGain();
    this.weatherNightGain.gain.setValueAtTime(0, this.ctx.currentTime);

    nightSrc.connect(nightFilter);
    nightFilter.connect(this.weatherNightGain);
    this.weatherNightGain.connect(this.sfxGain);
    nightSrc.start();
    this.weatherNightNode = nightSrc;
  }

  // Realistic Procedural Thunder Crack & Rolling Rumble
  public playThunder(distanceRatio: number = 0.5) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const vol = Math.max(0.3, 1.2 - distanceRatio * 0.7);

    // Initial shockwave crack
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.8);
    gain.gain.setValueAtTime(vol * 0.9, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 1.2);

    // Rolling thunder diffuse noise tail (3.2 seconds)
    const bufferSize = Math.floor(this.ctx.sampleRate * 3.2);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const p = i / bufferSize;
      const envelope = Math.sin(p * Math.PI) * Math.exp(-p * 1.8);
      // Multi-wave rolling modulation
      const mod = (Math.sin(p * 28) + Math.cos(p * 14)) * 0.3 + 0.7;
      data[i] = (Math.random() * 2 - 1) * envelope * mod;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 3.2);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(vol * 1.1, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + 3.2);
  }

  // Tactical Weather Shift Radio Alert Chime
  public playWeatherShiftNotice() {
    if (!this.ctx || !this.voiceGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, t);
    osc.frequency.setValueAtTime(880, t + 0.12);
    osc.frequency.setValueAtTime(720, t + 0.24);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(gain);
    gain.connect(this.voiceGain);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  // --- TACTICAL UTILITY SOUNDS (SMOKE & MOTION SENSOR) ---
  public playSmokeDeploy() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Pin pop + canister gas burst
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
    gain.gain.setValueAtTime(0.4, t);
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
    const duration = 2.4;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const p = i / bufferSize;
      const decay = Math.exp(-p * 1.8);
      data[i] = (Math.random() * 2 - 1) * decay * 0.25;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, t);
    filter.frequency.linearRampToValueAtTime(1400, t + duration);
    filter.Q.setValueAtTime(1.8, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
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
    // High-tech device arming sequence (electronic clicks + chirp)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.setValueAtTime(1800, t + 0.08);
    osc.frequency.setValueAtTime(2400, t + 0.16);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.28);
  }

  public playSonarPing() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    // Submarine/Radar tactical sonar pulse
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, t); // High A
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.35);
    gain.gain.setValueAtTime(0.25, t);
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
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.setValueAtTime(1400, t + 0.04);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  // --- BOT PROCEDURAL PAIN & FLINCH VOCALIZATION ---
  public playBotPain(isHeavy: boolean = false) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const baseFreq = isHeavy ? 110 : 160 + (Math.random() - 0.5) * 40;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.6, t + 0.16);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, t);

    gain.gain.setValueAtTime(isHeavy ? 0.35 : 0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  // --- UI INTERFACE AUDIO ---
  public playUIClick() {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1800, t);
    gain.gain.setValueAtTime(0.15, t);
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
    osc.frequency.setValueAtTime(950, t);
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.03);
  }

  // --- PAUSE SUSPEND / RESUME ---
  public pauseAllCombatAudio() {
    this.stopHeartbeat();
    if (this.weatherRainGain) this.weatherRainGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    if (this.weatherWindGain) this.weatherWindGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    if (this.weatherNightGain) this.weatherNightGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
  }

  private createBulletCasingDrop(startT: number) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(4200, startT);
    osc.frequency.setValueAtTime(3600, startT + 0.03);
    gain.gain.setValueAtTime(0.12, startT);
    gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(startT);
    osc.stop(startT + 0.08);
  }
}

export const soundManager = new SoundEngine();
