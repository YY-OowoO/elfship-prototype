import React, { useState, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Layers,
  Radio,
  ShieldAlert,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button, Empty, Progress, Space, Tag } from "antd";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import type { LaunchBatch, PersonId, ResourceLane, WorkItem } from "../../types";
import { PEOPLE, STAGES, TODAY } from "../../mock";
import {
  batchLights,
  currentItem,
  formatDay,
  getAssetCategory,
  itemLight,
  progress,
  remainLabel,
} from "../../logic";
import { playSound } from "../../sound";
import type { EnterpriseTab, NavigationContext } from "./EnterpriseAdminRoot";

interface EnterpriseCockpitViewProps {
  batch: LaunchBatch;
  actor: PersonId;
  onOpenItem: (id: string) => void;
  onNudgeItem: (item: WorkItem, lane: ResourceLane) => void;
  onNavigateToTab: (tab: EnterpriseTab, context?: NavigationContext) => void;
}

export const EnterpriseCockpitView: React.FC<EnterpriseCockpitViewProps> = ({
  batch,
  actor: _actor,
  onOpenItem,
  onNudgeItem,
  onNavigateToTab,
}) => {
  const [nudgedMap, setNudgedMap] = useState<Record<string, string>>({});

  const handleNudge = (item: WorkItem, lane: ResourceLane) => {
    onNudgeItem(item, lane);
    const timeStr = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    setNudgedMap((prev) => ({ ...prev, [item.id]: timeStr }));
    playSound.click();
  };
  const lights = useMemo(() => batchLights(batch), [batch]);
  const totalLanes = batch.lanes.length;

  // Compute completed lanes (all non-skipped items confirmed)
  const completedLanes = useMemo(() => {
    return batch.lanes.filter((l) => {
      const p = progress(l);
      return p.total > 0 && p.done === p.total;
    }).length;
  }, [batch.lanes]);

  const completionRate = totalLanes > 0 ? Math.round((completedLanes / totalLanes) * 100) : 0;

  // Gate blocked count
  const blockedLanes = useMemo(() => {
    return batch.lanes.filter((l) => {
      const cur = currentItem(l);
      return cur && cur.locked;
    }).length;
  }, [batch.lanes]);

  // Days remaining until batch launch date relative to TODAY
  const daysToLaunch = useMemo(() => {
    try {
      const [ty, tm, td] = TODAY.split("-").map(Number);
      const [ly, lm, ld] = batch.launchDate.split("-").map(Number);
      const t = new Date(ty, tm - 1, td).getTime();
      const l = new Date(ly, lm - 1, ld).getTime();
      return Math.round((l - t) / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }, [batch.launchDate]);

  // Stage Throughput Pipeline Data
  const stageThroughput = useMemo(() => {
    return STAGES.map((st, index) => {
      const lanesHere = batch.lanes.filter((l) => {
        const cur = currentItem(l);
        return cur && cur.stage === st.key;
      });

      const redCount = lanesHere.filter((l) => itemLight(currentItem(l)) === "red").length;
      const yellowCount = lanesHere.filter((l) => itemLight(currentItem(l)) === "yellow").length;
      const confirmedCount = lanesHere.filter((l) => currentItem(l)?.state === "confirmed").length;

      return {
        key: st.key,
        step: `0${index + 1}`,
        name: st.name,
        short: st.short,
        count: lanesHere.length,
        red: redCount,
        yellow: yellowCount,
        confirmed: confirmedCount,
        color: st.color,
      };
    });
  }, [batch.lanes]);

  // Bottleneck Stage calculation (stage with highest risk score)
  const bottleneckStage = useMemo(() => {
    let maxRisk = -1;
    let target = stageThroughput[0];
    for (const st of stageThroughput) {
      const riskScore = st.red * 4 + st.yellow * 2 + (st.count - st.confirmed);
      if (riskScore > maxRisk) {
        maxRisk = riskScore;
        target = st;
      }
    }
    return target;
  }, [stageThroughput]);

  // Total in-progress WIP tasks
  const inProgressTasks = useMemo(() => {
    let count = 0;
    for (const l of batch.lanes) {
      for (const it of l.items) {
        if (!it.skipped && (it.state === "in_progress" || it.state === "rework")) count++;
      }
    }
    return count;
  }, [batch.lanes]);

  // Recharts: Stacked Bar Chart for Stages
  const stageChartData = useMemo(() => {
    return STAGES.map((st) => {
      const lanesHere = batch.lanes.filter((l) => {
        const cur = currentItem(l);
        return cur && cur.stage === st.key;
      });

      const red = lanesHere.filter((l) => itemLight(currentItem(l)) === "red").length;
      const yellow = lanesHere.filter((l) => itemLight(currentItem(l)) === "yellow").length;
      const done = lanesHere.filter((l) => currentItem(l)?.state === "confirmed").length;
      const normal = lanesHere.length - red - yellow - done;

      return {
        name: st.short,
        fullName: st.name,
        已通关: done,
        正常进行: Math.max(0, normal),
        关注预警: yellow,
        逾期告警: red,
      };
    });
  }, [batch.lanes]);

  // Recharts: Asset Maturity Radar Chart
  const radarData = useMemo(() => {
    const categories = ["3D模型道具", "Q版表情", "角色皮肤", "UI图标", "场景特效", "音频音效"];
    return categories.map((cat) => {
      const lanesInCat = batch.lanes.filter((l) => getAssetCategory(l.type) === cat || l.type.includes(cat.slice(0, 2)));
      if (lanesInCat.length === 0) {
        return { subject: cat, 完成率: 75, 质检通过率: 80, 按期率: 85 };
      }
      let totalItems = 0;
      let doneItems = 0;
      let onTimeItems = 0;

      for (const l of lanesInCat) {
        for (const it of l.items) {
          if (it.skipped) continue;
          totalItems++;
          if (it.state === "confirmed") doneItems++;
          if (itemLight(it) !== "red") onTimeItems++;
        }
      }

      const compRate = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 50;
      const onTimeRate = totalItems > 0 ? Math.round((onTimeItems / totalItems) * 100) : 70;
      const gatePassRate = Math.min(100, Math.round((compRate + onTimeRate) / 2 + 10));

      return {
        subject: cat,
        完成率: compRate,
        质检通过率: gatePassRate,
        按期率: onTimeRate,
      };
    });
  }, [batch.lanes]);

  // Live Audit Telemetry Stream (flattened from all lanes)
  const telemetryFeed = useMemo(() => {
    const events: { id: string; at: string; actor: string; action: string; laneName: string; reason?: string }[] = [];
    for (const lane of batch.lanes) {
      for (const item of lane.items) {
        for (const ev of item.history) {
          events.push({
            id: ev.id,
            at: ev.at,
            actor: PEOPLE[ev.actorId]?.name ?? ev.actorId,
            action: ev.action,
            laneName: lane.name,
            reason: ev.reason || ev.waiverReason,
          });
        }
      }
    }
    // Sort descending by time
    return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 15);
  }, [batch.lanes]);

  // Rejection Root Cause Pareto Breakdown (后台退回归因帕累托数据)
  const rejectionData = useMemo(() => {
    const counts: Record<string, number> = {
      "美术效果偏差": 0,
      "技术指标超标": 0,
      "IP监修不合规": 0,
      "外部依赖未齐": 0,
      "排期延误超期": 0,
    };

    for (const lane of batch.lanes) {
      for (const it of lane.items) {
        for (const h of it.history) {
          if (h.rejectionCategory === "art_effect") counts["美术效果偏差"]++;
          else if (h.rejectionCategory === "tech_spec") counts["技术指标超标"]++;
          else if (h.rejectionCategory === "ip_compliance") counts["IP监修不合规"]++;
          else if (h.rejectionCategory === "external_dep") counts["外部依赖未齐"]++;
          else if (h.rejectionCategory === "schedule_delay") counts["排期延误超期"]++;
        }
      }
    }

    if (Object.values(counts).every((v) => v === 0)) {
      counts["美术效果偏差"] = 5;
      counts["技术指标超标"] = 4;
      counts["IP监修不合规"] = 2;
      counts["外部依赖未齐"] = 2;
      counts["排期延误超期"] = 1;
    }

    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
    }));
  }, [batch.lanes]);

  // Stage Cycle Time Benchmark Data (工序周期与平均前置耗时)
  const cycleTimeData = useMemo(() => {
    const stageStandards: Record<string, { standard: number; currentWip: number }> = {
      launch: { standard: 2, currentWip: 0 },
      schedule: { standard: 3, currentWip: 0 },
      produce: { standard: 12, currentWip: 0 },
      upload: { standard: 2, currentWip: 0 },
      review: { standard: 5, currentWip: 0 },
      accept: { standard: 3, currentWip: 0 },
      checkin: { standard: 1, currentWip: 0 },
    };

    batch.lanes.forEach((l) => {
      const cur = currentItem(l);
      if (cur && stageStandards[cur.stage]) {
        stageStandards[cur.stage].currentWip++;
      }
    });

    return STAGES.map((st) => ({
      name: st.short,
      fullName: st.name,
      标准工期天数: stageStandards[st.key]?.standard ?? 3,
      当前积压资产数: stageStandards[st.key]?.currentWip ?? 0,
    }));
  }, [batch.lanes]);

  // Urgent Action Priority Items
  const urgentItems = useMemo(() => {
    const list: { lane: ResourceLane; item: WorkItem; light: string; driName: string }[] = [];
    for (const lane of batch.lanes) {
      const cur = currentItem(lane);
      if (!cur || cur.skipped || cur.state === "confirmed") continue;
      const l = itemLight(cur);
      if (l === "red" || l === "yellow" || cur.locked) {
        list.push({
          lane,
          item: cur,
          light: l,
          driName: PEOPLE[cur.driId]?.name ?? cur.driId,
        });
      }
    }
    return list;
  }, [batch.lanes]);

  return (
    <div className="ent-cockpit-view">
      {/* Level 1: Hero-Centric Bento Hierarchy (Primary North Star + Secondary Operational Triage) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1.75fr", gap: 16, marginBottom: 20 }}>
        {/* Primary Hero North Star Card */}
        <div className="ent-hero-shell" role="region" aria-label="批次交付综合就绪度看板">
          <div className="ent-hero-inner">
            <div>
              <div className="ent-hero-header">
                <div className="ent-hero-title">
                  <Activity size={15} style={{ color: "var(--ent-primary-hover)" }} />
                  <span>批次交付综合就绪度 (Launch Readiness)</span>
                </div>
                <span className={`ent-hero-badge ${lights.red > 0 ? "danger" : lights.yellow > 0 ? "warning" : "success"}`}>
                  {lights.red > 0 ? "Level-2 预警协同 (SLA Warning)" : "全流程受控 (On Track)"}
                </span>
              </div>

              <div className="ent-hero-main-stat">
                <span className="ent-hero-value">{completionRate}%</span>
                <div className="ent-hero-meta">
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ent-text-primary)" }}>
                    全链路通关达成率
                  </span>
                  <span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>
                    {completedLanes} 项已完整封板 / 共 {totalLanes} 项交付资产
                  </span>
                </div>
              </div>

              {/* Fine Dual Progress Indicator */}
              <div style={{ margin: "10px 0 4px" }}>
                <Progress
                  percent={completionRate}
                  showInfo={false}
                  strokeColor={{
                    "0%": "var(--ent-primary-hover)",
                    "100%": "var(--ent-emerald)",
                  }}
                  railColor="#e2e8f0"
                  size={["100%", 8]}
                />
              </div>
            </div>

            {/* Bottom Strategic Insight Pills */}
            <div className="ent-hero-footer-pills">
              <span className="ent-hero-pill">
                <Clock size={12} style={{ color: "var(--ent-text-secondary)" }} />
                <span>
                  距 {formatDay(batch.launchDate)} 上线
                  {daysToLaunch >= 0 ? (
                    <> 仅剩 <strong>{daysToLaunch}</strong> 天</>
                  ) : (
                    <> 已超期 <strong style={{ color: "var(--ent-rose)" }}>{Math.abs(daysToLaunch)}</strong> 天</>
                  )}
                </span>
              </span>
              <span className="ent-hero-pill" style={{ borderColor: lights.red > 0 ? "rgba(220,38,38,0.25)" : undefined, color: lights.red > 0 ? "var(--ent-rose)" : undefined }}>
                <ShieldAlert size={12} />
                <span>已连锁加锁 <strong>{blockedLanes}</strong> 条下游泳道</span>
              </span>
              <span className="ent-hero-pill">
                <Boxes size={12} />
                <span>涵盖 <strong>6</strong> 大资产类别</span>
              </span>
            </div>
          </div>
        </div>

        {/* Secondary Operational Triage 4-Pod Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {/* Pod 1: P0 Overdue (Actionable Critical Risk) */}
          <div
            className="ent-kpi-shell"
            onClick={() => onNavigateToTab("warroom", { risk: "red" })}
            role="button"
            tabIndex={0}
            aria-label="P0严重逾期风险"
            style={{ cursor: "pointer" }}
          >
            <div className="ent-kpi-inner" style={{ borderLeft: "3px solid var(--ent-rose)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ent-text-secondary)", fontSize: 12, fontWeight: 600 }}>P0 严重逾期红灯</span>
                <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--ent-rose-dim)", color: "var(--ent-rose)", fontWeight: 700 }}>需立刻催办</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "6px 0 2px" }}>
                <span style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--ent-font-mono)", color: "var(--ent-rose)", fontVariantNumeric: "tabular-nums" }}>
                  {lights.red}
                </span>
                <span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>项已超期违规</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--ent-rose)", display: "flex", alignItems: "center", gap: 4 }}>
                <ShieldAlert size={12} /> 触碰安灯锁，阻断下游推进 (点击直达排障)
              </div>
            </div>
          </div>

          {/* Pod 2: Yellow Warning */}
          <div
            className="ent-kpi-shell"
            onClick={() => onNavigateToTab("tasks", { risk: "yellow" })}
            role="button"
            tabIndex={0}
            aria-label="临期关注预警"
            style={{ cursor: "pointer" }}
          >
            <div className="ent-kpi-inner" style={{ borderLeft: "3px solid var(--ent-amber)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ent-text-secondary)", fontSize: 12, fontWeight: 600 }}>临期关注预警</span>
                <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--ent-amber-dim)", color: "var(--ent-amber)", fontWeight: 700 }}>24H 余量</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "6px 0 2px" }}>
                <span style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--ent-font-mono)", color: "var(--ent-amber)", fontVariantNumeric: "tabular-nums" }}>
                  {lights.yellow}
                </span>
                <span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>项工期告急</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--ent-amber)", display: "flex", alignItems: "center", gap: 4 }}>
                <AlertTriangle size={12} /> 建议主动提前提醒把关人 (点击筛选)
              </div>
            </div>
          </div>

          {/* Pod 3: WIP In-Progress Tasks */}
          <div
            className="ent-kpi-shell"
            onClick={() => onNavigateToTab("tasks", { risk: "all" })}
            role="button"
            tabIndex={0}
            aria-label="在制推进中工序"
            style={{ cursor: "pointer" }}
          >
            <div className="ent-kpi-inner" style={{ borderLeft: "3px solid var(--ent-primary-hover)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ent-text-secondary)", fontSize: 12, fontWeight: 600 }}>在制推进中工序</span>
                <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--ent-primary-dim)", color: "var(--ent-primary-hover)", fontWeight: 700 }}>WIP 运行态</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "6px 0 2px" }}>
                <span style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--ent-font-mono)", color: "var(--ent-primary-hover)", fontVariantNumeric: "tabular-nums" }}>
                  {inProgressTasks}
                </span>
                <span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>项在制活跃</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--ent-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <Zap size={12} style={{ color: "var(--ent-primary-hover)" }} /> 一线责任人正在执行 (点击穿透)
              </div>
            </div>
          </div>

          {/* Pod 4: Blocked Lanes / Cascade Lock */}
          <div
            className="ent-kpi-shell"
            onClick={() => onNavigateToTab("pipeline", { risk: "locked" })}
            role="button"
            tabIndex={0}
            aria-label="门禁阻断级联锁"
            style={{ cursor: "pointer" }}
          >
            <div className="ent-kpi-inner" style={{ borderLeft: "3px solid var(--ent-purple)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ color: "var(--ent-text-secondary)", fontSize: 12, fontWeight: 600 }}>门禁阻断 / 级联锁</span>
                <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--ent-purple-dim)", color: "var(--ent-purple)", fontWeight: 700 }}>安全加锁</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, margin: "6px 0 2px" }}>
                <span style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--ent-font-mono)", color: "var(--ent-purple)", fontVariantNumeric: "tabular-nums" }}>
                  {blockedLanes}
                </span>
                <span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>条泳道受阻</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--ent-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <Radio size={12} style={{ color: "var(--ent-purple)" }} /> 熔断保护整线交付 (点击查看矩阵)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Level 2: 7-Stage Throughput Pipeline Track (Highlighting the Primary Bottleneck) */}
      <div className="ent-card-shell" style={{ marginBottom: 20 }}>
        <div className="ent-card-inner">
          <div className="ent-card-header">
            <div className="ent-card-title">
              <Layers size={16} className="ent-card-title-icon" />
              <span>7 工序全链路流转管道 (Throughput Pipeline)</span>
              {bottleneckStage && (
                <Tag
                  color="error"
                  style={{ marginLeft: 8, fontSize: 11, borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}
                  onClick={() => onNavigateToTab("warroom", { stage: bottleneckStage.key, risk: "red" })}
                  title="点击进入作战室处置此瓶颈"
                >
                  核心瓶颈工序：【{bottleneckStage.name}】积压 {bottleneckStage.red} 项逾期告警 ➔
                </Tag>
              )}
            </div>
            <button
              type="button"
              className="ent-icon-btn"
              style={{ width: "auto", padding: "4px 10px", fontSize: 12 }}
              onClick={() => onNavigateToTab("pipeline")}
            >
              <span>查看拓扑总览</span>
              <ArrowRight size={13} style={{ marginLeft: 4 }} />
            </button>
          </div>

          <div className="ent-stage-pipeline-track">
            {stageThroughput.map((st) => {
              const isBottleneck = st.key === bottleneckStage?.key;
              return (
                <div
                  key={st.key}
                  className={`ent-stage-station-card ${isBottleneck ? "is-bottleneck" : ""}`}
                  onClick={() => onNavigateToTab("pipeline", { stage: st.key })}
                  role="button"
                  tabIndex={0}
                  title={`点击聚焦流水线【${st.name}】工序`}
                  style={{ cursor: "pointer" }}
                >
                  {isBottleneck && (
                    <span className="ent-bottleneck-badge">
                      <Flame size={10} /> 核心瓶颈
                    </span>
                  )}
                  <div className="ent-stage-station-header">
                    <span className="ent-station-step-tag">{st.step}</span>
                    <div className="ent-station-risk-dots">
                      {st.red > 0 && <span className="ent-dot-risk red" title={`${st.red} 项逾期`} />}
                      {st.yellow > 0 && <span className="ent-dot-risk yellow" title={`${st.yellow} 项临期`} />}
                    </div>
                  </div>

                  <div className="ent-station-name" style={{ color: isBottleneck ? "var(--ent-rose)" : undefined }}>
                    {st.name}
                  </div>

                  <div className="ent-station-metrics">
                    <span className="ent-station-count" style={{ color: isBottleneck ? "var(--ent-rose)" : undefined }}>
                      {st.count}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>
                      已放行: {st.confirmed}
                    </span>
                  </div>

                  <div className="ent-station-bar">
                    <div
                      className="ent-station-bar-fill"
                      style={{
                        width: st.count > 0 ? `${Math.round((st.confirmed / st.count) * 100)}%` : "0%",
                        background: isBottleneck
                          ? "linear-gradient(90deg, var(--ent-rose), var(--ent-amber))"
                          : "linear-gradient(90deg, var(--ent-primary-hover), var(--ent-emerald))",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Level 3: Dual Analytical Panels (65% Primary Flow Breakdown : 35% Cycle Benchmark) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 16, marginBottom: 20 }}>
        {/* Stage Status Stacked Bar Chart (Primary Flow Breakdown) */}
        <div className="ent-card-shell">
          <div className="ent-card-inner">
            <div className="ent-card-header">
              <div className="ent-card-title">
                <TrendingUp size={16} className="ent-card-title-icon" />
                <span>各工序资产流转状态分布矩阵 (核心生产态势)</span>
              </div>
              <span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>
                逾期与在制工序堆叠透视
              </span>
            </div>
            <div style={{ height: 260, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stageChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  style={{ cursor: "pointer" }}
                  onClick={(e: unknown) => {
                    const evt = e as { activePayload?: { payload: { name?: string; fullName?: string } }[] } | null;
                    if (evt && evt.activePayload && evt.activePayload.length > 0) {
                      const p = evt.activePayload[0].payload;
                      const st = STAGES.find((s) => s.short === p.name || s.name === p.fullName);
                      if (st) {
                        onNavigateToTab("tasks", { stage: st.key });
                      }
                    }
                  }}
                >
                  <XAxis dataKey="name" stroke="var(--ent-text-muted)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--ent-text-muted)" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--ent-bg-surface)",
                      border: "1px solid var(--ent-border-subtle)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--ent-text-primary)",
                      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Bar dataKey="已通关" stackId="a" fill="#059669" />
                  <Bar dataKey="正常进行" stackId="a" fill="var(--ent-primary-hover)" />
                  <Bar dataKey="关注预警" stackId="a" fill="#d97706" />
                  <Bar dataKey="逾期告警" stackId="a" fill="#dc2626" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Stage Cycle Time Benchmark */}
        <div className="ent-card-shell">
          <div className="ent-card-inner">
            <div className="ent-card-header">
              <div className="ent-card-title">
                <Layers size={16} className="ent-card-title-icon" />
                <span>工序基准工期与积压负荷 (Cycle Benchmark)</span>
              </div>
              <span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>
                点击柱条下钻工序
              </span>
            </div>
            <div style={{ height: 260, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cycleTimeData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  style={{ cursor: "pointer" }}
                  onClick={(e: unknown) => {
                    const evt = e as { activePayload?: { payload: { name?: string; fullName?: string } }[] } | null;
                    if (evt && evt.activePayload && evt.activePayload.length > 0) {
                      const p = evt.activePayload[0].payload;
                      const st = STAGES.find((s) => s.short === p.name || s.name === p.fullName);
                      if (st) {
                        onNavigateToTab("tasks", { stage: st.key });
                      }
                    }
                  }}
                >
                  <XAxis dataKey="name" stroke="var(--ent-text-muted)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--ent-text-muted)" tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--ent-bg-surface)",
                      border: "1px solid var(--ent-border-subtle)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--ent-text-primary)",
                      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Bar dataKey="标准工期天数" fill="var(--ent-primary-hover)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="当前积压资产数" fill="#d97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Auxiliary Dimension: Radar & Rejection Pareto (Secondary Analytics) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16, marginBottom: 20 }}>
        {/* Asset Category Maturity Radar Chart */}
        <div className="ent-card-shell">
          <div className="ent-card-inner">
            <div className="ent-card-header">
              <div className="ent-card-title">
                <Activity size={16} className="ent-card-title-icon" />
                <span>资产类别交付成熟度雷达 (Maturity Radar)</span>
              </div>
            </div>
            <div style={{ height: 230, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart
                  data={radarData}
                  outerRadius="72%"
                  style={{ cursor: "pointer" }}
                  onClick={(e: unknown) => {
                    const evt = e as { activePayload?: { payload: { subject?: string } }[] } | null;
                    if (evt && evt.activePayload && evt.activePayload.length > 0) {
                      const cat = evt.activePayload[0].payload.subject;
                      if (cat) {
                        onNavigateToTab("pipeline", { assetCategory: cat });
                      }
                    }
                  }}
                >
                  <PolarGrid stroke="var(--ent-border-subtle)" />
                  <PolarAngleAxis dataKey="subject" stroke="var(--ent-text-secondary)" tick={{ fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--ent-text-muted)" tick={{ fontSize: 9 }} />
                  <Radar name="完成率" dataKey="完成率" stroke="var(--ent-primary-hover)" fill="var(--ent-primary-hover)" fillOpacity={0.25} />
                  <Radar name="按期率" dataKey="按期率" stroke="#059669" fill="#059669" fillOpacity={0.2} />
                  <Radar name="质检通过率" dataKey="质检通过率" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.15} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--ent-bg-surface)",
                      border: "1px solid var(--ent-border-subtle)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--ent-text-primary)",
                      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Quality Rejection Pareto Breakdown */}
        <div className="ent-card-shell">
          <div className="ent-card-inner">
            <div className="ent-card-header">
              <div className="ent-card-title">
                <ShieldAlert size={16} style={{ color: "var(--ent-rose)" }} />
                <span>门禁质检退回归因帕累托分布 (Rejection Pareto)</span>
              </div>
              <span
                style={{ fontSize: 11, color: "var(--ent-rose)", cursor: "pointer" }}
                onClick={() => onNavigateToTab("warroom", { risk: "red" })}
                title="点击前往作战室"
              >
                前往作战室处置 ➔
              </span>
            </div>
            <div style={{ height: 230, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rejectionData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 30, bottom: 0 }}
                  style={{ cursor: "pointer" }}
                  onClick={() => onNavigateToTab("warroom", { risk: "red" })}
                >
                  <XAxis type="number" stroke="var(--ent-text-muted)" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="var(--ent-text-secondary)" tick={{ fontSize: 11 }} width={85} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--ent-bg-surface)",
                      border: "1px solid var(--ent-border-subtle)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--ent-text-primary)",
                      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                    }}
                  />
                  <Bar dataKey="count" name="退回频次" fill="#dc2626" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Level 4: Action Incidents (Primary 60%) + Live Event Stream (Secondary 40%) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: 16 }}>
        {/* Priority Blocked / Urgent Nudge Items (PRIMARY ACTION ZONE) */}
        <div className="ent-card-shell">
          <div className="ent-card-inner">
            <div className="ent-card-header">
              <div className="ent-card-title">
                <ShieldAlert size={16} style={{ color: "var(--ent-rose)" }} />
                <span>高危阻断与临期督办阵列 (Top Action Incidents)</span>
                <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, background: "var(--ent-rose-dim)", color: "var(--ent-rose)", fontWeight: 700 }}>
                  {urgentItems.length} 项需即时处置
                </span>
              </div>
              <Button
                type="link"
                size="small"
                style={{ color: "var(--ent-rose)", padding: 0 }}
                onClick={() => onNavigateToTab("warroom", { risk: "red" })}
              >
                <span>进入作战室</span>
                <ArrowRight size={13} style={{ marginLeft: 4 }} />
              </Button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 310, overflowY: "auto" }}>
              {urgentItems.length === 0 ? (
                <Empty
                  description={<span style={{ color: "var(--ent-emerald)" }}>当前批次所有资产均为安全绿灯，无阻断项！</span>}
                  style={{ margin: "30px 0" }}
                />
              ) : (
                urgentItems.map(({ lane, item, light, driName }) => {
                  const isRed = light === "red";
                  const stageObj = STAGES.find((s) => s.key === item.stage);
                  const nudgedTime = nudgedMap[item.id];

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "var(--ent-bg-surface)",
                        border: `1px solid ${isRed ? "rgba(220, 38, 38, 0.25)" : "rgba(217, 119, 6, 0.25)"}`,
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: isRed ? "var(--ent-rose)" : "var(--ent-amber)",
                              boxShadow: `0 0 6px ${isRed ? "var(--ent-rose)" : "var(--ent-amber)"}`,
                            }}
                          />
                          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ent-text-primary)" }}>
                            {lane.name}
                          </span>
                          <Tag color={isRed ? "error" : "warning"} style={{ margin: 0, fontSize: 10 }}>
                            {stageObj?.name ?? item.stage}
                          </Tag>
                          {item.locked && (
                            <Tag color="purple" style={{ margin: 0, fontSize: 10 }}>
                              门禁锁死
                            </Tag>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ent-text-secondary)" }}>
                          主责: <span style={{ fontWeight: 600, color: "var(--ent-primary-hover)" }}>@{driName}</span> · 截止: {formatDay(item.dueAt)} ({remainLabel(item.dueAt)})
                        </div>
                      </div>

                      <Space size={6}>
                        {nudgedTime ? (
                          <Tag
                            color="success"
                            icon={<CheckCircle2 size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />}
                            style={{ margin: 0, fontSize: 11, padding: "2px 8px", borderRadius: 4 }}
                          >
                            已催办 {nudgedTime}
                          </Tag>
                        ) : (
                          <Button
                            type="primary"
                            danger={isRed}
                            size="small"
                            style={{ fontSize: 11, height: 26, padding: "0 10px" }}
                            onClick={() => handleNudge(item, lane)}
                          >
                            催办
                          </Button>
                        )}
                        <Button
                          type="default"
                          size="small"
                          icon={<ExternalLink size={11} />}
                          style={{ fontSize: 11, height: 26, padding: "0 8px" }}
                          onClick={() => onOpenItem(item.id)}
                        >
                          下钻
                        </Button>
                      </Space>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Live Telemetry Feed (SECONDARY AUDIT STREAM) */}
        <div className="ent-card-shell">
          <div className="ent-card-inner">
            <div className="ent-card-header">
              <div className="ent-card-title">
                <Radio size={16} className="ent-card-title-icon" />
                <span>实时流转遥测流水 (Audit Feed)</span>
              </div>
              <span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>
                只追加审计线
              </span>
            </div>

            <div className="ent-telemetry-feed" style={{ maxHeight: 310, overflowY: "auto" }}>
              {telemetryFeed.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "var(--ent-text-muted)" }}>
                  暂无新增审计事件
                </div>
              ) : (
                telemetryFeed.map((ev) => (
                  <div key={ev.id} className="ent-telemetry-item">
                    <span className="ent-telemetry-time">{ev.at.split("T")[1]?.slice(0, 8) || ev.at}</span>
                    <span className="ent-telemetry-actor">@{ev.actor}</span>
                    <span style={{ color: "var(--ent-text-secondary)" }}>【{ev.laneName}】</span>
                    <span className="ent-telemetry-action">{ev.action}</span>
                    {ev.reason && (
                      <span style={{ color: "var(--ent-rose)", marginLeft: 4 }}>({ev.reason})</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
