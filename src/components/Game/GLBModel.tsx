import { memo, Suspense } from "react";
import { useGLTF, Clone } from "@react-three/drei";
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

const LoadingFallback = ({ url }: { url: string }) => (
  <group>
    {/* Highly visible placeholder while model is loading */}
    <mesh position={[0, 0.5, 0]}>
      <boxGeometry args={[0.5, 1, 0.5]} />
      <meshStandardMaterial color="#3b82f6" wireframe transparent opacity={0.3} />
    </mesh>
    <pointLight position={[0, 1, 0]} intensity={2} color="#3b82f6" distance={5} />
  </group>
);

const GLBInner = ({ url, castShadow, receiveShadow, isGhost, isCollidable }: any) => {
  const { scene } = useGLTF(url) as any;
  return (
    <Clone 
      object={scene} 
      castShadow={castShadow} 
      receiveShadow={receiveShadow}
      inject={(node) => {
        if ((node as THREE.Mesh).isMesh) {
          node.userData.isCollidable = isCollidable;
          node.frustumCulled = false;
          
          if (isGhost && (node as THREE.Mesh).material) {
            // Important: Clone the material for the ghost to avoid affecting other instances
            const m = ((node as THREE.Mesh).material as THREE.MeshStandardMaterial).clone();
            m.transparent = true;
            m.opacity = 0.4;
            m.depthWrite = false;
            (node as THREE.Mesh).material = m;
          }
        }
        return null;
      }}
    />
  );
};

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
  return (
    <group 
      position={position} 
      rotation={rotation} 
      scale={typeof scale === 'number' ? [scale, scale, scale] : scale} 
      onClick={onClick}
    >
      <Suspense fallback={<LoadingFallback url={url} />}>
        <GLBInner 
          url={url} 
          castShadow={castShadow} 
          receiveShadow={receiveShadow} 
          isGhost={isGhost} 
          isCollidable={isCollidable} 
        />
      </Suspense>
    </group>
  );
});

GLBModel.displayName = "GLBModel";

