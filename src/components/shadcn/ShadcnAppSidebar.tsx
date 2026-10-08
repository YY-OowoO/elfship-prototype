import React from "react";
import {
  LayoutDashboard,
  Kanban,
  Table2,
  ShieldAlert,
  CalendarRange,
  FileCode2,
  History,
  Sparkles,
} from "lucide-react";
import { Tooltip } from "antd";
import type { PersonId } from "../../types";
import { PEOPLE } from "../../mock";
import { EmotionBall, dispatchElfEvent } from "../../emotion-ball";

export type ShadcnView = "dashboard" | "pipeline" | "ledger" | "radar" | "schedule" | "standards" | "audit";

interface ShadcnAppSidebarProps {
  currentView: ShadcnView;
  onSelectView: (view: ShadcnView) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  actor: PersonId;
  riskCount: number;
  myTaskCount: number;
}

export const ShadcnAppSidebar: React.FC<ShadcnAppSidebarProps> = ({
  currentView,
  onSelectView,
  collapsed,
  actor,
  riskCount,
  myTaskCount,
}) => {
  const currentPerson = PEOPLE[actor] || Object.values(PEOPLE)[0];
  const ballEmotion = riskCount > 0 ? (riskCount >= 3 ? "34" : "11") : "02";

  const renderNavItem = (
    viewKey: ShadcnView,
    icon: React.ReactNode,
    label: string,
    badge?: { count: number; danger?: boolean },
  ) => {
    const isActive = currentView === viewKey;
    const buttonElement = (
      <button
        type="button"
        className={`shadcn-nav-item ${isActive ? "active" : ""}`}
        onClick={() => onSelectView(viewKey)}
      >
        <span className="shadcn-nav-icon">{icon}</span>
        {!collapsed && <span className="shadcn-nav-label">{label}</span>}
        {!collapsed && badge && badge.count > 0 && (
          <span className={`shadcn-nav-item-badge ${badge.danger ? "danger" : ""}`}>
            {badge.count}
          </span>
        )}
      </button>
    );

    if (collapsed) {
      return (
        <Tooltip placement="right" title={`${label}${badge && badge.count > 0 ? ` (${badge.count})` : ""}`}>
          {buttonElement}
        </Tooltip>
      );
    }
    return buttonElement;
  };

  return (
    <aside className={`shadcn-sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Brand Header with subtle micro EmotionBall */}
      <div className="shadcn-sidebar-header">
        <div className="shadcn-brand">
          <Tooltip title="灵动精灵内核 · 实时交付感知 (点击互动)">
            <div
              className="shadcn-brand-icon"
              style={{
                background: "transparent",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                padding: 0,
              }}
              onClick={() => dispatchElfEvent("diagnosis_requested")}
            >
              <EmotionBall
                emotion={ballEmotion}
                size={26}
                lite={true}
                interactive={true}
                label="ElfCore"
              />
            </div>
          </Tooltip>
          {!collapsed && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontWeight: 700, letterSpacing: "-0.02em" }}>ElfShip Pro</span>
              <span className="shadcn-brand-version">v2.4</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="shadcn-sidebar-content">
        {/* OVERVIEW GROUP */}
        <div className="shadcn-nav-group">
          {!collapsed && <div className="shadcn-nav-group-title">Overview</div>}
          <div className="shadcn-nav-list">
            {renderNavItem("dashboard", <LayoutDashboard size={16} strokeWidth={1.8} />, "综合仪表盘")}
            {renderNavItem("pipeline", <Kanban size={16} strokeWidth={1.8} />, "7 节点流水线", {
              count: myTaskCount,
            })}
            {renderNavItem("ledger", <Table2 size={16} strokeWidth={1.8} />, "全量资产台账")}
            {renderNavItem("radar", <ShieldAlert size={16} strokeWidth={1.8} />, "风险雷达与推演", {
              count: riskCount,
              danger: true,
            })}
          </div>
        </div>

        {/* MANAGEMENT GROUP */}
        <div className="shadcn-nav-group">
          {!collapsed && <div className="shadcn-nav-group-title">Management</div>}
          <div className="shadcn-nav-list">
            {renderNavItem("schedule", <CalendarRange size={16} strokeWidth={1.8} />, "批次排期与基线")}
            {renderNavItem("standards", <FileCode2 size={16} strokeWidth={1.8} />, "7 节点 SOP 规范")}
          </div>
        </div>

        {/* SYSTEM GROUP */}
        <div className="shadcn-nav-group" style={{ marginTop: "auto" }}>
          {!collapsed && <div className="shadcn-nav-group-title">System</div>}
          <div className="shadcn-nav-list">
            {renderNavItem("audit", <History size={16} strokeWidth={1.8} />, "流转审计日志")}
          </div>
        </div>
      </div>

      {/* User Footer Profile & Micro AI Companion status */}
      <div className="shadcn-sidebar-footer">
        <div className="shadcn-user-tile">
          <div className="shadcn-user-avatar">
            {currentPerson.name.slice(0, 1)}
          </div>
          {!collapsed && (
            <div className="shadcn-user-info">
              <span className="shadcn-user-name">{currentPerson.name}</span>
              <span className="shadcn-user-role">{currentPerson.title}</span>
            </div>
          )}
          {!collapsed && (
            <Tooltip title="AI 伴随助手运行中">
              <span style={{ marginLeft: "auto", display: "inline-flex", color: "#10b981", fontSize: 11, alignItems: "center", gap: 3 }}>
                <Sparkles size={12} />
              </span>
            </Tooltip>
          )}
        </div>
      </div>
    </aside>
  );
};
