import * as THREE from 'three';
import { EnvironmentState, FloatingDamageNumberItem, GameMode, GameSettings, HitmarkerEvent, KillFeedItem, PlayerStats, TrainingTelemetryData, WeaponCamo, WeaponType, WeatherType } from '../types';
import { TacticalMap } from './map';
import { ParticleSystem } from './particles';
import { BotManager } from './ai';
import { FPSController } from './controller';
import { ScorestreakManager } from './streaks';
import { PickupManager } from './pickups';
import { GrenadeManager } from './grenades';
import { EnvironmentManager } from './environment';
import { TrainingManager } from './training';
import { soundManager } from './audio';
import { WEAPON_REGISTRY } from './weapons';

export class GameEngine {
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  public map: TacticalMap;
  public particles: ParticleSystem;
  public environment: EnvironmentManager;
  public botManager: BotManager;
  public controller: FPSController;
  public streakManager: ScorestreakManager;
  public pickupManager: PickupManager;
  public grenadeManager: GrenadeManager;
  public trainingManager: TrainingManager | null = null;

  public settings: GameSettings;
  public gameMode: GameMode = 'tdm';

  // Pause & Match State
  public isPaused: boolean = false;
  public matchTimeRemaining: number = 600; // 10 minutes
  public isMatchOver: boolean = false;
  public winner: 'allies' | 'axis' | 'player' | null = null;
  public alliesScore: number = 0;
  public axisScore: number = 0;
  public scoreLimit: number = 50;

  // Player Stats
  public stats: PlayerStats = {
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
  };

  private healthRegenDelay: number = 4.0;
  private timeSinceLastDamage: number = 10.0;
  private isLowHealthWarning: boolean = false;

  // React State Callbacks
  public onStatsUpdate: (stats: PlayerStats) => void = () => {};
  public onKillfeedEvent: (item: KillFeedItem) => void = () => {};
  public onHitmarkerEvent: (event: HitmarkerEvent) => void = () => {};
  public onAccoladeEvent: (accolade: { id: string; title: string; points: number; subtext?: string; icon?: 'kill' | 'headshot' | 'streak' | 'revenge' | 'longshot' | 'one_shot'; timestamp: number }) => void = () => {};
  public onMatchEnd: (victory: boolean, stats: PlayerStats) => void = () => {};
  public onScoreUpdate: (allies: number, axis: number, time: number) => void = () => {};
  public onStreakUpdate: (streaks: ScorestreakManager['streaks']) => void = () => {};
  public onDamageTaken: (angle: number) => void = () => {};
  public onPickupNotice: (text: string, type: 'ammo' | 'armor' | 'stimpack' | 'tactical') => void = () => {};
  public onEnvironmentUpdate: (state: EnvironmentState) => void = () => {};
  public onTacticalUpdate: (count: number, type: 'smoke' | 'motion_sensor') => void = () => {};
  public onMotionDetectNotice: (botIds: string[]) => void = () => {};
  public onTrainingTelemetry: (data: TrainingTelemetryData) => void = () => {};
  public onFloatingNumbersUpdate: (items: FloatingDamageNumberItem[]) => void = () => {};

  private lastFrameTime: number = performance.now();
  private animationFrameId: number | null = null;
  private isDestroyed: boolean = false;

