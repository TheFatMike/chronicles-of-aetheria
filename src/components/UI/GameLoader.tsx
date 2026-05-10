/**
 * @file src/components/UI/GameLoader.tsx
 * @description A bridge component that tracks loading progress and shows the loading screen.
 * Wait for 3D assets, textures, and world data to be ready before starting the game.
 * @importance Essential: Ensures a smooth transition from the menus into the 3D world without pop-in.
 */
import { useProgress } from "@react-three/drei";
import { LoadingScreen } from "./LoadingScreen";
import { useEffect, useState } from "react";

export const GameLoader = () => {
  const { active, progress, errors, item, loaded, total } = useProgress();
  const [show, setShow] = useState(false);

  // We want to show the loader as soon as anything starts loading
  useEffect(() => {
    if (active) {
      setShow(true);
    } else {
      // Small delay after loading finishes for smooth transition
      const timer = setTimeout(() => setShow(false), 500);
      return () => clearTimeout(timer);
    }
  }, [active]);

  if (!show) return null;

  // Extract a readable filename from the item path
  const currentItem = item ? item.split('/').pop()?.split('?')[0] : "Aetherial Essence";

  return (
    <LoadingScreen 
      message="MANIFESTING WORLD ASSETS..." 
      progress={progress}
      detail={`Summoning ${currentItem} (${loaded}/${total})`}
    />
  );
};
