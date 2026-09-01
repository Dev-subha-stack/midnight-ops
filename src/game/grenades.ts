import * as THREE from 'three';
import { ActiveMotionSensor, ActiveSmokeCloud, FragGrenade, TacticalType } from '../types';
import { soundManager } from './audio';
import { MapObstacle } from './map';
import { ParticleSystem } from './particles';

export type UtilityType = 'frag' | 'smoke' | 'motion_sensor';

export interface ActiveProjectile {
  id: string;
  type: UtilityType;
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotVelocity: THREE.Vector3;
  fuseTime: number;
  maxFuse: number;
  isCooked: boolean;
}

export interface ActiveSmokeEntity {
  id: string;
  position: THREE.Vector3;
  radius: number;
  maxRadius: number;
  duration: number;
  maxDuration: number;
  meshGroup: THREE.Group;
  puffTimer: number;
}

export interface ActiveMotionSensorEntity {
  id: string;
  position: THREE.Vector3;
  radius: number;
  lifetime: number;
  maxLifetime: number;
  mesh: THREE.Group;
  sonarWaveMesh: THREE.Mesh;
  waveRadius: number;
  pingTimer: number;
  detectedBotIds: string[];
}

export class GrenadeManager {
  private scene: THREE.Scene;
  private particles: ParticleSystem;
  private obstacles: MapObstacle[] = [];
  
  // Lethal & Tactical Inventories
  private grenadeCount: number = 2; // Frag grenades
  private maxGrenades: number = 4;
  private tacticalType: TacticalType = 'smoke';
  private tacticalCount: number = 2;
  private maxTactical: number = 3;
  private throwCooldown: number = 0;

  // Active Projectiles & World Entities
  private projectiles: ActiveProjectile[] = [];
  public smokeClouds: ActiveSmokeEntity[] = [];
  public motionSensors: ActiveMotionSensorEntity[] = [];

  public onExplode: (center: THREE.Vector3, radius: number, maxDamage: number) => void = () => {};
  public onMotionDetect: (botIds: string[]) => void = () => {};

  constructor(scene: THREE.Scene, particles: ParticleSystem, obstacles?: MapObstacle[]) {
    this.scene = scene;
    this.particles = particles;
    if (obstacles) {
      this.obstacles = obstacles;
    }
  }

  // --- INVENTORY MANAGEMENT ---
  public getCount(): number {
    return this.grenadeCount;
  }

  public getTacticalCount(): number {
    return this.tacticalCount;
  }

  public getTacticalType(): TacticalType {
    return this.tacticalType;
  }

  public setTacticalType(type: TacticalType) {
    this.tacticalType = type;
    soundManager.playTacticalSwitch();
  }

  public toggleTacticalType(): TacticalType {
    this.tacticalType = this.tacticalType === 'smoke' ? 'motion_sensor' : 'smoke';
    soundManager.playTacticalSwitch();
    return this.tacticalType;
  }

  public addGrenade(amount: number = 1) {
    this.grenadeCount = Math.min(this.maxGrenades, this.grenadeCount + amount);
  }

  public addTactical(amount: number = 1) {
    this.tacticalCount = Math.min(this.maxTactical, this.tacticalCount + amount);
  }

