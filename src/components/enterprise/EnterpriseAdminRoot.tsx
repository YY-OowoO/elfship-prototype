import React, { useState, useMemo, useEffect } from "react";
import { message } from "antd";
import type { LaunchBatch, PersonId, PreviewMode, ResourceLane, WorkItem } from "../../types";
import { PEOPLE, STAGES } from "../../mock";
import { batchLights, formatDay } from "../../logic";
import { EnterpriseSidebar } from "./EnterpriseSidebar";
import { EnterpriseHeader } from "./EnterpriseHeader";
import { EnterpriseCockpitView } from "./EnterpriseCockpitView";
import { EnterpriseTaskCenterView } from "./EnterpriseTaskCenterView";
import { EnterprisePersonnelView } from "./EnterprisePersonnelView";
import { EnterprisePipelineView } from "./EnterprisePipelineView";
import { EnterpriseGanttView } from "./EnterpriseGanttView";
import { EnterpriseLedgerView } from "./EnterpriseLedgerView";
import { EnterpriseWarRoomView } from "./EnterpriseWarRoomView";
import { playSound } from "../../sound";
import "./enterprise.css";

export type EnterpriseTab = "cockpit" | "tasks" | "personnel" | "pipeline" | "gantt" | "ledger" | "warroom";

export interface NavigationContext {
  stage?: string;
  risk?: string;
  dri?: PersonId | "all";
  assetCategory?: string;
  highlightItemId?: string;
  searchKeyword?: string;
}

interface EnterpriseAdminRootProps {
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
  onReassignDri: (itemId: string, newDri: PersonId) => void;
  onBatchReassignDri?: (itemIds: string[], newDri: PersonId) => void;
  onQuickUnblockItem?: (itemId: string, reason?: string) => void;
  onExportCsv: () => void;
  onGenerateReport?: () => void;
  onOpenSearch: () => void;
}

