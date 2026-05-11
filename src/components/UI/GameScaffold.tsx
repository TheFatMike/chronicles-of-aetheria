/**
 * @file src/components/UI/GameScaffold.tsx
 * @description A layout component that manages responsive scaling for the game UI.
 * Ensures the interface maintains its design proportions across various screen sizes.
 * @importance Essential: Vital for cross-platform and multi-resolution support, ensuring the UI is always usable and visually consistent.
 */
import React, { useLayoutEffect, useState, ReactNode, createContext, useContext } from 'react';
import { useGameStore } from '../../store/useGameStore';
import { useShallow } from 'zustand/react/shallow';

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
  const { uiScale } = useGameStore(useShallow(s => ({ uiScale: s.uiScale })));
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useLayoutEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth / uiScale,
        height: window.innerHeight / uiScale
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [uiScale]);

  const toLogical = (screenX: number, screenY: number) => {
    return {
      x: screenX / uiScale,
      y: screenY / uiScale
    };
  };

  return (
    <ScaffoldContext.Provider value={{ scale: uiScale, offset: { x: 0, y: 0 }, toLogical }}>
      <div 
        id="game-viewport-wrapper" 
        className="fixed inset-0 pointer-events-none overflow-hidden z-50"
      >
        <div 
          id="game-viewport" 
          style={{
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            position: 'absolute',
            left: 0,
            top: 0,
            transform: `scale(${uiScale})`,
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
