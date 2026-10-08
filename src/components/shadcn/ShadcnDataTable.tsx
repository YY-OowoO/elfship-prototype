import React, { useState, useMemo } from "react";
import { Input, Select, Button } from "antd";
import {
  Search,
  ArrowDownUp,
  CalendarDays,
  FlagTriangleRight,
  RefreshCw,
} from "lucide-react";
import type { LaunchBatch, ResourceLane, WorkItem } from "../../types";
import { PEOPLE, STAGES } from "../../mock";
import {
  currentItem,
  formatDay,
  itemLight,
  remainLabel,
  stateLabel,
} from "../../logic";

interface ShadcnDataTableProps {
  batch: LaunchBatch;
  onOpenItem: (id: string) => void;
  onNudgeItem: (item: WorkItem, lane: ResourceLane) => void;
}

type SortField = "default" | "name" | "stage" | "dueAt" | "risk" | "state";

export const ShadcnDataTable: React.FC<ShadcnDataTableProps> = ({
  batch,
  onOpenItem,
  onNudgeItem,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedRisk, setSelectedRisk] = useState<string>("all");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [orderBy, setOrderBy] = useState<SortField>("default");
  const [orderDirection, setOrderDirection] = useState<"asc" | "desc">("desc");

  const categories = useMemo(() => Array.from(new Set(batch.lanes.map((l) => l.type))), [batch.lanes]);
  const matchedCount = batch.lanes.length;

  const filteredLanes = useMemo(() => {
    const list = batch.lanes.filter((lane) => {
      const cur = currentItem(lane);
      if (!cur) return false;

      // Search term
      if (searchTerm && !lane.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Type filter
      if (selectedType !== "all" && lane.type !== selectedType) {
        return false;
      }

      // Stage filter
      if (selectedStage !== "all" && cur.stage !== selectedStage) {
        return false;
      }

      // Risk filter
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
  }, [batch.lanes, searchTerm, selectedType, selectedStage, selectedRisk, orderBy, orderDirection]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count += 1;
    if (selectedType !== "all") count += 1;
    if (selectedStage !== "all") count += 1;
    if (selectedRisk !== "all") count += 1;
    return count;
  }, [searchTerm, selectedType, selectedStage, selectedRisk]);

  function stateRank(state: WorkItem["state"]) {
    if (state === "not_started") return 0;
    if (state === "rework") return 1;
    if (state === "in_progress") return 2;
    if (state === "submitted") return 3;
    if (state === "confirmed") return 4;
    return 0;
  }

  const isAnyFilterActive = searchTerm || selectedType !== "all" || selectedStage !== "all" || selectedRisk !== "all";

  const selectedTypeLabel = selectedType === "all" ? "" : `类型：${selectedType}`;
  const selectedStageLabel = selectedStage === "all" ? "" : `工序：${STAGES.find((s) => s.key === selectedStage)?.name ?? selectedStage}`;
  const selectedRiskLabel =
    selectedRisk === "all" ? "" : `风险：${selectedRisk === "risk" ? "严重/锁定" : selectedRisk === "watch" ? "临期预警" : "已确认通关"}`;

  const sortLabelMap: Record<SortField, string> = {
    default: "默认排序",
    name: "名称",
    stage: "工序",
    dueAt: "截止时间",
    risk: "风险",
    state: "状态",
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedType("all");
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

  return (
    <div className="shadcn-card">
      {/* Faceted Filtering Toolbar */}
      <div className="shadcn-table-controls">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, flexWrap: "wrap" }}>
          {/* Search Input */}
          <Input
            placeholder="搜索资产名称..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={<Search size={14} style={{ color: "var(--shadcn-muted-fg)", marginRight: 4 }} />}
            style={{ width: 220 }}
            size="middle"
            allowClear
          />

          {/* Type Filter */}
          <Select
            value={selectedType}
            onChange={setSelectedType}
            style={{ width: 140 }}
            options={[
              { label: "全部资产类型", value: "all" },
              ...categories.map((c) => ({ label: c, value: c })),
            ]}
          />

          {/* Stage Filter */}
          <Select
            value={selectedStage}
            onChange={setSelectedStage}
            style={{ width: 150 }}
            options={[
              { label: "全部工序阶段", value: "all" },
              ...STAGES.map((s) => ({ label: `${s.name} (${s.short})`, value: s.key })),
            ]}
          />

          {/* Risk Filter */}
          <Select
            value={selectedRisk}
            onChange={setSelectedRisk}
            style={{ width: 140 }}
            options={[
              { label: "全部健康状态", value: "all" },
              { label: "严重风险 / 锁定", value: "risk" },
              { label: "临期预警", value: "watch" },
              { label: "已确认通关", value: "done" },
            ]}
          />

          {(searchTerm || selectedType !== "all" || selectedStage !== "all" || selectedRisk !== "all") && (
            <Button
              size="middle"
              onClick={clearFilters}
              icon={<RefreshCw size={13} />}
              aria-label="重置筛选条件"
            >
              重置筛选
            </Button>
          )}
        </div>

        <div className="shadcn-table-meta">
          <div style={{ fontSize: 12, color: "var(--shadcn-muted-fg)" }}>
            共匹配 <strong>{filteredLanes.length}</strong> / {matchedCount} 项入库资产
            {isAnyFilterActive ? `（排序：${sortLabelMap[orderBy]}）` : "（按默认排序）"}
          </div>
          <div className="shadcn-sort-switch">
            <button
              type="button"
              className={`shadcn-sort-btn ${orderBy === "dueAt" ? "is-active" : ""}`}
              onClick={() => toggleSort("dueAt")}
              aria-pressed={orderBy === "dueAt"}
              aria-label={`按截止时间${orderBy === "dueAt" ? (orderDirection === "asc" ? "升序" : "降序") : ""}排序`}
            >
              <CalendarDays size={12} />
              截止倒序
              {orderBy === "dueAt" ? (
                <span className="shadcn-sort-dir">{orderDirection === "asc" ? "升序" : "降序"}</span>
              ) : null}
            </button>
            <button
              type="button"
              className={`shadcn-sort-btn ${orderBy === "risk" ? "is-active" : ""}`}
              onClick={() => toggleSort("risk")}
              aria-pressed={orderBy === "risk"}
              aria-label={`按风险优先${orderBy === "risk" ? (orderDirection === "asc" ? "升序" : "降序") : ""}排序`}
            >
              <FlagTriangleRight size={12} />
              风险优先
            </button>
            <button
              type="button"
              className={`shadcn-sort-btn ${orderBy === "state" ? "is-active" : ""}`}
              onClick={() => toggleSort("state")}
              aria-pressed={orderBy === "state"}
              aria-label={`按状态优先${orderBy === "state" ? (orderDirection === "asc" ? "升序" : "降序") : ""}排序`}
            >
              <ArrowDownUp size={12} />
              状态优先
            </button>
            <button
              type="button"
              className="shadcn-sort-btn"
              onClick={() => setOrderBy("default")}
              aria-label="恢复默认排序"
            >
              默认
            </button>
          </div>
        </div>
      </div>

      {activeFilterCount > 0 ? (
        <div className="shadcn-active-filters">
          {searchTerm ? <span className="shadcn-filter-chip">关键词：{searchTerm}</span> : null}
          {selectedTypeLabel ? <span className="shadcn-filter-chip">{selectedTypeLabel}</span> : null}
          {selectedStageLabel ? <span className="shadcn-filter-chip">{selectedStageLabel}</span> : null}
          {selectedRiskLabel ? <span className="shadcn-filter-chip">{selectedRiskLabel}</span> : null}
          <button
            type="button"
            className="shadcn-filter-clear"
            onClick={clearFilters}
            aria-label="清除全部筛选条件"
          >
            清除全部
          </button>
        </div>
      ) : null}

      {/* Modern Data Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="shadcn-table">
          <thead>
            <tr>
              <th>风险</th>
              <th>
                <button type="button" className="shadcn-th-btn" onClick={() => toggleSort("name")}>
                  资产名称 / 类型
                  {orderBy === "name" ? <ArrowDownUp size={11} /> : null}
                </button>
              </th>
              <th>
                <button type="button" className="shadcn-th-btn" onClick={() => toggleSort("stage")}>
                  当前工序
                  {orderBy === "stage" ? <ArrowDownUp size={11} /> : null}
                </button>
              </th>
              <th>主责与门禁人</th>
              <th>
                <button type="button" className="shadcn-th-btn" onClick={() => toggleSort("dueAt")}>
                  截止与倒计时
                  {orderBy === "dueAt" ? <ArrowDownUp size={11} /> : null}
                </button>
              </th>
              <th>门禁达标度</th>
              <th>交付凭证 (SVN)</th>
              <th>
                <button type="button" className="shadcn-th-btn" onClick={() => toggleSort("state")}>
                  工序状态
                  {orderBy === "state" ? <ArrowDownUp size={11} /> : null}
                </button>
              </th>
              <th style={{ textAlign: "right" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredLanes.length === 0 ? (
              <tr>
                <td colSpan={9} className="shadcn-table-empty-cell">
                  <div className="shadcn-table-empty">
                    <p className="shadcn-table-empty-title">未找到符合筛选条件的资产项目</p>
                    <p className="shadcn-table-empty-desc">
                      尝试清空筛选词，或将筛选范围调宽到“全部资产类型/阶段/风险”。
                    </p>
                    <button type="button" className="app-btn size-sm variant-subtle" onClick={clearFilters}>
                      <RefreshCw size={12} />
                      一键清空筛选
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLanes.map((lane) => {
                const cur = currentItem(lane);
                const stage = STAGES.find((s) => s.key === cur.stage);
                const dri = PEOPLE[cur.driId];
                const confirmer = PEOPLE[cur.confirmerId];
                const light = itemLight(cur);
                const isHighRisk = cur.locked || light === "red";
                const isYellow = !isHighRisk && light === "yellow";

                const totalGates = cur.completeWhen.length + cur.enterNextWhen.length;
                const passedGates =
                  cur.completeWhen.filter((g) => g.ok).length +
                  cur.enterNextWhen.filter((g) => g.ok).length;

                return (
                  <tr key={lane.id}>
                    <td>
                      <span
                        className={`shadcn-badge ${
                          isHighRisk ? "shadcn-badge-danger" : isYellow ? "shadcn-badge-warning" : "shadcn-badge-success"
                        }`}
                      >
                        {isHighRisk ? "高优先" : isYellow ? "关注" : "正常"}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--shadcn-fg)" }}>{lane.name}</div>
                      <span className="shadcn-badge shadcn-badge-secondary" style={{ fontSize: 10, marginTop: 2 }}>
                        {lane.type}
                      </span>
                    </td>

                    <td>
                      <span className="shadcn-badge shadcn-badge-info">
                        {stage ? `${stage.name} (${stage.short})` : cur.stage}
                      </span>
                    </td>

                    <td>
                      <div style={{ fontSize: 12 }}>
                        <div><span style={{ color: "var(--shadcn-muted-fg)" }}>主责: </span><strong>{dri ? dri.name : cur.driId}</strong></div>
                        <div style={{ color: "var(--shadcn-muted-fg)", fontSize: 11 }}>门禁: {confirmer ? confirmer.name : cur.confirmerId}</div>
                      </div>
                    </td>

                    <td>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{formatDay(cur.dueAt)}</div>
                      <span
                        className={`shadcn-badge ${
                          light === "red"
                            ? "shadcn-badge-danger"
                            : light === "yellow"
                            ? "shadcn-badge-warning"
                            : "shadcn-badge-secondary"
                        }`}
                        style={{ fontSize: 10 }}
                      >
                        {remainLabel(cur.dueAt)}
                      </span>
                    </td>

                    <td>
                      {totalGates === 0 ? (
                        <span style={{ fontSize: 11, color: "var(--shadcn-muted-fg)" }}>-</span>
                      ) : (
                        <span
                          className={`shadcn-badge ${
                            passedGates === totalGates ? "shadcn-badge-success" : "shadcn-badge-warning"
                          }`}
                        >
                          {passedGates === totalGates ? "已达标" : `待达成 ${passedGates}/${totalGates}`}
                        </span>
                      )}
                    </td>

                    <td>
                      {cur.evidence.svnPath || cur.evidence.svnRev ? (
                        <div style={{ fontSize: 11, color: "var(--shadcn-muted-fg)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <div>{cur.evidence.svnPath || "已填报路径"}</div>
                          {cur.evidence.svnRev && <span className="shadcn-badge shadcn-badge-secondary">Rev {cur.evidence.svnRev}</span>}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--shadcn-muted-fg)" }}>待提交</span>
                      )}
                    </td>

                    <td>
                      <span
                        className={`shadcn-badge ${
                          cur.state === "confirmed"
                            ? "shadcn-badge-success"
                            : cur.state === "rejected"
                            ? "shadcn-badge-danger"
                            : cur.state === "submitted"
                            ? "shadcn-badge-info"
                            : cur.locked
                            ? "shadcn-badge-secondary"
                            : "shadcn-badge-warning"
                        }`}
                      >
                        {stateLabel(cur)}
                      </span>
                    </td>

                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          className="shadcn-badge shadcn-badge-info"
                          style={{ cursor: "pointer", padding: "4px 8px" }}
                          onClick={() => onOpenItem(cur.id)}
                        >
                          审核
                        </button>
                        <button
                          type="button"
                          className="shadcn-badge shadcn-badge-secondary"
                          style={{ cursor: "pointer", padding: "4px 8px" }}
                          onClick={() => onNudgeItem(cur, lane)}
                        >
                          催办
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
