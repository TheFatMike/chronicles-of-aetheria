/**
 * @file src/components/Game/AssetPreloader.tsx
 * @description Manages the asynchronous loading of 3D models and textures.
 * Ensures all necessary assets are available in memory before they are needed in the scene.
 * @importance Essential: Prevents visual glitches and stuttering by pre-caching large assets.
 */
import { useEffect } from "react";
import { useGLTF, useTexture, useProgress } from "@react-three/drei";
import { logger } from "../../lib/logger";
import { OBJECT_TEMPLATES } from "@shared/data/world/templates";
import { useGameStore } from "../../store/useGameStore";

// Essential assets to preload
const ESSENTIAL_MODELS = [
  ...Object.values(OBJECT_TEMPLATES)
    .filter(t => t.modelUrl)
    .map(t => t.modelUrl!)
];

const ESSENTIAL_TEXTURES = [
  "https://www.transparenttextures.com/patterns/dark-leather.png",
  "https://www.transparenttextures.com/patterns/dark-wood.png",
];

export const AssetPreloader = () => {
  const { progress } = useProgress();
  const setAssetsReady = useGameStore(s => s.setAssetsReady);

  useEffect(() => {
    logger.info("system", "Starting preloading of essential assets...");
    
    // Preload GLB models
    ESSENTIAL_MODELS.forEach(url => {
      useGLTF.preload(url);
    });

    ESSENTIAL_TEXTURES.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }, []);

  useEffect(() => {
    if (progress === 100) {
      logger.info("system", "All assets manifest and ready.");
      setAssetsReady(true);
    }
  }, [progress, setAssetsReady]);

  return null;
};
