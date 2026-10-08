import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export type ThreeShadingMode = "pbr" | "wireframe" | "clay" | "normals" | "uv";
export type Asset3DPreset = "blade" | "core" | "portal";

export interface MeshStats {
  tris: number;
  verts: number;
  materials: number;
  dimensions: string;
  isBudgetOk: boolean;
}

interface ThreeAssetViewerProps {
  assetName: string;
  assetType: string;
  shadingMode: ThreeShadingMode;
  autoRotate: boolean;
  showGrid: boolean;
  lightAngle: number;
  isExploded?: boolean;
  modelPreset?: Asset3DPreset;
  onMeshStatsChange?: (stats: MeshStats) => void;
}

/**
 * ThreeAssetViewer
 * 现代顶级设计网站级 3D WebGL 资产检视器 (Studio Softbox & Explode View)
 * - 0 杂乱粒子、0 廉价科幻噪点，极简工业/设计品打样质感
 * - 顶级棚拍布光 (Studio 3-Point Softbox) 与哑光陶瓷/阳极氧化冷钛材质
 * - 支持 3 款高精次世代资产模型切换 (机甲符文战刃 / 反重力悬浮核心 / 空间传送枢纽)
 * - 独创一键「爆炸拆解装配图 (Explode View)」平滑展开
 * - 鼠标物理惯性平滑阻尼旋转与滚轮平滑缩放
 */
