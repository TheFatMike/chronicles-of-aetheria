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
