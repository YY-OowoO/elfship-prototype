import React from "react";
import {
  AlertTriangle,
  Calendar,
  FileSpreadsheet,
  Flame,
  Kanban,
  Layers,
  LayoutDashboard,
  Search,
  Users,
} from "lucide-react";
import { Badge, Select, Tooltip } from "antd";
import type { LaunchBatch, PersonId, PreviewMode } from "../../types";
import { PEOPLE } from "../../mock";
import { formatDay } from "../../logic";
import { THEMES } from "../../tokens";
import { EmotionBall } from "../../emotion-ball/EmotionBall";
import type { EnterpriseTab } from "./EnterpriseAdminRoot";

interface EnterpriseSidebarProps {
  activeTab: EnterpriseTab;
  onSelectTab: (tab: EnterpriseTab) => void;
  batches: LaunchBatch[];
  activeBatch: LaunchBatch;
  onSelectBatch: (id: string) => void;
  actor: PersonId;
  onSelectActor: (actor: PersonId) => void;
  previewMode?: PreviewMode;
  onTogglePreviewMode?: (mode: PreviewMode) => void;
  totalRisks: number;
  dhi: number;
  dhiLevel: "good" | "warn" | "danger";
  dhiLabel: string;
  dhiEmotion: string;
  onOpenSearch: () => void;
}

export const EnterpriseSidebar: React.FC<EnterpriseSidebarProps> = ({
  activeTab,
  onSelectTab,
  batches,
  activeBatch,
  onSelectBatch,
  actor,
  onSelectActor,
  totalRisks,
  dhi,
  dhiLevel,
  dhiLabel,
  dhiEmotion,
  onOpenSearch,
}) => {
  const currentTheme = THEMES.light;

  const navItems: Array<{
    key: EnterpriseTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }> = [
    {
      key: "cockpit",
      label: "全景数据大盘",
      icon: <LayoutDashboard size={15} />,
    },
    {
      key: "tasks",
      label: "交付任务中枢",
      icon: <Kanban size={15} />,
    },
    {
      key: "personnel",
      label: "人员与组织负荷",
      icon: <Users size={15} />,
    },
    {
      key: "pipeline",
      label: "7工序流转拓扑",
      icon: <Layers size={15} />,
    },
    {
      key: "gantt",
      label: "时序甘特与关键路径",
      icon: <Calendar size={15} />,
    },
    {
      key: "ledger",
      label: "资产数字化台账",
      icon: <FileSpreadsheet size={15} />,
    },
    {
      key: "warroom",
      label: "安灯故障作战室",
      icon: <Flame size={15} />,
      badge: totalRisks,
    },
  ];

  return (
    <aside className="ent-sidebar">
      {/* 1. Brand & Living Digital Companion AI Core */}
      <div className="ent-sidebar-brand">
        <Tooltip title={`ElfShip AI 数字中枢 · 伴侣态势感知 (DHI ${dhi}分 · ${dhiLabel} · 点击唤起全局搜索)`}>
          <div
            className="ent-brand-logo-wrap"
            onClick={onOpenSearch}
            role="button"
            tabIndex={0}
            style={{ cursor: "pointer" }}
          >
            <EmotionBall
              size={36}
              emotion={dhiEmotion}
              color={currentTheme.ballColor}
              eyeColor={currentTheme.ballEyeColor}
              interactive={true}
              label={`DHI ${dhi}`}
            />
          </div>
        </Tooltip>
        <div className="ent-brand-info" style={{ minWidth: 0, flex: 1 }}>
          <div className="ent-brand-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>ElfShip</span>
            <span className={`ent-brand-badge ${dhiLevel}`} style={{ fontSize: 9, padding: "1px 5px" }}>
              PRO
            </span>
          </div>
          <div
            className="ent-brand-sub"
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 11,
            }}
          >
            企业数字化交付管控
          </div>
        </div>
      </div>

      {/* Living Companion Proactive Delivery Risk Pill */}
      {totalRisks > 0 && (
        <div
          onClick={() => onSelectTab("warroom")}
          style={{
            margin: "0 10px 10px 10px",
            padding: "5px 9px",
            background: "linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            fontSize: 11,
            color: "var(--ent-rose)",
            transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
          className="ent-proactive-alert-pill"
          title="点击直达安灯故障作战室"
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <AlertTriangle size={12} />
            <span style={{ fontWeight: 600 }}>{totalRisks} 项安灯阻塞</span>
          </div>
          <span style={{ fontSize: 10, color: "var(--ent-accent)", fontWeight: 600 }}>下钻处置</span>
        </div>
      )}

      {/* 2. Batch & DRI Role Quick Selectors */}
      <div className="ent-sidebar-batch">
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 10, color: "var(--ent-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            目标批次
          </span>
          <Select
            value={activeBatch.id}
            onChange={onSelectBatch}
            size="small"
            style={{ width: "100%" }}
            popupMatchSelectWidth={false}
            options={batches.map((b) => ({
              label: `${b.name} (${formatDay(b.launchDate)})`,
              value: b.id,
            }))}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{ fontSize: 10, color: "var(--ent-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            当前责任视角 (DRI)
          </span>
          <Select
            value={actor}
            onChange={onSelectActor}
            size="small"
            style={{ width: "100%" }}
            popupMatchSelectWidth={false}
            options={Object.values(PEOPLE).map((p) => ({
              label: `@${p.name} · ${p.title.slice(0, 4)}`,
              value: p.id,
            }))}
          />
        </div>
      </div>

      {/* 3. Vertical Navigation Items */}
      <nav className="ent-sidebar-nav" aria-label="主要导航">
        <div style={{ fontSize: 10, color: "var(--ent-text-muted)", padding: "0 6px 6px", textTransform: "uppercase", letterSpacing: 0.5 }}>
          管控模块
        </div>
        {navItems.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <div
              key={item.key}
              className={`ent-sidebar-nav-item ${isActive ? "active" : ""}`}
              onClick={() => onSelectTab(item.key)}
              role="button"
              tabIndex={0}
            >
              <div className="ent-sidebar-nav-item-icon">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <Badge
                  count={item.badge}
                  size="small"
                  style={{
                    backgroundColor: "var(--ent-rose)",
                    boxShadow: "0 0 8px rgba(239, 68, 68, 0.4)",
                  }}
                />
              )}
            </div>
          );
        })}
      </nav>

      {/* 4. Bottom Utilities: Global Search */}
      <div className="ent-sidebar-footer">
        {/* Quick Search Button (Taste-Skill Button-in-Button Pattern) */}
        <button
          type="button"
          className="ent-sidebar-search-btn"
          onClick={onOpenSearch}
          aria-label="全局快速检索 (Cmd+K)"
        >
          <div className="ent-sidebar-search-content">
            <Search size={13} className="ent-sidebar-search-icon" />
            <span>全局检索</span>
          </div>
          <kbd className="ent-sidebar-search-kbd">⌘K</kbd>
        </button>
      </div>
    </aside>
  );
};
