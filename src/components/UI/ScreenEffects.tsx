/**
 * @file src/components/UI/ScreenEffects.tsx
 * @description Manages global screen-space visual effects like flashes and vignettes.
 */
import React from 'react';

export const ScreenEffects = () => {
  return (
    <div className="fixed inset-0 z-200 pointer-events-none overflow-hidden">
      {/* Subtle Vignette for Atmosphere */}
      <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.5)]" />
    </div>
  );
};
