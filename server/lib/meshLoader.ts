import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Node.js shims for THREE.GLTFLoader
if (typeof self === 'undefined') {
  (global as any).self = global;
}

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';
import { getFirstCollision, DEFAULT_COLLISION_CONFIG } from "../../shared/logic/collision";

// Add BVH support to THREE
THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Reusable objects for performance
const REUSABLE_RAYCASTER = new THREE.Raycaster();
(REUSABLE_RAYCASTER as any).firstHitOnly = true;
const _tempOrigin = new THREE.Vector3();
const _tempDirection = new THREE.Vector3();
const _tempVec = new THREE.Vector3();

export interface LoadedMesh {
  mesh: THREE.Group;
  bvh?: boolean;
}

const meshCache = new Map<string, LoadedMesh>();

const missingModels = new Set<string>();

const loader = new GLTFLoader();

// Reusable directions for collision checks
const COLLISION_DIRECTIONS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 0, 1],
  [0, 0, -1]
];

/**
 * Loads a GLB model from the assets directory and prepares it for server-side raycasting.
 */
export async function loadModelMesh(modelName: string): Promise<LoadedMesh | null> {
  if (meshCache.has(modelName)) {
    return meshCache.get(modelName)!;
  }

  // Handle both .glb extension and just the name
  const fileName = modelName.endsWith('.glb') ? modelName : `${modelName}.glb`;
  const filePath = path.resolve(process.cwd(), 'public', 'assets', 'models', fileName);

  if (!fs.existsSync(filePath)) {
    if (!missingModels.has(modelName)) {
      console.warn(`[MeshLoader] Model file not found (suppressing future warnings for this model): ${modelName}`);
      missingModels.add(modelName);
    }
    return null;
  }

  try {
    const data = fs.readFileSync(filePath);
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    
    return new Promise((resolve, reject) => {
      // Silence THREE.js texture errors during parsing (server doesn't need textures)
      const originalConsoleError = console.error;
      console.error = (...args) => {
        if (args[0]?.includes?.('THREE.GLTFLoader: Couldn\'t load texture')) return;
        originalConsoleError.apply(console, args);
      };

      loader.parse(arrayBuffer, '', (gltf) => {
        // Restore console.error
        console.error = originalConsoleError;
        const group = gltf.scene;

        // Process all meshes in the group to build BVH
        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry.computeBoundsTree();
          }
        });

        const loadedMesh = { mesh: group, bvh: true };
        meshCache.set(modelName, loadedMesh);
        resolve(loadedMesh);
      }, (error) => {
        console.error = originalConsoleError;
        console.error(`[MeshLoader] Error parsing GLB ${modelName}:`, error);
        reject(error);
      });
    });
  } catch (err) {
    console.error(`[MeshLoader] Failed to load model ${modelName}:`, err);
    return null;
  }
}

/**
 * Get ground height at a specific point relative to a mesh.
 */
export function getMeshHeightAt(mesh: THREE.Group, worldPos: [number, number, number]): number | null {
  // Start ray slightly above the player's head and cast downwards
  // This ensures we find the floor the player is actually in, rather than the roof.
  _tempOrigin.set(worldPos[0], worldPos[1] + 1.5, worldPos[2]);
  _tempDirection.set(0, -1, 0);
  
  REUSABLE_RAYCASTER.set(_tempOrigin, _tempDirection);
  
  const intersections = REUSABLE_RAYCASTER.intersectObject(mesh, true);
  
  if (intersections.length > 0) {
    // Return the intersection point
    return intersections[0].point.y;
  }

  return null;
}

/**
 * Helper to check if a point is colliding with a mesh (crude approximation).
 */
export function checkMeshCollision(mesh: THREE.Group, worldPos: [number, number, number], radius: number = 0.5): boolean {
  const origin = new THREE.Vector3(worldPos[0], worldPos[1] + 0.5, worldPos[2]);
  
  for (const [dx, dy, dz] of COLLISION_DIRECTIONS) {
    const direction = new THREE.Vector3(dx, dy, dz);
    const hit = getFirstCollision(origin, direction, [mesh], radius);
    if (hit) return true;
  }

  return false;
}

