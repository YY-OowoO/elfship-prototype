import { useState, useRef, useEffect, useCallback } from "react";
import { Button, Segmented, Space, Tag, Typography, Tooltip, Slider } from "antd";
import {
  Cube,
  Palette,
  Waveform,
  Sparkle,
  ArrowsOut,
  Play,
  Pause,
  SlidersHorizontal,
  GridFour,
  Drop,
  Broadcast,
  CircleHalf,
} from "../icons";
import { playSound } from "../sound";
import { ThreeAssetViewer, type ThreeShadingMode, type MeshStats, type Asset3DPreset } from "./three/ThreeAssetViewer";

const { Text } = Typography;

interface AssetPreviewerProps {
  assetName: string;
  assetType: string;
  svnPath?: string;
  svnRev?: string;
}

type ShadingMode = ThreeShadingMode;
type BgMode = "checker" | "dark" | "white" | "green";
type ColorChannel = "rgb" | "r" | "g" | "b" | "alpha";

export function AssetPreviewer({ assetName, assetType, svnPath, svnRev }: AssetPreviewerProps) {
  const is3D = assetType.includes("3D") || assetType.includes("模型") || assetType.includes("道具");
  const isAudio = assetType.includes("音频") || assetType.includes("音效");
  const isVFX = assetType.includes("VFX") || assetType.includes("特效") || assetType.includes("粒子");
  const is2D = !is3D && !isAudio && !isVFX;

  // Viewport Tab Switcher
  const [activeTab, setActiveTab] = useState<"viewport" | "specs">("viewport");

  // -------------------------------------------------------------
  // 3D Three.js WebGL Viewport State
  // -------------------------------------------------------------
  const [shadingMode, setShadingMode] = useState<ShadingMode>("pbr");
  const [autoRotate, setAutoRotate] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [lightAngle, setLightAngle] = useState(45);
  const [isExploded, setIsExploded] = useState(false);
  const [modelPreset, setModelPreset] = useState<Asset3DPreset>("blade");
  const [meshStats, setMeshStats] = useState<MeshStats>({
    tris: 2420,
    verts: 1380,
    materials: 4,
    dimensions: "0.8m × 3.6m × 0.4m",
    isBudgetOk: true,
  });

  // -------------------------------------------------------------
  // 2D Viewport & Split Diff State
  // -------------------------------------------------------------
  const canvas2DRef = useRef<HTMLCanvasElement | null>(null);
  const [compareMode, setCompareMode] = useState<"single" | "diff">("single");
  const [splitPos, setSplitPos] = useState(50); // 0 - 100 percentage
  const [bgMode, setBgMode] = useState<BgMode>("checker");
  const [channel, setChannel] = useState<ColorChannel>("rgb");
  const [showSliceGuide, setShowSliceGuide] = useState(true);
  const [zoom2D, setZoom2D] = useState(1);
  const [pan2D, setPan2D] = useState({ x: 0, y: 0 });
  const [hoverColor, setHoverColor] = useState<{ x: number; y: number; hex: string } | null>(null);
  const isDragging2D = useRef(false);
  const lastMouse2D = useRef({ x: 0, y: 0 });
  const isDraggingSplit = useRef(false);

  // -------------------------------------------------------------
  // Audio Viewport State
  // -------------------------------------------------------------
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioTimerRef = useRef<number | null>(null);

  // -------------------------------------------------------------
  // VFX Particle Simulation State
  // -------------------------------------------------------------
  const canvasVFXRef = useRef<HTMLCanvasElement | null>(null);
  const [blendMode, setBlendMode] = useState<"additive" | "alpha">("additive");

  // =============================================================
  // 2D High-DPI Canvas Rendering (Artwork, 9-Slice & Curtain Diff)
  // =============================================================
  const render2D = useCallback(() => {
    if (!is2D) return;
    const canvas = canvas2DRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Backdrop
    if (bgMode === "checker") {
      const tileSize = 12;
      for (let y = 0; y < canvas.height; y += tileSize) {
        for (let x = 0; x < canvas.width; x += tileSize) {
          ctx.fillStyle = (x / tileSize + y / tileSize) % 2 === 0 ? "#ffffff" : "#f1f5f9";
          ctx.fillRect(x, y, tileSize, tileSize);
        }
      }
    } else if (bgMode === "dark") {
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (bgMode === "white") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (bgMode === "green") {
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const drawAssetCard = (isOldVersion: boolean) => {
      ctx.save();
      ctx.translate(canvas.width / 2 + pan2D.x, canvas.height / 2 + pan2D.y);
      ctx.scale(zoom2D, zoom2D);

      const artW = 200;
      const artH = 130;
      const x0 = -artW / 2;
      const y0 = -artH / 2;

      ctx.shadowColor = "rgba(15, 23, 42, 0.16)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;

      const grad = ctx.createLinearGradient(x0, y0, x0 + artW, y0 + artH);
      if (isOldVersion) {
        // Old rejected version: saturated desaturated red-amber tint
        grad.addColorStop(0, "#94a3b8");
        grad.addColorStop(0.5, "#64748b");
        grad.addColorStop(1, "#475569");
      } else {
        if (channel === "rgb") {
          grad.addColorStop(0, "#3b82f6");
          grad.addColorStop(0.5, "#8b5cf6");
          grad.addColorStop(1, "#ec4899");
        } else if (channel === "r") {
          grad.addColorStop(0, "#ef4444");
          grad.addColorStop(1, "#7f1d1d");
        } else if (channel === "g") {
          grad.addColorStop(0, "#22c55e");
          grad.addColorStop(1, "#14532d");
        } else if (channel === "b") {
          grad.addColorStop(0, "#3b82f6");
          grad.addColorStop(1, "#1e3a8a");
        } else {
          grad.addColorStop(0, "#ffffff");
          grad.addColorStop(1, "#ffffff");
        }
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x0, y0, artW, artH, 12);
      ctx.fill();

      ctx.shadowColor = "transparent";
      ctx.strokeStyle = isOldVersion ? "rgba(239, 68, 68, 0.7)" : "rgba(255, 255, 255, 0.8)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Emblem
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.fillStyle = isOldVersion ? "rgba(239, 68, 68, 0.25)" : "rgba(255, 255, 255, 0.22)";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Version icon
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(isOldVersion ? "V1" : "V2", 0, 1);

      // Label Text
      ctx.font = "600 11px -apple-system, sans-serif";
      ctx.fillText(isOldVersion ? `${assetName} (旧版)` : assetName, 0, 42);

      // 9-Slice Guides
      if (showSliceGuide && !isOldVersion) {
        ctx.save();
        ctx.strokeStyle = "#06b6d4";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);

        const inset = 24;
        ctx.beginPath();
        ctx.moveTo(x0 + inset, y0);
        ctx.lineTo(x0 + inset, y0 + artH);
        ctx.moveTo(x0 + artW - inset, y0);
        ctx.lineTo(x0 + artW - inset, y0 + artH);
        ctx.moveTo(x0, y0 + inset);
        ctx.lineTo(x0 + artW, y0 + inset);
        ctx.moveTo(x0, y0 + artH - inset);
        ctx.lineTo(x0 + artW, y0 + artH - inset);
        ctx.stroke();

        ctx.fillStyle = "#06b6d4";
        ctx.font = "10px monospace";
        ctx.fillText("24px", x0 + inset / 2, y0 + 14);
        ctx.fillText("24px", x0 + artW - inset / 2, y0 + 14);
        ctx.restore();
      }

      ctx.restore();
    };

    if (compareMode === "single") {
      drawAssetCard(false);
    } else {
      // Split Diff Curtain Mode
      const splitX = (canvas.width * splitPos) / 100;

      // Left Side: Old Rejected Version (Clipped)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, canvas.height);
      ctx.clip();
      drawAssetCard(true);
      // Badge Old
      ctx.fillStyle = "rgba(239, 68, 68, 0.85)";
      ctx.fillRect(8, 8, 92, 20);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("基线: r98320 (驳回)", 12, 22);
      ctx.restore();

      // Right Side: New Revision (Clipped)
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, canvas.width - splitX, canvas.height);
      ctx.clip();
      drawAssetCard(false);
      // Badge New
      ctx.fillStyle = "rgba(16, 185, 129, 0.85)";
      ctx.fillRect(canvas.width - 98, 8, 90, 20);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("当前提审: r98412", canvas.width - 94, 22);
      ctx.restore();

      // Draw Split Line & Draggable Handle
      ctx.save();
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, canvas.height);
      ctx.stroke();

      // Center Handle
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.arc(splitX, canvas.height / 2, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⇄", splitX, canvas.height / 2);
      ctx.restore();
    }
  }, [is2D, bgMode, channel, showSliceGuide, zoom2D, pan2D, assetName, compareMode, splitPos]);

  useEffect(() => {
    render2D();
  }, [render2D]);

  // =============================================================
  // Audio Web Audio API Player & Spectrum Simulation
  // =============================================================
  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      setIsPlayingAudio(false);
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
    } else {
      setIsPlayingAudio(true);
      playSound.fanfare();
      audioTimerRef.current = window.setInterval(() => {
        setAudioProgress((prev) => {
          if (prev >= 1) {
            setIsPlayingAudio(false);
            if (audioTimerRef.current) clearInterval(audioTimerRef.current);
            return 0;
          }
          return prev + 0.05;
        });
      }, 150);
    }
  };

  useEffect(() => {
    return () => {
      if (audioTimerRef.current) clearInterval(audioTimerRef.current);
    };
  }, []);

  // =============================================================
  // VFX Particle Canvas Simulation
  // =============================================================
  useEffect(() => {
    if (!isVFX) return;
    const canvas = canvasVFXRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles = Array.from({ length: 48 }).map(() => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 80,
      y: canvas.height / 2 + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 2.2,
      vy: -Math.random() * 2.5 - 0.5,
      size: Math.random() * 5 + 2,
      hue: Math.random() * 50 + 20,
      alpha: Math.random() * 0.7 + 0.3,
    }));

    function renderVFX() {
      if (!ctx || !canvas) return;
      ctx.fillStyle = "rgba(15, 23, 42, 0.2)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (blendMode === "additive") {
        ctx.globalCompositeOperation = "lighter";
      } else {
        ctx.globalCompositeOperation = "source-over";
      }

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.008;

        if (p.alpha <= 0 || p.y < 0) {
          p.x = canvas.width / 2 + (Math.random() - 0.5) * 40;
          p.y = canvas.height - 20;
          p.vx = (Math.random() - 0.5) * 2;
          p.vy = -Math.random() * 2.5 - 0.5;
          p.alpha = Math.random() * 0.7 + 0.3;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 95%, 55%, ${p.alpha})`;
        ctx.shadowColor = `hsl(${p.hue}, 100%, 50%)`;
        ctx.shadowBlur = 10;
        ctx.fill();
      });

      ctx.globalCompositeOperation = "source-over";
      ctx.shadowColor = "transparent";

      animId = requestAnimationFrame(renderVFX);
    }

    renderVFX();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isVFX, blendMode]);

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 10,
        padding: "10px 12px",
        border: "1px solid rgba(226, 232, 240, 0.95)",
        boxShadow: "0 1px 4px rgba(15, 23, 42, 0.04)",
        marginTop: 0,
      }}
    >
      {/* Header Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
        <Space size={8} style={{ minWidth: 0, flexWrap: "wrap" }}>
          {is3D ? (
            <Tag color="cyan" style={{ display: "inline-flex", alignItems: "center", gap: 4, margin: 0, fontWeight: 600 }}>
              <Cube size={13} weight="duotone" /> 3D WebGL 资产检视
            </Tag>
          ) : isAudio ? (
            <Tag color="green" style={{ display: "inline-flex", alignItems: "center", gap: 4, margin: 0, fontWeight: 600 }}>
              <Waveform size={13} weight="duotone" /> 音效资产检视
            </Tag>
          ) : isVFX ? (
            <Tag color="volcano" style={{ display: "inline-flex", alignItems: "center", gap: 4, margin: 0, fontWeight: 600 }}>
              <Sparkle size={13} weight="duotone" /> 特效粒子检视
            </Tag>
          ) : (
            <Tag color="purple" style={{ display: "inline-flex", alignItems: "center", gap: 4, margin: 0, fontWeight: 600 }}>
              <Palette size={13} weight="duotone" /> 2D 原画/UI 检视
            </Tag>
          )}
          <Text strong style={{ fontSize: 13, maxWidth: 160 }} ellipsis={{ tooltip: assetName }}>
            {assetName}
          </Text>
        </Space>

        <Segmented
          size="small"
          value={activeTab}
          onChange={(v) => setActiveTab(v as "viewport" | "specs")}
          options={[
            { label: "视口渲染", value: "viewport" },
            { label: "规格参数", value: "specs" },
          ]}
        />
      </div>

      {/* 3D Three.js Model Viewport */}
      {is3D && activeTab === "viewport" && (
        <div>
          {/* Controls toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 8,
              background: "#f8fafc",
              padding: "4px 8px",
              borderRadius: 8,
              border: "1px solid rgba(226, 232, 240, 0.8)",
            }}
          >
            <Space size={4}>
              <Text type="secondary" style={{ fontSize: 11 }}>模型:</Text>
              <Segmented
                size="small"
                value={modelPreset}
                onChange={(v) => {
                  playSound.click();
                  setModelPreset(v as Asset3DPreset);
                }}
                options={[
                  { label: "战刃", value: "blade" },
                  { label: "核心", value: "core" },
                  { label: "枢纽", value: "portal" },
                ]}
              />

              <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>着色:</Text>
              <Segmented
                size="small"
                value={shadingMode}
                onChange={(v) => {
                  playSound.focus();
                  setShadingMode(v as ShadingMode);
                }}
                options={[
                  { label: "PBR 实色", value: "pbr" },
                  { label: "线框", value: "wireframe" },
                  { label: "陶土", value: "clay" },
                  { label: "法线", value: "normals" },
                  { label: "UV", value: "uv" },
                ]}
              />
            </Space>

            <Space size={6}>
              <Tooltip title={isExploded ? "恢复组装视图" : "一键爆炸拆解模型各组件"}>
                <Button
                  size="small"
                  type={isExploded ? "primary" : "default"}
                  onClick={() => {
                    playSound.click();
                    setIsExploded((e) => !e);
                  }}
                  style={{ height: 24, fontSize: 11, padding: "0 8px" }}
                >
                  {isExploded ? "组装" : "拆解"}
                </Button>
              </Tooltip>

              <Tooltip title={autoRotate ? "暂停自动转台" : "开启 360° 自动转台"}>
                <Button
                  size="small"
                  type={autoRotate ? "primary" : "default"}
                  icon={autoRotate ? <Pause size={12} weight="bold" /> : <Play size={12} weight="bold" />}
                  onClick={() => {
                    playSound.click();
                    setAutoRotate((r) => !r);
                  }}
                  style={{ height: 24, fontSize: 11 }}
                >
                  转台
                </Button>
              </Tooltip>

              <Tooltip title="地平面网格">
                <Button
                  size="small"
                  type={showGrid ? "primary" : "default"}
                  icon={<GridFour size={12} weight="duotone" />}
                  onClick={() => {
                    playSound.click();
                    setShowGrid((g) => !g);
                  }}
                  style={{ height: 24, padding: "0 6px" }}
                />
              </Tooltip>

              <Tooltip title="双击视口可快速重置视角">
                <Button
                  size="small"
                  icon={<ArrowsOut size={12} weight="duotone" />}
                  onClick={() => {
                    playSound.click();
                    // trigger internal double click reset
                  }}
                  style={{ height: 24, padding: "0 6px" }}
                />
              </Tooltip>
            </Space>
          </div>

          {/* Three.js 3D Viewport Box */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 210,
              background: "radial-gradient(ellipse at 50% 40%, #ffffff 0%, #f1f5f9 65%, #e2e8f0 100%)",
              borderRadius: 8,
              border: "1px solid rgba(203, 213, 225, 0.8)",
              overflow: "hidden",
              boxShadow: "inset 0 2px 6px rgba(0,0,0,0.04)",
            }}
          >
            <ThreeAssetViewer
              assetName={assetName}
              assetType={assetType}
              shadingMode={shadingMode}
              autoRotate={autoRotate}
              showGrid={showGrid}
              lightAngle={lightAngle}
              isExploded={isExploded}
              modelPreset={modelPreset}
              onMeshStatsChange={setMeshStats}
            />

            {/* Top-left Hint */}
            <div
              style={{
                position: "absolute",
                top: 8,
                left: 10,
                fontSize: 11,
                color: "#64748b",
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: "rgba(255, 255, 255, 0.85)",
                padding: "2px 6px",
                borderRadius: 4,
                backdropFilter: "blur(4px)",
              }}
            >
              <span>Three.js WebGL 检视 · 左键旋转 / 滚轮缩放</span>
            </div>

            {/* Bottom-Right Tech HUD Specs (Dynamically linked with Three.js Geometry) */}
            <div
              style={{
                position: "absolute",
                bottom: 8,
                right: 10,
                fontSize: 11,
                color: "#334155",
                background: "rgba(255, 255, 255, 0.92)",
                backdropFilter: "blur(8px)",
                padding: "2px 8px",
                borderRadius: 6,
                border: "1px solid rgba(226, 232, 240, 0.85)",
                display: "flex",
                gap: 10,
                pointerEvents: "none",
              }}
            >
              <span>面数: <b style={{ color: "#0284c7" }}>{meshStats.tris.toLocaleString()} Tris</b></span>
              <span>顶点: <b>{meshStats.verts.toLocaleString()} Verts</b></span>
              <span>材质: <b>{meshStats.materials} Mat</b></span>
              <span>预算: <b style={{ color: meshStats.isBudgetOk ? "#16a34a" : "#dc2626" }}>
                {meshStats.isBudgetOk ? "合规" : "超标"}
              </b></span>
            </div>
          </div>

          {/* Light angle slider strip */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, padding: "0 4px" }}>
            <Text type="secondary" style={{ fontSize: 11, whiteSpace: "nowrap" }}>
              <SlidersHorizontal size={12} weight="duotone" style={{ marginRight: 3 }} /> 动态光照:
            </Text>
            <Slider
              min={0}
              max={360}
              value={lightAngle}
              onChange={(v) => setLightAngle(v)}
              style={{ flex: 1, margin: "4px 0" }}
            />
            <Text type="secondary" style={{ fontSize: 11, width: 34, textAlign: "right" }}>
              {lightAngle}°
            </Text>
          </div>
        </div>
      )}

      {/* 2D Image / UI Viewport with Curtain Diff */}
      {is2D && activeTab === "viewport" && (
        <div>
          {/* 2D Controls Bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 8,
              background: "#f8fafc",
              padding: "4px 8px",
              borderRadius: 8,
              border: "1px solid rgba(226, 232, 240, 0.8)",
            }}
          >
            <Space size={6}>
              <Segmented
                size="small"
                value={compareMode}
                onChange={(v) => {
                  playSound.click();
                  setCompareMode(v as "single" | "diff");
                }}
                options={[
                  { label: "单图检视", value: "single" },
                  { label: "版本卷帘对比", value: "diff", icon: <CircleHalf size={12} /> },
                ]}
              />

              {compareMode === "single" && (
                <>
                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>通道:</Text>
                  <Segmented
                    size="small"
                    value={channel}
                    onChange={(v) => {
                      playSound.focus();
                      setChannel(v as ColorChannel);
                    }}
                    options={[
                      { label: "全彩", value: "rgb" },
                      { label: "R", value: "r" },
                      { label: "G", value: "g" },
                      { label: "B", value: "b" },
                      { label: "Alpha", value: "alpha" },
                    ]}
                  />
                </>
              )}
            </Space>

            <Space size={6}>
              <Text type="secondary" style={{ fontSize: 11 }}>底衬:</Text>
              <Segmented
                size="small"
                value={bgMode}
                onChange={(v) => setBgMode(v as BgMode)}
                options={[
                  { label: "棋盘", value: "checker" },
                  { label: "深色", value: "dark" },
                  { label: "纯白", value: "white" },
                  { label: "绿幕", value: "green" },
                ]}
              />

              {compareMode === "single" && (
                <Tooltip title="9-Slice 九宫格拉伸安全区标记">
                  <Button
                    size="small"
                    type={showSliceGuide ? "primary" : "default"}
                    onClick={() => {
                      playSound.click();
                      setShowSliceGuide((s) => !s);
                    }}
                    style={{ height: 24, fontSize: 11 }}
                  >
                    九宫格
                  </Button>
                </Tooltip>
              )}
            </Space>
          </div>

          {/* 2D Canvas Viewport */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 190,
              borderRadius: 8,
              border: "1px solid rgba(203, 213, 225, 0.8)",
              overflow: "hidden",
              cursor: compareMode === "diff" ? "col-resize" : isDragging2D.current ? "grabbing" : "crosshair",
            }}
            onMouseDown={(e) => {
              if (compareMode === "diff") {
                isDraggingSplit.current = true;
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
                setSplitPos(pos);
              } else {
                isDragging2D.current = true;
                lastMouse2D.current = { x: e.clientX, y: e.clientY };
              }
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              if (compareMode === "diff" && isDraggingSplit.current) {
                const pos = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
                setSplitPos(pos);
              } else if (isDragging2D.current) {
                const dx = e.clientX - lastMouse2D.current.x;
                const dy = e.clientY - lastMouse2D.current.y;
                setPan2D((p) => ({ x: p.x + dx, y: p.y + dy }));
                lastMouse2D.current = { x: e.clientX, y: e.clientY };
              }

              if (compareMode === "single") {
                setHoverColor({
                  x: Math.round(e.clientX - rect.left),
                  y: Math.round(e.clientY - rect.top),
                  hex: "#3B82F6",
                });
              }
            }}
            onMouseUp={() => {
              isDragging2D.current = false;
              isDraggingSplit.current = false;
            }}
            onMouseLeave={() => {
              isDragging2D.current = false;
              isDraggingSplit.current = false;
              setHoverColor(null);
            }}
          >
            <canvas ref={canvas2DRef} width={460} height={190} style={{ width: "100%", height: "100%", display: "block" }} />

            {/* Hover Color Picker HUD in single mode */}
            {compareMode === "single" && hoverColor && (
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  left: 10,
                  fontSize: 11,
                  background: "rgba(255, 255, 255, 0.92)",
                  backdropFilter: "blur(8px)",
                  padding: "2px 8px",
                  borderRadius: 6,
                  border: "1px solid rgba(226, 232, 240, 0.9)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  pointerEvents: "none",
                }}
              >
                <Drop size={12} weight="duotone" color="#0284c7" />
                <span>X: {hoverColor.x}px, Y: {hoverColor.y}px</span>
                <span style={{ color: "#0284c7", fontWeight: 600 }}>{hoverColor.hex}</span>
              </div>
            )}

            {/* Bottom-right Zoom & Scale Bar */}
            <div
              style={{
                position: "absolute",
                bottom: 8,
                right: 10,
                fontSize: 11,
                color: "#334155",
                background: "rgba(255, 255, 255, 0.92)",
                backdropFilter: "blur(8px)",
                padding: "2px 8px",
                borderRadius: 6,
                border: "1px solid rgba(226, 232, 240, 0.9)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>{compareMode === "diff" ? "左右拖拽对比" : `缩放: ${Math.round(zoom2D * 100)}%`}</span>
              <Button
                size="small"
                type="text"
                style={{ height: 18, fontSize: 10, padding: "0 4px" }}
                onClick={() => {
                  setZoom2D(1);
                  setPan2D({ x: 0, y: 0 });
                  setSplitPos(50);
                }}
              >
                复位
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Audio SFX Viewport */}
      {isAudio && activeTab === "viewport" && (
        <div
          style={{
            background: "#f0fdf4",
            border: "1px solid rgba(187, 247, 208, 0.9)",
            borderRadius: 8,
            padding: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Space size={10}>
              <Button
                type="primary"
                shape="circle"
                icon={isPlayingAudio ? <Pause size={14} weight="bold" /> : <Play size={14} weight="bold" />}
                onClick={handleToggleAudio}
                style={{ background: "#16a34a", borderColor: "#16a34a" }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{assetName} · 技能打击音效.wav</div>
                <div style={{ fontSize: 11, color: "#16a34a" }}>
                  48.0 kHz · 24-bit PCM · -14.2 LUFS (合规)
                </div>
              </div>
            </Space>

            <Tag color="success">广播级无爆音</Tag>
          </div>

          {/* Animated 40-band EQ Bars */}
          <div
            style={{
              height: 64,
              background: "#ffffff",
              borderRadius: 6,
              border: "1px solid rgba(226, 232, 240, 0.9)",
              display: "flex",
              alignItems: "flex-end",
              padding: "6px 12px",
              gap: 4,
            }}
          >
            {Array.from({ length: 36 }).map((_, i) => {
              const activeHeight = isPlayingAudio
                ? Math.max(6, Math.sin(i * 0.4 + Date.now() * 0.005) * 24 + Math.cos(i * 0.8) * 16 + 18)
                : 10 + Math.sin(i * 0.3) * 14;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: activeHeight,
                    background: i > 8 && i < 28 ? "#16a34a" : "rgba(22, 163, 74, 0.35)",
                    borderRadius: 2,
                    transition: "height 0.1s ease",
                  }}
                />
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", marginTop: 6 }}>
            <span>00:0{Math.floor(audioProgress * 3)}.{Math.floor((audioProgress * 30) % 10)}</span>
            <span>00:03.20</span>
          </div>
        </div>
      )}

      {/* VFX Particle Viewport */}
      {isVFX && activeTab === "viewport" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <Space size={6}>
              <Text type="secondary" style={{ fontSize: 11 }}>混合模式:</Text>
              <Segmented
                size="small"
                value={blendMode}
                onChange={(v) => setBlendMode(v as "additive" | "alpha")}
                options={[
                  { label: "Additive 线性减淡", value: "additive" },
                  { label: "Alpha 混合", value: "alpha" },
                ]}
              />
            </Space>
            <Tag color="volcano">DrawCall: 1 DC</Tag>
          </div>

          <div
            style={{
              position: "relative",
              width: "100%",
              height: 180,
              borderRadius: 8,
              overflow: "hidden",
              background: "#0b0f19",
              border: "1px solid rgba(226, 232, 240, 0.2)",
            }}
          >
            <canvas ref={canvasVFXRef} width={460} height={180} style={{ width: "100%", height: "100%", display: "block" }} />
            <div
              style={{
                position: "absolute",
                top: 8,
                left: 10,
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.6)",
                pointerEvents: "none",
              }}
            >
              <Broadcast size={12} weight="duotone" style={{ marginRight: 4 }} /> 粒子发射速率: 120 Part/s
            </div>
          </div>
        </div>
      )}

      {/* Technical Specs Tab */}
      {activeTab === "specs" && (
        <div
          style={{
            background: "#f8fafc",
            borderRadius: 8,
            padding: 12,
            border: "1px solid rgba(226, 232, 240, 0.9)",
            fontSize: 12,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <Text type="secondary">资产格式 / 类型: </Text>
              <Text strong>{assetType}</Text>
            </div>
            <div>
              <Text type="secondary">版本 Revision: </Text>
              <Text code>{svnRev ?? "r98412"}</Text>
            </div>
            <div>
              <Text type="secondary">SVN 路径: </Text>
              <Text ellipsis style={{ maxWidth: 160 }}>
                {svnPath ?? "svn://art/assets/summer2026"}
              </Text>
            </div>
            <div>
              <Text type="secondary">贴图规格: </Text>
              <Text strong>2048 × 2048 ASTC 6x6</Text>
            </div>
            <div>
              <Text type="secondary">色彩空间: </Text>
              <Text strong>Display P3 / sRGB</Text>
            </div>
            <div>
              <Text type="secondary">引擎适配: </Text>
              <Text strong>Unreal Engine 5.4 / Unity 6</Text>
            </div>
            {is3D && (
              <>
                <div>
                  <Text type="secondary">三角面数预算: </Text>
                  <Text strong>{meshStats.tris} / 3000 Tris</Text>
                </div>
                <div>
                  <Text type="secondary">顶点数预算: </Text>
                  <Text strong>{meshStats.verts} / 2000 Verts</Text>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
