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
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import gsap from "gsap";
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
import { DragLayer, type DragApi, type DragOrigin } from "./motion/DragLayer";

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
  onOpen,
}: {
  lane: ResourceLane;
  item: WorkItem;
  extra?: string;
  landing?: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: laneDragId(lane.id),
    data: { laneId: lane.id, stage: item.stage },
  });
  return (
    <div ref={setNodeRef} className={`k-drag${isDragging ? " is-ghost" : ""}${landing ? " is-land" : ""}`}>
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
  const dragApi = useRef<DragApi | null>(null);
  const originRef = useRef<DragOrigin | null>(null);
  const lastDelta = useRef({ x: 0, t: 0 });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
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
    const laneId = parseLaneId(String(e.active.id));
    setActiveLaneId(laneId);
    const rect = e.active.rect.current.initial;
    const box: DragOrigin = rect
      ? { x: rect.left, y: rect.top, w: rect.width, h: rect.height }
      : { x: 0, y: 0, w: 168, h: 72 };
    originRef.current = box;
    setOrigin(box);
    lastDelta.current = { x: 0, t: performance.now() };
  }

  function handleDragMove(e: DragMoveEvent) {
    const box = originRef.current;
    if (!box) return;
    const now = performance.now();
    const dt = Math.max(8, now - lastDelta.current.t);
    const vx = (e.delta.x - lastDelta.current.x) / dt;
    lastDelta.current = { x: e.delta.x, t: now };
    const tilt = gsap.utils.clamp(-9, 9, vx * 160);
    dragApi.current?.follow(box.x + e.delta.x, box.y + e.delta.y, tilt);
  }

  function handleDragOver(e: DragOverEvent) {
    setOverStage(e.over ? parseColId(String(e.over.id)) : null);
  }

  async function finishDrag(e: DragEndEvent) {
    const laneId = parseLaneId(String(e.active.id));
    const dest = e.over ? parseColId(String(e.over.id)) : null;
    const lane = laneId ? batch.lanes.find((row) => row.id === laneId) : null;
    const item = lane ? currentItem(lane) : null;
    const next = item ? nextStageKey(item.stage) : null;
    const box = originRef.current;
    const needConfirm = Boolean(item && dest === next && canConfirm(item, actor));
    const ok = Boolean(laneId && dest && item && dest === next && !needConfirm);
    setOverStage(null);

    if (box && dragApi.current) {
      if (ok && dest) {
        const slot = document.querySelector(`#flow-col-${dest} .kanban-flip`)?.getBoundingClientRect();
        const x = slot ? slot.left + 6 : box.x;
        const y = slot ? slot.top + 6 : box.y;
        const scale = slot ? Math.min(1, (slot.width - 12) / Math.max(1, box.w)) : 1;
        await dragApi.current.settle(x, y, scale);
      } else {
        await dragApi.current.settle(box.x, box.y, 1);
      }
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
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={columnCollision}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      autoScroll={{ threshold: { x: 0.12, y: 0.2 }, acceleration: 10 }}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
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
              flipping={!activeLaneId && quietStage !== st.key}
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
      {index > 0 && <span className="kanban-arrow" aria-hidden="true" />}
      <div className="kanban-head-wrap">
        <button className="kanban-head" title={fullName} onClick={onFilter}>
          <Statistic
            className="kanban-stat"
            title={title}
            value={shownDone}
            suffix={`/${roll.total}`}
            styles={{
              title: { fontSize: 14, fontWeight: 600, color: "#000000", marginBottom: 2 },
              content: { fontSize: 22, fontWeight: 600, color: "#000000" },
              suffix: { fontSize: 16, fontWeight: 600, color: "rgba(60, 60, 67, 0.68)" },
            }}
          />
          <div className="kanban-meta">
            {roll.soon ? remainLabel(roll.soon.dueAt) : "已齐"}
            {roll.blocked ? ` · ${roll.blocked}锁` : ""}
          </div>
        </button>
        <StageProgress done={roll.done} total={roll.total} light={roll.light} />
      </div>
      <KanbanFlip sig={flipSig} delay={index * 0.036} frozen={!flipping}>
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
            <Button type="link" className="more-btn">
              +{rest.length}
            </Button>
          </Popover>
        )}
      </KanbanFlip>
      {hint && <div className="kanban-hint">{hint}</div>}
    </div>
  );
}
