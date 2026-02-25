"use client";

import { useEffect, useRef, useCallback } from "react";
import { X, RotateCcw, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Lazy-load Three.js — keeps initial bundle small
let THREE: typeof import("three") | null = null;
let OrbitControlsModule: { OrbitControls: unknown } | null = null;
let STLLoaderModule: { STLLoader: unknown } | null = null;

async function loadThree() {
  if (!THREE) {
    const [three, controls, loader] = await Promise.all([
      import("three"),
      import("three/examples/jsm/controls/OrbitControls.js"),
      import("three/examples/jsm/loaders/STLLoader.js"),
    ]);
    THREE = three;
    OrbitControlsModule = controls as unknown as { OrbitControls: unknown };
    STLLoaderModule = loader as unknown as { STLLoader: unknown };
  }
  return {
    THREE: THREE!,
    OrbitControls: (OrbitControlsModule as Record<string, unknown>).OrbitControls as new (
      camera: InstanceType<typeof THREE.PerspectiveCamera>,
      domElement: HTMLElement
    ) => InstanceType<typeof THREE.EventDispatcher> & {
      enableDamping: boolean;
      dampingFactor: number;
      target: InstanceType<typeof THREE.Vector3>;
      update: () => void;
      dispose: () => void;
    },
    STLLoader: (STLLoaderModule as Record<string, unknown>).STLLoader as new () => {
      parse: (data: ArrayBuffer) => InstanceType<typeof THREE.BufferGeometry>;
    },
  };
}

interface STLViewerProps {
  /** The raw STL file ArrayBuffer */
  buffer: ArrayBuffer;
  /** Filename for display */
  filename: string;
  /** Close the viewer */
  onClose: () => void;
}

export function STLViewer({ buffer, filename, onClose }: STLViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: InstanceType<typeof import("three").WebGLRenderer>;
    controls: { update: () => void; dispose: () => void; target: InstanceType<typeof import("three").Vector3> };
    camera: InstanceType<typeof import("three").PerspectiveCamera>;
    animId: number;
    resetCamera: () => void;
  } | null>(null);

  const resetCamera = useCallback(() => {
    sceneRef.current?.resetCamera();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let disposed = false;
    let animId = 0;

    async function init() {
      const { THREE: T, OrbitControls, STLLoader } = await loadThree();
      if (disposed) return;

      const width = container!.clientWidth;
      const height = container!.clientHeight;

      // Scene
      const scene = new T.Scene();
      scene.background = new T.Color(0x1a1a2e);

      // Camera
      const camera = new T.PerspectiveCamera(45, width / height, 0.1, 10000);

      // Renderer
      const renderer = new T.WebGLRenderer({
        canvas: canvas!,
        antialias: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;

      // Lights
      const ambientLight = new T.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new T.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);

      const backLight = new T.DirectionalLight(0xffffff, 0.3);
      backLight.position.set(-1, -0.5, -1);
      scene.add(backLight);

      // Parse STL
      const loader = new STLLoader();
      const geometry = loader.parse(buffer);
      geometry.computeVertexNormals();

      // Material — Printforge blue/teal
      const material = new T.MeshPhongMaterial({
        color: 0x3b82f6,
        specular: 0x444444,
        shininess: 30,
        flatShading: false,
      });

      const mesh = new T.Mesh(geometry, material);
      scene.add(mesh);

      // Centre model and fit to view
      geometry.computeBoundingBox();
      const box = geometry.boundingBox!;
      const center = new T.Vector3();
      box.getCenter(center);
      mesh.position.sub(center);

      const size = new T.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const fov = camera.fov * (Math.PI / 180);
      const cameraDistance = maxDim / (2 * Math.tan(fov / 2)) * 1.6;

      function positionCamera() {
        camera.position.set(
          cameraDistance * 0.7,
          cameraDistance * 0.5,
          cameraDistance * 0.7
        );
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();
      }
      positionCamera();

      // Grid helper
      const gridSize = maxDim * 2;
      const grid = new T.GridHelper(gridSize, 20, 0x444466, 0x333355);
      grid.position.y = -size.y / 2;
      scene.add(grid);

      // Animate
      function animate() {
        animId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      }
      animate();

      // Resize observer
      const resizeObserver = new ResizeObserver(() => {
        if (disposed) return;
        const w = container!.clientWidth;
        const h = container!.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      });
      resizeObserver.observe(container!);

      sceneRef.current = {
        renderer,
        controls,
        camera,
        animId,
        resetCamera: positionCamera,
      };

      // Store resize observer for cleanup
      (sceneRef.current as Record<string, unknown>)._resizeObserver = resizeObserver;
    }

    init();

    return () => {
      disposed = true;
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animId);
        sceneRef.current.controls.dispose();
        sceneRef.current.renderer.dispose();
        const ro = (sceneRef.current as Record<string, unknown>)._resizeObserver as ResizeObserver | undefined;
        ro?.disconnect();
        sceneRef.current = null;
      }
    };
  }, [buffer]);

  return (
    <div className="relative rounded-lg border border-border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-1.5">
        <span className="truncate text-xs font-medium text-foreground">
          {filename}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={resetCamera}
            title="Reset view"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
            title="Close viewer"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="h-64 w-full sm:h-80">
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>

      {/* Hint */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/50 px-2 py-0.5">
        <Maximize2 className="h-2.5 w-2.5 text-white/70" />
        <span className="text-[10px] text-white/70">Drag to rotate</span>
      </div>
    </div>
  );
}
