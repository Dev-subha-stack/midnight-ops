import * as THREE from 'three';
import { WeaponType } from '../types';
import { WEAPON_REGISTRY } from './weapons';
import { ParticleSystem } from './particles';
import { soundManager } from './audio';
import { TextureGenerator } from './textures';

export interface FloatingDamageNumber {
  id: string;
  damage: number;
  isHeadshot: boolean;
  position: THREE.Vector3;
  life: number;
  maxLife: number;
  screenX?: number;
  screenY?: number;
  hitZone: string;
}

export interface TrainingTelemetry {
  totalDamage: number;
  targetsHit: number;
  targetsNeutralized: number;
  headshots: number;
  lastHitDamage: number;
  lastHitDistance: number;
  lastHitZone: string;
  currentDps: number;
  accuracy: number;
  shotsFired: number;
  shotsHit: number;
  infiniteAmmo: boolean;
  movingTargetSpeed: number;
}

export class TargetDummy {
  public id: string;
  public name: string;
  public basePosition: THREE.Vector3;
  public position: THREE.Vector3;
  public group: THREE.Group;
  public health: number = 250;
  public maxHealth: number = 250;
  public armor: number = 100;
  public maxArmor: number = 100;
  public isDown: boolean = false;
  public isMoving: boolean = false;
  public moveRange: number = 8;
  public moveSpeed: number = 3.5;
  public moveDirection: number = 1;
  public tiltAngle: number = 0;
  public resetTimer: number = 0;
  public distanceToFiringPad: number = 0;

  // Sub-meshes for hit testing
  public headMesh: THREE.Mesh;
  public chestMesh: THREE.Mesh;
  public pelvisMesh: THREE.Mesh;
  public leftArmMesh: THREE.Mesh;
  public rightArmMesh: THREE.Mesh;
  public standMesh: THREE.Mesh;
  public healthBarSprite: THREE.Sprite | null = null;

