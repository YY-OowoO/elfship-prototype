import { STAGES, TODAY } from "./mock";
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

export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
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
    if (!isWeekend(iso)) out.push(iso);
    cur.setDate(cur.getDate() + dir);
  }
  return out;
}

export function isWeekend(iso: string): boolean {
  const day = parseDay(iso).getDay();
  return day === 0 || day === 6;
}

export function workdaysBetween(fromIso: string, toIso: string): number {
  const from = parseDay(fromIso);
  const to = parseDay(toIso);
  const step = from <= to ? 1 : -1;
  let count = 0;
  const cur = new Date(from);
  cur.setDate(cur.getDate() + step);
  while (step > 0 ? cur <= to : cur >= to) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count += step;
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
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) left -= 1;
  }
  const y = cur.getFullYear();
  const m = String(cur.getMonth() + 1).padStart(2, "0");
  const d = String(cur.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
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
  if (item.completeWhen.some((g) => !g.ok) || item.enterNextWhen.some((g) => !g.ok)) {
    return "完成条件或流转条件未满足";
  }
  return null;
}

export function canReject(item: WorkItem, actor: PersonId, reason: string): string | null {
  if (item.state !== "submitted" && item.state !== "in_progress") return "当前状态不能退回";
  if (actor !== item.confirmerId) return "只有确认人可以退回";
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
        if (TERMINAL.includes(it.state)) return it;
        const dueAt = addWorkdays(it.dueAt, delta);
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

export function findItem(batch: LaunchBatch, itemId: string): { lane: ResourceLane; item: WorkItem } | null {
  for (const lane of batch.lanes) {
    const item = lane.items.find((it) => it.id === itemId);
    if (item) return { lane, item };
  }
  return null;
}
