/**
 * @file src/components/UI/CharacterPreview.tsx
 * @description Renders a 3D preview of a character within a UI context.
 * Uses a secondary React-Three-Fiber canvas to display the character's model and equipment.
 * @importance Essential: Enhances the character selection and creation process with high-quality visual previews.
 */
import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment, Float } from "@react-three/drei";
import * as THREE from "three";
import { Humanoid } from "../Game/Humanoid";
import { Character } from "../../types";

interface CharacterPreviewProps {
  character: Character;
  rotation?: boolean;
  zoom?: number;
  interactive?: boolean;
}

export const CharacterPreview = ({ 
  character, 
  rotation = true, 
  zoom = 1, 
  interactive = false 
}: CharacterPreviewProps) => {
  return (
    <div className="w-full h-full">
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{ position: [0, 1.2, 3], fov: 40 / zoom }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={1.5} />
          <spotLight position={[5, 5, 5]} angle={0.15} penumbra={1} intensity={2} castShadow />
          <pointLight position={[-5, 5, -5]} intensity={1} />
          
          <Float
            speed={rotation ? 1.5 : 0}
            rotationIntensity={rotation ? 0.5 : 0}
            floatIntensity={rotation ? 0.5 : 0}
          >
            <group position={[0, -0.6, 0]} rotation={[0, Math.PI, 0]}>
              <Humanoid 
                color={character.color} 
                isMoving={false}
                isGrounded={true}
              />
            </group>
          </Float>

          <ContactShadows 
            position={[0, -0.6, 0]} 
            opacity={0.4} 
            scale={10} 
            blur={2} 
            far={1} 
          />
          
          {interactive && (
            <OrbitControls 
              enableZoom={false} 
              enablePan={false} 
              minPolarAngle={Math.PI / 3} 
              maxPolarAngle={Math.PI / 2} 
            />
          )}

          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
};
