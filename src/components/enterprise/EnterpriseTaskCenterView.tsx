import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Kanban,
  List,
  Lock,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Input,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { LaunchBatch, Light, PersonId, ResourceLane, WorkItem } from "../../types";
import { PEOPLE, STAGES } from "../../mock";
import {
  formatDay,
  itemLight,
  remainLabel,
  stateLabel,
} from "../../logic";
import type { NavigationContext } from "./EnterpriseAdminRoot";

interface EnterpriseTaskCenterViewProps {
  batch: LaunchBatch;
  actor: PersonId;
  onOpenItem: (id: string) => void;
  onNudgeItem: (item: WorkItem, lane: ResourceLane) => void;
  onReassignDri: (itemId: string, newDri: PersonId) => void;
  onBatchReassignDri?: (itemIds: string[], newDri: PersonId) => void;
  onExportCsv: () => void;
  navContext?: NavigationContext | null;
  onClearNavContext?: () => void;
}

interface TaskTableRow {
  key: string;
  item: WorkItem;
  lane: ResourceLane;
  laneName: string;
  laneType: string;
  stageKey: string;
  stageName: string;
  driId: PersonId;
  confirmerId: PersonId;
  dueAt: string;
  light: Light;
  state: WorkItem["state"];
  locked: boolean;
}

