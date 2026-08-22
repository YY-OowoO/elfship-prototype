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
  type DragOverEvent,
  type DragMoveEvent,
  type DragStartEvent,
  type DropAnimation,
  type KeyboardCoordinateGetter,
  type Modifier,
} from "@dnd-kit/core";
import { getEventCoordinates } from "@dnd-kit/utilities";
import NumberFlow from "@number-flow/react";
import { Button, Drawer, Input, Popover, Space, Tag, Tooltip, Typography } from "antd";
import {
  AppstoreOutlined,
  UserOutlined,
  FolderOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  ExportOutlined,
} from "@ant-design/icons";

const { Text } = Typography;
import { STAGES } from "./mock";
import {
  canConfirm,
  currentItem,
  findBlockedDownstream,
  groupLanesByDri,
  groupLanesByType,
  itemLight,
  nextStageKey,
  occupants,
  remainLabel,
  stageRollup,
  stateLabel,
} from "./logic";
import { CARD_CAP, StageProgress, WorkCard } from "./ui";
import { KanbanFlip } from "./motion/KanbanFlip";
import { EmotionBall, dispatchElfEvent } from "./emotion-ball";
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

const columnCollision: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    const col = pointerCollisions.find((c) => String(c.id).startsWith("col:"));
    if (col) return [col];
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

/**
 * Snap the geometric center of the drag overlay onto the mouse pointer.
 *
 * Uses `draggingNodeRect` (the overlay's own measured rect, matching the
 * official @dnd-kit/modifiers implementation) and falls back to
 * `activeNodeRect` when the overlay hasn't been measured yet.
 *
 * `getEventCoordinates` from @dnd-kit/utilities handles native PointerEvent /
 * MouseEvent / TouchEvent.  We add a manual fallback for edge-cases (React 19
 * synthetic-event wrappers).
 */
const snapCenterToCursor: Modifier = ({
  activatorEvent,
  draggingNodeRect,
  activeNodeRect,
  transform,
}) => {
  const rect = draggingNodeRect ?? activeNodeRect;
  if (!activatorEvent || !rect) return transform;

  // Extract click coordinates – native events first, then manual fallback.
  const coords = getEventCoordinates(activatorEvent)
    ?? extractClientXY(activatorEvent);
  if (!coords) return transform;

  const offsetX = coords.x - rect.left;
  const offsetY = coords.y - rect.top;

  return {
    ...transform,
    x: transform.x + offsetX - rect.width / 2,
    y: transform.y + offsetY - rect.height / 2,
  };
};

/** Fallback coordinate extractor for React 19 synthetic-event edge-cases. */
function extractClientXY(event: Event | null): { x: number; y: number } | null {
  if (!event) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = event as any;
  if (typeof e.clientX === "number") return { x: e.clientX, y: e.clientY };
  const native = e.nativeEvent;
  if (native && typeof native.clientX === "number")
    return { x: native.clientX, y: native.clientY };
  return null;
}

type OverlayCard = {
  lane: ResourceLane;
  item: WorkItem;
  extra: string;
  width: number;
};

