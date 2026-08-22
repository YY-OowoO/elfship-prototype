import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Flex,
  Input,
  Modal,
  Popover,
  Segmented,
  Select,
  Space,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  SearchOutlined,
  CompressOutlined,
  ExpandOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { motion } from "motion/react";
import { FlowBoard } from "./FlowBoard";
import { ResourceTable } from "./ResourceTable";
import { BoardInsight } from "./StageChart";
import { BatchActionBar, GlobalSearchModal, HeroDeliveryRunway, avatar } from "./ui";
import { ElfCompanion, EmotionBall, dispatchElfEvent, type EmotionBallInstance } from "./emotion-ball";
import { BoardScroll } from "./motion/BoardScroll";
import { entrance } from "./motion/Entrance";
import {
  PEOPLE,
  PREVIEW_ROLES,
  STAGES,
  TODAY,
  seedPrimaryBatch,
  seedQuietBatch,
} from "./mock";
import {
  actionQueue,
  batchLights,
  batchRisk,
  canConfirm,
  canReject,
  canStart,
  canSubmit,
  confirmItem,
  currentItem,
  findItem,
  formatDay,
  generateNudgeMessage,
  itemLight,
  launchRemain,
  nextStageKey,
  patchEvidence,
  previewShift,
  progress,
  refreshLocks,
  remainLabel,
  rejectItem,
  reworkItem,
  shiftLaunchDate,
  startItem,
  submitItem,
  stateLabel,
  togglePin,
  tryMoveLaneToStage,
} from "./logic";
import type { ChartSubFilter, DensityMode, LaunchBatch, PersonId, ResourceLane, StageKey, SwimlaneDimension, View, WorkItem } from "./types";

const { Text } = Typography;

const SHARE_URL = "https://yy-oowoo.github.io/elfship-prototype/";

