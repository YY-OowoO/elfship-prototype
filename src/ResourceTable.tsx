import { Badge, Button, Checkbox, Empty, Segmented, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import { PEOPLE, STAGES, TODAY } from "./mock";
import { currentItem, formatDay, itemLight, laneLight, progress, stateLabel, workdaysBetween } from "./logic";
import type { Light, ResourceLane, StageKey, WorkItem } from "./types";
import { Ellipsis, EvidenceQuickPeek, avatar } from "./ui";

const { Text } = Typography;

type ViewMode = "stage" | "risk";

type OccupyRow = {
  stage: StageKey;
  name: string;
  full: string;
  count: number;
  red: number;
  yellow: number;
  names: string[];
};

type OccupyTone = "risk" | "watch" | "ok";

const GROUP_SHOW = 3;

type ResRow =
  | {
      kind: "group";
      id: string;
      title: string;
      count: number;
      stage: StageKey;
      tone: OccupyTone;
      open: boolean;
      preview: string;
    }
  | { kind: "lane"; id: string; lane: ResourceLane }
  | { kind: "more"; id: string; stage: StageKey; rest: number };

function typeFamily(type: string) {
  if (type.startsWith("2D")) return "平面";
  if (type.startsWith("3D")) return "3D";
  return type;
}

function typeLabel(type: string) {
  if (type === "2D") return "平面";
  if (type === "2D 原画") return "原画";
  return type;
}

function occupyByStage(lanes: ResourceLane[]): OccupyRow[] {
  return STAGES.map((st) => {
    const here = lanes.filter((lane) => currentItem(lane).stage === st.key);
    return {
      stage: st.key,
      name: st.short,
      full: st.name,
      count: here.length,
      red: here.filter((lane) => laneLight(lane) === "red").length,
      yellow: here.filter((lane) => laneLight(lane) === "yellow").length,
      names: here.map((lane) => lane.name),
    };
  });
}

function occupyByType(lanes: ResourceLane[]): Array<{ type: string; count: number }> {
  const map = new Map<string, number>();
  for (const lane of lanes) {
    const key = typeFamily(lane.type);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type, "zh"));
}

function sortLanes(lanes: ResourceLane[]) {
  return [...lanes].sort((a, b) => {
    const la = laneLight(a);
    const lb = laneLight(b);
    const lightRank = (x: Light) => (x === "red" ? 0 : x === "yellow" ? 1 : 2);
    const sa = STAGES.findIndex((s) => s.key === currentItem(a).stage);
    const sb = STAGES.findIndex((s) => s.key === currentItem(b).stage);
    return lightRank(la) - lightRank(lb) || sa - sb || a.name.localeCompare(b.name, "zh");
  });
}

function laneStateText(lane: ResourceLane, cur: WorkItem) {
  const light = itemLight(cur);
  const blocks = !cur.locked && lane.items.some((x) => x.locked) && light === "red";
  return blocks ? "锁下游" : stateLabel(cur);
}

function stateTagColor(lane: ResourceLane, cur: WorkItem) {
  const text = laneStateText(lane, cur);
  const light = itemLight(cur);
  if (text === "锁下游" || light === "red") return "error";
  if (light === "yellow") return "warning";
  if (cur.state === "submitted") return "processing";
  if (cur.state === "confirmed" || cur.skipped) return "success";
  return "default";
}

function dueShort(cur: WorkItem) {
  if (cur.skipped || cur.state === "confirmed") return "完成";
  const n = workdaysBetween(TODAY, cur.dueAt);
  if (n < 0) return `逾期${Math.abs(n)}日`;
  if (n === 0) return "今日";
  if (n === 1) return "明日";
  const light = itemLight(cur);
  if (light === "red" || light === "yellow") return `剩${n}日`;
  return formatDay(cur.dueAt);
}

function groupTone(items: ResourceLane[]): OccupyTone {
  if (items.some((lane) => laneLight(lane) === "red")) return "risk";
  if (items.some((lane) => laneLight(lane) === "yellow")) return "watch";
  return "ok";
}

function occupyTone(row: OccupyRow): OccupyTone {
  if (row.red) return "risk";
  if (row.yellow) return "watch";
  return "ok";
}

