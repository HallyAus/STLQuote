// STL Parser — zero-dependency, client-side STL file parser
// Handles both binary and ASCII STL formats

export interface STLParseResult {
  triangleCount: number;
  volumeCm3: number;
  boundingBox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
  dimensionsMm: { x: number; y: number; z: number };
}

export interface STLEstimates {
  volumeCm3: number;
  weightG: number;
  printTimeMinutes: number;
  dimensionsMm: { x: number; y: number; z: number };
  triangleCount: number;
  filename: string;
}

export type SpeedPreset = "fast" | "standard" | "quality";

export const MATERIAL_DENSITIES: Record<string, number> = {
  PLA: 1.24,
  PETG: 1.27,
  ABS: 1.04,
  TPU: 1.21,
  ASA: 1.07,
  Nylon: 1.14,
  "Standard Resin": 1.1,
  "ABS-Like Resin": 1.12,
};

export const SPEED_PRESETS: Record<SpeedPreset, number> = {
  fast: 2.5,
  standard: 3.5,
  quality: 5.0,
};

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Auto-detect binary vs ASCII STL and parse accordingly.
 *
 * Detection logic: if the file starts with "solid" AND the expected binary
 * size (84 + triangleCount * 50) doesn't match the actual buffer length,
 * treat it as ASCII. Otherwise treat it as binary.
 */
export function parseSTL(buffer: ArrayBuffer): STLParseResult {
  if (buffer.byteLength < 84) {
    throw new Error(
      `STL file too small: ${buffer.byteLength} bytes (minimum 84 bytes for a valid binary STL)`
    );
  }

  // Check if file starts with "solid"
  const header = new Uint8Array(buffer, 0, 5);
  const startsWithSolid =
    header[0] === 0x73 && // s
    header[1] === 0x6f && // o
    header[2] === 0x6c && // l
    header[3] === 0x69 && // i
    header[4] === 0x64; // d

  if (startsWithSolid) {
    // Read the triangle count from the binary header position
    const view = new DataView(buffer);
    const triangleCount = view.getUint32(80, true);
    const expectedBinarySize = 84 + triangleCount * 50;

    // If the expected binary size doesn't match, it's likely ASCII
    if (expectedBinarySize !== buffer.byteLength) {
      const decoder = new TextDecoder();
      const text = decoder.decode(buffer);
      return parseASCIISTL(text);
    }
  }

  return parseBinarySTL(buffer);
}

/**
 * Parse a binary STL file.
 *
 * Binary STL format:
 *   - 80 bytes: header (ignored)
 *   - 4 bytes: uint32 triangle count (little-endian)
 *   - Per triangle (50 bytes each):
 *     - 12 bytes: normal vector (3x float32, ignored)
 *     - 36 bytes: 3 vertices (each 3x float32 little-endian)
 *     - 2 bytes: attribute byte count (ignored)
 */
