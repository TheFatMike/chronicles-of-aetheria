import { motion } from "motion/react";
import { useMemo } from "react";

export const ParticleEffect = () => {
  const particles = useMemo(() => 
    Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 10,
    })), []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/10 blur-[1px]"
          initial={{ 
            x: `${p.x}vw`, 
            y: `${p.y}vh`, 
            opacity: 0,
            scale: 0 
          }}
          animate={{
            y: [`${p.y}vh`, `${p.y - 20}vh`],
            opacity: [0, 0.3, 0],
            scale: [0, 1, 0.5],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear",
          }}
          style={{
            width: p.size,
            height: p.size,
            boxShadow: '0 0 10px rgba(255,255,255,0.1)',
          }}
        />
      ))}
    </div>
  );
};
