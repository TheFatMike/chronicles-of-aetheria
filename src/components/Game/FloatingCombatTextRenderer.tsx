import React, { memo, useRef, useState } from "react";
import { useGameStore } from "../../store/useGameStore";
import { useShallow } from "zustand/react/shallow";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";

const FCTItem = memo(({ text }: { text: import("@shared/types").CombatText }) => {
  const [life, setLife] = useState(1.0);
  const [yOffset, setYOffset] = useState(0);

  useFrame((_, delta) => {
    setYOffset(prev => prev + delta * 2.8);
    setLife(prev => Math.max(0, prev - delta * 0.45));
  });

  if (life <= 0) return null;

  const isHeal = text.type === "heal";
  const isMiss = text.type === "miss";
  const color = isHeal ? "#4ade80" : (isMiss ? "#9ca3af" : (text.isCrit ? "#fbbf24" : "#ef4444"));
  const displayAmount = isMiss ? "MISS" : `${isHeal ? '+' : ''}${text.amount}${text.isCrit ? '!' : ''}`;

  return (
    <group position={[text.pos[0], text.pos[1] + 2.5 + yOffset, text.pos[2]]}>
      <Html
        center
        zIndexRange={[100, 1000]}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: life,
          transform: `scale(${text.isCrit ? 1.4 : 1.0})`,
          transition: 'opacity 0.1s linear'
        }}
      >
        <div style={{
          color: color,
          fontWeight: '900',
          fontSize: '3rem',
          whiteSpace: 'nowrap',
          textShadow: '2px 2px 0px black, -2px -2px 0px black, 2px -2px 0px black, -2px 2px 0px black',
          fontFamily: "Arial, sans-serif",
          filter: text.isCrit ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.6))' : 'none'
        }}>
          {displayAmount}
        </div>
      </Html>
    </group>
  );
});

FCTItem.displayName = "FCTItem";

export const FloatingCombatTextRenderer = memo(() => {
  const combatTexts = useGameStore(useShallow(state => state.combatTexts));

  return (
    <group name="combat-text-layer">
      {combatTexts.map(text => (
        <FCTItem key={text.id} text={text} />
      ))}
    </group>
  );
});

FloatingCombatTextRenderer.displayName = "FloatingCombatTextRenderer";

