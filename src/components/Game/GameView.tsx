/**
 * @file src/components/Game/GameView.tsx
 * @description The main 3D viewport for the game.
 * Sets up the React-Three-Fiber canvas, lighting, and integrates the core world components.
 * @importance Critical: The primary visual container for the entire 3D gameplay experience.
 */
import { Suspense, memo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { World } from "./World";
import { Player } from "./Player";
import { Projectiles } from "./Projectiles";
import { useGameStore } from "../../store/useGameStore";
import { GameLoader } from "../UI/GameLoader";
import { logger } from "../../lib/logger";

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
        camera={{ position: [0, 5, 10], fov: 75, far: 100 }}
        dpr={Math.min(window.devicePixelRatio, 2)}
        performance={{ min: 0.5 }}
        gl={{ 
          antialias: true, 
          powerPreference: "high-performance",
          preserveDrawingBuffer: true,
          alpha: false,
          stencil: false,
          depth: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace
        }}
        onPointerMissed={() => {
          // Handled explicitly by World and entities now to avoid conflicts
        }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            logger.error("system", "CRITICAL: WebGL Context Lost! Graphics frozen.");
          });
          gl.domElement.addEventListener("webglcontextrestored", () => {
            logger.info("system", "WebGL Context Restored. Resuming loop...");
          });
        }}
      >
        <Suspense fallback={null}>
          <World onAttack={onAttack} onLoot={onLoot} socket={socket} />

          <Player onMove={onMove} color={playerColor} socket={socket} initialPos={initialPos} initialRot={initialRot} />
          <Projectiles />
        </Suspense>
      </Canvas>
      <GameLoader />
    </>
  );
});

GameView.displayName = "GameView";
