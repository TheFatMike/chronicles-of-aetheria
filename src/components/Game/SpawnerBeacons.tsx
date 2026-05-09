import { memo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { Spawner } from "../../types";

interface SpawnerBeaconsProps {
  spawners: Spawner[];
  entities: any[];
}

export const SpawnerBeacons = memo(({ spawners, entities }: SpawnerBeaconsProps) => {
  const entityCountMap: Record<string, number> = {};
  for (const ent of entities) {
    if (ent.spawnerId) {
      entityCountMap[ent.spawnerId] = (entityCountMap[ent.spawnerId] || 0) + 1;
    }
  }
  return (
    <>
      {spawners.map(s => (
        <SpawnerBeacon
          key={s.id}
          spawner={s}
          liveCount={entityCountMap[s.id] || 0}
        />
      ))}
    </>
  );
});

SpawnerBeacons.displayName = "SpawnerBeacons";

interface SpawnerBeaconProps {
  spawner: Spawner;
  liveCount: number;
}

const SpawnerBeacon = memo(({ spawner, liveCount }: SpawnerBeaconProps) => {
  const ringRef = useRef<THREE.Mesh>(null!);
  const pillarRef = useRef<THREE.Mesh>(null!);
  const isEnemy = spawner.type === 'enemy';
  const color = isEnemy ? '#ef4444' : '#60a5fa';
  const emissive = isEnemy ? '#7f1d1d' : '#1e3a8a';
  const isFull = liveCount >= spawner.maxEntities;

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.y += delta * 0.4;
    }
    if (pillarRef.current) {
      const t = Date.now() / 1000;
      (pillarRef.current.material as THREE.MeshBasicMaterial).opacity =
        isFull ? 0.4 : 0.15 + Math.abs(Math.sin(t * 1.5)) * 0.25;
    }
  });

  const [x, y, z] = spawner.pos;
  const radius = spawner.spawnRadius || 5;

  return (
    <group position={[x, 0, z]}>
      {/* Ground ring at spawn radius */}
      <mesh ref={ringRef} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius - 0.15, radius, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} depthWrite={false} />
      </mesh>

      {/* Light pillar */}
      <mesh ref={pillarRef} position={[0, 3, 0]}>
        <cylinderGeometry args={[0.08, 0.4, 6, 8, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Core glowing orb */}
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.25, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={isFull ? 1.5 : 3}
          transparent
          opacity={0.9}
        />
      </mesh>
      <pointLight position={[0, 0.5, 0]} intensity={isFull ? 0.5 : 1.2} distance={4} color={color} />

      {/* Floating HTML label */}
      <Html position={[0, 2.2, 0]} center distanceFactor={15} occlude>
        <div
          style={{
            background: isEnemy ? 'rgba(127,29,29,0.85)' : 'rgba(30,58,138,0.85)',
            border: `1px solid ${color}`,
            borderRadius: '8px',
            padding: '4px 8px',
            backdropFilter: 'blur(6px)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div style={{ color: '#f4e4bc', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {spawner.name}
          </div>
          <div style={{ color, fontFamily: 'monospace', fontSize: '9px', marginTop: '2px' }}>
            {liveCount}/{spawner.maxEntities} · {spawner.entityClass} · Lv{spawner.level}
          </div>
        </div>
      </Html>
    </group>
  );
});

SpawnerBeacon.displayName = "SpawnerBeacon";
