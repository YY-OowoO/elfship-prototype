import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ButtonHTMLAttributes } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragCancelEvent,
  type DragOverEvent,
  type DragStartEvent,
  type DropAnimation,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import NumberFlow from "@number-flow/react";
import { Button, Drawer, Input, Popover, Segmented, Tag, Tooltip, Typography, message } from "antd";
import {
  Kanban,
  UserCircle,
  Folder,
  StageIcon,
  MagnifyingGlass,
  FastForward,
  Lightning,
  ArrowCounterClockwise,
  ArrowRight,
  Crosshair,
  HourglassMedium,
  LockKey,
  WarningOctagon,
  CheckCircle,
} from "./icons";

const { Text } = Typography;
import { STAGES } from "./mock";
import {
  canConfirm,
  currentItem,
  findBlockedDownstream,
  groupLanesByDri,
  groupLanesByType,
  itemLight,
  nextActiveStageForLane,
  nextStageKey,
  occupants,
  remainLabel,
  stageIndex,
  stageRollup,
  stateLabel,
} from "./logic";
import { CARD_CAP, StageProgress, WorkCard } from "./ui";
import { KanbanFlip } from "./motion/KanbanFlip";
import { EmotionBall, dispatchElfEvent } from "./emotion-ball";
import { playSound } from "./sound";
import type { LaunchBatch, PersonId, ResourceLane, StageKey, SwimlaneDimension, WorkItem } from "./types";

function laneDragId(laneId: string) {
  return `lane:${laneId}`;
}

function colDragId(key: StageKey) {
  return `col:${key}`;
}

function parseLaneId(id: string) {
  return id.startsWith("lane:") ? id.slice(5) : null;
}

function parseColId(id: string): StageKey | null {
  return id.startsWith("col:") ? (id.slice(4) as StageKey) : null;
}

/**
 * Intelligent Kanban column collision detection:
 * 1. Prioritizes direct pointer intersection within column boundaries
 * 2. If pointer is outside direct vertical column bounds (e.g. above/below header),
 *    smoothly projects horizontal X coordinate to the nearest stage column center.
 * 3. Prevents target flickering when moving cards swiftly between adjacent columns.
 */
const columnCollision: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    const col = pointerCollisions.find((c) => String(c.id).startsWith("col:"));
    if (col) return [col];
  }

  const { droppableContainers, pointerCoordinates } = args;
  if (pointerCoordinates && droppableContainers.length > 0) {
    const cols = droppableContainers.filter((c) => String(c.id).startsWith("col:"));
    let closestCol = null;
    let minDistance = Infinity;

    for (const col of cols) {
      const rect = args.droppableRects.get(col.id);
      if (rect) {
        const inVerticalBand =
          pointerCoordinates.y >= rect.top - 150 &&
          pointerCoordinates.y <= rect.bottom + 250;

        if (inVerticalBand) {
          const colCenter = rect.left + rect.width / 2;
          const dist = Math.abs(pointerCoordinates.x - colCenter);
          if (dist < minDistance && dist <= rect.width * 0.95) {
            minDistance = dist;
            closestCol = col;
          }
        }
      }
    }

    if (closestCol) {
      return [{ id: closestCol.id, data: { value: minDistance } }];
    }
  }

  return rectIntersection(args);
};

const boardKeyboardCoordinates: KeyboardCoordinateGetter = (event, { currentCoordinates }) => {
  switch (event.code) {
    case "ArrowLeft":
      return { ...currentCoordinates, x: currentCoordinates.x - 150 };
    case "ArrowRight":
      return { ...currentCoordinates, x: currentCoordinates.x + 150 };
    case "Home":
      return { ...currentCoordinates, x: 0 };
    case "End":
      return { ...currentCoordinates, x: 1500 };
    default:
      return undefined;
  }
};

type OverlayCard = {
  lane: ResourceLane;
  item: WorkItem;
  extra: string;
  width: number;
};

const DraggableWorkCard = memo(function DraggableWorkCard({
  lane,
  item,
  extra,
  landing,
  ghost,
  locked,
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
  onOpen,
}: {
  lane: ResourceLane;
  item: WorkItem;
  extra?: string;
  landing?: boolean;
  ghost?: boolean;
  locked?: boolean;
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
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: laneDragId(lane.id),
    data: { laneId: lane.id, stage: item.stage },
    disabled: locked,
  });
  const dragAtRef = useRef(0);
  useEffect(() => {
    if (isDragging) dragAtRef.current = Date.now();
  }, [isDragging]);
  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onOpenRef.current = onOpen;
  });
  const guardedOpen = useCallback(() => {
    if (Date.now() - dragAtRef.current < 300) return;
    onOpenRef.current();
  }, []);
  const cardDomRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useCallback(
    (el: HTMLDivElement | null) => {
      setNodeRef(el);
      cardDomRef.current = el;
    },
    [setNodeRef],
  );

  useEffect(() => {
    if (isKeyboardFocused && cardDomRef.current) {
      cardDomRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [isKeyboardFocused]);

  const handleProps = useMemo(
    () => ({ ...listeners, ...attributes, onKeyDown: isDragging ? undefined : listeners?.onKeyDown }),
    [listeners, attributes, isDragging],
  );
  return (
    <div
      ref={handleRef}
      className={`k-drag${ghost ? " is-ghost" : ""}${landing ? " is-land" : ""}${isDragging ? " is-dragging" : ""}`}
      {...listeners}
      {...attributes}
    >
      <WorkCard
        name={lane.name}
        item={item}
        extra={extra}
        onOpen={guardedOpen}
        dragHandle={handleProps as ButtonHTMLAttributes<HTMLButtonElement>}
        isDependencyTarget={isDependencyTarget}
        isDependencyDimmed={isDependencyDimmed}
        isDateFocus={isDateFocus}
        isDateDimmed={isDateDimmed}
        isHighlighted={isHighlighted}
        isKeyboardFocused={isKeyboardFocused}
        onHoverBlocker={onHoverBlocker}
        onHoverCard={onHoverCard}
        quickAction={quickAction}
        onNudge={onNudge}
        detailed={detailed}
      />
    </div>
  );
});

