import * as THREE from 'three';
import { PickupType, TacticalPickupItem } from '../types';
import { soundManager } from './audio';
import { ParticleSystem } from './particles';

export class PickupManager {
  private scene: THREE.Scene;
  private particles: ParticleSystem;
  public onPickup: (type: PickupType, value?: number) => void = () => {};
  private items: {
    id: string;
    type: PickupType;
    mesh: THREE.Group;
    light: THREE.PointLight;
    pos: THREE.Vector3;
    baseY: number;
    isAvailable: boolean;
    respawnTimer: number;
  }[] = [];

  constructor(scene: THREE.Scene, particles: ParticleSystem) {
    this.scene = scene;
    this.particles = particles;
    this.spawnDefaultPickups();
  }

  private spawnDefaultPickups() {
    const locations: { id: string; type: PickupType; pos: [number, number, number] }[] = [
      { id: 'pickup_ammo_1', type: 'ammo', pos: [-14, 0.6, -14] },
      { id: 'pickup_ammo_2', type: 'ammo', pos: [16, 0.6, 14] },
      { id: 'pickup_armor_1', type: 'armor', pos: [0, 0.6, 0] },
      { id: 'pickup_armor_2', type: 'armor', pos: [22, 0.6, -18] },
      { id: 'pickup_stim_1', type: 'stimpack', pos: [-20, 0.6, 18] },
      { id: 'pickup_stim_2', type: 'stimpack', pos: [6, 0.6, -24] },
    ];

    locations.forEach(loc => {
      this.createPickup(loc.id, loc.type, new THREE.Vector3(...loc.pos));
    });
  }

  private createPickup(id: string, type: PickupType, position: THREE.Vector3) {
    const group = new THREE.Group();
    group.position.copy(position);

    // Holographic Base Pad
    const baseGeo = new THREE.CylinderGeometry(0.55, 0.6, 0.1, 16);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.3,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -0.4;
    group.add(base);

    // Glowing ring on pad
    const ringColor = type === 'ammo' ? 0xf59e0b : type === 'armor' ? 0x06b6d4 : 0xef4444;
    const ringGeo = new THREE.TorusGeometry(0.45, 0.025, 8, 24);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: ringColor });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = -0.34;
    group.add(ring);

    // 3D Floating Pickup Item
    const itemGroup = new THREE.Group();
    itemGroup.name = 'floating_item';

    if (type === 'ammo') {
      // Olive tactical ammo can with stenciled rounds
      const boxMat = new THREE.MeshStandardMaterial({ color: 0x365314, metalness: 0.4, roughness: 0.6 });
      const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.18), boxMat);
      ammoBox.castShadow = true;
      itemGroup.add(ammoBox);

      // Yellow top latch
      const latch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.2), new THREE.MeshStandardMaterial({ color: 0xeab308 }));
      latch.position.y = 0.13;
      itemGroup.add(latch);
    } else if (type === 'armor') {
      // High-grade ceramic Kevlar armor plate
      const plateMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.3 });
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, 0.06), plateMat);
      plate.castShadow = true;
      itemGroup.add(plate);

      // Cyan carbon trim
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.07), new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
      trim.position.y = 0.08;
      itemGroup.add(trim);
    } else {
      // Medical Stimpack Syringe
      const barrelMat = new THREE.MeshPhysicalMaterial({ color: 0xef4444, roughness: 0.1, transmission: 0.7, opacity: 0.85, transparent: true });
      const syringe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.32, 12), barrelMat);
      syringe.castShadow = true;
      itemGroup.add(syringe);

      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
      cap.position.y = 0.2;
      itemGroup.add(cap);
    }

    group.add(itemGroup);

    // Glowing point light
    const light = new THREE.PointLight(ringColor, 1.2, 4);
    light.position.set(0, 0.2, 0);
    group.add(light);

    this.scene.add(group);

    this.items.push({
      id,
      type,
      mesh: group,
      light,
      pos: position.clone(),
      baseY: position.y,
      isAvailable: true,
      respawnTimer: 0,
    });
  }

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    onPickupCollected?: (type: PickupType) => void
  ) {
    const time = performance.now() * 0.002;

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const floatingGroup = item.mesh.getObjectByName('floating_item');

      if (!item.isAvailable) {
        item.respawnTimer -= dt;
        if (item.respawnTimer <= 0) {
          // Respawn item
          item.isAvailable = true;
          item.mesh.visible = true;
          item.light.intensity = 1.2;
        } else {
          // Faded cooldown state
          item.light.intensity = 0.1;
          continue;
        }
      }

      // Floating bobbing & rotation animation
      if (floatingGroup) {
        floatingGroup.rotation.y += 1.5 * dt;
        floatingGroup.position.y = Math.sin(time * 2 + i) * 0.08;
      }

      // Check proximity to player
      const dist = playerPos.distanceTo(item.pos);
      if (dist < 1.6 && item.isAvailable) {
        // Collect pickup!
        item.isAvailable = false;
        item.respawnTimer = 22.0; // 22 second respawn
        item.mesh.visible = false;
        item.light.intensity = 0;

        soundManager.playPickup(item.type);
        this.particles.emitSupplyPickup(item.pos, item.type === 'ammo' ? 0xf59e0b : item.type === 'armor' ? 0x06b6d4 : 0xef4444);

        if (onPickupCollected) {
          onPickupCollected(item.type);
        }
        if (this.onPickup) {
          this.onPickup(item.type);
        }
      }
    }
  }

  public getItemsData(): TacticalPickupItem[] {
    return this.items.map(it => ({
      id: it.id,
      type: it.type,
      position: { x: it.pos.x, y: it.pos.y, z: it.pos.z },
      isAvailable: it.isAvailable,
      cooldownTime: Math.max(0, it.respawnTimer),
    }));
  }

  public destroy() {
    this.items.forEach(it => {
      this.scene.remove(it.mesh);
    });
    this.items = [];
  }
}
