import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { StageKey } from "../../types";

export interface ProcessStage3DMeta {
  key: StageKey;
  name: string;
  index: number;
  confirmedCount: number;
  totalAssets: number;
  stagePct: number;
  hasRed: boolean;
  hasYellow: boolean;
  allPassed: boolean;
}

interface ThreeProcessRunwayProps {
  stages: ProcessStage3DMeta[];
  activeStageKey?: StageKey | null;
  onSelectStage?: (key: StageKey) => void;
  height?: number; // 默认 120px
}

/**
 * ThreeProcessRunway (Spatial Tactile Piano Runway)
 * teenage engineering / Stripe 风格 · 7 节点平铺全宽精密机械钢琴工序卡带
 * - 100% 平铺填满整张组件宽度（Full-Width Responsive），彻底消除局促空白
 * - 7 根修长象牙白 / 冷钛倒角机械钢琴琴键（Piano Key Slabs）
 * - 真实物理琴键行程（Key Stroke Action）：鼠标悬停前沿轻按压下沉，移开弹性回弹
 * - 阻断工序键位锁死并微悬浮工业金属防拆锁扣
 * - 键面嵌刻激光刻度与达成率微导光条
 * - 纯净 Studio Softbox 棚拍布光，零粒子、零星空
 */
export const ThreeProcessRunway: React.FC<ThreeProcessRunwayProps> = ({
  stages,
  activeStageKey,
  onSelectStage,
  height = 120,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const hoverIdxRef = useRef<number | null>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  const activeStageKeyRef = useRef(activeStageKey);
  activeStageKeyRef.current = activeStageKey;

  const onSelectStageRef = useRef(onSelectStage);
  onSelectStageRef.current = onSelectStage;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 860;
    const scene = new THREE.Scene();

    // 1. Ergonomic Pianist's Vantage Camera (精算视锥体与画幅比例，上下左右各预留 15% 充裕安全边距，100% 杜绝截断)
    const camera = new THREE.PerspectiveCamera(23, width / height, 0.1, 100);
    camera.position.set(0, 5.2, 8.0);
    camera.lookAt(0, -0.10, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;
    container.appendChild(renderer.domElement);

    // 2. Studio Softbox & Key Lighting for warm ivory surface reflection
    const ambient = new THREE.AmbientLight(0xf8fafc, 1.6);
    scene.add(ambient);

    // Top-right Key Light for ivory surface sheen
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.9);
    keyLight.position.set(6, 9, 6);
    scene.add(keyLight);

    // Side Fill Light
    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 1.35);
    fillLight.position.set(-6, 4, -2);
    scene.add(fillLight);

    // Grazing Rim Light to accentuate key edge bevels
    const rimLight = new THREE.DirectionalLight(0xf1f5f9, 2.0);
    rimLight.position.set(0, 8, -3);
    scene.add(rimLight);

    // 3. Root container with subtle ergonomic slope
    const root = new THREE.Group();
    root.rotation.x = 0.07; // 键盘后轴微倾迎合弹奏者
    scene.add(root);

    // 4. Calculate Full-Width Responsive Piano Keys Layout with Safe Margins
    const vFOV = (camera.fov * Math.PI) / 180;
    const visibleH = 2 * Math.tan(vFOV / 2) * camera.position.z;
    const visibleW = visibleH * (width / height);

    // Occupy 90% of visible width so cheek blocks never clip on edges
    const targetSpan = visibleW * 0.90;
    const count = 7;
    const keyGap = 0.050; // ultra fine precision slit
    const keyWidth = (targetSpan - (count - 1) * keyGap) / count;
    const keyDepth = 2.45; // elegant golden-ratio piano key depth
    const keyHeight = 0.48; // substantial tactile thickness

    const startX = -targetSpan / 2 + keyWidth / 2;

    // Anodized Cool Aluminum Keybed Base (高阶哑光冷铝合金琴床，清爽通透)
    const keybedGeom = new THREE.BoxGeometry(targetSpan + 0.22, 0.10, keyDepth + 0.18);
    const keybedMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.85,
      roughness: 0.20,
    });
    const keybedMesh = new THREE.Mesh(keybedGeom, keybedMat);
    keybedMesh.position.set(0, -keyHeight / 2 - 0.05, 0);
    root.add(keybedMesh);

    // Crimson Damper Felt Strip (施坦威经典绯红羊毛缓冲毡垫，横贯琴键后轴部)
    const feltGeom = new THREE.BoxGeometry(targetSpan + 0.14, 0.06, 0.20);
    const feltMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.88,
      metalness: 0.08,
    });
    const feltMesh = new THREE.Mesh(feltGeom, feltMat);
    feltMesh.position.set(0, keyHeight / 2 - 0.02, -keyDepth / 2 + 0.11);
    root.add(feltMesh);

    // Dual Brushed Titanium Cheek Blocks (两侧冷钛高光琴耳侧板，真实通透结构)
    const cheekGeom = new THREE.BoxGeometry(0.16, keyHeight * 1.16, keyDepth + 0.08);
    const cheekMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      roughness: 0.14,
      metalness: 0.85,
    });

    const leftCheek = new THREE.Mesh(cheekGeom, cheekMat);
    leftCheek.position.set(-targetSpan / 2 - 0.10, 0.02, 0);
    root.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeom, cheekMat);
    rightCheek.position.set(targetSpan / 2 + 0.10, 0.02, 0);
    root.add(rightCheek);

    // Padlock Builder
    const createPadlock = () => {
      const lockGroup = new THREE.Group();
      // Heavy lock chassis
      const lockBodyGeom = new THREE.BoxGeometry(0.32, 0.28, 0.16);
      const lockBodyMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        metalness: 0.7,
        roughness: 0.2,
        emissive: 0xdc2626,
        emissiveIntensity: 0.45,
      });
      const lockBodyMesh = new THREE.Mesh(lockBodyGeom, lockBodyMat);
      lockBodyMesh.position.y = 0.14;
      lockGroup.add(lockBodyMesh);

      // Keyhole notch
      const notchGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.02, 12);
      const notchMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
      const notchMesh = new THREE.Mesh(notchGeom, notchMat);
      notchMesh.rotation.x = Math.PI / 2;
      notchMesh.position.set(0, 0.12, 0.082);
      lockGroup.add(notchMesh);

      // Chrome U-Shackle
      const shackleGeom = new THREE.TorusGeometry(0.11, 0.028, 12, 24, Math.PI);
      const shackleMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        metalness: 0.95,
        roughness: 0.12,
      });
      const shackleMesh = new THREE.Mesh(shackleGeom, shackleMat);
      shackleMesh.rotation.z = Math.PI;
      shackleMesh.position.y = 0.28;
      lockGroup.add(shackleMesh);

      lockGroup.position.set(0, keyHeight / 2 + 0.16, 0.2);
      return lockGroup;
    };

    // Shared Geometries for Two-Tone Keys
    // 1. Ivory Top Cap (上层施坦威温润象牙白树脂盖板，柔和微高光)
    const topCapGeom = new THREE.BoxGeometry(keyWidth, 0.14, keyDepth);
    // 2. Gunmetal Lower Body (下部深空冷钛金属厚重侧身)
    const lowerBodyGeom = new THREE.BoxGeometry(keyWidth * 0.99, keyHeight - 0.14, keyDepth * 0.99);
    const lowerBodyMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.86,
      roughness: 0.26,
    });

    // 3. Front Key Apron Lip (厚实的前沿垂直琴裙与倒角切面)
    const apronGeom = new THREE.BoxGeometry(keyWidth * 0.99, keyHeight * 0.88, 0.08);

    const keyMeshes: Array<{
      pivot: THREE.Group;
      bodyMesh: THREE.Mesh;
      padlockGroup?: THREE.Group;
      targetRotX: number;
      currentRotX: number;
      targetPosY: number;
      currentPosY: number;
      stage: ProcessStage3DMeta;
    }> = [];

    stages.slice(0, 7).forEach((st, idx) => {
      const posX = startX + idx * (keyWidth + keyGap);

      // Pivot group placed at the rear of the key (Z = -keyDepth / 2) for realistic key action
      const pivotGroup = new THREE.Group();
      pivotGroup.position.set(posX, 0, -keyDepth / 2);

      // Colors based on stage status
      let capColor = 0xf8fafc;
      let emissiveColor = 0x000000;
      let emissiveIntensity = 0;
      let hasPadlock = false;
      let isSuspended = false;

      if (st.hasRed) {
        capColor = 0xfff1f2;
        emissiveColor = 0xef4444;
        emissiveIntensity = 0.25;
        hasPadlock = true;
        isSuspended = true;
      } else if (st.hasYellow) {
        capColor = 0xfffbeb;
        emissiveColor = 0xf59e0b;
        emissiveIntensity = 0.18;
      } else if (st.allPassed || st.stagePct === 100) {
        capColor = 0xf0fdf4;
        emissiveColor = 0x10b981;
        emissiveIntensity = 0.22;
      } else {
        capColor = 0xf8fafc;
      }

      const topCapMat = new THREE.MeshStandardMaterial({
        color: capColor,
        roughness: 0.14, // 顶级温润树脂质感
        metalness: 0.06,
        emissive: emissiveColor,
        emissiveIntensity,
      });

      // Part A: Upper Ivory Top Cap
      const topCapMesh = new THREE.Mesh(topCapGeom, topCapMat);
      topCapMesh.position.set(0, (keyHeight - 0.14) / 2, keyDepth / 2);
      pivotGroup.add(topCapMesh);

      // Part B: Lower Gunmetal Metallic Body (展现厚实深度的钛金属侧身)
      const lowerMesh = new THREE.Mesh(lowerBodyGeom, lowerBodyMat);
      lowerMesh.position.set(0, -0.07, keyDepth / 2);
      pivotGroup.add(lowerMesh);

      // Part C: Front Piano Apron Lip (厚实琴裙立面)
      const apronMat = new THREE.MeshStandardMaterial({
        color: st.allPassed ? 0x10b981 : st.hasRed ? 0xef4444 : 0x94a3b8,
        metalness: 0.85,
        roughness: 0.2,
      });
      const apronMesh = new THREE.Mesh(apronGeom, apronMat);
      apronMesh.position.set(0, -keyHeight * 0.06, keyDepth);
      pivotGroup.add(apronMesh);

      // Part D: Recessed Backlit Progress Strip on key surface (键面激光微凹发光导轨)
      const maxStripL = keyDepth * 0.68;
      const progL = Math.max(maxStripL * (st.stagePct / 100), 0.04);
      const stripGeom = new THREE.BoxGeometry(keyWidth * 0.30, 0.02, progL);
      const stripMat = new THREE.MeshStandardMaterial({
        color: st.hasRed ? 0xef4444 : st.allPassed ? 0x10b981 : 0x3b82f6,
        emissive: st.hasRed ? 0xdc2626 : st.allPassed ? 0x059669 : 0x2563eb,
        emissiveIntensity: 0.6,
        roughness: 0.15,
        metalness: 0.4,
      });
      const stripMesh = new THREE.Mesh(stripGeom, stripMat);
      stripMesh.position.set(0, keyHeight / 2 + 0.011, keyDepth * 0.46 - maxStripL / 2 + progL / 2);
      pivotGroup.add(stripMesh);

      // Part E: Padlock for blocked stage
      let padlockGroup: THREE.Group | undefined;
      if (hasPadlock) {
        padlockGroup = createPadlock();
        pivotGroup.add(padlockGroup);
      }

      root.add(pivotGroup);

      const basePosY = isSuspended ? 0.28 : 0;
      pivotGroup.position.y = basePosY;

      keyMeshes.push({
        pivot: pivotGroup,
        bodyMesh: topCapMesh, // Raycasting hits the ivory top
        padlockGroup,
        targetRotX: 0,
        currentRotX: 0,
        targetPosY: basePosY,
        currentPosY: basePosY,
        stage: st,
      });
    });

    // Root isometric tilt (琴键向视口温和微倾，凸显厚重前立面)
    root.rotation.x = 0.45;

    // Raycasting for interactive piano key stroke
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    const pointerState = { x: 0, y: 0, isHover: false };

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      pointerState.x = mouse.x;
      pointerState.y = mouse.y;
      pointerState.isHover = true;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(keyMeshes.map((k) => k.bodyMesh));

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const hitIdx = keyMeshes.findIndex((k) => k.bodyMesh === hitMesh);
        if (hitIdx >= 0) {
          hoverIdxRef.current = hitIdx;
          setHoveredName(keyMeshes[hitIdx].stage.name);
          container.style.cursor = "pointer";
          return;
        }
      }
      hoverIdxRef.current = null;
      setHoveredName(null);
      container.style.cursor = "default";
    };

    const onPointerLeave = () => {
      pointerState.isHover = false;
      pointerState.x = 0;
      pointerState.y = 0;
      hoverIdxRef.current = null;
      setHoveredName(null);
      container.style.cursor = "default";
    };

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(keyMeshes.map((k) => k.bodyMesh));
      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const hit = keyMeshes.find((k) => k.bodyMesh === hitMesh);
        if (hit) {
          // Instant deep press tactile bounce
          hit.currentRotX = 0.12;
          if (onSelectStageRef.current) {
            onSelectStageRef.current(hit.stage.key);
          }
        }
      }
    };

    container.addEventListener("mousemove", onPointerMove);
    container.addEventListener("mouseleave", onPointerLeave);
    container.addEventListener("click", onClick);

    // Render loop
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
      const elapsed = clock.getElapsedTime();

      // Perfectly balanced ergonomic pianist tilt, subtle micro parallax only on actual hover
      const targetTiltY = pointerState.isHover ? pointerState.x * 0.03 : 0;
      const targetTiltX = pointerState.isHover ? 0.08 - pointerState.y * 0.02 : 0.08;
      root.rotation.y += (targetTiltY - root.rotation.y) * (delta * 6);
      root.rotation.x += (targetTiltX - root.rotation.x) * (delta * 6);

      keyMeshes.forEach((item, idx) => {
        const isHovered = hoverIdxRef.current === idx;
        const isActive = activeStageKeyRef.current === item.stage.key;

        // Realistic piano key stroke: pressed down around rear pivot when hovered
        item.targetRotX = isHovered ? 0.07 : isActive ? 0.04 : 0;
        item.currentRotX += (item.targetRotX - item.currentRotX) * (delta * 14);
        item.pivot.rotation.x = item.currentRotX;

        // Gentle floating for padlock on blocked stage
        if (item.padlockGroup) {
          item.padlockGroup.position.y = keyHeight / 2 + 0.1 + Math.sin(elapsed * 2.5) * 0.035;
          item.padlockGroup.rotation.y = Math.sin(elapsed * 1.5) * 0.12;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      container.removeEventListener("mousemove", onPointerMove);
      container.removeEventListener("mouseleave", onPointerLeave);
      container.removeEventListener("click", onClick);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      topCapGeom.dispose();
      lowerBodyGeom.dispose();
      apronGeom.dispose();
      feltGeom.dispose();
      feltMat.dispose();
      cheekGeom.dispose();
      cheekMat.dispose();
      keybedGeom.dispose();
      keybedMat.dispose();
    };
  }, [height]);

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <div
        ref={mountRef}
        style={{
          width: "100%",
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        title={hoveredName ? `工序: ${hoveredName}` : "工序流转 · 点击快速定位泳道"}
      />
    </div>
  );
};
