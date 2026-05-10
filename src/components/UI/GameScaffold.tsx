/**
 * @file src/components/UI/GameScaffold.tsx
 * @description A layout component that manages responsive scaling for the game UI.
 * Ensures the interface maintains its design proportions across various screen sizes.
 * @importance Essential: Vital for cross-platform and multi-resolution support, ensuring the UI is always usable and visually consistent.
 */
import React, { useLayoutEffect, useState, ReactNode, createContext, useContext } from 'react';

export const DESIGN_RES = { width: 1920, height: 1080 };

interface ScaffoldContextType {
  scale: number;
  offset: { x: number; y: number };
  toLogical: (screenX: number, screenY: number) => { x: number; y: number };
}

const ScaffoldContext = createContext<ScaffoldContextType | null>(null);

export const useScaffold = () => {
  const ctx = useContext(ScaffoldContext);
  if (!ctx) throw new Error("useScaffold must be used within GameScaffold");
  return ctx;
};

interface GameScaffoldProps {
  children: ReactNode;
}

export const GameScaffold: React.FC<GameScaffoldProps> = ({ children }) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const handleResize = () => {
      const baseScale = Math.min(
        window.innerWidth / DESIGN_RES.width,
        window.innerHeight / DESIGN_RES.height
      );
      // Apply a global scale factor (0.9x) to make the UI feel less cramped
      const s = baseScale * 0.9;
      setScale(s);

      const actualWidth = DESIGN_RES.width * s;
      const actualHeight = DESIGN_RES.height * s;
      
      const off = {
        x: (window.innerWidth - actualWidth) / 2,
        y: (window.innerHeight - actualHeight) / 2
      };
      setOffset(off);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toLogical = (screenX: number, screenY: number) => {
    return {
      x: (screenX - offset.x) / scale,
      y: (screenY - offset.y) / scale
    };
  };

  return (
    <ScaffoldContext.Provider value={{ scale, offset, toLogical }}>
      <div 
        id="game-viewport-wrapper" 
        className="fixed inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-50"
      >
        <div 
          id="game-viewport" 
          style={{
            width: DESIGN_RES.width,
            height: DESIGN_RES.height,
            position: 'absolute',
            left: offset.x,
            top: offset.y,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 10
          }}
        >
          {children}
        </div>
      </div>
    </ScaffoldContext.Provider>
  );
};
