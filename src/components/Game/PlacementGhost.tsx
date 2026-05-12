/**
 * @file src/components/Game/PlacementGhost.tsx
 * @description Provides a semi-transparent visual preview of an object being placed in the editor.
 * Snaps to the grid and terrain height to show the exact final position of the object.
 * @importance Essential: Improves the world-building experience by providing immediate visual feedback during editing.
 */
import { memo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OBJECT_TEMPLATES } from "../../data/world/templates";
import { GLBModel } from "./GLBModel";
import { ProceduralModel } from "./WorldObjectItem";
import { snapToGrid } from "../../lib/gameUtils";
import { logger } from "../../lib/logger";
import { isDebugEnabled } from "../../debug.config";
import { useGameStore } from "../../store/useGameStore";

export const PlacementGhost = memo(({ editorSelectedType, gridSnap }: { editorSelectedType: string | null, gridSnap: boolean }) => {
  const [pos, setPos] = useState<[number, number, number]>([0, 0, 0]);
  const { scene, raycaster, mouse, camera } = useThree();

  useFrame(() => {
    if (!editorSelectedType || editorSelectedType === 'delete' || editorSelectedType === 'edit') return;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // Find the floor or terrain (specifically target these for editor tools)
    const floor = intersects.find(i => 
      i.object.name === 'terrain_mesh' || 
      i.object.name === 'starting_plaza' ||
      (i.object as any).geometry?.type === 'PlaneGeometry'
    );
    
    if (floor) {
      let p = floor.point;
      
      if (isDebugEnabled('CLIENT', 'EDITOR') && performance.now() % 500 < 16) {
        logger.debug("editor", "Brush Raycast", { 
          mouse: { x: mouse.x.toFixed(2), y: mouse.y.toFixed(2) },
          hit: { x: p.x.toFixed(2), y: p.y.toFixed(2), z: p.z.toFixed(2) },
          obj: floor.object.name 
        });
      }

      // Keep the visual cursor smooth for better feel, 
      // even though sculpting logic snaps to resolution internally
      if (!editorSelectedType.startsWith('terrain_') && gridSnap) {
        p.set(
          snapToGrid(p.x),
          p.y,
          snapToGrid(p.z)
        );
      }
      setPos([p.x, p.y + 0.1, p.z]);
    } else if (isDebugEnabled('CLIENT', 'EDITOR') && performance.now() % 500 < 16) {
      logger.debug("editor", "Brush Raycast FAILED", { count: intersects.length });
    }
  });

  const brushSize = useGameStore(state => state.editorBrushSize);

  if (!editorSelectedType || editorSelectedType === 'delete' || editorSelectedType === 'edit') return null;

  const isTerrainTool = editorSelectedType.startsWith('terrain_');
  
  return (
    <group>
      {/* Raw Hit Debug Marker (Red dot) */}
      {isDebugEnabled('CLIENT', 'EDITOR') && (
        <mesh position={pos}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshBasicMaterial color="red" />
        </mesh>
      )}

      <group position={pos} raycast={() => null}>
        {isTerrainTool ? (
          <>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[brushSize - 0.2, brushSize, 64]} />
              <meshBasicMaterial color="#3b82f6" transparent opacity={0.5} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[brushSize, 64]} />
              <meshBasicMaterial color="#3b82f6" transparent opacity={0.1} />
            </mesh>
          </>
        ) : (
          <>
            <group>
              {OBJECT_TEMPLATES[editorSelectedType]?.modelUrl ? (
                <GLBModel url={OBJECT_TEMPLATES[editorSelectedType].modelUrl} position={[0,0,0]} scale={OBJECT_TEMPLATES[editorSelectedType].scale || 1} rotation={[0,0,0]} isGhost={true} castShadow={false} />
              ) : (
                <ProceduralModel 
                  type={editorSelectedType} 
                  isEditorOpen={true}
                  modelProps={{ position: [0,0,0], scale: 1, rotation: [0,0,0], isGhost: true }} 
                />
              )}
            </group>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
              <ringGeometry args={[0.4, 0.5, 32]} />
              <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
});

PlacementGhost.displayName = "PlacementGhost";
