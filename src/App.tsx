import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Card,
  ConfigProvider,
  Flex,
  Segmented,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import { motion } from "motion/react";
import { FlowBoard } from "./FlowBoard";
import { ResourceTable } from "./ResourceTable";
import { BoardInsight } from "./StageChart";
import { BatchActionBar, GlobalSearchModal, HeroDeliveryRunway, avatar } from "./ui";
import { ElfCompanion, EmotionBall, dispatchElfEvent, type EmotionBallInstance } from "./emotion-ball";
import { BoardScroll } from "./motion/BoardScroll";
import { entrance } from "./motion/Entrance";
import { playSound, isSoundMuted, toggleSoundMuted } from "./sound";
import { useKeyboardShortcuts } from "./keyboard";
import { AppSidebar } from "./components/layout/AppSidebar";
import { AppHeader } from "./components/layout/AppHeader";
import { CommandMenu } from "./components/layout/CommandMenu";
import { THEMES } from "./tokens";

// Dynamic code-split views & modals for instant initial paint
const ResourceInventoryPage = lazy(() =>
  import("./pages/ResourceInventoryPage").then((m) => ({ default: m.ResourceInventoryPage }))
);
const AnalyticsCockpitPage = lazy(() =>
  import("./pages/AnalyticsCockpitPage").then((m) => ({ default: m.AnalyticsCockpitPage }))
);
const PlatformPortalPage = lazy(() =>
  import("./pages/PlatformPortalPage").then((m) => ({ default: m.PlatformPortalPage }))
);
const ProcessTemplatesPage = lazy(() =>
  import("./pages/ProcessTemplatesPage").then((m) => ({ default: m.ProcessTemplatesPage }))
);
const WorkItemModal = lazy(() =>
  import("./components/WorkItemModal").then((m) => ({ default: m.WorkItemModal }))
);
const ElfCopilotDrawer = lazy(() =>
  import("./components/ElfCopilotDrawer").then((m) => ({ default: m.ElfCopilotDrawer }))
);
const ShortcutModal = lazy(() =>
  import("./components/ShortcutModal").then((m) => ({ default: m.ShortcutModal }))
);
const ConfettiEffect = lazy(() =>
  import("./components/ConfettiEffect").then((m) => ({ default: m.ConfettiEffect }))
);
const ShadcnAdminRoot = lazy(() =>
  import("./components/shadcn/ShadcnAdminRoot").then((m) => ({ default: m.ShadcnAdminRoot }))
);
const EnterpriseAdminRoot = lazy(() =>
  import("./components/enterprise/EnterpriseAdminRoot").then((m) => ({ default: m.EnterpriseAdminRoot }))
);
import { ShiftSimulationModal } from "./components/ShiftSimulationModal";
import {
  PEOPLE,
  STAGES,
  TODAY,
  seedPrimaryBatch,
  seedQuietBatch,
  SCENARIO_PRESETS,
  buildScenarioBatch,
  type ScenarioPresetKey,
} from "./mock";
import {
  actionQueue,
  batchLights,
  batchRisk,
  canConfirm,
  canRework,
  canStart,
  confirmItem,
  currentItem,
  findItem,
  formatDay,
  generateNudgeMessage,
  getAssetCategory,
  itemLight,
  launchRemain,
  nextActiveStageForLane,
  patchEvidence,
  progress,
  reassignItemDri,
  refreshLocks,
  remainLabel,
  rejectItem,
  reworkItem,
  shiftLaunchDate,
  startItem,
  submitItem,
  stateLabel,
  toggleGateItem,
  toggleItemSkip,
  togglePin,
  tryMoveLaneToStage,
  updateItemDueDate,
  waiveItem,
} from "./logic";
import type { ChartSubFilter, DensityMode, LaunchBatch, PersonId, PreviewMode, ResourceLane, StageKey, SwimlaneDimension, View, WorkItem } from "./types";

const { Text } = Typography;

