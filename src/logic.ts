import { CHINESE_HOLIDAYS_MAP, PEOPLE, STAGES, TODAY, type HolidayInfo } from "./mock";
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

/** 格式化短日期：M月D日 (如 8月18日) */
export function formatDay(iso: string): string {
  const dt = parseDay(iso);
  return `${dt.getMonth() + 1}月${dt.getDate()}日`;
}

/** 格式化带星期的日期：M月D日 (周X) (如 8月18日 (周二)) */
export function formatDayWithWeekday(iso: string): string {
  const dt = parseDay(iso);
  const w = weekdayLabel(iso);
  return `${dt.getMonth() + 1}月${dt.getDate()}日 (周${w})`;
}

/** 格式化标准完整日期：YYYY-MM-DD */
export function formatFullDate(iso: string): string {
  const dt = parseDay(iso);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 格式化百分比：xx% 或 xx.x% */
export function formatPercent(value: number, precision = 0): string {
  if (!Number.isFinite(value)) return "0%";
  return `${precision > 0 ? value.toFixed(precision) : Math.round(value)}%`;
}

/** 格式化周期工时：x.x 工作日 */
export function formatLeadTime(days: number): string {
  if (!Number.isFinite(days)) return "0.0 工作日";
  return `${days.toFixed(1)} 工作日`;
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

/**
 * 判断是否为小周（单休周，周六为工作日）
 * 以 2026-08-17 (小周周一) 为锚点，奇偶周循环交替
 */
export function isSmallWeek(iso: string): boolean {
  const dt = parseDay(iso);
  // Anchor Monday: 2026-08-17 (小周，周六 8月22日 正常排期推进上班)
  const anchorMonday = new Date(2026, 7, 17);
  const diffMs = dt.getTime() - anchorMonday.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 86400000));
  return Math.abs(diffWeeks) % 2 === 0;
}

/**
 * 获取节日与节假日元数据及彩蛋
 */
export function getHolidayInfo(iso: string): HolidayInfo | null {
  return CHINESE_HOLIDAYS_MAP[iso] ?? null;
}

export type DayScheduleType =
  | "workday"              // 正常工作日 (Mon-Fri)
  | "small_week_saturday" // 小周周六 (正常推进排期工作日)
  | "big_week_saturday"   // 大周周六 (双休)
  | "sunday"              // 周日 (公休)
  | "holiday_rest"        // 法定节假日 (放假)
  | "festival_workday";   // 传统节日工作日 (带节日彩蛋与专属氛围)

