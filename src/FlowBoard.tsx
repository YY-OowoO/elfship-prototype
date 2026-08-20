import { useMemo, useRef, useState } from "react";
import {
  DndContext,
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
  type DragStartEvent,
} from "@dnd-kit/core";
import { Button, Empty, Popover, Statistic } from "antd";
import { STAGES } from "./mock";
import {
  canConfirm,
  currentItem,
  itemLight,
  nextStageKey,
  occupants,
  remainLabel,
  stageRollup,
  stateLabel,
} from "./logic";
import type { LaunchBatch, PersonId, ResourceLane, StageKey, WorkItem } from "./types";
import { CARD_CAP, StageProgress, WorkCard, useCount } from "./ui";
import { CheckLottie } from "./motion/StatusLottie";
import { KanbanFlip } from "./motion/KanbanFlip";
import { DragLayer, seedDragPointer, type DragApi, type DragOrigin } from "./motion/DragLayer";

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

function clientPoint(event: Event): { x: number; y: number } | null {
  if ("clientX" in event && typeof (event as PointerEvent).clientX === "number") {
    return { x: (event as PointerEvent).clientX, y: (event as PointerEvent).clientY };
  }
  const touch = (event as TouchEvent).touches?.[0] ?? (event as TouchEvent).changedTouches?.[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
}

const columnCollision: CollisionDetection = (args) => {
  const cols = args.droppableContainers.filter((entry) => String(entry.id).startsWith("col:"));
  const scoped = { ...args, droppableContainers: cols };
  const pointer = pointerWithin(scoped);
  return pointer.length > 0 ? pointer : rectIntersection(scoped);
};

function DraggableWorkCard({
  lane,
  item,
  extra,
  landing,
  ghost,
  locked,
  onOpen,
}: {
  lane: ResourceLane;
  item: WorkItem;
  extra?: string;
  landing?: boolean;
  ghost?: boolean;
  locked?: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: laneDragId(lane.id),
    data: { laneId: lane.id, stage: item.stage },
    disabled: locked,
  });
  return (
    <div
      ref={setNodeRef}
      className={`k-drag${ghost || isDragging ? " is-ghost" : ""}${landing ? " is-land" : ""}`}
    >
      <WorkCard
        name={lane.name}
        item={item}
        extra={extra}
        onOpen={onOpen}
        dragHandle={{ ...listeners, ...attributes }}
      />
    </div>
  );
}

