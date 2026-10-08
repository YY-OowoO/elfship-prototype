import React from "react";

export type SidebarBallVariant =
  | "board"
  | "resources"
  | "analytics"
  | "mine"
  | "list"
  | "portal"
  | "templates";

interface SidebarMiniBallProps {
  variant: SidebarBallVariant;
  active?: boolean;
  hasAlert?: boolean;
  size?: number;
}

interface BallConfig {
  gradient: string;
  shadow: string;
  eyeType: "focus" | "scan" | "alert" | "smile" | "sparkle" | "calm" | "matrix";
  glowColor: string;
  name: string;
}

const BALL_CONFIGS: Record<SidebarBallVariant, BallConfig> = {
  board: {
    gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    shadow: "0 2px 6px rgba(37, 99, 235, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
    eyeType: "focus",
    glowColor: "rgba(59, 130, 246, 0.4)",
    name: "看板灵动球",
  },
  resources: {
    gradient: "linear-gradient(135deg, #10b981 0%, #047857 100%)",
    shadow: "0 2px 6px rgba(16, 185, 129, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
    eyeType: "scan",
    glowColor: "rgba(16, 185, 129, 0.4)",
    name: "资产宝箱球",
  },
  analytics: {
    gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    shadow: "0 2px 6px rgba(245, 158, 11, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
    eyeType: "alert",
    glowColor: "rgba(245, 158, 11, 0.4)",
    name: "预警雷达球",
  },
  mine: {
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
    shadow: "0 2px 6px rgba(139, 92, 246, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
    eyeType: "smile",
    glowColor: "rgba(139, 92, 246, 0.4)",
    name: "责任签核球",
  },
  list: {
    gradient: "linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)",
    shadow: "0 2px 6px rgba(6, 182, 212, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
    eyeType: "matrix",
    glowColor: "rgba(6, 182, 212, 0.4)",
    name: "工序矩阵球",
  },
  portal: {
    gradient: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
    shadow: "0 2px 6px rgba(217, 119, 6, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
    eyeType: "sparkle",
    glowColor: "rgba(217, 119, 6, 0.4)",
    name: "智慧白皮书球",
  },
  templates: {
    gradient: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
    shadow: "0 2px 6px rgba(99, 102, 241, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
    eyeType: "calm",
    glowColor: "rgba(99, 102, 241, 0.4)",
    name: "SOP标尺球",
  },
};

export const SidebarMiniBall: React.FC<SidebarMiniBallProps> = ({
  variant,
  active = false,
  hasAlert = false,
  size = 22,
}) => {
  const config = BALL_CONFIGS[variant] || BALL_CONFIGS.board;

  // 如果有严重报警且在驾驶舱或看板，自动转换为警戒红球态
  const isRedAlert = hasAlert && (variant === "analytics" || variant === "board");
  const bgGradient = isRedAlert
    ? "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)"
    : config.gradient;
  const shadow = isRedAlert
    ? "0 2px 8px rgba(239, 68, 68, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.4)"
    : config.shadow;

  return (
    <div
      className={`sidebar-mini-ball ${active ? "is-active" : ""} ${isRedAlert ? "is-alerting" : ""}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bgGradient,
        boxShadow: shadow,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      title={config.name}
    >
      {/* 顶部高光微弧 */}
      <div
        style={{
          position: "absolute",
          top: "12%",
          left: "20%",
          width: "36%",
          height: "24%",
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.55)",
          transform: "rotate(-20deg)",
          filter: "blur(0.4px)",
          pointerEvents: "none",
        }}
      />

      {/* 眼睛渲染 */}
      <svg
        width={size * 0.65}
        height={size * 0.45}
        viewBox="0 0 16 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ zIndex: 2 }}
      >
        {config.eyeType === "focus" && (
          <>
            <circle cx="4.5" cy="5" r="2.2" fill="#ffffff" />
            <circle cx="5" cy="5" r="1.1" fill="#0f172a" />
            <circle cx="11.5" cy="5" r="2.2" fill="#ffffff" />
            <circle cx="12" cy="5" r="1.1" fill="#0f172a" />
          </>
        )}

        {config.eyeType === "scan" && (
          <>
            <ellipse cx="4.5" cy="5" rx="2.5" ry="2" fill="#ffffff" />
            <ellipse cx="4.5" cy="5" rx="1.2" ry="1" fill="#064e3b" />
            <ellipse cx="11.5" cy="5" rx="2.5" ry="2" fill="#ffffff" />
            <ellipse cx="11.5" cy="5" rx="1.2" ry="1" fill="#064e3b" />
          </>
        )}

        {config.eyeType === "alert" && (
          <>
            <circle cx="4.5" cy="5" r={isRedAlert ? "2.6" : "2.2"} fill="#ffffff" />
            <circle cx="4.5" cy="5" r={isRedAlert ? "1.5" : "1.2"} fill="#7f1d1d" />
            <circle cx="11.5" cy="5" r={isRedAlert ? "2.6" : "2.2"} fill="#ffffff" />
            <circle cx="11.5" cy="5" r={isRedAlert ? "1.5" : "1.2"} fill="#7f1d1d" />
          </>
        )}

        {config.eyeType === "smile" && (
          <>
            <circle cx="4.5" cy="5" r="2.3" fill="#ffffff" />
            <circle cx="4.8" cy="4.8" r="1.1" fill="#4c1d95" />
            <circle cx="5.3" cy="4.3" r="0.4" fill="#ffffff" />
            <circle cx="11.5" cy="5" r="2.3" fill="#ffffff" />
            <circle cx="11.8" cy="4.8" r="1.1" fill="#4c1d95" />
            <circle cx="12.3" cy="4.3" r="0.4" fill="#ffffff" />
          </>
        )}

        {config.eyeType === "matrix" && (
          <>
            <rect x="2.5" y="3" width="4" height="4" rx="1" fill="#ffffff" />
            <rect x="3.5" y="4" width="2" height="2" rx="0.5" fill="#164e63" />
            <rect x="9.5" y="3" width="4" height="4" rx="1" fill="#ffffff" />
            <rect x="10.5" y="4" width="2" height="2" rx="0.5" fill="#164e63" />
          </>
        )}

        {config.eyeType === "sparkle" && (
          <>
            <path
              d="M4.5 2.5L5.2 4.3L7 5L5.2 5.7L4.5 7.5L3.8 5.7L2 5L3.8 4.3Z"
              fill="#ffffff"
            />
            <path
              d="M11.5 2.5L12.2 4.3L14 5L12.2 5.7L11.5 7.5L10.8 5.7L9 5L10.8 4.3Z"
              fill="#ffffff"
            />
          </>
        )}

        {config.eyeType === "calm" && (
          <>
            <circle cx="4.5" cy="5" r="1.8" fill="#ffffff" />
            <circle cx="11.5" cy="5" r="1.8" fill="#ffffff" />
          </>
        )}
      </svg>
    </div>
  );
};