export function getDayScheduleType(iso: string): DayScheduleType {
  const holiday = CHINESE_HOLIDAYS_MAP[iso];
  if (holiday) {
    if (holiday.isRest) return "holiday_rest";
    return "festival_workday";
  }
  const day = parseDay(iso).getDay();
  if (day === 0) return "sunday";
  if (day === 6) {
    return isSmallWeek(iso) ? "small_week_saturday" : "big_week_saturday";
  }
  return "workday";
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

/**
 * 判断是否为工作日（遵循大小周规则与中国法定节假日）
 */
export function isWorkday(iso: string): boolean {
  const holiday = CHINESE_HOLIDAYS_MAP[iso];
  if (holiday && holiday.isRest) return false;
  const day = parseDay(iso).getDay();
  if (day === 0) return false;
  if (day === 6) {
    // 小周周六是工作日，大周周六休息
    return isSmallWeek(iso);
  }
  return true;
}

export function isWeekend(iso: string): boolean {
  return !isWorkday(iso);
}

export function isHoliday(iso: string): boolean {
  return Boolean(CHINESE_HOLIDAYS_MAP[iso]?.isRest);
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

/** 查找特定资源在当前阶段之后的下一个有效（非跳过）阶段 */
export function nextActiveStageForLane(lane: ResourceLane, fromStage: StageKey): StageKey | null {
  const fromIdx = lane.items.findIndex((x) => x.stage === fromStage);
  if (fromIdx < 0) return null;
  const nextItem = lane.items.slice(fromIdx + 1).find((x) => !x.skipped);
  return nextItem ? nextItem.stage : null;
}

/** 拖拽流转校验：只允许流转到该资源的下一个有效阶段，并执行门禁校验 */
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
  if (to < from) return { ok: false, reason: "不能流转到已完成或前置阶段" };

  const allowed = nextActiveStageForLane(lane, cur.stage);
  if (!allowed) return { ok: false, reason: "当前资源已至最后阶段或无后续有效工序" };

  const destItem = lane.items.find((x) => x.stage === dest);
  if (destItem?.skipped) {
    const destName = STAGES.find((s) => s.key === dest)?.name ?? dest;
    const allowedName = STAGES.find((s) => s.key === allowed)?.name ?? allowed;
    return { ok: false, reason: `该资源在【${destName}】阶段已配置为不适用（已跳过），请流转至【${allowedName}】` };
  }
  if (dest !== allowed) {
    const allowedName = STAGES.find((s) => s.key === allowed)?.name ?? allowed;
    return { ok: false, reason: `请按工序顺序流转，应流转至【${allowedName}】` };
  }

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
  laneType?: string;
  item: WorkItem;
  reason: string;
  suggestedAction: string;
  actionLabel: string;
};

export function nowQueue(batch: LaunchBatch, today = TODAY): QueueRow[] {
  const rows: QueueRow[] = [];
  for (const lane of batch.lanes) {
    for (const item of lane.items) {
      if (item.skipped || item.state === "confirmed") continue;
      const light = itemLight(item, today);
      const stageObj = STAGES.find((s) => s.key === item.stage);
      const stageName = stageObj?.name ?? item.stage;
      const driName = PEOPLE[item.driId]?.name ?? item.driId;
      const confirmerName = PEOPLE[item.confirmerId]?.name ?? item.confirmerId;
      const remain = workdaysBetween(today, item.dueAt);

      if (light === "red" && item.locked === false && !TERMINAL.includes(item.state)) {
        const downstream = findBlockedDownstream(batch, lane.id);
        const blocks = downstream.blockedItemIds.length > 0;
        const blockCount = downstream.blockedItemIds.length;

        const lastRejectEvent = [...item.history].reverse().find((h) => h.reason);
        const reason = item.state === "rejected"
          ? `该工序被退回重做（原因：${lastRejectEvent?.reason ?? "未达验收标准"}）`
          : `已逾期 ${Math.abs(remain)} 个工作日${blocks ? `，锁定下游 ${blockCount} 项工序流转` : ""}`;

        const suggestedAction = item.state === "rejected"
          ? `请主责【${driName}】重新返工修改并提交`
          : blocks
            ? `建议催办主责【${driName}】补齐交付物，解锁后续工序`
            : `请主责【${driName}】尽快提交交付内容`;

        rows.push({
          id: item.id,
          kind: blocks ? "block" : "overdue",
          title: item.state === "rejected" ? `${stageName}被退回` : `${stageName}逾期`,
          laneName: lane.name,
          laneType: lane.type,
          item,
          reason,
          suggestedAction,
          actionLabel: "催办",
        });
      } else if (light === "yellow") {
        rows.push({
          id: item.id,
          kind: "tomorrow",
          title: `${stageName}临期`,
          laneName: lane.name,
          laneType: lane.type,
          item,
          reason: `距截止仅剩 ${remain === 0 ? "今天" : "1 个工作日"}，进入临期预警`,
          suggestedAction: `请主责【${driName}】关注推进节拍，按时提交审核`,
          actionLabel: "关注",
        });
      } else if (item.state === "in_progress" && item.completeWhen.some((g) => !g.ok)) {
        const missing = item.completeWhen.filter((g) => !g.ok).map((g) => g.label).join("、");
        rows.push({
          id: item.id,
          kind: "gap",
          title: `${stageName}交付未齐`,
          laneName: lane.name,
          laneType: lane.type,
          item,
          reason: `部分完成条件缺失（${missing}）`,
          suggestedAction: `请主责【${driName}】补齐交付材料与版本号`,
          actionLabel: "补齐",
        });
      } else if (item.state === "submitted") {
        rows.push({
          id: item.id,
          kind: "wip",
          title: `${stageName}待确认`,
          laneName: lane.name,
          laneType: lane.type,
          item,
          reason: `主责【${driName}】已提交交付内容，等待审核放行`,
          suggestedAction: `请确认人【${confirmerName}】核验门禁并确认`,
          actionLabel: "去确认",
        });
      } else if (item.state === "in_progress" || item.state === "rework") {
        rows.push({
          id: item.id,
          kind: "wip",
          title: `${stageName}进行中`,
          laneName: lane.name,
          laneType: lane.type,
          item,
          reason: `当前按排期正常推进中（剩余 ${remain} 个工作日）`,
          suggestedAction: `主责【${driName}】制作完成后提交交付物`,
          actionLabel: "查看",
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
  if (n < 0) return `逾期 ${Math.abs(n)} 个工作日`;
  if (n === 0) return "今日截止";
  if (n === 1) return "明日截止";
  return `剩余 ${n} 个工作日`;
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
  rejectionCategory?: import("./types").RejectionCategory,
  isWaiver?: boolean,
  waiverReason?: string,
): AuditEvent {
  return {
    id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: `${TODAY} ${new Date().toTimeString().slice(0, 5)}`,
    actorId,
    action,
    from,
    to,
    reason,
    rejectionCategory,
    isWaiver,
    waiverReason,
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
  // L1 & L2 自动化与格式校验
  if (it.stage === "produce") {
    const pbrOk = it.evidence.pbrCompliant !== false;
    const vertexOk = typeof it.evidence.vertexCount === "number" ? it.evidence.vertexCount <= 18000 : true;
    return {
      ...it,
      completeWhen: it.completeWhen.map((g) => {
        if (g.label.includes("面数") || g.label.includes("预算")) {
          return { ...g, ok: vertexOk, level: "L2" as const, metricThreshold: "Tris ≤ 15,000" };
        }
        if (g.label.includes("贴图") || g.label.includes("PBR")) {
          return { ...g, ok: pbrOk, level: "L1" as const };
        }
        return g;
      }),
    };
  }
  if (it.stage === "upload") {
    const rawPath = it.evidence.svnPath?.trim() ?? "";
    const pathOk = Boolean(rawPath && (rawPath.startsWith("svn://") || rawPath.startsWith("git://") || rawPath.startsWith("/")));
    const revOk = Boolean(it.evidence.svnRev?.trim());
    return {
      ...it,
      completeWhen: it.completeWhen.map((g) => {
        if (g.label.includes("路径") || g.label.includes("规范")) {
          return { ...g, ok: pathOk, level: "L1" as const, metricThreshold: "URI: svn://art/..." };
        }
        if (g.label.includes("版本") || g.label.includes("登记")) {
          return { ...g, ok: revOk, level: "L1" as const, metricThreshold: "Revision 正整数" };
        }
        if (g.label.includes("上传")) return { ...g, ok: pathOk && revOk, level: "L1" as const };
        return g;
      }),
      enterNextWhen: it.enterNextWhen.map((g) => ({ ...g, ok: pathOk && revOk, level: "L1" as const })),
    };
  }
  if (it.stage === "review" || it.stage === "accept") {
    const conclusionOk = Boolean(it.evidence.conclusion?.trim());
    const dcOk = typeof it.evidence.drawCall === "number" ? it.evidence.drawCall <= 120 : true;
    return {
      ...it,
      completeWhen: it.completeWhen.map((g) => {
        if (g.label.includes("性能") || g.label.includes("DrawCall") || g.label.includes("帧")) {
          return { ...g, ok: dcOk, level: "L2" as const, metricThreshold: "DrawCall ≤ 120" };
        }
        if (conclusionOk) return { ...g, ok: true, level: "L3" as const };
        return g;
      }),
      enterNextWhen: it.enterNextWhen.map((g) => {
        if (conclusionOk && dcOk) return { ...g, ok: true, level: "L3" as const };
        return g;
      }),
    };
  }
  return it;
}

export function canStart(item: WorkItem, actor: PersonId): string | null {
  if (item.locked) return "上游节点逾期阻塞，本工序已锁定（需先解决上游卡点）";
  if (item.waiting) return "前置工序尚未确认通过，请等待上游交付完成";
  if (item.skipped) return "该工序在当前资源中不适用（已跳过）";
  if (item.state === "in_progress") return "任务已在推进中，无需重复开始";
  if (item.state === "submitted") return "任务已提交交付物，正等待确认人审核";
  if (item.state === "confirmed") return "该任务已确认通过";
  if (item.state === "rejected") return `该任务已被退回，请点击【开始返工】（主责：${PEOPLE[item.driId]?.name ?? item.driId}）`;
  if (actor !== item.driId) return `只有主责（${PEOPLE[item.driId]?.name ?? item.driId}）可以开始`;
  return null;
}

export function canSubmit(item: WorkItem, actor: PersonId): string | null {
  if (item.locked) return "上游节点逾期阻塞，本工序锁定不可提交";
  if (item.skipped) return "该工序不适用（已跳过）";
  if (item.state === "not_started") return "请先点击【开始】启动任务";
  if (item.state === "submitted") return "已处于待确认状态，无需重复提交";
  if (item.state === "confirmed") return "该任务已确认完成";
  if (item.state === "rejected") return "任务已被退回，请点击【开始返工】后再提交";
  if (actor !== item.driId) return `只有主责（${PEOPLE[item.driId]?.name ?? item.driId}）可以提交交付内容`;
  return null;
}

export function canConfirm(item: WorkItem, actor: PersonId): string | null {
  if (item.locked) return "上游节点逾期阻塞，本工序已锁定";
  if (item.skipped) return "该工序已跳过，无需确认";
  if (item.state === "not_started") return "主责尚未开始该任务";
  if (item.state === "in_progress" || item.state === "rework") return `需主责（${PEOPLE[item.driId]?.name ?? item.driId}）先提交交付内容`;
  if (item.state === "confirmed") return "该任务已确认通过";
  if (item.state === "rejected") return "任务已被退回重做，需等待主责重新提交";
  if (actor !== item.confirmerId) return `只有确认人（${PEOPLE[item.confirmerId]?.name ?? item.confirmerId}）可以确认通过`;
  if (item.confirmerId === item.driId) return "确认人与主责不能是同一人（需双人门禁复核）";

  const missingComplete = item.completeWhen.filter((g) => !g.ok).map((g) => g.label);
  const missingEnter = item.enterNextWhen.filter((g) => !g.ok).map((g) => g.label);
  const allMissing = [...missingComplete, ...missingEnter];
  if (allMissing.length > 0) {
    return `未满足准出门禁条件：${allMissing.join("、")}`;
  }
  return null;
}

export function canReject(item: WorkItem, actor: PersonId, reason: string): string | null {
  if (item.state !== "submitted" && item.state !== "in_progress" && item.state !== "rework") {
    return "当前状态不可退回（只有进行中或待确认任务可退回）";
  }
  if (actor !== item.confirmerId) return `只有确认人（${PEOPLE[item.confirmerId]?.name ?? item.confirmerId}）可以退回`;
  if (item.confirmerId === item.driId) return "确认人与主责不能是同一人";
  if (reason.trim().length < 4) return "退回必须填写具体原因（至少 4 个字），以便主责针对性返工";
  return null;
}

export function canRework(item: WorkItem, actor: PersonId): string | null {
  if (item.state !== "rejected") return "当前任务未处于退回状态，无需返工";
  if (actor !== item.driId) return `只有主责（${PEOPLE[item.driId]?.name ?? item.driId}）可以开始返工`;
  return null;
}

export function canWaive(batch: LaunchBatch, item: WorkItem, actor: PersonId, reason: string): string | null {
  if (item.state === "confirmed" || item.skipped) return "该工序已完结，无需特批";
  if (actor !== batch.batchDriId && actor !== item.confirmerId) {
    return `特批放行必须由批次总负责人（${PEOPLE[batch.batchDriId]?.name ?? batch.batchDriId}）或该节点确认人授权`;
  }
  if (reason.trim().length < 6) return "特批放行必须详细填写特批理由与风险应对措施（至少 6 个字）";
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
  category?: import("./types").RejectionCategory,
): LaunchBatch {
  return mapItem(batch, itemId, (it) => {
    const err = canReject(it, actor, reason);
    if (err) return it;
    return {
      ...it,
      state: "rejected",
      history: [
        ...it.history,
        stamp(
          actor,
          category ? `退回 [${category}]` : "退回",
          it.state,
          "rejected",
          reason.trim(),
          category,
        ),
      ],
    };
  });
}

export function waiveItem(
  batch: LaunchBatch,
  itemId: string,
  actor: PersonId,
  waiverReason: string,
): LaunchBatch {
  return mapItem(batch, itemId, (it) => {
    const err = canWaive(batch, it, actor, waiverReason);
    if (err) return it;
    return {
      ...it,
      state: "confirmed",
      isWaived: true,
      completeWhen: it.completeWhen.map((g) => ({ ...g, ok: true })),
      enterNextWhen: it.enterNextWhen.map((g) => ({ ...g, ok: true })),
      history: [
        ...it.history,
        stamp(
          actor,
          "【特批放行】解锁下游",
          it.state,
          "confirmed",
          waiverReason.trim(),
          undefined,
          true,
          waiverReason.trim(),
        ),
      ],
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

export function toggleGateItem(
  batch: LaunchBatch,
  itemId: string,
  gateId: string,
): LaunchBatch {
  return mapItem(batch, itemId, (it) => {
    const toggle = (g: { id: string; label: string; ok: boolean }) =>
      g.id === gateId ? { ...g, ok: !g.ok } : g;
    return {
      ...it,
      completeWhen: it.completeWhen.map(toggle),
      enterNextWhen: it.enterNextWhen.map(toggle),
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
  oldLight: Light;
  newLight: Light;
  worsened: boolean;
  improved: boolean;
};

export function previewShift(batch: LaunchBatch, nextLaunch: string): {
  moved: ShiftPreviewRow[];
  kept: number;
  newRedCount: number;
  newYellowCount: number;
  resolvedRedCount: number;
  criticalBottlenecks: Array<{ laneName: string; stageName: string; reason: string }>;
} {
  const delta = workdaysBetween(batch.launchDate, nextLaunch);
  const moved: ShiftPreviewRow[] = [];
  let kept = 0;
  let newRedCount = 0;
  let newYellowCount = 0;
  let resolvedRedCount = 0;
  const criticalBottlenecks: Array<{ laneName: string; stageName: string; reason: string }> = [];

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
      const oldLight = itemLight(it);
      const simulatedItem: WorkItem = { ...it, dueAt: newDue };
      const newLight = itemLight(simulatedItem);

      const worsened = (oldLight === "ok" && (newLight === "yellow" || newLight === "red")) ||
                       (oldLight === "yellow" && newLight === "red");
      const improved = (oldLight === "red" && (newLight === "yellow" || newLight === "ok")) ||
                       (oldLight === "yellow" && newLight === "ok");

      if (newLight === "red" && oldLight !== "red") newRedCount += 1;
      if (newLight === "yellow" && oldLight === "ok") newYellowCount += 1;
      if (oldLight === "red" && newLight !== "red") resolvedRedCount += 1;

      const stageName = STAGES.find((s) => s.key === it.stage)?.name ?? it.stage;
      if (newLight === "red") {
        criticalBottlenecks.push({
          laneName: lane.name,
          stageName,
          reason: `新截止日(${formatDay(newDue)})逾期超标`,
        });
      }

      moved.push({
        laneName: lane.name,
        stageName,
        item: it,
        oldDue: it.dueAt,
        newDue,
        oldLight,
        newLight,
        worsened,
        improved,
      });
    }
  }
  return {
    moved,
    kept,
    newRedCount,
    newYellowCount,
    resolvedRedCount,
    criticalBottlenecks,
  };
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

export function updateItemDueDate(
  batch: LaunchBatch,
  itemId: string,
  newDue: string,
  actor: PersonId,
): LaunchBatch {
  return mapItem(batch, itemId, (it) => {
    if (it.dueAt === newDue) return it;
    const oldDue = it.dueAt;
    return {
      ...it,
      dueAt: newDue,
      history: [
        ...it.history,
        stamp(actor, `截止日期由 ${formatDay(oldDue)} 调整为 ${formatDay(newDue)}`, it.state, it.state),
      ],
    };
  });
}

export function reassignItemDri(
  batch: LaunchBatch,
  itemId: string,
  newDri: PersonId,
  actor: PersonId,
): LaunchBatch {
  return mapItem(batch, itemId, (it) => {
    if (it.driId === newDri) return it;
    const oldDri = it.driId;
    return {
      ...it,
      driId: newDri,
      history: [
        ...it.history,
        stamp(actor, `主责人由 @${oldDri} 改派为 @${newDri}`, it.state, it.state),
      ],
    };
  });
}

export function toggleItemSkip(
  batch: LaunchBatch,
  itemId: string,
  actor: PersonId,
): LaunchBatch {
  return mapItem(batch, itemId, (it) => {
    const nextSkipped = !it.skipped;
    return {
      ...it,
      skipped: nextSkipped,
      state: nextSkipped ? "skipped" : "not_started",
      locked: false,
      waiting: false,
      history: [
        ...it.history,
        stamp(
          actor,
          nextSkipped ? "标记该工序为不适用（已跳过）" : "恢复该工序为适用状态",
          it.state,
          nextSkipped ? "skipped" : "not_started",
        ),
      ],
    };
  });
}

export function simulateShiftImpact(
  batch: LaunchBatch,
  nextLaunch: string,
): {
  oldRisk: ReturnType<typeof batchRisk>;
  newRisk: ReturnType<typeof batchRisk>;
  oldLights: ReturnType<typeof batchLights>;
  newLights: ReturnType<typeof batchLights>;
  deltaDays: number;
  summary: string;
} {
  const deltaDays = workdaysBetween(batch.launchDate, nextLaunch);
  const oldRisk = batchRisk(batch);
  const oldLights = batchLights(batch);

  const simulatedBatch = shiftLaunchDate(batch, nextLaunch, batch.batchDriId);
  const newRisk = batchRisk(simulatedBatch);
  const newLights = batchLights(simulatedBatch);

  let summary = "";
  if (deltaDays > 0) {
    if (newRisk.level === "ok" && oldRisk.level !== "ok") {
      summary = `上线日推迟 ${deltaDays} 个工作日：红灯逾期清零，批次风险由【${oldRisk.level === "risk" ? "有风险" : "需关注"}】转为【正常】`;
    } else if (newLights.red < oldLights.red) {
      summary = `上线日推迟 ${deltaDays} 个工作日：红灯逾期从 ${oldLights.red} 项降至 ${newLights.red} 项`;
    } else {
      summary = `上线日推迟 ${deltaDays} 个工作日：全线工序获充裕缓冲周期`;
    }
  } else if (deltaDays < 0) {
    summary = `上线日提前 ${Math.abs(deltaDays)} 个工作日：交付周期压缩，请评估团队负荷`;
  } else {
    summary = "上线日未变动";
  }

  return {
    oldRisk,
    newRisk,
    oldLights,
    newLights,
    deltaDays,
    summary,
  };
}

export function findBlockerSource(
  batch: LaunchBatch,
  itemId: string,
): { blockerItem: WorkItem; blockerLane: ResourceLane; reason: string } | null {
  const lane = batch.lanes.find((l) => l.items.some((x) => x.id === itemId));
  if (!lane) return null;
  const item = lane.items.find((x) => x.id === itemId);
  if (!item) return null;

  // 1. 同泳道内未完成/逾期的前置节点
  const curIdx = lane.items.findIndex((x) => x.id === itemId);
  const activePreds = lane.items.slice(0, curIdx).filter((x) => !x.skipped);
  const unconfirmedPred = [...activePreds].reverse().find((x) => x.state !== "confirmed");
  if (unconfirmedPred) {
    const stName = STAGES.find((s) => s.key === unconfirmedPred.stage)?.name ?? unconfirmedPred.stage;
    const isOverdue = itemLight(unconfirmedPred) === "red";
    return {
      blockerItem: unconfirmedPred,
      blockerLane: lane,
      reason: isOverdue ? `【${stName}】工序逾期未交付` : `【${stName}】前置工序尚未确认通过`,
    };
  }

  // 2. 外部泳道引发全局锁定的高风险卡点（如 3D 模型上传逾期）
  if (item.locked) {
    for (const otherLane of batch.lanes) {
      if (otherLane.id === lane.id) continue;
      const otherOverdue = otherLane.items.find((x) => !x.skipped && x.state !== "confirmed" && itemLight(x) === "red");
      if (otherOverdue) {
        const stName = STAGES.find((s) => s.key === otherOverdue.stage)?.name ?? otherOverdue.stage;
        return {
          blockerItem: otherOverdue,
          blockerLane: otherLane,
          reason: `【${otherLane.name} · ${stName}】逾期阻塞了下游协同流转`,
        };
      }
    }
  }

  return null;
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

  const curIdx = stageIndex(cur.stage);
  // Downstream items within the same lane that are subsequent to cur.stage and not finished
  for (const it of lane.items) {
    const itIdx = stageIndex(it.stage);
    if (!it.skipped && it.state !== "confirmed" && (it.locked || itIdx > curIdx)) {
      blockedItemIds.push(it.id);
    }
  }
  blockedLaneIds.push(lane.id);

  // Downstream dependent lanes
  for (const otherLane of batch.lanes) {
    if (otherLane.id === blockerLaneId) continue;
    const otherCur = currentItem(otherLane);
    if (otherCur && (otherCur.locked || otherLane.items.some((x) => x.locked))) {
      blockedLaneIds.push(otherLane.id);
      blockedItemIds.push(otherCur.id);
    }
  }

  const stageName = STAGES.find((s) => s.key === cur.stage)?.name ?? cur.stage;
  return {
    blockedLaneIds: Array.from(new Set(blockedLaneIds)),
    blockedItemIds: Array.from(new Set(blockedItemIds)),
    reason: `【${lane.name}】在【${stageName}】阶段逾期阻塞了下游工序流转`,
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
    const typeGroup = getAssetCategory(lane.type);
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

/** 规范化资产大类归属 */
export function getAssetCategory(type: string): string {
  const raw = type.trim();
  if (raw.includes("3D") || raw.includes("模型") || raw.includes("道具") || raw.includes("场景") || raw.includes("角色")) return "3D 资产";
  if (raw.includes("2D") || raw.includes("原画") || raw.includes("立绘")) return "2D 原画";
  if (raw.includes("动作") || raw.includes("骨骼") || raw.includes("动画")) return "动作动画";
  if (raw.includes("特效") || raw.includes("VFX") || raw.includes("粒子")) return "粒子特效";
  if (raw.includes("音频") || raw.includes("音效") || raw.includes("BGM") || raw.includes("配音")) return "音频音效";
  if (raw.includes("UI") || raw.includes("界面") || raw.includes("图标") || raw.includes("徽章")) return "UI 界面";
  if (raw.includes("文案") || raw.includes("剧本") || raw.includes("设定") || raw.includes("家园")) return "文案设定";
  return "平面资源";
}

/** 统计全量资产大类分布 */
export function getAssetCategoryList(lanes: ResourceLane[]): Array<{ key: string; label: string; count: number }> {
  const counts: Record<string, number> = {};
  for (const lane of lanes) {
    const cat = getAssetCategory(lane.type);
    counts[cat] = (counts[cat] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((a, b) => b.count - a.count);
}

