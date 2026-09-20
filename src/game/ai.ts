import * as THREE from 'three';
import { AIAlertLevel, AIArchetype, EnemyBot, GameMode, SquadRadioItem, SquadRole, WeaponType } from '../types';
import { ModelFactory } from './models';
import { TacticalCoverPoint, TacticalMap } from './map';
import { ParticleSystem } from './particles';
import { soundManager } from './audio';
import { WEAPON_REGISTRY } from './weapons';
import { CollisionSystem } from './collision';
import { GrenadeManager } from './grenades';

export class BotManager {
  public scene: THREE.Scene;
  public map: TacticalMap;
  public particles: ParticleSystem;
  public bots: BotController[] = [];
  public smokeClouds: { position: THREE.Vector3; radius: number; duration: number }[] = [];
  public onBotKillBot?: (killerTeam: 'allies' | 'axis', killerName: string, victimName: string, weapon: WeaponType) => void;
  public onSquadRadio?: (item: SquadRadioItem) => void;
  public grenadeManager?: GrenadeManager;

  // Battle Royale & Tactical Context
  public battleRoyaleContext?: {
    circleCenter: { x: number; z: number };
    circleRadius: number;
    dangerZone: { center: { x: number; z: number }; radius: number; isWarning: boolean } | null;
    isOutsideSafeZone: boolean;
  };

  // Squad Shared Intelligence & Gaze Tracking
  public squadAlertLevel: AIAlertLevel = 'unalerted';
  public lastKnownPlayerPos: THREE.Vector3 | null = null;
  public lastKnownPlayerVel: THREE.Vector3 = new THREE.Vector3();
  public timeSincePlayerSpotted: number = 999;
  public playerVelocity: THREE.Vector3 = new THREE.Vector3();
  public playerForward: THREE.Vector3 = new THREE.Vector3(0, 0, -1);

  // Player Camping Detection (flushes with frags if player turtles behind cover)
  public playerCampTimer: number = 0;
  public lastPlayerSamplePos: THREE.Vector3 = new THREE.Vector3();

  // Squad Radio Chatter Throttle & Role Evaluator
  public radioChatterCooldown: number = 0;
  public roleEvaluationTimer: number = 0;
  public boundingLeapfrogTimer: number = 0;
  public lastBoundingAdvancerId: string | null = null;
  public lastBoundingCovererId: string | null = null;
  private attackTokens: number = 2; // Maximum concurrent shooters to prevent overwhelming the player

  constructor(scene: THREE.Scene, map: TacticalMap, particles: ParticleSystem) {
    this.scene = scene;
    this.map = map;
    this.particles = particles;
  }

  public setSmokeClouds(clouds: { position: THREE.Vector3; radius: number; duration: number }[]) {
    this.smokeClouds = clouds;
  }

  // --- AAA SQUAD RADIO BROADCASTING ---
  public broadcastRadio(
    speaker: BotController,
    message: string,
    actionType: SquadRadioItem['actionType'],
    overrideThrottle: boolean = false
  ) {
    if (!overrideThrottle && this.radioChatterCooldown > 0) return;
    this.radioChatterCooldown = 2.4;

    soundManager.playRadioTacticalBark(actionType, speaker.position);
    speaker.voiceCallout = message;
    setTimeout(() => {
      if (speaker.voiceCallout === message) speaker.voiceCallout = '';
    }, 3500);

    const radioItem: SquadRadioItem = {
      id: `radio_${Date.now()}_${Math.random()}`,
      speaker: speaker.name.replace(/_/g, ' '),
      team: speaker.team,
      role: speaker.squadRole,
      message,
      actionType,
      timestamp: Date.now(),
    };
    this.onSquadRadio?.(radioItem);
  }

  // --- AAA DYNAMIC SQUAD ROLE ALLOCATION ---
  public evaluateSquadRoles(team: 'allies' | 'axis') {
    const aliveBots = this.bots.filter(b => !b.isDead && b.team === team);
    if (aliveBots.length === 0) return;

    let hasSuppressor = false;
    let hasFlanker = false;
    let hasOverwatch = false;

    aliveBots.forEach(bot => {
      if (bot.archetype === 'sniper' && !hasOverwatch) {
        bot.squadRole = 'overwatch';
        hasOverwatch = true;
      } else if (!hasSuppressor && (bot.archetype === 'heavy' || bot.archetype === 'assault')) {
        bot.squadRole = 'suppressor';
        hasSuppressor = true;
      } else if (!hasFlanker && (bot.archetype === 'flanker' || bot.archetype === 'assault')) {
        bot.squadRole = 'flanker';
        hasFlanker = true;
      } else {
        bot.squadRole = 'pointman';
      }
    });
  }

  // --- NEAR-MISS BULLET SUPPRESSION ---
  public notifyNearMiss(bulletPos: THREE.Vector3, dir: THREE.Vector3) {
    this.bots.forEach(bot => {
      if (bot.isDead) return;
      const d = bot.position.distanceTo(bulletPos);
      if (d < 3.2) {
        bot.applySuppression(1.0);
      }
    });
  }

  // --- SQUAD CASUALTY NOTIFICATION ---
  public onBotKilled(victim: BotController, killerName?: string) {
    const friendlyTeammates = this.bots.filter(b => !b.isDead && b.team === victim.team && b !== victim);
    if (friendlyTeammates.length > 0) {
      const nearestFriendly = friendlyTeammates.reduce((closest, b) => {
        return b.position.distanceTo(victim.position) < closest.position.distanceTo(victim.position) ? b : closest;
      }, friendlyTeammates[0]);

      if (nearestFriendly.position.distanceTo(victim.position) < 32) {
        const casualtyLines = [
          `Man down! ${victim.name.replace(/_/g, ' ')} is hit!`,
          `Casualty reported! Stay in cover and return fire!`,
          `We lost a shooter, check your sectors!`,
        ];
        const line = casualtyLines[Math.floor(Math.random() * casualtyLines.length)];
        this.broadcastRadio(nearestFriendly, line, 'casualty', true);

        // Alert to victim's position
        nearestFriendly.alertToPosition(victim.position);
      }
    }
    // Re-evaluate team roles after casualty
    this.evaluateSquadRoles(victim.team);
  }

