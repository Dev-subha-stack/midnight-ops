import * as THREE from 'three';
import { OpticType, ReticleColor, ReticleStyle, WeaponCamo, WeaponType } from '../types';
import { TextureGenerator } from './textures';
import { CharacterModelLoader } from './character_loader';

// 3D Procedural Weapon Geometry & Viewmodel Builder
// Crafts AAA quality firearm meshes with modular attachments, materials, and optic reticles

export interface WeaponHoldMetrics {
  scale: number;
  gripLocal: THREE.Vector3;
  foregripLocal: THREE.Vector3;
  isPistol: boolean;
}

export interface WeaponHoldPoseOptions {
  stance?: 'ready' | 'combat' | 'reload' | 'dead';
  weaponType?: WeaponType;
  reloadProgress?: number;
  recoilKick?: number;
}

interface CachedHandBasis {
  middleBone: THREE.Object3D;
  e1: THREE.Vector3;
  e2: THREE.Vector3;
  e3: THREE.Vector3;
  hasFullBasis: boolean;
}

interface WeaponHoldRig {
  hips?: THREE.Object3D;
  spine2?: THREE.Object3D;
  head?: THREE.Object3D;
  rightShoulder?: THREE.Object3D;
  rightArm?: THREE.Object3D;
  rightForeArm?: THREE.Object3D;
  rightHand?: THREE.Object3D;
  leftShoulder?: THREE.Object3D;
  leftArm?: THREE.Object3D;
  leftForeArm?: THREE.Object3D;
  leftHand?: THREE.Object3D;
  rightHandBasis?: CachedHandBasis;
  leftHandBasis?: CachedHandBasis;
  handSocket?: THREE.Object3D;
  botWeapon?: THREE.Object3D;
  initialized: boolean;
}

// Reusable scratch math objects for zero-GC per-frame Two-Bone IK & weapon alignment
const _ikRootPos = new THREE.Vector3();
const _ikRootQuat = new THREE.Quaternion();
const _ikRootScale = new THREE.Vector3();
const _ikCharFwd = new THREE.Vector3();
const _ikCharUp = new THREE.Vector3();
const _ikCharRight = new THREE.Vector3();
const _ikCharLeft = new THREE.Vector3();
const _ikRShoulderPos = new THREE.Vector3();
const _ikRElbowPos = new THREE.Vector3();
const _ikRWristPos = new THREE.Vector3();
const _ikLShoulderPos = new THREE.Vector3();
const _ikLElbowPos = new THREE.Vector3();
const _ikLWristPos = new THREE.Vector3();
const _ikShoulderMid = new THREE.Vector3();
const _ikShoulderSpanVec = new THREE.Vector3();
const _ikWeaponQuat = new THREE.Quaternion();
const _ikLocalOffsetQuat = new THREE.Quaternion();
const _ikEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _ikWeaponFwd = new THREE.Vector3();
const _ikWeaponUp = new THREE.Vector3();
const _ikWeaponRight = new THREE.Vector3();
const _ikRTarget = new THREE.Vector3();
const _ikLTarget = new THREE.Vector3();
const _ikForegripSocket = new THREE.Vector3();
const _ikForegripWorld = new THREE.Vector3();
const _ikRPole = new THREE.Vector3();
const _ikLPole = new THREE.Vector3();
const _ikToTarget = new THREE.Vector3();
const _ikDirST = new THREE.Vector3();
const _ikBendDir = new THREE.Vector3();
const _ikElbowTarget = new THREE.Vector3();
const _ikCurDir = new THREE.Vector3();
const _ikDesDir = new THREE.Vector3();
const _ikDeltaQuat = new THREE.Quaternion();
const _ikBoneWorldQuat = new THREE.Quaternion();
const _ikParentWorldQuat = new THREE.Quaternion();
const _ikChildWorldPos = new THREE.Vector3();
const _ikTargetWorldPos = new THREE.Vector3();
const _ikW1 = new THREE.Vector3();
const _ikW2 = new THREE.Vector3();
const _ikW3 = new THREE.Vector3();
const _ikSocketWorld = new THREE.Vector3();
const _ikLeftFingerDir = new THREE.Vector3();
const _ikRightFingerDir = new THREE.Vector3();
const _ikMatWorld = new THREE.Matrix4();
const _ikMatLocal = new THREE.Matrix4();
const _ikMatRot = new THREE.Matrix4();

export class ModelFactory {
  public static getWeaponHoldMetrics(weaponType: WeaponType = 'm4'): WeaponHoldMetrics {
    switch (weaponType) {
      case 'ak47':
        return {
          scale: 0.84,
          gripLocal: new THREE.Vector3(0, -0.075, 0.14),
          foregripLocal: new THREE.Vector3(0, -0.005, -0.30),
          isPistol: false,
        };
      case 'scar':
        return {
          scale: 0.84,
          gripLocal: new THREE.Vector3(0, -0.075, 0.13),
          foregripLocal: new THREE.Vector3(0, 0.005, -0.25),
          isPistol: false,
        };
      case 'mp5':
        return {
          scale: 0.86,
          gripLocal: new THREE.Vector3(0, -0.075, 0.10),
          foregripLocal: new THREE.Vector3(0, -0.015, -0.22),
          isPistol: false,
        };
      case 'vector':
        return {
          scale: 0.86,
          gripLocal: new THREE.Vector3(0, -0.08, 0.15),
          foregripLocal: new THREE.Vector3(0, -0.07, -0.20),
          isPistol: false,
        };
      case 'shotgun':
        return {
          scale: 0.84,
          gripLocal: new THREE.Vector3(0, -0.075, 0.13),
          foregripLocal: new THREE.Vector3(0, -0.02, -0.34),
          isPistol: false,
        };
      case 'sniper':
        return {
          scale: 0.80,
          gripLocal: new THREE.Vector3(0, -0.085, 0.16),
          foregripLocal: new THREE.Vector3(0, -0.025, -0.30),
          isPistol: false,
        };
      case 'deagle':
        return {
          scale: 0.90,
          gripLocal: new THREE.Vector3(0, -0.065, 0.06),
          foregripLocal: new THREE.Vector3(0.02, -0.072, 0.04),
          isPistol: true,
        };
      case 'm4':
      default:
        return {
          scale: 0.84,
          gripLocal: new THREE.Vector3(0, -0.075, 0.12),
          foregripLocal: new THREE.Vector3(0, -0.025, -0.31),
          isPistol: false,
        };
    }
  }
  // --- MODULAR OPTIC MESH BUILDER ---
  public static createOpticMesh(
    optic: OpticType = 'holo_553',
    reticleColor: ReticleColor = 'red',
    reticleStyle: ReticleStyle = 'dot'
  ): THREE.Group {
    const opticGroup = new THREE.Group();
    opticGroup.name = `optic_${optic}`;

    const blackSteelMat = new THREE.MeshStandardMaterial({
      color: 0x181a1f,
      roughness: 0.45,
      metalness: 0.85,
    });

    const polymerMat = new THREE.MeshStandardMaterial({
      color: 0x22262c,
      roughness: 0.8,
      metalness: 0.1,
    });

    const reticleTex = TextureGenerator.createReticleTexture(reticleColor, reticleStyle);
    const reticleMat = new THREE.MeshBasicMaterial({
      map: reticleTex,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    switch (optic) {
      case 'iron_sight': {
        // Low Profile Tritium Flip-up Front & Rear Sights
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.016, 0.22), blackSteelMat);
        base.position.set(0, 0.008, 0);
        opticGroup.add(base);

        const rearNotch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.030, 0.015), blackSteelMat);
        rearNotch.position.set(0, 0.022, 0.09);
        const rearDotL = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.004, 6), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
        rearDotL.rotateX(Math.PI / 2);
        rearDotL.position.set(-0.008, 0.028, 0.098);
        const rearDotR = rearDotL.clone();
        rearDotR.position.x = 0.008;

