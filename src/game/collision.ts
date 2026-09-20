import * as THREE from 'three';
import { MapObstacle } from './map';

export class CollisionSystem {
  private static tempVec = new THREE.Vector3();
  private static tempBox = new THREE.Box3();
  private static tempRay = new THREE.Ray();

  /**
   * Resolves cylinder collision against map obstacle AABBs & OBBs (oriented bounding boxes)
   * and pushes entity out along contact normal.
   * Allows smooth, responsive sliding along walls, crates, shipping containers, and catwalks.
   */
  public static resolveEntityCollision(
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    radius: number,
    eyeHeight: number,
    obstacles: MapObstacle[]
  ): boolean {
    let hadCollision = false;
    const footY = pos.y - eyeHeight;
    const headY = Math.max(pos.y + 0.2, footY + 1.85);

    // Up to 5 relaxation iterations for clean corner and compound collision resolution
    for (let iter = 0; iter < 5; iter++) {
      let resolvedInIteration = false;

      for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        if (!obs.box) continue;

        // Quick vertical overlap check
        const bMin = obs.box.min;
        const bMax = obs.box.max;
        if (headY < bMin.y - 0.05 || footY > bMax.y - 0.05) {
          continue;
        }

        // Unified OBB / AABB resolution for all obstacles with position & size
        if (obs.pos && obs.size) {
          const halfX = obs.size.x / 2;
          const halfZ = obs.size.z / 2;
          const halfY = obs.size.y / 2;
          const obsMinY = obs.pos.y - halfY;
          const obsMaxY = obs.pos.y + halfY;

          // Vertical clearance check
          if (headY < obsMinY + 0.05 || footY > obsMaxY - 0.05) continue;

          // Transform entity (X, Z) into obstacle's local coordinate space
          // In Three.js: worldX = localX * cos(rot) + localZ * sin(rot)
          //              worldZ = -localX * sin(rot) + localZ * cos(rot)
          // Inverse (world -> local):
          //              localX = relX * cos(rot) - relZ * sin(rot)
          //              localZ = relX * sin(rot) + relZ * cos(rot)
          const rot = obs.rot || 0;
          const cosR = Math.cos(rot);
          const sinR = Math.sin(rot);

          const relX = pos.x - obs.pos.x;
          const relZ = pos.z - obs.pos.z;

          const localX = relX * cosR - relZ * sinR;
          const localZ = relX * sinR + relZ * cosR;

          // Clamp to local box boundaries to find closest surface point
          const closestLocalX = Math.max(-halfX, Math.min(localX, halfX));
          const closestLocalZ = Math.max(-halfZ, Math.min(localZ, halfZ));

          const locDx = localX - closestLocalX;
          const locDz = localZ - closestLocalZ;
          const distSq = locDx * locDx + locDz * locDz;

          if (distSq < radius * radius) {
            hadCollision = true;
            resolvedInIteration = true;
            const dist = Math.sqrt(distSq);

            let pushLocalX = 0;
            let pushLocalZ = 0;

            if (dist > 0.0001) {
              // Outside or touching corner: normal points radially away from closest point
              const penetration = radius - dist;
              pushLocalX = (locDx / dist) * penetration;
              pushLocalZ = (locDz / dist) * penetration;
            } else {
              // Deep inside the box (penetrated across face or corner)
              const dLeft = localX - (-halfX); // dist to -X wall
              const dRight = halfX - localX;   // dist to +X wall
              const dBack = localZ - (-halfZ); // dist to -Z wall
              const dFront = halfZ - localZ;   // dist to +Z wall

              const minX = Math.min(dLeft, dRight);
              const minZ = Math.min(dBack, dFront);

              // If close to a corner on both axes, eject out past the corner
              if (minX < radius && minZ < radius) {
                const targetX = localX >= 0 ? (halfX + radius + 0.02) : (-halfX - radius - 0.02);
                const targetZ = localZ >= 0 ? (halfZ + radius + 0.02) : (-halfZ - radius - 0.02);
                pushLocalX = targetX - localX;
                pushLocalZ = targetZ - localZ;
              } else if (minX < minZ) {
                // Eject along X
                pushLocalX = (localX >= 0) ? (halfX + radius + 0.02 - localX) : (-halfX - radius - 0.02 - localX);
                pushLocalZ = 0;
              } else {
                // Eject along Z
                pushLocalX = 0;
                pushLocalZ = (localZ >= 0) ? (halfZ + radius + 0.02 - localZ) : (-halfZ - radius - 0.02 - localZ);
              }
            }

            // Rotate push vector back to world space
            // worldX = localX * cos(rot) + localZ * sin(rot)
            // worldZ = -localX * sin(rot) + localZ * cos(rot)
            const pushWorldX = pushLocalX * cosR + pushLocalZ * sinR;
            const pushWorldZ = -pushLocalX * sinR + pushLocalZ * cosR;

            pos.x += pushWorldX;
            pos.z += pushWorldZ;

            // Project and eliminate incoming velocity along contact normal
            const pushLen = Math.hypot(pushWorldX, pushWorldZ);
            if (pushLen > 0.0001) {
              const nx = pushWorldX / pushLen;
              const nz = pushWorldZ / pushLen;
              const dot = vel.x * nx + vel.z * nz;
              if (dot < 0) {
                vel.x -= dot * nx;
                vel.z -= dot * nz;
              }
            }
          }
          continue;
        }

        // Standard Axis-Aligned Box (AABB) Fallback for obstacles without explicit pos/size
        const min = obs.box.min;
        const max = obs.box.max;

        const closestX = Math.max(min.x, Math.min(pos.x, max.x));
        const closestZ = Math.max(min.z, Math.min(pos.z, max.z));

        const dx = pos.x - closestX;
        const dz = pos.z - closestZ;
        const distSq = dx * dx + dz * dz;

        if (distSq < radius * radius) {
          hadCollision = true;
          resolvedInIteration = true;
          const dist = Math.sqrt(distSq);

          if (dist > 0.0001) {
            const nx = dx / dist;
            const nz = dz / dist;
            const penetration = radius - dist;

            pos.x += nx * penetration;
            pos.z += nz * penetration;

            const normalDotVel = vel.x * nx + vel.z * nz;
            if (normalDotVel < 0) {
              vel.x -= normalDotVel * nx;
              vel.z -= normalDotVel * nz;
            }
          } else {
            const distMinX = Math.abs(pos.x - min.x);
            const distMaxX = Math.abs(max.x - pos.x);
            const distMinZ = Math.abs(pos.z - min.z);
            const distMaxZ = Math.abs(max.z - pos.z);

            const minX = Math.min(distMinX, distMaxX);
            const minZ = Math.min(distMinZ, distMaxZ);

            if (minX < radius && minZ < radius) {
              pos.x = (distMinX < distMaxX ? min.x - radius - 0.02 : max.x + radius + 0.02);
              pos.z = (distMinZ < distMaxZ ? min.z - radius - 0.02 : max.z + radius + 0.02);
              if (distMinX < distMaxX && vel.x > 0) vel.x = 0;
              if (distMinX >= distMaxX && vel.x < 0) vel.x = 0;
              if (distMinZ < distMaxZ && vel.z > 0) vel.z = 0;
              if (distMinZ >= distMaxZ && vel.z < 0) vel.z = 0;
            } else if (minX < minZ) {
              if (distMinX < distMaxX) {
                pos.x = min.x - radius - 0.02;
                if (vel.x > 0) vel.x = 0;
              } else {
                pos.x = max.x + radius + 0.02;
                if (vel.x < 0) vel.x = 0;
              }
            } else {
              if (distMinZ < distMaxZ) {
                pos.z = min.z - radius - 0.02;
                if (vel.z > 0) vel.z = 0;
              } else {
                pos.z = max.z + radius + 0.02;
                if (vel.z < 0) vel.z = 0;
              }
            }
          }
        }
      }

      if (!resolvedInIteration) break;
    }

