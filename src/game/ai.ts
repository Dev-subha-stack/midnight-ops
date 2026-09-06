import * as THREE from 'three';
import { AIAlertLevel, AIArchetype, EnemyBot, WeaponType } from '../types';
import { ModelFactory } from './models';
import { TacticalCoverPoint, TacticalMap } from './map';
import { ParticleSystem } from './particles';
import { soundManager } from './audio';
import { WEAPON_REGISTRY } from './weapons';
import { CollisionSystem } from './collision';

export class BotManager {
  public scene: THREE.Scene;
  public map: TacticalMap;
  public particles: ParticleSystem;
  public bots: BotController[] = [];
  public smokeClouds: { position: THREE.Vector3; radius: number; duration: number }[] = [];

  // Squad Shared Intelligence
  public squadAlertLevel: AIAlertLevel = 'unalerted';
  public lastKnownPlayerPos: THREE.Vector3 | null = null;
  public timeSincePlayerSpotted: number = 999;
  private attackTokens: number = 2; // Maximum concurrent shooters to prevent overwhelming the player

  constructor(scene: THREE.Scene, map: TacticalMap, particles: ParticleSystem) {
    this.scene = scene;
    this.map = map;
    this.particles = particles;
  }

  public setSmokeClouds(clouds: { position: THREE.Vector3; radius: number; duration: number }[]) {
    this.smokeClouds = clouds;
  }

  public spawnBots(count: number, difficulty: 'recruit' | 'regular' | 'hardened' | 'veteran' = 'regular') {
    // Clear existing
    this.bots.forEach(b => b.destroy());
    this.bots = [];

    const botRoster = [
      { name: 'Ghost_Riley', archetype: 'flanker' as AIArchetype, weapon: 'mp5' as WeaponType },
      { name: 'Soap_MacTavish', archetype: 'assault' as AIArchetype, weapon: 'm4' as WeaponType },
      { name: 'Price_Bravo6', archetype: 'heavy' as AIArchetype, weapon: 'shotgun' as WeaponType },
      { name: 'Grinch_Scout', archetype: 'sniper' as AIArchetype, weapon: 'sniper' as WeaponType },
      { name: 'Roach_01', archetype: 'assault' as AIArchetype, weapon: 'm4' as WeaponType },
      { name: 'Kruger_SpecOps', archetype: 'flanker' as AIArchetype, weapon: 'deagle' as WeaponType },
      { name: 'Minotaur_Enforcer', archetype: 'heavy' as AIArchetype, weapon: 'm4' as WeaponType },
      { name: 'Bale_Vanguard', archetype: 'assault' as AIArchetype, weapon: 'mp5' as WeaponType },
    ];

    for (let i = 0; i < count; i++) {
      const rosterItem = botRoster[i % botRoster.length];
      const spawnPt = this.map.spawnPoints[(i + 3) % this.map.spawnPoints.length];
      const team = 'axis';

      const bot = new BotController(
        `bot_${i}`,
        rosterItem.name + (i >= botRoster.length ? `_${i}` : ''),
        team,
        rosterItem.archetype,
        rosterItem.weapon,
        spawnPt.position.clone(),
        difficulty,
        this.scene,
        this.map,
        this.particles,
        this
      );

      this.bots.push(bot);
    }
  }

  // --- SOUND STIMULI NOTIFICATION ---
  public notifySound(pos: THREE.Vector3, radius: number, isGunfire: boolean = true) {
    this.bots.forEach(bot => {
      if (bot.isDead) return;
      const dist = bot.position.distanceTo(pos);
      if (dist <= radius) {
        bot.onHearSound(pos, isGunfire);
      }
    });
  }

  // --- SQUAD INTEL SHARING ---
  public reportPlayerSpotted(playerPos: THREE.Vector3, spotter: BotController) {
    this.lastKnownPlayerPos = playerPos.clone();
    this.timeSincePlayerSpotted = 0;
    this.squadAlertLevel = 'combat';

    // Alert nearby squad members who are unalerted
    this.bots.forEach(b => {
      if (b !== spotter && !b.isDead && b.alertLevel !== 'combat') {
        const dist = b.position.distanceTo(spotter.position);
        if (dist < 32) {
          b.alertToPosition(playerPos);
        }
      }
    });
  }

  public requestAttackToken(): boolean {
    if (this.attackTokens > 0) {
      this.attackTokens--;
      return true;
    }
    return false;
  }

  public releaseAttackToken() {
    this.attackTokens = Math.min(2, this.attackTokens + 1);
  }

  public uavActive: boolean = false;

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    playerHealth: number,
    onPlayerDamage: (dmg: number, botName: string, weapon: WeaponType, botPos: THREE.Vector3) => void,
    isPlayerSprinting: boolean = false,
    isPlayerSliding: boolean = false,
    weatherPreset: string = 'clear_day',
    playerFlashlightActive: boolean = false,
    playerIsCrouching: boolean = false,
    uavActive: boolean = false
  ) {
    this.uavActive = uavActive;
    this.timeSincePlayerSpotted += dt;
    if (this.timeSincePlayerSpotted > 8.0 && this.squadAlertLevel === 'combat') {
      this.squadAlertLevel = 'investigating';
    }

    // Refresh attack tokens per frame (allow 1 to 2 concurrent attackers depending on difficulty)
    this.attackTokens = 2;

    this.bots.forEach(bot => {
      bot.update(
        dt,
        playerPos,
        playerHealth,
        onPlayerDamage,
        this.bots,
        isPlayerSprinting,
        isPlayerSliding,
        weatherPreset,
        playerFlashlightActive,
        playerIsCrouching,
        uavActive
      );
    });
  }

  public getBotData(): EnemyBot[] {
    return this.bots.map(b => b.getData());
  }
}

export class BotController {
  public id: string;
  public name: string;
  public team: 'allies' | 'axis';
  public archetype: AIArchetype;
  public weapon: WeaponType;
  public health: number = 100;
  public maxHealth: number = 100;
  public armor: number = 0;
  public maxArmor: number = 0;
  public isDead: boolean = false;
  public kills: number = 0;
  public deaths: number = 0;

  public group: THREE.Group;
  public headMesh: THREE.Object3D | null = null;
  public torsoMesh: THREE.Object3D | null = null;
  public leftArmMesh: THREE.Object3D | null = null;
  public rightArmMesh: THREE.Object3D | null = null;
  public leftLegMesh: THREE.Object3D | null = null;
  public rightLegMesh: THREE.Object3D | null = null;
  public botWeaponMesh: THREE.Object3D | null = null;
  public sniperLaserMesh: THREE.Line | null = null;

  // Procedural Weapon Recoil & Physical Reactions
  public weaponRecoilKick: number = 0;
  public deathTimer: number = 0;
  public deathProgress: number = 0;
  public deathDirection: THREE.Vector3 = new THREE.Vector3();

  // Procedural Hit Flinch & Physical Reactions
  public flinchPitch: number = 0;
  public flinchYaw: number = 0;
  public flinchRoll: number = 0;
  public headFlinchPitch: number = 0;
  public headFlinchYaw: number = 0;
  public flinchLegBuckle: number = 0;
  public flinchArmDisrupt: number = 0;
  public flinchDisplacement: THREE.Vector3 = new THREE.Vector3();
  public flinchVelocity: THREE.Vector3 = new THREE.Vector3();
  public aimDisruptionTimer: number = 0;

