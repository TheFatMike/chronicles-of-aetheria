/**
 * @file src/components/Game/Environment.tsx
 * @description A collection of static environment objects and props.
 * Includes trees, rocks, buildings, and other decorative elements that populate the world.
 * @importance Essential: Provides the visual foundation and atmosphere of the game world.
 */
import { memo, useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GLBModel } from "./GLBModel";


interface EnvironmentProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  onClick?: (e: any) => void;
  isGhost?: boolean;
  modelUrl?: string;
}

const adjustScale = (s: number | [number, number, number], m: number): number | [number, number, number] => {
  if (Array.isArray(s)) return [s[0] * m, s[1] * m, s[2] * m];
  return (s as number) * m;
};

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
      scale={adjustScale(scale, modelUrl ? 1 : 0.01)}
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

export const WaterPlane = memo(({ position, rotation = [0, 0, 0], scale = 20, onClick, isGhost }: EnvironmentProps) => {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("#0ea5e9") },
        uDeepColor: { value: new THREE.Color("#075985") },
      },
      transparent: true,
      opacity: 0.7,
      vertexShader: `
        varying vec2 vUv;
        varying float vElevation;
        uniform float uTime;
        void main() {
          vUv = uv;
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          float elevation = sin(modelPosition.x * 0.2 + uTime) * sin(modelPosition.z * 0.2 + uTime) * 0.15;
          modelPosition.y += elevation;
          vElevation = elevation;
          gl_Position = projectionMatrix * viewMatrix * modelPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uDeepColor;
        uniform float uTime;
        varying vec2 vUv;
        varying float vElevation;

        // Procedural noise for water texture
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
        }

        void main() {
          // Layered noise for "textured" look
          float n = noise(vUv * 10.0 + uTime * 0.5);
          n += noise(vUv * 20.0 - uTime * 0.8) * 0.5;
          
          float mixStrength = (vElevation + 0.15) * 3.0;
          vec3 baseColor = mix(uDeepColor, uColor, mixStrength);
          
          // Add highlights based on noise
          vec3 highlight = vec3(0.5, 0.8, 1.0) * pow(n, 4.0);
          
          gl_FragColor = vec4(baseColor + highlight, 0.75);
        }
      `,
    });
  }, []);

  useFrame((state) => {
    if (material.uniforms.uTime) {
      material.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh 
      position={position} 
      rotation={[-Math.PI / 2, 0, 0]} 
      scale={scale} 
      onClick={onClick}
      userData={{ isWater: true, waterLevel: position?.[1] || 0, isCollidable: false }}
    >
      <planeGeometry args={[1, 1, 32, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
});

export const Waterfall = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick }: EnvironmentProps) => {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("#7dd3fc") },
        uDeepColor: { value: new THREE.Color("#0ea5e9") },
      },
      transparent: true,
      opacity: 0.8,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uDeepColor;
        uniform float uTime;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
        }

        void main() {
          // Vertical scrolling noise for "textured" waterfall
          float v = vUv.y + uTime * 2.0;
          float n = noise(vec2(vUv.x * 20.0, v * 5.0));
          n += noise(vec2(vUv.x * 40.0, v * 10.0)) * 0.5;
          
          // Mist / Froth streaks
          float streaks = pow(n, 3.0);
          
          vec3 baseColor = mix(uDeepColor, uColor, streaks);
          vec3 highlight = vec3(1.0, 1.0, 1.0) * pow(n, 8.0); // Bright white foam
          
          gl_FragColor = vec4(baseColor + highlight, 0.85);
        }
      `,
    });
  }, []);

  useFrame((state) => {
    if (material.uniforms.uTime) {
      material.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh 
      position={position} 
      rotation={rotation} 
      scale={scale} 
      onClick={onClick}
      userData={{ isCollidable: false }}
    >
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
});

export const WaterSource = memo(({ position, rotation = [0, 0, 0], scale = 1, onClick, isGhost }: EnvironmentProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 2) * 0.1 + 1.0;
      meshRef.current.rotation.y += 0.02;
    }
  });

  const matProps = isGhost ? { transparent: true, opacity: 0.5, depthWrite: false } : {};
  
  return (
    <group position={position} rotation={rotation} scale={scale} onClick={onClick}>
      <mesh ref={meshRef} castShadow={!isGhost}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial 
          color="#0ea5e9" 
          emissive="#0284c7" 
          emissiveIntensity={2} 
          {...matProps} 
        />
      </mesh>
      <pointLight color="#0ea5e9" intensity={2} distance={5} />
    </group>
  );
});
