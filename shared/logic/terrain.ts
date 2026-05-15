/**
 * @file shared/logic/terrain.ts
 * @description Shared terrain height calculation and interpolation logic.
 */

export interface TerrainPoint {
  y: number;
  type: string;
}

/**
 * Calculates the interpolated height at a given X, Z coordinate based on terrain data.
 * @param x The X coordinate
 * @param z The Z coordinate
 * @param terrainData A map or record of terrain points keyed by "x_z"
 * @param resolution The distance between terrain grid points
 * @returns The interpolated height
 */
export function getInterpolatedHeight(
  x: number,
  z: number,
  terrainData: Map<string, TerrainPoint> | Record<string, TerrainPoint>,
  resolution: number = 2
): number {
  const x0 = Math.floor(x / resolution) * resolution;
  const z0 = Math.floor(z / resolution) * resolution;
  const x1 = x0 + resolution;
  const z1 = z0 + resolution;

  const getVal = (kx: number, kz: number): number => {
    // Ensure we use integer keys even if kx/kz have precision jitter
    const ix = Math.round(kx);
    const iz = Math.round(kz);
    const key = `${ix}_${iz}`;
    let val: TerrainPoint | undefined;
    if (terrainData instanceof Map) {
      val = terrainData.get(key);
    } else {
      val = (terrainData as Record<string, TerrainPoint>)[key];
    }
    return val ? val.y : 0;
  };

  const h00 = getVal(x0, z0);
  const h10 = getVal(x1, z0);
  const h01 = getVal(x0, z1);
  const h11 = getVal(x1, z1);

  const tx = (x - x0) / resolution;
  const tz = (z - z0) / resolution;

  // PlaneGeometry splits quads into two triangles along the diagonal (tx + tz < 1)
  if (tx + tz < 1) {
    // Triangle 1: (x0,z0), (x1,z0), (x0,z1)
    return h00 + tx * (h10 - h00) + tz * (h01 - h00);
  } else {
    // Triangle 2: (x1,z1), (x0,z1), (x1,z0)
    return h11 + (1 - tx) * (h01 - h11) + (1 - tz) * (h10 - h11);
  }
}
