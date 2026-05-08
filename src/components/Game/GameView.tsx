import { Suspense, memo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { World } from "./World";
import { Player } from "./Player";
import { Projectiles } from "./Projectiles";
import { useGameStore } from "../../store/useGameStore";
import { Loader } from "@react-three/drei";

interface GameViewProps {
  onMove: (pos: [number, number, number], rot: [number, number, number]) => void;
  onAttack?: () => void;
  onLoot?: (id: string) => void;
  playerColor: string;
  socketId: string | null;
  socket: any;
  initialPos?: [number, number, number];
  initialRot?: [number, number, number];
}

export const GameView = memo(({ onMove, onAttack, onLoot, playerColor, socketId, socket, initialPos, initialRot }: GameViewProps) => {
  const setTarget = useGameStore((state) => state.setTarget);

  return (
    <>
      <Canvas 
        shadows={{ type: THREE.PCFShadowMap }} 
        camera={{ position: [0, 5, 10], fov: 75 }}
        dpr={Math.min(window.devicePixelRatio, 2)}
        performance={{ min: 0.5 }}
        gl={{ 
          antialias: true, 
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
          alpha: false,
          stencil: false,
          depth: true
        }}
        onPointerMissed={() => {
          // Handled explicitly by World and entities now to avoid conflicts
        }}
      >
        <Suspense fallback={null}>
          <World onAttack={onAttack} onLoot={onLoot} socket={socket} />

          <Player onMove={onMove} color={playerColor} socket={socket} initialPos={initialPos} initialRot={initialRot} />
          <Projectiles />
        </Suspense>
      </Canvas>
      <Loader />
    </>
  );
});

GameView.displayName = "GameView";
