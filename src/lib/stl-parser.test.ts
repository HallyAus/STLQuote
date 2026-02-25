import { describe, it, expect } from "vitest";
import {
  parseSTL,
  parseBinarySTL,
  parseASCIISTL,
  estimateFromSTL,
  MATERIAL_DENSITIES,
  SPEED_PRESETS,
  type STLParseResult,
} from "./stl-parser";

/**
 * Create a valid binary STL buffer from an array of triangles.
 * Each triangle has 3 vertices (v1, v2, v3) as [x, y, z] tuples.
 */
function createBinarySTLBuffer(
  triangles: {
    v1: [number, number, number];
    v2: [number, number, number];
    v3: [number, number, number];
  }[]
): ArrayBuffer {
  const size = 84 + triangles.length * 50;
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);

  // 80-byte header (leave as zeros)
  // Triangle count at offset 80
  view.setUint32(80, triangles.length, true);

  for (let i = 0; i < triangles.length; i++) {
    const offset = 84 + i * 50;
    const { v1, v2, v3 } = triangles[i];

    // Normal vector (12 bytes) — set to zero, parser ignores it
    view.setFloat32(offset + 0, 0, true);
    view.setFloat32(offset + 4, 0, true);
    view.setFloat32(offset + 8, 0, true);

    // Vertex 1
    view.setFloat32(offset + 12, v1[0], true);
    view.setFloat32(offset + 16, v1[1], true);
    view.setFloat32(offset + 20, v1[2], true);

    // Vertex 2
    view.setFloat32(offset + 24, v2[0], true);
    view.setFloat32(offset + 28, v2[1], true);
    view.setFloat32(offset + 32, v2[2], true);

    // Vertex 3
    view.setFloat32(offset + 36, v3[0], true);
    view.setFloat32(offset + 40, v3[1], true);
    view.setFloat32(offset + 44, v3[2], true);

    // Attribute byte count (2 bytes) — zero
    view.setUint16(offset + 48, 0, true);
  }

  return buffer;
}

/**
 * 12 triangles forming a 10×10×10mm cube from (0,0,0) to (10,10,10).
 * Outward-facing normals with counter-clockwise winding (right-hand rule).
 */
const CUBE_TRIANGLES: {
  v1: [number, number, number];
  v2: [number, number, number];
  v3: [number, number, number];
}[] = [
  // Front face (z = 10) — normal +Z
  { v1: [0, 0, 10], v2: [10, 0, 10], v3: [10, 10, 10] },
  { v1: [0, 0, 10], v2: [10, 10, 10], v3: [0, 10, 10] },
  // Back face (z = 0) — normal -Z
  { v1: [0, 0, 0], v2: [10, 10, 0], v3: [10, 0, 0] },
  { v1: [0, 0, 0], v2: [0, 10, 0], v3: [10, 10, 0] },
  // Right face (x = 10) — normal +X
  { v1: [10, 0, 0], v2: [10, 10, 0], v3: [10, 10, 10] },
  { v1: [10, 0, 0], v2: [10, 10, 10], v3: [10, 0, 10] },
  // Left face (x = 0) — normal -X
  { v1: [0, 0, 0], v2: [0, 10, 10], v3: [0, 10, 0] },
  { v1: [0, 0, 0], v2: [0, 0, 10], v3: [0, 10, 10] },
  // Top face (y = 10) — normal +Y
  { v1: [0, 10, 0], v2: [0, 10, 10], v3: [10, 10, 10] },
  { v1: [0, 10, 0], v2: [10, 10, 10], v3: [10, 10, 0] },
  // Bottom face (y = 0) — normal -Y
  { v1: [0, 0, 0], v2: [10, 0, 0], v3: [10, 0, 10] },
  { v1: [0, 0, 0], v2: [10, 0, 10], v3: [0, 0, 10] },
];

/**
 * ASCII STL representation of the same 10×10×10mm cube.
 */