export const EnterpriseTaskCenterView: React.FC<EnterpriseTaskCenterViewProps> = ({
  batch,
  actor: _actor,
  onOpenItem,
  onNudgeItem,
  onReassignDri,
  onBatchReassignDri,
  onExportCsv,
  navContext,
  onClearNavContext,
}) => {
  const [viewLayout, setViewLayout] = useState<"kanban" | "table">("table");
  const [searchKeyword, setSearchKeyword] = useState(() => navContext?.searchKeyword || "");
  const [stageFilter, setStageFilter] = useState<string>(() => navContext?.stage || "all");
  const [riskFilter, setRiskFilter] = useState<string>(() => navContext?.risk || "all");
  const [driFilter, setDriFilter] = useState<string>(() => (navContext?.dri && navContext.dri !== "all" ? navContext.dri : "all"));
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Sync with incoming navContext changes
  React.useEffect(() => {
    if (navContext) {
      if (navContext.stage) setStageFilter(navContext.stage);
      if (navContext.risk) setRiskFilter(navContext.risk);
      if (navContext.dri && navContext.dri !== "all") setDriFilter(navContext.dri);
      if (navContext.searchKeyword) setSearchKeyword(navContext.searchKeyword);
    }
  }, [navContext]);

  // Flatten all items with lane reference
  const allWorkItems = useMemo(() => {
    const list: { lane: ResourceLane; item: WorkItem }[] = [];
    for (const lane of batch.lanes) {
      for (const item of lane.items) {
        if (!item.skipped) {
          list.push({ lane, item });
        }
      }
    }
    return list;
  }, [batch.lanes]);

  // Filter items
  const filteredItems = useMemo(() => {
    return allWorkItems.filter(({ lane, item }) => {
      if (stageFilter !== "all" && item.stage !== stageFilter) return false;
      if (driFilter !== "all" && item.driId !== driFilter) return false;

      const light = itemLight(item);
      if (riskFilter === "red" && light !== "red") return false;
      if (riskFilter === "yellow" && light !== "yellow") return false;
      if (riskFilter === "locked" && !item.locked) return false;
      if (riskFilter === "confirmed" && item.state !== "confirmed") return false;

      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const driName = PEOPLE[item.driId]?.name ?? item.driId;
        const confirmerName = PEOPLE[item.confirmerId]?.name ?? item.confirmerId;
        const match =
          lane.name.toLowerCase().includes(q) ||
          item.stage.toLowerCase().includes(q) ||
          driName.toLowerCase().includes(q) ||
          confirmerName.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [allWorkItems, stageFilter, driFilter, riskFilter, searchKeyword]);

  // Summary Metrics
  const totalTasks = allWorkItems.length;
  const inProgressTasks = allWorkItems.filter((x) => x.item.state === "in_progress" || x.item.state === "rework").length;
  const submittedTasks = allWorkItems.filter((x) => x.item.state === "submitted").length;
  const redTasks = allWorkItems.filter((x) => itemLight(x.item) === "red").length;
  const lockedTasks = allWorkItems.filter((x) => x.item.locked).length;
  const confirmedTasks = allWorkItems.filter((x) => x.item.state === "confirmed").length;

  // Table Data mapping
  const tableData = useMemo<TaskTableRow[]>(() => {
    return filteredItems.map(({ lane, item }) => {
      const stageObj = STAGES.find((s) => s.key === item.stage);
      return {
        key: item.id,
        item,
        lane,
        laneName: lane.name,
        laneType: lane.type,
        stageKey: item.stage,
        stageName: stageObj?.name ?? item.stage,
        driId: item.driId,
        confirmerId: item.confirmerId,
        dueAt: item.dueAt,
        light: itemLight(item),
        state: item.state,
        locked: Boolean(item.locked),
      };
    });
  }, [filteredItems]);

  // Batch Nudge Selected
  const handleBatchNudgeSelected = () => {
    if (selectedItemIds.length === 0) {
      message.warning("请先勾选需要催办的任务");
      return;
    }
    const selected = allWorkItems.filter((x) => selectedItemIds.includes(x.item.id));
    const lines = [
      `【ElfShip · 交付任务管理督办通报】`,
      `· 批次：${batch.name}（上线日 ${formatDay(batch.launchDate)}）`,
      `· 督办任务明细（共 ${selected.length} 项）：`,
      ...selected.map((x, i) => {
        const dri = PEOPLE[x.item.driId]?.name ?? x.item.driId;
        const st = STAGES.find((s) => s.key === x.item.stage)?.name ?? x.item.stage;
        return `  ${i + 1}. ${x.lane.name} - ${st} @${dri} 截止 ${formatDay(x.item.dueAt)} (${stateLabel(x.item)})`;
      }),
    ].join("\n");

    try {
      navigator.clipboard.writeText(lines);
      message.success(`已复制 ${selected.length} 项任务的督办通报至剪贴板！`);
    } catch {
      message.info("已生成督办通报");
    }
  };

  // Ant Design Table Columns with Clear Visual Weighting
  const tableColumns: ColumnsType<TaskTableRow> = [
    {
      title: "资产名称与类别",
      key: "asset",
      width: 220,
      render: (_, record) => {
        const isRed = record.light === "red";
        return (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {isRed && (
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--ent-rose)",
                    boxShadow: "0 0 6px var(--ent-rose)",
                    flexShrink: 0,
                  }}
                  title="P0 严重逾期"
                />
              )}
              {record.locked && (
                <Lock size={12} style={{ color: "var(--ent-purple)", flexShrink: 0 }} />
              )}
              <span style={{ fontWeight: 700, color: "var(--ent-text-primary)", fontSize: 13 }}>
                {record.laneName}
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--ent-text-muted)", marginTop: 2 }}>
              {record.laneType}
            </div>
          </div>
        );
      },
    },
    {
      title: "工序阶段",
      key: "stage",
      width: 130,
      filters: STAGES.map((s) => ({ text: s.name, value: s.key })),
      onFilter: (value, record) => record.stageKey === value,
      render: (_, record) => (
        <Tag style={{ margin: 0, fontWeight: 500, borderColor: "var(--ent-border-strong)", background: "var(--ent-primary-dim)", color: "var(--ent-primary-hover)" }}>
          {record.stageName}
        </Tag>
      ),
    },
    {
      title: "工序状态",
      key: "state",
      width: 140,
      render: (_, record) => {
        if (record.locked) {
          return (
            <Tag icon={<Lock size={11} style={{ marginRight: 3 }} />} color="error">
              门禁锁死
            </Tag>
          );
        }
        if (record.state === "confirmed") {
          return <Tag color="success">已通关放行</Tag>;
        }
        if (record.state === "submitted") {
          return <Tag color="warning">待审核验收</Tag>;
        }
        if (record.state === "in_progress" || record.state === "rework") {
          return <Tag color="processing">制作推进中</Tag>;
        }
        return <Tag color="default">未开始</Tag>;
      },
    },
    {
      title: "主责人 (可即时调度)",
      key: "dri",
      width: 165,
      render: (_, record) => {
        const dri = PEOPLE[record.driId];
        if (record.state === "confirmed") {
          return (
            <Space orientation="horizontal" size={6}>
              <Avatar
                size={20}
                style={{
                  backgroundColor: `hsl(${dri?.hue ?? 200}, 70%, 35%)`,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {dri?.initials ?? "?"}
              </Avatar>
              <span style={{ fontSize: 12, color: "var(--ent-text-muted)" }}>
                @{dri?.name ?? record.driId}
              </span>
            </Space>
          );
        }

        return (
          <Select
            value={record.driId}
            size="small"
            style={{ width: 145 }}
            onChange={(newDri) => {
              onReassignDri(record.item.id, newDri);
              message.success(`已将【${record.laneName}】主责改派至 @${PEOPLE[newDri]?.name}`);
            }}
            options={Object.values(PEOPLE).map((p) => ({
              label: `@${p.name} (${p.title.slice(0, 4)})`,
              value: p.id,
            }))}
          />
        );
      },
    },
    {
      title: "确认把关人",
      key: "confirmer",
      width: 120,
      render: (_, record) => {
        const conf = PEOPLE[record.confirmerId];
        return (
          <span style={{ fontSize: 12, color: "var(--ent-text-muted)" }}>
            @{conf?.name ?? record.confirmerId}
          </span>
        );
      },
    },
    {
      title: "截止日期",
      dataIndex: "dueAt",
      key: "dueAt",
      width: 120,
      sorter: (a, b) => a.dueAt.localeCompare(b.dueAt),
      render: (dueAt: string) => (
        <span style={{ fontFamily: "var(--ent-font-mono)", fontSize: 12 }}>
          {formatDay(dueAt)}
        </span>
      ),
    },
    {
      title: "工期态势",
      key: "light",
      width: 140,
      render: (_, record) => {
        const statusMap: Record<Light, "error" | "warning" | "success" | "default"> = {
          red: "error",
          yellow: "warning",
          ok: "success",
          none: "default",
        };

        return (
          <Badge
            status={statusMap[record.light]}
            text={
              <span
                style={{
                  fontFamily: "var(--ent-font-mono)",
                  fontSize: 12,
                  color:
                    record.light === "red"
                      ? "var(--ent-rose)"
                      : record.light === "yellow"
                      ? "var(--ent-amber)"
                      : "var(--ent-emerald)",
                }}
              >
                {remainLabel(record.dueAt)}
              </span>
            }
          />
        );
      },
    },
    {
      title: "操作",
      key: "action",
      width: 130,
      align: "center",
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="进入工序交付与门禁把关弹窗">
            <Button
              type="link"
              size="small"
              icon={<ExternalLink size={12} />}
              onClick={() => onOpenItem(record.item.id)}
              style={{ padding: "0 4px", fontSize: 12, color: "var(--ent-primary-hover)" }}
            >
              详情
            </Button>
          </Tooltip>

          {record.state !== "confirmed" && (
            <Tooltip title={record.light === "red" ? "严重逾期！发起紧急催办通报" : "定向催办该主责"}>
              <Button
                type={record.light === "red" ? "primary" : "text"}
                danger={record.light === "red"}
                size="small"
                onClick={() => onNudgeItem(record.item, record.lane)}
                style={{
                  padding: "0 6px",
                  fontSize: 11,
                  height: 24,
                  color: record.light === "red" ? "#fff" : "var(--ent-amber)",
                }}
              >
                催办
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // Kanban Columns Definition
  const kanbanColumns = [
    {
      key: "not_started",
      title: "待启动 (Not Started)",
      filter: (it: WorkItem) => it.state === "not_started" && !it.locked,
      badgeColor: "var(--ent-text-muted)",
    },
    {
      key: "in_progress",
      title: "推进制作中 (In Progress)",
      filter: (it: WorkItem) => (it.state === "in_progress" || it.state === "rework") && !it.locked,
      badgeColor: "var(--ent-primary-hover)",
    },
    {
      key: "submitted",
      title: "待审核验收 (Submitted)",
      filter: (it: WorkItem) => it.state === "submitted" && !it.locked,
      badgeColor: "var(--ent-amber)",
    },
    {
      key: "locked",
      title: "门禁加锁 / 阻断 (Locked)",
      filter: (it: WorkItem) => Boolean(it.locked),
      badgeColor: "var(--ent-rose)",
    },
    {
      key: "confirmed",
      title: "已通关放行 (Confirmed)",
      filter: (it: WorkItem) => it.state === "confirmed",
      badgeColor: "var(--ent-emerald)",
    },
  ];

  return (
    <div className="ent-task-center-view">
      {/* 1. Top Prioritized KPI Architecture (Hero Risk Anchor + Operational Pods) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: 14, marginBottom: 16 }}>
        {/* Primary Risk & Blocker Focus Card (Hero) */}
        <div
          className="ent-card-shell"
          style={{ cursor: "pointer" }}
          onClick={() => setRiskFilter(riskFilter === "red" ? "all" : "red")}
          role="button"
          tabIndex={0}
          aria-label="筛选逾期风险工序"
        >
          <div
            className="ent-card-inner"
            style={{
              borderLeft: "4px solid var(--ent-rose)",
              background: riskFilter === "red" ? "var(--ent-rose-dim)" : "var(--ent-bg-card)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ent-rose)" }}>
                  <ShieldAlert size={15} />
                  <span>核心风险拦截 (Critical Attention)</span>
                </div>
                <Tag color="error" style={{ margin: 0, fontSize: 10, borderRadius: 4 }}>
                  {riskFilter === "red" ? "已激活筛选" : "点击快速过滤"}
                </Tag>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "4px 0" }}>
                <span style={{ fontFamily: "var(--ent-font-mono)", fontSize: 32, fontWeight: 850, color: "var(--ent-rose)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {redTasks}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ent-text-secondary)" }}>
                  项严重超期 · {lockedTasks} 项门禁加锁
                </span>
              </div>
            </div>

            <div style={{ fontSize: 11, color: "var(--ent-rose)", display: "flex", alignItems: "center", gap: 6, marginTop: 8, paddingTop: 6, borderTop: "1px solid var(--ent-border-subtle)" }}>
              <Lock size={12} />
              <span>下游多个工序因前置逾期受阻，需重点催办调度</span>
            </div>
          </div>
        </div>

        {/* Secondary Operational Status 3-Pod Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {/* Pod 1: In Progress */}
          <Card
            size="small"
            style={{
              background: "var(--ent-bg-card)",
              borderColor: "var(--ent-border-subtle)",
              cursor: "pointer",
            }}
            onClick={() => setRiskFilter("all")}
          >
            <Statistic
              title={<span style={{ color: "var(--ent-text-secondary)", fontSize: 12 }}>制作推进中 (WIP)</span>}
              value={inProgressTasks}
              suffix={<span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>项在制</span>}
              valueStyle={{ color: "var(--ent-primary-hover)", fontWeight: 700, fontSize: 20, fontFamily: "var(--ent-font-mono)" }}
              prefix={<Zap size={16} style={{ color: "var(--ent-primary-hover)", marginRight: 4 }} />}
            />
            <div style={{ marginTop: 4, fontSize: 11, color: "var(--ent-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <span>一线责任人全速生产</span>
            </div>
          </Card>

          {/* Pod 2: Submitted for Gate Approval */}
          <Card
            size="small"
            style={{
              background: "var(--ent-bg-card)",
              borderColor: "var(--ent-border-subtle)",
              cursor: "pointer",
            }}
            onClick={() => setStageFilter(stageFilter === "accept" ? "all" : "accept")}
          >
            <Statistic
              title={<span style={{ color: "var(--ent-text-secondary)", fontSize: 12 }}>待审核 / 质检验收</span>}
              value={submittedTasks}
              suffix={<span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>项待验</span>}
              valueStyle={{ color: "var(--ent-amber)", fontWeight: 700, fontSize: 20, fontFamily: "var(--ent-font-mono)" }}
              prefix={<ShieldCheck size={16} style={{ color: "var(--ent-amber)", marginRight: 4 }} />}
            />
            <div style={{ marginTop: 4, fontSize: 11, color: "var(--ent-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <span>门禁把关人审核流转中</span>
            </div>
          </Card>

          {/* Pod 3: Confirmed Released */}
          <Card
            size="small"
            style={{
              background: "var(--ent-bg-card)",
              borderColor: "var(--ent-border-subtle)",
              cursor: "pointer",
            }}
            onClick={() => setRiskFilter(riskFilter === "confirmed" ? "all" : "confirmed")}
          >
            <Statistic
              title={<span style={{ color: "var(--ent-text-secondary)", fontSize: 12 }}>已通关放行入库</span>}
              value={confirmedTasks}
              suffix={<span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>/ {totalTasks} 项</span>}
              valueStyle={{ color: "var(--ent-emerald)", fontWeight: 700, fontSize: 20, fontFamily: "var(--ent-font-mono)" }}
              prefix={<CheckCircle2 size={16} style={{ color: "var(--ent-emerald)", marginRight: 4 }} />}
            />
            <div style={{ marginTop: 4, fontSize: 11, color: "var(--ent-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ color: "var(--ent-emerald)" }}>达标入库率 {Math.round((confirmedTasks / (totalTasks || 1)) * 100)}%</span>
            </div>
          </Card>
        </div>
      </div>

      {/* 2. Controls & Standardized Filter Bar */}
      <Card
        size="small"
        style={{
          background: "var(--ent-bg-card)",
          borderColor: "var(--ent-border-subtle)",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          {/* Left: Standard Filters */}
          <Space size={10} wrap>
            <Input
              placeholder="快速定位任务、资产、工序或主责人..."
              prefix={<Search size={14} style={{ color: "var(--ent-text-muted)" }} />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
              style={{ width: 240 }}
            />

            <Select
              value={stageFilter}
              onChange={setStageFilter}
              style={{ width: 130 }}
              options={[
                { label: "全部工序", value: "all" },
                ...STAGES.map((s) => ({ label: s.name, value: s.key })),
              ]}
            />

            <Select
              value={riskFilter}
              onChange={setRiskFilter}
              style={{ width: 130 }}
              options={[
                { label: "全部状态", value: "all" },
                { label: "严重逾期", value: "red" },
                { label: "临期关注", value: "yellow" },
                { label: "级联加锁", value: "locked" },
                { label: "已通关", value: "confirmed" },
              ]}
            />

            <Select
              value={driFilter}
              onChange={setDriFilter}
              style={{ width: 135 }}
              options={[
                { label: "全部主责人", value: "all" },
                ...Object.values(PEOPLE).map((p) => ({ label: `@${p.name}`, value: p.id })),
              ]}
            />
          </Space>

          {/* Right: Layout Switcher & Actions */}
          <Space size={10} wrap>
            {selectedItemIds.length > 0 && (
              <>
                <Badge count={selectedItemIds.length} style={{ backgroundColor: "var(--ent-primary)", color: "#fff" }} />
                <Button
                  type="primary"
                  size="small"
                  icon={<Send size={13} />}
                  onClick={handleBatchNudgeSelected}
                >
                  批量督办广播
                </Button>
                <Select
                  placeholder="批量改派主责..."
                  size="small"
                  style={{ width: 140 }}
                  onChange={(newDri) => {
                    if (onBatchReassignDri) {
                      onBatchReassignDri(selectedItemIds, newDri);
                    } else {
                      selectedItemIds.forEach((id) => onReassignDri(id, newDri));
                    }
                    setSelectedItemIds([]);
                  }}
                  options={Object.values(PEOPLE).map((p) => ({
                    label: `@${p.name}`,
                    value: p.id,
                  }))}
                />
              </>
            )}

            {/* Standard Ant Design Segmented Layout Switcher */}
            <Segmented
              size="small"
              value={viewLayout}
              onChange={(val) => setViewLayout(val as "kanban" | "table")}
              options={[
                {
                  label: "列表台账",
                  value: "table",
                  icon: <List size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />,
                },
                {
                  label: "状态泳道",
                  value: "kanban",
                  icon: <Kanban size={13} style={{ marginRight: 4, verticalAlign: "middle" }} />,
                },
              ]}
              style={{ background: "var(--ent-bg-surface)", border: "1px solid var(--ent-border-subtle)" }}
            />

            <Button
              size="small"
              icon={<Download size={13} />}
              onClick={onExportCsv}
            >
              导出 CSV
            </Button>
          </Space>
        </div>

        {/* Active Filter Indicators */}
        {(stageFilter !== "all" || riskFilter !== "all" || driFilter !== "all" || searchKeyword.trim()) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--ent-border-subtle)", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>当前生效过滤条件：</span>
            {stageFilter !== "all" && (
              <Tag closable onClose={() => setStageFilter("all")} color="blue" style={{ margin: 0, fontSize: 11 }}>
                工序: {STAGES.find((s) => s.key === stageFilter)?.name ?? stageFilter}
              </Tag>
            )}
            {riskFilter !== "all" && (
              <Tag closable onClose={() => setRiskFilter("all")} color="orange" style={{ margin: 0, fontSize: 11 }}>
                状态: {riskFilter === "red" ? "严重逾期" : riskFilter === "yellow" ? "临期关注" : riskFilter === "locked" ? "级联加锁" : "已通关"}
              </Tag>
            )}
            {driFilter !== "all" && (
              <Tag closable onClose={() => setDriFilter("all")} color="cyan" style={{ margin: 0, fontSize: 11 }}>
                主责: @{PEOPLE[driFilter as PersonId]?.name ?? driFilter}
              </Tag>
            )}
            {searchKeyword.trim() && (
              <Tag closable onClose={() => setSearchKeyword("")} color="default" style={{ margin: 0, fontSize: 11 }}>
                搜索: {searchKeyword}
              </Tag>
            )}
            <Button
              type="link"
              size="small"
              style={{ fontSize: 11, padding: 0 }}
              onClick={() => {
                setStageFilter("all");
                setRiskFilter("all");
                setDriFilter("all");
                setSearchKeyword("");
                onClearNavContext?.();
              }}
            >
              重置全部过滤
            </Button>
          </div>
        )}
      </Card>

      {/* 3. Main View Render: Standardized Ant Design Table or Kanban */}
      {viewLayout === "table" ? (
        <Card
          size="small"
          style={{ background: "var(--ent-bg-card)", borderColor: "var(--ent-border-subtle)" }}
          styles={{ body: { padding: 0 } }}
        >
          <Table<TaskTableRow>
            rowKey="key"
            columns={tableColumns}
            dataSource={tableData}
            size="middle"
            rowSelection={{
              selectedRowKeys: selectedItemIds,
              onChange: (keys) => setSelectedItemIds(keys as string[]),
            }}
            onRow={(record) => ({
              onDoubleClick: () => onOpenItem(record.item.id),
              style: { cursor: "pointer" },
              title: "双击打开工序交付详情",
            })}
            pagination={{
              pageSize: 12,
              showSizeChanger: true,
              pageSizeOptions: ["12", "20", "50"],
              showTotal: (total) => (
                <span style={{ fontSize: 12, color: "var(--ent-text-muted)" }}>
                  共计 {total} 项交付工序
                </span>
              ),
            }}
            scroll={{ x: 1080 }}
          />
        </Card>
      ) : (
        /* Kanban Layout across columns with standard Cards */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
          {kanbanColumns.map((col) => {
            const colItems = filteredItems.filter((x) => col.filter(x.item));

            return (
              <Card
                key={col.key}
                size="small"
                style={{
                  background: "var(--ent-bg-deep)",
                  borderColor: "var(--ent-border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                }}
                styles={{
                  header: {
                    borderBottom: "1px solid var(--ent-border-subtle)",
                    padding: "8px 12px",
                  },
                  body: {
                    padding: 10,
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    maxHeight: 700,
                    overflowY: "auto",
                  },
                }}
                title={
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.badgeColor }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ent-text-primary)" }}>
                        {col.title}
                      </span>
                    </div>
                    <Badge count={colItems.length} style={{ backgroundColor: "rgba(0, 0, 0, 0.08)", color: "var(--ent-text-primary)" }} />
                  </div>
                }
              >
                {colItems.length === 0 ? (
                  <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ent-text-muted)", fontSize: 11 }}>
                    暂无该状态工序
                  </div>
                ) : (
                  colItems.map(({ lane, item }) => {
                    const light = itemLight(item);
                    const isRed = light === "red";
                    const isYellow = light === "yellow";
                    const stageObj = STAGES.find((s) => s.key === item.stage);
                    const dri = PEOPLE[item.driId];

                    return (
                      <Card
                        key={item.id}
                        size="small"
                        style={{
                          background: "var(--ent-bg-card)",
                          borderColor: isRed
                            ? "rgba(239, 68, 68, 0.4)"
                            : isYellow
                            ? "rgba(245, 158, 11, 0.4)"
                            : "var(--ent-border-subtle)",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                        }}
                        styles={{ body: { padding: "10px 12px" } }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ent-text-primary)" }}>
                              {lane.name}
                            </div>
                            <Space size={6} style={{ marginTop: 4 }}>
                              <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>
                                {stageObj?.name ?? item.stage}
                              </Tag>
                              {item.locked && (
                                <Tag color="error" style={{ margin: 0, fontSize: 10 }}>
                                  <Lock size={10} style={{ marginRight: 2 }} /> 锁死
                                </Tag>
                              )}
                            </Space>
                          </div>

                          <Tooltip title="查看交付工序详情与门禁">
                            <Button
                              type="text"
                              size="small"
                              icon={<ExternalLink size={12} />}
                              onClick={() => onOpenItem(item.id)}
                              style={{ color: "var(--ent-primary-hover)" }}
                            />
                          </Tooltip>
                        </div>

                        {/* DRI & Due Date */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: 11,
                            marginTop: 10,
                            color: "var(--ent-text-muted)",
                          }}
                        >
                          <Space size={6}>
                            <Avatar
                              size={18}
                              style={{
                                backgroundColor: `hsl(${dri?.hue ?? 200}, 70%, 35%)`,
                                fontSize: 9,
                                fontWeight: 700,
                              }}
                            >
                              {dri?.initials ?? "?"}
                            </Avatar>
                            <span style={{ color: "var(--ent-text-primary)" }}>@{dri?.name ?? item.driId}</span>
                          </Space>

                          <span
                            style={{
                              fontFamily: "var(--ent-font-mono)",
                              color: isRed
                                ? "var(--ent-rose)"
                                : isYellow
                                ? "var(--ent-amber)"
                                : "var(--ent-text-muted)",
                            }}
                          >
                            {remainLabel(item.dueAt)}
                          </span>
                        </div>

                        {/* Bottom Actions: Reassign DRI & Nudge */}
                        {item.state !== "confirmed" && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              paddingTop: 8,
                              marginTop: 8,
                              borderTop: "1px solid var(--ent-border-subtle)",
                            }}
                          >
                            <Select
                              value={item.driId}
                              onChange={(newDri) => {
                                onReassignDri(item.id, newDri);
                                message.success(`已改派给 @${PEOPLE[newDri]?.name}`);
                              }}
                              size="small"
                              style={{ width: 110, fontSize: 11 }}
                              options={Object.values(PEOPLE).map((p) => ({
                                label: `@${p.name}`,
                                value: p.id,
                              }))}
                            />

                            <Button
                              type="text"
                              size="small"
                              onClick={() => onNudgeItem(item, lane)}
                              style={{ color: "var(--ent-amber)", fontSize: 11, padding: "0 4px" }}
                            >
                              催办
                            </Button>
                          </div>
                        )}
                      </Card>
                    );
                  })
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