export function FlowBoard({
  batch,
  actor,
  stageFilter,
  onFilter,
  onOpen,
  onDropLane,
}: {
  batch: LaunchBatch;
  actor: PersonId;
  stageFilter: StageKey | null;
  onFilter: (key: StageKey | null) => void;
  onOpen: (id: string) => void;
  onDropLane: (laneId: string, dest: StageKey) => void;
}) {
  const [activeLaneId, setActiveLaneId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<StageKey | null>(null);
  const [landingId, setLandingId] = useState<string | null>(null);
  const [quietStage, setQuietStage] = useState<StageKey | null>(null);
  const [origin, setOrigin] = useState<DragOrigin | null>(null);
  const [settling, setSettling] = useState(false);
  const dragApi = useRef<DragApi | null>(null);
  const originRef = useRef<DragOrigin | null>(null);
  const closingRef = useRef(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const columns = useMemo(
    () =>
      STAGES.map((st) => ({
        st,
        roll: stageRollup(batch, st.key),
        here: occupants(batch, st.key),
      })),
    [batch],
  );

  const active = activeLaneId ? batch.lanes.find((l) => l.id === activeLaneId) : null;
  const activeItem = active ? currentItem(active) : null;
  const nextKey = activeItem ? nextStageKey(activeItem.stage) : null;
  const ready = activeItem ? canConfirm(activeItem, actor) === null : false;

  function handleDragStart(e: DragStartEvent) {
    if (closingRef.current) return;
    closingRef.current = false;
    document.documentElement.classList.add("is-board-drag");
    const laneId = parseLaneId(String(e.active.id));
    setActiveLaneId(laneId);
    const target = e.activatorEvent.target;
    const wrap = target instanceof Element ? target.closest(".k-drag") : null;
    const measured = wrap?.getBoundingClientRect();
    const rect = measured ?? e.active.rect.current.initial;
    const left = rect?.left ?? 0;
    const top = rect?.top ?? 0;
    const point = clientPoint(e.activatorEvent);
    if (point) seedDragPointer(point.x, point.y);
    const box: DragOrigin = {
      x: left,
      y: top,
      w: rect?.width ?? 168,
      h: rect?.height ?? 72,
      grabX: point ? point.x - left : 0,
      grabY: point ? point.y - top : 0,
    };
    originRef.current = box;
    setOrigin(box);
  }

  function handleDragOver(e: DragOverEvent) {
    const next = e.over ? parseColId(String(e.over.id)) : null;
    setOverStage((cur) => (cur === next ? cur : next));
  }

  async function finishDrag(e: DragEndEvent) {
    if (closingRef.current) return;
    closingRef.current = true;
    setSettling(true);
    const laneId = parseLaneId(String(e.active.id));
    const dest = e.over ? parseColId(String(e.over.id)) : null;
    const lane = laneId ? batch.lanes.find((row) => row.id === laneId) : null;
    const item = lane ? currentItem(lane) : null;
    const next = item ? nextStageKey(item.stage) : null;
    const box = originRef.current;
    const needConfirm = Boolean(item && dest === next && canConfirm(item, actor));
    const ok = Boolean(laneId && dest && item && dest === next && !needConfirm);
    setOverStage(null);

    try {
      if (box && dragApi.current) {
        const slot =
          ok && dest
            ? document.querySelector(`#flow-col-${dest} .kanban-flip`)?.getBoundingClientRect()
            : null;
        const x = slot ? slot.left + 6 : box.x;
        const y = slot ? slot.top + 6 : box.y;
        await Promise.race([
          dragApi.current.settle(x, y),
          new Promise<void>((resolve) => {
            window.setTimeout(resolve, 360);
          }),
        ]);
      }

      setActiveLaneId(null);
      setOrigin(null);
      originRef.current = null;

      if (needConfirm && item) {
        onOpen(item.id);
        return;
      }
      if (!ok || !laneId || !dest) return;
      setQuietStage(dest);
      setLandingId(laneId);
      onDropLane(laneId, dest);
      window.setTimeout(() => setQuietStage(null), 40);
      window.setTimeout(() => setLandingId((cur) => (cur === laneId ? null : cur)), 420);
    } finally {
      document.documentElement.classList.remove("is-board-drag");
      setSettling(false);
      closingRef.current = false;
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={columnCollision}
      measuring={{ droppable: { strategy: MeasuringStrategy.BeforeDragging } }}
      autoScroll={false}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={(e) => {
        void finishDrag(e);
      }}
      onDragCancel={(e) => {
        void finishDrag(e);
      }}
    >
      <div className={`kanban${activeLaneId ? " is-dragging" : ""}`}>
        {columns.map(({ st, roll, here }, i) => {
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
              flipping={!activeLaneId && !settling && quietStage !== st.key}
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
      {active && activeItem && origin ? (
        <DragLayer
          lane={active}
          item={activeItem}
          extra={stateLabel(activeItem)}
          origin={origin}
          apiRef={dragApi}
        />
      ) : null}
    </DndContext>
  );
}

function FlowColumn({
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
  onFilter: () => void;
  onOpen: (id: string) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: colDragId(stage),
    data: { stage },
    disabled: tone === "dim",
  });
  const shown = here.slice(0, CARD_CAP);
  const rest = here.slice(CARD_CAP);
  const hint = tone === "ok" ? "放到这里确认流转" : tone === "wait" ? "需先提交，松手打开" : null;
  const shownDone = useCount(roll.done, 560);
  const flipSig = here
    .map((row) => `${row.lane.id}:${row.item.id}:${row.item.state}:${row.item.locked ? 1 : 0}`)
    .join("|");

  return (
    <div
      id={`flow-col-${stage}`}
      ref={setNodeRef}
      className={`kanban-col ${roll.light}${active ? " on" : ""}${tone ? ` drop-${tone}` : ""}${hot ? " drop-hot" : ""}`}
      style={{ ["--col" as string]: index }}
    >
      <div className="kanban-head-wrap">
        <button className="kanban-head" title={fullName} onClick={onFilter}>
          <Statistic
            className="kanban-stat"
            title={title}
            value={shownDone}
            suffix={`/${roll.total}`}
            styles={{
              title: { fontSize: 14, fontWeight: 600, color: "rgba(0, 0, 0, 0.88)", marginBottom: 2 },
              content: { fontSize: 22, fontWeight: 600, color: "rgba(0, 0, 0, 0.88)" },
              suffix: { fontSize: 16, fontWeight: 600, color: "rgba(0, 0, 0, 0.65)" },
            }}
          />
          <div className="kanban-meta">
            {roll.soon ? remainLabel(roll.soon.dueAt) : "已齐"}
            {roll.blocked ? ` · ${roll.blocked}锁` : ""}
          </div>
        </button>
        <StageProgress done={roll.done} total={roll.total} light={roll.light} />
      </div>
      <KanbanFlip sig={flipSig} delay={index * 0.022} frozen={!flipping}>
        {here.length === 0 && roll.done === roll.total && !hint && (
          <div className="k-empty">
            <CheckLottie className="k-empty-lottie" />
            已齐
          </div>
        )}
        {here.length === 0 && roll.done !== roll.total && !hint && (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无人在此" />
        )}
        {shown.map((row) => {
          const light = itemLight(row.item);
          const blocks = !row.item.locked && row.lane.items.some((x) => x.locked) && light === "red";
          return (
            <DraggableWorkCard
              key={row.lane.id}
              lane={row.lane}
              item={row.item}
              extra={blocks ? "锁下游" : stateLabel(row.item)}
              landing={landingId === row.lane.id}
              ghost={activeLaneId === row.lane.id}
              locked={settling || (Boolean(activeLaneId) && activeLaneId !== row.lane.id)}
              onOpen={() => onOpen(row.item.id)}
            />
          );
        })}
        {rest.length > 0 && (
          <Popover
            trigger="click"
            title={`其余 ${rest.length} 条`}
            content={
              <div className="more-list">
                {rest.map((row) => (
                  <WorkCard
                    key={row.lane.id}
                    name={row.lane.name}
                    item={row.item}
                    extra={stateLabel(row.item)}
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
      </KanbanFlip>
      {hint && <div className="kanban-hint">{hint}</div>}
    </div>
  );
}
