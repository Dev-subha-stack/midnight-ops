import * as THREE from 'three';
import { MapObstacle, MapSpawnPoint, TacticalCoverPoint } from './map';
import { TextureGenerator } from './textures';
import { ParticleSystem } from './particles';
import { DestructionManager } from './destruction';

// =========================================================================
// OUTPOST MAP BUILDER - "FOB SANDSTORM / DESERT OUTPOST"
// High-fidelity 100x100m military forward operating base in an arid desert basin.
// Features:
// - Central 2-Story Tactical Operations Center (TOC) with roof overwatch
// - Armored Motor Pool with tactical MRAP patrol vehicles and fuel depot
// - Fortified West Trench Line with sandbag revetments and dugout bunker
// - Hesco concertainer perimeter bastions & anti-vehicle dragon teeth
// - Communications Radar Array Mast & Perimeter Sniper Watchtowers
// - Full bot cover points with lean-peek offsets & environmental explosive barrels
// =========================================================================

export class OutpostMapBuilder {
  public static build(
    scene: THREE.Scene,
    obstacles: MapObstacle[],
    spawnPoints: MapSpawnPoint[],
    navNodes: THREE.Vector3[],
    flankLeft: THREE.Vector3[],
    flankRight: THREE.Vector3[],
    coverPoints: TacticalCoverPoint[],
    explosiveBarrels: MapObstacle[],
    particles: ParticleSystem,
    destruction: DestructionManager
  ): THREE.MeshStandardMaterial {
    const concreteTex = TextureGenerator.createConcreteTexture();
    const metalTex = TextureGenerator.createMetalGratingTexture();
    const crateTex = TextureGenerator.createConcreteTexture();
    const sandbagTex = TextureGenerator.createPlateCarrierTexture('tan');

    // 1. ARID DESERT GROUND (140x140m playable basin)
    const groundGeo = new THREE.PlaneGeometry(160, 160, 16, 16);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xc2a378, // Sunbaked desert sand & compacted gravel
      roughness: 0.88,
      metalness: 0.04,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    // Concrete Apron / Foundation for Compound Center (50x50m)
    const slabGeo = new THREE.PlaneGeometry(54, 54);
    const slabMat = new THREE.MeshStandardMaterial({
      map: concreteTex,
      color: 0x948876,
      roughness: 0.78,
      metalness: 0.12,
    });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.rotation.x = -Math.PI / 2;
    slab.position.set(0, 0.02, 0);
    slab.receiveShadow = true;
    scene.add(slab);

    // Common Materials
    const hescoMat = new THREE.MeshStandardMaterial({
      color: 0x927856, // Desert tan geotextile cloth
      roughness: 0.92,
      metalness: 0.05,
    });

    const sandbagMat = new THREE.MeshStandardMaterial({
      map: sandbagTex,
      color: 0xb59c78,
      roughness: 0.88,
      metalness: 0.04,
    });

    const bunkerMat = new THREE.MeshStandardMaterial({
      map: concreteTex,
      color: 0x857765, // Blast-hardened tan desert concrete
      roughness: 0.72,
      metalness: 0.18,
    });

    const camoNetMat = new THREE.MeshStandardMaterial({
      color: 0x786a4f,
      roughness: 0.95,
      metalness: 0.02,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });

    const vehicleMat = new THREE.MeshStandardMaterial({
      color: 0xa89371, // CARC Desert Tan Military Enamel
      roughness: 0.55,
      metalness: 0.35,
    });

    const steelMat = new THREE.MeshStandardMaterial({
      map: metalTex,
      color: 0x3f3f46,
      roughness: 0.45,
      metalness: 0.75,
    });

    const barrelMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Explosive red drum
      roughness: 0.38,
      metalness: 0.65,
    });

    // Helper: Add Obstacle & Register with Collisions
    const addObstacle = (
      mesh: THREE.Mesh | THREE.Group,
      size: THREE.Vector3,
      pos: THREE.Vector3,
      id?: string
    ) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      const box = new THREE.Box3();
      box.setFromCenterAndSize(pos, size);
      const obs: MapObstacle = {
        id: id || `obs_outpost_${obstacles.length}`,
        mesh,
        box,
        pos,
        size,
      };
      obstacles.push(obs);
      return obs;
    };

    // Helper: Add Cover Point with Lean Peeks
    const addCover = (
      pos: THREE.Vector3,
      facing: THREE.Vector3,
      obsId: string,
      type: 'high' | 'low' = 'low'
    ) => {
      const facingNorm = facing.clone().normalize();
      const rightNorm = new THREE.Vector3(-facingNorm.z, 0, facingNorm.x);
      coverPoints.push({
        id: `cp_outpost_${coverPoints.length}`,
        position: pos.clone(),
        crouchPos: pos.clone().add(new THREE.Vector3(0, -0.65, 0)),
        peekPos: pos.clone().add(rightNorm.clone().multiplyScalar(0.75)).add(new THREE.Vector3(0, 0.2, 0)),
        facingDir: facingNorm,
        obstacleId: obsId,
        isAvailable: true,
        type,
      });
    };

    // Helper: Create Hesco Concertainer Wall Section
    const createHescoBarrier = (
      x: number,
      z: number,
      width: number,
      height: number,
      depth: number,
      rotY: number = 0,
      id?: string
    ) => {
      const group = new THREE.Group();
      group.position.set(x, height / 2, z);
      group.rotation.y = rotY;

      // Outer geotextile box
      const geo = new THREE.BoxGeometry(width, height, depth);
      const mesh = new THREE.Mesh(geo, hescoMat);
      group.add(mesh);

      // Top wire mesh / dirt fill rim
      const rimGeo = new THREE.BoxGeometry(width * 0.96, 0.08, depth * 0.96);
      const rimMat = new THREE.MeshStandardMaterial({ color: 0x5c4d37, roughness: 0.95 });
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.position.y = height / 2 + 0.04;
      group.add(rim);

      const size = new THREE.Vector3(
        Math.abs(Math.cos(rotY)) * width + Math.abs(Math.sin(rotY)) * depth,
        height,
        Math.abs(Math.sin(rotY)) * width + Math.abs(Math.cos(rotY)) * depth
      );
      const obs = addObstacle(group, size, new THREE.Vector3(x, height / 2, z), id);

      // Add cover points on both sides of high barriers
      if (height >= 1.6) {
        const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
        addCover(new THREE.Vector3(x, 1.4, z).add(fwd.clone().multiplyScalar(depth / 2 + 0.5)), fwd, obs.id!, 'high');
        addCover(new THREE.Vector3(x, 1.4, z).sub(fwd.clone().multiplyScalar(depth / 2 + 0.5)), fwd.clone().negate(), obs.id!, 'high');
      }
      return obs;
    };

    // Helper: Create Sandbag Parapet Wall
    const createSandbagWall = (
      x: number,
      z: number,
      length: number,
      rotY: number = 0,
      id?: string
    ) => {
      const group = new THREE.Group();
      group.position.set(x, 0.55, z);
      group.rotation.y = rotY;

      const bagGeo = new THREE.BoxGeometry(length, 1.1, 0.7);
      const bagMesh = new THREE.Mesh(bagGeo, sandbagMat);
      group.add(bagMesh);

      // Top contour ridge
      const topGeo = new THREE.CylinderGeometry(0.32, 0.32, length, 8);
      const topMesh = new THREE.Mesh(topGeo, sandbagMat);
      topMesh.rotateZ(Math.PI / 2);
      topMesh.position.y = 0.55;
      group.add(topMesh);

      const size = new THREE.Vector3(
        Math.abs(Math.cos(rotY)) * length + Math.abs(Math.sin(rotY)) * 0.7,
        1.1,
        Math.abs(Math.sin(rotY)) * length + Math.abs(Math.cos(rotY)) * 0.7
      );
      const obs = addObstacle(group, size, new THREE.Vector3(x, 0.55, z), id);

      const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      addCover(new THREE.Vector3(x, 0.9, z).add(fwd.clone().multiplyScalar(0.7)), fwd, obs.id!, 'low');
      return obs;
    };

    // Helper: Create Red Explosive Barrel
    const createExplosiveDrum = (x: number, z: number, id?: string) => {
      const group = new THREE.Group();
      group.position.set(x, 0.6, z);

      const drumGeo = new THREE.CylinderGeometry(0.36, 0.36, 1.2, 14);
      const drumMesh = new THREE.Mesh(drumGeo, barrelMat);
      group.add(drumMesh);

      // Hazard warning stripe
      const stripeGeo = new THREE.CylinderGeometry(0.365, 0.365, 0.2, 14);
      const stripeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      group.add(stripe);

      const obs: MapObstacle = {
        id: id || `barrel_outpost_${explosiveBarrels.length}`,
        mesh: group,
        box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 0.6, z), new THREE.Vector3(0.8, 1.2, 0.8)),
        pos: new THREE.Vector3(x, 0.6, z),
        size: new THREE.Vector3(0.8, 1.2, 0.8),
        isExplosive: true,
        health: 50,
        maxHealth: 50,
      };
      scene.add(group);
      obstacles.push(obs);
      explosiveBarrels.push(obs);
      return obs;
    };

    // =====================================================================
    // 2. PERIMETER BLAST WALLS & CORNER WATCHTOWERS (44m boundary)
    // =====================================================================
    const perimDist = 42;
    // North Perimeter Wall with central breach opening
    createHescoBarrier(-23, -perimDist, 34, 2.8, 1.8, 0, 'perim_n_left');
    createHescoBarrier(23, -perimDist, 34, 2.8, 1.8, 0, 'perim_n_right');

    // South Perimeter Wall with Main Vehicle Gate opening
    createHescoBarrier(-23, perimDist, 34, 2.8, 1.8, 0, 'perim_s_left');
    createHescoBarrier(23, perimDist, 34, 2.8, 1.8, 0, 'perim_s_right');

    // West Perimeter (behind trenches)
    createHescoBarrier(-perimDist, 0, 84, 2.8, 1.8, Math.PI / 2, 'perim_w');

    // East Perimeter (behind motor pool)
    createHescoBarrier(perimDist, 0, 84, 2.8, 1.8, Math.PI / 2, 'perim_e');

    // Corner Sniper Watchtower Builder
    const createWatchtower = (x: number, z: number, id: string) => {
      const tower = new THREE.Group();
      tower.position.set(x, 0, z);

      // 4 Heavy Steel Legs
      for (const lx of [-2.2, 2.2]) {
        for (const lz of [-2.2, 2.2]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6.2, 8), steelMat);
          leg.position.set(lx, 3.1, lz);
          tower.add(leg);
        }
      }

      // X-Cross Bracing
      for (const angle of [0, Math.PI / 2]) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 0.08), steelMat);
        brace.rotation.y = angle;
        brace.rotation.z = 0.55;
        brace.position.set(0, 3.0, 0);
        tower.add(brace);
      }

      // Tower Platform
      const platGeo = new THREE.BoxGeometry(5.2, 0.35, 5.2);
      const platform = new THREE.Mesh(platGeo, concreteTex ? slabMat : steelMat);
      platform.position.set(0, 6.2, 0);
      tower.add(platform);

      // Sandbag Armor Parapet around platform
      const railN = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.1, 0.4), sandbagMat);
      railN.position.set(0, 6.9, -2.4);
      const railS = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.1, 0.4), sandbagMat);
      railS.position.set(0, 6.9, 2.4);
      const railW = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.1, 4.4), sandbagMat);
      railW.position.set(-2.4, 6.9, 0);
      const railE = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.1, 4.4), sandbagMat);
      railE.position.set(2.4, 6.9, 0);
      tower.add(railN, railS, railW, railE);

      // Tower Roof Canopy
      const roof = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.25, 5.8), steelMat);
      roof.position.set(0, 9.2, 0);
      tower.add(roof);

      // Roof Supports
      for (const lx of [-2.3, 2.3]) {
        for (const lz of [-2.3, 2.3]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6), steelMat);
          post.position.set(lx, 7.8, lz);
          tower.add(post);
        }
      }

      const obs = addObstacle(tower, new THREE.Vector3(5.6, 9.4, 5.6), new THREE.Vector3(x, 4.7, z), id);
      addCover(new THREE.Vector3(x, 7.1, z - 2.2), new THREE.Vector3(0, 0, -1), obs.id!, 'low');
      addCover(new THREE.Vector3(x, 7.1, z + 2.2), new THREE.Vector3(0, 0, 1), obs.id!, 'low');
    };

    createWatchtower(-36, -36, 'tower_nw');
    createWatchtower(36, 36, 'tower_se');

    // =====================================================================
    // 3. CENTRAL 2-STORY TACTICAL OPERATIONS CENTER (TOC - Bunker Complex)
    // Positioned at (x: 0, z: -2), 18m wide x 14m deep x 6.5m high
    // =====================================================================
    const tocGroup = new THREE.Group();
    tocGroup.position.set(0, 0, -2);

    // Ground Floor Concrete Blast Walls with Doorways
    // Front Wall (North) with double breach entrance
    const tocFrontL = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.4, 0.8), bunkerMat);
    tocFrontL.position.set(-5.5, 1.7, -6.6);
    const tocFrontR = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.4, 0.8), bunkerMat);
    tocFrontR.position.set(5.5, 1.7, -6.6);
    const tocFrontLintel = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.8, 0.8), bunkerMat);
    tocFrontLintel.position.set(0, 3.0, -6.6);
    tocGroup.add(tocFrontL, tocFrontR, tocFrontLintel);

    // Rear Wall (South) with service door
    const tocBackL = new THREE.Mesh(new THREE.BoxGeometry(7.0, 3.4, 0.8), bunkerMat);
    tocBackL.position.set(-5.2, 1.7, 6.6);
    const tocBackR = new THREE.Mesh(new THREE.BoxGeometry(7.0, 3.4, 0.8), bunkerMat);
    tocBackR.position.set(5.2, 1.7, 6.6);
    const tocBackLintel = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.8, 0.8), bunkerMat);
    tocBackLintel.position.set(0, 3.0, 6.6);
    tocGroup.add(tocBackL, tocBackR, tocBackLintel);

    // Side Walls (West & East)
    const tocSideW = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.4, 14.0), bunkerMat);
    tocSideW.position.set(-8.6, 1.7, 0);
    const tocSideE = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.4, 14.0), bunkerMat);
    tocSideE.position.set(8.6, 1.7, 0);
    tocGroup.add(tocSideW, tocSideE);

    // Interior Tactical Partition & Server Banks
    const tocIntWall = new THREE.Mesh(new THREE.BoxGeometry(8.0, 3.4, 0.6), bunkerMat);
    tocIntWall.position.set(-1.0, 1.7, 1.2);
    tocGroup.add(tocIntWall);

    // TOC Roof / 2nd Floor Observation Deck (Helipad / Overwatch)
    const tocRoof = new THREE.Mesh(new THREE.BoxGeometry(18.0, 0.5, 14.0), slabMat);
    tocRoof.position.set(0, 3.65, 0);
    tocGroup.add(tocRoof);

    // Helipad Circle Marking on Roof
    const heliMark = new THREE.Mesh(
      new THREE.RingGeometry(2.5, 2.9, 24),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 })
    );
    heliMark.rotation.x = -Math.PI / 2;
    heliMark.position.set(0, 3.92, 0);
    tocGroup.add(heliMark);

    // Roof Sandbag Parapet
    const roofBagN = new THREE.Mesh(new THREE.BoxGeometry(17.6, 1.0, 0.6), sandbagMat);
    roofBagN.position.set(0, 4.4, -6.6);
    const roofBagS = new THREE.Mesh(new THREE.BoxGeometry(17.6, 1.0, 0.6), sandbagMat);
    roofBagS.position.set(0, 4.4, 6.6);
    const roofBagW = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 13.6), sandbagMat);
    roofBagW.position.set(-8.6, 4.4, 0);
    const roofBagE = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 13.6), sandbagMat);
    roofBagE.position.set(8.6, 4.4, 0);
    tocGroup.add(roofBagN, roofBagS, roofBagW, roofBagE);

    // Tactical Roof Stairwell & Ramp from ground
    const rampGeo = new THREE.BoxGeometry(2.4, 0.3, 8.4);
    const ramp = new THREE.Mesh(rampGeo, steelMat);
    ramp.position.set(10.0, 1.8, 1.0);
    ramp.rotation.x = 0.44;
    tocGroup.add(ramp);

    const tocObs = addObstacle(tocGroup, new THREE.Vector3(22.0, 5.0, 15.0), new THREE.Vector3(0, 2.5, -2), 'bunker_toc');

    // Add leaning & peek cover points at TOC doorways and roof parapet
    addCover(new THREE.Vector3(-2.8, 1.2, -8.8), new THREE.Vector3(0, 0, -1), tocObs.id!, 'high');
    addCover(new THREE.Vector3(2.8, 1.2, -8.8), new THREE.Vector3(0, 0, -1), tocObs.id!, 'high');
    addCover(new THREE.Vector3(0, 4.8, -8.4), new THREE.Vector3(0, 0, -1), tocObs.id!, 'low');
    addCover(new THREE.Vector3(0, 4.8, 4.4), new THREE.Vector3(0, 0, 1), tocObs.id!, 'low');

    // =====================================================================
    // 4. MOTOR POOL & ARMORED VEHICLES (East Sector, x: +22 to +28)
    // =====================================================================
    // Camouflage Shade Canopy
    const canopyGroup = new THREE.Group();
    canopyGroup.position.set(24, 0, 0);

    const canopyMesh = new THREE.Mesh(new THREE.PlaneGeometry(16, 22), camoNetMat);
    canopyMesh.rotation.x = -Math.PI / 2;
    canopyMesh.position.set(0, 4.5, 0);
    canopyGroup.add(canopyMesh);

    // 6 Canopy Steel Stanchions
    for (const cx of [-7.5, 0, 7.5]) {
      for (const cz of [-10, 10]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.5, 8), steelMat);
        post.position.set(cx, 2.25, cz);
        canopyGroup.add(post);
      }
    }
    scene.add(canopyGroup);

    // Armored Tactical Patrol Vehicle (MRAP / Humvee Builder)
    const createArmoredVehicle = (x: number, z: number, rotY: number, id: string) => {
      const veh = new THREE.Group();
      veh.position.set(x, 0, z);
      veh.rotation.y = rotY;

      // Chassis / Lower Hull
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.1, 5.4), vehicleMat);
      hull.position.set(0, 1.0, 0);
      veh.add(hull);

      // Sloped Armored Cabin
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.95, 2.8), vehicleMat);
      cabin.position.set(0, 2.0, -0.4);
      veh.add(cabin);

      // Bulletproof Glass Windshield & Side Windows
      const winMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9 });
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 0.1), winMat);
      windshield.position.set(0, 2.1, -1.82);
      windshield.rotation.x = 0.35;
      veh.add(windshield);

      // 4 Heavy All-Terrain Tires
      const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
      for (const tx of [-1.35, 1.35]) {
        for (const tz of [-1.7, 1.7]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.45, 14), tireMat);
          wheel.rotateZ(Math.PI / 2);
          wheel.position.set(tx, 0.52, tz);
          veh.add(wheel);
        }
      }

      // Roof Shielded Gunner Turret Ring
      const turretRing = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.6, 12, 1, true), steelMat);
      turretRing.position.set(0, 2.75, -0.4);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.6, 8), steelMat);
      barrel.rotateX(Math.PI / 2);
      barrel.position.set(0, 2.95, -1.4);
      veh.add(turretRing, barrel);

      const size = new THREE.Vector3(3.0, 3.2, 5.8);
      const obs = addObstacle(veh, size, new THREE.Vector3(x, 1.6, z), id);

      // Add high cover along the vehicle flanks
      const fwd = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
      addCover(new THREE.Vector3(x, 1.4, z).add(fwd.clone().multiplyScalar(1.8)), fwd, obs.id!, 'high');
      addCover(new THREE.Vector3(x, 1.4, z).sub(fwd.clone().multiplyScalar(1.8)), fwd.clone().negate(), obs.id!, 'high');
      return obs;
    };

    createArmoredVehicle(21, -4, 0.25, 'mrap_patrol_1');
    createArmoredVehicle(27, 6, -0.15, 'mrap_patrol_2');

    // Fuel Transfer Station & Ammo Crates in Motor Pool
    createExplosiveDrum(17, -12, 'motorpool_fuel_1');
    createExplosiveDrum(18, -12, 'motorpool_fuel_2');
    createExplosiveDrum(31, 14, 'motorpool_fuel_3');

    // Ammo / Weapon Crates Stack
    const ammoCrateGeo = new THREE.BoxGeometry(1.6, 0.9, 1.2);
    const crateMat = new THREE.MeshStandardMaterial({ map: crateTex, roughness: 0.8 });
    const crate1 = new THREE.Mesh(ammoCrateGeo, crateMat);
    crate1.position.set(28, 0.45, -6);
    const crate2 = new THREE.Mesh(ammoCrateGeo, crateMat);
    crate2.position.set(28, 1.35, -6);
    const crate3 = new THREE.Mesh(ammoCrateGeo, crateMat);
    crate3.position.set(29.6, 0.45, -6);
    const crateGroup = new THREE.Group();
    crateGroup.add(crate1, crate2, crate3);
    addObstacle(crateGroup, new THREE.Vector3(3.4, 1.9, 1.4), new THREE.Vector3(28.8, 0.95, -6), 'motorpool_crates');

    // =====================================================================
    // 5. WEST FORTIFIED TRENCH LINE & BUNKER DUGOUT (West Sector, x: -22 to -28)
    // =====================================================================
    // Zig-Zagging Sandbag Parapets forming interlocking fire lanes
    createSandbagWall(-22, -18, 14, 0, 'trench_n_wall');
    createSandbagWall(-28, -9, 12, Math.PI / 2, 'trench_mid_turn');
    createSandbagWall(-20, 0, 16, 0.35, 'trench_center_dogleg');
    createSandbagWall(-26, 12, 14, -0.25, 'trench_s_wall');
    createSandbagWall(-20, 24, 12, 0, 'trench_s_revetment');

    // Underground Dugout Bunker with Overhanging Log & Dirt Roof
    const dugout = new THREE.Group();
    dugout.position.set(-26, 0, -26);

    const dugWallL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 7.0), bunkerMat);
    dugWallL.position.set(-3.5, 1.2, 0);
    const dugWallR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.4, 7.0), bunkerMat);
    dugWallR.position.set(3.5, 1.2, 0);
    const dugWallBack = new THREE.Mesh(new THREE.BoxGeometry(7.0, 2.4, 0.8), bunkerMat);
    dugWallBack.position.set(0, 1.2, -3.5);
    const dugRoof = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.6, 8.2), sandbagMat);
    dugRoof.position.set(0, 2.7, 0);
    dugout.add(dugWallL, dugWallR, dugWallBack, dugRoof);

    // Front sandbag firing slit
    const dugSlitL = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 0.8), sandbagMat);
    dugSlitL.position.set(-2.2, 0.65, 3.5);
    const dugSlitR = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 0.8), sandbagMat);
    dugSlitR.position.set(2.2, 0.65, 3.5);
    dugout.add(dugSlitL, dugSlitR);

    const dugObs = addObstacle(dugout, new THREE.Vector3(8.5, 3.2, 8.5), new THREE.Vector3(-26, 1.6, -26), 'trench_dugout');
    addCover(new THREE.Vector3(-26, 1.2, -22), new THREE.Vector3(0, 0, 1), dugObs.id!, 'low');

    // Explosive Drum near Trench bunker entrance
    createExplosiveDrum(-22, -10, 'trench_fuel_1');
    createExplosiveDrum(-27, 18, 'trench_fuel_2');

    // =====================================================================
    // 6. COMMUNICATIONS RADAR ARRAY DISH & TRANSMITTER MAST (x: 0, z: 22)
    // =====================================================================
    const radarGroup = new THREE.Group();
    radarGroup.position.set(0, 0, 22);

    // Heavy Concrete Hexagonal Base
    const radBase = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.2, 1.4, 6), bunkerMat);
    radBase.position.y = 0.7;
    radarGroup.add(radBase);

    // Lattice Steel Mast
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.45, 14.0, 8), steelMat);
    mast.position.y = 8.4;
    radarGroup.add(mast);

    // Giant Parabolic Radar Dish
    const dishGeo = new THREE.SphereGeometry(3.4, 16, 12, 0, Math.PI * 2, 0, Math.PI / 3);
    const dish = new THREE.Mesh(dishGeo, steelMat);
    dish.rotation.x = -1.1;
    dish.position.set(0, 12.0, 0.6);
    radarGroup.add(dish);

    // Red Flashing Aviation Warning Beacon
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    beacon.position.set(0, 15.6, 0);
    radarGroup.add(beacon);

    const radObs = addObstacle(radarGroup, new THREE.Vector3(7.2, 16.0, 7.2), new THREE.Vector3(0, 8.0, 22), 'radar_array');
    addCover(new THREE.Vector3(-2.8, 1.2, 22), new THREE.Vector3(-1, 0, 0), radObs.id!, 'high');
    addCover(new THREE.Vector3(2.8, 1.2, 22), new THREE.Vector3(1, 0, 0), radObs.id!, 'high');

    // Dragon's Teeth Anti-Vehicle Obstacles flanking the main gate
    for (let i = -3; i <= 3; i++) {
      if (Math.abs(i) <= 1) continue; // Leave central roadway clear
      const dt = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.1, 4), bunkerMat);
      dt.position.set(i * 3.4, 0.55, 34);
      dt.rotation.y = Math.PI / 4;
      scene.add(dt);
      obstacles.push({
        id: `dt_${i}`,
        mesh: dt,
        box: new THREE.Box3().setFromCenterAndSize(dt.position, new THREE.Vector3(1.1, 1.1, 1.1)),
        pos: dt.position.clone(),
        size: new THREE.Vector3(1.1, 1.1, 1.1),
      });
    }

    // =====================================================================
    // 7. TACTICAL SPAWN POINTS, NAV NODES & FLANK LANES
    // =====================================================================
    // Allies Spawn (Southern Gate Bastion, z: +32 to +38)
    spawnPoints.push(
      { position: new THREE.Vector3(0, 0, 36), team: 'allies' },
      { position: new THREE.Vector3(-6, 0, 35), team: 'allies' },
      { position: new THREE.Vector3(6, 0, 35), team: 'allies' },
      { position: new THREE.Vector3(-12, 0, 36), team: 'allies' },
      { position: new THREE.Vector3(12, 0, 36), team: 'allies' }
    );

    // Axis Spawn (Northern Breach Approach, z: -32 to -38)
    spawnPoints.push(
      { position: new THREE.Vector3(0, 0, -36), team: 'axis' },
      { position: new THREE.Vector3(-6, 0, -35), team: 'axis' },
      { position: new THREE.Vector3(6, 0, -35), team: 'axis' },
      { position: new THREE.Vector3(-12, 0, -36), team: 'axis' },
      { position: new THREE.Vector3(12, 0, -36), team: 'axis' }
    );

    // Neutral Spawns (for FFA / Gun Game)
    spawnPoints.push(
      { position: new THREE.Vector3(-24, 0, 0), team: 'neutral' },
      { position: new THREE.Vector3(24, 0, 0), team: 'neutral' },
      { position: new THREE.Vector3(0, 0, 10), team: 'neutral' },
      { position: new THREE.Vector3(0, 0, -18), team: 'neutral' },
      { position: new THREE.Vector3(-32, 0, -32), team: 'neutral' },
      { position: new THREE.Vector3(32, 0, 32), team: 'neutral' }
    );

    // Central Nav Grid connecting lanes
    const baseNodes = [
      // Central Compound & TOC
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -14),
      new THREE.Vector3(0, 0, 14),
      new THREE.Vector3(-10, 0, -2),
      new THREE.Vector3(10, 0, -2),
      new THREE.Vector3(0, 4.0, -2), // TOC Roof overwatch node

      // West Trench Lane (Flank Left)
      new THREE.Vector3(-16, 0, 24),
      new THREE.Vector3(-22, 0, 12),
      new THREE.Vector3(-22, 0, 0),
      new THREE.Vector3(-24, 0, -12),
      new THREE.Vector3(-22, 0, -24),

      // East Motor Pool Lane (Flank Right)
      new THREE.Vector3(16, 0, 24),
      new THREE.Vector3(22, 0, 12),
      new THREE.Vector3(24, 0, 0),
      new THREE.Vector3(22, 0, -12),
      new THREE.Vector3(16, 0, -24),

      // North & South Perimeter Gates
      new THREE.Vector3(0, 0, -32),
      new THREE.Vector3(0, 0, 32),
      new THREE.Vector3(-32, 0, -32),
      new THREE.Vector3(32, 0, 32),
    ];
    navNodes.push(...baseNodes);

    // Dedicated Flank Routes for AI Squad Coordination
    flankLeft.push(
      new THREE.Vector3(-12, 0, 28),
      new THREE.Vector3(-22, 0, 16),
      new THREE.Vector3(-26, 0, 0),
      new THREE.Vector3(-24, 0, -16),
      new THREE.Vector3(-12, 0, -28)
    );

    flankRight.push(
      new THREE.Vector3(12, 0, 28),
      new THREE.Vector3(22, 0, 16),
      new THREE.Vector3(26, 0, 0),
      new THREE.Vector3(24, 0, -16),
      new THREE.Vector3(12, 0, -28)
    );

    return groundMat;
  }
}
