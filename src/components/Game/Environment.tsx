/**
 * @file src/components/Game/Environment.tsx
 * @description A collection of static environment objects and props.
 * Includes trees, rocks, buildings, and other decorative elements that populate the world.
 * @importance Essential: Provides the visual foundation and atmosphere of the game world.
 */
import { memo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLBModel } from "./GLBModel";


interface EnvironmentProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onClick?: (e: any) => void;
  isGhost?: boolean;
  modelUrl?: string;
}

export const Tree = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick, isGhost, modelUrl }: EnvironmentProps) => {
  if (modelUrl) {
    return <GLBModel url={modelUrl} position={position} rotation={rotation} scale={scale} onClick={onClick} isGhost={isGhost} />;
  }
  const matProps = isGhost ? { transparent: true, opacity: 0.5, depthWrite: false } : {};
  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <mesh position={[0, 1, 0]} castShadow={!isGhost}>
        <cylinderGeometry args={[0.2, 0.3, 2, 8]} />
        <meshStandardMaterial color="#451a03" {...matProps} />
      </mesh>
      <mesh position={[0, 2.5, 0]} castShadow={!isGhost}>
        <coneGeometry args={[1, 2.5, 8]} />
        <meshStandardMaterial color="#166534" {...matProps} />
      </mesh>
      <mesh position={[0, 3.5, 0]} castShadow={!isGhost}>
        <coneGeometry args={[0.8, 2, 8]} />
        <meshStandardMaterial color="#15803d" {...matProps} />
      </mesh>
    </group>
  );
});

export const Rock = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick, isGhost, modelUrl }: EnvironmentProps) => {
  if (modelUrl) {
    return <GLBModel url={modelUrl} position={position} rotation={rotation} scale={scale} onClick={onClick} isGhost={isGhost} />;
  }
  return (
    <mesh position={position} rotation={rotation} scale={scale} castShadow={!isGhost} onClick={onClick}>
      <dodecahedronGeometry args={[1]} />
      <meshStandardMaterial color="#57534e" roughness={1} transparent={isGhost} opacity={isGhost ? 0.5 : 1} depthWrite={!isGhost} />
    </mesh>
  );
});

export const House = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick, isGhost, modelUrl }: EnvironmentProps) => {
  if (modelUrl) {
    return <GLBModel url={modelUrl} position={position} rotation={rotation} scale={scale} onClick={onClick} isGhost={isGhost} />;
  }
  const matProps = isGhost ? { transparent: true, opacity: 0.5, depthWrite: false } : {};
  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <mesh position={[0, 1.5, 0]} castShadow={!isGhost}>
        <boxGeometry args={[4, 3, 4]} />
        <meshStandardMaterial color="#d6d3d1" {...matProps} />
      </mesh>
      <mesh position={[0, 3.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={!isGhost}>
        <coneGeometry args={[3.5, 2, 4]} />
        <meshStandardMaterial color="#7c2d12" {...matProps} />
      </mesh>
      <mesh position={[0, 0.75, 2.01]}>
        <boxGeometry args={[0.8, 1.5, 0.1]} />
        <meshStandardMaterial color="#451a03" {...matProps} />
      </mesh>
    </group>
  );
});

export const Tent = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick, isGhost, modelUrl }: EnvironmentProps) => {
  return (
    <GLBModel 
      url={modelUrl || "/assets/models/tent.glb"}
      position={position}
      rotation={rotation}
      scale={scale * (modelUrl ? 1 : 0.01)}
      onClick={onClick}
      isGhost={isGhost}
    />
  );
});



export const Bush = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick, isGhost, modelUrl }: EnvironmentProps) => {
  if (modelUrl) {
    return <GLBModel url={modelUrl} position={position} rotation={rotation} scale={scale} onClick={onClick} isGhost={isGhost} />;
  }
  const matProps = isGhost ? { transparent: true, opacity: 0.5, depthWrite: false } : {};
  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <mesh position={[0, 0.4, 0]} castShadow={!isGhost}>
        <dodecahedronGeometry args={[0.6]} />
        <meshStandardMaterial color="#166534" {...matProps} />
      </mesh>
      <mesh position={[0.4, 0.3, 0.2]} castShadow={!isGhost}>
        <dodecahedronGeometry args={[0.4]} />
        <meshStandardMaterial color="#15803d" {...matProps} />
      </mesh>
    </group>
  );
});