export function FlowBoard({
  batch,
  actor,
  stageFilter,
  onFilter,
  onOpen,
  onDropLane,
  swimlaneDim = "stage",
  onSwimlaneDimChange,
  hoveredDate,
  hoveredLaneId,
  setHoveredLaneId,
  focusedCardId,
  onNudge,
}: {
  batch: LaunchBatch;
  actor: PersonId;
  stageFilter: StageKey | null;
  onFilter: (key: StageKey | null) => void;
  onOpen: (id: string) => void;
  onDropLane: (laneId: string, dest: StageKey) => void;
  swimlaneDim?: SwimlaneDimension;
  onSwimlaneDimChange?: (dim: SwimlaneDimension) => void;
  hoveredDate?: string | null;
  hoveredLaneId?: string | null;
  setHoveredLaneId?: (id: string | null) => void;
  focusedCardId?: string | null;
  onNudge?: (item: WorkItem, lane: ResourceLane) => void;
}) {
  const [activeLaneId, setActiveLaneId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<StageKey | null>(null);
  const [landingId, setLandingId] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);
  const [focusStages, setFocusStages] = useState<StageKey[]>([]);
  const [overlayCard, setOverlayCard] = useState<OverlayCard | null>(null);
  const [hoveredBlockerLaneId, setHoveredBlockerLaneId] = useState<string | null>(null);

  const dependencyInfo = useMemo(() => {
    if (!hoveredBlockerLaneId) return null;
    return findBlockedDownstream(batch, hoveredBlockerLaneId);
  }, [batch, hoveredBlockerLaneId]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
      if (!e.altKey) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= STAGES.length) {
        const targetStage = STAGES[num - 1].key;
        onFilter(stageFilter === targetStage ? null : targetStage);
        document.getElementById(`flow-col-${targetStage}`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFilter, stageFilter]);

  const dropDestRef = useRef<StageKey | null>(null);
  const dropSlotRectRef = useRef<{ left: number; top: number } | null>(null);
  const colRefs = useRef<Record<StageKey, HTMLDivElement | null>>({
    launch: null,
    schedule: null,
    produce: null,
    upload: null,
    review: null,
    accept: null,
    checkin: null,
  });
  const closingRef = useRef(false);
  const registerColRef = useCallback((stage: StageKey, node: HTMLDivElement | null) => {
    colRefs.current[stage] = node;
  }, []);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: boardKeyboardCoordinates }),
  );

  const stageColumns = useMemo(
    () =>
      STAGES.map((st) => ({
        st,
        roll: stageRollup(batch, st.key),
        here: occupants(batch, st.key),
      })),
    [batch],
  );

  const [cardDensity, setCardDensity] = useState<"compact" | "detailed">("compact");
  const driGroups = useMemo(() => groupLanesByDri(batch.lanes), [batch.lanes]);
  const typeGroups = useMemo(() => groupLanesByType(batch.lanes), [batch.lanes]);

  const active = activeLaneId ? batch.lanes.find((l) => l.id === activeLaneId) : null;
  const activeItem = active ? currentItem(active) : null;
  const nextKey = active && activeItem ? nextActiveStageForLane(active, activeItem.stage) : null;
  const ready = activeItem ? canConfirm(activeItem, actor) === null : false;

  const dropAnimation: DropAnimation = {
    duration: 160,
    easing: "cubic-bezier(0.18, 0.89, 0.32, 1.1)",
    keyframes: ({ dragOverlay }) => {
      const target = dropSlotRectRef.current;
      const fallback = dropDestRef.current
        ? colRefs.current[dropDestRef.current]?.querySelector(".kanban-flip")?.getBoundingClientRect()
        : null;
      const rect = target ?? (fallback ? { left: fallback.left + 6, top: fallback.top + 6 } : null);
      if (!rect) return [{ x: 0, y: 0, scaleX: 1, scaleY: 1 }];
      const end = {
        x: rect.left - dragOverlay.rect.left,
        y: rect.top - dragOverlay.rect.top,
        scaleX: 1,
        scaleY: 1,
      };
      return [{ ...end, x: end.x, y: end.y }];
    },
  };

  function handleDragStart(e: DragStartEvent) {
    if (closingRef.current) return;
    closingRef.current = false;
    setOverlayCard(null);
    document.documentElement.classList.add("is-board-drag");
    const laneId = parseLaneId(String(e.active.id));
    const lane = laneId ? batch.lanes.find((row) => row.id === laneId) : null;
    const item = lane ? currentItem(lane) : null;
    if (!laneId || !lane || !item) return;

    playSound.click();
    setActiveLaneId(laneId);
    const rect = e.active.rect.current as any;
    setOverlayCard({
      lane,
      item,
      extra: stateLabel(item),
      width: Math.max(168, rect?.width ?? rect?.initial?.width ?? 168),
    });
    const source = item.stage;
    if (source) setFocusStages([source]);
    dispatchElfEvent("drag_start");
  }

  function handleDragOver(e: DragOverEvent) {
    const next = e.over ? parseColId(String(e.over.id)) : null;
    setOverStage((cur) => {
      if (cur !== next) {
        if (next && next === nextKey && ready) {
          playSound.focus();
        }
        return next;
      }
      return cur;
    });
  }

  function finishDrag(e: DragEndEvent | DragCancelEvent) {
    const laneId = parseLaneId(String(e.active.id));
    const lane = laneId ? batch.lanes.find((l) => l.id === laneId) : null;
    const item = lane ? currentItem(lane) : null;
    const dest = e.over ? parseColId(String(e.over.id)) : null;
    const hasDestination = Boolean(dest);
    const sourceStage = item?.stage;
    const allowed = lane && item ? nextActiveStageForLane(lane, item.stage) : null;

    dropDestRef.current = dest;

    if (dest && colRefs.current[dest]) {
      const colEl = colRefs.current[dest];
      const flipArea = colEl?.querySelector(".kanban-flip");
      const existingCards = flipArea?.querySelectorAll(".k-drag:not(.is-ghost)") ?? [];
      if (existingCards.length > 0) {
        const lastCard = existingCards[existingCards.length - 1];
        const lastRect = lastCard.getBoundingClientRect();
        dropSlotRectRef.current = {
          left: lastRect.left,
          top: lastRect.bottom + 6,
        };
      } else if (flipArea) {
        const flipRect = flipArea.getBoundingClientRect();
        dropSlotRectRef.current = {
          left: flipRect.left + 6,
          top: flipRect.top + 6,
        };
      }
    } else {
      dropSlotRectRef.current = null;
    }

    setSettling(hasDestination);
    setOverlayCard(null);
    setActiveLaneId(null);
    setOverStage(null);
    document.documentElement.classList.remove("is-board-drag");

    if (!laneId || !lane || !item || !dest) {
      if (sourceStage) setFocusStages([]);
      dispatchElfEvent("drag_end");
      dropSlotRectRef.current = null;
      setSettling(false);
      closingRef.current = false;
      return;
    }

    // 1. Dropped on the same stage -> silent reset
    if (dest === item.stage) {
      dispatchElfEvent("drag_end");
      if (sourceStage) setFocusStages([]);
      dropSlotRectRef.current = null;
      setSettling(false);
      closingRef.current = false;
      return;
    }

    // 2. Check if the item is locked by upstream blockers
    if (item.locked) {
      playSound.reject();
      message.error(`【${lane.name}】前置工序存在卡点阻塞，已被锁定，暂无法推进流转！`);
      dispatchElfEvent("drag_end");
      if (sourceStage) setFocusStages([]);
      dropSlotRectRef.current = null;
      setSettling(false);
      closingRef.current = false;
      return;
    }

    // 3. Strict sequential pipeline check (must not skip stages)
    if (dest !== allowed) {
      playSound.reject();
      const destName = STAGES.find((s) => s.key === dest)?.name || dest;
      const srcName = STAGES.find((s) => s.key === item.stage)?.name || item.stage;
      const targetName = allowed ? STAGES.find((s) => s.key === allowed)?.name : null;
      const fromIdx = stageIndex(item.stage);
      const toIdx = stageIndex(dest);

      if (toIdx < fromIdx) {
        message.warning(`【${lane.name}】不可逆向流转至已完工的【${destName}】工序。如需退回返工，请在卡片详情中操作。`);
      } else if (targetName) {
        message.warning(`【${lane.name}】研发工序不可跨阶段跳过！当前处于【${srcName}】，请按流程流转至【${targetName}】。`);
      } else {
        message.info(`【${lane.name}】已至最后阶段或暂无可流转工序`);
      }
      dispatchElfEvent("drag_end");
      if (sourceStage) setFocusStages([]);
      dropSlotRectRef.current = null;
      setSettling(false);
      closingRef.current = false;
      return;
    }

    // 4. Gate criteria check
    const confirmReason = canConfirm(item, actor);
    if (confirmReason) {
      playSound.reject();
      message.warning(`【${lane.name}】未满足【${STAGES.find((s) => s.key === item.stage)?.name}】门禁准出要求：${confirmReason}`);
      onOpen(item.id);
      dispatchElfEvent("drag_end");
      if (sourceStage) setFocusStages([]);
      dropSlotRectRef.current = null;
      setSettling(false);
      closingRef.current = false;
      return;
    }

    // 5. Valid and passed gates! Advance stage
    playSound.confirm();
    setLandingId(laneId);
    if (sourceStage) setFocusStages([sourceStage, dest]);
    onDropLane(laneId, dest);
    const destStageName = STAGES.find((s) => s.key === dest)?.name || dest;
    dispatchElfEvent("stage_advanced", {
      message: `【${lane.name}】已成功流转至【${destStageName}】！`,
      action: "burst",
    });
    window.setTimeout(() => setLandingId((cur) => (cur === laneId ? null : cur)), 380);
    window.setTimeout(() => setFocusStages([]), 380);

    if (hasDestination) {
      window.setTimeout(() => {
        dropSlotRectRef.current = null;
        setSettling(false);
      }, 260);
    } else {
      dropSlotRectRef.current = null;
      setSettling(false);
    }
    closingRef.current = false;
  }

  const handleColumnFilter = useCallback(
    (stageKey: StageKey) => {
      onFilter(stageFilter === stageKey ? null : stageKey);
      document
        .getElementById(`flow-col-${stageKey}`)
        ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    },
    [onFilter, stageFilter],
  );

  const totalConfirmed = useMemo(() => {
    return batch.lanes.flatMap((l) => l.items).filter((i) => i.state === "confirmed" || i.skipped).length;
  }, [batch]);
  const totalWip = useMemo(() => {
    return batch.lanes.flatMap((l) => l.items).filter((i) => i.state === "submitted" || i.state === "rework").length;
  }, [batch]);
  const totalBlocked = useMemo(() => {
    return batch.lanes.flatMap((l) => l.items).filter((i) => !i.locked && itemLight(i) === "red").length;
  }, [batch]);

  return (
    <div className="flow-board-wrap" id="main-flow-board">
      {/* Hero Kanban Header Banner (突出主看板的绝对中心地位) */}
      <div className="flow-board-hero-banner">
        <div className="fb-hero-left">
          <div className="fb-hero-title-group">
            <div className="fb-hero-icon-box">
              <Kanban size={18} weight="fill" style={{ color: "#2563eb" }} />
            </div>
            <div>
              <div className="fb-hero-heading">
                <span className="fb-hero-main-title">交付主看板 · 7 节点工序流转</span>
                <span className="fb-hero-status-tag">核心执行中枢</span>
                {stageFilter && (
                  <Tag
                    closable
                    onClose={() => onFilter(null as any)}
                    color="processing"
                    style={{ margin: 0, fontSize: 11, display: "inline-flex", alignItems: "center" }}
                  >
                    已聚焦: {STAGES.find((s) => s.key === stageFilter)?.name}
                  </Tag>
                )}
              </div>
              <div className="fb-hero-sub-stats">
                <span>共 <b>{batch.lanes.length}</b> 项交付资产</span>
                <span className="fb-stat-dot">·</span>
                <span style={{ color: "#16a34a" }}><b>{totalConfirmed}</b> 步通关</span>
                <span className="fb-stat-dot">·</span>
                <span style={{ color: "#2563eb" }}><b>{totalWip}</b> 步在制推进</span>
                {totalBlocked > 0 && (
                  <>
                    <span className="fb-stat-dot">·</span>
                    <span className="fb-hero-danger-pill">
                      <span className="cockpit-mini-pulse" />
                      <b>{totalBlocked}</b> 项 P0 阻断
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="fb-hero-right">
          {onSwimlaneDimChange && (
            <div className="fb-segmented-wrap">
              <Segmented
                value={swimlaneDim}
                onChange={(v) => {
                  onSwimlaneDimChange(v as SwimlaneDimension);
                  document.getElementById("main-flow-board")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                }}
                options={[
                  {
                    value: "stage",
                    label: (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 4px" }}>
                        <Kanban size={14} weight={swimlaneDim === "stage" ? "fill" : "regular"} />
                        工序泳道 (7)
                      </span>
                    ),
                  },
                  {
                    value: "dri",
                    label: (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 4px" }}>
                        <UserCircle size={14} weight={swimlaneDim === "dri" ? "fill" : "regular"} />
                        主责人员 ({driGroups.length})
                      </span>
                    ),
                  },
                  {
                    value: "type",
                    label: (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 4px" }}>
                        <Folder size={14} weight={swimlaneDim === "type" ? "fill" : "regular"} />
                        资产类型 ({typeGroups.length})
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          )}
          <div className="fb-segmented-wrap">
            <Segmented
              size="small"
              value={cardDensity}
              onChange={(v) => {
                playSound.click();
                setCardDensity(v as "compact" | "detailed");
              }}
              options={[
                { label: "紧凑视效", value: "compact" },
                { label: "详细透视", value: "detailed" },
              ]}
            />
          </div>
        </div>
      </div>

      {swimlaneDim === "stage" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={columnCollision}
          autoScroll={{ threshold: { x: 0.12, y: 0.12 }, acceleration: 8 }}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={finishDrag}
          onDragCancel={finishDrag}
        >
          <div className={`kanban${activeLaneId ? " is-dragging" : ""}`}>
            {stageColumns.map(({ st, roll, here }, i) => {
              const fromIdx = activeItem ? stageIndex(activeItem.stage) : -1;
              const colIdx = stageIndex(st.key);
              const isSource = activeItem?.stage === st.key;
              const isAllowedNext = st.key === nextKey;
              const isPast = colIdx < fromIdx;
              const isForbidden = colIdx > fromIdx && !isAllowedNext;
              const tone = !activeLaneId
                ? null
                : isAllowedNext
                  ? ready
                    ? "ok"
                    : "wait"
                  : isSource
                    ? "from"
                    : isPast
                      ? "past"
                      : isForbidden
                        ? "forbidden"
                        : null;

              return (
                <FlowColumn
                  key={st.key}
                  stage={st.key}
                  title={st.short}
                  fullName={st.name}
                  index={i}
                  roll={roll}
                  here={here}
                  tone={tone}
                  hot={overStage === st.key}
                  active={stageFilter === st.key}
                  landingId={landingId}
                  activeLaneId={activeLaneId}
                  settling={settling}
                  flipping={!settling && !activeLaneId && (focusStages.length === 0 ? st.key === activeItem?.stage : focusStages.includes(st.key))}
                  registerColRef={registerColRef}
                  actor={actor}
                  dependencyInfo={dependencyInfo}
                  hoveredBlockerLaneId={hoveredBlockerLaneId}
                  setHoveredBlockerLaneId={setHoveredBlockerLaneId}
                  hoveredDate={hoveredDate}
                  hoveredLaneId={hoveredLaneId}
                  setHoveredLaneId={setHoveredLaneId}
                  focusedCardId={focusedCardId}
                  detailed={cardDensity === "detailed"}
                  onNudge={onNudge}
                  onDropLane={onDropLane}
                  onFilter={handleColumnFilter}
                  onOpen={onOpen}
                />
              );
            })}
          </div>
          {createPortal(
            <DragOverlay
              className="k-drag-layer"
              style={overlayCard ? { width: overlayCard.width } : undefined}
              dropAnimation={dropAnimation}
            >
              {overlayCard ? (
                <OverlayContent
                  lane={overlayCard.lane}
                  item={overlayCard.item}
                  extra={overlayCard.extra}
                  actor={actor}
                />
              ) : null}
            </DragOverlay>,
            document.body,
          )}
        </DndContext>
      ) : (
        /* Alternate Swimlane View (DRI or Type) with Collapsible Card Stack */
        <div className="kanban alternate-kanban">
          {(swimlaneDim === "dri" ? driGroups : typeGroups).map((group, idx) => (
            <AlternateSwimlaneColumn
              key={group.key}
              group={group}
              idx={idx}
              hoveredDate={hoveredDate}
              hoveredLaneId={hoveredLaneId}
              setHoveredLaneId={setHoveredLaneId}
              onNudge={onNudge}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const OverlayContent = memo(function OverlayContent({
  lane,
  item,
  extra,
  actor,
}: {
  lane: ResourceLane;
  item: WorkItem;
  extra?: string;
  actor: PersonId;
}) {
  const currentStageName = STAGES.find((s) => s.key === item.stage)?.name ?? item.stage;
  const nextKey = nextActiveStageForLane(lane, item.stage);
  const nextStageName = nextKey ? STAGES.find((s) => s.key === nextKey)?.name : null;
  const isLocked = item.locked;
  const gateReason = canConfirm(item, actor);

  return (
    <div className="k-drag-overlay-inner">
      <div className={`k-drag-flow-chip ${isLocked ? "chip-locked" : gateReason ? "chip-wait" : "chip-ok"}`}>
        <span className="chip-stage-from">{currentStageName}</span>
        <span className="chip-arrow">
          <ArrowRight size={10} weight="duotone" />
        </span>
        <span className="chip-stage-to">
          {isLocked
            ? (
                <>
                  <LockKey size={11} weight="duotone" color="#fff" style={{ marginRight: 2 }} />
                  <span style={{ whiteSpace: "nowrap" }}>存在卡点锁定</span>
                </>
              )
            : nextStageName
              ? `${nextStageName}工序`
              : "交付完结"}
        </span>
      </div>
      <WorkCard name={lane.name} item={item} extra={extra} onOpen={() => undefined} />
    </div>
  );
});

const SWIMLANE_CARD_CAP = 3;

const AlternateSwimlaneColumn = memo(function AlternateSwimlaneColumn({
  group,
  idx,
  hoveredDate,
  hoveredLaneId,
  setHoveredLaneId,
  onNudge,
  onOpen,
}: {
  group: { key: string; title: string; sub: string; done: number; total: number; rows: Array<{ lane: ResourceLane; item: WorkItem }> };
  idx: number;
  hoveredDate?: string | null;
  hoveredLaneId?: string | null;
  setHoveredLaneId?: (id: string | null) => void;
  onNudge?: (item: WorkItem, lane: ResourceLane) => void;
  onOpen: (id: string) => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [popOpen, setPopOpen] = useState(false);
  const [filterKw, setFilterKw] = useState("");

  const hasOverflow = group.rows.length > SWIMLANE_CARD_CAP;
  const shown = group.rows.slice(0, SWIMLANE_CARD_CAP);
  const rest = group.rows.slice(SWIMLANE_CARD_CAP);

  const filteredDrawerRows = useMemo(() => {
    if (!filterKw.trim()) return group.rows;
    const kw = filterKw.toLowerCase();
    return group.rows.filter(
      (r) => r.lane.name.toLowerCase().includes(kw) || r.item.id.toLowerCase().includes(kw)
    );
  }, [group.rows, filterKw]);

  return (
    <div className="kanban-col swimlane-group-col" style={{ ["--col" as string]: idx }}>
      <div className="kanban-head-wrap">
        <div className="kanban-head alternate-head">
          <div className="kanban-stat">
            <span className="kanban-stat-title">{group.title}</span>
            <div className="kanban-stat-value">
              <NumberFlow value={group.done} />
              <span className="kanban-stat-suffix">/{group.total}</span>
            </div>
          </div>
          <div className="kanban-meta">{group.sub}</div>
        </div>
        <StageProgress done={group.done} total={group.total} light={group.done === group.total ? "ok" : "yellow"} />
      </div>

      <div className="kanban-cards">
        {shown.map((row) => (
          <WorkCard
            key={row.lane.id}
            name={row.lane.name}
            item={row.item}
            extra={stateLabel(row.item)}
            isDateFocus={hoveredDate ? row.item.dueAt === hoveredDate : false}
            isDateDimmed={hoveredDate ? row.item.dueAt !== hoveredDate : false}
            isHighlighted={hoveredLaneId === row.lane.id}
            onHoverCard={(hovering) => setHoveredLaneId?.(hovering ? row.lane.id : null)}
            onNudge={onNudge ? () => onNudge(row.item, row.lane) : undefined}
            onOpen={() => onOpen(row.item.id)}
          />
        ))}

        {hasOverflow ? (
          <div className="swimlane-fold-footer">
            <Popover
              trigger="click"
              open={popOpen}
              onOpenChange={setPopOpen}
              title={`其余 ${rest.length} 条 · ${group.title}`}
              content={
                <div className="more-list">
                  {rest.map((row) => (
                    <WorkCard
                      key={row.lane.id}
                      name={row.lane.name}
                      item={row.item}
                      extra={stateLabel(row.item)}
                      onOpen={() => {
                        setPopOpen(false);
                        onOpen(row.item.id);
                      }}
                    />
                  ))}
                </div>
              }
            >
              <Button type="link" size="small" className="more-btn" style={{ fontSize: 12 }}>
                +{rest.length} 浮层速览
              </Button>
            </Popover>

            <Button
              type="text"
              size="small"
              icon={<FastForward size={13} weight="duotone" />}
              className="swimlane-fold-btn"
              onClick={() => setDrawerOpen(true)}
            >
              全量 ({group.rows.length})
            </Button>
          </div>
        ) : null}
      </div>

      <Drawer
        title={`${group.title} · 全部交付资源 (${group.rows.length})`}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={420}
        styles={{ body: { padding: 16 } }}
      >
        <Input
          placeholder="搜索资源名称..."
          prefix={<MagnifyingGlass size={14} />}
          value={filterKw}
          onChange={(e) => setFilterKw(e.target.value)}
          allowClear
          style={{ marginBottom: 12 }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filteredDrawerRows.map((row) => (
            <WorkCard
              key={row.lane.id}
              name={row.lane.name}
              item={row.item}
              extra={stateLabel(row.item)}
              onOpen={() => {
                setDrawerOpen(false);
                onOpen(row.item.id);
              }}
            />
          ))}
        </div>
      </Drawer>
    </div>
  );
});

const FlowColumn = memo(function FlowColumn({
  stage,
  title,
  fullName,
  index,
  roll,
  here,
  tone,
  hot,
  active,
  landingId,
  activeLaneId,
  settling,
  flipping,
  registerColRef,
  actor,
  dependencyInfo,
  hoveredBlockerLaneId,
  setHoveredBlockerLaneId,
  hoveredDate,
  hoveredLaneId,
  setHoveredLaneId,
  focusedCardId,
  detailed,
  onNudge,
  onDropLane,
  onFilter,
  onOpen,
}: {
  stage: StageKey;
  title: string;
  fullName: string;
  index: number;
  roll: ReturnType<typeof stageRollup>;
  here: Array<{ lane: ResourceLane; item: WorkItem }>;
  tone: "from" | "ok" | "wait" | "past" | "forbidden" | null;
  hot: boolean;
  active: boolean;
  landingId: string | null;
  activeLaneId: string | null;
  settling: boolean;
  flipping: boolean;
  registerColRef: (stage: StageKey, node: HTMLDivElement | null) => void;
  actor: PersonId;
  dependencyInfo: { blockedLaneIds: string[]; blockedItemIds: string[]; reason: string } | null;
  hoveredBlockerLaneId: string | null;
  setHoveredBlockerLaneId: (id: string | null) => void;
  hoveredDate?: string | null;
  hoveredLaneId?: string | null;
  setHoveredLaneId?: (id: string | null) => void;
  focusedCardId?: string | null;
  detailed?: boolean;
  onNudge?: (item: WorkItem, lane: ResourceLane) => void;
  onDropLane: (laneId: string, dest: StageKey) => void;
  onFilter: (stageKey: StageKey) => void;
  onOpen: (id: string) => void;
}) {
  const [popOpen, setPopOpen] = useState(false);

  useEffect(() => {
    if (activeLaneId) {
      setPopOpen(false);
    }
  }, [activeLaneId]);

  const { setNodeRef } = useDroppable({
    id: colDragId(stage),
    data: { stage },
  });
  const shown = here.slice(0, CARD_CAP);
  const rest = here.slice(CARD_CAP);
  const hint = tone === "ok" ? "放到这里确认流转" : tone === "wait" ? "需先提交，松手打开" : null;
  const flipSig = here
    .map((row) => `${row.lane.id}:${row.item.id}:${row.item.state}:${row.item.locked ? 1 : 0}`)
    .join("|");

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      registerColRef(stage, node);
    },
    [registerColRef, setNodeRef, stage],
  );

  return (
    <div
      id={`flow-col-${stage}`}
      ref={setRefs}
      className={`kanban-col ${roll.light}${active ? " on" : ""}${tone ? ` drop-${tone}` : ""}${hot ? " drop-hot" : ""}`}
      style={{ ["--col" as string]: index }}
    >
      <div className="kanban-head-wrap">
      <button
        className="kanban-head"
          title={`${fullName} (按 Alt+${index + 1} 快速筛选)`}
          onClick={() => onFilter(stage)}
        >
          <div className="kanban-stat">
            <div className="kanban-stat-title" title={fullName} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <StageIcon stage={stage} size={15} />
              <Text ellipsis={{ tooltip: fullName }}>{title}</Text>
            </div>
            <div className="kanban-stat-value">
              <NumberFlow value={roll.done} />
              <span className="kanban-stat-suffix">/{roll.total}</span>
            </div>
          </div>
          <Tooltip title={roll.soon ? `${fullName} · 临期：${remainLabel(roll.soon.dueAt)}${roll.blocked ? ` · ${roll.blocked}项锁定` : ""}` : `${fullName} · 全部已齐`}>
            <div className="kanban-meta">
              {roll.soon ? remainLabel(roll.soon.dueAt) : "已齐"}
              {roll.blocked ? ` · ${roll.blocked}锁` : ""}
            </div>
          </Tooltip>
        </button>
        <StageProgress done={roll.done} total={roll.total} light={roll.light} />
      </div>

      {activeLaneId && tone && (
        <div className={`k-stage-flow-guide flow-tone-${tone}`}>
          {tone === "from" && (
            <span className="guide-tag tag-from">
              <Crosshair size={12} weight="duotone" />
              <span>当前工序</span>
            </span>
          )}
          {tone === "ok" && (
            <span className="guide-tag tag-ok">
              <ArrowRight size={12} weight="duotone" />
              <span>允许流转</span>
            </span>
          )}
          {tone === "wait" && (
            <span className="guide-tag tag-wait">
              <HourglassMedium size={12} weight="duotone" />
              <span>待补门禁</span>
            </span>
          )}
          {tone === "past" && (
            <span className="guide-tag tag-past">
              <CheckCircle size={12} weight="duotone" />
              <span>已完工序</span>
            </span>
          )}
          {tone === "forbidden" && (
            <span className="guide-tag tag-forbidden">
              <WarningOctagon size={12} weight="duotone" />
              <span>禁止越级</span>
            </span>
          )}
        </div>
      )}

      {hot && tone && (
        <div className={`k-drop-silhouette tone-${tone}`}>
          <div className="k-drop-silhouette-inner">
            {tone === "ok" ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Lightning size={12} weight="duotone" />
                <span>释放即确认流转至【{title}】工序</span>
              </span>
            ) : tone === "wait" ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <WarningOctagon size={12} weight="duotone" />
                <span>需先补齐【{title}】准入门禁</span>
              </span>
            ) : tone === "forbidden" ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <WarningOctagon size={12} weight="duotone" />
                <span>研发工序不可跨阶段跳过</span>
              </span>
            ) : tone === "past" ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <ArrowCounterClockwise size={12} weight="duotone" />
                <span>前置工序（退回返工请在详情操作）</span>
              </span>
            ) : tone === "from" ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Crosshair size={12} weight="duotone" />
                <span>原位释放</span>
              </span>
            ) : null}
          </div>
        </div>
      )}

      <KanbanFlip sig={flipSig} delay={index * 0.022} frozen={!flipping}>
        {here.length === 0 && roll.done === roll.total && roll.total > 0 && !hint && (
          <div className="k-empty" style={{ padding: "20px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <EmotionBall emotion="33" size={32} interactive={true} autostart={true} noBlink={true} idle={false} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ok)" }}>全员已通关</span>
          </div>
        )}
        {here.length === 0 && roll.done !== roll.total && !hint && (
          <div className="k-empty" style={{ padding: "20px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <EmotionBall emotion="03" size={28} interactive={true} autostart={true} noBlink={true} idle={false} />
            <span style={{ fontSize: 11, color: "var(--muted)" }}>暂无待办资源</span>
          </div>
        )}
        {shown.map((row) => {
          const light = itemLight(row.item);
          const blocks = !row.item.locked && row.lane.items.some((x) => x.locked) && light === "red";
          const isTarget = dependencyInfo ? dependencyInfo.blockedLaneIds.includes(row.lane.id) : false;
          const isDimmed = dependencyInfo
            ? !dependencyInfo.blockedLaneIds.includes(row.lane.id) && hoveredBlockerLaneId !== row.lane.id
            : false;
          const isDateFocus = hoveredDate ? row.item.dueAt === hoveredDate : false;
          const isDateDimmed = hoveredDate ? row.item.dueAt !== hoveredDate : false;
          const isRowFocused = hoveredLaneId === row.lane.id;
          const isKeyFocused = focusedCardId === row.item.id;
          const canQuickConfirm = canConfirm(row.item, actor) === null && nextStageKey(row.item.stage);
          const quickAction = canQuickConfirm
            ? { label: "一键流转", onClick: () => onDropLane(row.lane.id, nextStageKey(row.item.stage)!) }
            : undefined;

          return (
            <DraggableWorkCard
              key={row.lane.id}
              lane={row.lane}
              item={row.item}
              extra={blocks ? "锁下游" : stateLabel(row.item)}
              landing={landingId === row.lane.id}
              ghost={activeLaneId === row.lane.id}
              locked={settling || (Boolean(activeLaneId) && activeLaneId !== row.lane.id)}
              isDependencyTarget={isTarget}
              isDependencyDimmed={isDimmed}
              isDateFocus={isDateFocus}
              isDateDimmed={isDateDimmed}
              isHighlighted={isRowFocused}
              isKeyboardFocused={isKeyFocused}
              onHoverBlocker={(hovering) => setHoveredBlockerLaneId(hovering && blocks ? row.lane.id : null)}
              onHoverCard={(hovering) => setHoveredLaneId?.(hovering ? row.lane.id : null)}
              quickAction={quickAction}
              onNudge={onNudge ? () => onNudge(row.item, row.lane) : undefined}
              detailed={detailed}
              onOpen={() => onOpen(row.item.id)}
            />
          );
        })}
        {rest.length > 0 && (
          <Popover
            trigger="click"
            open={popOpen && !activeLaneId}
            onOpenChange={setPopOpen}
            title={`其余 ${rest.length} 条 · ${fullName}`}
            content={
              <div className="more-list">
                {rest.map((row) => {
                  const light = itemLight(row.item);
                  const blocks = !row.item.locked && row.lane.items.some((x) => x.locked) && light === "red";
                  const isTarget = dependencyInfo ? dependencyInfo.blockedLaneIds.includes(row.lane.id) : false;
                  const isDimmed = dependencyInfo
                    ? !dependencyInfo.blockedLaneIds.includes(row.lane.id) && hoveredBlockerLaneId !== row.lane.id
                    : false;
                  const isDateFocus = hoveredDate ? row.item.dueAt === hoveredDate : false;
                  const isDateDimmed = hoveredDate ? row.item.dueAt !== hoveredDate : false;
                  const isRowFocused = hoveredLaneId === row.lane.id;
                  const canQuickConfirm = canConfirm(row.item, actor) === null && nextStageKey(row.item.stage);
                  const quickAction = canQuickConfirm
                    ? { label: "一键流转", onClick: () => onDropLane(row.lane.id, nextStageKey(row.item.stage)!) }
                    : undefined;

                  return (
                    <DraggableWorkCard
                      key={row.lane.id}
                      lane={row.lane}
                      item={row.item}
                      extra={blocks ? "锁下游" : stateLabel(row.item)}
                      landing={landingId === row.lane.id}
                      ghost={activeLaneId === row.lane.id}
                      locked={settling || (Boolean(activeLaneId) && activeLaneId !== row.lane.id)}
                      isDependencyTarget={isTarget}
                      isDependencyDimmed={isDimmed}
                      isDateFocus={isDateFocus}
                      isDateDimmed={isDateDimmed}
                      isHighlighted={isRowFocused}
                      onHoverBlocker={(hovering) => setHoveredBlockerLaneId(hovering && blocks ? row.lane.id : null)}
                      onHoverCard={(hovering) => setHoveredLaneId?.(hovering ? row.lane.id : null)}
                      quickAction={quickAction}
                      onNudge={onNudge ? () => onNudge(row.item, row.lane) : undefined}
                      onOpen={() => {
                        setPopOpen(false);
                        onOpen(row.item.id);
                      }}
                    />
                  );
                })}
              </div>
            }
          >
            <Button type="link" size="small" className="more-btn">
              +{rest.length}
            </Button>
          </Popover>
        )}
        {hot && (
          <div className="k-drop-silhouette">
            <div className="k-drop-silhouette-inner">
              <Lightning size={14} weight="duotone" style={{ marginRight: 4 }} />
              <span>释放即确认流转</span>
            </div>
          </div>
        )}
      </KanbanFlip>
      {hint && (
        <div className="kanban-hint" role="status" aria-live="polite">
          {hint}
        </div>
      )}
    </div>
  );
});
