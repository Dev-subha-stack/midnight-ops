import * as THREE from 'three';
import { GameMode, GameSettings, HitmarkerEvent, LeanDirection, OpticType, ReticleColor, ReticleStyle, TacticalType, WeaponCamo, WeaponType } from '../types';
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
  public gameMode: GameMode = 'tdm';
  public playerShadowMesh: THREE.Group | null = null;
  private shadowLocomotionPhase: number = 0;
  private shadowRecoilKick: number = 0;
  private shadowLandingImpact: number = 0;
  private wasGroundedLastFrame: boolean = true;
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
  // Leaning Feature (PUBG / BGMI style: Peek Left [<] & Peek Right [>])
  public leanState: LeanDirection = 'none';
  public currentLeanFactor: number = 0; // -1 (full left) to +1 (full right)
  public targetLeanFactor: number = 0;
  public currentLeanOffset: THREE.Vector3 = new THREE.Vector3();
  private leanKeyPressTime: number = 0;
  private activeLeanKey: 'left' | 'right' | null = null;
  public isAiming: boolean = false;
  public isReloading: boolean = false;
  public isShooting: boolean = false;
  public isDrawing: boolean = false;

  // Tactical Optic Attachment & Scope System
  public equippedOptics: Record<WeaponType, OpticType> = { ...DEFAULT_WEAPON_OPTICS };
  public opticReticleColors: Record<WeaponType, ReticleColor> = {
    m4: 'red',
    ak47: 'red',
    scar: 'red',
    mp5: 'green',
    vector: 'cyan',
    sniper: 'red',
    shotgun: 'red',
    deagle: 'green',
  };
  public opticReticleStyles: Record<WeaponType, ReticleStyle> = {
    m4: 'dot',
    ak47: 'dot',
    scar: 'holo_ring',
    mp5: 'dot',
    vector: 'dot',
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
    ak47: 30,
    scar: 20,
    mp5: 30,
    vector: 33,
    sniper: 5,
    shotgun: 8,
    deagle: 7,
  };
  public ammoReserve: Record<WeaponType, number> = {
    m4: 120,
    ak47: 120,
    scar: 80,
    mp5: 150,
    vector: 165,
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

  // Gun Running & Sprint Procedural Animation
  private runCycle: number = 0;
  private runningWeight: number = 0;
  private sprintTurnLagX: number = 0;
  private sprintTurnLagY: number = 0;
  private runLandingShock: number = 0;

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
      this.setLean('none');
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
  public onTacticalChange: (count: number, type: TacticalType) => void = () => {};
  public onTriggerWeatherToggle?: () => void;
  public onLeanChange?: (lean: LeanDirection, factor: number) => void;
  public onFlashbangEffect?: (alpha: number) => void;
  public onConcussionEffect?: (timer: number) => void;
  public onHeartbeatUpdate?: (active: boolean, contacts: { id: string; distance: number; angleOffset: number }[]) => void;

  // Tactical variant effects state
  public flashWhiteoutAlpha: number = 0;
  public concussedTimer: number = 0;
  public heartbeatActiveTimer: number = 0;
  public heartbeatContacts: { id: string; distance: number; angleOffset: number }[] = [];

  public toggleLean(direction: 'left' | 'right') {
    if (this.isDead || this.isMantling) return;
    if (this.leanState === direction) {
      this.setLean('none');
    } else {
      this.setLean(direction);
    }
  }

  public setLean(direction: LeanDirection) {
    if (this.isDead && direction !== 'none') return;
    if (this.leanState === direction) return;

    this.leanState = direction;
    if (direction === 'left') {
      this.targetLeanFactor = -1.0;
      soundManager.playLean('left');
    } else if (direction === 'right') {
      this.targetLeanFactor = 1.0;
      soundManager.playLean('right');
    } else {
      this.targetLeanFactor = 0.0;
      soundManager.playLean('center');
    }

    if (this.onLeanChange) {
      this.onLeanChange(this.leanState, this.targetLeanFactor);
    }
  }

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
    if (!this.equippedOptics[type]) {
      this.equippedOptics[type] = DEFAULT_WEAPON_OPTICS[type] || 'holo_553';
    }
    if (optic) this.equippedOptics[type] = optic;
    if (reticleColor) this.opticReticleColors[type] = reticleColor;
    if (reticleStyle) this.opticReticleStyles[type] = reticleStyle;

    const currentOptic = this.equippedOptics[type] || DEFAULT_WEAPON_OPTICS[type] || 'holo_553';
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

    // Synchronize Real-time 3D Player & Gun Shadow Operator Proxy in map scene
    if (this.playerShadowMesh) {
      this.map.scene.remove(this.playerShadowMesh);
    }
    this.playerShadowMesh = ModelFactory.createPlayerShadowMesh(type, camo, currentOptic);
    this.map.scene.add(this.playerShadowMesh);

    soundManager.playDrawWeapon();
    this.onAmmoChange(this.ammoInMag[type], this.ammoReserve[type]);
  }

  private setupInputs() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;

      // Prevent repetitive trigger spam from holding keys (fixes continuous sound / sprint bug)
      if (e.repeat) return;

      // Tactical Stance Toggle (Z or B Key)
      if (e.code === 'KeyZ' || e.code === 'KeyB') {
        this.isTacStance = !this.isTacStance;
        soundManager.playTacStanceToggle();
      }

      // BGMI / PUBG Leaning Feature: '<' (Comma) leans Left, '>' (Period) leans Right
      const isLeftLean = e.code === 'Comma' || e.key === '<' || e.key === ',';
      const isRightLean = e.code === 'Period' || e.key === '>' || e.key === '.';

      if (isLeftLean && !e.repeat) {
        this.leanKeyPressTime = performance.now();
        this.activeLeanKey = 'left';
        this.toggleLean('left');
      } else if (isRightLean && !e.repeat) {
        this.leanKeyPressTime = performance.now();
        this.activeLeanKey = 'right';
        this.toggleLean('right');
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
          const movingForward = (this.keys['KeyW'] || this.keys['ArrowUp']) && !this.keys['KeyS'] && !this.keys['ArrowDown'];
          // Double-tap Shift triggers tactical sprint high-ready burst; single tap/hold runs standard sprint
          if (now - this.lastShiftPressTime < 320 && this.tacSprintStamina > 0.25 && movingForward) {
            this.isTacSprinting = true;
            this.isSprinting = true;
            soundManager.playTacSprintStart();
          } else {
            this.isTacSprinting = false;
            this.isSprinting = true;
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

      // Weapon quick switch keys 1-8
      if (e.code === 'Digit1') this.equipWeapon('m4');
      if (e.code === 'Digit2') this.equipWeapon('ak47');
      if (e.code === 'Digit3') this.equipWeapon('scar');
      if (e.code === 'Digit4') this.equipWeapon('mp5');
      if (e.code === 'Digit5') this.equipWeapon('vector');
      if (e.code === 'Digit6') this.equipWeapon('shotgun');
      if (e.code === 'Digit7') this.equipWeapon('sniper');
      if (e.code === 'Digit8') this.equipWeapon('deagle');

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

      // Leaning release for hold-to-lean / tap-to-toggle hybrid
      const isLeftLeanUp = e.code === 'Comma' || e.key === '<' || e.key === ',';
      const isRightLeanUp = e.code === 'Period' || e.key === '>' || e.key === '.';
      if (isLeftLeanUp && this.activeLeanKey === 'left') {
        const holdDuration = performance.now() - this.leanKeyPressTime;
        const isHoldMode = this.settings.leanMode === 'hold' || holdDuration > 260;
        if (isHoldMode && this.leanState === 'left') {
          this.setLean('none');
        }
        this.activeLeanKey = null;
      } else if (isRightLeanUp && this.activeLeanKey === 'right') {
        const holdDuration = performance.now() - this.leanKeyPressTime;
        const isHoldMode = this.settings.leanMode === 'hold' || holdDuration > 260;
        if (isHoldMode && this.leanState === 'right') {
          this.setLean('none');
        }
        this.activeLeanKey = null;
      }

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

      const weapons: WeaponType[] = ['m4', 'ak47', 'scar', 'mp5', 'vector', 'shotgun', 'sniper', 'deagle'];
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

      // Viewmodel mouse inertia lag (amplified during sprint for realistic physical weapon weight)
      const sprintInertiaBoost = this.isTacSprinting ? 2.4 : this.isSprinting ? 1.7 : 1.0;
      const inertiaMult = (this.isAiming ? 0.0003 : 0.0012) * sprintInertiaBoost;
      this.swayInertiaX -= e.movementX * inertiaMult;
      this.swayInertiaY += e.movementY * inertiaMult;
      this.swayInertiaX = Math.max(-0.08, Math.min(0.08, this.swayInertiaX));
      this.swayInertiaY = Math.max(-0.08, Math.min(0.08, this.swayInertiaY));
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
      this.velocity.y = 6.4;
      // High-skill bunny-hop momentum preservation: boost forward trajectory
      const forwardDir = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
      this.velocity.x += forwardDir.x * 3.8;
      this.velocity.z += forwardDir.z * 3.8;
      this.isGrounded = false;
      this.cameraRoll += (Math.random() > 0.5 ? 0.04 : -0.04);
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
      } else if (this.currentWeapon === 'ak47') {
        // AK-47 Rock-and-lock + heavy right-side charging handle rack
        setTimeout(() => {
          if (this.isReloading && !this.isTacticalReload) {
            soundManager.playReload(this.currentWeapon, 'ak_mag_in');
          }
        }, (this.reloadDuration * 0.46) * 1000);
        setTimeout(() => {
          if (this.isReloading && !this.isTacticalReload) {
            soundManager.playReload(this.currentWeapon, 'ak_rack');
          }
        }, (this.reloadDuration * 0.76) * 1000);
      } else if (this.currentWeapon === 'scar') {
        // SCAR-17 Heavy battle rifle lock + bolt release slap
        setTimeout(() => {
          if (this.isReloading && !this.isTacticalReload) {
            soundManager.playReload(this.currentWeapon, 'mag_in');
          }
        }, (this.reloadDuration * 0.45) * 1000);
        setTimeout(() => {
          if (this.isReloading && !this.isTacticalReload) {
            soundManager.playReload(this.currentWeapon, 'scar_bolt');
          }
        }, (this.reloadDuration * 0.74) * 1000);
      } else if (this.currentWeapon === 'vector') {
        // Vector CRB fast stick mag insert + snappy slide release
        setTimeout(() => {
          if (this.isReloading && !this.isTacticalReload) {
            soundManager.playReload(this.currentWeapon, 'mag_in');
          }
        }, (this.reloadDuration * 0.42) * 1000);
        setTimeout(() => {
          if (this.isReloading && !this.isTacticalReload) {
            soundManager.playReload(this.currentWeapon, 'vector_charge');
          }
        }, (this.reloadDuration * 0.70) * 1000);
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
        if (bot.isDead || bot.team === 'allies') continue;
        const dist = bot.position.distanceTo(eyePos);
        if (dist < 2.6) {
          const dirToBot = new THREE.Vector3().subVectors(bot.position, eyePos).normalize();
          const angle = forwardDir.angleTo(dirToBot);
          if (angle < Math.PI / 3) {
            hasHit = true;
            const isKill = bot.takeDamage(125, true, forwardDir, 'allies');
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

  public setTacticalType(type: TacticalType) {
    if (!this.grenadeManager) return;
    this.grenadeManager.setTacticalType(type);
    this.onTacticalChange(this.grenadeManager.getTacticalCount(), type);
  }

  public toggleTacticalType() {
    if (!this.grenadeManager) return;
    const newType = this.grenadeManager.toggleTacticalType();
    this.onTacticalChange(this.grenadeManager.getTacticalCount(), newType);
  }

  public triggerFlashWhiteout(intensity: number) {
    this.flashWhiteoutAlpha = Math.min(1.0, Math.max(this.flashWhiteoutAlpha, intensity));
    this.onFlashbangEffect?.(this.flashWhiteoutAlpha);
  }

  public triggerConcussion(intensity: number) {
    this.concussedTimer = Math.max(this.concussedTimer, 3.2 * intensity);
    this.onConcussionEffect?.(this.concussedTimer);
  }

  public triggerHeartbeatScan(contacts: { id: string; distance: number; angleOffset: number }[]) {
    this.heartbeatActiveTimer = 4.0;
    this.heartbeatContacts = contacts;
    this.onHeartbeatUpdate?.(true, contacts);
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
    const isInfiniteAmmo =
      this.gameMode === 'tdm' ||
      this.gameMode === 'ffa' ||
      this.gameMode === 'gungame' ||
      this.gameMode === 'training' ||
      this.gameMode === 'targetrange' ||
      Boolean(this.settings.infiniteAmmo) ||
      Boolean(this.trainingManager && this.trainingManager.telemetry.infiniteAmmo);

    if (this.ammoInMag[this.currentWeapon] <= 0 && !isInfiniteAmmo) {
      this.reload();
      return;
    }

    // Deduct ammo or apply infinite bullets
    if (!isInfiniteAmmo) {
      this.ammoInMag[this.currentWeapon]--;
    } else {
      this.ammoReserve[this.currentWeapon] = 999;
      if (this.ammoInMag[this.currentWeapon] <= 0) {
        this.ammoInMag[this.currentWeapon] = wpnCfg.magSize;
      }
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
    this.shadowRecoilKick = this.isAiming ? 0.08 : 0.16;

    // Play gunshot audio
    soundManager.playGunshot(this.currentWeapon);

    // Alert AI bots of gunshot sound
    this.botManager?.notifySound(this.camera.position, 65, true);

    // Muzzle FX & Shell Casing (Photorealistic weapon barrel alignment)
    const forwardDir = this.camera.getWorldDirection(new THREE.Vector3());
    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const downDir = new THREE.Vector3(0, -1, 0).applyQuaternion(this.camera.quaternion);

    // Position muzzle flash along physical barrel line rather than blocking optical reticle
    const muzzlePos = this.camera.position.clone()
      .add(forwardDir.clone().multiplyScalar(0.62))
      .add(downDir.clone().multiplyScalar(this.isAiming ? 0.13 : 0.09))
      .add(rightDir.clone().multiplyScalar(this.isAiming ? 0.03 : 0.11));

    this.particles.emitMuzzleFlash(muzzlePos, forwardDir, true);
    this.particles.emitShellCasing(muzzlePos.clone().add(rightDir.clone().multiplyScalar(0.12)), rightDir);

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
            if (bot.isDead || bot.team === 'allies') continue;
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
          const isKill = hitBot.takeDamage(finalDmg, isHeadshot, segmentDir, 'allies');

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
      this.particles.spawnBulletTracer(
        this.camera.position.clone().add(shootDir.clone().multiplyScalar(0.4)),
        finalHitPoint,
        this.currentWeapon
      );
    }
  }

  // --- FRAME UPDATE ---
  public update(dt: number) {
    if (!this.isLocked || this.isDead) {
      if (this.playerShadowMesh) this.playerShadowMesh.visible = false;
      return;
    }

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

    // Tactical variant visual/sensory effect decay
    if (this.flashWhiteoutAlpha > 0) {
      this.flashWhiteoutAlpha = Math.max(0, this.flashWhiteoutAlpha - dt * 0.42);
      this.onFlashbangEffect?.(this.flashWhiteoutAlpha);
    }
    if (this.concussedTimer > 0) {
      this.concussedTimer = Math.max(0, this.concussedTimer - dt);
      this.onConcussionEffect?.(this.concussedTimer);
    }
    if (this.heartbeatActiveTimer > 0) {
      this.heartbeatActiveTimer = Math.max(0, this.heartbeatActiveTimer - dt);
      if (this.heartbeatActiveTimer <= 0) {
        this.heartbeatContacts = [];
        this.onHeartbeatUpdate?.(false, []);
      }
    }

    // Update Tactical Laser Sight
    this.updateLaserSight();

    // Camera FOV & ADS Zoom (with dynamic Optic magnification, Variable Zoom & Tac-Sprint)
    const currentOptic = this.equippedOptics[this.currentWeapon] || DEFAULT_WEAPON_OPTICS[this.currentWeapon] || 'holo_553';
    const opticCfg = OPTIC_REGISTRY[currentOptic];
    let targetFov = this.settings.fieldOfView || 85;

    const isFullScope = this.isAiming && !this.isTacStance && Boolean(opticCfg?.hasFullScopeOverlay || (opticCfg?.magnification && opticCfg.magnification >= 3.0));

    if (this.isAiming) {
      if (this.isTacStance) {
        targetFov = targetFov - 10;
      } else if (opticCfg?.variableZoomSteps && opticCfg.variableZoomSteps.length > 0) {
        const mag = opticCfg.variableZoomSteps[this.opticZoomStepIndex % opticCfg.variableZoomSteps.length];
        if (mag >= 10) {
          targetFov = 11; // 12X Extreme Sniper Zoom
        } else if (mag >= 7) {
          targetFov = 18; // 8X Combat Sniper Zoom
        } else if (mag >= 4) {
          targetFov = 32; // 4X Tactical Zoom
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

    // Calculate Dynamic Camera Roll (Strafe Banking + Sliding Lean + PUBG/BGMI Leaning Roll)
    let targetRoll = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) targetRoll += 0.038;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) targetRoll -= 0.038;
    if (this.isSliding) targetRoll += 0.085;
    // PUBG/BGMI Tactical Lean: ~15.5 deg (0.27 rad) head tilt
    const leanRoll = -this.currentLeanFactor * 0.27;
    targetRoll += leanRoll;
    this.cameraRoll = THREE.MathUtils.lerp(this.cameraRoll, targetRoll, dt * 14);

    // Apply Camera Rotation with Recoil & Dynamic Roll
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw + this.recoilYaw;
    this.camera.rotation.x = this.pitch + this.recoilPitch + this.landingJolt;
    this.camera.rotation.z = this.recoilRoll + this.cameraRoll;

    // Viewmodel Positioning, Breathing Sway, Reload & Melee Choreography
    this.updateViewmodel(dt);

    // Synchronize Real-time Articulated Player & Gun Shadow Operator Proxy
    this.updatePlayerShadow(dt);

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

    // Cancel lean if player begins sprinting, diving, sliding, or mantling
    if ((this.isSprinting || this.isTacSprinting || this.isSliding || this.isDiving || this.isMantling) && this.leanState !== 'none') {
      this.setLean('none');
    }

    // Eye height lerp (Dive, Slide, Crouch, Stand)
    this.targetEyeHeight = this.isDiving ? 0.38 : this.isSliding ? 0.65 : this.isCrouching ? 0.95 : 1.7;
    this.currentEyeHeight = THREE.MathUtils.lerp(this.currentEyeHeight, this.targetEyeHeight, dt * 16);

    let baseSpeed = 6.0;
    if (this.isAiming) baseSpeed = this.isTacStance ? 4.2 : 3.0;
    else if (Math.abs(this.currentLeanFactor) > 0.15) baseSpeed = 3.6; // Tactical controlled peek stride
    else if (this.isCrouching) baseSpeed = 3.2;
    else if (this.isTacSprinting) baseSpeed = 13.0; // COD super sprint velocity
    else if (this.isSprinting) baseSpeed = 9.2;

    // Concussion neural suppression slows movement
    if (this.concussedTimer > 0) {
      baseSpeed *= 0.52;
    }

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

    // Free Fire Launch Pad Interaction (Bermuda Center-North at [0, -8])
    if (this.map.mapType === 'bermuda') {
      const launchDist = Math.hypot(this.position.x, this.position.z - (-8));
      if (launchDist < 2.4 && this.position.y <= 2.5 && this.velocity.y <= 1.0) {
        soundManager.playLaunchPad();
        this.velocity.y = 25.0;
        const fwd = this.camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
        this.velocity.x = fwd.x * 22.0;
        this.velocity.z = fwd.z * 22.0;
        this.isGrounded = false;
        this.particles.emitSpark(this.position.clone());
      }
    }

    // Free Fire Glider / Parachute Descent Physics
    if (!this.isGrounded && this.position.y > 6.0 && this.velocity.y < -3.0 && (this.keys['KeyW'] || this.keys['Space'])) {
      // Glider deployed: soft descent velocity and sustained aerodynamic lift
      this.velocity.y = Math.max(-4.2, this.velocity.y - 4.0 * dt);
      const glideDir = this.camera.getWorldDirection(new THREE.Vector3()).setY(0).normalize();
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, glideDir.x * 16.0, dt * 2.5);
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, glideDir.z * 16.0, dt * 2.5);
    } else if (!this.isGrounded) {
      this.velocity.y -= (this.isDiving ? 14.5 : 19.5) * dt;
    }

    // Robust Vertical Elevation & Floor Support (Catwalks, Crates, Shipping Container Roofs, Ground)
    const groundElevation = CollisionSystem.getGroundElevation(this.position, 0.48, this.currentEyeHeight, this.map.obstacles);
    const minFloorY = groundElevation + this.currentEyeHeight;

    // Sub-stepped Horizontal Integration: guarantees movement steps stay under 0.06m
    // This physically prevents high-speed sprinting, sliding, or diving from tunneling through container corners!
    const horizDist = Math.hypot(this.velocity.x, this.velocity.z) * dt;
    const subSteps = Math.max(1, Math.min(6, Math.ceil(horizDist / 0.06)));
    const subDt = dt / subSteps;

    for (let s = 0; s < subSteps; s++) {
      this.position.x += this.velocity.x * subDt;
      this.position.z += this.velocity.z * subDt;
      CollisionSystem.resolveEntityCollision(this.position, this.velocity, 0.48, this.currentEyeHeight, this.map.obstacles);
    }

    this.position.y += this.velocity.y * dt;

    // Floor and Solid Surface collision (Catwalks, Crates, Shipping Containers, Terrain)
    if (this.position.y <= minFloorY) {
      if (!this.isGrounded) {
        this.shadowLandingImpact = Math.min(0.22, Math.abs(this.velocity.y) * 0.025 + 0.08);
        this.runLandingShock = Math.min(0.06, Math.abs(this.velocity.y) * 0.008 + 0.02);
      }
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
      this.position.y = minFloorY;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      if (this.position.y > minFloorY + 0.12 && this.isGrounded) {
        this.isGrounded = false;
      }
    }

    // Dynamic Arena / Island Boundaries (Bermuda: 220x220m vs Warehouse: 90x90m)
    const boundLimit = this.map.mapType === 'bermuda' ? 104 : 43;
    this.position.x = Math.max(-boundLimit, Math.min(boundLimit, this.position.x));
    this.position.z = Math.max(-boundLimit, Math.min(boundLimit, this.position.z));

    // Leaning Factor Interpolation (PUBG/BGMI snappy response)
    this.currentLeanFactor = THREE.MathUtils.lerp(this.currentLeanFactor, this.targetLeanFactor, dt * 16.0);
    if (Math.abs(this.currentLeanFactor) < 0.002 && this.targetLeanFactor === 0) {
      this.currentLeanFactor = 0;
    }

    // Leaning Lateral Translation & Obstacle Protection
    const maxLeanDistance = 0.42; // meters (PUBG standard corner clearance)
    let targetLeanDist = this.currentLeanFactor * maxLeanDistance;

    // Raycast obstacle clearance test to avoid clipping camera inside adjacent walls/crates
    const rightDir = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    if (Math.abs(this.currentLeanFactor) > 0.02 && this.map?.obstacles?.length) {
      const probeDir = rightDir.clone().multiplyScalar(Math.sign(this.currentLeanFactor));
      const eyePos = this.position.clone();
      const obstacleMeshes = this.map.obstacles.map(o => o.mesh);
      const probeRay = new THREE.Raycaster(eyePos, probeDir, 0.05, maxLeanDistance + 0.15);
      const hits = probeRay.intersectObjects(obstacleMeshes, true);
      if (hits.length > 0 && hits[0].distance < maxLeanDistance + 0.15) {
        const allowed = Math.max(0.04, hits[0].distance - 0.12);
        targetLeanDist = Math.sign(this.currentLeanFactor) * Math.min(Math.abs(targetLeanDist), allowed);
      }
    }

    const targetLeanOffset = rightDir.clone().multiplyScalar(targetLeanDist);
    // Spine bending vertical dip (~0.05m)
    targetLeanOffset.y = -Math.abs(this.currentLeanFactor) * 0.05;

    this.currentLeanOffset.lerp(targetLeanOffset, dt * 18.0);
    this.camera.position.copy(this.position).add(this.currentLeanOffset);
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
        // Optic elevation and depth alignment: aligns 3D reticle / front post directly with camera optical axis
        if (currentOptic === 'reflex_dot' || currentOptic === 'red_dot_micro') {
          if (this.currentWeapon === 'm4') { targetOffset.y = -0.143; targetOffset.z = -0.32; }
          else if (this.currentWeapon === 'mp5') { targetOffset.y = -0.123; targetOffset.z = -0.30; }
          else if (this.currentWeapon === 'shotgun') { targetOffset.y = -0.123; targetOffset.z = -0.31; }
          else if (this.currentWeapon === 'deagle') { targetOffset.y = -0.136; targetOffset.z = -0.28; }
          else if (this.currentWeapon === 'sniper') { targetOffset.y = -0.143; targetOffset.z = -0.34; }
          else if (this.currentWeapon === 'ak47') { targetOffset.y = -0.148; targetOffset.z = -0.33; }
          else if (this.currentWeapon === 'scar') { targetOffset.y = -0.144; targetOffset.z = -0.32; }
          else if (this.currentWeapon === 'vector') { targetOffset.y = -0.138; targetOffset.z = -0.31; }
        } else if (currentOptic === 'holo_553') {
          if (this.currentWeapon === 'm4') { targetOffset.y = -0.147; targetOffset.z = -0.32; }
          else if (this.currentWeapon === 'mp5') { targetOffset.y = -0.127; targetOffset.z = -0.30; }
          else if (this.currentWeapon === 'shotgun') { targetOffset.y = -0.127; targetOffset.z = -0.31; }
          else if (this.currentWeapon === 'deagle') { targetOffset.y = -0.140; targetOffset.z = -0.28; }
          else if (this.currentWeapon === 'sniper') { targetOffset.y = -0.147; targetOffset.z = -0.34; }
          else if (this.currentWeapon === 'ak47') { targetOffset.y = -0.152; targetOffset.z = -0.33; }
          else if (this.currentWeapon === 'scar') { targetOffset.y = -0.148; targetOffset.z = -0.32; }
          else if (this.currentWeapon === 'vector') { targetOffset.y = -0.142; targetOffset.z = -0.31; }
        } else if (currentOptic === 'iron_sight') {
          if (this.currentWeapon === 'm4') { targetOffset.y = -0.121; targetOffset.z = -0.32; }
          else if (this.currentWeapon === 'mp5') { targetOffset.y = -0.056; targetOffset.z = -0.30; }
          else if (this.currentWeapon === 'shotgun') { targetOffset.y = -0.054; targetOffset.z = -0.32; }
          else if (this.currentWeapon === 'deagle') { targetOffset.y = -0.094; targetOffset.z = -0.28; }
          else if (this.currentWeapon === 'sniper') { targetOffset.y = -0.121; targetOffset.z = -0.34; }
          else if (this.currentWeapon === 'ak47') { targetOffset.y = -0.124; targetOffset.z = -0.33; }
          else if (this.currentWeapon === 'scar') { targetOffset.y = -0.122; targetOffset.z = -0.32; }
          else if (this.currentWeapon === 'vector') { targetOffset.y = -0.116; targetOffset.z = -0.31; }
        } else if (currentOptic === 'acog_4x') {
          if (this.currentWeapon === 'm4') { targetOffset.y = -0.140; targetOffset.z = -0.33; }
          else if (this.currentWeapon === 'mp5') { targetOffset.y = -0.120; targetOffset.z = -0.31; }
          else if (this.currentWeapon === 'deagle') { targetOffset.y = -0.133; targetOffset.z = -0.29; }
          else if (this.currentWeapon === 'sniper') { targetOffset.y = -0.140; targetOffset.z = -0.35; }
          else if (this.currentWeapon === 'ak47') { targetOffset.y = -0.145; targetOffset.z = -0.34; }
          else if (this.currentWeapon === 'scar') { targetOffset.y = -0.142; targetOffset.z = -0.33; }
          else if (this.currentWeapon === 'vector') { targetOffset.y = -0.136; targetOffset.z = -0.32; }
        } else if (currentOptic === 'thermal_flir' || currentOptic === 'thermal_ir') {
          if (this.currentWeapon === 'm4') { targetOffset.y = -0.143; targetOffset.z = -0.34; }
          else if (this.currentWeapon === 'mp5') { targetOffset.y = -0.123; targetOffset.z = -0.32; }
          else if (this.currentWeapon === 'deagle') { targetOffset.y = -0.136; targetOffset.z = -0.30; }
          else if (this.currentWeapon === 'sniper') { targetOffset.y = -0.143; targetOffset.z = -0.36; }
          else if (this.currentWeapon === 'ak47') { targetOffset.y = -0.148; targetOffset.z = -0.35; }
          else if (this.currentWeapon === 'scar') { targetOffset.y = -0.145; targetOffset.z = -0.34; }
          else if (this.currentWeapon === 'vector') { targetOffset.y = -0.140; targetOffset.z = -0.33; }
        } else if (currentOptic === 'sniper_variable') {
          targetOffset.y = -0.175;
          targetOffset.z = -0.36;
        }
        targetOffset.x = 0.0;
        targetOffset.rx = 0.0;
        targetOffset.ry = 0.0;
        targetOffset.rz = 0.0;
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
        x: 0.16,
        y: -0.21,
        z: -0.30,
        rx: 0.38,
        ry: -0.15,
        rz: 0.18,
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

    // Recovery dampening for running landing shock
    this.runLandingShock = THREE.MathUtils.lerp(this.runLandingShock, 0, dt * 10);

    // AAA Gun Running Kinematics & Modern Warfare Style Weapon Locomotion Animations
    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const isMovingGrounded = horizSpeed > 0.45 && this.isGrounded && !this.isSliding && !this.isDiving && !this.isMantling;
    
    // Target running animation weight: 0 when aiming/still, 1.0 in sprint, 1.35 in tac-sprint, 0.35 in combat walk
    let targetRunWeight = 0;
    if (isMovingGrounded && !this.isAiming) {
      if (this.isTacSprinting) targetRunWeight = 1.35;
      else if (this.isSprinting) targetRunWeight = 1.0;
      else targetRunWeight = 0.35;
    }
    this.runningWeight = THREE.MathUtils.lerp(this.runningWeight, targetRunWeight, dt * 10);

    // Stride cadence speed scales dynamically with velocity
    const strideFreq = this.isTacSprinting ? 14.5 : this.isSprinting ? 12.2 : 8.5;
    if (isMovingGrounded) {
      this.runCycle += dt * strideFreq;
    }

    // Procedural Running Offsets & Multi-Axis Rotations
    let runOffX = 0, runOffY = 0, runOffZ = 0;
    let runRotX = 0, runRotY = 0, runRotZ = 0;

    if (this.runningWeight > 0.001) {
      const rw = this.runningWeight;
      const isTac = this.isTacSprinting;

      // 1. Position Offsets:
      // X: Smooth lateral stride swing (Figure-8 pendulum)
      runOffX = Math.cos(this.runCycle) * (isTac ? 0.026 : 0.018) * rw;
      // Y: Pelvic & shoulder stride dip on footfalls (2x frequency) plus landing cushion
      runOffY = (Math.abs(Math.sin(this.runCycle)) * -0.024 + Math.sin(this.runCycle * 2) * 0.008) * (isTac ? 1.3 : 1.0) * rw - this.runLandingShock;
      // Z: Forward / backward inertial push-pull along weapon bore
      runOffZ = Math.sin(this.runCycle * 2) * (isTac ? 0.022 : 0.012) * rw;

      // 2. Angular Rotations: Pitch, Yaw, Roll
      // Pitch: Barrel dips forward-down as foot hits ground, springs back up during swing phase
      runRotX = (Math.sin(this.runCycle * 2) * (isTac ? 0.065 : 0.042) + this.runLandingShock * 0.9) * rw;
      // Yaw: Weapon rhythmically points across the chest as arms swing in counter-motion
      runRotY = Math.sin(this.runCycle) * (isTac ? 0.095 : 0.068) * rw;
      // Roll: Weapon banks side-to-side with alternating foot push-off
      runRotZ = Math.cos(this.runCycle) * (isTac ? 0.135 : 0.065) * rw;
    }

    // Subtle idle breathing sway
    const bobMult = this.isMounted ? 0.0002 : this.isAiming ? 0.0005 : isMovingGrounded ? 0.003 : 0.0015;
    const bobX = Math.cos(this.swayTime * 0.6) * bobMult;
    const bobY = Math.sin(this.swayTime * 1.2) * bobMult;

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
    const finalX = targetOffset.x + bobX + runOffX + swayX + this.swayInertiaX + reloadOffX + meleeOffX;
    const finalY = targetOffset.y + bobY + runOffY + swayY + this.swayInertiaY + reloadOffY + meleeOffY + mantleOffY + drawOffY;
    const finalZ = targetOffset.z + runOffZ + this.weaponKickZ + reloadOffZ + meleeOffZ;

    this.weaponMesh.position.x = THREE.MathUtils.lerp(this.weaponMesh.position.x, finalX, dt * 20);
    this.weaponMesh.position.y = THREE.MathUtils.lerp(this.weaponMesh.position.y, finalY, dt * 20);
    this.weaponMesh.position.z = THREE.MathUtils.lerp(this.weaponMesh.position.z, finalZ, dt * 25);

    const finalRotX = targetOffset.rx + runRotX + this.weaponKickRotX - this.swayInertiaY * 1.5 + reloadRotX + meleeRotX + inspectRotX + mantleRotX + drawRotX;
    const finalRotY = targetOffset.ry + runRotY + this.swayInertiaX * 1.5 + reloadRotY + meleeRotY + inspectRotY;
    // Natural weapon lean reaction when hipfiring; in ADS keep optical reticle dead-centered
    const weaponLeanRoll = !this.isAiming ? (-this.currentLeanFactor * 0.07) : 0;
    const finalRotZ = targetOffset.rz + runRotZ + strafeRoll + reloadRotZ + meleeRotZ + inspectRotZ + weaponLeanRoll;

    this.weaponMesh.rotation.x = THREE.MathUtils.lerp(this.weaponMesh.rotation.x, finalRotX, dt * 20);
    this.weaponMesh.rotation.y = THREE.MathUtils.lerp(this.weaponMesh.rotation.y, finalRotY, dt * 20);
    this.weaponMesh.rotation.z = THREE.MathUtils.lerp(this.weaponMesh.rotation.z, finalRotZ, dt * 18);

    // Sync & Dynamically Articulate Viewmodel Arms to Weapon Position
    if (this.armsMesh) {
      this.armsMesh.position.copy(this.weaponMesh.position);
      this.armsMesh.rotation.copy(this.weaponMesh.rotation);

      const leftArm = this.armsMesh.getObjectByName('left_arm_group');
      const rightArm = this.armsMesh.getObjectByName('right_arm_group');

      if (leftArm && rightArm) {
        const targetLeftPos = new THREE.Vector3(-0.17, -0.17, -0.14);
        const targetLeftRot = new THREE.Vector3(0, 0, 0);
        const targetRightPos = new THREE.Vector3(0.19, -0.19, 0.22);
        const targetRightRot = new THREE.Vector3(0, 0, 0);

        if (this.isMantling) {
          // Arms reach out and push down against the ledge
          const mp = 1 - (this.mantleTimer / this.mantleDuration);
          const reach = Math.sin(mp * Math.PI);
          targetLeftPos.set(-0.2 + reach * 0.05, -0.05 + reach * 0.22, -0.35 - reach * 0.2);
          targetLeftRot.set(-reach * 0.6, 0, reach * 0.3);
          targetRightPos.set(0.2 - reach * 0.05, -0.05 + reach * 0.22, -0.35 - reach * 0.2);
          targetRightRot.set(-reach * 0.6, 0, -reach * 0.3);
        } else if (this.isDiving) {
          // Arms extended forward cushioning dive
          targetLeftPos.set(-0.22, -0.22, -0.38);
          targetLeftRot.set(0.35, 0.1, -0.25);
          targetRightPos.set(0.22, -0.22, -0.38);
          targetRightRot.set(0.35, -0.1, 0.25);
        } else if (this.isReloading) {
          const p = Math.max(0, Math.min(1, 1 - (this.reloadTimer / this.reloadDuration)));
          if (p < 0.45) {
            // Phase 1: Left arm breaks grip, reaches down to plate carrier pouch
            const sub = p / 0.45;
            const reachCurve = Math.sin(sub * Math.PI * 0.5);
            targetLeftPos.set(-0.17 - reachCurve * 0.05, -0.17 - reachCurve * 0.22, -0.14 - reachCurve * 0.15);
            targetLeftRot.set(reachCurve * 0.45, 0, -reachCurve * 0.2);
          } else if (p < 0.78) {
            // Phase 2: Insert fresh magazine with forceful palm thrust
            const sub = (p - 0.45) / 0.33;
            targetLeftPos.set(-0.22 + sub * 0.05, -0.39 + sub * 0.22, -0.29 + sub * 0.15);
            targetLeftRot.set(0.45 * (1 - sub), 0, -0.2 * (1 - sub));
          } else {
            // Phase 3: Chamber round / slap bolt and return to handguard
            targetLeftPos.set(-0.17, -0.17, -0.14);
            targetLeftRot.set(0, 0, 0);
          }
        } else if (this.isTacSprinting) {
          // High-speed one-handed tactical sprint carry (left arm pumps naturally in rhythm with stride)
          const leftArmPumpY = Math.sin(this.runCycle) * 0.06 * this.runningWeight;
          const leftArmPumpZ = Math.cos(this.runCycle) * 0.08 * this.runningWeight;
          targetLeftPos.set(-0.22, -0.28 + leftArmPumpY, -0.06 + leftArmPumpZ);
          targetLeftRot.set(-0.35 + leftArmPumpY * 1.2, 0.15, -0.25);

          const rightArmBounceY = Math.abs(Math.sin(this.runCycle)) * -0.02 * this.runningWeight;
          targetRightPos.set(0.18, -0.18 + rightArmBounceY, 0.2);
          targetRightRot.set(0.12, -0.05, 0.08);
        } else if (this.isSprinting) {
          // Standard sprint carry: both hands stay securely locked to rifle, flexing with the stride
          const sprintArmFlex = Math.sin(this.runCycle) * 0.02 * this.runningWeight;
          targetLeftPos.set(-0.17 + sprintArmFlex, -0.17, -0.14);
          targetLeftRot.set(sprintArmFlex * 0.5, 0, 0);
          targetRightPos.set(0.19 - sprintArmFlex, -0.19, 0.22);
          targetRightRot.set(sprintArmFlex * 0.5, 0, 0);
        }

        // Smoothly lerp arm joints to completely prevent popping, jittering, or hand-gun separation
        leftArm.position.lerp(targetLeftPos, dt * 18);
        leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, targetLeftRot.x, dt * 18);
        leftArm.rotation.y = THREE.MathUtils.lerp(leftArm.rotation.y, targetLeftRot.y, dt * 18);
        leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, targetLeftRot.z, dt * 18);

        rightArm.position.lerp(targetRightPos, dt * 18);
        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, targetRightRot.x, dt * 18);
        rightArm.rotation.y = THREE.MathUtils.lerp(rightArm.rotation.y, targetRightRot.y, dt * 18);
        rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, targetRightRot.z, dt * 18);
      }

      // Ensure viewmodel rig is completely hidden when aiming down high-power optical scopes
      const isFullScope = this.isAiming && !this.isTacStance && Boolean(opticCfg?.hasFullScopeOverlay || (opticCfg?.magnification && opticCfg.magnification >= 3.0));
      if (this.viewmodelRig && isFullScope) {
        this.viewmodelRig.visible = false;
        if (this.laserBeam) this.laserBeam.visible = false;
      }
    }
  }

  // Real-time Articulated Operator & Weapon Shadow Kinematics
  private updatePlayerShadow(dt: number) {
    if (!this.playerShadowMesh) return;

    if (this.isDead) {
      this.playerShadowMesh.visible = false;
      return;
    }
    this.playerShadowMesh.visible = true;

    // Position operator proxy at ground plane beneath player's feet
    const feetY = this.position.y - this.currentEyeHeight;
    this.playerShadowMesh.position.set(
      this.position.x + this.currentLeanOffset.x * 0.4,
      feetY,
      this.position.z + this.currentLeanOffset.z * 0.4
    );
    this.playerShadowMesh.rotation.y = this.yaw;

    // Movement speed & directional analysis
    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const isMoving = horizSpeed > 0.35 && this.isGrounded;

    // Compute forward/backward and strafe velocity in player local space
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const fwdVelocity = this.velocity.dot(forward);
    const strafeVelocity = this.velocity.dot(right);

    // Dynamic stride frequency scaling
    let strideSpeed = 0;
    if (isMoving) {
      if (this.isTacSprinting) {
        strideSpeed = 16.5;
      } else if (this.isSprinting) {
        strideSpeed = 13.0;
      } else if (this.isCrouching) {
        strideSpeed = 7.5;
      } else {
        strideSpeed = 9.0;
      }
      const dirSign = fwdVelocity >= -0.2 ? 1 : -1;
      this.shadowLocomotionPhase += dt * strideSpeed * dirSign;
    } else {
      this.shadowLocomotionPhase = THREE.MathUtils.lerp(this.shadowLocomotionPhase, 0, dt * 6);
    }

    const pelvis = this.playerShadowMesh.getObjectByName('shadow_pelvis');
    const leftHip = this.playerShadowMesh.getObjectByName('shadow_left_hip');
    const rightHip = this.playerShadowMesh.getObjectByName('shadow_right_hip');
    const leftKnee = this.playerShadowMesh.getObjectByName('shadow_left_knee');
    const rightKnee = this.playerShadowMesh.getObjectByName('shadow_right_knee');
    const upperBody = this.playerShadowMesh.getObjectByName('shadow_upper_body');
    const leftShoulder = this.playerShadowMesh.getObjectByName('shadow_left_shoulder');
    const rightShoulder = this.playerShadowMesh.getObjectByName('shadow_right_shoulder');
    const leftElbow = this.playerShadowMesh.getObjectByName('shadow_left_elbow');
    const rightElbow = this.playerShadowMesh.getObjectByName('shadow_right_elbow');
    const weaponGroup = this.playerShadowMesh.getObjectByName('shadow_weapon_group');

    // --- 1. PELVIS & LOWER BODY KINEMATICS ---
    let targetPelvisY = 0.88;
    let targetPelvisRotX = 0;
    let targetPelvisRotZ = 0;

    let targetLeftHipRotX = 0;
    let targetLeftHipRotZ = 0;
    let targetLeftKneeRotX = 0;

    let targetRightHipRotX = 0;
    let targetRightHipRotZ = 0;
    let targetRightKneeRotX = 0;

    if (this.isSliding) {
      // Combat Baseball Slide: Hips drop low, right leg leads forward, left leg tucked underneath
      targetPelvisY = 0.32;
      targetPelvisRotX = -0.3;
      targetPelvisRotZ = 0.18;

      // Lead leg extended forward
      targetRightHipRotX = 1.25;
      targetRightHipRotZ = 0.15;
      targetRightKneeRotX = 0.15;

      // Rear leg bent back under body
      targetLeftHipRotX = -0.85;
      targetLeftHipRotZ = -0.35;
      targetLeftKneeRotX = 1.95;
    } else if (this.isDiving) {
      // Dolphin Dive: Airborne horizontal body dive
      targetPelvisY = 0.38;
      targetPelvisRotX = 0.65;
      targetLeftHipRotX = -0.4;
      targetRightHipRotX = -0.35;
      targetLeftKneeRotX = 0.3;
      targetRightKneeRotX = 0.25;
    } else if (!this.isGrounded) {
      // Airborne Jump / Fall: Legs tuck up with knees bent ready to absorb landing
      const airLift = THREE.MathUtils.clamp(-this.velocity.y * 0.04, -0.2, 0.4);
      targetPelvisY = 0.88;
      targetLeftHipRotX = -0.45 - airLift * 0.3;
      targetRightHipRotX = -0.35 - airLift * 0.3;
      targetLeftKneeRotX = 0.75 + airLift * 0.4;
      targetRightKneeRotX = 0.65 + airLift * 0.4;
      targetLeftHipRotZ = -0.1;
      targetRightHipRotZ = 0.1;
    } else if (this.isCrouching) {
      // Tactical Crouch: Hips lower to 0.54m, knees spread outwards and flex forward
      targetPelvisY = 0.54 - this.shadowLandingImpact;
      targetPelvisRotX = 0.15;

      if (isMoving) {
        // Crouch Walk Stride
        const crouchStride = Math.sin(this.shadowLocomotionPhase) * 0.42;
        targetLeftHipRotX = -0.65 + crouchStride;
        targetRightHipRotX = -0.65 - crouchStride;
        targetLeftKneeRotX = 1.25 + Math.max(0, -crouchStride) * 0.6;
        targetRightKneeRotX = 1.25 + Math.max(0, crouchStride) * 0.6;
      } else {
        targetLeftHipRotX = -0.65;
        targetRightHipRotX = -0.65;
        targetLeftKneeRotX = 1.35;
        targetRightKneeRotX = 1.35;
      }
      targetLeftHipRotZ = -0.18;
      targetRightHipRotZ = 0.18;
    } else {
      // Standing / Walking / Sprinting / Tac-Sprinting Locomotion
      targetPelvisY = 0.88 - this.shadowLandingImpact;

      if (isMoving) {
        // Natural hip bob with stride
        const hipBob = Math.abs(Math.sin(this.shadowLocomotionPhase)) * (this.isTacSprinting ? 0.045 : 0.025);
        targetPelvisY += hipBob;

        // Stride amplitude scales with sprint speed
        const strideAmp = this.isTacSprinting ? 0.75 : this.isSprinting ? 0.62 : 0.45;
        const stride = Math.sin(this.shadowLocomotionPhase) * strideAmp;

        // Forward leg swing & backward push-off with natural knee flexion
        targetLeftHipRotX = stride;
        targetRightHipRotX = -stride;

        // Knee bends naturally when leg pulls backward (prevents rigid peg-leg look)
        targetLeftKneeRotX = Math.max(0, -stride * 1.4);
        targetRightKneeRotX = Math.max(0, stride * 1.4);

        // Lateral strafe leg angle
        const strafeTilt = THREE.MathUtils.clamp(strafeVelocity / 6, -0.22, 0.22);
        targetLeftHipRotZ = strafeTilt - 0.05;
        targetRightHipRotZ = strafeTilt + 0.05;
      } else {
        // Idle Combat Stance: slight natural offset
        targetLeftHipRotX = 0.06;
        targetRightHipRotX = -0.06;
        targetLeftKneeRotX = 0.08;
        targetRightKneeRotX = 0.08;
        targetLeftHipRotZ = -0.04;
        targetRightHipRotZ = 0.04;
      }
    }

    // Apply smooth interpolation to pelvis & legs
    if (pelvis) {
      pelvis.position.y = THREE.MathUtils.lerp(pelvis.position.y, targetPelvisY, dt * 14);
      pelvis.rotation.x = THREE.MathUtils.lerp(pelvis.rotation.x, targetPelvisRotX, dt * 14);
      pelvis.rotation.z = THREE.MathUtils.lerp(pelvis.rotation.z, targetPelvisRotZ, dt * 14);
    }
    if (leftHip) {
      leftHip.rotation.x = THREE.MathUtils.lerp(leftHip.rotation.x, targetLeftHipRotX, dt * 18);
      leftHip.rotation.z = THREE.MathUtils.lerp(leftHip.rotation.z, targetLeftHipRotZ, dt * 18);
    }
    if (rightHip) {
      rightHip.rotation.x = THREE.MathUtils.lerp(rightHip.rotation.x, targetRightHipRotX, dt * 18);
      rightHip.rotation.z = THREE.MathUtils.lerp(rightHip.rotation.z, targetRightHipRotZ, dt * 18);
    }
    if (leftKnee) {
      leftKnee.rotation.x = THREE.MathUtils.lerp(leftKnee.rotation.x, targetLeftKneeRotX, dt * 18);
    }
    if (rightKnee) {
      rightKnee.rotation.x = THREE.MathUtils.lerp(rightKnee.rotation.x, targetRightKneeRotX, dt * 18);
    }

    // --- 2. UPPER BODY, TORSO & HEAD KINEMATICS ---
    if (upperBody) {
      // Pitches with camera pitch, rolls with Q/E lean, hunches forward during slide/crouch
      const targetUpperY = pelvis ? pelvis.position.y + 0.06 : 0.94;
      let targetUpperPitch = this.pitch * 0.85;
      const targetUpperRoll = -this.currentLeanFactor * 0.22;
      let targetUpperYaw = 0;

      if (this.isSliding) {
        targetUpperPitch -= 0.35; // Leans back against slide momentum
      } else if (this.isDiving) {
        targetUpperPitch += 0.55;
      } else if (this.isCrouching) {
        targetUpperPitch += 0.18; // Hunches forward in ready posture
      } else if (isMoving) {
        // Slight torso forward drive and subtle spine twist with stride
        const fwdLean = this.isTacSprinting ? 0.22 : this.isSprinting ? 0.14 : 0.06;
        targetUpperPitch += fwdLean;
        targetUpperYaw = Math.sin(this.shadowLocomotionPhase) * 0.08;
      }

      upperBody.position.y = THREE.MathUtils.lerp(upperBody.position.y, targetUpperY, dt * 14);
      upperBody.rotation.x = THREE.MathUtils.lerp(upperBody.rotation.x, targetUpperPitch, dt * 16);
      upperBody.rotation.y = THREE.MathUtils.lerp(upperBody.rotation.y, targetUpperYaw, dt * 16);
      upperBody.rotation.z = THREE.MathUtils.lerp(upperBody.rotation.z, targetUpperRoll, dt * 16);
    }

    // --- 3. ARMS & WEAPON KINEMATICS ---
    let leftShoulderRotX = 0.55;
    let leftShoulderRotY = -0.22;
    let leftShoulderRotZ = 0.15;
    let leftElbowRotX = -0.75;

    let rightShoulderRotX = 0.65;
    let rightShoulderRotY = 0.12;
    let rightShoulderRotZ = -0.15;
    let rightElbowRotX = -0.65;

    let weaponPosZ = 0.34;
    let weaponPosY = 0.32;
    let weaponRotX = 0;
    let weaponRotZ = 0;

    // Apply gunshot recoil kick
    weaponPosZ -= this.shadowRecoilKick * 0.12;
    weaponPosY += this.shadowRecoilKick * 0.06;
    weaponRotX += this.shadowRecoilKick * 0.35;
    rightShoulderRotX += this.shadowRecoilKick * 0.2;
    leftShoulderRotX += this.shadowRecoilKick * 0.15;

    if (this.isMeleeing) {
      // Tactical knife slash: Right arm swipes across in aggressive arc
      rightShoulderRotX = 1.35;
      rightShoulderRotY = -0.45;
      rightShoulderRotZ = 0.35;
      rightElbowRotX = -0.25;
      leftShoulderRotX = 0.25;
    } else if (this.isReloading) {
      // Tactical Reload Animation: Weapon tilts up, left arm reaches to plate carrier pouch and drives fresh mag
      const reloadPct = Math.max(0, Math.min(1, 1 - (this.reloadTimer / Math.max(0.1, this.reloadDuration))));
      weaponRotZ = -0.25;
      weaponRotX = 0.22;

      if (reloadPct < 0.45) {
        // Dip down to chest pouch
        const sub = reloadPct / 0.45;
        const reachCurve = Math.sin(sub * Math.PI * 0.5);
        leftShoulderRotX = 0.2 - reachCurve * 0.35;
        leftShoulderRotY = 0.1;
        leftElbowRotX = -0.3 + reachCurve * 0.4;
      } else if (reloadPct < 0.78) {
        // Slam fresh magazine into receiver
        const sub = (reloadPct - 0.45) / 0.33;
        leftShoulderRotX = -0.15 + sub * 0.7;
        leftShoulderRotY = -0.2;
        leftElbowRotX = 0.1 - sub * 0.85;
      } else {
        // Return hand to handguard
        leftShoulderRotX = 0.55;
        leftElbowRotX = -0.75;
      }
    } else if (this.isTacSprinting) {
      // Tactical Sprint: Weapon carried high-ready in right hand, left arm pumps in athletic stride
      rightShoulderRotX = 0.45;
      rightShoulderRotY = -0.15;
      rightShoulderRotZ = 0.25;
      rightElbowRotX = -0.85;

      weaponPosZ = 0.26;
      weaponPosY = 0.38;
      weaponRotX = 0.45; // Gun pointed upward in high-ready
      weaponRotZ = 0.22;

      // Left arm natural running counter-swing
      const armPump = Math.sin(this.shadowLocomotionPhase) * 0.55;
      leftShoulderRotX = -0.15 + armPump;
      leftShoulderRotY = 0.1;
      leftShoulderRotZ = -0.25;
      leftElbowRotX = -0.95;
    } else if (this.isSprinting) {
      // Standard Sprint: Low-ready carry across chest
      rightShoulderRotX = 0.48;
      rightShoulderRotY = 0.08;
      rightElbowRotX = -0.72;

      leftShoulderRotX = 0.42;
      leftShoulderRotY = -0.18;
      leftElbowRotX = -0.68;

      weaponPosY = 0.26;
      weaponRotX = -0.15;
    } else if (this.isAiming) {
      // ADS Aim Down Sights: Weapon locked tight to eye line and shoulder pocket
      rightShoulderRotX = 0.72;
      rightShoulderRotY = 0.05;
      rightShoulderRotZ = -0.08;
      rightElbowRotX = -0.82;

      leftShoulderRotX = 0.62;
      leftShoulderRotY = -0.15;
      leftShoulderRotZ = 0.08;
      leftElbowRotX = -0.78;

      weaponPosZ = 0.38;
      weaponPosY = 0.36;
    } else if (this.isTacStance) {
      // Tactical Stance (Canted Weapon Angle)
      weaponRotZ = 0.42;
      rightShoulderRotZ = 0.12;
      leftShoulderRotZ = 0.18;
    }

    if (leftShoulder) {
      leftShoulder.rotation.x = THREE.MathUtils.lerp(leftShoulder.rotation.x, leftShoulderRotX, dt * 18);
      leftShoulder.rotation.y = THREE.MathUtils.lerp(leftShoulder.rotation.y, leftShoulderRotY, dt * 18);
      leftShoulder.rotation.z = THREE.MathUtils.lerp(leftShoulder.rotation.z, leftShoulderRotZ, dt * 18);
    }
    if (leftElbow) {
      leftElbow.rotation.x = THREE.MathUtils.lerp(leftElbow.rotation.x, leftElbowRotX, dt * 18);
    }
    if (rightShoulder) {
      rightShoulder.rotation.x = THREE.MathUtils.lerp(rightShoulder.rotation.x, rightShoulderRotX, dt * 18);
      rightShoulder.rotation.y = THREE.MathUtils.lerp(rightShoulder.rotation.y, rightShoulderRotY, dt * 18);
      rightShoulder.rotation.z = THREE.MathUtils.lerp(rightShoulder.rotation.z, rightShoulderRotZ, dt * 18);
    }
    if (rightElbow) {
      rightElbow.rotation.x = THREE.MathUtils.lerp(rightElbow.rotation.x, rightElbowRotX, dt * 18);
    }
    if (weaponGroup) {
      weaponGroup.position.z = THREE.MathUtils.lerp(weaponGroup.position.z, weaponPosZ, dt * 18);
      weaponGroup.position.y = THREE.MathUtils.lerp(weaponGroup.position.y, weaponPosY, dt * 18);
      weaponGroup.rotation.x = THREE.MathUtils.lerp(weaponGroup.rotation.x, weaponRotX, dt * 18);
      weaponGroup.rotation.z = THREE.MathUtils.lerp(weaponGroup.rotation.z, weaponRotZ, dt * 18);
    }

    // Decay transient recoil and impact impulses
    this.shadowRecoilKick = THREE.MathUtils.lerp(this.shadowRecoilKick, 0, dt * 14);
    this.shadowLandingImpact = THREE.MathUtils.lerp(this.shadowLandingImpact, 0, dt * 12);
    this.wasGroundedLastFrame = this.isGrounded;
  }
}
