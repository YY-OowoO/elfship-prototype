import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export interface StageSliceStatus {
  key: string;
  name: string;
  isPassed: boolean;
  hasRed: boolean;
  hasYellow: boolean;
  progress: number; // 0..100
}

export interface ThreeDeliveryTorusProps {
  size?: number; // 默认 144px
  processPct: number; // 0..100
  hasRed: boolean;
  stageStatuses?: StageSliceStatus[];
  onClick?: () => void;
}

/**
 * ThreeGyroChronometer / ThreeDeliveryTorus
 * 全新颠覆形态：空间三轴高精陀螺万向天象仪 (Triple-Axis Precision Gyroscope Chronometer)
 * 1. 瑞士高奢制表 / 空间航天级同心万向节机构 (Triple Gimbal Rings System)
 * 2. 外环刻度规标：激光微雕 0~100% 精密分度，香槟金激光卡尺指针精确指向 47% 成熟度标位
 * 3. 中环工序载体：镶嵌 7 颗工序微型精密指示台（翡翠通关石 / 钛蓝在制），4 号工序配精密钛红防拆机械锁扣
 * 4. 内环与引力核心：中心悬浮双轴八面体呼吸微晶核，伴随鼠标惯性视差产生优雅的物理双轴差速转动
 * 5. 纯净弧形悬臂冷钛托架，Studio 柔光照明，极致轻盈空灵，彻底告别方块、阶梯与实心笨拙！
 */
