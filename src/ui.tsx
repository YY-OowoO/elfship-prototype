import { useEffect, useState, type HTMLAttributes, type ReactNode } from "react";
import { Avatar, Button, Flex, Popover, Progress, Statistic, Tag, Tooltip, Typography } from "antd";
import { PEOPLE } from "./mock";
import { AVATAR_COLORS, ios } from "./tokens";
import { PulseLottie } from "./motion/StatusLottie";
import { formatDay, itemLight, listWorkdays, remainLabel, stateLabel, stateTone, weekdayLabel } from "./logic";
import type { PersonId, ResourceLane, WorkItem } from "./types";

const { Text } = Typography;
export const CARD_CAP = 3;

export function avatar(id: PersonId, size = 24) {
  const p = PEOPLE[id];
  const color = AVATAR_COLORS[Math.round(p.hue / 36) % AVATAR_COLORS.length];
  return (
    <Tooltip title={`${p.name} · ${p.title}`}>
      <Avatar size={size} style={{ background: color, flex: "none" }}>
        {p.initials}
      </Avatar>
    </Tooltip>
  );
}

export function Ellipsis({ children }: { children: string }) {
  return (
    <Text ellipsis={{ tooltip: children }} style={{ maxWidth: "100%" }}>
      {children}
    </Text>
  );
}

export function WorkCard({
  name,
  item,
  extra,
  onOpen,
  dragHandle,
}: {
  name: string;
  item: WorkItem;
  extra?: string;
  onOpen: () => void;
  dragHandle?: HTMLAttributes<HTMLButtonElement>;
}) {
  const light = itemLight(item);
  const due = light === "red" || light === "yellow" ? remainLabel(item.dueAt) : formatDay(item.dueAt);
  return (
    <button
      type="button"
      className={`k-card ${stateTone(item)}${light === "red" ? " red" : ""}${light === "yellow" ? " yellow" : ""}`}
      onClick={onOpen}
      {...dragHandle}
    >
      <Flex orientation="vertical" gap={4}>
        <Text strong ellipsis={{ tooltip: name }} className="k-card-name">
          {name}
        </Text>
        <Flex justify="space-between" align="center" gap={6} className="k-card-state">
          <Tag variant="filled">{extra ?? stateLabel(item)}</Tag>
          <Text
            type={light === "red" ? "danger" : light === "yellow" ? "warning" : "secondary"}
            ellipsis={{ tooltip: due }}
          >
            {due}
          </Text>
        </Flex>
        <Flex align="center" gap={6} className="k-card-who">
          {avatar(item.driId, 18)}
          <Text type="secondary" ellipsis>
            {PEOPLE[item.driId].name}
          </Text>
        </Flex>
      </Flex>
    </button>
  );
}

export function OverflowCards({
  rows,
  extraOf,
  onOpen,
  renderCard,
}: {
  rows: Array<{ lane: ResourceLane; item: WorkItem }>;
  extraOf?: (row: { lane: ResourceLane; item: WorkItem }) => string;
  onOpen: (id: string) => void;
  renderCard?: (row: { lane: ResourceLane; item: WorkItem }) => ReactNode;
}) {
  const shown = rows.slice(0, CARD_CAP);
  const rest = rows.slice(CARD_CAP);
  return (
    <>
      {shown.map((row) =>
        renderCard ? (
          <span key={row.item.id}>{renderCard(row)}</span>
        ) : (
          <WorkCard
            key={row.item.id}
            name={row.lane.name}
            item={row.item}
            extra={extraOf?.(row)}
            onOpen={() => onOpen(row.item.id)}
          />
        ),
      )}
      {rest.length > 0 && (
        <Popover
          trigger="click"
          title={`其余 ${rest.length} 条`}
          content={
            <div className="more-list">
              {rest.map((row) => (
                <WorkCard
                  key={row.item.id}
                  name={row.lane.name}
                  item={row.item}
                  extra={extraOf?.(row)}
                  onOpen={() => onOpen(row.item.id)}
                />
              ))}
            </div>
          }
        >
          <Button type="link" size="small" className="more-btn">
            +{rest.length}
          </Button>
        </Popover>
      )}
    </>
  );
}

const STAT_COLOR = {
  neutral: ios.label,
  danger: ios.red,
  warning: ios.orange,
  success: ios.green,
} as const;

