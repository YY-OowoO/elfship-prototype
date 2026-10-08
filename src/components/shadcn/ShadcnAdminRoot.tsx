import React, { useState, useMemo } from "react";
import {
  Calendar,
  History,
  FileCode2,
} from "lucide-react";
import type { LaunchBatch, PersonId, PreviewMode, ResourceLane, WorkItem } from "../../types";
import { PEOPLE, STAGES } from "../../mock";
import {
  batchLights,
  formatDay,
  launchRemain,
} from "../../logic";
import { ShadcnAppSidebar, type ShadcnView } from "./ShadcnAppSidebar";
import { ShadcnHeader } from "./ShadcnHeader";
import { ShadcnDashboardOverview } from "./ShadcnDashboardOverview";
import { ShadcnFlowPipeline } from "./ShadcnFlowPipeline";
import { ShadcnDataTable } from "./ShadcnDataTable";
import { ShadcnRiskRadar } from "./ShadcnRiskRadar";
import "./shadcn.css";

interface ShadcnAdminRootProps {
  batches: LaunchBatch[];
  activeBatch: LaunchBatch;
  onSelectBatch: (id: string) => void;
  actor: PersonId;
  onSelectActor: (actor: PersonId) => void;
  previewMode: PreviewMode;
  onTogglePreviewMode: (mode: PreviewMode) => void;
  onOpenItem: (id: string) => void;
  onOpenShiftModal: () => void;
  onNudgeItem: (item: WorkItem, lane: ResourceLane) => void;
  onExportCsv: () => void;
  onGenerateReport?: () => void;
  onOpenSearch: () => void;
}