export function App() {
  const [batches, setBatches] = useState<LaunchBatch[]>(() => [
    refreshLocks(seedPrimaryBatch()),
    refreshLocks(seedQuietBatch()),
  ]);
  const [activeId, setActiveId] = useState("b-summer");
  const [view, setView] = useState<View>("board");
  const [actor, setActor] = useState<PersonId>("xiangbin");
  const [stageFilter, setStageFilter] = useState<StageKey | null>(null);
  const [chartFilter, setChartFilter] = useState<ChartSubFilter | null>(null);
  const [swimlaneDim, setSwimlaneDim] = useState<SwimlaneDimension>("stage");
  const [densityMode, setDensityMode] = useState<DensityMode>("normal");
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [hoveredLaneId, setHoveredLaneId] = useState<string | null>(null);
  const [selectedLaneIds, setSelectedLaneIds] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [nextLaunch, setNextLaunch] = useState("");
  const [mineTab, setMineTab] = useState<"dri" | "confirm">("dri");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [quickFilter, setQuickFilter] = useState<"all" | "risk" | "mine">("all");
  const modalBallRef = useRef<EmotionBallInstance>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-density", densityMode);
  }, [densityMode]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((cur) => !cur);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rawBatch = batches.find((b) => b.id === activeId) ?? batches[0];

  const batch = useMemo(() => {
    let list = rawBatch.lanes;
    if (quickFilter === "risk") {
      list = list.filter((l) => {
        const cur = currentItem(l);
        return cur && (cur.locked || itemLight(cur) === "red" || itemLight(cur) === "yellow" || l.items.some((x) => x.locked));
      });
    } else if (quickFilter === "mine") {
      list = list.filter((l) =>
        l.items.some((it) => !it.skipped && (it.driId === actor || it.confirmerId === actor)),
      );
    }
    if (chartFilter) {
      if (chartFilter.stage) {
        list = list.filter((l) => {
          const cur = currentItem(l);
          return cur && cur.stage === chartFilter.stage;
        });
      }
      if (chartFilter.riskType) {
        list = list.filter((l) => {
          const cur = currentItem(l);
          if (!cur) return false;
          if (chartFilter.riskType === "done") return cur.state === "confirmed";
          if (chartFilter.riskType === "blocked") return cur.locked;
          if (chartFilter.riskType === "risk") return !cur.locked && itemLight(cur) === "red";
          if (chartFilter.riskType === "safe") return !cur.locked && itemLight(cur) !== "red" && cur.state !== "confirmed";
          return true;
        });
      }
    }
    return { ...rawBatch, lanes: list };
  }, [rawBatch, quickFilter, actor, chartFilter]);

  const risk = batchRisk(rawBatch);
  const queue = actionQueue(rawBatch);
  const open = openId ? findItem(rawBatch, openId) : null;

  function update(next: LaunchBatch) {
    setBatches((all) => all.map((b) => (b.id === next.id ? next : b)));
  }

  function openItem(id: string) {
    setOpenId(id);
    setReason("");
    setErr(null);
  }

  function closeItem() {
    setOpenId(null);
  }

  const visibleLanes = useMemo(() => {
    if (!stageFilter) return batch.lanes;
    return batch.lanes.filter((lane) => {
      const it = lane.items.find((x) => x.stage === stageFilter);
      if (!it || it.skipped) return false;
      return it.state !== "confirmed" || itemLight(it) !== "none";
    });
  }, [batch, stageFilter]);

  const myDriRows = useMemo(
    () =>
      rawBatch.lanes.flatMap((lane) =>
        lane.items
          .filter((it) => !it.skipped && it.state !== "confirmed" && !it.locked && !it.waiting && it.driId === actor)
          .map((it) => ({ lane, it })),
      ),
    [rawBatch, actor],
  );

  const myConfirmRows = useMemo(
    () =>
      rawBatch.lanes.flatMap((lane) =>
        lane.items
          .filter((it) => !it.skipped && it.state === "submitted" && !it.locked && it.confirmerId === actor)
          .map((it) => ({ lane, it })),
      ),
    [rawBatch, actor],
  );

  const totalMyTasks = myDriRows.length + myConfirmRows.length;

  const doneLanes = rawBatch.lanes.filter((lane) => {
    const p = progress(lane);
    return p.total > 0 && p.done === p.total;
  }).length;

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
    } catch {
      window.prompt("复制分享链接", SHARE_URL);
    }
    setCopied(true);
    message.success("分享链接已复制");
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function nativeShare() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "精灵交付 · 参考原型",
          text: "上线管控看板原型",
          url: SHARE_URL,
        });
        return;
      } catch {
        /* dismissed */
      }
    }
    await copyShareLink();
  }

  function dropLane(laneId: string, dest: StageKey) {
    const result = tryMoveLaneToStage(rawBatch, laneId, dest, actor);
    if (result.ok) {
      if (result.batch !== rawBatch) {
        update(result.batch);
      }
      message.success("已确认并流转到下一阶段");
      return;
    }
    message.warning(result.reason);
    if (result.itemId) openItem(result.itemId);
  }

  function handleNudge(item: WorkItem, lane: ResourceLane) {
    const nudgeText = generateNudgeMessage(item, lane, rawBatch);
    try {
      navigator.clipboard.writeText(nudgeText);
      message.success(`已生成【${lane.name}】催办文案并复制到剪贴板！`);
      dispatchElfEvent("nudge_sent", {
        message: `已为【${lane.name}】生成催办提醒文案并复制到剪贴板。`,
      });
    } catch {
      message.info("催办文案生成成功");
    }
  }

  function handleBatchAdvance() {
    if (selectedLaneIds.length === 0) return;
    let nextBatch = rawBatch;
    let successCount = 0;
    for (const laneId of selectedLaneIds) {
      const lane = nextBatch.lanes.find((l) => l.id === laneId);
      const cur = lane ? currentItem(lane) : null;
      const next = cur ? nextStageKey(cur.stage) : null;
      if (next) {
        const res = tryMoveLaneToStage(nextBatch, laneId, next, actor);
        if (res.ok && res.batch !== nextBatch) {
          nextBatch = res.batch;
          successCount++;
        }
      }
    }
    if (successCount > 0) {
      update(nextBatch);
      message.success(`成功批量流转 ${successCount} 项资源！`);
      dispatchElfEvent("stage_advanced", {
        message: `已批量推进 ${successCount} 项资源进入下一交付阶段！`,
        action: "burst",
      });
      setSelectedLaneIds([]);
    } else {
      message.warning("选中的资源中没有可直接流转的项（可能未满足交付门禁或当前未处于可确认状态）");
    }
  }

  function handleBatchNudge() {
    if (selectedLaneIds.length === 0) return;
    const selectedLanes = rawBatch.lanes.filter((l) => selectedLaneIds.includes(l.id));
    const summaryText = [
      `【精灵交付 · 批次推进提醒】`,
      `· 批次：${rawBatch.name}（上线日 ${formatDay(rawBatch.launchDate)}）`,
      `· 重点催办资源清单（共 ${selectedLanes.length} 项）：`,
      ...selectedLanes.map((l, i) => {
        const cur = currentItem(l);
        const dri = PEOPLE[cur.driId]?.name ?? cur.driId;
        const st = STAGES.find((s) => s.key === cur.stage)?.short ?? cur.stage;
        return `  ${i + 1}. ${l.name} [${st}] @${dri} 截止 ${formatDay(cur.dueAt)}`;
      }),
      `· 请各位主责同学抓紧提交/推进验收。`,
    ].join("\n");

    try {
      navigator.clipboard.writeText(summaryText);
      message.success(`已复制 ${selectedLanes.length} 项资源的催办广播清单到剪贴板！`);
      dispatchElfEvent("nudge_sent", {
        message: `已生成 ${selectedLanes.length} 项重点资源的批量催办清单。`,
      });
    } catch {
      message.info("批量催办广播已生成");
    }
  }

  function handleExportList() {
    const selectedLanes =
      selectedLaneIds.length > 0
        ? rawBatch.lanes.filter((l) => selectedLaneIds.includes(l.id))
        : rawBatch.lanes;
    const csvContent = [
      "资源名称,资源类型,当前阶段,责任人,截止日期,状态",
      ...selectedLanes.map((l) => {
        const cur = currentItem(l);
        const dri = PEOPLE[cur.driId]?.name ?? cur.driId;
        const st = STAGES.find((s) => s.key === cur.stage)?.name ?? cur.stage;
        return `"${l.name}","${l.type}","${st}","${dri}","${cur.dueAt}","${stateLabel(cur)}"`;
      }),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${rawBatch.name}_上线清单_${TODAY}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    message.success(`已导出 ${selectedLanes.length} 项资源的上线清单 CSV！`);
  }

  return (
    <div className="app">
      <a className="skip" href="#main">
        跳到内容
      </a>
      <header className="nav">
        <div className="brand" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Tooltip title="交付精灵实时中控 · 点击触发全链路健康诊断">
            <span
              style={{ display: "inline-flex", cursor: "pointer" }}
              onClick={() => dispatchElfEvent("diagnosis_requested")}
            >
              <EmotionBall
                emotion={risk.level === "risk" ? "34" : risk.level === "watch" ? "11" : "02"}
                size={28}
                interactive={true}
                lite={true}
                label="Elf Header Avatar"
              />
            </span>
          </Tooltip>
          <div>
            <b>精灵交付</b>
            <span style={{ marginLeft: 6 }}>上线管控</span>
          </div>
        </div>
        <Segmented
          size="small"
          className="nav-seg"
          value={view}
          onChange={(v) => setView(v as View)}
          options={[
            { label: "批次", value: "list" },
            { label: "看板", value: "board" },
            {
              label: (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  我的待办
                  {totalMyTasks > 0 ? (
                    <Badge count={totalMyTasks} size="small" style={{ backgroundColor: "#1677ff" }} />
                  ) : null}
                </span>
              ),
              value: "mine",
            },
          ]}
        />
        <div className="nav-spacer" />

        <Button
          size="small"
          className="spotlight-trigger-btn"
          onClick={() => setSearchOpen(true)}
          title="全局快速搜索 (快捷键 ⌘K 或 Ctrl+K)"
        >
          <SearchOutlined className="spotlight-icon-sm" style={{ color: "var(--muted)" }} />
          <span className="spotlight-text">搜索资源 / 负责人</span>
          <kbd className="spotlight-shortcut">⌘K</kbd>
        </Button>

        <Button
          size="small"
          type="text"
          className="density-toggle-btn"
          icon={densityMode === "compact" ? <CompressOutlined /> : <ExpandOutlined />}
          onClick={() => setDensityMode((d) => (d === "normal" ? "compact" : "normal"))}
          title="切换紧凑 HUD / 舒适排版"
        >
          {densityMode === "compact" ? "紧凑 HUD" : "舒适视图"}
        </Button>

        <label className="role">
          预览身份
          <Select
            size="small"
            value={actor}
            onChange={(v) => {
              setActor(v);
              dispatchElfEvent("role_switched", {
                message: `已切换至 ${PEOPLE[v].name}（${PEOPLE[v].title}）视角。`,
              });
            }}
            options={PREVIEW_ROLES.map((r) => ({ value: r.id, label: r.label }))}
            popupMatchSelectWidth={false}
          />
        </label>
        <Popover
          trigger="click"
          placement="bottomRight"
          arrow={false}
          content={
            <div className="share-pop">
              <div className="share-pop-label">公开预览</div>
              <Input value={SHARE_URL} readOnly size="small" />
              <div className="share-pop-actions">
                <Button type="primary" size="small" onClick={copyShareLink}>
                  {copied ? "已复制" : "复制链接"}
                </Button>
                <Button type="default" size="small" href={SHARE_URL} target="_blank" rel="noreferrer">
                  打开页面
                </Button>
                {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
                  <Button type="default" size="small" onClick={nativeShare}>
                    系统分享
                  </Button>
                ) : null}
              </div>
              <Text type="secondary" className="share-pop-hint">
                假数据参考原型。发给同事用这条链接，不要发本机地址。
              </Text>
            </div>
          }
        >
          <Button type="text" size="small" className="share-btn">
            {copied ? "已复制" : "分享"}
          </Button>
        </Popover>
        <Tag className="proto-tag">参考原型 · 假数据</Tag>
      </header>
      <div className="scroll-rail" aria-hidden="true">
        <i className="scroll-rail-fill" />
      </div>

      {view === "list" && (
        <div className="list-page view-in" id="main">
          <h1>上线批次</h1>
          <p className="list-lead">
            选择一个批次进入总体看板。主批次刻意做成「有风险」：3D 上传逾期并锁下游，家园文案临期，其它资源继续走。
          </p>
          <div className="cards">
            {batches.map((b, i) => {
              const r = batchRisk(b);
              const l = batchLights(b);
              const bDone = b.lanes.filter((lane) => {
                const p = progress(lane);
                return p.total > 0 && p.done === p.total;
              }).length;
              const isActive = b.id === activeId;
              return (
                <motion.div key={b.id} className="batch-card-wrap" {...entrance(i * 0.07, 14)}>
                <Card
                  hoverable
                  className={`batch-card${isActive ? " is-active-batch" : ""}`}
                  onClick={() => {
                    setActiveId(b.id);
                    setStageFilter(null);
                    setChartFilter(null);
                    setView("board");
                    dispatchElfEvent("batch_selected", {
                      message: `已载入【${b.name}】交付看板。`,
                    });
                  }}
                  extra={
                    <Space size={6}>
                      {isActive ? <Tag color="processing">当前查看</Tag> : null}
                      <Tag color={r.level === "risk" ? "error" : r.level === "watch" ? "warning" : "success"}>
                        {r.level === "risk" ? "有风险" : r.level === "watch" ? "需关注" : "正常"}
                      </Tag>
                    </Space>
                  }
                >
                  <Flex align="center" gap={16}>
                    <EmotionBall
                      emotion={r.level === "risk" ? "34" : r.level === "watch" ? "11" : "10"}
                      shape={b.id === "b-summer" ? "wedge" : "gem"}
                      size={54}
                      lite={true}
                      interactive={true}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{b.name}</div>
                      <div style={{ color: "var(--ink)", fontSize: "0.88rem" }}>{b.subtitle}</div>
                      <div style={{ color: "var(--ink-soft)", fontSize: "0.85rem", marginTop: 4 }}>
                        上线 {formatDay(b.launchDate)} · {launchRemain(b.launchDate)} · 进度 {bDone}/{b.lanes.length}
                        {l.red > 0 ? ` · 红 ${l.red}` : ""}
                        {l.yellow > 0 ? ` · 黄 ${l.yellow}` : ""}
                      </div>
                      <div style={{ color: r.level === "risk" ? "var(--red)" : r.level === "watch" ? "var(--yellow)" : "var(--ok)", fontSize: "0.85rem", marginTop: 2 }}>
                        {r.sentence}
                      </div>
                    </div>
                  </Flex>
                </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {view === "board" && (
        <BoardScroll>
          <section className="batch-bar snap-pane">
            <HeroDeliveryRunway
              batch={batch}
              risk={risk}
              today={TODAY}
              doneLanes={doneLanes}
              totalLanes={batch.lanes.length}
              onHoverDate={setHoveredDate}
              onChangeLaunchDate={() => {
                setNextLaunch(batch.launchDate);
                setLaunchOpen(true);
              }}
              onOpenItem={(id) => setOpenId(id)}
              onNudge={(item, lane) => {
                const text = generateNudgeMessage(item, lane, batch);
                try {
                  navigator.clipboard.writeText(text);
                  message.success(`已复制 ${PEOPLE[item.driId]?.name} 的催办提醒到剪贴板！`);
                } catch {
                  message.info("催办提醒已生成");
                }
              }}
            />
          </section>

          <div className="view-filter-bar">
            <Segmented
              value={quickFilter}
              onChange={(v) => {
                startTransition(() => {
                  setQuickFilter(v as "all" | "risk" | "mine");
                });
              }}
              options={[
                { label: `全部看板 (${rawBatch.lanes.length})`, value: "all" },
                {
                  label: (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      只看风险
                      {risk.level === "risk" ? <span className="filter-badge-risk">●</span> : null}
                    </span>
                  ),
                  value: "risk",
                },
                {
                  label: (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      等我确认
                      {myConfirmRows.length > 0 ? (
                        <Badge count={myConfirmRows.length} size="small" style={{ backgroundColor: "#52c41a" }} />
                      ) : null}
                    </span>
                  ),
                  value: "mine",
                },
              ]}
            />
            {stageFilter ? (
              <Tag
                closable
                onClose={() => setStageFilter(null)}
                color="processing"
                className="stage-filter-tag"
              >
                已聚焦阶段：{STAGES.find((s) => s.key === stageFilter)?.name}
              </Tag>
            ) : null}
            {chartFilter ? (
              <Tag
                closable
                onClose={() => setChartFilter(null)}
                color="blue"
                className="stage-filter-tag"
              >
                图表过滤：{chartFilter.stage ? STAGES.find((s) => s.key === chartFilter.stage)?.short : "全阶段"} ·{" "}
                {chartFilter.riskType === "risk"
                  ? "高风险"
                  : chartFilter.riskType === "blocked"
                    ? "锁定"
                    : chartFilter.riskType === "done"
                      ? "已完成"
                      : "正常待办"}
              </Tag>
            ) : null}
          </div>

          <BoardInsight
            batch={batch}
            queue={queue}
            activeStage={stageFilter}
            chartFilter={chartFilter}
            onOpen={openItem}
            onStage={(key) => setStageFilter((cur) => (cur === key ? null : key))}
            onSubFilter={setChartFilter}
          />

          <Card
            className="board-block board-flow snap-pane"
            title="流程"
            extra={<Text type="secondary">拖到下一节点确认 · 支持切换多维视图</Text>}
          >
            <FlowBoard
              batch={batch}
              actor={actor}
              stageFilter={stageFilter}
              onFilter={setStageFilter}
              onOpen={openItem}
              onDropLane={dropLane}
              swimlaneDim={swimlaneDim}
              onSwimlaneDimChange={setSwimlaneDim}
              hoveredDate={hoveredDate}
              hoveredLaneId={hoveredLaneId}
              setHoveredLaneId={setHoveredLaneId}
              onNudge={handleNudge}
            />
          </Card>

          <Card
            className="board-block board-res snap-pane"
            title={
              <Space size="middle">
                <span>入库资源</span>
                {stageFilter ? (
                  <Text type="secondary">
                    {visibleLanes.length} / {batch.lanes.length} · {STAGES.find((s) => s.key === stageFilter)?.name}
                  </Text>
                ) : null}
              </Space>
            }
            extra={
              stageFilter ? (
                <Button type="link" size="small" onClick={() => setStageFilter(null)}>
                  看全部
                </Button>
              ) : null
            }
          >
            <ResourceTable
              lanes={visibleLanes}
              onOpen={openItem}
              selectedLaneIds={selectedLaneIds}
              onSelectLane={(id, checked) =>
                setSelectedLaneIds((cur) => (checked ? [...cur, id] : cur.filter((x) => x !== id)))
              }
              onSelectAllLanes={(checked) =>
                setSelectedLaneIds(checked ? visibleLanes.map((l) => l.id) : [])
              }
              hoveredDate={hoveredDate}
              hoveredLaneId={hoveredLaneId}
              setHoveredLaneId={setHoveredLaneId}
            />
          </Card>
        </BoardScroll>
      )}

      {view === "board" && selectedLaneIds.length > 0 ? (
        <BatchActionBar
          selectedCount={selectedLaneIds.length}
          totalCount={visibleLanes.length}
          onBatchAdvance={handleBatchAdvance}
          onBatchNudge={handleBatchNudge}
          onExportList={handleExportList}
          onClear={() => setSelectedLaneIds([])}
        />
      ) : null}

      {view === "mine" && (
        <div className="mine view-in" id="main">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              background: "#ffffff",
              border: "1px solid rgba(0, 0, 0, 0.08)",
              borderRadius: 12,
              padding: "14px 18px",
              marginBottom: 16,
            }}
          >
            <EmotionBall
              emotion={totalMyTasks === 0 ? "33" : myDriRows.some((r) => itemLight(r.it) === "red") ? "17" : "30"}
              size={52}
              interactive={true}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>
                {PEOPLE[actor].name}（{PEOPLE[actor].title}）· 待办总览
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>
                {totalMyTasks === 0
                  ? "当前名下暂无待办事项，所有交付节点推进顺利。"
                  : `共有 ${totalMyTasks} 项待处理（主责 ${myDriRows.length} 项 · 待确认 ${myConfirmRows.length} 项）。点击小球可触发互动。`}
              </div>
            </div>
          </div>

          <Tabs
            activeKey={mineTab}
            onChange={(k) => setMineTab(k as "dri" | "confirm")}
            items={[
              {
                key: "dri",
                label: (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    派给我的
                    {myDriRows.length > 0 && <Badge count={myDriRows.length} size="small" />}
                  </span>
                ),
              },
              {
                key: "confirm",
                label: (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    等我确认
                    {myConfirmRows.length > 0 && (
                      <Badge count={myConfirmRows.length} size="small" style={{ backgroundColor: "#52c41a" }} />
                    )}
                  </span>
                ),
              },
            ]}
          />
          {(() => {
            const rows = mineTab === "dri" ? myDriRows : myConfirmRows;
            if (rows.length === 0) {
              return (
                <div style={{ textAlign: "center", padding: "48px 0", background: "#ffffff", borderRadius: 12, border: "1px dashed rgba(0, 0, 0, 0.08)", marginTop: 12 }}>
                  <EmotionBall emotion="33" size={60} interactive={true} autostart={true} />
                  <div style={{ fontWeight: 700, fontSize: 15, marginTop: 12, color: "var(--ink)" }}>
                    {mineTab === "dri" ? "太棒了！当前名下无待办任务" : "全部确认完成，无待您审核的节点"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                    流程高效顺畅流转中，交付精灵将持续监控进度节拍。
                  </div>
                </div>
              );
            }
            return (
              <Flex orientation="vertical" gap={8}>
                {rows.map(({ lane, it }, i) => {
                  const light = itemLight(it);
                  const stage = STAGES.find((s) => s.key === it.stage);
                  return (
                    <motion.div key={it.id} {...entrance(i * 0.05, 8)}>
                    <button className="mine-row" onClick={() => openItem(it.id)}>
                      <Flex align="center" gap={8} style={{ minWidth: 0 }}>
                        <Badge status={light === "red" ? "error" : light === "yellow" ? "warning" : "default"} />
                        <Text strong ellipsis={{ tooltip: `${lane.name} · ${stage?.name}` }}>
                          {lane.name}
                        </Text>
                      </Flex>
                      <Tag color="blue">{stage?.short ?? it.stage}</Tag>
                      <Tag>{stateLabel(it)}</Tag>
                      <Text type={light === "red" ? "danger" : light === "yellow" ? "warning" : "secondary"}>
                        {remainLabel(it.dueAt)}
                      </Text>
                      <Flex align="center" gap={6} style={{ minWidth: 0 }}>
                        {avatar(mineTab === "dri" ? it.driId : it.confirmerId, 22)}
                        <Text type="secondary" ellipsis>
                          {PEOPLE[mineTab === "dri" ? it.driId : it.confirmerId].name}
                        </Text>
                      </Flex>
                    </button>
                    </motion.div>
                  );
                })}
              </Flex>
            );
          })()}
        </div>
      )}

      <Modal
        className="item-modal"
        open={!!open}
        onCancel={closeItem}
        footer={null}
        width={920}
        centered
        destroyOnHidden
        title={
          open ? (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <EmotionBall
                ref={modalBallRef}
                emotion={
                  open.item.locked
                    ? "06"
                    : itemLight(open.item) === "red"
                    ? "34"
                    : open.item.state === "confirmed"
                    ? "33"
                    : open.item.state === "submitted"
                    ? "11"
                    : open.item.state === "in_progress" || open.item.state === "rework"
                    ? "30"
                    : "02"
                }
                shape={open.lane.type.includes("3D") ? "wedge" : open.lane.type.includes("特效") ? "gem" : "blob"}
                size={46}
                interactive={true}
              />
              <div>
                <Text type="secondary">
                  {open.lane.name} · {STAGES.find((s) => s.key === open.item.stage)?.name}
                </Text>
                <div>
                  {stateLabel(open.item)}
                  <Text type="secondary" style={{ marginLeft: 8, fontWeight: 400 }}>
                    {open.item.offsetLabel} · {formatDay(open.item.dueAt)}
                    {open.item.state === "confirmed" || open.item.skipped ? "" : ` · ${remainLabel(open.item.dueAt)}`}
                  </Text>
                  {open.item.duePinned ? <Tag color="blue" style={{ marginLeft: 8 }}>已钉死</Tag> : null}
                </div>
              </div>
            </div>
          ) : null
        }
      >
        {open && (
          <div className="item-modal-grid">
            <div>
              <Descriptions
                className="block"
                title="职责"
                column={1}
                size="small"
                items={[
                  {
                    key: "dri",
                    label: "主责",
                    children: (
                      <Flex align="center" gap={8}>
                        {avatar(open.item.driId, 24)} {PEOPLE[open.item.driId].name}
                      </Flex>
                    ),
                  },
                  {
                    key: "confirm",
                    label: "确认",
                    children: (
                      <Flex align="center" gap={8}>
                        {avatar(open.item.confirmerId, 24)} {PEOPLE[open.item.confirmerId].name}
                      </Flex>
                    ),
                  },
                  ...open.item.collabIds.map((id) => ({
                    key: id,
                    label: "协作",
                    children: (
                      <Flex align="center" gap={8}>
                        {avatar(id, 24)} {PEOPLE[id].name}
                      </Flex>
                    ),
                  })),
                ]}
              />
              <Descriptions
                className="block"
                title="完成条件"
                column={1}
                size="small"
                items={open.item.completeWhen.map((g) => ({
                  key: g.id,
                  label: g.label,
                  children: <Tag color={g.ok ? "success" : "error"}>{g.ok ? "通过" : "缺失"}</Tag>,
                }))}
              />
              <Descriptions
                className="block"
                title="流转条件"
                column={1}
                size="small"
                items={open.item.enterNextWhen.map((g) => ({
                  key: g.id,
                  label: g.label,
                  children: <Tag color={g.ok ? "success" : "error"}>{g.ok ? "通过" : "缺失"}</Tag>,
                }))}
              />
              <section className="block">
                <h3>过程记录</h3>
                {open.item.history.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚无记录" />
                ) : (
                  <Timeline
                    items={[...open.item.history].reverse().map((h) => ({
                      key: h.id,
                      content: (
                        <div>
                          <Text type="secondary">{h.at}</Text>
                          <div>
                            {PEOPLE[h.actorId].name} {h.action}
                            {h.from && h.to ? ` · ${h.from} → ${h.to}` : ""}
                          </div>
                          {h.reason && <Text type="secondary">{h.reason}</Text>}
                        </div>
                      ),
                    }))}
                  />
                )}
              </section>
            </div>
            <div>
              <section className="block">
                <h3>交付内容</h3>
                {open.item.stage === "upload" && !open.item.skipped && (
                  <>
                    <label className="field">
                      SVN 地址
                      <Input
                        value={open.item.evidence.svnPath ?? ""}
                        onChange={(e) => update(patchEvidence(batch, open.item.id, { svnPath: e.target.value }))}
                      />
                    </label>
                    <label className="field">
                      资源版本
                      <Input
                        value={open.item.evidence.svnRev ?? ""}
                        placeholder="未填则不能确认"
                        onChange={(e) => update(patchEvidence(batch, open.item.id, { svnRev: e.target.value }))}
                      />
                    </label>
                  </>
                )}
                <label className="field">
                  说明
                  <Input.TextArea
                    rows={4}
                    value={open.item.evidence.note ?? ""}
                    onChange={(e) => update(patchEvidence(batch, open.item.id, { note: e.target.value }))}
                  />
                </label>
              </section>
              <section className="block item-actions">
                <h3>处理</h3>
                {err && <Alert type="error" showIcon message={err} style={{ marginBottom: 8 }} />}
                <Flex gap={8} wrap>
                  <Button
                    type="default"
                    onClick={() => {
                      const msg = canStart(open.item, actor);
                      if (msg) setErr(msg);
                      else {
                        update(startItem(batch, open.item.id, actor));
                        modalBallRef.current?.setEmotion("30");
                        dispatchElfEvent("item_started", {
                          message: `【${open.lane.name}】已启动推进。`,
                        });
                        setErr(null);
                      }
                    }}
                  >
                    开始
                  </Button>
                  <Button
                    type="default"
                    onClick={() => {
                      const msg = canSubmit(open.item, actor);
                      if (msg) setErr(msg);
                      else {
                        update(submitItem(batch, open.item.id, actor));
                        modalBallRef.current?.setEmotion("11");
                        dispatchElfEvent("item_submitted", {
                          message: `【${open.lane.name}】已提交交付内容，等待确认。`,
                        });
                        setErr(null);
                      }
                    }}
                  >
                    提交
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => {
                      const msg = canConfirm(open.item, actor);
                      if (msg) setErr(msg);
                      else {
                        update(confirmItem(batch, open.item.id, actor));
                        modalBallRef.current?.spin(1);
                        modalBallRef.current?.burst(24);
                        dispatchElfEvent("item_confirmed", {
                          message: `【${open.lane.name}】节点已确认通过！`,
                          action: "burst",
                        });
                        setErr(null);
                      }
                    }}
                  >
                    确认通过
                  </Button>
                  {open.item.state === "rejected" && (
                    <Button
                      type="default"
                      onClick={() => {
                        update(reworkItem(batch, open.item.id, actor));
                        modalBallRef.current?.setEmotion("30");
                        dispatchElfEvent("item_started", {
                          message: `【${open.lane.name}】已重新开始返工。`,
                        });
                        setErr(null);
                      }}
                    >
                      开始返工
                    </Button>
                  )}
                  <Button
                    type="default"
                    disabled={open.item.state === "confirmed" || open.item.skipped}
                    onClick={() => {
                      update(togglePin(batch, open.item.id, actor));
                      setErr(null);
                    }}
                  >
                    {open.item.duePinned ? "取消钉死" : "钉死日期"}
                  </Button>
                </Flex>
                <label className="field" style={{ marginTop: 12 }}>
                  退回原因
                  <Input.TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
                </label>
                <Button
                  color="danger"
                  variant="outlined"
                  onClick={() => {
                    const msg = canReject(open.item, actor, reason);
                    if (msg) setErr(msg);
                    else {
                      update(rejectItem(batch, open.item.id, actor, reason));
                      modalBallRef.current?.setEmotion("23");
                      dispatchElfEvent("item_rejected", {
                        message: `【${open.lane.name}】已退回重做。`,
                      });
                      setReason("");
                      setErr(null);
                    }
                  }}
                >
                  退回
                </Button>
              </section>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="调整上线日"
        open={launchOpen}
        onCancel={() => setLaunchOpen(false)}
        onOk={() => {
          if (nextLaunch) {
            update(shiftLaunchDate(batch, nextLaunch, actor));
            dispatchElfEvent("batch_date_shifted", {
              message: `上线日期已调整为 ${formatDay(nextLaunch)}，排期链已完成动态重排。`,
            });
          }
          setLaunchOpen(false);
        }}
        okText="确认调整"
        cancelText="取消"
        okButtonProps={{ type: "primary" }}
        cancelButtonProps={{ type: "default" }}
      >
        <p className="hint">未完成且未钉死的任务会按工作日平移截止日期；已完成与已钉死保持原日期，并写入过程记录。</p>
        <DatePicker
          value={nextLaunch ? dayjs(nextLaunch) : null}
          onChange={(d) => setNextLaunch(d ? d.format("YYYY-MM-DD") : "")}
          style={{ width: "100%" }}
        />
        {(() => {
          const preview = nextLaunch ? previewShift(batch, nextLaunch) : null;
          if (!preview) return null;
          if (preview.moved.length === 0) {
            return (
              <Alert
                type="info"
                showIcon
                message={preview.kept > 0 ? "没有任务会变动（其余全部已完成或已钉死）" : "上线日未变化"}
                style={{ marginTop: 12 }}
              />
            );
          }
          const shown = preview.moved.slice(0, 12);
          const rest = preview.moved.length - shown.length;
          return (
            <>
              <Alert
                type="warning"
                showIcon
                message={`${preview.moved.length} 项将平移截止日期 · ${preview.kept} 项保持不变（完成/钉死）`}
                style={{ marginTop: 12 }}
              />
              <div className="shift-preview">
                {shown.map((row) => (
                  <div key={row.item.id} className="shift-preview-row">
                    <Text ellipsis={{ tooltip: `${row.laneName} · ${row.stageName}` }}>
                      {row.laneName} · {row.stageName}
                    </Text>
                    <b>
                      {formatDay(row.oldDue)} → {formatDay(row.newDue)}
                    </b>
                  </div>
                ))}
                {rest > 0 && (
                  <Text type="secondary" className="shift-preview-more">
                    其余 {rest} 项省略
                  </Text>
                )}
              </div>
            </>
          );
        })()}
      </Modal>

      <GlobalSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        batch={rawBatch}
        onSelect={(itemId, stageKey) => {
          if (stageKey) setStageFilter(stageKey);
          openItem(itemId);
        }}
      />

      <ElfCompanion
        batch={rawBatch}
        riskLevel={risk.level}
        riskText={risk.sentence}
        onTriggerNudge={() => {
          const blockedItem = rawBatch.lanes.flatMap((l) => l.items).find((x) => x.locked || itemLight(x) === "red");
          if (blockedItem) {
            const lane = rawBatch.lanes.find((l) => l.items.includes(blockedItem));
            if (lane) handleNudge(blockedItem, lane);
          } else {
            message.info("当前暂无高风险阻塞节点");
          }
        }}
        onOpenSearch={() => setSearchOpen(true)}
      />
    </div>
  );
}
