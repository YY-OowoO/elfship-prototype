import React, { useMemo } from "react";
import { message } from "antd";
import {
  ShieldAlert,
  Lock,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import type { LaunchBatch, WorkItem } from "../../types";
import { PEOPLE, STAGES } from "../../mock";
import { EmotionBall, dispatchElfEvent } from "../../emotion-ball";
import {
  batchLights,
  batchRisk,
  currentItem,
  findBlockedDownstream,
  formatDay,
  itemLight,
  remainLabel,
} from "../../logic";

interface ShadcnRiskRadarProps {
  batch: LaunchBatch;
  onOpenItem: (id: string) => void;
  onOpenShiftModal: () => void;
}

export const ShadcnRiskRadar: React.FC<ShadcnRiskRadarProps> = ({
  batch,
  onOpenItem,
  onOpenShiftModal,
}) => {
  const risk = useMemo(() => batchRisk(batch), [batch]);
  const lights = useMemo(() => batchLights(batch), [batch]);

  // Find all blocked downstream resources
  const blockedList = useMemo(() => {
    const list: {
      laneName: string;
      item: WorkItem;
      light: string;
      blockedCount: number;
      blockedNames: string[];
    }[] = [];

    for (const lane of batch.lanes) {
      const cur = currentItem(lane);
      if (!cur) continue;
      const res = findBlockedDownstream(batch, lane.id);
      if (res.blockedLaneIds.length > 0 || itemLight(cur) === "red") {
        const names = res.blockedLaneIds
          .map((id) => batch.lanes.find((l) => l.id === id)?.name)
          .filter(Boolean) as string[];

        list.push({
          laneName: lane.name,
          item: cur,
          light: itemLight(cur),
          blockedCount: res.blockedLaneIds.length,
          blockedNames: names,
        });
      }
    }

    return list;
  }, [batch.lanes]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Risk Overview Hero Card */}
      <div className="shadcn-card">
        <div className="shadcn-card-header">
          <div className="shadcn-card-title">
            <ShieldAlert size={18} style={{ color: lights.red > 0 ? "#ef4444" : "#f59e0b" }} />
            <span>Andon 全局风险与管线锁定雷达</span>
          </div>
          <button
            type="button"
            className="shadcn-badge shadcn-badge-info"
            style={{ cursor: "pointer" }}
            onClick={onOpenShiftModal}
          >
            <Calendar size={12} /> 排期顺延推演
          </button>
        </div>

        <div className="shadcn-card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              padding: "14px 18px",
              borderRadius: 8,
              background: lights.red > 0 ? "rgba(239, 68, 68, 0.08)" : "rgba(245, 158, 11, 0.08)",
              border: `1px solid ${lights.red > 0 ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{ cursor: "pointer", display: "inline-flex" }}
                onClick={() => dispatchElfEvent("diagnosis_requested")}
                title="灵动精灵：点击触发全局诊断"
              >
                <EmotionBall
                  emotion={lights.red > 0 ? "34" : lights.yellow > 0 ? "11" : "02"}
                  size={36}
                  lite={true}
                  interactive={true}
                  label="RiskElf"
                />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--shadcn-fg)" }}>
                  {risk.level === "risk" ? "当前批次存在阻断性风险" : "当前批次处于需关注状态"}
                </div>
                <div style={{ color: "var(--shadcn-muted-fg)", fontSize: 13, marginTop: 4 }}>
                  {risk.sentence}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <span className="shadcn-badge shadcn-badge-danger">红灯 {lights.red} 项</span>
              <span className="shadcn-badge shadcn-badge-warning">黄灯 {lights.yellow} 项</span>
              <span className="shadcn-badge shadcn-badge-success">正常 {batch.lanes.length - lights.red - lights.yellow} 项</span>
            </div>
          </div>
        </div>
      </div>

      {/* Downstream Lock Breakdown */}
      <div className="shadcn-card">
        <div className="shadcn-card-header">
          <div className="shadcn-card-title">
            <Lock size={16} />
            <span>异常工序与下游依赖锁定拓扑</span>
          </div>
          <div className="shadcn-card-desc">展示单点工序逾期对全线后续生产车道的连锁影响</div>
        </div>

        <div className="shadcn-card-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {blockedList.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--shadcn-muted-fg)", fontSize: 13 }}>
              <CheckCircle2 size={24} style={{ color: "#10b981", margin: "0 auto 8px auto" }} />
              <div>全线管线通畅，无下游阻塞锁定的资产工序</div>
            </div>
          ) : (
            blockedList.map((item, idx) => {
              const stage = STAGES.find((s) => s.key === item.item.stage);
              const dri = PEOPLE[item.item.driId];

              return (
                <div
                  key={idx}
                  style={{
                    background: "var(--shadcn-muted)",
                    border: "1px solid var(--shadcn-border)",
                    borderRadius: 8,
                    padding: "12px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="shadcn-badge shadcn-badge-danger">根因卡点</span>
                      <strong style={{ fontSize: 14 }}>{item.laneName}</strong>
                      <span className="shadcn-badge shadcn-badge-info">
                        {stage ? stage.name : item.item.stage}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        className="shadcn-badge shadcn-badge-secondary"
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          const text = `【Andon 生产阻断工单】\n· 根因资产：${item.laneName}（${stage?.name || item.item.stage}）\n· 主责人员：@${dri?.name || item.item.driId}\n· 交付截止：${formatDay(item.item.dueAt)}（${remainLabel(item.item.dueAt)}）\n· 直接导致下游 ${item.blockedCount} 项工序锁死：${item.blockedNames.join("、")}\n· 请主责同学优先攻关推进！`;
                          navigator.clipboard.writeText(text);
                          message.success("已复制 Andon 生产阻断工单至剪贴板！");
                        }}
                      >
                        复制阻断工单
                      </button>
                      <button
                        type="button"
                        className="shadcn-badge shadcn-badge-info"
                        style={{ cursor: "pointer" }}
                        onClick={() => onOpenItem(item.item.id)}
                      >
                        即刻排查 / 审核
                      </button>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: "var(--shadcn-muted-fg)" }}>
                    主责: <strong>{dri ? dri.name : item.item.driId}</strong> · 截止日期: {formatDay(item.item.dueAt)} ({remainLabel(item.item.dueAt)})
                  </div>

                  {item.blockedCount > 0 && (
                    <div
                      style={{
                        marginTop: 4,
                        padding: "8px 12px",
                        borderRadius: 6,
                        background: "rgba(239, 68, 68, 0.08)",
                        border: "1px solid rgba(239, 68, 68, 0.15)",
                        fontSize: 12,
                        color: "#ef4444",
                      }}
                    >
                      <strong>连锁锁定下游 {item.blockedCount} 项工序：</strong>
                      <div style={{ marginTop: 2, color: "var(--shadcn-fg)" }}>
                        {item.blockedNames.join("、")}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
