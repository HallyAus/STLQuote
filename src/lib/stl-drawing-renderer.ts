// STL Drawing Renderer — generates orthographic + isometric view PNGs from STL geometry
// Uses offscreen Three.js rendering to produce technical drawing-style images

export interface DrawingViews {
  front: string; // base64 PNG data URI
  side: string;
  top: string;
  iso: string;
}

const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 600;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let THREE: typeof import("three") | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let STLLoaderModule: any = null;

async function loadThree() {
  if (!THREE) {
    const [three, loader] = await Promise.all([
      import("three"),
      import("three/examples/jsm/loaders/STLLoader.js"),
    ]);
    THREE = three;
    STLLoaderModule = loader;
  }
  return { THREE: THREE!, STLLoader: STLLoaderModule.STLLoader };
}

/**
 * Render 4 views of an STL file as PNG data URIs.
 *
 * Front  = looking along -Y axis (XZ plane)
 * Side   = looking along -X axis (YZ plane)
 * Top    = looking along -Z axis (XY plane)
 * Iso    = perspective at 45deg angle
 */
export async function renderDrawingViews(buffer: ArrayBuffer): Promise<DrawingViews> {
  const { THREE: T, STLLoader } = await loadThree();

  // Parse geometry
  const loader = new STLLoader();
  const geometry = loader.parse(buffer);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  const box = geometry.boundingBox!;
  const center = new T.Vector3();
  box.getCenter(center);

  const size = new T.Vector3();
  box.getSize(size);

  // Create offscreen renderer (white background for technical drawing)
  const canvas = document.createElement("canvas");
  canvas.width = VIEW_WIDTH;
  canvas.height = VIEW_HEIGHT;

  const renderer = new T.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(VIEW_WIDTH, VIEW_HEIGHT);
  renderer.setClearColor(0xffffff, 1);

  // Technical drawing materials: light grey fill + dark edge lines
  const fillMaterial = new T.MeshPhongMaterial({
    color: 0xd4d4d8,
    specular: 0x222222,
    shininess: 20,
    flatShading: false,
  });

  const edgeMaterial = new T.LineBasicMaterial({
    color: 0x27272a,
    linewidth: 1,
  });

  // Scene setup helper
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function createScene(): any {
    const scene = new T.Scene();
    scene.background = new T.Color(0xffffff);

    // Mesh
    const mesh = new T.Mesh(geometry.clone(), fillMaterial);
    mesh.position.sub(center.clone());
    scene.add(mesh);

    // Edge wireframe overlay
    const edges = new T.EdgesGeometry(geometry.clone(), 30);
    const edgeLines = new T.LineSegments(edges, edgeMaterial);
    edgeLines.position.sub(center.clone());
    scene.add(edgeLines);

    // Soft lighting for technical look
    const ambientLight = new T.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new T.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    return scene;
  }

  // Compute camera half-extent with padding for dimension annotations
  function computeHalf(viewWidth: number, viewHeight: number): number {
    const aspect = VIEW_WIDTH / VIEW_HEIGHT;
    const maxView = Math.max(viewWidth, viewHeight / aspect, viewHeight, viewWidth * aspect);
    const padding = maxView * 0.3;
    return (maxView + padding) / 2;
  }

  // Orthographic camera sized to fit the model
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function createOrthoCamera(half: number): any {
    const aspect = VIEW_WIDTH / VIEW_HEIGHT;
    return new T.OrthographicCamera(
      -half * aspect, half * aspect, half, -half, 0.1, half * 20
    );
  }

  function captureView(): string {
    return canvas.toDataURL("image/png");
  }

  // Draw a filled arrowhead at (tipX, tipY) pointing in the given angle direction
  function drawArrowhead(
    ctx: CanvasRenderingContext2D,
    tipX: number,
    tipY: number,
    angle: number,
    len: number,
    halfW: number,
  ) {
    ctx.save();
    ctx.translate(tipX, tipY);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-len, -halfW);
    ctx.lineTo(-len, halfW);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Overlay dimension annotations on a rendered view
  function addDimensionAnnotations(
    sourceCanvas: HTMLCanvasElement,
    half: number,
    hDim: number,
    vDim: number,
  ): string {
    const aspect = VIEW_WIDTH / VIEW_HEIGHT;
    const overlay = document.createElement("canvas");
    overlay.width = VIEW_WIDTH;
    overlay.height = VIEW_HEIGHT;
    const ctx = overlay.getContext("2d")!;

    // Copy the WebGL render
    ctx.drawImage(sourceCanvas, 0, 0);

    // Projection: model coords → screen pixels
    const scaleX = VIEW_WIDTH / (2 * half * aspect);
    const scaleY = VIEW_HEIGHT / (2 * half);
    const cx = VIEW_WIDTH / 2;
    const cy = VIEW_HEIGHT / 2;

    // Model bounding box edges in pixel coordinates
    const leftPx = cx - (hDim / 2) * scaleX;
    const rightPx = cx + (hDim / 2) * scaleX;
    const topPx = cy - (vDim / 2) * scaleY;
    const bottomPx = cy + (vDim / 2) * scaleY;

    const OFFSET = 28;
    const GAP = 5;
    const OVERSHOOT = 6;
    const ARROW_LEN = 6;
    const ARROW_HALF_W = 2.5;
    const FONT_SIZE = 12;

    ctx.strokeStyle = "#18181b";
    ctx.fillStyle = "#18181b";
    ctx.lineWidth = 1;
    ctx.font = `bold ${FONT_SIZE}px ui-monospace, SFMono-Regular, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const hSpan = rightPx - leftPx;
    const vSpan = bottomPx - topPx;

    // === Horizontal dimension (below part) ===
    if (hSpan > 20) {
      const dimY = bottomPx + OFFSET;

      // Extension lines
      ctx.beginPath();
      ctx.moveTo(leftPx, bottomPx + GAP);
      ctx.lineTo(leftPx, dimY + OVERSHOOT);
      ctx.moveTo(rightPx, bottomPx + GAP);
      ctx.lineTo(rightPx, dimY + OVERSHOOT);
      ctx.stroke();

      // Dimension line
      ctx.beginPath();
      ctx.moveTo(leftPx, dimY);
      ctx.lineTo(rightPx, dimY);
      ctx.stroke();

      // Arrowheads (pointing outward toward extension lines)
      ctx.fillStyle = "#18181b";
      drawArrowhead(ctx, leftPx, dimY, Math.PI, ARROW_LEN, ARROW_HALF_W);
      drawArrowhead(ctx, rightPx, dimY, 0, ARROW_LEN, ARROW_HALF_W);

      // Label with white background
      const hLabel = hDim.toFixed(1);
      const hTextW = ctx.measureText(hLabel).width;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cx - hTextW / 2 - 4, dimY - FONT_SIZE / 2 - 2, hTextW + 8, FONT_SIZE + 4);
      ctx.fillStyle = "#18181b";
      ctx.fillText(hLabel, cx, dimY);
    }

    // === Vertical dimension (left of part) ===
    if (vSpan > 20) {
      const dimX = leftPx - OFFSET;

      // Extension lines
      ctx.beginPath();
      ctx.moveTo(leftPx - GAP, topPx);
      ctx.lineTo(dimX - OVERSHOOT, topPx);
      ctx.moveTo(leftPx - GAP, bottomPx);
      ctx.lineTo(dimX - OVERSHOOT, bottomPx);
      ctx.stroke();

      // Dimension line
      ctx.strokeStyle = "#18181b";
      ctx.beginPath();
      ctx.moveTo(dimX, topPx);
      ctx.lineTo(dimX, bottomPx);
      ctx.stroke();

      // Arrowheads
      ctx.fillStyle = "#18181b";
      drawArrowhead(ctx, dimX, topPx, -Math.PI / 2, ARROW_LEN, ARROW_HALF_W);
      drawArrowhead(ctx, dimX, bottomPx, Math.PI / 2, ARROW_LEN, ARROW_HALF_W);

      // Label (rotated 90° CCW)
      const vLabel = vDim.toFixed(1);
      const vTextW = ctx.measureText(vLabel).width;
      const midY = (topPx + bottomPx) / 2;
      ctx.save();
      ctx.translate(dimX, midY);
      ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-vTextW / 2 - 4, -FONT_SIZE / 2 - 2, vTextW + 8, FONT_SIZE + 4);
      ctx.fillStyle = "#18181b";
      ctx.fillText(vLabel, 0, 0);
      ctx.restore();
    }

    return overlay.toDataURL("image/png");
  }

  // --- Front view (looking along -Y, showing XZ plane) ---
  const frontScene = createScene();
  const frontHalf = computeHalf(size.x, size.z);
  const frontCam = createOrthoCamera(frontHalf);
  frontCam.position.set(0, -(Math.max(size.x, size.y, size.z) * 3), 0);
  frontCam.up.set(0, 0, 1);
  frontCam.lookAt(0, 0, 0);
  renderer.render(frontScene, frontCam);
  const front = addDimensionAnnotations(canvas, frontHalf, size.x, size.z);

  // --- Side view (looking along -X, showing YZ plane) ---
  const sideScene = createScene();
  const sideHalf = computeHalf(size.y, size.z);
  const sideCam = createOrthoCamera(sideHalf);
  sideCam.position.set(Math.max(size.x, size.y, size.z) * 3, 0, 0);
  sideCam.up.set(0, 0, 1);
  sideCam.lookAt(0, 0, 0);
  renderer.render(sideScene, sideCam);
  const side = addDimensionAnnotations(canvas, sideHalf, size.y, size.z);

  // --- Top view (looking along -Z, showing XY plane) ---
  const topScene = createScene();
  const topHalf = computeHalf(size.x, size.y);
  const topCam = createOrthoCamera(topHalf);
  topCam.position.set(0, 0, Math.max(size.x, size.y, size.z) * 3);
  topCam.up.set(0, 1, 0);
  topCam.lookAt(0, 0, 0);
  renderer.render(topScene, topCam);
  const top = addDimensionAnnotations(canvas, topHalf, size.x, size.y);

  // --- Isometric view (perspective at 45deg angle) ---
  const isoScene = createScene();
  const maxDim = Math.max(size.x, size.y, size.z);
  const isoCam = new T.PerspectiveCamera(45, VIEW_WIDTH / VIEW_HEIGHT, 0.1, 10000);
  const dist = maxDim / (2 * Math.tan((45 * Math.PI) / 360)) * 1.6;
  isoCam.position.set(dist * 0.7, dist * 0.5, dist * 0.7);
  isoCam.lookAt(0, 0, 0);
  renderer.render(isoScene, isoCam);
  const iso = captureView();

  // Cleanup
  renderer.dispose();
  geometry.dispose();
  fillMaterial.dispose();
  edgeMaterial.dispose();

  return { front, side, top, iso };
}
