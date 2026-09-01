import * as THREE from 'three';
import { GameSettings, HitmarkerEvent, WeaponCamo, WeaponType } from '../types';
import { soundManager } from './audio';
import { ModelFactory } from './models';
import { ParticleSystem } from './particles';
import { TacticalMap } from './map';
import { BotManager } from './ai';
import { WEAPON_REGISTRY, WEAPON_VIEWMODEL_OFFSETS } from './weapons';
import { CollisionSystem } from './collision';
import { GrenadeManager } from './grenades';
import { TrainingManager } from './training';

export class FPSController {
  public camera: THREE.PerspectiveCamera;
  public domElement: HTMLElement;
  public map: TacticalMap;
  public particles: ParticleSystem;
  public botManager: BotManager | null = null;
  public grenadeManager: GrenadeManager | null = null;
  public trainingManager: TrainingManager | null = null;
  public settings: GameSettings;

  // Player State
  public position: THREE.Vector3 = new THREE.Vector3(0, 1.7, 34);
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public isGrounded: boolean = true;
  public isSprinting: boolean = false;
  public isCrouching: boolean = false;
  public isSliding: boolean = false;
  public isAiming: boolean = false;
  public isReloading: boolean = false;
  public isShooting: boolean = false;

  public slideTimer: number = 0;
  public slideDuration: number = 0.8;
  public currentEyeHeight: number = 1.7;
  public targetEyeHeight: number = 1.7;

  // Weapons & Ammo
  public currentWeapon: WeaponType = 'm4';
  public currentCamo: WeaponCamo = 'standard';
  public ammoInMag: Record<WeaponType, number> = {
    m4: 30,
    mp5: 30,
    sniper: 5,
    shotgun: 8,
    deagle: 7,
  };
  public ammoReserve: Record<WeaponType, number> = {
    m4: 120,
    mp5: 150,
    sniper: 25,
    shotgun: 32,
    deagle: 35,
  };
  public grenadesCount: number = 2;

  // Viewmodel & Arms
  public viewmodelRig: THREE.Group = new THREE.Group();
  public weaponMesh: THREE.Group | null = null;
  public armsMesh: THREE.Group | null = null;

  // Tactical Laser & Flashlight
  public laserActive: boolean = true;
  private laserDot: THREE.Mesh | null = null;
  private laserBeam: THREE.Line | null = null;
  private flashlight: THREE.SpotLight | null = null;

  // Melee & Inspect Timers
  public isMeleeing: boolean = false;
  private meleeTimer: number = 0;
  private readonly meleeDuration: number = 0.45;
  public isInspecting: boolean = false;
  private inspectTimer: number = 0;
  private readonly inspectDuration: number = 1.8;

  // Reload Animation State
  public isTacticalReload: boolean = false;
  private reloadDuration: number = 2.4;

  // Spring-Damper Physics Recoil System
  private recoilPitch: number = 0;
  private recoilYaw: number = 0;
  private recoilRoll: number = 0;
  private recoilPitchVel: number = 0;
  private recoilYawVel: number = 0;
  private recoilRollVel: number = 0;

  // Burst pattern tracking
  private burstShotIndex: number = 0;
  private lastShotTime: number = 0;

  // Weapon Viewmodel Kick & Sway
  private weaponKickZ: number = 0;
  private weaponKickRotX: number = 0;
  private swayInertiaX: number = 0;
  private swayInertiaY: number = 0;
  private swayTime: number = 0;
  private bobTimer: number = 0;

  private fireTimer: number = 0;
  private reloadTimer: number = 0;
  private footstepTimer: number = 0;

  // Camera angles
  public yaw: number = 0;
  public pitch: number = 0;

  // Key tracking
  private keys: Record<string, boolean> = {};
  public isLocked: boolean = false;

  // Event Callbacks
  public onHitmarker: (event: HitmarkerEvent) => void = () => {};
  public onKill: (victim: string, weapon: WeaponType | 'melee' | 'grenade', isHeadshot: boolean) => void = () => {};
  public onAmmoChange: (mag: number, reserve: number) => void = () => {};
  public onGrenadeChange: (count: number) => void = () => {};
  public onTacticalChange: (count: number, type: 'smoke' | 'motion_sensor') => void = () => {};
  public onTriggerWeatherToggle?: () => void;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    map: TacticalMap,
    particles: ParticleSystem,
    settings: GameSettings
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.map = map;
    this.particles = particles;
    this.settings = settings;

