import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  type TooltipContentProps,
  type TooltipValueType,
} from "recharts";
import { Badge, Empty, Flex, Segmented, Tag, Typography } from "antd";
import { PEOPLE, STAGES, TODAY } from "./mock";
import { avatar } from "./ui";
import {
  isActionKind,
  itemLight,
  queueKindCounts,
  QUEUE_KIND_META,
  remainLabel,
  stageRollup,
  type ActionKind,
  type QueueRow,
  workdaysBetween,
} from "./logic";
import type { ChartRiskType, ChartSubFilter, LaunchBatch, StageKey, WorkItem } from "./types";
import { palette } from "./tokens";
import { prefersReduce } from "./motion/prefers";

const { Text } = Typography;

const BAR_SPECS = [
  { key: "done", name: "done", fill: "url(#segDone)" },
  { key: "risk", name: "risk", fill: "url(#segRisk)" },
  { key: "safe", name: "safe", fill: palette.gray5 },
  { key: "blocked", name: "locked", fill: palette.gold },
] as const;

const SEGMENT_LABEL: Record<(typeof BAR_SPECS)[number]["name"], string> = {
  done: "完成",
  risk: "高风险",
  safe: "正常待办",
  locked: "锁定",
};

type StageMetric = {
  stage: StageKey;
  name: string;
  full: string;
  done: number;
  total: number;
  risk: number;
  safe: number;
  blocked: number;
  light: "ok" | "yellow" | "red";
  label: string;
  soon?: string;
};

function toMetric(batch: LaunchBatch, st: (typeof STAGES)[number]): StageMetric {
  const cells = batch.lanes
    .map((lane) => lane.items.find((it) => it.stage === st.key))
    .filter((it): it is WorkItem => it !== undefined && !it.skipped);

  const done = cells.filter((it) => it.state === "confirmed").length;
  const pending = cells.filter((it) => it.state !== "confirmed");
  const total = cells.length;
  const risk = pending.filter((it) => !it.locked && itemLight(it, TODAY) === "red").length;
  const blocked = pending.filter((it) => it.locked).length;
  const safe = Math.max(0, pending.length - risk - blocked);
  const soon = pending
    .filter((it) => !it.locked)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];

  const roll = stageRollup(batch, st.key, TODAY);
  const light: "ok" | "yellow" | "red" =
    risk > 0 ? "red" : roll.light === "yellow" ? "yellow" : "ok";

  return {
    stage: st.key,
    name: st.short,
    full: st.name,
    done,
    total,
    risk,
    safe,
    blocked,
    light,
    label: soon
      ? `最近${workdaysBetween(TODAY, soon.dueAt) <= 0 ? "已超期" : "截止"} ${remainLabel(soon.dueAt)}`
      : "该阶段已齐",
    soon: soon?.dueAt,
  };
}

export function BoardInsight({
  batch,
  queue,
  activeStage,
  chartFilter,
  onOpen,
  onStage,
  onSubFilter,
}: {
  batch: LaunchBatch;
  queue: QueueRow[];
  activeStage?: StageKey | null;
  chartFilter?: ChartSubFilter | null;
  onOpen: (id: string) => void;
  onStage?: (key: StageKey) => void;
  onSubFilter?: (filter: ChartSubFilter | null) => void;
}) {
  return (
    <div className="insight snap-pane">
      <QueueBoard queue={queue} onOpen={onOpen} />
      <StageProcessChart
        batch={batch}
        activeStage={activeStage}
        chartFilter={chartFilter}
        onStage={onStage}
        onSubFilter={onSubFilter}
      />
    </div>
  );
}

