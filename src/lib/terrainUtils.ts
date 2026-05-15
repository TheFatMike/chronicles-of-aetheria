import { getInterpolatedHeight as sharedGetInterpolatedHeight, TerrainPoint } from "../../shared/logic/terrain";

export function getInterpolatedHeight(
  x: number, 
  z: number, 
  terrainData: Record<string, { y: number, type: string }>, 
  resolution: number = 2
): number {
  return sharedGetInterpolatedHeight(x, z, terrainData as Record<string, TerrainPoint>, resolution);
}
