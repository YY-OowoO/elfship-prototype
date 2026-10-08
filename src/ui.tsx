import {
  memo,
  Fragment,
  lazy,
  Suspense,
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
  InboxOutlined,
  ArrowRightOutlined,
  ProjectOutlined,
  PartitionOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import {
  AssetTypeBadge,
  ItemStatusIcon,
  BellRinging,
  Lightning,
  FastForward,
  DownloadSimple,
  CheckCircle,
  WarningOctagon,
  HourglassMedium,
  FlagBanner,
  LockKey,
  CalendarBlank,
  Sparkle,
} from "./icons";
import NumberFlow from "@number-flow/react";
import { motion, AnimatePresence } from "motion/react";
import { PEOPLE, STAGES, type HolidayInfo } from "./mock";
import { AVATAR_COLORS, palette } from "./tokens";
import {
  batchLights,
  currentItem,
  findBlockedDownstream,
  formatDay,
  formatDayWithWeekday,
  getDayScheduleType,
  getHolidayInfo,
  itemLight,
  listWorkdays,
  remainLabel,
  stateLabel,
  stateTone,
  weekdayLabel,
  workdaysBetween,
} from "./logic";
import { playSound } from "./sound";
import { HolidayIconRenderer, SmallWeekIcon, BigWeekIcon } from "./components/FestiveIcons";
import { FestiveEasterEggModal } from "./components/FestiveEasterEggModal";
const ThreeDeliveryTorus = lazy(() =>
  import("./components/three/ThreeDeliveryTorus").then((m) => ({ default: m.ThreeDeliveryTorus }))
);
const ThreeProcessRunway = lazy(() =>
  import("./components/three/ThreeProcessRunway").then((m) => ({ default: m.ThreeProcessRunway }))
);
const ThreeChronoDial = lazy(() =>
  import("./components/three/ThreeChronoDial").then((m) => ({ default: m.ThreeChronoDial }))
);
import type { LaunchBatch, PersonId, ResourceLane, StageKey, WorkItem } from "./types";
import { prefersReduce } from "./motion/prefers";
import { Fill, Reveal, entrance } from "./motion/Entrance";
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
  isKeyboardFocused,
  onHoverBlocker,
  onHoverCard,
  quickAction,
  onNudge,
  detailed,
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
  isKeyboardFocused?: boolean;
  onHoverBlocker?: (hovering: boolean) => void;
  onHoverCard?: (hovering: boolean) => void;
  quickAction?: { label: string; onClick: () => void; icon?: string };
  onNudge?: () => void;
  detailed?: boolean;
}) {
  const light = itemLight(item);
  const due = light === "red" || light === "yellow" ? remainLabel(item.dueAt) : formatDay(item.dueAt);
  const tagIcon = <ItemStatusIcon item={item} extra={extra} size={13} />;
  const totalGates = item.completeWhen.length + item.enterNextWhen.length;
  const passedGates =
    item.completeWhen.filter((g) => g.ok).length +
    item.enterNextWhen.filter((g) => g.ok).length;
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
      }${isHighlighted ? " is-row-focused" : ""}${isKeyboardFocused ? " keyboard-focused" : ""}`}
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
                ? "03" // 锁定待命：好奇歪头守望前置工序进展
                : light === "red"
                ? "34" // 严重逾期：红脸急促细颤警报
                : light === "yellow"
                ? "11" // 临期关注：倾斜一大一小探究眼神
                : item.state === "confirmed"
                ? "33" // 已达成通关：欢快雀跃自旋撒花
                : item.state === "submitted"
                ? "19" // 已提交待审：双眼节奏性上下点头等待审批
                : item.state === "rework"
                ? "17" // 返工整改：争分夺秒急促排查
                : item.state === "in_progress"
                ? "30" // 制作在制中：极客视线巡回专注推进
                : "02"; // 初始就绪：待机轻柔巡视

              const elfStatus = item.locked
                ? "精灵状态：守望待命（关注前置节点推进）"
                : light === "red"
                ? "精灵状态：逾期警报（红脸警觉细颤）"
                : light === "yellow"
                ? "精灵状态：临期督促（歪头探究打量）"
                : item.state === "confirmed"
                ? "精灵状态：通关达成（雀跃庆祝）"
                : item.state === "submitted"
                ? "精灵状态：已提交待审（规律点头等待）"
                : item.state === "rework"
                ? "精灵状态：返工排查（争分夺秒）"
                : item.state === "in_progress"
                ? "精灵状态：专注推进（视线巡回运转）"
                : "精灵状态：就绪待命";

              return (
                <Tooltip title={elfStatus}>
                  <span
                    style={{ display: "inline-flex", cursor: "pointer" }}
                    className={`k-card-elf-wrap state-${item.state} light-${light} ${item.locked ? "is-locked" : ""}`}
                  >
                    <EmotionBall
                      emotion={elfEmotion}
                      size={20}
                      interactive={true}
                      autostart={true}
                      noBlink={true}
                      idle={false}
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
              <BellRinging weight="duotone" size={13} style={{ marginRight: 2 }} />
              催办
            </button>
          ) : null}
        </Flex>
        <Flex justify="space-between" align="center" gap={6} className="k-card-state">
          <Tag variant="filled" className="k-card-tag" title={extra ?? stateLabel(item)}>
            <span className="k-tag-icon" aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", marginRight: 3 }}>
              {tagIcon}
            </span>
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
        {detailed && (
          <div
            className="k-card-detail-pane"
            style={{
              padding: "6px 8px",
              borderRadius: 6,
              background: "rgba(15, 23, 42, 0.03)",
              border: "1px solid rgba(15, 23, 42, 0.06)",
              fontSize: 11,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "var(--ink-soft)", fontSize: 10.5 }}>SVN 凭证</span>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: 10.5,
                  fontFamily: "var(--font-mono, monospace)",
                  color: item.evidence?.svnRev ? "#0284c7" : "#94a3b8",
                }}
              >
                {item.evidence?.svnRev ? `r${item.evidence.svnRev}` : "未提交版本"}
              </span>
            </div>
            {totalGates > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <span style={{ color: "var(--ink-soft)", fontSize: 10.5 }}>门禁达标</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: passedGates === totalGates ? "#10b981" : "#f59e0b" }}>
                    {passedGates}/{totalGates}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
        <Flex align="center" justify="space-between" gap={6} className="k-card-who">
          <Flex align="center" gap={6} style={{ minWidth: 0 }}>
            {avatar(item.driId, 22)}
            <Text type="secondary" ellipsis={{ tooltip: `${PEOPLE[item.driId].name} · ${PEOPLE[item.driId].title}` }} style={{ fontSize: 12 }}>
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
              <Lightning weight="duotone" size={13} style={{ marginRight: 2 }} />
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

/* =========================================================
   MASTER DYNAMIC HERO COCKPIT (单一主动态交付中控舱)
   ========================================================= */
export function HeroDynamicDeliveryCockpit({
  batch,
  risk,
  today,
  doneLanes,
  totalLanes,
  onChangeLaunchDate,
  onOpenItem,
  onNudge,
  onFilterQuick,
}: {
  batch: LaunchBatch;
  risk: { level: "risk" | "watch" | "ok"; sentence: string };
  today: string;
  doneLanes: number;
  totalLanes: number;
  onChangeLaunchDate?: () => void;
  onOpenItem?: (id: string) => void;
  onNudge?: (item: WorkItem, lane: ResourceLane) => void;
  onFilterQuick?: (filter: "all" | "risk" | "mine") => void;
}) {
  const [trackMode, setTrackMode] = useState<"2d" | "3d">("3d");
  const remainWorkdays = workdaysBetween(today, batch.launchDate);
  const confirmedSteps = batch.lanes
    .flatMap((l) => l.items)
    .filter((i) => i.state === "confirmed" || i.skipped).length;
  const totalSteps = batch.lanes.flatMap((l) => l.items).length;
  const wipSteps = batch.lanes
    .flatMap((l) => l.items)
    .filter((i) => i.state === "submitted" || i.state === "rework" || i.state === "rejected").length;
  const processPct = totalSteps === 0 ? 0 : Math.round((confirmedSteps / totalSteps) * 100);

  const paceLabel = useMemo(() => {
    if (remainWorkdays <= 3 && processPct < 70) return "风险预警 · 需提速";
    if (processPct >= 80) return "进度健康 · 即将通关";
    return "流转正常 · 符合预期";
  }, [remainWorkdays, processPct]);

  const categoryCount = useMemo(() => new Set(batch.lanes.map((l) => l.type)).size, [batch.lanes]);
  const lights = useMemo(() => batchLights(batch), [batch]);

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

  const watchItems = useMemo(() => {
    const list: Array<{
      id: string;
      itemId: string;
      title: string;
      laneName: string;
      stageName: string;
      ownerName: string;
      stageKey: StageKey;
      isYellow: boolean;
    }> = [];

    for (const lane of batch.lanes) {
      const cur = currentItem(lane);
      if (!cur || cur.state === "confirmed") continue;

      const light = itemLight(cur);
      if (light === "red") continue; // 排除 P0 红色严重阻断项（已在上方阻断卡片突出呈现）

      const stageIdx = STAGES.findIndex((s) => s.key === cur.stage);
      const stageDef = STAGES[stageIdx] || { key: cur.stage, name: cur.stage, short: cur.stage };
      const dri = PEOPLE[cur.driId];

      const unmetGate = cur.completeWhen.find((g) => !g.ok) || cur.enterNextWhen.find((g) => !g.ok);
      let title = "";
      if (cur.state === "submitted") {
        title = `${lane.name}已提交待审核，待审批人回执`;
      } else if (unmetGate) {
        title = `${lane.name}待门禁达标（${unmetGate.label}）`;
      } else if (cur.evidence?.note) {
        title = `${lane.name} · ${cur.evidence.note}`;
      } else {
        title = `${lane.name} · ${stageDef.name}推进中`;
      }

      list.push({
        id: cur.id,
        itemId: cur.id,
        title,
        laneName: lane.name,
        stageName: `${stageIdx + 1}. ${stageDef.short}`,
        ownerName: dri?.name || "待指定",
        stageKey: cur.stage,
        isYellow: light === "yellow",
      });
    }

    return list
      .sort((a, b) => (b.isYellow ? 1 : 0) - (a.isYellow ? 1 : 0))
      .slice(0, 6);
  }, [batch]);

  const stageStats = useMemo(() => {
    return STAGES.map((s, idx) => {
      const totalAssets = batch.lanes.length;
      const confirmedCount = batch.lanes.filter((l) => {
        const item = l.items.find((i) => i.stage === s.key);
        return item && (item.state === "confirmed" || item.skipped);
      }).length;
      const lanesInStage = batch.lanes.filter((l) => {
        const cur = currentItem(l);
        return cur && cur.stage === s.key;
      });
      const redCount = lanesInStage.filter((l) => {
        const cur = currentItem(l);
        return cur && itemLight(cur) === "red";
      }).length;
      const yellowCount = lanesInStage.filter((l) => {
        const cur = currentItem(l);
        return cur && itemLight(cur) === "yellow";
      }).length;
      const allPassed = confirmedCount === totalAssets;
      const stagePct = Math.round((confirmedCount / totalAssets) * 100);
      return {
        stage: s,
        index: idx + 1,
        activeCount: lanesInStage.length,
        confirmedCount,
        totalAssets,
        stagePct,
        hasRed: redCount > 0,
        redCount,
        hasYellow: yellowCount > 0,
        yellowCount,
        allPassed,
      };
    });
  }, [batch]);

  const torusStageStatuses = useMemo(
    () =>
      stageStats.map((st) => ({
        key: st.stage.key,
        name: st.stage.name,
        isPassed: st.allPassed,
        hasRed: st.hasRed,
        hasYellow: st.hasYellow,
        progress: st.stagePct,
      })),
    [stageStats]
  );

  const runwayStages = useMemo(
    () =>
      stageStats.map((st) => ({
        key: st.stage.key,
        name: st.stage.name,
        index: st.index,
        confirmedCount: st.confirmedCount,
        totalAssets: st.totalAssets,
        stagePct: st.stagePct,
        hasRed: st.hasRed,
        hasYellow: st.hasYellow,
        allPassed: st.allPassed,
      })),
    [stageStats]
  );

  return (
    <motion.div className="hero-dynamic-cockpit" {...entrance(0, 16)}>
      <div className="cockpit-header-ticker">
        <div className="cockpit-ticker-left">
          <span className={`cockpit-pulse-badge ${risk.level === "risk" ? "danger" : "normal"}`}>
            <span className="cockpit-pulse-dot" />
            <span>{risk.level === "risk" ? "交付冲刺中 · 存在阻断卡点" : "交付推进中 · 节拍正常"}</span>
          </span>
          <span className="cockpit-batch-title">{batch.name}</span>
          <span className="cockpit-batch-meta">
            主责: <b>{PEOPLE[batch.batchDriId]?.name}</b> · 覆盖 {categoryCount} 类标准管线 · 共 {totalLanes} 项交付资产
          </span>
        </div>
        <div className="cockpit-ticker-right">
          <Tooltip title="3D 滚花铝质工期表盘：随剩余工作日精准旋转">
            <div className="cockpit-countdown-pill" style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "default" }}>
              <Suspense fallback={<span style={{ width: 22, height: 22, display: "inline-block" }} />}>
                <ThreeChronoDial size={22} daysRemain={remainWorkdays} />
              </Suspense>
              <span>剩余 <b>{remainWorkdays}</b> 个工作日</span>
              <span className="cockpit-countdown-sub">({formatDayWithWeekday(batch.launchDate)} 上线)</span>
            </div>
          </Tooltip>
          {onChangeLaunchDate && (
            <Button
              size="small"
              type="primary"
              ghost
              icon={<CalendarBlank size={12} weight="bold" />}
              onClick={onChangeLaunchDate}
              style={{ fontSize: 11, height: 26, borderRadius: 6 }}
            >
              排期推演
            </Button>
          )}
        </div>
      </div>

      <div className="cockpit-body-grid">
        <div className="cockpit-pipeline-zone">
          {/* 1. 顶部全景通关成熟度 HUD 阵列（融合 3D 拓扑几何环 + 大字号浮标） */}
          <div className="maturity-hud-header">
            <div className="maturity-hud-left" style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Tooltip title="全景通关成熟度 · 按住可旋转视角">
                <div style={{ cursor: "grab", display: "inline-flex", flexShrink: 0 }}>
                  <Suspense fallback={<div style={{ width: 144, height: 144, borderRadius: "50%", border: "2px dashed #cbd5e1" }} />}>
                    <ThreeDeliveryTorus
                      size={144}
                      processPct={processPct}
                      hasRed={lights.red > 0}
                      stageStatuses={torusStageStatuses}
                    />
                  </Suspense>
                </div>
              </Tooltip>
              <div className="maturity-percent-pill">
                <span className="maturity-percent-num">
                  <NumberFlow value={processPct} />%
                </span>
                <div className="maturity-percent-meta">
                  <span className="maturity-percent-title">全景通关成熟度</span>
                  <span className="maturity-percent-sub">{confirmedSteps} / {totalSteps} 步骤确认</span>
                </div>
              </div>
              <div className="maturity-status-pill">
                <span className="cockpit-pulse-dot" style={{ background: processPct >= 80 ? "#10b981" : "#2563eb" }} />
                <span>{paceLabel}</span>
              </div>
            </div>

            <div className="maturity-hud-right">
              <div className="maturity-metric-chips">
                <Tooltip title="点击定位到终审入库交付泳道">
                  <span
                    className="m-chip m-chip-done"
                    onClick={() => {
                      onFilterQuick?.("all");
                      const col = document.getElementById("flow-col-checkin");
                      if (col) {
                        col.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
                        col.classList.add("col-focus-pulse");
                        setTimeout(() => col.classList.remove("col-focus-pulse"), 1600);
                      }
                    }}
                  >
                    <CheckCircle size={13} weight="fill" />
                    <b>{doneLanes}</b>/{totalLanes} 项入库
                  </span>
                </Tooltip>
                <Tooltip title="点击聚焦查看所有在制工序">
                  <span
                    className="m-chip m-chip-wip"
                    onClick={() => {
                      onFilterQuick?.("all");
                    }}
                  >
                    <HourglassMedium size={13} weight="bold" />
                    <b>{wipSteps}</b> 步在制推进
                  </span>
                </Tooltip>
                {lights.red > 0 && (
                  <Tooltip title="点击只看 P0 严重阻断资产项">
                    <span
                      className="m-chip m-chip-danger"
                      onClick={() => {
                        onFilterQuick?.("risk");
                      }}
                    >
                      <span className="cockpit-mini-pulse" />
                      <b>{lights.red}</b> 项 P0 阻断
                    </span>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>

          {/* 2. 7 节点工序动态流转脉动轨道（纯净明亮琴板横梁 · Piano Fallboard Architecture） */}
          <div
            className="cockpit-track-section"
            style={{
              borderRadius: 14,
              overflow: "hidden",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.05)",
            }}
          >
            {/* 浅色奢华香槟金拉丝琴盖音板 (Brushed Champagne Titanium & Ivory Fallboard) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 18px",
                background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
                borderBottom: "1px solid #e2e8f0",
                position: "relative",
              }}
            >
              {/* 顶部镶嵌拉丝香槟黄铜金线 */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: "linear-gradient(90deg, #d97706 0%, #f59e0b 25%, #fbbf24 50%, #f59e0b 75%, #d97706 100%)",
                  opacity: 0.95,
                }}
              />

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 6,
                    height: 16,
                    borderRadius: 2,
                    background: "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)",
                    boxShadow: "0 0 6px rgba(245, 158, 11, 0.4)",
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      color: "#0f172a",
                    }}
                  >
                    7 节点工序流转时序
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Segmented
                  size="small"
                  value={trackMode}
                  onChange={(v) => {
                    playSound.click();
                    setTrackMode(v as "2d" | "3d");
                  }}
                  options={[
                    { label: "3D 视效", value: "3d" },
                    { label: "2D 紧凑", value: "2d" },
                  ]}
                />
              </div>
            </div>

            {trackMode === "3d" ? (
              <div style={{ padding: "10px 14px 12px", background: "#ffffff" }}>
                <Suspense fallback={<div style={{ height: 146, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 12 }}>3D 管道加载中...</div>}>
                  <ThreeProcessRunway
                    stages={runwayStages}
                    height={146}
                    onSelectStage={(sKey) => {
                      onFilterQuick?.("all");
                      const col = document.getElementById(`flow-col-${sKey}`);
                      if (col) {
                        col.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
                        col.classList.add("col-focus-pulse");
                        setTimeout(() => col.classList.remove("col-focus-pulse"), 1600);
                      }
                    }}
                  />
                </Suspense>
                {/* Micro legend labels below 3D runway with precise grid alignment */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "0 20px", marginTop: 6, gap: 4 }}>
                  {stageStats.map((st) => {
                    const dotColor = st.hasRed ? "#ef4444" : st.allPassed ? "#10b981" : st.hasYellow ? "#f59e0b" : "#3b82f6";
                    return (
                      <Tooltip
                        key={st.stage.key}
                        title={`${st.index}. ${st.stage.name} · 达成率 ${st.stagePct}% · ${st.hasRed ? "存在阻断卡点" : st.allPassed ? "全员已通关" : "在制推进中"}`}
                      >
                        <div
                          onClick={() => {
                            onFilterQuick?.("all");
                            const col = document.getElementById(`flow-col-${st.stage.key}`);
                            if (col) {
                              col.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
                              col.classList.add("col-focus-pulse");
                              setTimeout(() => col.classList.remove("col-focus-pulse"), 1600);
                            }
                          }}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 2,
                            cursor: "pointer",
                            padding: "3px 2px",
                            borderRadius: 6,
                            background: st.hasRed ? "#fff1f2" : "transparent",
                            border: st.hasRed ? "1px solid #fecaca" : "1px solid transparent",
                            transition: "all 0.18s ease",
                          }}
                        >
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background: dotColor,
                                display: "inline-block",
                                boxShadow: st.hasRed ? "0 0 6px rgba(239, 68, 68, 0.7)" : "none",
                              }}
                            />
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: st.hasRed || st.allPassed ? 700 : 600,
                                color: st.hasRed ? "#b91c1c" : st.allPassed ? "#059669" : "#334155",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {st.index}. {st.stage.short}
                            </span>
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: st.hasRed ? "#ef4444" : st.allPassed ? "#10b981" : "#94a3b8",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {st.stagePct}%
                          </span>
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="maturity-pulse-runway">
                {stageStats.map((st) => {
                  const s = st.stage;
                  const isPassed = st.allPassed;
                  const isBlocked = st.hasRed;
                  const isWatch = st.hasYellow;
                  const isWip = st.activeCount > 0;
                  const stageDris = Array.from(
                    new Set(
                      batch.lanes
                        .map((l) => l.items.find((i) => i.stage === s.key)?.driId)
                        .filter(Boolean)
                    )
                  ) as string[];

                  return (
                    <Tooltip
                      key={s.key}
                      title={
                        <div style={{ padding: "6px 4px", fontSize: 12, minWidth: 200 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                            <span>{st.index}. {s.name} ({s.short})</span>
                            <span style={{ color: isPassed ? "#52c41a" : isBlocked ? "#ff4d4f" : "#1677ff", fontSize: 11, fontWeight: 700 }}>
                              {isPassed ? "全员已通关" : isBlocked ? `${st.redCount} 项阻断` : `${st.activeCount} 项在制`}
                            </span>
                          </div>
                          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, marginBottom: 4 }}>
                            工序达成: <b>{st.confirmedCount}</b> / {st.totalAssets} 项资产 (<b>{st.stagePct}%</b>)
                          </div>
                          {stageDris.length > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 10.5, color: "rgba(255,255,255,0.75)" }}>
                              <span>主责团队:</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                {stageDris.slice(0, 3).map((dId) => (
                                  <span key={dId} style={{ background: "rgba(255,255,255,0.15)", padding: "1px 5px", borderRadius: 3, fontSize: 10 }}>
                                    {PEOPLE[dId as PersonId]?.name || dId}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div style={{ marginTop: 6, color: "#93c5fd", fontSize: 10.5 }}>点击可快速定位主看板该工序列</div>
                        </div>
                      }
                    >
                      <div
                        className={`pulse-node-card node-${isBlocked ? "blocked" : isPassed ? "passed" : isWatch ? "watch" : isWip ? "wip" : "pending"}`}
                        onClick={() => {
                          onFilterQuick?.("all");
                          const col = document.getElementById(`flow-col-${s.key}`);
                          if (col) {
                            col.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
                            col.classList.add("col-focus-pulse");
                            setTimeout(() => col.classList.remove("col-focus-pulse"), 1600);
                          }
                        }}
                      >
                        {/* 背景达成率填充 */}
                        <div className="pulse-node-fill" style={{ width: `${st.stagePct}%` }} />
                        {/* 动态波纹光流（根据工序状态自动匹配对应色彩划过：橙色/主题蓝/绿色） */}
                        {(isWip || isWatch) && !isBlocked && <div className="pulse-node-shimmer" />}
                        {/* 阻断阶段红色告警脉冲 */}
                        {isBlocked && <div className="pulse-node-alert" />}

                        {/* 节点顶层内容 */}
                        <div className="pulse-node-inner">
                          <div className="pulse-node-header">
                            <span className="pulse-node-idx">{st.index}</span>
                            <span className="pulse-node-name">{s.short}</span>
                          </div>

                          <div className="pulse-node-badge-row">
                            {isBlocked ? (
                              <span className="pulse-tag tag-danger">
                                <span className="cockpit-mini-pulse" />
                                {st.redCount} 阻断
                              </span>
                            ) : isPassed ? (
                              <span className="pulse-tag tag-success">
                                <CheckCircle size={10} weight="fill" />
                                通关
                              </span>
                            ) : isWatch ? (
                              <span className="pulse-tag tag-warning">{st.yellowCount} 临期</span>
                            ) : isWip ? (
                              <span className="pulse-tag tag-primary">{st.activeCount} 推进</span>
                            ) : (
                              <span className="pulse-tag tag-muted">待前置</span>
                            )}
                          </div>

                          <div className="pulse-node-bottom">
                            <div className="pulse-micro-track">
                              <div
                                className="pulse-micro-bar"
                                style={{
                                  width: `${st.stagePct}%`,
                                  background: isPassed ? "var(--status-ok, #10b981)" : isBlocked ? "var(--status-danger, #ef4444)" : isWip ? "var(--primary, #2563eb)" : "var(--line-strong, #cbd5e1)",
                                }}
                              />
                            </div>
                            <span className="pulse-pct-text">{st.stagePct}%</span>
                          </div>
                        </div>
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className={`cockpit-action-box ${risk.level === "risk" ? "has-risk" : "is-healthy"}`}>
          <div className="cockpit-action-box-head">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Tooltip title="灵动精灵：实时感知批次交付健康状态">
                <span
                  style={{ cursor: "pointer", display: "inline-flex" }}
                  onClick={() => dispatchElfEvent("diagnosis_requested")}
                >
                  <EmotionBall
                    emotion={risk.level === "risk" ? "34" : risk.level === "watch" ? "11" : "02"}
                    size={38}
                    lite={true}
                    interactive={true}
                    label="Andon"
                  />
                </span>
              </Tooltip>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: risk.level === "risk" ? "#b91c1c" : "#166534" }}>
                  {risk.level === "risk" ? `${lights.red} 项严重阻断 · ${lights.yellow} 项关注` : "全盘节拍健康 · 0 项阻塞"}
                </div>
                <div style={{ fontSize: 11, color: risk.level === "risk" ? "#ef4444" : "#15803d" }}>
                  {risk.level === "risk" ? "需主责人即刻介入处理" : "所有工序按计划有序推进"}
                </div>
              </div>
            </div>
          </div>

          {blockers.length > 0 ? (
            <div className="cockpit-risk-workbench">
              {/* 1. Primary Blocker Highlight */}
              <div className="cockpit-blocker-primary">
                <div className="cockpit-blocker-primary-top">
                  <span className="cockpit-p0-badge">P0 阻断</span>
                  <span className="cockpit-blocker-target" title={blockers[0].lane.name}>{blockers[0].lane.name}</span>
                  <span className="cockpit-stage-tag">{STAGES.find((s) => s.key === blockers[0].item.stage)?.name}</span>
                </div>
                <div className="cockpit-blocker-primary-sub">
                  <span>主责: <b>{PEOPLE[blockers[0].item.driId]?.name || blockers[0].item.driId}</b></span>
                  <span className="cockpit-meta-divider">·</span>
                  <span className="cockpit-duration-warn">已持续 4h 12m</span>
                </div>
              </div>

              {/* 2. Downstream Impact Topology Chain */}
              <div className="cockpit-impact-section">
                <div className="cockpit-section-header">
                  <span className="cockpit-section-title">波及下游工序链路</span>
                  <span className="cockpit-delay-badge">预计拖延 +1.5d</span>
                </div>
                <div className="cockpit-impact-chain">
                  <div className="impact-node is-source">
                    <span className="impact-node-badge badge-red">4. 上传</span>
                    <span className="impact-node-label">阻断源</span>
                  </div>
                  <div className="impact-arrow arrow-blocked" title="依赖阻断">
                    <span className="impact-arrow-line" />
                    <span className="impact-arrow-mark">×</span>
                  </div>
                  <div className="impact-node is-locked">
                    <span className="impact-node-badge badge-gray">5. 审核</span>
                    <span className="impact-node-label">挂起中</span>
                  </div>
                  <div className="impact-arrow arrow-locked">
                    <span className="impact-arrow-line" />
                    <span className="impact-arrow-mark">›</span>
                  </div>
                  <div className="impact-node is-locked">
                    <span className="impact-node-badge badge-gray">6. 验收</span>
                    <span className="impact-node-label">待入场</span>
                  </div>
                  <div className="impact-arrow arrow-locked">
                    <span className="impact-arrow-line" />
                    <span className="impact-arrow-mark">›</span>
                  </div>
                  <div className="impact-node is-locked">
                    <span className="impact-node-badge badge-gray">7. 入库</span>
                    <span className="impact-node-label">门禁冻结</span>
                  </div>
                </div>
              </div>

              {/* 3. 6-Item Watchlist Feed */}
              <div className="cockpit-watchlist-section">
                <div className="cockpit-section-header">
                  <span className="cockpit-section-title">次级关注事项清单</span>
                  <span className="cockpit-watchlist-pill">
                    {watchItems.length > 0 ? `${watchItems.length} 项关注待办` : "0 项异常 · 进展良好"}
                  </span>
                </div>
                <div className="cockpit-watchlist-list">
                  {watchItems.length === 0 ? (
                    <div style={{ padding: "16px 8px", textAlign: "center", color: "#64748b", fontSize: 12 }}>
                      全线在制工序健康推进，暂无次级预警待办
                    </div>
                  ) : (
                    watchItems.map((w, idx) => (
                      <div
                        key={w.id || idx}
                        className="cockpit-watchlist-row"
                        onClick={() => {
                          onOpenItem?.(w.itemId);
                          const col = document.getElementById(`flow-col-${w.stageKey}`);
                          if (col) {
                            col.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
                            col.classList.add("col-focus-pulse");
                            setTimeout(() => col.classList.remove("col-focus-pulse"), 1600);
                          }
                        }}
                        title={`${w.title} · 点击打开工序详情并聚焦泳道`}
                      >
                        <div className="watchlist-row-left">
                          <span className="watchlist-row-index">0{idx + 1}</span>
                          <span
                            className="watchlist-warn-dot"
                            style={!w.isYellow ? { background: "#3b82f6", boxShadow: "none" } : undefined}
                          />
                          <span className="watchlist-title-text">{w.title}</span>
                        </div>
                        <div className="watchlist-row-right">
                          <span className="watchlist-stage-chip">{w.stageName}</span>
                          <span className="watchlist-owner-chip">{w.ownerName}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 4. Action Footer Buttons */}
              <div className="cockpit-action-btns">
                <Button
                  size="small"
                  type="primary"
                  danger
                  onClick={() => {
                    onOpenItem?.(blockers[0].item.id);
                    const col = document.getElementById(`flow-col-${blockers[0].item.stage}`);
                    if (col) {
                      col.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
                      col.classList.add("col-focus-pulse");
                      setTimeout(() => col.classList.remove("col-focus-pulse"), 1600);
                    }
                  }}
                  style={{ height: 28, fontSize: 11, fontWeight: 700, flex: 1, borderRadius: 6 }}
                >
                  即刻排查
                </Button>
                <Button
                  size="small"
                  icon={<BellRinging size={12} weight="bold" />}
                  onClick={() => onNudge?.(blockers[0].item, blockers[0].lane)}
                  style={{ height: 28, fontSize: 11, fontWeight: 600, borderRadius: 6 }}
                >
                  一键催办
                </Button>
              </div>
            </div>
          ) : (
            <div className="cockpit-clean-brief">
              <div style={{ fontSize: 12, color: "#166534", lineHeight: 1.4 }}>
                当前所有资产工序均在正常交期内，无锁定依赖。
              </div>
              <Button
                size="small"
                type="link"
                onClick={() => onFilterQuick?.("all")}
                style={{ padding: 0, fontSize: 11, color: "#16a34a" }}
              >
                查看全部流水线
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
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
  onFilterQuick,
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
  onFilterQuick?: (filter: "all" | "risk" | "mine") => void;
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

  const timeElapsedPct =
    allBatchDays.length > 0 && todayIdx >= 0
      ? Math.min(100, Math.round(((todayIdx + 1) / allBatchDays.length) * 100))
      : 54;

  const itemsByDate: Record<string, Array<{ lane: ResourceLane; item: WorkItem }>> = {};
  for (const lane of batch.lanes) {
    for (const it of lane.items) {
      if (it.dueAt) {
        if (!itemsByDate[it.dueAt]) itemsByDate[it.dueAt] = [];
        itemsByDate[it.dueAt].push({ lane, item: it });
      }
    }
  }

  const [activeEggHoliday, setActiveEggHoliday] = useState<{ holiday: HolidayInfo; iso: string } | null>(null);

  const displayedDays = useMemo(() => {
    return listWorkdays(today, batch.launchDate);
  }, [today, batch.launchDate]);

  const weekSprints = useMemo(() => {
    return [
      {
        id: "w1",
        label: "W1 · 8/10 - 8/14 (大周)",
        theme: "概念与排期定标 · 大周双休",
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
        label: "W2 · 8/17 - 8/22 (小周)",
        theme: "核心资产攻坚 · 小周周六冲刺",
        total: 28,
        done: 17,
        wip: 9,
        risk: 1,
        watch: 1,
        status: "current" as const,
        statusText: "攻坚中 · 1卡点阻塞 · 小周排期",
        dates: ["2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21", "2026-08-22"],
      },
      {
        id: "w3",
        label: "W3 · 8/24 - 8/26 (大周)",
        theme: "集成验收与上线准出 · 大周双休",
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

  const milestoneGates = useMemo(() => {
    return [
      {
        id: "gate-1",
        num: "Gate 1",
        title: "需求排期冻结",
        date: "08月11日",
        status: "passed" as const,
        icon: <CheckCircle size={18} weight="duotone" color="#52c41a" />,
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
        icon: <WarningOctagon size={18} weight="duotone" color="#ff4d4f" />,
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
        icon: <HourglassMedium size={18} weight="duotone" color="#1677ff" />,
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
        icon: <FlagBanner size={18} weight="duotone" color="#52c41a" />,
        tag: "终审准出目标",
        desc: "全资源 SVN 入库与分支合并",
        dri: "龙慧 · 上新安排",
      },
    ];
  }, []);

  return (
    <div className="hero-runway-card">
      <HeroDynamicDeliveryCockpit
        batch={batch}
        risk={risk}
        today={today}
        doneLanes={doneLanes}
        totalLanes={totalLanes}
        onChangeLaunchDate={onChangeLaunchDate}
        onOpenItem={onOpenItem}
        onNudge={onNudge}
        onFilterQuick={onFilterQuick}
      />

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
                { label: <span><CalendarBlank size={13} weight="duotone" style={{ marginRight: 4 }} />日视图 · 冲刺聚焦</span>, value: "day" },
                { label: <span><ProjectOutlined style={{ marginRight: 4 }} />周视图 · 节拍大盘</span>, value: "week" },
                { label: <span><PartitionOutlined style={{ marginRight: 4 }} />门禁里程碑 · 阶段验收</span>, value: "gate" },
              ]}
              className="hr-lens-segmented"
            />
            <span className="hr-bound-pill is-target">
              <FlagBanner size={13} weight="duotone" style={{ marginRight: 4 }} /> 上线 {formatDay(batch.launchDate)}
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
                const holiday = getHolidayInfo(iso);
                const schedType = getDayScheduleType(iso);
                const isSmallSat = schedType === "small_week_saturday";

                const tooltipContent = (
                  <div className="hr-node-popover">
                    {/* Holiday Vector Banner */}
                    {holiday && (
                      <div className="hr-np-festival-banner" style={{ borderLeft: `3px solid ${holiday.themeColor}` }}>
                        <div style={{ fontWeight: 700, color: holiday.themeColor, fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                          <HolidayIconRenderer holidayKey={holiday.iconKey} size={14} />
                          <span>{holiday.name} · {holiday.tag}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{holiday.greeting}</div>
                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 4, background: "#f8fafc", padding: "4px 6px", borderRadius: 4, display: "flex", alignItems: "flex-start", gap: 4 }}>
                          <Sparkle size={12} weight="duotone" color={holiday.themeColor} style={{ marginTop: 2, flexShrink: 0 }} />
                          <span><b>节日研发彩蛋：</b>{holiday.easterEgg} (点击卡片查看)</span>
                        </div>
                      </div>
                    )}

                    {/* Small Week Saturday Badge */}
                    {isSmallSat && (
                      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: "4px 8px", marginBottom: 6, fontSize: 11, color: "#15803d", display: "flex", alignItems: "center", gap: 5 }}>
                        <SmallWeekIcon size={13} color="#15803d" />
                        <span><b>大小周排期日</b>：周六正常推进工序交付，周日单休 1 天</span>
                      </div>
                    )}

                    <div className="hr-np-title">
                      <b>{formatDay(iso)}（周{wday}{holiday ? ` · ${holiday.name}` : isSmallSat ? " · 小周" : ""}）</b>
                      {isToday && <Tag color="blue">今天</Tag>}
                      {isLaunch && <Tag color="green">目标上线日</Tag>}
                      {holiday && (
                        <Tag color={holiday.themeColor} icon={<HolidayIconRenderer holidayKey={holiday.iconKey} size={11} style={{ marginRight: 3 }} />}>
                          {holiday.tag}
                        </Tag>
                      )}
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
                const dayDiff = prevIso
                  ? Math.round((new Date(iso).getTime() - new Date(prevIso).getTime()) / 86400000)
                  : 0;
                const isWeekendJump = dayDiff > 1;
                const isBigWeekJump = dayDiff >= 3;

                return (
                  <div key={iso} style={{ display: "contents" }}>
                    {isWeekendJump && (
                      <div className="hr-weekend-gap" title={isBigWeekJump ? "大周双休（周六+周日连休2天）" : "周日休息（小周单休1天）"}>
                        <span className={`hr-weekend-pill ${isBigWeekJump ? "is-big-week" : "is-small-week"}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {isBigWeekJump ? (
                            <>
                              <BigWeekIcon size={12} color="#475569" />
                              <span>大周双休</span>
                            </>
                          ) : (
                            <span>休 (周日)</span>
                          )}
                        </span>
                      </div>
                    )}
                    <Tooltip title={tooltipContent} overlayClassName="hr-tooltip">
                      <motion.div
                        {...entrance(i * 0.045, 10)}
                        className={`hr-capsule-card${isToday ? " is-today" : ""}${isLaunch ? " is-launch" : ""}${
                          holiday ? " is-festival" : ""
                        }${
                          redCount > 0 ? " has-risk" : yellowCount > 0 ? " has-watch" : !isToday && !isLaunch && !holiday ? " is-muted" : ""
                        }${isSelected ? " is-selected" : ""}`}
                        onMouseEnter={() => {
                          onHoverDate?.(iso);
                          setSelectedEntity(iso);
                        }}
                        onClick={() => {
                          if (holiday) {
                            playSound.fanfare();
                            setActiveEggHoliday({ holiday, iso });
                            dispatchElfEvent("holiday_egg", {
                              message: `【${holiday.name}】${holiday.greeting} ${holiday.easterEgg}`,
                            });
                          } else {
                            playSound.click();
                            window.setTimeout(() => {
                              const boardEl = document.querySelector(".board-flow") || document.querySelector(".flow-board-wrap");
                              boardEl?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                            }, 50);
                          }
                          onHoverDate?.(iso);
                          setSelectedEntity(iso);
                        }}
                      >
                        <div className="hr-cap-top">
                          <span className="hr-cap-day">{dayNum}</span>
                          <span className="hr-cap-wday">
                            {isToday ? "今天" : isLaunch ? "上线" : isSmallSat ? "周六 (小周)" : `周${wday}`}
                          </span>
                        </div>

                        <div className="hr-cap-badge-wrap">
                          {holiday ? (
                            <span
                              className="hr-cap-badge badge-festival"
                              style={{
                                background: holiday.themeColor + "15",
                                color: holiday.themeColor,
                                borderColor: holiday.themeColor + "45",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <HolidayIconRenderer holidayKey={holiday.iconKey} size={12} />
                              <span>{holiday.tag}</span>
                            </span>
                          ) : isSmallSat && dateItems.length === 0 ? (
                            <span className="hr-cap-badge badge-small-sat" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                              <SmallWeekIcon size={11} color="#15803d" />
                              <span>小周推进</span>
                            </span>
                          ) : redCount > 0 ? (
                            <span className="hr-cap-badge badge-risk">
                              <WarningOctagon size={12} weight="duotone" /> {dateItems.find((x) => itemLight(x.item) === "red")?.lane.name.slice(0, 4)} 逾期
                            </span>
                          ) : yellowCount > 0 ? (
                            <span className="hr-cap-badge badge-watch">
                              <HourglassMedium size={12} weight="duotone" /> {dateItems.find((x) => itemLight(x.item) === "yellow")?.lane.name.slice(0, 4)} 临期
                            </span>
                          ) : isToday ? (
                            <span className="hr-cap-badge badge-today">
                              <span className="hr-live-dot" /> 进行中
                            </span>
                          ) : isLaunch ? (
                            <span className="hr-cap-badge badge-launch">
                              <FlagBanner size={12} weight="duotone" /> 目标交付
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
                          <CheckCircle size={12} weight="duotone" />
                        ) : w.status === "current" ? (
                          <HourglassMedium size={12} weight="duotone" />
                        ) : (
                          <LockKey size={12} weight="duotone" />
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
                      {w.risk > 0 && <span className="hr-week-risk-text"><WarningOctagon size={12} weight="duotone" /> {w.risk} 项阻塞</span>}
                      {w.watch > 0 && <span className="hr-week-watch-text"><HourglassMedium size={12} weight="duotone" /> {w.watch} 临期</span>}
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

      {/* 3. Studio Festive Easter Egg Modal */}
      <FestiveEasterEggModal
        visible={Boolean(activeEggHoliday)}
        holiday={activeEggHoliday?.holiday ?? null}
        holidayKey={activeEggHoliday?.holiday.iconKey ?? ""}
        onClose={() => setActiveEggHoliday(null)}
      />
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
              <CheckCircle size={13} weight="duotone" style={{ marginRight: 4, color: "#52c41a" }} />
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
  onGenerateReport,
  onClear,
}: {
  selectedCount: number;
  totalCount: number;
  onBatchAdvance: () => void;
  onBatchNudge: () => void;
  onExportList: () => void;
  onGenerateReport?: () => void;
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
        <Button
          type="primary"
          size="small"
          icon={<FastForward size={14} weight="duotone" />}
          onClick={onBatchAdvance}
        >
          批量流转下一阶段
        </Button>
        <Button
          type="default"
          size="small"
          icon={<BellRinging size={14} weight="duotone" />}
          onClick={onBatchNudge}
        >
          批量催办
        </Button>
        <Button
          type="default"
          size="small"
          icon={<DownloadSimple size={14} weight="duotone" />}
          onClick={onExportList}
        >
          导出清单
        </Button>
        {onGenerateReport ? (
          <Button
            type="default"
            size="small"
            icon={<FileTextOutlined />}
            onClick={onGenerateReport}
          >
            生成交付日报富文本
          </Button>
        ) : null}
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
      destroyOnHidden
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
                        <div className="spotlight-item-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="spotlight-item-name">{lane.name}</span>
                          <AssetTypeBadge type={lane.type} size={12} />
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
