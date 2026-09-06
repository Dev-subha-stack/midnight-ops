import * as THREE from 'three';
import { OpticType, ReticleColor, ReticleStyle, WeaponCamo, WeaponType } from '../types';
import { TextureGenerator } from './textures';

// 3D Procedural Weapon Geometry & Viewmodel Builder
// Crafts AAA quality firearm meshes with modular attachments, materials, and optic reticles

export class ModelFactory {
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

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: optic === 'thermal_flir' ? 0x22d3ee : 0x67e8f9,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.92,
      ior: 1.52,
    });

    const reticleTex = TextureGenerator.createReticleTexture(reticleColor, reticleStyle);
    const reticleMat = new THREE.MeshBasicMaterial({
      map: reticleTex,
      transparent: true,
      opacity: 0.98,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    switch (optic) {
      case 'iron_sight': {
        // Low Profile Tritium Flip-up Front & Rear Sights
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.016, 0.22), blackSteelMat);
        base.position.set(0, 0.008, 0);
        opticGroup.add(base);

        const rearNotch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.035, 0.015), blackSteelMat);
        rearNotch.position.set(0, 0.025, 0.09);
        const rearDotL = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.004, 6), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
        rearDotL.rotateX(Math.PI / 2);
        rearDotL.position.set(-0.008, 0.032, 0.098);
        const rearDotR = rearDotL.clone();
        rearDotR.position.x = 0.008;

        const frontPost = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.024, 6), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
        frontPost.position.set(0, 0.026, -0.09);
        opticGroup.add(rearNotch, rearDotL, rearDotR, frontPost);
        break;
      }

      case 'reflex_dot': {
        // Aimpoint Micro T-2 Red Dot with High Riser
        const mount = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.035, 0.085), blackSteelMat);
        mount.position.set(0, 0.018, 0);
        opticGroup.add(mount);

        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.11, 16), blackSteelMat);
        tube.rotateX(Math.PI / 2);
        tube.position.set(0, 0.048, 0);
        opticGroup.add(tube);

        // Front & rear glass
        const lensF = new THREE.Mesh(new THREE.CircleGeometry(0.02, 16), glassMat);
        lensF.position.set(0, 0.048, -0.054);
        lensF.rotateY(Math.PI);
        const lensR = new THREE.Mesh(new THREE.CircleGeometry(0.02, 16), glassMat);
        lensR.position.set(0, 0.048, 0.054);
        opticGroup.add(lensF, lensR);

        // Reticle
        const reticlePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.036, 0.036), reticleMat);
        reticlePlane.position.set(0, 0.048, -0.01);
        reticlePlane.name = 'reticle';
        opticGroup.add(reticlePlane);

        // Top & side turret knobs
        const turretTop = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.015, 8), blackSteelMat);
        turretTop.position.set(0, 0.075, 0);
        const turretSide = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.015, 8), blackSteelMat);
        turretSide.rotateZ(Math.PI / 2);
        turretSide.position.set(0.028, 0.048, 0);
        opticGroup.add(turretTop, turretSide);
        break;
      }

      case 'acog_4x': {
        // Trijicon 4x32 ACOG Combat Scope with Fiber-Optic Channel
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.028, 0.14), blackSteelMat);
        base.position.set(0, 0.014, 0);
        opticGroup.add(base);

        const mainBody = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.18, 16), blackSteelMat);
        mainBody.rotateX(Math.PI / 2);
        mainBody.position.set(0, 0.045, 0);
        opticGroup.add(mainBody);

        // Top fiber optic rod
        const fiberRod = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        fiberRod.rotateX(Math.PI / 2);
        fiberRod.position.set(0, 0.076, -0.01);
        opticGroup.add(fiberRod);

        // Lenses
        const lensF = new THREE.Mesh(new THREE.CircleGeometry(0.024, 16), glassMat);
        lensF.position.set(0, 0.045, -0.09);
        lensF.rotateY(Math.PI);
        const lensR = new THREE.Mesh(new THREE.CircleGeometry(0.02, 16), glassMat);
        lensR.position.set(0, 0.045, 0.09);
        opticGroup.add(lensF, lensR);

        // Reticle
        const reticlePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.038, 0.038), reticleMat);
        reticlePlane.position.set(0, 0.045, 0);
        reticlePlane.name = 'reticle';
        opticGroup.add(reticlePlane);
        break;
      }

      case 'thermal_flir': {
        // FLIR ThermoSight Pro Thermal Scope
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.026, 0.16), polymerMat);
        base.position.set(0, 0.013, 0);
        opticGroup.add(base);

        const housing = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.058, 0.2), blackSteelMat);
        housing.position.set(0, 0.048, 0);
        opticGroup.add(housing);

        // Germanium Objective Lens & OLED Eye Cup
        const objLens = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.04, 16), new THREE.MeshStandardMaterial({ color: 0x0e7490, metalness: 0.9, roughness: 0.1 }));
        objLens.rotateX(Math.PI / 2);
        objLens.position.set(0, 0.048, -0.11);
        const eyeCup = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.04, 16), polymerMat);
        eyeCup.rotateX(Math.PI / 2);
        eyeCup.position.set(0, 0.048, 0.11);
        opticGroup.add(objLens, eyeCup);

        // Reticle
        const reticlePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.044, 0.044), reticleMat);
        reticlePlane.position.set(0, 0.048, 0);
        reticlePlane.name = 'reticle';
        opticGroup.add(reticlePlane);
        break;
      }

      case 'sniper_variable': {
        // Nightforce ATACR 34mm High-Power Variable Sniper Scope
        const mount = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.04, 0.26), blackSteelMat);
        mount.position.set(0, 0.02, 0);
        opticGroup.add(mount);

        const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.044, 0.44, 16), blackSteelMat);
        scopeBody.rotateX(Math.PI / 2);
        scopeBody.position.set(0, 0.08, 0);
        opticGroup.add(scopeBody);

        // Tactical Turrets
        const turretElev = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.024, 12), blackSteelMat);
        turretElev.position.set(0, 0.124, 0);
        const turretWind = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.024, 12), blackSteelMat);
        turretWind.rotateZ(Math.PI / 2);
        turretWind.position.set(0.044, 0.08, 0);
        opticGroup.add(turretElev, turretWind);

        // Lenses
        const lensF = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), glassMat);
        lensF.position.set(0, 0.08, -0.22);
        lensF.rotateY(Math.PI);
        const lensR = new THREE.Mesh(new THREE.CircleGeometry(0.034, 16), glassMat);
        lensR.position.set(0, 0.08, 0.22);
        opticGroup.add(lensF, lensR);
        break;
      }

      case 'holo_553':
      default: {
        // EOTech 553 Tactical Holographic Sight
        const sightBase = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.024, 0.12), blackSteelMat);
        sightBase.position.set(0, 0.012, 0);
        opticGroup.add(sightBase);

        const sightHood = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.062, 0.095), blackSteelMat);
        sightHood.position.set(0, 0.052, 0);
        opticGroup.add(sightHood);

        const sightGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.046, 0.048), glassMat);
        sightGlass.position.set(0, 0.052, 0);
        opticGroup.add(sightGlass);

        const reticlePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.042, 0.042), reticleMat);
        reticlePlane.position.set(0, 0.052, -0.002);
        reticlePlane.name = 'reticle';
        opticGroup.add(reticlePlane);

        const battCap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.085, 12), blackSteelMat);
        battCap.rotateX(Math.PI / 2);
        battCap.position.set(0.034, 0.022, 0);
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
        // --- M4A1 MODULAR ASSAULT RIFLE (MW STYLE) ---
        // 1. Lower Receiver with trigger guard, mag release, and magwell flare
        const receiverGeo = new THREE.BoxGeometry(0.068, 0.115, 0.32);
        const receiver = new THREE.Mesh(receiverGeo, metalMat);
        receiver.position.set(0, 0, 0);
        weaponGroup.add(receiver);

        // Ambidextrous Fire Selector & Trigger
        const selector = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.075, 8), blackSteelMat);
        selector.rotateZ(Math.PI / 2);
        selector.position.set(0, -0.015, 0.08);
        const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.035, 0.015), blackSteelMat);
        trigger.rotation.x = -0.3;
        trigger.position.set(0, -0.05, 0.04);
        weaponGroup.add(selector, trigger);

        // Upper Receiver top riser + Full-length Picatinny Top Rail
        const topRailGeo = new THREE.BoxGeometry(0.038, 0.022, 0.44);
        const topRail = new THREE.Mesh(topRailGeo, blackSteelMat);
        topRail.position.set(0, 0.068, -0.03);
        weaponGroup.add(topRail);

        // Shell Ejection Port, Brass Deflector & Dust Cover
        const dustCover = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.028, 0.08), blackSteelMat);
        dustCover.position.set(0.036, 0.02, 0.02);
        const brassDeflector = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.024, 0.03), metalMat);
        brassDeflector.position.set(0.038, 0.02, 0.07);
        const brassShell = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.04, 8), goldAccentMat);
        brassShell.rotateX(Math.PI / 2);
        brassShell.position.set(0.034, 0.02, 0.02);
        weaponGroup.add(dustCover, brassDeflector, brassShell);

        // Forward Assist housing & plunger
        const fwdAssist = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.04, 8), blackSteelMat);
        fwdAssist.rotateZ(Math.PI / 4);
        fwdAssist.position.set(0.042, 0.04, 0.08);
        weaponGroup.add(fwdAssist);

        // Ping-Pong Bolt Catch Release Paddle (Left Side)
        const boltCatch = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.035, 0.025), blackSteelMat);
        boltCatch.position.set(-0.036, 0.025, 0.01);
        boltCatch.name = 'bolt_catch';
        weaponGroup.add(boltCatch);

        // Radian Raptor Ambidextrous Charging Handle (Rear Top)
        const chargeHandle = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.014, 0.035), blackSteelMat);
        chargeHandle.position.set(0, 0.07, 0.16);
        chargeHandle.name = 'charging_handle';
        weaponGroup.add(chargeHandle);

        // 2. Geissele MK16 M-LOK Free-Float Handguard
        const handguardGeo = new THREE.BoxGeometry(0.064, 0.086, 0.42);
        const handguard = new THREE.Mesh(handguardGeo, metalMat);
        handguard.position.set(0, 0.012, -0.36);
        weaponGroup.add(handguard);

        // M-LOK vent cutouts (dark recessed insets)
        for (let i = 0; i < 5; i++) {
          const ventL = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.016, 0.045), blackSteelMat);
          ventL.position.set(-0.033, 0.012, -0.22 - i * 0.065);
          const ventR = ventL.clone();
          ventR.position.x = 0.033;
          weaponGroup.add(ventL, ventR);
        }

        // BCM Gunfighter Angled Tactical Foregrip
        const afg = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.075, 0.12), polymerMat);
        afg.position.set(0, -0.062, -0.36);
        afg.rotation.x = -0.35;
        weaponGroup.add(afg);

        // 3. Chrome-Moly Heavy Barrel & Surefire SOCOM556 Blast Diffuser
        const barrelGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.54, 16);
        barrelGeo.rotateX(Math.PI / 2);
        const barrel = new THREE.Mesh(barrelGeo, blackSteelMat);
        barrel.position.set(0, 0.018, -0.58);
        weaponGroup.add(barrel);

        const surefireWarden = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.022, 0.11, 14), blackSteelMat);
        surefireWarden.rotateX(Math.PI / 2);
        surefireWarden.position.set(0, 0.018, -0.86);
        weaponGroup.add(surefireWarden);

        // 4. Modular Optic Attachment
        const opticMesh = ModelFactory.createOpticMesh(optic || 'holo_553', reticleColor, reticleStyle);
        opticMesh.position.set(0, 0.08, -0.04);
        weaponGroup.add(opticMesh);

        // 5. P-MAG 30-round 5.56 Magazine with Round Window (Animated Bone)
        const magGroup = new THREE.Group();
        magGroup.name = 'magazine';
        const magGeo = new THREE.BoxGeometry(0.038, 0.24, 0.11);
        const mag = new THREE.Mesh(magGeo, polymerMat);
        mag.position.set(0, -0.15, -0.05);
        mag.rotation.x = -0.16;
        magGroup.add(mag);

        // Mag viewing window with brass cartridges visible
        const magWin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.13, 0.022), goldAccentMat);
        magWin.position.set(0, -0.15, -0.05);
        magWin.rotation.x = -0.16;
        magGroup.add(magWin);
        weaponGroup.add(magGroup);

        // 6. Ergonomic Magpul MOE Pistol Grip
        const gripGeo = new THREE.BoxGeometry(0.044, 0.165, 0.075);
        const grip = new THREE.Mesh(gripGeo, polymerMat);
        grip.position.set(0, -0.115, 0.12);
        grip.rotation.x = 0.36;
        weaponGroup.add(grip);

        // 7. Tactical SOPMOD Crane Stock & Mil-Spec Buffer Tube
        const bufferTubeGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.28, 16);
        bufferTubeGeo.rotateX(Math.PI / 2);
        const bufferTube = new THREE.Mesh(bufferTubeGeo, blackSteelMat);
        bufferTube.position.set(0, 0.016, 0.29);
        weaponGroup.add(bufferTube);

        const stockPadGeo = new THREE.BoxGeometry(0.058, 0.155, 0.2);
        const stockPad = new THREE.Mesh(stockPadGeo, polymerMat);
        stockPad.position.set(0, -0.015, 0.36);
        weaponGroup.add(stockPad);

        // 8. AN/PEQ-15 Tactical Laser / IR Illuminator with Pressure Pad
        const peqGeo = new THREE.BoxGeometry(0.048, 0.028, 0.11);
        const peq = new THREE.Mesh(peqGeo, polymerMat);
        peq.position.set(0.044, 0.042, -0.34);
        const peqLens = new THREE.Mesh(new THREE.CircleGeometry(0.008, 12), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
        peqLens.position.set(0.044, 0.042, -0.396);
        peqLens.rotateY(Math.PI);
        peqLens.name = 'laser_emitter';
        weaponGroup.add(peq, peqLens);
        break;
      }

      case 'mp5': {
        // --- MP5 / LACHMANN SUB 9MM SMG (MW STYLE) ---
        // Stamped Steel Upper Receiver with Weld Seams
        const upperGeo = new THREE.CylinderGeometry(0.034, 0.034, 0.4, 16);
        upperGeo.rotateX(Math.PI / 2);
        const upper = new THREE.Mesh(upperGeo, metalMat);
        weaponGroup.add(upper);

        // Cocking Tube with HK Slap Notch Track
        const cockingTube = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.38, 14), blackSteelMat);
        cockingTube.rotateX(Math.PI / 2);
        cockingTube.position.set(0, 0.038, -0.17);
        
        // Reciprocating / Slappable Cocking Handle (Left Side)
        const cockingHandle = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.016, 0.028), blackSteelMat);
        cockingHandle.position.set(-0.028, 0.044, -0.3);
        cockingHandle.name = 'cocking_handle';
        weaponGroup.add(cockingTube, cockingHandle);

        // Navy Trigger Group Lower with 4-Position Pictograph Selector
        const lower = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.095, 0.24), polymerMat);
        lower.position.set(0, -0.052, 0.04);
        weaponGroup.add(lower);

        // Ribbed Tropical Forend Handguard with Tactical Light Bezel
        const forend = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.046, 0.24, 16), polymerMat);
        forend.rotateX(Math.PI / 2);
        forend.position.set(0, -0.012, -0.23);
        weaponGroup.add(forend);

        // 9mm Match Barrel + 3-Lug Tri-Lug Flash Hider
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.26, 12), blackSteelMat);
        barrel.rotateX(Math.PI / 2);
        barrel.position.set(0, 0.002, -0.42);
        const muzzle3Lug = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.07, 12), blackSteelMat);
        muzzle3Lug.rotateX(Math.PI / 2);
        muzzle3Lug.position.set(0, 0.002, -0.53);
        weaponGroup.add(barrel, muzzle3Lug);

        // Curved 30-round 9mm Steel Magazine (Animated Bone)
        const magGroup = new THREE.Group();
        magGroup.name = 'magazine';
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.26, 0.07), blackSteelMat);
        mag.position.set(0, -0.16, -0.08);
        mag.rotation.x = -0.24;
        magGroup.add(mag);
        weaponGroup.add(magGroup);

        // Ergonomic Navy Pistol Grip
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.155, 0.068), polymerMat);
        grip.position.set(0, -0.115, 0.1);
        grip.rotation.x = 0.36;
        weaponGroup.add(grip);

        // A3 Retractable Twin-Wire Stock with Textured Buttplate
        const stockRailL = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.016, 0.32), blackSteelMat);
        stockRailL.position.set(-0.032, -0.01, 0.23);
        const stockRailR = stockRailL.clone();
        stockRailR.position.x = 0.032;
        const stockButt = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.135, 0.024), polymerMat);
        stockButt.position.set(0, -0.032, 0.39);
        weaponGroup.add(stockRailL, stockRailR, stockButt);

        // HK Rotating Drum Diopter Rear Sight & Front Hooded Post with Tritium Dot
        const rearDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.024, 12), blackSteelMat);
        rearDrum.position.set(0, 0.048, 0.12);
        const frontHood = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 8, 16), blackSteelMat);
        frontHood.position.set(0, 0.046, -0.34);
        const frontPost = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.015, 6), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
        frontPost.position.set(0, 0.046, -0.34);
        weaponGroup.add(rearDrum, frontHood, frontPost);
        break;
      }

      case 'sniper': {
        // --- AX-50 / BARRETT MRAD .50 CAL HEAVY ANTI-MATERIAL RIFLE ---
        // Heavy Monolithic CNC Octagonal Chassis
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.084, 0.148, 0.6), metalMat);
        weaponGroup.add(body);

        // Massive Heavy Fluted Bull Barrel
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.92, 16), blackSteelMat);
        barrel.rotateX(Math.PI / 2);
        barrel.position.set(0, 0.022, -0.74);
        weaponGroup.add(barrel);

        // Barrel Fluting grooves (spiral cooling flutes)
        for (let i = 0; i < 6; i++) {
          const fluting = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, 0.65), metalMat);
          const angle = (i * Math.PI) / 3;
          fluting.position.set(Math.cos(angle) * 0.026, 0.022 + Math.sin(angle) * 0.026, -0.7);
          weaponGroup.add(fluting);
        }

        // Multi-Chamber Tactical Tank Muzzle Brake (Triple Port)
        const brake = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.058, 0.18), blackSteelMat);
        brake.position.set(0, 0.022, -1.26);
        weaponGroup.add(brake);

        // Modular Scope Mount & Optic
        const sniperOptic = ModelFactory.createOpticMesh(optic || 'sniper_variable', reticleColor, reticleStyle);
        sniperOptic.position.set(0, 0.08, -0.05);
        weaponGroup.add(sniperOptic);

        // Folded Harris Alloy Tactical Bipod
        const bipodBase = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.034, 0.06), blackSteelMat);
        bipodBase.position.set(0, -0.055, -0.64);
        const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.3, 8), blackSteelMat);
        legL.position.set(-0.068, -0.18, -0.64);
        legL.rotation.z = 0.32;
        const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.3, 8), blackSteelMat);
        legR.position.set(0.068, -0.18, -0.64);
        legR.rotation.z = -0.32;
        weaponGroup.add(bipodBase, legL, legR);

        // Straight-pull Tactical Bolt Carrier & Knurled Bolt Handle (Animated Part)
        const boltGroup = new THREE.Group();
        boltGroup.name = 'bolt_carrier';
        const boltStem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.065, 8), blackSteelMat);
        boltStem.rotateZ(Math.PI / 2);
        boltStem.position.set(0.052, 0.06, 0.06);
        const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), blackSteelMat);
        boltKnob.position.set(0.085, 0.06, 0.06);
        boltKnob.name = 'bolt_handle';
        boltGroup.add(boltStem, boltKnob);
        weaponGroup.add(boltGroup);

        // Heavy .50 BMG Steel Box Magazine (Animated Bone)
        const magGroup = new THREE.Group();
        magGroup.name = 'magazine';
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.25, 0.16), blackSteelMat);
        mag.position.set(0, -0.165, -0.08);
        magGroup.add(mag);
        weaponGroup.add(magGroup);

        // Skeletonized Precision Stock with Adjustable Cheek Pad & Monopod
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.17, 0.4), polymerMat);
        stock.position.set(0, -0.02, 0.46);
        const cheekRiser = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.038, 0.18), polymerMat);
        cheekRiser.position.set(0, 0.075, 0.42);
        weaponGroup.add(stock, cheekRiser);

        // Ergonomic Grip
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.165, 0.075), polymerMat);
        grip.position.set(0, -0.135, 0.16);
        grip.rotation.x = 0.32;
        weaponGroup.add(grip);
        break;
      }

      case 'shotgun': {
        // --- MODEL 680 BREACHER COMBAT SHOTGUN (MW STYLE) ---
        // Matte Parkerized Steel Receiver
        const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.118, 0.38), metalMat);
        weaponGroup.add(receiver);

        // 12-Gauge Barrel & Under-barrel Magazine Tube
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.6, 16), blackSteelMat);
        barrel.rotateX(Math.PI / 2);
        barrel.position.set(0, 0.032, -0.47);
        const magTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.56, 16), blackSteelMat);
        magTube.rotateX(Math.PI / 2);
        magTube.position.set(0, -0.016, -0.45);
        weaponGroup.add(barrel, magTube);

        // Perforated Steel Barrel Heat Shield
        const heatShield = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.34, 12, 1, true, 0, Math.PI), blackSteelMat);
        heatShield.rotateX(Math.PI / 2);
        heatShield.position.set(0, 0.038, -0.4);
        weaponGroup.add(heatShield);

        // Magpul MOE Pump-Action Forend with Tactile Ridges (Animated Part)
        const pumpGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.24, 16);
        pumpGeo.rotateX(Math.PI / 2);
        const pump = new THREE.Mesh(pumpGeo, polymerMat);
        pump.position.set(0, -0.016, -0.42);
        pump.name = 'pump_handle';
        weaponGroup.add(pump);

        // Side Saddle with 6 Individually Modeled Red Hull 12GA Shells
        const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.068, 0.25), polymerMat);
        saddle.position.set(-0.046, 0.01, 0);
        weaponGroup.add(saddle);
        for (let i = 0; i < 6; i++) {
          const shellBody = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.055, 10), new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3 }));
          shellBody.position.set(-0.056, 0.01, -0.088 + i * 0.035);
          const shellRim = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 10), goldAccentMat);
          shellRim.position.set(-0.056, 0.032, -0.088 + i * 0.035);
          weaponGroup.add(shellBody, shellRim);
        }

        // Breaching Standoff Spiked Choke (Crenellated Jagged Crown)
        const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.09, 14), blackSteelMat);
        muzzle.rotateX(Math.PI / 2);
        muzzle.position.set(0, 0.032, -0.81);
        weaponGroup.add(muzzle);

        // Tactical Fixed Stock & MOE Grip
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.135, 0.36), polymerMat);
        stock.position.set(0, -0.042, 0.34);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.155, 0.068), polymerMat);
        grip.position.set(0, -0.115, 0.13);
        grip.rotation.x = 0.36;
        weaponGroup.add(stock, grip);
        break;
      }

      case 'deagle': {
        // --- DESERT EAGLE .50 GS HAND CANNON (MW STYLE) ---
        // Heavy Sculpted Stainless Steel Slide with Cocking Serrations (Animated Part)
        const slideGeo = new THREE.BoxGeometry(0.054, 0.07, 0.32);
        const slide = new THREE.Mesh(slideGeo, camo === 'gold' ? goldAccentMat : metalMat);
        slide.position.set(0, 0.042, -0.04);
        slide.name = 'pistol_slide';
        weaponGroup.add(slide);

        // Deep Slide Cocking Serrations (Front & Rear Cuts)
        for (let i = 0; i < 6; i++) {
          const cutL = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.042, 0.01), blackSteelMat);
          cutL.position.set(-0.028, 0.042, 0.04 - i * 0.018);
          const cutR = cutL.clone();
          cutR.position.x = 0.028;
          weaponGroup.add(cutL, cutR);
        }

        // .50 Action Express Polygonal Rifled Barrel & Top Weaver Rail
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.32, 16), blackSteelMat);
        barrel.rotateX(Math.PI / 2);
        barrel.position.set(0, 0.042, -0.07);
        weaponGroup.add(barrel);

        // Heavy Steel Frame & Extended Beavertail
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.064, 0.26), blackSteelMat);
        frame.position.set(0, -0.012, -0.02);
        weaponGroup.add(frame);

        // 7-round .50 AE Steel Magazine (Animated Bone)
        const magGroup = new THREE.Group();
        magGroup.name = 'magazine';
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.22, 0.075), blackSteelMat);
        mag.position.set(0, -0.12, 0.06);
        mag.rotation.x = 0.29;
        magGroup.add(mag);
        weaponGroup.add(magGroup);

        // Hogue Rubberized Finger-Groove Combat Grip Panels
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.165, 0.088), polymerMat);
        grip.position.set(0, -0.095, 0.06);
        grip.rotation.x = 0.29;
        weaponGroup.add(grip);

        // Skeletonized Commander Hammer
        const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.034, 0.022), blackSteelMat);
        hammer.position.set(0, 0.044, 0.12);
        hammer.rotation.x = -0.4;
        hammer.name = 'hammer';
        weaponGroup.add(hammer);

        // High-Visibility 3-Dot Glowing Green Tritium Sights
        const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.02, 0.022), blackSteelMat);
        frontSight.position.set(0, 0.086, -0.18);
        const frontDot = new THREE.Mesh(new THREE.SphereGeometry(0.003, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
        frontDot.position.set(0, 0.092, -0.17);

        const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.02, 0.016), blackSteelMat);
        rearSight.position.set(0, 0.086, 0.1);
        const rearDotL = new THREE.Mesh(new THREE.SphereGeometry(0.003, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
        rearDotL.position.set(-0.01, 0.092, 0.092);
        const rearDotR = rearDotL.clone();
        rearDotR.position.x = 0.01;

        weaponGroup.add(frontSight, frontDot, rearSight, rearDotL, rearDotR);
        break;
      }
    }

    return weaponGroup;
  }

  // --- AAA VIEWMODEL ARMS & ARTICULATED TACTICAL OPERATOR GLOVES ---
  public static createViewmodelArms(): THREE.Group {
    const armsGroup = new THREE.Group();
    armsGroup.name = 'viewmodel_arms';

    const gloveTexture = TextureGenerator.createTacticalGloveTexture();
    const sleeveTexture = TextureGenerator.createOperatorUniformTexture('allies_multicam');
    const watchTexture = TextureGenerator.createSmartWatchTexture('10:42:15', 118);

    const gloveMat = new THREE.MeshStandardMaterial({
      map: gloveTexture,
      roughness: 0.7,
      metalness: 0.15,
    });

    const knuckleMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.8,
    });

    const sleeveMat = new THREE.MeshStandardMaterial({
      map: sleeveTexture,
      roughness: 0.85,
      metalness: 0.05,
    });

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xd4a373,
      roughness: 0.65,
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
      const knuckleGuard = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.016, 0.032), knuckleMat);
      knuckleGuard.position.set(0, 0.02, -0.015);
      knuckleGuard.rotation.x = -0.15;
      handGroup.add(knuckleGuard);

      // 4 Individual Knuckle Protectors
      for (let i = -1.5; i <= 1.5; i++) {
        const kCap = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 8), knuckleMat);
        kCap.scale.set(1, 0.7, 1.2);
        kCap.position.set(i * 0.016, 0.024, -0.015);
        handGroup.add(kCap);
      }

      // Articulated Fingers (Index, Middle, Ring, Pinky)
      const fingerNames = ['index', 'middle', 'ring', 'pinky'];
      fingerNames.forEach((fname, idx) => {
        const fingerGroup = new THREE.Group();
        const posX = isLeft ? (-0.024 + idx * 0.016) : (0.024 - idx * 0.016);
        fingerGroup.position.set(posX, 0.005, -0.04);

        // Proximal phalanx (base segment)
        const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.0065, 0.007, 0.028, 8), gloveMat);
        seg1.rotateX(Math.PI / 2);
        seg1.position.set(0, 0, -0.014);

        // Curled gripping angle depending on hand
        if (!isLeft && idx === 0) {
          // Right trigger finger: extended along trigger guard or hooked on trigger
          seg1.rotation.x = 1.2;
          seg1.position.set(0, -0.008, -0.018);
        } else {
          // Wrapped around grip / handguard
          seg1.rotation.x = 1.5;
          seg1.position.set(0, -0.012, -0.012);
        }

        fingerGroup.add(seg1);
        handGroup.add(fingerGroup);
      });

      // Thumb
      const thumbGroup = new THREE.Group();
      const thumbX = isLeft ? 0.038 : -0.038;
      thumbGroup.position.set(thumbX, -0.005, 0.01);
      thumbGroup.rotation.y = isLeft ? -0.6 : 0.6;
      thumbGroup.rotation.z = isLeft ? 0.4 : -0.4;

      const thumbSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.0085, 0.034, 8), gloveMat);
      thumbSeg.rotateX(Math.PI / 2);
      thumbSeg.position.set(0, 0, -0.016);
      thumbGroup.add(thumbSeg);
      handGroup.add(thumbGroup);

      // Glove Wrist Cuff with Velcro Adjustment Strap
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.035, 12), strapMat);
      cuff.position.set(0, 0, 0.05);
      cuff.rotateX(Math.PI / 2);
      handGroup.add(cuff);

      return handGroup;
    };

    // --- RIGHT ARM (TRIGGER ARM & FIRING CONTROL) ---
    const rightArmGroup = new THREE.Group();
    rightArmGroup.name = 'right_arm_group';
    rightArmGroup.position.set(0.19, -0.19, 0.22);

    // Anatomical Forearm & Multicam Sleeve
    const rightSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.068, 0.38, 14), sleeveMat);
    rightSleeve.position.set(0, -0.12, 0.15);
    rightSleeve.rotation.x = 0.82;
    rightSleeve.rotation.z = -0.08;
    rightArmGroup.add(rightSleeve);

    // Rolled Sleeve Fabric Cuff Fold
    const rightCuffFold = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 16), sleeveMat);
    rightCuffFold.position.set(0, -0.035, 0.05);
    rightCuffFold.rotation.x = 0.82;
    rightArmGroup.add(rightCuffFold);

    // Right Hand
    const rightHand = createArticulatedHand(false);
    rightHand.position.set(0, 0, 0);
    rightArmGroup.add(rightHand);

    // --- LEFT ARM (TACTICAL FOREGRIP / C-CLAMP SUPPORT) ---
    const leftArmGroup = new THREE.Group();
    leftArmGroup.name = 'left_arm_group';
    leftArmGroup.position.set(-0.17, -0.17, -0.14);

    // Forearm & Sleeve
    const leftSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.068, 0.42, 14), sleeveMat);
    leftSleeve.position.set(-0.06, -0.13, 0.2);
    leftSleeve.rotation.x = 0.64;
    leftSleeve.rotation.y = -0.42;
    leftSleeve.rotation.z = 0.12;
    leftArmGroup.add(leftSleeve);

    const leftCuffFold = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 8, 16), sleeveMat);
    leftCuffFold.position.set(-0.02, -0.04, 0.06);
    leftCuffFold.rotation.x = 0.64;
    leftCuffFold.rotation.y = -0.42;
    leftArmGroup.add(leftCuffFold);

    // Left Hand
    const leftHand = createArticulatedHand(true);
    leftHand.position.set(0, 0, 0);
    leftHand.rotation.y = 0.28;
    leftHand.rotation.x = 0.1;
    leftArmGroup.add(leftHand);

    // --- HIGH-TECH TACTICAL SMARTWATCH ON LEFT WRIST ---
    const watchGroup = new THREE.Group();
    watchGroup.name = 'smartwatch_display';
    watchGroup.position.set(-0.01, 0.038, 0.065);
    watchGroup.rotation.x = Math.PI / 2;
    watchGroup.rotation.y = 0.25;

    // Bezel housing
    const watchCase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.012, 20),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.85 })
    );
    watchGroup.add(watchCase);

    // Illuminated OLED Screen
    const watchScreen = new THREE.Mesh(
      new THREE.CircleGeometry(0.024, 20),
      new THREE.MeshStandardMaterial({
        map: watchTexture,
        roughness: 0.1,
        metalness: 0.2,
        emissive: 0x0284c7,
        emissiveIntensity: 0.45,
      })
    );
    watchScreen.position.y = 0.007;
    watchScreen.rotation.x = -Math.PI / 2;
    watchGroup.add(watchScreen);

    // Tactical Silicone Watch Strap
    const watchStrap = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.008, 0.09),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })
    );
    watchStrap.position.set(0, -0.004, 0);
    watchGroup.add(watchStrap);

    leftArmGroup.add(watchGroup);

    armsGroup.add(rightArmGroup, leftArmGroup);
    return armsGroup;
  }

  // --- AAA 3D ENEMY COMBAT OPERATOR MODEL (FACTION & ARCHETYPE DIVERSITY) ---
  public static createBotMesh(
    team: 'allies' | 'axis' = 'axis',
    archetype: 'assault' | 'heavy' | 'sniper' | 'flanker' = 'assault',
    weaponType: WeaponType = 'm4'
  ): THREE.Group {
    const botGroup = new THREE.Group();
    botGroup.name = `bot_${team}_${archetype}`;

    // PBR Textures
    const uniformTexture = TextureGenerator.createOperatorUniformTexture(
      team === 'axis' ? 'axis_shadow' : archetype === 'flanker' ? 'spec_ops' : 'allies_multicam'
    );
    const plateCarrierTexture = TextureGenerator.createPlateCarrierTexture(
      team === 'axis' ? 'black' : 'multicam'
    );
    const gloveTexture = TextureGenerator.createTacticalGloveTexture();

    const uniformMat = new THREE.MeshStandardMaterial({
      map: uniformTexture,
      roughness: 0.8,
      metalness: 0.1,
    });

    const vestMat = new THREE.MeshStandardMaterial({
      map: plateCarrierTexture,
      roughness: 0.65,
      metalness: 0.25,
    });

    const gloveMat = new THREE.MeshStandardMaterial({
      map: gloveTexture,
      roughness: 0.7,
      metalness: 0.2,
    });

    const helmetMat = new THREE.MeshStandardMaterial({
      color: team === 'axis' ? 0x18181b : 0x27272a,
      roughness: 0.45,
      metalness: 0.6,
    });

    const visorColor = team === 'axis' ? 0xef4444 : 0x06b6d4;
    const visorEmissive = team === 'axis' ? 0xb91c1c : 0x0284c7;
    const visorMat = new THREE.MeshStandardMaterial({
      color: visorColor,
      emissive: visorEmissive,
      emissiveIntensity: 0.8,
      roughness: 0.15,
      metalness: 0.9,
    });

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x3f3f46,
      roughness: 0.25,
      metalness: 0.9,
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.3,
      metalness: 0.8,
    });

    const chemLightMat = new THREE.MeshBasicMaterial({
      color: team === 'axis' ? 0xef4444 : 0x10b981,
    });

    // 1. Torso & Ballistic Plate Carrier
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.28), uniformMat);
    torso.position.set(0, 1.25, 0);
    torso.name = 'bot_torso';
    botGroup.add(torso);

    const plateCarrier = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.33), vestMat);
    plateCarrier.position.set(0, 1.3, 0);
    plateCarrier.name = 'bot_plate_carrier';
    botGroup.add(plateCarrier);

    // Front Ceramic Trauma Strike Plate
    const traumaPlate = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.38, 0.04), vestMat);
    traumaPlate.position.set(0, 1.32, 0.18);
    botGroup.add(traumaPlate);

    // 3x Mag Pouches with Brass 5.56 Tips
    for (let i = -1; i <= 1; i++) {
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.07), vestMat);
      pouch.position.set(i * 0.11, 1.22, 0.21);
      const magTop = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.05, 0.05), steelMat);
      magTop.position.set(i * 0.11, 1.31, 0.21);
      const bulletTip = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.02, 8), brassMat);
      bulletTip.rotateX(Math.PI);
      bulletTip.position.set(i * 0.11, 1.35, 0.21);
      botGroup.add(pouch, magTop, bulletTip);
    }

    // Tactical Chem Light (Glow Stick) on Chest
    const chemLight = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8), chemLightMat);
    chemLight.position.set(0.18, 1.38, 0.19);
    chemLight.rotation.z = 0.3;
    botGroup.add(chemLight);

    // Tactical Radio with Whip Antenna on Shoulder
    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.18, 0.08), steelMat);
    radio.position.set(-0.18, 1.42, -0.19);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.003, 0.35, 8), steelMat);
    antenna.position.set(-0.18, 1.68, -0.19);
    botGroup.add(radio, antenna);

    // Archetype Specific Torso Armor Additions
    if (archetype === 'heavy') {
      // Deltoid Shoulder Armor Plates
      const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.18), vestMat);
      shoulderL.position.set(-0.32, 1.45, 0);
      const shoulderR = shoulderL.clone();
      shoulderR.position.x = 0.32;

      // Groin Protection Blast Flap
      const groinFlap = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.04), vestMat);
      groinFlap.position.set(0, 0.88, 0.15);
      botGroup.add(shoulderL, shoulderR, groinFlap);
    }

    // 2. Head, Balaclava, Helmet & NVG Optics
    const headGroup = new THREE.Group();
    headGroup.name = 'bot_head';
    headGroup.position.set(0, 1.72, 0);

    const balaclava = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.24), uniformMat);
    headGroup.add(balaclava);

    // FAST High-Cut Tactical Helmet
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 12), helmetMat);
    helmet.scale.set(1, 0.85, 1.12);
    helmet.position.set(0, 0.06, -0.01);
    helmet.name = 'bot_helmet';
    headGroup.add(helmet);

    // Tactical ARC Rails & ComTac Ear Headsets
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.16), steelMat);
    railL.position.set(-0.16, 0.04, 0);
    const railR = railL.clone();
    railR.position.x = 0.16;

    const earcupL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12), vestMat);
    earcupL.rotateZ(Math.PI / 2);
    earcupL.position.set(-0.14, 0.02, 0);
    const earcupR = earcupL.clone();
    earcupR.position.x = 0.14;

    const boomMic = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.14, 6), steelMat);
    boomMic.rotateX(Math.PI / 2);
    boomMic.rotateZ(0.3);
    boomMic.position.set(-0.12, -0.04, 0.08);

    headGroup.add(railL, railR, earcupL, earcupR, boomMic);

    // Headwear variations by archetype
    if (archetype === 'flanker') {
      // Quad-Tube Panoramic Night Vision Goggles (GPNVG-18)
      const nvgBridge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.06), steelMat);
      nvgBridge.position.set(0, 0.08, 0.18);
      for (let i = -1.5; i <= 1.5; i++) {
        const nvgTube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.02, 0.08, 10), steelMat);
        nvgTube.rotateX(Math.PI / 2);
        nvgTube.position.set(i * 0.045, 0.06, 0.22);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.018, 12), visorMat);
        lens.position.set(i * 0.045, 0.06, 0.265);
        headGroup.add(nvgTube, lens);
      }
      headGroup.add(nvgBridge);
    } else if (archetype === 'heavy') {
      // Heavy Ballistic Visor Face Shield
      const faceShield = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.03), visorMat);
      faceShield.position.set(0, 0.01, 0.15);
      headGroup.add(faceShield);
    } else {
      // Tactical Combat Goggles / Visor
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.065, 0.06), visorMat);
      visor.position.set(0, 0.025, 0.125);
      const nvgMount = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), steelMat);
      nvgMount.position.set(0, 0.12, 0.16);
      headGroup.add(visor, nvgMount);
    }

    botGroup.add(headGroup);

    // 3. Arms & Articulated Tactical Hands
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.6, 12), uniformMat);
    leftArm.position.set(-0.32, 1.2, 0.12);
    leftArm.rotation.x = 0.5;
    leftArm.name = 'bot_left_arm';

    const elbowPadL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 12), vestMat);
    elbowPadL.position.set(0, 0, 0);
    leftArm.add(elbowPadL);

    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.12), gloveMat);
    leftHand.position.set(0, -0.28, 0.02);
    leftArm.add(leftHand);
    botGroup.add(leftArm);

    const rightArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.6, 12), uniformMat);
    rightArm.position.set(0.32, 1.2, 0.15);
    rightArm.rotation.x = 0.7;
    rightArm.name = 'bot_right_arm';

    const elbowPadR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.12, 12), vestMat);
    elbowPadR.position.set(0, 0, 0);
    rightArm.add(elbowPadR);

    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.12), gloveMat);
    rightHand.position.set(0, -0.28, 0.02);
    rightArm.add(rightHand);
    botGroup.add(rightArm);

    // Tactical Battle Belt with Side Holster & Dump Pouch
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.32), vestMat);
    belt.position.set(0, 0.92, 0);

    const sideHolster = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), steelMat);
    sideHolster.position.set(0.26, 0.82, 0.04);
    const sidearmGrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.04), steelMat);
    sidearmGrip.position.set(0.26, 0.92, 0.04);
    sidearmGrip.rotation.z = -0.3;

    const dumpPouch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.1), vestMat);
    dumpPouch.position.set(-0.24, 0.84, -0.06);

    botGroup.add(belt, sideHolster, sidearmGrip, dumpPouch);

    // 4. Legs, Knee Pads & Rugged Combat Boots
    const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.8, 12), uniformMat);
    leftLeg.position.set(-0.14, 0.5, 0);
    leftLeg.name = 'bot_left_leg';

    const kneePadL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.06), vestMat);
    kneePadL.position.set(0, 0, 0.07);
    leftLeg.add(kneePadL);
    botGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.8, 12), uniformMat);
    rightLeg.position.set(0.14, 0.5, 0);
    rightLeg.name = 'bot_right_leg';

    const kneePadR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.06), vestMat);
    kneePadR.position.set(0, 0, 0.07);
    rightLeg.add(kneePadR);
    botGroup.add(rightLeg);

    // Reinforced Combat Boots
    const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.15, 0.24), steelMat);
    leftBoot.position.set(-0.14, 0.08, 0.04);
    const rightBoot = leftBoot.clone();
    rightBoot.position.x = 0.14;
    botGroup.add(leftBoot, rightBoot);

    // 5. Weapon held in hands
    const botRifle = ModelFactory.createWeaponMesh(weaponType, team === 'axis' ? 'standard' : 'woodland');
    botRifle.scale.set(0.72, 0.72, 0.72);
    botRifle.position.set(0.18, 1.15, 0.35);
    botRifle.rotation.y = Math.PI;
    botRifle.name = 'bot_weapon';
    botGroup.add(botRifle);

    return botGroup;
  }
}

