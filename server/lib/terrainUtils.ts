export function getInterpolatedHeight(
  x: number, 
  z: number, 
  terrainData: Map<string, { y: number, type: string }>, 
  resolution: number = 4
): number {
  const x0 = Math.floor(x / resolution) * resolution;
  const z0 = Math.floor(z / resolution) * resolution;
  const x1 = x0 + resolution;
  const z1 = z0 + resolution;

  const h00 = terrainData.get(`${x0}_${z0}`)?.y || 0;
  const h10 = terrainData.get(`${x1}_${z0}`)?.y || 0;
  const h01 = terrainData.get(`${x0}_${z1}`)?.y || 0;
  const h11 = terrainData.get(`${x1}_${z1}`)?.y || 0;

  const tx = (x - x0) / resolution;
  const tz = (z - z0) / resolution;

  // PlaneGeometry splits quads into two triangles along the diagonal.
  // Triangle 1: tx + tz < 1
  // Triangle 2: tx + tz >= 1
  if (tx + tz < 1) {
    // Triangle 1: (x0,z0), (x1,z0), (x0,z1)
    // h = h00 + tx*(h10-h00) + tz*(h01-h00)
    return h00 + tx * (h10 - h00) + tz * (h01 - h00);
  } else {
    // Triangle 2: (x1,z1), (x0,z1), (x1,z0)
    // h = h11 + (1-tx)*(h01-h11) + (1-tz)*(h10-h11)
    return h11 + (1 - tx) * (h01 - h11) + (1 - tz) * (h10 - h11);
  }
}
