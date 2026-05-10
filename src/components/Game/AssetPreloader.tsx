/**
 * @file src/components/Game/AssetPreloader.tsx
 * @description Manages the asynchronous loading of 3D models and textures.
 * Ensures all necessary assets are available in memory before they are needed in the scene.
 * @importance Essential: Prevents visual glitches and stuttering by pre-caching large assets.
 */
import { useEffect } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { logger } from "../../lib/logger";
import { OBJECT_TEMPLATES } from "../../data/world/templates";

// Essential assets to preload
const ESSENTIAL_MODELS = [
  // Add any common models here
  ...Object.values(OBJECT_TEMPLATES)
    .filter(t => t.modelUrl)
    .map(t => t.modelUrl!)
];

const ESSENTIAL_TEXTURES = [
  "https://www.transparenttextures.com/patterns/dark-leather.png",
  "https://www.transparenttextures.com/patterns/dark-wood.png",
];

export const AssetPreloader = () => {
  useEffect(() => {
    logger.info("system", "Starting preloading of essential assets...");
    
    // Preload GLB models
    ESSENTIAL_MODELS.forEach(url => {
      useGLTF.preload(url);
    });

    // Preload textures if any
    // Note: useTexture.preload doesn't exist in some versions of drei, 
    // but we can just use new Image().src for simple textures or let the browser handle it.
    ESSENTIAL_TEXTURES.forEach(url => {
      const img = new Image();
      img.src = url;
    });
  }, []);

  return null; // This component doesn't render anything
};