export function SingleStat({
  title,
  value,
  variant = "neutral",
  description,
  children,
}: {
  title: string;
  value: string | number;
  variant?: keyof typeof STAT_COLOR;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="single-stat">
      <Statistic
        title={title}
        value={value}
        styles={{ content: { color: STAT_COLOR[variant] } }}
      />
      {children}
      {description && (
        <Text type="secondary" ellipsis={{ tooltip: description }} className="single-stat-desc">
          {description}
        </Text>
      )}
    </div>
  );
}

export function useCount(to: number, ms = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setN(to);
      return;
    }
    const from = 0;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - (1 - p) ** 3;
      setN(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return n;
}

export function HeroMeter({
  remainDays,
  done,
  total,
  risk,
}: {
  remainDays: number;
  done: number;
  total: number;
  risk: "risk" | "watch" | "ok";
}) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, [remainDays, done, total, risk]);

  const shownRemain = useCount(Math.max(0, remainDays));
  const shownDone = useCount(done);
  const windowDays = Math.max(12, Math.abs(remainDays));
  const timePct = remainDays <= 0 ? 0 : Math.min(1, remainDays / windowDays);
  const donePct = total === 0 ? 0 : done / total;
  const outerC = 2 * Math.PI * 70;
  const innerC = 2 * Math.PI * 54;
  const tone = risk === "risk" ? "tone-risk" : risk === "watch" ? "tone-watch" : "tone-ok";
  const remainText =
    remainDays < 0 ? "已过上线" : remainDays === 0 ? "今天上线" : remainDays === 1 ? "明日上线" : "个工作日";

  return (
    <div className={`hero-meter ${tone}${on ? " on" : ""}`}>
      {risk === "risk" ? <PulseLottie className="hero-lottie" /> : null}
      <svg className="hero-svg" viewBox="0 0 168 168" aria-hidden="true">
        <circle className="hero-track hero-track-spin" cx="84" cy="84" r="70" />
        <circle
          className="hero-ring hero-ring-time"
          cx="84"
          cy="84"
          r="70"
          strokeDasharray={outerC}
          strokeDashoffset={on ? outerC * (1 - timePct) : outerC}
        />
        <circle className="hero-track-inner" cx="84" cy="84" r="54" />
        <circle
          className="hero-ring hero-ring-done"
          cx="84"
          cy="84"
          r="54"
          strokeDasharray={innerC}
          strokeDashoffset={on ? innerC * (1 - donePct) : innerC}
        />
      </svg>
      <div className="hero-core">
        <span className={`hero-flag ${tone}`}>{risk === "risk" ? "有风险" : risk === "watch" ? "需关注" : "正常"}</span>
        <strong className="hero-num">{remainDays < 0 ? Math.abs(remainDays) : shownRemain}</strong>
        <span className="hero-unit">{remainText}</span>
        <span className="hero-done">
          完成 {shownDone}/{total}
        </span>
      </div>
    </div>
  );
}

export function LaunchDays({
  today,
  launch,
  onChange,
}: {
  today: string;
  launch: string;
  onChange: () => void;
}) {
  const days = listWorkdays(today, launch);
  if (days.length === 0) return null;
  const shown =
    days.length <= 8
      ? days.map((iso) => ({ iso, gap: false }))
      : [
          ...days.slice(0, 5).map((iso) => ({ iso, gap: false })),
          { iso: "", gap: true },
          { iso: days[days.length - 1], gap: false },
        ];

  return (
    <div className="launch-days">
      <div className="launch-days-head">
        <Text type="secondary">剩余工作日</Text>
        <Button type="link" size="small" onClick={onChange}>
          改上线日
        </Button>
      </div>
      <ol className="launch-days-list">
        {shown.map((row, i) =>
          row.gap ? (
            <li key={`gap-${i}`} className="launch-days-item gap" aria-hidden="true">
              <b>…</b>
              <span>{days.length - 6}天</span>
            </li>
          ) : (
            <li
              key={row.iso}
              className={`launch-days-item${row.iso === today ? " today" : ""}${row.iso === launch ? " launch" : ""}`}
              style={{ ["--i" as string]: i }}
            >
              <b>{Number(row.iso.slice(8))}</b>
              <span>{row.iso === today ? "今" : row.iso === launch ? "上线" : weekdayLabel(row.iso)}</span>
            </li>
          ),
        )}
      </ol>
    </div>
  );
}

export function StageProgress({ done, total, light }: { done: number; total: number; light: string }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  const stroke = light === "red" ? ios.red : light === "yellow" ? ios.orange : ios.green;
  return (
    <Progress
      percent={pct}
      showInfo={false}
      strokeColor={stroke}
      size={{ height: 8 }}
      aria-label={`${done} / ${total} 完成`}
    />
  );
}
