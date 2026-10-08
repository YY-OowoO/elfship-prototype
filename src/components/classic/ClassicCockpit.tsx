import { useMemo, useState } from "react";
import { Segmented, Tag } from "antd";
import type { LaunchBatch, PersonId, ResourceLane, StageKey, WorkItem } from "../../types";
import { STAGES, TODAY, type ScenarioPresetKey } from "../../mock";
import { EmotionBall } from "../../emotion-ball";
import {
  batchLights,
  batchRisk,
  currentItem,
  formatDay,
  itemLight,
  launchRemain,
  progress,
} from "../../logic";
import { ClassicHeader } from "./ClassicHeader";
import { ClassicFlowBoard } from "./ClassicFlowBoard";
import { ClassicResourceTable } from "./ClassicResourceTable";
import "./classic.css";

interface ClassicCockpitProps {
  batches: LaunchBatch[];
  activeBatch: LaunchBatch;
  onSelectBatch: (id: string) => void;
  actor: PersonId;
  onSelectActor: (actor: PersonId) => void;
  previewMode: "companion" | "classic";
  onTogglePreviewMode: (mode: "companion" | "classic") => void;
  onOpenItem: (id: string) => void;
  onOpenShiftModal: () => void;
  onNudgeItem: (item: WorkItem, lane: ResourceLane) => void;
  onExportCsv: () => void;
  currentScenario?: ScenarioPresetKey;
  onSelectScenario?: (key: ScenarioPresetKey) => void;
}

export function ClassicCockpit({
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
  currentScenario,
  onSelectScenario,
}: ClassicCockpitProps) {
  const [activeTab, setActiveTab] = useState<"board" | "table">("board");
  const [stageFilter, setStageFilter] = useState<StageKey | null>(null);
  const [quickFilter, setQuickFilter] = useState<"all" | "risk" | "mine">("all");

  const risk = useMemo(() => batchRisk(activeBatch), [activeBatch]);
  const lights = useMemo(() => batchLights(activeBatch), [activeBatch]);

  // Compute filtered lanes
  const displayedBatch = useMemo(() => {
    let list = activeBatch.lanes;
    if (quickFilter === "risk") {
      list = list.filter((l) => {
        const cur = currentItem(l);
        return cur && (cur.locked || itemLight(cur) === "red" || itemLight(cur) === "yellow" || l.items.some((x) => x.locked));
      });
    } else if (quickFilter === "mine") {
      list = list.filter((l) =>
        l.items.some((it) => !it.skipped && (it.driId === actor || it.confirmerId === actor)),
      );
    }
    return { ...activeBatch, lanes: list };
  }, [activeBatch, quickFilter, actor]);

  // Done statistics
  const totalLanes = activeBatch.lanes.length;
  const doneLanes = activeBatch.lanes.filter((l) => {
    const p = progress(l);
    return p.total > 0 && p.done === p.total;
  }).length;

  return (
    <div className="classic-root">
      {/* 经典顶部导航栏 */}
      <ClassicHeader
        batches={batches}
        activeBatch={activeBatch}
        onSelectBatch={onSelectBatch}
        actor={actor}
        onSelectActor={onSelectActor}
        previewMode={previewMode}
        onTogglePreviewMode={onTogglePreviewMode}
        onOpenShiftModal={onOpenShiftModal}
        onExportCsv={onExportCsv}
        currentScenario={currentScenario}
        onSelectScenario={onSelectScenario}
      />

      {/* 批次横幅与上线里程碑跑道 */}
      <section className="classic-hero-bar">
        <div className="classic-batch-summary">
          <div className="classic-batch-info">
            <span className="classic-batch-name">{activeBatch.name}</span>
            <span className="classic-launch-chip">
              上线日: {formatDay(activeBatch.launchDate)} ({launchRemain(activeBatch.launchDate)})
            </span>
            <span className="classic-launch-chip">
              交付进度: {doneLanes}/{totalLanes} 项
            </span>
            <span
              className={`classic-risk-alert ${
                risk.level === "risk" ? "risk" : risk.level === "watch" ? "watch" : "ok"
              }`}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <EmotionBall
                emotion={risk.level === "risk" ? "34" : risk.level === "watch" ? "11" : "02"}
                size={20}
                lite={true}
                interactive={true}
                label="ClassicElf"
              />
              <span>
                {risk.level === "risk"
                  ? `风险预警 · 红灯 ${lights.red} 项 / 黄灯 ${lights.yellow} 项`
                  : risk.level === "watch"
                  ? `需关注 · 黄灯 ${lights.yellow} 项`
                  : "全部按期正常推进"}
              </span>
            </span>
          </div>

          <div style={{ fontSize: 13, color: "#64748b" }}>
            当前基准日: <strong>{TODAY}</strong>
          </div>
        </div>

        {/* 7 节点里程碑跑道 (Classic Runway) */}
        <div className="classic-runway">
          {STAGES.map((st, idx) => {
            const count = activeBatch.lanes.filter((l) => {
              const cur = currentItem(l);
              return cur && cur.stage === st.key;
            }).length;
            const hasRed = activeBatch.lanes.some((l) => {
              const cur = currentItem(l);
              return cur && cur.stage === st.key && itemLight(cur) === "red";
            });

            return (
              <div
                key={st.key}
                className={`classic-runway-node ${hasRed ? "has-risk" : ""} ${stageFilter === st.key ? "active" : ""}`}
                onClick={() => setStageFilter((cur) => (cur === st.key ? null : st.key))}
                style={{ cursor: "pointer" }}
              >
                <div className="classic-runway-node-top">
                  <span>STEP 0{idx + 1}</span>
                  {hasRed && <span style={{ color: "#ef4444", fontWeight: 700 }}>● 预警</span>}
                </div>
                <div className="classic-runway-node-title">{st.name}</div>
                <div className="classic-runway-node-meta">
                  <span>{st.short}</span>
                  <Tag color={count > 0 ? (hasRed ? "error" : "blue") : "default"} style={{ margin: 0, fontSize: 10 }}>
                    {count} 项
                  </Tag>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 主体内容 */}
      <main className="classic-content">
        {/* 工具栏：视图切换与快速过滤 */}
        <div className="classic-toolbar">
          <div className="classic-toolbar-left">
            <Segmented
              value={activeTab}
              onChange={(v) => setActiveTab(v as "board" | "table")}
              options={[
                { label: "7节点流水线看板", value: "board" },
                { label: "资产交付清单表", value: "table" },
              ]}
            />

            <Segmented
              value={quickFilter}
              onChange={(v) => setQuickFilter(v as "all" | "risk" | "mine")}
              options={[
                { label: `全部 (${activeBatch.lanes.length})`, value: "all" },
                { label: `仅看风险 (${lights.red + lights.yellow})`, value: "risk" },
                { label: "我的待办", value: "mine" },
              ]}
            />

            {stageFilter && (
              <Tag
                closable
                onClose={() => setStageFilter(null)}
                color="blue"
                style={{ marginLeft: 8 }}
              >
                聚焦阶段: {STAGES.find((s) => s.key === stageFilter)?.name}
              </Tag>
            )}
          </div>
        </div>

        {/* 视图展现 */}
        {activeTab === "board" ? (
          <ClassicFlowBoard
            batch={displayedBatch}
            stageFilter={stageFilter}
            onFilterStage={setStageFilter}
            onOpenItem={onOpenItem}
          />
        ) : (
          <ClassicResourceTable
            batch={displayedBatch}
            onOpenItem={onOpenItem}
            onNudgeItem={onNudgeItem}
          />
        )}
      </main>
    </div>
  );
}