  constructor(
    id: string,
    name: string,
    pos: THREE.Vector3,
    scene: THREE.Scene,
    isMoving: boolean = false,
    moveRange: number = 8,
    moveSpeed: number = 3.5
  ) {
    this.id = id;
    this.name = name;
    this.basePosition = pos.clone();
    this.position = pos.clone();
    this.isMoving = isMoving;
    this.moveRange = moveRange;
    this.moveSpeed = moveSpeed;
    this.distanceToFiringPad = Math.round(new THREE.Vector3(0, 1.7, 34).distanceTo(pos));

    this.group = new THREE.Group();
    this.group.position.copy(pos);

    // Materials
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8, metalness: 0.6 });
    const dummyTexture = TextureGenerator.createTrainingDummyTexture();
    const torsoMat = new THREE.MeshStandardMaterial({
      map: dummyTexture,
      roughness: 0.6,
      metalness: 0.2,
    });
    const armorPlateMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35, metalness: 0.7 }); // Ballistic Strike Face
    const targetRingMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
    const bullseyeMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, emissive: 0x991b1b, emissiveIntensity: 0.3 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, metalness: 0.3 }); // Ballistic helmet

    // 1. Heavy Metal Stand / Pole & Hydraulic Piston
    const baseGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.1, 16);
    const basePlate = new THREE.Mesh(baseGeo, baseMat);
    basePlate.position.y = 0.05;
    this.group.add(basePlate);

    const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.9, 12);
    this.standMesh = new THREE.Mesh(poleGeo, baseMat);
    this.standMesh.position.y = 0.5;
    this.standMesh.name = 'stand';

    // Hydraulic Shock Absorber Cylinder
    const pistonGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 12);
    const pistonMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.2, metalness: 0.9 });
    const pistonMesh = new THREE.Mesh(pistonGeo, pistonMat);
    pistonMesh.position.y = 0.65;
    this.group.add(this.standMesh, pistonMesh);

    // 2. Pelvis / Lower Torso
    const pelvisGeo = new THREE.BoxGeometry(0.42, 0.3, 0.24);
    this.pelvisMesh = new THREE.Mesh(pelvisGeo, torsoMat);
    this.pelvisMesh.position.set(0, 0.95, 0);
    this.pelvisMesh.name = 'pelvis';
    this.pelvisMesh.castShadow = true;
    this.group.add(this.pelvisMesh);

    // 3. Chest / Upper Torso with Target Rings
    const chestGeo = new THREE.BoxGeometry(0.55, 0.65, 0.28);
    this.chestMesh = new THREE.Mesh(chestGeo, torsoMat);
    this.chestMesh.position.set(0, 1.42, 0);
    this.chestMesh.name = 'chest';
    this.chestMesh.castShadow = true;
    this.group.add(this.chestMesh);

    // Armor Plate Overlay
    const armorGeo = new THREE.BoxGeometry(0.46, 0.48, 0.06);
    const armorPlate = new THREE.Mesh(armorGeo, armorPlateMat);
    armorPlate.position.set(0, 1.42, 0.14);
    this.group.add(armorPlate);

    // Target Bullseye Circles on Chest
    const ringGeo = new THREE.RingGeometry(0.08, 0.16, 24);
    const ringMesh = new THREE.Mesh(ringGeo, targetRingMat);
    ringMesh.position.set(0, 1.42, 0.18);
    const bullseyeGeo = new THREE.CircleGeometry(0.07, 24);
    const bullseyeMesh = new THREE.Mesh(bullseyeGeo, bullseyeMat);
    bullseyeMesh.position.set(0, 1.42, 0.185);
    this.group.add(ringMesh, bullseyeMesh);

    // 4. Arms
    const armGeo = new THREE.BoxGeometry(0.14, 0.55, 0.14);
    this.leftArmMesh = new THREE.Mesh(armGeo, torsoMat);
    this.leftArmMesh.position.set(-0.35, 1.35, 0);
    this.leftArmMesh.name = 'left_arm';
    this.leftArmMesh.castShadow = true;

    this.rightArmMesh = new THREE.Mesh(armGeo, torsoMat);
    this.rightArmMesh.position.set(0.35, 1.35, 0);
    this.rightArmMesh.name = 'right_arm';
    this.rightArmMesh.castShadow = true;
    this.group.add(this.leftArmMesh, this.rightArmMesh);

    // 5. Head / Ballistic Helmet (Headshot Target Zone)
    const headGeo = new THREE.BoxGeometry(0.26, 0.3, 0.26);
    this.headMesh = new THREE.Mesh(headGeo, headMat);
    this.headMesh.position.set(0, 1.9, 0);
    this.headMesh.name = 'head';
    this.headMesh.castShadow = true;

    // Small Bullseye on Forehead
    const headBullseye = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), bullseyeMat);
    headBullseye.position.set(0, 1.92, 0.135);
    this.group.add(this.headMesh, headBullseye);

    // Add track rails if this is a moving dummy
    if (this.isMoving) {
      const railGeo = new THREE.BoxGeometry(moveRange * 2 + 1, 0.08, 0.3);
      const railMesh = new THREE.Mesh(railGeo, baseMat);
      railMesh.position.set(pos.x, 0.04, pos.z);
      scene.add(railMesh);
    }

    scene.add(this.group);
  }

  public takeDamage(damage: number, isHeadshot: boolean, hitZone: string): { isKill: boolean; actualDmg: number } {
    if (this.isDown) return { isKill: false, actualDmg: 0 };

    let actualDmg = damage;
    if (this.armor > 0) {
      const armorAbsorb = Math.min(this.armor, damage * 0.5);
      this.armor -= armorAbsorb;
      actualDmg = Math.max(5, damage - armorAbsorb * 0.5);
    }

    this.health = Math.max(0, this.health - actualDmg);

    // Kinetic impact tilt
    const impulse = isHeadshot ? 0.35 : 0.22;
    this.tiltAngle = Math.min(Math.PI * 0.45, this.tiltAngle + impulse);

    if (this.health <= 0) {
      this.isDown = true;
      this.resetTimer = 1.6; // Auto-resurrect in 1.6s
      this.tiltAngle = Math.PI * 0.48; // Fall backward
      return { isKill: true, actualDmg };
    }

    return { isKill: false, actualDmg };
  }

  public reset(particles?: ParticleSystem) {
    this.health = this.maxHealth;
    this.armor = this.maxArmor;
    this.isDown = false;
    this.tiltAngle = 0;
    this.resetTimer = 0;

    if (particles) {
      particles.emitImpactSparks(this.position.clone().setY(0.5), new THREE.Vector3(0, 1, 0));
    }
  }

  public update(dt: number, particles?: ParticleSystem) {
    // 1. Moving Dummy Logic (Smooth Lateral Slide)
    if (this.isMoving && !this.isDown) {
      this.position.x += this.moveDirection * this.moveSpeed * dt;
      if (this.position.x > this.basePosition.x + this.moveRange) {
        this.position.x = this.basePosition.x + this.moveRange;
        this.moveDirection = -1;
      } else if (this.position.x < this.basePosition.x - this.moveRange) {
        this.position.x = this.basePosition.x - this.moveRange;
        this.moveDirection = 1;
      }
      this.group.position.x = this.position.x;
    }

    // 2. Spring-Damper Recovery Physics for Target Tilt
    if (this.isDown) {
      this.resetTimer -= dt;
      this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, -Math.PI * 0.45, dt * 12);
      if (this.resetTimer <= 0) {
        this.reset(particles);
        soundManager.playHitmarker(false, false, true); // Spring pop sound
      }
    } else {
      // Spring back to vertical
      this.tiltAngle = THREE.MathUtils.lerp(this.tiltAngle, 0, dt * 8);
      this.group.rotation.x = -this.tiltAngle;
    }
  }

  public destroy(scene: THREE.Scene) {
    scene.remove(this.group);
  }
}

