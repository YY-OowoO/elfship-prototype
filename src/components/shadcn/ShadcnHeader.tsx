import React from "react";
import {
  PanelLeftClose,
  PanelLeft,
  Search,
  Calendar,
  Download,
  FileText,
} from "lucide-react";
import { Select, Tooltip } from "antd";
import type { LaunchBatch, PersonId, PreviewMode } from "../../types";
import { PEOPLE, TODAY } from "../../mock";
import { formatDay, launchRemain } from "../../logic";
import { PreviewModeSwitcher } from "../layout/PreviewModeSwitcher";
import type { ShadcnView } from "./ShadcnAppSidebar";

interface ShadcnHeaderProps {
  batches: LaunchBatch[];
  activeBatch: LaunchBatch;
  onSelectBatch: (id: string) => void;
  currentView: ShadcnView;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  actor: PersonId;
  onSelectActor: (actor: PersonId) => void;
  previewMode: PreviewMode;
  onTogglePreviewMode: (mode: PreviewMode) => void;
  onOpenShiftModal: () => void;
  onExportCsv: () => void;
  onGenerateReport?: () => void;
  onOpenSearch: () => void;
}

const VIEW_TITLES: Record<ShadcnView, string> = {
  dashboard: "综合仪表盘",
  pipeline: "7 节点流水线",
  ledger: "全量资产台账",
  radar: "风险雷达与排期推演",
  schedule: "批次排期基线",
  standards: "7 节点 SOP 规范",
  audit: "流转审计日志",
};

export const ShadcnHeader: React.FC<ShadcnHeaderProps> = ({
  batches,
  activeBatch,
  onSelectBatch,
  currentView,
  sidebarCollapsed,
  onToggleSidebar,
  actor,
  onSelectActor,
  previewMode,
  onTogglePreviewMode,
  onOpenShiftModal,
  onExportCsv,
  onGenerateReport,
  onOpenSearch,
}) => {
  const remainText = launchRemain(activeBatch.launchDate);
  const currentViewTitle = VIEW_TITLES[currentView] || VIEW_TITLES.dashboard;

  return (
    <header className="shadcn-header">
      {/* Left: Breadcrumbs & Collapse Toggle */}
      <div className="shadcn-header-left">
        <button
          type="button"
          className="shadcn-collapse-btn"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
          title={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
        >
          {sidebarCollapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
        </button>

        <nav className="shadcn-breadcrumb" aria-label="面包屑导航">
          <span>ElfShip Pro</span>
          <span>/</span>
          <span className="shadcn-breadcrumb-current">{currentViewTitle}</span>
        </nav>

        {/* Milestone Indicator */}
        <Tooltip title={`上线日: ${activeBatch.launchDate} (基准日: ${TODAY}) · 点击推演排期`}>
          <button
            type="button"
            className="shadcn-badge shadcn-badge-info"
            style={{ cursor: "pointer", border: "1px solid rgba(59, 130, 246, 0.3)" }}
            onClick={onOpenShiftModal}
          >
            <Calendar size={12} />
            <span>上线日 {formatDay(activeBatch.launchDate)} ({remainText})</span>
          </button>
        </Tooltip>

        {/* Unified 3-Mode Preview Switcher */}
        {onTogglePreviewMode && previewMode && (
          <PreviewModeSwitcher
            previewMode={previewMode}
            onTogglePreviewMode={onTogglePreviewMode}
            style={{ marginLeft: 6 }}
          />
        )}
      </div>

      {/* Center: Global Search Trigger (⌘K) */}
      <div className="shadcn-header-center">
        <button
          type="button"
          className="shadcn-search-trigger"
          onClick={onOpenSearch}
          title="快速定位资产、主责人或流水线 (Cmd+K)"
        >
          <Search size={14} />
          <span>快速检索资产 / 主责 / 门禁...</span>
          <kbd className="shadcn-search-kbd">⌘K</kbd>
        </button>
      </div>

      {/* Right: Controls & Selectors */}
      <div className="shadcn-header-right">
        {/* Batch Selector */}
        <Select
          value={activeBatch.id}
          onChange={onSelectBatch}
          style={{ width: 145 }}
          size="small"
          options={batches.map((b) => ({
            label: `${b.name} (${formatDay(b.launchDate)})`,
            value: b.id,
          }))}
        />

        {/* Role Selector */}
        <Select
          value={actor}
          onChange={onSelectActor}
          style={{ width: 130 }}
          size="small"
          options={Object.values(PEOPLE).map((p) => ({
            label: `${p.name} · ${p.title}`,
            value: p.id,
          }))}
        />

        {/* Shift Date */}
        <Tooltip title="排期推演与上线日调整">
          <button
            type="button"
            className="shadcn-icon-btn"
            onClick={onOpenShiftModal}
            aria-label="调整上线日"
          >
            <Calendar size={15} />
          </button>
        </Tooltip>

        {/* Export CSV */}
        <Tooltip title="导出资产交付台账 CSV">
          <button
            type="button"
            className="shadcn-icon-btn"
            onClick={onExportCsv}
            aria-label="导出资产清单"
          >
            <Download size={15} />
          </button>
        </Tooltip>

        {/* Generate Markdown Report */}
        {onGenerateReport ? (
          <Tooltip title="一键生成 SOP 交付日报 Markdown 富文本到剪贴板">
            <button
              type="button"
              className="shadcn-icon-btn"
              onClick={onGenerateReport}
              aria-label="生成交付日报"
            >
              <FileText size={15} />
            </button>
          </Tooltip>
        ) : null}
      </div>
    </header>
  );
};
