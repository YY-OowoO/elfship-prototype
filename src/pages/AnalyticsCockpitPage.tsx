import { useMemo, useState } from "react";
import {
  Button,
  Progress,
  Segmented,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import {
  CheckCircle,
  WarningOctagon,
  SlidersHorizontal,
  Sparkle,
} from "../icons";
import { EmotionBall, dispatchElfEvent } from "../emotion-ball";
import { PEOPLE, STAGES } from "../mock";
import { itemLight } from "../logic";
import type { LaunchBatch, PersonId, ResourceLane, StageKey, WorkItem } from "../types";
import { playSound } from "../sound";

const { Title, Text } = Typography;

export function AnalyticsCockpitPage({
  batch,
  onOpenItem: _onOpenItem,
  onNudge: _onNudge,
}: {
  batch: LaunchBatch;
  onOpenItem?: (id: string) => void;
  onNudge?: (item: WorkItem, lane: ResourceLane) => void;
}) {
  const [timeRange, setTimeRange] = useState<"current" | "history">("current");

  const lanes = batch.lanes;
  const allItems = lanes.flatMap((l) => l.items);
  const totalSteps = allItems.length;
  const confirmedSteps = allItems.filter((i) => i.state === "confirmed" || i.skipped).length;
  const redSteps = allItems.filter((i) => i.state !== "confirmed" && !i.skipped && itemLight(i) === "red").length;
  const isHistory = timeRange === "history";
  const throughputPct = isHistory ? 94 : totalSteps > 0 ? Math.round((confirmedSteps / totalSteps) * 100) : 0;
  const leadTimeVal = isHistory ? 2.40 : 1.85;
  const firstPassVal = isHistory ? 84.3 : 88.5;
  const reworkRateVal = isHistory ? 9.8 : 6.4;

  // 1. Stage Lead Time / Cycle Time Data
  const stageLeadTimeData = useMemo(() => {
    const baseStandards: Record<StageKey, number> = {
      launch: 1.0,
      schedule: 1.5,
      produce: 3.0,
      upload: 1.0,
      review: 2.0,
      accept: 1.5,
      checkin: 1.0,
    };
    const actualAverages: Record<StageKey, number> = isHistory
      ? {
          launch: 1.1,
          schedule: 1.6,
          produce: 4.2,
          upload: 1.4,
          review: 2.8,
          accept: 1.9,
          checkin: 1.2,
        }
      : {
          launch: 0.8,
          schedule: 1.2,
          produce: 3.8, // Bottleneck
          upload: 1.1,
          review: 2.3,
          accept: 1.4,
          checkin: 0.9,
        };

    return STAGES.map((s) => ({
      stageKey: s.key,
      name: s.name,
      short: s.short,
      actual: actualAverages[s.key] ?? 2.0,
      standard: baseStandards[s.key] ?? 2.0,
      isBottleneck: (actualAverages[s.key] ?? 0) > (baseStandards[s.key] ?? 0) + 0.3,
    }));
  }, [isHistory]);

  // 2. DRI Capacity & Load Matrix Data
  const driLoadData = useMemo(() => {
    const map = new Map<
      PersonId,
      { name: string; title: string; confirmed: number; inProgress: number; risk: number; watch: number }
    >();

    Object.entries(PEOPLE).forEach(([pid, person]) => {
      map.set(pid as PersonId, {
        name: person.name,
        title: person.title,
        confirmed: isHistory ? Math.floor(Math.random() * 15) + 8 : 0,
        inProgress: isHistory ? Math.floor(Math.random() * 3) : 0,
        risk: isHistory ? (pid === "zhongzhiyong" ? 1 : 0) : 0,
        watch: isHistory ? 1 : 0,
      });
    });

    if (!isHistory) {
      allItems.forEach((item) => {
        const rec = map.get(item.driId as PersonId);
        if (!rec) return;
        if (item.state === "confirmed" || item.skipped) {
          rec.confirmed += 1;
        } else {
          const light = itemLight(item);
          if (light === "red") rec.risk += 1;
          else if (light === "yellow") rec.watch += 1;
          else rec.inProgress += 1;
        }
      });
    }

    return Array.from(map.values()).filter((d) => d.confirmed + d.inProgress + d.risk + d.watch > 0);
  }, [allItems, isHistory]);

  // 3. Defect & Rework Attribution Data
  const defectData = useMemo(() => {
    return isHistory
      ? [
          { name: "3D 拓扑面数/顶点超标", value: 34, count: 42, color: "#ff4d4f" },
          { name: "贴图通道缺失/命名不合规", value: 28, count: 35, color: "#faad14" },
          { name: "策划数值/设计需求微调", value: 22, count: 27, color: "#1677ff" },
          { name: "引擎 Shader 兼容性问题", value: 16, count: 20, color: "#722ed1" },
        ]
      : [
          { name: "3D 拓扑面数/顶点超标", value: 38, count: 8, color: "#ff4d4f" },
          { name: "贴图通道缺失/命名不合规", value: 26, count: 5, color: "#faad14" },
          { name: "策划数值/设计需求微调", value: 20, count: 4, color: "#1677ff" },
          { name: "引擎 Shader 兼容性问题", value: 16, count: 3, color: "#722ed1" },
        ];
  }, [isHistory]);

  // 4. Burndown Velocity Data
  const burndownData = useMemo(() => {
    return isHistory
      ? [
          { day: "W1 启动", ideal: 920, actual: 920 },
          { day: "W2 原画", ideal: 740, actual: 780 },
          { day: "W3 建模", ideal: 560, actual: 610 },
          { day: "W4 审核", ideal: 380, actual: 395 },
          { day: "W5 验收", ideal: 190, actual: 160 },
          { day: "W6 封包", ideal: 0, actual: 12 },
        ]
      : [
          { day: "08-11 (D1)", ideal: 142, actual: 142 },
          { day: "08-13 (D3)", ideal: 120, actual: 128 },
          { day: "08-15 (D5)", ideal: 98, actual: 104 },
          { day: "08-18 (D7)", ideal: 76, actual: 82 },
          { day: "08-20 (D9)", ideal: 54, actual: 58 },
          { day: "08-22 (D11)", ideal: 24, actual: 32 },
          { day: "08-24 (今日)", ideal: 12, actual: 18 },
          { day: "08-26 (终审)", ideal: 0, actual: null },
        ];
  }, [isHistory]);

  return (
    <div className="analytics-cockpit-page view-in">
      {/* 1. Header Banner */}
      <div className="analytics-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Title level={3} style={{ margin: 0, fontWeight: 800, letterSpacing: "-0.02em" }}>
              研发交付效能指挥大盘
            </Title>
            <Tag color="purple" style={{ fontWeight: 600, fontSize: 11 }}>
              Executive Delivery Cockpit
            </Tag>
          </div>
          <Text type="secondary" style={{ fontSize: 13 }}>
            多维研发工序通量、工序流转周期（Lead Time）、人效负载与质量返修归因深度分析
          </Text>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Segmented
            value={timeRange}
            onChange={(v) => {
              setTimeRange(v as "current" | "history");
              playSound.click();
            }}
            options={[
              { label: "当前【2.4 版本上线】批次", value: "current" },
              { label: "全项目历史基线对比", value: "history" },
            ]}
          />
        </div>
      </div>

      {/* 2. Top 4 Core Delivery KPIs */}
      <div className="analytics-kpi-grid">
        <div className="analytics-kpi-card">
          <div className="akpi-head">
            <span className="akpi-title">批次交付通量</span>
            <Tag color="blue">Throughput</Tag>
          </div>
          <div className="akpi-val-row">
            <span className="akpi-num text-blue">{throughputPct}%</span>
            <span className="akpi-sub">
              {isHistory ? "860/915 步 (历史累计)" : `${confirmedSteps}/${totalSteps} 步`}
            </span>
          </div>
          <Progress percent={throughputPct} size="small" strokeColor="#1677ff" showInfo={false} />
          <div className="akpi-foot">
            <span>{isHistory ? "全周期历史达标率 94%" : "时间消耗 68% · 节拍整体受控"}</span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="akpi-head">
            <span className="akpi-title">平均工序周转期</span>
            <Tag color="green">Avg Lead Time</Tag>
          </div>
          <div className="akpi-val-row">
            <span className="akpi-num text-green">{leadTimeVal}</span>
            <span className="akpi-sub">工作日 / 节点</span>
          </div>
          <Progress percent={isHistory ? 60 : 74} size="small" strokeColor="#52c41a" showInfo={false} />
          <div className="akpi-foot">
            <span style={{ color: "#52c41a" }}>
              {isHistory ? "历史基线均值 2.4 天" : "优于行业基线 2.4 天 (-22.9%)"}
            </span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="akpi-head">
            <span className="akpi-title">一次性门禁通过率</span>
            <Tag color="purple">First-Pass Yield</Tag>
          </div>
          <div className="akpi-val-row">
            <span className="akpi-num text-purple">{firstPassVal}%</span>
            <span className="akpi-sub">AYON 质检</span>
          </div>
          <Progress percent={firstPassVal} size="small" strokeColor="#722ed1" showInfo={false} />
          <div className="akpi-foot">
            <span style={{ color: "#722ed1" }}>
              {isHistory ? "历史平均 84.3% 通过率" : "+4.2% 较上个版本周期提升"}
            </span>
          </div>
        </div>

        <div className="analytics-kpi-card">
          <div className="akpi-head">
            <span className="akpi-title">返修退回率</span>
            <Tag color={reworkRateVal > 8 ? "warning" : redSteps > 0 ? "error" : "success"}>Rework Rate</Tag>
          </div>
          <div className="akpi-val-row">
            <span className={`akpi-num ${reworkRateVal > 8 ? "text-blue" : redSteps > 0 ? "text-red" : "text-green"}`}>
              {reworkRateVal}%
            </span>
            <span className="akpi-sub">{isHistory ? "全阶段返修统计" : `${redSteps} 项阻塞`}</span>
          </div>
          <Progress
            percent={reworkRateVal}
            size="small"
            strokeColor={reworkRateVal > 8 ? "#faad14" : redSteps > 0 ? "#ff4d4f" : "#52c41a"}
            showInfo={false}
          />
          <div className="akpi-foot">
            <span style={{ color: redSteps > 0 ? "#ff4d4f" : "#52c41a" }}>
              {isHistory ? "历史前三大返工为拓扑、材质与命名" : redSteps > 0 ? "3D拓扑超标为主要返工源" : "处于优秀质量区间"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Deep Charts Grid */}
      <div className="analytics-charts-grid">
        {/* Chart A: Stage Lead Time & Bottleneck Analysis */}
        <div className="analytics-chart-card">
          <div className="acc-card-header">
            <div>
              <div className="acc-title">各工序节点流转耗时与卡点驻留（Lead Time 瓶颈分析）</div>
              <div className="acc-desc">柱状为各阶段资产实际停留天数 vs 计划标准天数，精准定位流转卡点</div>
            </div>
            <Tag color="cyan">工序瓶颈定位</Tag>
          </div>
          <div style={{ height: 230, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageLeadTimeData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.8)" />
                <XAxis dataKey="short" tickLine={false} axisLine={{ stroke: "#cbd5e1" }} fontSize={12} />
                <YAxis unit="d" tickLine={false} axisLine={{ stroke: "#cbd5e1" }} fontSize={11} />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="custom-recharts-tip">
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>
                          {d.name} ({d.short})
                        </div>
                        <div style={{ color: "#1677ff" }}>实际平均耗时: {d.actual} 个工作日</div>
                        <div style={{ color: "#64748b" }}>计划标准天数: {d.standard} 个工作日</div>
                        {d.isBottleneck && (
                          <div style={{ color: "#ff4d4f", marginTop: 4, fontWeight: 600 }}>
                            <WarningOctagon size={12} weight="duotone" color="#ff4d4f" style={{ marginRight: 4 }} />
                            瓶颈预警：实际耗时超出基线 20% 以上
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="actual"
                  name="实际停留天数"
                  fill="#1677ff"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                  onClick={(data: any) => {
                    playSound.click();
                    message.info({
                      content: `工序耗时分析：【${data.name}】实际平均耗时 ${data.actual} 个工作日 (基线标准 ${data.standard} 天)`,
                      icon: <CheckCircle size={14} weight="duotone" color="#1677ff" />,
                    });
                  }}
                />
                <Bar dataKey="standard" name="计划标准天数" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Team Capacity & Workload Balance */}
        <div className="analytics-chart-card">
          <div className="acc-card-header">
            <div>
              <div className="acc-title">团队与责任人人效与负荷分布 (Team Capacity Matrix)</div>
              <div className="acc-desc">各主责人当前承接工序状态结构，识别过载与空闲水位</div>
            </div>
            <Tag color="blue">负荷均衡</Tag>
          </div>
          <div style={{ height: 230, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={driLoadData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.8)" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: "#cbd5e1" }}
                  fontSize={11}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={30}
                />
                <YAxis tickLine={false} axisLine={{ stroke: "#cbd5e1" }} fontSize={11} />
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="confirmed" name="已完成" fill="#52c41a" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="inProgress" name="推进中" fill="#1677ff" stackId="a" />
                <Bar dataKey="watch" name="临期" fill="#faad14" stackId="a" />
                <Bar dataKey="risk" name="阻塞" fill="#ff4d4f" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart C: Defect & Rework Attribution */}
        <div className="analytics-chart-card">
          <div className="acc-card-header">
            <div>
              <div className="acc-title">质量缺陷与返工溯源归因 (Defect Root Causes)</div>
              <div className="acc-desc">管线门禁退回原因聚类分析，指导资产标准优化</div>
            </div>
            <Tag color="volcano">质量根因</Tag>
          </div>
          <div style={{ display: "flex", alignItems: "center", height: 230 }}>
            <div style={{ width: "50%", height: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={defectData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    cursor="pointer"
                  onClick={(entry: any) => {
                    playSound.focus();
                    message.info({
                      content: `质量归因诊断：【${entry.name}】在当前批次中共发生 ${entry.count} 次退回`,
                      icon: <WarningOctagon size={14} weight="duotone" color="#ff4d4f" />,
                    });
                  }}
                >
                    {defectData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ width: "50%", paddingRight: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {defectData.map((d) => (
                  <div
                    key={d.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 11,
                      cursor: "pointer",
                      padding: "2px 4px",
                      borderRadius: 4,
                    }}
                    onClick={() => {
                      playSound.focus();
                      message.info({
                        content: `质量归因诊断：【${d.name}】在当前批次中共发生 ${d.count} 次退回`,
                        icon: <WarningOctagon size={14} weight="duotone" color="#ff4d4f" />,
                      });
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                      <Text ellipsis={{ tooltip: d.name }} style={{ maxWidth: 120 }}>
                        {d.name}
                      </Text>
                    </div>
                    <span style={{ fontWeight: 700, color: d.color }}>{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Chart D: Burndown Velocity & Projection */}
        <div className="analytics-chart-card">
          <div className="acc-card-header">
            <div>
              <div className="acc-title">全周期燃尽趋势与交付预测 (Burndown & Velocity)</div>
              <div className="acc-desc">理想速率 vs 实际剩余工序曲线，预计交付置信度 92%</div>
            </div>
            <Tag color="green">上线预测</Tag>
          </div>
          <div style={{ height: 230, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={burndownData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.8)" />
                <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: "#cbd5e1" }} fontSize={11} />
                <YAxis unit="步" tickLine={false} axisLine={{ stroke: "#cbd5e1" }} fontSize={11} />
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="ideal"
                  name="计划理想燃尽线"
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  fill="transparent"
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  name="实际剩余未完步数"
                  stroke="#1677ff"
                  fill="rgba(22, 119, 255, 0.12)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. AI Actionable Engineering Recommendations */}
      <div className="analytics-ai-recommendations">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <EmotionBall emotion="01" size={26} interactive={false} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <span>交付精灵 AI 管线效能洞察与优化建议</span>
                <Tag color="cyan">智能诊断</Tag>
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>基于当前批次 142 道工序流转时序与返工历史大数据建模</div>
            </div>
          </div>
          <Button
            type="primary"
            size="small"
            icon={<Sparkle size={13} weight="duotone" />}
            onClick={() => {
              playSound.fanfare();
              dispatchElfEvent("diagnosis_requested", {
                message: "已自动下发 DCC 预检规则并在动作/特效组之间触发工序负载平衡调度！",
                action: "burst",
              });
              message.success("已一键采纳 AI 管线调优策略，协同流水线已完成负载平衡");
            }}
          >
            一键采纳并下发调优工单
          </Button>
        </div>

        <div className="ai-recomms-grid">
          <div className="ai-recomm-item">
            <div className="air-icon text-red">
              <WarningOctagon size={16} weight="duotone" />
            </div>
            <div className="air-content">
              <div className="air-title">3D 阶段存在平均 0.6 天周转超标</div>
              <div className="air-desc">
                主要卡点在【夏日清凉泳装·晴海】拓扑面数返修。建议在原画交付阶段前置引入 DCC 减面预检规范。
              </div>
            </div>
          </div>

          <div className="ai-recomm-item">
            <div className="air-icon text-blue">
              <SlidersHorizontal size={16} weight="duotone" />
            </div>
            <div className="air-content">
              <div className="air-title">建议平衡动作与特效环节的负荷流水线</div>
              <div className="air-desc">
                当前动作组已通关 70%，而特效组承接 5 项待办。可提前向特效组派发半成品模型开展法线与材质调试。
              </div>
            </div>
          </div>

          <div className="ai-recomm-item">
            <div className="air-icon text-green">
              <CheckCircle size={16} weight="duotone" />
            </div>
            <div className="air-content">
              <div className="air-title">终审验收置信度达 92%</div>
              <div className="air-desc">
                若今日下午完成 3D 资产放行，全批次可在目标上线日前 1 个工作日进入最终封包与灰度发布流程。
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