export const Fence = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick, isGhost, modelUrl }: EnvironmentProps) => {
  if (modelUrl) {
    return <GLBModel url={modelUrl} position={position} rotation={rotation} scale={scale} onClick={onClick} isGhost={isGhost} />;
  }
  const matProps = isGhost ? { transparent: true, opacity: 0.5, depthWrite: false } : {};
  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <mesh position={[-0.9, 0.5, 0]} castShadow={!isGhost}>
        <boxGeometry args={[0.1, 1, 0.1]} />
        <meshStandardMaterial color="#451a03" {...matProps} />
      </mesh>
      <mesh position={[0.9, 0.5, 0]} castShadow={!isGhost}>
        <boxGeometry args={[0.1, 1, 0.1]} />
        <meshStandardMaterial color="#451a03" {...matProps} />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow={!isGhost}>
        <boxGeometry args={[2, 0.15, 0.05]} />
        <meshStandardMaterial color="#572e12" {...matProps} />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow={!isGhost}>
        <boxGeometry args={[2, 0.15, 0.05]} />
        <meshStandardMaterial color="#572e12" {...matProps} />
      </mesh>
    </group>
  );
});

export const Waypoint = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick, isGhost }: EnvironmentProps) => (
  <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
    <mesh position={[0, 1.5, 0]} rotation={[Math.PI / 4, 0, Math.PI / 4]}>
      <octahedronGeometry args={[0.3, 0]} />
      <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={isGhost ? 1 : 2} transparent opacity={isGhost ? 0.4 : 0.8} depthWrite={!isGhost} />
    </mesh>
    {!isGhost && <pointLight position={[0, 1.5, 0]} color="#fbbf24" intensity={2} distance={5} />}
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.5, 0.6, 32]} />
      <meshBasicMaterial color="#fbbf24" transparent opacity={isGhost ? 0.2 : 0.4} depthWrite={!isGhost} />
    </mesh>
  </group>
));

export const Campfire = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick, isGhost, modelUrl }: EnvironmentProps) => {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <GLBModel 
        url={modelUrl || "/assets/models/campfire.glb"}
        position={[0, 0.05, 0]}
        rotation={[0, 0, 0]}
        scale={1}
        onClick={onClick}
        isGhost={isGhost}
      />
      {!isGhost && <pointLight position={[0, 0.5, 0]} intensity={1.5} color="#fb923c" distance={10} />}
    </group>
  );
});


export const Barrel = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick, isGhost, modelUrl }: EnvironmentProps) => {
  if (modelUrl) {
    return <GLBModel url={modelUrl} position={position} rotation={rotation} scale={scale} onClick={onClick} isGhost={isGhost} />;
  }
  const matProps = isGhost ? { transparent: true, opacity: 0.5, depthWrite: false } : {};
  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <mesh position={[0, 0.5, 0]} castShadow={!isGhost}>
        <cylinderGeometry args={[0.4, 0.45, 1, 12]} />
        <meshStandardMaterial color="#78350f" {...matProps} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.41, 0.41, 0.1, 12]} />
        <meshStandardMaterial color="#404040" metalness={1} roughness={0.2} {...matProps} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.41, 0.41, 0.1, 12]} />
        <meshStandardMaterial color="#404040" metalness={1} roughness={0.2} {...matProps} />
      </mesh>
    </group>
  );
});

export const Dummy = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick, isGhost, modelUrl }: EnvironmentProps) => {
  if (modelUrl) {
    return <GLBModel url={modelUrl} position={position} rotation={rotation} scale={scale} onClick={onClick} isGhost={isGhost} />;
  }
  const matProps = isGhost ? { transparent: true, opacity: 0.5, depthWrite: false } : {};
  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <mesh position={[0, 1.2, 0]} castShadow={!isGhost}>
        <boxGeometry args={[0.2, 2.4, 0.2]} />
        <meshStandardMaterial color="#451a03" {...matProps} />
      </mesh>
      <mesh position={[0, 1.8, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow={!isGhost}>
        <cylinderGeometry args={[0.6, 0.6, 1, 12]} />
        <meshStandardMaterial color="#d6d3d1" {...matProps} />
      </mesh>
      <mesh position={[0, 1.8, 0.61]}>
        <circleGeometry args={[0.4, 16]} />
        <meshStandardMaterial color="#ef4444" {...matProps} />
      </mesh>
    </group>
  );
});