export const ThreeAssetViewer: React.FC<ThreeAssetViewerProps> = ({
  assetName: _assetName,
  assetType: _assetType,
  shadingMode,
  autoRotate,
  showGrid,
  lightAngle,
  isExploded = false,
  modelPreset = "blade",
  onMeshStatsChange,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);

  // Subparts for explode view interpolation
  const subpartsRef = useRef<Array<{ mesh: THREE.Mesh; normalPos: THREE.Vector3; explodePos: THREE.Vector3 }>>([]);

  // Drag interaction with spring/damping
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0.15, y: 0.45 });
  const currentRotation = useRef({ x: 0.15, y: 0.45 });
  const targetZoom = useRef(1);
  const currentZoom = useRef(1);

  const [hovered, setHovered] = useState(false);

  // Initialize Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 460;
    const height = container.clientHeight || 180;

    // 1. Scene with Pure Clean Transparent Background
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 5.8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer with Studio Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Studio 3-Point Softbox Lighting (Zero cheap colorful neon)
    // Key Light: Studio warm neutral
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(5, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);
    dirLightRef.current = keyLight;

    // Fill Light: Soft ambient cool-white to soften harsh shadows
    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 1.2);
    fillLight.position.set(-5, 2, -3);
    scene.add(fillLight);

    // Rim/Top Light: Delivers precision chamfer highlights
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.4);
    rimLight.position.set(0, 6, -4);
    scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0xf8fafc, 1.3);
    scene.add(ambientLight);

    // 5. Clean Grid Floor
    const gridHelper = new THREE.GridHelper(8, 16, 0xcbced4, 0xe2e8f0);
    gridHelper.position.y = -1.55;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // 6. Base Contact Soft Shadow disc
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext("2d");
    if (sCtx) {
      const grad = sCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
      grad.addColorStop(0, "rgba(15, 23, 42, 0.28)");
      grad.addColorStop(0.5, "rgba(15, 23, 42, 0.09)");
      grad.addColorStop(1, "rgba(15, 23, 42, 0)");
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 3.6),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.75, depthWrite: false })
    );
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.54;
    scene.add(shadowMesh);

    // 7. Build Model according to Preset
    const modelGroup = new THREE.Group();
    meshGroupRef.current = modelGroup;
    scene.add(modelGroup);

    subpartsRef.current = [];

    // Materials: Titanium & Brushed Ceramic (Linear/Apple Quality)
    const titaniumMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.88,
      roughness: 0.18,
    });
    const darkAlloyMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.7,
      roughness: 0.35,
    });
    const accentCoreMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.3,
      metalness: 0.6,
      roughness: 0.15,
    });
    const brassRingMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.25,
    });

    if (modelPreset === "blade") {
      // Blade Apex (Top)
      const apexGeo = new THREE.ConeGeometry(0.28, 1.4, 8);
      apexGeo.scale(1, 1, 0.35);
      const apexMesh = new THREE.Mesh(apexGeo, titaniumMat);
      apexMesh.castShadow = true;
      const apexNorm = new THREE.Vector3(0, 1.2, 0);
      const apexExpl = new THREE.Vector3(0, 1.85, 0);
      apexMesh.position.copy(apexNorm);
      modelGroup.add(apexMesh);
      subpartsRef.current.push({ mesh: apexMesh, normalPos: apexNorm, explodePos: apexExpl });

      // Blade Core Body (Mid)
      const bodyGeo = new THREE.CylinderGeometry(0.28, 0.32, 1.6, 8);
      bodyGeo.scale(1, 1, 0.38);
      const bodyMesh = new THREE.Mesh(bodyGeo, titaniumMat);
      bodyMesh.castShadow = true;
      const bodyNorm = new THREE.Vector3(0, 0.1, 0);
      const bodyExpl = new THREE.Vector3(0, 0.25, 0);
      bodyMesh.position.copy(bodyNorm);
      modelGroup.add(bodyMesh);
      subpartsRef.current.push({ mesh: bodyMesh, normalPos: bodyNorm, explodePos: bodyExpl });

      // Energy Gem Core
      const gemGeo = new THREE.IcosahedronGeometry(0.28, 2);
      const gemMesh = new THREE.Mesh(gemGeo, accentCoreMat);
      const gemNorm = new THREE.Vector3(0, -0.6, 0);
      const gemExpl = new THREE.Vector3(0, -0.5, 0.45);
      gemMesh.position.copy(gemNorm);
      modelGroup.add(gemMesh);
      subpartsRef.current.push({ mesh: gemMesh, normalPos: gemNorm, explodePos: gemExpl });

      // Orbital Guard Rings
      const ringGeo = new THREE.TorusGeometry(0.52, 0.045, 12, 28);
      const ringMesh = new THREE.Mesh(ringGeo, brassRingMat);
      ringMesh.rotation.x = Math.PI / 3;
      const ringNorm = new THREE.Vector3(0, -0.6, 0);
      const ringExpl = new THREE.Vector3(0, -0.5, -0.45);
      ringMesh.position.copy(ringNorm);
      modelGroup.add(ringMesh);
      subpartsRef.current.push({ mesh: ringMesh, normalPos: ringNorm, explodePos: ringExpl });

      // Hilt Handle
      const hiltGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.9, 12);
      const hiltMesh = new THREE.Mesh(hiltGeo, darkAlloyMat);
      const hiltNorm = new THREE.Vector3(0, -1.2, 0);
      const hiltExpl = new THREE.Vector3(0, -1.8, 0);
      hiltMesh.position.copy(hiltNorm);
      modelGroup.add(hiltMesh);
      subpartsRef.current.push({ mesh: hiltMesh, normalPos: hiltNorm, explodePos: hiltExpl });
    } else if (modelPreset === "core") {
      // Outer Gyro Shell (Torus Knot)
      const knotGeo = new THREE.TorusKnotGeometry(0.78, 0.14, 48, 8);
      const knotMesh = new THREE.Mesh(knotGeo, titaniumMat);
      const knotNorm = new THREE.Vector3(0, 0, 0);
      const knotExpl = new THREE.Vector3(0, 0.45, 0);
      knotMesh.position.copy(knotNorm);
      modelGroup.add(knotMesh);
      subpartsRef.current.push({ mesh: knotMesh, normalPos: knotNorm, explodePos: knotExpl });

      // Inner Core Reactor
      const reactorGeo = new THREE.IcosahedronGeometry(0.48, 2);
      const reactorMesh = new THREE.Mesh(reactorGeo, accentCoreMat);
      const rNorm = new THREE.Vector3(0, 0, 0);
      const rExpl = new THREE.Vector3(0, -0.45, 0);
      reactorMesh.position.copy(rNorm);
      modelGroup.add(reactorMesh);
      subpartsRef.current.push({ mesh: reactorMesh, normalPos: rNorm, explodePos: rExpl });
    } else {
      // Portal Pylon Column
      const pylonGeo = new THREE.CylinderGeometry(0.4, 0.5, 2.8, 6);
      const pylonMesh = new THREE.Mesh(pylonGeo, darkAlloyMat);
      const pNorm = new THREE.Vector3(0, 0, 0);
      const pExpl = new THREE.Vector3(0, -0.3, 0);
      pylonMesh.position.copy(pNorm);
      modelGroup.add(pylonMesh);
      subpartsRef.current.push({ mesh: pylonMesh, normalPos: pNorm, explodePos: pExpl });

      // Floating Crown Ring
      const crownGeo = new THREE.TorusGeometry(0.68, 0.08, 12, 24);
      const crownMesh = new THREE.Mesh(crownGeo, brassRingMat);
      crownMesh.rotation.x = Math.PI / 2;
      const cNorm = new THREE.Vector3(0, 1.2, 0);
      const cExpl = new THREE.Vector3(0, 1.75, 0);
      crownMesh.position.copy(cNorm);
      modelGroup.add(crownMesh);
      subpartsRef.current.push({ mesh: crownMesh, normalPos: cNorm, explodePos: cExpl });
    }

    // Calculate real mesh stats
    let totalTris = 0;
    let totalVerts = 0;
    modelGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const geom = mesh.geometry;
        if (geom.index) {
          totalTris += geom.index.count / 3;
        } else if (geom.attributes.position) {
          totalTris += geom.attributes.position.count / 3;
        }
        if (geom.attributes.position) {
          totalVerts += geom.attributes.position.count;
        }
      }
    });

    onMeshStatsChange?.({
      tris: Math.round(totalTris),
      verts: Math.round(totalVerts),
      materials: 4,
      dimensions: "0.85 × 2.9 × 0.42 m",
      isBudgetOk: totalTris <= 3000,
    });

    // 8. Mouse / Touch Orbit Listeners
    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - lastMouse.current.x;
      const deltaY = e.clientY - lastMouse.current.y;
      targetRotation.current.y += deltaX * 0.008;
      targetRotation.current.x = Math.max(-1.1, Math.min(1.1, targetRotation.current.x + deltaY * 0.008));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      targetZoom.current = Math.max(0.65, Math.min(1.85, targetZoom.current + (e.deltaY > 0 ? -0.1 : 0.1)));
    };

    const onDblClick = () => {
      targetRotation.current = { x: 0.15, y: 0.45 };
      targetZoom.current = 1;
    };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("dblclick", onDblClick);

    // 9. Render Loop
    let animId = 0;
    let isVisible = true;
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(container);

    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const delta = clock.getDelta();

      // Smooth inertia rotation
      if (autoRotate && !isDragging.current) {
        targetRotation.current.y += delta * 0.45;
      }
      currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * (delta * 8);
      currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * (delta * 8);
      modelGroup.rotation.x = currentRotation.current.x;
      modelGroup.rotation.y = currentRotation.current.y;

      // Smooth zoom
      currentZoom.current += (targetZoom.current - currentZoom.current) * (delta * 8);
      modelGroup.scale.setScalar(currentZoom.current);

      // Smooth Explode Animation
      const explodeFactor = isExploded ? 1 : 0;
      subpartsRef.current.forEach((part) => {
        const targetPos = part.normalPos.clone().lerp(part.explodePos, explodeFactor);
        part.mesh.position.lerp(targetPos, delta * 9);
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("dblclick", onDblClick);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      shadowTex.dispose();
      titaniumMat.dispose();
      darkAlloyMat.dispose();
      accentCoreMat.dispose();
      brassRingMat.dispose();
    };
  }, [modelPreset, onMeshStatsChange]);

  // Update Dynamic Light Angle
  useEffect(() => {
    if (!dirLightRef.current) return;
    const rad = (lightAngle * Math.PI) / 180;
    dirLightRef.current.position.set(Math.cos(rad) * 6, 7, Math.sin(rad) * 6);
  }, [lightAngle]);

  // Update Grid Helper Visibility
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [showGrid]);

  // Update Shading Mode (PBR / Wireframe / Clay / Normals / UV)
  useEffect(() => {
    if (!meshGroupRef.current) return;

    meshGroupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (shadingMode === "wireframe") {
          mesh.material = new THREE.MeshBasicMaterial({
            color: 0x0284c7,
            wireframe: true,
          });
        } else if (shadingMode === "clay") {
          mesh.material = new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            roughness: 0.75,
            metalness: 0.05,
          });
        } else if (shadingMode === "normals") {
          mesh.material = new THREE.MeshNormalMaterial();
        } else if (shadingMode === "uv") {
          // Clean checker texture for UV
          const cCanvas = document.createElement("canvas");
          cCanvas.width = 64;
          cCanvas.height = 64;
          const ctx = cCanvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, 64, 64);
            ctx.fillStyle = "#cbd5e1";
            ctx.fillRect(0, 0, 32, 32);
            ctx.fillRect(32, 32, 32, 32);
          }
          const checkTex = new THREE.CanvasTexture(cCanvas);
          checkTex.wrapS = THREE.RepeatWrapping;
          checkTex.wrapT = THREE.RepeatWrapping;
          checkTex.repeat.set(4, 4);
          mesh.material = new THREE.MeshStandardMaterial({ map: checkTex, roughness: 0.4 });
        }
      }
    });
  }, [shadingMode]);

  return (
    <div
      ref={mountRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        cursor: isDragging.current ? "grabbing" : "grab",
        userSelect: "none",
        outline: "none",
      }}
      title="3D WebGL 视口 · 鼠标左键拖拽旋转 · 滚轮缩放 · 双击复位"
    >
      {hovered && (
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: 8,
            fontSize: 10,
            color: "#64748b",
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(6px)",
            padding: "2px 6px",
            borderRadius: 4,
            pointerEvents: "none",
            border: "1px solid rgba(226, 232, 240, 0.8)",
          }}
        >
          双击重置视角 · 拖拽旋转
        </div>
      )}
    </div>
  );
};
