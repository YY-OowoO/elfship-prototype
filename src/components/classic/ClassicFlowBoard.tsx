import { Tag } from "antd";
import type { LaunchBatch, StageKey } from "../../types";
import { PEOPLE, STAGES } from "../../mock";
import {
  currentItem,
  findBlockedDownstream,
  formatDay,
  itemLight,
  remainLabel,
  stateLabel,
} from "../../logic";

interface ClassicFlowBoardProps {
  batch: LaunchBatch;
  stageFilter: StageKey | null;
  onFilterStage: (stage: StageKey | null) => void;
  onOpenItem: (id: string) => void;
}

export function ClassicFlowBoard({
  batch,
  stageFilter,
  onFilterStage,
  onOpenItem,
}: ClassicFlowBoardProps) {
  return (
    <div className="classic-board-grid">
      {STAGES.map((stage) => {
        // Collect all items active at this stage
        const stageLanes = batch.lanes.filter((lane) => {
          const cur = currentItem(lane);
          return cur && cur.stage === stage.key;
        });

        const isFiltered = stageFilter === stage.key;

        return (
          <div
            key={stage.key}
            className={`classic-column ${isFiltered ? "active" : ""}`}
            style={{
              borderTop: isFiltered ? "3px solid #2563eb" : undefined,
            }}
          >
            {/* 阶段列头部 */}
            <div
              className="classic-column-header"
              onClick={() => onFilterStage(isFiltered ? null : stage.key)}
              style={{ cursor: "pointer" }}
            >
              <div className="classic-column-title">
                <span>{stage.name}</span>
                <span style={{ fontSize: 11, color: "#64748b", fontWeight: 400 }}>
                  ({stage.short})
                </span>
              </div>
              <span className="classic-column-count">{stageLanes.length}</span>
            </div>

            {/* 阶段卡片列表 */}
            <div className="classic-column-body">
              {stageLanes.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "24px 8px",
                    color: "#94a3b8",
                    fontSize: 12,
                  }}
                >
                  无处于此阶段的资源
                </div>
              ) : (
                stageLanes.map((lane) => {
                  const cur = currentItem(lane);
                  const light = itemLight(cur);
                  const dri = PEOPLE[cur.driId];
                  const blockedDownstream = findBlockedDownstream(batch, lane.id);
                  const isBlocked = cur.locked || cur.waiting;

                  const totalGates = cur.completeWhen.length + cur.enterNextWhen.length;
                  const passedGates =
                    cur.completeWhen.filter((g) => g.ok).length +
                    cur.enterNextWhen.filter((g) => g.ok).length;

                  let riskClass = "risk-normal";
                  if (light === "red") riskClass = "risk-red";
                  else if (light === "yellow") riskClass = "risk-yellow";
                  else if (cur.state === "confirmed") riskClass = "risk-green";

                  return (
                    <div
                      key={lane.id}
                      className={`classic-card ${riskClass} ${isBlocked ? "locked" : ""}`}
                      onClick={() => onOpenItem(cur.id)}
                    >
                      {/* 卡片头部：类型与状态 */}
                      <div className="classic-card-header">
                        <span className="classic-card-cat">{lane.type}</span>
                        <Tag
                          color={
                            cur.state === "confirmed"
                              ? "success"
                              : cur.state === "rejected"
                              ? "error"
                              : cur.state === "submitted"
                              ? "processing"
                              : isBlocked
                              ? "default"
                              : "blue"
                          }
                          style={{ margin: 0, fontSize: 11 }}
                        >
                          {stateLabel(cur)}
                        </Tag>
                      </div>

                      {/* 卡片主标题 */}
                      <div className="classic-card-title">{lane.name}</div>

                      {/* 门禁指标 */}
                      {totalGates > 0 && (
                        <div className="classic-card-gate">
                          <span
                            style={{
                              color: passedGates === totalGates ? "#16a34a" : "#d97706",
                              fontWeight: 600,
                            }}
                          >
                            {passedGates === totalGates ? "门禁已达成" : "门禁待满足"}
                          </span>
                          <span style={{ color: "#94a3b8" }}>
                            ({passedGates}/{totalGates})
                          </span>
                        </div>
                      )}

                      {/* 阻塞/锁下游提示 */}
                      {cur.locked && (
                        <div className="classic-lock-banner">
                          <span>下游锁定：等待上游就绪</span>
                        </div>
                      )}

                      {blockedDownstream.blockedLaneIds.length > 0 && light === "red" && (
                        <div
                          className="classic-lock-banner"
                          style={{ background: "#fef2f2", color: "#dc2626" }}
                        >
                          <span>本项逾期已锁定下游 {blockedDownstream.blockedLaneIds.length} 项工序</span>
                        </div>
                      )}

                      {/* 底部元信息：责任人与截止时间 */}
                      <div className="classic-card-meta">
                        <div className="classic-card-dri">
                          <span>主责:</span>
                          <span style={{ fontWeight: 600 }}>{dri ? dri.name : cur.driId}</span>
                        </div>

                        <div className={`classic-card-due ${light === "red" ? "red" : light === "yellow" ? "yellow" : "normal"}`}>
                          {formatDay(cur.dueAt)} · {remainLabel(cur.dueAt)}
                        </div>
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
  );
}