const SHARE_URL = "https://yy-oowoo.github.io/elfship-prototype/";
const PREVIEW_MODE_LABELS: Record<PreviewMode, string> = {
  companion: "方案一：灵动伴侣体验版",
  classic: "方案二：经典工程管控台",
  enterprise: "方案三：企业级专业可视化后台系统",
};

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
  const [mineTab, setMineTab] = useState<"dri" | "confirm">("dri");
  const [mineScope, setMineScope] = useState<"current" | "all">("current");
  const [quickFilter, setQuickFilter] = useState<"all" | "risk" | "mine">("all");
  const [isMuted, setIsMuted] = useState<boolean>(() => isSoundMuted());
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const modalBallRef = useRef<EmotionBallInstance>(null);
  const themeKey = "light" as const;
  const currentTheme = THEMES.light;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  const [previewMode, setPreviewMode] = useState<PreviewMode>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const p = params.get("preview") || params.get("style");
      if (p === "enterprise" || p === "visual" || p === "cockpit") return "enterprise";
      if (p === "classic") return "classic";
      const saved = localStorage.getItem("elfship_preview_mode") as PreviewMode | null;
      if (saved === "enterprise" || saved === "classic" || saved === "companion") return saved;
    } catch {
      // fallback safe
    }
    return "companion";
  });

  const handleTogglePreviewMode = (mode: PreviewMode) => {
    if (mode === previewMode) return;
    setPreviewMode(mode);
    try {
      localStorage.setItem("elfship_preview_mode", mode);
      const url = new URL(window.location.href);
      url.searchParams.set("preview", mode);
      window.history.replaceState({}, "", url.toString());
    } catch {
      // fallback safe
    }
    message.success(`已切换至【${PREVIEW_MODE_LABELS[mode]}】`);
  };

  const [currentScenario, setCurrentScenario] = useState<ScenarioPresetKey>("baseline");

  const handleSelectScenario = (key: ScenarioPresetKey) => {
    playSound.click();
    setCurrentScenario(key);
    const scenarioBatch = refreshLocks(buildScenarioBatch(key));
    setBatches((prev) => [
      scenarioBatch,
      ...prev.filter((b) => b.id !== scenarioBatch.id),
    ]);
    setActiveId(scenarioBatch.id);
    const meta = SCENARIO_PRESETS.find((s) => s.key === key);
    if (meta) {
      message.success(meta.toast);
      dispatchElfEvent("scenario_switched", {
        message: `${meta.title}：${meta.desc}`,
      });
    }
  };

  const handleTogglePinInBatch = (itemId: string) => {
    playSound.click();
    update(togglePin(rawBatch, itemId, actor));
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-density", densityMode);
  }, [densityMode]);



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

  const risk = useMemo(() => batchRisk(rawBatch), [rawBatch]);
  const queue = useMemo(() => actionQueue(rawBatch), [rawBatch]);
  const batchRiskLights = useMemo(() => batchLights(rawBatch), [rawBatch]);
  const totalRiskCount = useMemo(() => batchRiskLights.red + batchRiskLights.yellow, [batchRiskLights]);
  const open = openId ? findItem(rawBatch, openId) : null;

  function update(next: LaunchBatch) {
    setBatches((all) => all.map((b) => (b.id === next.id ? next : b)));
  }

  function openItem(id: string) {
    // 任何展开页面组件互斥避让，避免多重弹层/抽屉重叠与冲突
    setCopilotOpen(false);
    setShortcutOpen(false);
    setLaunchOpen(false);
    setCommandMenuOpen(false);
    setSearchOpen(false);
    setOpenId(id);
    setFocusedCardId(id);
  }

  function closeItem() {
    setOpenId(null);
  }

  function handleOpenCopilot() {
    closeItem();
    setLaunchOpen(false);
    setShortcutOpen(false);
    setCommandMenuOpen(false);
    setSearchOpen(false);
    setCopilotOpen(true);
  }

  function handleOpenLaunchModal() {
    closeItem();
    setCopilotOpen(false);
    setShortcutOpen(false);
    setCommandMenuOpen(false);
    setSearchOpen(false);
    setLaunchOpen(true);
  }

  function handleOpenShortcutModal() {
    closeItem();
    setCopilotOpen(false);
    setLaunchOpen(false);
    setCommandMenuOpen(false);
    setSearchOpen(false);
    setShortcutOpen(true);
  }

  const allVisibleItems = useMemo(() => {
    return batch.lanes.map((l) => currentItem(l)).filter(Boolean) as WorkItem[];
  }, [batch]);

  useKeyboardShortcuts({
    onSelectView: (v) => {
      playSound.click();
      closeItem();
      setCopilotOpen(false);
      setLaunchOpen(false);
      setShortcutOpen(false);
      setCommandMenuOpen(false);
      setView(v);
    },
    onNextCard: () => {
      if (allVisibleItems.length === 0) return;
      const currentIdx = allVisibleItems.findIndex((it) => it.id === focusedCardId);
      const nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % allVisibleItems.length;
      setFocusedCardId(allVisibleItems[nextIdx].id);
      playSound.focus();
    },
    onPrevCard: () => {
      if (allVisibleItems.length === 0) return;
      const currentIdx = allVisibleItems.findIndex((it) => it.id === focusedCardId);
      const prevIdx = currentIdx <= 0 ? allVisibleItems.length - 1 : currentIdx - 1;
      setFocusedCardId(allVisibleItems[prevIdx].id);
      playSound.focus();
    },
    onOpenFocused: () => {
      if (focusedCardId) {
        playSound.click();
        openItem(focusedCardId);
      }
    },
    onQuickPeek: () => {
      if (focusedCardId) {
        playSound.click();
        openItem(focusedCardId);
      }
    },
    onToggleElf: () => {
      playSound.click();
      if (copilotOpen) {
        setCopilotOpen(false);
      } else {
        handleOpenCopilot();
      }
    },
    onToggleMute: () => {
      const next = toggleSoundMuted();
      setIsMuted(next);
      message.info(next ? "已静音操作音效" : "已开启操作音效");
    },
    onOpenHelp: () => {
      playSound.click();
      handleOpenShortcutModal();
    },
    onSearch: () => {
      playSound.click();
      closeItem();
      setCopilotOpen(false);
      setLaunchOpen(false);
      setShortcutOpen(false);
      setCommandMenuOpen(true);
    },
    onToggleScheme: () => {
      playSound.fanfare();
      const next = previewMode === "companion" ? "classic" : "companion";
      handleTogglePreviewMode(next);
    },
  });

  function handleToggleGate(gateId: string) {
    if (!open) return;
    const nextBatch = toggleGateItem(rawBatch, open.item.id, gateId);
    update(nextBatch);
    const updatedItem = findItem(nextBatch, open.item.id)?.item;
    if (updatedItem) {
      const allComplete = updatedItem.completeWhen.every((g) => g.ok);
      const allEnter = updatedItem.enterNextWhen.every((g) => g.ok);
      if (allComplete && allEnter) {
        modalBallRef.current?.spin(1);
        dispatchElfEvent("gate_completed", {
          message: `【${open.lane.name}】门禁准出条件已全部达成，可直接确认放行！`,
        });
      }
    }
  }

  const visibleLanes = useMemo(() => {
    if (!stageFilter) return batch.lanes;
    return batch.lanes.filter((lane) => {
      const it = lane.items.find((x) => x.stage === stageFilter);
      if (!it || it.skipped) return false;
      return it.state !== "confirmed" || itemLight(it) !== "none";
    });
  }, [batch, stageFilter]);

  const allBatchesForMine = useMemo(() => (mineScope === "all" ? batches : [rawBatch]), [mineScope, batches, rawBatch]);

  const myDriRows = useMemo(() => {
    const list = allBatchesForMine.flatMap((b) =>
      b.lanes.flatMap((lane) =>
        lane.items
          .filter((it) => !it.skipped && it.state !== "confirmed" && !it.locked && !it.waiting && it.driId === actor)
          .map((it) => ({ lane, it, batch: b })),
      ),
    );
    // Natural urgency-first sorting: rejected > red > yellow > WIP > dueAt
    return list.sort((a, b) => {
      const getRank = (it: WorkItem) => {
        if (it.state === "rejected") return 0;
        const light = itemLight(it);
        if (light === "red") return 1;
        if (light === "yellow") return 2;
        if (it.state === "submitted") return 3;
        if (it.state === "in_progress" || it.state === "rework") return 4;
        return 5;
      };
      return getRank(a.it) - getRank(b.it) || a.it.dueAt.localeCompare(b.it.dueAt);
    });
  }, [allBatchesForMine, actor]);

  const myConfirmRows = useMemo(() => {
    const list = allBatchesForMine.flatMap((b) =>
      b.lanes.flatMap((lane) =>
        lane.items
          .filter((it) => !it.skipped && it.state === "submitted" && !it.locked && it.confirmerId === actor)
          .map((it) => ({ lane, it, batch: b })),
      ),
    );
    // Natural urgency sorting: red overdue > yellow warning > dueAt
    return list.sort((a, b) => {
      const getRank = (it: WorkItem) => {
        const light = itemLight(it);
        if (light === "red") return 0;
        if (light === "yellow") return 1;
        return 2;
      };
      return getRank(a.it) - getRank(b.it) || a.it.dueAt.localeCompare(b.it.dueAt);
    });
  }, [allBatchesForMine, actor]);

  const totalMyTasks = useMemo(
    () => myDriRows.length + myConfirmRows.length,
    [myDriRows.length, myConfirmRows.length]
  );

  const doneLanes = useMemo(() => {
    return rawBatch.lanes.filter((lane) => {
      const p = progress(lane);
      return p.total > 0 && p.done === p.total;
    }).length;
  }, [rawBatch.lanes]);

  const counts = useMemo(
    () => ({
      board: rawBatch.lanes.length,
      resources: rawBatch.lanes.length,
      riskCount: totalRiskCount,
      mineCount: totalMyTasks,
    }),
    [rawBatch.lanes.length, totalRiskCount, totalMyTasks]
  );

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
    const failureReasons: string[] = [];

    for (const laneId of selectedLaneIds) {
      const lane = nextBatch.lanes.find((l) => l.id === laneId);
      if (!lane) continue;
      const cur = currentItem(lane);
      const next = nextActiveStageForLane(lane, cur.stage);
      if (!next) {
        failureReasons.push(`【${lane.name}】已至最后阶段`);
        continue;
      }
      const res = tryMoveLaneToStage(nextBatch, laneId, next, actor);
      if (res.ok && res.batch !== nextBatch) {
        nextBatch = res.batch;
        successCount++;
      } else if (!res.ok) {
        failureReasons.push(`【${lane.name}】${res.reason}`);
      }
    }

    if (successCount > 0) {
      update(nextBatch);
      if (failureReasons.length === 0) {
        message.success(`成功批量流转全部 ${successCount} 项资源进入下一交付阶段！`);
      } else {
        message.info(`已成功流转 ${successCount} 项资源，另有 ${failureReasons.length} 项未流转（如：${failureReasons[0]}）`);
      }
      dispatchElfEvent("stage_advanced", {
        message: `已批量推进 ${successCount} 项资源进入下一交付阶段！`,
        action: "burst",
      });
      setSelectedLaneIds([]);
    } else {
      const topReason = failureReasons[0] ?? "未满足交付门禁或当前未处于可确认状态";
      message.warning(`选中的 ${selectedLaneIds.length} 项资源未能流转：${topReason}`);
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
      "资源名称,资产类型,分类,当前工序,主责人,确认人,截止日期,工期余量,工序状态,SVN版本",
      ...selectedLanes.map((l) => {
        const cur = currentItem(l);
        const dri = PEOPLE[cur.driId]?.name ?? cur.driId;
        const confirmer = PEOPLE[cur.confirmerId]?.name ?? cur.confirmerId;
        const st = STAGES.find((s) => s.key === cur.stage)?.name ?? cur.stage;
        const cat = getAssetCategory(l.type);
        const rev = cur.evidence?.svnRev ?? "-";
        return `"${l.name}","${l.type}","${cat}","${st}","${dri}","${confirmer}","${cur.dueAt}","${remainLabel(cur.dueAt)}","${stateLabel(cur)}","${rev}"`;
      }),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${rawBatch.name}_资产交付清单_${TODAY}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    message.success(`已导出 ${selectedLanes.length} 项资源的资产交付清单 CSV！`);
  }

  function handleGenerateMarkdownReport() {
    const selectedLanes =
      selectedLaneIds.length > 0
        ? rawBatch.lanes.filter((l) => selectedLaneIds.includes(l.id))
        : rawBatch.lanes;
    const lights = batchLights(rawBatch);
    const lines = [
      `### 【${rawBatch.name}】SOP 交付流转日报`,
      `> 上线基准日：**${formatDay(rawBatch.launchDate)}**（${launchRemain(rawBatch.launchDate)}） · 统计资产：共 ${selectedLanes.length} 项`,
      ``,
      `#### 全局风险态势`,
      `- **P0 严重逾期**：${lights.red} 项`,
      `- **临期关注预警**：${lights.yellow} 项`,
      `- **正常/已通关**：${selectedLanes.length - lights.red - lights.yellow} 项`,
      ``,
      `#### 重点资产交付工序跟踪`,
      `| 资产名称 | 类别 | 当前工序 | 主责人 | 截止日期 | 工期状态 | SVN版本 |`,
      `| :--- | :---: | :---: | :---: | :---: | :---: | :---: |`,
      ...selectedLanes.map((l) => {
        const cur = currentItem(l);
        const dri = PEOPLE[cur.driId]?.name ?? cur.driId;
        const st = STAGES.find((s) => s.key === cur.stage)?.name ?? cur.stage;
        const light = itemLight(cur);
        const statusIcon = light === "red" ? "[严重逾期]" : light === "yellow" ? "[临期预警]" : cur.state === "confirmed" ? "[已通关]" : "[正常推进]";
        const rev = cur.evidence?.svnRev ? `r${cur.evidence.svnRev}` : "-";
        return `| **${l.name}** | ${l.type} | ${st} | @${dri} | ${formatDay(cur.dueAt)} | ${statusIcon} | \`${rev}\` |`;
      }),
      ``,
      `*由 ElfShip 精灵上线交付管控平台智能生成*`
    ].join("\n");

    try {
      navigator.clipboard.writeText(lines);
      message.success("已生成并复制【SOP 交付日报 Markdown 富文本】至剪贴板！可直接粘贴至企微/飞书。");
      playSound.fanfare();
      dispatchElfEvent("report_generated", { message: "已生成 SOP 交付进度汇报富文本。" });
    } catch {
      message.info("交付进度报告已生成");
    }
  }

  if (previewMode === "enterprise") {
    return (
      <ConfigProvider
        theme={{
          algorithm: theme.defaultAlgorithm,
          token: {
            colorPrimary: "#2563eb",
            colorBgBase: "#ffffff",
            colorBgContainer: "#ffffff",
            colorBgElevated: "#ffffff",
            colorBorder: "#e2e8f0",
            colorBorderSecondary: "#f1f5f9",
            colorText: "#0f172a",
            colorTextSecondary: "#475569",
            borderRadius: 8,
            fontFamily: "var(--font)",
          },
        }}
      >
        <Suspense fallback={<div className="view-loading-wrap"><div className="view-loading-spinner" /></div>}>
          <EnterpriseAdminRoot
            batches={batches}
            activeBatch={rawBatch}
            onSelectBatch={(id) => {
              setActiveId(id);
              setStageFilter(null);
              setChartFilter(null);
            }}
            actor={actor}
            onSelectActor={setActor}
            previewMode={previewMode}
            onTogglePreviewMode={handleTogglePreviewMode}
            onOpenItem={openItem}
            onOpenShiftModal={handleOpenLaunchModal}
            onNudgeItem={(item, lane) => handleNudge(item, lane)}
            onExportCsv={handleExportList}
            onGenerateReport={handleGenerateMarkdownReport}
            onReassignDri={(itemId, newDri) => {
              update(reassignItemDri(rawBatch, itemId, newDri, actor));
              playSound.click();
              const driName = PEOPLE[newDri]?.name ?? newDri;
              message.success(`已成功改派主责人至 @${driName}`);
              dispatchElfEvent("item_started", { message: `已完成任务主责调度改派至 @${driName}` });
            }}
            onBatchReassignDri={(itemIds, newDri) => {
              let nb = rawBatch;
              itemIds.forEach((id) => {
                nb = reassignItemDri(nb, id, newDri, actor);
              });
              update(nb);
              playSound.confirm();
              const driName = PEOPLE[newDri]?.name ?? newDri;
              message.success(`已成功批量改派 ${itemIds.length} 项任务主责至 @${driName}`);
              dispatchElfEvent("item_started", { message: `已批量调度 ${itemIds.length} 项任务至 @${driName}` });
            }}
            onQuickUnblockItem={(itemId, reason) => {
              const item = findItem(rawBatch, itemId)?.item;
              if (!item) return;
              let nb = rawBatch;
              if (item.state === "not_started") {
                nb = startItem(nb, itemId, rawBatch.batchDriId);
              }
              nb = waiveItem(nb, itemId, rawBatch.batchDriId, reason || "安灯作战室快速解除阻断与下游级联加锁");
              update(nb);
              playSound.confirm();
              message.success("已特批放行该阻塞节点，下游级联加锁已全面解除！");
              dispatchElfEvent("gate_completed", { message: "安灯阻断已成功解除，流水线恢复运转。" });
            }}
            onOpenSearch={() => {
              playSound.click();
              setCommandMenuOpen(true);
            }}
          />
        </Suspense>

        <Suspense fallback={null}>
          {open && (
            <WorkItemModal
              open={open}
              actor={actor}
              rawBatch={rawBatch}
              onClose={closeItem}
              onStartItem={(id) => {
                update(startItem(rawBatch, id, actor));
                playSound.click();
                dispatchElfEvent("item_started", { message: "工序已启动推进。" });
              }}
              onSubmitItem={(id) => {
                update(submitItem(rawBatch, id, actor));
                playSound.click();
                dispatchElfEvent("item_submitted", { message: "已提交交付物待审。" });
              }}
              onConfirmItem={(id) => {
                const nextBatch = confirmItem(rawBatch, id, actor);
                update(nextBatch);
                playSound.confirm();
                dispatchElfEvent("item_confirmed", { message: "工序已确认放行！", action: "burst" });
                closeItem();
              }}
              onRejectItem={(id, reason) => {
                update(rejectItem(rawBatch, id, actor, reason));
                playSound.reject();
                dispatchElfEvent("item_rejected", { message: "已退回主责返修。" });
              }}
              onStartRework={(id) => {
                update(reworkItem(rawBatch, id, actor));
                playSound.click();
                dispatchElfEvent("item_started", { message: "已重新开始返工。" });
              }}
              onSkipItem={(id) => {
                update(toggleItemSkip(rawBatch, id, actor));
                playSound.click();
              }}
              onUpdateDueDate={(id, newDate) => {
                update(updateItemDueDate(rawBatch, id, newDate, actor));
                playSound.click();
              }}
              onPatchEvidence={(id, evidence) => {
                update(patchEvidence(rawBatch, id, evidence));
              }}
              onToggleGate={handleToggleGate}
              onOpenOtherItem={(otherId) => openItem(otherId)}
              onSwitchActor={setActor}
            />
          )}
        </Suspense>


        <CommandMenu
          open={commandMenuOpen}
          onClose={() => setCommandMenuOpen(false)}
          batch={rawBatch}
          currentView={view}
          onSelectView={(v) => {
            playSound.click();
            setView(v);
          }}
          onSelectActor={(pId) => {
            setActor(pId);
            dispatchElfEvent("role_switched", {
              message: `已切换至 ${PEOPLE[pId].name}（${PEOPLE[pId].title}）视角。`,
            });
          }}
          onSelectResourceLane={(_laneId, itemId) => {
            if (itemId) openItem(itemId);
          }}
          onOpenShiftModal={handleOpenLaunchModal}
          onOpenCopilot={handleOpenCopilot}
          isMuted={isMuted}
          onToggleMute={() => {
            const next = toggleSoundMuted();
            setIsMuted(next);
            message.info(next ? "已静音操作音效" : "已开启操作音效");
          }}
        />

        <ShiftSimulationModal
          open={launchOpen}
          onClose={() => setLaunchOpen(false)}
          batch={rawBatch}
          actor={actor}
          onApplyShift={(newLaunch) => {
            update(shiftLaunchDate(rawBatch, newLaunch, actor));
            dispatchElfEvent("batch_date_shifted", {
              message: `上线日期已调整为 ${formatDay(newLaunch)}，排期链已完成动态重排。`,
            });
          }}
          onTogglePin={handleTogglePinInBatch}
        />
      </ConfigProvider>
    );
  }

  if (previewMode === "classic") {
    return (
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#0f172a",
            borderRadius: 8,
            fontFamily: "var(--font)",
          },
        }}
      >
        <Suspense fallback={<div className="view-loading-wrap"><div className="view-loading-spinner" /></div>}>
          <ShadcnAdminRoot
            batches={batches}
            activeBatch={rawBatch}
            onSelectBatch={(id) => {
              setActiveId(id);
              setStageFilter(null);
              setChartFilter(null);
            }}
            actor={actor}
            onSelectActor={setActor}
            previewMode={previewMode}
            onTogglePreviewMode={handleTogglePreviewMode}
            onOpenItem={openItem}
            onOpenShiftModal={handleOpenLaunchModal}
            onNudgeItem={(item, lane) => handleNudge(item, lane)}
            onExportCsv={handleExportList}
            onGenerateReport={handleGenerateMarkdownReport}
            onOpenSearch={() => {
              playSound.click();
              setCommandMenuOpen(true);
            }}
          />
        </Suspense>

        <Suspense fallback={null}>
          {open && (
            <WorkItemModal
              open={open}
              actor={actor}
              rawBatch={rawBatch}
              onClose={closeItem}
              onStartItem={(id) => {
                update(startItem(rawBatch, id, actor));
                playSound.click();
                dispatchElfEvent("item_started", { message: "工序已启动推进。" });
              }}
              onSubmitItem={(id) => {
                update(submitItem(rawBatch, id, actor));
                playSound.click();
                dispatchElfEvent("item_submitted", { message: "已提交交付物待审。" });
              }}
              onConfirmItem={(id) => {
                const nextBatch = confirmItem(rawBatch, id, actor);
                update(nextBatch);
                playSound.confirm();
                dispatchElfEvent("item_confirmed", { message: "工序已确认放行！", action: "burst" });
                closeItem();
              }}
              onRejectItem={(id, reason) => {
                update(rejectItem(rawBatch, id, actor, reason));
                playSound.reject();
                dispatchElfEvent("item_rejected", { message: "已退回主责返修。" });
              }}
              onStartRework={(id) => {
                update(reworkItem(rawBatch, id, actor));
                playSound.click();
                dispatchElfEvent("item_started", { message: "已重新开始返工。" });
              }}
              onSkipItem={(id) => {
                update(toggleItemSkip(rawBatch, id, actor));
                playSound.click();
              }}
              onUpdateDueDate={(id, newDate) => {
                update(updateItemDueDate(rawBatch, id, newDate, actor));
                playSound.click();
              }}
              onPatchEvidence={(id, evidence) => {
                update(patchEvidence(rawBatch, id, evidence));
              }}
              onToggleGate={handleToggleGate}
              onOpenOtherItem={(otherId) => openItem(otherId)}
              onSwitchActor={setActor}
            />
          )}
        </Suspense>

        <CommandMenu
          open={commandMenuOpen}
          onClose={() => setCommandMenuOpen(false)}
          batch={rawBatch}
          currentView={view}
          onSelectView={(v) => {
            playSound.click();
            setView(v);
          }}
          onSelectActor={(pId) => {
            setActor(pId);
            dispatchElfEvent("role_switched", {
              message: `已切换至 ${PEOPLE[pId].name}（${PEOPLE[pId].title}）视角。`,
            });
          }}
          onSelectResourceLane={(_laneId, itemId) => {
            if (itemId) openItem(itemId);
          }}
          onOpenShiftModal={handleOpenLaunchModal}
          onOpenCopilot={handleOpenCopilot}
          isMuted={isMuted}
          onToggleMute={() => {
            const next = toggleSoundMuted();
            setIsMuted(next);
            message.info(next ? "已静音操作音效" : "已开启操作音效");
          }}
        />

        <ShiftSimulationModal
          open={launchOpen}
          onClose={() => setLaunchOpen(false)}
          batch={rawBatch}
          actor={actor}
          onApplyShift={(newLaunch) => {
            update(shiftLaunchDate(rawBatch, newLaunch, actor));
            dispatchElfEvent("batch_date_shifted", {
              message: `上线日期已调整为 ${formatDay(newLaunch)}，排期链已完成动态重排。`,
            });
          }}
          onTogglePin={handleTogglePinInBatch}
        />
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: currentTheme.primary,
          borderRadius: 8,
          fontFamily: "var(--font)",
        },
      }}
    >
      <div
        className="app-layout-root"
        data-theme={themeKey}
        style={{
          ["--primary" as string]: currentTheme.primary,
          ["--primary-hover" as string]: currentTheme.primaryHover,
          ["--primary-active" as string]: currentTheme.primaryActive,
          ["--primary-light" as string]: currentTheme.primaryLight,
          ["--primary-border" as string]: currentTheme.primaryBorder,
          ["--accent-color" as string]: currentTheme.accent,
          ["--sketch-ink" as string]: currentTheme.sketchInk,
          ["--brand-gradient" as string]: currentTheme.gradient,
        }}
      >
        <AppSidebar
          currentView={view}
          onSelectView={(v) => {
            playSound.click();
            setView(v);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          actor={actor}
          onSelectActor={(v) => {
            setActor(v);
            dispatchElfEvent("role_switched", {
              message: `已切换至 ${PEOPLE[v].name}（${PEOPLE[v].title}）视角。`,
            });
          }}
          counts={counts}
          isMuted={isMuted}
          onToggleMute={() => {
            const next = toggleSoundMuted();
            setIsMuted(next);
            message.info(next ? "已静音操作音效" : "已开启操作音效");
          }}
          densityMode={densityMode}
          onToggleDensity={() => {
            playSound.click();
            setDensityMode((d) => (d === "normal" ? "compact" : "normal"));
          }}
          onOpenCopilot={() => {
            playSound.click();
            setCopilotOpen(true);
          }}
          onOpenShortcuts={() => {
            playSound.click();
            setShortcutOpen(true);
          }}
          theme={currentTheme}
        />

        <div className="app-main-content-wrap">
          <AppHeader
            batches={batches}
            activeBatch={rawBatch}
            onSelectBatch={(id) => {
              setActiveId(id);
              setStageFilter(null);
              setChartFilter(null);
              dispatchElfEvent("batch_selected", {
                message: `已载入【${batches.find((b) => b.id === id)?.name}】交付看板。`,
              });
            }}
            currentView={view}
            onOpenCommandMenu={() => {
              closeItem();
              setCopilotOpen(false);
              setLaunchOpen(false);
              setShortcutOpen(false);
              setCommandMenuOpen(true);
            }}
            onOpenShiftModal={handleOpenLaunchModal}
            quickFilter={quickFilter}
            onChangeQuickFilter={(f) => setQuickFilter(f)}
            riskCount={totalRiskCount}
            myTasksCount={totalMyTasks}
            shareUrl={SHARE_URL}
            previewMode={previewMode}
            onTogglePreviewMode={handleTogglePreviewMode}
            currentScenario={currentScenario}
            onSelectScenario={handleSelectScenario}
          />

          <main className="app-view-container" id="main">
            <Suspense fallback={<div className="view-loading-wrap"><div className="view-loading-spinner" /></div>}>
              {view === "portal" && (
                <PlatformPortalPage
                  onNavigate={(v) => {
                    playSound.click();
                    setView(v);
                  }}
                />
              )}

              {view === "templates" && (
                <ProcessTemplatesPage />
              )}

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
                      window.scrollTo({ top: 0, behavior: "smooth" });
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
              onChangeLaunchDate={handleOpenLaunchModal}
              onOpenItem={openItem}
              onNudge={(item, lane) => handleNudge(item, lane)}
              onFilterQuick={(f) => setQuickFilter(f)}
            />
          </section>

          <div className="view-filter-bar">
            <Segmented
              value={quickFilter}
              onChange={(v) => setQuickFilter(v as "all" | "risk" | "mine")}
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

          <section className="board-bar snap-pane">
            <BoardInsight
              batch={batch}
              queue={queue}
              activeStage={stageFilter}
              chartFilter={chartFilter}
              onOpen={openItem}
              onStage={(key) => setStageFilter((cur) => (cur === key ? null : key))}
              onSubFilter={setChartFilter}
              onNudge={(item, lane) => handleNudge(item, lane)}
            />
          </section>

          <section className="board-flow snap-pane">
            <FlowBoard
              batch={batch}
              stageFilter={stageFilter}
              swimlaneDim={swimlaneDim}
              onSwimlaneDimChange={setSwimlaneDim}
              onFilter={setStageFilter}
              onDropLane={dropLane}
              onOpen={openItem}
              actor={actor}
              hoveredDate={hoveredDate}
              hoveredLaneId={hoveredLaneId}
              setHoveredLaneId={setHoveredLaneId}
              onNudge={(item, lane) => handleNudge(item, lane)}
            />
          </section>

          <section className="board-res snap-pane">
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
          </section>
        </BoardScroll>
      )}

      {/* Batch Action Bar for Resource Table selections */}
      {view === "board" && selectedLaneIds.length > 0 ? (
        <BatchActionBar
          selectedCount={selectedLaneIds.length}
          totalCount={rawBatch.lanes.length}
          onBatchAdvance={handleBatchAdvance}
          onBatchNudge={handleBatchNudge}
          onExportList={handleExportList}
          onGenerateReport={handleGenerateMarkdownReport}
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

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <Tabs
              activeKey={mineTab}
              onChange={(k) => setMineTab(k as "dri" | "confirm")}
              style={{ marginBottom: 0 }}
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
            <Segmented
              size="small"
              value={mineScope}
              onChange={(v) => setMineScope(v as "current" | "all")}
              options={[
                { label: "当前批次", value: "current" },
                { label: "全部批次", value: "all" },
              ]}
            />
          </div>
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
                {rows.map(({ lane, it, batch: targetBatch }, i) => {
                  const light = itemLight(it);
                  const stage = STAGES.find((s) => s.key === it.stage);
                  const isRejected = it.state === "rejected";
                  return (
                    <motion.div key={it.id} {...entrance(i * 0.05, 8)}>
                      <button
                        className={`mine-row${isRejected ? " is-rejected" : ""}`}
                        onClick={() => {
                          if (targetBatch.id !== activeId) setActiveId(targetBatch.id);
                          openItem(it.id);
                        }}
                      >
                        <Flex align="center" gap={8} style={{ minWidth: 0 }}>
                          <Badge status={isRejected || light === "red" ? "error" : light === "yellow" ? "warning" : "default"} />
                          <Tag color="default" style={{ fontSize: 11, margin: 0, padding: "0 5px", flexShrink: 0 }}>
                            {targetBatch.name}
                          </Tag>
                          <Text strong ellipsis={{ tooltip: `${lane.name} · ${stage?.name}` }}>
                            {lane.name}
                          </Text>
                        </Flex>
                        <Tag color="blue">{stage?.short ?? it.stage}</Tag>
                        <Tag color={isRejected ? "error" : undefined}>{stateLabel(it)}</Tag>
                        <Text type={isRejected || light === "red" ? "danger" : light === "yellow" ? "warning" : "secondary"}>
                          {remainLabel(it.dueAt)}
                        </Text>
                        <Flex align="center" gap={6} style={{ minWidth: 0 }}>
                          {avatar(mineTab === "dri" ? it.driId : it.confirmerId, 22)}
                          <Text type="secondary" ellipsis>
                            {PEOPLE[mineTab === "dri" ? it.driId : it.confirmerId].name}
                          </Text>
                        </Flex>
                        <div>
                          {mineTab === "confirm" && canConfirm(it, actor) === null ? (
                            <Button
                              size="small"
                              type="primary"
                              style={{ height: 24, fontSize: 12, padding: "0 8px" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                update(confirmItem(targetBatch, it.id, actor));
                                message.success(`已确认放行【${lane.name}】`);
                              }}
                            >
                              快速通过
                            </Button>
                          ) : mineTab === "dri" && isRejected && canRework(it, actor) === null ? (
                            <Button
                              size="small"
                              type="primary"
                              style={{ height: 24, fontSize: 12, padding: "0 8px" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                update(reworkItem(targetBatch, it.id, actor));
                                message.success(`已开始返工【${lane.name}】`);
                              }}
                            >
                              开始返工
                            </Button>
                          ) : mineTab === "dri" && it.state === "not_started" && canStart(it, actor) === null ? (
                            <Button
                              size="small"
                              style={{ height: 24, fontSize: 12, padding: "0 8px" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                update(startItem(targetBatch, it.id, actor));
                                message.success(`已启动推进【${lane.name}】`);
                              }}
                            >
                              开始
                            </Button>
                          ) : null}
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </Flex>
            );
          })()}
        </div>
      )}

      {view === "resources" && (
        <div className="view-in" style={{ padding: "0 0 24px", height: "calc(100vh - 60px)", overflowY: "auto" }}>
          <ResourceInventoryPage batch={rawBatch} onOpenItem={openItem} onNudge={(item, lane) => handleNudge(item, lane)} />
        </div>
      )}

      {view === "analytics" && (
        <div className="view-in" style={{ padding: "0 0 24px", height: "calc(100vh - 60px)", overflowY: "auto" }}>
          <AnalyticsCockpitPage batch={rawBatch} onOpenItem={openItem} onNudge={(item, lane) => handleNudge(item, lane)} />
        </div>
      )}
            </Suspense>
          </main>
        </div>

      <Suspense fallback={null}>
        <WorkItemModal
          open={open}
          actor={actor}
          rawBatch={rawBatch}
          onClose={closeItem}
          onStartItem={(id) => {
            update(startItem(rawBatch, id, actor));
            modalBallRef.current?.setEmotion("30");
            playSound.click();
            dispatchElfEvent("item_started", { message: "工序已启动推进。" });
          }}
          onSubmitItem={(id) => {
            update(submitItem(rawBatch, id, actor));
            modalBallRef.current?.setEmotion("11");
            playSound.click();
            dispatchElfEvent("item_submitted", { message: "已提交交付物待审。" });
          }}
          onConfirmItem={(id) => {
            const nextBatch = confirmItem(rawBatch, id, actor);
            update(nextBatch);
            modalBallRef.current?.spin(1);
            modalBallRef.current?.burst(24);
            playSound.confirm();
            dispatchElfEvent("item_confirmed", { message: "工序已确认放行！", action: "burst" });
            const allDone = nextBatch.lanes.every((l) => {
              const p = progress(l);
              return p.total > 0 && p.done === p.total;
            });
            if (allDone) {
              setConfettiActive(true);
              playSound.fanfare();
              dispatchElfEvent("milestone_cleared", {
                message: `恭喜！【${nextBatch.name}】全部资产工序已达成通关！`,
                action: "burst",
              });
            }
            closeItem();
          }}
          onRejectItem={(id, reason, category) => {
            update(rejectItem(rawBatch, id, actor, reason, category));
            modalBallRef.current?.setEmotion("23");
            playSound.reject();
            dispatchElfEvent("item_rejected", { message: `已退回主责返修${category ? `（原因分类：${category}）` : ""}。` });
          }}
          onWaiveItem={(id, reason) => {
            const nextBatch = waiveItem(rawBatch, id, actor, reason);
            update(nextBatch);
            modalBallRef.current?.burst(20);
            playSound.confirm();
            message.warning("已执行特批放行，下游已解锁，请关注风险待还项！");
            dispatchElfEvent("item_confirmed", { message: "已执行特批放行，解锁下游！", action: "burst" });
          }}
          onStartRework={(id) => {
            update(reworkItem(rawBatch, id, actor));
            modalBallRef.current?.setEmotion("30");
            playSound.click();
            dispatchElfEvent("item_started", { message: "已重新开始返工。" });
          }}
          onSkipItem={(id) => {
            update(toggleItemSkip(rawBatch, id, actor));
            playSound.click();
          }}
          onUpdateDueDate={(id, newDate) => {
            update(updateItemDueDate(rawBatch, id, newDate, actor));
          }}
          onToggleGate={(gateId) => handleToggleGate(gateId)}
          onPatchEvidence={(id, patch) => update(patchEvidence(rawBatch, id, patch))}
          onSwitchActor={(newActor) => {
            setActor(newActor);
            message.info(`已切换至【${PEOPLE[newActor].name}】身份视角`);
          }}
          onOpenOtherItem={(id) => openItem(id)}
        />

        <ElfCopilotDrawer
          open={copilotOpen}
          onClose={() => setCopilotOpen(false)}
          batch={rawBatch}
          onOpenItem={(id) => openItem(id)}
          onNudge={(item, lane) => handleNudge(item, lane)}
        />

        <ShortcutModal
          open={shortcutOpen}
          onClose={() => setShortcutOpen(false)}
        />

        <ConfettiEffect
          active={confettiActive}
          onComplete={() => setConfettiActive(false)}
        />
      </Suspense>

      <ShiftSimulationModal
        open={launchOpen}
        onClose={() => setLaunchOpen(false)}
        batch={rawBatch}
        actor={actor}
        onApplyShift={(newLaunch) => {
          update(shiftLaunchDate(rawBatch, newLaunch, actor));
          dispatchElfEvent("batch_date_shifted", {
            message: `上线日期已调整为 ${formatDay(newLaunch)}，排期链已完成动态重排。`,
          });
        }}
        onTogglePin={handleTogglePinInBatch}
      />

      <GlobalSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        batch={rawBatch}
        onSelect={(itemId, stageKey) => {
          setView("board");
          if (stageKey) {
            setStageFilter(stageKey);
            window.setTimeout(() => {
              document
                .getElementById(`flow-col-${stageKey}`)
                ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            }, 120);
          }
          openItem(itemId);
        }}
      />

      <ElfCompanion
        batch={rawBatch}
        riskLevel={risk.level}
        riskText={risk.sentence}
        forceHide={Boolean(openId || copilotOpen || launchOpen || searchOpen || shortcutOpen || commandMenuOpen)}
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

      <CommandMenu
        open={commandMenuOpen}
        onClose={() => setCommandMenuOpen(false)}
        batch={rawBatch}
        currentView={view}
        onSelectView={(v) => {
          playSound.click();
          setView(v);
        }}
        onSelectActor={(pId) => {
          setActor(pId);
          dispatchElfEvent("role_switched", {
            message: `已切换至 ${PEOPLE[pId].name}（${PEOPLE[pId].title}）视角。`,
          });
        }}
        onSelectResourceLane={(_laneId, itemId) => {
          if (itemId) openItem(itemId);
        }}
        onOpenShiftModal={handleOpenLaunchModal}
        onOpenCopilot={handleOpenCopilot}
        isMuted={isMuted}
        onToggleMute={() => {
          const next = toggleSoundMuted();
          setIsMuted(next);
          message.info(next ? "已静音操作音效" : "已开启操作音效");
        }}
      />
    </div>
  </ConfigProvider>
  );
}
