import React from "react";
import type { PreviewMode } from "../../types";

interface PreviewModeSwitcherProps {
  previewMode: PreviewMode;
  onTogglePreviewMode: (mode: PreviewMode) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const PreviewModeSwitcher: React.FC<PreviewModeSwitcherProps> = ({
  previewMode,
  onTogglePreviewMode,
  className = "",
  style,
}) => {
  return (
    <div
      className={`unified-preview-switcher ${className}`}
      style={style}
      role="group"
      aria-label="原型方案切换"
    >
      <button
        type="button"
        className={`unified-preview-btn ${previewMode === "companion" ? "is-active" : ""}`}
        onClick={() => onTogglePreviewMode("companion")}
        aria-pressed={previewMode === "companion"}
        disabled={previewMode === "companion"}
        title="方案一：灵动伴侣体验版（轻量任务流协同与伴随微球）"
      >
        伴侣
      </button>
      <button
        type="button"
        className={`unified-preview-btn ${previewMode === "classic" ? "is-active" : ""}`}
        onClick={() => onTogglePreviewMode("classic")}
        aria-pressed={previewMode === "classic"}
        disabled={previewMode === "classic"}
        title="方案二：经典工程管控台（标准看板与多维报表）"
      >
        经典
      </button>
      <button
        type="button"
        className={`unified-preview-btn ${previewMode === "enterprise" ? "is-active" : ""}`}
        onClick={() => onTogglePreviewMode("enterprise")}
        aria-pressed={previewMode === "enterprise"}
        disabled={previewMode === "enterprise"}
        title="方案三：企业级数字化大盘（全链路态势与安灯作战室）"
      >
        大屏
      </button>
    </div>
  );
};
