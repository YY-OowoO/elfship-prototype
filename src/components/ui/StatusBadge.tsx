import React from "react";
import type { Light, WorkState } from "../../types";

export type BadgeTone =
  | "ok"
  | "wip"
  | "wfa"
  | "retake"
  | "todo"
  | "lock"
  | "wait"
  | "skip"
  | "yellow"
  | "red"
  | "default";

interface StatusBadgeProps {
  state?: WorkState;
  light?: Light;
  label?: string;
  tone?: BadgeTone;
  size?: "sm" | "md" | "lg";
  dot?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  state,
  light,
  label,
  tone,
  size = "md",
  dot = true,
  className = "",
  style,
}) => {
  let resolvedTone: BadgeTone = tone || "default";
  let resolvedLabel = label;

  if (state) {
    switch (state) {
      case "confirmed":
        resolvedTone = "ok";
        resolvedLabel = resolvedLabel || "已放行";
        break;
      case "in_progress":
        resolvedTone = "wip";
        resolvedLabel = resolvedLabel || "进行中";
        break;
      case "submitted":
        resolvedTone = "wfa";
        resolvedLabel = resolvedLabel || "待确认";
        break;
      case "rejected":
        resolvedTone = "retake";
        resolvedLabel = resolvedLabel || "已退回";
        break;
      case "rework":
        resolvedTone = "retake";
        resolvedLabel = resolvedLabel || "返修中";
        break;
      case "skipped":
        resolvedTone = "skip";
        resolvedLabel = resolvedLabel || "不适用";
        break;
      case "not_started":
      default:
        resolvedTone = "todo";
        resolvedLabel = resolvedLabel || "未开始";
        break;
    }
  }

  if (light) {
    if (light === "red") {
      resolvedTone = "red";
      resolvedLabel = resolvedLabel || "严重逾期";
    } else if (light === "yellow") {
      resolvedTone = "yellow";
      resolvedLabel = resolvedLabel || "临期预警";
    } else if (light === "ok") {
      resolvedTone = "ok";
      resolvedLabel = resolvedLabel || "正常";
    }
  }

  return (
    <span
      className={`status-badge tone-${resolvedTone} size-${size} ${className}`}
      style={style}
    >
      {dot && <span className="status-badge-dot" />}
      <span className="status-badge-text">{resolvedLabel}</span>
    </span>
  );
};
