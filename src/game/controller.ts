import * as THREE from 'three';
import { GameSettings, HitmarkerEvent, OpticType, ReticleColor, ReticleStyle, WeaponCamo, WeaponType } from '../types';
import { soundManager } from './audio';
import { ModelFactory } from './models';
import { ParticleSystem } from './particles';
import { TacticalMap } from './map';
import { BotManager } from './ai';
import { DEFAULT_WEAPON_OPTICS, OPTIC_REGISTRY, WEAPON_REGISTRY, WEAPON_VIEWMODEL_OFFSETS } from './weapons';
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
  public isTacSprinting: boolean = false;
  public tacSprintStamina: number = 1.0;
  public isCrouching: boolean = false;
  public isSliding: boolean = false;
  public isDiving: boolean = false;
  public isMantling: boolean = false;
  public isMounted: boolean = false;
  public isTacStance: boolean = false;
  public isAiming: boolean = false;
  public isReloading: boolean = false;
  public isShooting: boolean = false;
  public isDrawing: boolean = false;

  // Tactical Optic Attachment & Scope System
  public equippedOptics: Record<WeaponType, OpticType> = { ...DEFAULT_WEAPON_OPTICS };
  public opticReticleColors: Record<WeaponType, ReticleColor> = {
    m4: 'red',
    mp5: 'green',
    sniper: 'red',
    shotgun: 'red',
    deagle: 'green',
  };
  public opticReticleStyles: Record<WeaponType, ReticleStyle> = {
    m4: 'dot',
    mp5: 'dot',
    sniper: 'mildot_circle',
    shotgun: 'dot',
    deagle: 'dot',
  };

  // Steady Aim Breath & Variable Magnification
  public isHoldingBreath: boolean = false;
  public breathStamina: number = 1.0;
  public isHyperventilating: boolean = false;
  private lastHeartbeatTime: number = 0;
  public opticZoomStepIndex: number = 0;
  public isThermalEnabled: boolean = false;

  // High-Precision Telemetry & Laser Rangefinder
  public targetRangeMeters: number = 0;
  public elevationHoldoverMil: number = 0;
  public targetedEnemyId: string | null = null;
  public scopeShadowOffsetX: number = 0;
  public scopeShadowOffsetY: number = 0;
  private prevYaw: number = 0;
  private prevPitch: number = 0;
  private angularVelYaw: number = 0;
  private angularVelPitch: number = 0;

  public slideTimer: number = 0;
  public readonly slideDuration: number = 0.85;
  public diveTimer: number = 0;
  public readonly diveDuration: number = 0.65;
  public drawTimer: number = 0;
  public readonly drawDuration: number = 0.28;
  public currentEyeHeight: number = 1.7;
  public targetEyeHeight: number = 1.7;

  // Ledge Mantle / Vault State
  private mantleTimer: number = 0;
  private readonly mantleDuration: number = 0.36;
  private mantleStartPos: THREE.Vector3 = new THREE.Vector3();
  private mantleTargetPos: THREE.Vector3 = new THREE.Vector3();
  public mountType: 'top' | 'left' | 'right' | null = null;

  // Dynamic Camera & Recoil Physics
  private cameraRoll: number = 0;
  private landingJolt: number = 0;
  private lastShiftPressTime: number = 0;
  private reloadAudioStage: number = 0;

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
  public isDead: boolean = false;

  public setDeadState(dead: boolean) {
    this.isDead = dead;
    if (this.viewmodelRig) {
      this.viewmodelRig.visible = !dead;
    }
    if (this.laserDot) this.laserDot.visible = false;
    if (this.laserBeam) this.laserBeam.visible = false;
    if (this.flashlight) this.flashlight.visible = false;
    if (dead) {
      this.isShooting = false;
      this.isAiming = false;
      this.isSprinting = false;
      this.isTacSprinting = false;
      this.isHoldingBreath = false;
      this.targetEyeHeight = 0.35; // Collapse toward ground on elimination
    } else {
      this.targetEyeHeight = 1.7;
    }
  }

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

  public equipWeapon(
    type: WeaponType,
    camo: WeaponCamo = this.currentCamo,
    optic?: OpticType,
    reticleColor?: ReticleColor,
    reticleStyle?: ReticleStyle
  ) {
    this.currentWeapon = type;
    this.currentCamo = camo;
    if (optic) this.equippedOptics[type] = optic;
    if (reticleColor) this.opticReticleColors[type] = reticleColor;
    if (reticleStyle) this.opticReticleStyles[type] = reticleStyle;

    const currentOptic = this.equippedOptics[type] || 'holo_553';
    const currentColor = this.opticReticleColors[type] || 'red';
    const currentStyle = this.opticReticleStyles[type] || 'dot';

    this.opticZoomStepIndex = 0;
    this.isHoldingBreath = false;
    this.isHyperventilating = false;
    this.burstShotIndex = 0;
    this.isReloading = false;
    this.isInspecting = false;
    this.isMeleeing = false;
    this.isDrawing = true;
    this.drawTimer = this.drawDuration;

    if (this.weaponMesh) {
      this.viewmodelRig.remove(this.weaponMesh);
    }

    this.weaponMesh = ModelFactory.createWeaponMesh(type, camo, currentOptic, currentColor, currentStyle);
    this.viewmodelRig.add(this.weaponMesh);

    soundManager.playDrawWeapon();
    this.onAmmoChange(this.ammoInMag[type], this.ammoReserve[type]);
  }

  private setupInputs() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;

      // Tactical Stance Toggle (Z or B Key)
      if (e.code === 'KeyZ' || e.code === 'KeyB') {
        this.isTacStance = !this.isTacStance;
        soundManager.playTacStanceToggle();
      }

      // Variable Zoom Optic / Thermal Toggle / Quick Melee (V Key)
      if (e.code === 'KeyV' && !this.isMeleeing) {
        if (this.isAiming) {
          const currentOptic = this.equippedOptics[this.currentWeapon] || 'holo_553';
          const opticCfg = OPTIC_REGISTRY[currentOptic];
          if (opticCfg?.variableZoomSteps && opticCfg.variableZoomSteps.length > 1) {
            this.opticZoomStepIndex = (this.opticZoomStepIndex + 1) % opticCfg.variableZoomSteps.length;
            soundManager.playOpticZoomClick();
          } else if (opticCfg?.hasThermalVision) {
            this.isThermalEnabled = !this.isThermalEnabled;
            soundManager.playThermalToggle();
          } else {
            this.performMelee();
          }
        } else {
          this.performMelee();
        }
      }

      // Steady Aim / Hold Breath / Tactical Sprint Trigger (Shift Key)
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        if (this.isAiming && this.breathStamina > 0.12 && !this.isHyperventilating) {
          const currentOptic = this.equippedOptics[this.currentWeapon] || 'holo_553';
          const opticCfg = OPTIC_REGISTRY[currentOptic];
          if (opticCfg && (opticCfg.magnification >= 2.0 || opticCfg.variableZoomSteps)) {
            this.isHoldingBreath = true;
            soundManager.playInhale();
          }
        } else if (!this.isAiming && !this.isCrouching) {
          const now = performance.now();
          if (now - this.lastShiftPressTime < 380 && this.tacSprintStamina > 0.2) {
            this.isTacSprinting = true;
            soundManager.playTacSprintStart();
          } else if (!this.isTacSprinting && this.tacSprintStamina > 0.4) {
            this.isTacSprinting = true;
            soundManager.playTacSprintStart();
          }
          this.lastShiftPressTime = now;
        }
      }

      // Weapon Mount / Dismount Toggle (E Key)
      if (e.code === 'KeyE' && !this.isMeleeing && !this.isMantling) {
        this.toggleMount();
      }

      // Slide / Dive Cancel trigger: Pressing Crouch or Jump instantly cancels slide/dive and resets tac-sprint!
      if (this.isSliding || this.isDiving) {
        if (e.code === 'KeyC' || e.code === 'ControlLeft') {
          this.cancelSlide(false);
          return;
        }
        if (e.code === 'Space') {
          this.cancelSlide(true);
          return;
        }
      }

      // Ledge Mantle / Vault trigger on Jump near obstacle
      if (e.code === 'Space' && !this.isMantling && !this.isSliding && !this.isDiving) {
        if (this.tryLedgeMantle()) {
          return;
        }
      }

      // Reload (R Key)
      if (e.code === 'KeyR' && !this.isReloading && !this.isMeleeing) {
        this.reload();
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

      // Variable Zoom Toggle (V Key) while Aiming
      if (e.code === 'KeyV' && this.isAiming) {
        const currentOptic = this.equippedOptics[this.currentWeapon] || 'holo_553';
        const opticCfg = OPTIC_REGISTRY[currentOptic];
        if (opticCfg?.variableZoomSteps && opticCfg.variableZoomSteps.length > 1) {
          this.opticZoomStepIndex = (this.opticZoomStepIndex + 1) % opticCfg.variableZoomSteps.length;
          soundManager.playOpticZoomClick();
          return;
        }
      }

      // Inspect Weapon (I Key or H Key)
      if ((e.code === 'KeyI' || e.code === 'KeyH') && !this.isReloading && !this.isShooting && !this.isMeleeing) {
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

      // Slide & Dolphin Dive triggers:
      // While in Tactical Sprint -> Dolphin Dive!
      // While in Standard Sprint -> Slide!
      if ((e.code === 'KeyC' || e.code === 'ControlLeft') && this.isGrounded && !this.isSliding && !this.isDiving) {
        if (this.isTacSprinting) {
          this.startDolphinDive();
        } else if (this.isSprinting) {
          this.startSlide();
        }
      }
    });

    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.isTacSprinting = false;
        if (this.isHoldingBreath) {
          this.isHoldingBreath = false;
          soundManager.playExhale();
        }
      }
    });

    // Mouse Wheel Weapon Switching / Optic Variable Zoom
    this.domElement.addEventListener('wheel', e => {
      if (!this.isLocked) return;

      if (this.isAiming) {
        const currentOptic = this.equippedOptics[this.currentWeapon] || 'holo_553';
        const opticCfg = OPTIC_REGISTRY[currentOptic];
        if (opticCfg?.variableZoomSteps && opticCfg.variableZoomSteps.length > 1) {
          if (e.deltaY > 0) {
            this.opticZoomStepIndex = (this.opticZoomStepIndex + 1) % opticCfg.variableZoomSteps.length;
          } else {
            this.opticZoomStepIndex = (this.opticZoomStepIndex - 1 + opticCfg.variableZoomSteps.length) % opticCfg.variableZoomSteps.length;
          }
          soundManager.playOpticZoomClick();
          return;
        }
      }

      const weapons: WeaponType[] = ['m4', 'mp5', 'sniper', 'shotgun', 'deagle'];
      const currentIndex = weapons.indexOf(this.currentWeapon);
      if (e.deltaY > 0) {
        const nextIndex = (currentIndex + 1) % weapons.length;
        this.equipWeapon(weapons[nextIndex]);
      } else if (e.deltaY < 0) {
        const prevIndex = (currentIndex - 1 + weapons.length) % weapons.length;
        this.equipWeapon(weapons[prevIndex]);
      }
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
        soundManager.playScopeRaise();
      }
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 0) {
        this.isShooting = false;
      } else if (e.button === 2) {
        this.isAiming = false;
        if (this.isHoldingBreath) {
          this.isHoldingBreath = false;
          soundManager.playExhale();
        }
        if (this.isMounted) {
          this.isMounted = false;
        }
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

  private toggleMount() {
    if (this.isMounted) {
      this.isMounted = false;
      this.mountType = null;
      soundManager.playMount();
      return;
    }

    const forwardDir = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const rightDir = new THREE.Vector3(forwardDir.z, 0, -forwardDir.x).normalize();
    const eyePos = this.camera.position.clone();

    // Check forward low barrier / cover
    const rayForward = new THREE.Raycaster(eyePos.clone().add(new THREE.Vector3(0, -0.4, 0)), forwardDir, 0.1, 1.5);
    const obstacleMeshes = this.map.obstacles.map(o => o.mesh);
    const fwdHits = rayForward.intersectObjects(obstacleMeshes, true);

    if (fwdHits.length > 0) {
      this.isMounted = true;
      this.mountType = 'top';
      this.isAiming = true;
      soundManager.playMount();
      return;
    }

    // Check side corner mounting
    const rayLeft = new THREE.Raycaster(eyePos, rightDir.clone().negate(), 0.1, 1.2);
    const leftHits = rayLeft.intersectObjects(obstacleMeshes, true);
    if (leftHits.length > 0) {
      this.isMounted = true;
      this.mountType = 'left';
      this.isAiming = true;
      soundManager.playMount();
      return;
    }

    const rayRight = new THREE.Raycaster(eyePos, rightDir, 0.1, 1.2);
    const rightHits = rayRight.intersectObjects(obstacleMeshes, true);
    if (rightHits.length > 0) {
      this.isMounted = true;
      this.mountType = 'right';
      this.isAiming = true;
      soundManager.playMount();
      return;
    }
  }

  private startDolphinDive() {
    this.isDiving = true;
    this.isSliding = false;
    this.diveTimer = this.diveDuration;
    this.isGrounded = false;
    this.velocity.y = 2.4; // Jump-launch trajectory forward
    this.landingJolt = -0.12;
    soundManager.playDolphinDive();
    this.botManager?.notifySound(this.position, 25, false);
  }

  private startSlide() {
    this.isSliding = true;
    this.isDiving = false;
    this.slideTimer = this.slideDuration;
    soundManager.playSlide();
    this.particles.emitImpactSparks(this.position.clone().add(new THREE.Vector3(0, 0.1, 0)), new THREE.Vector3(0, 1, 0));
    this.botManager?.notifySound(this.position, 18, false);
  }

  private cancelSlide(jump: boolean = false) {
    this.isSliding = false;
    this.isDiving = false;
    this.slideTimer = 0;
    this.diveTimer = 0;
    // Classic COD Slide Cancel reward: instantly resets full Tac-Sprint stamina!
    this.tacSprintStamina = 1.0;
    soundManager.playSlideCancel();

    if (jump && this.isGrounded) {
      this.velocity.y = 6.2;
      this.isGrounded = false;
      soundManager.playJump();
    }
  }

  private tryLedgeMantle(): boolean {
    const forwardDir = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    const waistPos = this.position.clone().add(new THREE.Vector3(0, -0.6, 0));
    const ray = new THREE.Raycaster(waistPos, forwardDir, 0.1, 1.4);

    const obstacleMeshes = this.map.obstacles.map(o => o.mesh);
    const hits = ray.intersectObjects(obstacleMeshes, true);

    if (hits.length > 0) {
      const hit = hits[0];
      // Test ledge height by casting downward from above the hit point
      const abovePos = hit.point.clone().add(new THREE.Vector3(0, 2.5, 0)).addScaledVector(forwardDir, 0.4);
      const downRay = new THREE.Raycaster(abovePos, new THREE.Vector3(0, -1, 0), 0.1, 2.6);
      const topHits = downRay.intersectObjects(obstacleMeshes, true);

      if (topHits.length > 0) {
        const topHit = topHits[0];
        const ledgeElevation = topHit.point.y;
        const currentFeet = this.position.y - this.currentEyeHeight;
        const heightDiff = ledgeElevation - currentFeet;

        if (heightDiff >= 0.65 && heightDiff <= 2.3) {
          // Initiate smooth COD mantle/vault
          this.isMantling = true;
          this.mantleTimer = this.mantleDuration;
          this.mantleStartPos.copy(this.position);
          this.mantleTargetPos.set(
            topHit.point.x + forwardDir.x * 0.45,
            ledgeElevation + this.currentEyeHeight,
            topHit.point.z + forwardDir.z * 0.45
          );
          soundManager.playMantle();
          return true;
        }
      }
    }
    return false;
  }

  public reload() {
    const wpnCfg = WEAPON_REGISTRY[this.currentWeapon];
    const current = this.ammoInMag[this.currentWeapon];
    const reserve = this.ammoReserve[this.currentWeapon];

    if (reserve <= 0 || this.isReloading || this.isMeleeing || this.isMantling) return;

    // Check tactical reload: magazine not empty, round already in chamber (+1 capacity enabled)
    const isTactical = current > 0;
    const maxCapacity = isTactical ? (wpnCfg.magSize + 1) : wpnCfg.magSize;
    if (current >= maxCapacity) return;

    this.isReloading = true;
    this.isTacticalReload = isTactical;
    this.isInspecting = false;
    this.reloadDuration = isTactical ? (wpnCfg.tacticalReloadTimeSec || wpnCfg.reloadTimeSec * 0.7) : wpnCfg.reloadTimeSec;
    this.reloadTimer = this.reloadDuration;
    this.reloadAudioStage = 0;

    // Initial audio cue
    soundManager.playReload(this.currentWeapon, 'mag_out');

    if (isTactical) {
      setTimeout(() => {
        if (this.isReloading && this.isTacticalReload) {
          soundManager.playReload(this.currentWeapon, 'mag_in');
        }
      }, (this.reloadDuration * 0.48) * 1000);
    } else {
      // Weapon-specific empty reload audio choreography
      if (this.currentWeapon === 'mp5') {
        // MP5 HK Slap reload sequence
        setTimeout(() => {
          if (this.isReloading && !this.isTacticalReload) {
            soundManager.playReload(this.currentWeapon, 'mag_in');
          }
        }, (this.reloadDuration * 0.45) * 1000);
        setTimeout(() => {
          if (this.isReloading && !this.isTacticalReload) {
            soundManager.playReload(this.currentWeapon, 'hk_slap');
          }
        }, (this.reloadDuration * 0.74) * 1000);
      } else if (this.currentWeapon === 'deagle') {
        // Desert Eagle slide rack
        setTimeout(() => {
          if (this.isReloading && !this.isTacticalReload) {
            soundManager.playReload(this.currentWeapon, 'mag_in');
          }
        }, (this.reloadDuration * 0.44) * 1000);
        setTimeout(() => {
          if (this.isReloading && !this.isTacticalReload) {
            soundManager.playReload(this.currentWeapon, 'slide_rack');
          }
        }, (this.reloadDuration * 0.72) * 1000);
      } else if (this.currentWeapon === 'sniper') {
        // AX-50 Bolt cycle
        setTimeout(() => {
          if (this.isReloading && !this.isTacticalReload) {
            soundManager.playReload(this.currentWeapon, 'mag_in');
          }
        }, (this.reloadDuration * 0.46) * 1000);
        setTimeout(() => {
          if (this.isReloading && !this.isTacticalReload) {
            soundManager.playReload(this.currentWeapon, 'bolt_cycle');
          }
        }, (this.reloadDuration * 0.78) * 1000);
      } else if (this.currentWeapon === 'shotgun') {
        // Model 680 Shell insertion & pump
        setTimeout(() => {
          if (this.isReloading) soundManager.playReload(this.currentWeapon, 'shell_insert');
        }, (this.reloadDuration * 0.3) * 1000);
        setTimeout(() => {
          if (this.isReloading) soundManager.playReload(this.currentWeapon, 'shell_insert');
        }, (this.reloadDuration * 0.5) * 1000);
        setTimeout(() => {
          if (this.isReloading) soundManager.playPumpAction();
        }, (this.reloadDuration * 0.78) * 1000);
      } else {
        // M4 ping-pong bolt catch release
        setTimeout(() => {
          if (this.isReloading && !this.isTacticalReload) {
            soundManager.playReload(this.currentWeapon, 'mag_in');
          }
        }, (this.reloadDuration * 0.44) * 1000);
        setTimeout(() => {
          if (this.isReloading && !this.isTacticalReload) {
            soundManager.playReload(this.currentWeapon, 'cock');
          }
        }, (this.reloadDuration * 0.74) * 1000);
      }
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
    if (!this.isLocked || this.isDead) return;

    // Automatic fire trigger
    const wpnCfg = WEAPON_REGISTRY[this.currentWeapon];
    if (this.isShooting && wpnCfg.fullAuto && !this.isMantling && !this.isReloading) {
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

    // Camera FOV & ADS Zoom (with dynamic Optic magnification, Variable Zoom & Tac-Sprint)
    const currentOptic = this.equippedOptics[this.currentWeapon] || 'holo_553';
    const opticCfg = OPTIC_REGISTRY[currentOptic];
    let targetFov = this.settings.fieldOfView || 85;

    const isFullScope = this.isAiming && !this.isTacStance && (opticCfg?.hasFullScopeOverlay || opticCfg?.magnification >= 3.0);

    if (this.isAiming) {
      if (this.isTacStance) {
        targetFov = targetFov - 10;
      } else if (opticCfg?.variableZoomSteps && opticCfg.variableZoomSteps.length > 0) {
        const mag = opticCfg.variableZoomSteps[this.opticZoomStepIndex % opticCfg.variableZoomSteps.length];
        if (mag >= 8) {
          targetFov = 12; // 10X Extreme Sniper Zoom
        } else if (mag >= 4) {
          targetFov = 24; // 4.5X Tactical Sniper Zoom
        } else {
          targetFov = Math.max(10, Math.round(75 / mag));
        }
      } else if (opticCfg?.id === 'acog_4x') {
        targetFov = 28; // Crisp 4.0X Combat Optic
      } else if (opticCfg?.id === 'thermal_flir' || opticCfg?.id === 'thermal_ir') {
        targetFov = 30; // 3.5X Thermal Scope
      } else if (opticCfg?.id === 'holo_553') {
        targetFov = 52;
      } else if (opticCfg?.id === 'reflex_dot' || opticCfg?.id === 'red_dot_micro') {
        targetFov = 56;
      } else if (opticCfg?.id === 'iron_sight') {
        targetFov = 66;
      } else if (opticCfg) {
        targetFov = Math.max(12, Math.round(75 / opticCfg.magnification));
      } else {
        targetFov = wpnCfg.adsFov || 55;
      }
    } else if (this.isTacSprinting) {
      targetFov += 12; // COD tactical sprint dynamic speed FOV expansion
    } else if (this.isSprinting) {
      targetFov += 6;
    }

    const adsSpeedMultiplier = opticCfg?.adsSpeedMultiplier || 1.0;
    const adsRate = this.isAiming ? 20 * adsSpeedMultiplier : 18;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, dt * adsRate);
    this.camera.updateProjectionMatrix();

    // Toggle Viewmodel and laser visibility for Scoped Optics
    if (this.viewmodelRig) {
      if (isFullScope) {
        this.viewmodelRig.visible = false;
        if (this.laserBeam) this.laserBeam.visible = false;
      } else if (!this.isDead) {
        this.viewmodelRig.visible = true;
      }
    }

    // Steady Aim / Breath Mechanics Update
    const holdingShift = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const canHoldBreath = this.isAiming && opticCfg && (opticCfg.magnification >= 2.0 || opticCfg.variableZoomSteps);

    if (holdingShift && canHoldBreath && !this.isHyperventilating && this.breathStamina > 0.04) {
      if (!this.isHoldingBreath) {
        this.isHoldingBreath = true;
        soundManager.playInhale();
      }
      this.breathStamina = Math.max(0, this.breathStamina - dt * 0.18);

      // Low-stamina heartbeat audio cues
      const now = performance.now();
      const bpm = Math.min(165, Math.round(85 + (1 - this.breathStamina) * 80));
      const intervalMs = (60 / bpm) * 1000;
      if (this.breathStamina < 0.45 && now - this.lastHeartbeatTime >= intervalMs) {
        this.lastHeartbeatTime = now;
        soundManager.playHeartbeat(bpm);
      }

      if (this.breathStamina <= 0) {
        this.isHoldingBreath = false;
        this.isHyperventilating = true;
        soundManager.playHeavyExhaleGasp();
      }
    } else {
      if (this.isHoldingBreath) {
        this.isHoldingBreath = false;
        soundManager.playExhale();
      }
      const recoverySpeed = this.isHyperventilating ? 0.12 : 0.22;
      this.breathStamina = Math.min(1.0, this.breathStamina + dt * recoverySpeed);
      if (this.isHyperventilating && this.breathStamina >= 0.35) {
        this.isHyperventilating = false;
      }
    }

    // High-Precision Telemetry: Laser Rangefinder & Ballistic Holdover Drop
    if (this.isAiming) {
      const eyePos = this.camera.position.clone();
      const forwardDir = this.camera.getWorldDirection(new THREE.Vector3());
      const rangeRay = new THREE.Raycaster(eyePos, forwardDir, 0.2, 350);

      const testMeshes: THREE.Object3D[] = [...this.map.obstacles.map(o => o.mesh)];
      if (this.botManager) {
        for (const b of this.botManager.bots) {
          if (!b.isDead && b.group) testMeshes.push(b.group);
        }
      }
      if (this.trainingManager) {
        for (const d of this.trainingManager.dummies) {
          if (!d.isDown && d.group) testMeshes.push(d.group);
        }
        for (const p of this.trainingManager.steelPlates) {
          if (!p.isDown && p.group) testMeshes.push(p.group);
        }
      }

      const hits = rangeRay.intersectObjects(testMeshes, true);
      if (hits.length > 0) {
        const hitDist = hits[0].distance;
        this.targetRangeMeters = Math.round(hitDist * 10) / 10;
        const bulletDropRate = wpnCfg.bulletDropRate || 1.0;
        const muzzleVel = wpnCfg.muzzleVelocity || 800;
        const flightTime = hitDist / muzzleVel;
        const dropMeters = 0.5 * 9.81 * bulletDropRate * (flightTime * flightTime);
        this.elevationHoldoverMil = Math.round((dropMeters / Math.max(1, hitDist)) * 1000 * 10) / 10;

        let detectedEnemy: string | null = null;
        if (this.botManager) {
          for (const bot of this.botManager.bots) {
            if (!bot.isDead) {
              let cur: THREE.Object3D | null = hits[0].object;
              while (cur) {
                if (cur === bot.group) {
                  detectedEnemy = bot.name;
                  break;
                }
                cur = cur.parent;
              }
            }
          }
        }
        this.targetedEnemyId = detectedEnemy;
      } else {
        this.targetRangeMeters = 0;
        this.elevationHoldoverMil = 0;
        this.targetedEnemyId = null;
      }

      // Parallax Scope Shadow calculation based on angular velocity and strafing
      this.angularVelYaw = (this.yaw - this.prevYaw) / Math.max(0.001, dt);
      this.angularVelPitch = (this.pitch - this.prevPitch) / Math.max(0.001, dt);
      this.prevYaw = this.yaw;
      this.prevPitch = this.pitch;

      const strafeVel = this.velocity.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -this.yaw);
      const targetShadowX = Math.max(-1, Math.min(1, -this.angularVelYaw * 0.12 - strafeVel.x * 0.04));
      const targetShadowY = Math.max(-1, Math.min(1, this.angularVelPitch * 0.12 - this.velocity.y * 0.02));
      this.scopeShadowOffsetX = THREE.MathUtils.lerp(this.scopeShadowOffsetX, targetShadowX, dt * 16);
      this.scopeShadowOffsetY = THREE.MathUtils.lerp(this.scopeShadowOffsetY, targetShadowY, dt * 16);
    } else {
      this.targetRangeMeters = 0;
      this.elevationHoldoverMil = 0;
      this.targetedEnemyId = null;
      this.scopeShadowOffsetX = 0;
      this.scopeShadowOffsetY = 0;
      this.prevYaw = this.yaw;
      this.prevPitch = this.pitch;
    }

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

    // Decay Landing Jolt
    this.landingJolt = THREE.MathUtils.lerp(this.landingJolt, 0, dt * 12);

    // Calculate Dynamic Camera Roll (Strafe Banking + Sliding Lean)
    let targetRoll = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) targetRoll += 0.038;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) targetRoll -= 0.038;
    if (this.isSliding) targetRoll += 0.085;
    this.cameraRoll = THREE.MathUtils.lerp(this.cameraRoll, targetRoll, dt * 10);

    // Apply Camera Rotation with Recoil & Dynamic Roll
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw + this.recoilYaw;
    this.camera.rotation.x = this.pitch + this.recoilPitch + this.landingJolt;
    this.camera.rotation.z = this.recoilRoll + this.cameraRoll;

    // Viewmodel Positioning, Breathing Sway, Reload & Melee Choreography
    this.updateViewmodel(dt);

    // Update 3D Spatial Web Audio Listener orientation & velocity
    const forwardDir = new THREE.Vector3();
    this.camera.getWorldDirection(forwardDir);
    soundManager.updateListener(this.camera.position, forwardDir, this.camera.up, this.velocity);
  }

  private updateLaserSight() {
    if (!this.laserDot || !this.laserBeam) return;
    const shouldBeActive = this.laserActive || this.isTacStance;

    if (!shouldBeActive) {
      this.laserDot.visible = false;
      this.laserBeam.visible = false;
      return;
    }

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
    // 1. Handle Ledge Mantle Interpolation
    if (this.isMantling) {
      this.mantleTimer -= dt;
      const progress = Math.max(0, Math.min(1, 1 - (this.mantleTimer / this.mantleDuration)));
      
      // COD smooth S-curve vault: vertical lift first 45%, forward pull second 55%
      if (progress < 0.45) {
        const sub = progress / 0.45;
        const liftCurve = Math.sin(sub * Math.PI * 0.5);
        this.position.y = THREE.MathUtils.lerp(this.mantleStartPos.y, this.mantleTargetPos.y, liftCurve);
        this.position.x = THREE.MathUtils.lerp(this.mantleStartPos.x, this.mantleTargetPos.x, liftCurve * 0.25);
        this.position.z = THREE.MathUtils.lerp(this.mantleStartPos.z, this.mantleTargetPos.z, liftCurve * 0.25);
      } else {
        const sub = (progress - 0.45) / 0.55;
        const easeOut = 1 - Math.pow(1 - sub, 3);
        this.position.y = THREE.MathUtils.lerp(this.mantleStartPos.y, this.mantleTargetPos.y, 1);
        this.position.x = THREE.MathUtils.lerp(this.mantleStartPos.x, this.mantleTargetPos.x, 0.25 + 0.75 * easeOut);
        this.position.z = THREE.MathUtils.lerp(this.mantleStartPos.z, this.mantleTargetPos.z, 0.25 + 0.75 * easeOut);
      }

      this.velocity.set(0, 0, 0);
      this.camera.position.copy(this.position);

      if (this.mantleTimer <= 0) {
        this.isMantling = false;
        this.isGrounded = true;
      }
      return;
    }

    this.isCrouching = this.keys['KeyC'] || this.keys['ControlLeft'];
    
    // Sprint and Tactical Sprint state resolution
    const movingForward = (this.keys['KeyW'] || this.keys['ArrowUp']) && !this.keys['KeyS'] && !this.keys['ArrowDown'];
    const holdingShift = this.keys['ShiftLeft'] || this.keys['ShiftRight'];

    if (holdingShift && movingForward && !this.isCrouching && !this.isAiming) {
      if (this.isTacSprinting && this.tacSprintStamina > 0.05) {
        // Continue Tactical Sprint
        this.tacSprintStamina = Math.max(0, this.tacSprintStamina - dt * 0.28);
        this.isSprinting = true;
      } else {
        // Standard Sprint
        this.isTacSprinting = false;
        this.isSprinting = true;
        // Stamina slowly recovers if not in tac sprint
        this.tacSprintStamina = Math.min(1.0, this.tacSprintStamina + dt * 0.15);
      }
    } else {
      this.isSprinting = false;
      this.isTacSprinting = false;
      // Stamina recharges rapidly when walking or resting
      this.tacSprintStamina = Math.min(1.0, this.tacSprintStamina + dt * 0.55);
    }

    // Eye height lerp (Dive, Slide, Crouch, Stand)
    this.targetEyeHeight = this.isDiving ? 0.38 : this.isSliding ? 0.65 : this.isCrouching ? 0.95 : 1.7;
    this.currentEyeHeight = THREE.MathUtils.lerp(this.currentEyeHeight, this.targetEyeHeight, dt * 16);

    let baseSpeed = 6.0;
    if (this.isAiming) baseSpeed = this.isTacStance ? 4.2 : 3.0;
    else if (this.isCrouching) baseSpeed = 3.2;
    else if (this.isTacSprinting) baseSpeed = 13.0; // COD super sprint velocity
    else if (this.isSprinting) baseSpeed = 9.2;

    if (this.isDiving) {
      this.diveTimer -= dt;
      const diveRatio = Math.max(0, this.diveTimer / this.diveDuration);
      baseSpeed = 15.5 * Math.pow(diveRatio, 0.9);
      if (this.diveTimer <= 0) {
        this.isDiving = false;
        this.isCrouching = true;
      }
    } else if (this.isSliding) {
      this.slideTimer -= dt;
      // Exponential decay slide velocity starting from 14.0 m/s
      const slideRatio = Math.max(0, this.slideTimer / this.slideDuration);
      baseSpeed = 14.0 * Math.pow(slideRatio, 1.2);
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    const moveVector = new THREE.Vector3();
    if (this.isDiving) {
      // In dive, player commits to forward camera trajectory
      moveVector.z -= 1;
    } else {
      if (this.keys['KeyW'] || this.keys['ArrowUp']) moveVector.z -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) moveVector.z += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveVector.x -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) moveVector.x += 1;
    }

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize();
      moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
      this.velocity.x = moveVector.x * baseSpeed;
      this.velocity.z = moveVector.z * baseSpeed;

      // Footstep audio (frequency increases with tactical sprint)
      const stepFreq = this.isTacSprinting ? 3.6 : this.isSprinting ? 2.8 : 1.8;
      this.footstepTimer += dt * stepFreq;
      if (this.footstepTimer >= 1.0 && this.isGrounded && !this.isSliding && !this.isDiving) {
        this.footstepTimer = 0;
        const isCatwalk = Math.abs(this.position.x) <= 8 && Math.abs(this.position.z) <= 7 && this.position.y > 2.0;
        const isDirt = Math.abs(this.position.x) > 30 || Math.abs(this.position.z) > 30;
        const surf = isCatwalk ? 'metal' : isDirt ? 'dirt' : 'concrete';
        soundManager.playFootstep(this.isTacSprinting || this.isSprinting, surf);
        if (this.isTacSprinting || this.isSprinting) {
          this.botManager?.notifySound(this.position, this.isTacSprinting ? 22 : 16, false);
        }
      }
    } else {
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, 0, dt * 10);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, 0, dt * 10);
    }

    // Jump & Gravity
    if (this.keys['Space'] && this.isGrounded && !this.isSliding && !this.isDiving) {
      this.velocity.y = 6.2;
      this.isGrounded = false;
      soundManager.playJump();
    }

    if (!this.isGrounded) {
      this.velocity.y -= (this.isDiving ? 14.5 : 19.5) * dt;
    }

    // Integrate Position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // Floor collision
    if (this.position.y <= this.currentEyeHeight) {
      if (!this.isGrounded && (this.velocity.y < -3 || this.isDiving)) {
        if (this.isDiving) {
          soundManager.playLand();
          this.landingJolt = -0.14; // Heavy chest thud on floor impact
          this.particles.emitImpactSparks(this.position.clone().add(new THREE.Vector3(0, 0.05, 0)), new THREE.Vector3(0, 1, 0));
        } else {
          soundManager.playLand();
          this.landingJolt = -0.06; // Camera dip on hard impact
        }
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
    const currentOptic = this.equippedOptics[this.currentWeapon] || 'holo_553';
    
    // Choose base target offset based on active stance
    let targetOffset = { ...offsetCfg.hip };
    if (this.isMounted) {
      // Stabilized Weapon Mount against cover
      if (this.mountType === 'top') {
        targetOffset = {
          x: 0,
          y: -0.06,
          z: -0.22,
          rx: 0.02,
          ry: 0,
          rz: 0,
        };
      } else if (this.mountType === 'left') {
        targetOffset = {
          x: -0.12,
          y: -0.12,
          z: -0.24,
          rx: 0.02,
          ry: 0.15,
          rz: 0.22, // Canted side-mount
        };
      } else {
        targetOffset = {
          x: 0.12,
          y: -0.12,
          z: -0.24,
          rx: 0.02,
          ry: -0.15,
          rz: -0.22,
        };
      }
    } else if (this.isAiming) {
      if (this.isTacStance) {
        // Tactical Stance (Canted Weapon ADS)
        targetOffset = {
          x: 0.06,
          y: -0.16,
          z: -0.32,
          rx: 0.05,
          ry: 0.22,
          rz: -0.68, // Canted ~39 degrees
        };
      } else {
        targetOffset = { ...offsetCfg.ads };
        // Optic elevation alignment: aligns sight reticle / front post directly with camera optical axis
        if (currentOptic === 'reflex_dot' || currentOptic === 'red_dot_micro') {
          if (this.currentWeapon === 'm4') targetOffset.y = -0.128;
          else if (this.currentWeapon === 'mp5') targetOffset.y = -0.108;
          else if (this.currentWeapon === 'shotgun') targetOffset.y = -0.118;
          else if (this.currentWeapon === 'deagle') targetOffset.y = -0.133;
          else if (this.currentWeapon === 'sniper') targetOffset.y = -0.155;
        } else if (currentOptic === 'holo_553') {
          if (this.currentWeapon === 'm4') targetOffset.y = -0.132;
          else if (this.currentWeapon === 'mp5') targetOffset.y = -0.112;
          else if (this.currentWeapon === 'shotgun') targetOffset.y = -0.122;
          else if (this.currentWeapon === 'deagle') targetOffset.y = -0.135;
          else if (this.currentWeapon === 'sniper') targetOffset.y = -0.158;
        } else if (currentOptic === 'iron_sight') {
          if (this.currentWeapon === 'm4') targetOffset.y = -0.098;
          else if (this.currentWeapon === 'mp5') targetOffset.y = -0.088;
          else if (this.currentWeapon === 'shotgun') targetOffset.y = -0.065;
          else if (this.currentWeapon === 'deagle') targetOffset.y = -0.085;
          else if (this.currentWeapon === 'sniper') targetOffset.y = -0.135;
        }
      }
    } else if (this.isDiving) {
      // Dolphin Dive Weapon Position: pushed forward horizontally flat against chest
      targetOffset = {
        x: 0.05,
        y: -0.32,
        z: -0.42,
        rx: 0.35,
        ry: 0.05,
        rz: -0.18,
      };
    } else if (this.isTacSprinting) {
      // MW-Style Tactical Sprint High-Ready Weapon Position
      targetOffset = {
        x: 0.18,
        y: -0.26,
        z: -0.28,
        rx: 0.65,
        ry: -0.35,
        rz: 0.48, // Gun pointed straight up
      };
    } else if (this.isSprinting) {
      targetOffset = { ...offsetCfg.sprint };
    }

    // Dual-harmonic breathing sway (heavily suppressed if mounted or holding breath)
    const opticCfg = OPTIC_REGISTRY[currentOptic];
    const opticSwayMult = opticCfg?.swayMultiplier || 1.0;
    const steadyAimMult = this.isHoldingBreath ? 0.05 : (this.isHyperventilating ? 2.2 : 1.0);

    this.swayTime += dt * (this.isMounted ? wpnCfg.swaySpeed * 0.3 : (this.isHoldingBreath ? wpnCfg.swaySpeed * 0.15 : wpnCfg.swaySpeed));
    const baseSwayAmp = this.isMounted ? wpnCfg.swayAmplitude * 0.08 : this.isAiming ? (this.isTacStance ? wpnCfg.swayAmplitude * 0.35 : wpnCfg.swayAmplitude * 0.15) : wpnCfg.swayAmplitude;
    const swayAmp = baseSwayAmp * opticSwayMult * steadyAimMult;
    const swayX = Math.cos(this.swayTime * 0.8) * swayAmp;
    const swayY = Math.sin(this.swayTime * 1.6) * swayAmp;

    // Walk, sprint, and tac-sprint bobbing
    const isMoving = this.velocity.x !== 0 || this.velocity.z !== 0;
    const bobSpeed = this.isTacSprinting ? 18 : this.isSprinting ? 14 : isMoving ? 9 : 2;
    this.bobTimer += dt * bobSpeed;

    const bobMult = this.isMounted ? 0.0002 : this.isAiming ? 0.0006 : this.isTacSprinting ? 0.028 : isMoving ? 0.015 : 0.003;
    const bobX = Math.cos(this.bobTimer * 0.5) * bobMult;
    const bobY = Math.sin(this.bobTimer) * (bobMult * 1.2);

    // Strafe banking roll
    const strafeRoll = (this.keys['KeyA'] || this.keys['ArrowLeft']) ? 0.04 : (this.keys['KeyD'] || this.keys['ArrowRight']) ? -0.04 : 0;

    // --- PROCEDURAL ANIMATIONS (RELOAD, MELEE, INSPECT, MANTLE, DRAW) ---
    let reloadOffX = 0, reloadOffY = 0, reloadOffZ = 0;
    let reloadRotX = 0, reloadRotY = 0, reloadRotZ = 0;

    // Find all dynamic mechanical sub-meshes
    let magMesh: THREE.Object3D | undefined;
    let slideMesh: THREE.Object3D | undefined;
    let pumpMesh: THREE.Object3D | undefined;
    let boltCarrierMesh: THREE.Object3D | undefined;
    let boltHandleMesh: THREE.Object3D | undefined;
    let cockingHandleMesh: THREE.Object3D | undefined;
    let boltCatchMesh: THREE.Object3D | undefined;

    this.weaponMesh.traverse(child => {
      if (child.name === 'magazine') magMesh = child;
      if (child.name === 'pistol_slide') slideMesh = child;
      if (child.name === 'pump_handle') pumpMesh = child;
      if (child.name === 'bolt_carrier') boltCarrierMesh = child;
      if (child.name === 'bolt_handle') boltHandleMesh = child;
      if (child.name === 'cocking_handle') cockingHandleMesh = child;
      if (child.name === 'bolt_catch') boltCatchMesh = child;
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
        // --- FULL EMPTY RELOAD (MAG DROP + INSERT + BOLT / SLIDE / HK SLAP / PUMP RACK) ---
        if (this.currentWeapon === 'mp5') {
          // MP5 ICONIC HK SLAP FULL RELOAD
          if (p < 0.22) {
            // Phase 1: Left hand pulls cocking handle back and locks up into detent notch
            const sub = p / 0.22;
            reloadRotX = -0.12 * sub;
            reloadRotZ = 0.32 * sub;
            reloadOffZ = -0.04 * sub;
            if (cockingHandleMesh) {
              cockingHandleMesh.position.z = -0.08 * sub;
              cockingHandleMesh.position.y = 0.02 * sub;
            }
          } else if (p < 0.48) {
            // Phase 2: Discard empty 9mm mag, retrieve fresh curved steel mag
            const sub = (p - 0.22) / 0.26;
            reloadOffY = -0.12 * sub;
            reloadRotX = -0.12 - 0.1 * sub;
            reloadRotZ = 0.32 + 0.08 * sub;
            if (magMesh) magMesh.position.y = -0.42 * sub;
            if (cockingHandleMesh) {
              cockingHandleMesh.position.z = -0.08;
              cockingHandleMesh.position.y = 0.02;
            }
          } else if (p < 0.72) {
            // Phase 3: Slap fresh 9mm mag into magwell with positive click
            const sub = (p - 0.48) / 0.24;
            reloadOffY = -0.12 + 0.06 * Math.sin(sub * Math.PI);
            reloadRotX = -0.22 + 0.12 * sub;
            reloadRotZ = 0.40 - 0.15 * sub;
            if (magMesh) magMesh.position.y = -0.42 * (1 - sub);
            if (cockingHandleMesh) {
              cockingHandleMesh.position.z = -0.08;
              cockingHandleMesh.position.y = 0.02;
            }
          } else if (p < 0.86) {
            // Phase 4: THE HK SLAP! Downward palm chop releases handle into battery
            const sub = (p - 0.72) / 0.14;
            if (magMesh) magMesh.position.y = 0;
            reloadOffY = -0.06 + 0.04 * Math.sin(sub * Math.PI);
            reloadRotX = -0.10 + 0.08 * Math.sin(sub * Math.PI);
            reloadRotZ = 0.25 * (1 - sub);
            if (cockingHandleMesh) {
              cockingHandleMesh.position.z = -0.08 * (1 - sub);
              cockingHandleMesh.position.y = 0.02 * (1 - sub);
            }
          } else {
            // Phase 5: Settle to ready
            const sub = (p - 0.86) / 0.14;
            if (magMesh) magMesh.position.y = 0;
            if (cockingHandleMesh) cockingHandleMesh.position.set(0, 0, 0);
            reloadOffY = -0.04 * (1 - sub);
            reloadRotX = -0.04 * (1 - sub);
          }
        } else if (this.currentWeapon === 'sniper') {
          // AX-50 BOLT-ACTION FULL RELOAD
          if (p < 0.20) {
            // Unlock & Pull Bolt Handle Back (casing ejects)
            const sub = p / 0.20;
            reloadRotX = 0.08 * sub;
            reloadRotZ = -0.15 * sub;
            if (boltCarrierMesh) boltCarrierMesh.position.z = -0.14 * sub;
            if (boltHandleMesh) {
              boltHandleMesh.rotation.z = -0.35 * sub;
              boltHandleMesh.position.z = -0.14 * sub;
            }
          } else if (p < 0.46) {
            // Eject empty box magazine
            const sub = (p - 0.20) / 0.26;
            reloadOffY = -0.14 * sub;
            reloadRotX = 0.08 - 0.25 * sub;
            reloadRotZ = -0.15 + 0.35 * sub;
            if (boltCarrierMesh) boltCarrierMesh.position.z = -0.14;
            if (boltHandleMesh) {
              boltHandleMesh.rotation.z = -0.35;
              boltHandleMesh.position.z = -0.14;
            }
            if (magMesh) magMesh.position.y = -0.45 * sub;
          } else if (p < 0.74) {
            // Insert fresh high-caliber .50 BMG magazine
            const sub = (p - 0.46) / 0.28;
            reloadOffY = -0.14 + 0.07 * Math.sin(sub * Math.PI);
            reloadRotX = -0.17 + 0.15 * sub;
            reloadRotZ = 0.20 - 0.15 * sub;
            if (boltCarrierMesh) boltCarrierMesh.position.z = -0.14;
            if (boltHandleMesh) {
              boltHandleMesh.rotation.z = -0.35;
              boltHandleMesh.position.z = -0.14;
            }
            if (magMesh) magMesh.position.y = -0.45 * (1 - sub);
          } else if (p < 0.90) {
            // Slam Bolt Forward & Lock Down
            const sub = (p - 0.74) / 0.16;
            if (magMesh) magMesh.position.y = 0;
            reloadOffZ = 0.04 * Math.sin(sub * Math.PI);
            reloadRotX = 0.05 * (1 - sub);
            reloadRotZ = -0.12 * (1 - sub);
            if (boltCarrierMesh) boltCarrierMesh.position.z = -0.14 * (1 - sub);
            if (boltHandleMesh) {
              boltHandleMesh.rotation.z = -0.35 * (1 - sub);
              boltHandleMesh.position.z = -0.14 * (1 - sub);
            }
          } else {
            // Ready stance
            const sub = (p - 0.90) / 0.10;
            if (magMesh) magMesh.position.y = 0;
            if (boltCarrierMesh) boltCarrierMesh.position.z = 0;
            if (boltHandleMesh) {
              boltHandleMesh.rotation.z = 0;
              boltHandleMesh.position.z = 0;
            }
            reloadOffY = -0.04 * (1 - sub);
          }
        } else if (this.currentWeapon === 'shotgun') {
          // SHOTGUN TACTICAL SHELL LOAD & PUMP ACTION
          if (p < 0.25) {
            // Roll shotgun to expose loading elevator gate
            const sub = p / 0.25;
            reloadOffY = -0.06 * sub;
            reloadRotX = -0.15 * sub;
            reloadRotZ = 0.48 * sub;
          } else if (p < 0.72) {
            // Push 12-gauge shells into tube
            const sub = (p - 0.25) / 0.47;
            reloadOffZ = 0.03 * Math.sin(sub * Math.PI * 3);
            reloadRotX = -0.15 + 0.08 * Math.sin(sub * Math.PI * 3);
            reloadRotZ = 0.48;
          } else if (p < 0.90) {
            // Heavy pump rack back and forward
            const sub = (p - 0.72) / 0.18;
            reloadRotZ = 0.48 * (1 - sub);
            reloadOffZ = -0.06 * Math.sin(sub * Math.PI);
            if (pumpMesh) pumpMesh.position.z = -0.14 * Math.sin(sub * Math.PI);
          } else {
            const sub = (p - 0.90) / 0.10;
            if (pumpMesh) pumpMesh.position.z = 0;
            reloadOffY = -0.03 * (1 - sub);
          }
        } else if (this.currentWeapon === 'deagle') {
          // DESERT EAGLE .50 GS SLIDE RACK FULL RELOAD
          if (p < 0.24) {
            const sub = p / 0.24;
            reloadOffY = -0.10 * sub;
            reloadRotX = -0.20 * sub;
            reloadRotZ = 0.35 * sub;
            if (magMesh) magMesh.position.y = -0.38 * sub;
          } else if (p < 0.56) {
            const sub = (p - 0.24) / 0.32;
            reloadOffY = -0.10 + 0.05 * Math.sin(sub * Math.PI);
            reloadRotX = -0.20 + 0.12 * sub;
            reloadRotZ = 0.35 - 0.15 * sub;
            if (magMesh) magMesh.position.y = -0.38 * (1 - sub);
          } else if (p < 0.84) {
            // Left hand reaches over slide, racks rearward and releases slide lock
            const sub = (p - 0.56) / 0.28;
            if (magMesh) magMesh.position.y = 0;
            reloadOffZ = -0.05 * Math.sin(sub * Math.PI);
            reloadRotX = -0.08 * (1 - sub) + 0.06 * Math.sin(sub * Math.PI);
            reloadRotZ = 0.20 * (1 - sub);
            if (slideMesh) slideMesh.position.z = -0.07 * Math.sin(sub * Math.PI);
          } else {
            const sub = (p - 0.84) / 0.16;
            if (magMesh) magMesh.position.y = 0;
            if (slideMesh) slideMesh.position.z = 0;
            reloadOffY = -0.04 * (1 - sub);
          }
        } else {
          // M4A1 BOLT CATCH SLAP FULL RELOAD
          if (p < 0.22) {
            const sub = p / 0.22;
            reloadOffY = -0.11 * Math.sin(sub * Math.PI * 0.5);
            reloadRotX = -0.22 * sub;
            reloadRotY = 0.06 * sub;
            reloadRotZ = 0.38 * sub;
            if (magMesh) magMesh.position.y = -0.42 * sub;
          } else if (p < 0.56) {
            const sub = (p - 0.22) / 0.34;
            reloadOffY = -0.11 + 0.05 * Math.sin(sub * Math.PI);
            reloadRotX = -0.22 + 0.12 * sub;
            reloadRotY = 0.06 - 0.04 * sub;
            reloadRotZ = 0.38 - 0.18 * sub;
            if (magMesh) magMesh.position.y = -0.42 * (1 - sub);
            if (p > 0.46 && p < 0.54) {
              reloadOffY += 0.038;
              reloadRotX += 0.07;
            }
          } else if (p < 0.84) {
            // Left palm slaps bolt catch release paddle on left of receiver
            const sub = (p - 0.56) / 0.28;
            if (magMesh) magMesh.position.y = 0;
            reloadOffZ = -0.04 * Math.sin(sub * Math.PI);
            reloadRotX = -0.10 * (1 - sub) + 0.07 * Math.sin(sub * Math.PI);
            reloadRotZ = 0.20 * (1 - sub);
            if (boltCatchMesh) boltCatchMesh.position.x = 0.015 * Math.sin(sub * Math.PI);
          } else {
            const sub = (p - 0.84) / 0.16;
            if (magMesh) magMesh.position.y = 0;
            if (boltCatchMesh) boltCatchMesh.position.x = 0;
            reloadOffY = -0.04 * (1 - sub);
            reloadRotX = -0.04 * (1 - sub);
          }
        }
      }
    } else {
      if (magMesh) magMesh.position.y = 0;
      if (slideMesh) slideMesh.position.z = 0;
      if (pumpMesh) pumpMesh.position.z = 0;
      if (boltCarrierMesh) boltCarrierMesh.position.z = 0;
      if (boltHandleMesh) {
        boltHandleMesh.rotation.z = 0;
        boltHandleMesh.position.z = 0;
      }
      if (cockingHandleMesh) cockingHandleMesh.position.set(0, 0, 0);
      if (boltCatchMesh) boltCatchMesh.position.x = 0;
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

    // Weapon Camo Inspect & Chamber-Check Animation
    let inspectRotX = 0, inspectRotY = 0, inspectRotZ = 0;
    if (this.isInspecting) {
      const ip = 1 - (this.inspectTimer / this.inspectDuration);
      inspectRotY = Math.sin(ip * Math.PI * 2) * 0.45;
      inspectRotZ = -Math.sin(ip * Math.PI) * 0.65;
      inspectRotX = Math.sin(ip * Math.PI) * 0.15;

      // Authentic COD Chamber Check in first third of inspect animation
      if (ip < 0.40) {
        const pullProgress = Math.sin((ip / 0.40) * Math.PI);
        if (slideMesh) slideMesh.position.z = -0.04 * pullProgress;
        if (boltCarrierMesh) boltCarrierMesh.position.z = -0.045 * pullProgress;
        if (boltHandleMesh) boltHandleMesh.position.z = -0.045 * pullProgress;
        if (cockingHandleMesh) cockingHandleMesh.position.z = -0.04 * pullProgress;
      }
    }

    // Weapon Draw / Swap Animation (Smooth rise from below)
    let drawOffY = 0, drawRotX = 0;
    if (this.isDrawing) {
      this.drawTimer -= dt;
      const dp = Math.max(0, this.drawTimer / this.drawDuration);
      drawOffY = -0.25 * Math.pow(dp, 2);
      drawRotX = -0.35 * Math.pow(dp, 1.5);
      if (this.drawTimer <= 0) {
        this.isDrawing = false;
      }
    }

    // Mantling Weapon Drop/Recovery
    let mantleOffY = 0, mantleRotX = 0;
    if (this.isMantling) {
      const mp = 1 - (this.mantleTimer / this.mantleDuration);
      mantleOffY = -0.28 * Math.sin(mp * Math.PI);
      mantleRotX = -0.45 * Math.sin(mp * Math.PI);
    }

    // Final Position & Rotation integration
    const finalX = targetOffset.x + bobX + swayX + this.swayInertiaX + reloadOffX + meleeOffX;
    const finalY = targetOffset.y + bobY + swayY + this.swayInertiaY + reloadOffY + meleeOffY + mantleOffY + drawOffY;
    const finalZ = targetOffset.z + this.weaponKickZ + reloadOffZ + meleeOffZ;

    this.weaponMesh.position.x = THREE.MathUtils.lerp(this.weaponMesh.position.x, finalX, dt * 20);
    this.weaponMesh.position.y = THREE.MathUtils.lerp(this.weaponMesh.position.y, finalY, dt * 20);
    this.weaponMesh.position.z = THREE.MathUtils.lerp(this.weaponMesh.position.z, finalZ, dt * 25);

    const finalRotX = targetOffset.rx + this.weaponKickRotX - this.swayInertiaY * 1.5 + reloadRotX + meleeRotX + inspectRotX + mantleRotX + drawRotX;
    const finalRotY = targetOffset.ry + this.swayInertiaX * 1.5 + reloadRotY + meleeRotY + inspectRotY;
    const finalRotZ = targetOffset.rz + strafeRoll + reloadRotZ + meleeRotZ + inspectRotZ;

    this.weaponMesh.rotation.x = THREE.MathUtils.lerp(this.weaponMesh.rotation.x, finalRotX, dt * 20);
    this.weaponMesh.rotation.y = THREE.MathUtils.lerp(this.weaponMesh.rotation.y, finalRotY, dt * 20);
    this.weaponMesh.rotation.z = THREE.MathUtils.lerp(this.weaponMesh.rotation.z, finalRotZ, dt * 18);

    // Sync & Dynamically Articulate Viewmodel Arms to Weapon Position
    if (this.armsMesh) {
      this.armsMesh.position.copy(this.weaponMesh.position);
      this.armsMesh.rotation.copy(this.weaponMesh.rotation);

      const leftArm = this.armsMesh.getObjectByName('left_arm_group');
      const rightArm = this.armsMesh.getObjectByName('right_arm_group');

      if (this.isMantling && leftArm && rightArm) {
        // Arms reach out and push down against the ledge
        const mp = 1 - (this.mantleTimer / this.mantleDuration);
        const reach = Math.sin(mp * Math.PI);
        leftArm.position.set(-0.2 + reach * 0.05, -0.05 + reach * 0.22, -0.35 - reach * 0.2);
        leftArm.rotation.set(-reach * 0.6, 0, reach * 0.3);
        rightArm.position.set(0.2 - reach * 0.05, -0.05 + reach * 0.22, -0.35 - reach * 0.2);
        rightArm.rotation.set(-reach * 0.6, 0, -reach * 0.3);
      } else if (this.isDiving && leftArm && rightArm) {
        // Arms extended forward cushioning dive
        leftArm.position.set(-0.22, -0.22, -0.38);
        leftArm.rotation.set(0.35, 0.1, -0.25);
        rightArm.position.set(0.22, -0.22, -0.38);
        rightArm.rotation.set(0.35, -0.1, 0.25);
      } else if (this.isReloading && leftArm) {
        const p = Math.max(0, Math.min(1, 1 - (this.reloadTimer / this.reloadDuration)));
        if (p < 0.45) {
          // Phase 1: Left arm breaks grip, reaches down to plate carrier pouch
          const sub = p / 0.45;
          const reachCurve = Math.sin(sub * Math.PI * 0.5);
          leftArm.position.y = -0.17 - reachCurve * 0.22;
          leftArm.position.z = -0.14 - reachCurve * 0.15;
          leftArm.position.x = -0.17 - reachCurve * 0.05;
          leftArm.rotation.x = reachCurve * 0.45;
          leftArm.rotation.z = -reachCurve * 0.2;
        } else if (p < 0.78) {
          // Phase 2: Insert fresh magazine with forceful palm thrust
          const sub = (p - 0.45) / 0.33;
          leftArm.position.y = -0.39 + sub * 0.22;
          leftArm.position.z = -0.29 + sub * 0.15;
          leftArm.position.x = -0.22 + sub * 0.05;
          leftArm.rotation.x = 0.45 * (1 - sub);
          leftArm.rotation.z = -0.2 * (1 - sub);
        } else {
          // Phase 3: Chamber round / slap bolt and return to handguard
          const sub = (p - 0.78) / 0.22;
          leftArm.position.set(-0.17, -0.17, -0.14);
          leftArm.rotation.set(0, 0, 0);
        }
      } else if (this.isTacSprinting && leftArm && rightArm) {
        // High-speed one-handed tactical sprint carry
        leftArm.position.set(-0.24, -0.35, -0.05);
        leftArm.rotation.set(-0.45, 0.2, -0.35);
        rightArm.position.set(0.18, -0.18, 0.2);
        rightArm.rotation.set(0.35, -0.1, 0.25);
      } else if (this.isSprinting && leftArm && rightArm) {
        // Standard sprint carry
        leftArm.position.set(-0.19, -0.22, -0.08);
        leftArm.rotation.set(-0.25, 0.1, -0.15);
        rightArm.rotation.set(0.15, -0.05, 0.1);
      } else if (leftArm && rightArm) {
        leftArm.position.set(-0.17, -0.17, -0.14);
        leftArm.rotation.set(0, 0, 0);
        rightArm.position.set(0.19, -0.19, 0.22);
        rightArm.rotation.set(0, 0, 0);
      }
    }
  }
}
