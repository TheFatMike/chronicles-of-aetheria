import { memo, useRef } from "react";
import * as THREE from "three";
import { useThree, useFrame } from "@react-three/fiber";
import { Sky, Stars } from "@react-three/drei";
import { useGameStore } from "../../../store/useGameStore";

export const MovingShadowLight = memo(() => {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const { camera } = useThree();
  const brightness = useGameStore(state => state.brightness);

  useFrame(() => {
    if (lightRef.current) {
      // Keep the light centered on the camera (player)
      lightRef.current.position.set(
        camera.position.x + 20,
        50,
        camera.position.z + 10
      );
      lightRef.current.target.position.set(
        camera.position.x,
        0,
        camera.position.z
      );
      lightRef.current.target.updateMatrixWorld();
    }
  });

  return (
    <directionalLight 
      ref={lightRef}
      intensity={1.5 * brightness} 
      castShadow 
      shadow-mapSize={[128, 128]}
      shadow-camera-left={-20}
      shadow-camera-right={20}
      shadow-camera-top={20}
      shadow-camera-bottom={-20}
      shadow-camera-near={0.1}
      shadow-camera-far={40}
      shadow-bias={-0.01}
    >
      <orthographicCamera attach="shadow-camera" args={[-20, 20, 20, -20, 0.1, 40]} />
    </directionalLight>
  );
});

export const GlobalEnvironment = memo(() => {
  const brightness = useGameStore(state => state.brightness);
  
  return (
    <>
      <color attach="background" args={["#111113"]} />
      <fog attach="fog" args={["#111113", 20, 90]} />
      
      <Sky sunPosition={[10, 5, 20]} turbidity={0.05} rayleigh={2} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <ambientLight intensity={0.6 * brightness} />
      <MovingShadowLight />
      <pointLight position={[-10, 5, -10]} intensity={1} color="#fcd34d" />
    </>
  );
});