    return hadCollision;
  }

  /**
   * Returns the highest solid walkable surface under an entity's feet (e.g. shipping container roofs,
   * catwalks, crates, sandbags), or 0 for ground level.
   */
  public static getGroundElevation(
    pos: THREE.Vector3,
    radius: number,
    eyeHeight: number,
    obstacles: MapObstacle[]
  ): number {
    let maxElevation = 0;
    const feetY = pos.y - eyeHeight;

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (!obs.box) continue;

      const topY = obs.box.max.y;
      // Only consider surfaces that are under or just at feet level (stepping threshold 0.35m)
      if (topY > feetY + 0.35 || topY < 0.1) continue;

      if (obs.pos && obs.size) {
        const rot = obs.rot || 0;
        const halfX = obs.size.x / 2 + radius * 0.4;
        const halfZ = obs.size.z / 2 + radius * 0.4;

        const relX = pos.x - obs.pos.x;
        const relZ = pos.z - obs.pos.z;
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);
        const localX = relX * cosR - relZ * sinR;
        const localZ = relX * sinR + relZ * cosR;

        if (Math.abs(localX) <= halfX && Math.abs(localZ) <= halfZ) {
          if (topY > maxElevation) {
            maxElevation = topY;
          }
        }
      } else {
        const minX = obs.box.min.x - radius * 0.4;
        const maxX = obs.box.max.x + radius * 0.4;
        const minZ = obs.box.min.z - radius * 0.4;
        const maxZ = obs.box.max.z + radius * 0.4;

        if (pos.x >= minX && pos.x <= maxX && pos.z >= minZ && pos.z <= maxZ) {
          if (topY > maxElevation) {
            maxElevation = topY;
          }
        }
      }
    }

    return maxElevation;
  }

  /**
   * Raycasts between two points against obstacles and volumetric smoke clouds to guarantee
   * enemies and bullets never penetrate solid walls, and enemies cannot see through smoke.
   */
  public static checkLineOfSight(
    fromPos: THREE.Vector3,
    toPos: THREE.Vector3,
    obstacles: MapObstacle[],
    smokeClouds?: { position: THREE.Vector3; radius: number; duration: number }[]
  ): { isClear: boolean; hitDist: number; hitPoint: THREE.Vector3 | null; hitObject: THREE.Object3D | null; isBlockedBySmoke?: boolean } {
    const dir = new THREE.Vector3().subVectors(toPos, fromPos);
    const totalDist = dir.length();
    if (totalDist < 0.001) {
      return { isClear: true, hitDist: 0, hitPoint: null, hitObject: null };
    }
    dir.normalize();

    // 0. Check Volumetric Smoke Clouds (blocks vision)
    if (smokeClouds && smokeClouds.length > 0) {
      const ray = new THREE.Ray(fromPos, dir);
      for (const cloud of smokeClouds) {
        if (cloud.radius < 1.5 || cloud.duration < 1.0) continue;
        const cloudCenter = cloud.position.clone().add(new THREE.Vector3(0, 1.4, 0));
        const distToRay = ray.distanceToPoint(cloudCenter);
        if (distToRay < cloud.radius) {
          const proj = new THREE.Vector3().subVectors(cloudCenter, fromPos).dot(dir);
          if (proj > -cloud.radius && proj < totalDist + cloud.radius) {
            return {
              isClear: false,
              hitDist: Math.max(0.1, proj),
              hitPoint: fromPos.clone().addScaledVector(dir, Math.max(0.1, proj)),
              hitObject: null,
              isBlockedBySmoke: true,
            };
          }
        }
      }
    }

    let closestHitDist = Infinity;
    let closestHitPoint: THREE.Vector3 | null = null;
    let closestHitObject: THREE.Object3D | null = null;

    // 1. Math AABB & OBB Ray-Box tests (100% foolproof against polygon clipping/backface gaps)
    const testRay = new THREE.Ray(fromPos, dir);
    const targetVec = new THREE.Vector3();

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];
      if (!obs.box) continue;

      // Check rotated OBB
      if (obs.pos && obs.size && obs.rot !== undefined && Math.abs(obs.rot) > 0.001) {
        // Transform ray into obstacle's local space
        const halfX = obs.size.x / 2;
        const halfY = obs.size.y / 2;
        const halfZ = obs.size.z / 2;

        const relOrigin = fromPos.clone().sub(obs.pos);
        relOrigin.applyAxisAngle(new THREE.Vector3(0, 1, 0), -obs.rot);
        const relDir = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -obs.rot);

        const localBox = new THREE.Box3(
          new THREE.Vector3(-halfX, -halfY, -halfZ),
          new THREE.Vector3(halfX, halfY, halfZ)
        );

        // If origin or target is inside local box, vision is blocked
        if (localBox.containsPoint(relOrigin)) {
          return {
            isClear: false,
            hitDist: 0.01,
            hitPoint: fromPos.clone(),
            hitObject: obs.mesh,
          };
        }

        const localRay = new THREE.Ray(relOrigin, relDir);
        const localHit = localRay.intersectBox(localBox, targetVec);

        if (localHit) {
          const hitDist = relOrigin.distanceTo(localHit);
          if (hitDist >= 0 && hitDist < totalDist - 0.01 && hitDist < closestHitDist) {
            closestHitDist = hitDist;
            closestHitPoint = fromPos.clone().addScaledVector(dir, hitDist);
            closestHitObject = obs.mesh;
          }
        }
        continue;
      }

      // Standard AABB
      if (obs.box.containsPoint(fromPos)) {
        return {
          isClear: false,
          hitDist: 0.01,
          hitPoint: fromPos.clone(),
          hitObject: obs.mesh,
        };
      }

      const hit = testRay.intersectBox(obs.box, targetVec);
      if (hit) {
        const hitDist = fromPos.distanceTo(hit);
        if (hitDist >= 0 && hitDist < totalDist - 0.01 && hitDist < closestHitDist) {
          closestHitDist = hitDist;
          closestHitPoint = hit.clone();
          closestHitObject = obs.mesh;
        }
      }
    }

    // 2. High-precision mesh geometry raycasting
    const raycaster = new THREE.Raycaster(fromPos, dir, 0.001, totalDist - 0.01);
    const meshes: THREE.Object3D[] = [];
    obstacles.forEach(o => {
      if (o.mesh) {
        o.mesh.updateMatrixWorld(true);
        meshes.push(o.mesh);
      }
    });

    const meshHits = raycaster.intersectObjects(meshes, true);
    if (meshHits.length > 0) {
      const firstHit = meshHits[0];
      if (firstHit.distance < closestHitDist && firstHit.distance < totalDist - 0.01) {
        closestHitDist = firstHit.distance;
        closestHitPoint = firstHit.point;
        closestHitObject = firstHit.object;
      }
    }

    if (closestHitDist < totalDist - 0.01 && closestHitPoint) {
      return {
        isClear: false,
        hitDist: closestHitDist,
        hitPoint: closestHitPoint,
        hitObject: closestHitObject,
      };
    }

    return {
      isClear: true,
      hitDist: totalDist,
      hitPoint: null,
      hitObject: null,
    };
  }
}

