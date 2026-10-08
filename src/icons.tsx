import {
  Cube,
  Palette,
  PersonSimpleRun,
  Sparkle,
  Waveform,
  Scroll,
  Layout,
  Package,
  LockKey,
  WarningOctagon,
  HourglassMedium,
  CheckCircle,
  ArrowCounterClockwise,
  FileMagnifyingGlass,
  PlayCircle,
  Lightning,
  BellRinging,
  Brain,
  FastForward,
  DownloadSimple,
  MagnifyingGlass,
  CalendarBlank,
  RocketLaunch,
  Kanban,
  Hammer,
  CloudArrowUp,
  ShieldCheck,
  CheckSquareOffset,
  Archive,
  FlagBanner,
  UserCircle,
  Eye,
  Rows,
  SquaresFour,
  SlidersHorizontal,
  Folder,
  ArrowRight,
  ArrowsClockwise,
  Play,
  Pause,
  ArrowsOut,
  Crosshair,
  GridFour,
  CircleHalf,
  Drop,
  Broadcast,
  WarningCircle,
  Info,
  Copy,
  SpeakerHigh,
  SpeakerSimpleSlash,
  Clock,
  type IconProps,
} from "@phosphor-icons/react";
import type { CSSProperties, ReactNode } from "react";
import type { StageKey, WorkItem } from "./types";
import { itemLight } from "./logic";

export interface AssetTypeMeta {
  label: string;
  family: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: ReactNode;
}

export function getAssetTypeMeta(rawType: string, size = 15): AssetTypeMeta {
  const type = rawType.trim();

  if (type.includes("3D") || type.includes("模型") || type.includes("道具")) {
    return {
      label: type,
      family: "3D",
      color: "#0284c7",
      bgColor: "rgba(2, 132, 199, 0.08)",
      borderColor: "rgba(2, 132, 199, 0.25)",
      icon: <Cube size={size} weight="duotone" color="#0284c7" />,
    };
  }
  if (type.includes("2D") || type.includes("原画") || type.includes("立绘")) {
    return {
      label: type,
      family: "原画",
      color: "#7c3aed",
      bgColor: "rgba(124, 58, 237, 0.08)",
      borderColor: "rgba(124, 58, 237, 0.25)",
      icon: <Palette size={size} weight="duotone" color="#7c3aed" />,
    };
  }
  if (type.includes("动作") || type.includes("骨骼") || type.includes("动画")) {
    return {
      label: type,
      family: "动作",
      color: "#059669",
      bgColor: "rgba(5, 150, 105, 0.08)",
      borderColor: "rgba(5, 150, 105, 0.25)",
      icon: <PersonSimpleRun size={size} weight="duotone" color="#059669" />,
    };
  }
  if (type.includes("特效") || type.includes("VFX") || type.includes("粒子")) {
    return {
      label: type,
      family: "特效",
      color: "#ea580c",
      bgColor: "rgba(234, 88, 12, 0.08)",
      borderColor: "rgba(234, 88, 12, 0.25)",
      icon: <Sparkle size={size} weight="duotone" color="#ea580c" />,
    };
  }
  if (type.includes("音频") || type.includes("音效") || type.includes("BGM") || type.includes("配音")) {
    return {
      label: type,
      family: "音频",
      color: "#db2777",
      bgColor: "rgba(219, 39, 119, 0.08)",
      borderColor: "rgba(219, 39, 119, 0.25)",
      icon: <Waveform size={size} weight="duotone" color="#db2777" />,
    };
  }
  if (type.includes("文案") || type.includes("剧本") || type.includes("设定") || type.includes("家园")) {
    return {
      label: type,
      family: "文案",
      color: "#d97706",
      bgColor: "rgba(217, 119, 6, 0.08)",
      borderColor: "rgba(217, 119, 6, 0.25)",
      icon: <Scroll size={size} weight="duotone" color="#d97706" />,
    };
  }
  if (type.includes("UI") || type.includes("界面") || type.includes("图标")) {
    return {
      label: type,
      family: "UI",
      color: "#2563eb",
      bgColor: "rgba(37, 99, 235, 0.08)",
      borderColor: "rgba(37, 99, 235, 0.25)",
      icon: <Layout size={size} weight="duotone" color="#2563eb" />,
    };
  }

  return {
    label: type,
    family: "通用",
    color: "#475569",
    bgColor: "rgba(71, 85, 105, 0.08)",
    borderColor: "rgba(71, 85, 105, 0.25)",
    icon: <Package size={size} weight="duotone" color="#475569" />,
  };
}