  constructor(container: HTMLElement, settings: GameSettings, mode: GameMode = 'tdm') {
    this.container = container;
    this.settings = settings;
    this.gameMode = mode;

    // 1. Scene & Renderer setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(settings.fieldOfView || 85, window.innerWidth / window.innerHeight, 0.05, 500);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    container.appendChild(this.renderer.domElement);

    // 2. Sub-systems
    this.map = new TacticalMap(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.environment = new EnvironmentManager(
      this.scene,
      this.camera,
      this.particles,
      settings.weatherPreset || 'dynamic_cycle'
    );
    if (this.map.groundMaterial) {
      this.environment.registerMapMaterial(this.map.groundMaterial);
    }

    this.streakManager = new ScorestreakManager(this.scene, this.particles);
    this.pickupManager = new PickupManager(this.scene, this.particles);
    this.grenadeManager = new GrenadeManager(this.scene, this.particles, this.map.obstacles);

    this.controller = new FPSController(this.camera, container, this.map, this.particles, this.settings);
    this.botManager = new BotManager(this.scene, this.map, this.particles);
    this.controller.botManager = this.botManager;
    this.controller.grenadeManager = this.grenadeManager;

    // Initialize Training Range if Training Mode or Target Range
    if (this.gameMode === 'training' || this.gameMode === 'targetrange') {
      this.trainingManager = new TrainingManager(this.scene, this.particles);
      this.controller.trainingManager = this.trainingManager;
      this.trainingManager.onTelemetryUpdate = (telemetry) => {
        this.onTrainingTelemetry(telemetry);
      };
      this.trainingManager.onTargetHitNotice = (msg) => {
        this.onPickupNotice(msg, 'ammo');
      };
      this.matchTimeRemaining = 999999; // Infinite practice timer
    }

    // 3. Connect Callbacks & Handlers
    this.setupEvents();

    // 4. Start Match: If in training mode, spawn ZERO enemies!
    if (this.gameMode === 'training' || this.gameMode === 'targetrange') {
      this.botManager.spawnBots(0, settings.botDifficulty || 'regular');
    } else {
      this.botManager.spawnBots(settings.botCount || 6, settings.botDifficulty || 'regular');
    }

    window.addEventListener('resize', this.onResize);
    this.startLoop();
  }

  private setupEvents() {
    this.environment.onEnvironmentChange = (envState) => {
      this.onEnvironmentUpdate(envState);
    };

    this.controller.onTriggerWeatherToggle = () => {
      const nextW = this.environment.toggleNextWeather();
      this.onPickupNotice(`WEATHER SHIFT // ${nextW.toUpperCase().replace('_', ' ')}`, 'ammo');
    };

    this.controller.onHitmarker = (e) => {
      this.stats.shotsHit++;
      this.onHitmarkerEvent(e);
    };

    this.controller.onKill = (victim, weapon, isHeadshot) => {
      this.handlePlayerKill(victim, weapon as WeaponType, isHeadshot);
    };

    this.controller.onTacticalChange = (count, type) => {
      this.onTacticalUpdate(count, type);
    };

    this.grenadeManager.onMotionDetect = (botIds) => {
      this.onMotionDetectNotice(botIds);
    };

    // Pickups Handler
    this.pickupManager.onPickup = (type, value) => {
      if (type === 'ammo') {
        const curWpn = this.controller.currentWeapon;
        this.controller.ammoReserve[curWpn] = Math.min(200, this.controller.ammoReserve[curWpn] + (value || 60));
        this.controller.grenadesCount = Math.min(4, this.controller.grenadesCount + 1);
        this.grenadeManager.addGrenade(1);
        this.grenadeManager.addTactical(1);
        this.controller.onAmmoChange(this.controller.ammoInMag[curWpn], this.controller.ammoReserve[curWpn]);
        this.controller.onGrenadeChange(this.controller.grenadesCount);
        this.onTacticalUpdate(this.grenadeManager.getTacticalCount(), this.grenadeManager.getTacticalType());
        this.onPickupNotice('+60 AMMO, +1 FRAG, +1 TACTICAL', 'ammo');
      } else if (type === 'armor') {
        this.stats.armor = Math.min(this.stats.maxArmor, this.stats.armor + (value || 50));
        this.onStatsUpdate({ ...this.stats });
        this.onPickupNotice('+50 BODY ARMOR', 'armor');
      } else if (type === 'stimpack') {
        this.stats.health = this.stats.maxHealth;
        this.timeSinceLastDamage = 999;
        this.onStatsUpdate({ ...this.stats });
        this.onPickupNotice('TACTICAL STIMPACK INJECTED (FULL HEALTH)', 'stimpack');
      }
    };

    // Grenade Explosion Handler
    this.grenadeManager.onExplode = (center, radius, maxDamage) => {
      // 1. Damage Bots
      for (const bot of this.botManager.bots) {
        if (bot.isDead) continue;
        const dist = bot.position.distanceTo(center);
        if (dist < radius) {
          const falloff = 1 - (dist / radius);
          const dmg = Math.floor(maxDamage * falloff);
          const isKill = bot.takeDamage(dmg, false, new THREE.Vector3().subVectors(bot.position, center).normalize());
          this.controller.onHitmarker({ type: isKill ? 'kill' : 'body', timestamp: Date.now() });
          if (isKill) {
            this.handlePlayerKill(bot.name, 'm4', false);
          }
        }
      }

      // 2. Damage Destructible Props
      for (const prop of this.map.destruction.props) {
        if (prop.isDestroyed) continue;
        const dist = prop.mesh.position.distanceTo(center);
        if (dist < radius * 1.2) {
          const dmg = Math.floor(maxDamage * (1 - dist / (radius * 1.2)));
          this.map.destruction.damageProp(prop.id, dmg);
        }
      }

      // 3. Damage Player if caught in blast
      const playerDist = this.controller.position.distanceTo(center);
      if (playerDist < radius) {
        const falloff = 1 - (playerDist / radius);
        const playerDmg = Math.floor(maxDamage * 0.7 * falloff);
        this.takePlayerDamage(playerDmg, 'Grenade Blast', 'm4');
      }
    };
  }

  private handlePlayerKill(victim: string, weapon: WeaponType, isHeadshot: boolean) {
    this.stats.kills++;
    if (isHeadshot) this.stats.headshots++;
    this.stats.currentStreak++;
    if (this.stats.currentStreak > this.stats.highestStreak) {
      this.stats.highestStreak = this.stats.currentStreak;
    }

    const points = (isHeadshot ? 150 : 100) + this.stats.currentStreak * 10;
    this.stats.score += points;
    this.alliesScore++;

    // Fire COD Elimination Accolade
    this.onAccoladeEvent({
      id: Math.random().toString(),
      title: isHeadshot ? 'HEADSHOT' : 'ENEMY ELIMINATED',
      points,
      subtext: isHeadshot ? `+${points} XP • ONE SHOT` : `+${points} XP`,
      icon: isHeadshot ? 'headshot' : weapon === 'sniper' ? 'one_shot' : 'kill',
      timestamp: Date.now(),
    });

    // Fire Streak Accolade if milestone reached
    if (this.stats.currentStreak === 3) {
      this.onAccoladeEvent({
        id: Math.random().toString(),
        title: 'UAV RECON READY',
        points: 50,
        subtext: 'PRESS [6] TO DEPLOY',
        icon: 'streak',
        timestamp: Date.now() + 200,
      });
    } else if (this.stats.currentStreak === 5) {
      this.onAccoladeEvent({
        id: Math.random().toString(),
        title: 'AIRSTRIKE READY',
        points: 75,
        subtext: 'PRESS [7] TO CALL IN',
        icon: 'streak',
        timestamp: Date.now() + 200,
      });
    } else if (this.stats.currentStreak === 7) {
      this.onAccoladeEvent({
        id: Math.random().toString(),
        title: 'SENTRY TURRET READY',
        points: 100,
        subtext: 'PRESS [8] TO DEPLOY',
        icon: 'streak',
        timestamp: Date.now() + 200,
      });
    }

    // Update killfeed
    const feedItem: KillFeedItem = {
      id: Math.random().toString(),
      killer: 'YOU',
      victim,
      weapon,
      isHeadshot,
      isPlayerKiller: true,
      isPlayerVictim: false,
      timestamp: Date.now(),
    };
    this.onKillfeedEvent(feedItem);

    // Update scorestreaks
    this.streakManager.updateStreakProgress(this.stats.currentStreak);
    this.onStreakUpdate(this.streakManager.streaks);

    // Gun Game mode progression
    if (this.gameMode === 'gungame') {
      const gunProgression: WeaponType[] = ['m4', 'mp5', 'shotgun', 'sniper', 'deagle'];
      const nextIdx = (gunProgression.indexOf(this.controller.currentWeapon) + 1);
      if (nextIdx < gunProgression.length) {
        this.controller.equipWeapon(gunProgression[nextIdx]);
        soundManager.playVoiceCallout(`Weapon upgraded to ${WEAPON_REGISTRY[gunProgression[nextIdx]].name}`);
      } else {
        // Won Gun Game!
        this.endMatch(true);
      }
    }

    // Check Win Condition
    if (this.alliesScore >= this.scoreLimit) {
      this.endMatch(true);
    }

    this.onStatsUpdate({ ...this.stats });
  }

  public takePlayerDamage(damage: number, attackerName: string, weapon: WeaponType, botPos?: THREE.Vector3) {
    if (this.isMatchOver || this.stats.health <= 0) return;

    this.timeSinceLastDamage = 0;

    // Armor absorption
    if (this.stats.armor > 0) {
      const armorDmg = Math.min(this.stats.armor, damage * 0.7);
      this.stats.armor -= armorDmg;
      damage -= armorDmg * 0.5;
    }

    this.stats.health = Math.max(0, this.stats.health - damage);

    // Audio & Red Vignette / Directional Indicator
    soundManager.playHitmarker(false, false, true);

    let angle = Math.random() * Math.PI * 2;
    if (botPos) {
      const dx = botPos.x - this.controller.position.x;
      const dz = botPos.z - this.controller.position.z;
      const worldAngle = Math.atan2(dx, dz);
      angle = (worldAngle - this.controller.yaw + Math.PI * 2) % (Math.PI * 2);
    }
    this.onDamageTaken(angle);

    if (this.stats.health <= 30 && !this.isLowHealthWarning) {
      this.isLowHealthWarning = true;
      soundManager.startHeartbeat();
    }

    if (this.stats.health <= 0) {
      this.handlePlayerDeath(attackerName, weapon);
    }

    this.onStatsUpdate({ ...this.stats });
  }

  private handlePlayerDeath(attackerName: string, weapon: WeaponType) {
    this.stats.deaths++;
    this.stats.currentStreak = 0;
    this.axisScore++;

    soundManager.stopHeartbeat();
    this.isLowHealthWarning = false;

    const feedItem: KillFeedItem = {
      id: Math.random().toString(),
      killer: attackerName,
      victim: 'YOU',
      weapon,
      isHeadshot: false,
      isPlayerKiller: false,
      isPlayerVictim: true,
      timestamp: Date.now(),
    };
    this.onKillfeedEvent(feedItem);

    // Respawn after delay
    setTimeout(() => {
      if (!this.isMatchOver) {
        this.respawnPlayer();
      }
    }, 3000);

    if (this.axisScore >= this.scoreLimit) {
      this.endMatch(false);
    }

    this.onStatsUpdate({ ...this.stats });
  }

  public respawnPlayer() {
    this.stats.health = this.stats.maxHealth;
    this.stats.armor = this.stats.maxArmor;
    const spawnPt = this.map.spawnPoints[Math.floor(Math.random() * 3)];
    this.controller.position.copy(spawnPt.position);
    this.controller.velocity.set(0, 0, 0);
    this.onStatsUpdate({ ...this.stats });
  }

  public activateScorestreak(id: 'uav' | 'airstrike' | 'sentry' | 'nuke') {
    const success = this.streakManager.activateStreak(id, this.controller.position, undefined, (strikeImpact) => {
      // Eliminate bots caught in blast radius
      this.botManager.bots.forEach(bot => {
        if (!bot.isDead && bot.position.distanceTo(strikeImpact) < 14) {
          bot.takeDamage(500, false, new THREE.Vector3(0, 1, 0));
          this.handlePlayerKill(bot.name, 'm4', false);
        }
      });
    });

    if (success && id === 'nuke') {
      setTimeout(() => this.endMatch(true), 3500);
    }

    this.onStreakUpdate(this.streakManager.streaks);
  }

  public changeWeaponCamo(camo: WeaponCamo) {
    this.controller.equipWeapon(this.controller.currentWeapon, camo);
  }

  public endMatch(victory: boolean) {
    this.isMatchOver = true;
    this.winner = victory ? 'allies' : 'axis';
    soundManager.playVoiceCallout(victory ? 'Mission accomplished, outstanding work!' : 'Defeat. Regroup and prepare for next op.');
    this.onMatchEnd(victory, this.stats);
  }

  private onResize = () => {
    if (!this.container || this.isDestroyed) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private startLoop() {
    const loop = (now: number) => {
      if (this.isDestroyed) return;
      const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000);
      this.lastFrameTime = now;

      this.update(dt);
      this.render();

      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      soundManager.pauseAllCombatAudio();
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    } else {
      this.lastFrameTime = performance.now();
      // Resume background weather audio if appropriate
      if (this.environment) {
        this.environment.resumeAudio();
      }
    }
  }

  private update(dt: number) {
    // CRITICAL: When paused or match is over, FREEZE all game simulation and combat physics!
    if (this.isPaused || this.isMatchOver) return;

    // Match countdown timer
    this.matchTimeRemaining -= dt;
    if (this.matchTimeRemaining <= 0) {
      this.endMatch(this.alliesScore >= this.axisScore);
      return;
    }

    // Health Regeneration (COD style delay)
    this.timeSinceLastDamage += dt;
    if (this.timeSinceLastDamage > this.healthRegenDelay && this.stats.health < this.stats.maxHealth) {
      this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + 25 * dt);
      if (this.stats.health > 30 && this.isLowHealthWarning) {
        this.isLowHealthWarning = false;
        soundManager.stopHeartbeat();
      }
      this.onStatsUpdate({ ...this.stats });
    }

    // Sync active smoke clouds with AI perception system
    this.botManager.setSmokeClouds(this.grenadeManager.smokeClouds);

    // Sub-system frame updates
    this.controller.update(dt);
    this.particles.update(dt);
    this.environment.update(dt, this.controller.position);
    this.map.destruction.update(dt);
    this.streakManager.update(dt);
    this.pickupManager.update(dt, this.controller.position);

    // Update Tactical Equipment (Frags, Smokes, Motion Sensors)
    const botSummaries = this.botManager.bots.map(b => ({ id: b.id, position: b.position, isDead: b.isDead }));
    this.grenadeManager.update(dt, this.map.obstacles, botSummaries, (pos, radius, maxDamage) => {
      // Grenade explosion callback
      this.trainingManager?.processExplosion(pos, radius, maxDamage);
      this.botManager.bots.forEach(bot => {
        if (!bot.isDead && bot.position.distanceTo(pos) < radius) {
          const dmg = Math.floor(maxDamage * (1 - bot.position.distanceTo(pos) / radius));
          const isKill = bot.takeDamage(dmg, false, new THREE.Vector3().subVectors(bot.position, pos).normalize());
          this.controller.onHitmarker({ type: isKill ? 'kill' : 'body', timestamp: Date.now() });
          if (isKill) {
            this.handlePlayerKill(bot.name, 'm4', false);
          }
        }
      });
    });

    if (this.trainingManager) {
      this.trainingManager.update(dt);
      const mappedNumbers: FloatingDamageNumberItem[] = this.trainingManager.floatingNumbers.map(fn => ({
        id: fn.id,
        damage: fn.damage,
        isHeadshot: fn.isHeadshot,
        position: { x: fn.position.x, y: fn.position.y, z: fn.position.z },
        life: fn.life,
        maxLife: fn.maxLife,
        hitZone: fn.hitZone,
      }));
      this.onFloatingNumbersUpdate(mappedNumbers);
    }

    const uavStreak = this.streakManager.streaks.find(s => s.id === 'uav');
    const isUavActive = uavStreak ? !uavStreak.ready && this.streakManager['activeStreaks']?.has('uav') : false;

    this.botManager.update(
      dt,
      this.controller.position,
      this.stats.health,
      (dmg, botName, wpn, botPos) => {
        this.takePlayerDamage(dmg, botName, wpn, botPos);
      },
      this.controller.isSprinting,
      this.controller.isSliding,
      this.environment.currentWeather,
      this.controller.laserActive,
      this.controller.isCrouching,
      isUavActive
    );

    this.onScoreUpdate(this.alliesScore, this.axisScore, Math.max(0, Math.floor(this.matchTimeRemaining)));
  }

  public setWeatherPreset(preset: WeatherType) {
    this.environment.setWeather(preset);
  }

  public toggleWeatherPreset(): WeatherType {
    return this.environment.toggleNextWeather();
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.environment.destroy();
    soundManager.stopHeartbeat();
    window.removeEventListener('resize', this.onResize);
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
