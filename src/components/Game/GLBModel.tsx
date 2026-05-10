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
}

const ModelInner = ({ url, castShadow, receiveShadow, isGhost }: any) => {
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
            m.depthWrite = false; // Prevent ghost parts from occluding each other weirdly
          });
        }
      }
    });
    
    return clone;
  }, [scene, castShadow, receiveShadow, isGhost]);

  return <primitive object={clonedScene} />;
};

const LoadingFallback = () => (
  <group>
    {/* Tall blue pillar so you can't miss it */}
    <mesh position={[0, 5, 0]}>
      <cylinderGeometry args={[0.5, 0.5, 10, 8]} />
      <meshStandardMaterial color="#3b82f6" wireframe transparent opacity={0.5} />
    </mesh>
    <pointLight position={[0, 2, 0]} intensity={2} color="#3b82f6" />
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
  isGhost = false
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
        <ModelInner url={url} castShadow={castShadow} receiveShadow={receiveShadow} isGhost={isGhost} />
      </Suspense>
    </group>
  );
});

GLBModel.displayName = "GLBModel";

// Preload the model so it's ready faster
// But we only preload if url is static, here we just let it load on demand