function currentDri(lane: ResourceLane) {
  return PEOPLE[currentItem(lane).driId];
}

function defaultOpenStages(lanes: ResourceLane[]): StageKey[] {
  const lit = new Set<StageKey>();
  for (const lane of lanes) {
    const light = laneLight(lane);
    if (light === "red" || light === "yellow") lit.add(currentItem(lane).stage);
  }
  if (lit.size > 0) return [...lit];
  return [...new Set(lanes.map((lane) => currentItem(lane).stage))];
}

function previewNames(items: ResourceLane[]) {
  const names = items.map((lane) => lane.name);
  if (names.length <= 2) return names.join("、");
  return `${names.slice(0, 2).join("、")} 等 ${names.length} 条`;
}

function buildRows(
  lanes: ResourceLane[],
  mode: ViewMode,
  hideGroup: boolean,
  open: StageKey[],
  full: StageKey[],
): ResRow[] {
  if (mode === "risk" || hideGroup) {
    return sortLanes(lanes).map((lane) => ({ kind: "lane", id: lane.id, lane }));
  }
  return STAGES.flatMap((st) => {
    const items = sortLanes(lanes.filter((lane) => currentItem(lane).stage === st.key));
    if (items.length === 0) return [];
    const isOpen = open.includes(st.key);
    const header: ResRow = {
      kind: "group",
      id: `g-${st.key}`,
      title: st.short,
      count: items.length,
      stage: st.key,
      tone: groupTone(items),
      open: isOpen,
      preview: previewNames(items),
    };
    if (!isOpen) return [header];
    const showAll = full.includes(st.key) || items.length <= GROUP_SHOW;
    const visible = showAll ? items : items.slice(0, GROUP_SHOW);
    const more: ResRow[] = showAll
      ? []
      : [{ kind: "more", id: `m-${st.key}`, stage: st.key, rest: items.length - GROUP_SHOW }];
    return [header, ...visible.map((lane) => ({ kind: "lane" as const, id: lane.id, lane })), ...more];
  });
}

