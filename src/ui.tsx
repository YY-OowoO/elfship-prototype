import {
  memo,
  Fragment,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type TouchEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Avatar,
  Button,
  Flex,
  Input,
  Modal,
  Popover,
  Progress,
  Segmented,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  ThunderboltOutlined,
  BellOutlined,
  DownloadOutlined,
  LockOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CheckCircleFilled,
  InboxOutlined,
  ArrowRightOutlined,
  FlagFilled,
  CalendarOutlined,
  CompassOutlined,
  ProjectOutlined,
  PartitionOutlined,
} from "@ant-design/icons";
import NumberFlow from "@number-flow/react";
import { motion, AnimatePresence } from "motion/react";
import { PEOPLE, STAGES } from "./mock";
import { AVATAR_COLORS, palette } from "./tokens";
import {
  currentItem,
  findBlockedDownstream,
  formatDay,
  itemLight,
  listWorkdays,
  remainLabel,
  stateLabel,
  stateTone,
  weekdayLabel,
  workdaysBetween,
} from "./logic";
import type { LaunchBatch, PersonId, ResourceLane, StageKey, WorkItem } from "./types";
import { prefersReduce } from "./motion/prefers";
import { EASE, Fill, Reveal, entrance } from "./motion/Entrance";
import { GateConnector } from "./motion/HeroMotion";
import { EmotionBall, dispatchElfEvent } from "./emotion-ball";

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