export function parseBinarySTL(buffer: ArrayBuffer): STLParseResult {
  if (buffer.byteLength < 84) {
    throw new Error(
      `STL file too small: ${buffer.byteLength} bytes (minimum 84 bytes for a valid binary STL)`
    );
  }

  const view = new DataView(buffer);
  const triangleCount = view.getUint32(80, true);
  const expectedSize = 84 + triangleCount * 50;

  if (buffer.byteLength !== expectedSize) {
    throw new Error(
      `Invalid binary STL: expected ${expectedSize} bytes for ${triangleCount} triangles, got ${buffer.byteLength} bytes`
    );
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let volumeSum = 0;

  for (let i = 0; i < triangleCount; i++) {
    const offset = 84 + i * 50;

    // Skip 12 bytes for normal vector, read 3 vertices
    const v1x = view.getFloat32(offset + 12, true);
    const v1y = view.getFloat32(offset + 16, true);
    const v1z = view.getFloat32(offset + 20, true);

    const v2x = view.getFloat32(offset + 24, true);
    const v2y = view.getFloat32(offset + 28, true);
    const v2z = view.getFloat32(offset + 32, true);

    const v3x = view.getFloat32(offset + 36, true);
    const v3y = view.getFloat32(offset + 40, true);
    const v3z = view.getFloat32(offset + 44, true);

    // Update bounding box
    minX = Math.min(minX, v1x, v2x, v3x);
    maxX = Math.max(maxX, v1x, v2x, v3x);
    minY = Math.min(minY, v1y, v2y, v3y);
    maxY = Math.max(maxY, v1y, v2y, v3y);
    minZ = Math.min(minZ, v1z, v2z, v3z);
    maxZ = Math.max(maxZ, v1z, v2z, v3z);

    // Signed tetrahedra volume contribution
    const contribution =
      (v1x * (v2y * v3z - v3y * v2z) -
        v2x * (v1y * v3z - v3y * v1z) +
        v3x * (v1y * v2z - v2y * v1z)) /
      6.0;

    volumeSum += contribution;
  }

  // Convert mm³ to cm³ (÷1000)
  const volumeCm3 = Math.abs(volumeSum) / 1000;

  return {
    triangleCount,
    volumeCm3,
    boundingBox: { minX, maxX, minY, maxY, minZ, maxZ },
    dimensionsMm: {
      x: maxX - minX,
      y: maxY - minY,
      z: maxZ - minZ,
    },
  };
}

/**
 * Parse an ASCII STL file.
 *
 * ASCII STL format:
 *   solid name
 *     facet normal ni nj nk
 *       outer loop
 *         vertex v1x v1y v1z
 *         vertex v2x v2y v2z
 *         vertex v3x v3y v3z
 *       endloop
 *     endfacet
 *   endsolid name
 */
export function parseASCIISTL(text: string): STLParseResult {
  const vertexRegex = /vertex\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s+([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/gi;

  const vertices: { x: number; y: number; z: number }[] = [];
  let match: RegExpExecArray | null;

  while ((match = vertexRegex.exec(text)) !== null) {
    vertices.push({
      x: parseFloat(match[1]),
      y: parseFloat(match[2]),
      z: parseFloat(match[3]),
    });
  }

  if (vertices.length === 0 || vertices.length % 3 !== 0) {
    throw new Error(
      `Invalid ASCII STL: found ${vertices.length} vertices (must be a multiple of 3)`
    );
  }

  const triangleCount = vertices.length / 3;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let volumeSum = 0;

  for (let i = 0; i < triangleCount; i++) {
    const v1 = vertices[i * 3];
    const v2 = vertices[i * 3 + 1];
    const v3 = vertices[i * 3 + 2];

    // Update bounding box
    minX = Math.min(minX, v1.x, v2.x, v3.x);
    maxX = Math.max(maxX, v1.x, v2.x, v3.x);
    minY = Math.min(minY, v1.y, v2.y, v3.y);
    maxY = Math.max(maxY, v1.y, v2.y, v3.y);
    minZ = Math.min(minZ, v1.z, v2.z, v3.z);
    maxZ = Math.max(maxZ, v1.z, v2.z, v3.z);

    // Signed tetrahedra volume contribution
    const contribution =
      (v1.x * (v2.y * v3.z - v3.y * v2.z) -
        v2.x * (v1.y * v3.z - v3.y * v1.z) +
        v3.x * (v1.y * v2.z - v2.y * v1.z)) /
      6.0;

    volumeSum += contribution;
  }

  const volumeCm3 = Math.abs(volumeSum) / 1000;

  return {
    triangleCount,
    volumeCm3,
    boundingBox: { minX, maxX, minY, maxY, minZ, maxZ },
    dimensionsMm: {
      x: maxX - minX,
      y: maxY - minY,
      z: maxZ - minZ,
    },
  };
}

/**
 * Estimate weight and print time from parsed STL data.
 *
 * Weight formula: volumeCm3 * density * (infill/100) * 1.15
 *   The 1.15 multiplier accounts for solid walls, top, and bottom layers.
 *
 * Print time formula: volumeCm3 * speedPresetFactor (minutes per cm³)
 */
export function estimateFromSTL(
  result: STLParseResult,
  options: {
    densityGPerCm3: number;
    infillPercent: number;
    speedPreset: SpeedPreset;
    filename: string;
  }
): STLEstimates {
  const wallFactor = 1.15;
  const weightG =
    result.volumeCm3 *
    options.densityGPerCm3 *
    (options.infillPercent / 100) *
    wallFactor;

  const printTimeMinutes =
    result.volumeCm3 * SPEED_PRESETS[options.speedPreset];

  return {
    volumeCm3: result.volumeCm3,
    weightG,
    printTimeMinutes,
    dimensionsMm: result.dimensionsMm,
    triangleCount: result.triangleCount,
    filename: options.filename,
  };
}
