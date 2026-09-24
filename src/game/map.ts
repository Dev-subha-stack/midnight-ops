import * as THREE from 'three';
import { TextureGenerator } from './textures';
import { DestructionManager } from './destruction';
import { ParticleSystem } from './particles';
import { MapType } from '../types';
import { BermudaMapBuilder } from './bermuda_builder';
import { OutpostMapBuilder } from './outpost_builder';

export interface MapObstacle {
  id?: string;
  mesh: THREE.Mesh | THREE.Group;
  box: THREE.Box3;
  pos?: THREE.Vector3;
  size?: THREE.Vector3;
  rot?: number;
  isExplosive?: boolean;
  isDestructible?: boolean;
  health?: number;
  maxHealth?: number;
}

export interface MapSpawnPoint {
  position: THREE.Vector3;
  team: 'allies' | 'axis' | 'neutral';
}

export interface TacticalCoverPoint {
  id: string;
  position: THREE.Vector3;
  crouchPos: THREE.Vector3;
  peekPos: THREE.Vector3;
  facingDir: THREE.Vector3;
  obstacleId: string;
  isAvailable: boolean;
  type?: 'high' | 'low';
  leanSide?: 'left' | 'right' | 'none';
}

export class TacticalMap {
  public scene: THREE.Scene;
  public particles: ParticleSystem;
  public destruction: DestructionManager;
  public obstacles: MapObstacle[] = [];
  public spawnPoints: MapSpawnPoint[] = [];
  public navNodes: THREE.Vector3[] = [];
  public flankWaypointsLeft: THREE.Vector3[] = [];
  public flankWaypointsRight: THREE.Vector3[] = [];
  public coverPoints: TacticalCoverPoint[] = [];
  public explosiveBarrels: MapObstacle[] = [];

  public groundMaterial?: THREE.MeshStandardMaterial;

  public mapType: MapType;

  constructor(scene: THREE.Scene, particles?: ParticleSystem, mapType: MapType = 'warehouse') {
    this.scene = scene;
    this.particles = particles || new ParticleSystem(scene);
    this.mapType = mapType;
    this.destruction = new DestructionManager(scene, this.particles);

    // Sync destruction updates with map obstacles & cover points
    this.destruction.onCoverModified = (prop) => {
      const obsIdx = this.obstacles.findIndex(o => o.id === prop.id);
      if (obsIdx !== -1) {
        if (prop.isDestroyed) {
          this.obstacles.splice(obsIdx, 1);
        } else {
          this.obstacles[obsIdx].box = prop.box;
        }
      }
      // Invalidate cover points associated with destroyed prop
      if (prop.isDestroyed) {
        this.coverPoints.forEach(cp => {
          if (cp.obstacleId === prop.id) {
            cp.isAvailable = false;
          }
        });
      }
    };

    if (this.mapType === 'bermuda') {
      this.groundMaterial = BermudaMapBuilder.build(
        this.scene,
        this.obstacles,
        this.spawnPoints,
        this.navNodes,
        this.flankWaypointsLeft,
        this.flankWaypointsRight,
        this.coverPoints,
        this.explosiveBarrels,
        this.particles,
        this.destruction
      );
    } else if (this.mapType === 'outpost') {
      this.groundMaterial = OutpostMapBuilder.build(
        this.scene,
        this.obstacles,
        this.spawnPoints,
        this.navNodes,
        this.flankWaypointsLeft,
        this.flankWaypointsRight,
        this.coverPoints,
        this.explosiveBarrels,
        this.particles,
        this.destruction
      );
    } else {
      this.buildMap();
    }
  }

  private buildMap() {
    this.buildGroundAndPerimeter();
    this.buildShippingContainers();
    this.buildCentralCatwalkAndWarehouse();
    this.buildDestructibleCoverAndCrates();
    this.buildExplosiveBarrels();
    this.buildSandbagEmplacements();
    this.buildIndustrialGenerators();
    this.buildMunitionsAndPallets();
    this.buildPerimeterFloodlightTowers();
    this.buildRadarArray();
    this.buildNavNodesAndSpawns();
  }

