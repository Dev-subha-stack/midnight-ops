import * as THREE from 'three';
import { BattleRoyaleState, EnvironmentState, FloatingDamageNumberItem, GameMode, GameSettings, HitmarkerEvent, KillFeedItem, LeanDirection, MapType, PlayerEliminatedInfo, PlayerStats, TacticalType, TrainingTelemetryData, WeaponCamo, WeaponType, WeatherType } from '../types';
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

  // Battle Royale Mode Systems
  public battleRoyaleState: BattleRoyaleState | null = null;
  public onBattleRoyaleUpdate?: (state: BattleRoyaleState) => void;
  private safeZoneMesh: THREE.Mesh | null = null;
  private safeZoneRingMesh: THREE.Mesh | null = null;
  private airdropGroup: THREE.Group | null = null;
  private shrinkPhaseTimeRemaining: number = 0;
  private dangerZoneMesh: THREE.Mesh | null = null;
  private dangerZoneTimer: number = 30.0;

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
  public onTacticalUpdate: (count: number, type: TacticalType) => void = () => {};
  public onMotionDetectNotice: (botIds: string[]) => void = () => {};
  public onTrainingTelemetry: (data: TrainingTelemetryData) => void = () => {};
  public onFloatingNumbersUpdate: (items: FloatingDamageNumberItem[]) => void = () => {};
  public onPlayerEliminated: (info: PlayerEliminatedInfo | null) => void = () => {};
  public onLeanUpdate?: (direction: LeanDirection, factor: number) => void;

  // Player Elimination State
  public isPlayerDead: boolean = false;
  public playerDeathTimer: number = 0;
  public eliminationInfo: PlayerEliminatedInfo | null = null;

  private lastFrameTime: number = performance.now();
  private animationFrameId: number | null = null;
  private isDestroyed: boolean = false;

  constructor(container: HTMLElement, settings: GameSettings, mode: GameMode = 'tdm') {
    this.container = container;
    this.settings = settings;
    this.gameMode = mode;

    // 1. Scene & Renderer setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(settings.fieldOfView || 85, window.innerWidth / window.innerHeight, 0.01, 500);
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
    const effectiveMapType: MapType = this.gameMode === 'battleroyale' ? (settings.mapType || 'bermuda') : (settings.mapType || 'warehouse');
    this.map = new TacticalMap(this.scene, undefined, effectiveMapType);
    this.particles = new ParticleSystem(this.scene);
    this.environment = new EnvironmentManager(
      this.scene,
      this.camera,
      this.particles,
      settings.weatherPreset || 'clear_day'
    );
    if (this.map.groundMaterial) {
      this.environment.registerMapMaterial(this.map.groundMaterial);
    }
    this.environment.setGraphicsMode(settings.graphicsMode || 'standard');

    this.streakManager = new ScorestreakManager(this.scene, this.particles);
    this.pickupManager = new PickupManager(this.scene, this.particles);
    if (effectiveMapType === 'bermuda') {
      this.pickupManager.spawnBermudaPickups();
    }

    this.grenadeManager = new GrenadeManager(this.scene, this.particles, this.map.obstacles);

    this.controller = new FPSController(this.camera, container, this.map, this.particles, this.settings);
    this.controller.gameMode = this.gameMode;
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

    // Spawn player at designated Allied base
    const playerSpawns = this.map.spawnPoints.filter(s => s.team === 'allies');
    const startSpawn = (playerSpawns.length > 0 ? playerSpawns : this.map.spawnPoints)[0];
    if (startSpawn) {
      this.controller.position.copy(startSpawn.position);
    }

    // 4. Initialize Battle Royale Safe Zone if BR Mode
    if (this.gameMode === 'battleroyale') {
      const isBermuda = this.map.mapType === 'bermuda';
      const initialRadius = isBermuda ? 108 : 46;

      this.battleRoyaleState = {
        phase: 1,
        maxPhases: 5,
        aliveCount: 50,
        totalPlayers: 50,
        circleCenter: { x: 0, z: 0 },
        circleRadius: initialRadius,
        nextCircleCenter: { x: (Math.random() - 0.5) * (isBermuda ? 28 : 12), z: (Math.random() - 0.5) * (isBermuda ? 28 : 12) },
        nextCircleRadius: isBermuda ? 72 : 28,
        shrinkTimer: 45,
        isShrinking: false,
        shrinkDuration: 30,
        zoneDamagePerSec: 4,
        isOutsideSafeZone: false,
        airdropPosition: null,
        ep: 150,
        maxEp: 200,
        vestLevel: 1,
        helmetLevel: 1,
        medkitCount: 2,
        inhalerCount: 2,
        isGliding: isBermuda,
        glideAltitude: isBermuda ? 65 : 1.7,
        dangerZone: null,
      };

      if (isBermuda) {
        // High altitude initial drop over Bermuda Island
        const dropX = (Math.random() - 0.5) * 40;
        const dropZ = (Math.random() - 0.5) * 40;
        this.controller.position.set(dropX, 65, dropZ);
        this.controller.isGrounded = false;
        this.controller.velocity.set(0, -5, 0);
        soundManager.playVoiceCallout('Dropping into Bermuda. Deploy glider to scout landing zone.');
      }

      // 3D Safe Zone Boundary Cylinder
      const safeZoneGeo = new THREE.CylinderGeometry(1, 1, 36, 64, 1, true);
      const safeZoneMat = new THREE.MeshBasicMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      this.safeZoneMesh = new THREE.Mesh(safeZoneGeo, safeZoneMat);
      this.safeZoneMesh.scale.set(initialRadius, 1, initialRadius);
      this.safeZoneMesh.position.set(0, 18, 0);
      this.scene.add(this.safeZoneMesh);

      // Safe Zone Perimeter Ground Ring
      const ringGeo = new THREE.RingGeometry(0.96, 1.04, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      });
      this.safeZoneRingMesh = new THREE.Mesh(ringGeo, ringMat);
      this.safeZoneRingMesh.rotateX(-Math.PI / 2);
      this.safeZoneRingMesh.scale.set(initialRadius, initialRadius, 1);
      this.safeZoneRingMesh.position.set(0, 0.08, 0);
      this.scene.add(this.safeZoneRingMesh);
    }

    // 5. Start Match: Spawn bots according to mode
    if (this.gameMode === 'training' || this.gameMode === 'targetrange') {
      this.botManager.spawnBots(0, settings.botDifficulty || 'regular', this.gameMode);
    } else {
      this.botManager.spawnBots(settings.botCount || 6, settings.botDifficulty || 'regular', this.gameMode);
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

    this.controller.onLeanChange = (dir, factor) => {
      this.stats.leanState = dir;
      this.stats.leanFactor = factor;
      this.onLeanUpdate?.(dir, factor);
    };

    // Bot vs Bot kills synchronization
    this.botManager.onBotKillBot = (killerTeam, killerName, victimName, weapon) => {
      if (killerTeam === 'allies') {
        this.alliesScore++;
      } else {
        this.axisScore++;
      }
      this.onScoreUpdate(this.alliesScore, this.axisScore, Math.max(0, Math.floor(this.matchTimeRemaining)));

      this.onKillfeedEvent({
        id: Math.random().toString(),
        killer: killerName,
        victim: victimName,
        weapon,
        isHeadshot: false,
        isPlayerKiller: false,
        isPlayerVictim: false,
        timestamp: Date.now(),
      });

      if (this.gameMode === 'battleroyale' && this.battleRoyaleState) {
        this.battleRoyaleState.aliveCount = Math.max(1, this.battleRoyaleState.aliveCount - 1);
        this.onBattleRoyaleUpdate?.({ ...this.battleRoyaleState });
        if (this.battleRoyaleState.aliveCount <= 1 && !this.isPlayerDead) {
          this.endMatch(true);
        }
      }
    };

    this.grenadeManager.onMotionDetect = (botIds) => {
      this.onMotionDetectNotice(botIds);
    };

    this.grenadeManager.onFlashbang = (center) => {
      this.handleFlashbangDetonation(center);
    };

    this.grenadeManager.onConcussion = (center) => {
      this.handleConcussionDetonation(center);
    };

    this.grenadeManager.onHeartbeatScan = () => {
      this.handleHeartbeatScan();
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
        if (this.battleRoyaleState && this.battleRoyaleState.vestLevel < 3) {
          this.battleRoyaleState.vestLevel = Math.min(3, this.battleRoyaleState.vestLevel + 1) as 1 | 2 | 3;
          this.onBattleRoyaleUpdate?.({ ...this.battleRoyaleState });
        }
        this.onStatsUpdate({ ...this.stats });
        this.onPickupNotice('+50 BODY ARMOR (VEST UPGRADED)', 'armor');
      } else if (type === 'inhaler') {
        if (this.battleRoyaleState) {
          this.battleRoyaleState.inhalerCount++;
          this.battleRoyaleState.ep = Math.min(this.battleRoyaleState.maxEp, this.battleRoyaleState.ep + 50);
          this.onBattleRoyaleUpdate?.({ ...this.battleRoyaleState });
        }
        soundManager.playInhaler();
        this.onPickupNotice('+1 INHALER (+50 EP)', 'stimpack');
      } else if (type === 'stimpack') {
        this.stats.health = this.stats.maxHealth;
        this.timeSinceLastDamage = 999;
        if (this.battleRoyaleState) {
          this.battleRoyaleState.medkitCount++;
          this.onBattleRoyaleUpdate?.({ ...this.battleRoyaleState });
        }
        this.onStatsUpdate({ ...this.stats });
        this.onPickupNotice('MEDKIT / STIMPACK (+1 MEDKIT, FULL HP)', 'stimpack');
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
      const gunProgression: WeaponType[] = ['m4', 'ak47', 'scar', 'mp5', 'vector', 'shotgun', 'sniper', 'deagle'];
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
    if (this.gameMode === 'battleroyale' && this.battleRoyaleState) {
      this.battleRoyaleState.aliveCount = Math.max(1, this.battleRoyaleState.aliveCount - 1);
      this.onBattleRoyaleUpdate?.({ ...this.battleRoyaleState });
      if (this.battleRoyaleState.aliveCount <= 1 && !this.isPlayerDead) {
        this.endMatch(true);
      }
    } else if (this.alliesScore >= this.scoreLimit) {
      this.endMatch(true);
    }

    this.onStatsUpdate({ ...this.stats });
  }

  public takePlayerDamage(damage: number, attackerName: string, weapon: WeaponType, botPos?: THREE.Vector3) {
    if (this.isMatchOver || this.stats.health <= 0) return;

    this.timeSinceLastDamage = 0;

    // Free Fire Vest & Helmet Damage Reduction
    if (this.gameMode === 'battleroyale' && this.battleRoyaleState) {
      const vestReduction = this.battleRoyaleState.vestLevel === 3 ? 0.40 : this.battleRoyaleState.vestLevel === 2 ? 0.55 : 0.75;
      damage *= vestReduction;
    }

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
      // Project into local camera space where player forward is (-sin(yaw), -cos(yaw)) and right is (cos(yaw), -sin(yaw))
      const fwdX = -Math.sin(this.controller.yaw);
      const fwdZ = -Math.cos(this.controller.yaw);
      const rightX = Math.cos(this.controller.yaw);
      const rightZ = -Math.sin(this.controller.yaw);

      const localForward = dx * fwdX + dz * fwdZ;
      const localRight = dx * rightX + dz * rightZ;

      // 0 rad = directly in front (12 o'clock), PI/2 = right (3 o'clock), PI = behind (6 o'clock), -PI/2 = left (9 o'clock)
      angle = Math.atan2(localRight, localForward);
    }
    this.onDamageTaken(angle);

    if (this.stats.health <= 30 && !this.isLowHealthWarning) {
      this.isLowHealthWarning = true;
      soundManager.startHeartbeat();
    }

    if (this.stats.health <= 0) {
      this.handlePlayerDeath(attackerName, weapon, botPos, damage);
    }

    this.onStatsUpdate({ ...this.stats });
  }

  private handlePlayerDeath(attackerName: string, weapon: WeaponType, botPos?: THREE.Vector3, damageDealt: number = 80) {
    this.stats.deaths++;
    this.stats.currentStreak = 0;
    this.axisScore++;

    soundManager.stopHeartbeat();
    this.isLowHealthWarning = false;

    const killerBot = this.botManager.bots.find(b => b.name === attackerName);
    const killerPos = botPos || (killerBot ? killerBot.position : new THREE.Vector3(0, 1.5, 0));
    const distMeters = Math.max(1, Math.round(killerPos.distanceTo(this.controller.position) * 10) / 10);
    const isHeadshot = weapon === 'sniper' || damageDealt >= 90;

    const feedItem: KillFeedItem = {
      id: Math.random().toString(),
      killer: attackerName,
      victim: 'YOU',
      weapon,
      isHeadshot,
      isPlayerKiller: false,
      isPlayerVictim: true,
      timestamp: Date.now(),
    };
    this.onKillfeedEvent(feedItem);

    if (this.axisScore >= this.scoreLimit) {
      this.endMatch(false);
      this.onStatsUpdate({ ...this.stats });
      return;
    }

    // Fast Tactical Respawn - No Elimination Screen
    this.isPlayerDead = true;
    this.playerDeathTimer = 0.75;
    this.controller.setDeadState(true);
    this.eliminationInfo = null;
    this.onPlayerEliminated(null);

    this.onStatsUpdate({ ...this.stats });
  }

  public respawnPlayer() {
    this.isPlayerDead = false;
    this.playerDeathTimer = 0;
    this.eliminationInfo = null;
    this.onPlayerEliminated(null);
    this.controller.setDeadState(false);
    this.stats.health = this.stats.maxHealth;
    this.stats.armor = this.stats.maxArmor;

    // Designated Team Spawn Base for Allies
    const playerSpawns = this.map.spawnPoints.filter(s => s.team === 'allies');
    const spawnList = playerSpawns.length > 0 ? playerSpawns : this.map.spawnPoints;
    const spawnPt = spawnList[Math.floor(Math.random() * spawnList.length)];
    this.controller.position.copy(spawnPt.position);
    this.controller.velocity.set(0, 0, 0);
    this.timeSinceLastDamage = 10.0;
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

  public useInhaler(): boolean {
    if (!this.battleRoyaleState || this.battleRoyaleState.inhalerCount <= 0) return false;
    this.battleRoyaleState.inhalerCount--;
    this.battleRoyaleState.ep = Math.min(this.battleRoyaleState.maxEp, this.battleRoyaleState.ep + 50);
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + 30);
    soundManager.playInhaler();
    this.onStatsUpdate({ ...this.stats });
    this.onBattleRoyaleUpdate?.({ ...this.battleRoyaleState });
    this.onPickupNotice('INHALER USED: +50 EP // +30 HP', 'stimpack');
    return true;
  }

  public useMedkit(): boolean {
    if (!this.battleRoyaleState || this.battleRoyaleState.medkitCount <= 0) return false;
    this.battleRoyaleState.medkitCount--;
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + 75);
    soundManager.playMedkit();
    this.onStatsUpdate({ ...this.stats });
    this.onBattleRoyaleUpdate?.({ ...this.battleRoyaleState });
    this.onPickupNotice('MEDKIT APPLIED: +75 HP', 'stimpack');
    return true;
  }

  public endMatch(victory: boolean) {
    this.isMatchOver = true;
    this.winner = victory ? 'allies' : 'axis';
    if (this.gameMode === 'battleroyale' && victory) {
      soundManager.playBooyah();
    } else {
      soundManager.playVoiceCallout(victory ? 'Mission accomplished, outstanding work!' : 'Defeat. Regroup and prepare for next op.');
    }
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

    // Handle elimination countdown and fast respawn
    if (this.isPlayerDead) {
      this.playerDeathTimer -= dt;
      if (this.eliminationInfo) {
        this.eliminationInfo.respawnTimeRemaining = Math.max(0, this.playerDeathTimer);
        this.onPlayerEliminated({ ...this.eliminationInfo });
      }
      if (this.playerDeathTimer <= 0) {
        this.respawnPlayer();
        return;
      }
      this.particles.update(dt);
      this.environment.update(dt, this.controller.position);
      return;
    }

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

    // Sync Tactical Mobility & Scope Telemetry to React UI State
    this.stats.tacSprintStamina = this.controller.tacSprintStamina;
    this.stats.isTacSprinting = this.controller.isTacSprinting;
    this.stats.isTacStance = this.controller.isTacStance;
    this.stats.isMantling = this.controller.isMantling;
    this.stats.breathStamina = this.controller.breathStamina;
    this.stats.isHoldingBreath = this.controller.isHoldingBreath;
    this.stats.isBreathExhausted = this.controller.isHyperventilating;
    this.stats.targetRangeMeters = this.controller.targetRangeMeters;
    this.stats.elevationHoldoverMil = this.controller.elevationHoldoverMil;
    this.stats.scopeShadowOffsetX = this.controller.scopeShadowOffsetX;
    this.stats.scopeShadowOffsetY = this.controller.scopeShadowOffsetY;

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
      this.controller.camera.position,
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

    // BATTLE ROYALE MODE LOGIC: Circle Shrinking, Zone Gas Damage, and Care Packages
    if (this.gameMode === 'battleroyale' && this.battleRoyaleState) {
      const br = this.battleRoyaleState;

      if (!br.isShrinking) {
        br.shrinkTimer -= dt;
        if (br.shrinkTimer <= 0) {
          br.isShrinking = true;
          br.shrinkStartRadius = br.circleRadius;
          br.shrinkStartCenter = { ...br.circleCenter };
          this.shrinkPhaseTimeRemaining = br.shrinkDuration;
          soundManager.playVoiceCallout('Warning: Safe zone is collapsing! Move to the safe area.');
        }
      } else {
        this.shrinkPhaseTimeRemaining -= dt;
        const progress = Math.min(1, Math.max(0, 1 - this.shrinkPhaseTimeRemaining / br.shrinkDuration));
        
        // Continuous, smooth linear interpolation of circle radius and center towards target
        const startRad = br.shrinkStartRadius !== undefined ? br.shrinkStartRadius : br.circleRadius;
        const startCenter = br.shrinkStartCenter !== undefined ? br.shrinkStartCenter : br.circleCenter;
        br.circleRadius = THREE.MathUtils.lerp(startRad, br.nextCircleRadius, progress);
        br.circleCenter.x = THREE.MathUtils.lerp(startCenter.x, br.nextCircleCenter.x, progress);
        br.circleCenter.z = THREE.MathUtils.lerp(startCenter.z, br.nextCircleCenter.z, progress);

        if (this.shrinkPhaseTimeRemaining <= 0) {
          br.isShrinking = false;
          br.circleRadius = br.nextCircleRadius;
          br.circleCenter = { ...br.nextCircleCenter };
          br.phase++;
          br.shrinkTimer = 35;
          br.zoneDamagePerSec += 3; // Later zones deal heavier damage

          // Set up next circle phase with progressive scaling
          const newTargetRad = Math.max(8, br.circleRadius * 0.62);
          const angle = Math.random() * Math.PI * 2;
          const maxOffset = Math.max(0, (br.circleRadius - newTargetRad) * 0.65);
          const offsetDist = Math.random() * maxOffset;
          br.nextCircleRadius = newTargetRad;
          br.nextCircleCenter = {
            x: br.circleCenter.x + Math.cos(angle) * offsetDist,
            z: br.circleCenter.z + Math.sin(angle) * offsetDist,
          };

          // Spawn Airdrop Care Package in new safe zone!
          this.spawnAirdropCrate(br.circleCenter.x + (Math.random() - 0.5) * 10, br.circleCenter.z + (Math.random() - 0.5) * 10);
          soundManager.playVoiceCallout('Care package incoming at designated coordinates.');
        }
      }

      // Check if Player is Outside the Safe Zone
      const distFromCircle = Math.hypot(this.controller.position.x - br.circleCenter.x, this.controller.position.z - br.circleCenter.z);
      const isOutside = distFromCircle > br.circleRadius;
      br.isOutsideSafeZone = isOutside;

      if (isOutside) {
        // Deal ticking gas damage to the player
        this.takePlayerDamage(br.zoneDamagePerSec * dt, 'THE ZONE GAS', 'm4');
      }

      // Update 3D Safe Zone Boundary Mesh & Ring
      if (this.safeZoneMesh) {
        this.safeZoneMesh.scale.set(br.circleRadius, 1, br.circleRadius);
        this.safeZoneMesh.position.set(br.circleCenter.x, 14, br.circleCenter.z);
      }
      if (this.safeZoneRingMesh) {
        this.safeZoneRingMesh.scale.set(br.circleRadius, br.circleRadius, 1);
        this.safeZoneRingMesh.position.set(br.circleCenter.x, 0.08, br.circleCenter.z);
      }

      // Check Airdrop Proximity Looting
      if (br.airdropPosition && !br.airdropPosition.isLooted) {
        const dToAirdrop = Math.hypot(this.controller.position.x - br.airdropPosition.x, this.controller.position.z - br.airdropPosition.z);
        if (dToAirdrop < 3.0) {
          br.airdropPosition.isLooted = true;
          this.stats.armor = 100;
          this.controller.equipWeapon('sniper', 'obsidian');
          this.onAccoladeEvent({
            id: Math.random().toString(),
            title: 'AIRDROP LOOTED',
            points: 250,
            subtext: 'LEVEL 3 ARMOR + AX-50 .50 CAL',
            icon: 'streak',
            timestamp: Date.now(),
          });
          soundManager.playVoiceCallout('Care package secured. Weapon upgraded.');
        }
      }

      // Free Fire EP to HP Conversion (Consumes 1 EP every ~0.35s to heal HP)
      if (br.ep > 0 && this.stats.health < this.stats.maxHealth) {
        const epConvert = Math.min(br.ep, 3.5 * dt);
        br.ep = Math.max(0, br.ep - epConvert);
        this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + epConvert);
        this.onStatsUpdate({ ...this.stats });
      }

      // Free Fire Glider & Altitude Telemetry
      br.isGliding = !this.controller.isGrounded && this.controller.position.y > 5.5;
      br.glideAltitude = Math.round(this.controller.position.y);

      // Free Fire Red Danger Zone Cycle (Every 50s)
      if (!br.dangerZone) {
        this.dangerZoneTimer -= dt;
        if (this.dangerZoneTimer <= 0) {
          const dzAngle = Math.random() * Math.PI * 2;
          const dzDist = Math.random() * Math.max(1, br.circleRadius - 20);
          const dzX = br.circleCenter.x + Math.cos(dzAngle) * dzDist;
          const dzZ = br.circleCenter.z + Math.sin(dzAngle) * dzDist;
          br.dangerZone = {
            center: { x: dzX, z: dzZ },
            radius: 22,
            duration: 18.0,
            isWarning: true,
          };
          this.dangerZoneTimer = 55.0;
          soundManager.playVoiceCallout('Warning: Danger zone declared in the sector!');
          soundManager.playDangerAirstrike();

          if (!this.dangerZoneMesh) {
            const dzGeo = new THREE.CylinderGeometry(22, 22, 24, 32, 1, true);
            const dzMat = new THREE.MeshBasicMaterial({
              color: 0xef4444,
              transparent: true,
              opacity: 0.28,
              side: THREE.DoubleSide,
              depthWrite: false,
            });
            this.dangerZoneMesh = new THREE.Mesh(dzGeo, dzMat);
            this.scene.add(this.dangerZoneMesh);
          }
          this.dangerZoneMesh.position.set(dzX, 12, dzZ);
          this.dangerZoneMesh.visible = true;
        }
      } else {
        br.dangerZone.duration -= dt;
        if (br.dangerZone.duration <= 8.0 && br.dangerZone.isWarning) {
          br.dangerZone.isWarning = false;
          soundManager.playDangerAirstrike();
        }

        if (this.dangerZoneMesh) {
          const pulse = 0.2 + 0.15 * Math.sin(Date.now() * 0.012);
          (this.dangerZoneMesh.material as THREE.MeshBasicMaterial).opacity = pulse;
        }

        // Active bombardment damage
        if (!br.dangerZone.isWarning && br.dangerZone.duration > 0) {
          const distToDz = Math.hypot(this.controller.position.x - br.dangerZone.center.x, this.controller.position.z - br.dangerZone.center.z);
          if (distToDz <= br.dangerZone.radius) {
            this.takePlayerDamage(40 * dt, 'DANGER ZONE AIRSTRIKE', 'm4');
            this.particles.emitSpark(this.controller.position.clone());
          }
        }

        if (br.dangerZone.duration <= 0) {
          br.dangerZone = null;
          if (this.dangerZoneMesh) {
            this.dangerZoneMesh.visible = false;
          }
        }
      }

      this.onBattleRoyaleUpdate?.({ ...br });
    }

    this.onScoreUpdate(this.alliesScore, this.axisScore, Math.max(0, Math.floor(this.matchTimeRemaining)));
  }

  private spawnAirdropCrate(x: number, z: number) {
    if (this.airdropGroup) {
      this.scene.remove(this.airdropGroup);
    }
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Crate Body
    const crateGeo = new THREE.BoxGeometry(1.6, 1.2, 1.6);
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0x15803d, // Military olive green
      roughness: 0.6,
      metalness: 0.4,
    });
    const crate = new THREE.Mesh(crateGeo, crateMat);
    crate.position.y = 0.6;
    group.add(crate);

    // Yellow Caution Edge Trim
    const trimGeo = new THREE.BoxGeometry(1.64, 0.2, 1.64);
    const trimMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.y = 0.6;
    group.add(trim);

    // Green Beacon Smoke Flare
    const flareGeo = new THREE.CylinderGeometry(0.1, 0.4, 4, 8);
    const flareMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.4,
    });
    const flare = new THREE.Mesh(flareGeo, flareMat);
    flare.position.y = 3.2;
    group.add(flare);

    this.scene.add(group);
    this.airdropGroup = group;

    if (this.battleRoyaleState) {
      this.battleRoyaleState.airdropPosition = {
        x,
        y: 0,
        z,
        isLooted: false,
      };
    }
  }

  public setWeatherPreset(preset: WeatherType) {
    this.environment.setWeather(preset);
  }

  public updateSettings(newSettings: Partial<GameSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    if (this.controller) {
      this.controller.settings = this.settings;
    }
    if (newSettings.fieldOfView && this.camera) {
      this.camera.fov = newSettings.fieldOfView;
      this.camera.updateProjectionMatrix();
    }
    if (newSettings.graphicsMode || newSettings.graphicsQuality) {
      const mode = newSettings.graphicsMode || (newSettings.graphicsQuality === 'ultra' ? 'extreme' : newSettings.graphicsQuality === 'medium' ? 'smooth' : 'standard');
      this.environment.setGraphicsMode(mode);

      if (mode === 'smooth') {
        this.renderer.setPixelRatio(1);
        this.renderer.shadowMap.enabled = false;
        this.renderer.toneMapping = THREE.LinearToneMapping;
        this.renderer.toneMappingExposure = 1.0;
      } else if (mode === 'extreme') {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;
      } else {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
      }
      this.renderer.shadowMap.needsUpdate = true;
    }
    if (newSettings.weatherPreset) {
      this.setWeatherPreset(newSettings.weatherPreset);
    }
  }

  public toggleWeatherPreset(): WeatherType {
    return this.environment.toggleNextWeather();
  }

  private handleFlashbangDetonation(center: THREE.Vector3) {
    // 1. Stun / blind enemy bots in 24m blast radius
    this.botManager.blindBotsInRange(center, 24.0, 4.5);

    // 2. Player flash proximity & line-of-sight check
    const playerEye = this.camera.position.clone();
    const distToFlash = playerEye.distanceTo(center);
    if (distToFlash < 26.0) {
      const toFlash = center.clone().sub(playerEye).normalize();
      const lookDir = this.camera.getWorldDirection(new THREE.Vector3());
      const dot = lookDir.dot(toFlash);

      let intensity = 0;
      if (dot > 0.15) {
        // Direct gaze towards flashbang detonation
        intensity = Math.max(0.4, 1.0 - (distToFlash / 26.0) * 0.7);
        soundManager.playTinnitus(3.5 * intensity);
      } else {
        // Peripheral / facing away
        intensity = Math.max(0.2, 0.5 - (distToFlash / 30.0) * 0.4);
        soundManager.playTinnitus(1.5 * intensity);
      }
      this.controller.triggerFlashWhiteout(intensity);
    }
  }

  private handleConcussionDetonation(center: THREE.Vector3) {
    // 1. Stun enemy bots in 20m blast radius
    this.botManager.concussBotsInRange(center, 20.0, 4.0);

    // 2. Check player concussion proximity
    const distToConcussion = this.camera.position.distanceTo(center);
    if (distToConcussion < 18.0) {
      const intensity = Math.max(0.25, 1.0 - distToConcussion / 18.0);
      this.controller.triggerConcussion(intensity);
      soundManager.playTinnitus(2.0 * intensity);
    }
  }

  private handleHeartbeatScan() {
    const playerPos = this.camera.position.clone();
    const forward = this.camera.getWorldDirection(new THREE.Vector3());
    let nearestDist = 999;
    const detected: { id: string; distance: number; angleOffset: number }[] = [];

    this.botManager.bots.forEach(bot => {
      if (bot.isDead || bot.team === 'allies') return;
      const toBot = bot.position.clone().sub(playerPos);
      const dist = toBot.length();
      if (dist <= 50.0) {
        toBot.normalize();
        const dot = forward.dot(toBot);
        if (dot > 0.25) { // ~75 degree forward cone
          nearestDist = Math.min(nearestDist, dist);
          detected.push({
            id: bot.id,
            distance: Math.round(dist),
            angleOffset: Math.atan2(toBot.x, toBot.z),
          });
        }
      }
    });

    this.controller.triggerHeartbeatScan(detected);
    if (detected.length > 0) {
      soundManager.playHeartbeatSensorBeep(nearestDist);
      this.onPickupNotice(`HEARTBEAT SCAN: ${detected.length} CONTACTS DETECTED`, 'tactical');
    } else {
      this.onPickupNotice('HEARTBEAT SCAN: NO HOSTILES IN FORWARD CONE', 'tactical');
    }
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
