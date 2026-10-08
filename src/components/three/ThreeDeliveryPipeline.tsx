import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface ThreeDeliveryPipelineProps {
  height?: number;
}

/**
 * ThreeDeliveryPipeline
 * Linear / Stripe 风格 · 纯净流线 3D 交付导轨 (Clean Architectural Highway)
 * - 彻底清除所有廉价噪点粒子与星空点阵
 * - 纯净半透磨砂导轨 (Translucent Frosted Rail) + 7 节点精密金属滑块
 * - 柔和微视差倾斜，纯白通透背景，极简现代设计
 */
export const ThreeDeliveryPipeline: React.FC<ThreeDeliveryPipelineProps> = ({
  height = 140,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 920;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 2.6, 9.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // Studio Lighting
    const ambient = new THREE.AmbientLight(0xf8fafc, 1.4);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(6, 8, 6);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xe2e8f0, 1.2);
    fill.position.set(-6, 2, -3);
    scene.add(fill);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Create 3D Elegant S-Curve Pipeline Tube
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.8, -0.4, 0.5),
      new THREE.Vector3(-3.2, 0.6, -0.4),
      new THREE.Vector3(-1.6, 0.1, 0.6),
      new THREE.Vector3(0.0, 0.8, -0.2),
      new THREE.Vector3(1.6, 0.2, 0.6),
      new THREE.Vector3(3.2, 0.7, -0.4),
      new THREE.Vector3(4.8, 0.0, 0.3),
    ]);

    // Outer Translucent Glass Rail Tube
    const tubeGeom = new THREE.TubeGeometry(curve, 64, 0.08, 16, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.45,
    });
    const tubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
    rootGroup.add(tubeMesh);

    // Inner Solid Accent Rail
    const innerGeom = new THREE.TubeGeometry(curve, 48, 0.025, 8, false);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
    });
    const innerMesh = new THREE.Mesh(innerGeom, innerMat);
    rootGroup.add(innerMesh);

    // 7 Precision Stage Beacons along the Curve
    const beaconGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16);
    const beaconRingGeom = new THREE.TorusGeometry(0.26, 0.022, 8, 24);

    const beaconColors = [
      0x10b981, 0x10b981, 0x10b981, 0xef4444, 0x3b82f6, 0x6366f1, 0x8b5cf6,
    ];

    const beaconMeshes: THREE.Group[] = [];

    for (let i = 0; i < 7; i++) {
      const u = (i + 0.5) / 7;
      const pt = curve.getPoint(u);
      const bGroup = new THREE.Group();
      bGroup.position.copy(pt);

      const color = beaconColors[i];
      const bMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.2,
        roughness: 0.2,
        emissive: color,
        emissiveIntensity: 0.35,
      });
      const bMesh = new THREE.Mesh(beaconGeom, bMat);
      bGroup.add(bMesh);

      const rMat = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.8,
        roughness: 0.2,
      });
      const rMesh = new THREE.Mesh(beaconRingGeom, rMat);
      rMesh.rotation.x = Math.PI / 2;
      bGroup.add(rMesh);

      rootGroup.add(bGroup);
      beaconMeshes.push(bGroup);
    }

    // 2 Precision Sliding Carriers moving along the curve
    const carrierGeom = new THREE.BoxGeometry(0.35, 0.18, 0.22);
    const carrierMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0x0369a1,
      emissiveIntensity: 0.4,
    });
    const carrier1 = new THREE.Mesh(carrierGeom, carrierMat);
    const carrier2 = new THREE.Mesh(carrierGeom, carrierMat);
    rootGroup.add(carrier1);
    rootGroup.add(carrier2);

    // Mouse listener
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    container.addEventListener("mousemove", onMouseMove);

    // Render loop
    let animId = 0;
    let isVisible = true;
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
    });
    observer.observe(container);

    const clock = new THREE.Clock();
    let currentTiltX = 0;
    let currentTiltY = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Inertial Parallax
      const targetTiltX = mouseRef.current.y * 0.15;
      const targetTiltY = mouseRef.current.x * 0.22;
      currentTiltX += (targetTiltX - currentTiltX) * (delta * 6);
      currentTiltY += (targetTiltY - currentTiltY) * (delta * 6);

      rootGroup.rotation.x = currentTiltX;
      rootGroup.rotation.y = currentTiltY;

      // Move Carriers smoothly along curve
      const u1 = (elapsed * 0.08) % 1;
      const u2 = (elapsed * 0.08 + 0.5) % 1;
      carrier1.position.copy(curve.getPoint(u1));
      carrier2.position.copy(curve.getPoint(u2));

      // Micro floating for beacons
      beaconMeshes.forEach((bm, idx) => {
        bm.rotation.y += delta * (0.4 + idx * 0.1);
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      container.removeEventListener("mousemove", onMouseMove);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      tubeGeom.dispose();
      tubeMat.dispose();
      innerGeom.dispose();
      innerMat.dispose();
      beaconGeom.dispose();
      beaconRingGeom.dispose();
      carrierGeom.dispose();
      carrierMat.dispose();
    };
  }, [height]);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height,
        position: "relative",
        overflow: "hidden",
        borderRadius: 12,
        background: "transparent",
      }}
      title="3D 全景交付导轨 · 现代极简"
    />
  );
};