  // --- GROUND & PERIMETER WALLS ---
  private buildGroundAndPerimeter() {
    const asphaltTex = TextureGenerator.createAsphaltTexture();
    asphaltTex.repeat.set(12, 12);

    const groundGeo = new THREE.PlaneGeometry(100, 100);
    this.groundMaterial = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.8,
      metalness: 0.15,
    });
    const ground = new THREE.Mesh(groundGeo, this.groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const concreteTex = TextureGenerator.createConcreteTexture();
    concreteTex.repeat.set(6, 2);
    const wallMat = new THREE.MeshStandardMaterial({
      map: concreteTex,
      roughness: 0.9,
    });

    const wallHeight = 7;
    const wallThickness = 1.5;
    const mapSize = 90;

    const walls = [
      { id: 'wall_north', size: [mapSize, wallHeight, wallThickness], pos: [0, wallHeight / 2, -mapSize / 2] },
      { id: 'wall_south', size: [mapSize, wallHeight, wallThickness], pos: [0, wallHeight / 2, mapSize / 2] },
      { id: 'wall_west', size: [wallThickness, wallHeight, mapSize], pos: [-mapSize / 2, wallHeight / 2, 0] },
      { id: 'wall_east', size: [wallThickness, wallHeight, mapSize], pos: [mapSize / 2, wallHeight / 2, 0] },
    ];

    walls.forEach(w => {
      const geo = new THREE.BoxGeometry(w.size[0], w.size[1], w.size[2]);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(w.pos[0], w.pos[1], w.pos[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const box = new THREE.Box3().setFromObject(mesh);
      this.obstacles.push({
        id: w.id,
        mesh,
        box,
        pos: new THREE.Vector3(w.pos[0], w.pos[1], w.pos[2]),
        size: new THREE.Vector3(w.size[0], w.size[1], w.size[2]),
        rot: 0,
      });
    });
  }

  // --- SHIPPING CONTAINERS (CARGO YARD) ---
  private buildShippingContainers() {
    const containerConfigs = [
      // Cargo Stack Alpha
      { id: 'cont_1', pos: [-18, 1.4, -18], rot: 0, color: '#1e3a8a', label: 'MIL-OPS 01' },
      { id: 'cont_2', pos: [-18, 4.2, -18], rot: 0.05, color: '#991b1b', label: 'HAZMAT 7A' },
      { id: 'cont_3', pos: [-18, 1.4, -25], rot: 0, color: '#14532d', label: 'LOG-TAC 99' },
      { id: 'cont_4', pos: [-10, 1.4, -20], rot: Math.PI / 2, color: '#713f12', label: 'ORDNANCE' },

      // Cargo Stack Bravo (South-East)
      { id: 'cont_5', pos: [20, 1.4, 18], rot: 0, color: '#155e75', label: 'US-MC 44' },
      { id: 'cont_6', pos: [20, 4.2, 18], rot: 0, color: '#854d0e', label: 'SUPPLY 12' },
      { id: 'cont_7', pos: [20, 1.4, 25], rot: 0, color: '#1e293b', label: 'TAC-CORP' },
      { id: 'cont_8', pos: [12, 1.4, 20], rot: Math.PI / 2, color: '#991b1b', label: 'DANGER 08' },

      // Center Lane Containers
      { id: 'cont_9', pos: [-24, 1.4, 10], rot: -0.2, color: '#1e3a8a', label: 'DEPOT-X' },
      { id: 'cont_10', pos: [24, 1.4, -12], rot: 0.3, color: '#14532d', label: 'BASE-88' },
      { id: 'cont_11', pos: [-4, 1.4, 28], rot: 0.1, color: '#713f12', label: 'CARGO-05' },
      { id: 'cont_12', pos: [6, 1.4, -28], rot: -0.15, color: '#155e75', label: 'ALPHA-9' },
    ];

    containerConfigs.forEach(cfg => {
      const tex = TextureGenerator.createContainerTexture(cfg.color, cfg.label);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.6,
        metalness: 0.4,
        side: THREE.DoubleSide,
      });

      const length = 12;
      const width = 4.8;
      const height = 2.8;

      const geo = new THREE.BoxGeometry(width, height, length);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      mesh.rotation.y = cfg.rot;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);

      const box = new THREE.Box3().setFromObject(mesh);
      this.obstacles.push({
        id: cfg.id,
        mesh,
        box,
        pos: new THREE.Vector3(cfg.pos[0], cfg.pos[1], cfg.pos[2]),
        size: new THREE.Vector3(width, height, length),
        rot: cfg.rot,
      });
    });
  }

  // --- CENTRAL WAREHOUSE & ELEVATED CATWALK ---
  private buildCentralCatwalkAndWarehouse() {
    const metalMat = new THREE.MeshStandardMaterial({
      map: TextureGenerator.createMetalGratingTexture(),
      roughness: 0.5,
      metalness: 0.8,
      side: THREE.DoubleSide,
    });

    const steelColumnMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.9,
      side: THREE.DoubleSide,
    });

    // Elevated Platform Center (3.8m elevation)
    const platformGeo = new THREE.BoxGeometry(16, 0.4, 14);
    const platform = new THREE.Mesh(platformGeo, metalMat);
    platform.position.set(0, 3.8, 0);
    platform.castShadow = true;
    platform.receiveShadow = true;
    this.scene.add(platform);

    const platBox = new THREE.Box3().setFromObject(platform);
    this.obstacles.push({
      id: 'catwalk_plat',
      mesh: platform,
      box: platBox,
      pos: new THREE.Vector3(0, 3.8, 0),
      size: new THREE.Vector3(16, 0.4, 14),
      rot: 0,
    });

    // Support pillars
    const pillarCoords = [
      [-7, 1.9, -6],
      [7, 1.9, -6],
      [-7, 1.9, 6],
      [7, 1.9, 6],
    ];

    pillarCoords.forEach((pos, idx) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.8, 0.6), steelColumnMat);
      pillar.position.set(pos[0], pos[1], pos[2]);
      pillar.castShadow = true;
      this.scene.add(pillar);
      this.obstacles.push({
        id: `pillar_${idx}`,
        mesh: pillar,
        box: new THREE.Box3().setFromObject(pillar),
        pos: new THREE.Vector3(pos[0], pos[1], pos[2]),
        size: new THREE.Vector3(0.6, 3.8, 0.6),
        rot: 0,
      });
    });

    // Ramps leading up to platform
    const rampNorthGeo = new THREE.BoxGeometry(4, 0.3, 10);
    const rampNorth = new THREE.Mesh(rampNorthGeo, metalMat);
    rampNorth.position.set(0, 1.9, -10.5);
    rampNorth.rotation.x = 0.4;
    rampNorth.castShadow = true;
    rampNorth.receiveShadow = true;
    this.scene.add(rampNorth);
    this.obstacles.push({
      id: 'ramp_n',
      mesh: rampNorth,
      box: new THREE.Box3().setFromObject(rampNorth),
      pos: new THREE.Vector3(0, 1.9, -10.5),
      size: new THREE.Vector3(4, 0.3, 10),
      rot: 0,
    });

    const rampSouth = rampNorth.clone();
    rampSouth.position.set(0, 1.9, 10.5);
    rampSouth.rotation.x = -0.4;
    this.scene.add(rampSouth);
    this.obstacles.push({
      id: 'ramp_s',
      mesh: rampSouth,
      box: new THREE.Box3().setFromObject(rampSouth),
      pos: new THREE.Vector3(0, 1.9, 10.5),
      size: new THREE.Vector3(4, 0.3, 10),
      rot: 0,
    });

    // Safety Railings around platform
    const railingMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.7, side: THREE.DoubleSide });
    const railWest = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 14), railingMat);
    railWest.position.set(-7.9, 4.5, 0);
    const railEast = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 14), railingMat);
    railEast.position.set(7.9, 4.5, 0);
    this.scene.add(railWest, railEast);
    this.obstacles.push(
      {
        id: 'rail_w',
        mesh: railWest,
        box: new THREE.Box3().setFromObject(railWest),
        pos: new THREE.Vector3(-7.9, 4.5, 0),
        size: new THREE.Vector3(0.15, 1.1, 14),
        rot: 0,
      },
      {
        id: 'rail_e',
        mesh: railEast,
        box: new THREE.Box3().setFromObject(railEast),
        pos: new THREE.Vector3(7.9, 4.5, 0),
        size: new THREE.Vector3(0.15, 1.1, 14),
        rot: 0,
      }
    );
  }

  // --- DESTRUCTIBLE TACTICAL COVER & SUPPLY CRATES ---
  private buildDestructibleCoverAndCrates() {
    const coverConfigs = [
      // North approach barriers
      { id: 'barr_n1', pos: new THREE.Vector3(-6, 0.7, -14), size: [3.5, 1.4, 0.8] as [number, number, number], rot: 0.2 },
      { id: 'barr_n2', pos: new THREE.Vector3(8, 0.7, -14), size: [4, 1.4, 0.8] as [number, number, number], rot: -0.3 },

      // South approach barriers
      { id: 'barr_s1', pos: new THREE.Vector3(-7, 0.7, 14), size: [4, 1.4, 0.8] as [number, number, number], rot: -0.15 },
      { id: 'barr_s2', pos: new THREE.Vector3(6, 0.7, 15), size: [3.5, 1.4, 0.8] as [number, number, number], rot: 0.25 },

      // West & East flanks
      { id: 'barr_w1', pos: new THREE.Vector3(-32, 0.7, -5), size: [4.5, 1.4, 0.8] as [number, number, number], rot: Math.PI / 2 },
      { id: 'barr_w2', pos: new THREE.Vector3(-30, 0.7, 12), size: [4.5, 1.4, 0.8] as [number, number, number], rot: Math.PI / 2 + 0.2 },
      { id: 'barr_e1', pos: new THREE.Vector3(32, 0.7, 5), size: [4.5, 1.4, 0.8] as [number, number, number], rot: Math.PI / 2 },
      { id: 'barr_e2', pos: new THREE.Vector3(28, 0.7, -8), size: [4.5, 1.4, 0.8] as [number, number, number], rot: Math.PI / 2 - 0.2 },

      // Catwalk upper cover
      { id: 'barr_top1', pos: new THREE.Vector3(-4, 4.4, 0), size: [2.5, 1.0, 0.6] as [number, number, number], rot: 0 },
      { id: 'barr_top2', pos: new THREE.Vector3(4, 4.4, 0), size: [2.5, 1.0, 0.6] as [number, number, number], rot: 0 },
    ];

    coverConfigs.forEach(c => {
      const prop = this.destruction.createConcreteBarrier(c.id, c.pos, c.size, c.rot);
      this.obstacles.push({
        id: c.id,
        mesh: prop.mesh,
        box: prop.box,
        pos: c.pos.clone(),
        size: new THREE.Vector3(c.size[0], c.size[1], c.size[2]),
        rot: c.rot,
        isDestructible: true,
        health: prop.health,
        maxHealth: prop.maxHealth,
      });

      // Register AI tactical cover points behind the barrier
      const offsetBack = new THREE.Vector3(0, 0, 1.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), c.rot);
      const cpPos = c.pos.clone().add(offsetBack);
      this.coverPoints.push({
        id: `cp_${c.id}`,
        position: cpPos,
        crouchPos: cpPos.clone().setY(c.pos.y - 0.4),
        peekPos: cpPos.clone().setY(c.pos.y + 0.8),
        facingDir: new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), c.rot),
        obstacleId: c.id,
        isAvailable: true,
      });
    });

    // Destructible Wooden Ordnance Crates in tactical alleyways
    const crateConfigs = [
      { id: 'crate_1', pos: new THREE.Vector3(-14, 0.8, -6), size: 1.6, rot: 0.1 },
      { id: 'crate_2', pos: new THREE.Vector3(-14, 0.8, -4.2), size: 1.6, rot: -0.2 },
      { id: 'crate_3', pos: new THREE.Vector3(16, 0.8, 6), size: 1.6, rot: 0.3 },
      { id: 'crate_4', pos: new THREE.Vector3(16, 0.8, 4.2), size: 1.6, rot: -0.1 },
      { id: 'crate_5', pos: new THREE.Vector3(0, 0.8, -20), size: 1.6, rot: 0.4 },
      { id: 'crate_6', pos: new THREE.Vector3(0, 0.8, 20), size: 1.6, rot: -0.3 },
    ];

    crateConfigs.forEach(c => {
      const prop = this.destruction.createWoodenCrate(c.id, c.pos, c.size, c.rot);
      this.obstacles.push({
        id: c.id,
        mesh: prop.mesh,
        box: prop.box,
        pos: c.pos.clone(),
        size: new THREE.Vector3(c.size, c.size, c.size),
        rot: c.rot,
        isDestructible: true,
        health: prop.health,
        maxHealth: prop.maxHealth,
      });
    });
  }

  // --- EXPLOSIVE BARRELS ---
  private buildExplosiveBarrels() {
    const barrelPositions = [
      { id: 'barrel_1', pos: new THREE.Vector3(-14, 0.8, -12) },
      { id: 'barrel_2', pos: new THREE.Vector3(-12, 0.8, -13) },
      { id: 'barrel_3', pos: new THREE.Vector3(15, 0.8, 14) },
      { id: 'barrel_4', pos: new THREE.Vector3(14, 0.8, 12.5) },
      { id: 'barrel_5', pos: new THREE.Vector3(-26, 0.8, 4) },
      { id: 'barrel_6', pos: new THREE.Vector3(27, 0.8, -4) },
      { id: 'barrel_7', pos: new THREE.Vector3(0, 4.4, 4) },
    ];

    barrelPositions.forEach(b => {
      const prop = this.destruction.createExplosiveBarrel(b.id, b.pos);
      const obs: MapObstacle = {
        id: b.id,
        mesh: prop.mesh,
        box: prop.box,
        pos: b.pos.clone(),
        size: new THREE.Vector3(0.88, 1.5, 0.88),
        rot: 0,
        isExplosive: true,
        isDestructible: true,
        health: prop.health,
        maxHealth: prop.maxHealth,
      };
      this.obstacles.push(obs);
      this.explosiveBarrels.push(obs);
    });
  }

  // --- MILITARY SANDBAG EMPLACEMENTS ---
  private buildSandbagEmplacements() {
    const sandbagSpots = [
      { id: 'sb_nw', pos: new THREE.Vector3(-8, 0, -7), rot: 0.35 },
      { id: 'sb_ne', pos: new THREE.Vector3(8, 0, -7), rot: -0.35 },
      { id: 'sb_sw', pos: new THREE.Vector3(-8, 0, 7), rot: -0.35 },
      { id: 'sb_se', pos: new THREE.Vector3(8, 0, 7), rot: 0.35 },
      { id: 'sb_w_flank', pos: new THREE.Vector3(-22, 0, 0), rot: Math.PI / 2 },
      { id: 'sb_e_flank', pos: new THREE.Vector3(22, 0, 0), rot: Math.PI / 2 },
    ];

    sandbagSpots.forEach(spot => {
      const prop = this.destruction.createSandbagBarrier(spot.id, spot.pos, spot.rot);
      this.obstacles.push({
        id: spot.id,
        mesh: prop.mesh,
        box: prop.box,
        pos: spot.pos.clone(),
        size: new THREE.Vector3(3.6, 0.9, 0.6),
        rot: spot.rot,
        isDestructible: true,
        health: prop.health,
        maxHealth: prop.maxHealth,
      });

      // Register tactical cover point
      const offsetBack = new THREE.Vector3(0, 0, 0.9).applyAxisAngle(new THREE.Vector3(0, 1, 0), spot.rot);
      const cpPos = spot.pos.clone().add(offsetBack).setY(0);
      this.coverPoints.push({
        id: `cp_${spot.id}`,
        position: cpPos,
        crouchPos: cpPos.clone().setY(0.4),
        peekPos: cpPos.clone().setY(1.4),
        facingDir: new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), spot.rot),
        obstacleId: spot.id,
        isAvailable: true,
      });
    });

    // Add Cinderblock Barricades at central bottleneck
    const cinderSpots = [
      { id: 'cinder_1', pos: new THREE.Vector3(-4, 0.75, 0), rot: 0 },
      { id: 'cinder_2', pos: new THREE.Vector3(4, 0.75, 0), rot: 0 },
    ];
    cinderSpots.forEach(c => {
      const prop = this.destruction.createCinderblockWall(c.id, c.pos, [3.2, 1.5, 0.5], c.rot);
      this.obstacles.push({
        id: c.id,
        mesh: prop.mesh,
        box: prop.box,
        pos: c.pos.clone(),
        size: new THREE.Vector3(3.2, 1.5, 0.5),
        rot: c.rot,
        isDestructible: true,
        health: prop.health,
        maxHealth: prop.maxHealth,
      });
    });
  }

  // --- HEAVY INDUSTRIAL GENERATORS & POWER SUBSTATIONS ---
  private buildIndustrialGenerators() {
    const genBodyMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Industrial safety amber
      roughness: 0.4,
      metalness: 0.6,
    });
    const genDarkMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.8,
    });
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });

    const genLocations = [
      { id: 'gen_alpha', pos: new THREE.Vector3(-28, 1.3, -20), rot: 0.2 },
      { id: 'gen_bravo', pos: new THREE.Vector3(28, 1.3, 20), rot: -0.2 },
    ];

    genLocations.forEach(loc => {
      const group = new THREE.Group();
      group.position.copy(loc.pos);
      group.rotation.y = loc.rot;

      // Main Generator Housing
      const mainHousing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 4.2), genBodyMat);
      mainHousing.castShadow = true;
      mainHousing.receiveShadow = true;
      group.add(mainHousing);

      // Vent Grill on side
      const vent = new THREE.Mesh(new THREE.BoxGeometry(2.44, 1.2, 2.0), genDarkMat);
      vent.position.set(0, 0.2, 0.5);
      group.add(vent);

      // Top Exhaust Stacks
      const exhaustGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.8, 12);
      const exhaust1 = new THREE.Mesh(exhaustGeo, genDarkMat);
      exhaust1.position.set(-0.6, 1.4, -1.2);
      const exhaust2 = new THREE.Mesh(exhaustGeo, genDarkMat);
      exhaust2.position.set(0.6, 1.4, -1.2);
      group.add(exhaust1, exhaust2);

      // Electrical Status Control Panel
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.1), genDarkMat);
      panel.position.set(0, 0.3, 2.12);
      const led1 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), ledMat);
      led1.position.set(-0.2, 0.4, 2.18);
      const led2 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      led2.position.set(0.2, 0.4, 2.18);
      group.add(panel, led1, led2);

      this.scene.add(group);
      const box = new THREE.Box3().setFromObject(group);
      this.obstacles.push({
        id: loc.id,
        mesh: group,
        box,
        pos: loc.pos.clone(),
        size: new THREE.Vector3(2.4, 2.6, 4.2),
        rot: loc.rot,
      });
    });
  }

  // --- MUNITIONS PALLETS, AMMO CRATES & PROPANE TANKS ---
  private buildMunitionsAndPallets() {
    // 1. Destructible Wooden Pallet stacks
    const palletSpots = [
      { id: 'pal_1', pos: new THREE.Vector3(-10, 0, 22), rot: 0.4 },
      { id: 'pal_2', pos: new THREE.Vector3(12, 0, -22), rot: -0.5 },
      { id: 'pal_3', pos: new THREE.Vector3(-22, 0, -12), rot: 0.1 },
      { id: 'pal_4', pos: new THREE.Vector3(22, 0, 12), rot: 0.7 },
    ];
    palletSpots.forEach(spot => {
      const prop = this.destruction.createWoodenPallet(spot.id, spot.pos, spot.rot);
      this.obstacles.push({
        id: spot.id,
        mesh: prop.mesh,
        box: prop.box,
        pos: spot.pos.clone(),
        size: new THREE.Vector3(1.6, 0.7, 1.4),
        rot: spot.rot,
        isDestructible: true,
        health: prop.health,
        maxHealth: prop.maxHealth,
      });
    });

    // 2. Destructible Military Ammo Crates
    const ammoSpots = [
      { id: 'ammo_1', pos: new THREE.Vector3(-11.5, 0, 21.2), rot: -0.2 },
      { id: 'ammo_2', pos: new THREE.Vector3(13.5, 0, -21), rot: 0.3 },
      { id: 'ammo_3', pos: new THREE.Vector3(0, 0, 8), rot: 0 },
      { id: 'ammo_4', pos: new THREE.Vector3(0, 0, -8), rot: Math.PI },
    ];
    ammoSpots.forEach(spot => {
      const prop = this.destruction.createAmmoCrate(spot.id, spot.pos, spot.rot);
      this.obstacles.push({
        id: spot.id,
        mesh: prop.mesh,
        box: prop.box,
        pos: spot.pos.clone(),
        size: new THREE.Vector3(1.4, 0.8, 0.9),
        rot: spot.rot,
        isDestructible: true,
        health: prop.health,
        maxHealth: prop.maxHealth,
      });
    });

    // 3. Destructible High-Pressure Propane Tanks
    const propaneSpots = [
      { id: 'propane_1', pos: new THREE.Vector3(-25, 0, 18), rot: 0 },
      { id: 'propane_2', pos: new THREE.Vector3(25, 0, -18), rot: 0.8 },
      { id: 'propane_3', pos: new THREE.Vector3(-6, 3.8, -6), rot: -0.4 },
      { id: 'propane_4', pos: new THREE.Vector3(6, 3.8, 6), rot: 0.4 },
    ];
    propaneSpots.forEach(spot => {
      const prop = this.destruction.createPropaneTank(spot.id, spot.pos, spot.rot);
      const obs: MapObstacle = {
        id: spot.id,
        mesh: prop.mesh,
        box: prop.box,
        pos: spot.pos.clone(),
        size: new THREE.Vector3(0.8, 1.4, 0.8),
        rot: spot.rot,
        isExplosive: true,
        isDestructible: true,
        health: prop.health,
        maxHealth: prop.maxHealth,
      };
      this.obstacles.push(obs);
      this.explosiveBarrels.push(obs);
    });
  }

  // --- PERIMETER FLOODLIGHT TOWERS ---
  private buildPerimeterFloodlightTowers() {
    const towerSteelMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.5,
      metalness: 0.8,
    });
    const lightFixtureMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.7,
    });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    const towerPositions = [
      new THREE.Vector3(-38, 0, -38),
      new THREE.Vector3(38, 0, -38),
      new THREE.Vector3(-38, 0, 38),
      new THREE.Vector3(38, 0, 38),
    ];

    towerPositions.forEach((pos, idx) => {
      const group = new THREE.Group();
      group.position.copy(pos);

      // 4 Leg Truss Tower Mast (9m tall)
      const height = 9.0;
      const mastGeo = new THREE.BoxGeometry(0.8, height, 0.8);
      const mast = new THREE.Mesh(mastGeo, towerSteelMat);
      mast.position.y = height / 2;
      mast.castShadow = true;
      group.add(mast);

      // Top Platform & Light Head Bar
      const headBar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 0.8), towerSteelMat);
      headBar.position.y = height + 0.15;
      group.add(headBar);

      // Dual High-Power Halogen Lamps
      const lamp1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.5), lightFixtureMat);
      lamp1.position.set(-0.7, height - 0.2, 0);
      lamp1.rotation.x = 0.5; // Angled down toward battlefield
      const bulb1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), lampGlowMat);
      bulb1.position.set(-0.7, height - 0.25, 0.26);
      bulb1.rotation.x = 0.5;

      const lamp2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.5), lightFixtureMat);
      lamp2.position.set(0.7, height - 0.2, 0);
      lamp2.rotation.x = 0.5;
      const bulb2 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), lampGlowMat);
      bulb2.position.set(0.7, height - 0.25, 0.26);
      bulb2.rotation.x = 0.5;

      group.add(lamp1, bulb1, lamp2, bulb2);

      this.scene.add(group);
      const box = new THREE.Box3().setFromObject(group);
      this.obstacles.push({
        id: `tower_${idx}`,
        mesh: group,
        box,
        pos: pos.clone(),
        size: new THREE.Vector3(1.2, height + 0.5, 1.2),
        rot: 0,
      });
    });
  }

  // --- ROOFTOP RADAR & SATELLITE ARRAY ---
  private buildRadarArray() {
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.3,
      metalness: 0.6,
      side: THREE.DoubleSide,
    });
    const mountMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.8,
    });

    const radarGroup = new THREE.Group();
    radarGroup.position.set(0, 4.0, 0);

    // Tripod Base on Platform
    const tripod = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.4, 1.2, 8), mountMat);
    tripod.position.y = 0.6;
    radarGroup.add(tripod);

    // Parabolic Radar Dish
    const dishGeo = new THREE.SphereGeometry(1.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.5);
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(0, 1.5, 0);
    dish.rotation.x = -Math.PI / 3;
    dish.castShadow = true;
    radarGroup.add(dish);

    // Feed horn needle
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.0), mountMat);
    horn.position.set(0, 1.8, 0.6);
    horn.rotation.x = Math.PI / 3;
    radarGroup.add(horn);

    // Blinking red aviation warning beacon
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    beacon.position.set(0, 2.3, 0);
    radarGroup.add(beacon);

    this.scene.add(radarGroup);
    this.obstacles.push({
      id: 'radar_array',
      mesh: radarGroup,
      box: new THREE.Box3().setFromObject(radarGroup),
      pos: new THREE.Vector3(0, 4.0, 0),
      size: new THREE.Vector3(2.4, 2.5, 2.4),
      rot: 0,
    });
  }

  // --- SPAWN POINTS & AI WAYPOINT NAVIGATION GRAPH ---
  private buildNavNodesAndSpawns() {
    // Player / Allied Spawns (South base)
    this.spawnPoints.push(
      { position: new THREE.Vector3(0, 0, 36), team: 'allies' },
      { position: new THREE.Vector3(-15, 0, 32), team: 'allies' },
      { position: new THREE.Vector3(15, 0, 32), team: 'allies' }
    );

    // Enemy / Axis Spawns (North base)
    this.spawnPoints.push(
      { position: new THREE.Vector3(0, 0, -36), team: 'axis' },
      { position: new THREE.Vector3(-18, 0, -32), team: 'axis' },
      { position: new THREE.Vector3(18, 0, -32), team: 'axis' },
      { position: new THREE.Vector3(-30, 0, 0), team: 'axis' },
      { position: new THREE.Vector3(30, 0, 0), team: 'axis' }
    );

    // Flank Waypoints for AI Squad maneuvers
    this.flankWaypointsLeft = [
      new THREE.Vector3(-32, 0, -25),
      new THREE.Vector3(-36, 0, -10),
      new THREE.Vector3(-36, 0, 10),
      new THREE.Vector3(-30, 0, 25),
    ];

    this.flankWaypointsRight = [
      new THREE.Vector3(32, 0, -25),
      new THREE.Vector3(36, 0, -10),
      new THREE.Vector3(36, 0, 10),
      new THREE.Vector3(30, 0, 25),
    ];

    // Nav nodes across the map for bot tactical pathfinding
    const nodeCoords = [
      [0, 0, -30], [-15, 0, -25], [15, 0, -25],
      [-25, 0, -15], [-12, 0, -14], [12, 0, -14], [25, 0, -15],
      [-28, 0, 0], [-14, 0, 0], [0, 3.8, 0], [14, 0, 0], [28, 0, 0],
      [-25, 0, 15], [-12, 0, 14], [12, 0, 14], [25, 0, 15],
      [0, 0, 30], [-15, 0, 25], [15, 0, 25],
      [0, 0, -16], [0, 0, 16],
    ];

    nodeCoords.forEach(c => {
      this.navNodes.push(new THREE.Vector3(c[0], c[1], c[2]));
    });
  }

  public update(dt: number) {
    this.destruction.update(dt);
  }
}

