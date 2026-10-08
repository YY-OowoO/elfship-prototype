import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface ThreeChronoDialProps {
  size?: number; // 默认 26px
  daysRemain: number; // 如 7
  onClick?: () => void;
}

/**
 * ThreeChronoDial
 * Apple / teenage engineering 风格 · 精密物理日晷刻度环
 * - 哑光铝质滚花表圈 (Knurled Aluminum Bezel)
 * - 精密齿轮咬合与步进角度缓动
 * - 随工期倒计时顺滑步进
 * - 纯净微型 3D 机械美感，零噪点、零粒子
 */
export const ThreeChronoDial: React.FC<ThreeChronoDialProps> = ({
  size = 26,
  daysRemain,
  onClick,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    camera.position.set(0, 0, 3.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(size, size);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // Studio soft light
    const ambient = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 2.5);
    key.position.set(2, 3, 3);
    scene.add(key);

    const dialGroup = new THREE.Group();
    scene.add(dialGroup);

    // Outer Knurled Bezel: Torus with high radial segments
    const bezelGeom = new THREE.TorusGeometry(0.85, 0.12, 12, 28);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      metalness: 0.85,
      roughness: 0.25,
    });
    const bezel = new THREE.Mesh(bezelGeom, bezelMat);
    dialGroup.add(bezel);

    // Inner Chrono Face
    const faceGeom = new THREE.CylinderGeometry(0.72, 0.72, 0.05, 24);
    const faceMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.4,
      roughness: 0.3,
    });
    const face = new THREE.Mesh(faceGeom, faceMat);
    face.rotation.x = Math.PI / 2;
    dialGroup.add(face);

    // Precision Marker Needle (Pointer)
    const needleGeom = new THREE.BoxGeometry(0.08, 0.45, 0.04);
    const needleMat = new THREE.MeshStandardMaterial({
      color: 0x4f46e5,
      metalness: 0.9,
      roughness: 0.1,
    });
    const needle = new THREE.Mesh(needleGeom, needleMat);
    needle.position.set(0, 0.25, 0.04);
    dialGroup.add(needle);

    // Target rotation based on days remain (each day = 30 deg step)
    const targetAngle = (daysRemain % 12) * (Math.PI / 6);
    let currentAngle = targetAngle - 0.5;

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

      // Smooth step damping towards target angle
      currentAngle += (targetAngle - currentAngle) * (delta * 8);
      dialGroup.rotation.z = -currentAngle;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      bezelGeom.dispose();
      bezelMat.dispose();
      faceGeom.dispose();
      faceMat.dispose();
      needleGeom.dispose();
      needleMat.dispose();
    };
  }, [size, daysRemain]);

  return (
    <div
      ref={mountRef}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: onClick ? "pointer" : "default",
        flexShrink: 0,
      }}
      title={`3D 精密时钟刻度环 · 剩余 ${daysRemain} 工作日`}
    />
  );
};