export function ResourceTable({
  lanes,
  onOpen,
  selectedLaneIds = [],
  onSelectLane,
  onSelectAllLanes,
  hoveredDate,
  hoveredLaneId,
  setHoveredLaneId,
}: {
  lanes: ResourceLane[];
  onOpen: (id: string) => void;
  selectedLaneIds?: string[];
  onSelectLane?: (laneId: string, selected: boolean) => void;
  onSelectAllLanes?: (selected: boolean) => void;
  hoveredDate?: string | null;
  hoveredLaneId?: string | null;
  setHoveredLaneId?: (id: string | null) => void;
}) {
  const [hereOnly, setHereOnly] = useState<StageKey | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>("stage");
  const [open, setOpen] = useState<StageKey[]>(() => defaultOpenStages(lanes));
  const [full, setFull] = useState<StageKey[]>([]);
  const sourceKey = lanes.map((lane) => lane.id).join();

  useEffect(() => {
    setHereOnly(null);
    setTypeFilter(null);
    setOpen(defaultOpenStages(lanes));
    setFull([]);
  }, [sourceKey]);

  const types = useMemo(() => occupyByType(lanes), [lanes]);
  const typed = useMemo(
    () => (typeFilter ? lanes.filter((lane) => typeFamily(lane.type) === typeFilter) : lanes),
    [lanes, typeFilter],
  );
  const occupy = useMemo(() => occupyByStage(typed), [typed]);
  const listed = useMemo(
    () => (hereOnly ? typed.filter((lane) => currentItem(lane).stage === hereOnly) : typed),
    [hereOnly, typed],
  );
  const rows = useMemo(
    () => buildRows(listed, mode, Boolean(hereOnly), open, full),
    [listed, mode, hereOnly, open, full],
  );
  const hereMeta = occupy.find((row) => row.stage === hereOnly);
  const filtered = Boolean(hereOnly || typeFilter);
  const presentStages = occupy.filter((row) => row.count > 0).map((row) => row.stage);
  const allOpen =
    presentStages.length > 0 &&
    presentStages.every((stage) => {
      const count = occupy.find((row) => row.stage === stage)?.count ?? 0;
      return open.includes(stage) && (full.includes(stage) || count <= GROUP_SHOW);
    });
  const canFold = mode === "stage" && !hereOnly && presentStages.length > 1;

  const allSelected = lanes.length > 0 && selectedLaneIds.length === lanes.length;
  const isIndeterminate = selectedLaneIds.length > 0 && selectedLaneIds.length < lanes.length;

  const columns = useMemo<TableColumnsType<ResRow>>(() => {
    const showStage = mode === "risk" || Boolean(hereOnly);
    return [
      {
        key: "select",
        width: 38,
        onCell: (row) => (row.kind === "group" || row.kind === "more" ? { colSpan: 0 } : {}),
        title: onSelectAllLanes ? (
          <Checkbox
            indeterminate={isIndeterminate}
            checked={allSelected}
            onChange={(e) => onSelectAllLanes(e.target.checked)}
          />
        ) : null,
        render: (_, row) => {
          if (row.kind !== "lane") return null;
          const isSelected = selectedLaneIds.includes(row.lane.id);
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onChange={(e) => onSelectLane?.(row.lane.id, e.target.checked)}
              />
            </div>
          );
        },
      },
      {
        key: "name",
        title: "资源",
        onCell: (row) => (row.kind === "group" || row.kind === "more" ? { colSpan: 5 } : {}),
        render: (_, row) => {
          if (row.kind === "more") {
            return <span className="res-more">还有 {row.rest} 条</span>;
          }
          if (row.kind === "group") {
            return (
              <div className={`res-group tone-${row.tone}${row.open ? " is-open" : ""}`}>
                <span className="res-group-mark" aria-hidden />
                <span>{row.title}</span>
                <b>{row.count}</b>
                {!row.open ? <Text type="secondary">{row.preview}</Text> : null}
              </div>
            );
          }
          const lane = row.lane;
          const light = laneLight(lane);
          const pg = progress(lane);
          const done = pg.total > 0 && pg.done === pg.total;
          const cur = currentItem(lane);
          const badge =
            light === "red"
              ? "error"
              : light === "yellow"
                ? "warning"
                : done
                  ? "success"
                  : cur.state === "in_progress" || cur.state === "submitted"
                    ? "processing"
                    : "default";
          return (
            <button type="button" className="res-name-hit" onClick={() => onOpen(currentItem(lane).id)}>
              <Badge status={badge} />
              <span className="res-name-copy">
                <Ellipsis>{lane.name}</Ellipsis>
                <Text type="secondary" className="res-name-type">
                  {typeLabel(lane.type)}
                </Text>
              </span>
            </button>
          );
        },
      },
      {
        key: "path",
        title: "进度",
        width: 200,
        onCell: (row) => (row.kind === "group" || row.kind === "more" ? { colSpan: 0 } : {}),
        render: (_, row) => (row.kind === "lane" ? <LanePath lane={row.lane} onOpen={onOpen} /> : null),
      },
      {
        key: "state",
        title: "状态",
        width: showStage ? 168 : 132,
        onCell: (row) => (row.kind === "group" || row.kind === "more" ? { colSpan: 0 } : {}),
        render: (_, row) => {
          if (row.kind !== "lane") return null;
          const cur = currentItem(row.lane);
          const stage = STAGES.find((s) => s.key === cur.stage);
          const light = itemLight(cur);
          return (
            <div className="res-state">
              {showStage ? <Text className="res-state-stage">{stage?.short ?? cur.stage}</Text> : null}
              <Tag variant="filled" color={stateTagColor(row.lane, cur)}>
                {laneStateText(row.lane, cur)}
              </Tag>
              <Text
                type={light === "red" ? "danger" : light === "yellow" ? "warning" : "secondary"}
                className="res-state-due"
              >
                {dueShort(cur)}
              </Text>
            </div>
          );
        },
      },
      {
        key: "dri",
        title: "当前主责",
        width: 120,
        onCell: (row) => (row.kind === "group" || row.kind === "more" ? { colSpan: 0 } : {}),
        render: (_, row) => {
          if (row.kind !== "lane") return null;
          const person = currentDri(row.lane);
          return (
            <Tooltip title={`${person.name} · ${person.title}`}>
              <span className="res-dri">
                {avatar(person.id, 20)}
                <Text type="secondary" ellipsis>
                  {person.name}
                </Text>
              </span>
            </Tooltip>
          );
        },
      },
    ];
  }, [allSelected, isIndeterminate, hereOnly, mode, onOpen, onSelectAllLanes, onSelectLane, selectedLaneIds]);

  const filterLabel = (() => {
    const total = lanes.length;
    const shown = listed.length;
    if (hereOnly && typeFilter && hereMeta) return `看 ${hereMeta.name} · ${typeFilter} ${shown} / ${total}`;
    if (hereOnly && hereMeta) return `看 ${hereMeta.name} ${shown} / ${total}`;
    if (typeFilter) return `${typeFilter} ${shown} / ${total}`;
    return `${total} 条`;
  })();

  function toggleGroup(stage: StageKey) {
    setOpen((cur) => (cur.includes(stage) ? cur.filter((key) => key !== stage) : [...cur, stage]));
  }

  return (
    <div className="res-board">
      <OccupyChart
        rows={occupy}
        types={types}
        active={hereOnly}
        typeFilter={typeFilter}
        mode={mode}
        label={filterLabel}
        filtered={filtered}
        foldLabel={canFold ? (allOpen ? "收起平稳" : "展开全部") : null}
        onStage={(key) => setHereOnly((cur) => (cur === key ? null : key))}
        onType={(type) => setTypeFilter((cur) => (cur === type ? null : type))}
        onMode={setMode}
        onClear={() => {
          setHereOnly(null);
          setTypeFilter(null);
        }}
        onFold={
          canFold
            ? () => {
                if (allOpen) {
                  setOpen(defaultOpenStages(listed));
                  setFull([]);
                } else {
                  setOpen(presentStages);
                  setFull(presentStages);
                }
              }
            : undefined
        }
      />
      <Table<ResRow>
        className="res-table"
        size="small"
        pagination={false}
        rowKey="id"
        columns={columns}
        dataSource={rows}
        tableLayout="fixed"
        onRow={(row) => {
          if (row.kind === "group") {
            return {
              onClick: () => toggleGroup(row.stage),
              title: row.open ? `收起 ${row.title}` : `展开 ${row.title}`,
            };
          }
          if (row.kind === "more") {
            return {
              onClick: () => setFull((cur) => (cur.includes(row.stage) ? cur : [...cur, row.stage])),
            };
          }
          return {
            onClick: (event) => {
              if ((event.target as HTMLElement).closest("button") || (event.target as HTMLElement).closest(".ant-checkbox-wrapper")) return;
              onOpen(currentItem(row.lane).id);
            },
            onMouseEnter: () => setHoveredLaneId?.(row.lane.id),
            onMouseLeave: () => setHoveredLaneId?.(null),
          };
        }}
        rowClassName={(row, index) => {
          const baseIndex = index >= 36 ? " res-row-no-anim" : "";
          if (row.kind === "group") return `res-row-group tone-${row.tone}${row.open ? "" : " is-shut"}`;
          if (row.kind === "more") return "res-row-more";
          const cur = currentItem(row.lane);
          const light = laneLight(row.lane);
          const tone = light === "red" ? "res-row-risk" : light === "yellow" ? "res-row-watch" : "";
          const isFocused = hoveredLaneId === row.lane.id ? " is-row-focused" : "";
          const isDateFocus = hoveredDate ? (cur.dueAt === hoveredDate ? " is-date-focus" : " is-date-dimmed") : "";
          const isSelected = selectedLaneIds.includes(row.lane.id) ? " is-row-selected" : "";
          return `${tone}${baseIndex}${isFocused}${isDateFocus}${isSelected}`;
        }}
        locale={{
          emptyText: (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={filtered ? "没有符合筛选的资源" : "暂无资源"} />
          ),
        }}
      />
    </div>
  );
}

