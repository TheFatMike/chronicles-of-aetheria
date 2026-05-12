/**
 * @file src/components/Game/GLBModel.tsx
 * @description A utility component for rendering external 3D models in GLB/GLTF format.
 * Handles model loading, cloning for multiple instances, and basic property application.
 * @importance Essential: Provides a flexible way to incorporate high-quality 3D assets into the game world.
 */
import { memo, useMemo, Suspense, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface GLBModelProps {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  onClick?: (e: any) => void;
  castShadow?: boolean;
  receiveShadow?: boolean;
  isGhost?: boolean;
  isCollidable?: boolean;
}

const ModelInner = ({ url, castShadow, receiveShadow, isGhost, isCollidable = true }: any) => {
  const { scene } = useGLTF(url) as any;

  // Clone the scene and apply settings safely
  const clonedScene = useMemo(() => {
    if (!scene) return new THREE.Group();
    
    const clone = scene.clone();
    
    // Apply shadows and fix frustum culling
    clone.traverse((node: any) => {
      if (node.isMesh) {
        node.castShadow = castShadow;
        node.receiveShadow = receiveShadow;
        // Fix for models disappearing due to bad bounding boxes from exporters
        node.frustumCulled = false; 
        
        // Ensure materials are rendered properly (double sided for single-plane walls)
        if (node.material) {
          // If it's an array of materials
          if (Array.isArray(node.material)) {
            node.material.forEach((mat: any) => { mat.side = THREE.DoubleSide; });
          } else {
            node.material.side = THREE.DoubleSide;
          }
        }
        // Handle Ghost (Transparency)
        if (isGhost && node.material) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach((m: any) => {
            m.transparent = true;
            m.opacity = 0.5;
            m.depthWrite = false; 
          });
        } else if (!isGhost) {
          // Enable collision for real models (if requested)
          node.userData.isCollidable = isCollidable;
        }
      }
    });
    
    return clone;
  }, [scene, castShadow, receiveShadow, isGhost, isCollidable]);

  return <primitive object={clonedScene} />;
};

const LoadingFallback = () => (
  <group>
    {/* Small pulsing sphere instead of a giant cylinder */}
    <mesh position={[0, 1, 0]}>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial color="#3b82f6" wireframe transparent opacity={0.5} />
    </mesh>
    <pointLight position={[0, 1, 0]} intensity={1} color="#3b82f6" />
  </group>
);


export const GLBModel = memo(({ 
  url, 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  scale = 1, 
  onClick,
  castShadow = true,
  receiveShadow = true,
  isGhost = false,
  isCollidable = true
}: GLBModelProps) => {
  
  // Preload and monitor model status if needed
  useEffect(() => {
    // Silence is golden
  }, [url]);

  return (
    <group 
      position={position} 
      rotation={rotation} 
      scale={typeof scale === 'number' ? [scale, scale, scale] : scale} 
      onClick={onClick}
    >
      <Suspense fallback={<LoadingFallback />}>
        <ModelInner url={url} castShadow={castShadow} receiveShadow={receiveShadow} isGhost={isGhost} isCollidable={isCollidable} />
      </Suspense>
    </group>
  );
});

GLBModel.displayName = "GLBModel";

// Preload the model so it's ready faster
// But we only preload if url is static, here we just let it load on demand