        const frontPost = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.020, 6), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
        frontPost.position.set(0, 0.022, -0.09);
        opticGroup.add(rearNotch, rearDotL, rearDotR, frontPost);
        break;
      }

      case 'reflex_dot':
      case 'red_dot_micro': {
        // Aimpoint Micro T-2 / Trijicon Open Reflex Optic - Ultra-Wide Clear Aperture, Zero Glass Occlusion
        const mount = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.014, 0.085), blackSteelMat);
        mount.position.set(0, 0.007, 0);
        opticGroup.add(mount);

        // Ultra-slim, wide tubular housing (providing 68mm unobstructed central sightline)
        const tubeTop = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.003, 0.095), blackSteelMat);
        tubeTop.position.set(0, 0.082, 0);
        tubeTop.name = 'optic_tube_top';
        const tubeBottom = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.003, 0.095), blackSteelMat);
        tubeBottom.position.set(0, 0.018, 0);
        tubeBottom.name = 'optic_tube_bottom';
        const tubeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.064, 0.095), blackSteelMat);
        tubeLeft.position.set(-0.038, 0.050, 0);
        tubeLeft.name = 'optic_tube_left';
        const tubeRight = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.064, 0.095), blackSteelMat);
        tubeRight.position.set(0.038, 0.050, 0);
        tubeRight.name = 'optic_tube_right';
        opticGroup.add(tubeTop, tubeBottom, tubeLeft, tubeRight);

        // Slim front & rear circular bezel rings with wide open centers (no solid glass planes)
        const bezelFront = new THREE.Mesh(new THREE.RingGeometry(0.033, 0.037, 24), blackSteelMat);
        bezelFront.position.set(0, 0.050, -0.048);
        bezelFront.rotateY(Math.PI);
        const bezelRear = new THREE.Mesh(new THREE.RingGeometry(0.033, 0.037, 24), blackSteelMat);
        bezelRear.position.set(0, 0.050, 0.048);
        opticGroup.add(bezelFront, bezelRear);

        // Top & side turret knobs
        const turretTop = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.010, 8), blackSteelMat);
        turretTop.position.set(0, 0.088, 0);
        const turretSide = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.010, 8), blackSteelMat);
        turretSide.rotateZ(Math.PI / 2);
        turretSide.position.set(0.043, 0.050, 0);
        opticGroup.add(turretTop, turretSide);
        break;
      }

      case 'acog_4x': {
        // Trijicon 4x32 ACOG Combat Scope - Open Optical Channel with Zero Lens Occlusion
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.018, 0.14), blackSteelMat);
        base.position.set(0, 0.009, 0);
        opticGroup.add(base);

        // Wide hollow body walls leaving center bore 100% open
        const bodyTop = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.003, 0.16), blackSteelMat);
        bodyTop.position.set(0, 0.082, 0);
        const bodyBottom = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.003, 0.16), blackSteelMat);
        bodyBottom.position.set(0, 0.020, 0);
        const bodyLeft = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.062, 0.16), blackSteelMat);
        bodyLeft.position.set(-0.034, 0.051, 0);
        const bodyRight = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.062, 0.16), blackSteelMat);
        bodyRight.position.set(0.034, 0.051, 0);
        opticGroup.add(bodyTop, bodyBottom, bodyLeft, bodyRight);

        // Top fiber optic illumination tube
        const fiberRod = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.11, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        fiberRod.rotateX(Math.PI / 2);
        fiberRod.position.set(0, 0.086, -0.01);
        opticGroup.add(fiberRod);

        // Objective and ocular bezel rings with wide open clear bore
        const bezelFront = new THREE.Mesh(new THREE.RingGeometry(0.030, 0.034, 20), blackSteelMat);
        bezelFront.position.set(0, 0.051, -0.081);
        bezelFront.rotateY(Math.PI);
        const bezelRear = new THREE.Mesh(new THREE.RingGeometry(0.028, 0.032, 20), blackSteelMat);
        bezelRear.position.set(0, 0.051, 0.081);
        opticGroup.add(bezelFront, bezelRear);
        break;
      }

      case 'thermal_flir': {
        // FLIR ThermoSight Pro Thermal Scope - Completely Hollow Sensor Channel
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.018, 0.16), polymerMat);
        base.position.set(0, 0.009, 0);
        opticGroup.add(base);

        // Hollow housing walls with wide clear aperture
        const wallTop = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.003, 0.18), blackSteelMat);
        wallTop.position.set(0, 0.084, 0);
        const wallBottom = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.003, 0.18), blackSteelMat);
        wallBottom.position.set(0, 0.020, 0);
        const wallLeft = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.064, 0.18), blackSteelMat);
        wallLeft.position.set(-0.036, 0.052, 0);
        const wallRight = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.064, 0.18), blackSteelMat);
        wallRight.position.set(0.036, 0.052, 0);
        opticGroup.add(wallTop, wallBottom, wallLeft, wallRight);

        // Objective & Ocular Bezel Rings (Zero lens occlusion)
        const objRing = new THREE.Mesh(new THREE.RingGeometry(0.030, 0.035, 20), new THREE.MeshStandardMaterial({ color: 0x0e7490, metalness: 0.9, roughness: 0.1 }));
        objRing.position.set(0, 0.052, -0.091);
        objRing.rotateY(Math.PI);
        const eyeRing = new THREE.Mesh(new THREE.RingGeometry(0.030, 0.035, 20), polymerMat);
        eyeRing.position.set(0, 0.052, 0.091);
        opticGroup.add(objRing, eyeRing);
        break;
      }

      case 'sniper_variable': {
        // Nightforce ATACR Variable Sniper Scope - Hollow Tubular Chassis with Wide Clear Bore
        const mount = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.024, 0.24), blackSteelMat);
        mount.position.set(0, 0.012, 0);
        opticGroup.add(mount);

        // Hollow tube walls with spacious open channel
        const tubeTop = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.003, 0.32), blackSteelMat);
        tubeTop.position.set(0, 0.106, 0);
        const tubeBottom = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.003, 0.32), blackSteelMat);
        tubeBottom.position.set(0, 0.054, 0);
        const tubeLeft = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.052, 0.32), blackSteelMat);
        tubeLeft.position.set(-0.033, 0.080, 0);
        const tubeRight = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.052, 0.32), blackSteelMat);
        tubeRight.position.set(0.033, 0.080, 0);
        opticGroup.add(tubeTop, tubeBottom, tubeLeft, tubeRight);

        // Tactical Turrets
        const turretElev = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 12), blackSteelMat);
        turretElev.position.set(0, 0.120, 0);
        const turretWind = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 12), blackSteelMat);
        turretWind.rotateZ(Math.PI / 2);
        turretWind.position.set(0.046, 0.080, 0);
        opticGroup.add(turretElev, turretWind);

        // Objective and Ocular Bezel Rings (Zero lens occlusion)
        const bezelFront = new THREE.Mesh(new THREE.RingGeometry(0.030, 0.033, 20), blackSteelMat);
        bezelFront.position.set(0, 0.080, -0.161);
        bezelFront.rotateY(Math.PI);
        const bezelRear = new THREE.Mesh(new THREE.RingGeometry(0.028, 0.031, 20), blackSteelMat);
        bezelRear.position.set(0, 0.080, 0.161);
        opticGroup.add(bezelFront, bezelRear);
        break;
      }

      case 'holo_553':
      default: {
        // EOTech 553 Tactical Holographic Sight - Ultra-Wide Protective Hood, Zero Occluding Glass
        const sightBase = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.014, 0.12), blackSteelMat);
        sightBase.position.set(0, 0.007, 0);
        opticGroup.add(sightBase);

        // Ultra-wide Protective Hood (Left, Right, and Top plates positioned wide at 88mm width clearance)
        const hoodLeft = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.068, 0.095), blackSteelMat);
        hoodLeft.position.set(-0.044, 0.054, 0);
        hoodLeft.name = 'optic_hood_left';
        const hoodRight = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.068, 0.095), blackSteelMat);
        hoodRight.position.set(0.044, 0.054, 0);
        hoodRight.name = 'optic_hood_right';
        const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.003, 0.095), blackSteelMat);
        hoodTop.position.set(0, 0.088, 0);
        hoodTop.name = 'optic_hood_top';
        opticGroup.add(hoodLeft, hoodRight, hoodTop);

        // Battery compartment cylinder offset safely to the right
        const battCap = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.085, 12), blackSteelMat);
        battCap.rotateX(Math.PI / 2);
        battCap.position.set(0.048, 0.016, 0);
        opticGroup.add(battCap);
        break;
      }
    }

    return opticGroup;
  }

  // --- WEAPON MESH BUILDER ---
  public static createWeaponMesh(
    type: WeaponType,
    camo: WeaponCamo = 'standard',
    optic?: OpticType,
    reticleColor: ReticleColor = 'red',
    reticleStyle: ReticleStyle = 'dot'
  ): THREE.Group {
    const weaponGroup = new THREE.Group();
    weaponGroup.name = `weapon_${type}`;

    const metalTexture = camo === 'standard' ? TextureGenerator.createGunMetalTexture(type) : TextureGenerator.createWeaponCamoTexture(camo);
    const metalMat = new THREE.MeshStandardMaterial({
      map: metalTexture,
      roughness: camo === 'gold' ? 0.18 : camo === 'damascus' ? 0.28 : 0.38,
      metalness: camo === 'gold' ? 0.96 : camo === 'damascus' ? 0.88 : 0.82,
    });

    const blackSteelMat = new THREE.MeshStandardMaterial({
      color: 0x141619,
      roughness: 0.35,
      metalness: 0.88,
    });

    const polymerTex = TextureGenerator.createPolymerStippleTexture();
    const polymerMat = new THREE.MeshStandardMaterial({
      map: polymerTex,
      color: 0x22262c,
      roughness: 0.82,
      metalness: 0.08,
    });

    const steelMagTex = TextureGenerator.createSteelMagTexture();
    const steelMagMat = new THREE.MeshStandardMaterial({
      map: steelMagTex,
      roughness: 0.32,
      metalness: 0.88,
    });

    const brassCartridgeMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.18,
      metalness: 0.95,
    });

    const copperBulletMat = new THREE.MeshStandardMaterial({
      color: 0xb87333,
      roughness: 0.24,
      metalness: 0.92,
    });

    const chromeBoltMat = new THREE.MeshStandardMaterial({
      color: 0xd8dee9,
      roughness: 0.15,
      metalness: 0.98,
    });

    const tritiumGreenMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
    });

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x6a381f,
      roughness: 0.68,
      metalness: 0.04,
    });

    const scarTanMat = new THREE.MeshStandardMaterial({
      color: camo === 'standard' ? 0x9c886f : 0x282c34,
      roughness: 0.46,
      metalness: 0.52,
    });

    switch (type) {
      case 'm4': {
        // --- M4A1 MODULAR ASSAULT RIFLE (MODERN WARFARE SPEC) ---
        // 1. Lower Receiver with beveled magwell flare, trigger guard & takedown pins
        const receiverLower = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.095, 0.32), metalMat);
        receiverLower.position.set(0, -0.01, 0.01);
        weaponGroup.add(receiverLower);

        // Magwell Flare bevel
        const magwellFlare = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.045, 0.12), metalMat);
        magwellFlare.position.set(0, -0.065, -0.06);
        weaponGroup.add(magwellFlare);

        // Receiver Takedown and Pivot Pins
        const pinRear = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.072, 8), blackSteelMat);
        pinRear.rotateZ(Math.PI / 2);
        pinRear.position.set(0, 0.015, 0.14);
        const pinFront = pinRear.clone();
        pinFront.position.set(0, -0.01, -0.13);
        weaponGroup.add(pinRear, pinFront);

        // Trigger Guard & Combat Curved Trigger
        const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.008, 0.08), blackSteelMat);
        triggerGuard.position.set(0, -0.075, 0.04);
        const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.032, 0.012), blackSteelMat);
        trigger.rotation.x = -0.32;
        trigger.position.set(0, -0.05, 0.035);
        weaponGroup.add(triggerGuard, trigger);

        // Ambidextrous Fire Selector Switch (Pointing to FULL-AUTO)
        const selectorCore = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.072, 8), blackSteelMat);
        selectorCore.rotateZ(Math.PI / 2);
        selectorCore.position.set(0, -0.008, 0.08);
        const selectorLever = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.022, 0.008), blackSteelMat);
        selectorLever.rotation.x = 0.55; // Auto position
        selectorLever.position.set(-0.036, 0.002, 0.08);
        weaponGroup.add(selectorCore, selectorLever);

        // 2. Upper Receiver with Full-Length 1913 Picatinny Rail
        const upperGeo = new THREE.BoxGeometry(0.064, 0.065, 0.34);
        const receiverUpper = new THREE.Mesh(upperGeo, metalMat);
        receiverUpper.position.set(0, 0.048, -0.02);
        weaponGroup.add(receiverUpper);

        // Individual Picatinny Top Rail Teeth & Slots (19 Recoil Lugs)
        const railBase = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.014, 0.44), blackSteelMat);
        railBase.position.set(0, 0.084, -0.04);
        weaponGroup.add(railBase);
        for (let i = 0; i < 18; i++) {
          const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.005, 0.012), blackSteelMat);
          tooth.position.set(0, 0.092, 0.16 - i * 0.024);
          weaponGroup.add(tooth);
        }

        // Brass Deflector Wedge & Teardrop Forward Assist Housing
        const deflector = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.026, 0.035), metalMat);
        deflector.position.set(0.038, 0.048, 0.075);
        const fwdAssistHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.014, 0.045, 8), blackSteelMat);
        fwdAssistHousing.rotateZ(Math.PI / 3.8);
        fwdAssistHousing.position.set(0.044, 0.06, 0.085);
        const fwdAssistPlunger = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.015, 8), chromeBoltMat);
        fwdAssistPlunger.rotateZ(Math.PI / 3.8);
        fwdAssistPlunger.position.set(0.062, 0.07, 0.085);
        weaponGroup.add(deflector, fwdAssistHousing, fwdAssistPlunger);

        // Ejection Port with Recessed Chrome Bolt Carrier & Spring Dust Cover
        const boltCarrier = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.14, 12), chromeBoltMat);
        boltCarrier.rotateX(Math.PI / 2);
        boltCarrier.position.set(0.02, 0.046, -0.01);
        boltCarrier.name = 'bolt_carrier';
        weaponGroup.add(boltCarrier);

        const dustCover = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.026, 0.095), blackSteelMat);
        dustCover.position.set(0.036, 0.036, -0.01);
        dustCover.name = 'dust_cover';
        weaponGroup.add(dustCover);

        // Ping-Pong Bolt Catch Release Paddle (Left Receiver Wall)
        const boltCatchGroup = new THREE.Group();
        boltCatchGroup.name = 'bolt_catch';
        const boltCatchPin = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.028, 6), blackSteelMat);
        boltCatchPin.position.set(-0.035, 0.03, 0.01);
        const boltCatchPaddle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.038, 0.024), blackSteelMat);
        boltCatchPaddle.position.set(-0.038, 0.044, 0.01);
        boltCatchGroup.add(boltCatchPin, boltCatchPaddle);
        weaponGroup.add(boltCatchGroup);

        // Radian Raptor Ambidextrous Charging Handle (Rear Top Slot)
        const chargingHandle = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.014, 0.038), blackSteelMat);
        chargingHandle.position.set(0, 0.084, 0.17);
        chargingHandle.name = 'charging_handle';
        weaponGroup.add(chargingHandle);

        // 3. Geissele MK16 M-LOK 13.5" Handguard with Octagonal Profile
        const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.082, 0.44), metalMat);
        handguard.position.set(0, 0.04, -0.38);
        weaponGroup.add(handguard);

        // M-LOK Chamfered Recessed Slots (Top, Bottom, and Sides)
        for (let i = 0; i < 6; i++) {
          const slotL = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.016, 0.048), blackSteelMat);
          slotL.position.set(-0.032, 0.04, -0.22 - i * 0.062);
          const slotR = slotL.clone();
          slotR.position.x = 0.032;
          weaponGroup.add(slotL, slotR);
        }

        // Low-Profile Steel Gas Block & Stainless Steel Gas Tube
        const gasBlock = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.042, 0.035), blackSteelMat);
        gasBlock.position.set(0, 0.052, -0.52);
        const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.38, 8), chromeBoltMat);
        gasTube.rotateX(Math.PI / 2);
        gasTube.position.set(0, 0.064, -0.32);
        weaponGroup.add(gasBlock, gasTube);

        // 4. 14.5" Cold Hammer-Forged Match Barrel & Surefire SOCOM Warcomp Muzzle Brake
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.58, 16), blackSteelMat);
        barrel.rotateX(Math.PI / 2);
        barrel.position.set(0, 0.038, -0.62);
        weaponGroup.add(barrel);

        const muzzleWarcomp = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.02, 0.095, 16), blackSteelMat);
        muzzleWarcomp.rotateX(Math.PI / 2);
        muzzleWarcomp.position.set(0, 0.038, -0.93);
        weaponGroup.add(muzzleWarcomp);

        // Radial Ports on Warcomp
        for (let i = 0; i < 4; i++) {
          const port = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.008, 0.04), blackSteelMat);
          port.position.set(Math.cos(i * Math.PI / 2) * 0.02, 0.038 + Math.sin(i * Math.PI / 2) * 0.02, -0.92);
          weaponGroup.add(port);
        }

        // BCM Gunfighter Angled Tactical Foregrip
        const afg = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.078, 0.12), polymerMat);
        afg.position.set(0, -0.038, -0.36);
        afg.rotation.x = -0.32;
        weaponGroup.add(afg);

        // 5. P-MAG 30-round 5.56 Magazine with 3D Cartridge Observation Window
        const magGroup = new THREE.Group();
        magGroup.name = 'magazine';
        const magBody = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.24, 0.11), polymerMat);
        magBody.position.set(0, -0.155, -0.05);
        magBody.rotation.x = -0.16;
        magGroup.add(magBody);

        // PMAG 3D Grip Ribs
        for (let i = 0; i < 5; i++) {
          const rib = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.01, 0.114), polymerMat);
          rib.position.set(0, -0.08 - i * 0.032, -0.035 - i * 0.005);
          rib.rotation.x = -0.16;
          magGroup.add(rib);
        }

        // Flared Baseplate
        const baseplate = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.016, 0.125), polymerMat);
        baseplate.position.set(0, -0.27, -0.07);
        baseplate.rotation.x = -0.16;
        magGroup.add(baseplate);

        // Clear Observation Window with Stacked 5.56 Brass Cartridges
        const roundWindow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.018), new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.35,
          roughness: 0.1,
          transmission: 0.85,
        }));
        roundWindow.position.set(0, -0.155, -0.05);
        roundWindow.rotation.x = -0.16;
        magGroup.add(roundWindow);

        // 3D Brass Cartridges inside magazine
        for (let i = 0; i < 4; i++) {
          const casing = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.036, 8), brassCartridgeMat);
          casing.rotateX(Math.PI / 2);
          casing.position.set(0, -0.12 - i * 0.024, -0.045 - i * 0.004);
          const bullet = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.014, 8), copperBulletMat);
          bullet.rotateX(-Math.PI / 2);
          bullet.position.set(0, -0.12 - i * 0.024, -0.07 - i * 0.004);
          magGroup.add(casing, bullet);
        }
        weaponGroup.add(magGroup);

        // 6. Ergonomic Magpul MOE Pistol Grip with Stippled Texture
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.165, 0.076), polymerMat);
        grip.position.set(0, -0.115, 0.12);
        grip.rotation.x = 0.34;
        weaponGroup.add(grip);

        // 7. Tactical SOPMOD Crane Stock & Mil-Spec 6-Position Buffer Tube
        const bufferTube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 16), blackSteelMat);
        bufferTube.rotateX(Math.PI / 2);
        bufferTube.position.set(0, 0.042, 0.12);
        const castleNut = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 12), blackSteelMat);
        castleNut.rotateX(Math.PI / 2);
        castleNut.position.set(0, 0.042, 0.05);
        weaponGroup.add(bufferTube, castleNut);

        const stockBody = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.135, 0.14), polymerMat);
        stockBody.position.set(0, 0.018, 0.18);
        const rubberPad = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.145, 0.015), blackSteelMat);
        rubberPad.position.set(0, 0.018, 0.255);
        weaponGroup.add(stockBody, rubberPad);

        // 8. AN/PEQ-15 Tactical Laser / Illuminator with Dual Apertures
        const peqHousing = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.03, 0.12), polymerMat);
        peqHousing.position.set(0.044, 0.068, -0.34);
        const peqLens = new THREE.Mesh(new THREE.CircleGeometry(0.008, 12), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        peqLens.position.set(0.044, 0.068, -0.401);
        peqLens.rotateY(Math.PI);
        peqLens.name = 'laser_emitter';
        weaponGroup.add(peqHousing, peqLens);

        // Modular Optic Attachment
        const opticMesh = ModelFactory.createOpticMesh(optic || 'holo_553', reticleColor, reticleStyle);
        opticMesh.position.set(0, 0.095, -0.04);
        weaponGroup.add(opticMesh);
        break;
      }

      case 'mp5': {
        // --- MP5 / LACHMANN SUB 9MM SMG (MODERN WARFARE SPEC) ---
        // Stamped Steel Cylindrical Upper Receiver with Authentic Top Weld Seam
        const receiverCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 16), metalMat);
        receiverCyl.rotateX(Math.PI / 2);
        receiverCyl.position.set(0, 0.01, 0);
        const weldRib = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.008, 0.42), metalMat);
        weldRib.position.set(0, 0.046, 0);
        weaponGroup.add(receiverCyl, weldRib);

        // Cocking Tube with Iconic HK Slap Notch (Left Front Angle)
        const cockingTube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.38, 14), blackSteelMat);
        cockingTube.rotateX(Math.PI / 2);
        cockingTube.position.set(0, 0.046, -0.18);
        weaponGroup.add(cockingTube);

        // Reciprocating / Slappable Cocking Handle with Knurled Rubber Sleeve
        const cockingHandleGroup = new THREE.Group();
        cockingHandleGroup.name = 'cocking_handle';
        const handleStem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.042, 8), blackSteelMat);
        handleStem.rotateZ(Math.PI / 2);
        handleStem.position.set(-0.026, 0.052, -0.31);
        const handleKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.022, 10), polymerMat);
        handleKnob.rotateZ(Math.PI / 2);
        handleKnob.position.set(-0.042, 0.052, -0.31);
        cockingHandleGroup.add(handleStem, handleKnob);
        weaponGroup.add(cockingHandleGroup);

        // Bolt Carrier visible in ejection port
        const boltCarrier = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.12, 12), chromeBoltMat);
        boltCarrier.rotateX(Math.PI / 2);
        boltCarrier.position.set(0.015, 0.012, 0.01);
        boltCarrier.name = 'bolt_carrier';
        weaponGroup.add(boltCarrier);

        // Navy Lower Trigger Group with Pictograph Fire Selector
        const lowerGroup = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.092, 0.25), polymerMat);
        lowerGroup.position.set(0, -0.048, 0.04);
        weaponGroup.add(lowerGroup);

        const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.028, 0.012), blackSteelMat);
        trigger.rotation.x = -0.3;
        trigger.position.set(0, -0.065, 0.03);
        weaponGroup.add(trigger);

        // Ribbed Tropical Forend Handguard with Palm Swell and Front Hand Stop
        const forend = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.046, 0.24, 16), polymerMat);
        forend.rotateX(Math.PI / 2);
        forend.position.set(0, 0, -0.23);
        const handStop = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.032, 0.018), polymerMat);
        handStop.position.set(0, -0.05, -0.34);
        weaponGroup.add(forend, handStop);

        // Cold Hammer Forged 9mm Barrel + 3-Lug Tri-Lug Flash Hider
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.26, 12), blackSteelMat);
        barrel.rotateX(Math.PI / 2);
        barrel.position.set(0, 0.01, -0.42);
        const triLugMuzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.07, 12), blackSteelMat);
        triLugMuzzle.rotateX(Math.PI / 2);
        triLugMuzzle.position.set(0, 0.01, -0.53);
        weaponGroup.add(barrel, triLugMuzzle);

        // Curved 30-round 9mm Steel Magazine with Waffle Ribs & Witness Holes
        const magGroup = new THREE.Group();
        magGroup.name = 'magazine';
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.26, 0.072), steelMagMat);
        mag.position.set(0, -0.155, -0.08);
        mag.rotation.x = -0.24;
        magGroup.add(mag);
        weaponGroup.add(magGroup);

        // Ergonomic Navy Contour Pistol Grip
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.155, 0.068), polymerMat);
        grip.position.set(0, -0.115, 0.1);
        grip.rotation.x = 0.36;
        weaponGroup.add(grip);

        // A3 Retractable Twin-Wire Stock with Textured Buttplate
        const stockRailL = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.016, 0.16), blackSteelMat);
        stockRailL.position.set(-0.032, -0.005, 0.12);
        const stockRailR = stockRailL.clone();
        stockRailR.position.x = 0.032;
        const stockButt = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.125, 0.02), polymerMat);
        stockButt.position.set(0, -0.024, 0.20);
        weaponGroup.add(stockRailL, stockRailR, stockButt);

        // HK Rotating Drum Diopter Rear Sight & Front Hooded Post with Tritium Dot
        const rearDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.024, 12), blackSteelMat);
        rearDrum.position.set(0, 0.058, 0.12);
        const frontHood = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 8, 16), blackSteelMat);
        frontHood.position.set(0, 0.056, -0.34);
        const frontPost = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.016, 6), tritiumGreenMat);
        frontPost.position.set(0, 0.056, -0.34);
        weaponGroup.add(rearDrum, frontHood, frontPost);

        if (optic && optic !== 'iron_sight') {
          const opticMesh = ModelFactory.createOpticMesh(optic, reticleColor, reticleStyle);
          opticMesh.position.set(0, 0.075, -0.04);
          weaponGroup.add(opticMesh);
        }
        break;
      }

      case 'sniper': {
        // --- AX-50 / BARRETT MRAD .50 CAL HEAVY ANTI-MATERIAL RIFLE ---
        // Heavy Monolithic CNC Machined Octagonal Alloy Chassis
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.084, 0.142, 0.62), metalMat);
        chassis.position.set(0, 0, 0);
        weaponGroup.add(chassis);

        // 30-MOA Elevated Top Rail with Numbered Recoil Grooves
        const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.022, 0.68), blackSteelMat);
        topRail.position.set(0, 0.082, -0.04);
        weaponGroup.add(topRail);

        // Massive 29" Match-Grade Heavy Fluted Bull Barrel
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.94, 16), blackSteelMat);
        barrel.rotateX(Math.PI / 2);
        barrel.position.set(0, 0.022, -0.76);
        weaponGroup.add(barrel);

        // Helical Cooling Flutes (8 Flutes along match barrel)
        for (let i = 0; i < 8; i++) {
          const fluting = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.004, 0.68), metalMat);
          const angle = (i * Math.PI) / 4;
          fluting.position.set(Math.cos(angle) * 0.026, 0.022 + Math.sin(angle) * 0.026, -0.72);
          weaponGroup.add(fluting);
        }

        // Multi-Chamber Tactical Tank Muzzle Brake (Triple Baffle)
        const brake = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.062, 0.19), blackSteelMat);
        brake.position.set(0, 0.022, -1.28);
        weaponGroup.add(brake);

        // Lateral blast vents
        for (let i = 0; i < 3; i++) {
          const ventL = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.03), chromeBoltMat);
          ventL.position.set(-0.04, 0.022, -1.22 - i * 0.05);
          const ventR = ventL.clone();
          ventR.position.x = 0.04;
          weaponGroup.add(ventL, ventR);
        }

        // Articulated Steel Bolt Carrier & Bolt Handle with Knurled Tactical Knob
        const boltGroup = new THREE.Group();
        boltGroup.name = 'bolt_carrier';
        const boltBody = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.22, 12), chromeBoltMat);
        boltBody.rotateX(Math.PI / 2);
        boltBody.position.set(0, 0.045, 0.06);

        const boltHandleGroup = new THREE.Group();
        boltHandleGroup.name = 'bolt_handle';
        const boltStem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.075, 8), blackSteelMat);
        boltStem.rotateZ(Math.PI / 2);
        boltStem.position.set(0.045, 0.05, 0.06);
        const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), blackSteelMat);
        boltKnob.position.set(0.085, 0.05, 0.06);
        boltHandleGroup.add(boltStem, boltKnob);

        boltGroup.add(boltBody, boltHandleGroup);
        weaponGroup.add(boltGroup);

        // Heavy .50 BMG Stamped Steel Box Magazine (5 Rounds)
        const magGroup = new THREE.Group();
        magGroup.name = 'magazine';
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.26, 0.165), steelMagMat);
        mag.position.set(0, -0.168, -0.08);
        magGroup.add(mag);
        weaponGroup.add(magGroup);

        // Folded Harris Alloy Tactical Bipod with Tension Spring Details
        const bipodMount = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.03, 0.07), blackSteelMat);
        bipodMount.position.set(0, -0.055, -0.66);
        const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.32, 8), blackSteelMat);
        legL.position.set(-0.068, -0.19, -0.66);
        legL.rotation.z = 0.32;
        const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.32, 8), blackSteelMat);
        legR.position.set(0.068, -0.19, -0.66);
        legR.rotation.z = -0.32;
        weaponGroup.add(bipodMount, legL, legR);

        // Skeletonized Precision Stock with Micro-Adjustable Cheek Pad & Recoil Buttpad
        const stockFrame = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.145, 0.22), polymerMat);
        stockFrame.position.set(0, -0.02, 0.18);
        const cheekRiser = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.038, 0.12), polymerMat);
        cheekRiser.position.set(0, 0.072, 0.16);
        const recoilPad = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.16, 0.02), blackSteelMat);
        recoilPad.position.set(0, -0.02, 0.29);
        weaponGroup.add(stockFrame, cheekRiser, recoilPad);

        // Ergonomic Match Pistol Grip
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.165, 0.078), polymerMat);
        grip.position.set(0, -0.135, 0.16);
        grip.rotation.x = 0.32;
        weaponGroup.add(grip);

        // Variable Sniper Scope Optic
        const sniperOptic = ModelFactory.createOpticMesh(optic || 'sniper_variable', reticleColor, reticleStyle);
        sniperOptic.position.set(0, 0.095, -0.05);
        weaponGroup.add(sniperOptic);
        break;
      }

      case 'shotgun': {
        // --- MODEL 680 BREACHER COMBAT SHOTGUN (MODERN WARFARE SPEC) ---
        // Matte Parkerized Solid Steel Receiver with Beveled Contours
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.122, 0.39), metalMat);
        weaponGroup.add(receiver);

        // Ejection Port and Underside Shell Elevator Gate
        const ejectPort = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.038, 0.11), chromeBoltMat);
        ejectPort.position.set(0.034, 0.024, 0.02);
        const feedRamp = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.012, 0.09), chromeBoltMat);
        feedRamp.position.set(0, -0.058, 0.04);
        weaponGroup.add(ejectPort, feedRamp);

        // 12-Gauge Heavy-Wall Barrel & Under-barrel Magazine Tube
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.62, 16), blackSteelMat);
        barrel.rotateX(Math.PI / 2);
        barrel.position.set(0, 0.032, -0.48);
        const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.58, 16), blackSteelMat);
        magTube.rotateX(Math.PI / 2);
        magTube.position.set(0, -0.016, -0.46);
        weaponGroup.add(barrel, magTube);

        // Perforated Steel Barrel Heat Shield (Ventilated Shroud)
        const heatShield = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.36, 14, 1, true, 0, Math.PI), blackSteelMat);
        heatShield.rotateX(Math.PI / 2);
        heatShield.position.set(0, 0.038, -0.41);
        weaponGroup.add(heatShield);

        // Magpul MOE Pump-Action Forend with Tactile Ridges on Chrome Action Bars
        const pumpGroup = new THREE.Group();
        pumpGroup.name = 'pump_handle';
        const pumpGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.25, 16);
        pumpGeo.rotateX(Math.PI / 2);
        const pump = new THREE.Mesh(pumpGeo, polymerMat);
        pump.position.set(0, -0.016, -0.42);
        const actionBars = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.008, 0.28), chromeBoltMat);
        actionBars.position.set(0, 0.012, -0.32);
        pumpGroup.add(pump, actionBars);
        weaponGroup.add(pumpGroup);

        // Side Saddle with 6 Individually Modeled 12GA Shotgun Shells (Crimson Hull + Brass Rim)
        const saddleMount = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.072, 0.26), polymerMat);
        saddleMount.position.set(-0.046, 0.01, 0);
        weaponGroup.add(saddleMount);
        for (let i = 0; i < 6; i++) {
          const shellBody = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.055, 10), new THREE.MeshStandardMaterial({
            color: 0xdc2626,
            roughness: 0.35,
            metalness: 0.08,
          }));
          shellBody.position.set(-0.058, 0.01, -0.09 + i * 0.036);
          const shellRim = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.014, 10), brassCartridgeMat);
          shellRim.position.set(-0.058, 0.034, -0.09 + i * 0.036);
          weaponGroup.add(shellBody, shellRim);
        }

        // Breaching Standoff Spiked Choke (Crenellated Sawtooth Crown)
        const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.026, 0.095, 16), blackSteelMat);
        muzzleBrake.rotateX(Math.PI / 2);
        muzzleBrake.position.set(0, 0.032, -0.83);
        weaponGroup.add(muzzleBrake);

        // Tactical Fixed Stock with Ribbed Rubber Recoil Buttpad & MOE Grip
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.138, 0.20), polymerMat);
        stock.position.set(0, -0.042, 0.18);
        const pad = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.145, 0.02), blackSteelMat);
        pad.position.set(0, -0.042, 0.285);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.155, 0.072), polymerMat);
        grip.position.set(0, -0.115, 0.13);
        grip.rotation.x = 0.36;
        weaponGroup.add(stock, pad, grip);

        if (optic && optic !== 'iron_sight') {
          const opticMesh = ModelFactory.createOpticMesh(optic, reticleColor, reticleStyle);
          opticMesh.position.set(0, 0.075, -0.04);
          weaponGroup.add(opticMesh);
        }
        break;
      }

      case 'deagle': {
        // --- DESERT EAGLE .50 GS HAND CANNON (MODERN WARFARE SPEC) ---
        // Heavy Sculpted Stainless Steel / Cerakote Slide with Cocking Serrations
        const slideGroup = new THREE.Group();
        slideGroup.name = 'pistol_slide';
        const slide = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.072, 0.33), camo === 'gold' ? brassCartridgeMat : metalMat);
        slide.position.set(0, 0.042, -0.04);
        slideGroup.add(slide);

        // Slide Front and Rear Cocking Cuts
        for (let i = 0; i < 6; i++) {
          const cutL = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.042, 0.01), blackSteelMat);
          cutL.position.set(-0.028, 0.042, 0.04 - i * 0.018);
          const cutR = cutL.clone();
          cutR.position.x = 0.028;
          slideGroup.add(cutL, cutR);
        }

        // Top Ejection Opening showing chamber
        const chamberOpening = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.012, 0.075), blackSteelMat);
        chamberOpening.position.set(0, 0.076, 0.01);
        slideGroup.add(chamberOpening);
        weaponGroup.add(slideGroup);

        // .50 Action Express Polygonal Rifled Bull Barrel & Integrated Top Weaver Rail
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.34, 16), blackSteelMat);
        barrel.rotateX(Math.PI / 2);
        barrel.position.set(0, 0.042, -0.07);
        const weaverRail = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.012, 0.22), blackSteelMat);
        weaverRail.position.set(0, 0.082, -0.09);
        weaponGroup.add(barrel, weaverRail);

        // Heavy Steel Frame with Undercut Trigger Guard & Extended Beavertail
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.066, 0.27), blackSteelMat);
        frame.position.set(0, -0.012, -0.02);
        const triggerGuard = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.008, 0.085), blackSteelMat);
        triggerGuard.position.set(0, -0.052, 0.01);
        const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.028, 0.01), chromeBoltMat);
        trigger.rotation.x = -0.28;
        trigger.position.set(0, -0.035, 0.01);
        weaponGroup.add(frame, triggerGuard, trigger);

        // 7-round .50 AE Steel Magazine with Bumper Floorplate
        const magGroup = new THREE.Group();
        magGroup.name = 'magazine';
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.22, 0.075), steelMagMat);
        mag.position.set(0, -0.12, 0.06);
        mag.rotation.x = 0.29;
        const magBumper = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.018, 0.085), polymerMat);
        magBumper.position.set(0, -0.225, 0.09);
        magBumper.rotation.x = 0.29;
        magGroup.add(mag, magBumper);
        weaponGroup.add(magGroup);

        // Hogue Rubberized Finger-Groove Combat Grip Panels
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.165, 0.088), polymerMat);
        grip.position.set(0, -0.095, 0.06);
        grip.rotation.x = 0.29;
        weaponGroup.add(grip);

        // Skeletonized Commander Hammer (Cocked Single-Action)
        const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.034, 0.022), blackSteelMat);
        hammer.position.set(0, 0.044, 0.12);
        hammer.rotation.x = -0.4;
        hammer.name = 'hammer';
        weaponGroup.add(hammer);

        // High-Visibility 3-Dot Glowing Green Tritium Combat Sights (or Top-Rail Optic)
        if (optic && optic !== 'iron_sight') {
          const opticMesh = ModelFactory.createOpticMesh(optic, reticleColor, reticleStyle);
          opticMesh.position.set(0, 0.088, -0.06);
          weaponGroup.add(opticMesh);
        } else {
          const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.02, 0.022), blackSteelMat);
          frontSight.position.set(0, 0.088, -0.18);
          const frontDot = new THREE.Mesh(new THREE.SphereGeometry(0.003, 8, 8), tritiumGreenMat);
          frontDot.position.set(0, 0.094, -0.17);

          const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.02, 0.016), blackSteelMat);
          rearSight.position.set(0, 0.088, 0.1);
          const rearDotL = new THREE.Mesh(new THREE.SphereGeometry(0.003, 8, 8), tritiumGreenMat);
          rearDotL.position.set(-0.01, 0.094, 0.092);
          const rearDotR = rearDotL.clone();
          rearDotR.position.x = 0.01;

          weaponGroup.add(frontSight, frontDot, rearSight, rearDotL, rearDotR);
        }
        break;
      }

      case 'ak47': {
        // --- AK-47 KALASHNIKOV ASSAULT RIFLE (7.62x39MM SOVIET LEGEND) ---
        // Stamped Steel Main Receiver with Dimples & Rivets
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.096, 0.38), blackSteelMat);
        receiver.position.set(0, 0, 0);
        weaponGroup.add(receiver);

        // Ribbed Stamped Steel Dust Cover
        const dustCover = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.052, 0.35), blackSteelMat);
        dustCover.position.set(0, 0.066, 0.01);
        weaponGroup.add(dustCover);

        // Curved 30-Round "Banana" Magazine (Steel Ribbed with authentic forward angle)
        const magGroup = new THREE.Group();
        magGroup.name = 'magazine';
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.29, 0.09), steelMagMat);
        mag.position.set(0, -0.165, -0.06);
        mag.rotation.x = -0.32;
        const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.016, 0.098), blackSteelMat);
        magBase.position.set(0, -0.3, -0.015);
        magBase.rotation.x = -0.32;
        magGroup.add(mag, magBase);
        weaponGroup.add(magGroup);

        // Classic Russian Laminated Wood Lower & Upper Handguard
        const lowerHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.062, 0.28), woodMat);
        lowerHandguard.position.set(0, 0.008, -0.32);
        const upperHandguard = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.042, 0.24), woodMat);
        upperHandguard.position.set(0, 0.062, -0.31);
        weaponGroup.add(lowerHandguard, upperHandguard);

        // Gas Tube & Gas Block (45-degree angled bleed port)
        const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 12), blackSteelMat);
        gasTube.rotateX(Math.PI / 2);
        gasTube.position.set(0, 0.064, -0.32);
        const gasBlock = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.055, 0.038), blackSteelMat);
        gasBlock.position.set(0, 0.058, -0.48);
        weaponGroup.add(gasTube, gasBlock);

        // 16.3" Cold Hammer-Forged Barrel with Slant Muzzle Compensator
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.46, 12), blackSteelMat);
        barrel.rotateX(Math.PI / 2);
        barrel.position.set(0, 0.025, -0.54);
        const slantBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.045, 12), blackSteelMat);
        slantBrake.rotateX(Math.PI / 2);
        slantBrake.rotation.x += 0.38;
        slantBrake.position.set(0, 0.025, -0.77);
        weaponGroup.add(barrel, slantBrake);

        // Solid Russian Birch Buttstock with Metal Buttplate & Sling Swivel
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.13, 0.28), woodMat);
        stock.position.set(0, -0.018, 0.31);
        const buttPlate = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.134, 0.016), blackSteelMat);
        buttPlate.position.set(0, -0.018, 0.45);
        weaponGroup.add(stock, buttPlate);

        // Wood / Bakelite Pistol Grip
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.065), woodMat);
        grip.position.set(0, -0.11, 0.14);
        grip.rotation.x = 0.38;
        weaponGroup.add(grip);

        // Right-Side Reciprocating Charging Handle & Safety Lever
        const boltCarrier = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.028, 0.18), chromeBoltMat);
        boltCarrier.position.set(0.028, 0.052, 0.02);
        const chargingKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.038, 8), chromeBoltMat);
        chargingKnob.rotateZ(Math.PI / 2);
        chargingKnob.position.set(0.048, 0.052, -0.02);
        boltCarrier.name = 'bolt_carrier';
        weaponGroup.add(boltCarrier, chargingKnob);

        // Iconic Hooded AK Front Sight Post with Tritium Dot
        const frontBase = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.065, 0.028), blackSteelMat);
        frontBase.position.set(0, 0.062, -0.71);
        const frontRing = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.003, 8, 14), blackSteelMat);
        frontRing.position.set(0, 0.082, -0.71);
        const frontPost = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.016, 6), tritiumGreenMat);
        frontPost.position.set(0, 0.082, -0.71);
        weaponGroup.add(frontBase, frontRing, frontPost);

        // Rear Tangent Leaf Sight
        const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.018, 0.08), blackSteelMat);
        rearSight.position.set(0, 0.086, -0.18);
        rearSight.rotation.x = -0.08;
        weaponGroup.add(rearSight);

        if (optic && optic !== 'iron_sight') {
          // Tactical Side Dovetail Mount & Top Rail for Optic
          const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.085, 0.18), blackSteelMat);
          sideRail.position.set(-0.035, 0.06, 0.02);
          const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.014, 0.26), blackSteelMat);
          topRail.position.set(0, 0.108, 0.02);
          weaponGroup.add(sideRail, topRail);

          const opticMesh = ModelFactory.createOpticMesh(optic, reticleColor, reticleStyle);
          opticMesh.position.set(0, 0.118, 0.02);
          weaponGroup.add(opticMesh);
        }
        break;
      }

      case 'vector': {
        // --- KRISS VECTOR .45 ACP CQB SUBMACHINE GUN ---
        // Futuristic Angular Receiver with Patented Super V Recoil Mitigation Cavity
        const mainBody = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.155, 0.38), metalMat);
        mainBody.position.set(0, -0.01, 0.02);
        weaponGroup.add(mainBody);

        // Super V Downward Bolt Track Cover (Distinctive Diagonal Relief)
        const superVCavity = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.11, 0.14), polymerMat);
        superVCavity.position.set(0, -0.06, 0.04);
        superVCavity.rotation.x = -0.28;
        weaponGroup.add(superVCavity);

        // Extended 33-Round .45 Stick Magazine in Forward Magwell
        const magGroup = new THREE.Group();
        magGroup.name = 'magazine';
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.32, 0.048), polymerMat);
        mag.position.set(0, -0.18, -0.08);
        mag.rotation.x = -0.04;
        const magBase = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.02, 0.054), blackSteelMat);
        magBase.position.set(0, -0.33, -0.08);
        magGroup.add(mag, magBase);
        weaponGroup.add(magGroup);

        // Integrated Ergonomic Handguard with Lower Picatinny Foregrip Rail
        const foreRail = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.014, 0.18), blackSteelMat);
        foreRail.position.set(0, -0.085, -0.18);
        const handstop = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.042, 0.03), polymerMat);
        handstop.position.set(0, -0.105, -0.24);
        handstop.rotation.x = 0.25;
        weaponGroup.add(foreRail, handstop);

        // Short Shrouded Match Barrel & Fluted Flash Hider
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.26, 12), blackSteelMat);
        barrel.rotateX(Math.PI / 2);
        barrel.position.set(0, 0.025, -0.28);
        const compensator = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.075, 12), blackSteelMat);
        compensator.rotateX(Math.PI / 2);
        compensator.position.set(0, 0.025, -0.42);
        weaponGroup.add(barrel, compensator);

        // Integrated Combat Pistol Grip with Finger Groove
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.15, 0.068), polymerMat);
        grip.position.set(0, -0.12, 0.15);
        grip.rotation.x = 0.34;
        weaponGroup.add(grip);

        // Tactical Folding Skeletonized Polymer Stock
        const stockHinge = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 8), blackSteelMat);
        stockHinge.position.set(-0.028, 0.02, 0.21);
        const stockArm = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.045, 0.24), polymerMat);
        stockArm.position.set(0, 0.015, 0.32);
        const buttPlate = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.13, 0.018), blackSteelMat);
        buttPlate.position.set(0, -0.025, 0.44);
        weaponGroup.add(stockHinge, stockArm, buttPlate);

        // Full-Length Monolithic Top Picatinny Rail
        const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.014, 0.46), blackSteelMat);
        topRail.position.set(0, 0.075, -0.04);
        weaponGroup.add(topRail);

        if (optic && optic !== 'iron_sight') {
          const opticMesh = ModelFactory.createOpticMesh(optic, reticleColor, reticleStyle);
          opticMesh.position.set(0, 0.085, -0.05);
          weaponGroup.add(opticMesh);
        } else {
          // Flip-up Low Profile Combat Sights
          const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.025, 0.02), blackSteelMat);
          frontSight.position.set(0, 0.09, -0.24);
          const frontDot = new THREE.Mesh(new THREE.SphereGeometry(0.003, 8, 8), tritiumGreenMat);
          frontDot.position.set(0, 0.098, -0.24);
          const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.025, 0.018), blackSteelMat);
          rearSight.position.set(0, 0.09, 0.15);
          weaponGroup.add(frontSight, frontDot, rearSight);
        }
        break;
      }

      case 'scar': {
        // --- FN SCAR-H 7.62MM HEAVY BATTLE RIFLE ---
        // Extruded Monolithic Aluminum Upper in Two-Tone FDE / Tan
        const upperReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.092, 0.48), scarTanMat);
        upperReceiver.position.set(0, 0.038, -0.05);
        weaponGroup.add(upperReceiver);

        // Polymer Lower Receiver with Flared Magwell & Ambi Controls
        const lowerReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.095, 0.32), blackSteelMat);
        lowerReceiver.position.set(0, -0.02, 0.02);
        weaponGroup.add(lowerReceiver);

        // Straight Steel 20-Round 7.62x51mm Box Magazine with Floorplate
        const magGroup = new THREE.Group();
        magGroup.name = 'magazine';
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.22, 0.098), steelMagMat);
        mag.position.set(0, -0.15, -0.07);
        const magBumper = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.018, 0.104), blackSteelMat);
        magBumper.position.set(0, -0.26, -0.07);
        magGroup.add(mag, magBumper);
        weaponGroup.add(magGroup);

        // Full-Length Uninterrupted Top Picatinny Rail (Entire Receiver Length)
        const fullRail = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.014, 0.54), blackSteelMat);
        fullRail.position.set(0, 0.088, -0.07);
        weaponGroup.add(fullRail);

        // Left and Right Accessory Quad-Rails
        const sideRailL = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.024, 0.22), blackSteelMat);
        sideRailL.position.set(-0.038, 0.038, -0.2);
        const sideRailR = sideRailL.clone();
        sideRailR.position.x = 0.038;
        weaponGroup.add(sideRailL, sideRailR);

        // Tactical AN/PEQ-15 Laser / IR Aiming Module on Right Rail
        const scarPeq = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.028, 0.11), blackSteelMat);
        scarPeq.position.set(0.054, 0.038, -0.22);
        const scarPeqLens = new THREE.Mesh(new THREE.CircleGeometry(0.007, 10), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        scarPeqLens.position.set(0.054, 0.038, -0.276);
        scarPeqLens.rotateY(Math.PI);
        weaponGroup.add(scarPeq, scarPeqLens);

        // Heavy 16" Free-Floating Barrel with Gas Regulator & 3-Prong Flash Hider
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.44, 12), blackSteelMat);
        barrel.rotateX(Math.PI / 2);
        barrel.position.set(0, 0.028, -0.48);
        const gasRegulator = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.042, 0.035), blackSteelMat);
        gasRegulator.position.set(0, 0.052, -0.44);
        const flashHider = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.02, 0.09, 12), blackSteelMat);
        flashHider.rotateX(Math.PI / 2);
        flashHider.position.set(0, 0.028, -0.73);
        weaponGroup.add(barrel, gasRegulator, flashHider);

        // Signature SCAR Telescoping & Folding "Boot" Stock with Adjustable Cheek Comb
        const stockBody = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.14, 0.24), scarTanMat);
        stockBody.position.set(0, -0.012, 0.26);
        const cheekRiser = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.035, 0.14), blackSteelMat);
        cheekRiser.position.set(0, 0.065, 0.23);
        const rubberPad = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.146, 0.02), blackSteelMat);
        rubberPad.position.set(0, -0.012, 0.385);
        weaponGroup.add(stockBody, cheekRiser, rubberPad);

        // Ergonomic A2/MOE Pistol Grip
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.16, 0.075), scarTanMat);
        grip.position.set(0, -0.115, 0.13);
        grip.rotation.x = 0.35;
        weaponGroup.add(grip);

        // Left-Side Reciprocating Tactical Charging Handle
        const chargingKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.035, 8), blackSteelMat);
        chargingKnob.rotateZ(Math.PI / 2);
        chargingKnob.position.set(-0.048, 0.065, -0.18);
        chargingKnob.name = 'charging_handle';
        weaponGroup.add(chargingKnob);

        if (optic && optic !== 'iron_sight') {
          const opticMesh = ModelFactory.createOpticMesh(optic, reticleColor, reticleStyle);
          opticMesh.position.set(0, 0.098, -0.05);
          weaponGroup.add(opticMesh);
        } else {
          // Flip-up SCAR Battle Sights
          const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.035, 0.022), blackSteelMat);
          frontSight.position.set(0, 0.095, -0.42);
          const frontDot = new THREE.Mesh(new THREE.SphereGeometry(0.003, 8, 8), tritiumGreenMat);
          frontDot.position.set(0, 0.106, -0.42);
          const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.02), blackSteelMat);
          rearSight.position.set(0, 0.095, 0.12);
          weaponGroup.add(frontSight, frontDot, rearSight);
        }
        break;
      }
    }

    return weaponGroup;
  }

  // --- AAA VIEWMODEL ARMS & ARTICULATED TACTICAL OPERATOR GLOVES ---
  // --- AAA VIEWMODEL ARMS & ARTICULATED TACTICAL OPERATOR GLOVES ---
  public static createViewmodelArms(
    camoVariant: 'allies_multicam' | 'axis_shadow' | 'spec_ops' | 'desert_tan' = 'allies_multicam'
  ): THREE.Group {
    const armsGroup = new THREE.Group();
    armsGroup.name = 'viewmodel_arms';

    const gloveTexture = TextureGenerator.createTacticalGloveTexture();
    const sleeveTexture = TextureGenerator.createOperatorUniformTexture(camoVariant);
    const watchTexture = TextureGenerator.createSmartWatchTexture('10:42:15', 118);

    const gloveMat = new THREE.MeshStandardMaterial({
      map: gloveTexture,
      roughness: 0.65,
      metalness: 0.15,
    });

    const knuckleMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.28,
      metalness: 0.85,
    });

    const sleeveMat = new THREE.MeshStandardMaterial({
      map: sleeveTexture,
      roughness: 0.78,
      metalness: 0.05,
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373,
      roughness: 0.64,
      metalness: 0.04,
    });

    const underlayerMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.85,
      metalness: 0.05,
    });

    const strapMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.5,
      metalness: 0.4,
    });

    // Helper to create an articulated tactical hand with individual fingers
    const createArticulatedHand = (isLeft: boolean) => {
      const handGroup = new THREE.Group();
      handGroup.name = isLeft ? 'left_hand' : 'right_hand';

      // Palm & Back of hand
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.035, 0.08), gloveMat);
      palm.position.set(0, 0, 0);
      handGroup.add(palm);

      // Molded Carbon Fiber Knuckle Guard
      const knuckleGuard = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.016, 0.034), knuckleMat);
      knuckleGuard.position.set(0, 0.021, -0.015);
      knuckleGuard.rotation.x = -0.15;
      handGroup.add(knuckleGuard);

      // 4 Individual Molded Knuckle Protectors
      for (let i = -1.5; i <= 1.5; i++) {
        const kCap = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 8, 8), knuckleMat);
        kCap.scale.set(1, 0.75, 1.25);
        kCap.position.set(i * 0.016, 0.025, -0.015);
        handGroup.add(kCap);
      }

      // Articulated Fingers (Index, Middle, Ring, Pinky)
      const fingerNames = ['index', 'middle', 'ring', 'pinky'];
      fingerNames.forEach((fname, idx) => {
        const fingerGroup = new THREE.Group();
        const posX = isLeft ? (-0.024 + idx * 0.016) : (0.024 - idx * 0.016);
        fingerGroup.position.set(posX, 0.005, -0.04);

        // Proximal phalanx (base segment)
        const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0068, 0.0072, 0.028, 8), gloveMat);
        seg1.rotateX(Math.PI / 2);
        seg1.position.set(0, 0, -0.014);

        // Curled gripping angle depending on hand
        if (!isLeft && idx === 0) {
          // Right trigger finger: extended along trigger guard or hooked on trigger
          seg1.rotation.x = 1.15;
          seg1.position.set(0, -0.008, -0.018);
        } else {
          // Wrapped securely around grip / handguard
          seg1.rotation.x = 1.52;
          seg1.position.set(0, -0.012, -0.012);
        }

        fingerGroup.add(seg1);
        handGroup.add(fingerGroup);
      });

      // Thumb with articulated grip
      const thumbGroup = new THREE.Group();
      const thumbX = isLeft ? 0.038 : -0.038;
      thumbGroup.position.set(thumbX, -0.005, 0.01);
      thumbGroup.rotation.y = isLeft ? -0.6 : 0.6;
      thumbGroup.rotation.z = isLeft ? 0.4 : -0.4;

      const thumbSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.0088, 0.034, 8), gloveMat);
      thumbSeg.rotateX(Math.PI / 2);
      thumbSeg.position.set(0, 0, -0.016);
      thumbGroup.add(thumbSeg);
      handGroup.add(thumbGroup);

      // Glove Wrist Cuff with Velcro Adjustment Strap
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.035, 14), strapMat);
      cuff.position.set(0, 0, 0.05);
      cuff.rotateX(Math.PI / 2);

      const pullTab = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.032, 0.006), knuckleMat);
      pullTab.position.set(0, -0.04, 0.05);
      handGroup.add(cuff, pullTab);

      return handGroup;
    };

    // --- RIGHT ARM (TRIGGER ARM & FIRING CONTROL) ---
    // Positioned at rifle pistol grip (0.018, -0.105, 0.125) so gloved fingers wrap the grip cleanly
    const rightArmGroup = new THREE.Group();
    rightArmGroup.name = 'right_arm_group';
    rightArmGroup.position.set(0.018, -0.105, 0.125);

    // Anatomical Forearm & Multicam Sleeve angling down-right back toward operator shoulder
    const rightSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.068, 0.36, 14), sleeveMat);
    rightSleeve.position.set(0.11, -0.15, 0.22);
    rightSleeve.rotation.x = 0.92;
    rightSleeve.rotation.y = 0.28;
    rightSleeve.rotation.z = -0.38;
    rightArmGroup.add(rightSleeve);

    // Rolled Sleeve Fabric Cuff Fold (Triple rolled combat shirt sleeve)
    const rightCuffFold = new THREE.Mesh(new THREE.TorusGeometry(0.060, 0.015, 10, 20), sleeveMat);
    rightCuffFold.position.set(0.062, -0.082, 0.12);
    rightCuffFold.rotation.x = 0.92;
    rightCuffFold.rotation.y = 0.28;
    rightCuffFold.rotation.z = -0.38;
    rightArmGroup.add(rightCuffFold);

    // Exposed Muscular Forearm between sleeve and glove
    const rightForearmSkin = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.040, 0.11, 14), skinMat);
    rightForearmSkin.position.set(0.032, -0.042, 0.065);
    rightForearmSkin.rotation.x = 0.92;
    rightForearmSkin.rotation.y = 0.28;
    rightForearmSkin.rotation.z = -0.38;
    rightArmGroup.add(rightForearmSkin);

    // Right Hand wrapped naturally around pistol grip
    const rightHand = createArticulatedHand(false);
    rightHand.position.set(0, 0, 0);
    rightHand.rotation.set(0.24, -0.15, -0.45);
    rightArmGroup.add(rightHand);

    // --- LEFT ARM (TACTICAL FOREGRIP / C-CLAMP SUPPORT) ---
    // Positioned at rifle handguard / AFG (-0.026, -0.042, -0.30)
    const leftArmGroup = new THREE.Group();
    leftArmGroup.name = 'left_arm_group';
    leftArmGroup.position.set(-0.026, -0.042, -0.30);

    // Forearm & Sleeve angling back-left toward left chest/shoulder
    const leftSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.068, 0.40, 14), sleeveMat);
    leftSleeve.position.set(-0.14, -0.16, 0.26);
    leftSleeve.rotation.x = 0.84;
    leftSleeve.rotation.y = -0.48;
    leftSleeve.rotation.z = 0.34;
    leftArmGroup.add(leftSleeve);

    // Rolled Sleeve Fabric Cuff Fold
    const leftCuffFold = new THREE.Mesh(new THREE.TorusGeometry(0.060, 0.015, 10, 20), sleeveMat);
    leftCuffFold.position.set(-0.075, -0.088, 0.13);
    leftCuffFold.rotation.x = 0.84;
    leftCuffFold.rotation.y = -0.48;
    leftCuffFold.rotation.z = 0.34;
    leftArmGroup.add(leftCuffFold);

    // Exposed Muscular Forearm
    const leftForearmSkin = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.040, 0.11, 14), skinMat);
    leftForearmSkin.position.set(-0.036, -0.044, 0.065);
    leftForearmSkin.rotation.x = 0.84;
    leftForearmSkin.rotation.y = -0.48;
    leftForearmSkin.rotation.z = 0.34;
    leftArmGroup.add(leftForearmSkin);

    // Left Hand cupping handguard from underneath-left
    const leftHand = createArticulatedHand(true);
    leftHand.position.set(0, 0, 0);
    leftHand.rotation.set(0.18, 0.38, -1.05);
    leftArmGroup.add(leftHand);

    // --- HIGH-TECH TACTICAL SMARTWATCH ON LEFT WRIST ---
    const watchGroup = new THREE.Group();
    watchGroup.name = 'smartwatch_display';
    watchGroup.position.set(-0.045, -0.015, 0.075);
    watchGroup.rotation.x = Math.PI / 2.2;
    watchGroup.rotation.y = 0.35;
    watchGroup.rotation.z = -0.25;

    // Bezel housing
    const watchCase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.012, 20),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.28, metalness: 0.88 })
    );
    watchGroup.add(watchCase);

    // Raised knurled titanium pushers
    const pusher1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.008, 8), knuckleMat);
    pusher1.position.set(0.029, 0.002, 0.012);
    pusher1.rotation.z = Math.PI / 2;
    const pusher2 = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.008, 8), knuckleMat);
    pusher2.position.set(0.029, 0.002, -0.012);
    pusher2.rotation.z = Math.PI / 2;
    watchGroup.add(pusher1, pusher2);

    // Illuminated OLED Screen
    const watchScreen = new THREE.Mesh(
      new THREE.CircleGeometry(0.024, 20),
      new THREE.MeshStandardMaterial({
        map: watchTexture,
        roughness: 0.08,
        metalness: 0.2,
        emissive: 0x0284c7,
        emissiveIntensity: 0.55,
      })
    );
    watchScreen.name = 'smartwatch_screen_mesh';
    watchScreen.position.y = 0.007;
    watchScreen.rotation.x = -Math.PI / 2;
    watchGroup.add(watchScreen);

    // Tactical Silicone / Ballistic Nylon Watch Strap
    const watchStrap = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.008, 0.09),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
    );
    watchStrap.position.set(0, -0.004, 0);
    watchGroup.add(watchStrap);

    leftArmGroup.add(watchGroup);

    // Tactical CAT Gen 7 Combat Application Tourniquet on Left Forearm
    const tqBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.059, 0.059, 0.038, 14),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 })
    );
    tqBand.position.set(-0.095, -0.105, 0.165);
    tqBand.rotation.x = 0.84;
    tqBand.rotation.y = -0.48;
    tqBand.rotation.z = 0.34;
    const tqWindlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, 0.012, 0.065),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 })
    );
    tqWindlass.position.set(-0.125, -0.085, 0.165);
    leftArmGroup.add(tqBand, tqWindlass);

    // Tactical Mil-Spec Paracord Survival Bracelet on Right Wrist
    const bracelet = new THREE.Mesh(
      new THREE.TorusGeometry(0.042, 0.007, 8, 18),
      new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.82 })
    );
    bracelet.position.set(0.038, -0.048, 0.072);
    bracelet.rotation.x = 0.92;
    bracelet.rotation.y = 0.28;
    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.018, 0.012, 0.024),
      knuckleMat
    );
    buckle.position.set(0.068, -0.048, 0.072);
    rightArmGroup.add(bracelet, buckle);

    armsGroup.add(rightArmGroup, leftArmGroup);
    return armsGroup;
  }

  private static findSkeletonBone(root: THREE.Object3D, patterns: RegExp[]): THREE.Object3D | undefined {
    let found: THREE.Object3D | undefined;
    for (const pat of patterns) {
      root.traverse((child) => {
        if (!found && child.name && pat.test(child.name)) {
          found = child;
        }
      });
      if (found) return found;
    }
    return undefined;
  }

  private static buildHandBasis(hand: THREE.Object3D, side: 'Left' | 'Right'): CachedHandBasis | undefined {
    const middleBone = ModelFactory.findSkeletonBone(hand, [
      new RegExp(`${side}HandMiddle1$`, 'i'),
      new RegExp(`${side}.*Middle1`, 'i'),
      new RegExp(`${side}HandIndex1$`, 'i'),
      new RegExp(`${side}.*Index1`, 'i'),
    ]);
    if (!middleBone) return undefined;

    const indexBone = ModelFactory.findSkeletonBone(hand, [
      new RegExp(`${side}HandIndex1$`, 'i'),
      new RegExp(`${side}.*Index1`, 'i'),
    ]);
    const pinkyBone = ModelFactory.findSkeletonBone(hand, [
      new RegExp(`${side}HandPinky1$`, 'i'),
      new RegExp(`${side}.*Pinky1`, 'i'),
      new RegExp(`${side}HandRing1$`, 'i'),
    ]);

    const e1 = middleBone.position.clone();
    if (e1.lengthSq() < 1e-6) return undefined;
    e1.normalize();

    if (indexBone && pinkyBone) {
      const across = pinkyBone.position.clone().sub(indexBone.position);
      if (across.lengthSq() > 1e-6) {
        const e3 = new THREE.Vector3().crossVectors(e1, across);
        if (e3.lengthSq() > 1e-6) {
          e3.normalize();
          const e2 = new THREE.Vector3().crossVectors(e3, e1).normalize();
          return { middleBone, e1, e2, e3, hasFullBasis: true };
        }
      }
    }

    return {
      middleBone,
      e1,
      e2: new THREE.Vector3(),
      e3: new THREE.Vector3(),
      hasFullBasis: false,
    };
  }

  private static getOrCacheWeaponHoldRig(botRoot: THREE.Object3D): WeaponHoldRig {
    if (botRoot.userData.__weaponHoldRig) {
      return botRoot.userData.__weaponHoldRig as WeaponHoldRig;
    }

    const rightHand = ModelFactory.findSkeletonBone(botRoot, [
      /RightHand$/i,
      /Right_Hand$/i,
      /hand_r$/i,
      /R_Hand$/i,
      /Bip01 R Hand$/i,
    ]);
    const leftHand = ModelFactory.findSkeletonBone(botRoot, [
      /LeftHand$/i,
      /Left_Hand$/i,
      /hand_l$/i,
      /L_Hand$/i,
      /Bip01 L Hand$/i,
    ]);

    const rightForeArm = ModelFactory.findSkeletonBone(botRoot, [
      /RightForeArm$/i,
      /Right_ForeArm$/i,
      /lowerarm_r$/i,
      /Bip01 R Forearm$/i,
    ]);
    const leftForeArm = ModelFactory.findSkeletonBone(botRoot, [
      /LeftForeArm$/i,
      /Left_ForeArm$/i,
      /lowerarm_l$/i,
      /Bip01 L Forearm$/i,
    ]);

    const rightArm = ModelFactory.findSkeletonBone(botRoot, [
      /RightArm$/i,
      /Right_Arm$/i,
      /upperarm_r$/i,
      /Bip01 R UpperArm$/i,
    ]);
    const leftArm = ModelFactory.findSkeletonBone(botRoot, [
      /LeftArm$/i,
      /Left_Arm$/i,
      /upperarm_l$/i,
      /Bip01 L UpperArm$/i,
    ]);

    const rig: WeaponHoldRig = {
      hips: ModelFactory.findSkeletonBone(botRoot, [/Hips$/i, /Pelvis$/i]),
      spine2: ModelFactory.findSkeletonBone(botRoot, [/Spine2$/i, /Chest$/i, /Spine1$/i, /Spine$/i]),
      head: ModelFactory.findSkeletonBone(botRoot, [/Head$/i]),
      rightShoulder: ModelFactory.findSkeletonBone(botRoot, [/RightShoulder$/i, /clavicle_r$/i]),
      rightArm,
      rightForeArm,
      rightHand,
      leftShoulder: ModelFactory.findSkeletonBone(botRoot, [/LeftShoulder$/i, /clavicle_l$/i]),
      leftArm,
      leftForeArm,
      leftHand,
      rightHandBasis: rightHand ? ModelFactory.buildHandBasis(rightHand, 'Right') : undefined,
      leftHandBasis: leftHand ? ModelFactory.buildHandBasis(leftHand, 'Left') : undefined,
      handSocket: botRoot.getObjectByName('hand_weapon_socket') || undefined,
      botWeapon: botRoot.getObjectByName('bot_weapon') || undefined,
      initialized: true,
    };

    botRoot.userData.__weaponHoldRig = rig;
    return rig;
  }

  private static rotateBoneWorldDelta(
    bone: THREE.Object3D,
    deltaWorldQuat: THREE.Quaternion
  ): void {
    if (!bone.parent) return;
    bone.getWorldQuaternion(_ikBoneWorldQuat);
    bone.parent.getWorldQuaternion(_ikParentWorldQuat);
    _ikBoneWorldQuat.premultiply(deltaWorldQuat);
    _ikParentWorldQuat.invert();
    bone.quaternion.copy(_ikParentWorldQuat).multiply(_ikBoneWorldQuat).normalize();
    bone.updateMatrixWorld(true);
  }

  private static solveTwoBoneArmIK(
    upperArm: THREE.Object3D,
    foreArm: THREE.Object3D,
    hand: THREE.Object3D,
    targetWristWorld: THREE.Vector3,
    poleDirWorld: THREE.Vector3,
    fallbackUp: THREE.Vector3
  ): void {
    upperArm.getWorldPosition(_ikRShoulderPos);
    foreArm.getWorldPosition(_ikRElbowPos);
    hand.getWorldPosition(_ikRWristPos);

    const l1 = _ikRShoulderPos.distanceTo(_ikRElbowPos);
    const l2 = _ikRElbowPos.distanceTo(_ikRWristPos);
    if (l1 < 0.02 || l2 < 0.02) return;

    _ikToTarget.subVectors(targetWristWorld, _ikRShoulderPos);
    const rawDist = _ikToTarget.length();
    if (rawDist < 1e-4) return;

    const minDist = Math.abs(l1 - l2) + 0.015;
    const maxDist = (l1 + l2) * 0.985;
    const d = Math.max(minDist, Math.min(maxDist, rawDist));

    _ikDirST.copy(_ikToTarget).divideScalar(rawDist);
    const cosAlpha = THREE.MathUtils.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
    const sinAlpha = Math.sqrt(Math.max(0, 1 - cosAlpha * cosAlpha));

    // Project elbow pole perpendicular to shoulder->wrist line
    _ikBendDir.copy(poleDirWorld).addScaledVector(_ikDirST, -poleDirWorld.dot(_ikDirST));
    if (_ikBendDir.lengthSq() < 1e-4) {
      _ikBendDir.copy(fallbackUp).negate().addScaledVector(_ikDirST, -fallbackUp.dot(_ikDirST) * -1);
    }
    if (_ikBendDir.lengthSq() < 1e-4) {
      _ikBendDir.set(0, -1, 0);
    } else {
      _ikBendDir.normalize();
    }

    _ikElbowTarget
      .copy(_ikRShoulderPos)
      .addScaledVector(_ikDirST, l1 * cosAlpha)
      .addScaledVector(_ikBendDir, l1 * sinAlpha);

    // 1. Aim upper arm bone toward computed elbow target
    _ikCurDir.subVectors(_ikRElbowPos, _ikRShoulderPos);
    if (_ikCurDir.lengthSq() > 1e-6) {
      _ikCurDir.normalize();
      _ikDesDir.subVectors(_ikElbowTarget, _ikRShoulderPos).normalize();
      _ikDeltaQuat.setFromUnitVectors(_ikCurDir, _ikDesDir);
      ModelFactory.rotateBoneWorldDelta(upperArm, _ikDeltaQuat);
    }

    // 2. Aim forearm bone toward exact wrist target
    foreArm.getWorldPosition(_ikRElbowPos);
    hand.getWorldPosition(_ikRWristPos);
    _ikCurDir.subVectors(_ikRWristPos, _ikRElbowPos);
    if (_ikCurDir.lengthSq() > 1e-6) {
      _ikCurDir.normalize();
      _ikDesDir.subVectors(targetWristWorld, _ikRElbowPos);
      if (_ikDesDir.lengthSq() > 1e-6) {
        _ikDesDir.normalize();
        _ikDeltaQuat.setFromUnitVectors(_ikCurDir, _ikDesDir);
        ModelFactory.rotateBoneWorldDelta(foreArm, _ikDeltaQuat);
      }
    }
  }

  private static orientHandToBasis(
    hand: THREE.Object3D,
    basis: CachedHandBasis | undefined,
    desiredFingerDirWorld: THREE.Vector3,
    desiredIndexToPinkyWorld: THREE.Vector3
  ): void {
    if (!basis || !hand.parent) return;

    if (basis.hasFullBasis) {
      _ikW1.copy(desiredFingerDirWorld).normalize();
      _ikW3.crossVectors(_ikW1, desiredIndexToPinkyWorld);
      if (_ikW3.lengthSq() < 1e-6) {
        basis.middleBone.getWorldPosition(_ikChildWorldPos);
        hand.getWorldPosition(_ikTargetWorldPos);
        _ikCurDir.subVectors(_ikChildWorldPos, _ikTargetWorldPos).normalize();
        _ikDeltaQuat.setFromUnitVectors(_ikCurDir, _ikW1);
        ModelFactory.rotateBoneWorldDelta(hand, _ikDeltaQuat);
        return;
      }
      _ikW3.normalize();
      _ikW2.crossVectors(_ikW3, _ikW1).normalize();

      _ikMatWorld.makeBasis(_ikW1, _ikW2, _ikW3);
      _ikMatLocal.makeBasis(basis.e1, basis.e2, basis.e3);
      _ikMatLocal.transpose();
      _ikMatRot.multiplyMatrices(_ikMatWorld, _ikMatLocal);

      _ikBoneWorldQuat.setFromRotationMatrix(_ikMatRot);
      hand.parent.getWorldQuaternion(_ikParentWorldQuat);
      _ikParentWorldQuat.invert();
      hand.quaternion.copy(_ikParentWorldQuat).multiply(_ikBoneWorldQuat).normalize();
      hand.updateMatrixWorld(true);
    } else {
      basis.middleBone.getWorldPosition(_ikChildWorldPos);
      hand.getWorldPosition(_ikTargetWorldPos);
      _ikCurDir.subVectors(_ikChildWorldPos, _ikTargetWorldPos);
      if (_ikCurDir.lengthSq() > 1e-6) {
        _ikCurDir.normalize();
        _ikDesDir.copy(desiredFingerDirWorld).normalize();
        _ikDeltaQuat.setFromUnitVectors(_ikCurDir, _ikDesDir);
        ModelFactory.rotateBoneWorldDelta(hand, _ikDeltaQuat);
      }
    }
  }

  /**
   * Solves upper-body combat weapon-holding IK (shoulders, elbows, hands, and torso shoulder-pocket cant)
   * and aligns hand_weapon_socket so the held firearm sits naturally gripped with barrel aimed forward (+Z).
   */
  public static alignHandWeaponSocket(
    botRoot: THREE.Object3D,
    pitchOffset: number = 0,
    rollOffset: number = 0,
    options?: WeaponHoldPoseOptions
  ): void {
    const rig = ModelFactory.getOrCacheWeaponHoldRig(botRoot);
    const socket = rig.handSocket;
    if (!socket || !socket.parent) return;

    const stance = options?.stance || 'ready';
    if (stance === 'dead') return;

    const weaponType: WeaponType = options?.weaponType || botRoot.userData.weaponType || 'm4';
    const metrics = ModelFactory.getWeaponHoldMetrics(weaponType);
    const recoilKick = options?.recoilKick || 0;
    const reloadProgress = options?.reloadProgress || 0;

    botRoot.updateMatrixWorld(true);
    botRoot.matrixWorld.decompose(_ikRootPos, _ikRootQuat, _ikRootScale);

    // Character anatomical basis in world space (+Z forward, +Y up, -X character right, +X character left)
    _ikCharFwd.set(0, 0, 1).applyQuaternion(_ikRootQuat).normalize();
    _ikCharUp.set(0, 1, 0).applyQuaternion(_ikRootQuat).normalize();
    _ikCharRight.set(-1, 0, 0).applyQuaternion(_ikRootQuat).normalize();

    const hasFullArmIK = Boolean(
      rig.rightArm &&
        rig.rightForeArm &&
        rig.rightHand &&
        rig.leftArm &&
        rig.leftForeArm &&
        rig.leftHand
    );

    if (hasFullArmIK) {
      // Auto-verify anatomical right vs left from actual arm positions in character space
      rig.rightArm!.getWorldPosition(_ikRShoulderPos);
      rig.leftArm!.getWorldPosition(_ikLShoulderPos);
      _ikShoulderSpanVec.subVectors(_ikRShoulderPos, _ikLShoulderPos);
      if (_ikShoulderSpanVec.dot(_ikCharRight) < 0) {
        _ikCharRight.negate();
      }
      _ikCharLeft.copy(_ikCharRight).negate();

      // Rotate upper chest (bladed tactical shooter stance) so left support shoulder moves forward toward handguard
      if (!metrics.isPistol && rig.spine2) {
        const chestYaw = stance === 'combat' ? 0.38 : stance === 'reload' ? 0.24 : 0.32;
        _ikDeltaQuat.setFromAxisAngle(_ikCharUp, chestYaw);
        ModelFactory.rotateBoneWorldDelta(rig.spine2, _ikDeltaQuat);

        // Counter-rotate head so operator looks straight downrange toward target
        if (rig.head) {
          _ikDeltaQuat.setFromAxisAngle(_ikCharUp, -chestYaw * 0.88);
          ModelFactory.rotateBoneWorldDelta(rig.head, _ikDeltaQuat);
        }
      }

      // Refresh shoulder positions after spine twist
      rig.rightArm!.getWorldPosition(_ikRShoulderPos);
      rig.leftArm!.getWorldPosition(_ikLShoulderPos);
      _ikShoulderMid.addVectors(_ikRShoulderPos, _ikLShoulderPos).multiplyScalar(0.5);

      // Desired weapon world orientation in character space
      let yawOffset = 0;
      let stancePitch = 0;
      let stanceRoll = 0;
      let gripRight = 0.095;
      let gripUp = -0.115;
      let gripFwd = 0.145;

      if (metrics.isPistol) {
        // Two-handed tactical Weaver pistol stance
        if (stance === 'combat') {
          yawOffset = 0.04;
          stancePitch = -0.02 + pitchOffset;
          stanceRoll = rollOffset;
          gripRight = 0.04;
          gripUp = -0.055;
          gripFwd = 0.32 - recoilKick * 0.04;
        } else if (stance === 'reload') {
          yawOffset = 0.32;
          stancePitch = -0.28;
          stanceRoll = 0.35;
          gripRight = 0.07;
          gripUp = -0.08;
          gripFwd = 0.22;
        } else {
          // Low-ready patrol pistol hold
          yawOffset = 0.06;
          stancePitch = 0.24 + pitchOffset;
          stanceRoll = rollOffset;
          gripRight = 0.05;
          gripUp = -0.13;
          gripFwd = 0.26;
        }
      } else {
        // Long-gun shouldered tactical hold (M4, AK, SCAR, MP5, Vector, Shotgun, Sniper)
        if (stance === 'combat') {
          // Shouldered high-aiming combat stance: buttstock tucked in right shoulder pocket, barrel forward
          yawOffset = 0.32;
          stancePitch = -0.02 + pitchOffset;
          stanceRoll = 0.04 + rollOffset;
          gripRight = 0.09;
          gripUp = -0.095;
          gripFwd = 0.115 - recoilKick * 0.035;
        } else if (stance === 'reload') {
          // Tilted magwell-exposed reload cant
          yawOffset = 0.56;
          stancePitch = -0.22;
          stanceRoll = 0.44;
          gripRight = 0.09;
          gripUp = -0.10;
          gripFwd = 0.145;
        } else {
          // Iconic COD tactical low-ready carry across chest
          yawOffset = 0.58;
          stancePitch = 0.20 + pitchOffset;
          stanceRoll = 0.08 + rollOffset;
          gripRight = 0.105;
          gripUp = -0.14;
          gripFwd = 0.13;
        }
      }

      // Compute exact world quaternion for weapon (barrel along +Z of this quaternion)
      _ikEuler.set(stancePitch, yawOffset, stanceRoll, 'YXZ');
      _ikLocalOffsetQuat.setFromEuler(_ikEuler);
      _ikWeaponQuat.copy(_ikRootQuat).multiply(_ikLocalOffsetQuat);

      _ikWeaponFwd.set(0, 0, 1).applyQuaternion(_ikWeaponQuat).normalize();
      _ikWeaponUp.set(0, 1, 0).applyQuaternion(_ikWeaponQuat).normalize();
      _ikWeaponRight.set(-1, 0, 0).applyQuaternion(_ikWeaponQuat).normalize();

      // Desired right-hand & left-hand palm/finger wrap directions in world space
      _ikRightFingerDir
        .copy(_ikWeaponFwd)
        .multiplyScalar(0.84)
        .addScaledVector(_ikWeaponUp, -0.48)
        .addScaledVector(_ikWeaponRight, -0.22)
        .normalize();

      if (metrics.isPistol) {
        _ikLeftFingerDir
          .copy(_ikWeaponRight)
          .multiplyScalar(0.82)
          .addScaledVector(_ikWeaponFwd, 0.48)
          .addScaledVector(_ikWeaponUp, -0.22)
          .normalize();
      } else {
        _ikLeftFingerDir
          .copy(_ikWeaponRight)
          .multiplyScalar(0.78)
          .addScaledVector(_ikWeaponUp, 0.56)
          .addScaledVector(_ikWeaponFwd, 0.24)
          .normalize();
      }

      // Compute right-hand pistol grip world target & shift back ~3.8cm along finger axis so palm center holds the grip
      _ikRTarget
        .copy(_ikShoulderMid)
        .addScaledVector(_ikCharRight, gripRight)
        .addScaledVector(_ikCharUp, gripUp)
        .addScaledVector(_ikCharFwd, gripFwd)
        .addScaledVector(_ikRightFingerDir, -0.038);

      // Clamp right hand strictly inside right arm max reach
      rig.rightForeArm!.getWorldPosition(_ikRElbowPos);
      rig.rightHand!.getWorldPosition(_ikRWristPos);
      const rMaxReach =
        (_ikRShoulderPos.distanceTo(_ikRElbowPos) + _ikRElbowPos.distanceTo(_ikRWristPos)) * 0.94;
      _ikToTarget.subVectors(_ikRTarget, _ikRShoulderPos);
      const rDist = _ikToTarget.length();
      if (rDist > rMaxReach && rDist > 1e-4) {
        _ikRTarget.copy(_ikRShoulderPos).addScaledVector(_ikToTarget, rMaxReach / rDist);
      }

      // Solve Right Arm IK -> orient right hand -> align hand_weapon_socket -> derive Left Hand target from placed gun
      _ikRPole
        .copy(_ikCharRight)
        .multiplyScalar(0.65)
        .addScaledVector(_ikCharUp, -0.85)
        .addScaledVector(_ikCharFwd, -0.22)
        .normalize();
      ModelFactory.solveTwoBoneArmIK(
        rig.rightArm!,
        rig.rightForeArm!,
        rig.rightHand!,
        _ikRTarget,
        _ikRPole,
        _ikCharUp
      );

      // Orient right hand so fingers wrap cleanly around pistol grip
      _ikBendDir.copy(_ikWeaponUp).negate();
      ModelFactory.orientHandToBasis(rig.rightHand!, rig.rightHandBasis, _ikRightFingerDir, _ikBendDir);

      // Align hand_weapon_socket upright & forward in world space (locked to weaponWorldQuat)
      socket.parent.getWorldQuaternion(_ikParentWorldQuat);
      _ikParentWorldQuat.invert();
      socket.quaternion.copy(_ikParentWorldQuat).multiply(_ikWeaponQuat).normalize();
      socket.updateMatrixWorld(true);
      socket.getWorldPosition(_ikSocketWorld);

      // Left-hand foregrip target derived directly from actual placed hand_weapon_socket in world space
      if (stance === 'reload') {
        const magDip = Math.sin(reloadProgress * Math.PI);
        _ikLTarget
          .copy(_ikShoulderMid)
          .addScaledVector(_ikCharLeft, 0.08 - magDip * 0.04)
          .addScaledVector(_ikCharUp, -0.22 - magDip * 0.14)
          .addScaledVector(_ikCharFwd, 0.18 - magDip * 0.06);
      } else {
        const s = metrics.scale;
        _ikForegripSocket.set(
          (metrics.gripLocal.x - metrics.foregripLocal.x) * s,
          (metrics.foregripLocal.y - metrics.gripLocal.y) * s,
          (metrics.gripLocal.z - metrics.foregripLocal.z) * s
        );
        _ikForegripSocket.applyQuaternion(_ikWeaponQuat);

        // Seat left palm center under handguard/foregrip (-0.036 along left finger wrap axis)
        _ikForegripWorld
          .copy(_ikSocketWorld)
          .add(_ikForegripSocket)
          .addScaledVector(_ikWeaponRight, -0.015)
          .addScaledVector(_ikLeftFingerDir, -0.036);

        rig.leftForeArm!.getWorldPosition(_ikLElbowPos);
        rig.leftHand!.getWorldPosition(_ikLWristPos);
        const lMaxReach =
          (_ikLShoulderPos.distanceTo(_ikLElbowPos) + _ikLElbowPos.distanceTo(_ikLWristPos)) * 0.96;

        _ikToTarget.subVectors(_ikForegripWorld, _ikLShoulderPos);
        const lDist = _ikToTarget.length();
        if (lDist > lMaxReach && lDist > 1e-4 && !metrics.isPistol) {
          // Slide support grip rearward along the rifle's own handguard/magwell axis so the hand stays ON the gun
          _ikForegripWorld
            .copy(_ikSocketWorld)
            .addScaledVector(_ikForegripSocket, 0.58)
            .addScaledVector(_ikWeaponRight, -0.015)
            .addScaledVector(_ikLeftFingerDir, -0.036);
          _ikToTarget.subVectors(_ikForegripWorld, _ikLShoulderPos);
          const slidDist = _ikToTarget.length();
          if (slidDist > lMaxReach && slidDist > 1e-4) {
            _ikLTarget.copy(_ikLShoulderPos).addScaledVector(_ikToTarget, lMaxReach / slidDist);
          } else {
            _ikLTarget.copy(_ikForegripWorld);
          }
        } else if (lDist > lMaxReach && lDist > 1e-4) {
          _ikLTarget.copy(_ikLShoulderPos).addScaledVector(_ikToTarget, lMaxReach / lDist);
        } else {
          _ikLTarget.copy(_ikForegripWorld);
        }
      }

      // Solve Left Arm IK to clasp the handguard / foregrip
      _ikLPole
        .copy(_ikCharLeft)
        .multiplyScalar(0.38)
        .addScaledVector(_ikCharUp, -0.92)
        .addScaledVector(_ikCharFwd, -0.15)
        .normalize();
      ModelFactory.solveTwoBoneArmIK(
        rig.leftArm!,
        rig.leftForeArm!,
        rig.leftHand!,
        _ikLTarget,
        _ikLPole,
        _ikCharUp
      );

      if (stance !== 'reload') {
        _ikBendDir.copy(metrics.isPistol ? _ikWeaponUp : _ikWeaponFwd).negate();
        ModelFactory.orientHandToBasis(rig.leftHand!, rig.leftHandBasis, _ikLeftFingerDir, _ikBendDir);
      }
      return;
    }

    // Fallback: simple socket upright alignment if skeleton lacks standard arm bones
    _ikEuler.set(pitchOffset, 0, rollOffset, 'YXZ');
    _ikLocalOffsetQuat.setFromEuler(_ikEuler);
    _ikWeaponQuat.copy(_ikRootQuat).multiply(_ikLocalOffsetQuat);
    socket.parent.getWorldQuaternion(_ikParentWorldQuat);
    socket.quaternion.copy(_ikParentWorldQuat.invert().multiply(_ikWeaponQuat));
  }

  // --- AAA 3D ENEMY COMBAT OPERATOR MODEL (FACTION & ARCHETYPE DIVERSITY) ---
  public static createBotMesh(
    team: 'allies' | 'axis' = 'axis',
    archetype: 'assault' | 'heavy' | 'sniper' | 'flanker' = 'assault',
    weaponType: WeaponType = 'm4'
  ): THREE.Group {
    const custom3DModel = CharacterModelLoader.getActiveCustomModel();
    if (custom3DModel) {
      custom3DModel.name = `bot_${team}_${archetype}`;
      custom3DModel.userData.weaponType = weaponType;
      custom3DModel.updateMatrixWorld(true);

      // Attach weapon to right hand bone if found
      const rightHand = ModelFactory.findSkeletonBone(custom3DModel, [
        /RightHand$/i,
        /Right_Hand$/i,
        /hand_r$/i,
        /R_Hand$/i,
        /Bip01 R Hand$/i,
      ]);

      const botWeapon = ModelFactory.createWeaponMesh(weaponType, team === 'axis' ? 'obsidian' : 'standard');
      botWeapon.name = 'bot_weapon';
      botWeapon.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      const metrics = ModelFactory.getWeaponHoldMetrics(weaponType);

      if (rightHand) {
        // Compensate for GLB Armature/Character scale (often 0.01 cm-to-m in Mixamo/Sketchfab models)
        const handWorldScale = new THREE.Vector3();
        rightHand.getWorldScale(handWorldScale);
        const avgScale = (Math.abs(handWorldScale.x) + Math.abs(handWorldScale.y) + Math.abs(handWorldScale.z)) / 3;
        const invScale = avgScale > 0.0001 ? 1 / avgScale : 1;

        const handSocket = new THREE.Group();
        handSocket.name = 'hand_weapon_socket';
        handSocket.scale.setScalar(invScale);

        const rightPalmBone = ModelFactory.findSkeletonBone(rightHand, [
          /RightHandMiddle1$/i,
          /Middle1$/i,
          /RightHandIndex1$/i,
        ]);
        if (rightPalmBone && rightPalmBone.position.lengthSq() > 1e-6) {
          handSocket.position.copy(rightPalmBone.position).multiplyScalar(0.42);
        }

        // Seat the weapon's pistol grip center right at (0, 0, 0) in handSocket (right palm)
        const s = metrics.scale;
        botWeapon.scale.setScalar(s);
        botWeapon.position.set(
          metrics.gripLocal.x * s,
          -metrics.gripLocal.y * s,
          metrics.gripLocal.z * s
        );
        botWeapon.rotation.set(0, Math.PI, 0);
        botWeapon.userData.isBoneAttached = true;

        handSocket.add(botWeapon);
        rightHand.add(handSocket);

        // Immediately solve Two-Bone IK & align socket upright & forward for frame-0 visibility
        ModelFactory.alignHandWeaponSocket(custom3DModel, 0, 0, { stance: 'ready', weaponType });
      } else {
        botWeapon.userData.isBoneAttached = false;
        botWeapon.scale.setScalar(metrics.scale);
        botWeapon.position.set(-0.14, 1.24, 0.34);
        botWeapon.rotation.set(0, Math.PI, 0);
        custom3DModel.add(botWeapon);
      }

      // Add tactical faction recognition beacon
      const beaconMat = new THREE.MeshBasicMaterial({ color: team === 'axis' ? 0xef4444 : 0x06b6d4 });
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), beaconMat);
      beacon.position.set(0, 1.78, 0);
      custom3DModel.add(beacon);

      return custom3DModel;
    }

    const botGroup = new THREE.Group();
    botGroup.name = `bot_${team}_${archetype}`;

    // Procedural High-Resolution PBR Textures
    const uniformTexture = TextureGenerator.createOperatorUniformTexture(
      team === 'axis' ? 'axis_shadow' : archetype === 'flanker' ? 'spec_ops' : 'allies_multicam'
    );
    const plateCarrierTexture = TextureGenerator.createPlateCarrierTexture(
      team === 'axis' ? 'black' : 'multicam'
    );
    const gloveTexture = TextureGenerator.createTacticalGloveTexture();

    // Balanced PBR Materials (Realistic specularity without blown-out contrast)
    const uniformMat = new THREE.MeshStandardMaterial({
      map: uniformTexture,
      roughness: 0.75,
      metalness: 0.08,
    });

    const vestMat = new THREE.MeshStandardMaterial({
      map: plateCarrierTexture,
      roughness: 0.62,
      metalness: 0.18,
    });

    const gloveMat = new THREE.MeshStandardMaterial({
      map: gloveTexture,
      roughness: 0.65,
      metalness: 0.15,
    });

    const helmetMat = new THREE.MeshStandardMaterial({
      color: team === 'axis' ? 0x18181b : 0x27272a,
      roughness: 0.42,
      metalness: 0.55,
    });

    const armorPlateMat = new THREE.MeshStandardMaterial({
      color: team === 'axis' ? 0x111827 : 0x1e293b,
      roughness: 0.38,
      metalness: 0.65,
    });

    const visorColor = team === 'axis' ? 0xdc2626 : 0x0284c7;
    const visorEmissive = team === 'axis' ? 0x991b1b : 0x0369a1;
    const visorMat = new THREE.MeshStandardMaterial({
      color: visorColor,
      emissive: visorEmissive,
      emissiveIntensity: 0.5,
      roughness: 0.12,
      metalness: 0.85,
    });

    const metalHardwareMat = new THREE.MeshStandardMaterial({
      color: 0x3f3f46,
      roughness: 0.28,
      metalness: 0.88,
    });

    const brassAmmoMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.22,
      metalness: 0.82,
    });

    const bootRubberMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.82,
      metalness: 0.12,
    });

    const teamPatchMat = new THREE.MeshStandardMaterial({
      color: team === 'axis' ? 0xef4444 : 0x10b981,
      roughness: 0.5,
      emissive: team === 'axis' ? 0x7f1d1d : 0x064e3b,
      emissiveIntensity: 0.3,
    });

    const chemLightMat = new THREE.MeshBasicMaterial({
      color: team === 'axis' ? 0xef4444 : 0x10b981,
    });

    // 1. TORSO & BALLISTIC PLATE CARRIER (Hierarchical pivot at waist/hips)
    const torsoGroup = new THREE.Group();
    torsoGroup.name = 'bot_torso';
    torsoGroup.position.set(0, 1.05, 0);

    // Anatomical tapered combat shirt torso
    const chestGeo = new THREE.BoxGeometry(0.46, 0.48, 0.26);
    const chestMesh = new THREE.Mesh(chestGeo, uniformMat);
    chestMesh.position.set(0, 0.24, 0);
    torsoGroup.add(chestMesh);

    // High combat collar
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.08, 12), uniformMat);
    collar.position.set(0, 0.48, 0);
    torsoGroup.add(collar);

    // Crye JPC / CIRAS Tactical Plate Carrier
    const plateCarrier = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.44, 0.30), vestMat);
    plateCarrier.position.set(0, 0.25, 0);
    torsoGroup.add(plateCarrier);

    // Front Ceramic Strike Plate with beveled edges
    const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.04), armorPlateMat);
    frontPlate.position.set(0, 0.26, 0.16);
    torsoGroup.add(frontPlate);

    // Rear Ceramic Strike Plate
    const rearPlate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.04), armorPlateMat);
    rearPlate.position.set(0, 0.26, -0.16);
    torsoGroup.add(rearPlate);

    // Team Identification IR Morale Patch on upper chest
    const moralePatch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.01), teamPatchMat);
    moralePatch.position.set(0, 0.36, 0.185);
    torsoGroup.add(moralePatch);

    // Triple Front 5.56 Magazine Pouches with Brass Cartridge Tips
    for (let i = -1; i <= 1; i++) {
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.16, 0.075), vestMat);
      pouch.position.set(i * 0.105, 0.18, 0.18);
      
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.055), metalHardwareMat);
      mag.position.set(i * 0.105, 0.26, 0.18);
      
      const bulletTip = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.022, 8), brassAmmoMat);
      bulletTip.rotateX(Math.PI);
      bulletTip.position.set(i * 0.105, 0.31, 0.18);
      
      torsoGroup.add(pouch, mag, bulletTip);
    }

    // Tactical AN/PRC-152 Radio with Whip Antenna on Shoulder
    const radioPouch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.08), vestMat);
    radioPouch.position.set(-0.19, 0.32, -0.16);
    const radioBody = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.07), metalHardwareMat);
    radioBody.position.set(-0.19, 0.38, -0.16);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.0025, 0.38, 8), metalHardwareMat);
    antenna.position.set(-0.19, 0.65, -0.16);
    antenna.rotation.z = -0.08;
    torsoGroup.add(radioPouch, radioBody, antenna);

    // Push-To-Talk (PTT) Comms Switch on Chest Webbing with Coiled Headset Cable
    const pttSwitch = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.052, 0.024), metalHardwareMat);
    pttSwitch.position.set(-0.13, 0.36, 0.17);
    const pttButton = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8), chemLightMat);
    pttButton.rotateX(Math.PI / 2);
    pttButton.position.set(-0.13, 0.36, 0.184);
    const commsCable = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.22, 6), metalHardwareMat);
    commsCable.position.set(-0.14, 0.46, 0.12);
    commsCable.rotation.x = -0.35;
    torsoGroup.add(pttSwitch, pttButton, commsCable);

    // Tactical Chem Light (Glow Stick) clipped into MOLLE row
    const chemLight = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.13, 8), chemLightMat);
    chemLight.position.set(0.18, 0.32, 0.17);
    chemLight.rotation.z = 0.25;
    torsoGroup.add(chemLight);

    // Flex Cuffs / Zip-Ties on Rear Carrier
    const zipTies = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 12), metalHardwareMat);
    zipTies.position.set(0, 0.35, -0.18);
    torsoGroup.add(zipTies);

    // Modular 3-Day Assault Backpack on Rear Plate Carrier
    const assaultPack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.14), vestMat);
    assaultPack.position.set(0, 0.22, -0.22);
    const assaultPackPocket = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.06), vestMat);
    assaultPackPocket.position.set(0, 0.14, -0.31);
    
    // Hydration Tube extending over right shoulder with bite valve
    const hydraTube = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.32, 8), metalHardwareMat);
    hydraTube.position.set(0.16, 0.36, -0.06);
    hydraTube.rotation.x = 0.85;
    const biteValve = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.024, 0.016), chemLightMat);
    biteValve.position.set(0.16, 0.24, 0.08);
    torsoGroup.add(assaultPack, assaultPackPocket, hydraTube, biteValve);

    // Padded Battle War Belt around waist (y = -0.04)
    const warBelt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.25, 0.09, 14), vestMat);
    warBelt.position.set(0, -0.04, 0);
    
    // IFAK (Individual First Aid Kit) Trauma Pouch on lower back of belt
    const ifakPouch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.08), armorPlateMat);
    ifakPouch.position.set(0, -0.04, -0.25);
    const ifakCross = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.01), teamPatchMat);
    ifakCross.position.set(0, -0.04, -0.295);
    
    // Sidearms Kydex Holster on Right Hip with Secondary Handgun
    const holster = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.09), armorPlateMat);
    holster.position.set(0.26, -0.12, 0.02);
    const pistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.08, 0.04), metalHardwareMat);
    pistolGrip.position.set(0.26, -0.03, 0.02);
    pistolGrip.rotation.x = 0.2;
    torsoGroup.add(warBelt, ifakPouch, ifakCross, holster, pistolGrip);

    // Archetype-Specific Torso Accessories
    if (archetype === 'heavy') {
      // Deltoid Shoulder Pauldrons (Heavy Armor)
      const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.22, 0.18), armorPlateMat);
      shoulderL.position.set(-0.30, 0.38, 0.02);
      const shoulderR = shoulderL.clone();
      shoulderR.position.x = 0.30;

      // Throat Ballistic Collar
      const throatGuard = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.08, 12, 1, true, -Math.PI / 3, (2 * Math.PI) / 3), armorPlateMat);
      throatGuard.position.set(0, 0.48, 0.04);

      // Groin Blast Apron Flap
      const groinFlap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.04), vestMat);
      groinFlap.position.set(0, -0.06, 0.15);
      torsoGroup.add(shoulderL, shoulderR, throatGuard, groinFlap);
    } else if (archetype === 'flanker') {
      // Tactical Sheathed Karambit Combat Knife on Chest
      const sheath = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.025), armorPlateMat);
      sheath.position.set(-0.10, 0.36, 0.18);
      sheath.rotation.z = 0.6;
      const knifeGrip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.09, 0.025), metalHardwareMat);
      knifeGrip.position.set(-0.06, 0.44, 0.18);
      knifeGrip.rotation.z = 0.6;
      torsoGroup.add(sheath, knifeGrip);
    } else if (archetype === 'sniper') {
      // Ghillie Burlap Scrim Cowl Draped Across Shoulders
      const scrimCowl = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.32), uniformMat);
      scrimCowl.position.set(0, 0.44, 0);
      torsoGroup.add(scrimCowl);
    } else {
      // Assault: 2x M67 Frag Grenades with Pull Rings
      for (let i = 0; i < 2; i++) {
        const grenade = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), metalHardwareMat);
        grenade.position.set(-0.16 - i * 0.06, 0.18, 0.17);
        const pin = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 6, 8), brassAmmoMat);
        pin.position.set(-0.16 - i * 0.06, 0.22, 0.17);
        torsoGroup.add(grenade, pin);
      }
    }

    botGroup.add(torsoGroup);

    // 2. HEAD, BALACLAVA, HELMET & OPTICS (Pivot at neck base)
    const headGroup = new THREE.Group();
    headGroup.name = 'bot_head';
    headGroup.position.set(0, 1.62, 0);

    // Contoured Balaclava Head
    const headCranium = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), uniformMat);
    headCranium.scale.set(1.0, 1.05, 1.15);
    headCranium.position.set(0, 0.03, 0);
    headCranium.name = 'head';

    const headJaw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.18), uniformMat);
    headJaw.position.set(0, -0.05, 0.02);
    headJaw.name = 'head';
    headGroup.add(headCranium, headJaw);

    // Ballistic Eye Protection / Tactical Glasses
    const eyeLens = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.045, 0.04), visorMat);
    eyeLens.position.set(0, 0.01, 0.11);
    eyeLens.name = 'head';
    headGroup.add(eyeLens);

    // Ops-Core FAST High-Cut Tactical Ballistic Helmet
    const helmetShell = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), helmetMat);
    helmetShell.scale.set(1.0, 0.86, 1.14);
    helmetShell.position.set(0, 0.07, -0.01);
    helmetShell.name = 'bot_helmet';
    headGroup.add(helmetShell);

    // Wilcox L4 G24 NVG Shroud on Forehead
    const nvgShroud = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.03), metalHardwareMat);
    nvgShroud.position.set(0, 0.08, 0.165);
    headGroup.add(nvgShroud);

    // Left & Right ARC Accessory Rails
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.15), metalHardwareMat);
    railL.position.set(-0.165, 0.04, 0);
    const railR = railL.clone();
    railR.position.x = 0.165;
    
    // Tactical Princeton Tec Task Light on Left Rail
    const railLight = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.06, 8), metalHardwareMat);
    railLight.rotateX(Math.PI / 2);
    railLight.position.set(-0.18, 0.05, 0.04);
    
    // Top-Mounted Hel-Star 6 IR Tactical Strobe Beacon
    const irStrobe = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.022, 0.065), armorPlateMat);
    irStrobe.position.set(0, 0.195, -0.04);
    const irStrobeLED = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), chemLightMat);
    irStrobeLED.position.set(0, 0.208, -0.04);
    
    headGroup.add(railL, railR, railLight, irStrobe, irStrobeLED);

    // Rear Counterweight Battery Pack with Elastic Bungees
    const batteryPack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.045), vestMat);
    batteryPack.position.set(0, 0.04, -0.17);
    headGroup.add(batteryPack);

    // ComTac III Tactical Communication Headset with Boom Mic
    const earcupL = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.03, 12), vestMat);
    earcupL.rotateZ(Math.PI / 2);
    earcupL.position.set(-0.15, 0.01, 0);
    const earcupR = earcupL.clone();
    earcupR.position.x = 0.15;

    const boomMic = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.15, 6), metalHardwareMat);
    boomMic.rotateX(Math.PI / 2);
    boomMic.rotateZ(0.35);
    boomMic.position.set(-0.13, -0.05, 0.08);

    headGroup.add(earcupL, earcupR, boomMic);

    // Archetype-Specific Headgear Optics
    if (archetype === 'flanker') {
      // GPNVG-18 Quad-Tube Panoramic Night Vision Goggles
      const nvgMount = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.08), metalHardwareMat);
      nvgMount.position.set(0, 0.07, 0.20);
      headGroup.add(nvgMount);
      for (let i = -1.5; i <= 1.5; i++) {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.018, 0.075, 10), metalHardwareMat);
        tube.rotateX(Math.PI / 2);
        tube.position.set(i * 0.042, 0.05, 0.23);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.016, 12), visorMat);
        lens.position.set(i * 0.042, 0.05, 0.27);
        headGroup.add(tube, lens);
      }
    } else if (archetype === 'heavy') {
      // Heavy Ballistic Titanium Face Shield Visor
      const visorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.035), armorPlateMat);
      visorFrame.position.set(0, 0.01, 0.16);
      const visorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.04), visorMat);
      visorGlass.position.set(0, 0.02, 0.165);
      headGroup.add(visorFrame, visorGlass);
    } else if (archetype === 'sniper') {
      // Camo Scrim Netting Veil Draped Across Rim
      const veil = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.10, 14, 1, true), uniformMat);
      veil.position.set(0, 0.02, 0);
      headGroup.add(veil);
    } else {
      // Assault: Tactical ESS Ballistic Goggles
      const goggleFrame = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.07, 0.05), armorPlateMat);
      goggleFrame.position.set(0, 0.015, 0.135);
      const goggleLens = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.05, 0.052), visorMat);
      goggleLens.position.set(0, 0.015, 0.136);
      headGroup.add(goggleFrame, goggleLens);
    }

    botGroup.add(headGroup);

    // 3. TACTICAL BATTLE BELT & RIGGING
    const battleBelt = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.09, 0.32), vestMat);
    battleBelt.position.set(0, 0.90, 0);

    // Metal Cobra Quick-Release Buckle
    const cobraBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.03), metalHardwareMat);
    cobraBuckle.position.set(0, 0.90, 0.17);

    // Drop-Leg Kydex Tactical Holster with Sidearm
    const dropHolster = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.10), armorPlateMat);
    dropHolster.position.set(0.26, 0.78, 0.04);
    const sidearmGrip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.10, 0.04), metalHardwareMat);
    sidearmGrip.position.set(0.26, 0.88, 0.04);
    sidearmGrip.rotation.z = -0.28;

    // Tactical Dump Pouch & Tourniquet on Belt
    const dumpPouch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.15, 0.10), vestMat);
    dumpPouch.position.set(-0.24, 0.82, -0.06);
    const tourniquet = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.05), teamPatchMat);
    tourniquet.position.set(0.12, 0.90, 0.17);

    botGroup.add(battleBelt, cobraBuckle, dropHolster, sidearmGrip, dumpPouch, tourniquet);

    // 4. ARTICULATED ARMS & COMBAT GLOVES (Shoulder -> Upper Arm -> Elbow -> Forearm -> Glove)
    // Negative X rotation swings -Y arms FORWARD (+Z) toward the held weapon!
    // Left Arm (Shoulder socket at -0.26, 1.38, 0.04)
    const leftArm = new THREE.Group();
    leftArm.name = 'bot_left_arm';
    leftArm.position.set(-0.26, 1.38, 0.04);
    leftArm.rotation.set(-0.72, 0.42, 0.16);

    const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.062, 0.24, 12), uniformMat);
    leftUpperArm.position.set(0, -0.12, 0);
    leftArm.add(leftUpperArm);

    const leftElbow = new THREE.Group();
    leftElbow.name = 'bot_left_elbow';
    leftElbow.position.set(0, -0.24, 0);
    leftElbow.rotation.set(-0.78, 0, 0);

    const leftElbowPad = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.09, 10), armorPlateMat);
    leftElbowPad.position.set(0, 0, -0.02);
    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.060, 0.052, 0.24, 12), uniformMat);
    leftForearm.position.set(0, -0.12, 0);
    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.06, 0.105), gloveMat);
    leftHand.position.set(0, -0.24, 0.02);
    const leftKnuckle = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.02, 0.038), armorPlateMat);
    leftKnuckle.position.set(0, -0.22, 0.065);
    leftElbow.add(leftElbowPad, leftForearm, leftHand, leftKnuckle);
    leftArm.add(leftElbow);

    botGroup.add(leftArm);

    // Right Arm (Shoulder socket at 0.26, 1.38, 0.04)
    const rightArm = new THREE.Group();
    rightArm.name = 'bot_right_arm';
    rightArm.position.set(0.26, 1.38, 0.04);
    rightArm.rotation.set(-0.55, -0.22, -0.14);

    const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.062, 0.24, 12), uniformMat);
    rightUpperArm.position.set(0, -0.12, 0);
    rightArm.add(rightUpperArm);

    const rightElbow = new THREE.Group();
    rightElbow.name = 'bot_right_elbow';
    rightElbow.position.set(0, -0.24, 0);
    rightElbow.rotation.set(-0.92, 0, 0);

    const rightElbowPad = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.09, 10), armorPlateMat);
    rightElbowPad.position.set(0, 0, -0.02);
    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.060, 0.052, 0.24, 12), uniformMat);
    rightForearm.position.set(0, -0.12, 0);
    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.06, 0.105), gloveMat);
    rightHand.position.set(0, -0.24, 0.02);
    const rightKnuckle = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.02, 0.038), armorPlateMat);
    rightKnuckle.position.set(0, -0.22, 0.065);
    rightElbow.add(rightElbowPad, rightForearm, rightHand, rightKnuckle);
    rightArm.add(rightElbow);

    botGroup.add(rightArm);

    // 5. ARTICULATED LEGS, AIRFLEX KNEE PADS & COMBAT BOOTS
    // Left Leg (Hip socket at -0.14, 0.88, 0)
    const leftLeg = new THREE.Group();
    leftLeg.name = 'bot_left_leg';
    leftLeg.position.set(-0.14, 0.88, 0);

    // Upper thigh with combat pants and cargo pocket
    const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.078, 0.42, 12), uniformMat);
    leftThigh.position.set(0, -0.21, 0);
    const leftCargoPocket = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.12), uniformMat);
    leftCargoPocket.position.set(-0.08, -0.20, 0);
    leftLeg.add(leftThigh, leftCargoPocket);

    // Crye AirFlex Tactical Knee Pad with molded cap
    const leftKneePad = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, 0.07), armorPlateMat);
    leftKneePad.position.set(0, -0.42, 0.07);
    leftLeg.add(leftKneePad);

    // Lower shin
    const leftShin = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.068, 0.36, 12), uniformMat);
    leftShin.position.set(0, -0.60, 0.01);
    leftLeg.add(leftShin);

    // Rugged High-Traction Combat Boot with Lug Cleats & Bloused Trouser Cuff
    const leftTrouserCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.088, 0.065, 12), uniformMat);
    leftTrouserCuff.position.set(0, -0.73, 0.02);

    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.15, 0.25), bootRubberMat);
    leftBoot.position.set(0, -0.80, 0.04);
    const leftSole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.26), metalHardwareMat);
    leftSole.position.set(0, -0.87, 0.04);

    // Deep Lug Cleats underneath sole
    for (let c = -2; c <= 2; c++) {
      const lug = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.014, 0.032), bootRubberMat);
      lug.position.set(0, -0.89, 0.04 + c * 0.05);
      leftLeg.add(lug);
    }
    leftLeg.add(leftTrouserCuff, leftBoot, leftSole);

    botGroup.add(leftLeg);

    // Right Leg (Hip socket at 0.14, 0.88, 0)
    const rightLeg = new THREE.Group();
    rightLeg.name = 'bot_right_leg';
    rightLeg.position.set(0.14, 0.88, 0);

    const rightThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.078, 0.42, 12), uniformMat);
    rightThigh.position.set(0, -0.21, 0);
    const rightCargoPocket = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.12), uniformMat);
    rightCargoPocket.position.set(0.08, -0.20, 0);
    rightLeg.add(rightThigh, rightCargoPocket);

    const rightKneePad = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, 0.07), armorPlateMat);
    rightKneePad.position.set(0, -0.42, 0.07);
    rightLeg.add(rightKneePad);

    const rightShin = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.068, 0.36, 12), uniformMat);
    rightShin.position.set(0, -0.60, 0.01);
    rightLeg.add(rightShin);

    const rightTrouserCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.088, 0.065, 12), uniformMat);
    rightTrouserCuff.position.set(0, -0.73, 0.02);

    const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.15, 0.25), bootRubberMat);
    rightBoot.position.set(0, -0.80, 0.04);
    const rightSole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.26), metalHardwareMat);
    rightSole.position.set(0, -0.87, 0.04);

    for (let c = -2; c <= 2; c++) {
      const lug = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.014, 0.032), bootRubberMat);
      lug.position.set(0, -0.89, 0.04 + c * 0.05);
      rightLeg.add(lug);
    }
    rightLeg.add(rightTrouserCuff, rightBoot, rightSole);

    botGroup.add(rightLeg);

    // 6. EQUIPPED FIREARM IN HANDS (Seated in right hand pistol grip & supported by left hand)
    const botRifle = ModelFactory.createWeaponMesh(weaponType, team === 'axis' ? 'standard' : 'woodland');
    botRifle.scale.set(0.76, 0.76, 0.76);
    botRifle.position.set(0.14, 1.24, 0.34);
    botRifle.rotation.set(0.06, Math.PI + 0.18, 0);
    botRifle.name = 'bot_weapon';
    botGroup.add(botRifle);

    // Real-time PCF Soft Shadow Casting across all bot meshes
    botGroup.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return botGroup;
  }

  // --- REAL-TIME FIRST-PERSON ARTICULATED OPERATOR & WEAPON SHADOW RIG ---
  public static createPlayerShadowMesh(
    weaponType: WeaponType = 'm4',
    camo: WeaponCamo = 'standard',
    optic: OpticType = 'holo_553'
  ): THREE.Group {
    const playerShadow = new THREE.Group();
    playerShadow.name = 'player_shadow_proxy';

    // PBR Textures for player's lower body (visible when looking down)
    const uniformTexture = TextureGenerator.createOperatorUniformTexture('allies_multicam');
    const plateCarrierTexture = TextureGenerator.createPlateCarrierTexture('multicam');

    const uniformMat = new THREE.MeshStandardMaterial({
      map: uniformTexture,
      roughness: 0.75,
      metalness: 0.08,
    });
    const kneePadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.38,
      metalness: 0.65,
    });
    const bootRubberMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.82,
      metalness: 0.12,
    });
    const beltMat = new THREE.MeshStandardMaterial({
      map: plateCarrierTexture,
      roughness: 0.62,
      metalness: 0.18,
    });
    const hardwareMat = new THREE.MeshStandardMaterial({
      color: 0x3f3f46,
      roughness: 0.28,
      metalness: 0.88,
    });

    // Invisible to main camera for upper body (no color write, no depth write occlusion to prevent camera clipping)
    // Three.js shadow maps use customDepthMaterial with RGBADepthPacking for directional sun light!
    const shadowCasterMat = new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthWrite: false,
    });
    const depthMat = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });

    const createShadowOnlyMesh = (geo: THREE.BufferGeometry) => {
      const mesh = new THREE.Mesh(geo, shadowCasterMat);
      mesh.customDepthMaterial = depthMat;
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      return mesh;
    };

    const createVisibleMesh = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.customDepthMaterial = depthMat;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    // 1. Pelvis Root (Hips and lower body base at y = 0.88m)
    const pelvis = new THREE.Group();
    pelvis.name = 'shadow_pelvis';
    pelvis.position.set(0, 0.88, -0.04);

    const pelvisMesh = createVisibleMesh(new THREE.BoxGeometry(0.38, 0.18, 0.24), uniformMat);
    pelvisMesh.position.set(0, 0, 0);

    const tacticalBelt = createVisibleMesh(new THREE.BoxGeometry(0.40, 0.08, 0.26), beltMat);
    tacticalBelt.position.set(0, 0.06, 0);

    const cobraBuckle = createVisibleMesh(new THREE.BoxGeometry(0.07, 0.06, 0.02), hardwareMat);
    cobraBuckle.position.set(0, 0.06, 0.135);

    pelvis.add(pelvisMesh, tacticalBelt, cobraBuckle);

    // Left Leg Articulated Chain (Hip -> Thigh -> Knee -> Shin -> Boot)
    const leftHip = new THREE.Group();
    leftHip.name = 'shadow_left_hip';
    leftHip.position.set(-0.135, -0.04, 0);

    // Upper thigh: extends down from hip pivot (0 to -0.42)
    const leftThighGeo = new THREE.CylinderGeometry(0.088, 0.078, 0.42, 12);
    leftThighGeo.translate(0, -0.21, 0);
    const leftThigh = createVisibleMesh(leftThighGeo, uniformMat);

    const leftCargo = createVisibleMesh(new THREE.BoxGeometry(0.05, 0.16, 0.12), uniformMat);
    leftCargo.position.set(-0.08, -0.20, 0);
    leftHip.add(leftThigh, leftCargo);

    // Knee pivot at bottom of thigh
    const leftKnee = new THREE.Group();
    leftKnee.name = 'shadow_left_knee';
    leftKnee.position.set(0, -0.42, 0);

    // Lower shin: extends down from knee pivot (0 to -0.38)
    const leftShinGeo = new THREE.CylinderGeometry(0.076, 0.068, 0.38, 12);
    leftShinGeo.translate(0, -0.19, 0);
    const leftShin = createVisibleMesh(leftShinGeo, uniformMat);

    const leftKneePad = createVisibleMesh(new THREE.BoxGeometry(0.13, 0.14, 0.07), kneePadMat);
    leftKneePad.position.set(0, 0, 0.065);

    const leftBoot = createVisibleMesh(new THREE.BoxGeometry(0.135, 0.15, 0.25), bootRubberMat);
    leftBoot.position.set(0, -0.38, 0.04);
    const leftSole = createVisibleMesh(new THREE.BoxGeometry(0.14, 0.03, 0.26), hardwareMat);
    leftSole.position.set(0, -0.45, 0.04);

    leftKnee.add(leftShin, leftKneePad, leftBoot, leftSole);
    leftHip.add(leftKnee);
    pelvis.add(leftHip);

    // Right Leg Articulated Chain (Hip -> Thigh -> Knee -> Shin -> Boot)
    const rightHip = new THREE.Group();
    rightHip.name = 'shadow_right_hip';
    rightHip.position.set(0.135, -0.04, 0);

    const rightThighGeo = new THREE.CylinderGeometry(0.088, 0.078, 0.42, 12);
    rightThighGeo.translate(0, -0.21, 0);
    const rightThigh = createVisibleMesh(rightThighGeo, uniformMat);

    const rightCargo = createVisibleMesh(new THREE.BoxGeometry(0.05, 0.16, 0.12), uniformMat);
    rightCargo.position.set(0.08, -0.20, 0);

    const dropHolster = createVisibleMesh(new THREE.BoxGeometry(0.08, 0.16, 0.09), kneePadMat);
    dropHolster.position.set(0.08, -0.15, 0.02);

    rightHip.add(rightThigh, rightCargo, dropHolster);

    const rightKnee = new THREE.Group();
    rightKnee.name = 'shadow_right_knee';
    rightKnee.position.set(0, -0.42, 0);

    const rightShinGeo = new THREE.CylinderGeometry(0.076, 0.068, 0.38, 12);
    rightShinGeo.translate(0, -0.19, 0);
    const rightShin = createVisibleMesh(rightShinGeo, uniformMat);

    const rightKneePad = createVisibleMesh(new THREE.BoxGeometry(0.13, 0.14, 0.07), kneePadMat);
    rightKneePad.position.set(0, 0, 0.065);

    const rightBoot = createVisibleMesh(new THREE.BoxGeometry(0.135, 0.15, 0.25), bootRubberMat);
    rightBoot.position.set(0, -0.38, 0.04);
    const rightSole = createVisibleMesh(new THREE.BoxGeometry(0.14, 0.03, 0.26), hardwareMat);
    rightSole.position.set(0, -0.45, 0.04);

    rightKnee.add(rightShin, rightKneePad, rightBoot, rightSole);
    rightHip.add(rightKnee);
    pelvis.add(rightHip);

    playerShadow.add(pelvis);

    // 2. Upper Body (Spine, Torso, Tactical Vest, Head, Arms & Equipped Firearm)
    // Uses shadowCasterMat so it casts shadows without clipping into the first-person camera!
    const upperBody = new THREE.Group();
    upperBody.name = 'shadow_upper_body';
    upperBody.position.set(0, 0.94, 0);

    // Torso & Ballistic Plate Carrier
    const torsoMesh = createShadowOnlyMesh(new THREE.BoxGeometry(0.44, 0.54, 0.26));
    torsoMesh.position.set(0, 0.27, 0);

    const plateCarrierMesh = createShadowOnlyMesh(new THREE.BoxGeometry(0.48, 0.46, 0.32));
    plateCarrierMesh.position.set(0, 0.29, 0);

    const ammoPouchMesh = createShadowOnlyMesh(new THREE.BoxGeometry(0.32, 0.16, 0.08));
    ammoPouchMesh.position.set(0, 0.22, 0.18);

    upperBody.add(torsoMesh, plateCarrierMesh, ammoPouchMesh);

    // Head & Tactical FAST Helmet with NVG optics
    const headGroup = new THREE.Group();
    headGroup.name = 'shadow_head';
    headGroup.position.set(0, 0.58, 0);

    const headMesh = createShadowOnlyMesh(new THREE.SphereGeometry(0.15, 12, 10));
    headMesh.scale.set(1, 0.9, 1.1);

    const helmetMesh = createShadowOnlyMesh(new THREE.SphereGeometry(0.17, 12, 10));
    helmetMesh.scale.set(1, 0.85, 1.12);
    helmetMesh.position.set(0, 0.04, -0.01);

    const nvgGoggles = createShadowOnlyMesh(new THREE.BoxGeometry(0.18, 0.06, 0.1));
    nvgGoggles.position.set(0, 0.02, 0.16);

    headGroup.add(headMesh, helmetMesh, nvgGoggles);
    upperBody.add(headGroup);

    // 3. Articulated Arms (Shoulders, Elbows, Forearms & Hands)
    const leftShoulder = new THREE.Group();
    leftShoulder.name = 'shadow_left_shoulder';
    leftShoulder.position.set(-0.24, 0.46, 0.02);

    const leftUpperArmGeo = new THREE.CylinderGeometry(0.065, 0.058, 0.32, 10);
    leftUpperArmGeo.translate(0, -0.16, 0);
    const leftUpperArm = createShadowOnlyMesh(leftUpperArmGeo);
    leftShoulder.add(leftUpperArm);

    const leftElbow = new THREE.Group();
    leftElbow.name = 'shadow_left_elbow';
    leftElbow.position.set(0, -0.32, 0);

    const leftForearmGeo = new THREE.CylinderGeometry(0.058, 0.05, 0.32, 10);
    leftForearmGeo.translate(0, -0.16, 0);
    const leftForearm = createShadowOnlyMesh(leftForearmGeo);
    const leftHand = createShadowOnlyMesh(new THREE.BoxGeometry(0.08, 0.06, 0.1));
    leftHand.position.set(0, -0.32, 0.02);

    leftElbow.add(leftForearm, leftHand);
    leftShoulder.add(leftElbow);
    upperBody.add(leftShoulder);

    const rightShoulder = new THREE.Group();
    rightShoulder.name = 'shadow_right_shoulder';
    rightShoulder.position.set(0.24, 0.46, 0.02);

    const rightUpperArmGeo = new THREE.CylinderGeometry(0.065, 0.058, 0.32, 10);
    rightUpperArmGeo.translate(0, -0.16, 0);
    const rightUpperArm = createShadowOnlyMesh(rightUpperArmGeo);
    rightShoulder.add(rightUpperArm);

    const rightElbow = new THREE.Group();
    rightElbow.name = 'shadow_right_elbow';
    rightElbow.position.set(0, -0.32, 0);

    const rightForearmGeo = new THREE.CylinderGeometry(0.058, 0.05, 0.32, 10);
    rightForearmGeo.translate(0, -0.16, 0);
    const rightForearm = createShadowOnlyMesh(rightForearmGeo);
    const rightHand = createShadowOnlyMesh(new THREE.BoxGeometry(0.08, 0.06, 0.1));
    rightHand.position.set(0, -0.32, 0.02);

    rightElbow.add(rightForearm, rightHand);
    rightShoulder.add(rightElbow);
    upperBody.add(rightShoulder);

    // 4. Equipped Gun (High-fidelity 3D weapon shadow caster)
    const gunShadowGroup = new THREE.Group();
    gunShadowGroup.name = 'shadow_weapon_group';
    gunShadowGroup.position.set(0.12, 0.32, 0.34);
    gunShadowGroup.rotation.y = Math.PI;

    const weaponModel = ModelFactory.createWeaponMesh(weaponType, camo, optic);
    weaponModel.scale.set(0.78, 0.78, 0.78);
    weaponModel.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.material = shadowCasterMat;
        child.customDepthMaterial = depthMat;
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });
    gunShadowGroup.add(weaponModel);
    upperBody.add(gunShadowGroup);

    playerShadow.add(upperBody);

    return playerShadow;
  }
}

