import { memo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OBJECT_TEMPLATES } from "../../data/world/templates";
import { GLBModel } from "./GLBModel";
import { ProceduralModel } from "./WorldObjectItem";
import { snapToGrid } from "../../lib/gameUtils";

export const PlacementGhost = memo(({ editorSelectedType, gridSnap }: { editorSelectedType: string | null, gridSnap: boolean }) => {
  const [pos, setPos] = useState<[number, number, number]>([0, 0, 0]);
  const { scene, raycaster, mouse, camera } = useThree();

  useFrame(() => {
    if (!editorSelectedType || editorSelectedType === 'delete' || editorSelectedType === 'edit') return;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    // Find the floor (usually a PlaneGeometry)
    const floor = intersects.find(i => 
      i.object.type === 'Mesh' && 
      ((i.object as any).geometry?.type === 'PlaneGeometry' || i.object.name === 'terrain_mesh')
    );
    
    if (floor) {
      let p = floor.point;
      if (gridSnap) {
        p.set(
          snapToGrid(p.x),
          p.y,
          snapToGrid(p.z)
        );
      }
      setPos([p.x, p.y + 0.1, p.z]);
    }
  });

  if (!editorSelectedType || editorSelectedType === 'delete' || editorSelectedType === 'edit') return null;

  // Use the same logic as WorldObjectItem but with ghost material
  const template = OBJECT_TEMPLATES[editorSelectedType];
  const ghostProps = { 
    position: [0,0,0] as [number, number, number], 
    scale: template?.scale || 1, 
    rotation: [0, 0, 0] as [number, number, number],
    isGhost: true 
  };
  
  return (
    <group position={pos} scale={1} rotation={[0, 0, 0]} raycast={() => null}>
      <group>
        {/* If the template has a modelUrl, show the GLB ghost! */}
        {template?.modelUrl ? (
          <GLBModel url={template.modelUrl} {...ghostProps} castShadow={false} />
        ) : (
          <ProceduralModel type={editorSelectedType} modelProps={ghostProps} />
        )}
      </group>
      {/* Visual aid for exact center */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.4, 0.5, 32]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.3} />
      </mesh>
    </group>
  );
});

PlacementGhost.displayName = "PlacementGhost";