export const Chest = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick, isGhost, modelUrl }: EnvironmentProps) => {
  if (modelUrl) {
    return <GLBModel url={modelUrl} position={position} rotation={rotation} scale={scale} onClick={onClick} isGhost={isGhost} />;
  }
  const matProps = isGhost ? { transparent: true, opacity: 0.5, depthWrite: false } : {};
  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <mesh position={[0, 0.4, 0]} castShadow={!isGhost}>
        <boxGeometry args={[1.2, 0.8, 0.8]} />
        <meshStandardMaterial color="#78350f" {...matProps} />
      </mesh>
      <mesh position={[0, 0.8, 0]} castShadow={!isGhost}>
        <boxGeometry args={[1.2, 0.2, 0.8]} />
        <meshStandardMaterial color="#92400e" {...matProps} />
      </mesh>
      <mesh position={[0, 0.5, 0.41]}>
        <boxGeometry args={[0.2, 0.2, 0.05]} />
        <meshStandardMaterial color="#facc15" metalness={1} roughness={0.2} {...matProps} />
      </mesh>
    </group>
  );
});

export const Well = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick, isGhost, modelUrl }: EnvironmentProps) => {
  if (modelUrl) {
    return <GLBModel url={modelUrl} position={position} rotation={rotation} scale={scale} onClick={onClick} isGhost={isGhost} />;
  }
  const matProps = isGhost ? { transparent: true, opacity: 0.5, depthWrite: false } : {};
  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <mesh position={[0, 0.5, 0]} castShadow={!isGhost}>
        <cylinderGeometry args={[1.2, 1.2, 1, 16]} />
        <meshStandardMaterial color="#57534e" {...matProps} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.1, 16]} />
        <meshStandardMaterial color="#0ea5e9" transparent opacity={isGhost ? 0.3 : 0.6} depthWrite={!isGhost} />
      </mesh>
      <mesh position={[-1, 1.5, 0]} castShadow={!isGhost}>
        <boxGeometry args={[0.15, 2, 0.15]} />
        <meshStandardMaterial color="#451a03" {...matProps} />
      </mesh>
      <mesh position={[1, 1.5, 0]} castShadow={!isGhost}>
        <boxGeometry args={[0.15, 2, 0.15]} />
        <meshStandardMaterial color="#451a03" {...matProps} />
      </mesh>
      <mesh position={[0, 2.8, 0]} rotation={[0, Math.PI / 4, 0]} castShadow={!isGhost}>
        <coneGeometry args={[1.8, 1, 4]} />
        <meshStandardMaterial color="#7c2d12" {...matProps} />
      </mesh>
    </group>
  );
});

export const SignPost = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick, isGhost, modelUrl }: EnvironmentProps) => {
  if (modelUrl) {
    return <GLBModel url={modelUrl} position={position} rotation={rotation} scale={scale} onClick={onClick} isGhost={isGhost} />;
  }
  const matProps = isGhost ? { transparent: true, opacity: 0.5, depthWrite: false } : {};
  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <mesh position={[0, 1, 0]} castShadow={!isGhost}>
        <boxGeometry args={[0.15, 2, 0.15]} />
        <meshStandardMaterial color="#451a03" {...matProps} />
      </mesh>
      <mesh position={[0, 1.6, 0.1]} castShadow={!isGhost}>
        <boxGeometry args={[1.2, 0.6, 0.1]} />
        <meshStandardMaterial color="#92400e" {...matProps} />
      </mesh>
    </group>
  );
});

export const TeleportCrystal = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick, isGhost }: EnvironmentProps) => {
  const matProps = isGhost ? { transparent: true, opacity: 0.5, depthWrite: false } : {};

  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      {/* Central Crystal Core */}
      <mesh position={[0, 1.2, 0]} castShadow={!isGhost}>
        <octahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial 
          color="#a855f7" 
          emissive="#a855f7" 
          emissiveIntensity={2} 
          metalness={0.8} 
          roughness={0.2} 
          {...matProps} 
        />
      </mesh>

      {/* Floating Shards */}
      {[0, 1, 2, 3].map((i) => (
        <mesh 
          key={i} 
          position={[
            Math.sin(i * Math.PI * 0.5) * 1.2, 
            1.2 + Math.cos(i * Math.PI * 0.5) * 0.5, 
            Math.cos(i * Math.PI * 0.5) * 1.2
          ]}
          rotation={[Math.random(), Math.random(), Math.random()]}
        >
          <octahedronGeometry args={[0.2, 0]} />
          <meshStandardMaterial color="#c084fc" emissive="#a855f7" {...matProps} />
        </mesh>
      ))}

      {/* Magical Glow */}
      {!isGhost && (
        <pointLight position={[0, 1.8, 0]} color="#a855f7" intensity={2} distance={8} />
      )}

      {/* Invisible Hitbox: Makes clicking much easier */}
      <mesh position={[0, 1, 0]} userData={{ isCollidable: false }}>
        <cylinderGeometry args={[1, 1, 2, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
});