  // --- LETHAL: THROW M67 FRAG GRENADE ---
  public throwGrenade(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    playerVelocity?: THREE.Vector3,
    throwForce: number = 18.0
  ): boolean {
    if (this.grenadeCount <= 0 || this.throwCooldown > 0) return false;

    this.grenadeCount--;
    this.throwCooldown = 0.6;
    soundManager.playGrenadePin();

    const group = new THREE.Group();
    group.position.copy(origin);

    // M67 Frag Grenade Geometry
    const bodyGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3f4f2c, roughness: 0.7, metalness: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    group.add(body);

    const fuzeGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8);
    const fuzeMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.2 });
    const fuze = new THREE.Mesh(fuzeGeo, fuzeMat);
    fuze.position.y = 0.08;
    group.add(fuze);

    const bandGeo = new THREE.TorusGeometry(0.092, 0.008, 6, 16);
    bandGeo.rotateX(Math.PI / 2);
    const band = new THREE.Mesh(bandGeo, new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    group.add(band);

    this.scene.add(group);

    const vel = direction.clone().multiplyScalar(throwForce).add(new THREE.Vector3(0, 3.5, 0));
    if (playerVelocity) vel.addScaledVector(playerVelocity, 0.6);

    const rotVel = new THREE.Vector3(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 12
    );

    this.projectiles.push({
      id: `frag_${Date.now()}_${Math.random()}`,
      type: 'frag',
      mesh: group,
      position: origin.clone(),
      velocity: vel,
      rotVelocity: rotVel,
      fuseTime: 3.0,
      maxFuse: 3.0,
      isCooked: false,
    });

    return true;
  }

  // --- TACTICAL: DEPLOY ACTIVE UTILITY (SMOKE / MOTION SENSOR) ---
  public deployTactical(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    playerVelocity?: THREE.Vector3
  ): boolean {
    if (this.tacticalCount <= 0 || this.throwCooldown > 0) return false;

    if (this.tacticalType === 'smoke') {
      return this.throwSmokeGrenade(origin, direction, playerVelocity);
    } else {
      return this.deployMotionSensor(origin, direction, playerVelocity);
    }
  }

  // --- TACTICAL 1: M18 SMOKE CANISTER ---
  public throwSmokeGrenade(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    playerVelocity?: THREE.Vector3
  ): boolean {
    if (this.tacticalCount <= 0) return false;

    this.tacticalCount--;
    this.throwCooldown = 0.6;
    soundManager.playGrenadePin();

    const group = new THREE.Group();
    group.position.copy(origin);

    // M18 Cylindrical Canister (Military Green with White Top)
    const canGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.16, 12);
    const canMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, metalness: 0.4 });
    const can = new THREE.Mesh(canGeo, canMat);
    can.castShadow = true;
    group.add(can);

    const capGeo = new THREE.CylinderGeometry(0.062, 0.062, 0.03, 12);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 0.08;
    group.add(cap);

    const leverGeo = new THREE.BoxGeometry(0.02, 0.12, 0.01);
    const leverMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    const lever = new THREE.Mesh(leverGeo, leverMat);
    lever.position.set(0.05, 0.04, 0);
    group.add(lever);

    this.scene.add(group);

    const vel = direction.clone().multiplyScalar(16.0).add(new THREE.Vector3(0, 3.2, 0));
    if (playerVelocity) vel.addScaledVector(playerVelocity, 0.6);

    const rotVel = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    );

    this.projectiles.push({
      id: `smoke_${Date.now()}_${Math.random()}`,
      type: 'smoke',
      mesh: group,
      position: origin.clone(),
      velocity: vel,
      rotVelocity: rotVel,
      fuseTime: 1.3,
      maxFuse: 1.3,
      isCooked: false,
    });

    return true;
  }

  // --- TACTICAL 2: DEPLOYABLE MOTION SENSOR BEACON ---
  public deployMotionSensor(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    playerVelocity?: THREE.Vector3
  ): boolean {
    if (this.tacticalCount <= 0) return false;

    this.tacticalCount--;
    this.throwCooldown = 0.6;
    soundManager.playMotionSensorDeploy();

    const group = new THREE.Group();
    group.position.copy(origin);

    // Puck sensor geometry with tripod prongs
    const puckGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.08, 16);
    const puckMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.8 });
    const puck = new THREE.Mesh(puckGeo, puckMat);
    puck.position.y = 0.04;
    group.add(puck);

    // Glowing Cyan Core & Antenna
    const coreGeo = new THREE.SphereGeometry(0.045, 12, 8);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 0.09;
    group.add(core);

    const antGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.22, 8);
    const antMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9 });
    const ant = new THREE.Mesh(antGeo, antMat);
    ant.position.y = 0.18;
    group.add(ant);

    this.scene.add(group);

    // Gentle short toss onto ground
    const vel = direction.clone().multiplyScalar(9.0).add(new THREE.Vector3(0, 2.2, 0));
    if (playerVelocity) vel.addScaledVector(playerVelocity, 0.4);

    this.projectiles.push({
      id: `sensor_${Date.now()}_${Math.random()}`,
      type: 'motion_sensor',
      mesh: group,
      position: origin.clone(),
      velocity: vel,
      rotVelocity: new THREE.Vector3(0, 4, 0),
      fuseTime: 0.8,
      maxFuse: 0.8,
      isCooked: false,
    });

    return true;
  }

  // --- DETONATION: SPAWN VOLUMETRIC SMOKE SCREEN ---
  private spawnSmokeScreen(pos: THREE.Vector3) {
    soundManager.playSmokeDeploy();

    const smokeGroup = new THREE.Group();
    smokeGroup.position.copy(pos);

    // Multi-sphere soft cloud envelope
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });

    const subPuffs: THREE.Mesh[] = [];
    const puffOffsets = [
      new THREE.Vector3(0, 1.2, 0),
      new THREE.Vector3(1.8, 1.4, 0.8),
      new THREE.Vector3(-1.6, 1.2, -1.2),
      new THREE.Vector3(0.9, 1.6, -1.8),
      new THREE.Vector3(-1.2, 1.5, 1.5),
      new THREE.Vector3(0, 2.4, 0),
    ];

    puffOffsets.forEach(offset => {
      const pMesh = new THREE.Mesh(new THREE.SphereGeometry(2.4, 10, 8), cloudMat);
      pMesh.position.copy(offset);
      pMesh.scale.set(0.2, 0.2, 0.2);
      smokeGroup.add(pMesh);
      subPuffs.push(pMesh);
    });

    this.scene.add(smokeGroup);

    this.smokeClouds.push({
      id: `smoke_cloud_${Date.now()}`,
      position: pos.clone(),
      radius: 0.5,
      maxRadius: 8.0, // 8 meter tactical obscuration zone
      duration: 18.0, // 18 seconds duration
      maxDuration: 18.0,
      meshGroup: smokeGroup,
      puffTimer: 0,
    });

    // Initial billowing smoke explosion
    this.particles.emitSmokeCloudPuff(pos, 3.5);
  }

  // --- DETONATION: SPAWN ACTIVE MOTION SENSOR STATION ---
  private spawnMotionSensorStation(pos: THREE.Vector3) {
    const group = new THREE.Group();
    group.position.set(pos.x, 0.05, pos.z);

    // Station tripod base
    const baseGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.08, 16);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.9 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    group.add(base);

    // Pulsing LED Core
    const ledGeo = new THREE.SphereGeometry(0.06, 12, 12);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.y = 0.1;
    group.add(led);

    // Holographic Expanding Sonar Pulse Disk
    const waveGeo = new THREE.RingGeometry(0.1, 0.35, 32);
    waveGeo.rotateX(-Math.PI / 2);
    const waveMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const sonarWave = new THREE.Mesh(waveGeo, waveMat);
    sonarWave.position.y = 0.06;
    group.add(sonarWave);

    this.scene.add(group);

    this.motionSensors.push({
      id: `sensor_station_${Date.now()}`,
      position: pos.clone(),
      radius: 22.0, // 22 meter scan range
      lifetime: 38.0, // 38 seconds battery
      maxLifetime: 38.0,
      mesh: group,
      sonarWaveMesh: sonarWave,
      waveRadius: 0.5,
      pingTimer: 0,
      detectedBotIds: [],
    });
  }

  // --- QUERY: CHECK IF LINE OF SIGHT IS OBSTRUCTED BY SMOKE ---
  public isLineBlockedBySmoke(fromPos: THREE.Vector3, toPos: THREE.Vector3): boolean {
    const dir = new THREE.Vector3().subVectors(toPos, fromPos);
    const dist = dir.length();
    if (dist < 0.001) return false;
    dir.normalize();

    const ray = new THREE.Ray(fromPos, dir);

    for (const cloud of this.smokeClouds) {
      if (cloud.radius < 2.0) continue;
      // Distance from ray to cloud center
      const cloudCenter = cloud.position.clone().add(new THREE.Vector3(0, 1.4, 0));
      const distToRay = ray.distanceToPoint(cloudCenter);

      if (distToRay < cloud.radius) {
        // Also ensure cloud is between from and to
        const proj = new THREE.Vector3().subVectors(cloudCenter, fromPos).dot(dir);
        if (proj > -cloud.radius && proj < dist + cloud.radius) {
          return true; // Line of sight fully occluded by smoke!
        }
      }
    }
    return false;
  }

  // --- QUERY: CHECK IF POSITION IS INSIDE SMOKE ---
  public isPositionInSmoke(pos: THREE.Vector3): boolean {
    for (const cloud of this.smokeClouds) {
      const dist = new THREE.Vector2(pos.x - cloud.position.x, pos.z - cloud.position.z).length();
      if (dist < cloud.radius && pos.y < cloud.position.y + 4.5) {
        return true;
      }
    }
    return false;
  }

  // --- UPDATE FRAME ---
  public update(
    dt: number,
    obstacles?: MapObstacle[],
    botsList?: { id: string; position: THREE.Vector3; isDead?: boolean }[],
    onExplosion?: (pos: THREE.Vector3, radius: number, maxDamage: number) => void
  ) {
    if (this.throwCooldown > 0) {
      this.throwCooldown -= dt;
    }

    const obsList = obstacles || this.obstacles;
    const gravity = -18.0;

    // 1. Update In-Flight Projectiles (Frags, Smokes, Sensors)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.fuseTime -= dt;

      p.velocity.y += gravity * dt;
      const nextPos = p.position.clone().addScaledVector(p.velocity, dt);

      // Floor bounce
      if (nextPos.y <= 0.08) {
        nextPos.y = 0.08;
        p.velocity.y = -p.velocity.y * (p.type === 'motion_sensor' ? 0.2 : 0.45);
        p.velocity.x *= 0.65;
        p.velocity.z *= 0.65;
        if (Math.abs(p.velocity.y) > 0.8) {
          soundManager.playGrenadeBounce();
        }
      }

      // Obstacle box collisions
      for (const obs of obsList) {
        if (!obs.box) continue;
        const box = obs.box;
        if (
          nextPos.x > box.min.x - 0.15 &&
          nextPos.x < box.max.x + 0.15 &&
          nextPos.z > box.min.z - 0.15 &&
          nextPos.z < box.max.z + 0.15 &&
          nextPos.y > box.min.y &&
          nextPos.y < box.max.y
        ) {
          p.velocity.x = -p.velocity.x * 0.45;
          p.velocity.z = -p.velocity.z * 0.45;
          soundManager.playGrenadeBounce();
          break;
        }
      }

      p.position.copy(nextPos);
      p.mesh.position.copy(p.position);
      p.mesh.rotation.x += p.rotVelocity.x * dt;
      p.mesh.rotation.y += p.rotVelocity.y * dt;
      p.mesh.rotation.z += p.rotVelocity.z * dt;

      // Projectile Fuse Expired -> Trigger Effect
      if (p.fuseTime <= 0) {
        this.scene.remove(p.mesh);

        if (p.type === 'frag') {
          // Frag Grenade Explosion
          soundManager.playExplosion();
          this.particles.emitExplosion(p.position, 1.8);
          if (onExplosion) onExplosion(p.position.clone(), 9.0, 160.0);
          if (this.onExplode) this.onExplode(p.position.clone(), 9.0, 160.0);
        } else if (p.type === 'smoke') {
          // Smoke Grenade Obscuration
          this.spawnSmokeScreen(p.position);
        } else if (p.type === 'motion_sensor') {
          // Deployable Motion Sensor Beacon
          this.spawnMotionSensorStation(p.position);
        }

        this.projectiles.splice(i, 1);
      }
    }

    // 2. Update Active Volumetric Smoke Clouds
    for (let i = this.smokeClouds.length - 1; i >= 0; i--) {
      const cloud = this.smokeClouds[i];
      cloud.duration -= dt;

      // Expand cloud radius smoothly
      if (cloud.radius < cloud.maxRadius) {
        cloud.radius = Math.min(cloud.maxRadius, cloud.radius + 3.2 * dt);
        const scaleFactor = cloud.radius / 2.4;
        cloud.meshGroup.children.forEach(mesh => {
          (mesh as THREE.Mesh).scale.set(scaleFactor, scaleFactor * 0.8, scaleFactor);
        });
      }

      // Billow particle puffs periodically
      cloud.puffTimer += dt;
      if (cloud.puffTimer > 0.45 && cloud.duration > 3.0) {
        cloud.puffTimer = 0;
        this.particles.emitSmokeCloudPuff(cloud.position, cloud.radius * 0.85);
      }

      // Fade out near end of lifetime
      if (cloud.duration < 3.0) {
        const fadeRatio = Math.max(0, cloud.duration / 3.0);
        cloud.meshGroup.children.forEach(mesh => {
          const mat = (mesh as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (mat) mat.opacity = 0.72 * fadeRatio;
        });
      }

      if (cloud.duration <= 0) {
        this.scene.remove(cloud.meshGroup);
        this.smokeClouds.splice(i, 1);
      }
    }

    // 3. Update Active Motion Sensors (Sonar radar sweep & Enemy detection)
    for (let i = this.motionSensors.length - 1; i >= 0; i--) {
      const sensor = this.motionSensors[i];
      sensor.lifetime -= dt;

      // Rotate sensor base slowly
      sensor.mesh.rotation.y += 1.8 * dt;

      // Expand holographic wave ring
      sensor.waveRadius += 16.0 * dt;
      if (sensor.waveRadius > sensor.radius) {
        sensor.waveRadius = 0.3;
      }
      sensor.sonarWaveMesh.scale.set(sensor.waveRadius, sensor.waveRadius, 1);
      const waveAlpha = Math.max(0, 1.0 - sensor.waveRadius / sensor.radius) * 0.7;
      (sensor.sonarWaveMesh.material as THREE.MeshBasicMaterial).opacity = waveAlpha;

      // Sonar pulse and enemy scanning every 1.8s
      sensor.pingTimer += dt;
      if (sensor.pingTimer >= 1.8) {
        sensor.pingTimer = 0;
        soundManager.playSonarPing();
        this.particles.emitSensorWave(sensor.position, 1.2);

        // Scan nearby bots
        const detected: string[] = [];
        if (botsList) {
          botsList.forEach(bot => {
            if (bot.isDead) return;
            const dist = sensor.position.distanceTo(bot.position);
            if (dist <= sensor.radius) {
              detected.push(bot.id);
            }
          });
        }
        sensor.detectedBotIds = detected;
        if (detected.length > 0) {
          this.onMotionDetect(detected);
        }
      }

      // Expire sensor battery
      if (sensor.lifetime <= 0) {
        this.scene.remove(sensor.mesh);
        this.motionSensors.splice(i, 1);
      }
    }
  }

  // --- DATA GETTERS FOR HUD & RADAR ---
  public getGrenadesData(): FragGrenade[] {
    return this.projectiles
      .filter(p => p.type === 'frag')
      .map(g => ({
        id: g.id,
        position: { x: g.position.x, y: g.position.y, z: g.position.z },
        fuseRemaining: Math.max(0, g.fuseTime),
        isExploded: g.fuseTime <= 0,
      }));
  }

  public getActiveSmokeClouds(): ActiveSmokeCloud[] {
    return this.smokeClouds.map(c => ({
      id: c.id,
      position: { x: c.position.x, y: c.position.y, z: c.position.z },
      radius: c.radius,
      maxRadius: c.maxRadius,
      density: Math.min(1.0, c.duration / 3.0),
      duration: c.duration,
      maxDuration: c.maxDuration,
    }));
  }

  public getActiveMotionSensors(): ActiveMotionSensor[] {
    return this.motionSensors.map(s => ({
      id: s.id,
      position: { x: s.position.x, y: s.position.y, z: s.position.z },
      radius: s.radius,
      batteryPct: Math.round((s.lifetime / s.maxLifetime) * 100),
      detectedBotIds: s.detectedBotIds,
      lastPingTime: Date.now(),
    }));
  }

  public getAllDetectedEnemyIds(): string[] {
    const set = new Set<string>();
    this.motionSensors.forEach(s => {
      s.detectedBotIds.forEach(id => set.add(id));
    });
    return Array.from(set);
  }

  public destroy() {
    this.projectiles.forEach(p => this.scene.remove(p.mesh));
    this.projectiles = [];
    this.smokeClouds.forEach(c => this.scene.remove(c.meshGroup));
    this.smokeClouds = [];
    this.motionSensors.forEach(s => this.scene.remove(s.mesh));
    this.motionSensors = [];
  }
}
