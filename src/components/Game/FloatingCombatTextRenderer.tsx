import React, { memo, useRef } from "react";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { Billboard, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

const FCTItem = memo(({ text }: { text: import("@shared/types").CombatText }) => {
  const groupRef = useRef<any>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.position.y += delta * 1.5;
    }
  });

  const isHeal = text.type === "heal";
  const isMiss = text.type === "miss";
  const color = isHeal ? "#4ade80" : isMiss ? "#9ca3af" : text.isCrit ? "#fbbf24" : "#ef4444";
  const displayAmount = isMiss ? "Miss" : `${isHeal ? '+' : ''}${text.amount}${text.isCrit ? '!' : ''}`;

  return (
    <group ref={groupRef} position={[text.pos[0], text.pos[1] + 2.5, text.pos[2]]}>
      <Billboard>
        <Text
          fontSize={text.isCrit ? 0.8 : 0.5}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
          fontWeight="bold"
          material-depthTest={false} // Ensure it renders on top
        >
          {displayAmount}
        </Text>
      </Billboard>
    </group>
  );
});

FCTItem.displayName = "FCTItem";

export const FloatingCombatTextRenderer = memo(() => {
  const combatTexts = useGameStore(useShallow(state => state.combatTexts));

  return (
    <group>
      {combatTexts.map(text => (
        <FCTItem key={text.id} text={text} />
      ))}
    </group>
  );
});

FloatingCombatTextRenderer.displayName = "FloatingCombatTextRenderer";