// --- REACTIVE STEEL POPPER PLATES ---
export class SteelPopperPlate {
  public id: string;
  public position: THREE.Vector3;
  public group: THREE.Group;
  public plateMesh: THREE.Mesh;
  public isDown: boolean = false;
  public resetTimer: number = 0;
  public distanceToFiringPad: number = 0;

  constructor(id: string, pos: THREE.Vector3, scene: THREE.Scene, plateWidth: number = 0.5, plateHeight: number = 0.6) {
    this.id = id;
    this.position = pos.clone();
    this.distanceToFiringPad = Math.round(new THREE.Vector3(0, 1.7, 34).distanceTo(pos));

    this.group = new THREE.Group();
    this.group.position.copy(pos);

    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.6 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.85 }); // Highly reflective white-steel plate
    const bullseyeMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3 }); // Amber center

    // Ground mount & hinge post
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0, 8), postMat);
    post.position.y = 0.5;
    this.group.add(post);

    // Hinged Steel Target Plate (Pivots around y = 1.0)
    const plateGeo = new THREE.BoxGeometry(plateWidth, plateHeight, 0.04);
    this.plateMesh = new THREE.Mesh(plateGeo, steelMat);
    this.plateMesh.position.set(0, 1.0 + plateHeight / 2, 0);
    this.plateMesh.castShadow = true;
    this.plateMesh.name = `${id}_plate`;

    const centerDecal = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), bullseyeMat);
    centerDecal.position.set(0, 0, 0.025);
    this.plateMesh.add(centerDecal);

    this.group.add(this.plateMesh);
    scene.add(this.group);
  }

  public hit(damage: number, hitNormal: THREE.Vector3): boolean {
    if (this.isDown) return false;
    this.isDown = true;
    this.resetTimer = 1.2; // Pops back up after 1.2s
    return true;
  }

  public update(dt: number) {
    if (this.isDown) {
      this.resetTimer -= dt;
      // Animate flip down
      this.plateMesh.rotation.x = THREE.MathUtils.lerp(this.plateMesh.rotation.x, Math.PI * 0.48, dt * 14);
      if (this.resetTimer <= 0) {
        this.isDown = false;
        soundManager.playHitmarker(true, false);
      }
    } else {
      // Snap back upright
      this.plateMesh.rotation.x = THREE.MathUtils.lerp(this.plateMesh.rotation.x, 0, dt * 12);
    }
  }

  public destroy(scene: THREE.Scene) {
    scene.remove(this.group);
  }
}

// --- MASTER TRAINING & BALLISTIC RANGE MANAGER ---
export class TrainingManager {
  public scene: THREE.Scene;
  public particles: ParticleSystem;
  public dummies: TargetDummy[] = [];
  public steelPlates: SteelPopperPlate[] = [];
  public floatingNumbers: FloatingDamageNumber[] = [];
  public rangeElements: THREE.Object3D[] = [];