  public spawnBots(
    count: number,
    difficulty: 'recruit' | 'regular' | 'hardened' | 'veteran' = 'regular',
    gameMode: GameMode = 'tdm'
  ) {
    // Clear existing
    this.bots.forEach(b => b.destroy());
    this.bots = [];

    if (count <= 0) return;

    if (gameMode === 'tdm') {
      // In TDM: 5v5 Match (Task Force 141 Allies vs Kortac Axis)
      // Player is squad leader of Allies team!
      // Allies team bots (4 friendly bots): Ghost, Soap, Price, Gaz
      const alliesRoster = [
        { name: 'Ghost_Riley', archetype: 'flanker' as AIArchetype, weapon: 'vector' as WeaponType },
        { name: 'Soap_MacTavish', archetype: 'assault' as AIArchetype, weapon: 'scar' as WeaponType },
        { name: 'Price_Bravo6', archetype: 'heavy' as AIArchetype, weapon: 'shotgun' as WeaponType },
        { name: 'Gaz_Garrick', archetype: 'sniper' as AIArchetype, weapon: 'sniper' as WeaponType },
      ];

      // Axis team bots (5 enemy bots): Viper, Kruger, Minotaur, Bale, Shadow
      const axisRoster = [
        { name: 'Viper_01', archetype: 'assault' as AIArchetype, weapon: 'ak47' as WeaponType },
        { name: 'Kruger_SpecOps', archetype: 'flanker' as AIArchetype, weapon: 'vector' as WeaponType },
        { name: 'Minotaur_Enforcer', archetype: 'heavy' as AIArchetype, weapon: 'scar' as WeaponType },
        { name: 'Bale_Vanguard', archetype: 'assault' as AIArchetype, weapon: 'ak47' as WeaponType },
        { name: 'Shadow_Lead', archetype: 'sniper' as AIArchetype, weapon: 'sniper' as WeaponType },
      ];

      const allySpawns = this.map.spawnPoints.filter(s => s.team === 'allies');
      const axisSpawns = this.map.spawnPoints.filter(s => s.team === 'axis');

      // Spawn Allied bots at Allied Base (South)
      alliesRoster.forEach((r, idx) => {
        const spawnPt = allySpawns[idx % (allySpawns.length || 1)] || this.map.spawnPoints[0];
        const bot = new BotController(
          `ally_${idx}`,
          r.name,
          'allies',
          r.archetype,
          r.weapon,
          spawnPt.position.clone(),
          difficulty,
          this.scene,
          this.map,
          this.particles,
          this
        );
        this.bots.push(bot);
      });

      // Spawn Axis bots at Axis Base (North)
      axisRoster.forEach((r, idx) => {
        const spawnPt = axisSpawns[idx % (axisSpawns.length || 1)] || this.map.spawnPoints[this.map.spawnPoints.length - 1];
        const bot = new BotController(
          `axis_${idx}`,
          r.name,
          'axis',
          r.archetype,
          r.weapon,
          spawnPt.position.clone(),
          difficulty,
          this.scene,
          this.map,
          this.particles,
          this
        );
        this.bots.push(bot);
      });
    } else {
      // FFA, Battle Royale, or Gun Game
      const freeRoster = [
        { name: 'Viper_01', archetype: 'assault' as AIArchetype, weapon: 'm4' as WeaponType },
        { name: 'Kruger_SpecOps', archetype: 'flanker' as AIArchetype, weapon: 'vector' as WeaponType },
        { name: 'Minotaur_Enforcer', archetype: 'heavy' as AIArchetype, weapon: 'scar' as WeaponType },
        { name: 'Bale_Vanguard', archetype: 'assault' as AIArchetype, weapon: 'ak47' as WeaponType },
        { name: 'Shadow_Lead', archetype: 'sniper' as AIArchetype, weapon: 'sniper' as WeaponType },
        { name: 'Ghost_Operative', archetype: 'flanker' as AIArchetype, weapon: 'mp5' as WeaponType },
        { name: 'Ronin_Tactical', archetype: 'assault' as AIArchetype, weapon: 'scar' as WeaponType },
        { name: 'Mace_Carnage', archetype: 'heavy' as AIArchetype, weapon: 'shotgun' as WeaponType },
        { name: 'Nikto_Heavy', archetype: 'assault' as AIArchetype, weapon: 'ak47' as WeaponType },
      ];

      for (let i = 0; i < count; i++) {
        const rosterItem = freeRoster[i % freeRoster.length];
        const spawnPt = this.map.spawnPoints[i % this.map.spawnPoints.length];
        const bot = new BotController(
          `bot_${i}`,
          rosterItem.name,
          'axis',
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

    this.evaluateSquadRoles('allies');
    this.evaluateSquadRoles('axis');
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

  // --- TACTICAL EQUIPMENT EFFECTS ON ENEMY BOTS ---
  public blindBotsInRange(center: THREE.Vector3, radius: number, duration: number = 4.2) {
    this.bots.forEach(bot => {
      if (bot.isDead) return;
      const dist = bot.position.distanceTo(center);
      if (dist <= radius) {
        bot.isBlind = true;
        bot.blindTimer = duration;
      }
    });
  }

  public concussBotsInRange(center: THREE.Vector3, radius: number, duration: number = 3.8) {
    this.bots.forEach(bot => {
      if (bot.isDead) return;
      const dist = bot.position.distanceTo(center);
      if (dist <= radius) {
        bot.isConcussed = true;
        bot.concussedTimer = duration;
      }
    });
  }

  // --- SQUAD INTEL SHARING & SQUAD TACTICS COORDINATION ---
  public reportPlayerSpotted(playerPos: THREE.Vector3, spotter: BotController) {
    const isFirstContact = this.timeSincePlayerSpotted > 6.0;
    this.lastKnownPlayerPos = playerPos.clone();
    this.timeSincePlayerSpotted = 0;
    this.squadAlertLevel = 'combat';

    // Broadcast authentic tactical radio voice bark on contact
    if (isFirstContact) {
      const contactBarks = [
        'Contact front! Hostile engaged!',
        'Visual on target! Open fire!',
        'Hostile in sector! Engage, engage!',
        'Multiple contacts, watch your sectors!',
      ];
      const bark = contactBarks[Math.floor(Math.random() * contactBarks.length)];
      this.broadcastRadio(spotter, bark, 'contact');
    }

    // Coordinate squad tactics: Suppressors pin down, Flankers maneuver
    this.bots.forEach(b => {
      if (b !== spotter && !b.isDead && b.team === spotter.team) {
        const dist = b.position.distanceTo(spotter.position);
        if (dist < 40) {
          b.alertToPosition(playerPos);

          // If assigned flanker and not currently in cover/flank, trigger flank
          if (b.squadRole === 'flanker' && b.state !== 'flank' && b.state !== 'cover') {
            b.startFlankManeuver();
            this.broadcastRadio(b, 'Flanking around their blind spot, cover me!', 'flank');
          }
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
    if (this.radioChatterCooldown > 0) this.radioChatterCooldown -= dt;

    if (this.timeSincePlayerSpotted > 9.0 && this.squadAlertLevel === 'combat') {
      this.squadAlertLevel = 'investigating';
    }

    // 1. Predictive Player Trajectory & Velocity calculation
    const pMoveDelta = new THREE.Vector3().subVectors(playerPos, this.lastPlayerSamplePos);
    pMoveDelta.y = 0;
    if (dt > 0.0001) {
      this.playerVelocity.lerp(pMoveDelta.clone().divideScalar(dt), Math.min(1.0, 10.0 * dt));
    }
    this.lastPlayerSamplePos.copy(playerPos);

    // 2. Periodic Squad Role Re-balancing
    this.roleEvaluationTimer += dt;
    if (this.roleEvaluationTimer > 2.2) {
      this.roleEvaluationTimer = 0;
      this.evaluateSquadRoles('allies');
      this.evaluateSquadRoles('axis');
    }

    // 3. Camper Detection & Flushing (Tactical Grenade Lobbing)
    if (playerHealth > 0 && this.squadAlertLevel === 'combat') {
      if (this.playerVelocity.lengthSq() < 0.6) {
        this.playerCampTimer += dt;
      } else {
        this.playerCampTimer = Math.max(0, this.playerCampTimer - dt * 1.5);
      }

      if (this.playerCampTimer > 3.2 && this.grenadeManager) {
        const potentialThrowers = this.bots.filter(
          b => !b.isDead && b.team === 'axis' && b.position.distanceTo(playerPos) < 22 && b.position.distanceTo(playerPos) > 7
        );
        if (potentialThrowers.length > 0) {
          const thrower = potentialThrowers[0];
          const throwDir = new THREE.Vector3().subVectors(playerPos, thrower.position).normalize();
          this.grenadeManager.throwBotGrenade(thrower.position.clone().add(new THREE.Vector3(0, 1.5, 0)), throwDir);
          this.broadcastRadio(thrower, 'Hostile dug in! Frag out!', 'grenade', true);
          this.playerCampTimer = -6.0; // Cooldown before next flush attempt
        }
      }
    }

    // 4. Bounding Overwatch (Leapfrog) Coordination between squad pairs
    this.boundingLeapfrogTimer += dt;
    if (this.boundingLeapfrogTimer > 3.8 && this.squadAlertLevel === 'combat') {
      this.boundingLeapfrogTimer = 0;
      ['allies', 'axis'].forEach(teamStr => {
        const team = teamStr as 'allies' | 'axis';
        const teamBots = this.bots.filter(b => !b.isDead && b.team === team);
        const suppressor = teamBots.find(b => b.squadRole === 'suppressor' || b.squadRole === 'overwatch');
        const advancer = teamBots.find(b => (b.squadRole === 'pointman' || b.squadRole === 'flanker') && b !== suppressor);

        if (suppressor && advancer && advancer.state === 'cover') {
          this.broadcastRadio(suppressor, 'Laying down covering fire! Advance to next point!', 'push');
          advancer.triggerLeapfrogBound(playerPos);
        }
      });
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

  // Tactical variant effects (Flashbang & Concussion)
  public isBlind: boolean = false;
  public blindTimer: number = 0;
  public isConcussed: boolean = false;
  public concussedTimer: number = 0;

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

  // --- AAA TACTICAL INTELLIGENCE FIELDS ---
  public squadRole: SquadRole = 'suppressor';
  public tacticalAction: string = 'Patrolling Sector';
  public isSuppressed: boolean = false;
  public suppressionTimer: number = 0;
  public isFlanking: boolean = false;
  public isPeekingCover: boolean = false;
  public isCrouchedInCover: boolean = false;
  public voiceCallout: string = '';
  public coverLeanSide: 'left' | 'right' | 'none' = 'none';
  public isBlindFiring: boolean = false;
  public isCoverCompromised: boolean = false;
  public grenadeCooldown: number = 0;
  public flankPhase: 'outer_route' | 'blindspot_close' | 'breach_ambush' = 'outer_route';
  public isBoundingForward: boolean = false;

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

  // --- NEAR-MISS SUPPRESSION APPLICATION ---
  public applySuppression(intensity: number = 1.0) {
    this.isSuppressed = true;
    this.suppressionTimer = 1.4 * intensity;
    this.aimDisruptionTimer = Math.max(this.aimDisruptionTimer, 0.75 * intensity);
    this.flinchArmDisrupt = Math.min(1.0, this.flinchArmDisrupt + 0.45 * intensity);
    this.flinchLegBuckle = Math.min(0.65, this.flinchLegBuckle + 0.3 * intensity);

    if (this.state !== 'cover' && this.state !== 'dead') {
      const cover = this.findBestCover(this.squad.lastKnownPlayerPos || this.position);
      if (cover) {
        if (this.currentCover) this.currentCover.isAvailable = true;
        this.currentCover = cover;
        this.currentCover.isAvailable = false;
        this.state = 'cover';
        this.targetPos = cover.position.clone();
        this.tacticalAction = 'Seeking Cover Under Suppression';
      }
    }
  }

  // --- BOUNDING OVERWATCH (LEAPFROG ADVANCE) ---
  public triggerLeapfrogBound(threatPos: THREE.Vector3) {
    if (this.isDead || this.state === 'dead') return;
    const currentDist = this.position.distanceTo(threatPos);

    const forwardCovers = this.map.coverPoints.filter(cp => {
      if (!cp.isAvailable || cp === this.currentCover) return false;
      const cpDistToThreat = cp.position.distanceTo(threatPos);
      const cpDistToBot = this.position.distanceTo(cp.position);
      return cpDistToThreat < currentDist - 2.5 && cpDistToBot < 18;
    });

    if (forwardCovers.length > 0) {
      forwardCovers.sort((a, b) => this.position.distanceTo(a.position) - this.position.distanceTo(b.position));
      const nextCover = forwardCovers[0];
      if (this.currentCover) this.currentCover.isAvailable = true;
      this.currentCover = nextCover;
      this.currentCover.isAvailable = false;
      this.isBoundingForward = true;
      this.targetPos = nextCover.position.clone();
      this.state = 'cover';
      this.tacticalAction = 'Bounding Forward Under Covering Fire';
    }
  }

  public alertToPosition(pos: THREE.Vector3) {
    this.alertLevel = 'combat';
    if (this.state !== 'cover' && this.state !== 'attack') {
      this.state = (this.squadRole === 'flanker' || this.archetype === 'flanker') ? 'flank' : 'chase';
      if (this.state === 'flank') {
        this.startFlankManeuver();
      } else {
        this.targetPos = pos.clone();
        this.tacticalAction = 'Intercepting Target Position';
      }
    }
  }

  public pickNextWaypoint() {
    if (this.map.navNodes.length > 0) {
      const idx = Math.floor(Math.random() * this.map.navNodes.length);
      this.targetPos = this.map.navNodes[idx].clone();
      this.targetPos.x += (Math.random() - 0.5) * 4;
      this.targetPos.z += (Math.random() - 0.5) * 4;
      this.tacticalAction = 'Patrolling Sector';
    }
  }

  // --- AAA GAZE-AWARE INTELLIGENT FLANKING ---
  public startFlankManeuver() {
    this.state = 'flank';
    this.isFlanking = true;
    this.flankPhase = 'outer_route';
    this.tacticalAction = 'Maneuvering Around Blindspot';

    const pFwd = this.squad.playerForward;
    const pPos = this.squad.lastKnownPlayerPos || new THREE.Vector3();
    const toBot = new THREE.Vector3().subVectors(this.position, pPos).normalize();
    const rightCross = new THREE.Vector3().crossVectors(pFwd, new THREE.Vector3(0, 1, 0)).normalize();

    // Prefer flanking along player's blind side (opposite of forward view cone)
    const isLeft = rightCross.dot(toBot) < 0;
    const baseRoute = isLeft ? this.map.flankWaypointsLeft : this.map.flankWaypointsRight;
    this.flankPath = baseRoute.map(p => p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2.5, 0, (Math.random() - 0.5) * 2.5)));
    this.flankIndex = 0;
    if (this.flankPath.length > 0) {
      this.targetPos = this.flankPath[0];
    }
  }

  // --- AAA PHYSICAL OCCLUSION COVER EVALUATION ---
  public findBestCover(playerPos: THREE.Vector3): TacticalCoverPoint | null {
    let bestCover: TacticalCoverPoint | null = null;
    let bestScore = -999;

    this.map.coverPoints.forEach(cp => {
      if (!cp.isAvailable) return;
      const distToCover = this.position.distanceTo(cp.position);
      if (distToCover > 30) return;

      const dirToPlayer = new THREE.Vector3().subVectors(playerPos, cp.position).normalize();
      const dot = cp.facingDir.dot(dirToPlayer);

      // FacingDir must generally orient toward the threat (meaning obstacle is between them)
      if (dot < 0.15) return;

      // Physically check if crouching behind this cover blocks line-of-sight to the threat!
      const losCrouch = CollisionSystem.checkLineOfSight(cp.crouchPos, playerPos, this.map.obstacles);
      const isPhysicallyBlocked = !losCrouch.isClear;

      let score = dot * 12 - distToCover * 0.45;
      if (isPhysicallyBlocked) score += 22; // Massive reward for genuine bullet occlusion!

      const distCoverToPlayer = cp.position.distanceTo(playerPos);
      if (distCoverToPlayer < 6.0 && this.weapon !== 'shotgun') {
        score -= 16; // Too close is lethal
      }

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

  public takeDamage(damage: number, isHeadshot: boolean = false, hitDir?: THREE.Vector3, attackerTeam?: 'allies' | 'axis'): boolean {
    if (this.isDead) return false;
    // Friendly Fire Protection: Teammates cannot damage each other!
    if (attackerTeam && attackerTeam === this.team) {
      return false;
    }
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

    // Vocal radio alert when pinned down by heavy fire
    if (this.health < 48 && this.health > 0) {
      this.squad.broadcastRadio(this, 'Taking heavy fire! Pinned down!', 'pinned');
    }

    // Defensive tactical smoke reaction when caught in open terrain under lethal fire
    if (this.health < 48 && this.squad.grenadeManager && Math.random() < 0.4) {
      this.squad.grenadeManager.throwSmokeGrenade(this.position, impactDir.clone().negate());
      this.squad.broadcastRadio(this, 'Popping smoke! Moving to cover!', 'pinned');
    }

    // Tactical self-preservation: Fall back to cover when low health (< 55 HP)
    if (this.state !== 'cover' && this.health < 55) {
      const cover = this.findBestCover(this.position.clone().add(hitDir?.clone().negate() || new THREE.Vector3()));
      if (cover) {
        if (this.currentCover) this.currentCover.isAvailable = true;
        this.currentCover = cover;
        this.currentCover.isAvailable = false;
        this.state = 'cover';
        this.targetPos = cover.position.clone();
        this.tacticalAction = 'Falling Back to Cover';
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
    this.tacticalAction = 'K.I.A.';
    this.deaths++;
    this.respawnTimer = 4.5;
    this.isReloading = false;
    if (this.currentCover) {
      this.currentCover.isAvailable = true;
      this.currentCover = null;
    }

    this.squad.onBotKilled(this);

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

    // Designated Team Spawn Points
    const teamSpawns = this.map.spawnPoints.filter(s => s.team === this.team);
    const spawnList = teamSpawns.length > 0 ? teamSpawns : this.map.spawnPoints;
    const spawnPt = spawnList[Math.floor(Math.random() * spawnList.length)];
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

    // Tactical impairment timers
    if (this.blindTimer > 0) {
      this.blindTimer -= dt;
      this.isBlind = this.blindTimer > 0;
    }
    if (this.concussedTimer > 0) {
      this.concussedTimer -= dt;
      this.isConcussed = this.concussedTimer > 0;
    }

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

    // Decay suppression & tactical equipment cooldowns
    if (this.suppressionTimer > 0) {
      this.suppressionTimer -= dt;
      if (this.suppressionTimer <= 0) this.isSuppressed = false;
    }
    if (this.grenadeCooldown > 0) this.grenadeCooldown -= dt;

    // Environmental Threat Reaction: Airstrike Danger Zone Evacuation
    if (this.squad.battleRoyaleContext?.dangerZone) {
      const dz = this.squad.battleRoyaleContext.dangerZone;
      const dzCenter = new THREE.Vector3(dz.center.x, 0, dz.center.z);
      const distToDzCenter = this.position.distanceTo(dzCenter);
      if (distToDzCenter < dz.radius) {
        const escapeDir = new THREE.Vector3().subVectors(this.position, dzCenter).normalize();
        this.velocity.set(escapeDir.x * this.speed * 1.35, 0, escapeDir.z * this.speed * 1.35);
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;
        this.group.lookAt(this.position.clone().add(escapeDir));
        this.tacticalAction = 'Evacuating Airstrike Danger Zone';
        return;
      }
    }

    const isNight = weatherPreset === 'midnight_fog' || weatherPreset === 'tactical_storm';

    // 1. Target Acquisition: Find nearest valid visible hostile target
    // Allied bots ONLY target Axis bots! (Never the player)
    // Axis bots target the Player OR Allied bots!
    let targetEntity: { type: 'player'; pos: THREE.Vector3; dist: number } | { type: 'bot'; bot: BotController; pos: THREE.Vector3; dist: number } | null = null;
    let closestHostileDist = 999;

    // Check Player if this bot is Axis
    if (this.team === 'axis' && playerHealth > 0) {
      const distToPlayer = this.position.distanceTo(playerPos);
      if (this.canSeeTarget(playerPos, weatherPreset, playerFlashlightActive, playerIsCrouching, isPlayerSprinting)) {
        targetEntity = { type: 'player', pos: playerPos, dist: distToPlayer };
        closestHostileDist = distToPlayer;
      }
    }

    // Check Enemy Bots
    for (const other of allBots) {
      if (other === this || other.isDead || other.team === this.team) continue;
      const d = this.position.distanceTo(other.position);
      if (d < closestHostileDist) {
        const isOtherSprinting = other.velocity.lengthSq() > 14;
        if (this.canSeeTarget(other.position, weatherPreset, false, false, isOtherSprinting)) {
          targetEntity = { type: 'bot', bot: other, pos: other.position, dist: d };
          closestHostileDist = d;
        }
      }
    }

    const distToPlayer = this.position.distanceTo(playerPos);
    this.isVisibleToPlayer = this.checkLineOfSight(playerPos);

    // Perception & State Machine with Human Reaction Delay
    if (targetEntity) {
      if (this.alertLevel !== 'combat') {
        this.alertLevel = 'combat';
        // Human reaction delay: recruit=0.85s, regular=0.55s, plus darkness delay in night
        this.targetAcquisitionTimer = this.reactionTime + (isNight && !playerFlashlightActive ? 0.45 : 0);
        if (targetEntity.type === 'player') {
          this.squad.reportPlayerSpotted(playerPos, this);
        }
      }

      if (this.state !== 'cover' && this.state !== 'flank') {
        this.state = 'attack';
      }
    } else if (this.state === 'attack') {
      this.state = 'chase';
      this.targetAcquisitionTimer = 0;
      this.burstShotsRemaining = 0;
    }

    if (this.targetAcquisitionTimer > 0) {
      this.targetAcquisitionTimer -= dt;
    }

    // Sniper Laser sight
    if (this.sniperLaserMesh) {
      if (this.state === 'attack' && targetEntity && !this.isReloading) {
        this.sniperLaserMesh.visible = true;
      } else {
        this.sniperLaserMesh.visible = false;
      }
    }

    // Behavior Execution
    const activeTargetPos = targetEntity ? targetEntity.pos : (this.targetPos || playerPos);
    const activeTargetDist = targetEntity ? targetEntity.dist : distToPlayer;
    const isTargetPlayer = targetEntity ? targetEntity.type === 'player' : false;
    const targetBot = (targetEntity && targetEntity.type === 'bot') ? targetEntity.bot : undefined;

    switch (this.state) {
      case 'cover':
        this.updateCoverState(dt, activeTargetPos, isTargetPlayer ? onPlayerDamage : undefined, targetBot, activeTargetDist, isPlayerSprinting, isPlayerSliding, isNight);
        break;
      case 'flank':
        this.updateFlankState(dt, activeTargetPos, isTargetPlayer ? onPlayerDamage : undefined, targetBot, activeTargetDist, !!targetEntity);
        break;
      case 'attack':
        this.updateAttackState(dt, activeTargetPos, isTargetPlayer ? onPlayerDamage : undefined, targetBot, activeTargetDist, isPlayerSprinting, isPlayerSliding, isNight);
        break;
      case 'chase':
        this.updateChaseState(dt, activeTargetPos);
        break;
      case 'patrol':
      default:
        this.updatePatrolState(dt);
        break;
    }

    // Resolve Obstacle Collision (feet at y=0, eyeHeight=0 so full 1.85m bot cylinder is collision-checked)
    CollisionSystem.resolveEntityCollision(this.position, this.velocity, 0.45, 0.0, this.map.obstacles);

    // Keep bot inside map arena perimeter (Warehouse = [-43, 43], Bermuda = [-105, 105])
    const maxBound = this.map.mapType === 'bermuda' ? 105 : 43;
    this.position.x = Math.max(-maxBound, Math.min(maxBound, this.position.x));
    this.position.z = Math.max(-maxBound, Math.min(maxBound, this.position.z));

    // STRICT Ground altitude clamping (catwalk platform elevation vs floor)
    const onCatwalk = this.map.mapType !== 'bermuda' && Math.abs(this.position.x) <= 7.5 && Math.abs(this.position.z) <= 6.5 && this.position.y > 2.0;
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
      const leanZ = this.coverLeanSide === 'left' ? -0.35 : this.coverLeanSide === 'right' ? 0.35 : 0;
      this.torsoMesh.rotation.x = forwardLean + breathingSway + this.flinchPitch * 0.7;
      this.torsoMesh.rotation.z = (isMoving ? Math.sin(this.animTimer * 0.5) * 0.03 : 0) + this.flinchRoll * 0.7 + leanZ;
      this.torsoMesh.rotation.y = this.flinchYaw * 0.7;
    }

    // 2. Head Look & Flinch
    if (this.headMesh) {
      const headLeanZ = this.coverLeanSide === 'left' ? -0.22 : this.coverLeanSide === 'right' ? 0.22 : 0;
      this.headMesh.rotation.x = this.headFlinchPitch;
      this.headMesh.rotation.y = this.headFlinchYaw;
      this.headMesh.rotation.z = this.flinchRoll * 0.4 + headLeanZ;
    }

    // 3. Fluid Leg Locomotion with Natural Stride & Knee Lift + Flinch Stagger
    if (this.leftLegMesh && this.rightLegMesh) {
      if (this.isCrouchedInCover) {
        this.leftLegMesh.rotation.x = -0.65;
        this.rightLegMesh.rotation.x = -0.65;
      } else if (isMoving) {
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
      if (this.isBlindFiring) {
        // High blind-firing arm gesture over cover
        this.rightArmMesh.rotation.x = 1.35;
        this.leftArmMesh.rotation.x = 1.15;
      } else if (this.isReloading) {
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

    // Apply world position clamped firmly to ground, factoring crouch elevation
    const crouchDrop = this.isCrouchedInCover ? 0.45 : 0;
    this.group.position.set(
      this.position.x + this.flinchDisplacement.x,
      this.position.y - crouchDrop,
      this.position.z + this.flinchDisplacement.z
    );
  }

  // --- STATE HANDLERS ---
  private updateCoverState(
    dt: number,
    targetPos: THREE.Vector3,
    onPlayerDamage?: (dmg: number, botName: string, weapon: WeaponType, botPos: THREE.Vector3) => void,
    targetBot?: BotController,
    distToTarget: number = 20,
    isPlayerSprinting: boolean = false,
    isPlayerSliding: boolean = false,
    isNight: boolean = false
  ) {
    if (!this.currentCover) {
      this.state = 'attack';
      return;
    }

    if (this.magAmmo <= 0 && !this.isReloading) {
      this.startReload();
    }

    const dx = this.currentCover.position.x - this.position.x;
    const dz = this.currentCover.position.z - this.position.z;
    const distToCover = Math.sqrt(dx * dx + dz * dz);

    if (distToCover > 1.2) {
      // Moving to cover
      this.tacticalAction = this.isBoundingForward ? 'Bounding to Forward Cover' : 'Moving to Cover';
      this.isCrouchedInCover = false;
      this.isPeekingCover = false;
      this.coverLeanSide = 'none';

      const dirX = dx / distToCover;
      const dirZ = dz / distToCover;
      this.velocity.set(dirX * this.speed * 1.25, 0, dirZ * this.speed * 1.25);
      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;
      this.group.lookAt(new THREE.Vector3(this.currentCover.position.x, this.position.y, this.currentCover.position.z));
    } else {
      // Firmly at cover point!
      this.velocity.set(0, 0, 0);
      this.isBoundingForward = false;
      this.coverTimer += dt;

      // 1. Check if cover is compromised (enemy flanked past angle or has clear LOS to crouch position)
      const toThreat = new THREE.Vector3().subVectors(targetPos, this.position).normalize();
      const facingThreatDot = this.currentCover.facingDir.dot(toThreat);
      const crouchLos = CollisionSystem.checkLineOfSight(this.currentCover.crouchPos, targetPos, this.map.obstacles);

      if (facingThreatDot < 0.05 || (crouchLos.isClear && distToTarget < 18)) {
        // Cover is compromised!
        this.isCoverCompromised = true;
        this.squad.broadcastRadio(this, 'Cover compromised! Repositioning!', 'pinned');
        this.currentCover.isAvailable = true;
        this.currentCover = null;

        // Emergency reaction: Deploy tactical smoke or sprint to next cover
        if (this.squad.grenadeManager && Math.random() < 0.35) {
          this.squad.grenadeManager.throwSmokeGrenade(this.position, toThreat.clone().negate());
        }

        const newCover = this.findBestCover(targetPos);
        if (newCover) {
          this.currentCover = newCover;
          this.currentCover.isAvailable = false;
          this.targetPos = newCover.position.clone();
        } else {
          this.state = 'attack';
        }
        return;
      }

      // 2. Stance & Peeking Behavior
      const isHighCover = this.currentCover.type === 'high';
      const isSuppressorRole = this.squadRole === 'suppressor';

      if (this.isReloading) {
        // In cover and reloading - keep head down completely!
        this.isCrouchedInCover = true;
        this.isPeekingCover = false;
        this.coverLeanSide = 'none';
        this.isBlindFiring = false;
        this.tacticalAction = 'Reloading Behind Cover';
        this.group.lookAt(new THREE.Vector3(this.position.x + this.currentCover.facingDir.x, this.position.y, this.position.z + this.currentCover.facingDir.z));
        return;
      }

      // Blind-fire suppression: If low health or pinned down by player fire
      if ((this.health < 40 || this.isSuppressed) && isSuppressorRole && this.magAmmo > 0) {
        this.isCrouchedInCover = true;
        this.isPeekingCover = false;
        this.coverLeanSide = 'none';
        this.isBlindFiring = true;
        this.tacticalAction = 'Blind-Firing over Cover';

        const lookTarget = new THREE.Vector3(targetPos.x, this.position.y, targetPos.z);
        this.group.lookAt(lookTarget);

        if (this.canFire() && this.squad.requestAttackToken()) {
          this.executeBurstFire(targetPos, onPlayerDamage, targetBot, distToTarget, isPlayerSprinting, isPlayerSliding, isNight);
        }
        return;
      }

      this.isBlindFiring = false;

      if (this.isPeeking) {
        this.peekTimer += dt;
        const lookTarget = new THREE.Vector3(targetPos.x, this.position.y, targetPos.z);
        this.group.lookAt(lookTarget);

        if (isHighCover) {
          // Corner-slicing lean peek
          const rightDir = new THREE.Vector3(-toThreat.z, 0, toThreat.x);
          const leanLeft = rightDir.dot(this.currentCover.facingDir) < 0;
          this.coverLeanSide = leanLeft ? 'left' : 'right';
          this.isPeekingCover = true;
          this.isCrouchedInCover = false;
          this.tacticalAction = 'Corner Slicing & Peeking';
        } else {
          // Low cover pop-up
          this.coverLeanSide = 'none';
          this.isPeekingCover = true;
          this.isCrouchedInCover = false;
          this.tacticalAction = 'Firing from Low Cover';
        }

        const hasLoS = this.checkLineOfSight(targetPos);
        if (hasLoS && this.canFire() && this.squad.requestAttackToken()) {
          this.executeBurstFire(targetPos, onPlayerDamage, targetBot, distToTarget, isPlayerSprinting, isPlayerSliding, isNight);
        }

        if (this.peekTimer > 1.6 || this.magAmmo <= 0) {
          this.isPeeking = false;
          this.peekTimer = 0;
          this.coverTimer = 0;
          this.coverLeanSide = 'none';
          if (this.magAmmo <= 0) this.startReload();
        }
      } else {
        // Ducked down in cover
        this.isCrouchedInCover = true;
        this.isPeekingCover = false;
        this.coverLeanSide = 'none';
        this.tacticalAction = 'Holding Cover & Scanning';

        if (this.coverTimer > (this.archetype === 'sniper' ? 1.4 : 1.8) && !this.isReloading) {
          this.isPeeking = true;
          this.peekTimer = 0;
        }
      }
    }
  }

  private updateFlankState(
    dt: number,
    targetPos: THREE.Vector3,
    onPlayerDamage?: (dmg: number, botName: string, weapon: WeaponType, botPos: THREE.Vector3) => void,
    targetBot?: BotController,
    distToTarget: number = 20,
    hasTarget: boolean = true
  ) {
    this.isFlanking = true;
    this.isCrouchedInCover = false;
    this.isPeekingCover = false;
    this.coverLeanSide = 'none';

    // Calculate angle relative to target's forward view
    const pFwd = this.squad.playerForward;
    const toBot = new THREE.Vector3().subVectors(this.position, targetPos).normalize();
    const dotView = pFwd.dot(toBot); // > 0 means bot is in front of player, < 0 means behind player!

    if (distToTarget < 16 && dotView < 0.25) {
      // Reached player's flank/rear blind spot! Ambush!
      this.flankPhase = 'breach_ambush';
      this.tacticalAction = 'Ambushing Flank Angle';
      this.squad.broadcastRadio(this, 'In position! Striking hostile flank!', 'flank');
      this.state = 'attack';
      this.velocity.set(0, 0, 0);
      return;
    }

    if (this.flankIndex >= this.flankPath.length) {
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
      this.velocity.set(dirX * this.speed * 1.25, 0, dirZ * this.speed * 1.25);
      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;
      const lookTarget = new THREE.Vector3(currentWaypoint.x, this.position.y, currentWaypoint.z);
      this.group.lookAt(lookTarget);
      this.tacticalAction = `Flanking Maneuver (Node ${this.flankIndex + 1}/${this.flankPath.length})`;
    }
  }

  private updateAttackState(
    dt: number,
    targetPos: THREE.Vector3,
    onPlayerDamage?: (dmg: number, botName: string, weapon: WeaponType, botPos: THREE.Vector3) => void,
    targetBot?: BotController,
    distToTarget: number = 20,
    isPlayerSprinting: boolean = false,
    isPlayerSliding: boolean = false,
    isNight: boolean = false
  ) {
    this.tacticalAction = 'Engaging Target';
    this.isCrouchedInCover = false;
    this.isPeekingCover = false;
    this.coverLeanSide = 'none';

    const hasLoS = this.checkLineOfSight(targetPos);
    if (!hasLoS) {
      this.state = 'chase';
      this.targetPos = new THREE.Vector3(targetPos.x, 0, targetPos.z);
      this.velocity.set(0, 0, 0);
      this.burstShotsRemaining = 0;
      return;
    }

    if (this.magAmmo <= 0 && !this.isReloading) {
      this.startReload();
      const cover = this.findBestCover(targetPos);
      if (cover) {
        if (this.currentCover) this.currentCover.isAvailable = true;
        this.currentCover = cover;
        this.currentCover.isAvailable = false;
        this.state = 'cover';
        return;
      }
    }

    const lookTarget = new THREE.Vector3(targetPos.x, this.position.y, targetPos.z);
    this.group.lookAt(lookTarget);

    const dx = targetPos.x - this.position.x;
    const dz = targetPos.z - this.position.z;
    const dist2D = Math.max(0.01, Math.sqrt(dx * dx + dz * dz));
    const toTargetX = dx / dist2D;
    const toTargetZ = dz / dist2D;

    if (this.archetype === 'sniper') {
      if (distToTarget < 24) {
        this.velocity.set(-toTargetX * this.speed, 0, -toTargetZ * this.speed);
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;
      } else {
        this.velocity.set(0, 0, 0);
      }
    } else {
      if (distToTarget > 20) {
        this.velocity.set(toTargetX * this.speed, 0, toTargetZ * this.speed);
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;
      } else if (distToTarget < 6) {
        this.velocity.set(-toTargetX * this.speed * 0.85, 0, -toTargetZ * this.speed * 0.85);
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;
      } else {
        this.strafeTimer += dt;
        if (this.strafeTimer > 1.8) {
          this.strafeTimer = 0;
          this.strafeDir = Math.random() < 0.5 ? -1 : 1;
        }
        const rightX = -toTargetZ;
        const rightZ = toTargetX;
        this.velocity.set(rightX * 1.8 * this.strafeDir, 0, rightZ * 1.8 * this.strafeDir);
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;
      }
    }

    if (this.canFire() && this.squad.requestAttackToken()) {
      this.executeBurstFire(targetPos, onPlayerDamage, targetBot, distToTarget, isPlayerSprinting, isPlayerSliding, isNight);
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
    targetPos: THREE.Vector3,
    onPlayerDamage?: (dmg: number, botName: string, weapon: WeaponType, botPos: THREE.Vector3) => void,
    targetBot?: BotController,
    distToTarget: number = 20,
    isPlayerSprinting: boolean = false,
    isPlayerSliding: boolean = false,
    isNight: boolean = false
  ) {
    const hasLoS = this.checkLineOfSight(targetPos);
    if (!hasLoS) {
      this.burstShotsRemaining = 0;
      this.state = 'chase';
      this.targetPos = new THREE.Vector3(targetPos.x, 0, targetPos.z);
      return;
    }

    const wpnCfg = WEAPON_REGISTRY[this.weapon];

    if (this.burstShotsRemaining <= 0) {
      if (this.weapon === 'm4') {
        this.burstShotsRemaining = Math.floor(Math.random() * 2) + 3;
      } else if (this.weapon === 'mp5') {
        this.burstShotsRemaining = Math.floor(Math.random() * 3) + 3;
      } else if (this.weapon === 'deagle') {
        this.burstShotsRemaining = Math.floor(Math.random() * 2) + 2;
      } else {
        this.burstShotsRemaining = 1;
      }
    }

    this.shootAtTarget(targetPos, onPlayerDamage, targetBot, distToTarget, isPlayerSprinting, isPlayerSliding, isNight);
    this.magAmmo--;
    this.burstShotsRemaining--;

    const cyclicInterval = 60 / wpnCfg.fireRateRpm;

    if (this.burstShotsRemaining > 0 && this.magAmmo > 0) {
      this.fireTimer = cyclicInterval;
    } else {
      let pauseDuration = 0.8;
      if (this.weapon === 'sniper') {
        pauseDuration = 2.0;
      } else if (this.weapon === 'shotgun') {
        pauseDuration = 1.3;
      } else if (this.weapon === 'm4') {
        pauseDuration = 0.85 + Math.random() * 0.45;
      } else if (this.weapon === 'mp5') {
        pauseDuration = 0.75 + Math.random() * 0.4;
      } else if (this.weapon === 'deagle') {
        pauseDuration = 0.9 + Math.random() * 0.5;
      }

      if (this.difficulty === 'recruit') pauseDuration *= 1.45;
      if (this.difficulty === 'hardened') pauseDuration *= 0.85;
      if (this.difficulty === 'veteran') pauseDuration *= 0.7;

      this.burstPauseTimer = pauseDuration;
      this.burstShotsRemaining = 0;
      this.fireTimer = pauseDuration;
    }
  }

  private updateChaseState(dt: number, targetPos: THREE.Vector3) {
    if (!this.targetPos) this.targetPos = new THREE.Vector3(targetPos.x, 0, targetPos.z);
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

  // --- REALISTIC PERCEPTION: VISION CONE & HUMAN NIGHT-BLINDNESS LIMITATIONS ---
  private canSeeTarget(
    targetPos: THREE.Vector3,
    weatherPreset: string,
    playerFlashlightActive: boolean = false,
    targetIsCrouching: boolean = false,
    targetIsSprinting: boolean = false
  ): boolean {
    const isNight = weatherPreset === 'midnight_fog' || weatherPreset === 'tactical_storm';
    const dist = this.position.distanceTo(targetPos);

    // 1. Forward Vision Cone Check
    // Real players CANNOT see behind their heads!
    const botForward = new THREE.Vector3(0, 0, 1).applyEuler(this.group.rotation);
    botForward.y = 0;
    botForward.normalize();

    const dirToTarget = new THREE.Vector3().subVectors(targetPos, this.position);
    dirToTarget.y = 0;
    dirToTarget.normalize();

    const angleDot = botForward.dot(dirToTarget);

    // If target is behind the bot (> 100 degrees away from forward):
    if (angleDot < -0.15) {
      // Completely blind unless target is sprinting directly against them (< 3m)
      if (dist < 3.0 && targetIsSprinting) {
        return true;
      }
      return false;
    }

    // 2. Realistic Night Vision Limitations (Bots have human disadvantages!)
    let maxSight = this.archetype === 'sniper' ? 65 : 44;
    if (isNight) {
      // In the dark: bots CANNOT magically see you through the night!
      if (playerFlashlightActive) {
        maxSight = 32; // Flashlight gives away position from afar
      } else {
        // Natural human vision in pitch black / night fog: strictly 11 meters!
        maxSight = this.archetype === 'sniper' ? 15 : 11;
        if (targetIsCrouching) {
          // Sneaking in darkness / shadows: 7 meters!
          maxSight = 7.0;
        }
      }
    } else if (weatherPreset === 'sandstorm') {
      maxSight = playerFlashlightActive ? 28 : (this.archetype === 'sniper' ? 22 : 15);
    }

    // Peripheral vision reduction (target is in side vision)
    if (angleDot < 0.45) {
      maxSight *= 0.55;
    }

    if (dist > maxSight) {
      return false;
    }

    // 3. Raycast line of sight check
    return this.checkLineOfSight(targetPos);
  }

  private checkLineOfSight(targetPos: THREE.Vector3): boolean {
    if (this.isBlind) return false;
    const eyePos = new THREE.Vector3(this.position.x, this.position.y + 1.55, this.position.z);
    
    // Multi-elevation line-of-sight checks with smoke occlusion
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

  private shootAtTarget(
    targetPos: THREE.Vector3,
    onPlayerDamage?: (dmg: number, botName: string, weapon: WeaponType, botPos: THREE.Vector3) => void,
    targetBot?: BotController,
    dist: number = 20,
    isPlayerSprinting: boolean = false,
    isPlayerSliding: boolean = false,
    isNight: boolean = false
  ) {
    const wpnCfg = WEAPON_REGISTRY[this.weapon];

    const origin = new THREE.Vector3(this.position.x, this.position.y + 1.4, this.position.z);
    const chestTarget = new THREE.Vector3(targetPos.x, targetPos.y - 0.4, targetPos.z);

    const directCheck = CollisionSystem.checkLineOfSight(origin, chestTarget, this.map.obstacles, this.squad.smokeClouds);
    if (!directCheck.isClear && directCheck.hitPoint) {
      const dir = new THREE.Vector3().subVectors(chestTarget, origin).normalize();
      this.particles.emitMuzzleFlash(origin, dir);
      this.particles.spawnBulletTracer(origin, directCheck.hitPoint);
      soundManager.playSpatialGunshot(this.weapon, this.position, true);
      this.particles.emitImpactSparks(directCheck.hitPoint, new THREE.Vector3(0, 1, 0));
      return;
    }

    const aimTarget = chestTarget.clone();

    let effectiveAccuracy = this.accuracy;
    if (dist > 18) {
      effectiveAccuracy *= Math.max(0.35, 1 - (dist - 18) / 50);
    }
    if (isPlayerSprinting) effectiveAccuracy *= 0.65;
    if (isPlayerSliding) effectiveAccuracy *= 0.50;
    if (this.aimDisruptionTimer > 0) {
      effectiveAccuracy *= 0.35;
    }

    // Realistic human aiming handicap at night: reduced accuracy & higher spread
    if (isNight) {
      effectiveAccuracy *= 0.6;
    }

    const isAccurate = Math.random() < effectiveAccuracy;
    if (!isAccurate) {
      let spreadRadius = Math.min(4.5, 1.0 + dist * 0.07);
      if (isNight) spreadRadius *= 1.6; // Wider spread in darkness
      aimTarget.x += (Math.random() - 0.5) * spreadRadius;
      aimTarget.y += (Math.random() - 0.5) * (spreadRadius * 0.5);
      aimTarget.z += (Math.random() - 0.5) * spreadRadius;
    }

    const dir = new THREE.Vector3().subVectors(aimTarget, origin).normalize();

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
    this.weaponRecoilKick = 0.45;
    this.particles.emitMuzzleFlash(origin, dir);
    this.particles.spawnBulletTracer(origin, aimTarget);
    soundManager.playSpatialGunshot(this.weapon, this.position, false);

    if (!isAccurate && onPlayerDamage) {
      const bulletLine = new THREE.Line3(origin, aimTarget);
      const closestPoint = new THREE.Vector3();
      bulletLine.closestPointToPoint(targetPos, true, closestPoint);
      if (closestPoint.distanceTo(targetPos) < 3.8) {
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

      if (onPlayerDamage) {
        onPlayerDamage(finalDmg, this.name, this.weapon, this.position);
      } else if (targetBot && !targetBot.isDead) {
        const isKill = targetBot.takeDamage(finalDmg, false, dir);
        if (isKill) {
          this.kills++;
          this.squad.onBotKillBot?.(this.team, this.name, targetBot.name, this.weapon);
        }
      }
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
      isAiming: this.state === 'attack' || this.isPeeking || this.isPeekingCover,
      isReloading: this.isReloading,
      isVisibleToPlayer: this.isVisibleToPlayer,
      spottedByRadar: this.lastUavActive || isRecentlyActive,
      kills: this.kills,
      deaths: this.deaths,
      accuracy: this.accuracy,
      squadRole: this.squadRole,
      tacticalAction: this.tacticalAction,
      isSuppressed: this.isSuppressed,
      isFlanking: this.isFlanking,
      isPeekingCover: this.isPeekingCover || this.isPeeking,
      isCrouchedInCover: this.isCrouchedInCover,
      voiceCallout: this.voiceCallout,
    };
  }

  public destroy() {
    this.scene.remove(this.group);
  }
}
