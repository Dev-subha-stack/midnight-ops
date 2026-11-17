import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface CustomCharacterModelConfig {
  id: string;
  name: string;
  sourceUrl?: string;
  isLoaded: boolean;
  scaleMultiplier?: number;
  rotationOffsetY?: number;
}

export class CharacterModelLoader {
  private static loader = new GLTFLoader();
  private static modelCache = new Map<string, THREE.Group>();
  private static activeCustomModel: THREE.Group | null = null;
  private static activeCustomModelUrl: string | null = null;
  private static activeCustomModelName: string = 'Vanguard Tier-1 Soldier (Sketchfab/GLB)';
  public static onModelChange?: (model: THREE.Group | null, name: string) => void;
  private static isInitializing: boolean = false;

  public static readonly PRESET_MODELS: {
    id: string;
    name: string;
    url: string;
    description: string;
    badge: string;
    author: string;
    rotationOffsetY: number;
  }[] = [
    {
      id: 'sketchfab_soldier',
      name: 'Vanguard Tier-1 Soldier (Sketchfab / GLB)',
      url: '/models/soldier.glb',
      description: 'Authentic military camouflage combat soldier with tactical vest, helmet, and boots',
      badge: 'SKETCHFAB TOP PICK',
      author: 'Three.js / Sketchfab Assets',
      rotationOffsetY: Math.PI,
    },
    {
      id: 'sketchfab_michelle',
      name: 'Covert Operative Michelle (Sketchfab / GLB)',
      url: '/models/michelle.glb',
      description: 'Special reconnaissance covert agent in urban tactical combat uniform',
      badge: 'SPECOPS TACTICAL',
      author: 'Three.js / Mixamo Assets',
      rotationOffsetY: 0,
    },
    {
      id: 'sketchfab_xbot',
      name: 'Cyber Combat Frame X-Bot (Sketchfab / GLB)',
      url: '/models/xbot.glb',
      description: 'Next-gen autonomous military combat chassis with articulated hydraulics',
      badge: 'CYBER EXOSKELETON',
      author: 'Three.js / Sketchfab Assets',
      rotationOffsetY: 0,
    },
    {
      id: 'khronos_marine',
      name: 'Modern Tier-1 Marine (Khronos GLTF)',
      url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMan/glTF-Binary/CesiumMan.glb',
      description: 'Rigged tactical operative test frame',
      badge: 'KHRONOS MIL-SPEC',
      author: 'Khronos Group',
      rotationOffsetY: 0,
    },
  ];

  /**
   * Automatically initializes the default high-fidelity 3D Soldier model from Sketchfab/GLB assets.
   */
  public static async initDefaultModel(): Promise<THREE.Group | null> {
    if (this.activeCustomModel) {
      return this.getActiveCustomModel();
    }
    if (this.isInitializing) return null;
    this.isInitializing = true;
    try {
      const model = await this.loadModel('/models/soldier.glb', 'Vanguard Tier-1 Soldier (Sketchfab/GLB)');
      this.isInitializing = false;
      return model;
    } catch (err) {
      this.isInitializing = false;
      console.warn('[CharacterModelLoader] Default model load fallback:', err);
      return null;
    }
  }