  // Range Telemetry Data
  public telemetry: TrainingTelemetry = {
    totalDamage: 0,
    targetsHit: 0,
    targetsNeutralized: 0,
    headshots: 0,
    lastHitDamage: 0,
    lastHitDistance: 0,
    lastHitZone: 'READY',
    currentDps: 0,
    accuracy: 0,
    shotsFired: 0,
    shotsHit: 0,
    infiniteAmmo: true,
    movingTargetSpeed: 3.5,
  };

  // Recent damage log for dynamic 3-second DPS calculation
  private recentDamageLogs: { time: number; damage: number }[] = [];

  // Callbacks
  public onTelemetryUpdate: (telemetry: TrainingTelemetry) => void = () => {};
  public onTargetHitNotice: (text: string, isHeadshot: boolean) => void = () => {};

  constructor(scene: THREE.Scene, particles: ParticleSystem) {
    this.scene = scene;
    this.particles = particles;
    this.initTrainingRange();
  }

  private initTrainingRange() {
    // 1. Spawn Ballistic Humanoid Dummies at Measured Ranges from South Firing Pad (z = 34)
    // 10m Close Range Target
    const dummy10m = new TargetDummy('dummy_10m', 'Close-Range Mannequin [10m]', new THREE.Vector3(-4, 0, 24), this.scene);
    // 20m Mid Range Armored Target
    const dummy20m = new TargetDummy('dummy_20m', 'Tactical Armored Target [20m]', new THREE.Vector3(4, 0, 14), this.scene);
    // 32m Mid-Long Range Target
    const dummy32m = new TargetDummy('dummy_32m', 'Perimeter Combat Dummy [32m]', new THREE.Vector3(-7, 0, 2), this.scene);
    // 45m Long Range Catwalk Sniper Target (Elevated on catwalk)
    const dummy45m = new TargetDummy('dummy_45m', 'Long-Range Catwalk Target [45m]', new THREE.Vector3(0, 3.8, -11), this.scene);
    // 18m Lateral Moving Strafing Dummy (Slides horizontally between x = -9 and x = 9)
    const dummyMoving = new TargetDummy('dummy_moving', 'Lateral Moving Target [18m]', new THREE.Vector3(0, 0, 16), this.scene, true, 8, 3.8);

    this.dummies.push(dummy10m, dummy20m, dummy32m, dummy45m, dummyMoving);

    // 2. Spawn Reactive Steel Popper Plates (IPSC Gongs)
    const plate15m = new SteelPopperPlate('plate_15m', new THREE.Vector3(-8, 0, 19), this.scene, 0.45, 0.55);
    const plate25m = new SteelPopperPlate('plate_25m', new THREE.Vector3(8, 0, 9), this.scene, 0.4, 0.5);
    const plate35m = new SteelPopperPlate('plate_35m', new THREE.Vector3(0, 0, -1), this.scene, 0.35, 0.45);
    const plate48m = new SteelPopperPlate('plate_48m', new THREE.Vector3(12, 0, -14), this.scene, 0.3, 0.4);

    this.steelPlates.push(plate15m, plate25m, plate35m, plate48m);

    // 3. Build Range Ground Markings & Distance Lanes
    this.buildRangeFloorLanes();
  }

