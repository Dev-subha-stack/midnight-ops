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

        // High-Visibility 3-Dot Glowing Green Tritium Combat Sights
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

