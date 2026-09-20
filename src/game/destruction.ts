import * as THREE from 'three';
import { DestructibleProp, DestructibleType, DestructionStage } from '../types';
import { ParticleSystem } from './particles';
import { soundManager } from './audio';
import { TextureGenerator } from './textures';

export interface DestructibleMeshItem {
  id: string;
  type: DestructibleType;
  mesh: THREE.Group | THREE.Mesh;
  box: THREE.Box3;
  health: number;
  maxHealth: number;
  stage: DestructionStage;
  isDestroyed: boolean;
  position: THREE.Vector3;
  subMeshes: THREE.Mesh[];
  onDestruction?: () => void;
}

export interface FlyingDebris {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotVelocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class DestructionManager {
  public scene: THREE.Scene;
  public particles: ParticleSystem;
  public props: DestructibleMeshItem[] = [];
  public debrisList: FlyingDebris[] = [];

  // Callback to inform Map and AI that cover layout has changed
  public onCoverModified: (prop: DestructibleMeshItem) => void = () => {};
  public onExplosionTriggered: (pos: THREE.Vector3, radius: number, damage: number, source: string) => void = () => {};

  constructor(scene: THREE.Scene, particles: ParticleSystem) {
    this.scene = scene;
    this.particles = particles;
  }

  // --- SPAWN DESTRUCTIBLE CONCRETE BARRIER ---
  public createConcreteBarrier(
    id: string,
    pos: THREE.Vector3,
    size: [number, number, number],
    rotY: number = 0
  ): DestructibleMeshItem {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.rotation.y = rotY;

    const concreteTex = TextureGenerator.createConcreteTexture();
    const concreteMat = new THREE.MeshStandardMaterial({
      map: concreteTex,
      roughness: 0.85,
      metalness: 0.1,
    });

    const [w, h, d] = size;
    const subMeshes: THREE.Mesh[] = [];

    // Create 3 vertical segments so sections can break off progressively
    const segmentCount = 3;
    const segWidth = w / segmentCount;

    for (let i = 0; i < segmentCount; i++) {
      const segGeo = new THREE.BoxGeometry(segWidth - 0.05, h, d);
      const segMesh = new THREE.Mesh(segGeo, concreteMat.clone());
      segMesh.position.set((i - (segmentCount - 1) / 2) * segWidth, 0, 0);
      segMesh.castShadow = true;
      segMesh.receiveShadow = true;
      segMesh.name = `${id}_seg_${i}`;
      group.add(segMesh);
      subMeshes.push(segMesh);
    }

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    const item: DestructibleMeshItem = {
      id,
      type: 'concrete_wall',
      mesh: group,
      box,
      health: 220,
      maxHealth: 220,
      stage: 'intact',
      isDestroyed: false,
      position: pos.clone(),
      subMeshes,
    };

    this.props.push(item);
    return item;
  }

  // --- SPAWN DESTRUCTIBLE WOODEN SUPPLY CRATE ---
  public createWoodenCrate(
    id: string,
    pos: THREE.Vector3,
    size: number = 1.6,
    rotY: number = 0
  ): DestructibleMeshItem {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.rotation.y = rotY;

    // Wood plank texture styling
    const woodCanvas = document.createElement('canvas');
    woodCanvas.width = 256;
    woodCanvas.height = 256;
    const ctx = woodCanvas.getContext('2d')!;
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#92400e';
    for (let y = 0; y < 256; y += 32) {
      ctx.fillRect(0, y, 256, 28);
    }
    // Stencil logo
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('ORDNANCE', 40, 135);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 248, 248);
    const woodTex = new THREE.CanvasTexture(woodCanvas);

    const woodMat = new THREE.MeshStandardMaterial({
      map: woodTex,
      roughness: 0.7,
      metalness: 0.1,
    });

    const crateGeo = new THREE.BoxGeometry(size, size, size);
    const crateMesh = new THREE.Mesh(crateGeo, woodMat);
    crateMesh.castShadow = true;
    crateMesh.receiveShadow = true;
    crateMesh.name = `${id}_mesh`;
    group.add(crateMesh);

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    const item: DestructibleMeshItem = {
      id,
      type: 'wooden_crate',
      mesh: group,
      box,
      health: 80,
      maxHealth: 80,
      stage: 'intact',
      isDestroyed: false,
      position: pos.clone(),
      subMeshes: [crateMesh],
    };