function OccupyChart({
  rows,
  types,
  active,
  typeFilter,
  mode,
  label,
  filtered,
  foldLabel,
  onStage,
  onType,
  onMode,
  onClear,
  onFold,
}: {
  rows: OccupyRow[];
  types: Array<{ type: string; count: number }>;
  active: StageKey | null;
  typeFilter: string | null;
  mode: ViewMode;
  label: string;
  filtered: boolean;
  foldLabel: string | null;
  onStage: (key: StageKey) => void;
  onType: (type: string) => void;
  onMode: (mode: ViewMode) => void;
  onClear: () => void;
  onFold?: () => void;
}) {
  const total = rows.reduce((n, row) => n + row.count, 0);
  return (
    <div className="res-occupy">
      <div className="res-occupy-head">
        <div className="res-occupy-title">
          <Text type="secondary">{label}</Text>
          {filtered ? (
            <Button type="link" size="small" onClick={onClear}>
              清除
            </Button>
          ) : null}
          {foldLabel ? (
            <Button type="link" size="small" onClick={onFold}>
              {foldLabel}
            </Button>
          ) : null}
        </div>
        <div className="res-occupy-tools">
          <Space size={6} wrap className="res-types">
            {types.map((row) => {
              const on = typeFilter === row.type;
              return (
                <Button
                  key={row.type}
                  size="small"
                  color={on ? "primary" : "default"}
                  variant={on ? "solid" : "filled"}
                  aria-pressed={on}
                  onClick={() => onType(row.type)}
                >
                  {row.type}
                  <b>{row.count}</b>
                </Button>
              );
            })}
          </Space>
          <Segmented
            size="small"
            value={mode}
            onChange={(value) => onMode(value as ViewMode)}
            options={[
              { label: "按节点", value: "stage" },
              { label: "按风险", value: "risk" },
            ]}
          />
        </div>
      </div>
      <div className="res-occupy-bar">
        {rows
          .filter((row) => row.count > 0)
          .map((row) => {
            const tone = occupyTone(row);
            const tipNames = row.names.slice(0, 5).join("、");
            const more = row.names.length > 5 ? ` 等 ${row.names.length} 条` : "";
            return (
              <Tooltip key={row.stage} title={`${row.full} ${row.count} 条 · ${tipNames}${more}`}>
                <button
                  type="button"
                  className={`res-occupy-seg ${tone}${active === row.stage ? " on" : ""}${active && active !== row.stage ? " dim" : ""}`}
                  style={{ flexGrow: Math.sqrt(row.count), flexBasis: 0 }}
                  aria-pressed={active === row.stage}
                  aria-label={`${row.full} ${row.count} / ${total}，点击筛选`}
                  onClick={() => onStage(row.stage)}
                >
                  <b>{row.name}</b>
                  <span>{row.count}</span>
                </button>
              </Tooltip>
            );
          })}
      </div>
    </div>
  );
}

