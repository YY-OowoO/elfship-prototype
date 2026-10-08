import React, { useState } from "react";
import { Select } from "antd";
import {
  CheckCircle2,
  AlertTriangle,
  Lock,
} from "lucide-react";
import type { LaunchBatch, PersonId } from "../../types";
import { PEOPLE, STAGES } from "../../mock";
import {
  currentItem,
  formatDay,
  itemLight,
  remainLabel,
  stateLabel,
} from "../../logic";

interface ShadcnFlowPipelineProps {
  batch: LaunchBatch;
  actor: PersonId;
  onOpenItem: (id: string) => void;
}

export const ShadcnFlowPipeline: React.FC<ShadcnFlowPipelineProps> = ({
  batch,
  actor,
  onOpenItem,
}) => {
  const [filterMode, setFilterMode] = useState<"all" | "risk" | "mine">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = Array.from(new Set(batch.lanes.map((l) => l.type)));

  const filteredLanes = batch.lanes.filter((lane) => {
    const cur = currentItem(lane);
    if (!cur || cur.skipped) return false;

    if (selectedCategory !== "all" && lane.type !== selectedCategory) return false;

    if (filterMode === "risk") {
      const light = itemLight(cur);
      return cur.locked || light === "red" || light === "yellow";
    }

    if (filterMode === "mine") {
      return cur.driId === actor || cur.confirmerId === actor;
    }

    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Filtering Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Quick Filters */}
          <div className="shadcn-tabs-list">
            <button
              type="button"
              className={`shadcn-tab-btn ${filterMode === "all" ? "active" : ""}`}
              onClick={() => setFilterMode("all")}
            >
              全部看板 ({batch.lanes.length})
            </button>
            <button
              type="button"
              className={`shadcn-tab-btn ${filterMode === "risk" ? "active" : ""}`}
              onClick={() => setFilterMode("risk")}
            >
              只看风险
            </button>
            <button
              type="button"
              className={`shadcn-tab-btn ${filterMode === "mine" ? "active" : ""}`}
              onClick={() => setFilterMode("mine")}
            >
              等我确认
            </button>
          </div>

          {/* Category Filter */}
          <Select
            size="small"
            style={{ width: 140 }}
            value={selectedCategory}
            onChange={setSelectedCategory}
            options={[
              { label: `全部分类 (${categories.length})`, value: "all" },
              ...categories.map((c) => ({ label: c, value: c })),
            ]}
          />
        </div>
      </div>

      {/* 7 Columns Flow Kanban */}
      <div className="shadcn-kanban-board">
        {STAGES.map((stage) => {
          const lanesInStage = filteredLanes.filter((l) => {
            const cur = currentItem(l);
            return cur && cur.stage === stage.key;
          });

          const hasRiskInStage = lanesInStage.some((l) => {
            const cur = currentItem(l);
            return cur && (cur.locked || itemLight(cur) === "red");
          });

          const stageIdx = STAGES.findIndex((s) => s.key === stage.key);
          const isStagePassed =
            lanesInStage.length === 0 &&
            batch.lanes.length > 0 &&
            batch.lanes.every((l) => {
              const cur = currentItem(l);
              if (!cur) return true;
              const curIdx = STAGES.findIndex((s) => s.key === cur.stage);
              return curIdx > stageIdx || (curIdx === stageIdx && cur.state === "confirmed");
            });

          return (
            <div key={stage.key} className="shadcn-kanban-col">
              {/* Column Head */}
              <div className="shadcn-kanban-col-head">
                <div className="shadcn-kanban-col-title">
                  <span>{stage.name}</span>
                  <span style={{ fontSize: 11, color: "var(--shadcn-muted-fg)", fontWeight: 400 }}>
                    ({stage.short})
                  </span>
                  {hasRiskInStage && (
                    <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#ef4444" }} />
                  )}
                </div>
                <span className="shadcn-kanban-count">{lanesInStage.length}</span>
              </div>

              {/* Column Cards */}
              <div className="shadcn-kanban-cards">
                {lanesInStage.length === 0 ? (
                  isStagePassed ? (
                    <div
                      style={{
                        padding: "24px 12px",
                        borderRadius: 8,
                        border: "1px dashed rgba(16, 185, 129, 0.4)",
                        background: "rgba(16, 185, 129, 0.04)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: "rgba(16, 185, 129, 0.12)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#10b981",
                        }}
                      >
                        <CheckCircle2 size={18} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#10b981" }}>全员已通关</div>
                        <div style={{ fontSize: 11, color: "var(--shadcn-muted-fg)", marginTop: 2 }}>
                          SLA 100% 达标 · 0 项滞留
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "32px 8px", color: "var(--shadcn-muted-fg)", fontSize: 12 }}>
                      暂无处于此工序的资源
                    </div>
                  )
                ) : (
                  lanesInStage.map((lane) => {
                    const cur = currentItem(lane);
                    const light = itemLight(cur);
                    const dri = PEOPLE[cur.driId];

                    const totalGates = cur.completeWhen.length + cur.enterNextWhen.length;
                    const passedGates =
                      cur.completeWhen.filter((g) => g.ok).length +
                      cur.enterNextWhen.filter((g) => g.ok).length;

                    return (
                      <div
                        key={lane.id}
                        className={`shadcn-task-card ${cur.locked ? "is-locked" : ""}`}
                        onClick={() => onOpenItem(cur.id)}
                      >
                        {/* Card Header: Category & Status */}
                        <div className="shadcn-task-card-header">
                          <span className="shadcn-badge shadcn-badge-secondary" style={{ fontSize: 10 }}>
                            {lane.type}
                          </span>
                          <span
                            className={`shadcn-badge ${
                              cur.state === "confirmed"
                                ? "shadcn-badge-success"
                                : cur.state === "rejected"
                                ? "shadcn-badge-danger"
                                : cur.state === "submitted"
                                ? "shadcn-badge-info"
                                : cur.locked
                                ? "shadcn-badge-secondary"
                                : "shadcn-badge-warning"
                            }`}
                          >
                            {stateLabel(cur)}
                          </span>
                        </div>

                        {/* Title */}
                        <div className="shadcn-task-title">{lane.name}</div>

                        {/* Gate Status */}
                        {totalGates > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                            {passedGates === totalGates ? (
                              <span style={{ color: "#10b981", display: "flex", alignItems: "center", gap: 3 }}>
                                <CheckCircle2 size={12} /> 门禁已就绪 ({passedGates}/{totalGates})
                              </span>
                            ) : (
                              <span style={{ color: "#f59e0b", display: "flex", alignItems: "center", gap: 3 }}>
                                <AlertTriangle size={12} /> 门禁待达标 ({passedGates}/{totalGates})
                              </span>
                            )}
                          </div>
                        )}

                        {/* Lock warning */}
                        {cur.locked && (
                          <div
                            style={{
                              background: "rgba(239, 68, 68, 0.08)",
                              border: "1px solid rgba(239, 68, 68, 0.2)",
                              borderRadius: 4,
                              padding: "4px 8px",
                              fontSize: 11,
                              color: "#ef4444",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Lock size={12} />
                            <span>下游已被锁定：等待前置工序</span>
                          </div>
                        )}

                        {/* Card Footer: Assignee & Due Date */}
                        <div className="shadcn-task-footer">
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <div
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: "50%",
                                background: "var(--shadcn-muted)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                fontWeight: 700,
                                border: "1px solid var(--shadcn-border)",
                              }}
                            >
                              {dri ? dri.name.slice(0, 1) : cur.driId.slice(0, 1)}
                            </div>
                            <span>{dri ? dri.name : cur.driId}</span>
                          </div>

                          <span
                            className={`shadcn-badge ${
                              light === "red"
                                ? "shadcn-badge-danger"
                                : light === "yellow"
                                ? "shadcn-badge-warning"
                                : "shadcn-badge-secondary"
                            }`}
                          >
                            {formatDay(cur.dueAt)} ({remainLabel(cur.dueAt)})
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
