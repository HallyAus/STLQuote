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

  // Orthographic camera sized to fit the model with padding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function createOrthoCamera(viewWidth: number, viewHeight: number): any {
    const aspect = VIEW_WIDTH / VIEW_HEIGHT;
    const maxView = Math.max(viewWidth, viewHeight / aspect, viewHeight, viewWidth * aspect);
    const padding = maxView * 0.15;
    const half = (maxView + padding) / 2;

    const camera = new T.OrthographicCamera(
      -half * aspect,
      half * aspect,
      half,
      -half,
      0.1,
      maxView * 10
    );
    return camera;
  }

  function captureView(): string {
    return canvas.toDataURL("image/png");
  }

  // --- Front view (looking along -Y, showing XZ plane) ---
  const frontScene = createScene();
  const frontCam = createOrthoCamera(size.x, size.z);
  frontCam.position.set(0, -(Math.max(size.x, size.y, size.z) * 3), 0);
  frontCam.up.set(0, 0, 1);
  frontCam.lookAt(0, 0, 0);
  renderer.render(frontScene, frontCam);
  const front = captureView();

  // --- Side view (looking along -X, showing YZ plane) ---
  const sideScene = createScene();
  const sideCam = createOrthoCamera(size.y, size.z);
  sideCam.position.set(Math.max(size.x, size.y, size.z) * 3, 0, 0);
  sideCam.up.set(0, 0, 1);
  sideCam.lookAt(0, 0, 0);
  renderer.render(sideScene, sideCam);
  const side = captureView();

  // --- Top view (looking along -Z, showing XY plane) ---
  const topScene = createScene();
  const topCam = createOrthoCamera(size.x, size.y);
  topCam.position.set(0, 0, Math.max(size.x, size.y, size.z) * 3);
  topCam.up.set(0, 1, 0);
  topCam.lookAt(0, 0, 0);
  renderer.render(topScene, topCam);
  const top = captureView();

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