export const ShadcnAdminRoot: React.FC<ShadcnAdminRootProps> = ({
  batches,
  activeBatch,
  onSelectBatch,
  actor,
  onSelectActor,
  previewMode,
  onTogglePreviewMode,
  onOpenItem,
  onOpenShiftModal,
  onNudgeItem,
  onExportCsv,
  onGenerateReport,
  onOpenSearch,
}) => {
  const [currentView, setCurrentView] = useState<ShadcnView>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const lights = useMemo(() => batchLights(activeBatch), [activeBatch]);
  const totalRiskCount = lights.red + lights.yellow;

  // Compute my tasks count
  const myTaskCount = useMemo(() => {
    return activeBatch.lanes.flatMap((l) => l.items).filter(
      (it) => !it.skipped && it.state !== "confirmed" && (it.driId === actor || it.confirmerId === actor),
    ).length;
  }, [activeBatch.lanes, actor]);

  return (
    <div className="shadcn-root" data-shadcn-theme="light">
      {/* Collapsible Shadcn Sidebar */}
      <ShadcnAppSidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        actor={actor}
        riskCount={totalRiskCount}
        myTaskCount={myTaskCount}
      />

      {/* Main Container */}
      <div className="shadcn-main-wrap">
        {/* Header Bar */}
        <ShadcnHeader
          batches={batches}
          activeBatch={activeBatch}
          onSelectBatch={onSelectBatch}
          currentView={currentView}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
          actor={actor}
          onSelectActor={onSelectActor}
          previewMode={previewMode}
          onTogglePreviewMode={onTogglePreviewMode}
          onOpenShiftModal={onOpenShiftModal}
          onExportCsv={onExportCsv}
          onGenerateReport={onGenerateReport}
          onOpenSearch={onOpenSearch}
        />

        {/* Dynamic Page Views */}
        <main className="shadcn-page-content">
          {currentView === "dashboard" && (
            <ShadcnDashboardOverview
              batch={activeBatch}
              actor={actor}
              onOpenItem={onOpenItem}
              onNudgeItem={onNudgeItem}
              onNavigateToPipeline={() => setCurrentView("pipeline")}
              onNavigateToLedger={() => setCurrentView("ledger")}
            />
          )}

          {currentView === "pipeline" && (
            <ShadcnFlowPipeline
              batch={activeBatch}
              actor={actor}
              onOpenItem={onOpenItem}
            />
          )}

          {currentView === "ledger" && (
            <ShadcnDataTable
              batch={activeBatch}
              onOpenItem={onOpenItem}
              onNudgeItem={onNudgeItem}
            />
          )}

          {currentView === "radar" && (
            <ShadcnRiskRadar
              batch={activeBatch}
              onOpenItem={onOpenItem}
              onOpenShiftModal={onOpenShiftModal}
            />
          )}

          {currentView === "schedule" && (
            <div className="shadcn-card">
              <div className="shadcn-card-header">
                <div className="shadcn-card-title">
                  <Calendar size={16} />
                  <span>批次排期与基线日程 ({activeBatch.name})</span>
                </div>
                <button
                  type="button"
                  className="shadcn-badge shadcn-badge-info"
                  style={{ cursor: "pointer" }}
                  onClick={onOpenShiftModal}
                >
                  调整批次上线日
                </button>
              </div>
              <div className="shadcn-card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 13, color: "var(--shadcn-muted-fg)" }}>
                  基准上线日：<strong>{formatDay(activeBatch.launchDate)}</strong> ({launchRemain(activeBatch.launchDate)})。各节点工期采用 T-N 相对工作日倒排推算。
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  {STAGES.map((s, idx) => (
                    <div
                      key={s.key}
                      style={{
                        background: "var(--shadcn-muted)",
                        border: "1px solid var(--shadcn-border)",
                        borderRadius: 8,
                        padding: "12px 14px",
                      }}
                    >
                      <div style={{ fontSize: 11, color: "var(--shadcn-muted-fg)" }}>STAGE 0{idx + 1}</div>
                      <div style={{ fontWeight: 600, fontSize: 14, margin: "4px 0" }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: "var(--shadcn-muted-fg)" }}>{s.short}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentView === "standards" && (
            <div className="shadcn-card">
              <div className="shadcn-card-header">
                <div className="shadcn-card-title">
                  <FileCode2 size={16} />
                  <span>7 节点交付 SOP 标准库规范</span>
                </div>
              </div>
              <div className="shadcn-card-body">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                  {STAGES.map((s) => (
                    <div
                      key={s.key}
                      style={{
                        background: "var(--shadcn-muted)",
                        border: "1px solid var(--shadcn-border)",
                        borderRadius: 8,
                        padding: 16,
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{s.name} ({s.short})</div>
                      <div style={{ fontSize: 12, color: "var(--shadcn-muted-fg)", lineHeight: 1.6 }}>
                        标准门禁检查点、SVN 交付物提报与确认人签署机制。
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentView === "audit" && (
            <div className="shadcn-card">
              <div className="shadcn-card-header">
                <div className="shadcn-card-title">
                  <History size={16} />
                  <span>流水线流转审计与过程日志</span>
                </div>
              </div>
              <div className="shadcn-card-body">
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {activeBatch.lanes.flatMap((l) =>
                    l.items.flatMap((it) =>
                      it.history.map((h) => ({
                        laneName: l.name,
                        stage: it.stage,
                        history: h,
                      })),
                    ),
                  )
                    .slice(0, 15)
                    .map((record, index) => {
                      const actorPerson = PEOPLE[record.history.actorId];
                      return (
                        <div
                          key={index}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "8px 12px",
                            background: "var(--shadcn-muted)",
                            borderRadius: 6,
                            fontSize: 12,
                          }}
                        >
                          <div>
                            <strong>{actorPerson ? actorPerson.name : record.history.actorId}</strong>{" "}
                            <span style={{ color: "var(--shadcn-muted-fg)" }}>{record.history.action}</span>{" "}
                            【{record.laneName}】
                            {record.history.reason && (
                              <span style={{ color: "#ef4444", marginLeft: 6 }}>
                                (原因: {record.history.reason})
                              </span>
                            )}
                          </div>
                          <span style={{ color: "var(--shadcn-muted-fg)", fontSize: 11 }}>
                            {record.history.at}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