function QueueBoard({
  queue,
  onOpen,
}: {
  queue: QueueRow[];
  onOpen: (id: string) => void;
}) {
  const [kindFilter, setKindFilter] = useState<ActionKind | "all">("all");
  const counts = queueKindCounts(queue);
  const present = counts.filter((row) => row.value > 0);
  const rows = kindFilter === "all" ? queue : queue.filter((row) => row.kind === kindFilter);
  const options = [
    { label: `全部 ${queue.length}`, value: "all" },
    ...present.map((row) => ({ label: `${row.label} ${row.value}`, value: row.kind })),
  ];

  return (
    <div className="insight-card insight-queue" id="queue-board">
      <div className="queue-board-head">
        <div className="insight-label">
          <span>先处理</span>
          <span className="queue-badge-count">{queue.length}</span>
        </div>
        {queue.length > 0 && (
          <Segmented
            size="small"
            value={kindFilter}
            options={options}
            onChange={(v) => setKindFilter(v as ActionKind | "all")}
          />
        )}
      </div>
      <div className="queue-board-scroll">
        {rows.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={queue.length === 0 ? "暂无要先处理的事项" : "这一类没有事项"} />
        ) : (
          <Flex orientation="vertical" gap={6}>
            {rows.map((row, i) => {
              const meta = isActionKind(row.kind) ? QUEUE_KIND_META[row.kind] : null;
              const light = itemLight(row.item);
              const stage = STAGES.find((s) => s.key === row.item.stage);
              const dri = PEOPLE[row.item.driId];
              return (
                <button
                  key={row.id}
                  type="button"
                  className="queue-hit"
                  style={{ ["--i" as string]: i }}
                  onClick={() => onOpen(row.item.id)}
                >
                  <Badge status={light === "red" ? "error" : light === "yellow" ? "warning" : "default"} />
                  <Text ellipsis={{ tooltip: row.laneName }} className="queue-hit-name">
                    {row.laneName}
                  </Text>
                  <span className="queue-hit-facts">
                    <Text type="secondary" className="queue-hit-stage">
                      {stage?.short ?? row.item.stage}
                    </Text>
                    {meta && <Tag color={meta.color}>{meta.label}</Tag>}
                    <Text type={light === "red" ? "danger" : "warning"} className="queue-hit-due">
                      {remainLabel(row.item.dueAt)}
                    </Text>
                    <span className="queue-hit-dri">
                      {avatar(row.item.driId, 20)}
                      <Text type="secondary">{dri.name}</Text>
                    </span>
                  </span>
                </button>
              );
            })}
          </Flex>
        )}
      </div>
    </div>
  );
}

function ClickableBar({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill,
  payload,
  segment,
  active = true,
  onStage,
  onSubFilter,
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  segment?: (typeof BAR_SPECS)[number]["name"];
  payload?: {
    stage?: StageKey;
    full?: string;
    done?: number;
    total?: number;
    light?: string;
  };
  active?: boolean;
  onStage?: (key: StageKey) => void;
  onSubFilter?: (filter: ChartSubFilter | null) => void;
}) {
  if (width <= 0 || height <= 0) return null;
  const stage = payload?.stage;
  const total = payload?.total ?? 0;
  const done = payload?.done ?? 0;
  const label = payload?.full ? `${payload.full} · 完成 ${done}/${total}` : "节点柱";

  const dispatch = () => {
    if (stage) {
      if (onSubFilter && segment) {
        const riskType = segment === "locked" ? "blocked" : (segment as ChartRiskType);
        onSubFilter({ stage, riskType });
      } else {
        onStage?.(stage);
      }
    }
  };

  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      rx={2}
      tabIndex={0}
      className={`stage-bars-bar ${segment ? `stage-bars-bar-${segment}` : ""}`}
      data-active={active ? "1" : "0"}
      data-segment={segment}
      data-stage={stage}
      role="button"
      aria-label={label}
      style={{ cursor: "pointer" }}
      onClick={dispatch}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          dispatch();
        }
      }}
    />
  );
}

function StageMetricTooltip(props: Partial<TooltipContentProps<TooltipValueType, string | number>>) {
  const { active, payload, label } = props;
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload as StageMetric | undefined;
  if (!row) return null;

  const doneRate = row.total === 0 ? 0 : Math.round((row.done / row.total) * 100);
  const tipLabel = typeof label === "string" && label.length > 0 ? label : row.full;
  const riskState = row.light === "red" ? "有风险" : row.light === "yellow" ? "需关注" : "正常";
  return (
    <div className="stage-bars-tip">
      <div className="stage-bars-tip-head">
        <span className="stage-bars-tip-title">{tipLabel}</span>
        <span className={`stage-bars-tip-badge light-${row.light}`}>{riskState}</span>
      </div>
      <div className="stage-bars-tip-kpi">
        <span>完成率 <b>{doneRate}%</b> ({row.done}/{row.total})</span>
      </div>
      <div className="stage-bars-tip-grid">
        <div className="tip-stat"><i className="tip-dot done" /> 已完成: <b>{row.done}</b></div>
        <div className="tip-stat"><i className="tip-dot risk" /> 高风险: <b>{row.risk}</b></div>
        <div className="tip-stat"><i className="tip-dot lock" /> 锁定: <b>{row.blocked}</b></div>
        <div className="tip-stat"><i className="tip-dot safe" /> 正常待办: <b>{row.safe}</b></div>
      </div>
      {row.label ? <div className="stage-bars-tip-hint">{row.label}</div> : null}
    </div>
  );
}

