import React, { useMemo } from "react";
import {
  Package,
  CheckCircle2,
  Clock,
  TrendingUp,
  Activity,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { LaunchBatch, PersonId, ResourceLane, WorkItem } from "../../types";
import { PEOPLE, STAGES, TODAY } from "../../mock";
import { EmotionBall } from "../../emotion-ball";
import {
  batchLights,
  batchRisk,
  currentItem,
  formatDay,
  formatDayWithWeekday,
  itemLight,
  launchRemain,
  progress,
  remainLabel,
  stateLabel,
} from "../../logic";

interface ShadcnDashboardOverviewProps {
  batch: LaunchBatch;
  actor: PersonId;
  onOpenItem: (id: string) => void;
  onNudgeItem: (item: WorkItem, lane: ResourceLane) => void;
  onNavigateToPipeline: () => void;
  onNavigateToLedger: () => void;
}

export const ShadcnDashboardOverview: React.FC<ShadcnDashboardOverviewProps> = ({
  batch,
  actor,
  onOpenItem,
  onNudgeItem,
  onNavigateToPipeline,
  onNavigateToLedger,
}) => {
  const risk = useMemo(() => batchRisk(batch), [batch]);
  const lights = useMemo(() => batchLights(batch), [batch]);

  // Overall progress
  const totalLanes = batch.lanes.length;
  const doneLanes = useMemo(() => {
    return batch.lanes.filter((l) => {
      const p = progress(l);
      return p.total > 0 && p.done === p.total;
    }).length;
  }, [batch.lanes]);

  const completionRate = totalLanes > 0 ? Math.round((doneLanes / totalLanes) * 100) : 0;

  // Stage distribution data for Recharts
  const stageChartData = useMemo(() => {
    return STAGES.map((st) => {
      const inThisStage = batch.lanes.filter((l) => {
        const cur = currentItem(l);
        return cur && cur.stage === st.key;
      });

      const redCount = inThisStage.filter((l) => itemLight(currentItem(l)) === "red").length;
      const yellowCount = inThisStage.filter((l) => itemLight(currentItem(l)) === "yellow").length;
      const normalCount = inThisStage.length - redCount - yellowCount;

      return {
        name: st.short,
        fullName: st.name,
        total: inThisStage.length,
        red: redCount,
        yellow: yellowCount,
        normal: normalCount,
      };
    });
  }, [batch.lanes]);

  // Urgent action stream items
  const urgentQueue = useMemo(() => {
    const list: { lane: ResourceLane; item: WorkItem; urgency: "danger" | "warning" | "action" }[] = [];

    for (const lane of batch.lanes) {
      const cur = currentItem(lane);
      if (!cur || cur.state === "confirmed" || cur.skipped) continue;

      const light = itemLight(cur);
      if (cur.locked) {
        list.push({ lane, item: cur, urgency: "danger" });
      } else if (light === "red") {
        list.push({ lane, item: cur, urgency: "danger" });
      } else if (cur.state === "submitted" && cur.confirmerId === actor) {
        list.push({ lane, item: cur, urgency: "action" });
      } else if (light === "yellow") {
        list.push({ lane, item: cur, urgency: "warning" });
      }
    }

    return list.slice(0, 6);
  }, [batch.lanes, actor]);

  // Asset category breakdown
  const categoryStats = useMemo(() => {
    const counts: Record<string, { total: number; done: number }> = {};
    for (const lane of batch.lanes) {
      if (!counts[lane.type]) counts[lane.type] = { total: 0, done: 0 };
      counts[lane.type].total += 1;
      const p = progress(lane);
      if (p.total > 0 && p.done === p.total) counts[lane.type].done += 1;
    }
    return Object.entries(counts).map(([type, stat]) => ({
      type,
      ...stat,
      percent: stat.total > 0 ? Math.round((stat.done / stat.total) * 100) : 0,
    }));
  }, [batch.lanes]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 4 Stats KPI Cards Grid */}
      <div className="shadcn-stats-grid">
        {/* Card 1: Total Assets */}
        <div className="shadcn-stat-card" onClick={onNavigateToLedger} style={{ cursor: "pointer" }} title="点击查看资产台账明细">
          <div className="shadcn-stat-header">
            <span>入库资产总计</span>
            <div style={{ padding: 6, borderRadius: 6, background: "var(--shadcn-muted)" }}>
              <Package size={15} className="shadcn-stat-icon" />
            </div>
          </div>
          <div className="shadcn-stat-value">{totalLanes} 项</div>
          <div className="shadcn-stat-desc positive">
            <TrendingUp size={13} />
            <span>覆盖 {categoryStats.length} 类标准流水线 (点击查看台账)</span>
          </div>
        </div>

        {/* Card 2: Overall Progress */}
        <div className="shadcn-stat-card" onClick={onNavigateToPipeline} style={{ cursor: "pointer" }} title="点击查看 7 节点流水线">
          <div className="shadcn-stat-header">
            <span>交付通关成熟度</span>
            <div style={{ padding: 6, borderRadius: 6, background: "var(--shadcn-muted)" }}>
              <CheckCircle2 size={15} className="shadcn-stat-icon" />
            </div>
          </div>
          <div className="shadcn-stat-value">
            {doneLanes} / {totalLanes}
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--shadcn-muted-fg)", marginLeft: 6 }}>
              ({completionRate}%)
            </span>
          </div>
          <div className="shadcn-stat-desc">
            <span>{totalLanes - doneLanes} 项正在 7 节点工序流转中 (点击看看板)</span>
          </div>
        </div>

        {/* Card 3: Andon Risk Alerts with micro EmotionBall */}
        <div
          className={`shadcn-stat-card ${lights.red > 0 ? "danger-focus-card" : ""}`}
          onClick={onNavigateToPipeline}
          style={{ cursor: "pointer" }}
          title="点击直达流水线排查风险"
        >
          <div className="shadcn-stat-header">
            <span style={{ fontWeight: 700, color: lights.red > 0 ? "#dc2626" : "inherit" }}>Andon 风险雷达</span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <EmotionBall
                emotion={lights.red > 0 ? "34" : lights.yellow > 0 ? "11" : "02"}
                size={26}
                lite={true}
                interactive={true}
                label="Andon"
              />
            </div>
          </div>
          <div className="shadcn-stat-value" style={{ color: lights.red > 0 ? "#ef4444" : lights.yellow > 0 ? "#f59e0b" : "#10b981" }}>
            {lights.red} 红 / {lights.yellow} 黄
            {lights.red > 0 && <span style={{ fontSize: 12, marginLeft: 8, fontWeight: 700, color: "#ef4444" }}>(存在阻断)</span>}
          </div>
          <div className={`shadcn-stat-desc ${lights.red > 0 ? "danger" : lights.yellow > 0 ? "warning" : "positive"}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{risk.sentence}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", flexShrink: 0 }}>排查</span>
          </div>
        </div>

        {/* Card 4: Launch Runway */}
        <div className="shadcn-stat-card">
          <div className="shadcn-stat-header">
            <span>基准上线倒计时</span>
            <div style={{ padding: 6, borderRadius: 6, background: "var(--shadcn-muted)" }}>
              <Clock size={15} className="shadcn-stat-icon" />
            </div>
          </div>
          <div className="shadcn-stat-value">{formatDayWithWeekday(batch.launchDate)}</div>
          <div className="shadcn-stat-desc">
            <span>{launchRemain(batch.launchDate)} (基准日: {TODAY})</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Chart 8-col & Action Stream 4-col */}
      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: 16 }}>
        {/* Left: Recharts Stage Workload & Distribution */}
        <div className="shadcn-card">
          <div className="shadcn-card-header">
            <div>
              <div className="shadcn-card-title">
                <Activity size={16} />
                <span>7 节点工序负载与风险分布</span>
              </div>
              <div className="shadcn-card-desc">重点突出显示当前各节点堆积任务量与瓶颈工序（高亮红/黄柱体）</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: "var(--shadcn-muted-fg)", whiteSpace: "nowrap", flexShrink: 0 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "#ef4444", flexShrink: 0 }} />
                  严重阻断
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "#f59e0b", flexShrink: 0 }} />
                  临期关注
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: "#3b82f6", flexShrink: 0 }} />
                  正常推进
                </span>
              </div>
              <button
                type="button"
                className="shadcn-badge shadcn-badge-secondary"
                style={{ cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
                onClick={onNavigateToPipeline}
              >
                查看流水线看板 <ArrowRight size={12} />
              </button>
            </div>
          </div>

          <div className="shadcn-card-body" style={{ height: 320, padding: "16px 12px 10px 0" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageChartData} margin={{ top: 15, right: 10, left: -15, bottom: 0 }}>
                <XAxis dataKey="name" stroke="var(--shadcn-muted-fg)" fontSize={12} tickLine={false} />
                <YAxis stroke="var(--shadcn-muted-fg)" fontSize={12} tickLine={false} allowDecimals={false} />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div
                          style={{
                            background: "var(--shadcn-card)",
                            border: "1px solid var(--shadcn-border)",
                            padding: "8px 12px",
                            borderRadius: 6,
                            fontSize: 12,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                            color: "var(--shadcn-fg)",
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>{data.fullName} ({data.name})</div>
                          <div>总计资源: <strong>{data.total}</strong> 项</div>
                          {data.red > 0 && <div style={{ color: "#ef4444", marginTop: 2 }}>● 严重逾期: {data.red} 项</div>}
                          {data.yellow > 0 && <div style={{ color: "#f59e0b", marginTop: 2 }}>● 临期预警: {data.yellow} 项</div>}
                          <div style={{ color: "#10b981", marginTop: 2 }}>● 正常进行: {data.normal} 项</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="total"
                  fill="var(--shadcn-primary)"
                  radius={[4, 4, 0, 0]}
                  onClick={onNavigateToPipeline}
                  style={{ cursor: "pointer" }}
                >
                  {stageChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.red > 0
                          ? "#ef4444"
                          : entry.yellow > 0
                          ? "#f59e0b"
                          : entry.total > 0
                          ? "#3b82f6"
                          : "var(--shadcn-border)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Urgent Action Stream */}
        <div className="shadcn-card">
          <div className="shadcn-card-header">
            <div>
              <div className="shadcn-card-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <EmotionBall
                  emotion={urgentQueue.length > 0 ? "33" : "04"}
                  size={20}
                  lite={true}
                  interactive={true}
                  label="GateAction"
                />
                <span>紧急行动与门禁拦截</span>
              </div>
              <div className="shadcn-card-desc">重点突出需即时响应的高优先卡点与门禁</div>
            </div>
          </div>

          <div className="shadcn-card-body" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8, maxHeight: 340, overflowY: "auto" }}>
            {urgentQueue.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--shadcn-muted-fg)", fontSize: 13 }}>
                <ShieldCheck size={28} style={{ color: "#10b981", margin: "0 auto 8px auto" }} />
                <div>当前无高风险阻塞与待处理门禁</div>
              </div>
            ) : (
              urgentQueue.map(({ lane, item, urgency }) => {
                const dri = PEOPLE[item.driId];
                const light = itemLight(item);

                return (
                  <div
                    key={item.id}
                    style={{
                      background: urgency === "danger" ? "linear-gradient(180deg, rgba(254, 242, 242, 0.6) 0%, var(--shadcn-muted) 100%)" : "var(--shadcn-muted)",
                      border: urgency === "danger" ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid var(--shadcn-border)",
                      borderLeft: urgency === "danger" ? "4px solid #ef4444" : urgency === "action" ? "4px solid #3b82f6" : "4px solid #f59e0b",
                      borderRadius: 8,
                      padding: "10px 12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span className="shadcn-badge shadcn-badge-secondary" style={{ fontSize: 10 }}>
                        {lane.type}
                      </span>
                      <span
                        className={`shadcn-badge ${
                          urgency === "danger"
                            ? "shadcn-badge-danger"
                            : urgency === "warning"
                            ? "shadcn-badge-warning"
                            : "shadcn-badge-info"
                        }`}
                        style={{ fontWeight: 700 }}
                      >
                        {item.locked ? "P0 下游锁死" : light === "red" ? "P0 严重逾期" : stateLabel(item)}
                      </span>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: 13, color: "var(--shadcn-fg)" }}>
                      {lane.name}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "var(--shadcn-muted-fg)" }}>
                      <span>主责: <b style={{ color: "var(--shadcn-fg)" }}>{dri ? dri.name : item.driId}</b></span>
                      <span>截止: {formatDay(item.dueAt)} ({remainLabel(item.dueAt)})</span>
                    </div>

                    <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                      <button
                        type="button"
                        className={`shadcn-badge ${urgency === "danger" ? "shadcn-badge-danger" : "shadcn-badge-info"}`}
                        style={{ cursor: "pointer", flex: 1, justifyContent: "center", padding: "4px 8px", fontWeight: 600 }}
                        onClick={() => onOpenItem(item.id)}
                      >
                        {urgency === "danger" ? "即刻排查" : "审核 / 详情"}
                      </button>
                      <button
                        type="button"
                        className="shadcn-badge shadcn-badge-secondary"
                        style={{ cursor: "pointer", padding: "4px 8px" }}
                        onClick={() => onNudgeItem(item, lane)}
                      >
                        一键催办
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom: Asset Category Progress Matrix */}
      <div className="shadcn-card">
        <div className="shadcn-card-header">
          <div>
            <div className="shadcn-card-title">
              <Layers size={16} />
              <span>资产分类交付成熟度大盘</span>
            </div>
            <div className="shadcn-card-desc">按资产类别统计各专业组 SOP 交付完成度</div>
          </div>
          <button
            type="button"
            className="shadcn-badge shadcn-badge-secondary"
            style={{ cursor: "pointer" }}
            onClick={onNavigateToLedger}
          >
            查看全量明细 <ArrowRight size={12} />
          </button>
        </div>

        <div className="shadcn-card-body" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          {categoryStats.map((cat) => (
            <div
              key={cat.type}
              style={{
                background: "var(--shadcn-muted)",
                border: "1px solid var(--shadcn-border)",
                borderRadius: 8,
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{cat.type}</span>
                <span className="shadcn-badge shadcn-badge-secondary">{cat.done}/{cat.total} 完成</span>
              </div>

              {/* Progress Bar */}
              <div style={{ height: 6, background: "var(--shadcn-border)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${cat.percent}%`,
                    background: cat.percent === 100 ? "#10b981" : "var(--shadcn-primary)",
                    borderRadius: 3,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--shadcn-muted-fg)" }}>
                <span>完成率</span>
                <span style={{ fontWeight: 600, color: "var(--shadcn-fg)" }}>{cat.percent}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