  /**
   * Load an external GLTF/GLB 3D character model from an online URL or local File blob.
   * Automatically scales the model to 1.80m standard human soldier height, aligns ground contact,
   * and wraps it inside an identity container so BotController.lookAt() faces +Z forward.
   */
  public static async loadModel(urlOrFile: string | File, customName?: string): Promise<THREE.Group | null> {
    let url: string;
    let cacheKey: string;
    let modelName = customName;

    if (urlOrFile instanceof File) {
      url = URL.createObjectURL(urlOrFile);
      cacheKey = `file_${urlOrFile.name}_${urlOrFile.size}`;
      modelName = modelName || urlOrFile.name.replace(/\.[^/.]+$/, '');
    } else {
      url = urlOrFile.trim();
      cacheKey = url;
      modelName = modelName || url.split('/').pop()?.split('?')[0] || 'Custom GLTF Model';
    }

    if (!url) return null;

    if (this.modelCache.has(cacheKey)) {
      const cachedTemplate = this.modelCache.get(cacheKey)!;
      const cached = SkeletonUtils.clone(cachedTemplate) as THREE.Group;
      cached.userData.animations = cachedTemplate.userData.animations || [];
      cached.userData.rotationOffsetY = cachedTemplate.userData.rotationOffsetY ?? 0;
      this.activeCustomModel = cached;
      this.activeCustomModelUrl = url;
      this.activeCustomModelName = modelName;
      this.onModelChange?.(cached, modelName);
      return this.getActiveCustomModel();
    }

    try {
      const gltf = await this.loader.loadAsync(url);
      const root = gltf.scene || gltf.scenes[0];

      if (!root) {
        console.warn('[CharacterModelLoader] No scene found in GLTF asset:', url);
        return null;
      }

      // Compute bounding box and normalize to human height (1.80 meters)
      const box = new THREE.Box3().setFromObject(root);
      const size = new THREE.Vector3();
      box.getSize(size);

      const targetHeight = 1.80; // 1.8 meters tall
      const currentHeight = size.y || 1.0;
      const scaleFactor = targetHeight / currentHeight;

      root.scale.setScalar(scaleFactor);

      // Recompute and ground to zero Y level (feet on floor)
      const groundedBox = new THREE.Box3().setFromObject(root);
      root.position.y -= groundedBox.min.y;

      // Apply preset Y-axis facing offset on the inner root so the outer wrapper faces +Z
      // (Three.js Object3D.lookAt points local +Z toward target)
      const preset = this.PRESET_MODELS.find((p) => p.url === url);
      const rotationOffsetY = preset ? preset.rotationOffsetY : 0;
      root.name = 'model_inner_root';
      root.rotation.y = rotationOffsetY;

      // Enable PCF soft shadows and verify standard materials
      root.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => {
                mat.depthWrite = true;
              });
            } else {
              child.material.depthWrite = true;
            }
          }
        }
      });

      // Outer 1:1 scale wrapper group keeps orientation & hitboxes immune to inner root scale and lookAt()
      const wrapper = new THREE.Group();
      wrapper.name = 'character_model_wrapper';
      wrapper.add(root);

      // Ensure critical hit detection hitboxes exist on wrapper (1:1 meter scale)
      this.ensureTacticalHitboxes(wrapper);
      wrapper.userData.animations = gltf.animations || [];
      wrapper.userData.rotationOffsetY = rotationOffsetY;

      this.modelCache.set(cacheKey, wrapper);
      this.activeCustomModel = wrapper;
      this.activeCustomModelUrl = url;
      this.activeCustomModelName = modelName;
      this.onModelChange?.(wrapper, modelName);

      return this.getActiveCustomModel();
    } catch (err) {
      console.error('[CharacterModelLoader] Failed to load 3D character model:', err);
      return null;
    }
  }

  /**
   * Flips the currently active 3D character model 180 degrees around Y axis (useful for custom Sketchfab imports).
   */
  public static flipActiveModel180(): void {
    if (!this.activeCustomModel) return;
    const inner = this.activeCustomModel.getObjectByName('model_inner_root') || this.activeCustomModel.children[0];
    if (inner) {
      inner.rotation.y = (inner.rotation.y + Math.PI) % (Math.PI * 2);
      this.activeCustomModel.userData.rotationOffsetY = inner.rotation.y;
    }
    if (this.activeCustomModelUrl && this.modelCache.has(this.activeCustomModelUrl)) {
      const cached = this.modelCache.get(this.activeCustomModelUrl)!;
      const cachedInner = cached.getObjectByName('model_inner_root') || cached.children[0];
      if (cachedInner) {
        cachedInner.rotation.y = (cachedInner.rotation.y + Math.PI) % (Math.PI * 2);
        cached.userData.rotationOffsetY = cachedInner.rotation.y;
      }
    }
    this.onModelChange?.(this.activeCustomModel, this.activeCustomModelName);
  }

  /**
   * Adds invisible proxy collision boxes for head, torso, and limbs if not present in imported GLTF
   */
  private static ensureTacticalHitboxes(root: THREE.Group) {
    const invisibleMat = new THREE.MeshBasicMaterial({
      visible: false,
      wireframe: false,
    });

    if (!root.getObjectByName('bot_head')) {
      const headBox = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), invisibleMat);
      headBox.name = 'bot_head';
      headBox.position.set(0, 1.62, 0);
      root.add(headBox);
    }

    if (!root.getObjectByName('bot_torso')) {
      const torsoBox = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.52, 0.30), invisibleMat);
      torsoBox.name = 'bot_torso';
      torsoBox.position.set(0, 1.08, 0);
      root.add(torsoBox);
    }

    if (!root.getObjectByName('bot_left_leg')) {
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.20), invisibleMat);
      legL.name = 'bot_left_leg';
      legL.position.set(-0.16, 0.44, 0);
      root.add(legL);
    }

    if (!root.getObjectByName('bot_right_leg')) {
      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.8, 0.20), invisibleMat);
      legR.name = 'bot_right_leg';
      legR.position.set(0.16, 0.44, 0);
      root.add(legR);
    }
  }

  public static hasCustomModel(): boolean {
    return this.activeCustomModel !== null;
  }

  public static getActiveModelName(): string {
    return this.activeCustomModelName;
  }

  public static getActiveCustomModel(): THREE.Group | null {
    if (!this.activeCustomModel) return null;
    try {
      const cloned = SkeletonUtils.clone(this.activeCustomModel) as THREE.Group;
      cloned.userData.animations = this.activeCustomModel.userData.animations || [];
      cloned.userData.rotationOffsetY = this.activeCustomModel.userData.rotationOffsetY ?? 0;
      return cloned;
    } catch {
      const cloned = this.activeCustomModel.clone(true);
      cloned.userData.animations = this.activeCustomModel.userData.animations || [];
      cloned.userData.rotationOffsetY = this.activeCustomModel.userData.rotationOffsetY ?? 0;
      return cloned;
    }
  }

  public static getActiveCustomModelUrl(): string | null {
    return this.activeCustomModelUrl;
  }

  public static removeCustomModel(): void {
    this.activeCustomModel = null;
    this.activeCustomModelUrl = null;
    this.activeCustomModelName = 'Procedural Tier-1 Operator';
    this.onModelChange?.(null, 'Procedural Tier-1 Operator');
  }

  public static clearCache() {
    this.modelCache.clear();
    this.activeCustomModel = null;
    this.activeCustomModelUrl = null;
    this.activeCustomModelName = 'Procedural Tier-1 Operator';
  }
}
