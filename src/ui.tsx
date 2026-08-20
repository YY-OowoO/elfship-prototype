import { useEffect, useState, type HTMLAttributes, type ReactNode } from "react";
import { Avatar, Button, Flex, Popover, Progress, Statistic, Tag, Tooltip, Typography } from "antd";
import { PEOPLE } from "./mock";
import { AVATAR_COLORS, palette } from "./tokens";
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
  neutral: palette.label,
  danger: palette.red,
  warning: palette.gold,
  success: palette.green,
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

const DAY_CAP = 12;

export function HeroMeter({
  remainDays,
  done,
  total,
  risk,
  riskNote,
  today,
  launch,
}: {
  remainDays: number;
  done: number;
  total: number;
  risk: "risk" | "watch" | "ok";
  riskNote: string;
  today: string;
  launch: string;
}) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, [remainDays, done, total, risk]);

  const overdue = remainDays < 0;
  const remainDaysList = listWorkdays(today, launch).filter((iso) => iso > today);
  const dayCount = overdue ? 0 : remainDays === 0 ? 1 : Math.min(DAY_CAP, remainDaysList.length);
  const extraDays = overdue ? 0 : Math.max(0, remainDaysList.length - DAY_CAP);
  const shownRemain = useCount(overdue ? Math.abs(remainDays) : Math.max(0, remainDays), 720);
  const shownDone = useCount(done, 720);
  const donePct = total === 0 ? 0 : done / total;
  const tone = risk === "risk" ? "tone-risk" : risk === "watch" ? "tone-watch" : "tone-ok";
  const flag = risk === "risk" ? "有风险" : risk === "watch" ? "需关注" : "正常";
  const remainText = overdue ? "已过上线" : remainDays === 0 ? "今天上线" : remainDays === 1 ? "明日上线" : "剩余工作日";
  const remainTip = overdue
    ? `已过上线日 ${formatDay(launch)} ${Math.abs(remainDays)} 个工作日`
    : remainDays === 0
      ? `今天就是上线日 ${formatDay(launch)}`
      : `距离上线日 ${formatDay(launch)} 还有 ${remainDays} 个工作日`;
  const doneTip = `14 条资源按整条链路计，当前完成 ${done}/${total}`;

  return (
    <div className={`hero-meter ${tone}${on ? " on" : ""}`}>
      <Tooltip title={riskNote}>
        <span className={`hero-flag ${tone}`}>{flag}</span>
      </Tooltip>
      <Tooltip title={remainTip}>
        <div className="hero-remain">
          <strong className="hero-num">{shownRemain}</strong>
          <span className="hero-unit">{remainText}</span>
        </div>
      </Tooltip>
      {dayCount > 0 ? (
        <div className="hero-days-wrap">
          <ol className="hero-days">
            {Array.from({ length: dayCount }, (_, i) => {
              const iso = remainDays === 0 ? today : remainDaysList[i];
              const last = iso === launch;
              const tip = iso
                ? `${last ? "上线日" : `第 ${i + 1} 个工作日`} · ${formatDay(iso)} 周${weekdayLabel(iso)}`
                : `第 ${i + 1} 个工作日`;
              return (
                <Tooltip key={iso ?? i} title={tip}>
                  <li style={{ ["--i" as string]: i }} />
                </Tooltip>
              );
            })}
            {extraDays > 0 ? (
              <Tooltip title={`还有 ${extraDays} 个工作日未展开，上线日 ${formatDay(launch)}`}>
                <li className="is-more">+{extraDays}</li>
              </Tooltip>
            ) : null}
          </ol>
        </div>
      ) : null}
      <Tooltip title={`整条链路走完才计入。当前 ${done}/${total} 条资源已完成`}>
        <div className="hero-done">
          <span>资源完成</span>
          <b>
            {shownDone}/{total}
          </b>
          <span className="hero-done-track">
            <i style={{ transform: `scaleX(${on ? donePct : 0})` }} />
          </span>
        </div>
      </Tooltip>
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
  const stroke = light === "red" ? palette.red : light === "yellow" ? palette.gold : palette.green;
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