const CUBE_ASCII = `solid cube
  facet normal 0 0 1
    outer loop
      vertex 0 0 10
      vertex 10 0 10
      vertex 10 10 10
    endloop
  endfacet
  facet normal 0 0 1
    outer loop
      vertex 0 0 10
      vertex 10 10 10
      vertex 0 10 10
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 10 10 0
      vertex 10 0 0
    endloop
  endfacet
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 0 10 0
      vertex 10 10 0
    endloop
  endfacet
  facet normal 1 0 0
    outer loop
      vertex 10 0 0
      vertex 10 10 0
      vertex 10 10 10
    endloop
  endfacet
  facet normal 1 0 0
    outer loop
      vertex 10 0 0
      vertex 10 10 10
      vertex 10 0 10
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex 0 0 0
      vertex 0 10 10
      vertex 0 10 0
    endloop
  endfacet
  facet normal -1 0 0
    outer loop
      vertex 0 0 0
      vertex 0 0 10
      vertex 0 10 10
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex 0 10 0
      vertex 0 10 10
      vertex 10 10 10
    endloop
  endfacet
  facet normal 0 1 0
    outer loop
      vertex 0 10 0
      vertex 10 10 10
      vertex 10 10 0
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 10 0 0
      vertex 10 0 10
    endloop
  endfacet
  facet normal 0 -1 0
    outer loop
      vertex 0 0 0
      vertex 10 0 10
      vertex 0 0 10
    endloop
  endfacet
endsolid cube`;

describe("parseBinarySTL", () => {
  it("should parse a single triangle", () => {
    const buffer = createBinarySTLBuffer([
      { v1: [0, 0, 0], v2: [10, 0, 0], v3: [5, 10, 0] },
    ]);

    const result = parseBinarySTL(buffer);

    expect(result.triangleCount).toBe(1);
    expect(result.boundingBox.minX).toBe(0);
    expect(result.boundingBox.maxX).toBe(10);
    expect(result.boundingBox.minY).toBe(0);
    expect(result.boundingBox.maxY).toBe(10);
    expect(result.boundingBox.minZ).toBe(0);
    expect(result.boundingBox.maxZ).toBe(0);
  });

  it("should parse a 10mm cube with correct volume and dimensions", () => {
    const buffer = createBinarySTLBuffer(CUBE_TRIANGLES);
    const result = parseBinarySTL(buffer);

    expect(result.triangleCount).toBe(12);
    expect(result.volumeCm3).toBeCloseTo(1.0, 2);
    expect(result.boundingBox.minX).toBe(0);
    expect(result.boundingBox.maxX).toBe(10);
    expect(result.boundingBox.minY).toBe(0);
    expect(result.boundingBox.maxY).toBe(10);
    expect(result.boundingBox.minZ).toBe(0);
    expect(result.boundingBox.maxZ).toBe(10);
    expect(result.dimensionsMm.x).toBe(10);
    expect(result.dimensionsMm.y).toBe(10);
    expect(result.dimensionsMm.z).toBe(10);
  });
});

describe("parseASCIISTL", () => {
  it("should parse an ASCII cube with correct volume and dimensions", () => {
    const result = parseASCIISTL(CUBE_ASCII);

    expect(result.triangleCount).toBe(12);
    expect(result.volumeCm3).toBeCloseTo(1.0, 2);
    expect(result.dimensionsMm.x).toBe(10);
    expect(result.dimensionsMm.y).toBe(10);
    expect(result.dimensionsMm.z).toBe(10);
  });
});

describe("parseSTL", () => {
  it("should auto-detect binary format", () => {
    const buffer = createBinarySTLBuffer(CUBE_TRIANGLES);
    const result = parseSTL(buffer);

    expect(result.triangleCount).toBe(12);
    expect(result.volumeCm3).toBeCloseTo(1.0, 2);
  });

  it("should auto-detect ASCII format", () => {
    const encoder = new TextEncoder();
    const buffer = encoder.encode(CUBE_ASCII).buffer;
    const result = parseSTL(buffer);

    expect(result.triangleCount).toBe(12);
    expect(result.volumeCm3).toBeCloseTo(1.0, 2);
  });
});

