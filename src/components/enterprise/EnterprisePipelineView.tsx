import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  Search,
  ShieldAlert,
} from "lucide-react";
import { Card, Input, Select, Space, Table, Tag, Tooltip, Button } from "antd";
import { ExternalLink } from "lucide-react";
import type { ColumnsType } from "antd/es/table";
import type { LaunchBatch, PersonId, ResourceLane } from "../../types";
import { PEOPLE, STAGES } from "../../mock";
import {
  formatDay,
  getAssetCategory,
  itemLight,
  progress,
  remainLabel,
  stateLabel,
} from "../../logic";
import type { EnterpriseTab, NavigationContext } from "./EnterpriseAdminRoot";

interface EnterprisePipelineViewProps {
  batch: LaunchBatch;
  actor: PersonId;
  onOpenItem: (id: string) => void;
  navContext?: NavigationContext | null;
  onClearNavContext?: () => void;
  onNavigateToTab?: (tab: EnterpriseTab, context?: NavigationContext) => void;
}

export const EnterprisePipelineView: React.FC<EnterprisePipelineViewProps> = ({
  batch,
  actor,
  onOpenItem,
  navContext,
  onClearNavContext,
  onNavigateToTab,
}) => {
  const [searchKeyword, setSearchKeyword] = useState(() => navContext?.searchKeyword || "");
  const [selectedCategory, setSelectedCategory] = useState<string>(() => navContext?.assetCategory || "all");
  const [riskFilter, setRiskFilter] = useState<"all" | "red" | "yellow" | "locked" | "mine">(() => {
    if (navContext?.risk === "red" || navContext?.risk === "yellow" || navContext?.risk === "locked") {
      return navContext.risk;
    }
    return "all";
  });
  const [highlightStage, setHighlightStage] = useState<string | null>(() => navContext?.stage || null);

  // Sync with incoming navContext
  React.useEffect(() => {
    if (navContext) {
      if (navContext.stage) setHighlightStage(navContext.stage);
      if (navContext.assetCategory) setSelectedCategory(navContext.assetCategory);
      if (navContext.risk === "red" || navContext.risk === "yellow" || navContext.risk === "locked") {
        setRiskFilter(navContext.risk);
      }
      if (navContext.searchKeyword) setSearchKeyword(navContext.searchKeyword);
    }
  }, [navContext]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    batch.lanes.forEach((l) => set.add(getAssetCategory(l.type)));
    return Array.from(set);
  }, [batch.lanes]);

  // Filtered Lanes
  const filteredLanes = useMemo(() => {
    return batch.lanes.filter((lane) => {
      // Keyword
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const matchName = lane.name.toLowerCase().includes(q);
        const matchType = lane.type.toLowerCase().includes(q);
        const matchDri = lane.items.some((it) => {
          const p = PEOPLE[it.driId];
          return p && p.name.toLowerCase().includes(q);
        });
        if (!matchName && !matchType && !matchDri) return false;
      }

      // Category
      if (selectedCategory !== "all") {
        if (getAssetCategory(lane.type) !== selectedCategory) return false;
      }

      // Risk filter
      if (riskFilter === "red") {
        return lane.items.some((it) => !it.skipped && itemLight(it) === "red");
      }
      if (riskFilter === "yellow") {
        return lane.items.some((it) => !it.skipped && itemLight(it) === "yellow");
      }
      if (riskFilter === "locked") {
        return lane.items.some((it) => it.locked);
      }
      if (riskFilter === "mine") {
        return lane.items.some((it) => !it.skipped && (it.driId === actor || it.confirmerId === actor));
      }

      return true;
    });
  }, [batch.lanes, searchKeyword, selectedCategory, riskFilter, actor]);

  // Standardized Ant Design Table Columns for 7 Stages
  const columns: ColumnsType<ResourceLane> = [
    {
      title: "入库资源泳道",
      key: "asset",
      width: 220,
      fixed: "left",
      render: (_, lane) => {
        const p = progress(lane);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ent-text-primary)" }}>
              {lane.name}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ent-text-muted)" }}>
              <span>{lane.type}</span>
              <span>·</span>
              <Tag style={{ margin: 0, fontSize: 10, borderColor: "var(--ent-border-strong)", background: "var(--ent-primary-dim)", color: "var(--ent-primary-hover)" }}>
                {p.done}/{p.total} 节点
              </Tag>
            </div>
          </div>
        );
      },
    },
    ...STAGES.map((st, idx) => {
      const isHighlighted = st.key === highlightStage;
      return {
        title: (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 10, color: "var(--ent-primary-hover)", fontFamily: "var(--ent-font-mono)", fontWeight: 700 }}>
                0{idx + 1}
              </span>
              <span style={{ fontWeight: isHighlighted ? 750 : 600, color: isHighlighted ? "var(--ent-primary-hover)" : undefined }}>
                {st.name}
              </span>
              {isHighlighted && (
                <Tag color="blue" style={{ margin: 0, fontSize: 9, padding: "0 4px", lineHeight: "14px" }}>
                  焦点
                </Tag>
              )}
            </div>
            {onNavigateToTab && (
              <Tooltip title={`前往任务中心筛选【${st.name}】工序清单`}>
                <Button
                  type="text"
                  size="small"
                  icon={<ExternalLink size={11} />}
                  style={{ padding: 0, height: 20, width: 20, color: "var(--ent-text-muted)" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToTab("tasks", { stage: st.key });
                  }}
                />
              </Tooltip>
            )}
          </div>
        ),
        key: st.key,
        width: 160,
        onCell: () => ({
          style: isHighlighted
            ? {
                backgroundColor: "rgba(37, 99, 235, 0.03)",
                borderLeft: "1px dashed rgba(37, 99, 235, 0.3)",
                borderRight: "1px dashed rgba(37, 99, 235, 0.3)",
              }
            : {},
        }),
        render: (_: unknown, lane: ResourceLane) => {
        const item = lane.items.find((x) => x.stage === st.key);
        if (!item) return <span style={{ color: "var(--ent-text-muted)", fontSize: 11 }}>-</span>;
        if (item.skipped) {
          return (
            <div
              style={{ opacity: 0.45, cursor: "pointer" }}
              onClick={() => onOpenItem(item.id)}
            >
              <Tag style={{ margin: 0, fontSize: 10 }}>已跳过 (免审)</Tag>
            </div>
          );
        }

        const light = itemLight(item);
        const isRed = light === "red";
        const isYellow = light === "yellow";
        const isConfirmed = item.state === "confirmed";
        const dri = PEOPLE[item.driId]?.name ?? item.driId;

        let tagColor: "error" | "warning" | "success" | "processing" | "default" = "default";
        let icon = null;
        if (item.locked) {
          tagColor = "error";
          icon = <Lock size={10} style={{ marginRight: 3 }} />;
        } else if (isConfirmed) {
          tagColor = "success";
          icon = <CheckCircle2 size={10} style={{ marginRight: 3 }} />;
        } else if (isRed) {
          tagColor = "error";
          icon = <ShieldAlert size={10} style={{ marginRight: 3 }} />;
        } else if (isYellow) {
          tagColor = "warning";
          icon = <AlertTriangle size={10} style={{ marginRight: 3 }} />;
        } else {
          tagColor = "processing";
        }

        return (
          <Tooltip
            title={
              <div>
                <div style={{ fontWeight: 600 }}>{lane.name} - {st.name}</div>
                <div>状态: {stateLabel(item)} · 主责: @{dri}</div>
                <div>截止: {formatDay(item.dueAt)} ({remainLabel(item.dueAt)})</div>
                {item.locked && <div style={{ color: "#ef4444", marginTop: 4 }}>[安灯加锁] 上游异常阻断，下游被级联锁定</div>}
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>点击打开工序交付卡片</div>
              </div>
            }
          >
            <div
              onClick={() => onOpenItem(item.id)}
              role="button"
              tabIndex={0}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                padding: "6px 8px",
                borderRadius: 6,
                background: "var(--ent-bg-surface)",
                border: isRed ? "1px solid rgba(239, 68, 68, 0.4)" : isYellow ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid var(--ent-border-subtle)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Tag color={tagColor} icon={icon} style={{ margin: 0, fontSize: 10, padding: "0 4px" }}>
                  {item.locked ? "锁死" : stateLabel(item)}
                </Tag>
                <span style={{ fontSize: 10, color: "var(--ent-text-secondary)" }}>
                  @{dri}
                </span>
              </div>
              <span style={{ fontSize: 10, color: "var(--ent-text-muted)", fontFamily: "var(--ent-font-mono)", textAlign: "right" }}>
                {remainLabel(item.dueAt)}
              </span>
            </div>
          </Tooltip>
        );
      },
    };
  }),
  ];

  // Pipeline summary stats
  const pipelineStats = useMemo(() => {
    let blockedCount = 0;
    let redCount = 0;
    let doneCount = 0;
    for (const l of batch.lanes) {
      const isBlocked = l.items.some((it) => it.locked);
      const isRed = l.items.some((it) => !it.skipped && itemLight(it) === "red");
      const p = progress(l);
      if (isBlocked) blockedCount++;
      if (isRed) redCount++;
      if (p.total > 0 && p.done === p.total) doneCount++;
    }
    return {
      blockedCount,
      redCount,
      doneCount,
      inProgressCount: batch.lanes.length - doneCount,
    };
  }, [batch.lanes]);

  return (
    <div className="ent-pipeline-view">
      {/* Top Pipeline Health & Routing Banner (Primary Blocker Anchor) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div
          className="ent-card-shell"
          style={{ cursor: "pointer" }}
          onClick={() => setRiskFilter(riskFilter === "locked" ? "all" : "locked")}
          role="button"
          tabIndex={0}
        >
          <div
            className="ent-card-inner"
            style={{
              borderLeft: "3px solid var(--ent-purple)",
              padding: "10px 14px",
              background: riskFilter === "locked" ? "var(--ent-purple-dim)" : undefined,
            }}
          >
            <div style={{ fontSize: 11, color: "var(--ent-purple)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <Lock size={12} /> 门禁级联加锁 (主阻断)
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 3 }}>
              <span style={{ fontFamily: "var(--ent-font-mono)", fontSize: 22, fontWeight: 800, color: "var(--ent-purple)" }}>
                {pipelineStats.blockedCount}
              </span>
              <span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>条泳道受阻中断</span>
            </div>
          </div>
        </div>

        <div
          className="ent-card-shell"
          style={{ cursor: "pointer" }}
          onClick={() => setRiskFilter(riskFilter === "red" ? "all" : "red")}
          role="button"
          tabIndex={0}
        >
          <div
            className="ent-card-inner"
            style={{
              borderLeft: "3px solid var(--ent-rose)",
              padding: "10px 14px",
              background: riskFilter === "red" ? "var(--ent-rose-dim)" : undefined,
            }}
          >
            <div style={{ fontSize: 11, color: "var(--ent-rose)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <ShieldAlert size={12} /> 逾期告警泳道
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 3 }}>
              <span style={{ fontFamily: "var(--ent-font-mono)", fontSize: 22, fontWeight: 800, color: "var(--ent-rose)" }}>
                {pipelineStats.redCount}
              </span>
              <span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>条存超期节点</span>
            </div>
          </div>
        </div>

        <div
          className="ent-card-shell"
          style={{ cursor: "pointer" }}
          onClick={() => setRiskFilter("all")}
          role="button"
          tabIndex={0}
        >
          <div className="ent-card-inner" style={{ borderLeft: "3px solid var(--ent-primary-hover)", padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--ent-text-secondary)", fontWeight: 600 }}>
              流转在制泳道
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 3 }}>
              <span style={{ fontFamily: "var(--ent-font-mono)", fontSize: 22, fontWeight: 800, color: "var(--ent-primary-hover)" }}>
                {pipelineStats.inProgressCount}
              </span>
              <span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>条执行中</span>
            </div>
          </div>
        </div>

        <div className="ent-card-shell">
          <div className="ent-card-inner" style={{ borderLeft: "3px solid var(--ent-emerald)", padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: "var(--ent-emerald)", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
              <CheckCircle2 size={12} /> 全线通关入库
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 3 }}>
              <span style={{ fontFamily: "var(--ent-font-mono)", fontSize: 22, fontWeight: 800, color: "var(--ent-emerald)" }}>
                {pipelineStats.doneCount}
              </span>
              <span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>条全部封板</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card
        size="small"
        style={{
          background: "var(--ent-bg-card)",
          borderColor: "var(--ent-border-subtle)",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <Space size={12} wrap>
            <Input
              placeholder="搜索资产名称、类型或主责人..."
              prefix={<Search size={14} style={{ color: "var(--ent-text-muted)" }} />}
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              allowClear
              style={{ width: 280 }}
            />

            <Select
              value={selectedCategory}
              onChange={setSelectedCategory}
              style={{ width: 140 }}
              options={[
                { label: "全部分类", value: "all" },
                ...categories.map((c) => ({ label: c, value: c })),
              ]}
            />

            <Select
              value={riskFilter}
              onChange={setRiskFilter}
              style={{ width: 150 }}
              options={[
                { label: "全部态势", value: "all" },
                { label: "严重逾期 (红灯)", value: "red" },
                { label: "临期关注 (黄灯)", value: "yellow" },
                { label: "级联锁死 (受阻)", value: "locked" },
                { label: "我的主责/待审", value: "mine" },
              ]}
            />
          </Space>

          <div style={{ fontSize: 12, color: "var(--ent-text-muted)" }}>
            展示 <span style={{ color: "var(--ent-primary-hover)", fontWeight: 700 }}>{filteredLanes.length}</span> / {batch.lanes.length} 条资产全链路拓扑
          </div>
        </div>

        {/* Active Filter Indicators */}
        {(highlightStage || selectedCategory !== "all" || riskFilter !== "all" || searchKeyword.trim()) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--ent-border-subtle)", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>生效过滤条件：</span>
            {highlightStage && (
              <Tag
                closable
                onClose={() => {
                  setHighlightStage(null);
                  onClearNavContext?.();
                }}
                color="blue"
                style={{ margin: 0, fontSize: 11 }}
              >
                焦点工序: {STAGES.find((s) => s.key === highlightStage)?.name ?? highlightStage}
              </Tag>
            )}
            {selectedCategory !== "all" && (
              <Tag closable onClose={() => setSelectedCategory("all")} color="purple" style={{ margin: 0, fontSize: 11 }}>
                分类: {selectedCategory}
              </Tag>
            )}
            {riskFilter !== "all" && (
              <Tag closable onClose={() => setRiskFilter("all")} color="orange" style={{ margin: 0, fontSize: 11 }}>
                状态: {riskFilter === "red" ? "严重逾期" : riskFilter === "yellow" ? "临期关注" : riskFilter === "locked" ? "级联加锁" : "我的"}
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
                setHighlightStage(null);
                setSelectedCategory("all");
                setRiskFilter("all");
                setSearchKeyword("");
                onClearNavContext?.();
              }}
            >
              重置全部过滤
            </Button>
          </div>
        )}
      </Card>

      {/* Standardized Ant Design Table Matrix */}
      <Card
        size="small"
        style={{
          background: "var(--ent-bg-card)",
          borderColor: "var(--ent-border-subtle)",
        }}
        styles={{
          body: { padding: 0 },
        }}
      >
        <Table<ResourceLane>
          rowKey="id"
          columns={columns}
          dataSource={filteredLanes}
          size="middle"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1300 }}
        />
      </Card>
    </div>
  );
};
