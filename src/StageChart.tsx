import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Badge, Empty, Flex, Segmented, Tag, Typography } from "antd";
import { PEOPLE, STAGES } from "./mock";
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
} from "./logic";
import type { LaunchBatch, StageKey } from "./types";

const { Text } = Typography;

export function BoardInsight({
  batch,
  queue,
  activeStage,
  onOpen,
  onStage,
}: {
  batch: LaunchBatch;
  queue: QueueRow[];
  activeStage?: StageKey | null;
  onOpen: (id: string) => void;
  onStage?: (key: StageKey) => void;
}) {
  return (
    <div className="insight snap-pane">
      <QueueBoard queue={queue} onOpen={onOpen} />
      <StageProcessChart batch={batch} activeStage={activeStage} onStage={onStage} />
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
        <div className="insight-label">先处理</div>
        {queue.length > 0 && (
          <Segmented
            size="small"
            value={kindFilter}
            options={options}
            onChange={(v) => setKindFilter(v as ActionKind | "all")}
          />
        )}
      </div>
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
  );
}

function ClickableBar({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  fill,
  payload,
  onStage,
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  payload?: { stage?: StageKey; full?: string; done?: number; left?: number };
  onStage?: (key: StageKey) => void;
}) {
  if (width <= 0 || height <= 0) return null;
  const stage = payload?.stage;
  const label = payload?.full
    ? `${payload.full} ${payload.done}/${(payload.done ?? 0) + (payload.left ?? 0)}，点击筛选`
    : "节点柱";
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      rx={2}
      role="button"
      aria-label={label}
      style={{ cursor: "pointer" }}
      onClick={() => {
        if (stage) onStage?.(stage);
      }}
    />
  );
}

function StageProcessChart({
  batch,
  activeStage,
  onStage,
}: {
  batch: LaunchBatch;
  activeStage?: StageKey | null;
  onStage?: (key: StageKey) => void;
}) {
  const bars = STAGES.map((st) => {
    const r = stageRollup(batch, st.key);
    return {
      stage: st.key,
      name: st.short,
      full: st.name,
      done: r.done,
      left: Math.max(0, r.total - r.done),
      total: r.total,
      light: r.light,
    };
  });

  return (
    <div className="stage-bars">
      <div className="stage-bars-head">
        <span>节点完成</span>
        <ul className="stage-bars-legend">
          <li>
            <i className="done" />
            完成
          </li>
          <li>
            <i className="left" />
            未完成
          </li>
        </ul>
      </div>
      <div className="stage-bars-chart">
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={bars} barCategoryGap="22%" margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#edf0f3" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7380" }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "rgba(15, 98, 254, 0.06)" }}
              formatter={(value, name) => [value as number, name === "done" ? "完成" : "未完成"]}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as { full?: string } | undefined;
                return row?.full ?? "";
              }}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar
              dataKey="done"
              name="done"
              stackId="a"
              maxBarSize={36}
              cursor="pointer"
              shape={(props) => <ClickableBar {...props} onStage={onStage} />}
            >
              {bars.map((d) => (
                <Cell
                  key={d.stage}
                  fill={d.light === "red" ? "#da1e28" : d.light === "yellow" ? "#b28600" : "#007d79"}
                  opacity={!activeStage || activeStage === d.stage ? 1 : 0.32}
                />
              ))}
            </Bar>
            <Bar
              dataKey="left"
              name="left"
              stackId="a"
              maxBarSize={36}
              cursor="pointer"
              shape={(props) => <ClickableBar {...props} onStage={onStage} />}
            >
              {bars.map((d) => (
                <Cell key={d.stage} fill="#e8ebef" opacity={!activeStage || activeStage === d.stage ? 1 : 0.32} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