  private buildRangeFloorLanes() {
    const laneLineMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.6 });
    const textMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });

    const distanceMarks = [
      { z: 24, label: '10 METERS' },
      { z: 14, label: '20 METERS' },
      { z: 4, label: '30 METERS' },
      { z: -6, label: '40 METERS' },
      { z: -16, label: '50 METERS' },
    ];

    distanceMarks.forEach(mark => {
      // Glowing Cyan Cross-Line on Floor
      const lineGeo = new THREE.PlaneGeometry(28, 0.12);
      const lineMesh = new THREE.Mesh(lineGeo, laneLineMat);
      lineMesh.rotation.x = -Math.PI / 2;
      lineMesh.position.set(0, 0.02, mark.z);
      this.scene.add(lineMesh);
      this.rangeElements.push(lineMesh);

      // Left & Right Distance Placard Posts
      [-14.5, 14.5].forEach(x => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
        post.position.set(x, 0.4, mark.z);
        const sign = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.05), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
        sign.position.set(x, 0.8, mark.z);
        this.scene.add(post, sign);
        this.rangeElements.push(post, sign);
      });
    });
  }

  // --- HIT DETECTION AGAINST TARGET DUMMIES & STEEL PLATES ---
  public testRaycast(
    ray: THREE.Raycaster,
    maxDistance: number,
    weaponType: WeaponType,
    damage: number
  ): {
    hit: boolean;
    hitDistance: number;
    hitPoint: THREE.Vector3 | null;
    isDummy: boolean;
    dummy: TargetDummy | null;
    isHeadshot: boolean;
    hitZone: string;
    actualDamage: number;
  } {
    let closestDist = maxDistance;
    let hitPoint: THREE.Vector3 | null = null;
    let hitDummy: TargetDummy | null = null;
    let isHeadshot = false;
    let hitZone = 'BODY';
    let actualDmg = 0;
    let isHit = false;

    // 1. Test Dummies
    for (const dummy of this.dummies) {
      if (dummy.isDown) continue;
      const intersects = ray.intersectObjects(dummy.group.children, true);
      if (intersects.length > 0 && intersects[0].distance < closestDist) {
        const hit = intersects[0];
        closestDist = hit.distance;
        hitPoint = hit.point;
        hitDummy = dummy;
        isHit = true;

        // Check Hit Zone
        const objName = hit.object.name;
        const relativeY = hit.point.y - dummy.group.position.y;

        if (objName === 'head' || relativeY > 1.72) {
          isHeadshot = true;
          hitZone = 'HEAD (CRITICAL)';
        } else if (objName === 'chest' || relativeY > 1.15) {
          hitZone = 'UPPER CHEST';
        } else if (objName === 'pelvis' || relativeY > 0.75) {
          hitZone = 'TORSO';
        } else {
          hitZone = 'LIMB';
        }
      }
    }

    // 2. Test Steel Plates
    if (!hitDummy) {
      for (const plate of this.steelPlates) {
        if (plate.isDown) continue;
        const intersects = ray.intersectObject(plate.plateMesh, true);
        if (intersects.length > 0 && intersects[0].distance < closestDist) {
          const hit = intersects[0];
          closestDist = hit.distance;
          hitPoint = hit.point;
          isHit = true;

          plate.hit(damage, hit.face ? hit.face.normal : new THREE.Vector3(0, 0, 1));
          soundManager.playHitmarker(true, false);
          this.recordHit(damage, plate.distanceToFiringPad, 'STEEL PLATE', false);

          this.spawnFloatingNumber(damage, false, hit.point, 'STEEL');
          return {
            hit: true,
            hitDistance: closestDist,
            hitPoint,
            isDummy: false,
            dummy: null,
            isHeadshot: false,
            hitZone: 'STEEL PLATE',
            actualDamage: damage,
          };
        }
      }
    }

    // If hit a mannequin dummy:
    if (hitDummy && hitPoint) {
      const wpnCfg = WEAPON_REGISTRY[weaponType];
      const multiplier = isHeadshot ? wpnCfg.headshotMultiplier : hitZone === 'LIMB' ? 0.85 : 1.0;
      const finalCalcDamage = Math.round(damage * multiplier);

      const result = hitDummy.takeDamage(finalCalcDamage, isHeadshot, hitZone);
      actualDmg = result.actualDmg;

      // Particles & Audio
      this.particles.emitImpactSparks(hitPoint, new THREE.Vector3(0, 1, 0));
      soundManager.playHitmarker(isHeadshot, result.isKill, hitDummy.armor > 0);

      // Record Telemetry
      this.recordHit(actualDmg, hitDummy.distanceToFiringPad, hitZone, isHeadshot, result.isKill);

      // Spawn 3D Floating Damage Text
      this.spawnFloatingNumber(actualDmg, isHeadshot, hitPoint, hitZone);

      return {
        hit: true,
        hitDistance: closestDist,
        hitPoint,
        isDummy: true,
        dummy: hitDummy,
        isHeadshot,
        hitZone,
        actualDamage: actualDmg,
      };
    }

    return {
      hit: false,
      hitDistance: Infinity,
      hitPoint: null,
      isDummy: false,
      dummy: null,
      isHeadshot: false,
      hitZone: '',
      actualDamage: 0,
    };
  }

  // --- EXPLOSION DAMAGE TO TRAINING TARGETS ---
  public processExplosion(center: THREE.Vector3, radius: number, maxDamage: number) {
    for (const dummy of this.dummies) {
      if (dummy.isDown) continue;
      const dist = dummy.position.distanceTo(center);
      if (dist < radius) {
        const falloff = 1 - dist / radius;
        const dmg = Math.round(maxDamage * falloff);
        const res = dummy.takeDamage(dmg, false, 'EXPLOSIVE BLAST');
        this.recordHit(res.actualDmg, dummy.distanceToFiringPad, 'BLAST', false, res.isKill);
        this.spawnFloatingNumber(res.actualDmg, false, dummy.position.clone().setY(1.4), 'BLAST');
      }
    }

    for (const plate of this.steelPlates) {
      if (plate.isDown) continue;
      const dist = plate.position.distanceTo(center);
      if (dist < radius) {
        plate.hit(maxDamage, new THREE.Vector3(0, 1, 0));
      }
    }
  }

  // --- RECORD HIT TELEMETRY ---
  public recordHit(damage: number, distance: number, hitZone: string, isHeadshot: boolean, isNeutralized: boolean = false) {
    this.telemetry.totalDamage += damage;
    this.telemetry.shotsHit++;
    this.telemetry.targetsHit++;
    if (isHeadshot) this.telemetry.headshots++;
    if (isNeutralized) this.telemetry.targetsNeutralized++;

    this.telemetry.lastHitDamage = damage;
    this.telemetry.lastHitDistance = distance;
    this.telemetry.lastHitZone = hitZone;

    if (this.telemetry.shotsFired > 0) {
      this.telemetry.accuracy = Math.round((this.telemetry.shotsHit / this.telemetry.shotsFired) * 100);
    }

    // Add to rolling DPS log
    this.recentDamageLogs.push({ time: performance.now() / 1000, damage });

    this.onTelemetryUpdate({ ...this.telemetry });
  }

  public recordShotFired() {
    this.telemetry.shotsFired++;
    if (this.telemetry.shotsFired > 0) {
      this.telemetry.accuracy = Math.round((this.telemetry.shotsHit / this.telemetry.shotsFired) * 100);
    }
    this.onTelemetryUpdate({ ...this.telemetry });
  }

  public resetAllTargets() {
    this.dummies.forEach(d => d.reset(this.particles));
    this.steelPlates.forEach(p => {
      p.isDown = false;
      p.plateMesh.rotation.x = 0;
    });
    this.telemetry.totalDamage = 0;
    this.telemetry.targetsHit = 0;
    this.telemetry.targetsNeutralized = 0;
    this.telemetry.headshots = 0;
    this.telemetry.shotsFired = 0;
    this.telemetry.shotsHit = 0;
    this.telemetry.accuracy = 100;
    this.recentDamageLogs = [];
    this.onTelemetryUpdate({ ...this.telemetry });
    this.onTargetHitNotice('ALL TARGET RANGE DUMMIES & TELEMETRY RESET', false);
  }

  private spawnFloatingNumber(damage: number, isHeadshot: boolean, pos: THREE.Vector3, hitZone: string) {
    this.floatingNumbers.push({
      id: Math.random().toString(),
      damage,
      isHeadshot,
      position: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.2, (Math.random() - 0.5) * 0.3)),
      life: 1.2,
      maxLife: 1.2,
      hitZone,
    });
  }

  public update(dt: number) {
    // 1. Update Dummies & Steel Plates
    this.dummies.forEach(dummy => dummy.update(dt, this.particles));
    this.steelPlates.forEach(plate => plate.update(dt));

    // 2. Update Floating Damage Numbers
    for (let i = this.floatingNumbers.length - 1; i >= 0; i--) {
      const num = this.floatingNumbers[i];
      num.life -= dt;
      num.position.y += dt * 0.8; // Float upward
      if (num.life <= 0) {
        this.floatingNumbers.splice(i, 1);
      }
    }

    // 3. Compute Real-Time DPS (3-Second Rolling Window)
    const now = performance.now() / 1000;
    this.recentDamageLogs = this.recentDamageLogs.filter(item => now - item.time <= 3.0);
    const sumDmg = this.recentDamageLogs.reduce((acc, curr) => acc + curr.damage, 0);
    this.telemetry.currentDps = Math.round(sumDmg / 3.0);
  }

  public destroy() {
    this.dummies.forEach(d => d.destroy(this.scene));
    this.steelPlates.forEach(p => p.destroy(this.scene));
    this.rangeElements.forEach(elem => this.scene.remove(elem));
    this.dummies = [];
    this.steelPlates = [];
    this.rangeElements = [];
  }
}