    this.props.push(item);
    return item;
  }

  // --- SPAWN DESTRUCTIBLE EXPLOSIVE FUEL BARREL ---
  public createExplosiveBarrel(
    id: string,
    pos: THREE.Vector3,
    rotY: number = 0
  ): DestructibleMeshItem {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.rotation.y = rotY;

    const barrelTex = TextureGenerator.createExplosiveBarrelTexture();
    const barrelMat = new THREE.MeshStandardMaterial({
      map: barrelTex,
      roughness: 0.4,
      metalness: 0.6,
    });

    const geo = new THREE.CylinderGeometry(0.44, 0.44, 1.5, 16);
    const mesh = new THREE.Mesh(geo, barrelMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `${id}_mesh`;
    group.add(mesh);

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    const item: DestructibleMeshItem = {
      id,
      type: 'explosive_barrel',
      mesh: group,
      box,
      health: 45,
      maxHealth: 45,
      stage: 'intact',
      isDestroyed: false,
      position: pos.clone(),
      subMeshes: [mesh],
    };

    this.props.push(item);
    return item;
  }

  // --- SPAWN DESTRUCTIBLE SANDBAG BARRIER ---
  public createSandbagBarrier(
    id: string,
    pos: THREE.Vector3,
    rotY: number = 0
  ): DestructibleMeshItem {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.rotation.y = rotY;

    const sandbagMat = new THREE.MeshStandardMaterial({
      color: 0x78716c,
      roughness: 0.95,
      metalness: 0.05,
    });
    const subMeshes: THREE.Mesh[] = [];

    // 3 stacked layers of individual sandbags
    const rows = 3;
    const cols = 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const bagGeo = new THREE.BoxGeometry(0.72, 0.28, 0.45);
        const bagMesh = new THREE.Mesh(bagGeo, sandbagMat);
        const offsetX = (c - (cols - 1) / 2) * 0.74 + (r % 2 ? 0.12 : -0.12);
        const offsetY = r * 0.28 + 0.14;
        bagMesh.position.set(offsetX, offsetY, 0);
        bagMesh.castShadow = true;
        bagMesh.receiveShadow = true;
        bagMesh.name = `${id}_bag_${r}_${c}`;
        group.add(bagMesh);
        subMeshes.push(bagMesh);
      }
    }

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    const item: DestructibleMeshItem = {
      id,
      type: 'sandbag_barrier',
      mesh: group,
      box,
      health: 180,
      maxHealth: 180,
      stage: 'intact',
      isDestroyed: false,
      position: pos.clone(),
      subMeshes,
    };

