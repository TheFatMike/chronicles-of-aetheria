import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { GAME_CONFIG } from "../../../config";

export const Water = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const size = GAME_CONFIG.WORLD.SIZE;

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
          
          float elevation = sin(modelPosition.x * 0.2 + uTime) * 
                           sin(modelPosition.z * 0.2 + uTime) * 0.15;
          
          modelPosition.y += elevation;
          vElevation = elevation;

          gl_Position = projectionMatrix * viewMatrix * modelPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uDeepColor;
        varying vec2 vUv;
        varying float vElevation;

        void main() {
          float mixStrength = (vElevation + 0.15) * 3.0;
          vec3 color = mix(uDeepColor, uColor, mixStrength);
          gl_FragColor = vec4(color, 0.75);
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
      ref={meshRef} 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -0.05, 0]} // Slightly below 0 to avoid z-fighting with flat terrain
    >
      <planeGeometry args={[size, size, 128, 128]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};