export function AssetTypeBadge({
  type,
  size = 14,
  showLabel = true,
  className = "",
  style,
}: {
  type: string;
  size?: number;
  showLabel?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const meta = getAssetTypeMeta(type, size);
  return (
    <span
      className={`asset-type-badge ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: showLabel ? "1px 6px" : "3px",
        borderRadius: "5px",
        background: meta.bgColor,
        border: `1px solid ${meta.borderColor}`,
        color: meta.color,
        fontSize: "0.78rem",
        fontWeight: 600,
        lineHeight: 1.3,
        userSelect: "none",
        verticalAlign: "middle",
        ...style,
      }}
      title={`资源类型：${type}`}
    >
      {meta.icon}
      {showLabel ? <span>{meta.label}</span> : null}
    </span>
  );
}

export function StageIcon({
  stage,
  size = 16,
  weight = "duotone",
  color,
}: {
  stage: StageKey;
  size?: number;
  weight?: IconProps["weight"];
  color?: string;
}) {
  switch (stage) {
    case "launch":
      return <CalendarBlank size={size} weight={weight} color={color ?? "#2563eb"} />;
    case "schedule":
      return <Kanban size={size} weight={weight} color={color ?? "#0284c7"} />;
    case "produce":
      return <Hammer size={size} weight={weight} color={color ?? "#7c3aed"} />;
    case "upload":
      return <CloudArrowUp size={size} weight={weight} color={color ?? "#059669"} />;
    case "review":
      return <ShieldCheck size={size} weight={weight} color={color ?? "#ea580c"} />;
    case "accept":
      return <CheckSquareOffset size={size} weight={weight} color={color ?? "#16a34a"} />;
    case "checkin":
      return <FlagBanner size={size} weight={weight} color={color ?? "#0d9488"} />;
    default:
      return <Package size={size} weight={weight} color={color} />;
  }
}

export function ItemStatusIcon({
  item,
  extra,
  size = 14,
}: {
  item: WorkItem;
  extra?: string;
  size?: number;
}) {
  const light = itemLight(item);

  if (extra === "锁下游" || item.locked) {
    return <LockKey size={size} weight="duotone" color="#d97706" />;
  }
  if (light === "red") {
    return <WarningOctagon size={size} weight="duotone" color="#ef4444" />;
  }
  if (light === "yellow") {
    return <HourglassMedium size={size} weight="duotone" color="#f59e0b" />;
  }
  if (item.state === "confirmed") {
    return <CheckCircle size={size} weight="duotone" color="#16a34a" />;
  }
  if (item.state === "submitted") {
    return <FileMagnifyingGlass size={size} weight="duotone" color="#2563eb" />;
  }
  if (item.state === "rejected" || item.state === "rework") {
    return <ArrowCounterClockwise size={size} weight="duotone" color="#ea580c" />;
  }
  if (item.state === "in_progress") {
    return <Lightning size={size} weight="duotone" color="#2563eb" />;
  }
  return null;
}

export {
  Cube,
  Palette,
  PersonSimpleRun,
  Sparkle,
  Waveform,
  Scroll,
  Layout,
  Package,
  LockKey,
  WarningOctagon,
  HourglassMedium,
  CheckCircle,
  ArrowCounterClockwise,
  FileMagnifyingGlass,
  PlayCircle,
  Lightning,
  BellRinging,
  Brain,
  FastForward,
  DownloadSimple,
  MagnifyingGlass,
  CalendarBlank,
  RocketLaunch,
  Kanban,
  Hammer,
  CloudArrowUp,
  ShieldCheck,
  CheckSquareOffset,
  Archive,
  FlagBanner,
  UserCircle,
  Eye,
  Rows,
  SquaresFour,
  SlidersHorizontal,
  Folder,
  ArrowRight,
  ArrowsClockwise,
  Play,
  Pause,
  ArrowsOut,
  Crosshair,
  GridFour,
  CircleHalf,
  Drop,
  Broadcast,
  WarningCircle,
  Info,
  Copy,
  SpeakerHigh,
  SpeakerSimpleSlash,
  Clock,
};
