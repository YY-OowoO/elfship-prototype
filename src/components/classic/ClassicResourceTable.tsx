import { useMemo, useState } from "react";
import { Button, Input, Select, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { LaunchBatch, ResourceLane, WorkItem } from "../../types";
import { PEOPLE, STAGES } from "../../mock";
import {
  currentItem,
  formatDay,
  itemLight,
  remainLabel,
  stateLabel,
} from "../../logic";
import { Search, CalendarDays, FlagTriangleRight, RefreshCw, ArrowDownUp } from "lucide-react";

interface ClassicResourceTableProps {
  batch: LaunchBatch;
  onOpenItem: (id: string) => void;
  onNudgeItem: (item: WorkItem, lane: ResourceLane) => void;
}

type SortField = "default" | "name" | "stage" | "dueAt" | "risk" | "state";

export function ClassicResourceTable({
  batch,
  onOpenItem,
  onNudgeItem,
}: ClassicResourceTableProps) {
  const [searchText, setSearchText] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [selectedRisk, setSelectedRisk] = useState<string>("all");
  const [orderBy, setOrderBy] = useState<SortField>("default");
  const [orderDirection, setOrderDirection] = useState<"asc" | "desc">("desc");

  const categories = useMemo(() => Array.from(new Set(batch.lanes.map((l) => l.type))), [batch.lanes]);
  const filteredLanes = useMemo(() => {
    const list = batch.lanes.filter((l) => {
      const cur = currentItem(l);

      if (searchText && !l.name.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }
      if (typeFilter !== "all" && l.type !== typeFilter) {
        return false;
      }
      if (selectedStage !== "all" && cur.stage !== selectedStage) {
        return false;
      }
      if (selectedRisk !== "all") {
        const light = itemLight(cur);
        if (selectedRisk === "risk" && light !== "red" && !cur.locked) return false;
        if (selectedRisk === "watch" && light !== "yellow") return false;
        if (selectedRisk === "done" && cur.state !== "confirmed") return false;
      }

      return true;
    });

    const next = [...list];

    if (orderBy === "default") return next;

    const toRankRisk = (lane: ResourceLane) => {
      const cur = currentItem(lane);
      const light = itemLight(cur);
      if (cur.locked) return 3;
      if (light === "red") return 2;
      if (light === "yellow") return 1;
      return 0;
    };

    const stageName = (lane: ResourceLane) => {
      const cur = currentItem(lane);
      return STAGES.find((s) => s.key === cur.stage)?.short ?? "";
    };

    next.sort((la, lb) => {
      const ca = currentItem(la);
      const cb = currentItem(lb);
      let result = 0;
      if (orderBy === "name") {
        result = la.name.localeCompare(lb.name, "zh-CN");
      } else if (orderBy === "stage") {
        result = stageName(la).localeCompare(stageName(lb), "zh-CN");
      } else if (orderBy === "dueAt") {
        result = ca.dueAt.localeCompare(cb.dueAt);
      } else if (orderBy === "risk") {
        result = toRankRisk(lb) - toRankRisk(la);
      } else if (orderBy === "state") {
        result = stateRank(ca.state) - stateRank(cb.state);
      }

      if (result !== 0) return orderDirection === "asc" ? result : -result;
      return la.name.localeCompare(lb.name, "zh-CN");
    });

    return next;
  }, [batch.lanes, searchText, typeFilter, selectedStage, selectedRisk, orderBy, orderDirection]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchText) count += 1;
    if (typeFilter !== "all") count += 1;
    if (selectedStage !== "all") count += 1;
    if (selectedRisk !== "all") count += 1;
    return count;
  }, [searchText, typeFilter, selectedStage, selectedRisk]);

  const isAnyFilterActive = searchText || typeFilter !== "all" || selectedStage !== "all" || selectedRisk !== "all";

  const totalCount = batch.lanes.length;

  function stateRank(state: WorkItem["state"]) {
    if (state === "not_started") return 0;
    if (state === "rework") return 1;
    if (state === "in_progress") return 2;
    if (state === "submitted") return 3;
    if (state === "confirmed") return 4;
    return 0;
  }

  const sortLabelMap: Record<SortField, string> = {
    default: "默认排序",
    name: "名称",
    stage: "工序",
    dueAt: "截止时间",
    risk: "风险",
    state: "状态",
  };

  const selectedTypeLabel = typeFilter === "all" ? "" : `类型：${typeFilter}`;
  const selectedStageLabel =
    selectedStage === "all" ? "" : `工序：${STAGES.find((s) => s.key === selectedStage)?.name ?? selectedStage}`;
  const selectedRiskLabel =
    selectedRisk === "all"
      ? ""
      : `风险：${selectedRisk === "risk" ? "严重风险 / 锁定" : selectedRisk === "watch" ? "临期预警" : "已确认通关"}`;

  const clearFilters = () => {
    setSearchText("");
    setTypeFilter("all");
    setSelectedStage("all");
    setSelectedRisk("all");
  };

  const toggleSort = (field: SortField) => {
    if (orderBy === field) {
      setOrderDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setOrderBy(field);
    setOrderDirection("asc");
  };

  const clearAll = () => {
    clearFilters();
  };

  const columns: ColumnsType<ResourceLane> = [
    {
      title: "风险",
      key: "risk",
      render: (_, lane) => {
        const cur = currentItem(lane);
        const light = itemLight(cur);
        const isHighRisk = cur.locked || light === "red";
        const isYellow = !isHighRisk && light === "yellow";

        return (
          <Tag
            color={isHighRisk ? "error" : isYellow ? "warning" : "success"}
            style={{ fontSize: 11 }}
          >
            {isHighRisk ? "高优先" : isYellow ? "关注" : "正常"}
          </Tag>
        );
      },
    },
    {
      title: "资源名称",
      dataIndex: "name",
      key: "name",
      render: (name: string, lane) => (
        <div>
          <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13 }}>{name}</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{lane.type}</div>
        </div>
      ),
    },
    {
      title: "当前工序",
      key: "stage",
      render: (_, lane) => {
        const cur = currentItem(lane);
        const st = STAGES.find((s) => s.key === cur.stage);
        return (
          <Tag color="blue">
            {st ? `${st.name} (${st.short})` : cur.stage}
          </Tag>
        );
      },
    },
    {
      title: "主责 / 确认人",
      key: "people",
      render: (_, lane) => {
        const cur = currentItem(lane);
        const dri = PEOPLE[cur.driId];
        const confirmer = PEOPLE[cur.confirmerId];
        return (
          <div style={{ fontSize: 12 }}>
            <div>
              <span style={{ color: "#64748b" }}>主责: </span>
              <span style={{ fontWeight: 500 }}>{dri ? dri.name : cur.driId}</span>
            </div>
            <div>
              <span style={{ color: "#64748b" }}>门禁: </span>
              <span style={{ color: "#475569" }}>{confirmer ? confirmer.name : cur.confirmerId}</span>
            </div>
          </div>
        );
      },
    },
    {
      title: "截止与预警",
      key: "due",
      render: (_, lane) => {
        const cur = currentItem(lane);
        const light = itemLight(cur);
        return (
          <div>
            <div style={{ fontWeight: 500, fontSize: 12 }}>{formatDay(cur.dueAt)}</div>
            <Tag
              color={light === "red" ? "error" : light === "yellow" ? "warning" : "default"}
              style={{ fontSize: 11, margin: 0 }}
            >
              {remainLabel(cur.dueAt)}
            </Tag>
          </div>
        );
      },
    },
    {
      title: "交付门禁",
      key: "gates",
      render: (_, lane) => {
        const cur = currentItem(lane);
        const total = cur.completeWhen.length + cur.enterNextWhen.length;
        const passed =
          cur.completeWhen.filter((g) => g.ok).length +
          cur.enterNextWhen.filter((g) => g.ok).length;
        if (total === 0) return <span style={{ color: "#94a3b8", fontSize: 11 }}>无需门禁</span>;
        return (
          <Tag color={passed === total ? "success" : "warning"}>
            {passed === total ? "已达标" : `待达成 ${passed}/${total}`}
          </Tag>
        );
      },
    },
    {
      title: "交付凭证",
      key: "evidence",
      render: (_, lane) => {
        const cur = currentItem(lane);
        if (cur.evidence.svnPath || cur.evidence.svnRev) {
          return (
            <div style={{ fontSize: 11, color: "#475569", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <div>{cur.evidence.svnPath || "SVN已就绪"}</div>
              {cur.evidence.svnRev && <Tag color="cyan">Rev {cur.evidence.svnRev}</Tag>}
            </div>
          );
        }
        return <span style={{ color: "#94a3b8", fontSize: 11 }}>待提交</span>;
      },
    },
    {
      title: "状态",
      key: "state",
      render: (_, lane) => {
        const cur = currentItem(lane);
        return (
          <Tag
            color={
              cur.state === "confirmed"
                ? "success"
                : cur.state === "rejected"
                ? "error"
                : cur.state === "submitted"
                ? "processing"
                : cur.locked
                ? "default"
                : "blue"
            }
          >
            {stateLabel(cur)}
          </Tag>
        );
      },
    },
    {
      title: "操作",
      key: "actions",
      render: (_, lane) => {
        const cur = currentItem(lane);
        return (
          <div style={{ display: "flex", gap: 6 }}>
            <Button size="small" type="link" onClick={() => onOpenItem(cur.id)}>
              详情 / 审核
            </Button>
            <Button size="small" type="text" onClick={() => onNudgeItem(cur, lane)}>
              催办
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="classic-table-wrap">
      <div className="classic-table-header">
        <div className="classic-table-title">入库资源交付矩阵</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Input.Search
            placeholder="搜索资源名称..."
            allowClear
            size="middle"
            style={{ width: 210 }}
            value={searchText}
            prefix={<Search size={14} />}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <Select
            size="small"
            value={typeFilter}
            onChange={setTypeFilter}
            style={{ width: 150 }}
            options={[
              { label: "全部资源类型", value: "all" },
              ...categories.map((t) => ({
                label: t,
                value: t,
              })),
            ]}
          />
          <Select
            size="small"
            value={selectedStage}
            onChange={setSelectedStage}
            style={{ width: 155 }}
            options={[
              { label: "全部工序阶段", value: "all" },
              ...STAGES.map((s) => ({ label: `${s.name} (${s.short})`, value: s.key })),
            ]}
          />
          <Select
            size="small"
            value={selectedRisk}
            onChange={setSelectedRisk}
            style={{ width: 145 }}
            options={[
              { label: "全部健康状态", value: "all" },
              { label: "严重风险 / 锁定", value: "risk" },
              { label: "临期预警", value: "watch" },
              { label: "已确认通关", value: "done" },
            ]}
          />
          {isAnyFilterActive ? (
            <Button
              size="small"
              onClick={clearAll}
              icon={<RefreshCw size={14} />}
              aria-label="重置经典表格筛选条件"
            >
              重置筛选
            </Button>
          ) : null}
        </div>
      </div>
      <div className="classic-table-meta">
        共匹配 <strong>{filteredLanes.length}</strong> / {totalCount} 项入库资产（
        {isAnyFilterActive ? `排序：${sortLabelMap[orderBy]}` : "默认排序"}）
        </div>
        <div className="classic-sort-switch">
        <button
          type="button"
          className={`classic-sort-btn ${orderBy === "dueAt" ? "is-active" : ""}`}
          onClick={() => toggleSort("dueAt")}
          aria-pressed={orderBy === "dueAt"}
          aria-label={`按截止时间${orderBy === "dueAt" ? (orderDirection === "asc" ? "升序" : "降序") : ""}排序`}
        >
          <CalendarDays size={12} />
          截止倒序
          {orderBy === "dueAt" ? <span className="classic-sort-dir">{orderDirection === "asc" ? "升序" : "降序"}</span> : null}
        </button>
        <button
          type="button"
          className={`classic-sort-btn ${orderBy === "risk" ? "is-active" : ""}`}
          onClick={() => toggleSort("risk")}
          aria-pressed={orderBy === "risk"}
          aria-label={`按风险优先${orderBy === "risk" ? (orderDirection === "asc" ? "升序" : "降序") : ""}排序`}
        >
          <FlagTriangleRight size={12} />
          风险优先
        </button>
        <button
          type="button"
          className={`classic-sort-btn ${orderBy === "state" ? "is-active" : ""}`}
          onClick={() => toggleSort("state")}
          aria-pressed={orderBy === "state"}
          aria-label={`按状态优先${orderBy === "state" ? (orderDirection === "asc" ? "升序" : "降序") : ""}排序`}
        >
          <ArrowDownUp size={12} />
          状态优先
        </button>
        <button
          type="button"
          className="classic-sort-btn"
          onClick={() => setOrderBy("default")}
          aria-label="恢复默认排序"
        >
          默认
        </button>
      </div>
      {activeFilterCount > 0 ? (
        <div className="classic-active-filters">
          {searchText ? <span className="classic-filter-chip">关键词：{searchText}</span> : null}
          {selectedTypeLabel ? <span className="classic-filter-chip">{selectedTypeLabel}</span> : null}
          {selectedStageLabel ? <span className="classic-filter-chip">{selectedStageLabel}</span> : null}
          {selectedRiskLabel ? <span className="classic-filter-chip">{selectedRiskLabel}</span> : null}
          <button
            type="button"
            className="classic-filter-clear"
            onClick={clearFilters}
            aria-label="清除全部筛选条件"
          >
            清除全部
          </button>
        </div>
      ) : null}

      <Table
        rowKey="id"
        size="small"
        pagination={false}
        columns={columns}
        dataSource={filteredLanes}
        locale={{
          emptyText: (
            <div className="classic-table-empty">
              <p className="classic-table-empty-title">未找到符合筛选条件的资源</p>
              <p className="classic-table-empty-desc">
                尝试清空筛选词，或将筛选范围调宽到“全部类型/工序/健康状态”。
              </p>
            <button
              type="button"
              className="app-btn size-sm variant-subtle"
              onClick={clearFilters}
              aria-label="一键清空经典表格筛选"
            >
                <RefreshCw size={13} />
                一键清空筛选
              </button>
            </div>
          ),
        }}
      />
    </div>
  );
}