  // Procedural Multi-Joint Ragdoll Physics Simulation
  public isRagdollActive: boolean = false;
  public ragdollVelocity: THREE.Vector3 = new THREE.Vector3();
  public ragdollAngularVel: THREE.Vector3 = new THREE.Vector3();
  public ragdollTorsoPitch: number = 0;
  public ragdollTorsoRoll: number = 0;
  public isWeaponDropped: boolean = false;
  public droppedWeaponPos: THREE.Vector3 = new THREE.Vector3();
  public droppedWeaponVel: THREE.Vector3 = new THREE.Vector3();
  public droppedWeaponRot: THREE.Vector3 = new THREE.Vector3();
  public droppedWeaponRotVel: THREE.Vector3 = new THREE.Vector3();

  public position: THREE.Vector3;
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public targetPos: THREE.Vector3 | null = null;
  public state: 'patrol' | 'chase' | 'attack' | 'cover' | 'flank' | 'dead' = 'patrol';
  public alertLevel: AIAlertLevel = 'unalerted';

  // --- TACTICAL BURST & RELOAD MECHANICS ---
  public magAmmo: number = 30;
  public magCapacity: number = 30;
  public isReloading: boolean = false;
  public reloadTimer: number = 0;
  public reloadTotalTime: number = 2.4;

  public burstShotsRemaining: number = 0;
  public burstPauseTimer: number = 0;
  public targetAcquisitionTimer: number = 0; // Human-like reaction delay before opening fire

  public lastShotTime: number = 0;
  public lastDamagedTime: number = 0;
  public isVisibleToPlayer: boolean = false;
  private lastUavActive: boolean = false;

  private scene: THREE.Scene;
  private map: TacticalMap;
  private particles: ParticleSystem;
  private squad: BotManager;

  private currentCover: TacticalCoverPoint | null = null;
  private coverTimer: number = 0;
  private isPeeking: boolean = false;
  private peekTimer: number = 0;

  private flankPath: THREE.Vector3[] = [];
  private flankIndex: number = 0;

  private fireTimer: number = 0;
  private stateTimer: number = 0;
  private animTimer: number = 0;
  private respawnTimer: number = 0;
  private strafeTimer: number = 0;
  private strafeDir: number = 1;
  private footstepTimer: number = 0;
  private difficulty: string;
  private accuracy: number;
  private reactionTime: number;
  private speed: number = 3.6;

