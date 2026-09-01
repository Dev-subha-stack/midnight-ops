import * as THREE from 'three';
import { WeaponCamo, WeaponType } from '../types';
import { TextureGenerator } from './textures';

// 3D Procedural Weapon Geometry & Viewmodel Builder
// Crafts AAA quality firearm meshes with modular attachments, materials, and optic reticles

export class ModelFactory {
  // --- WEAPON MESH BUILDER ---
  public static createWeaponMesh(type: WeaponType, camo: WeaponCamo = 'standard'): THREE.Group {
    const weaponGroup = new THREE.Group();
    weaponGroup.name = `weapon_${type}`;

    const camoTexture = TextureGenerator.createWeaponCamoTexture(camo);
    const metalMat = new THREE.MeshStandardMaterial({
      map: camoTexture,
      roughness: camo === 'gold' ? 0.2 : camo === 'damascus' ? 0.3 : 0.45,
      metalness: camo === 'gold' ? 0.95 : camo === 'damascus' ? 0.85 : 0.75,
      bumpScale: 0.05,
    });

    const blackSteelMat = new THREE.MeshStandardMaterial({
      color: 0x181a1f,
      roughness: 0.5,
      metalness: 0.8,
    });

    const polymerMat = new THREE.MeshStandardMaterial({
      color: 0x22262c,
      roughness: 0.8,
      metalness: 0.1,
    });

    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.9,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.35,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.9,
      ior: 1.5,
    });

    switch (type) {
      case 'm4': {
        // --- M4A1 MODULAR ASSAULT RIFLE ---
        // 1. Lower Receiver with trigger guard & magwell flare
        const receiverGeo = new THREE.BoxGeometry(0.068, 0.115, 0.32);
        const receiver = new THREE.Mesh(receiverGeo, metalMat);
        receiver.position.set(0, 0, 0);
        weaponGroup.add(receiver);

        // Upper Receiver top riser + Picatinny Rail
        const topRailGeo = new THREE.BoxGeometry(0.038, 0.022, 0.42);
        const topRail = new THREE.Mesh(topRailGeo, blackSteelMat);
        topRail.position.set(0, 0.068, -0.02);
        weaponGroup.add(topRail);

        // Shell Ejection Port & Dust Cover
        const dustCover = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.028, 0.08), blackSteelMat);
        dustCover.position.set(0.036, 0.02, 0.02);
        const brassShell = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.04, 8), goldAccentMat);
        brassShell.rotateX(Math.PI / 2);
        brassShell.position.set(0.034, 0.02, 0.02);
        weaponGroup.add(dustCover, brassShell);

        // Forward Assist housing
        const fwdAssist = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.04, 8), blackSteelMat);
        fwdAssist.rotateZ(Math.PI / 4);
        fwdAssist.position.set(0.042, 0.04, 0.08);
        weaponGroup.add(fwdAssist);

        // 2. Free-Float M-LOK Handguard
        const handguardGeo = new THREE.BoxGeometry(0.064, 0.086, 0.38);
        const handguard = new THREE.Mesh(handguardGeo, metalMat);
        handguard.position.set(0, 0.012, -0.34);
        weaponGroup.add(handguard);

        // M-LOK vent cutouts (dark recessed insets)
        for (let i = 0; i < 4; i++) {
          const ventL = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.016, 0.045), blackSteelMat);
          ventL.position.set(-0.033, 0.012, -0.22 - i * 0.065);
          const ventR = ventL.clone();
          ventR.position.x = 0.033;
          weaponGroup.add(ventL, ventR);
        }

        // Angled Tactical Foregrip (AFG)
        const afg = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.065, 0.12), polymerMat);
        afg.position.set(0, -0.058, -0.34);
        afg.rotation.x = -0.35;
        weaponGroup.add(afg);

        // 3. Chrome-Moly Barrel & 3-Prong Flash Hider
        const barrelGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.52, 16);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, blackSteelMat);
        barrel.position.set(0, 0.018, -0.56);
        weaponGroup.add(barrel);

        const flashHiderGeo = new THREE.CylinderGeometry(0.022, 0.018, 0.09, 12);
        flashHiderGeo.rotateX(Math.PI / 2);
        const flashHider = new THREE.Mesh(flashHiderGeo, blackSteelMat);
        flashHider.position.set(0, 0.018, -0.83);
        weaponGroup.add(flashHider);

        // 4. EOTech EXPS3 Holographic Sight
        const sightBase = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.024, 0.12), blackSteelMat);
        sightBase.position.set(0, 0.09, -0.04);
        weaponGroup.add(sightBase);

        // Protective Aluminum Hood
        const sightHood = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.062, 0.09), blackSteelMat);
        sightHood.position.set(0, 0.13, -0.04);
        weaponGroup.add(sightHood);

        // Anti-reflective coated optical glass
        const sightGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.046, 0.048), glassMat);
        sightGlass.position.set(0, 0.13, -0.04);
        weaponGroup.add(sightGlass);

        // Holographic Reticle
        const reticleMat = new THREE.MeshBasicMaterial({
          map: TextureGenerator.createHoloSightTexture(),
          transparent: true,
          opacity: 0.96,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const reticle = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.04), reticleMat);
        reticle.position.set(0, 0.13, -0.042);
        reticle.name = 'reticle';
        weaponGroup.add(reticle);

        // Battery compartment cylinder on right side
        const battCap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 12), blackSteelMat);
        battCap.rotateX(Math.PI / 2);
        battCap.position.set(0.034, 0.1, -0.04);
        weaponGroup.add(battCap);

        // 5. P-MAG 30-round 5.56 Magazine with Round Window
        const magGroup = new THREE.Group();
        magGroup.name = 'magazine';
        const magGeo = new THREE.BoxGeometry(0.038, 0.23, 0.105);
        const mag = new THREE.Mesh(magGeo, polymerMat);
        mag.position.set(0, -0.145, -0.05);
        mag.rotation.x = -0.16;
        magGroup.add(mag);

        // Mag viewing window
        const magWin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.02), goldAccentMat);
        magWin.position.set(0, -0.145, -0.05);
        magWin.rotation.x = -0.16;
        magGroup.add(magWin);
        weaponGroup.add(magGroup);

        // 6. Ergonomic MOE Pistol Grip
        const gripGeo = new THREE.BoxGeometry(0.044, 0.165, 0.075);
        const grip = new THREE.Mesh(gripGeo, polymerMat);
        grip.position.set(0, -0.115, 0.12);
        grip.rotation.x = 0.36;
        weaponGroup.add(grip);

        // 7. Tactical Collapsible Crane Stock & Buffer Tube
        const bufferTubeGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.26, 16);
        bufferTubeGeo.rotateX(Math.PI / 2);
        const bufferTube = new THREE.Mesh(bufferTubeGeo, blackSteelMat);
        bufferTube.position.set(0, 0.016, 0.28);
        weaponGroup.add(bufferTube);

        const stockPadGeo = new THREE.BoxGeometry(0.056, 0.15, 0.19);
        const stockPad = new THREE.Mesh(stockPadGeo, polymerMat);
        stockPad.position.set(0, -0.015, 0.34);
        weaponGroup.add(stockPad);

        // 8. PEQ-15 Tactical Laser / Illuminator
        const peqGeo = new THREE.BoxGeometry(0.046, 0.028, 0.1);
        const peq = new THREE.Mesh(peqGeo, polymerMat);
        peq.position.set(0.042, 0.042, -0.32);
        const peqLens = new THREE.Mesh(new THREE.CircleGeometry(0.008, 12), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        peqLens.position.set(0.042, 0.042, -0.372);
        peqLens.rotateY(Math.PI);
        weaponGroup.add(peq, peqLens);
        break;
      }

      case 'mp5': {
        // --- MP5 TACTICAL 9MM SUBMACHINE GUN ---
        // Stamped Steel Upper Receiver
        const upperGeo = new THREE.CylinderGeometry(0.033, 0.033, 0.38, 16);
        upperGeo.rotateX(Math.PI / 2);
        const upper = new THREE.Mesh(upperGeo, metalMat);
        weaponGroup.add(upper);

        // Cocking tube & Handle
        const cockingTube = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.36, 12), blackSteelMat);
        cockingTube.rotateX(Math.PI / 2);
        cockingTube.position.set(0, 0.036, -0.16);
        const cockingHandle = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.014, 0.025), blackSteelMat);
        cockingHandle.position.set(-0.026, 0.042, -0.28);
        weaponGroup.add(cockingTube, cockingHandle);

        // Navy Trigger Group Lower
        const lower = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.095, 0.23), polymerMat);
        lower.position.set(0, -0.052, 0.04);
        weaponGroup.add(lower);

        // Ribbed Tropical Forend Handguard
        const forend = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.044, 0.22, 16), polymerMat);
        forend.rotateX(Math.PI / 2);
        forend.position.set(0, -0.012, -0.22);
        weaponGroup.add(forend);

        // 9mm Barrel + 3-Lug Muzzle Crown
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.24, 12), blackSteelMat);
        barrel.rotateX(Math.PI / 2);
        barrel.position.set(0, 0.002, -0.4);
        const muzzle3Lug = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.06, 12), blackSteelMat);
        muzzle3Lug.rotateX(Math.PI / 2);
        muzzle3Lug.position.set(0, 0.002, -0.5);
        weaponGroup.add(barrel, muzzle3Lug);

        // Curved 9mm Magazine with viewing ribs
        const magGroup = new THREE.Group();
        magGroup.name = 'magazine';
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.25, 0.065), blackSteelMat);
        mag.position.set(0, -0.155, -0.08);
        mag.rotation.x = -0.24;
        magGroup.add(mag);
        weaponGroup.add(magGroup);

        // Ergonomic Pistol Grip
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.15, 0.065), polymerMat);
        grip.position.set(0, -0.115, 0.1);
        grip.rotation.x = 0.36;
        weaponGroup.add(grip);

        // A3 Retractable Wire Stock
        const stockRailL = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.016, 0.3), blackSteelMat);
        stockRailL.position.set(-0.032, -0.01, 0.22);
        const stockRailR = stockRailL.clone();
        stockRailR.position.x = 0.032;
        const stockButt = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.13, 0.022), polymerMat);
        stockButt.position.set(0, -0.032, 0.37);
        weaponGroup.add(stockRailL, stockRailR, stockButt);

        // HK Rotating Drum Diopter Rear Sight & Front Hooded Post
        const rearDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.024, 12), blackSteelMat);
        rearDrum.position.set(0, 0.046, 0.12);
        const frontHood = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 8, 16), blackSteelMat);
        frontHood.position.set(0, 0.044, -0.32);
        const frontPost = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.015, 6), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
        frontPost.position.set(0, 0.044, -0.32);
        weaponGroup.add(rearDrum, frontHood, frontPost);
        break;
      }

      case 'sniper': {
        // --- AX-50 / BARRETT .50 CAL HEAVY ANTI-MATERIAL RIFLE ---
        // Heavy Monolithic Octagonal Chassis
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.145, 0.58), metalMat);
        weaponGroup.add(body);

        // Massive Heavy Fluted Bull Barrel
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.9, 16), blackSteelMat);
        barrel.rotateX(Math.PI / 2);
        barrel.position.set(0, 0.022, -0.72);
        weaponGroup.add(barrel);

        // Barrel Fluting grooves
        for (let i = 0; i < 4; i++) {
          const fluting = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, 0.6), metalMat);
          const angle = (i * Math.PI) / 2;
          fluting.position.set(Math.cos(angle) * 0.026, 0.022 + Math.sin(angle) * 0.026, -0.68);
          weaponGroup.add(fluting);
        }

        // Multi-Chamber Tactical Muzzle Brake
        const brake = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.055, 0.16), blackSteelMat);
        brake.position.set(0, 0.022, -1.22);
        weaponGroup.add(brake);

        // Heavy Scope Mount Picatinny Base
        const scopeMount = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.04, 0.24), blackSteelMat);
        scopeMount.position.set(0, 0.095, -0.05);
        weaponGroup.add(scopeMount);

        // Schmidt & Bender High-Magnification Scope
        const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.042, 0.42, 16), blackSteelMat);
        scopeBody.rotateX(Math.PI / 2);
        scopeBody.position.set(0, 0.15, -0.05);
        weaponGroup.add(scopeBody);

        // Windage & Elevation Turret dials
        const turretElev = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.022, 12), blackSteelMat);
        turretElev.position.set(0, 0.19, -0.05);
        const turretWind = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.022, 12), blackSteelMat);
        turretWind.rotateZ(Math.PI / 2);
        turretWind.position.set(0.04, 0.15, -0.05);
        weaponGroup.add(turretElev, turretWind);

        // Anti-reflective optical glass elements
        const scopeLensF = new THREE.Mesh(new THREE.CircleGeometry(0.038, 16), glassMat);
        scopeLensF.position.set(0, 0.15, -0.26);
        scopeLensF.rotateY(Math.PI);
        const scopeLensR = new THREE.Mesh(new THREE.CircleGeometry(0.032, 16), glassMat);
        scopeLensR.position.set(0, 0.15, 0.16);
        weaponGroup.add(scopeLensF, scopeLensR);

        // Folded Alloy Tactical Bipod
        const bipodBase = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.032, 0.06), blackSteelMat);
        bipodBase.position.set(0, -0.055, -0.62);
        const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.28, 8), blackSteelMat);
        legL.position.set(-0.065, -0.17, -0.62);
        legL.rotation.z = 0.32;
        const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.28, 8), blackSteelMat);
        legR.position.set(0.065, -0.17, -0.62);
        legR.rotation.z = -0.32;
        weaponGroup.add(bipodBase, legL, legR);

        // Straight-pull Tactical Bolt Handle
        const boltStem = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.06, 8), blackSteelMat);
        boltStem.rotateZ(Math.PI / 2);
        boltStem.position.set(0.05, 0.06, 0.06);
        const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 12), blackSteelMat);
        boltKnob.position.set(0.08, 0.06, 0.06);
        weaponGroup.add(boltStem, boltKnob);

        // Heavy .50 BMG Box Magazine
        const magGroup = new THREE.Group();
        magGroup.name = 'magazine';
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.24, 0.15), blackSteelMat);
        mag.position.set(0, -0.16, -0.08);
        magGroup.add(mag);
        weaponGroup.add(magGroup);

        // Sniper Precision Stock with Adjustable Cheek Pad
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.165, 0.38), polymerMat);
        stock.position.set(0, -0.02, 0.44);
        const cheekRiser = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.16), polymerMat);
        cheekRiser.position.set(0, 0.07, 0.4);
        weaponGroup.add(stock, cheekRiser);

        // Ergonomic Grip
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.165, 0.075), polymerMat);
        grip.position.set(0, -0.135, 0.16);
        grip.rotation.x = 0.32;
        weaponGroup.add(grip);
        break;
      }

      case 'shotgun': {
        // --- 12-GAUGE BREACHER COMBAT SHOTGUN ---
        // Matte Steel Receiver
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.066, 0.115, 0.36), metalMat);
        weaponGroup.add(receiver);

        // 12-Gauge Barrel & Under-barrel Mag Tube
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.58, 16), blackSteelMat);
        barrel.rotateX(Math.PI / 2);
        barrel.position.set(0, 0.032, -0.45);
        const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.54, 16), blackSteelMat);
        magTube.rotateX(Math.PI / 2);
        magTube.position.set(0, -0.016, -0.43);
        weaponGroup.add(barrel, magTube);

        // Perforated Barrel Heat Shield
        const heatShield = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 12, 1, true, 0, Math.PI), blackSteelMat);
        heatShield.rotateX(Math.PI / 2);
        heatShield.position.set(0, 0.038, -0.38);
        weaponGroup.add(heatShield);

        // Pump-Action Forend with tactical gripping ridges
        const pumpGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.23, 16);
        pumpGeo.rotateX(Math.PI / 2);
        const pump = new THREE.Mesh(pumpGeo, polymerMat);
        pump.position.set(0, -0.016, -0.4);
        pump.name = 'pump_handle';
        weaponGroup.add(pump);

        // Side Saddle with 6 Red/Gold 12GA Shells
        const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.065, 0.24), polymerMat);
        saddle.position.set(-0.044, 0.01, 0);
        weaponGroup.add(saddle);
        for (let i = 0; i < 6; i++) {
          const shellBody = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.055, 10), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 }));
          shellBody.position.set(-0.054, 0.01, -0.085 + i * 0.034);
          const shellRim = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 10), goldAccentMat);
          shellRim.position.set(-0.054, 0.032, -0.085 + i * 0.034);
          weaponGroup.add(shellBody, shellRim);
        }

        // Breaching Standoff Choke (Crenellated jagged teeth)
        const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.085, 12), blackSteelMat);
        muzzle.rotateX(Math.PI / 2);
        muzzle.position.set(0, 0.032, -0.78);
        weaponGroup.add(muzzle);

        // Tactical Fixed Stock & Grip
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.13, 0.34), polymerMat);
        stock.position.set(0, -0.042, 0.32);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.155, 0.065), polymerMat);
        grip.position.set(0, -0.115, 0.13);
        grip.rotation.x = 0.36;
        weaponGroup.add(stock, grip);
        break;
      }

      case 'deagle': {
        // --- DESERT EAGLE .50 GS HAND CANNON ---
        // Heavy Sculpted Steel Slide with serrations
        const slideGeo = new THREE.BoxGeometry(0.052, 0.068, 0.3);
        const slide = new THREE.Mesh(slideGeo, camo === 'gold' ? goldAccentMat : metalMat);
        slide.position.set(0, 0.042, -0.04);
        slide.name = 'pistol_slide';
        weaponGroup.add(slide);

        // Slide serrations (machined grip cuts)
        for (let i = 0; i < 5; i++) {
          const cutL = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.04, 0.01), blackSteelMat);
          cutL.position.set(-0.027, 0.042, 0.03 - i * 0.018);
          const cutR = cutL.clone();
          cutR.position.x = 0.027;
          weaponGroup.add(cutL, cutR);
        }

        // .50 Action Express Polygonal Barrel
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.3, 16), blackSteelMat);
        barrel.rotateX(Math.PI / 2);
        barrel.position.set(0, 0.042, -0.06);
        weaponGroup.add(barrel);

        // Steel Frame & Beavertail
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.062, 0.25), blackSteelMat);
        frame.position.set(0, -0.012, -0.02);
        weaponGroup.add(frame);

        // Textured Combat Grip Panels
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.165, 0.085), polymerMat);
        grip.position.set(0, -0.095, 0.06);
        grip.rotation.x = 0.29;
        weaponGroup.add(grip);

        // Skeletonized Commander Hammer
        const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.032, 0.02), blackSteelMat);
        hammer.position.set(0, 0.042, 0.11);
        hammer.rotation.x = -0.4;
        weaponGroup.add(hammer);

        // High-Visibility 3-Dot Combat Sights (with glowing green tritium)
        const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.02, 0.022), blackSteelMat);
        frontSight.position.set(0, 0.085, -0.17);
        const frontDot = new THREE.Mesh(new THREE.SphereGeometry(0.003, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
        frontDot.position.set(0, 0.09, -0.16);

        const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.02, 0.016), blackSteelMat);
        rearSight.position.set(0, 0.085, 0.09);
        const rearDotL = new THREE.Mesh(new THREE.SphereGeometry(0.003, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
        rearDotL.position.set(-0.01, 0.09, 0.082);
        const rearDotR = rearDotL.clone();
        rearDotR.position.x = 0.01;

        weaponGroup.add(frontSight, frontDot, rearSight, rearDotL, rearDotR);
        break;
      }
    }

    return weaponGroup;
  }

  // --- VIEWMODEL ARMS & TACTICAL GLOVES ---
  public static createViewmodelArms(): THREE.Group {
    const armsGroup = new THREE.Group();
    armsGroup.name = 'viewmodel_arms';

    const gloveMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.8,
      metalness: 0.1,
    });

    const sleeveMat = new THREE.MeshStandardMaterial({
      color: 0x374151,
      roughness: 0.9,
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373,
      roughness: 0.6,
    });

    // Right Arm (Trigger hand)
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(0.18, -0.18, 0.2);

    const rightSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.35, 12), sleeveMat);
    rightSleeve.position.set(0, -0.1, 0.12);
    rightSleeve.rotation.x = 0.8;
    rightArmGroup.add(rightSleeve);

    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.065, 0.12), gloveMat);
    rightHand.position.set(0, 0, 0);
    rightArmGroup.add(rightHand);

    // Left Arm (Foregrip support)
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.16, -0.16, -0.15);

    const leftSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.38, 12), sleeveMat);
    leftSleeve.position.set(-0.06, -0.12, 0.18);
    leftSleeve.rotation.x = 0.6;
    leftSleeve.rotation.y = -0.4;
    leftArmGroup.add(leftSleeve);

    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.065, 0.12), gloveMat);
    leftHand.position.set(0, 0, 0);
    leftHand.rotation.y = 0.3;
    leftArmGroup.add(leftHand);

    // Tactical GPS Watch on Left Wrist
    const watchFace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.015, 16),
      new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.2, metalness: 0.8 })
    );
    watchFace.position.set(-0.02, 0.035, 0.06);
    watchFace.rotateX(Math.PI / 2);
    leftArmGroup.add(watchFace);

    armsGroup.add(rightArmGroup, leftArmGroup);
    return armsGroup;
  }

  // --- 3D ENEMY COMBAT BOT CHARACTER MODEL (AUTHENTIC TACTICAL OPERATOR) ---
  public static createBotMesh(team: 'allies' | 'axis' = 'axis'): THREE.Group {
    const botGroup = new THREE.Group();
    botGroup.name = `bot_${team}`;

    const uniformColor = team === 'axis' ? 0x27272a : 0x1e293b;
    const camoSecondary = team === 'axis' ? 0x3f3f46 : 0x334155;
    const vestColor = team === 'axis' ? 0x18181b : 0x0f172a;
    const gloveColor = 0x18181b;

    const uniformMat = new THREE.MeshStandardMaterial({
      color: uniformColor,
      roughness: 0.85,
      metalness: 0.1,
    });

    const vestMat = new THREE.MeshStandardMaterial({
      color: vestColor,
      roughness: 0.65,
      metalness: 0.3,
    });

    const helmetMat = new THREE.MeshStandardMaterial({
      color: team === 'axis' ? 0x27272a : 0x1e293b,
      roughness: 0.5,
      metalness: 0.5,
    });

    const visorMat = new THREE.MeshStandardMaterial({
      color: team === 'axis' ? 0xef4444 : 0x38bdf8,
      emissive: team === 'axis' ? 0x991b1b : 0x0284c7,
      emissiveIntensity: 0.7,
      roughness: 0.2,
      metalness: 0.9,
    });

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x52525b,
      roughness: 0.3,
      metalness: 0.9,
    });

    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x3f2e20,
      roughness: 0.7,
    });

    // 1. Torso & Articulated Plate Carrier
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.28), uniformMat);
    torso.position.set(0, 1.25, 0);
    torso.name = 'bot_torso';
    botGroup.add(torso);

    const plateCarrier = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.5, 0.33), vestMat);
    plateCarrier.position.set(0, 1.3, 0);
    plateCarrier.name = 'bot_plate_carrier';
    botGroup.add(plateCarrier);

    // Front Ceramic Trauma Plate & MOLLE Webbing
    const traumaPlate = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.04), vestMat);
    traumaPlate.position.set(0, 1.32, 0.18);
    botGroup.add(traumaPlate);

    // Mag Pouches (3x Rifle Mags on Chest)
    for (let i = -1; i <= 1; i++) {
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.07), vestMat);
      pouch.position.set(i * 0.11, 1.22, 0.21);
      const magTop = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.05, 0.05), steelMat);
      magTop.position.set(i * 0.11, 1.31, 0.21);
      botGroup.add(pouch, magTop);
    }

    // Tactical Radio on Back Left Shoulder with Antenna
    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.08), vestMat);
    radio.position.set(-0.18, 1.42, -0.19);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.004, 0.32, 8), steelMat);
    antenna.position.set(-0.18, 1.66, -0.19);
    botGroup.add(radio, antenna);

    // 2. Head, Balaclava, High-Cut Helmet & NVG Goggles
    const headGroup = new THREE.Group();
    headGroup.name = 'bot_head';
    headGroup.position.set(0, 1.72, 0);

    const balaclava = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), uniformMat);
    headGroup.add(balaclava);

    // FAST High-Cut Tactical Helmet
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 12), helmetMat);
    helmet.scale.set(1, 0.85, 1.12);
    helmet.position.set(0, 0.06, -0.01);
    headGroup.add(helmet);

    // Tactical ARC Rails on Helmet Sides
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.16), steelMat);
    railL.position.set(-0.16, 0.04, 0);
    const railR = railL.clone();
    railR.position.x = 0.16;
    headGroup.add(railL, railR);

    // ComTac Tactical Headset with Earcups & Boom Mic
    const earcupL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12), vestMat);
    earcupL.rotateZ(Math.PI / 2);
    earcupL.position.set(-0.14, 0.02, 0);
    const earcupR = earcupL.clone();
    earcupR.position.x = 0.14;
    const boomMic = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.14, 6), steelMat);
    boomMic.rotateX(Math.PI / 2);
    boomMic.rotateZ(0.3);
    boomMic.position.set(-0.12, -0.04, 0.08);
    headGroup.add(earcupL, earcupR, boomMic);

    // Tactical Visor / Goggles
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.065, 0.06), visorMat);
    visor.position.set(0, 0.025, 0.125);
    headGroup.add(visor);

    // Night Vision Goggle (NVG) Mount on Helmet Brow
    const nvgMount = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), steelMat);
    nvgMount.position.set(0, 0.12, 0.16);
    headGroup.add(nvgMount);

    botGroup.add(headGroup);

    // 3. Arms, Tactical Gloves & Elbow Pads
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.6, 10), uniformMat);
    leftArm.position.set(-0.32, 1.2, 0.12);
    leftArm.rotation.x = 0.5;
    leftArm.name = 'bot_left_arm';

    const elbowPadL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 10), vestMat);
    elbowPadL.position.set(0, 0, 0);
    leftArm.add(elbowPadL);
    botGroup.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.6, 10), uniformMat);
    rightArm.position.set(0.32, 1.2, 0.15);
    rightArm.rotation.x = 0.7;
    rightArm.name = 'bot_right_arm';

    const elbowPadR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 10), vestMat);
    elbowPadR.position.set(0, 0, 0);
    rightArm.add(elbowPadR);
    botGroup.add(rightArm);

    // Tactical Battle Belt with Side Holster & Dump Pouch
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.32), vestMat);
    belt.position.set(0, 0.92, 0);
    const sideHolster = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), leatherMat);
    sideHolster.position.set(0.26, 0.82, 0.04);
    const dumpPouch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.1), vestMat);
    dumpPouch.position.set(-0.24, 0.84, -0.06);
    botGroup.add(belt, sideHolster, dumpPouch);

    // 4. Legs, Knee Pads & Reinforced Combat Boots
    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.8, 10), uniformMat);
    leftLeg.position.set(-0.14, 0.5, 0);
    leftLeg.name = 'bot_left_leg';

    const kneePadL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.06), vestMat);
    kneePadL.position.set(0, 0, 0.07);
    leftLeg.add(kneePadL);
    botGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.8, 10), uniformMat);
    rightLeg.position.set(0.14, 0.5, 0);
    rightLeg.name = 'bot_right_leg';

    const kneePadR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.06), vestMat);
    kneePadR.position.set(0, 0, 0.07);
    rightLeg.add(kneePadR);
    botGroup.add(rightLeg);

    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.15, 0.24), vestMat);
    leftBoot.position.set(-0.14, 0.08, 0.04);
    const rightBoot = leftBoot.clone();
    rightBoot.position.x = 0.14;
    botGroup.add(leftBoot, rightBoot);

    // 5. Weapon held in hands
    const botRifle = ModelFactory.createWeaponMesh('m4', 'standard');
    botRifle.scale.set(0.7, 0.7, 0.7);
    botRifle.position.set(0.18, 1.15, 0.35);
    botRifle.rotation.y = Math.PI;
    botGroup.add(botRifle);

    return botGroup;
  }
}