export const ThreeDeliveryTorus: React.FC<ThreeDeliveryTorusProps> = ({
  size = 144,
  processPct,
  hasRed,
  stageStatuses,
  onClick,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, hover: false });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Camera (精算视距与包围盒，预留 20% 安全呼吸边距，彻底杜绝任何边缘截断)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    camera.position.set(0, 1.6, 5.0);
    camera.lookAt(0, 0.04, 0);

    // 2. High-performance Antialiased WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // 3. Studio Softbox Lighting
    const ambientLight = new THREE.AmbientLight(0xf8fafc, 1.65);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.9);
    keyLight.position.set(5, 7, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe2e8f0, 1.4);
    fillLight.position.set(-5, 2, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf1f5f9, 2.2);
    rimLight.position.set(0, 7, -4);
    scene.add(rimLight);

    // 4. Root Object
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const geometriesToDispose: THREE.BufferGeometry[] = [];
    const materialsToDispose: THREE.Material[] = [];

    // 5. Sleek Anodized Titanium Base & Arc Suspension Arm (精算尺度，稳健托举)
    const baseGeom = new THREE.CylinderGeometry(0.72, 0.82, 0.08, 32);
    geometriesToDispose.push(baseGeom);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.88,
      roughness: 0.20,
    });
    materialsToDispose.push(baseMat);
    const baseMesh = new THREE.Mesh(baseGeom, baseMat);
    baseMesh.position.set(0, -1.06, 0);
    rootGroup.add(baseMesh);

    // Gold Bezel Lip on Base
    const baseLipGeom = new THREE.TorusGeometry(0.74, 0.014, 12, 48);
    geometriesToDispose.push(baseLipGeom);
    const baseLipMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.92,
      roughness: 0.18,
    });
    materialsToDispose.push(baseLipMat);
    const baseLip = new THREE.Mesh(baseLipGeom, baseLipMat);
    baseLip.rotation.x = Math.PI / 2;
    baseLip.position.set(0, -1.02, 0);
    rootGroup.add(baseLip);

    // Arc C-Arm Suspension Fork (圆润倒角金属悬臂托架)
    const armGeom = new THREE.TorusGeometry(1.22, 0.038, 16, 48, Math.PI * 0.96);
    geometriesToDispose.push(armGeom);
    const armMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      metalness: 0.92,
      roughness: 0.16,
    });
    materialsToDispose.push(armMat);
    const armMesh = new THREE.Mesh(armGeom, armMat);
    armMesh.rotation.z = -Math.PI * 0.48;
    armMesh.position.set(0, 0.04, 0);
    rootGroup.add(armMesh);

    // Vertical Stand Post connecting Base to C-Arm
    const postGeom = new THREE.CylinderGeometry(0.07, 0.085, 0.55, 16);
    geometriesToDispose.push(postGeom);
    const postMesh = new THREE.Mesh(postGeom, armMat);
    postMesh.position.set(0, -0.80, 0);
    rootGroup.add(postMesh);

    // 6. Gimbal Outer Ring (外环：0~100% 测度刻度环，微缩至完全容纳在画幅中)
    const outerRadius = 1.16;
    const ringTube = 0.032;

    const outerRingGroup = new THREE.Group();
    rootGroup.add(outerRingGroup);

    const outerRingGeom = new THREE.TorusGeometry(outerRadius, ringTube, 16, 64);
    geometriesToDispose.push(outerRingGeom);
    const outerRingMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.88,
      roughness: 0.16,
    });
    materialsToDispose.push(outerRingMat);
    const outerRingMesh = new THREE.Mesh(outerRingGeom, outerRingMat);
    outerRingGroup.add(outerRingMesh);

    // Fine Radial Chono Tick Marks along Outer Ring
    const tickCount = 48;
    const tickStep = (Math.PI * 2) / tickCount;
    const tickGeomMajor = new THREE.BoxGeometry(0.015, 0.08, 0.015);
    geometriesToDispose.push(tickGeomMajor);
    const tickGeomMinor = new THREE.BoxGeometry(0.010, 0.045, 0.012);
    geometriesToDispose.push(tickGeomMinor);
    const tickMatActive = new THREE.MeshBasicMaterial({ color: hasRed ? 0xef4444 : processPct >= 80 ? 0x10b981 : 0x2563eb });
    materialsToDispose.push(tickMatActive);
    const tickMatInactive = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, metalness: 0.6 });
    materialsToDispose.push(tickMatInactive);

    const activeTickThreshold = Math.floor((Math.max(0, Math.min(100, processPct)) / 100) * tickCount);

    for (let t = 0; t < tickCount; t++) {
      const angle = Math.PI / 2 - t * tickStep;
      const isMajor = t % 6 === 0;
      const r = outerRadius + ringTube * 0.72;
      const tMesh = new THREE.Mesh(
        isMajor ? tickGeomMajor : tickGeomMinor,
        t <= activeTickThreshold ? tickMatActive : tickMatInactive
      );
      tMesh.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
      tMesh.rotation.z = angle - Math.PI / 2;
      outerRingGroup.add(tMesh);
    }

    // Datum Caliper Cursor on Outer Ring pointing to 47% (激光指示针，紧凑无裁切)
    const validPct = Math.max(0, Math.min(100, processPct));
    const datumAngle = Math.PI / 2 - (validPct / 100) * (Math.PI * 2);

    const caliperPointerGeom = new THREE.ConeGeometry(0.045, 0.16, 16);
    geometriesToDispose.push(caliperPointerGeom);
    const caliperPointerMat = new THREE.MeshStandardMaterial({
      color: hasRed ? 0xef4444 : validPct >= 80 ? 0x10b981 : 0x2563eb,
      metalness: 0.88,
      roughness: 0.16,
      emissive: hasRed ? 0xdc2626 : validPct >= 80 ? 0x059669 : 0x1d4ed8,
      emissiveIntensity: 0.65,
    });
    materialsToDispose.push(caliperPointerMat);
    const caliperPointer = new THREE.Mesh(caliperPointerGeom, caliperPointerMat);
    caliperPointer.position.set(
      Math.cos(datumAngle) * (outerRadius + 0.10),
      Math.sin(datumAngle) * (outerRadius + 0.10),
      0
    );
    caliperPointer.rotation.z = datumAngle + Math.PI / 2;
    outerRingGroup.add(caliperPointer);

    // 7. Gimbal Middle Ring (中环：7 节点工序精密承载环)
    const midRadius = 0.92;
    const midRingGroup = new THREE.Group();
    outerRingGroup.add(midRingGroup);

    const midRingGeom = new THREE.TorusGeometry(midRadius, ringTube * 0.85, 16, 48);
    geometriesToDispose.push(midRingGeom);
    const midRingMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      metalness: 0.90,
      roughness: 0.16,
    });
    materialsToDispose.push(midRingMat);
    const midRingMesh = new THREE.Mesh(midRingGeom, midRingMat);
    midRingGroup.add(midRingMesh);

    // Initial architectural tilt for Middle Ring
    midRingGroup.rotation.x = Math.PI / 3.2;

    // Helper: Build Stage Gemstone Nodes along Middle Ring
    const nodeGeom = new THREE.SphereGeometry(0.075, 16, 16);
    geometriesToDispose.push(nodeGeom);

    const passedMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      metalness: 0.35,
      roughness: 0.12,
      emissive: 0x059669,
      emissiveIntensity: 0.7,
    });
    materialsToDispose.push(passedMat);

    const wipMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      metalness: 0.4,
      roughness: 0.15,
      emissive: 0x2563eb,
      emissiveIntensity: 0.55,
    });
    materialsToDispose.push(wipMat);

    const warnMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.35,
      roughness: 0.15,
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
    });
    materialsToDispose.push(warnMat);

    const idleMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.85,
      roughness: 0.25,
    });
    materialsToDispose.push(idleMat);

    // Padlock Builder for blocked stage node (4 号上传 SVN)
    const createBrakeLock = () => {
      const lockGroup = new THREE.Group();
      const bodyGeom = new THREE.BoxGeometry(0.18, 0.15, 0.09);
      geometriesToDispose.push(bodyGeom);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        metalness: 0.75,
        roughness: 0.18,
        emissive: 0xdc2626,
        emissiveIntensity: 0.7,
      });
      materialsToDispose.push(bodyMat);
      const body = new THREE.Mesh(bodyGeom, bodyMat);
      body.position.y = 0.07;
      lockGroup.add(body);

      const shackleGeom = new THREE.TorusGeometry(0.065, 0.016, 12, 20, Math.PI);
      geometriesToDispose.push(shackleGeom);
      const shackleMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        metalness: 0.95,
        roughness: 0.1,
      });
      materialsToDispose.push(shackleMat);
      const shackle = new THREE.Mesh(shackleGeom, shackleMat);
      shackle.rotation.z = Math.PI;
      shackle.position.y = 0.14;
      lockGroup.add(shackle);

      return lockGroup;
    };

    let brakeLockMesh: THREE.Group | undefined;
    const stageCount = 7;
    const stageStep = (Math.PI * 2) / stageCount;

    for (let i = 0; i < stageCount; i++) {
      const angle = Math.PI / 2 - i * stageStep;
      const st = stageStatuses ? stageStatuses[i] : null;

      let sMat = idleMat;
      let isBlocked = false;

      if (st) {
        if (st.hasRed) {
          isBlocked = true;
        } else if (st.hasYellow) {
          sMat = warnMat;
        } else if (st.isPassed || st.progress === 100) {
          sMat = passedMat;
        } else if (st.progress > 0) {
          sMat = wipMat;
        }
      } else {
        const threshold = ((i + 1) / stageCount) * 100;
        if (hasRed && i === 3) {
          isBlocked = true;
        } else if (validPct >= threshold) {
          sMat = passedMat;
        }
      }

      const nodeMesh = new THREE.Mesh(nodeGeom, isBlocked ? warnMat : sMat);
      nodeMesh.position.set(Math.cos(angle) * midRadius, Math.sin(angle) * midRadius, 0);
      midRingGroup.add(nodeMesh);

      // Gold collar ring around each node
      const collarGeom = new THREE.TorusGeometry(0.09, 0.012, 8, 24);
      geometriesToDispose.push(collarGeom);
      const collarMat = new THREE.MeshStandardMaterial({ color: isBlocked ? 0xef4444 : 0xd97706, metalness: 0.9, roughness: 0.2 });
      materialsToDispose.push(collarMat);
      const collar = new THREE.Mesh(collarGeom, collarMat);
      collar.position.copy(nodeMesh.position);
      midRingGroup.add(collar);

      if (isBlocked) {
        brakeLockMesh = createBrakeLock();
        brakeLockMesh.position.set(
          Math.cos(angle) * (midRadius + 0.14),
          Math.sin(angle) * (midRadius + 0.14),
          0.04
        );
        brakeLockMesh.rotation.z = angle - Math.PI / 2;
        midRingGroup.add(brakeLockMesh);
      }
    }

    // 8. Gimbal Inner Polar Ring & Central Chrono Core (内环与引力晶核)
    const innerRadius = 0.68;
    const innerRingGroup = new THREE.Group();
    midRingGroup.add(innerRingGroup);

    const innerRingGeom = new THREE.TorusGeometry(innerRadius, ringTube * 0.7, 16, 48);
    geometriesToDispose.push(innerRingGeom);
    const innerRingMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.88,
      roughness: 0.18,
    });
    materialsToDispose.push(innerRingMat);
    const innerRingMesh = new THREE.Mesh(innerRingGeom, innerRingMat);
    innerRingMesh.rotation.y = Math.PI / 2;
    innerRingGroup.add(innerRingMesh);

    // Central Floating Pulsar Crystal Core (中心八面体引力晶核)
    const coreGeom = new THREE.OctahedronGeometry(0.26, 2);
    geometriesToDispose.push(coreGeom);
    const coreMat = new THREE.MeshStandardMaterial({
      color: hasRed ? 0xef4444 : validPct >= 80 ? 0x10b981 : 0x2563eb,
      metalness: 0.85,
      roughness: 0.14,
      emissive: hasRed ? 0xdc2626 : validPct >= 80 ? 0x059669 : 0x1d4ed8,
      emissiveIntensity: 0.65,
    });
    materialsToDispose.push(coreMat);
    const coreMesh = new THREE.Mesh(coreGeom, coreMat);
    innerRingGroup.add(coreMesh);

    // Micro Gold Core Ring around Pulsar Crystal
    const coreRingGeom = new THREE.TorusGeometry(0.35, 0.012, 12, 32);
    geometriesToDispose.push(coreRingGeom);
    const coreRingMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.95,
      roughness: 0.15,
      emissive: 0xd97706,
      emissiveIntensity: 0.4,
    });
    materialsToDispose.push(coreRingMat);
    const coreRing = new THREE.Mesh(coreRingGeom, coreRingMat);
    innerRingGroup.add(coreRing);

    // 9. Soft Architectural Contact Shadow
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext("2d");
    if (sCtx) {
      const grad = sCtx.createRadialGradient(64, 64, 16, 64, 64, 60);
      grad.addColorStop(0, "rgba(15, 23, 42, 0.28)");
      grad.addColorStop(0.5, "rgba(15, 23, 42, 0.08)");
      grad.addColorStop(1, "rgba(15, 23, 42, 0)");
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeom = new THREE.PlaneGeometry(3.0, 3.0);
    geometriesToDispose.push(shadowGeom);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.62,
    });
    materialsToDispose.push(shadowMat);
    const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.12;
    scene.add(shadowMesh);

    // Initial comfortable view angle
    rootGroup.rotation.y = -0.32;
    rootGroup.rotation.x = 0.20;

    // 10. Inertial Damping & Render Loop
    let currentTiltX = 0.20;
    let currentTiltY = -0.32;
    let targetTiltX = 0.20;
    let targetTiltY = -0.32;
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

      // Independent Gimbal Differential Rotations (万向差速自转)
      midRingGroup.rotation.z += delta * 0.18; // smooth slow cruise
      innerRingGroup.rotation.y += delta * 0.35;
      innerRingGroup.rotation.x += delta * 0.22;

      // Central Pulsar breathing
      coreMesh.scale.setScalar(1 + Math.sin(elapsed * 2.6) * 0.05);

      if (brakeLockMesh) {
        brakeLockMesh.scale.setScalar(1 + Math.sin(elapsed * 3.2) * 0.04);
      }

      if (mouseRef.current.hover) {
        targetTiltX = 0.20 - mouseRef.current.y * 0.32;
        targetTiltY = -0.32 + mouseRef.current.x * 0.42;
      } else {
        targetTiltX = 0.20 + Math.sin(elapsed * 0.9) * 0.018;
        targetTiltY = -0.32 + Math.cos(elapsed * 0.8) * 0.018;
      }

      currentTiltX += (targetTiltX - currentTiltX) * (delta * 6);
      currentTiltY += (targetTiltY - currentTiltY) * (delta * 6);

      rootGroup.rotation.x = currentTiltX;
      rootGroup.rotation.y = currentTiltY;

      renderer.render(scene, camera);
    };

    animate();
    setIsReady(true);

    const onMouseEnter = () => {
      mouseRef.current.hover = true;
    };
    const onMouseLeave = () => {
      mouseRef.current.hover = false;
      mouseRef.current.x = 0;
      mouseRef.current.y = 0;
    };
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseRef.current.x = nx;
      mouseRef.current.y = ny;
    };

    container.addEventListener("mouseenter", onMouseEnter);
    container.addEventListener("mouseleave", onMouseLeave);
    container.addEventListener("mousemove", onMouseMove);

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      container.removeEventListener("mouseenter", onMouseEnter);
      container.removeEventListener("mouseleave", onMouseLeave);
      container.removeEventListener("mousemove", onMouseMove);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      shadowTex.dispose();
      geometriesToDispose.forEach((g) => g.dispose());
      materialsToDispose.forEach((m) => m.dispose());
    };
  }, [size]);

  return (
    <div
      ref={mountRef}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        position: "relative",
        cursor: onClick ? "pointer" : "grab",
        userSelect: "none",
        opacity: isReady ? 1 : 0,
        transition: "opacity 0.25s ease",
      }}
      title="全景通关成熟度 · 可拖拽旋转"
    />
  );
};

export const ThreeGyroChronometer = ThreeDeliveryTorus;
export const ThreePrismaticMonolith = ThreeDeliveryTorus;
export const ThreeMaturitySteps = ThreeDeliveryTorus;