export const EnterpriseAdminRoot: React.FC<EnterpriseAdminRootProps> = ({
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
  onReassignDri,
  onBatchReassignDri,
  onQuickUnblockItem,
  onExportCsv,
  onGenerateReport,
  onOpenSearch,
}) => {
  const [activeTab, setActiveTab] = useState<EnterpriseTab>("cockpit");
  const [navContext, setNavContext] = useState<NavigationContext | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleNavigate = (tab: EnterpriseTab, context?: NavigationContext) => {
    setActiveTab(tab);
    setNavContext(context || null);
    playSound.click();
  };

  const handleClearNavContext = () => {
    setNavContext(null);
  };

  // Sync fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const lights = useMemo(() => batchLights(activeBatch), [activeBatch]);
  const totalRisks = lights.red + lights.yellow;

  // Compute Delivery Health Index (DHI: 0 - 100)
  const totalLanes = activeBatch.lanes.length;
  const dhi = useMemo(() => {
    if (totalLanes === 0) return 100;
    const rawPenalty = lights.red * 18 + lights.yellow * 6;
    return Math.max(12, Math.min(100, 100 - rawPenalty));
  }, [lights, totalLanes]);

  const dhiLevel = dhi >= 85 ? "good" : dhi >= 60 ? "warn" : "danger";
  const dhiLabel = dhi >= 85 ? "态势优良" : dhi >= 60 ? "重点预警" : "严重阻断";
  const dhiEmotion = useMemo(() => {
    if (dhi >= 85) return "02";
    if (dhi >= 60) return "30";
    return "13";
  }, [dhi]);

  // Single person targeted nudge
  const handleNudgePerson = (personId: PersonId) => {
    const person = PEOPLE[personId];
    const assigned = activeBatch.lanes.flatMap((l) =>
      l.items
        .filter((it) => !it.skipped && it.driId === personId && it.state !== "confirmed")
        .map((it) => ({ lane: l, item: it }))
    );

    if (assigned.length === 0) {
      message.info(`@${person.name} 当前名下无正在推进的待办任务。`);
      return;
    }

    const text = [
      `【ElfShip · 个人交付进度催办】`,
      `· 接收人：@${person.name}（${person.title}）`,
      `· 批次：${activeBatch.name}（上线日 ${formatDay(activeBatch.launchDate)}）`,
      `· 当前在制任务清单（共 ${assigned.length} 项）：`,
      ...assigned.map((x, i) => {
        const cur = x.item;
        const st = STAGES.find((s) => s.key === cur.stage)?.name ?? cur.stage;
        return `  ${i + 1}. ${x.lane.name} - ${st} 截止 ${formatDay(cur.dueAt)}`;
      }),
      `· 请尽快登录 ElfShip 管控中枢处理并推进。`,
    ].join("\n");

    try {
      navigator.clipboard.writeText(text);
      message.success(`已复制针对 @${person.name} 的定向催办清单至剪贴板！`);
    } catch {
      message.info("已生成催办内容");
    }
  };

  return (
    <div className="enterprise-root enterprise-layout-sidebar">
      {/* 1. Left Sidebar Navigation & Digital Core */}
      <EnterpriseSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        batches={batches}
        activeBatch={activeBatch}
        onSelectBatch={onSelectBatch}
        actor={actor}
        onSelectActor={onSelectActor}
        previewMode={previewMode}
        onTogglePreviewMode={onTogglePreviewMode}
        totalRisks={totalRisks}
        dhi={dhi}
        dhiLevel={dhiLevel}
        dhiLabel={dhiLabel}
        dhiEmotion={dhiEmotion}
        onOpenSearch={onOpenSearch}
      />

      {/* 2. Right Stage Detail Area */}
      <div className="ent-stage-wrapper">
        <EnterpriseHeader
          activeBatch={activeBatch}
          activeTab={activeTab}
          onOpenShiftModal={onOpenShiftModal}
          onExportCsv={onExportCsv}
          onGenerateReport={onGenerateReport}
          onOpenSearch={onOpenSearch}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          previewMode={previewMode}
          onTogglePreviewMode={onTogglePreviewMode}
        />

        <main className="ent-stage-content">
          {activeTab === "cockpit" && (
            <EnterpriseCockpitView
              batch={activeBatch}
              actor={actor}
              onOpenItem={onOpenItem}
              onNudgeItem={onNudgeItem}
              onNavigateToTab={(tab, ctx) => handleNavigate(tab, ctx)}
            />
          )}

          {activeTab === "tasks" && (
            <EnterpriseTaskCenterView
              batch={activeBatch}
              actor={actor}
              onOpenItem={onOpenItem}
              onNudgeItem={onNudgeItem}
              onReassignDri={onReassignDri}
              onBatchReassignDri={onBatchReassignDri}
              onExportCsv={onExportCsv}
              navContext={navContext}
              onClearNavContext={handleClearNavContext}
            />
          )}

          {activeTab === "personnel" && (
            <EnterprisePersonnelView
              batch={activeBatch}
              actor={actor}
              onOpenItem={onOpenItem}
              onReassignDri={onReassignDri}
              onNudgePerson={handleNudgePerson}
              navContext={navContext}
              onClearNavContext={handleClearNavContext}
            />
          )}

          {activeTab === "pipeline" && (
            <EnterprisePipelineView
              batch={activeBatch}
              actor={actor}
              onOpenItem={onOpenItem}
              navContext={navContext}
              onClearNavContext={handleClearNavContext}
              onNavigateToTab={(tab, ctx) => handleNavigate(tab, ctx)}
            />
          )}

          {activeTab === "gantt" && (
            <EnterpriseGanttView
              batch={activeBatch}
              actor={actor}
              onOpenItem={onOpenItem}
              navContext={navContext}
              onClearNavContext={handleClearNavContext}
            />
          )}

          {activeTab === "ledger" && (
            <EnterpriseLedgerView
              batch={activeBatch}
              actor={actor}
              onOpenItem={onOpenItem}
              onNudgeItem={onNudgeItem}
              onExportCsv={onExportCsv}
              onGenerateReport={onGenerateReport}
            />
          )}

          {activeTab === "warroom" && (
            <EnterpriseWarRoomView
              batch={activeBatch}
              actor={actor}
              onOpenItem={onOpenItem}
              onNudgeItem={onNudgeItem}
              onQuickUnblockItem={onQuickUnblockItem}
              onReassignDri={onReassignDri}
              navContext={navContext}
              onClearNavContext={handleClearNavContext}
              onNavigateToTab={(tab, ctx) => handleNavigate(tab, ctx)}
            />
          )}
        </main>
      </div>
    </div>
  );
};