function LanePath({ lane, onOpen }: { lane: ResourceLane; onOpen: (id: string) => void }) {
  const cur = currentItem(lane);
  const pg = progress(lane);
  return (
    <div className="lane-path">
      <Text type="secondary" className="lane-path-frac">
        {pg.done}/{pg.total}
      </Text>
      <ol className="lane-path-dots">
        {STAGES.map((st) => {
          const it = lane.items.find((x) => x.stage === st.key);
          if (!it) {
            return (
              <li key={st.key}>
                <span className="lane-dot empty" />
              </li>
            );
          }
          const now = it.id === cur.id;
          const light = itemLight(it);
          const tone = it.skipped
            ? "skip"
            : it.state === "confirmed"
              ? "done"
              : now
                ? `now ${light === "none" ? "ok" : light}`
                : it.locked
                  ? "lock"
                  : "wait";
          const tip = `${st.name} · ${stateLabel(it)}${it.skipped ? "" : ` · ${formatDay(it.dueAt)}`}`;
          return (
            <li key={st.key}>
              <Tooltip title={tip}>
                <button type="button" className={`lane-dot ${tone}`} aria-label={tip} onClick={() => onOpen(it.id)} />
              </Tooltip>
            </li>
          );
        })}
      </ol>
      {cur.evidence?.svnPath ? (
        <EvidenceQuickPeek evidence={cur.evidence}>
          <InboxOutlined className="lane-path-svn" style={{ color: "var(--wip)" }} title="悬停抽检交付物 SVN 资产" />
        </EvidenceQuickPeek>
      ) : null}
    </div>
  );
}