function DraggableWorkCard({
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
  onHoverBlocker,
  onHoverCard,
  quickAction,
  onNudge,
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
  onHoverBlocker?: (hovering: boolean) => void;
  onHoverCard?: (hovering: boolean) => void;
  quickAction?: { label: string; onClick: () => void; icon?: string };
  onNudge?: () => void;
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
  const handleProps = useMemo(
    () => ({ ...listeners, ...attributes, onKeyDown: isDragging ? undefined : listeners?.onKeyDown }),
    [listeners, attributes, isDragging],
  );
  return (
    <div
      ref={setNodeRef}
      className={`k-drag${ghost ? " is-ghost" : ""}${landing ? " is-land" : ""}${isDragging ? " is-dragging" : ""}`}
      {...listeners}
      onKeyDown={undefined}
    >
      <InnerCard
        lane={lane}
        item={item}
        extra={extra}
        onOpen={guardedOpen}
        handleProps={handleProps}
        isDependencyTarget={isDependencyTarget}
        isDependencyDimmed={isDependencyDimmed}
        isDateFocus={isDateFocus}
        isDateDimmed={isDateDimmed}
        isHighlighted={isHighlighted}
        onHoverBlocker={onHoverBlocker}
        onHoverCard={onHoverCard}
        quickAction={quickAction}
        onNudge={onNudge}
      />
    </div>
  );
}

const InnerCard = memo(function InnerCard({
  lane,
  item,
  extra,
  onOpen,
  handleProps,
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
  lane: ResourceLane;
  item: WorkItem;
  extra?: string;
  onOpen: () => void;
  handleProps: Record<string, unknown>;
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
  return (
    <WorkCard
      name={lane.name}
      item={item}
      extra={extra}
      onOpen={onOpen}
      dragHandle={handleProps as ButtonHTMLAttributes<HTMLButtonElement>}
      isDependencyTarget={isDependencyTarget}
      isDependencyDimmed={isDependencyDimmed}
      isDateFocus={isDateFocus}
      isDateDimmed={isDateDimmed}
      isHighlighted={isHighlighted}
      onHoverBlocker={onHoverBlocker}
      onHoverCard={onHoverCard}
      quickAction={quickAction}
      onNudge={onNudge}
    />
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
  const bindColRef = useCallback((stage: StageKey) => (node: HTMLDivElement | null) => {
    colRefs.current[stage] = node;
  }, []);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
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

  const driGroups = useMemo(() => groupLanesByDri(batch.lanes), [batch.lanes]);
  const typeGroups = useMemo(() => groupLanesByType(batch.lanes), [batch.lanes]);

  const active = activeLaneId ? batch.lanes.find((l) => l.id === activeLaneId) : null;
  const activeItem = active ? currentItem(active) : null;
  const nextKey = activeItem ? nextStageKey(activeItem.stage) : null;
  const ready = activeItem ? canConfirm(activeItem, actor) === null : false;

  const lastPosRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const tiltTimerRef = useRef<number | null>(null);

  const dropAnimation: DropAnimation = {
    duration: 220,
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
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
      return [
        { ...end, x: end.x, y: end.y + 2, scaleX: 0.98, scaleY: 0.98 },
        { ...end, x: end.x, y: end.y, scaleX: 1, scaleY: 1 },
      ];
    },
  };

  function handleDragStart(e: DragStartEvent) {
    if (closingRef.current) return;
    closingRef.current = false;
    lastPosRef.current = null;
    if (tiltTimerRef.current) {
      window.clearTimeout(tiltTimerRef.current);
      tiltTimerRef.current = null;
    }
    document.documentElement.style.setProperty("--drag-tilt", "0deg");
    document.documentElement.classList.add("is-board-drag");
    const laneId = parseLaneId(String(e.active.id));
    const lane = laneId ? batch.lanes.find((row) => row.id === laneId) : null;
    const item = lane ? currentItem(lane) : null;
    if (!laneId || !lane || !item) return;

    setActiveLaneId(laneId);
    setOverlayCard({
      lane,
      item,
      extra: stateLabel(item),
      width: e.active.rect.current.initial?.width ?? 168,
    });
    const source = item.stage;
    if (source) setFocusStages([source]);
    dispatchElfEvent("drag_start");
  }

  function handleDragOver(e: DragOverEvent) {
    const next = e.over ? parseColId(String(e.over.id)) : null;
    setOverStage((cur) => (cur === next ? cur : next));
  }

  function handleDragMove(e: DragMoveEvent) {
    if (!e.delta) return;
    const now = performance.now();
    let instantVx = 0;
    if (lastPosRef.current) {
      const dt = Math.max(1, now - lastPosRef.current.time);
      instantVx = ((e.delta.x - lastPosRef.current.x) / dt) * 16;
    }
    lastPosRef.current = { x: e.delta.x, y: e.delta.y, time: now };

    const targetRot = Math.max(-4, Math.min(4, instantVx * 0.45));
    document.documentElement.style.setProperty("--drag-tilt", `${targetRot.toFixed(2)}deg`);

    if (tiltTimerRef.current) window.clearTimeout(tiltTimerRef.current);
    tiltTimerRef.current = window.setTimeout(() => {
      document.documentElement.style.setProperty("--drag-tilt", "0deg");
    }, 80);
  }

  function finishDrag(e: DragEndEvent) {
    const laneId = parseLaneId(String(e.active.id));
    const lane = laneId ? batch.lanes.find((l) => l.id === laneId) : null;
    const item = lane ? currentItem(lane) : null;
    const dest = e.over ? parseColId(String(e.over.id)) : null;
    const sourceStage = item?.stage;
    const allowed = item ? nextStageKey(item.stage) : null;
    const ok = dest && allowed === dest;

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

    setSettling(true);
    setActiveLaneId(null);
    setOverStage(null);

    if (dest && !ok && item) {
      window.setTimeout(() => onOpen(item.id), 260);
      if (sourceStage) setFocusStages([sourceStage]);
      dispatchElfEvent("drag_end");
    } else if (ok && laneId && dest && lane) {
      setLandingId(laneId);
      if (sourceStage) setFocusStages([sourceStage, dest]);
      onDropLane(laneId, dest);
      const destStageName = STAGES.find((s) => s.key === dest)?.name || dest;
      dispatchElfEvent("stage_advanced", {
        message: `【${lane.name}】已成功流转至【${destStageName}】！`,
        action: "burst",
      });
      window.setTimeout(() => setLandingId((cur) => (cur === laneId ? null : cur)), 420);
      window.setTimeout(() => setFocusStages([]), 420);
    } else {
      dispatchElfEvent("drag_end");
    }

    document.documentElement.classList.remove("is-board-drag");
    document.documentElement.style.removeProperty("--drag-tilt");
    window.setTimeout(() => {
      dropSlotRectRef.current = null;
      setSettling(false);
    }, 320);
    closingRef.current = false;
  }

  return (
    <div className="flow-board-wrap">
      {onSwimlaneDimChange ? (
        <div className="swimlane-controls">
          <span className="swimlane-label">看板视图：</span>
          <div className="swimlane-tabs">
            <button
              type="button"
              className={`swimlane-tab${swimlaneDim === "stage" ? " active" : ""}`}
              onClick={() => onSwimlaneDimChange("stage")}
            >
              <AppstoreOutlined style={{ marginRight: 4 }} />
              流程阶段 (7)
            </button>
            <button
              type="button"
              className={`swimlane-tab${swimlaneDim === "dri" ? " active" : ""}`}
              onClick={() => onSwimlaneDimChange("dri")}
            >
              <UserOutlined style={{ marginRight: 4 }} />
              按负责人 ({driGroups.length})
            </button>
            <button
              type="button"
              className={`swimlane-tab${swimlaneDim === "type" ? " active" : ""}`}
              onClick={() => onSwimlaneDimChange("type")}
            >
              <FolderOutlined style={{ marginRight: 4 }} />
              按资源类型 ({typeGroups.length})
            </button>
          </div>
        </div>
      ) : null}

      {swimlaneDim === "stage" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={columnCollision}
          measuring={{ droppable: { strategy: MeasuringStrategy.BeforeDragging } }}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragOver={handleDragOver}
          onDragEnd={finishDrag}
          onDragCancel={finishDrag}
        >
          <div className={`kanban${activeLaneId ? " is-dragging" : ""}`}>
            {stageColumns.map(({ st, roll, here }, i) => {
              const tone = !activeLaneId
                ? null
                : st.key === nextKey
                  ? ready
                    ? "ok"
                    : "wait"
                  : st.key === activeItem?.stage
                    ? "from"
                    : "dim";
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
                  hot={overStage === st.key && tone === "ok"}
                  active={stageFilter === st.key}
                  landingId={landingId}
                  activeLaneId={activeLaneId}
                  settling={settling}
                  flipping={!settling && (focusStages.length === 0 ? st.key === activeItem?.stage : focusStages.includes(st.key))}
                  registerColRef={bindColRef(st.key)}
                  actor={actor}
                  dependencyInfo={dependencyInfo}
                  hoveredBlockerLaneId={hoveredBlockerLaneId}
                  setHoveredBlockerLaneId={setHoveredBlockerLaneId}
                  hoveredDate={hoveredDate}
                  hoveredLaneId={hoveredLaneId}
                  setHoveredLaneId={setHoveredLaneId}
                  onNudge={onNudge}
                  onDropLane={onDropLane}
                  onFilter={() => {
                    onFilter(stageFilter === st.key ? null : st.key);
                    document
                      .getElementById(`flow-col-${st.key}`)
                      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                  }}
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
              modifiers={[snapCenterToCursor]}
            >
              {overlayCard ? (
                <OverlayContent
                  lane={overlayCard.lane}
                  item={overlayCard.item}
                  extra={overlayCard.extra}
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
}: {
  lane: ResourceLane;
  item: WorkItem;
  extra?: string;
}) {
  return (
    <div className="k-drag-overlay-inner">
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
    <>
      <div key={group.key} className="kanban-col" style={{ ["--col" as string]: idx }}>
        <div className="kanban-head-wrap">
          <div className="kanban-head">
            <div className="kanban-stat">
              <div className="kanban-stat-title" title={group.title}>{group.title}</div>
              <div className="kanban-stat-value">
                <NumberFlow value={group.done} />
                <span className="kanban-stat-suffix">/{group.total}</span>
              </div>
            </div>
            <div className="kanban-meta">{group.sub}</div>
          </div>
          <StageProgress done={group.done} total={group.total} light={group.done === group.total ? "ok" : "yellow"} />
        </div>
        <div className="kanban-card-stack">
          {group.rows.length === 0 && (
            <div className="k-empty" style={{ padding: "20px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <EmotionBall emotion="04" size={28} interactive={true} autostart={true} />
              <span style={{ fontSize: 11, color: "var(--muted)" }}>暂无对应资源</span>
            </div>
          )}
          {shown.map((row) => (
            <DraggableWorkCard
              key={row.lane.id}
              lane={row.lane}
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

          {hasOverflow && (
            <div className="swimlane-fold-footer">
              <Popover
                trigger="click"
                open={popOpen}
                onOpenChange={setPopOpen}
                title={`其余 ${rest.length} 条 · ${group.title}`}
                content={
                  <div className="more-list">
                    {rest.map((row) => (
                      <DraggableWorkCard
                        key={row.lane.id}
                        lane={row.lane}
                        item={row.item}
                        extra={stateLabel(row.item)}
                        isDateFocus={hoveredDate ? row.item.dueAt === hoveredDate : false}
                        isDateDimmed={hoveredDate ? row.item.dueAt !== hoveredDate : false}
                        isHighlighted={hoveredLaneId === row.lane.id}
                        onHoverCard={(hovering) => setHoveredLaneId?.(hovering ? row.lane.id : null)}
                        onNudge={onNudge ? () => onNudge(row.item, row.lane) : undefined}
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
                icon={<ExportOutlined />}
                className="swimlane-fold-btn"
                onClick={() => setDrawerOpen(true)}
              >
                全量 ({group.rows.length})
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Side-Drawer for Full Category Inspection (Never bursts the board height!) */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", paddingRight: 8 }}>
            <Space size={8}>
              <FolderOutlined style={{ color: "var(--brand-primary, #1677ff)" }} />
              <span style={{ fontWeight: 700 }}>{group.title}</span>
            </Space>
            <Tag color="blue">
              {group.done} / {group.total} 已达成
            </Tag>
          </div>
        }
        placement="right"
        width={380}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Input
            prefix={<SearchOutlined style={{ color: "var(--muted)" }} />}
            placeholder="搜索该分类下的资源..."
            value={filterKw}
            onChange={(e) => setFilterKw(e.target.value)}
            allowClear
            size="small"
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
            {filteredDrawerRows.map((row) => (
              <DraggableWorkCard
                key={row.lane.id}
                lane={row.lane}
                item={row.item}
                extra={stateLabel(row.item)}
                isDateFocus={hoveredDate ? row.item.dueAt === hoveredDate : false}
                isDateDimmed={hoveredDate ? row.item.dueAt !== hoveredDate : false}
                isHighlighted={hoveredLaneId === row.lane.id}
                onHoverCard={(hovering) => setHoveredLaneId?.(hovering ? row.lane.id : null)}
                onNudge={onNudge ? () => onNudge(row.item, row.lane) : undefined}
                onOpen={() => {
                  setDrawerOpen(false);
                  onOpen(row.item.id);
                }}
              />
            ))}
          </div>
        </div>
      </Drawer>
    </>
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
  tone: "ok" | "wait" | "from" | "dim" | null;
  hot: boolean;
  active: boolean;
  landingId: string | null;
  activeLaneId: string | null;
  settling: boolean;
  flipping: boolean;
  registerColRef: (node: HTMLDivElement | null) => void;
  actor: PersonId;
  dependencyInfo: { blockedLaneIds: string[]; blockedItemIds: string[]; reason: string } | null;
  hoveredBlockerLaneId: string | null;
  setHoveredBlockerLaneId: (id: string | null) => void;
  hoveredDate?: string | null;
  hoveredLaneId?: string | null;
  setHoveredLaneId?: (id: string | null) => void;
  onNudge?: (item: WorkItem, lane: ResourceLane) => void;
  onDropLane: (laneId: string, dest: StageKey) => void;
  onFilter: () => void;
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
    disabled: tone === "dim",
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
      registerColRef(node);
    },
    [registerColRef, setNodeRef],
  );

  return (
    <div
      id={`flow-col-${stage}`}
      ref={setRefs}
      className={`kanban-col ${roll.light}${active ? " on" : ""}${tone ? ` drop-${tone}` : ""}${hot ? " drop-hot" : ""}`}
      style={{ ["--col" as string]: index }}
    >
      <div className="kanban-head-wrap">
        <button className="kanban-head" title={`${fullName} (按数字键 ${index + 1} 快速筛选)`} onClick={onFilter}>
          <div className="kanban-stat">
            <div className="kanban-stat-title" title={fullName}>
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
      <KanbanFlip sig={flipSig} delay={index * 0.022} frozen={!flipping}>
        {here.length === 0 && roll.done === roll.total && roll.total > 0 && !hint && (
          <div className="k-empty" style={{ padding: "20px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <EmotionBall emotion="33" size={32} interactive={true} autostart={true} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ok)" }}>全员已通关</span>
          </div>
        )}
        {here.length === 0 && roll.done !== roll.total && !hint && (
          <div className="k-empty" style={{ padding: "20px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <EmotionBall emotion="04" size={28} interactive={true} autostart={true} />
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
              <ThunderboltOutlined style={{ marginRight: 4 }} />
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