    this.initViewmodel();
    this.initTacticalGear();
    this.setupInputs();
  }

  private initViewmodel() {
    this.camera.add(this.viewmodelRig);
    this.viewmodelRig.position.set(0, 0, 0);

    this.armsMesh = ModelFactory.createViewmodelArms();
    this.viewmodelRig.add(this.armsMesh);

    this.equipWeapon(this.currentWeapon, this.currentCamo);
  }

  private initTacticalGear() {
    // Tactical Laser Dot on surfaces
    const dotGeo = new THREE.SphereGeometry(0.02, 8, 8);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.9 });
    this.laserDot = new THREE.Mesh(dotGeo, dotMat);
    this.laserDot.visible = false;
    this.map.scene.add(this.laserDot);

    // Laser Beam
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00ff66, transparent: true, opacity: 0.45 });
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -20)]);
    this.laserBeam = new THREE.Line(lineGeo, lineMat);
    this.laserBeam.visible = false;
    this.camera.add(this.laserBeam);

    // Tactical Weapon Flashlight
    this.flashlight = new THREE.SpotLight(0xffffff, 2.5, 35, Math.PI / 6, 0.4, 1.2);
    this.flashlight.position.set(0.2, -0.1, -0.2);
    this.flashlight.target.position.set(0, 0, -10);
    this.camera.add(this.flashlight);
    this.camera.add(this.flashlight.target);
    this.flashlight.visible = true;
  }

  public equipWeapon(type: WeaponType, camo: WeaponCamo = this.currentCamo) {
    this.currentWeapon = type;
    this.currentCamo = camo;
    this.burstShotIndex = 0;
    this.isReloading = false;
    this.isInspecting = false;
    this.isMeleeing = false;

    if (this.weaponMesh) {
      this.viewmodelRig.remove(this.weaponMesh);
    }

    this.weaponMesh = ModelFactory.createWeaponMesh(type, camo);
    this.viewmodelRig.add(this.weaponMesh);

    soundManager.playReload(type, 'cock');
    this.onAmmoChange(this.ammoInMag[type], this.ammoReserve[type]);
  }

  private setupInputs() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;

      // Reload
      if (e.code === 'KeyR' && !this.isReloading && !this.isMeleeing) {
        this.reload();
      }

      // Quick Melee (V Key)
      if (e.code === 'KeyV' && !this.isMeleeing) {
        this.performMelee();
      }

      // Frag Grenade (G Key)
      if (e.code === 'KeyG' && !this.isMeleeing) {
        this.throwGrenade();
      }

      // Tactical Equipment Deploy (Q Key) - Smoke Grenade or Motion Sensor
      if (e.code === 'KeyQ' && !this.isMeleeing) {
        this.deployTactical();
      }

      // Tactical Equipment Toggle Slot (X Key) - Switch Smoke <-> Motion Sensor
      if (e.code === 'KeyX' && !this.isMeleeing) {
        this.toggleTacticalType();
      }

      // Laser / Flashlight Toggle (F Key)
      if (e.code === 'KeyF') {
        this.toggleTacticalGear();
      }

      // Weather / Environment Shift (T Key)
      if (e.code === 'KeyT') {
        if (this.onTriggerWeatherToggle) {
          this.onTriggerWeatherToggle();
        }
      }

      // Inspect Weapon (I Key)
      if (e.code === 'KeyI' && !this.isReloading && !this.isShooting && !this.isMeleeing) {
        this.inspectWeapon();
      }

      // Weapon quick switch keys 1-5
      if (e.code === 'Digit1') this.equipWeapon('m4');
      if (e.code === 'Digit2') this.equipWeapon('mp5');
      if (e.code === 'Digit3') this.equipWeapon('sniper');
      if (e.code === 'Digit4') this.equipWeapon('shotgun');
      if (e.code === 'Digit5') this.equipWeapon('deagle');

      // Reset Range Targets (K Key)
      if (e.code === 'KeyK' && this.trainingManager) {
        this.trainingManager.resetAllTargets();
      }

      // Slide trigger (Crouch while sprinting)
      if ((e.code === 'KeyC' || e.code === 'ControlLeft') && this.isSprinting && this.isGrounded && !this.isSliding) {
        this.startSlide();
      }
    });

    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });

    this.domElement.addEventListener('mousedown', e => {
      if (!this.isLocked) {
        this.domElement.requestPointerLock();
        soundManager.init();
        return;
      }

      if (e.button === 0) {
        this.isShooting = true;
        this.tryShoot();
      } else if (e.button === 1) {
        // Middle Click = Melee
        this.performMelee();
      } else if (e.button === 2) {
        this.isAiming = true;
      }
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 0) {
        this.isShooting = false;
      } else if (e.button === 2) {
        this.isAiming = false;
      }
    });

    window.addEventListener('mousemove', e => {
      if (!this.isLocked) return;

      const sens = (this.settings.mouseSensitivity || 1.0) * 0.0022;
      const invert = this.settings.invertY ? -1 : 1;

      this.yaw -= e.movementX * sens;
      this.pitch -= e.movementY * sens * invert;
      this.pitch = Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, this.pitch));

      // Viewmodel mouse inertia lag
      const inertiaMult = this.isAiming ? 0.0003 : 0.0012;
      this.swayInertiaX -= e.movementX * inertiaMult;
      this.swayInertiaY += e.movementY * inertiaMult;
      this.swayInertiaX = Math.max(-0.06, Math.min(0.06, this.swayInertiaX));
      this.swayInertiaY = Math.max(-0.06, Math.min(0.06, this.swayInertiaY));
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
    });
  }

  private startSlide() {
    this.isSliding = true;
    this.slideTimer = this.slideDuration;
    soundManager.playSlide();
    this.particles.emitImpactSparks(this.position.clone().add(new THREE.Vector3(0, 0.1, 0)), new THREE.Vector3(0, 1, 0));
    this.botManager?.notifySound(this.position, 18, false);
  }

  public reload() {
    const wpnCfg = WEAPON_REGISTRY[this.currentWeapon];
    const current = this.ammoInMag[this.currentWeapon];
    const reserve = this.ammoReserve[this.currentWeapon];

    if (reserve <= 0 || this.isReloading || this.isMeleeing) return;

    // Check tactical reload: magazine not empty, round already in chamber (+1 capacity enabled)
    const isTactical = current > 0;
    const maxCapacity = isTactical ? (wpnCfg.magSize + 1) : wpnCfg.magSize;
    if (current >= maxCapacity) return;

    this.isReloading = true;
    this.isTacticalReload = isTactical;
    this.isInspecting = false;
    this.reloadDuration = isTactical ? (wpnCfg.tacticalReloadTimeSec || wpnCfg.reloadTimeSec * 0.7) : wpnCfg.reloadTimeSec;
    this.reloadTimer = this.reloadDuration;

    soundManager.playReload(this.currentWeapon, 'mag_out');
    if (isTactical) {
      setTimeout(() => {
        if (this.isReloading && this.isTacticalReload) {
          soundManager.playReload(this.currentWeapon, 'mag_in');
        }
      }, (this.reloadDuration * 0.5) * 1000);
    } else {
      setTimeout(() => {
        if (this.isReloading && !this.isTacticalReload) {
          soundManager.playReload(this.currentWeapon, 'mag_in');
        }
      }, (this.reloadDuration * 0.45) * 1000);
      setTimeout(() => {
        if (this.isReloading && !this.isTacticalReload) {
          soundManager.playReload(this.currentWeapon, 'cock');
        }
      }, (this.reloadDuration * 0.8) * 1000);
    }
  }

  public performMelee() {
    if (this.isMeleeing) return;
    this.isMeleeing = true;
    this.meleeTimer = this.meleeDuration;
    this.isReloading = false;
    this.isInspecting = false;

    const eyePos = this.camera.position.clone();
    const forwardDir = this.camera.getWorldDirection(new THREE.Vector3());

    // Melee swing visual blade particle
    this.particles.emitKnifeSlashEffect(eyePos.clone().addScaledVector(forwardDir, 0.7), forwardDir);

    let hasHit = false;
    if (this.botManager) {
      for (const bot of this.botManager.bots) {
        if (bot.isDead) continue;
        const dist = bot.position.distanceTo(eyePos);
        if (dist < 2.6) {
          const dirToBot = new THREE.Vector3().subVectors(bot.position, eyePos).normalize();
          const angle = forwardDir.angleTo(dirToBot);
          if (angle < Math.PI / 3) {
            hasHit = true;
            const isKill = bot.takeDamage(125, true, forwardDir);
            soundManager.playKnifeSlash(true);
            this.particles.emitBloodSplatter(bot.position.clone().add(new THREE.Vector3(0, 1.2, 0)), forwardDir);
            this.onHitmarker({ type: isKill ? 'kill' : 'body', timestamp: Date.now() });
            if (isKill) {
              this.onKill(bot.name, 'melee', false);
            }
            break;
          }
        }
      }
    }

    // 2. Check Target Dummies in Melee Range (Training Mode)
    if (!hasHit && this.trainingManager) {
      for (const dummy of this.trainingManager.dummies) {
        if (dummy.isDown) continue;
        const dist = this.position.distanceTo(dummy.position);
        if (dist < 2.8) {
          const dirToDummy = new THREE.Vector3().subVectors(dummy.position, this.position).normalize();
          const angle = forwardDir.angleTo(dirToDummy);
          if (angle < Math.PI / 3) {
            hasHit = true;
            const result = dummy.takeDamage(120, false, 'MELEE');
            soundManager.playKnifeSlash(true);
            this.particles.emitImpactSparks(dummy.position.clone().setY(1.4), forwardDir);
            this.onHitmarker({ type: result.isKill ? 'kill' : 'body', timestamp: Date.now() });
            this.trainingManager.recordHit(result.actualDmg, dummy.distanceToFiringPad, 'MELEE SLASH', false, result.isKill);
            if (result.isKill) {
              this.onKill(dummy.name, 'melee', false);
            }
            break;
          }
        }
      }
    }

    if (!hasHit) {
      soundManager.playKnifeSlash(false);
    }
  }

  public throwGrenade() {
    if (this.grenadesCount <= 0 || !this.grenadeManager) return;
    this.grenadesCount--;
    this.onGrenadeChange(this.grenadesCount);

    const eyePos = this.camera.position.clone();
    const forwardDir = this.camera.getWorldDirection(new THREE.Vector3());
    const throwOrigin = eyePos.clone().addScaledVector(forwardDir, 0.5);

    this.grenadeManager.throwGrenade(throwOrigin, forwardDir, this.velocity);
    this.weaponKickZ = 0.08;
    this.weaponKickRotX = -0.15;
  }

  public deployTactical() {
    if (!this.grenadeManager || this.grenadeManager.getTacticalCount() <= 0) return;

    const eyePos = this.camera.position.clone();
    const forwardDir = this.camera.getWorldDirection(new THREE.Vector3());
    const origin = eyePos.clone().addScaledVector(forwardDir, 0.45);

    const success = this.grenadeManager.deployTactical(origin, forwardDir, this.velocity);
    if (success) {
      this.weaponKickZ = 0.06;
      this.weaponKickRotX = -0.12;
      this.onTacticalChange(this.grenadeManager.getTacticalCount(), this.grenadeManager.getTacticalType());
    }
  }

  public toggleTacticalType() {
    if (!this.grenadeManager) return;
    const newType = this.grenadeManager.toggleTacticalType();
    this.onTacticalChange(this.grenadeManager.getTacticalCount(), newType);
  }

  public toggleTacticalGear() {
    this.laserActive = !this.laserActive;
    if (this.flashlight) this.flashlight.visible = this.laserActive;
    if (this.laserDot) this.laserDot.visible = this.laserActive;
    if (this.laserBeam) this.laserBeam.visible = this.laserActive;
    soundManager.playLaserToggle();
  }

  public inspectWeapon() {
    this.isInspecting = true;
    this.inspectTimer = this.inspectDuration;
    soundManager.playInspect();
  }

  public tryShoot() {
    if (this.isReloading || this.isMeleeing || this.fireTimer > 0) return;

    const wpnCfg = WEAPON_REGISTRY[this.currentWeapon];
    if (this.ammoInMag[this.currentWeapon] <= 0) {
      this.reload();
      return;
    }

    // Deduct ammo
    this.ammoInMag[this.currentWeapon]--;

    // Keep reserve full in training mode if infinite ammo is active
    if (this.trainingManager && this.trainingManager.telemetry.infiniteAmmo) {
      this.ammoReserve[this.currentWeapon] = Math.max(100, this.ammoReserve[this.currentWeapon]);
      if (this.grenadesCount < 2) this.grenadesCount = 2;
      this.grenadeManager?.addGrenade(1);
      this.grenadeManager?.addTactical(1);
    }

    this.onAmmoChange(this.ammoInMag[this.currentWeapon], this.ammoReserve[this.currentWeapon]);
    this.trainingManager?.recordShotFired();

    this.fireTimer = 60 / wpnCfg.fireRateRpm;
    this.isInspecting = false;

    // Reset burst index if pause between shots > 0.28s
    const now = performance.now() / 1000;
    if (now - this.lastShotTime > 0.28) {
      this.burstShotIndex = 0;
    }
    this.lastShotTime = now;

    // Retrieve precise recoil curve point
    const patternList = wpnCfg.recoilPattern;
    const patternPoint = patternList[this.burstShotIndex % patternList.length];
    this.burstShotIndex++;

    const aimScale = this.isAiming ? 0.45 : 1.0;
    const kickPitch = (patternPoint.y + (Math.random() - 0.5) * 0.005) * aimScale;
    const kickYaw = (patternPoint.x + (Math.random() - 0.5) * 0.006) * aimScale;

    // Apply impulse velocity into spring-damper
    this.recoilPitchVel += kickPitch * 65.0;
    this.recoilYawVel += kickYaw * 50.0;
    this.recoilRollVel += (kickYaw * 15.0);

    // Viewmodel punch back & snap up
    this.weaponKickZ = this.isAiming ? 0.04 : 0.09;
    this.weaponKickRotX = this.isAiming ? 0.05 : 0.12;

    // Play gunshot audio
    soundManager.playGunshot(this.currentWeapon);

    // Alert AI bots of gunshot sound
    this.botManager?.notifySound(this.camera.position, 65, true);

    // Muzzle FX & Shell Casing
    const muzzlePos = this.camera.position.clone().add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(0.7));
    const forwardDir = this.camera.getWorldDirection(new THREE.Vector3());
    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);

    this.particles.emitMuzzleFlash(muzzlePos, forwardDir);
    this.particles.emitShellCasing(muzzlePos.clone().add(rightDir.clone().multiplyScalar(0.15)), rightDir);

    // Simulate Ballistics with Bullet Drop & Material Penetration
    this.simulateBallistics(wpnCfg);
  }

  // --- SOPHISTICATED BALLISTICS & BULLET DROP SIMULATION ---
  private simulateBallistics(wpnCfg: typeof WEAPON_REGISTRY[WeaponType]) {
    const pellets = wpnCfg.pelletCount || 1;
    const muzzleVelocity = wpnCfg.muzzleVelocity; // e.g. 880 m/s
    const gravity = 9.81 * wpnCfg.bulletDropRate;

    for (let p = 0; p < pellets; p++) {
      const spreadVal = this.isAiming ? wpnCfg.spreadAds : this.isSprinting ? wpnCfg.spreadHip * 2.2 : wpnCfg.spreadHip;
      const spreadX = (Math.random() - 0.5) * spreadVal;
      const spreadY = (Math.random() - 0.5) * spreadVal;

      const shootDir = this.camera.getWorldDirection(new THREE.Vector3());
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);

      shootDir.addScaledVector(right, spreadX);
      shootDir.addScaledVector(up, spreadY);
      shootDir.normalize();

      let currentPos = this.camera.position.clone();
      let velocity = shootDir.clone().multiplyScalar(muzzleVelocity);
      let totalDistanceTraveled = 0;
      let currentDamage = wpnCfg.damage;
      let currentPenetration = wpnCfg.penetrationPower;

      const timeStep = 0.016; // 16ms simulation increments
      const maxSteps = 40;
      let hitOccurred = false;
      let finalHitPoint = currentPos.clone().addScaledVector(shootDir, 80);

      for (let step = 0; step < maxSteps && !hitOccurred; step++) {
        const nextPos = currentPos.clone().addScaledVector(velocity, timeStep);
        velocity.y -= gravity * timeStep;

        const segmentDir = new THREE.Vector3().subVectors(nextPos, currentPos);
        const segmentDist = segmentDir.length();
        segmentDir.normalize();

        const ray = new THREE.Raycaster(currentPos, segmentDir, 0.02, segmentDist);

        // 1. Raycast against Obstacles & Walls (Dual AABB/OBB + Mesh verification)
        const wallCheck = CollisionSystem.checkLineOfSight(currentPos, nextPos, this.map.obstacles);
        const obstacleMeshes = this.map.obstacles.map(o => o.mesh);
        const wallHits = ray.intersectObjects(obstacleMeshes, true);

        let closestWallDist = Infinity;
        let wallHitPoint: THREE.Vector3 | null = null;
        let wallHitNormal = new THREE.Vector3(0, 1, 0);
        let hitWallObj: THREE.Object3D | null = null;

        if (!wallCheck.isClear && wallCheck.hitPoint) {
          closestWallDist = wallCheck.hitDist;
          wallHitPoint = wallCheck.hitPoint;
          hitWallObj = wallCheck.hitObject;
        }

        if (wallHits.length > 0 && wallHits[0].distance < closestWallDist) {
          closestWallDist = wallHits[0].distance;
          wallHitPoint = wallHits[0].point;
          if (wallHits[0].face) wallHitNormal = wallHits[0].face.normal;
          hitWallObj = wallHits[0].object;
        }

        // 2. Raycast against Training Target Dummies & Steel Plates (Priority if in Training)
        let hitTraining = false;
        if (this.trainingManager) {
          const trainRes = this.trainingManager.testRaycast(ray, Math.min(segmentDist, closestWallDist), this.currentWeapon, currentDamage);
          if (trainRes.hit && trainRes.hitPoint) {
            hitOccurred = true;
            hitTraining = true;
            finalHitPoint = trainRes.hitPoint;
            this.onHitmarker({
              type: trainRes.isHeadshot ? 'headshot' : 'body',
              timestamp: Date.now(),
            });
            if (trainRes.isDummy && trainRes.dummy && trainRes.dummy.isDown) {
              this.onKill(trainRes.dummy.name, this.currentWeapon, trainRes.isHeadshot);
            }
            break;
          }
        }

        // 3. Raycast against Enemy Bots
        let hitBot: any = null;
        let isHeadshot = false;
        let botHitDist = Infinity;

        if (this.botManager) {
          for (const bot of this.botManager.bots) {
            if (bot.isDead) continue;
            const botHits = ray.intersectObjects(bot.group.children, true);
            if (botHits.length > 0 && botHits[0].distance < botHitDist) {
              botHitDist = botHits[0].distance;
              hitBot = bot;
              isHeadshot = botHits[0].object.name === 'head' || botHits[0].point.y > (bot.position.y + 1.45);
            }
          }
        }

        if (hitBot && botHitDist < closestWallDist) {
          // Bot Hit!
          hitOccurred = true;
          finalHitPoint = currentPos.clone().addScaledVector(segmentDir, botHitDist);
          this.particles.emitBloodSplatter(finalHitPoint, segmentDir);

          totalDistanceTraveled += botHitDist;
          let effectiveDmg = currentDamage;

          // Damage Falloff calculation
          if (totalDistanceTraveled > wpnCfg.damageFalloffStart) {
            const falloffRatio = Math.min(1, (totalDistanceTraveled - wpnCfg.damageFalloffStart) / (wpnCfg.damageFalloffEnd - wpnCfg.damageFalloffStart));
            effectiveDmg = wpnCfg.damage - falloffRatio * (wpnCfg.damage - wpnCfg.minDamage);
          }

          const finalDmg = isHeadshot ? Math.floor(effectiveDmg * wpnCfg.headshotMultiplier) : Math.floor(effectiveDmg);
          const isKill = hitBot.takeDamage(finalDmg, isHeadshot, segmentDir);

          soundManager.playHitmarker(isHeadshot, isKill);
          this.onHitmarker({
            type: isKill ? 'kill' : isHeadshot ? 'headshot' : 'body',
            timestamp: Date.now(),
          });

          if (isKill) {
            this.onKill(hitBot.name, this.currentWeapon, isHeadshot);
          }
          break;
        } else if (closestWallDist < Infinity && hitWallObj && wallHitPoint) {
          // Wall / Prop Hit!
          finalHitPoint = wallHitPoint;

          // Check if this obstacle is destructible
          const prop = this.map.destruction.getPropByMesh(hitWallObj);
          if (prop && !prop.isDestroyed) {
            this.map.destruction.damageProp(prop.id, currentDamage, wallHitPoint, wallHitNormal, this.currentWeapon);
            this.onHitmarker({ type: 'destructible', timestamp: Date.now() });

            // Material penetration: high penetration allows bullet to continue through with reduced damage
            if (currentPenetration > 0 && prop.type !== 'explosive_barrel') {
              currentPenetration--;
              currentDamage *= 0.55; // 55% damage on exit
              currentPos = wallHitPoint.clone().addScaledVector(segmentDir, 0.4);
              continue;
            }
          } else {
            this.particles.emitImpactSparks(wallHitPoint, wallHitNormal);
          }

          hitOccurred = true;
          break;
        }

        currentPos = nextPos;
      }

      // Spawn dynamic Tracer
      this.particles.spawnBulletTracer(this.camera.position.clone().add(shootDir.clone().multiplyScalar(0.4)), finalHitPoint);
    }
  }

  // --- FRAME UPDATE ---
  public update(dt: number) {
    if (!this.isLocked) return;

    // Automatic fire trigger
    const wpnCfg = WEAPON_REGISTRY[this.currentWeapon];
    if (this.isShooting && wpnCfg.fullAuto) {
      this.tryShoot();
    }

    this.fireTimer = Math.max(0, this.fireTimer - dt);

    // Melee Timer
    if (this.isMeleeing) {
      this.meleeTimer -= dt;
      if (this.meleeTimer <= 0) {
        this.isMeleeing = false;
      }
    }

    // Inspect Timer
    if (this.isInspecting) {
      this.inspectTimer -= dt;
      if (this.inspectTimer <= 0) {
        this.isInspecting = false;
      }
    }

    // Reload progress
    if (this.isReloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        const current = this.ammoInMag[this.currentWeapon];
        const maxCapacity = this.isTacticalReload ? (wpnCfg.magSize + 1) : wpnCfg.magSize;
        const needed = maxCapacity - current;
        const toLoad = Math.min(needed, this.ammoReserve[this.currentWeapon]);
        this.ammoInMag[this.currentWeapon] += toLoad;
        this.ammoReserve[this.currentWeapon] -= toLoad;
        this.onAmmoChange(this.ammoInMag[this.currentWeapon], this.ammoReserve[this.currentWeapon]);
      }
    }

    // Movement & Physics with Full Obstacle Collisions
    this.updateMovement(dt);

    // Update Tactical Laser Sight
    this.updateLaserSight();

    // Camera FOV & ADS Zoom
    const targetFov = this.isAiming ? wpnCfg.adsFov : this.settings.fieldOfView || 85;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, dt * 16);
    this.camera.updateProjectionMatrix();

    // Spring-Damper Physics Recoil Integration
    const k = wpnCfg.recoilSpringRate; // Spring stiffness
    const d = wpnCfg.recoilDampingRate; // Damping factor

    // Pitch Spring
    const pitchForce = -k * this.recoilPitch - d * this.recoilPitchVel;
    this.recoilPitchVel += pitchForce * dt;
    this.recoilPitch += this.recoilPitchVel * dt;

    // Yaw Spring
    const yawForce = -k * this.recoilYaw - d * this.recoilYawVel;
    this.recoilYawVel += yawForce * dt;
    this.recoilYaw += this.recoilYawVel * dt;

    // Roll Spring
    const rollForce = -k * this.recoilRoll - d * this.recoilRollVel;
    this.recoilRollVel += rollForce * dt;
    this.recoilRoll += this.recoilRollVel * dt;

    // Decay Viewmodel Kick
    this.weaponKickZ = THREE.MathUtils.lerp(this.weaponKickZ, 0, dt * 18);
    this.weaponKickRotX = THREE.MathUtils.lerp(this.weaponKickRotX, 0, dt * 18);

    // Decay Sway Inertia
    this.swayInertiaX = THREE.MathUtils.lerp(this.swayInertiaX, 0, dt * 10);
    this.swayInertiaY = THREE.MathUtils.lerp(this.swayInertiaY, 0, dt * 10);

    // Apply Camera Rotation with Recoil
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw + this.recoilYaw;
    this.camera.rotation.x = this.pitch + this.recoilPitch;
    this.camera.rotation.z = this.recoilRoll;

    // Viewmodel Positioning, Breathing Sway, Reload & Melee Choreography
    this.updateViewmodel(dt);
  }

  private updateLaserSight() {
    if (!this.laserActive || !this.laserDot || !this.laserBeam) return;

    const eyePos = this.camera.position.clone();
    const forwardDir = this.camera.getWorldDirection(new THREE.Vector3());
    const ray = new THREE.Raycaster(eyePos, forwardDir, 0.2, 50);

    const obstacleMeshes = this.map.obstacles.map(o => o.mesh);
    const hits = ray.intersectObjects(obstacleMeshes, true);

    if (hits.length > 0) {
      this.laserDot.visible = true;
      this.laserDot.position.copy(hits[0].point);
      this.laserBeam.visible = true;
    } else {
      this.laserDot.visible = false;
      this.laserBeam.visible = true;
    }
  }

  private updateMovement(dt: number) {
    this.isCrouching = this.keys['KeyC'] || this.keys['ControlLeft'];
    this.isSprinting = (this.keys['ShiftLeft'] || this.keys['ShiftRight']) && (this.keys['KeyW'] || this.keys['ArrowUp']) && !this.isCrouching && !this.isAiming;

    // Eye height lerp
    this.targetEyeHeight = this.isSliding ? 0.7 : this.isCrouching ? 0.95 : 1.7;
    this.currentEyeHeight = THREE.MathUtils.lerp(this.currentEyeHeight, this.targetEyeHeight, dt * 14);

    let baseSpeed = 6.0;
    if (this.isAiming) baseSpeed = 3.0;
    else if (this.isCrouching) baseSpeed = 3.2;
    else if (this.isSprinting) baseSpeed = 9.5;

    if (this.isSliding) {
      this.slideTimer -= dt;
      baseSpeed = 12.0 * (this.slideTimer / this.slideDuration);
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    const moveVector = new THREE.Vector3();
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveVector.z -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveVector.z += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveVector.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveVector.x += 1;

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize();
      moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      this.velocity.x = moveVector.x * baseSpeed;
      this.velocity.z = moveVector.z * baseSpeed;

      // Footstep audio
      this.footstepTimer += dt * (this.isSprinting ? 2.8 : 1.8);
      if (this.footstepTimer >= 1.0 && this.isGrounded && !this.isSliding) {
        this.footstepTimer = 0;
        soundManager.playFootstep(this.isSprinting);
        if (this.isSprinting) {
          this.botManager?.notifySound(this.position, 16, false);
        }
      }
    } else {
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, 0, dt * 10);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, 0, dt * 10);
    }

    // Jump & Gravity
    if (this.keys['Space'] && this.isGrounded && !this.isSliding) {
      this.velocity.y = 6.2;
      this.isGrounded = false;
      soundManager.playJump();
    }

    if (!this.isGrounded) {
      this.velocity.y -= 18.0 * dt;
    }

    // Integrate Position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // Floor collision
    if (this.position.y <= this.currentEyeHeight) {
      if (!this.isGrounded && this.velocity.y < -4) {
        soundManager.playLand();
      }
      this.position.y = this.currentEyeHeight;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // CRITICAL: Robust Entity-Obstacle Collision Resolution
    CollisionSystem.resolveEntityCollision(this.position, this.velocity, 0.48, this.currentEyeHeight, this.map.obstacles);

    // Arena Perimeter Boundaries
    this.position.x = Math.max(-43, Math.min(43, this.position.x));
    this.position.z = Math.max(-43, Math.min(43, this.position.z));

    this.camera.position.copy(this.position);
  }

  private updateViewmodel(dt: number) {
    if (!this.weaponMesh) return;

    const wpnCfg = WEAPON_REGISTRY[this.currentWeapon];
    const offsetCfg = WEAPON_VIEWMODEL_OFFSETS[this.currentWeapon];
    let targetOffset = this.isAiming ? { ...offsetCfg.ads } : this.isSprinting ? { ...offsetCfg.sprint } : { ...offsetCfg.hip };

    // Dual-harmonic breathing sway
    this.swayTime += dt * wpnCfg.swaySpeed;
    const swayAmp = this.isAiming ? wpnCfg.swayAmplitude * 0.15 : wpnCfg.swayAmplitude;
    const swayX = Math.cos(this.swayTime * 0.8) * swayAmp;
    const swayY = Math.sin(this.swayTime * 1.6) * swayAmp;

    // Walk & sprint bobbing
    const isMoving = this.velocity.x !== 0 || this.velocity.z !== 0;
    this.bobTimer += dt * (this.isSprinting ? 14 : isMoving ? 9 : 2);
    const bobX = Math.cos(this.bobTimer * 0.5) * (this.isAiming ? 0.0006 : isMoving ? 0.015 : 0.003);
    const bobY = Math.sin(this.bobTimer) * (this.isAiming ? 0.0006 : isMoving ? 0.018 : 0.004);

    // Strafe banking roll
    const strafeRoll = (this.keys['KeyA'] || this.keys['ArrowLeft']) ? 0.04 : (this.keys['KeyD'] || this.keys['ArrowRight']) ? -0.04 : 0;

    // --- PROCEDURAL ANIMATIONS (RELOAD, MELEE, INSPECT) ---
    let reloadOffX = 0, reloadOffY = 0, reloadOffZ = 0;
    let reloadRotX = 0, reloadRotY = 0, reloadRotZ = 0;

    // Find magazine and slide sub-meshes for dynamic part translation
    let magMesh: THREE.Object3D | undefined;
    let slideMesh: THREE.Object3D | undefined;
    let pumpMesh: THREE.Object3D | undefined;

    this.weaponMesh.traverse(child => {
      if (child.name === 'magazine') magMesh = child;
      if (child.name === 'pistol_slide') slideMesh = child;
      if (child.name === 'pump_handle') pumpMesh = child;
    });

    if (this.isReloading) {
      const p = Math.max(0, Math.min(1, 1 - (this.reloadTimer / this.reloadDuration)));

      if (this.isTacticalReload) {
        // --- TACTICAL RELOAD (FAST MAGAZINE SWAP WITH CHAMBERED ROUND) ---
        if (p < 0.32) {
          // Phase 1: Tactical weapon cant & mag drop
          const sub = p / 0.32;
          reloadOffX = -0.02 * Math.sin(sub * Math.PI * 0.5);
          reloadOffY = -0.08 * Math.sin(sub * Math.PI * 0.5);
          reloadOffZ = -0.03 * sub;
          reloadRotX = -0.16 * sub;
          reloadRotY = 0.08 * sub;
          reloadRotZ = 0.24 * sub;
          if (magMesh) magMesh.position.y = -0.35 * sub;
        } else if (p < 0.72) {
          // Phase 2: Insert fresh magazine with positive lock snap
          const sub = (p - 0.32) / 0.40;
          reloadOffX = -0.02 + 0.02 * sub;
          reloadOffY = -0.08 + 0.04 * Math.sin(sub * Math.PI);
          reloadRotX = -0.16 + 0.12 * sub;
          reloadRotY = 0.08 - 0.06 * sub;
          reloadRotZ = 0.24 - 0.18 * sub;
          if (magMesh) {
            magMesh.position.y = -0.35 * (1 - sub);
          }
          // Palm slap impulse
          if (p > 0.60 && p < 0.68) {
            reloadOffY += 0.032;
            reloadRotX += 0.06;
          }
        } else {
          // Phase 3: Smooth return to operational firing stance
          const sub = (p - 0.72) / 0.28;
          if (magMesh) magMesh.position.y = 0;
          reloadOffY = -0.04 * (1 - sub);
          reloadRotX = -0.04 * (1 - sub);
          reloadRotZ = 0.06 * (1 - sub);
        }
      } else {
        // --- FULL EMPTY RELOAD (MAG DROP + INSERT + BOLT / SLIDE / PUMP RACK) ---
        if (this.currentWeapon === 'sniper') {
          // SNIPER BOLT-ACTION FULL RELOAD
          if (p < 0.20) {
            // Unlock & Pull Bolt Handle Back
            const sub = p / 0.20;
            reloadRotX = 0.08 * sub;
            reloadRotZ = -0.15 * sub;
            if (slideMesh) slideMesh.position.z = -0.12 * sub;
          } else if (p < 0.45) {
            // Eject empty box magazine
            const sub = (p - 0.20) / 0.25;
            reloadOffY = -0.12 * sub;
            reloadRotX = 0.08 - 0.25 * sub;
            reloadRotZ = -0.15 + 0.35 * sub;
            if (slideMesh) slideMesh.position.z = -0.12;
            if (magMesh) magMesh.position.y = -0.4 * sub;
          } else if (p < 0.70) {
            // Insert fresh high-caliber magazine
            const sub = (p - 0.45) / 0.25;
            reloadOffY = -0.12 + 0.06 * Math.sin(sub * Math.PI);
            reloadRotX = -0.17 + 0.15 * sub;
            reloadRotZ = 0.20 - 0.15 * sub;
            if (slideMesh) slideMesh.position.z = -0.12;
            if (magMesh) magMesh.position.y = -0.4 * (1 - sub);
          } else if (p < 0.88) {
            // Slam Bolt Forward & Lock Down
            const sub = (p - 0.70) / 0.18;
            if (magMesh) magMesh.position.y = 0;
            reloadOffZ = 0.04 * Math.sin(sub * Math.PI);
            reloadRotX = 0.05 * (1 - sub);
            reloadRotZ = -0.12 * (1 - sub);
            if (slideMesh) slideMesh.position.z = -0.12 * (1 - sub);
          } else {
            // Ready stance
            const sub = (p - 0.88) / 0.12;
            if (magMesh) magMesh.position.y = 0;
            if (slideMesh) slideMesh.position.z = 0;
            reloadOffY = -0.04 * (1 - sub);
          }
        } else if (this.currentWeapon === 'shotgun') {
          // SHOTGUN TACTICAL SHELL LOAD & PUMP ACTION
          if (p < 0.30) {
            // Roll shotgun to expose loading gate
            const sub = p / 0.30;
            reloadOffY = -0.06 * sub;
            reloadRotX = -0.15 * sub;
            reloadRotZ = 0.45 * sub;
          } else if (p < 0.70) {
            // Load shells into magazine tube
            const sub = (p - 0.30) / 0.40;
            reloadOffZ = 0.03 * Math.sin(sub * Math.PI * 2);
            reloadRotX = -0.15 + 0.08 * Math.sin(sub * Math.PI * 2);
            reloadRotZ = 0.45;
          } else if (p < 0.90) {
            // Heavy pump rack back and forward
            const sub = (p - 0.70) / 0.20;
            reloadRotZ = 0.45 * (1 - sub);
            reloadOffZ = -0.05 * Math.sin(sub * Math.PI);
            if (pumpMesh) pumpMesh.position.z = -0.14 * Math.sin(sub * Math.PI);
          } else {
            const sub = (p - 0.90) / 0.10;
            if (pumpMesh) pumpMesh.position.z = 0;
            reloadOffY = -0.03 * (1 - sub);
          }
        } else {
          // ASSAULT RIFLE / SMG / DEAGLE FULL EMPTY RELOAD
          if (p < 0.22) {
            // Phase 1: Cant weapon left, discard spent magazine
            const sub = p / 0.22;
            reloadOffY = -0.11 * Math.sin(sub * Math.PI * 0.5);
            reloadRotX = -0.22 * sub;
            reloadRotY = 0.06 * sub;
            reloadRotZ = 0.38 * sub;
            if (magMesh) magMesh.position.y = -0.42 * sub;
          } else if (p < 0.58) {
            // Phase 2: Insert fresh mag with forceful upward palm thrust
            const sub = (p - 0.22) / 0.36;
            reloadOffY = -0.11 + 0.05 * Math.sin(sub * Math.PI);
            reloadRotX = -0.22 + 0.12 * sub;
            reloadRotY = 0.06 - 0.04 * sub;
            reloadRotZ = 0.38 - 0.18 * sub;
            if (magMesh) {
              magMesh.position.y = -0.42 * (1 - sub);
            }
            if (p > 0.48 && p < 0.56) {
              reloadOffY += 0.038;
              reloadRotX += 0.07;
            }
          } else if (p < 0.86) {
            // Phase 3: Chambering round (Slide rack on Deagle / HK slap on MP5 / Bolt catch on M4)
            const sub = (p - 0.58) / 0.28;
            if (magMesh) magMesh.position.y = 0;
            reloadOffZ = -0.04 * Math.sin(sub * Math.PI);
            reloadRotX = -0.10 * (1 - sub) + 0.06 * Math.sin(sub * Math.PI);
            reloadRotZ = 0.20 * (1 - sub);

            if (slideMesh) {
              slideMesh.position.z = -0.06 * Math.sin(sub * Math.PI);
            }
          } else {
            // Phase 4: Settle to weapon ready
            const sub = (p - 0.86) / 0.14;
            if (magMesh) magMesh.position.y = 0;
            if (slideMesh) slideMesh.position.z = 0;
            reloadOffY = -0.04 * (1 - sub);
            reloadRotX = -0.04 * (1 - sub);
          }
        }
      }
    } else {
      if (magMesh) magMesh.position.y = 0;
      if (slideMesh) slideMesh.position.z = 0;
      if (pumpMesh) pumpMesh.position.z = 0;
    }

    // Quick Melee Swipe Animation
    let meleeOffX = 0, meleeOffY = 0, meleeOffZ = 0;
    let meleeRotX = 0, meleeRotY = 0, meleeRotZ = 0;
    if (this.isMeleeing) {
      const mp = 1 - (this.meleeTimer / this.meleeDuration);
      if (mp < 0.4) {
        const sub = mp / 0.4;
        meleeOffZ = -0.25 * sub;
        meleeOffX = -0.2 * sub;
        meleeRotY = 0.8 * sub;
        meleeRotZ = -0.6 * sub;
      } else {
        const sub = (mp - 0.4) / 0.6;
        meleeOffZ = -0.25 * (1 - sub);
        meleeOffX = -0.2 * (1 - sub) + 0.25 * Math.sin(sub * Math.PI);
        meleeRotY = 0.8 * (1 - sub) - 0.5 * Math.sin(sub * Math.PI);
        meleeRotZ = -0.6 * (1 - sub);
      }
    }

    // Weapon Camo Inspect Animation
    let inspectRotX = 0, inspectRotY = 0, inspectRotZ = 0;
    if (this.isInspecting) {
      const ip = 1 - (this.inspectTimer / this.inspectDuration);
      inspectRotY = Math.sin(ip * Math.PI * 2) * 0.45;
      inspectRotZ = -Math.sin(ip * Math.PI) * 0.65;
      inspectRotX = Math.sin(ip * Math.PI) * 0.15;
    }

    // Final Position & Rotation integration
    const finalX = targetOffset.x + bobX + swayX + this.swayInertiaX + reloadOffX + meleeOffX;
    const finalY = targetOffset.y + bobY + swayY + this.swayInertiaY + reloadOffY + meleeOffY;
    const finalZ = targetOffset.z + this.weaponKickZ + reloadOffZ + meleeOffZ;

    this.weaponMesh.position.x = THREE.MathUtils.lerp(this.weaponMesh.position.x, finalX, dt * 20);
    this.weaponMesh.position.y = THREE.MathUtils.lerp(this.weaponMesh.position.y, finalY, dt * 20);
    this.weaponMesh.position.z = THREE.MathUtils.lerp(this.weaponMesh.position.z, finalZ, dt * 25);

    const finalRotX = targetOffset.rx + this.weaponKickRotX - this.swayInertiaY * 1.5 + reloadRotX + meleeRotX + inspectRotX;
    const finalRotY = targetOffset.ry + this.swayInertiaX * 1.5 + reloadRotY + meleeRotY + inspectRotY;
    const finalRotZ = targetOffset.rz + strafeRoll + reloadRotZ + meleeRotZ + inspectRotZ;

    this.weaponMesh.rotation.x = THREE.MathUtils.lerp(this.weaponMesh.rotation.x, finalRotX, dt * 20);
    this.weaponMesh.rotation.y = THREE.MathUtils.lerp(this.weaponMesh.rotation.y, finalRotY, dt * 20);
    this.weaponMesh.rotation.z = THREE.MathUtils.lerp(this.weaponMesh.rotation.z, finalRotZ, dt * 18);

    // Sync Viewmodel Arms to Weapon Position
    if (this.armsMesh) {
      this.armsMesh.position.copy(this.weaponMesh.position);
      this.armsMesh.rotation.copy(this.weaponMesh.rotation);
    }
  }
}
