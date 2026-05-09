import { useRef, memo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface HumanoidProps {
  color: string;
  isMoving?: boolean;
  isGrounded?: boolean;
  isAttacking?: boolean;
}

export const Humanoid = memo(({ color, isMoving = false, isGrounded = true, isAttacking = false }: HumanoidProps) => {
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const walkSpeed = 10;
    const walkAmount = 0.5;
    const lerpSpeed = 0.1;

    // Reset rotation helper
    const resetRotation = (ref: React.RefObject<THREE.Group | null>) => {
      if (ref.current) ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, 0, lerpSpeed);
    };

    if (isAttacking) {
      if (rightArm.current) rightArm.current.rotation.x = -Math.PI * 0.8;
      if (leftArm.current) resetRotation(leftArm);
      if (leftLeg.current) resetRotation(leftLeg);
      if (rightLeg.current) resetRotation(rightLeg);
      return;
    }

    if (isMoving && isGrounded) {
      const walkCycle = Math.sin(time * walkSpeed);
      if (leftLeg.current) leftLeg.current.rotation.x = walkCycle * walkAmount;
      if (rightLeg.current) rightLeg.current.rotation.x = -walkCycle * walkAmount;
      if (leftArm.current) leftArm.current.rotation.x = -walkCycle * walkAmount;
      if (rightArm.current) rightArm.current.rotation.x = walkCycle * walkAmount;
      
      if (body.current) {
        body.current.position.y = Math.abs(Math.cos(time * walkSpeed)) * 0.05;
      }
    } else {
      resetRotation(leftLeg);
      resetRotation(rightLeg);
      resetRotation(leftArm);
      resetRotation(rightArm);
      if (body.current) body.current.position.y = THREE.MathUtils.lerp(body.current.position.y, 0, lerpSpeed);
    }

    if (!isGrounded) {
      if (leftLeg.current) leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, 0.5, lerpSpeed);
      if (rightLeg.current) rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, -0.2, lerpSpeed);
      if (leftArm.current) leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, -1, lerpSpeed);
      if (rightArm.current) rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, -1, lerpSpeed);
    }
  });

  return (
    <group ref={body}>
      {/* Torso */}
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.5, 0.7, 0.25]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.45, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="#fcd4b4" />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.07, 1.5, -0.16]}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshStandardMaterial color="black" />
      </mesh>
      <mesh position={[0.07, 1.5, -0.16]}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshStandardMaterial color="black" />
      </mesh>

      {/* Left Arm */}
      <group ref={leftArm} position={[-0.35, 1.25, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.15, 0.5, 0.15]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>

      {/* Right Arm */}
      <group ref={rightArm} position={[0.35, 1.25, 0]}>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.15, 0.5, 0.15]} />
          <meshStandardMaterial color={color} />
        </mesh>
      </group>

      {/* Left Leg */}
      <group ref={leftLeg} position={[-0.15, 0.6, 0]}>
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[0.18, 0.6, 0.18]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </group>

      {/* Right Leg */}
      <group ref={rightLeg} position={[0.15, 0.6, 0]}>
        <mesh position={[0, -0.3, 0]}>
          <boxGeometry args={[0.18, 0.6, 0.18]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </group>
    </group>
  );
});

Humanoid.displayName = "Humanoid";