function StageProcessChart({
  batch,
  activeStage,
  chartFilter,
  onStage,
  onSubFilter,
}: {
  batch: LaunchBatch;
  activeStage?: StageKey | null;
  chartFilter?: ChartSubFilter | null;
  onStage?: (key: StageKey) => void;
  onSubFilter?: (filter: ChartSubFilter | null) => void;
}) {
  const bars = useMemo(() => STAGES.map((st) => toMetric(batch, st)), [batch]);
  const totalRisk = bars.reduce((n, row) => n + row.risk, 0);
  const totalBlocked = bars.reduce((n, row) => n + row.blocked, 0);
  const totalDone = bars.reduce((n, row) => n + row.done, 0);
  const total = bars.reduce((n, row) => n + row.total, 0);
  const motionSafe = !prefersReduce();

  const valueLabel = (value: TooltipValueType | undefined, name: string | number | undefined) => {
    const n = typeof value === "number" ? value : Number(value ?? 0);
    const key = typeof name === "string" ? name : typeof name === "number" ? String(name) : "";
    const segment = key as keyof typeof SEGMENT_LABEL;
    const label = SEGMENT_LABEL[segment] ?? key;

    return [n, label] as const;
  };

  return (
    <div className="stage-bars">
      <div className="stage-bars-head">
        <div className="stage-bars-title-wrap">
          <span>节点完成</span>
          {chartFilter ? (
            <Tag
              closable
              color="blue"
              onClose={() => onSubFilter?.(null)}
              className="stage-filter-chip"
            >
              已筛选: {chartFilter.stage ? STAGES.find((s) => s.key === chartFilter.stage)?.short : "全阶段"} ·{" "}
              {chartFilter.riskType === "risk"
                ? "高风险"
                : chartFilter.riskType === "blocked"
                  ? "锁定"
                  : chartFilter.riskType === "done"
                    ? "已完成"
                    : "正常待办"}
            </Tag>
          ) : null}
        </div>
        <ul className="stage-bars-legend">
          <li onClick={() => onSubFilter?.(chartFilter?.riskType === "done" ? null : { riskType: "done" })}>
            <i className="done" />
            完成
          </li>
          <li onClick={() => onSubFilter?.(chartFilter?.riskType === "risk" ? null : { riskType: "risk" })}>
            <i className="risk" />
            高风险
          </li>
          <li onClick={() => onSubFilter?.(chartFilter?.riskType === "safe" ? null : { riskType: "safe" })}>
            <i className="left" />
            正常待办
          </li>
          <li onClick={() => onSubFilter?.(chartFilter?.riskType === "blocked" ? null : { riskType: "blocked" })}>
            <i className="lock" />
            锁定
          </li>
        </ul>
      </div>
      <div className="stage-bars-kpis">
        <span>已完成 {total > 0 ? `${Math.round((totalDone / total) * 100)}%` : "--"}</span>
        <span>高风险 {totalRisk}</span>
        <span>锁定 {totalBlocked}</span>
      </div>
      <div className={`stage-bars-chart ${activeStage || chartFilter?.stage ? "is-filtered" : ""}`}>
        <ResponsiveContainer width="100%" height={136}>
          <BarChart data={bars} barCategoryGap="20%" margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="segDone" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.green} stopOpacity={0.95} />
                <stop offset="100%" stopColor={palette.green} stopOpacity={0.55} />
              </linearGradient>
              <linearGradient id="segRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.red} stopOpacity={0.95} />
                <stop offset="100%" stopColor={palette.red} stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={palette.split} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: palette.gray }} axisLine={false} tickLine={false} />
            <Tooltip
              content={<StageMetricTooltip />}
              cursor={{ fill: "rgba(15, 98, 254, 0.06)" }}
              wrapperStyle={{ zIndex: 100, pointerEvents: "none" }}
              allowEscapeViewBox={{ x: true, y: true }}
              formatter={valueLabel}
              isAnimationActive={motionSafe}
              separator=": "
            />
            {BAR_SPECS.map((spec) => (
              <Bar
                key={spec.key}
                dataKey={spec.key}
                name={spec.name}
                stackId="a"
                maxBarSize={34}
                cursor="pointer"
                isAnimationActive={motionSafe}
                animationDuration={motionSafe ? 700 : 0}
                animationEasing="ease-out"
                shape={(props) => (
                  <ClickableBar
                    {...props}
                    segment={spec.name}
                    active={
                      (!activeStage && !chartFilter?.stage) ||
                      (chartFilter?.stage ? props.payload?.stage === chartFilter.stage : props.payload?.stage === activeStage)
                    }
                    onStage={onStage}
                    onSubFilter={onSubFilter}
                  />
                )}
              >
                {bars.map((d) => (
                  <Cell
                    key={d.stage}
                    fill={spec.fill}
                    opacity={
                      (!activeStage && !chartFilter?.stage) ||
                      (chartFilter?.stage ? chartFilter.stage === d.stage : activeStage === d.stage)
                        ? 1
                        : 0.28
                    }
                  />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
