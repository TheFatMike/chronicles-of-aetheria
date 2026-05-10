/**
 * @file src/components/UI/Particles.tsx
 * @description A lightweight UI particle system using Framer Motion.
 * Adds visual flair and ambient effects to screens like the loading screen and character selection.
 * @importance Essential: Enhances the aesthetic appeal and polish of the game's user interface.
 */
import { motion } from "motion/react";
import { useMemo } from "react";

export const ParticleEffect = () => {
  const particles = useMemo(() => 
    Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      drift: Math.random() * 10 - 5,
      duration: Math.random() * 10 + 15,
      delay: Math.random() * -25, 
      color: i % 3 === 0 ? '#f4e4bc' : '#ffffff',
    })), []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-1">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full blur-[1px]"
          style={{
            left: `${p.x}vw`,
            top: `${p.y}vh`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 12px ${p.color}88`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            y: [0, "-30vh"], // Move up relative to start
            x: [0, `${p.drift}vw`], // Move horizontally relative to start
            opacity: [0, 0.7, 0.8, 0.7, 0],
            scale: [0, 1, 1.3, 1, 0.4],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};
