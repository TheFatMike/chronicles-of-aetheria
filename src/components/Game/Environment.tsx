import { memo } from "react";

interface EnvironmentProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  onClick?: (e: any) => void;
}

export const Tree = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick }: EnvironmentProps) => (
  <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
    {/* Trunk */}
    <mesh position={[0, 1, 0]} castShadow>
      <cylinderGeometry args={[0.2, 0.3, 2, 8]} />
      <meshStandardMaterial color="#451a03" />
    </mesh>
    {/* Leaves */}
    <mesh position={[0, 2.5, 0]} castShadow>
      <coneGeometry args={[1, 2.5, 8]} />
      <meshStandardMaterial color="#166534" />
    </mesh>
    <mesh position={[0, 3.5, 0]} castShadow>
      <coneGeometry args={[0.8, 2, 8]} />
      <meshStandardMaterial color="#15803d" />
    </mesh>
  </group>
));

export const Rock = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick }: EnvironmentProps) => (
  <mesh position={position} rotation={rotation} scale={scale} castShadow onClick={onClick}>
    <dodecahedronGeometry args={[1]} />
    <meshStandardMaterial color="#57534e" roughness={1} />
  </mesh>
));

export const House = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick }: EnvironmentProps) => (
  <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
    {/* Walls */}
    <mesh position={[0, 1.5, 0]} castShadow>
      <boxGeometry args={[4, 3, 4]} />
      <meshStandardMaterial color="#d6d3d1" />
    </mesh>
    {/* Roof */}
    <mesh position={[0, 3.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
      <coneGeometry args={[3.5, 2, 4]} />
      <meshStandardMaterial color="#7c2d12" />
    </mesh>
    {/* Door */}
    <mesh position={[0, 0.75, 2.01]}>
      <boxGeometry args={[0.8, 1.5, 0.1]} />
      <meshStandardMaterial color="#451a03" />
    </mesh>
  </group>
));

export const Tent = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick }: EnvironmentProps) => (
  <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
    {/* Main Tent Body - Left Side */}
    <mesh position={[-0.7, 0.65, 0]} rotation={[0, 0, Math.PI / 4]} castShadow receiveShadow>
      <boxGeometry args={[1.9, 0.08, 2.4]} />
      <meshStandardMaterial color="#f8fafc" roughness={0.8} />
    </mesh>
    {/* Main Tent Body - Right Side */}
    <mesh position={[0.7, 0.65, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow receiveShadow>
      <boxGeometry args={[1.9, 0.08, 2.4]} />
      <meshStandardMaterial color="#f8fafc" roughness={0.8} />
    </mesh>
    
    {/* Back Wall */}
    <mesh position={[0, 0.65, -1.15]} rotation={[0, 0, 0]} castShadow receiveShadow>
      <coneGeometry args={[1.35, 1.3, 4]} />
      <meshStandardMaterial color="#e2e8f0" roughness={0.9} />
    </mesh>

    {/* Interior Floor/Ground Cover */}
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[1.8, 2.2]} />
      <meshStandardMaterial color="#334155" roughness={1} />
    </mesh>

    {/* Ridge Pole (Dark Wood) */}
    <mesh position={[0, 1.35, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.06, 0.06, 2.5, 8]} />
      <meshStandardMaterial color="#2d1a0a" roughness={0.7} />
    </mesh>

    {/* Support Poles (Front) */}
    <group position={[0, 0, 1.1]}>
      <mesh position={[-0.95, 0.65, 0]} rotation={[0, 0, 0.1]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1.4, 6]} />
        <meshStandardMaterial color="#2d1a0a" />
      </mesh>
      <mesh position={[0.95, 0.65, 0]} rotation={[0, 0, -0.1]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 1.4, 6]} />
        <meshStandardMaterial color="#2d1a0a" />
      </mesh>
    </group>

    {/* Tent Stakes (Small details) */}
    {[[-1.1, 0, 1.1], [1.1, 0, 1.1], [-1.1, 0, -1.1], [1.1, 0, -1.1]].map((pos, i) => (
      <mesh key={i} position={pos as [number, number, number]} castShadow>
        <cylinderGeometry args={[0.03, 0.02, 0.3, 4]} />
        <meshStandardMaterial color="#64748b" metalness={0.5} roughness={0.3} />
      </mesh>
    ))}

    {/* Ropes (Simplified using thin cylinders) */}
    <mesh position={[-1, 0.6, 1.1]} rotation={[0, 0, Math.PI / 3]} castShadow>
      <cylinderGeometry args={[0.01, 0.01, 0.8, 4]} />
      <meshStandardMaterial color="#cbd5e1" />
    </mesh>
    <mesh position={[1, 0.6, 1.1]} rotation={[0, 0, -Math.PI / 3]} castShadow>
      <cylinderGeometry args={[0.01, 0.01, 0.8, 4]} />
      <meshStandardMaterial color="#cbd5e1" />
    </mesh>
  </group>
));