function WorkCardBase({
  name,
  item,
  extra,
  onOpen,
  dragHandle,
  isDependencyTarget,
  isDependencyDimmed,
  isDateFocus,
  isDateDimmed,
  isHighlighted,
  onHoverBlocker,
  onHoverCard,
  quickAction,
  onNudge,
}: {
  name: string;
  item: WorkItem;
  extra?: string;
  onOpen: () => void;
  dragHandle?: ButtonHTMLAttributes<HTMLButtonElement>;
  isDependencyTarget?: boolean;
  isDependencyDimmed?: boolean;
  isDateFocus?: boolean;
  isDateDimmed?: boolean;
  isHighlighted?: boolean;
  onHoverBlocker?: (hovering: boolean) => void;
  onHoverCard?: (hovering: boolean) => void;
  quickAction?: { label: string; onClick: () => void; icon?: string };
  onNudge?: () => void;
}) {
  const light = itemLight(item);
  const due = light === "red" || light === "yellow" ? remainLabel(item.dueAt) : formatDay(item.dueAt);
  const tagIcon =
    extra === "锁下游" ? (
      <LockOutlined style={{ marginRight: 4, color: "#faad14" }} />
    ) : light === "red" ? (
      <WarningOutlined style={{ marginRight: 4, color: "#ff4d4f" }} />
    ) : light === "yellow" ? (
      <ClockCircleOutlined style={{ marginRight: 4, color: "#faad14" }} />
    ) : item.state === "confirmed" ? (
      <CheckCircleOutlined style={{ marginRight: 4, color: "#52c41a" }} />
    ) : null;
  const mergedHandle: ButtonHTMLAttributes<HTMLButtonElement> | undefined = dragHandle
    ? {
        ...dragHandle,
        className: `k-card-handle${dragHandle.className ? ` ${dragHandle.className}` : ""}`,
        tabIndex: dragHandle?.tabIndex ?? 0,
        onPointerDown(event: PointerEvent<HTMLButtonElement>) {
          event.preventDefault();
          event.stopPropagation();
          return dragHandle.onPointerDown?.(event);
        },
        onMouseDown(event: MouseEvent<HTMLButtonElement>) {
          event.stopPropagation();
          return dragHandle.onMouseDown?.(event);
        },
        onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
          return dragHandle.onKeyDown?.(event);
        },
        onTouchStart(event: TouchEvent<HTMLButtonElement>) {
          event.stopPropagation();
          return dragHandle.onTouchStart?.(event);
        },
        onClick(event) {
          event.preventDefault();
          event.stopPropagation();
          return dragHandle.onClick?.(event);
        },
      }
    : undefined;

  const showNudge = onNudge && (light === "red" || light === "yellow" || item.locked || extra === "锁下游");

  return (
    <div
      role="button"
      tabIndex={0}
      className={`k-card ${stateTone(item)}${light === "red" ? " red" : ""}${light === "yellow" ? " yellow" : ""}${
        isDependencyTarget ? " is-dependency-target" : ""
      }${isDependencyDimmed ? " is-dependency-dimmed" : ""}${isDateFocus ? " is-date-focus" : ""}${
        isDateDimmed ? " is-date-dimmed" : ""
      }${isHighlighted ? " is-row-focused" : ""}`}
      onClick={onOpen}
      onMouseEnter={() => {
        onHoverBlocker?.(true);
        onHoverCard?.(true);
      }}
      onMouseLeave={() => {
        onHoverBlocker?.(false);
        onHoverCard?.(false);
      }}
      onKeyDown={(event) => {
        if ((event.target as HTMLElement).closest?.(".k-card-handle")) return;
        if ((event.target as HTMLElement).closest?.(".k-card-quick-action")) return;
        if ((event.target as HTMLElement).closest?.(".k-card-nudge-btn")) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <Flex orientation="vertical" gap={4} className="k-card-main">
        <Flex align="center" justify="space-between" gap={4}>
          <Flex align="center" gap={6} style={{ minWidth: 0 }}>
            {(() => {
              const elfEmotion = item.locked
                ? "06"
                : light === "red"
                ? "34"
                : light === "yellow"
                ? "11"
                : item.state === "confirmed"
                ? "33"
                : item.state === "submitted"
                ? "19"
                : item.state === "in_progress" || item.state === "rework"
                ? "30"
                : "02";
              const elfStatus = item.locked
                ? "精灵状态：休眠锁定（前置节点未完成）"
                : light === "red"
                ? "精灵状态：逾期告警（建议催办推进）"
                : light === "yellow"
                ? "精灵状态：临期关注"
                : item.state === "confirmed"
                ? "精灵状态：节点已通过达成"
                : item.state === "submitted"
                ? "精灵状态：已提交待审"
                : item.state === "in_progress" || item.state === "rework"
                ? "精灵状态：专注推进运转中"
                : "精灵状态：就绪待命";
              return (
                <Tooltip title={elfStatus}>
                  <span style={{ display: "inline-flex", cursor: "pointer" }}>
                    <EmotionBall
                      emotion={elfEmotion}
                      size={18}
                      interactive={true}
                      autostart={true}
                    />
                  </span>
                </Tooltip>
              );
            })()}
            <Text strong ellipsis={{ tooltip: name }} className="k-card-name">
              {name}
            </Text>
          </Flex>
          {showNudge ? (
            <button
              type="button"
              className="k-card-nudge-btn"
              title="一键生成催办提醒文案到剪贴板"
              onClick={(e) => {
                e.stopPropagation();
                onNudge();
              }}
            >
              <BellOutlined style={{ marginRight: 3, fontSize: "0.72rem" }} />
              催办
            </button>
          ) : null}
        </Flex>
        <Flex justify="space-between" align="center" gap={6} className="k-card-state">
          <Tag variant="filled" className="k-card-tag" title={extra ?? stateLabel(item)}>
            <span className="k-tag-icon" aria-hidden="true">{tagIcon}</span>
            {extra ?? stateLabel(item)}
          </Tag>
          <Text
            type={light === "red" ? "danger" : light === "yellow" ? "warning" : "secondary"}
            ellipsis={{ tooltip: due }}
            className="k-card-due"
          >
            {due}
          </Text>
        </Flex>
        <Flex align="center" justify="space-between" gap={6} className="k-card-who">
          <Flex align="center" gap={6} style={{ minWidth: 0 }}>
            {avatar(item.driId, 18)}
            <Text type="secondary" ellipsis={{ tooltip: `${PEOPLE[item.driId].name} · ${PEOPLE[item.driId].title}` }}>
              {PEOPLE[item.driId].name}
            </Text>
          </Flex>
          {quickAction ? (
            <button
              type="button"
              className="k-card-quick-action"
              title={quickAction.label}
              onClick={(e) => {
                e.stopPropagation();
                quickAction.onClick();
              }}
            >
              <ThunderboltOutlined style={{ marginRight: 3 }} />
              {quickAction.label}
            </button>
          ) : null}
        </Flex>
        {mergedHandle ? (
          <Tooltip title="按住拖拽至目标阶段" mouseEnterDelay={0.3}>
            <button
              type="button"
              aria-label="按住拖拽卡片"
              className="k-card-handle"
              role="button"
              {...mergedHandle}
            >
              <span className="k-card-handle-grip" aria-hidden>
                <span />
                <span />
                <span />
              </span>
            </button>
          </Tooltip>
        ) : null}
      </Flex>
    </div>
  );
}

export const WorkCard = memo(WorkCardBase);

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
              {rest.map((row) =>
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
  const shownRemain = overdue ? Math.abs(remainDays) : Math.max(0, remainDays);
  const shownDone = done;
  const donePct = total === 0 ? 0 : done / total;
  const tone = risk === "risk" ? "tone-risk" : risk === "watch" ? "tone-watch" : "tone-ok";
  const flag = risk === "risk" ? "有风险" : risk === "watch" ? "需关注" : "正常";
  const remainText = overdue ? "已过上线" : remainDays === 0 ? "今天上线" : remainDays === 1 ? "明日上线" : "剩余工作日";
  const remainTip = overdue
    ? `已过上线日 ${formatDay(launch)} ${Math.abs(remainDays)} 个工作日`
    : remainDays === 0
      ? `今天就是上线日 ${formatDay(launch)}`
      : `距离上线日 ${formatDay(launch)} 还有 ${remainDays} 个工作日`;

  return (
    <div className={`hero-meter ${tone}${on ? " on" : ""}`}>
      <Tooltip title={riskNote}>
        <span className={`hero-flag ${tone}`}>{flag}</span>
      </Tooltip>
      <Tooltip title={remainTip}>
        <div className="hero-remain">
          <NumberFlow className="hero-num" value={shownRemain} animated={!prefersReduce()} />
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
          <b className="hero-done-count">
            <NumberFlow value={shownDone} animated={!prefersReduce()} />
            <span>/{total}</span>
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
  onHoverDate,
}: {
  today: string;
  launch: string;
  onChange: () => void;
  onHoverDate?: (iso: string | null) => void;
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
      <ol className="launch-days-list" onMouseLeave={() => onHoverDate?.(null)}>
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
              onMouseEnter={() => onHoverDate?.(row.iso)}
              title={`${formatDay(row.iso)} · 悬停透视全站当天到期任务`}
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

export function HeroDeliveryRunway({
  batch,
  risk,
  today,
  doneLanes,
  totalLanes,
  onHoverDate,
  onChangeLaunchDate,
  onOpenItem,
  onNudge,
}: {
  batch: LaunchBatch;
  risk: { level: "risk" | "watch" | "ok"; sentence: string };
  today: string;
  doneLanes: number;
  totalLanes: number;
  onHoverDate?: (iso: string | null) => void;
  onChangeLaunchDate: () => void;
  onOpenItem?: (id: string) => void;
  onNudge?: (item: WorkItem, lane: ResourceLane) => void;
}) {
  const [animated, setAnimated] = useState(false);
  const [timeLens, setTimeLens] = useState<"day" | "week" | "gate">("day");
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(id);
  }, [batch.id]);

  const startIso = "2026-08-10";
  const allBatchDays = listWorkdays(startIso, batch.launchDate);
  const todayIdx = allBatchDays.indexOf(today);
  const remainWorkdays = workdaysBetween(today, batch.launchDate);

  // Time elapsed pct
  const timeElapsedPct =
    allBatchDays.length > 0 && todayIdx >= 0
      ? Math.min(100, Math.round(((todayIdx + 1) / allBatchDays.length) * 100))
      : 54;

  // Detailed throughput breakdown for the multi-segment progress bar
  let totalStageSteps = 0;
  let confirmedSteps = 0;
  let wipSteps = 0;
  let watchSteps = 0;
  let riskSteps = 0;
  let todoSteps = 0;
  const itemsByDate: Record<string, Array<{ lane: ResourceLane; item: WorkItem }>> = {};

  for (const lane of batch.lanes) {
    for (const it of lane.items) {
      totalStageSteps++;
      if (it.state === "confirmed") {
        confirmedSteps++;
      } else if (it.state === "not_started" || it.locked) {
        todoSteps++;
      } else {
        const l = itemLight(it);
        if (l === "red") riskSteps++;
        else if (l === "yellow") watchSteps++;
        else wipSteps++;
      }

      if (it.dueAt) {
        if (!itemsByDate[it.dueAt]) itemsByDate[it.dueAt] = [];
        itemsByDate[it.dueAt].push({ lane, item: it });
      }
    }
  }

  const confirmedPct = totalStageSteps > 0 ? (confirmedSteps / totalStageSteps) * 100 : 0;
  const wipPct = totalStageSteps > 0 ? (wipSteps / totalStageSteps) * 100 : 0;
  const watchPct = totalStageSteps > 0 ? (watchSteps / totalStageSteps) * 100 : 0;
  const riskPct = totalStageSteps > 0 ? (riskSteps / totalStageSteps) * 100 : 0;
  const todoPct = 100 - (confirmedPct + wipPct + watchPct + riskPct);

  const processPct = Math.round(confirmedPct);
  const paceLag = timeElapsedPct - processPct;
  const paceLabel =
    paceLag > 12 ? "节奏滞后 · 需重点提速" : paceLag < -5 ? "进度超前 · 节拍健康" : "流转正常 · 符合预期";
  const paceColor = paceLag > 12 ? "var(--red)" : paceLag < -5 ? "var(--ok)" : "var(--wip)";

  // Current active sprint days (from today to launch)
  const displayedDays = useMemo(() => {
    return listWorkdays(today, batch.launchDate);
  }, [today, batch.launchDate]);

  // Weekly Sprints data
  const weekSprints = useMemo(() => {
    return [
      {
        id: "w1",
        label: "W1 · 8/10 - 8/14",
        theme: "概念与排期定标",
        total: 28,
        done: 28,
        wip: 0,
        risk: 0,
        watch: 0,
        status: "passed" as const,
        statusText: "阶段圆满通过",
        dates: ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14"],
      },
      {
        id: "w2",
        label: "W2 · 8/17 - 8/21",
        theme: "核心资产攻坚 (当前周)",
        total: 28,
        done: 17,
        wip: 9,
        risk: 1,
        watch: 1,
        status: "current" as const,
        statusText: "攻坚中 · 1卡点阻塞",
        dates: ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21"],
      },
      {
        id: "w3",
        label: "W3 · 8/24 - 8/26",
        theme: "集成验收与上线准出",
        total: 42,
        done: 0,
        wip: 0,
        risk: 0,
        watch: 0,
        status: "upcoming" as const,
        statusText: "等待前序解锁",
        dates: ["2026-08-24", "2026-08-25", "2026-08-26"],
      },
    ];
  }, []);

  // Milestone Gates data
  const milestoneGates = useMemo(() => {
    return [
      {
        id: "gate-1",
        num: "Gate 1",
        title: "需求排期冻结",
        date: "08月11日",
        status: "passed" as const,
        icon: <CheckCircleFilled style={{ color: "#52c41a" }} />,
        tag: "100% 已通过",
        desc: "14/14 需求排期表确认准出",
        dri: "向彬 · 批次主责",
      },
      {
        id: "gate-2",
        num: "Gate 2",
        title: "资产工程封板",
        date: "08月20日",
        status: "risk" as const,
        icon: <WarningOutlined style={{ color: "#ff4d4f" }} />,
        tag: "存在阻塞卡点",
        desc: "3D模型道具滞留上传，需重点跟进",
        dri: "钟志勇 · 制作主责",
      },
      {
        id: "gate-3",
        num: "Gate 3",
        title: "联调送审通过",
        date: "08月24日",
        status: "waiting" as const,
        icon: <ClockCircleOutlined style={{ color: "#1677ff" }} />,
        tag: "预计2天后到达",
        desc: "平台送审与IP送审结论达成",
        dri: "刘心语 / 何盼盼",
      },
      {
        id: "gate-4",
        num: "Gate 4",
        title: "终审入库上线",
        date: "08月26日",
        status: "target" as const,
        icon: <FlagFilled style={{ color: "#52c41a" }} />,
        tag: "终审准出目标",
        desc: "全资源 SVN 入库与分支合并",
        dri: "龙慧 · 上新安排",
      },
    ];
  }, []);

  // Blocker ribbon detection
  const blockers: Array<{ lane: ResourceLane; item: WorkItem; downstreamCount: number }> = [];
  for (const lane of batch.lanes) {
    const cur = currentItem(lane);
    if (cur && itemLight(cur) === "red") {
      const downstream = findBlockedDownstream(batch, lane.id);
      blockers.push({
        lane,
        item: cur,
        downstreamCount: downstream.blockedItemIds.length,
      });
    }
  }

  return (
    <div className="hero-runway-card">
      {/* 1. Top Section: Header & Standard Ant Design Dashboard Gauge Cockpit */}
      <div className="hr-header-cockpit">
        {/* Left: Batch Info & DRI */}
        <motion.div
          className="hr-batch-identity"
          {...entrance(0, 14)}
          whileHover={{ y: -2 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className="hr-kicker">
            <span className="hr-batch-label">上线批次中控</span>
            <Tag
              color={risk.level === "risk" ? "error" : risk.level === "watch" ? "warning" : "success"}
              icon={
                risk.level === "risk" ? (
                  <WarningOutlined />
                ) : risk.level === "watch" ? (
                  <ClockCircleOutlined />
                ) : (
                  <CheckCircleFilled />
                )
              }
              className="hr-risk-tag"
            >
              {risk.level === "risk" ? "有风险 · 存在阻塞卡点" : risk.level === "watch" ? "需关注" : "节拍正常"}
            </Tag>
          </div>
          <div className="hr-title-wrap" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Tooltip title="点击交付精灵 · 触发全链路智能排期诊断">
              <span
                style={{ display: "inline-flex", cursor: "pointer" }}
                onClick={() => dispatchElfEvent("diagnosis_requested")}
              >
                <EmotionBall
                  emotion={risk.level === "risk" ? "34" : risk.level === "watch" ? "11" : "02"}
                  size={36}
                  interactive={true}
                  lite={true}
                  label={`${batch.name} 交付状态`}
                />
              </span>
            </Tooltip>
            <div>
              <h2 className="hr-title">{batch.name}</h2>
              <div className="hr-dri-info">
                {avatar(batch.batchDriId, 20)}
                <span className="hr-dri-name">{PEOPLE[batch.batchDriId].name}</span>
                <span className="hr-dri-title">{PEOPLE[batch.batchDriId].title}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Center: STANDARD COMPONENT - Ant Design Dashboard Progress with Motion */}
        <motion.div
          className="hr-radial-dial-pod"
          {...entrance(0.08, 14)}
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {/* Left: Official Ant Design Progress (type="dashboard") */}
          <Tooltip
            title={
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                <div>已完成确认: <b>{confirmedSteps}</b> 步 ({Math.round(confirmedPct)}%)</div>
                <div>正常推进中: <b>{wipSteps}</b> 步 ({Math.round(wipPct)}%)</div>
                <div>临期预警: <b>{watchSteps}</b> 步 ({Math.round(watchPct)}%)</div>
                <div>逾期阻塞: <b>{riskSteps}</b> 步 ({Math.round(riskPct)}%)</div>
                <div>待开始/排队: <b>{todoSteps}</b> 步 ({Math.round(todoPct)}%)</div>
                <div style={{ marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: 4 }}>
                  全周期时间消耗: <b>{timeElapsedPct}%</b>
                </div>
              </div>
            }
          >
            <div className="hr-antd-progress-wrap">
              <Progress
                type="dashboard"
                percent={processPct}
                gapDegree={60}
                size={102}
                strokeWidth={9}
                strokeColor={{
                  "0%": "#1677ff",
                  "100%": "#52c41a",
                }}
                format={() => (
                  <div className="hr-radial-center-val">
                    <div className="hr-radial-num-row">
                      <NumberFlow className="hr-radial-num" value={processPct} animated={!prefersReduce()} />
                      <span className="hr-radial-pct-sym">%</span>
                    </div>
                    <span className="hr-radial-step-count">{confirmedSteps}/{totalStageSteps} 步</span>
                  </div>
                )}
              />
            </div>
          </Tooltip>

          {/* Right: Meta stats & pace */}
          <div className="hr-radial-info-cell">
            <div className="hr-radial-head-row">
              <span className="hr-radial-title">全景工序交付健康度</span>
              <span className="hr-leg-pace" style={{ color: paceColor }}>
                <CompassOutlined /> {paceLabel}
              </span>
            </div>
            <div className="hr-radial-desc">
              交付指数 <b>{processPct}%</b> (已完成 {confirmedSteps}/{totalStageSteps} 步) · 时间已消耗 <b>{timeElapsedPct}%</b> · 资产入库 <b>{doneLanes}/{totalLanes}</b>
            </div>
            <div className="hr-radial-legend-strip">
              <span className="hr-rl-item leg-done"><i /> {confirmedSteps} 步已确认</span>
              <span className="hr-rl-item leg-wip"><i /> {wipSteps} 步推进中</span>
              {watchSteps > 0 && <span className="hr-rl-item leg-watch"><i /> {watchSteps} 步临期</span>}
              {riskSteps > 0 && <span className="hr-rl-item leg-risk"><i /> {riskSteps} 步阻塞</span>}
            </div>
          </div>
        </motion.div>

        {/* Right: The Mission Countdown Pod (Secondary Core) with Motion */}
        <motion.div
          className="hr-mission-countdown-pod"
          {...entrance(0.16, 14)}
          whileHover={{ y: -3, scale: 1.015 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className="hr-mcp-top-label">
            <CalendarOutlined style={{ marginRight: 4 }} /> 距终审上线
          </div>
          <div className="hr-mcp-digit-row">
            <NumberFlow className="hr-mcp-big-digit" value={remainWorkdays} animated={!prefersReduce()} />
            <span className="hr-mcp-unit-text">个工作日</span>
          </div>
          <div className="hr-mcp-bottom-row">
            <span className="hr-mcp-date">{formatDay(batch.launchDate)} 目标交付</span>
            <Button
              size="small"
              type="link"
              onClick={onChangeLaunchDate}
              className="hr-mcp-btn-edit"
            >
              改期
            </Button>
          </div>
        </motion.div>
      </div>

      {/* 2. Horizon Stage Runway: Clear Visual Hierarchy */}
      <Reveal className="hr-horizon-stage" delay={0.18} y={8}>
        {/* Streamlined Stage Header with Lens Switcher */}
        <div className="hr-stage-bar-head">
          <div className="hr-stage-title-group">
            <span className="hr-pulse-radar" />
            <span className="hr-stage-title-text">交付时序中控</span>
            <span className="hr-stage-sub-tip">
              {timeLens === "day"
                ? "聚焦当前冲刺周期 · 悬停日期透视全站到期工序"
                : timeLens === "week"
                ? "按周宏观把控工序吞吐节拍"
                : "把控生产管线 4 大阶段门禁准出"}
            </span>
          </div>

          <div className="hr-stage-bounds">
            <Segmented
              size="small"
              value={timeLens}
              onChange={(val) => {
                setTimeLens(val as "day" | "week" | "gate");
                setSelectedEntity(null);
                onHoverDate?.(null);
              }}
              options={[
                { label: <span><CalendarOutlined style={{ marginRight: 4 }} />日视图 · 冲刺聚焦</span>, value: "day" },
                { label: <span><ProjectOutlined style={{ marginRight: 4 }} />周视图 · 节拍大盘</span>, value: "week" },
                { label: <span><PartitionOutlined style={{ marginRight: 4 }} />门禁里程碑 · 阶段验收</span>, value: "gate" },
              ]}
              className="hr-lens-segmented"
            />
            <span className="hr-bound-pill is-target">
              <FlagFilled style={{ marginRight: 4 }} /> 上线 {formatDay(batch.launchDate)}
            </span>
          </div>
        </div>

        {/* Smooth Dynamic Transition between Views */}
        <AnimatePresence mode="wait">
          {/* View 1: Day View (日视图 · 冲刺聚焦) */}
          {timeLens === "day" && (
            <motion.div
              key="day-view"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="hr-capsules-stream"
              onMouseLeave={() => {
                onHoverDate?.(null);
                setSelectedEntity(null);
              }}
            >
              <div className="hr-stream-track-bg" />
              <div
                className="hr-stream-track-glow"
                style={{ width: `${animated ? timeElapsedPct : 0}%` }}
              />

              {displayedDays.map((iso, i) => {
                const isToday = iso === today;
                const isLaunch = iso === batch.launchDate;
                const isSelected = selectedEntity === iso;
                const dateItems = itemsByDate[iso] ?? [];
                const redCount = dateItems.filter((x) => itemLight(x.item) === "red").length;
                const yellowCount = dateItems.filter((x) => itemLight(x.item) === "yellow").length;
                const dayNum = Number(iso.slice(8));
                const wday = weekdayLabel(iso);

                const tooltipContent = (
                  <div className="hr-node-popover">
                    <div className="hr-np-title">
                      <b>{formatDay(iso)}（周{wday}）</b>
                      {isToday && <Tag color="blue">今天</Tag>}
                      {isLaunch && <Tag color="green">目标上线日</Tag>}
                    </div>
                    {dateItems.length > 0 ? (
                      <div className="hr-np-list">
                        <div className="hr-np-head">当天到期工序清单 ({dateItems.length} 项)：</div>
                        {dateItems.map(({ lane, item }) => (
                          <div key={item.id} className="hr-np-item">
                            <span className={`hr-np-dot ${itemLight(item)}`} />
                            <span className="hr-np-name">{lane.name}</span>
                            <Tag className="hr-np-stage">{STAGES.find((s) => s.key === item.stage)?.short}</Tag>
                            <span className="hr-np-dri">{PEOPLE[item.driId]?.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="hr-np-empty">当日无截止工序（正常推进流水线）</div>
                    )}
                  </div>
                );

                const prevIso = i > 0 ? displayedDays[i - 1] : null;
                const isWeekendJump = prevIso
                  ? new Date(iso).getTime() - new Date(prevIso).getTime() > 86400000 * 1.8
                  : false;

                return (
                  <div key={iso} style={{ display: "contents" }}>
                    {isWeekendJump && (
                      <div className="hr-weekend-gap" title="跳过双休（22日-23日），按工作日推进">
                        <span className="hr-weekend-pill">双休</span>
                      </div>
                    )}
                    <Tooltip title={tooltipContent} overlayClassName="hr-tooltip">
                      <motion.div
                        {...entrance(i * 0.045, 10)}
                        className={`hr-capsule-card${isToday ? " is-today" : ""}${isLaunch ? " is-launch" : ""}${
                          redCount > 0 ? " has-risk" : yellowCount > 0 ? " has-watch" : !isToday && !isLaunch ? " is-muted" : ""
                        }${isSelected ? " is-selected" : ""}`}
                        onMouseEnter={() => {
                          onHoverDate?.(iso);
                          setSelectedEntity(iso);
                        }}
                        onClick={() => {
                          onHoverDate?.(iso);
                          setSelectedEntity(iso);
                        }}
                      >
                        <div className="hr-cap-top">
                          <span className="hr-cap-day">{dayNum}</span>
                          <span className="hr-cap-wday">
                            {isToday ? "今天" : isLaunch ? "上线" : `周${wday}`}
                          </span>
                        </div>

                        <div className="hr-cap-badge-wrap">
                          {redCount > 0 ? (
                            <span className="hr-cap-badge badge-risk">
                              <WarningOutlined /> {dateItems.find((x) => itemLight(x.item) === "red")?.lane.name.slice(0, 4)} 逾期
                            </span>
                          ) : yellowCount > 0 ? (
                            <span className="hr-cap-badge badge-watch">
                              <ClockCircleOutlined /> {dateItems.find((x) => itemLight(x.item) === "yellow")?.lane.name.slice(0, 4)} 临期
                            </span>
                          ) : isToday ? (
                            <span className="hr-cap-badge badge-today">
                              <span className="hr-live-dot" /> 进行中
                            </span>
                          ) : isLaunch ? (
                            <span className="hr-cap-badge badge-launch">
                              <FlagFilled /> 目标交付
                            </span>
                          ) : dateItems.length > 0 ? (
                            <span className="hr-cap-badge badge-normal">
                              {dateItems.length} 项工序
                            </span>
                          ) : (
                            <span className="hr-cap-badge badge-free">流水线正常</span>
                          )}
                        </div>

                        <div className="hr-cap-step-dot">
                          <span className="hr-step-inner" />
                        </div>
                      </motion.div>
                    </Tooltip>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* View 2: Week View (周视图 · 节拍大盘) */}
          {timeLens === "week" && (
            <motion.div
              key="week-view"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="hr-week-stream"
              onMouseLeave={() => {
                onHoverDate?.(null);
                setSelectedEntity(null);
              }}
            >
              {weekSprints.map((w, i) => {
                const isSelected = selectedEntity === w.id;
                const pct = Math.round((w.done / w.total) * 100);

                return (
                  <motion.div
                    key={w.id}
                    {...entrance(i * 0.09, 12)}
                    className={`hr-week-card${w.status === "current" ? " is-current" : ""}${
                      w.status === "passed" ? " is-passed" : ""
                    }${isSelected ? " is-selected" : ""}`}
                    onMouseEnter={() => {
                      onHoverDate?.(w.dates[0]);
                      setSelectedEntity(w.id);
                    }}
                    onClick={() => {
                      onHoverDate?.(w.dates[0]);
                      setSelectedEntity(w.id);
                    }}
                  >
                    <div className="hr-week-head">
                      <span className="hr-week-range">{w.label}</span>
                      <Tag
                        color={
                          w.status === "passed" ? "success" : w.status === "current" ? "processing" : "default"
                        }
                        className="hr-week-tag"
                      >
                        {w.status === "passed" ? (
                          <CheckCircleFilled />
                        ) : w.status === "current" ? (
                          <ClockCircleOutlined />
                        ) : (
                          <LockOutlined />
                        )}
                        {" "}{w.statusText}
                      </Tag>
                    </div>

                    <div className="hr-week-theme">{w.theme}</div>

                    <div className="hr-week-progress-row">
                      <div className="hr-week-prog-bar">
                        <Fill
                          className="hr-week-prog-fill"
                          pct={pct}
                          delay={0.15 + i * 0.09}
                          background={w.status === "passed" ? "#52c41a" : w.risk > 0 ? "#faad14" : "#1677ff"}
                        />
                      </div>
                      <span className="hr-week-prog-pct">{pct}%</span>
                    </div>

                    <div className="hr-week-stats-row">
                      <span>工序完成: <b>{w.done}/{w.total}</b></span>
                      {w.risk > 0 && <span className="hr-week-risk-text"><WarningOutlined /> {w.risk} 项阻塞</span>}
                      {w.watch > 0 && <span className="hr-week-watch-text"><ClockCircleOutlined /> {w.watch} 临期</span>}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* View 3: Milestone Gate View (门禁里程碑 · 阶段验收) */}
          {timeLens === "gate" && (
            <motion.div
              key="gate-view"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="hr-gate-stream"
              onMouseLeave={() => {
                onHoverDate?.(null);
                setSelectedEntity(null);
              }}
            >
              {milestoneGates.map((g, idx) => {
                const isSelected = selectedEntity === g.id;

                return (
                  <Fragment key={g.id}>
                    <motion.div
                      {...entrance(idx * 0.1, 12)}
                      className={`hr-gate-card${g.status === "passed" ? " is-passed" : ""}${
                        g.status === "risk" ? " has-risk" : ""
                      }${g.status === "target" ? " is-target" : ""}${isSelected ? " is-selected" : ""}`}
                      onMouseEnter={() => setSelectedEntity(g.id)}
                      onClick={() => setSelectedEntity(g.id)}
                    >
                      <div className="hr-gate-top">
                        <span className="hr-gate-num">{g.num}</span>
                        <span className="hr-gate-date">{g.date}</span>
                      </div>

                      <div className="hr-gate-title">{g.title}</div>

                      <div className="hr-gate-badge-slot">
                        <Tag
                          color={
                            g.status === "passed"
                              ? "success"
                              : g.status === "risk"
                              ? "error"
                              : g.status === "target"
                              ? "cyan"
                              : "default"
                          }
                          icon={g.icon}
                          className="hr-gate-tag"
                        >
                          {g.tag}
                        </Tag>
                      </div>

                      <div className="hr-gate-desc">{g.desc}</div>
                      <div className="hr-gate-dri">{g.dri}</div>
                    </motion.div>

                    {idx < milestoneGates.length - 1 && (
                      <GateConnector
                        delay={0.2 + idx * 0.1}
                        fromStatus={g.status}
                        toStatus={milestoneGates[idx + 1].status}
                      />
                    )}
                  </Fragment>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </Reveal>

      {/* 3. Blocker Emergency Callout Bar */}
      <AnimatePresence>
        {blockers.length > 0 && (
          <motion.div
            key="hr-blocker-ribbon"
            className="hr-blocker-ribbon"
            initial={prefersReduce() ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReduce() ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
          <div className="hr-br-left">
            <WarningOutlined className="hr-br-icon" />
            <span className="hr-br-text">
              <b>【关键卡点阻塞】</b> {PEOPLE[blockers[0].item.driId]?.name} 负责的 <b>{blockers[0].lane.name}</b> 滞留在 [{STAGES.find((s) => s.key === blockers[0].item.stage)?.short}] 阶段逾期，已导致下游 {blockers[0].downstreamCount} 项验收工序锁定
            </span>
          </div>
          <div className="hr-br-actions">
            {onOpenItem ? (
              <Button
                size="small"
                type="link"
                className="hr-br-btn"
                onClick={() => onOpenItem(blockers[0].item.id)}
              >
                定位卡片
              </Button>
            ) : null}
            {onNudge ? (
              <Tooltip title="点击将催办提醒复制到剪贴板，可直接粘贴至通讯工具">
                <Button
                  size="small"
                  type="primary"
                  danger
                  ghost
                  icon={<BellOutlined />}
                  className="hr-br-btn"
                  onClick={() => onNudge(blockers[0].item, blockers[0].lane)}
                >
                  复制催办提醒
                </Button>
              </Tooltip>
            ) : null}
          </div>
          </motion.div>
        )}
      </AnimatePresence>
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

export function EvidenceQuickPeek({
  evidence,
  children,
}: {
  evidence?: { svnPath?: string; svnRev?: string; note?: string; conclusion?: string };
  children: ReactNode;
}) {
  if (!evidence || (!evidence.svnPath && !evidence.note && !evidence.conclusion)) {
    return <>{children}</>;
  }
  const path = evidence.svnPath ?? "svn://repo/assets/summer2026";
  const rev = evidence.svnRev ? `r${evidence.svnRev}` : "r42091";
  const fileName = path.split("/").pop() ?? "asset.png";

  return (
    <Popover
      placement="top"
      trigger={["hover", "focus"]}
      overlayClassName="evidence-popover"
      content={
        <div className="evidence-quick-peek">
          <div className="eqp-head">
            <InboxOutlined className="eqp-icon" style={{ fontSize: "1.25rem", color: "var(--wip)" }} />
            <div className="eqp-title-wrap">
              <b className="eqp-filename">{fileName}</b>
              <span className="eqp-rev">{rev}</span>
            </div>
          </div>
          <div className="eqp-body">
            <div className="eqp-row">
              <span className="eqp-label">SVN 路径</span>
              <Text code ellipsis={{ tooltip: path }} className="eqp-code">
                {path}
              </Text>
            </div>
            {evidence.note ? (
              <div className="eqp-row">
                <span className="eqp-label">提交日志</span>
                <span className="eqp-val">{evidence.note}</span>
              </div>
            ) : null}
            {evidence.conclusion ? (
              <div className="eqp-row">
                <span className="eqp-label">验收结论</span>
                <span className="eqp-val">{evidence.conclusion}</span>
              </div>
            ) : null}
          </div>
          <div className="eqp-footer">
            <span className="eqp-tag">
              <CheckCircleFilled style={{ marginRight: 4, color: "#52c41a" }} />
              SVN 校验通过
            </span>
            <Button
              size="small"
              type="link"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard?.writeText(path);
              }}
            >
              复制路径
            </Button>
          </div>
        </div>
      }
    >
      <span className="eqp-trigger" style={{ cursor: "pointer" }}>{children}</span>
    </Popover>
  );
}

export function BatchActionBar({
  selectedCount,
  totalCount,
  onBatchAdvance,
  onBatchNudge,
  onExportList,
  onClear,
}: {
  selectedCount: number;
  totalCount: number;
  onBatchAdvance: () => void;
  onBatchNudge: () => void;
  onExportList: () => void;
  onClear: () => void;
}) {
  if (selectedCount === 0) return null;
  return (
    <div className="batch-action-bar">
      <div className="bab-left">
        <span className="bab-badge">{selectedCount}</span>
        <span>已选 <b>{selectedCount}</b> / {totalCount} 项资源</span>
      </div>
      <div className="bab-actions">
        <Button type="primary" size="small" icon={<ThunderboltOutlined />} onClick={onBatchAdvance}>
          批量流转下一阶段
        </Button>
        <Button type="default" size="small" icon={<BellOutlined />} onClick={onBatchNudge}>
          批量催办
        </Button>
        <Button type="default" size="small" icon={<DownloadOutlined />} onClick={onExportList}>
          导出清单
        </Button>
        <Button type="text" size="small" onClick={onClear}>
          取消
        </Button>
      </div>
    </div>
  );
}

export function GlobalSearchModal({
  open,
  onClose,
  batch,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  batch: LaunchBatch;
  onSelect: (itemId: string, stageKey?: StageKey) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Default: show risk & urgent items
      const urgent: Array<{ lane: ResourceLane; item: WorkItem; match: string }> = [];
      for (const lane of batch.lanes) {
        for (const item of lane.items) {
          const light = itemLight(item);
          if (light === "red" || light === "yellow" || item.locked) {
            urgent.push({
              lane,
              item,
              match: light === "red" ? "高风险逾期" : item.locked ? "锁定中" : "临期关注",
            });
          }
        }
      }
      return urgent.slice(0, 8);
    }

    const matches: Array<{ lane: ResourceLane; item: WorkItem; match: string }> = [];
    for (const lane of batch.lanes) {
      const laneMatches = lane.name.toLowerCase().includes(q) || lane.type.toLowerCase().includes(q);
      for (const item of lane.items) {
        const dri = PEOPLE[item.driId];
        const stage = STAGES.find((s) => s.key === item.stage);
        const hitName = laneMatches;
        const hitDri = dri?.name.toLowerCase().includes(q) || dri?.title.toLowerCase().includes(q);
        const hitStage = stage?.name.toLowerCase().includes(q) || stage?.short.toLowerCase().includes(q);
        const hitState = stateLabel(item).toLowerCase().includes(q);

        if (hitName || hitDri || hitStage || hitState) {
          matches.push({
            lane,
            item,
            match: hitName ? `资源：${lane.name}` : hitDri ? `负责人：${dri.name}` : hitStage ? `阶段：${stage?.name}` : "状态匹配",
          });
        }
      }
    }
    return matches.slice(0, 10);
  }, [batch, query]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={null}
      closable={false}
      className="spotlight-modal"
      width={560}
      centered
      destroyOnClose
    >
      <div className="spotlight-box">
        <div className="spotlight-head" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <EmotionBall
            emotion={query.trim() ? "40" : "02"}
            size={24}
            interactive={false}
            lite={true}
          />
          <Input
            ref={inputRef as any}
            placeholder="搜索资源名称、阶段、负责人 (支持拼音/汉字)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && results.length > 0) {
                onSelect(results[0].item.id, results[0].item.stage);
                onClose();
              }
            }}
            variant="borderless"
            className="spotlight-input"
          />
          <kbd className="spotlight-kbd">ESC 关闭</kbd>
        </div>
        <div className="spotlight-body">
          <div className="spotlight-section-title">
            {query.trim() ? `搜索结果 (${results.length})` : "建议关注 / 快捷定位"}
          </div>
          {results.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 0" }}>
              <EmotionBall emotion="04" size={56} interactive={true} lite={true} />
              <Text type="secondary" style={{ marginTop: 10, fontSize: 13 }}>
                未找到匹配的资源或负责人
              </Text>
            </div>
          ) : (
            <div className="spotlight-list">
              {results.map(({ lane, item, match }) => {
                const light = itemLight(item);
                const stage = STAGES.find((s) => s.key === item.stage);
                return (
                  <button
                    key={`${lane.id}-${item.id}`}
                    type="button"
                    className="spotlight-item"
                    onClick={() => {
                      onSelect(item.id, item.stage);
                      onClose();
                    }}
                  >
                    <div className="spotlight-item-left">
                      <span className={`spotlight-dot ${light}`} />
                      <div className="spotlight-item-info">
                        <div className="spotlight-item-title">
                          <span className="spotlight-item-name">{lane.name}</span>
                          <Tag className="spotlight-stage-tag">{stage?.name ?? item.stage}</Tag>
                          <Tag className="spotlight-state-tag">{stateLabel(item)}</Tag>
                        </div>
                        <div className="spotlight-item-meta">
                          {avatar(item.driId, 16)}
                          <span>{PEOPLE[item.driId].name}</span>
                          <span className="spotlight-match-hint">{match}</span>
                        </div>
                      </div>
                    </div>
                    <div className="spotlight-item-right">
                      <span className="spotlight-due">{formatDay(item.dueAt)}</span>
                      <ArrowRightOutlined className="spotlight-arrow" style={{ fontSize: "0.85rem", color: "var(--muted)" }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="spotlight-footer">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> 浏览 · <kbd>↵</kbd> 打开 · <kbd>1~7</kbd> 阶段速切
          </span>
          <span className="spotlight-foot-right">精灵交付 · 全局控制台</span>
        </div>
      </div>
    </Modal>
  );
}
