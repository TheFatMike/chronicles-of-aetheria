/**
 * @file src/components/Game/EditorGizmo.tsx
 * @description Provides interactive transformation handles for world objects.
 * Allows developers to precisely position, rotate, and scale objects within the editor.
 * @importance Essential: The primary interface for manipulating the spatial properties of game world objects.
 */
import { memo } from "react";
import * as THREE from "three";
import { TransformControls } from "@react-three/drei";

export const EditorGizmo = memo(({ 
  transformRef, 
  mode, 
  gridSnap, 
  onStart, 
  onEnd, 
  onChange 
}: { 
  transformRef: THREE.Object3D | null, 
  mode: 'translate' | 'rotate' | 'scale', 
  gridSnap: boolean,
  onStart: () => void,
  onEnd: () => void,
  onChange: () => void
}) => {
  if (!transformRef) return null;

  return (
    <TransformControls
      makeDefault
      object={transformRef}
      mode={mode}
      space="world"
      translationSnap={gridSnap ? 0.5 : null}
      rotationSnap={gridSnap ? Math.PI / 12 : null}
      scaleSnap={gridSnap ? 0.1 : null}
      onMouseDown={onStart}
      onMouseUp={onEnd}
      onChange={onChange}
    />
  );
});

EditorGizmo.displayName = "EditorGizmo";