export const Bush = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick }: EnvironmentProps) => (
  <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
    <mesh position={[0, 0.4, 0]} castShadow>
      <dodecahedronGeometry args={[0.6]} />
      <meshStandardMaterial color="#166534" />
    </mesh>
    <mesh position={[0.4, 0.3, 0.2]} castShadow>
      <dodecahedronGeometry args={[0.4]} />
      <meshStandardMaterial color="#15803d" />
    </mesh>
  </group>
));

export const Fence = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick }: EnvironmentProps) => (
  <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
    {/* Posts */}
    <mesh position={[-0.9, 0.5, 0]} castShadow>
      <boxGeometry args={[0.1, 1, 0.1]} />
      <meshStandardMaterial color="#451a03" />
    </mesh>
    <mesh position={[0.9, 0.5, 0]} castShadow>
      <boxGeometry args={[0.1, 1, 0.1]} />
      <meshStandardMaterial color="#451a03" />
    </mesh>
    {/* Rails */}
    <mesh position={[0, 0.7, 0]} castShadow>
      <boxGeometry args={[2, 0.15, 0.05]} />
      <meshStandardMaterial color="#572e12" />
    </mesh>
    <mesh position={[0, 0.3, 0]} castShadow>
      <boxGeometry args={[2, 0.15, 0.05]} />
      <meshStandardMaterial color="#572e12" />
    </mesh>
  </group>
));


export const Waypoint = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick }: EnvironmentProps) => (
  <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
    <mesh position={[0, 1.5, 0]} rotation={[Math.PI / 4, 0, Math.PI / 4]}>
      <octahedronGeometry args={[0.3, 0]} />
      <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={2} transparent opacity={0.8} />
    </mesh>
    <pointLight position={[0, 1.5, 0]} color="#fbbf24" intensity={2} distance={5} />
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.5, 0.6, 32]} />
      <meshBasicMaterial color="#fbbf24" transparent opacity={0.4} />
    </mesh>
  </group>
));

export const Campfire = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick }: EnvironmentProps) => (
  <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
    {/* Logs */}
    <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.1, 0.1, 0.8, 6]} />
      <meshStandardMaterial color="#451a03" />
    </mesh>
    <mesh position={[0, 0.1, 0]} rotation={[0, Math.PI / 2, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[0.1, 0.1, 0.8, 6]} />
      <meshStandardMaterial color="#451a03" />
    </mesh>
    {/* Fire */}
    <mesh position={[0, 0.4, 0]}>
      <coneGeometry args={[0.3, 0.6, 6]} />
      <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={2} />
    </mesh>
    <pointLight position={[0, 0.5, 0]} intensity={1.5} color="#fb923c" distance={10} />
  </group>
));

