import React, { useState, useMemo } from "react";
import {
  Flame,
} from "lucide-react";
import { Button, Card, Segmented, Select, Space, Tooltip } from "antd";
import type { LaunchBatch, PersonId } from "../../types";
import { PEOPLE, STAGES, TODAY } from "../../mock";
import { useSimulatedDate } from "../../store/deliveryStore";
import {
  formatDay,
  getAssetCategory,
  itemLight,
} from "../../logic";

import type { NavigationContext } from "./EnterpriseAdminRoot";

interface EnterpriseGanttViewProps {
  batch: LaunchBatch;
  actor: PersonId;
  onOpenItem: (id: string) => void;
  navContext?: NavigationContext | null;
  onClearNavContext?: () => void;
}

export const EnterpriseGanttView: React.FC<EnterpriseGanttViewProps> = ({
  batch,
  actor: _actor,
  onOpenItem,
  navContext,
}) => {
  const [simulatedDate] = useSimulatedDate();
  const effectiveToday = simulatedDate || TODAY;
  const [cpmOnly, setCpmOnly] = useState(() => navContext?.risk === "red");
  const [zoomMode, setZoomMode] = useState<"standard" | "compact">("standard");
  const [selectedCategory, setSelectedCategory] = useState<string>(() => navContext?.assetCategory || "all");
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(() => navContext?.highlightItemId || null);

  React.useEffect(() => {
    if (navContext) {
      if (navContext.risk === "red") setCpmOnly(true);
      if (navContext.assetCategory) setSelectedCategory(navContext.assetCategory);
      if (navContext.highlightItemId) setHoveredItemId(navContext.highlightItemId);
    }
  }, [navContext]);

  // Determine timeline boundary dates
  const timelineDates = useMemo(() => {
    const dates: string[] = [effectiveToday, batch.launchDate];
    batch.lanes.forEach((l) => {
      l.items.forEach((it) => {
        if (it.dueAt) dates.push(it.dueAt);
      });
    });
    dates.sort();
    const minDateStr = dates[0] < effectiveToday ? dates[0] : effectiveToday;
    const maxDateStr = dates[dates.length - 1] > batch.launchDate ? dates[dates.length - 1] : batch.launchDate;

    const minDate = new Date(`${minDateStr}T00:00:00`);
    const maxDate = new Date(`${maxDateStr}T00:00:00`);

    // Generate days interval
    const list: string[] = [];
    const cur = new Date(minDate);
    while (cur <= maxDate) {
      list.push(cur.toISOString().split("T")[0]);
      cur.setDate(cur.getDate() + 1);
    }
    return { minDate, maxDate, totalDays: list.length, days: list };
  }, [batch.lanes, batch.launchDate]);

  // Calculate percentage left position along timeline for a date
  const getPercent = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    const diff = d.getTime() - timelineDates.minDate.getTime();
    const total = timelineDates.maxDate.getTime() - timelineDates.minDate.getTime();
    if (total <= 0) return 0;
    return Math.max(0, Math.min(100, (diff / total) * 100));
  };

  // Filter lanes
  const displayLanes = useMemo(() => {
    return batch.lanes.filter((lane) => {
      if (selectedCategory !== "all" && getAssetCategory(lane.type) !== selectedCategory) {
        return false;
      }
      if (cpmOnly) {
        // Critical path: lane has red or locked or zero slack
        return lane.items.some((it) => !it.skipped && (itemLight(it) === "red" || it.locked));
      }
      return true;
    });
  }, [batch.lanes, selectedCategory, cpmOnly]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    batch.lanes.forEach((l) => set.add(getAssetCategory(l.type)));
    return Array.from(set);
  }, [batch.lanes]);

  return (
    <div className="ent-gantt-view">
      {/* Top Controls & Legend */}
      <Card
        size="small"
        style={{
          background: "var(--ent-bg-card)",
          borderColor: "var(--ent-border-subtle)",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <Space size={12}>
            <Select
              value={selectedCategory}
              onChange={setSelectedCategory}
              style={{ width: 140 }}
              options={[
                { label: "全部分类", value: "all" },
                ...categories.map((c) => ({ label: c, value: c })),
              ]}
            />

            <Button
              type={cpmOnly ? "primary" : "default"}
              danger={cpmOnly}
              size="small"
              icon={<Flame size={13} />}
              onClick={() => setCpmOnly((v) => !v)}
            >
              仅高亮关键路径 (CPM)
            </Button>

            <Segmented
              size="small"
              value={zoomMode}
              onChange={(val) => setZoomMode(val as "standard" | "compact")}
              options={[
                { label: "标准时序", value: "standard" },
                { label: "紧凑网格", value: "compact" },
              ]}
            />
          </Space>

          {/* Legend */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11, color: "var(--ent-text-muted)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--ent-emerald)" }} />
              <span>已通关验收</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--ent-primary)" }} />
              <span>推进中</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--ent-amber)" }} />
              <span>临期预警</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--ent-rose)" }} />
              <span>严重逾期</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 12, height: 10, borderRadius: 2, border: "1px solid var(--ent-rose)", background: "rgba(239,68,68,0.3)" }} />
              <span>关键路径 (CPM)</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Gantt Timeline Board */}
      <div className="ent-card-shell">
        <div className="ent-card-inner" style={{ padding: zoomMode === "compact" ? "12px 16px" : "16px 20px" }}>
          <div className="ent-gantt-container">
            {/* Timeline Header Ruler */}
            <div className="ent-gantt-header-row" style={{ minHeight: zoomMode === "compact" ? 28 : 34 }}>
              <div className="ent-gantt-asset-col">资产名称 / 类别</div>
              <div className="ent-gantt-timeline-ruler">
                {/* Current Day Marker */}
                <div
                  style={{
                    position: "absolute",
                    left: `${getPercent(effectiveToday)}%`,
                    top: -4,
                    bottom: -600,
                    width: 2,
                    background: "var(--ent-primary)",
                    boxShadow: "0 0 8px var(--ent-border-glow)",
                    zIndex: 10,
                    pointerEvents: "none",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 4,
                      fontSize: 10,
                      color: "var(--ent-primary-hover)",
                      fontFamily: "var(--ent-font-mono)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    今日 ({formatDay(effectiveToday)})
                  </span>
                </div>

                {/* Launch Day Marker */}
                <div
                  style={{
                    position: "absolute",
                    left: `${getPercent(batch.launchDate)}%`,
                    top: -4,
                    bottom: -600,
                    width: 2,
                    background: "var(--ent-rose)",
                    boxShadow: "0 0 8px var(--ent-rose)",
                    zIndex: 10,
                    pointerEvents: "none",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      right: 4,
                      fontSize: 10,
                      color: "var(--ent-rose)",
                      fontFamily: "var(--ent-font-mono)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    里程碑: 上线基线 ({formatDay(batch.launchDate)})
                  </span>
                </div>

                {/* Step labels along ruler */}
                {timelineDates.days
                  .filter((_, idx) => idx % Math.max(1, Math.floor(timelineDates.totalDays / 6)) === 0)
                  .map((d) => (
                    <div
                      key={d}
                      style={{
                        position: "absolute",
                        left: `${getPercent(d)}%`,
                        transform: "translateX(-50%)",
                        fontSize: 10,
                        color: "var(--ent-text-muted)",
                        fontFamily: "var(--ent-font-mono)",
                      }}
                    >
                      {formatDay(d)}
                    </div>
                  ))}
              </div>
            </div>

            {/* Lane Rows */}
            <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
              {displayLanes.map((lane) => {
                const validItems = lane.items.filter((it) => !it.skipped);
                const laneHasCpm = validItems.some((it) => itemLight(it) === "red" || it.locked);

                return (
                  <div
                    key={lane.id}
                    className="ent-gantt-lane-row"
                    style={{
                      minHeight: zoomMode === "compact" ? 38 : 48,
                      opacity: cpmOnly && !laneHasCpm ? 0.28 : 1,
                      transition: "opacity 0.2s ease, filter 0.2s ease",
                      filter: cpmOnly && !laneHasCpm ? "grayscale(40%)" : "none",
                    }}
                  >
                    <div className="ent-gantt-asset-col" style={{ padding: zoomMode === "compact" ? "4px 10px" : "8px 12px" }}>
                      <div style={{ fontSize: zoomMode === "compact" ? 12 : 13, fontWeight: 600, color: "var(--ent-text-primary)" }}>{lane.name}</div>
                      <div style={{ fontSize: 10, color: "var(--ent-text-muted)" }}>{lane.type}</div>
                    </div>

                    <div className="ent-gantt-bars-container">
                      {/* SVG Stage Dependency Connectors */}
                      <svg
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          pointerEvents: "none",
                          zIndex: 1,
                        }}
                      >
                        {validItems.slice(1).map((item, i) => {
                          const prev = validItems[i];
                          const xPrev = getPercent(prev.dueAt);
                          const xCur = getPercent(item.dueAt);
                          const isCpmConn = itemLight(item) === "red" || item.locked || itemLight(prev) === "red" || prev.locked;
                          const isHovered = hoveredItemId === item.id || hoveredItemId === prev.id;
                          return (
                            <g key={`dep-${item.id}`}>
                              <line
                                x1={`${xPrev}%`}
                                y1="50%"
                                x2={`${xCur}%`}
                                y2="50%"
                                stroke={isCpmConn ? "#dc2626" : isHovered ? "var(--ent-primary-hover)" : "rgba(148, 163, 184, 0.35)"}
                                strokeWidth={isCpmConn ? 1.5 : isHovered ? 1.5 : 1}
                                strokeDasharray={isCpmConn ? "3,2" : isHovered ? "2,2" : "none"}
                              />
                              <circle
                                cx={`${xPrev}%`}
                                cy="50%"
                                r={isCpmConn ? 2.5 : isHovered ? 2.5 : 1.5}
                                fill={isCpmConn ? "#dc2626" : isHovered ? "var(--ent-primary-hover)" : "rgba(100, 116, 139, 0.4)"}
                              />
                            </g>
                          );
                        })}
                      </svg>

                      {lane.items.map((item, idx) => {
                        if (item.skipped) return null;

                        const light = itemLight(item);
                        const isRed = light === "red";
                        const isYellow = light === "yellow";
                        const isConfirmed = item.state === "confirmed";
                        const isCpm = isRed || item.locked;
                        const isHovered = hoveredItemId === item.id;

                        // Estimate start date based on previous item's dueAt or effectiveToday
                        const prevItem = idx > 0 ? lane.items[idx - 1] : null;
                        const startDate = prevItem ? prevItem.dueAt : effectiveToday;
                        const leftPct = getPercent(startDate);
                        const rightPct = getPercent(item.dueAt);
                        const rawWidth = Math.max(2.5, rightPct - leftPct);
                        const nextItem = idx < lane.items.length - 1 ? lane.items[idx + 1] : null;
                        const maxAllowedWidth = nextItem ? Math.max(2, getPercent(nextItem.dueAt) - leftPct) : 100 - leftPct;
                        const widthPct = Math.max(2, Math.min(rawWidth, maxAllowedWidth));

                        const stageObj = STAGES.find((s) => s.key === item.stage);
                        const dri = PEOPLE[item.driId]?.name ?? item.driId;

                        let bg = isConfirmed
                          ? "rgba(16, 185, 129, 0.2)"
                          : isRed
                          ? "rgba(239, 68, 68, 0.25)"
                          : isYellow
                          ? "rgba(245, 158, 11, 0.25)"
                          : "rgba(37, 99, 235, 0.08)";

                        let color = isConfirmed
                          ? "var(--ent-emerald)"
                          : isRed
                          ? "var(--ent-rose)"
                          : isYellow
                          ? "var(--ent-amber)"
                          : "var(--ent-accent)";

                        return (
                          <Tooltip
                            key={item.id}
                            title={
                              <div>
                                <div style={{ fontWeight: 700 }}>
                                  {lane.name} · {stageObj?.name ?? item.stage}
                                </div>
                                <div>主责: @{dri}</div>
                                <div>状态: {isConfirmed ? "已完成封板" : item.state}</div>
                                <div>截止日: {item.dueAt}</div>
                                {isCpm && <div style={{ color: "#ef4444", marginTop: 4, fontWeight: 600 }}>关键路径卡点 (CPM)</div>}
                              </div>
                            }
                          >
                            <div
                              className={`ent-gantt-bar-item ${isCpm ? "cpm" : ""} ${isHovered ? "is-hovered" : ""}`}
                              style={{
                                left: `${leftPct}%`,
                                width: `calc(${widthPct}% - 2px)`,
                                background: bg,
                                color: color,
                                border: isCpm ? "1.5px solid #ef4444" : isHovered ? "1.5px solid var(--ent-primary-hover)" : `1px solid ${color}`,
                                padding: "0 4px",
                                justifyContent: "center",
                                height: zoomMode === "compact" ? 22 : 26,
                                transform: isHovered ? "scaleY(1.08)" : "none",
                                zIndex: isHovered ? 4 : isCpm ? 3 : 2,
                                transition: "transform 0.15s ease, box-shadow 0.15s ease",
                                boxShadow: isHovered ? "0 2px 8px rgba(0,0,0,0.12)" : "none",
                              }}
                              onClick={() => onOpenItem(item.id)}
                              onMouseEnter={() => setHoveredItemId(item.id)}
                              onMouseLeave={() => setHoveredItemId(null)}
                            >
                              {widthPct >= 3.2 ? <span>{stageObj?.short ?? item.stage}</span> : null}
                            </div>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
