import * as THREE from 'three';
import { MapObstacle, MapSpawnPoint, TacticalCoverPoint } from './map';
import { TextureGenerator } from './textures';
import { ParticleSystem } from './particles';
import { DestructionManager } from './destruction';

// Procedural Builder for Free Fire Style "Bermuda Island" Battle Royale Map
// Features: 220x220m tropical island surrounded by ocean, Clock Tower, Factory,
// Shipyard & Docks, Pochinok Village, BimiSakti Radio Mast & Launch Pad, Palm Trees, and tactical cover.

export class BermudaMapBuilder {
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
    // 1. Ocean Water Plane (360x360m)
    const oceanGeo = new THREE.PlaneGeometry(380, 380, 8, 8);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.15,
      metalness: 0.8,
      transparent: true,
      opacity: 0.88,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.6;
    ocean.receiveShadow = true;
    scene.add(ocean);

    // 2. Island Base Ground & Sandy Beach Coastline (220x220m)
    const asphaltTex = TextureGenerator.createAsphaltTexture();
    const concreteTex = TextureGenerator.createConcreteTexture();

    // Tropical island terrain
    const islandGeo = new THREE.PlaneGeometry(220, 220, 16, 16);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x22543d, // Lush tropical grass & earth
      roughness: 0.85,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(islandGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    // Sandy Shoreline Ring
    const sandGeo = new THREE.RingGeometry(95, 115, 32);
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // golden beach sand
      roughness: 0.95,
      metalness: 0.0,
    });
    const sand = new THREE.Mesh(sandGeo, sandMat);
    sand.rotation.x = -Math.PI / 2;
    sand.position.y = 0.02;
    sand.receiveShadow = true;
    scene.add(sand);

    // Island Perimeter Boundary Rocks / Sea Cliffs
    this.buildCoastalBoulders(scene, obstacles);

    // --- POI 1: CLOCK TOWER (North-West: x = -50, z = -50) ---
    this.buildClockTower(scene, obstacles, coverPoints);

    // --- POI 2: FACTORY (North-East: x = 55, z = -45) ---
    this.buildFactory(scene, obstacles, coverPoints);

    // --- POI 3: SHIPYARD & DOCKS (South-West: x = -55, z = 50) ---
    this.buildShipyard(scene, obstacles, coverPoints);

    // --- POI 4: POCHINOK VILLAGE (South-East: x = 50, z = 50) ---
    this.buildPochinokVillage(scene, obstacles, coverPoints, destruction);

    // --- POI 5: BIMISAKTI RADIO TOWER & LAUNCH PAD (Center: x = 0, z = 0) ---
    this.buildBimiSaktiTower(scene, obstacles);

    // --- POI 6: TROPICAL PALM TREES & SCATTERED BOULDERS ---
    this.buildVegetationAndNature(scene, obstacles);

    // --- POI 7: EXPLOSIVE BARRELS & CRATES ACROSS POIS ---
    this.buildExplosivesAndMunitions(scene, obstacles, explosiveBarrels, destruction);

    // --- POI 8: HIGHWAYS, SANDBAG CHECKPOINTS & SNIPER WATCHTOWERS ---
    this.buildTacticalHighwaysAndOutposts(scene, obstacles, coverPoints, destruction);

    // --- NAVIGATION NODES & SPAWN POINTS ---
    this.buildNavAndSpawns(navNodes, spawnPoints, flankLeft, flankRight);

    return groundMat;
  }

  // --- COASTAL BOULDERS ---
  private static buildCoastalBoulders(scene: THREE.Scene, obstacles: MapObstacle[]) {
    const boulderMat = new THREE.MeshStandardMaterial({
      color: 0x57534e,
      roughness: 0.9,
      metalness: 0.1,
    });

    const angles = [0, 0.35, 0.7, 1.1, 1.5, 1.9, 2.3, 2.7, 3.1, 3.6, 4.0, 4.5, 4.9, 5.4, 5.8, 6.1];
    angles.forEach((ang, i) => {
      const radius = 104 + (i % 3) * 3;
      const x = Math.cos(ang) * radius;
      const z = Math.sin(ang) * radius;
      const scale = 2.5 + (i % 4) * 0.8;

      const geo = new THREE.DodecahedronGeometry(scale, 1);
      const mesh = new THREE.Mesh(geo, boulderMat);
      mesh.position.set(x, scale * 0.7, z);
      mesh.rotation.set(ang, i, 0.2);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      const box = new THREE.Box3().setFromObject(mesh);
      obstacles.push({
        id: `coast_rock_${i}`,
        mesh,
        box,
        pos: mesh.position.clone(),
        size: new THREE.Vector3(scale * 2, scale * 2, scale * 2),
      });
    });
  }

  // --- POI 1: CLOCK TOWER ---
  private static buildClockTower(scene: THREE.Scene, obstacles: MapObstacle[], coverPoints: TacticalCoverPoint[]) {
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x78716c,
      roughness: 0.85,
      metalness: 0.1,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b, // terracotta red roof
      roughness: 0.6,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.7,
      roughness: 0.3,
    });

    const towerX = -50;
    const towerZ = -50;

    // Tower Base (Level 1: 10m x 10m x 6m tall)
    const baseGeo = new THREE.BoxGeometry(10, 6, 10);
    const baseMesh = new THREE.Mesh(baseGeo, stoneMat);
    baseMesh.position.set(towerX, 3, towerZ);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    scene.add(baseMesh);
    obstacles.push({
      id: 'clock_base',
      mesh: baseMesh,
      box: new THREE.Box3().setFromObject(baseMesh),
      pos: baseMesh.position.clone(),
      size: new THREE.Vector3(10, 6, 10),
    });

    // Tower Middle Belfry (Level 2: 7m x 7m x 8m tall)
    const midGeo = new THREE.BoxGeometry(7, 8, 7);
    const midMesh = new THREE.Mesh(midGeo, stoneMat);
    midMesh.position.set(towerX, 10, towerZ);
    midMesh.castShadow = true;
    scene.add(midMesh);
    obstacles.push({
      id: 'clock_mid',
      mesh: midMesh,
      box: new THREE.Box3().setFromObject(midMesh),
      pos: midMesh.position.clone(),
      size: new THREE.Vector3(7, 8, 7),
    });

    // Clock Faces on all 4 sides of Level 2
    const clockFaceGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.1, 24);
    clockFaceGeo.rotateX(Math.PI / 2);
    const clockMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });

    const clockOffsets = [
      { x: 0, z: 3.55, rotY: 0 },
      { x: 0, z: -3.55, rotY: Math.PI },
      { x: 3.55, z: 0, rotY: Math.PI / 2 },
      { x: -3.55, z: 0, rotY: -Math.PI / 2 },
    ];
    clockOffsets.forEach((cfg) => {
      const face = new THREE.Mesh(clockFaceGeo, clockMat);
      face.position.set(towerX + cfg.x, 11.5, towerZ + cfg.z);
      face.rotation.y = cfg.rotY;
      scene.add(face);

      // Gold hands
      const handGeo = new THREE.BoxGeometry(0.12, 1.1, 0.12);
      const hand = new THREE.Mesh(handGeo, goldMat);
      hand.position.set(towerX + cfg.x, 11.8, towerZ + cfg.z);
      scene.add(hand);
    });

    // Tower Spire Roof (Pyramid peak)
    const roofGeo = new THREE.ConeGeometry(5.2, 5, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.set(towerX, 16.5, towerZ);
    roofMesh.castShadow = true;
    scene.add(roofMesh);

    // Weather Vane Finial
    const finialGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5);
    const finial = new THREE.Mesh(finialGeo, goldMat);
    finial.position.set(towerX, 19.5, towerZ);
    scene.add(finial);

    // Clock Tower Courtyard Enclosing Low Stone Walls
    const courtyardWalls = [
      { x: towerX, z: towerZ - 14, w: 22, d: 0.8, h: 1.4 },
      { x: towerX, z: towerZ + 14, w: 22, d: 0.8, h: 1.4 },
      { x: towerX - 14, z: towerZ, w: 0.8, d: 22, h: 1.4 },
      { x: towerX + 14, z: towerZ, w: 0.8, d: 22, h: 1.4 },
    ];
    courtyardWalls.forEach((cw, idx) => {
      const geo = new THREE.BoxGeometry(cw.w, cw.h, cw.d);
      const mesh = new THREE.Mesh(geo, stoneMat);
      mesh.position.set(cw.x, cw.h / 2, cw.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      const box = new THREE.Box3().setFromObject(mesh);
      obstacles.push({
        id: `clock_courtyard_${idx}`,
        mesh,
        box,
        pos: mesh.position.clone(),
        size: new THREE.Vector3(cw.w, cw.h, cw.d),
      });

      // Tactical cover points along courtyard walls
      coverPoints.push({
        id: `cp_clock_wall_${idx}`,
        position: new THREE.Vector3(cw.x, 0, cw.z),
        crouchPos: new THREE.Vector3(cw.x, 0.7, cw.z),
        peekPos: new THREE.Vector3(cw.x, 1.5, cw.z),
        facingDir: new THREE.Vector3(cw.x - towerX, 0, cw.z - towerZ).normalize(),
        obstacleId: `clock_courtyard_${idx}`,
        isAvailable: true,
      });
    });

    // Central Stone Fountain in Courtyard
    const fountGeo = new THREE.CylinderGeometry(2.4, 2.8, 0.8, 16);
    const fount = new THREE.Mesh(fountGeo, stoneMat);
    fount.position.set(towerX + 8, 0.4, towerZ - 8);
    fount.castShadow = true;
    scene.add(fount);
    obstacles.push({
      id: 'clock_fountain',
      mesh: fount,
      box: new THREE.Box3().setFromObject(fount),
      pos: fount.position.clone(),
      size: new THREE.Vector3(5, 0.8, 5),
    });
  }

  // --- POI 2: FACTORY ---
  private static buildFactory(scene: THREE.Scene, obstacles: MapObstacle[], coverPoints: TacticalCoverPoint[]) {
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // slate industrial steel
      roughness: 0.6,
      metalness: 0.7,
    });
    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0xeab308, // caution industrial yellow
      roughness: 0.4,
      metalness: 0.5,
    });

    const facX = 55;
    const facZ = -45;

    // Factory Main Hangar Building (28m long x 18m wide x 9m tall)
    // Left & Right Outer Walls
    const wallThick = 0.8;
    const facWalls = [
      { id: 'fac_wall_n', size: [28, 9, wallThick], pos: [facX, 4.5, facZ - 9] },
      { id: 'fac_wall_s', size: [28, 9, wallThick], pos: [facX, 4.5, facZ + 9] },
      { id: 'fac_wall_w', size: [wallThick, 9, 18], pos: [facX - 14, 4.5, facZ] },
      { id: 'fac_wall_e_1', size: [wallThick, 9, 6], pos: [facX + 14, 4.5, facZ - 6] },
      { id: 'fac_wall_e_2', size: [wallThick, 9, 6], pos: [facX + 14, 4.5, facZ + 6] },
    ];

    facWalls.forEach(w => {
      const geo = new THREE.BoxGeometry(w.size[0], w.size[1], w.size[2]);
      const mesh = new THREE.Mesh(geo, steelMat);
      mesh.position.set(w.pos[0], w.pos[1], w.pos[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      obstacles.push({
        id: w.id,
        mesh,
        box: new THREE.Box3().setFromObject(mesh),
        pos: new THREE.Vector3(...w.pos),
        size: new THREE.Vector3(...w.size),
      });
    });

    // Slanted Factory Metal Roof
    const roofL = new THREE.Mesh(new THREE.BoxGeometry(29, 0.4, 10.5), steelMat);
    roofL.position.set(facX, 9.8, facZ - 4.5);
    roofL.rotation.x = 0.18;
    roofL.castShadow = true;
    scene.add(roofL);

    const roofR = new THREE.Mesh(new THREE.BoxGeometry(29, 0.4, 10.5), steelMat);
    roofR.position.set(facX, 9.8, facZ + 4.5);
    roofR.rotation.x = -0.18;
    roofR.castShadow = true;
    scene.add(roofR);

    // Factory Rooftop Access Exterior Staircase Ramp
    const rampGeo = new THREE.BoxGeometry(2.4, 0.3, 14);
    const ramp = new THREE.Mesh(rampGeo, yellowMat);
    ramp.position.set(facX + 15.5, 4.5, facZ);
    ramp.rotation.x = -0.65;
    ramp.castShadow = true;
    scene.add(ramp);
    obstacles.push({
      id: 'fac_ramp',
      mesh: ramp,
      box: new THREE.Box3().setFromObject(ramp),
      pos: ramp.position.clone(),
      size: new THREE.Vector3(2.4, 9, 14),
    });

    // Factory Interior Heavy Machinery Turbines
    const cylGeo = new THREE.CylinderGeometry(2.2, 2.2, 4.5, 16);
    const cyl1 = new THREE.Mesh(cylGeo, yellowMat);
    cyl1.position.set(facX - 6, 2.25, facZ);
    cyl1.castShadow = true;
    scene.add(cyl1);
    obstacles.push({
      id: 'fac_turbine_1',
      mesh: cyl1,
      box: new THREE.Box3().setFromObject(cyl1),
      pos: cyl1.position.clone(),
      size: new THREE.Vector3(4.4, 4.5, 4.4),
    });

    const cyl2 = new THREE.Mesh(cylGeo, yellowMat);
    cyl2.position.set(facX + 4, 2.25, facZ);
    cyl2.castShadow = true;
    scene.add(cyl2);
    obstacles.push({
      id: 'fac_turbine_2',
      mesh: cyl2,
      box: new THREE.Box3().setFromObject(cyl2),
      pos: cyl2.position.clone(),
      size: new THREE.Vector3(4.4, 4.5, 4.4),
    });
  }

  // --- POI 3: SHIPYARD & DOCKS ---
  private static buildShipyard(scene: THREE.Scene, obstacles: MapObstacle[], coverPoints: TacticalCoverPoint[]) {
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x78350f, // rich dock timber
      roughness: 0.8,
    });
    const craneMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // bright red crane
      roughness: 0.4,
      metalness: 0.8,
    });

    const shipX = -55;
    const shipZ = 50;

    // Concrete Waterfront Pier Base
    const pierGeo = new THREE.BoxGeometry(26, 1.2, 20);
    const pierMesh = new THREE.Mesh(pierGeo, woodMat);
    pierMesh.position.set(shipX, 0.4, shipZ);
    pierMesh.receiveShadow = true;
    scene.add(pierMesh);

    // Giant 15m Gantry Crane
    const legGeo = new THREE.BoxGeometry(0.8, 14, 0.8);
    const craneLegs = [
      [shipX - 8, 7, shipZ - 6],
      [shipX + 8, 7, shipZ - 6],
      [shipX - 8, 7, shipZ + 6],
      [shipX + 8, 7, shipZ + 6],
    ];
    craneLegs.forEach((lp, idx) => {
      const leg = new THREE.Mesh(legGeo, craneMat);
      leg.position.set(lp[0], lp[1], lp[2]);
      leg.castShadow = true;
      scene.add(leg);
      obstacles.push({
        id: `crane_leg_${idx}`,
        mesh: leg,
        box: new THREE.Box3().setFromObject(leg),
        pos: leg.position.clone(),
        size: new THREE.Vector3(0.8, 14, 0.8),
      });
    });

    // Crane Overhead Boom
    const boomGeo = new THREE.BoxGeometry(24, 1.2, 3);
    const boom = new THREE.Mesh(boomGeo, craneMat);
    boom.position.set(shipX, 14, shipZ);
    boom.castShadow = true;
    scene.add(boom);

    // Shipping Container Maze in Shipyard
    const colors = ['#1e3a8a', '#dc2626', '#15803d', '#ea580c'];
    const containerConfigs = [
      { pos: [shipX - 5, 1.4, shipZ - 2], rot: 0, c: colors[0] },
      { pos: [shipX + 4, 1.4, shipZ + 1], rot: 0.3, c: colors[1] },
      { pos: [shipX - 4, 4.2, shipZ - 2], rot: 0.05, c: colors[2] }, // stacked 2nd story
      { pos: [shipX + 2, 1.4, shipZ - 6], rot: Math.PI / 2, c: colors[3] },
    ];

    containerConfigs.forEach((cfg, idx) => {
      const tex = TextureGenerator.createContainerTexture(cfg.c, `BERMUDA-${idx + 1}`);
      const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.4 });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.8, 12), mat);
      mesh.position.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
      mesh.rotation.y = cfg.rot;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      obstacles.push({
        id: `ship_cont_${idx}`,
        mesh,
        box: new THREE.Box3().setFromObject(mesh),
        pos: mesh.position.clone(),
        size: new THREE.Vector3(4.8, 2.8, 12),
        rot: cfg.rot,
      });
    });
  }

  // --- POI 4: POCHINOK VILLAGE ---
  private static buildPochinokVillage(
    scene: THREE.Scene,
    obstacles: MapObstacle[],
    coverPoints: TacticalCoverPoint[],
    destruction: DestructionManager
  ) {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7, // tropical cream stucco
      roughness: 0.9,
    });
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xb45309, // terracotta clay roof
      roughness: 0.7,
    });

    const villageX = 50;
    const villageZ = 50;

    const houses = [
      { x: villageX - 10, z: villageZ - 8, rot: 0 },
      { x: villageX + 10, z: villageZ - 6, rot: 0.2 },
      { x: villageX - 8, z: villageZ + 10, rot: -0.15 },
      { x: villageX + 12, z: villageZ + 8, rot: 0.1 },
    ];

    houses.forEach((h, idx) => {
      // House Body (8m x 6m x 3.5m tall)
      const bodyGeo = new THREE.BoxGeometry(8, 3.5, 6);
      const body = new THREE.Mesh(bodyGeo, wallMat);
      body.position.set(h.x, 1.75, h.z);
      body.rotation.y = h.rot;
      body.castShadow = true;
      body.receiveShadow = true;
      scene.add(body);

      obstacles.push({
        id: `pochinok_house_${idx}`,
        mesh: body,
        box: new THREE.Box3().setFromObject(body),
        pos: body.position.clone(),
        size: new THREE.Vector3(8, 3.5, 6),
        rot: h.rot,
      });

      // Gable Roof
      const roofGeo = new THREE.ConeGeometry(5.8, 2.2, 4);
      roofGeo.rotateY(Math.PI / 4 + h.rot);
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(h.x, 4.4, h.z);
      roof.castShadow = true;
      scene.add(roof);

      // Destructible Sandbag cover at door of each house
      const sbPos = new THREE.Vector3(h.x + 3.2, 0, h.z + 3.5);
      const prop = destruction.createSandbagBarrier(`pochinok_sandbag_${idx}`, sbPos, h.rot);

      obstacles.push({
        id: `pochinok_sandbag_${idx}`,
        mesh: prop.mesh,
        box: prop.box,
        pos: sbPos.clone(),
        size: new THREE.Vector3(2.4, 0.8, 0.6),
        isDestructible: true,
        health: prop.health,
        maxHealth: prop.maxHealth,
      });

      coverPoints.push({
        id: `cp_pochinok_${idx}`,
        position: new THREE.Vector3(h.x + 3.2, 0, h.z + 4.2),
        crouchPos: new THREE.Vector3(h.x + 3.2, 0.5, h.z + 4.2),
        peekPos: new THREE.Vector3(h.x + 3.2, 1.2, h.z + 4.2),
        facingDir: new THREE.Vector3(0, 0, 1),
        obstacleId: `pochinok_sandbag_${idx}`,
        isAvailable: true,
      });
    });

    // Destructible Supply Crates in Pochinok alleys
    const crateSpots = [
      { x: villageX, z: villageZ, rot: 0.2 },
      { x: villageX - 4, z: villageZ + 2, rot: -0.3 },
      { x: villageX + 5, z: villageZ - 2, rot: 0.5 },
    ];
    crateSpots.forEach((cs, cIdx) => {
      const cPos = new THREE.Vector3(cs.x, 0.75, cs.z);
      const prop = destruction.createWoodenCrate(`pochinok_crate_${cIdx}`, cPos, 1.5, cs.rot);
      obstacles.push({
        id: `pochinok_crate_${cIdx}`,
        mesh: prop.mesh,
        box: prop.box,
        pos: cPos.clone(),
        size: new THREE.Vector3(1.5, 1.5, 1.5),
        rot: cs.rot,
        isDestructible: true,
        health: prop.health,
        maxHealth: prop.maxHealth,
      });
    });
  }

  // --- POI 5: BIMISAKTI RADIO TOWER & LAUNCH PAD ---
  private static buildBimiSaktiTower(scene: THREE.Scene, obstacles: MapObstacle[]) {
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.3,
    });
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    // 28-meter Tall Steel Lattice Communications Mast
    const mastGeo = new THREE.CylinderGeometry(0.5, 3.2, 28, 4);
    const mast = new THREE.Mesh(mastGeo, metalMat);
    mast.position.set(0, 14, 0);
    mast.castShadow = true;
    scene.add(mast);

    obstacles.push({
      id: 'bimisakti_mast',
      mesh: mast,
      box: new THREE.Box3().setFromObject(mast),
      pos: mast.position.clone(),
      size: new THREE.Vector3(4, 28, 4),
    });

    // Blinking Red Aviation Beacon at Mast Apex
    const beaconGeo = new THREE.SphereGeometry(0.45, 12, 12);
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 28.2, 0);
    scene.add(beacon);

    // Circular Defense Bunker at Mast Base
    const bunkerGeo = new THREE.RingGeometry(4.5, 6.5, 24);
    bunkerGeo.rotateX(-Math.PI / 2);
    const bunkerMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    const bunker = new THREE.Mesh(bunkerGeo, bunkerMat);
    bunker.position.set(0, 0.05, 0);
    scene.add(bunker);

    // Free Fire Launch Pad (Jump Pad) at Center North (x = 0, z = -8)
    const padBaseGeo = new THREE.CylinderGeometry(2.2, 2.5, 0.3, 16);
    const padBaseMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.2,
    });
    const padBase = new THREE.Mesh(padBaseGeo, padBaseMat);
    padBase.position.set(0, 0.15, -8);
    padBase.receiveShadow = true;
    scene.add(padBase);

    // Glowing Launch Energy Ring
    const ringGeo = new THREE.RingGeometry(0.8, 1.8, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, 0.32, -8);
    scene.add(ring);
  }

  // --- TROPICAL PALM TREES & BOULDERS ---
  private static buildVegetationAndNature(scene: THREE.Scene, obstacles: MapObstacle[]) {
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.9,
    });
    const frondMat = new THREE.MeshStandardMaterial({
      color: 0x15803d, // lush palm green
      roughness: 0.7,
      side: THREE.DoubleSide,
    });

    // 24 Procedural Palm Trees distributed across hills and beaches
    const treePositions = [
      // Near Clock Tower
      [-36, -38], [-62, -35], [-35, -60],
      // Near Factory
      [40, -32], [70, -38], [42, -58],
      // Near Shipyard
      [-42, 38], [-70, 42], [-40, 65],
      // Near Pochinok
      [38, 36], [68, 40], [42, 65],
      // Midfield open terrain
      [-18, -12], [18, -14], [-16, 16], [16, 18],
      // Coastal Palms
      [-80, -20], [80, -20], [-80, 20], [80, 20],
      [-20, -80], [20, -80], [-20, 80], [20, 80],
    ];

    treePositions.forEach(([tx, tz], idx) => {
      const treeGroup = new THREE.Group();
      treeGroup.position.set(tx, 0, tz);

      // Segmented Curved Trunk (6m tall)
      const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 6.5, 8);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 3.25;
      trunk.rotation.z = (Math.sin(idx) * 0.12);
      trunk.castShadow = true;
      treeGroup.add(trunk);

      // Palm Fronds Canopy
      for (let f = 0; f < 6; f++) {
        const frondAngle = (f / 6) * Math.PI * 2;
        const frondGeo = new THREE.ConeGeometry(0.8, 3.2, 3);
        const frond = new THREE.Mesh(frondGeo, frondMat);
        frond.position.set(
          Math.cos(frondAngle) * 1.5,
          6.2,
          Math.sin(frondAngle) * 1.5
        );
        frond.rotation.y = frondAngle;
        frond.rotation.x = Math.PI / 2.8;
        frond.castShadow = true;
        treeGroup.add(frond);
      }

      scene.add(treeGroup);

      // Collision trunk cylinder
      const trunkBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(tx, 3, tz),
        new THREE.Vector3(0.9, 6, 0.9)
      );
      obstacles.push({
        id: `palm_tree_${idx}`,
        mesh: treeGroup,
        box: trunkBox,
        pos: new THREE.Vector3(tx, 0, tz),
        size: new THREE.Vector3(0.9, 6, 0.9),
      });
    });
  }

  // --- EXPLOSIVE BARRELS, PROPANE TANKS & CRATES ---
  private static buildExplosivesAndMunitions(
    scene: THREE.Scene,
    obstacles: MapObstacle[],
    explosiveBarrels: MapObstacle[],
    destruction: DestructionManager
  ) {
    const barrelPositions = [
      [-42, 0, -42], // Clock Tower courtyard
      [46, 0, -38],  // Factory entrance
      [-48, 0, 44],  // Shipyard docks
      [42, 0, 44],   // Pochinok alley
      [-4, 0, -4],   // Center radio outpost
      [6, 0, 6],
    ];

    barrelPositions.forEach(([bx, by, bz], idx) => {
      const pos = new THREE.Vector3(bx, by, bz);
      const prop = destruction.createExplosiveBarrel(`bermuda_barrel_${idx}`, pos);
      const obs: MapObstacle = {
        id: `bermuda_barrel_${idx}`,
        mesh: prop.mesh,
        box: prop.box,
        pos: pos.clone(),
        size: new THREE.Vector3(0.9, 1.2, 0.9),
        isExplosive: true,
        isDestructible: true,
        health: prop.health,
        maxHealth: prop.maxHealth,
      };
      obstacles.push(obs);
      explosiveBarrels.push(obs);
    });

    // Pressurized Propane Tanks at industrial POIs
    const propanePositions = [
      { id: 'b_propane_1', pos: new THREE.Vector3(58, 0, -40), rot: 0.2 }, // Factory side
      { id: 'b_propane_2', pos: new THREE.Vector3(-58, 0, 42), rot: -0.4 }, // Shipyard dockside
      { id: 'b_propane_3', pos: new THREE.Vector3(-45, 0, -55), rot: 0.5 }, // Clock tower rear
      { id: 'b_propane_4', pos: new THREE.Vector3(0, 0, 18), rot: 0 },       // Highway turn
    ];
    propanePositions.forEach(p => {
      const prop = destruction.createPropaneTank(p.id, p.pos, p.rot);
      const obs: MapObstacle = {
        id: p.id,
        mesh: prop.mesh,
        box: prop.box,
        pos: p.pos.clone(),
        size: new THREE.Vector3(0.8, 1.4, 0.8),
        rot: p.rot,
        isExplosive: true,
        isDestructible: true,
        health: prop.health,
        maxHealth: prop.maxHealth,
      };
      obstacles.push(obs);
      explosiveBarrels.push(obs);
    });

    // Military Ammo Crates & Pallets
    const ammoPositions = [
      { id: 'b_ammo_1', pos: new THREE.Vector3(-52, 0, -45), rot: 0.1 },
      { id: 'b_ammo_2', pos: new THREE.Vector3(50, 0, -50), rot: -0.2 },
      { id: 'b_ammo_3', pos: new THREE.Vector3(-50, 0, 55), rot: 0.3 },
      { id: 'b_ammo_4', pos: new THREE.Vector3(0, 0, -12), rot: 0 },
    ];
    ammoPositions.forEach(a => {
      const prop = destruction.createAmmoCrate(a.id, a.pos, a.rot);
      obstacles.push({
        id: a.id,
        mesh: prop.mesh,
        box: prop.box,
        pos: a.pos.clone(),
        size: new THREE.Vector3(1.4, 0.8, 0.9),
        rot: a.rot,
        isDestructible: true,
        health: prop.health,
        maxHealth: prop.maxHealth,
      });
    });
  }

  // --- POI 8: HIGHWAYS, SANDBAG CHECKPOINTS & SNIPER WATCHTOWERS ---
  private static buildTacticalHighwaysAndOutposts(
    scene: THREE.Scene,
    obstacles: MapObstacle[],
    coverPoints: TacticalCoverPoint[],
    destruction: DestructionManager
  ) {
    // 1. Paved Road Asphalt Material
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // dark asphalt
      roughness: 0.9,
      metalness: 0.1,
    });

    // East-West Highway across Bermuda (160m x 7m)
    const roadEwGeo = new THREE.PlaneGeometry(170, 7.5);
    const roadEw = new THREE.Mesh(roadEwGeo, roadMat);
    roadEw.rotation.x = -Math.PI / 2;
    roadEw.position.set(0, 0.03, 0);
    roadEw.receiveShadow = true;
    scene.add(roadEw);

    // North-South Highway across Bermuda (7m x 160m)
    const roadNsGeo = new THREE.PlaneGeometry(7.5, 170);
    const roadNs = new THREE.Mesh(roadNsGeo, roadMat);
    roadNs.rotation.x = -Math.PI / 2;
    roadNs.position.set(0, 0.035, 0);
    roadNs.receiveShadow = true;
    scene.add(roadNs);

    // Diagonal Arterials to Clock Tower & Pochinok
    const roadDiag1Geo = new THREE.PlaneGeometry(6, 120);
    const roadDiag1 = new THREE.Mesh(roadDiag1Geo, roadMat);
    roadDiag1.rotation.x = -Math.PI / 2;
    roadDiag1.rotation.z = Math.PI / 4;
    roadDiag1.position.set(0, 0.025, 0);
    roadDiag1.receiveShadow = true;
    scene.add(roadDiag1);

    // 2. Sandbag Checkpoints & Destructible Cinderblock/Concrete Barriers along Highway
    const checkpointConfigs = [
      { x: -22, z: 0, rotY: 0 },
      { x: 22, z: 0, rotY: 0 },
      { x: 0, z: -22, rotY: Math.PI / 2 },
      { x: 0, z: 22, rotY: Math.PI / 2 },
      { x: -35, z: -25, rotY: Math.PI / 4 },
      { x: 35, z: 25, rotY: Math.PI / 4 },
    ];

    checkpointConfigs.forEach((chk, idx) => {
      // Destructible Cinderblock / Concrete Barrier Wall
      const wallPos = new THREE.Vector3(chk.x, 0.75, chk.z);
      const wallProp = destruction.createCinderblockWall(`checkpoint_barrier_${idx}`, wallPos, [3.2, 1.5, 0.6], chk.rotY);
      obstacles.push({
        id: `checkpoint_barrier_${idx}`,
        mesh: wallProp.mesh,
        box: wallProp.box,
        pos: wallPos.clone(),
        size: new THREE.Vector3(3.2, 1.5, 0.6),
        rot: chk.rotY,
        isDestructible: true,
        health: wallProp.health,
        maxHealth: wallProp.maxHealth,
      });

      // Destructible Sandbag Emplacement stacked alongside
      const bagOffset = new THREE.Vector3(0, 0, 1.0).applyAxisAngle(new THREE.Vector3(0, 1, 0), chk.rotY);
      const sbPos = new THREE.Vector3(chk.x + bagOffset.x, 0, chk.z + bagOffset.z);
      const sbProp = destruction.createSandbagBarrier(`checkpoint_sandbag_${idx}`, sbPos, chk.rotY);
      obstacles.push({
        id: `checkpoint_sandbag_${idx}`,
        mesh: sbProp.mesh,
        box: sbProp.box,
        pos: sbPos.clone(),
        size: new THREE.Vector3(3.6, 0.9, 0.6),
        rot: chk.rotY,
        isDestructible: true,
        health: sbProp.health,
        maxHealth: sbProp.maxHealth,
      });

      // Registered Tactical Cover Point for AI
      const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), chk.rotY);
      coverPoints.push({
        id: `bermuda_chk_cover_${idx}`,
        position: new THREE.Vector3(chk.x - fwd.x * 1.0, 0, chk.z - fwd.z * 1.0),
        crouchPos: new THREE.Vector3(chk.x - fwd.x * 1.0, 0.6, chk.z - fwd.z * 1.0),
        peekPos: new THREE.Vector3(chk.x - fwd.x * 1.0, 1.4, chk.z - fwd.z * 1.0),
        facingDir: fwd.clone(),
        obstacleId: `checkpoint_barrier_${idx}`,
        isAvailable: true,
        type: 'low',
      });
    });

    // 3. Sniper Watchtowers (North-West and South-East Outposts)
    const towerMat = new THREE.MeshStandardMaterial({
      color: 0x3f3f46, // tactical dark steel frame
      metalness: 0.8,
      roughness: 0.3,
    });
    const woodFloorMat = new THREE.MeshStandardMaterial({
      color: 0x854d0e,
      roughness: 0.9,
    });

    const towerLocs = [
      { x: -28, z: -28 },
      { x: 28, z: 28 },
    ];

    towerLocs.forEach((loc, tIdx) => {
      const towerGroup = new THREE.Group();
      towerGroup.position.set(loc.x, 0, loc.z);

      // 4 Leg Pillars (5m tall)
      const legGeo = new THREE.CylinderGeometry(0.18, 0.18, 5.2, 8);
      const legOffsets = [
        [-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]
      ];
      legOffsets.forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeo, towerMat);
        leg.position.set(lx, 2.6, lz);
        leg.castShadow = true;
        towerGroup.add(leg);
      });

      // Wooden Observation Platform at y = 5.2m (4m x 4m)
      const platformGeo = new THREE.BoxGeometry(4.2, 0.3, 4.2);
      const platform = new THREE.Mesh(platformGeo, woodFloorMat);
      platform.position.set(0, 5.2, 0);
      platform.receiveShadow = true;
      towerGroup.add(platform);

      // Guardrail Barriers
      const railGeo = new THREE.BoxGeometry(4.2, 1.0, 0.15);
      const railNorth = new THREE.Mesh(railGeo, towerMat);
      railNorth.position.set(0, 5.75, -2.05);
      towerGroup.add(railNorth);

      const railSouth = new THREE.Mesh(railGeo, towerMat);
      railSouth.position.set(0, 5.75, 2.05);
      towerGroup.add(railSouth);

      scene.add(towerGroup);

      // Tower Collision
      const tBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(loc.x, 2.6, loc.z),
        new THREE.Vector3(4.0, 5.2, 4.0)
      );
      obstacles.push({
        id: `bermuda_watchtower_${tIdx}`,
        mesh: towerGroup,
        box: tBox,
        pos: new THREE.Vector3(loc.x, 2.6, loc.z),
        size: new THREE.Vector3(4.0, 5.2, 4.0),
      });

      // Register high-ground sniper cover point
      coverPoints.push({
        id: `bermuda_watchtower_cover_${tIdx}`,
        position: new THREE.Vector3(loc.x, 0, loc.z - 2.8),
        crouchPos: new THREE.Vector3(loc.x, 0.6, loc.z - 2.8),
        peekPos: new THREE.Vector3(loc.x, 1.6, loc.z - 2.8),
        facingDir: new THREE.Vector3(0, 0, 1),
        obstacleId: `bermuda_watchtower_${tIdx}`,
        isAvailable: true,
        type: 'high',
      });
    });
  }

  // --- NAVIGATION NODES & SPAWN POINTS ---
  private static buildNavAndSpawns(
    navNodes: THREE.Vector3[],
    spawnPoints: MapSpawnPoint[],
    flankLeft: THREE.Vector3[],
    flankRight: THREE.Vector3[]
  ) {
    // 40+ Tactical Navigation Waypoints connecting POIs across Bermuda
    const nodeCoords: [number, number, number][] = [
      // Clock Tower Sector
      [-50, 0.8, -50], [-42, 0.8, -42], [-58, 0.8, -52], [-45, 0.8, -60], [-35, 0.8, -35],
      // Factory Sector
      [55, 0.8, -45], [46, 0.8, -38], [64, 0.8, -50], [55, 0.8, -32], [38, 0.8, -30],
      // Shipyard Sector
      [-55, 0.8, 50], [-48, 0.8, 44], [-62, 0.8, 56], [-42, 0.8, 52], [-35, 0.8, 35],
      // Pochinok Sector
      [50, 0.8, 50], [42, 0.8, 44], [58, 0.8, 56], [45, 0.8, 60], [35, 0.8, 35],
      // Central BimiSakti Crossroads
      [0, 0.8, 0], [0, 0.8, -12], [0, 0.8, 12], [-14, 0.8, 0], [14, 0.8, 0],
      [-18, 0.8, -18], [18, 0.8, -18], [-18, 0.8, 18], [18, 0.8, 18],
      // Arterial Connectors
      [-25, 0.8, -35], [25, 0.8, -35], [-35, 0.8, -25], [35, 0.8, -25],
      [-25, 0.8, 35], [25, 0.8, 35], [-35, 0.8, 25], [35, 0.8, 25],
    ];

    nodeCoords.forEach(c => navNodes.push(new THREE.Vector3(c[0], c[1], c[2])));

    // Flank Lanes connecting East & West flanks
    flankLeft.push(
      new THREE.Vector3(-65, 0.8, -55),
      new THREE.Vector3(-70, 0.8, -20),
      new THREE.Vector3(-70, 0.8, 20),
      new THREE.Vector3(-65, 0.8, 55)
    );

    flankRight.push(
      new THREE.Vector3(65, 0.8, -55),
      new THREE.Vector3(70, 0.8, -20),
      new THREE.Vector3(70, 0.8, 20),
      new THREE.Vector3(65, 0.8, 55)
    );

    // 24 Battle Royale Spawn Points across all POIs
    const spawnCoords: [number, number, number][] = [
      [-48, 0.8, -48], [-44, 0.8, -54], [-54, 0.8, -44], // Clock Tower
      [52, 0.8, -42], [58, 0.8, -48], [48, 0.8, -36],   // Factory
      [-52, 0.8, 48], [-58, 0.8, 52], [-46, 0.8, 44],   // Shipyard
      [48, 0.8, 48], [54, 0.8, 52], [44, 0.8, 44],     // Pochinok
      [-12, 0.8, -12], [12, 0.8, -12], [-12, 0.8, 12], [12, 0.8, 12], // BimiSakti Outskirts
      [-28, 0.8, -28], [28, 0.8, -28], [-28, 0.8, 28], [28, 0.8, 28],
      [0, 0.8, -25], [0, 0.8, 25], [-25, 0.8, 0], [25, 0.8, 0],
    ];

    spawnCoords.forEach((sc, idx) => {
      spawnPoints.push({
        position: new THREE.Vector3(sc[0], sc[1], sc[2]),
        team: idx % 2 === 0 ? 'allies' : 'axis',
      });
    });
  }
}
