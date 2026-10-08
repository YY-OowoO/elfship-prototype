import React from "react";
import { Popover, Tooltip, Input, Select, message } from "antd";
import {
  MagnifyingGlass,
  CalendarBlank,
  ShareNetwork,
  Clock,
  WarningCircle,
  CheckCircle,
  Copy,
  RocketLaunch,
} from "@phosphor-icons/react";
import type { LaunchBatch, PreviewMode, View } from "../../types";
import { TODAY, SCENARIO_PRESETS, type ScenarioPresetKey } from "../../mock";
import { formatDay, launchRemain, workdaysBetween } from "../../logic";
import { PreviewModeSwitcher } from "./PreviewModeSwitcher";

interface AppHeaderProps {
  batches: LaunchBatch[];
  activeBatch: LaunchBatch;
  onSelectBatch: (batchId: string) => void;
  currentView: View;
  onOpenCommandMenu: () => void;
  onOpenShiftModal: () => void;
  quickFilter: "all" | "risk" | "mine";
  onChangeQuickFilter: (filter: "all" | "risk" | "mine") => void;
  riskCount: number;
  myTasksCount: number;
  shareUrl: string;
  previewMode?: PreviewMode;
  onTogglePreviewMode?: (mode: PreviewMode) => void;
  currentScenario?: ScenarioPresetKey;
  onSelectScenario?: (key: ScenarioPresetKey) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  batches,
  activeBatch,
  onSelectBatch,
  currentView,
  onOpenCommandMenu,
  onOpenShiftModal,
  quickFilter,
  onChangeQuickFilter,
  riskCount,
  myTasksCount,
  shareUrl,
  previewMode = "companion",
  onTogglePreviewMode,
  currentScenario = "baseline",
  onSelectScenario,
}) => {
  const remainDays = workdaysBetween(TODAY, activeBatch.launchDate);
  const remainText = launchRemain(activeBatch.launchDate);
  const isUrgent = remainDays <= 7 && remainDays >= 0;

  const viewTitles: Record<View, { title: string; desc: string }> = {
    board: { title: "交付主看板", desc: "7 大节点泳道与全景流转" },
    resources: { title: "资产全量台账", desc: "资源生命周期与交付证据" },
    analytics: { title: "风险驾驶舱", desc: "实时预警与瓶颈分析" },
    mine: { title: "我的待办与审核", desc: "主责事项与门禁确认" },
    list: { title: "工作项列表", desc: "平铺表格视图" },
    portal: { title: "平台交付白皮书", desc: "SOP理念与快速上手" },
    templates: { title: "7 节点标准模板", desc: "各资源类型 SOP 定义" },
  };

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(shareUrl);
      message.success("看板分享链接已复制到剪贴板");
    } catch {
      message.error("复制失败，请手动复制链接");
    }
  };

  return (
    <header className="elf-header">
      {/* 左侧：当前批次选择与面包屑 */}
      <div className="header-left">
        <Select
          value={activeBatch.id}
          onChange={onSelectBatch}
          style={{ width: 165 }}
          size="middle"
          prefix={<RocketLaunch size={15} weight="duotone" style={{ color: "#3b82f6", marginRight: 4 }} />}
          options={batches.map((b) => ({
            label: `${b.name} (${formatDay(b.launchDate)})`,
            value: b.id,
          }))}
        />

        {/* 倒计时徽章 */}
        <Tooltip title={`批次基准上线日: ${activeBatch.launchDate} (基准日: ${TODAY})`}>
          <button
            type="button"
            className={`header-remain-badge ${
              remainDays < 0 ? "overdue" : isUrgent ? "urgent" : "normal"
            }`}
            onClick={onOpenShiftModal}
            aria-label={`剩余 ${remainText}，打开排期推演`}
          >
            <Clock size={13} weight="bold" />
            <span>{remainText}</span>
            <span className="header-badge-action-hint">排期推演</span>
          </button>
        </Tooltip>

        {/* 面包屑 */}
        <div className="header-breadcrumb">
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{viewTitles[currentView]?.title}</span>
        </div>

        {/* 方案一 / 方案二 / 方案三 预览切换器 */}
        {onTogglePreviewMode && previewMode && (
          <PreviewModeSwitcher
            previewMode={previewMode}
            onTogglePreviewMode={onTogglePreviewMode}
          />
        )}

        {/* 评审演示场景预设下拉框 */}
        {onSelectScenario && (
          <div className="header-scenario-selector" style={{ marginLeft: 8 }}>
            <Tooltip title="快速置入典型评审场景（红灯故障隔离、门禁拦截、退回返工闭环、全绿灯）">
              <Select
                size="small"
                value={currentScenario}
                onChange={onSelectScenario}
                style={{ width: 170 }}
                options={SCENARIO_PRESETS.map((s) => ({
                  value: s.key,
                  label: (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background:
                            s.badgeColor === "volcano"
                              ? "#f97316"
                              : s.badgeColor === "green"
                              ? "#10b981"
                              : s.badgeColor === "magenta"
                              ? "#ec4899"
                              : s.badgeColor === "orange"
                              ? "#f59e0b"
                              : "#3b82f6",
                          boxShadow: "0 0 4px rgba(0,0,0,0.15)",
                        }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 500 }}>{s.badge}</span>
                    </div>
                  ),
                }))}
              />
            </Tooltip>
          </div>
        )}
      </div>

      {/* 中间：全局搜索栏入口 */}
      <div className="header-center">
          <button
            type="button"
            className="header-search-trigger"
            onClick={onOpenCommandMenu}
            title="快速定位资源、主责人或快捷动作 (Cmd+K / Ctrl+K)"
            aria-label="打开全局命令菜单（Cmd+K / Ctrl+K）"
          >
          <MagnifyingGlass size={15} className="header-search-icon" />
          <span className="header-search-placeholder">
            快速搜索...
          </span>
          <kbd className="header-search-kbd">⌘K</kbd>
        </button>
      </div>

      {/* 右侧：快速过滤与快捷动作 */}
      <div className="header-right">
        {/* 快速过滤分段按钮 */}
        <div className="header-filter-pills">
          <button
            type="button"
            className={`filter-pill ${quickFilter === "all" ? "active" : ""}`}
            onClick={() => onChangeQuickFilter("all")}
            aria-pressed={quickFilter === "all"}
            aria-label="查看全部项目"
          >
            全部
          </button>
          <button
            type="button"
            className={`filter-pill ${quickFilter === "risk" ? "active" : ""}`}
            onClick={() => onChangeQuickFilter("risk")}
            aria-pressed={quickFilter === "risk"}
            aria-label={`仅看风险项目，当前${riskCount}项`}
          >
            <WarningCircle size={13} weight="fill" className="text-amber-500" />
            <span>仅看风险</span>
            {riskCount > 0 && <span className="filter-pill-badge danger">{riskCount}</span>}
          </button>
          <button
            type="button"
            className={`filter-pill ${quickFilter === "mine" ? "active" : ""}`}
            onClick={() => onChangeQuickFilter("mine")}
            aria-pressed={quickFilter === "mine"}
            aria-label={`仅看我的主责与待审，当前${myTasksCount}项`}
          >
            <CheckCircle size={13} weight="fill" className="text-blue-500" />
            <span>我的主责/待审</span>
            {myTasksCount > 0 && <span className="filter-pill-badge info">{myTasksCount}</span>}
          </button>
        </div>

        {/* 顺延推演按钮 */}
        <Tooltip title="调整批次上线日，推演下游节点随动影响">
          <button
            type="button"
            className="header-action-btn"
            onClick={onOpenShiftModal}
            aria-label="打开排期顺延推演"
          >
            <CalendarBlank size={15} />
            <span>排期推演</span>
          </button>
        </Tooltip>

        {/* 分享链接 Popover */}
        <Popover
          placement="bottomRight"
          trigger="click"
          content={
            <div className="header-share-popover">
              <div className="share-popover-title">分享当前交付看板</div>
              <div className="share-popover-desc">
                链接已携带批次、筛选与当前视图状态，跨部门沟通可直接定点协作。
              </div>
              <div className="share-popover-input-wrap">
                <Input size="small" value={shareUrl} readOnly />
                <button type="button" className="share-copy-btn" onClick={handleCopyLink}>
                  <Copy size={14} /> 复制
                </button>
              </div>
            </div>
          }
        >
          <button
            type="button"
            className="header-icon-btn"
            title="分享看板"
            aria-label="复制看板分享链接"
          >
            <ShareNetwork size={16} />
          </button>
        </Popover>
      </div>
    </header>
  );
};