export const Barrel = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick }: EnvironmentProps) => (
  <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
    <mesh position={[0, 0.5, 0]} castShadow>
      <cylinderGeometry args={[0.4, 0.45, 1, 12]} />
      <meshStandardMaterial color="#78350f" />
    </mesh>
    {/* Metal Bands */}
    <mesh position={[0, 0.8, 0]}>
      <cylinderGeometry args={[0.41, 0.41, 0.1, 12]} />
      <meshStandardMaterial color="#404040" metalness={1} roughness={0.2} />
    </mesh>
    <mesh position={[0, 0.2, 0]}>
      <cylinderGeometry args={[0.41, 0.41, 0.1, 12]} />
      <meshStandardMaterial color="#404040" metalness={1} roughness={0.2} />
    </mesh>
  </group>
));

export const Dummy = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick }: EnvironmentProps) => (
  <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
    <mesh position={[0, 1.2, 0]} castShadow>
      <boxGeometry args={[0.2, 2.4, 0.2]} />
      <meshStandardMaterial color="#451a03" />
    </mesh>
    <mesh position={[0, 1.8, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.6, 0.6, 1, 12]} />
      <meshStandardMaterial color="#d6d3d1" />
    </mesh>
    {/* Target rings */}
    <mesh position={[0, 1.8, 0.61]}>
      <circleGeometry args={[0.4, 16]} />
      <meshStandardMaterial color="#ef4444" />
    </mesh>
    <mesh position={[0, 1.8, 0.62]}>
      <circleGeometry args={[0.2, 16]} />
      <meshStandardMaterial color="#ffffff" />
    </mesh>
  </group>
));

export const Chest = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick }: EnvironmentProps) => (
  <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
    <mesh position={[0, 0.4, 0]} castShadow>
      <boxGeometry args={[1.2, 0.8, 0.8]} />
      <meshStandardMaterial color="#78350f" />
    </mesh>
    {/* Lid */}
    <mesh position={[0, 0.8, 0]} castShadow>
      <boxGeometry args={[1.2, 0.2, 0.8]} />
      <meshStandardMaterial color="#92400e" />
    </mesh>
    {/* Lock */}
    <mesh position={[0, 0.5, 0.41]}>
      <boxGeometry args={[0.2, 0.2, 0.05]} />
      <meshStandardMaterial color="#facc15" metalness={1} roughness={0.2} />
    </mesh>
  </group>
));

export const Well = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick }: EnvironmentProps) => (
  <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
    {/* Base */}
    <mesh position={[0, 0.5, 0]} castShadow>
      <cylinderGeometry args={[1.2, 1.2, 1, 16]} />
      <meshStandardMaterial color="#57534e" />
    </mesh>
    {/* Inner water */}
    <mesh position={[0, 0.8, 0]}>
      <cylinderGeometry args={[0.9, 0.9, 0.1, 16]} />
      <meshStandardMaterial color="#0ea5e9" transparent opacity={0.6} />
    </mesh>
    {/* Posts */}
    <mesh position={[-1, 1.5, 0]} castShadow>
      <boxGeometry args={[0.15, 2, 0.15]} />
      <meshStandardMaterial color="#451a03" />
    </mesh>
    <mesh position={[1, 1.5, 0]} castShadow>
      <boxGeometry args={[0.15, 2, 0.15]} />
      <meshStandardMaterial color="#451a03" />
    </mesh>
    {/* Roof */}
    <mesh position={[0, 2.8, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
      <coneGeometry args={[1.8, 1, 4]} />
      <meshStandardMaterial color="#7c2d12" />
    </mesh>
  </group>
));

export const SignPost = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick }: EnvironmentProps) => (
  <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
    {/* Post */}
    <mesh position={[0, 1, 0]} castShadow>
      <boxGeometry args={[0.15, 2, 0.15]} />
      <meshStandardMaterial color="#451a03" />
    </mesh>
    {/* Sign board */}
    <mesh position={[0, 1.6, 0.1]} castShadow>
      <boxGeometry args={[1.2, 0.6, 0.1]} />
      <meshStandardMaterial color="#92400e" />
    </mesh>
  </group>
));