  constructor(
    id: string,
    name: string,
    team: 'allies' | 'axis',
    archetype: AIArchetype,
    weapon: WeaponType,
    spawnPos: THREE.Vector3,
    difficulty: string,
    scene: THREE.Scene,
    map: TacticalMap,
    particles: ParticleSystem,
    squad: BotManager
  ) {
    this.id = id;
    this.name = name;
    this.team = team;
    this.archetype = archetype;
    this.weapon = weapon;
    this.position = new THREE.Vector3(spawnPos.x, 0, spawnPos.z);
    this.difficulty = difficulty;
    this.scene = scene;
    this.map = map;
    this.particles = particles;
    this.squad = squad;

    const wpnCfg = WEAPON_REGISTRY[weapon];
    this.magCapacity = wpnCfg.magSize;
    this.magAmmo = this.magCapacity;
    this.reloadTotalTime = wpnCfg.reloadTimeSec;

    // Base stats per archetype
    if (archetype === 'heavy') {
      this.health = 130;
      this.maxHealth = 130;
      this.armor = 50;
      this.maxArmor = 50;
      this.speed = 3.0;
    } else if (archetype === 'flanker') {
      this.health = 85;
      this.maxHealth = 85;
      this.speed = 4.2;
    } else if (archetype === 'sniper') {
      this.health = 90;
      this.maxHealth = 90;
      this.speed = 3.2;
    } else {
      this.health = 100;
      this.maxHealth = 100;
      this.speed = 3.6;
    }

    // Difficulty calibrations (balanced for fair, tactical COD gameplay)
    switch (difficulty) {
      case 'recruit':
        this.accuracy = 0.22;
        this.reactionTime = 0.85;
        break;
      case 'hardened':
        this.accuracy = 0.50;
        this.reactionTime = 0.38;
        break;
      case 'veteran':
        this.accuracy = 0.68;
        this.reactionTime = 0.25;
        break;
      case 'regular':
      default:
        this.accuracy = 0.35;
        this.reactionTime = 0.55;
        break;
    }

    if (this.archetype === 'sniper') {
      this.accuracy += 0.25;
    }

    this.group = ModelFactory.createBotMesh(team, archetype, weapon);
    this.group.position.copy(this.position);
    this.scene.add(this.group);

    this.headMesh = this.group.getObjectByName('bot_head') || null;
    this.torsoMesh = this.group.getObjectByName('bot_torso') || null;
    this.leftArmMesh = this.group.getObjectByName('bot_left_arm') || null;
    this.rightArmMesh = this.group.getObjectByName('bot_right_arm') || null;
    this.leftLegMesh = this.group.getObjectByName('bot_left_leg') || null;
    this.rightLegMesh = this.group.getObjectByName('bot_right_leg') || null;
    this.botWeaponMesh = this.group.getObjectByName('bot_weapon') || null;

    // Sniper warning laser
    if (this.archetype === 'sniper') {
      const laserGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -45)]);
      const laserMat = new THREE.LineBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.75 });
      this.sniperLaserMesh = new THREE.Line(laserGeo, laserMat);
      this.sniperLaserMesh.visible = false;
      this.group.add(this.sniperLaserMesh);
    }

    this.pickNextWaypoint();
  }

  public onHearSound(soundPos: THREE.Vector3, isGunfire: boolean) {
    if (this.state === 'attack' || this.isDead) return;

    this.alertLevel = isGunfire ? 'combat' : 'investigating';
    this.targetPos = soundPos.clone();
    this.targetPos.x += (Math.random() - 0.5) * 4;
    this.targetPos.z += (Math.random() - 0.5) * 4;
    this.state = 'chase';
  }

  public alertToPosition(pos: THREE.Vector3) {
    this.alertLevel = 'combat';
    if (this.state !== 'cover' && this.state !== 'attack') {
      this.state = this.archetype === 'flanker' ? 'flank' : 'chase';
      if (this.state === 'flank') {
        this.startFlankManeuver();
      } else {
        this.targetPos = pos.clone();
      }
    }
  }

  public pickNextWaypoint() {
    if (this.map.navNodes.length > 0) {
      const idx = Math.floor(Math.random() * this.map.navNodes.length);
      this.targetPos = this.map.navNodes[idx].clone();
      this.targetPos.x += (Math.random() - 0.5) * 4;
      this.targetPos.z += (Math.random() - 0.5) * 4;
    }
  }

  public startFlankManeuver() {
    const isLeft = Math.random() < 0.5;
    const baseRoute = isLeft ? this.map.flankWaypointsLeft : this.map.flankWaypointsRight;
    this.flankPath = baseRoute.map(p => p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3)));
    this.flankIndex = 0;
    this.state = 'flank';
    if (this.flankPath.length > 0) {
      this.targetPos = this.flankPath[0];
    }
  }

  public findBestCover(playerPos: THREE.Vector3): TacticalCoverPoint | null {
    let bestCover: TacticalCoverPoint | null = null;
    let bestScore = -999;

    this.map.coverPoints.forEach(cp => {
      if (!cp.isAvailable) return;
      const distToCover = this.position.distanceTo(cp.position);
      if (distToCover > 28) return;

      const dirToPlayer = new THREE.Vector3().subVectors(playerPos, cp.position).normalize();
      const dot = cp.facingDir.dot(dirToPlayer);

      const score = dot * 10 - distToCover * 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestCover = cp;
      }
    });

    return bestCover;
  }

  public startReload() {
    if (this.isReloading || this.magAmmo === this.magCapacity) return;
    this.isReloading = true;
    this.reloadTimer = this.reloadTotalTime;
    this.burstShotsRemaining = 0;

    // Tactical weapon reload mechanical sound
    soundManager.playReload(this.weapon, 'mag_out');
    setTimeout(() => {
      if (!this.isDead) soundManager.playReload(this.weapon, 'mag_in');
    }, this.reloadTotalTime * 500);
  }

  public takeDamage(damage: number, isHeadshot: boolean = false, hitDir?: THREE.Vector3): boolean {
    if (this.isDead) return false;
    this.lastDamagedTime = Date.now();

    // Armor absorption
    if (this.armor > 0) {
      const absorb = Math.min(this.armor, damage * 0.7);
      this.armor -= absorb;
      damage -= absorb * 0.5;
      soundManager.playHitmarker(false, false, true);
    }

    this.health -= damage;
    this.alertLevel = 'combat';
    this.squad.reportPlayerSpotted(this.position.clone().add(hitDir?.clone().negate() || new THREE.Vector3(0, 0, 10)), this);

    // Procedural pain & voice
    soundManager.playFleshImpact();

    const botForward = new THREE.Vector3(0, 0, 1).applyEuler(this.group.rotation);
    const botRight = new THREE.Vector3(1, 0, 0).applyEuler(this.group.rotation);
    const impactDir = hitDir ? hitDir.clone().normalize() : botForward.clone().negate();

    const forwardDot = impactDir.dot(botForward);
    const rightDot = impactDir.dot(botRight);
    const dmgScale = Math.min(2.5, Math.max(0.6, damage / 30));

    if (isHeadshot) {
      this.headFlinchPitch = -0.75 * dmgScale;
      this.headFlinchYaw = (Math.random() - 0.5) * 0.9 * dmgScale;
      this.flinchPitch = -0.45 * dmgScale;
      this.flinchRoll = (rightDot > 0 ? 0.4 : -0.4) * dmgScale;
      this.flinchLegBuckle = 0.5 * dmgScale;
      this.flinchArmDisrupt = 0.8 * dmgScale;
      this.flinchVelocity.copy(impactDir).multiplyScalar(4.2 * dmgScale);
      this.aimDisruptionTimer = 0.8; // Severe aim disruption on headshot
    } else {
      this.flinchPitch = (forwardDot > 0 ? 0.38 : -0.48) * dmgScale;
      this.flinchRoll = (rightDot > 0 ? 0.45 : -0.45) * dmgScale;
      this.flinchYaw = (Math.random() - 0.5) * 0.45 * dmgScale;
      this.headFlinchPitch = -0.35 * dmgScale;
      this.headFlinchYaw = (Math.random() - 0.5) * 0.5 * dmgScale;
      this.flinchLegBuckle = 0.35 * dmgScale;
      this.flinchArmDisrupt = 0.55 * dmgScale;

      this.flinchVelocity.copy(impactDir).multiplyScalar(2.8 * dmgScale);
      this.aimDisruptionTimer = 0.5; // Suppression aim disruption
    }

    // Interrupt current burst when taking heavy fire
    this.burstPauseTimer = Math.max(this.burstPauseTimer, 0.45);

    if (this.leftArmMesh) this.leftArmMesh.rotation.x -= 0.6 * dmgScale;
    if (this.rightArmMesh) this.rightArmMesh.rotation.x -= 0.7 * dmgScale;

    // Tactical self-preservation: Fall back to cover when low health (< 55 HP)
    if (this.state !== 'cover' && this.health < 55) {
      const cover = this.findBestCover(this.position.clone().add(hitDir?.clone().negate() || new THREE.Vector3()));
      if (cover) {
        this.currentCover = cover;
        this.state = 'cover';
        this.targetPos = cover.position.clone();
      } else {
        this.state = 'attack';
      }
    } else if (this.state !== 'cover' && this.state !== 'flank') {
      this.state = 'attack';
    }

    // Blood emission
    const hitPos = this.position.clone().add(new THREE.Vector3(0, isHeadshot ? 1.7 : 1.2, 0));
    this.particles.emitBloodSplatter(hitPos, hitDir || new THREE.Vector3(0, 1, 0), isHeadshot);

    if (this.health <= 0) {
      this.die(impactDir, isHeadshot, damage);
      return true;
    }
    return false;
  }

  public die(hitDir?: THREE.Vector3, isHeadshot: boolean = false, damage: number = 80) {
    this.isDead = true;
    this.health = 0;
    this.state = 'dead';
    this.alertLevel = 'unalerted';
    this.deaths++;
    this.respawnTimer = 4.5;
    this.isReloading = false;

    if (this.sniperLaserMesh) {
      this.sniperLaserMesh.visible = false;
    }

    this.isRagdollActive = true;
    const botForward = new THREE.Vector3(0, 0, 1).applyEuler(this.group.rotation);
    const botRight = new THREE.Vector3(1, 0, 0).applyEuler(this.group.rotation);
    const impact = hitDir ? hitDir.clone().normalize() : botForward.clone().negate();
    const forwardDot = impact.dot(botForward);
    const rightDot = impact.dot(botRight);

    // Dynamic bullet impulse momentum transfer
    const force = isHeadshot ? 3.2 : Math.min(8.5, 4.0 + damage * 0.05);
    this.ragdollVelocity.set(impact.x * force, isHeadshot ? 1.0 : 2.5, impact.z * force);
    this.ragdollAngularVel.set(
      forwardDot > 0 ? 3.6 : -4.5,
      (Math.random() - 0.5) * 4.8,
      rightDot > 0 ? 3.2 : -3.2
    );

    // Initial joint limpness targets
    this.ragdollTorsoPitch = forwardDot > 0 ? Math.PI / 2 : -Math.PI / 2;
    this.ragdollTorsoRoll = rightDot > 0 ? 0.45 : -0.45;

    // Drop and tumble weapon to the ground
    if (this.botWeaponMesh) {
      this.isWeaponDropped = true;
      this.droppedWeaponPos.copy(this.botWeaponMesh.position);
      this.droppedWeaponVel.set(
        impact.x * 3.2 + (Math.random() - 0.5) * 1.5,
        2.8,
        impact.z * 3.2 + (Math.random() - 0.5) * 1.5
      );
      this.droppedWeaponRot.set(0, Math.PI, 0);
      this.droppedWeaponRotVel.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );
    }
  }

  public respawn() {
    this.isDead = false;
    this.isRagdollActive = false;
    this.health = this.maxHealth;
    this.armor = this.maxArmor;
    this.magAmmo = this.magCapacity;
    this.isReloading = false;
    this.burstShotsRemaining = 0;
    this.burstPauseTimer = 0;
    this.targetAcquisitionTimer = 0;
    this.state = 'patrol';
    this.alertLevel = 'unalerted';

    // Reset all joint and limb angles to upright combat stance
    if (this.headMesh) this.headMesh.rotation.set(0, 0, 0);
    if (this.torsoMesh) this.torsoMesh.rotation.set(0, 0, 0);
    if (this.leftArmMesh) this.leftArmMesh.rotation.set(0.5, 0, 0);
    if (this.rightArmMesh) this.rightArmMesh.rotation.set(0.7, 0, 0);
    if (this.leftLegMesh) this.leftLegMesh.rotation.set(0, 0, 0);
    if (this.rightLegMesh) this.rightLegMesh.rotation.set(0, 0, 0);

    // Reset Weapon to Hand
    if (this.botWeaponMesh) {
      this.isWeaponDropped = false;
      this.botWeaponMesh.position.set(0.18, 1.15, 0.35);
      this.botWeaponMesh.rotation.set(0, Math.PI, 0);
    }

    const spawnPt = this.map.spawnPoints[Math.floor(Math.random() * this.map.spawnPoints.length)];
    this.position.set(spawnPt.position.x, 0, spawnPt.position.z);
    this.velocity.set(0, 0, 0);
    this.ragdollVelocity.set(0, 0, 0);
    this.group.position.copy(this.position);
    this.group.rotation.set(0, 0, 0);
    this.currentCover = null;
    this.pickNextWaypoint();
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    playerHealth: number,
    onPlayerDamage: (dmg: number, botName: string, weapon: WeaponType, botPos: THREE.Vector3) => void,
    allBots: BotController[],
    isPlayerSprinting: boolean = false,
    isPlayerSliding: boolean = false,
    weatherPreset: string = 'clear_day',
    playerFlashlightActive: boolean = false,
    playerIsCrouching: boolean = false,
    uavActive: boolean = false
  ) {
    this.lastUavActive = uavActive;

    if (this.isDead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.respawn();
        return;
      }

      // --- PROCEDURAL MULTI-JOINT RAGDOLL COLLAPSE SIMULATION ---
      const onCatwalk = Math.abs(this.position.x) <= 7.5 && Math.abs(this.position.z) <= 6.5 && this.position.y > 2.0;
      const floorY = onCatwalk ? 3.8 : 0.0;

      // Integrate Ragdoll Linear Velocity & Gravity
      this.ragdollVelocity.y -= 19.6 * dt; // Realistic gravity
      this.position.x += this.ragdollVelocity.x * dt;
      this.position.z += this.ragdollVelocity.z * dt;
      this.position.y += this.ragdollVelocity.y * dt;

      // Ground Collision Clamping & Friction
      if (this.position.y <= floorY + 0.18) {
        this.position.y = floorY + 0.18;
        if (this.ragdollVelocity.y < -1.0) {
          this.ragdollVelocity.y = -this.ragdollVelocity.y * 0.22; // Low restitution ground bounce
        } else {
          this.ragdollVelocity.y = 0;
        }
        // Ground sliding friction
        this.ragdollVelocity.x *= Math.max(0, 1.0 - 7.5 * dt);
        this.ragdollVelocity.z *= Math.max(0, 1.0 - 7.5 * dt);
      }

      // Angular Momentum damping
      this.ragdollAngularVel.multiplyScalar(Math.max(0, 1.0 - 5.5 * dt));

      // 1. Torso Multi-Axis Ragdoll Tilt & Ground Settlement
      this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, this.ragdollTorsoPitch, Math.min(1.0, 7.5 * dt));
      this.group.rotation.z = THREE.MathUtils.lerp(this.group.rotation.z, this.ragdollTorsoRoll, Math.min(1.0, 6.0 * dt));

      // 2. Limp Head Ragdoll Flop
      if (this.headMesh) {
        this.headMesh.rotation.x = THREE.MathUtils.lerp(this.headMesh.rotation.x, -0.65, Math.min(1.0, 8.0 * dt));
        this.headMesh.rotation.z = THREE.MathUtils.lerp(this.headMesh.rotation.z, 0.45, Math.min(1.0, 7.0 * dt));
      }

      // 3. Limp Arms Natural Splaying
      if (this.leftArmMesh && this.rightArmMesh) {
        this.leftArmMesh.rotation.x = THREE.MathUtils.lerp(this.leftArmMesh.rotation.x, -1.3, Math.min(1.0, 8.5 * dt));
        this.leftArmMesh.rotation.z = THREE.MathUtils.lerp(this.leftArmMesh.rotation.z, 0.85, Math.min(1.0, 8.5 * dt));
        this.rightArmMesh.rotation.x = THREE.MathUtils.lerp(this.rightArmMesh.rotation.x, -1.1, Math.min(1.0, 8.5 * dt));
        this.rightArmMesh.rotation.z = THREE.MathUtils.lerp(this.rightArmMesh.rotation.z, -0.85, Math.min(1.0, 8.5 * dt));
      }

      // 4. Limp Legs Sprawl & Knee Buckle
      if (this.leftLegMesh && this.rightLegMesh) {
        this.leftLegMesh.rotation.x = THREE.MathUtils.lerp(this.leftLegMesh.rotation.x, 0.45, Math.min(1.0, 6.5 * dt));
        this.leftLegMesh.rotation.z = THREE.MathUtils.lerp(this.leftLegMesh.rotation.z, -0.4, Math.min(1.0, 6.5 * dt));
        this.rightLegMesh.rotation.x = THREE.MathUtils.lerp(this.rightLegMesh.rotation.x, -0.25, Math.min(1.0, 6.5 * dt));
        this.rightLegMesh.rotation.z = THREE.MathUtils.lerp(this.rightLegMesh.rotation.z, 0.4, Math.min(1.0, 6.5 * dt));
      }

      // 5. Dropped Weapon Tumbling & Ground Clatter
      if (this.botWeaponMesh && this.isWeaponDropped) {
        this.droppedWeaponVel.y -= 19.6 * dt;
        this.droppedWeaponPos.addScaledVector(this.droppedWeaponVel, dt);
        this.droppedWeaponRot.addScaledVector(this.droppedWeaponRotVel, dt);

        if (this.droppedWeaponPos.y <= 0.08) {
          this.droppedWeaponPos.y = 0.08;
          if (this.droppedWeaponVel.y < -0.8) {
            this.droppedWeaponVel.y = -this.droppedWeaponVel.y * 0.3;
          } else {
            this.droppedWeaponVel.y = 0;
          }
          this.droppedWeaponVel.x *= Math.max(0, 1.0 - 8.0 * dt);
          this.droppedWeaponVel.z *= Math.max(0, 1.0 - 8.0 * dt);
          this.droppedWeaponRotVel.multiplyScalar(Math.max(0, 1.0 - 6.0 * dt));
        }

        this.botWeaponMesh.position.copy(this.droppedWeaponPos);
        this.botWeaponMesh.rotation.set(
          this.droppedWeaponRot.x,
          this.droppedWeaponRot.y,
          this.droppedWeaponRot.z
        );
      }

      this.group.position.copy(this.position);
      return;
    }

    this.fireTimer -= dt;
    this.burstPauseTimer -= dt;
    this.stateTimer += dt;
    this.strafeTimer += dt;
    this.animTimer += dt * 8;

    // Reload management
    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.magAmmo = this.magCapacity;
        this.isReloading = false;
      }
    }

    // 3D Spatial Directional Footsteps with Occlusion & Surface Detection
    const isStepMoving = this.velocity.lengthSq() > 0.15;
    if (isStepMoving) {
      const isSprinting = this.velocity.length() > 4.2;
      this.footstepTimer += dt * (isSprinting ? 2.8 : 1.8);
      if (this.footstepTimer >= 1.0) {
        this.footstepTimer = 0;
        const isCatwalk = Math.abs(this.position.x) <= 8 && Math.abs(this.position.z) <= 7 && this.position.y > 2.0;
        const isDirt = Math.abs(this.position.x) > 30 || Math.abs(this.position.z) > 30;
        const surf = isCatwalk ? 'metal' : isDirt ? 'dirt' : 'concrete';
        const isOccluded = !this.checkLineOfSight(playerPos);
        soundManager.playSpatialFootstep(this.position, isSprinting, surf, isOccluded);
      }
    }

    const distToPlayer = this.position.distanceTo(playerPos);
    const hasLineOfSight = this.checkLineOfSight(playerPos);
    this.isVisibleToPlayer = hasLineOfSight;

    // Dynamic Visibility / Darkness / Weather Range Calculation
    let maxSightDist = this.archetype === 'sniper' ? 70 : 45;
    if (weatherPreset === 'midnight_fog') {
      // In dark night / fog: vision severely limited unless player shines light
      maxSightDist = playerFlashlightActive ? 45 : (this.archetype === 'sniper' ? 24 : 14);
    } else if (weatherPreset === 'sandstorm') {
      maxSightDist = playerFlashlightActive ? 38 : (this.archetype === 'sniper' ? 32 : 20);
    } else if (weatherPreset === 'tactical_storm') {
      maxSightDist = playerFlashlightActive ? 42 : (this.archetype === 'sniper' ? 38 : 26);
    }

    // Stealth stance detection reduction
    if (playerIsCrouching) {
      maxSightDist *= 0.75;
    }

    // Perception & State Machine with Human Acquisition Delay
    if (playerHealth > 0 && distToPlayer <= maxSightDist && hasLineOfSight) {
      if (this.alertLevel !== 'combat') {
        this.alertLevel = 'combat';
        this.targetAcquisitionTimer = this.reactionTime; // Human reaction time delay!
        this.squad.reportPlayerSpotted(playerPos, this);
      }

      if (this.state !== 'cover' && this.state !== 'flank') {
        this.state = 'attack';
      }
    } else if (this.state === 'attack' && (!hasLineOfSight || distToPlayer > maxSightDist * 1.25)) {
      this.state = 'chase';
      this.targetPos = new THREE.Vector3(playerPos.x, 0, playerPos.z);
      this.targetAcquisitionTimer = 0;
      this.burstShotsRemaining = 0;
    }

    if (this.targetAcquisitionTimer > 0) {
      this.targetAcquisitionTimer -= dt;
    }

    // Sniper Laser sight
    if (this.sniperLaserMesh) {
      if (this.state === 'attack' && hasLineOfSight && !this.isReloading) {
        this.sniperLaserMesh.visible = true;
      } else {
        this.sniperLaserMesh.visible = false;
      }
    }

    // Behavior Execution
    switch (this.state) {
      case 'cover':
        this.updateCoverState(dt, playerPos, onPlayerDamage, distToPlayer, isPlayerSprinting, isPlayerSliding);
        break;
      case 'flank':
        this.updateFlankState(dt, playerPos, onPlayerDamage, distToPlayer, hasLineOfSight);
        break;
      case 'attack':
        this.updateAttackState(dt, playerPos, onPlayerDamage, distToPlayer, isPlayerSprinting, isPlayerSliding);
        break;
      case 'chase':
        this.updateChaseState(dt, playerPos);
        break;
      case 'patrol':
      default:
        this.updatePatrolState(dt);
        break;
    }

    // Resolve Obstacle Collision
    CollisionSystem.resolveEntityCollision(this.position, this.velocity, 0.45, 1.8, this.map.obstacles);

    // Keep bot inside map arena perimeter [-43, 43]
    this.position.x = Math.max(-43, Math.min(43, this.position.x));
    this.position.z = Math.max(-43, Math.min(43, this.position.z));

    // STRICT Ground altitude clamping (catwalk platform elevation vs floor)
    const onCatwalk = Math.abs(this.position.x) <= 7.5 && Math.abs(this.position.z) <= 6.5 && this.position.y > 2.0;
    this.position.y = onCatwalk ? 3.8 : 0.0;
    this.velocity.y = 0;

    // Spring decay for procedural flinch & weapon recoil physics
    this.weaponRecoilKick += (0 - this.weaponRecoilKick) * Math.min(1.0, 22.0 * dt);
    this.flinchPitch += (0 - this.flinchPitch) * Math.min(1.0, 12.0 * dt);
    this.flinchYaw += (0 - this.flinchYaw) * Math.min(1.0, 14.0 * dt);
    this.flinchRoll += (0 - this.flinchRoll) * Math.min(1.0, 12.0 * dt);
    this.headFlinchPitch += (0 - this.headFlinchPitch) * Math.min(1.0, 16.0 * dt);
    this.headFlinchYaw += (0 - this.headFlinchYaw) * Math.min(1.0, 16.0 * dt);
    this.flinchLegBuckle += (0 - this.flinchLegBuckle) * Math.min(1.0, 10.0 * dt);
    this.flinchArmDisrupt += (0 - this.flinchArmDisrupt) * Math.min(1.0, 12.0 * dt);

    // Physical stumble impulse decay (Zero out Y to strictly prevent any vertical flight)
    this.flinchVelocity.y = 0;
    this.flinchDisplacement.y = 0;
    this.flinchDisplacement.addScaledVector(this.flinchVelocity, dt);
    this.flinchVelocity.multiplyScalar(Math.max(0, 1.0 - 10.0 * dt));
    this.flinchDisplacement.lerp(new THREE.Vector3(0, 0, 0), Math.min(1.0, 8.0 * dt));
    this.flinchDisplacement.y = 0;
    if (this.aimDisruptionTimer > 0) this.aimDisruptionTimer -= dt;

    // Movement speed & locomotion cadence
    const speedSq = this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z;
    const moveSpeed = Math.sqrt(speedSq);
    const isMoving = speedSq > 0.08;
    const isCombat = this.state === 'attack' || this.state === 'cover' || this.isPeeking;

    // 1. Torso & Spine Kinematics
    if (this.torsoMesh) {
      // Forward tilt during sprint/run, subtle breathing sway when standing
      const forwardLean = isMoving ? Math.min(0.22, moveSpeed * 0.04) : 0;
      const breathingSway = Math.sin(this.animTimer * 1.5) * 0.015;
      this.torsoMesh.rotation.x = forwardLean + breathingSway + this.flinchPitch * 0.7;
      this.torsoMesh.rotation.z = (isMoving ? Math.sin(this.animTimer * 0.5) * 0.03 : 0) + this.flinchRoll * 0.7;
      this.torsoMesh.rotation.y = this.flinchYaw * 0.7;
    }

    // 2. Head Look & Flinch
    if (this.headMesh) {
      this.headMesh.rotation.x = this.headFlinchPitch;
      this.headMesh.rotation.y = this.headFlinchYaw;
      this.headMesh.rotation.z = this.flinchRoll * 0.4;
    }

    // 3. Fluid Leg Locomotion with Natural Stride & Knee Lift + Flinch Stagger
    if (this.leftLegMesh && this.rightLegMesh) {
      if (isMoving) {
        const strideAngle = Math.sin(this.animTimer) * Math.min(0.7, 0.35 + moveSpeed * 0.08);
        this.leftLegMesh.rotation.x = strideAngle + this.flinchLegBuckle * 0.6;
        this.rightLegMesh.rotation.x = -strideAngle - this.flinchLegBuckle * 0.4;
      } else {
        this.leftLegMesh.rotation.x = this.leftLegMesh.rotation.x * 0.85 + this.flinchLegBuckle * 0.5;
        this.rightLegMesh.rotation.x = this.rightLegMesh.rotation.x * 0.85 - this.flinchLegBuckle * 0.3;
      }
      this.leftLegMesh.rotation.z = -this.flinchRoll * 0.25;
      this.rightLegMesh.rotation.z = this.flinchRoll * 0.25;
    }

    // 4. Arms & Weapon Posing (Aim Ready vs Stride Swing vs Reload Gesture + Flinch Disrupt)
    if (this.leftArmMesh && this.rightArmMesh) {
      if (this.isReloading) {
        // Tactical Reloading Gesture: Lower weapon, left arm dips to chest pouch and slaps back
        const reloadProgress = 1 - (this.reloadTimer / Math.max(0.1, this.reloadTotalTime));
        const magPull = Math.sin(reloadProgress * Math.PI);
        this.rightArmMesh.rotation.x = 0.45 - this.flinchArmDisrupt * 0.4;
        this.leftArmMesh.rotation.x = 0.2 + magPull * 0.6 - this.flinchArmDisrupt * 0.4;
        this.leftArmMesh.rotation.y = -0.3 + magPull * 0.4;
      } else if (isCombat) {
        // High-Ready Aim Stance with Recoil Kick & Flinch Disruption
        const recoilOffset = this.weaponRecoilKick;
        this.rightArmMesh.rotation.x = 0.75 + recoilOffset * 0.4 - this.flinchArmDisrupt * 0.6;
        this.leftArmMesh.rotation.x = 0.55 + recoilOffset * 0.3 - this.flinchArmDisrupt * 0.5;
        this.leftArmMesh.rotation.y = -0.4;
      } else if (isMoving) {
        // Natural arm counter-swing during patrol / sprint
        const armSwing = Math.sin(this.animTimer) * 0.35;
        this.rightArmMesh.rotation.x = 0.6 + armSwing * 0.5 - this.flinchArmDisrupt * 0.4;
        this.leftArmMesh.rotation.x = 0.4 - armSwing * 0.5 - this.flinchArmDisrupt * 0.4;
      } else {
        // Idle combat patrol stance
        this.rightArmMesh.rotation.x = 0.65 - this.flinchArmDisrupt * 0.4;
        this.leftArmMesh.rotation.x = 0.45 - this.flinchArmDisrupt * 0.4;
        this.leftArmMesh.rotation.y = -0.35;
      }
    }

    // 5. Bot Weapon Recoil Kick & Jolt
    if (this.botWeaponMesh) {
      this.botWeaponMesh.position.z = 0.35 - this.weaponRecoilKick * 0.08;
      this.botWeaponMesh.rotation.x = this.weaponRecoilKick * 0.35;
    }

    // Apply world position clamped firmly to ground
    this.group.position.set(
      this.position.x + this.flinchDisplacement.x,
      this.position.y,
      this.position.z + this.flinchDisplacement.z
    );
  }

  // --- STATE HANDLERS ---
  private updateCoverState(
    dt: number,
    playerPos: THREE.Vector3,
    onPlayerDamage: (dmg: number, botName: string, weapon: WeaponType, botPos: THREE.Vector3) => void,
    distToPlayer: number,
    isPlayerSprinting: boolean,
    isPlayerSliding: boolean
  ) {
    if (!this.currentCover || !this.currentCover.isAvailable) {
      this.state = 'attack';
      this.currentCover = null;
      return;
    }

    // If bot needs reload, reload safely behind cover
    if (this.magAmmo <= 0 && !this.isReloading) {
      this.startReload();
    }

    const dx = this.currentCover.position.x - this.position.x;
    const dz = this.currentCover.position.z - this.position.z;
    const distToCover = Math.sqrt(dx * dx + dz * dz);

    if (distToCover > 1.2) {
      const dirX = dx / distToCover;
      const dirZ = dz / distToCover;
      this.velocity.set(dirX * this.speed * 1.2, 0, dirZ * this.speed * 1.2);
      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;
      this.group.lookAt(new THREE.Vector3(this.currentCover.position.x, this.position.y, this.currentCover.position.z));
    } else {
      this.velocity.set(0, 0, 0);
      this.coverTimer += dt;
      if (this.isPeeking && !this.isReloading) {
        this.peekTimer += dt;
        const lookTarget = new THREE.Vector3(playerPos.x, this.position.y, playerPos.z);
        this.group.lookAt(lookTarget);

        const hasLoS = this.checkLineOfSight(playerPos);
        if (hasLoS && this.canFire() && this.squad.requestAttackToken()) {
          this.executeBurstFire(playerPos, onPlayerDamage, distToPlayer, isPlayerSprinting, isPlayerSliding);
        }

        if (this.peekTimer > 1.5 || this.magAmmo <= 0) {
          this.isPeeking = false;
          this.peekTimer = 0;
          this.coverTimer = 0;
          if (this.magAmmo <= 0) this.startReload();
        }
      } else {
        // Ducked in cover: wait 1.8s - 2.5s before next peek
        if (this.coverTimer > 2.0 && !this.isReloading) {
          this.isPeeking = true;
          this.peekTimer = 0;
        }
      }
    }
  }

  private updateFlankState(
    dt: number,
    playerPos: THREE.Vector3,
    onPlayerDamage: (dmg: number, botName: string, weapon: WeaponType, botPos: THREE.Vector3) => void,
    distToPlayer: number,
    hasLineOfSight: boolean
  ) {
    if (this.flankIndex >= this.flankPath.length || (hasLineOfSight && distToPlayer < 22)) {
      this.state = 'attack';
      this.velocity.set(0, 0, 0);
      return;
    }

    const currentWaypoint = this.flankPath[this.flankIndex];
    const dx = currentWaypoint.x - this.position.x;
    const dz = currentWaypoint.z - this.position.z;
    const distToWp = Math.sqrt(dx * dx + dz * dz);

    if (distToWp < 2.0) {
      this.flankIndex++;
      this.velocity.set(0, 0, 0);
    } else {
      const dirX = dx / Math.max(0.01, distToWp);
      const dirZ = dz / Math.max(0.01, distToWp);
      this.velocity.set(dirX * this.speed * 1.15, 0, dirZ * this.speed * 1.15);
      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;
      const lookTarget = new THREE.Vector3(currentWaypoint.x, this.position.y, currentWaypoint.z);
      this.group.lookAt(lookTarget);
    }
  }

  private updateAttackState(
    dt: number,
    playerPos: THREE.Vector3,
    onPlayerDamage: (dmg: number, botName: string, weapon: WeaponType, botPos: THREE.Vector3) => void,
    distToPlayer: number,
    isPlayerSprinting: boolean,
    isPlayerSliding: boolean
  ) {
    const hasLoS = this.checkLineOfSight(playerPos);
    if (!hasLoS) {
      this.state = 'chase';
      this.targetPos = new THREE.Vector3(playerPos.x, 0, playerPos.z);
      this.velocity.set(0, 0, 0);
      this.burstShotsRemaining = 0;
      return;
    }

    // If magazine empty, start reload and seek cover/strafe
    if (this.magAmmo <= 0 && !this.isReloading) {
      this.startReload();
      const cover = this.findBestCover(playerPos);
      if (cover) {
        this.currentCover = cover;
        this.state = 'cover';
        return;
      }
    }

    const lookTarget = new THREE.Vector3(playerPos.x, this.position.y, playerPos.z);
    this.group.lookAt(lookTarget);

    const dx = playerPos.x - this.position.x;
    const dz = playerPos.z - this.position.z;
    const dist2D = Math.max(0.01, Math.sqrt(dx * dx + dz * dz));
    const toPlayerX = dx / dist2D;
    const toPlayerZ = dz / dist2D;

    // Tactical Positioning on the XZ ground plane
    if (this.archetype === 'sniper') {
      if (distToPlayer < 24) {
        this.velocity.set(-toPlayerX * this.speed, 0, -toPlayerZ * this.speed);
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;
      } else {
        this.velocity.set(0, 0, 0);
      }
    } else if (this.archetype === 'assault' || this.archetype === 'heavy' || this.archetype === 'flanker') {
      if (distToPlayer > 20) {
        this.velocity.set(toPlayerX * this.speed, 0, toPlayerZ * this.speed);
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;
      } else if (distToPlayer < 6) {
        this.velocity.set(-toPlayerX * this.speed * 0.85, 0, -toPlayerZ * this.speed * 0.85);
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;
      } else {
        // Lateral combat strafing with periodic direction switch
        if (this.strafeTimer > 1.8) {
          this.strafeTimer = 0;
          this.strafeDir = Math.random() < 0.5 ? -1 : 1;
        }
        const rightX = -toPlayerZ;
        const rightZ = toPlayerX;
        this.velocity.set(rightX * 1.8 * this.strafeDir, 0, rightZ * 1.8 * this.strafeDir);
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;
      }
    }

    // Trigger Tactical Burst Fire ONLY if line of sight is clear
    if (this.canFire() && this.squad.requestAttackToken()) {
      this.executeBurstFire(playerPos, onPlayerDamage, distToPlayer, isPlayerSprinting, isPlayerSliding);
    }
  }

  private canFire(): boolean {
    return (
      !this.isReloading &&
      this.magAmmo > 0 &&
      this.fireTimer <= 0 &&
      this.burstPauseTimer <= 0 &&
      this.targetAcquisitionTimer <= 0
    );
  }

  private executeBurstFire(
    playerPos: THREE.Vector3,
    onPlayerDamage: (dmg: number, botName: string, weapon: WeaponType, botPos: THREE.Vector3) => void,
    distToPlayer: number,
    isPlayerSprinting: boolean,
    isPlayerSliding: boolean
  ) {
    // Before each burst bullet, verify line of sight
    const hasLoS = this.checkLineOfSight(playerPos);
    if (!hasLoS) {
      this.burstShotsRemaining = 0;
      this.state = 'chase';
      this.targetPos = new THREE.Vector3(playerPos.x, 0, playerPos.z);
      return;
    }

    const wpnCfg = WEAPON_REGISTRY[this.weapon];

    // If starting a new burst, initialize burst count
    if (this.burstShotsRemaining <= 0) {
      if (this.weapon === 'm4') {
        this.burstShotsRemaining = Math.floor(Math.random() * 2) + 3; // 3-4 round burst
      } else if (this.weapon === 'mp5') {
        this.burstShotsRemaining = Math.floor(Math.random() * 3) + 3; // 3-5 round burst
      } else if (this.weapon === 'deagle') {
        this.burstShotsRemaining = Math.floor(Math.random() * 2) + 2; // 2-3 shots
      } else {
        this.burstShotsRemaining = 1; // Sniper & Shotgun are single shot
      }
    }

    // Fire one bullet of the burst
    this.shootAtPlayer(playerPos, onPlayerDamage, distToPlayer, isPlayerSprinting, isPlayerSliding);
    this.magAmmo--;
    this.burstShotsRemaining--;

    const cyclicInterval = 60 / wpnCfg.fireRateRpm;

    if (this.burstShotsRemaining > 0 && this.magAmmo > 0) {
      // Next shot in this burst
      this.fireTimer = cyclicInterval;
    } else {
      // Completed burst! Enter tactical burst pause (recoil reset & assessment)
      let pauseDuration = 0.8;
      if (this.weapon === 'sniper') {
        pauseDuration = 2.0; // Bolt cycle
      } else if (this.weapon === 'shotgun') {
        pauseDuration = 1.3; // Pump action
      } else if (this.weapon === 'm4') {
        pauseDuration = 0.85 + Math.random() * 0.45; // 0.85s - 1.3s pause between bursts
      } else if (this.weapon === 'mp5') {
        pauseDuration = 0.75 + Math.random() * 0.4;
      } else if (this.weapon === 'deagle') {
        pauseDuration = 0.9 + Math.random() * 0.5;
      }

      // Difficulty adjustments to burst pause
      if (this.difficulty === 'recruit') pauseDuration *= 1.45;
      if (this.difficulty === 'hardened') pauseDuration *= 0.85;
      if (this.difficulty === 'veteran') pauseDuration *= 0.7;

      this.burstPauseTimer = pauseDuration;
      this.burstShotsRemaining = 0;
      this.fireTimer = pauseDuration;
    }
  }

  private updateChaseState(dt: number, playerPos: THREE.Vector3) {
    if (!this.targetPos) this.targetPos = new THREE.Vector3(playerPos.x, 0, playerPos.z);
    this.targetPos.y = 0;

    const dx = this.targetPos.x - this.position.x;
    const dz = this.targetPos.z - this.position.z;
    const distToTarget = Math.max(0.01, Math.sqrt(dx * dx + dz * dz));

    const moveX = dx / distToTarget;
    const moveZ = dz / distToTarget;
    this.velocity.set(moveX * this.speed, 0, moveZ * this.speed);
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    const lookTarget = new THREE.Vector3(this.targetPos.x, this.position.y, this.targetPos.z);
    this.group.lookAt(lookTarget);

    if (distToTarget < 3.0) {
      this.state = 'patrol';
      this.velocity.set(0, 0, 0);
      this.pickNextWaypoint();
    }
  }

  private updatePatrolState(dt: number) {
    if (!this.targetPos || this.position.distanceTo(this.targetPos) < 2.5) {
      this.pickNextWaypoint();
    }

    if (this.targetPos) {
      this.targetPos.y = 0;
      const dx = this.targetPos.x - this.position.x;
      const dz = this.targetPos.z - this.position.z;
      const distToTarget = Math.max(0.01, Math.sqrt(dx * dx + dz * dz));

      const moveX = dx / distToTarget;
      const moveZ = dz / distToTarget;
      this.velocity.set(moveX * this.speed * 0.75, 0, moveZ * this.speed * 0.75);
      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;
      const lookTarget = new THREE.Vector3(this.targetPos.x, this.position.y, this.targetPos.z);
      this.group.lookAt(lookTarget);
    } else {
      this.velocity.set(0, 0, 0);
    }
  }

  private checkLineOfSight(targetPos: THREE.Vector3): boolean {
    const eyePos = new THREE.Vector3(this.position.x, this.position.y + 1.55, this.position.z);
    
    // Multi-elevation line-of-sight checks with smoke occlusion
    // Check against player Head, Upper Chest, and Pelvis
    const headTarget = new THREE.Vector3(targetPos.x, targetPos.y + 0.1, targetPos.z);
    const chestTarget = new THREE.Vector3(targetPos.x, targetPos.y - 0.45, targetPos.z);
    const lowerTarget = new THREE.Vector3(targetPos.x, targetPos.y - 1.2, targetPos.z);

    const losHead = CollisionSystem.checkLineOfSight(eyePos, headTarget, this.map.obstacles, this.squad.smokeClouds);
    if (losHead.isClear) return true;

    const losChest = CollisionSystem.checkLineOfSight(eyePos, chestTarget, this.map.obstacles, this.squad.smokeClouds);
    if (losChest.isClear) return true;

    const losLower = CollisionSystem.checkLineOfSight(eyePos, lowerTarget, this.map.obstacles, this.squad.smokeClouds);
    if (losLower.isClear) return true;

    return false;
  }

  private shootAtPlayer(
    playerPos: THREE.Vector3,
    onPlayerDamage: (dmg: number, botName: string, weapon: WeaponType, botPos: THREE.Vector3) => void,
    dist: number,
    isPlayerSprinting: boolean = false,
    isPlayerSliding: boolean = false
  ) {
    const wpnCfg = WEAPON_REGISTRY[this.weapon];

    // Bullet origin strictly at bot's upper chest / eye level inside collision radius
    const origin = new THREE.Vector3(this.position.x, this.position.y + 1.4, this.position.z);
    const playerChestTarget = new THREE.Vector3(playerPos.x, playerPos.y - 0.4, playerPos.z);

    // Initial direct check against walls: if direct line to player is blocked, no damage can ever pass!
    const directCheck = CollisionSystem.checkLineOfSight(origin, playerChestTarget, this.map.obstacles, this.squad.smokeClouds);
    if (!directCheck.isClear && directCheck.hitPoint) {
      const dir = new THREE.Vector3().subVectors(playerChestTarget, origin).normalize();
      this.particles.emitMuzzleFlash(origin, dir);
      this.particles.spawnBulletTracer(origin, directCheck.hitPoint);
      soundManager.playSpatialGunshot(this.weapon, this.position, true);
      this.particles.emitImpactSparks(directCheck.hitPoint, new THREE.Vector3(0, 1, 0));
      return;
    }

    const aimTarget = playerChestTarget.clone();

    // Dynamic Accuracy Calculation (Fair & Tactical)
    let effectiveAccuracy = this.accuracy;
    if (dist > 18) {
      effectiveAccuracy *= Math.max(0.35, 1 - (dist - 18) / 50);
    }
    if (isPlayerSprinting) effectiveAccuracy *= 0.65;
    if (isPlayerSliding) effectiveAccuracy *= 0.50;
    if (this.aimDisruptionTimer > 0) {
      effectiveAccuracy *= 0.35;
    }

    const isAccurate = Math.random() < effectiveAccuracy;
    if (!isAccurate) {
      // Natural bullet spread based on distance
      const spreadRadius = Math.min(4.5, 1.0 + dist * 0.07);
      aimTarget.x += (Math.random() - 0.5) * spreadRadius;
      aimTarget.y += (Math.random() - 0.5) * (spreadRadius * 0.5);
      aimTarget.z += (Math.random() - 0.5) * spreadRadius;
    }

    const dir = new THREE.Vector3().subVectors(aimTarget, origin).normalize();

    // Check if bullet trajectory hits an obstacle
    const bulletCheck = CollisionSystem.checkLineOfSight(origin, aimTarget, this.map.obstacles, this.squad.smokeClouds);

    if (!bulletCheck.isClear && bulletCheck.hitPoint) {
      this.particles.emitMuzzleFlash(origin, dir);
      this.particles.spawnBulletTracer(origin, bulletCheck.hitPoint);
      soundManager.playSpatialGunshot(this.weapon, this.position, true);
      this.particles.emitImpactSparks(bulletCheck.hitPoint, new THREE.Vector3(0, 1, 0));

      if (bulletCheck.hitObject) {
        let current: THREE.Object3D | null = bulletCheck.hitObject;
        while (current && !current.name.startsWith('prop_') && current.parent) {
          current = current.parent;
        }
        if (current) {
          this.map.destruction.damageProp(current.name, wpnCfg.damage);
        }
      }
      return;
    }

    // Unobstructed shot
    this.lastShotTime = Date.now();
    this.weaponRecoilKick = 0.45; // Physical muzzle kick
    this.particles.emitMuzzleFlash(origin, dir);
    this.particles.spawnBulletTracer(origin, aimTarget);
    soundManager.playSpatialGunshot(this.weapon, this.position, false);

    if (!isAccurate) {
      // Supersonic bullet flyby / snap-thump doppler effect near player
      const bulletLine = new THREE.Line3(origin, aimTarget);
      const closestPoint = new THREE.Vector3();
      bulletLine.closestPointToPoint(playerPos, true, closestPoint);
      if (closestPoint.distanceTo(playerPos) < 3.8) {
        soundManager.playSupersonicFlyby(closestPoint, dir, 780);
      }
    }

    if (isAccurate) {
      let effectiveDmg = wpnCfg.damage;
      if (dist > wpnCfg.damageFalloffStart) {
        const falloffRatio = Math.min(1, (dist - wpnCfg.damageFalloffStart) / (wpnCfg.damageFalloffEnd - wpnCfg.damageFalloffStart));
        effectiveDmg = wpnCfg.damage - falloffRatio * (wpnCfg.damage - wpnCfg.minDamage);
      }
      const finalDmg = Math.max(wpnCfg.minDamage, Math.floor(effectiveDmg * (Math.random() * 0.2 + 0.85)));
      onPlayerDamage(finalDmg, this.name, this.weapon, this.position);
    }
  }

  public getData(): EnemyBot {
    const isRecentlyActive = (Date.now() - this.lastShotTime < 3000) || (Date.now() - this.lastDamagedTime < 3500);
    return {
      id: this.id,
      name: this.name,
      team: this.team,
      archetype: this.archetype,
      health: this.health,
      maxHealth: this.maxHealth,
      armor: this.armor,
      maxArmor: this.maxArmor,
      weapon: this.weapon,
      position: { x: this.position.x, y: this.position.y, z: this.position.z },
      rotation: { x: this.group.rotation.x, y: this.group.rotation.y, z: this.group.rotation.z },
      state: this.state,
      alertLevel: this.alertLevel,
      isAiming: this.state === 'attack' || this.isPeeking,
      isReloading: this.isReloading,
      isVisibleToPlayer: this.isVisibleToPlayer,
      spottedByRadar: this.lastUavActive || isRecentlyActive,
      kills: this.kills,
      deaths: this.deaths,
      accuracy: this.accuracy,
    };
  }

  public destroy() {
    this.scene.remove(this.group);
  }
}
