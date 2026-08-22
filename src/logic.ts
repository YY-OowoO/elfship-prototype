import { HOLIDAYS, PEOPLE, STAGES, TODAY } from "./mock";
import type {
  AuditEvent,
  LaunchBatch,
  Light,
  PersonId,
  ResourceLane,
  StageKey,
  WorkItem,
  WorkState,
} from "./types";

const TERMINAL: WorkState[] = ["confirmed", "skipped"];

export function parseDay(iso?: string): Date {
  if (typeof iso !== "string") {
    return new Date(TODAY);
  }
  const target = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : TODAY;
  const [y, m, d] = target.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDay(iso: string): string {
  const dt = parseDay(iso);
  return `${dt.getMonth() + 1}月${dt.getDate()}日`;
}

export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function weekdayLabel(iso: string): string {
  return "日一二三四五六"[parseDay(iso).getDay()] ?? "";
}

export function listWorkdays(fromIso: string, untilIso: string): string[] {
  const out: string[] = [];
  const cur = parseDay(fromIso);
  const end = parseDay(untilIso);
  const dir = cur <= end ? 1 : -1;
  while (dir > 0 ? cur <= end : cur >= end) {
    const iso = toIso(cur);
    if (isWorkday(iso)) out.push(iso);
    cur.setDate(cur.getDate() + dir);
  }
  return out;
}

export function isWeekend(iso: string): boolean {
  const day = parseDay(iso).getDay();
  return day === 0 || day === 6;
}

export function isHoliday(iso: string): boolean {
  return HOLIDAYS.has(iso);
}

export function isWorkday(iso: string): boolean {
  return !isWeekend(iso) && !isHoliday(iso);
}

export function workdaysBetween(fromIso: string, untilIso: string): number {
  const from = parseDay(fromIso);
  const to = parseDay(untilIso);
  const step = from <= to ? 1 : -1;
  let count = 0;
  const cur = new Date(from);
  cur.setDate(cur.getDate() + step);
  while (step > 0 ? cur <= to : cur >= to) {
    if (isWorkday(toIso(cur))) count += step;
    cur.setDate(cur.getDate() + step);
  }
  return count;
}

export function addWorkdays(fromIso: string, n: number): string {
  const cur = parseDay(fromIso);
  let left = Math.abs(n);
  const dir = n >= 0 ? 1 : -1;
  while (left > 0) {
    cur.setDate(cur.getDate() + dir);
    if (isWorkday(toIso(cur))) left -= 1;
  }
  return toIso(cur);
}

export function itemLight(item: WorkItem, today = TODAY): Light {
  if (item.skipped || item.state === "confirmed") return "none";
  if (item.locked) return "none";
  if (item.state === "rejected") return "red";
  const remain = workdaysBetween(today, item.dueAt);
  if (remain < 0) return "red";
  if (remain <= 1) return "yellow";
  return "ok";
}

export function stateLabel(item: WorkItem): string {
  if (item.skipped) return "不适用";
  if (item.locked) return "锁定";
  if (item.waiting && item.state === "not_started") return "等待";
  switch (item.state) {
    case "not_started":
      return "未开始";
    case "in_progress":
      return "进行中";
    case "submitted":
      return "待确认";
    case "confirmed":
      return "完成";
    case "rejected":
      return "退回";
    case "rework":
      return "返工";
    case "skipped":
      return "不适用";
  }
}

export function stateTone(item: WorkItem): string {
  if (item.skipped) return "skip";
  if (item.locked) return "lock";
  if (item.waiting && item.state === "not_started") return "wait";
  switch (item.state) {
    case "confirmed":
      return "done";
    case "in_progress":
    case "rework":
      return "wip";
    case "submitted":
      return "wfa";
    case "rejected":
      return "retake";
    default:
      return "todo";
  }
}

export function stageIndex(key: StageKey): number {
  return STAGES.findIndex((s) => s.key === key);
}

export function nextStageKey(key: StageKey): StageKey | null {
  const i = stageIndex(key);
  return i >= 0 && i < STAGES.length - 1 ? STAGES[i + 1].key : null;
}

/** OpenProject-style action board: drop only to the next legal node. */
export function tryMoveLaneToStage(
  batch: LaunchBatch,
  laneId: string,
  dest: StageKey,
  actor: PersonId,
): { ok: true; batch: LaunchBatch } | { ok: false; reason: string; itemId?: string } {
  const lane = batch.lanes.find((l) => l.id === laneId);
  if (!lane) return { ok: false, reason: "找不到资源" };
  const cur = currentItem(lane);
  if (cur.stage === dest) return { ok: true, batch };
  const from = stageIndex(cur.stage);
  const to = stageIndex(dest);
  if (to < 0 || from < 0) return { ok: false, reason: "无效节点" };
  if (to < from) return { ok: false, reason: "不能拖回已完成节点" };
  if (to > from + 1) return { ok: false, reason: "按节点顺序流转，不能跳过" };
  const confirmMsg = canConfirm(cur, actor);
  if (!confirmMsg) return { ok: true, batch: confirmItem(batch, cur.id, actor) };
  return { ok: false, reason: confirmMsg, itemId: cur.id };
}

export function currentItem(lane: ResourceLane): WorkItem {
  const open = lane.items.find((it) => !TERMINAL.includes(it.state));
  return open ?? lane.items[lane.items.length - 1];
}

export function progress(lane: ResourceLane): { done: number; total: number } {
  const active = lane.items.filter((it) => !it.skipped);
  const done = active.filter((it) => it.state === "confirmed").length;
  return { done, total: active.length };
}

export function laneLight(lane: ResourceLane, today = TODAY): Light {
  const lights = lane.items.map((it) => itemLight(it, today));
  if (lights.includes("red")) return "red";
  if (lights.includes("yellow")) return "yellow";
  return "ok";
}

export function laneIssueBrief(lane: ResourceLane, today = TODAY) {
  const light = laneLight(lane, today);
  const item =
    lane.items.find((it) => !it.skipped && itemLight(it, today) === light) ?? currentItem(lane);
  const stage = STAGES.find((s) => s.key === item.stage);
  const remain = workdaysBetween(today, item.dueAt);
  let reason = "按计划";
  if (light === "red") {
    if (item.state === "rejected") reason = `${stage?.short ?? ""}被退回`;
    else if (!item.locked && remain < 0) reason = `${stage?.short ?? ""} · ${remainLabel(item.dueAt, today)}`;
    else if (lane.items.some((x) => x.locked)) reason = `${stage?.short ?? ""} · 锁下游`;
    else reason = `${stage?.short ?? ""} · 阻断`;
  } else if (light === "yellow") {
    reason = `${stage?.short ?? ""} · ${remainLabel(item.dueAt, today)}`;
  }
  return {
    light,
    name: lane.name,
    stage: stage?.short ?? item.stage,
    reason,
    itemId: item.id,
  };
}

export function batchLights(batch: LaunchBatch, today = TODAY): { red: number; yellow: number } {
  let red = 0;
  let yellow = 0;
  for (const lane of batch.lanes) {
    const l = laneLight(lane, today);
    if (l === "red") red += 1;
    if (l === "yellow") yellow += 1;
  }
  return { red, yellow };
}

export function batchRisk(batch: LaunchBatch, today = TODAY): {
  level: "risk" | "watch" | "ok";
  sentence: string;
} {
  const { red, yellow } = batchLights(batch, today);
  if (red > 0) {
    const offender = batch.lanes.find((lane) => laneLight(lane, today) === "red");
    const item = offender?.items.find((it) => itemLight(it, today) === "red");
    const stage = STAGES.find((s) => s.key === item?.stage);
    return {
      level: "risk",
      sentence: offender && stage ? `${offender.name}未完成${stage.name}` : "存在逾期资源",
    };
  }
  if (yellow > 0) return { level: "watch", sentence: "有临期任务，需关注" };
  return { level: "ok", sentence: "按计划推进" };
}

export function occupants(batch: LaunchBatch, key: StageKey) {
  return batch.lanes.flatMap((lane) => {
    const item = currentItem(lane);
    if (item.skipped || item.state === "confirmed" || item.stage !== key) return [];
    return [{ lane, item }];
  });
}

export function itemsInStage(batch: LaunchBatch, key: StageKey) {
  return batch.lanes.flatMap((lane) => {
    const item = lane.items.find((it) => it.stage === key);
    if (!item || item.skipped) return [];
    return [{ lane, item }];
  });
}

export function stageRollup(batch: LaunchBatch, key: StageKey, today = TODAY) {
  const cells = batch.lanes
    .map((lane) => lane.items.find((it) => it.stage === key))
    .filter((it): it is WorkItem => it !== undefined && !it.skipped);
  const done = cells.filter((it) => it.state === "confirmed").length;
  const lights = cells.map((it) => itemLight(it, today));
  const light: Light = lights.includes("red")
    ? "red"
    : lights.includes("yellow")
      ? "yellow"
      : "ok";
  const soon = [...cells]
    .filter((it) => !TERMINAL.includes(it.state))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  const blocked = cells.filter((it) => it.locked).length;
  const driId = soon?.driId ?? cells[0]?.driId;
  return { done, total: cells.length, light, soon, blocked, driId };
}

export type QueueKind = "block" | "overdue" | "tomorrow" | "gap" | "wip";
export const ACTION_KINDS = ["block", "overdue", "tomorrow"] as const;
export type ActionKind = (typeof ACTION_KINDS)[number];

export const QUEUE_KIND_META: Record<ActionKind, { color: string; label: string }> = {
  block: { color: "error", label: "锁下游" },
  overdue: { color: "error", label: "逾期" },
  tomorrow: { color: "warning", label: "临期" },
};

export function isActionKind(kind: QueueKind): kind is ActionKind {
  return (ACTION_KINDS as readonly string[]).includes(kind);
}

export function actionQueue(batch: LaunchBatch, today = TODAY): QueueRow[] {
  return nowQueue(batch, today).filter((row) => isActionKind(row.kind));
}

export function queueKindCounts(queue: QueueRow[]) {
  return ACTION_KINDS.map((kind) => ({
    kind,
    ...QUEUE_KIND_META[kind],
    value: queue.filter((row) => row.kind === kind).length,
  }));
}

export type QueueRow = {
  id: string;
  kind: QueueKind;
  title: string;
  laneName: string;
  item: WorkItem;
};

export function nowQueue(batch: LaunchBatch, today = TODAY): QueueRow[] {
  const rows: QueueRow[] = [];
  for (const lane of batch.lanes) {
    for (const item of lane.items) {
      if (item.skipped || item.state === "confirmed") continue;
      const light = itemLight(item, today);
      const stage = STAGES.find((s) => s.key === item.stage)?.name ?? item.stage;
      if (light === "red" && item.locked === false && !TERMINAL.includes(item.state)) {
        const blocks = lane.items.some((x) => x.locked);
        rows.push({
          id: item.id,
          kind: blocks ? "block" : "overdue",
          title: item.state === "rejected" ? `${stage}被退回` : `${stage}逾期`,
          laneName: lane.name,
          item,
        });
      } else if (light === "yellow") {
        rows.push({
          id: item.id,
          kind: "tomorrow",
          title: `${stage}明日截止`,
          laneName: lane.name,
          item,
        });
      } else if (item.state === "in_progress" && item.completeWhen.some((g) => !g.ok)) {
        rows.push({
          id: item.id,
          kind: "gap",
          title: `${stage}交付未齐`,
          laneName: lane.name,
          item,
        });
      } else if (item.state === "in_progress" || item.state === "submitted" || item.state === "rework") {
        rows.push({
          id: item.id,
          kind: "wip",
          title: `${stage}进行中`,
          laneName: lane.name,
          item,
        });
      }
    }
  }
  const rank: Record<QueueKind, number> = {
    block: 0,
    overdue: 1,
    tomorrow: 2,
    gap: 3,
    wip: 4,
  };
  return rows.sort((a, b) => rank[a.kind] - rank[b.kind] || a.item.dueAt.localeCompare(b.item.dueAt));
}

export function remainLabel(dueAt: string, today = TODAY): string {
  const n = workdaysBetween(today, dueAt);
  if (n < 0) return `逾期${Math.abs(n)}个工作日`;
  if (n === 0) return "今天截止";
  if (n === 1) return "明日截止";
  return `剩余${n}个工作日`;
}

export function launchRemain(launchDate: string, today = TODAY): string {
  const n = workdaysBetween(today, launchDate);
  if (n < 0) return `已过上线日 ${Math.abs(n)} 个工作日`;
  if (n === 0) return "今天上线";
  return `剩余 ${n} 个工作日`;
}

export function refreshLocks(batch: LaunchBatch, today = TODAY): LaunchBatch {
  return {
    ...batch,
    lanes: batch.lanes.map((lane) => {
      let overdueOpen = false;
      const items = lane.items.map((it) => {
        if (it.skipped) return { ...it, locked: false, waiting: false };
        const prevOpen = overdueOpen;
        const light = itemLight({ ...it, locked: false }, today);
        const locked = prevOpen && it.state !== "confirmed";
        if (!TERMINAL.includes(it.state) && light === "red") overdueOpen = true;
        const idx = lane.items.findIndex((x) => x.id === it.id);
        const pred = [...lane.items.slice(0, idx)].reverse().find((x) => !x.skipped);
        const waiting =
          !locked &&
          it.state === "not_started" &&
          Boolean(pred) &&
          pred!.state !== "confirmed" &&
          pred!.state !== "skipped";
        return { ...it, locked, waiting };
      });
      return { ...lane, items };
    }),
  };
}

function stamp(
  actorId: PersonId,
  action: string,
  from?: WorkState,
  to?: WorkState,
  reason?: string,
): AuditEvent {
  return {
    id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: `${TODAY} ${new Date().toTimeString().slice(0, 5)}`,
    actorId,
    action,
    from,
    to,
    reason,
  };
}

function mapItem(batch: LaunchBatch, itemId: string, fn: (it: WorkItem) => WorkItem): LaunchBatch {
  return refreshLocks({
    ...batch,
    lanes: batch.lanes.map((lane) => ({
      ...lane,
      items: lane.items.map((it) => (it.id === itemId ? fn(it) : it)),
    })),
  });
}

function recomputeGates(it: WorkItem): WorkItem {
  if (it.stage === "upload") {
    const pathOk = Boolean(it.evidence.svnPath);
    const revOk = Boolean(it.evidence.svnRev);
    return {
      ...it,
      completeWhen: it.completeWhen.map((g) => {
        if (g.label.includes("路径")) return { ...g, ok: pathOk };
        if (g.label.includes("版本")) return { ...g, ok: revOk };
        if (g.label.includes("上传")) return { ...g, ok: pathOk && revOk };
        return g;
      }),
      enterNextWhen: it.enterNextWhen.map((g) => ({ ...g, ok: pathOk && revOk })),
    };
  }
  return it;
}

export function canStart(item: WorkItem, actor: PersonId): string | null {
  if (item.locked) return "上游逾期，本节点锁定";
  if (item.waiting) return "前置节点尚未确认";
  if (item.skipped) return "该节点不适用";
  if (item.state !== "not_started" && item.state !== "rejected") return "当前状态不能开始";
  if (actor !== item.driId) return "只有主责可以开始";
  return null;
}

export function canSubmit(item: WorkItem, actor: PersonId): string | null {
  if (item.locked) return "上游逾期，本节点锁定";
  if (item.skipped) return "该节点不适用";
  if (item.state !== "in_progress" && item.state !== "rework") return "请先开始任务";
  if (actor !== item.driId) return "只有主责可以提交";
  return null;
}

export function canConfirm(item: WorkItem, actor: PersonId): string | null {
  if (item.state !== "submitted") return "需主责先提交";
  if (actor !== item.confirmerId) return "只有确认人可以确认";
  if (item.confirmerId === item.driId) return "确认人与主责不能是同一人";
  if (item.completeWhen.some((g) => !g.ok) || item.enterNextWhen.some((g) => !g.ok)) {
    return "完成条件或流转条件未满足";
  }
  return null;
}

export function canReject(item: WorkItem, actor: PersonId, reason: string): string | null {
  if (item.state !== "submitted" && item.state !== "in_progress") return "当前状态不能退回";
  if (actor !== item.confirmerId) return "只有确认人可以退回";
  if (item.confirmerId === item.driId) return "确认人与主责不能是同一人";
  if (reason.trim().length < 4) return "退回必须填写原因";
  return null;
}

export function startItem(batch: LaunchBatch, itemId: string, actor: PersonId): LaunchBatch {
  return mapItem(batch, itemId, (it) => {
    const err = canStart(it, actor);
    if (err) return it;
    return {
      ...it,
      state: "in_progress",
      history: [...it.history, stamp(actor, "开始", it.state, "in_progress")],
    };
  });
}

export function submitItem(batch: LaunchBatch, itemId: string, actor: PersonId): LaunchBatch {
  return mapItem(batch, itemId, (it) => {
    const next = recomputeGates(it);
    const err = canSubmit(next, actor);
    if (err) return it;
    return {
      ...next,
      state: "submitted",
      history: [...next.history, stamp(actor, "提交交付内容", next.state, "submitted")],
    };
  });
}

export function confirmItem(batch: LaunchBatch, itemId: string, actor: PersonId): LaunchBatch {
  return mapItem(batch, itemId, (it) => {
    const next = recomputeGates(it);
    const err = canConfirm(next, actor);
    if (err) return it;
    return {
      ...next,
      state: "confirmed",
      completeWhen: next.completeWhen.map((g) => ({ ...g, ok: true })),
      enterNextWhen: next.enterNextWhen.map((g) => ({ ...g, ok: true })),
      history: [...next.history, stamp(actor, "确认通过，解锁下游", next.state, "confirmed")],
    };
  });
}

export function rejectItem(
  batch: LaunchBatch,
  itemId: string,
  actor: PersonId,
  reason: string,
): LaunchBatch {
  return mapItem(batch, itemId, (it) => {
    const err = canReject(it, actor, reason);
    if (err) return it;
    return {
      ...it,
      state: "rejected",
      history: [...it.history, stamp(actor, "退回", it.state, "rejected", reason.trim())],
    };
  });
}

export function reworkItem(batch: LaunchBatch, itemId: string, actor: PersonId): LaunchBatch {
  return mapItem(batch, itemId, (it) => {
    if (it.state !== "rejected" || actor !== it.driId) return it;
    return {
      ...it,
      state: "rework",
      history: [...it.history, stamp(actor, "开始返工", it.state, "rework")],
    };
  });
}

export function patchEvidence(
  batch: LaunchBatch,
  itemId: string,
  evidence: WorkItem["evidence"],
): LaunchBatch {
  return mapItem(batch, itemId, (it) => recomputeGates({ ...it, evidence: { ...it.evidence, ...evidence } }));
}

export function shiftLaunchDate(batch: LaunchBatch, nextLaunch: string, actor: PersonId): LaunchBatch {
  const delta = workdaysBetween(batch.launchDate, nextLaunch);
  return refreshLocks({
    ...batch,
    launchDate: nextLaunch,
    lanes: batch.lanes.map((lane) => ({
      ...lane,
      items: lane.items.map((it) => {
        if (TERMINAL.includes(it.state) || it.duePinned) return it;
        const dueAt = addWorkdays(it.dueAt, delta);
        if (dueAt === it.dueAt) return it;
        return {
          ...it,
          dueAt,
          history: [
            ...it.history,
            stamp(actor, `上线日改为 ${nextLaunch}，截止日期重算`, it.state, it.state),
          ],
        };
      }),
    })),
  });
}

export type ShiftPreviewRow = {
  laneName: string;
  stageName: string;
  item: WorkItem;
  oldDue: string;
  newDue: string;
};

export function previewShift(batch: LaunchBatch, nextLaunch: string): {
  moved: ShiftPreviewRow[];
  kept: number;
} {
  const delta = workdaysBetween(batch.launchDate, nextLaunch);
  const moved: ShiftPreviewRow[] = [];
  let kept = 0;
  for (const lane of batch.lanes) {
    for (const it of lane.items) {
      if (TERMINAL.includes(it.state) || it.duePinned) {
        kept += 1;
        continue;
      }
      const newDue = addWorkdays(it.dueAt, delta);
      if (newDue === it.dueAt) {
        kept += 1;
        continue;
      }
      moved.push({
        laneName: lane.name,
        stageName: STAGES.find((s) => s.key === it.stage)?.name ?? it.stage,
        item: it,
        oldDue: it.dueAt,
        newDue,
      });
    }
  }
  return { moved, kept };
}

export function togglePin(batch: LaunchBatch, itemId: string, actor: PersonId): LaunchBatch {
  return mapItem(batch, itemId, (it) => {
    if (TERMINAL.includes(it.state)) return it;
    const duePinned = !it.duePinned;
    return {
      ...it,
      duePinned,
      history: [
        ...it.history,
        stamp(actor, duePinned ? "钉死截止日期（改期时不随动）" : "取消钉死截止日期", it.state, it.state),
      ],
    };
  });
}

export function findItem(batch: LaunchBatch, itemId: string): { lane: ResourceLane; item: WorkItem } | null {
  for (const lane of batch.lanes) {
    const item = lane.items.find((it) => it.id === itemId);
    if (item) return { lane, item };
  }
  return null;
}

export function findBlockedDownstream(
  batch: LaunchBatch,
  blockerLaneId: string,
): { blockedLaneIds: string[]; blockedItemIds: string[]; reason: string } {
  const lane = batch.lanes.find((l) => l.id === blockerLaneId);
  if (!lane) return { blockedLaneIds: [], blockedItemIds: [], reason: "" };

  const cur = currentItem(lane);
  const isBlocking = cur && (cur.locked || lane.items.some((x) => x.locked) || itemLight(cur) === "red");
  if (!isBlocking) return { blockedLaneIds: [], blockedItemIds: [], reason: "" };

  const blockedLaneIds: string[] = [];
  const blockedItemIds: string[] = [];

  // Downstream items within the same lane that are locked
  for (const it of lane.items) {
    if (it.locked || (it.stage !== cur.stage && isBlocking)) {
      blockedItemIds.push(it.id);
    }
  }
  blockedLaneIds.push(lane.id);

  // Downstream dependent lanes (e.g., if 3D model blocks downstream assembly/review)
  for (const otherLane of batch.lanes) {
    if (otherLane.id === blockerLaneId) continue;
    const otherCur = currentItem(otherLane);
    if (otherCur && (otherCur.locked || otherLane.items.some((x) => x.locked))) {
      blockedLaneIds.push(otherLane.id);
      blockedItemIds.push(otherCur.id);
    }
  }

  return {
    blockedLaneIds: Array.from(new Set(blockedLaneIds)),
    blockedItemIds: Array.from(new Set(blockedItemIds)),
    reason: `【${lane.name}】阻塞了下游节点流转`,
  };
}

export function stateSymbol(state: WorkState, light?: Light): string {
  if (light === "red") return "!";
  if (light === "yellow") return "~";
  if (state === "confirmed") return "OK";
  if (state === "submitted") return "WAIT";
  return "•";
}

export function generateNudgeMessage(item: WorkItem, lane: ResourceLane, batch: LaunchBatch): string {
  const dri = PEOPLE[item.driId]?.name ?? item.driId;
  const stageName = STAGES.find((s) => s.key === item.stage)?.name ?? item.stage;
  const diff = workdaysBetween(TODAY, item.dueAt);
  const statusStr = diff < 0 ? `已逾期 ${Math.abs(diff)} 个工作日` : diff === 0 ? "今天截止" : `剩余 ${diff} 个工作日`;
  const downstream = findBlockedDownstream(batch, lane.id);
  const blockCount = downstream.blockedItemIds.length;

  return [
    `【精灵交付 · 催办推进提醒】`,
    `· 交付资源：${lane.name}（${lane.type}）`,
    `· 当前节点：${stageName}`,
    `· 责任人：@${dri}`,
    `· 截止日期：${formatDay(item.dueAt)}（${statusStr}）`,
    blockCount > 1 ? `· 连带影响：当前锁定下游 ${blockCount} 项关联验收` : "",
    `· 请尽快提交或推进交付物，确保批次【${batch.name}】按期交付。`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function groupLanesByDri(lanes: ResourceLane[]) {
  const map = new Map<PersonId, Array<{ lane: ResourceLane; item: WorkItem }>>();
  for (const lane of lanes) {
    const cur = currentItem(lane);
    if (!cur) continue;
    const list = map.get(cur.driId) ?? [];
    list.push({ lane, item: cur });
    map.set(cur.driId, list);
  }
  return [...map.entries()].map(([driId, rows]) => ({
    key: driId,
    title: PEOPLE[driId]?.name ?? driId,
    sub: PEOPLE[driId]?.title ?? "负责人",
    rows,
    done: rows.filter((r) => r.item.state === "confirmed").length,
    total: rows.length,
  }));
}

export function groupLanesByType(lanes: ResourceLane[]) {
  const map = new Map<string, Array<{ lane: ResourceLane; item: WorkItem }>>();
  for (const lane of lanes) {
    const cur = currentItem(lane);
    if (!cur) continue;
    const typeGroup = lane.type.startsWith("2D") ? "平面资源" : lane.type.startsWith("3D") ? "3D 道具" : lane.type;
    const list = map.get(typeGroup) ?? [];
    list.push({ lane, item: cur });
    map.set(typeGroup, list);
  }
  return [...map.entries()].map(([typeGroup, rows]) => ({
    key: typeGroup,
    title: typeGroup,
    sub: `${rows.length} 项资源`,
    rows,
    done: rows.filter((r) => r.item.state === "confirmed").length,
    total: rows.length,
  }));
}