describe("estimateFromSTL", () => {
  it("should estimate PLA weight and time at 20% infill", () => {
    const parseResult: STLParseResult = {
      triangleCount: 12,
      volumeCm3: 10,
      boundingBox: {
        minX: 0,
        maxX: 10,
        minY: 0,
        maxY: 10,
        minZ: 0,
        maxZ: 100,
      },
      dimensionsMm: { x: 10, y: 10, z: 100 },
    };

    const estimates = estimateFromSTL(parseResult, {
      densityGPerCm3: MATERIAL_DENSITIES.PLA,
      infillPercent: 20,
      speedPreset: "standard",
      filename: "test-part.stl",
    });

    // effectiveFill = 0.25 + 0.75 * 0.20 = 0.40
    // Weight = 10 * 1.24 * 0.40 = 4.96
    expect(estimates.weightG).toBeCloseTo(4.96, 2);
    // Time = round(10 * 0.75) = 8
    expect(estimates.printTimeMinutes).toBe(8);
    expect(estimates.volumeCm3).toBe(10);
    expect(estimates.triangleCount).toBe(12);
    expect(estimates.filename).toBe("test-part.stl");
    expect(estimates.dimensionsMm).toEqual({ x: 10, y: 10, z: 100 });
  });
});

describe("error handling", () => {
  it("should throw on file smaller than 84 bytes", () => {
    const buffer = new ArrayBuffer(50);
    expect(() => parseSTL(buffer)).toThrow("too small");
    expect(() => parseBinarySTL(buffer)).toThrow("too small");
  });

  it("should throw on invalid binary size (mismatched triangle count)", () => {
    // Create a buffer that claims 10 triangles but is too short
    const buffer = new ArrayBuffer(200);
    const view = new DataView(buffer);
    view.setUint32(80, 10, true); // claims 10 triangles = 84 + 500 = 584 bytes needed

    expect(() => parseBinarySTL(buffer)).toThrow("Invalid binary STL");
  });
});

describe("bounding box", () => {
  it("should track correct min/max for non-origin-centred shape", () => {
    // Triangle offset from origin: vertices at (5,5,5), (15,5,5), (10,15,5)
    const buffer = createBinarySTLBuffer([
      { v1: [5, 5, 5], v2: [15, 5, 5], v3: [10, 15, 5] },
    ]);

    const result = parseBinarySTL(buffer);

    expect(result.boundingBox.minX).toBe(5);
    expect(result.boundingBox.maxX).toBe(15);
    expect(result.boundingBox.minY).toBe(5);
    expect(result.boundingBox.maxY).toBe(15);
    expect(result.boundingBox.minZ).toBe(5);
    expect(result.boundingBox.maxZ).toBe(5);
    expect(result.dimensionsMm.x).toBe(10);
    expect(result.dimensionsMm.y).toBe(10);
    expect(result.dimensionsMm.z).toBe(0);
  });

  it("should handle negative coordinates", () => {
    const buffer = createBinarySTLBuffer([
      { v1: [-10, -5, -3], v2: [10, 5, 3], v3: [0, 0, 0] },
    ]);

    const result = parseBinarySTL(buffer);

    expect(result.boundingBox.minX).toBe(-10);
    expect(result.boundingBox.maxX).toBe(10);
    expect(result.boundingBox.minY).toBe(-5);
    expect(result.boundingBox.maxY).toBe(5);
    expect(result.boundingBox.minZ).toBe(-3);
    expect(result.boundingBox.maxZ).toBe(3);
    expect(result.dimensionsMm.x).toBe(20);
    expect(result.dimensionsMm.y).toBe(10);
    expect(result.dimensionsMm.z).toBe(6);
  });
});