    this.props.push(item);
    return item;
  }

  // --- SPAWN DESTRUCTIBLE CINDERBLOCK WALL ---
  public createCinderblockWall(
    id: string,
    pos: THREE.Vector3,
    size: [number, number, number] = [3.6, 1.5, 0.6],
    rotY: number = 0
  ): DestructibleMeshItem {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.rotation.y = rotY;

    const concreteTex = TextureGenerator.createConcreteTexture();
    const blockMat = new THREE.MeshStandardMaterial({
      map: concreteTex,
      color: 0x94a3b8,
      roughness: 0.9,
      metalness: 0.1,
    });

    const [w, h, d] = size;
    const subMeshes: THREE.Mesh[] = [];
    const blockCols = 4;
    const blockRows = 3;
    const blockW = w / blockCols;
    const blockH = h / blockRows;

    for (let r = 0; r < blockRows; r++) {
      for (let c = 0; c < blockCols; c++) {
        const blockGeo = new THREE.BoxGeometry(blockW - 0.04, blockH - 0.03, d);
        const blockMesh = new THREE.Mesh(blockGeo, blockMat.clone());
        const bx = (c - (blockCols - 1) / 2) * blockW;
        const by = (r - (blockRows - 1) / 2) * blockH;
        blockMesh.position.set(bx, by, 0);
        blockMesh.castShadow = true;
        blockMesh.receiveShadow = true;
        blockMesh.name = `${id}_block_${r}_${c}`;
        group.add(blockMesh);
        subMeshes.push(blockMesh);
      }
    }

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    const item: DestructibleMeshItem = {
      id,
      type: 'cinderblock_wall',
      mesh: group,
      box,
      health: 260,
      maxHealth: 260,
      stage: 'intact',
      isDestroyed: false,
      position: pos.clone(),
      subMeshes,
    };

    this.props.push(item);
    return item;
  }

  // --- SPAWN DESTRUCTIBLE MILITARY AMMO CRATE ---
  public createAmmoCrate(
    id: string,
    pos: THREE.Vector3,
    rotY: number = 0
  ): DestructibleMeshItem {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.rotation.y = rotY;

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a2b, // Olive military green
      roughness: 0.5,
      metalness: 0.7,
    });
    const latchMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.9,
    });

    const chestGeo = new THREE.BoxGeometry(1.4, 0.8, 0.9);
    const chest = new THREE.Mesh(chestGeo, metalMat);
    chest.position.set(0, 0.4, 0);
    chest.castShadow = true;
    chest.receiveShadow = true;
    group.add(chest);

    // Stencil decal / latch
    const latchL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.05), latchMat);
    latchL.position.set(-0.35, 0.45, 0.46);
    const latchR = latchL.clone();
    latchR.position.x = 0.35;
    group.add(latchL, latchR);

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    const item: DestructibleMeshItem = {
      id,
      type: 'ammo_crate',
      mesh: group,
      box,
      health: 85,
      maxHealth: 85,
      stage: 'intact',
      isDestroyed: false,
      position: pos.clone(),
      subMeshes: [chest],
    };

    this.props.push(item);
    return item;
  }

  // --- SPAWN DESTRUCTIBLE PRESSURIZED PROPANE TANK ---
  public createPropaneTank(
    id: string,
    pos: THREE.Vector3,
    rotY: number = 0
  ): DestructibleMeshItem {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.rotation.y = rotY;

    const tankMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // Industrial white/silver tank
      roughness: 0.35,
      metalness: 0.75,
    });
    const valveMat = new THREE.MeshStandardMaterial({
      color: 0xef4444, // Hazard red valve
      roughness: 0.4,
      metalness: 0.8,
    });

    const tankGeo = new THREE.CylinderGeometry(0.38, 0.38, 1.2, 16);
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(0, 0.6, 0);
    tank.castShadow = true;
    tank.receiveShadow = true;
    group.add(tank);

    // Domed ends
    const domeTop = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), tankMat);
    domeTop.position.set(0, 1.2, 0);
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.18, 8), valveMat);
    valve.position.set(0, 1.4, 0);
    group.add(domeTop, valve);

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    const item: DestructibleMeshItem = {
      id,
      type: 'propane_tank',
      mesh: group,
      box,
      health: 35,
      maxHealth: 35,
      stage: 'intact',
      isDestroyed: false,
      position: pos.clone(),
      subMeshes: [tank],
    };

    this.props.push(item);
    return item;
  }

  // --- SPAWN DESTRUCTIBLE WOODEN PALLET STACK ---
  public createWoodenPallet(
    id: string,
    pos: THREE.Vector3,
    rotY: number = 0
  ): DestructibleMeshItem {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.rotation.y = rotY;

    const palletMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.85,
      metalness: 0.05,
    });

    const subMeshes: THREE.Mesh[] = [];
    for (let layer = 0; layer < 3; layer++) {
      const pGeo = new THREE.BoxGeometry(1.6, 0.18, 1.4);
      const pMesh = new THREE.Mesh(pGeo, palletMat);
      pMesh.position.set(0, layer * 0.22 + 0.1, 0);
      pMesh.castShadow = true;
      pMesh.receiveShadow = true;
      pMesh.name = `${id}_pallet_${layer}`;
      group.add(pMesh);
      subMeshes.push(pMesh);
    }

    this.scene.add(group);

    const box = new THREE.Box3().setFromObject(group);
    const item: DestructibleMeshItem = {
      id,
      type: 'wooden_pallet',
      mesh: group,
      box,
      health: 65,
      maxHealth: 65,
      stage: 'intact',
      isDestroyed: false,
      position: pos.clone(),
      subMeshes,
    };

    this.props.push(item);
    return item;
  }

  // --- APPLY DAMAGE TO PROP ---
  public damageProp(
    propId: string,
    damage: number,
    hitPoint?: THREE.Vector3,
    hitNormal?: THREE.Vector3,
    weaponType?: string
  ): boolean {
    const prop = this.props.find(p => p.id === propId);
    if (!prop || prop.isDestroyed) return false;

    const hp = hitPoint || prop.position.clone().add(new THREE.Vector3(0, 0.5, 0));
    const hn = hitNormal || new THREE.Vector3(0, 1, 0);

    prop.health = Math.max(0, prop.health - damage);
    const healthPct = prop.health / prop.maxHealth;

    // Visual & Particle Feedback
    if (prop.type === 'concrete_wall') {
      this.particles.emitImpactSparks(hp, hn);
      this.spawnConcreteChips(hp, hn, 4);

      // Fracture progression
      if (healthPct <= 0) {
        this.destroyProp(prop, hn);
        return true;
      } else if (healthPct < 0.4 && prop.stage !== 'critical') {
        prop.stage = 'critical';
        this.fractureConcreteSection(prop, 1);
        this.onCoverModified(prop);
      } else if (healthPct < 0.75 && prop.stage === 'intact') {
        prop.stage = 'damaged';
        this.fractureConcreteSection(prop, 0);
        this.onCoverModified(prop);
      }
    } else if (prop.type === 'cinderblock_wall') {
      this.particles.emitImpactSparks(hp, hn);
      this.spawnConcreteChips(hp, hn, 6);

      if (healthPct <= 0) {
        this.destroyProp(prop, hn);
        return true;
      } else if (healthPct < 0.35 && prop.stage !== 'critical') {
        prop.stage = 'critical';
        this.fractureCinderblockSection(prop, 2);
        this.onCoverModified(prop);
      } else if (healthPct < 0.7 && prop.stage === 'intact') {
        prop.stage = 'damaged';
        this.fractureCinderblockSection(prop, 1);
        this.onCoverModified(prop);
      }
    } else if (prop.type === 'sandbag_barrier') {
      this.spawnSandDust(hp, hn);
      if (healthPct <= 0) {
        this.destroyProp(prop, hn);
        return true;
      } else if (healthPct < 0.4 && prop.stage !== 'critical') {
        prop.stage = 'critical';
        this.crumbleSandbagSection(prop, 2);
        this.onCoverModified(prop);
      } else if (healthPct < 0.75 && prop.stage === 'intact') {
        prop.stage = 'damaged';
        this.crumbleSandbagSection(prop, 1);
        this.onCoverModified(prop);
      }
    } else if (prop.type === 'wooden_crate' || prop.type === 'wooden_pallet') {
      this.spawnWoodSplinters(hp, hn, 6);
      if (healthPct <= 0) {
        this.destroyProp(prop, hn);
        return true;
      } else if (healthPct < 0.5 && prop.stage === 'intact') {
        prop.stage = 'damaged';
        if (prop.subMeshes.length > 0) {
          prop.subMeshes[0].scale.set(0.95, 0.9, 0.95);
        }
      }
    } else if (prop.type === 'explosive_barrel') {
      // Leaking fiery sparks when damaged
      this.particles.emitImpactSparks(hp, hn);
      if (healthPct <= 0) {
        this.detonateBarrel(prop);
        return true;
      }
    } else if (prop.type === 'propane_tank') {
      // High pressure gas flame flare
      this.particles.emitImpactSparks(hp, hn);
      if (healthPct <= 0) {
        this.detonatePropaneTank(prop);
        return true;
      }
    } else if (prop.type === 'ammo_crate') {
      this.particles.emitImpactSparks(hp, hn);
      if (healthPct <= 0) {
        this.detonateAmmoCrate(prop);
        return true;
      }
    }

    return false;
  }

  // --- FRACTURE CINDERBLOCK WALL ---
  private fractureCinderblockSection(prop: DestructibleMeshItem, count: number) {
    for (let i = 0; i < count && i < prop.subMeshes.length; i++) {
      const seg = prop.subMeshes[i];
      if (seg && seg.visible) {
        seg.visible = false;
        const worldPos = new THREE.Vector3();
        seg.getWorldPosition(worldPos);
        this.spawnDebrisChunk(worldPos, 0.3, 0x94a3b8);
        this.spawnDebrisChunk(worldPos.add(new THREE.Vector3(0.1, 0.2, 0)), 0.2, 0x64748b);
      }
    }
    prop.box.setFromObject(prop.mesh);
  }

  // --- CRUMBLE SANDBAG LAYER ---
  private crumbleSandbagSection(prop: DestructibleMeshItem, layer: number) {
    const startIndex = (3 - layer) * 4;
    for (let i = startIndex; i < startIndex + 4 && i < prop.subMeshes.length; i++) {
      const bag = prop.subMeshes[i];
      if (bag && bag.visible) {
        bag.visible = false;
        const worldPos = new THREE.Vector3();
        bag.getWorldPosition(worldPos);
        this.spawnDebrisChunk(worldPos, 0.25, 0x78716c);
      }
    }
    prop.box.setFromObject(prop.mesh);
  }

  // --- SPAWN SAND DUST PARTICLES ---
  private spawnSandDust(pos: THREE.Vector3, normal: THREE.Vector3) {
    this.particles.emitImpactSparks(pos, normal);
    for (let i = 0; i < 3; i++) {
      this.spawnDebrisChunk(pos, 0.12, 0xd97706);
    }
  }

  // --- FRACTURE CONCRETE WALL SEGMENT ---
  private fractureConcreteSection(prop: DestructibleMeshItem, segmentIndex: number) {
    if (prop.subMeshes[segmentIndex]) {
      const seg = prop.subMeshes[segmentIndex];
      // Reduce height to simulate jagged crumbling
      seg.scale.y = 0.45;
      seg.position.y = -0.38;

      // Spawn tumbling concrete chunk debris
      const worldPos = new THREE.Vector3();
      seg.getWorldPosition(worldPos);
      this.spawnDebrisChunk(worldPos.add(new THREE.Vector3(0, 0.6, 0)), 0.35, 0x64748b);
      this.spawnDebrisChunk(worldPos.add(new THREE.Vector3(0.2, 0.4, 0.1)), 0.25, 0x475569);

      // Recompute bounding box
      prop.box.setFromObject(prop.mesh);
    }
  }

  // --- DESTROY PROP COMPLETELY ---
  public destroyProp(prop: DestructibleMeshItem, impactDir: THREE.Vector3) {
    if (prop.isDestroyed) return;
    prop.isDestroyed = true;
    prop.stage = 'destroyed';
    prop.health = 0;

    const pos = prop.position.clone();

    if (prop.type === 'concrete_wall' || prop.type === 'cinderblock_wall') {
      // Shatter entire barrier into physics rubble chunks
      for (let i = 0; i < 10; i++) {
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 2.5,
          Math.random() * 1.2 + 0.2,
          (Math.random() - 0.5) * 0.8
        );
        this.spawnDebrisChunk(pos.clone().add(offset), Math.random() * 0.3 + 0.2, 0x64748b);
      }
      this.particles.emitImpactSparks(pos.clone().add(new THREE.Vector3(0, 0.8, 0)), new THREE.Vector3(0, 1, 0));
    } else if (prop.type === 'sandbag_barrier') {
      // Collapse sandbags
      for (let i = 0; i < 8; i++) {
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 2.2,
          Math.random() * 0.6 + 0.1,
          (Math.random() - 0.5) * 0.8
        );
        this.spawnDebrisChunk(pos.clone().add(offset), 0.25, 0x78716c);
      }
      this.spawnSandDust(pos, new THREE.Vector3(0, 1, 0));
      soundManager.playSlide();
    } else if (prop.type === 'wooden_crate' || prop.type === 'wooden_pallet') {
      // Shatter wooden crate/pallet into wood planks
      for (let i = 0; i < 12; i++) {
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 1.4,
          Math.random() * 1.0 + 0.2,
          (Math.random() - 0.5) * 1.4
        );
        this.spawnWoodPlankDebris(pos.clone().add(offset));
      }
      soundManager.playSlide(); // splinter impact audio
    }

    // Collapse visual mesh to ground level rubble
    this.scene.remove(prop.mesh);

    // Create flat residual debris pile on floor so the area looks realistically scarred
    const rubbleGeo = new THREE.CylinderGeometry(1.2, 1.5, 0.12, 8);
    const rubbleColor = prop.type === 'wooden_crate' || prop.type === 'wooden_pallet' ? 0x78350f : prop.type === 'sandbag_barrier' ? 0x78716c : 0x475569;
    const rubbleMat = new THREE.MeshStandardMaterial({
      color: rubbleColor,
      roughness: 0.9,
    });
    const rubbleMesh = new THREE.Mesh(rubbleGeo, rubbleMat);
    rubbleMesh.position.set(pos.x, 0.06, pos.z);
    rubbleMesh.receiveShadow = true;
    this.scene.add(rubbleMesh);

    // Clear bounding box so bullets and pathfinding can pass freely
    prop.box.makeEmpty();
    this.onCoverModified(prop);
  }

  // --- DETONATE PRESSURIZED PROPANE TANK ---
  public detonatePropaneTank(prop: DestructibleMeshItem) {
    if (prop.isDestroyed) return;
    prop.isDestroyed = true;
    prop.stage = 'destroyed';
    prop.health = 0;

    const blastPos = prop.position.clone().add(new THREE.Vector3(0, 0.8, 0));

    // Audio & Massive Fireball Blast
    soundManager.playExplosion();
    this.particles.emitExplosion(blastPos);

    this.scene.remove(prop.mesh);

    // Flying White/Metallic Tank Shrapnel
    for (let i = 0; i < 8; i++) {
      this.spawnDebrisChunk(blastPos, 0.32, 0xf8fafc);
    }

    prop.box.makeEmpty();
    this.onCoverModified(prop);

    const blastRadius = 15.0;
    const blastDamage = 260;
    this.onExplosionTriggered(blastPos, blastRadius, blastDamage, 'propane_explosion');

    // Chain damage neighboring destructibles
    this.props.forEach(otherProp => {
      if (otherProp.id !== prop.id && !otherProp.isDestroyed) {
        const dist = otherProp.position.distanceTo(blastPos);
        if (dist <= blastRadius) {
          const falloff = 1 - dist / blastRadius;
          const dmg = Math.floor(blastDamage * falloff);
          const dir = new THREE.Vector3().subVectors(otherProp.position, blastPos).normalize();
          setTimeout(() => {
            this.damageProp(otherProp.id, dmg, otherProp.position, dir, 'propane_explosion');
          }, Math.random() * 100 + 30);
        }
      }
    });
  }

  // --- DETONATE MILITARY AMMO CRATE (SECONDARY COOK-OFF) ---
  public detonateAmmoCrate(prop: DestructibleMeshItem) {
    if (prop.isDestroyed) return;
    prop.isDestroyed = true;
    prop.stage = 'destroyed';
    prop.health = 0;

    const blastPos = prop.position.clone().add(new THREE.Vector3(0, 0.5, 0));

    soundManager.playExplosion();
    this.particles.emitExplosion(blastPos);
    this.particles.emitImpactSparks(blastPos, new THREE.Vector3(0, 1, 0));

    this.scene.remove(prop.mesh);

    for (let i = 0; i < 6; i++) {
      this.spawnDebrisChunk(blastPos, 0.22, 0x1e3a2b);
    }

    prop.box.makeEmpty();
    this.onCoverModified(prop);

    const blastRadius = 8.0;
    const blastDamage = 130;
    this.onExplosionTriggered(blastPos, blastRadius, blastDamage, 'ammo_crate_explosion');
  }

  // --- DETONATE EXPLOSIVE FUEL BARREL ---
  public detonateBarrel(prop: DestructibleMeshItem) {
    if (prop.isDestroyed) return;
    prop.isDestroyed = true;
    prop.stage = 'destroyed';
    prop.health = 0;

    const blastPos = prop.position.clone().add(new THREE.Vector3(0, 0.7, 0));

    // Audio & Big Fireball Particle system
    soundManager.playExplosion();
    this.particles.emitExplosion(blastPos);

    // Remove barrel mesh
    this.scene.remove(prop.mesh);

    // Spawn flying metallic shrapnel debris
    for (let i = 0; i < 6; i++) {
      this.spawnDebrisChunk(blastPos, 0.28, 0xef4444);
    }

    // Clear box
    prop.box.makeEmpty();
    this.onCoverModified(prop);

    // Blast damage & chain reactions within 12 meters
    const blastRadius = 12.0;
    const blastDamage = 220;

    // Trigger callback for bots, player, and other props
    this.onExplosionTriggered(blastPos, blastRadius, blastDamage, 'barrel_explosion');

    // Chain damage neighboring destructibles
    this.props.forEach(otherProp => {
      if (otherProp.id !== prop.id && !otherProp.isDestroyed) {
        const dist = otherProp.position.distanceTo(blastPos);
        if (dist <= blastRadius) {
          const falloff = 1 - dist / blastRadius;
          const dmg = Math.floor(blastDamage * falloff);
          const dir = new THREE.Vector3().subVectors(otherProp.position, blastPos).normalize();
          setTimeout(() => {
            this.damageProp(otherProp.id, dmg, otherProp.position, dir, 'barrel_explosion');
          }, Math.random() * 120 + 40); // slight delay for cascading wave
        }
      }
    });
  }

  // --- SPAWN PHYSICS-DRIVEN DEBRIS CHUNKS ---
  public spawnDebrisChunk(pos: THREE.Vector3, size: number, color: number) {
    const geo = new THREE.DodecahedronGeometry(size, 0);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.castShadow = true;
    this.scene.add(mesh);

    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 8,
      Math.random() * 6 + 3,
      (Math.random() - 0.5) * 8
    );
    const rotVel = new THREE.Vector3(
      Math.random() * 12 - 6,
      Math.random() * 12 - 6,
      Math.random() * 12 - 6
    );

    this.debrisList.push({
      mesh,
      velocity: vel,
      rotVelocity: rotVel,
      life: 4.0,
      maxLife: 4.0,
    });
  }

  public spawnWoodPlankDebris(pos: THREE.Vector3) {
    const geo = new THREE.BoxGeometry(0.12, 0.06, 0.6);
    const mat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    mesh.castShadow = true;
    this.scene.add(mesh);

    const vel = new THREE.Vector3(
      (Math.random() - 0.5) * 7,
      Math.random() * 5 + 2,
      (Math.random() - 0.5) * 7
    );
    const rotVel = new THREE.Vector3(Math.random() * 15, Math.random() * 15, Math.random() * 15);

    this.debrisList.push({
      mesh,
      velocity: vel,
      rotVelocity: rotVel,
      life: 3.5,
      maxLife: 3.5,
    });
  }

  public spawnConcreteChips(pos: THREE.Vector3, normal: THREE.Vector3, count: number = 4) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
      const mat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const vel = normal.clone().multiplyScalar(Math.random() * 3 + 2).add(new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 4
      ));

      this.debrisList.push({
        mesh,
        velocity: vel,
        rotVelocity: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
        life: 2.0,
        maxLife: 2.0,
      });
    }
  }

  public spawnWoodSplinters(pos: THREE.Vector3, normal: THREE.Vector3, count: number = 5) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BoxGeometry(0.04, 0.04, 0.25);
      const mat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const vel = normal.clone().multiplyScalar(Math.random() * 3 + 1.5).add(new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 3
      ));

      this.debrisList.push({
        mesh,
        velocity: vel,
        rotVelocity: new THREE.Vector3(Math.random() * 14, Math.random() * 14, Math.random() * 14),
        life: 2.0,
        maxLife: 2.0,
      });
    }
  }

  // --- FRAME UPDATE ---
  public update(dt: number) {
    // Update flying physics debris
    for (let i = this.debrisList.length - 1; i >= 0; i--) {
      const d = this.debrisList[i];
      d.life -= dt;
      if (d.life <= 0) {
        this.scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        (d.mesh.material as THREE.Material).dispose();
        this.debrisList.splice(i, 1);
        continue;
      }

      // Gravity & Drag
      d.velocity.y -= 14.0 * dt;
      d.mesh.position.addScaledVector(d.velocity, dt);

      d.mesh.rotation.x += d.rotVelocity.x * dt;
      d.mesh.rotation.y += d.rotVelocity.y * dt;
      d.mesh.rotation.z += d.rotVelocity.z * dt;

      // Floor bounce & friction
      if (d.mesh.position.y <= 0.05) {
        d.mesh.position.y = 0.05;
        d.velocity.y = -d.velocity.y * 0.3; // low bounce
        d.velocity.x *= 0.7;
        d.velocity.z *= 0.7;
        d.rotVelocity.multiplyScalar(0.7);
      }
    }
  }

  public getDestructibleMeshes(): THREE.Object3D[] {
    return this.props.filter(p => !p.isDestroyed).map(p => p.mesh);
  }

  public getPropByMesh(obj: THREE.Object3D): DestructibleMeshItem | undefined {
    return this.props.find(p => p.mesh === obj || p.subMeshes.includes(obj as THREE.Mesh) || p.mesh.getObjectById(obj.id));
  }
}
