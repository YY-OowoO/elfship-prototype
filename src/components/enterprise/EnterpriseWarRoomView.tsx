import React, { useState, useMemo } from "react";
import {
  CheckCircle2,
  Flame,
  Lock,
  Search,
  Send,
  ShieldAlert,
  Unlock,
} from "lucide-react";
import { Button, Card, Empty, Input, Popconfirm, Segmented, Select, Space, Tag, message } from "antd";
import type { LaunchBatch, PersonId, ResourceLane, WorkItem } from "../../types";
import { PEOPLE, STAGES } from "../../mock";
import {
  batchLights,
  formatDay,
  itemLight,
  remainLabel,
} from "../../logic";
import { playSound } from "../../sound";
import type { EnterpriseTab, NavigationContext } from "./EnterpriseAdminRoot";

interface EnterpriseWarRoomViewProps {
  batch: LaunchBatch;
  actor: PersonId;
  onOpenItem: (id: string) => void;
  onNudgeItem: (item: WorkItem, lane: ResourceLane) => void;
  onQuickUnblockItem?: (itemId: string, reason?: string) => void;
  onReassignDri?: (itemId: string, newDri: PersonId) => void;
  navContext?: NavigationContext | null;
  onClearNavContext?: () => void;
  onNavigateToTab?: (tab: EnterpriseTab, context?: NavigationContext) => void;
}

export const EnterpriseWarRoomView: React.FC<EnterpriseWarRoomViewProps> = ({
  batch,
  actor: _actor,
  onOpenItem,
  onNudgeItem,
  onQuickUnblockItem,
  onReassignDri,
  navContext,
  onClearNavContext,
}) => {
  const [filterTab, setFilterTab] = useState<"all" | "red" | "yellow" | "locked">(() => {
    if (navContext?.risk === "red") return "red";
    if (navContext?.risk === "yellow") return "yellow";
    if (navContext?.risk === "locked") return "locked";
    return "all";
  });
  const [searchKeyword, setSearchKeyword] = useState("");
  const [nudgedMap, setNudgedMap] = useState<Record<string, string>>({});

  const lights = useMemo(() => batchLights(batch), [batch]);

  const handleNudge = (item: WorkItem, lane: ResourceLane) => {
    onNudgeItem(item, lane);
    const timeStr = new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    setNudgedMap((prev) => ({ ...prev, [item.id]: timeStr }));
    playSound.click();
  };

  const handleUnblock = (itemId: string) => {
    if (onQuickUnblockItem) {
      onQuickUnblockItem(itemId, "安灯作战室应急处置：特批解除阻断并放行下游");
    } else {
      onOpenItem(itemId);
    }
  };

  // Find all incident items: red lights or yellow lights or locked items
  const incidents = useMemo(() => {
    const list: {
      lane: ResourceLane;
      item: WorkItem;
      light: "red" | "yellow";
      reason: string;
      category: string;
      lockedDownstreamCount: number;
    }[] = [];

    for (const lane of batch.lanes) {
      for (const item of lane.items) {
        if (item.skipped || item.state === "confirmed") continue;

        const l = itemLight(item);
        if (l === "red" || l === "yellow") {
          // Count locked items downstream in this lane
          const itemIdx = lane.items.findIndex((x) => x.id === item.id);
          const downstreamLocked = lane.items.slice(itemIdx + 1).filter((x) => x.locked).length;

          // Deduce incident reason/category from history or light
          const lastAudit = [...item.history].reverse().find((h) => h.reason || h.rejectionCategory);
          const category = lastAudit?.rejectionCategory ?? (l === "red" ? "schedule_delay" : "schedule_delay");
          const reasonText = lastAudit?.reason ?? (l === "red" ? "节点已逾期未提交验收" : "工期余量紧张，仅剩 1 个工作日");

          list.push({
            lane,
            item,
            light: l,
            reason: reasonText,
            category,
            lockedDownstreamCount: downstreamLocked,
          });
        }
      }
    }
    return list;
  }, [batch.lanes]);

  // Filtered incidents based on tabs and search
  const displayIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (navContext?.stage && inc.item.stage !== navContext.stage) return false;
      if (filterTab === "red" && inc.light !== "red") return false;
      if (filterTab === "yellow" && inc.light !== "yellow") return false;
      if (filterTab === "locked" && inc.lockedDownstreamCount === 0 && !inc.item.locked) return false;
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const dri = PEOPLE[inc.item.driId]?.name ?? inc.item.driId;
        const st = STAGES.find((s) => s.key === inc.item.stage)?.name ?? inc.item.stage;
        if (!inc.lane.name.toLowerCase().includes(q) && !dri.toLowerCase().includes(q) && !st.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [incidents, filterTab, searchKeyword, navContext]);

  // Broadcast all incidents
  const handleBroadcastAll = () => {
    if (displayIncidents.length === 0) {
      message.success("当前无需要通报的安灯故障！");
      return;
    }
    const lines = [
      `【${batch.name} · 安灯异常与风险协同通报】`,
      `> 上线基准日：${formatDay(batch.launchDate)} · 严重逾期：${lights.red} 项 · 临期关注：${lights.yellow} 项`,
      ``,
      `#### 重点阻断与处置要求：`,
      ...displayIncidents.map((inc, i) => {
        const dri = PEOPLE[inc.item.driId]?.name ?? inc.item.driId;
        const st = STAGES.find((s) => s.key === inc.item.stage)?.name ?? inc.item.stage;
        const tag = inc.light === "red" ? "P0 严重逾期" : "临期预警";
        return `${i + 1}. [${tag}] ${inc.lane.name} (${st}) @${dri}：${inc.reason}（已连锁加锁下游 ${inc.lockedDownstreamCount} 个工序）`;
      }),
      ``,
      `*请各位主责同学即刻按门禁规范排查修复并推进闭环！*`,
    ].join("\n");

    try {
      navigator.clipboard.writeText(lines);
      message.success("已复制【安灯战情通报令】至剪贴板，可直接广播发布！");
    } catch {
      message.info("已生成战情通报令");
    }
  };

  return (
    <div className="ent-warroom-view">
      {/* Hero Alert Beacon Banner */}
      <div className="ent-warroom-hero-banner">
        <div className="ent-warroom-title-group">
          <div className="ent-warroom-icon-beacon">
            <Flame size={24} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ent-text-primary)", display: "flex", alignItems: "center", gap: 10 }}>
              <span>安灯故障与质检风险作战室 (Andon Incident War Room)</span>
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: lights.red > 0 ? "rgba(244, 63, 94, 0.3)" : "rgba(245, 158, 11, 0.3)",
                  color: lights.red > 0 ? "var(--ent-rose)" : "var(--ent-amber)",
                  fontFamily: "var(--ent-font-mono)",
                  fontWeight: 700,
                }}
              >
                {lights.red > 0 ? `P0 警报激活 · ${lights.red} 项阻断` : "受控预警状态"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--ent-text-secondary)", marginTop: 4 }}>
              隔离故障机制运行中：未达标资源只阻断自身下游工序，保障全批次其它资源不受牵连继续流转。
            </div>
          </div>
        </div>

        <Button
          type="primary"
          danger={lights.red > 0}
          size="middle"
          icon={<Send size={14} />}
          onClick={handleBroadcastAll}
        >
          一键下发战情通报令
        </Button>
      </div>

      {/* Filter & Incident Search Toolbar */}
      <Card
        size="small"
        style={{ background: "var(--ent-bg-card)", borderColor: "var(--ent-border-subtle)", marginBottom: 14 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <Space size={10} wrap>
            <Segmented
              size="small"
              value={filterTab}
              onChange={(v) => setFilterTab(v as "all" | "red" | "yellow" | "locked")}
              options={[
                { label: `全部异常 (${incidents.length})`, value: "all" },
                { label: `P0 严重逾期 (${incidents.filter((x) => x.light === "red").length})`, value: "red" },
                { label: `临期关注 (${incidents.filter((x) => x.light === "yellow").length})`, value: "yellow" },
                { label: `级联加锁 (${incidents.filter((x) => x.lockedDownstreamCount > 0 || x.item.locked).length})`, value: "locked" },
              ]}
              style={{ background: "var(--ent-bg-surface)", border: "1px solid var(--ent-border-subtle)" }}
            />

            {navContext?.stage && (
              <Tag
                closable
                onClose={onClearNavContext}
                color="blue"
                style={{ margin: 0, fontSize: 11, borderRadius: 4 }}
              >
                已聚焦工序：{STAGES.find((s) => s.key === navContext.stage)?.name ?? navContext.stage}
              </Tag>
            )}
          </Space>

          <Input
            placeholder="搜索异常资产、工序或主责人..."
            prefix={<Search size={13} style={{ color: "var(--ent-text-muted)" }} />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            allowClear
            size="small"
            style={{ width: 230 }}
          />
        </div>
      </Card>

      {/* Incidents Grid */}
      <Card
        size="small"
        style={{ background: "var(--ent-bg-card)", borderColor: "var(--ent-border-subtle)" }}
        styles={{
          header: { borderBottom: "1px solid var(--ent-border-subtle)", padding: "10px 14px" },
          body: { padding: 14 },
        }}
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Space size={8}>
              <ShieldAlert size={16} style={{ color: "var(--ent-rose)" }} />
              <span style={{ fontWeight: 700, color: "var(--ent-text-primary)", fontSize: 13 }}>
                当前活跃安灯故障与阻塞项列表 ({displayIncidents.length} 项)
              </span>
            </Space>
            <span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>
              红黄灯信号即时触发 · 支持特批解阻与现场改派
            </span>
          </div>
        }
      >
        {displayIncidents.length === 0 ? (
          <Empty
            description={
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ent-emerald)" }}>
                  当前筛选无安灯故障
                </div>
                <div style={{ fontSize: 12, color: "var(--ent-text-muted)", marginTop: 4 }}>
                  所有在制资源工序均符合交付工期与质量门禁规范。
                </div>
              </div>
            }
            style={{ margin: "40px 0" }}
          />
        ) : (
          <div>
            {/* Primary Root Blocker Incident (主头条事故) */}
            {(() => {
              const root = displayIncidents[0];
              const isRed = root.light === "red";
              const stageObj = STAGES.find((s) => s.key === root.item.stage);
              const dri = PEOPLE[root.item.driId]?.name ?? root.item.driId;
              const confirmer = PEOPLE[root.item.confirmerId]?.name ?? root.item.confirmerId;
              const nudgedTime = nudgedMap[root.item.id];

              return (
                <div
                  style={{
                    padding: "16px 20px",
                    borderRadius: 12,
                    background: isRed
                      ? "linear-gradient(180deg, rgba(220, 38, 38, 0.05) 0%, var(--ent-bg-surface) 100%)"
                      : "linear-gradient(180deg, rgba(217, 119, 6, 0.05) 0%, var(--ent-bg-surface) 100%)",
                    border: isRed ? "2px solid var(--ent-rose)" : "2px solid var(--ent-amber)",
                    boxShadow: isRed ? "0 4px 20px rgba(220, 38, 38, 0.12)" : "0 4px 20px rgba(217, 119, 6, 0.12)",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ padding: "2px 8px", borderRadius: 4, background: "var(--ent-rose)", color: "#fff", fontSize: 11, fontWeight: 800 }}>
                        P0 核心根因阻断项 (Root Blocker)
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: "var(--ent-text-primary)" }}>
                        {root.lane.name}
                      </span>
                      <Tag color="error" style={{ margin: 0, fontWeight: 700 }}>
                        工序：{stageObj?.name ?? root.item.stage}
                      </Tag>
                    </div>

                    <Space size={8}>
                      {nudgedTime ? (
                        <Tag
                          color="success"
                          icon={<CheckCircle2 size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />}
                          style={{ margin: 0, fontSize: 11, padding: "3px 8px", borderRadius: 4 }}
                        >
                          已催办 {nudgedTime}
                        </Tag>
                      ) : (
                        <Button
                          type="primary"
                          danger
                          size="small"
                          onClick={() => handleNudge(root.item, root.lane)}
                        >
                          紧急催办主责
                        </Button>
                      )}

                      {onQuickUnblockItem && (
                        <Popconfirm
                          title="特批解除安灯阻断"
                          description="将特批通过该工序并解除下游所有节点的级联加锁，确认放行？"
                          okText="确认放行"
                          cancelText="取消"
                          onConfirm={() => handleUnblock(root.item.id)}
                        >
                          <Button
                            size="small"
                            icon={<Unlock size={12} />}
                            style={{
                              backgroundColor: "var(--ent-emerald)",
                              borderColor: "var(--ent-emerald)",
                              color: "#fff",
                            }}
                          >
                            特批解除阻断
                          </Button>
                        </Popconfirm>
                      )}

                      <Button
                        size="small"
                        onClick={() => onOpenItem(root.item.id)}
                      >
                        排查详情
                      </Button>

                      {onReassignDri && (
                        <Select
                          value={root.item.driId}
                          size="small"
                          style={{ width: 110 }}
                          title="改派主责人"
                          onChange={(newDri) => onReassignDri(root.item.id, newDri)}
                          options={Object.values(PEOPLE).map((p) => ({
                            label: `@${p.name}`,
                            value: p.id,
                          }))}
                        />
                      )}
                    </Space>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 12, fontSize: 12 }}>
                    <div style={{ background: "var(--ent-bg-card)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--ent-border-subtle)" }}>
                      <div style={{ color: "var(--ent-text-muted)", fontSize: 11, marginBottom: 2 }}>阻断原因诊断：</div>
                      <div style={{ color: "var(--ent-rose)", fontWeight: 600 }}>{root.reason}</div>
                    </div>

                    <div style={{ background: "var(--ent-bg-card)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--ent-border-subtle)" }}>
                      <div style={{ color: "var(--ent-text-muted)", fontSize: 11, marginBottom: 2 }}>级联锁定范围：</div>
                      <div style={{ color: "var(--ent-text-primary)", fontWeight: 600 }}>
                        已加锁下游 <strong>{root.lockedDownstreamCount}</strong> 个工序节点停滞
                      </div>
                    </div>

                    <div style={{ background: "var(--ent-bg-card)", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--ent-border-subtle)" }}>
                      <div style={{ color: "var(--ent-text-muted)", fontSize: 11, marginBottom: 2 }}>责任与把关：</div>
                      <div style={{ color: "var(--ent-text-primary)" }}>
                        主责: <strong style={{ color: "var(--ent-primary-hover)" }}>@{dri}</strong> · 审核: @{confirmer}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Secondary Incidents Grid (次级预警与阻断) */}
            {displayIncidents.length > 1 && (
              <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 700, color: "var(--ent-text-secondary)" }}>
                次级关注与待处置故障 ({displayIncidents.length - 1} 项)
              </div>
            )}
            <div className="ent-warroom-card-grid">
              {displayIncidents.slice(1).map(({ lane, item, light, reason, category, lockedDownstreamCount }) => {
                const isRed = light === "red";
                const stageObj = STAGES.find((s) => s.key === item.stage);
                const dri = PEOPLE[item.driId]?.name ?? item.driId;
                const confirmer = PEOPLE[item.confirmerId]?.name ?? item.confirmerId;
                const nudgedTime = nudgedMap[item.id];

                return (
                  <div key={item.id} className={`ent-incident-card ${isRed ? "red" : "yellow"}`}>
                    <div className="ent-incident-card-top">
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: isRed ? "var(--ent-rose)" : "var(--ent-amber)",
                              boxShadow: `0 0 8px ${isRed ? "var(--ent-rose)" : "var(--ent-amber)"}`,
                            }}
                          />
                          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ent-text-primary)" }}>
                            {lane.name}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ent-text-muted)", marginTop: 2 }}>
                          {lane.type} · 工序: <span style={{ color: "var(--ent-primary-hover)" }}>{stageObj?.name ?? item.stage}</span>
                        </div>
                      </div>

                      <Tag color={isRed ? "error" : "warning"} style={{ margin: 0, fontWeight: 600 }}>
                        {isRed ? "P0 严重逾期" : "临期预警"}
                      </Tag>
                    </div>

                    {/* Root Cause Reason */}
                    <div
                      style={{
                        padding: "8px 10px",
                        borderRadius: 6,
                        background: "var(--ent-bg-deep)",
                        border: "1px solid var(--ent-border-subtle)",
                        fontSize: 12,
                        color: "var(--ent-text-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <div>
                        <span style={{ color: "var(--ent-text-muted)" }}>诊断：</span>
                        <span>{reason}</span>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: "var(--ent-primary-dim)",
                          border: "1px solid var(--ent-border-strong)",
                          color: "var(--ent-primary-hover)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {category === "art_effect"
                          ? "美术效果"
                          : category === "tech_spec"
                          ? "技术规范"
                          : category === "ip_compliance"
                          ? "IP监修"
                          : category === "external_dep"
                          ? "外部依赖"
                          : "排期延误"}
                      </span>
                    </div>

                    {/* Cascading Downstream Impact */}
                    <div className="ent-incident-impact-box">
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ent-rose)" }}>
                        <Lock size={12} />
                        <span style={{ fontWeight: 600 }}>级联波及锁定：</span>
                        <span>下游 {lockedDownstreamCount} 个节点被置灰停滞</span>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--ent-text-muted)", marginTop: 2 }}>
                        门禁不满足无法推进，但同一批次其它独立资源继续流转。
                      </div>
                    </div>

                    {/* Assignee & Dates & Dispatch */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "var(--ent-text-muted)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span>主责:</span>
                        {onReassignDri ? (
                          <Select
                            value={item.driId}
                            size="small"
                            bordered={false}
                            style={{ width: 88, padding: 0 }}
                            onChange={(newDri) => onReassignDri(item.id, newDri)}
                            options={Object.values(PEOPLE).map((p) => ({
                              label: `@${p.name}`,
                              value: p.id,
                            }))}
                          />
                        ) : (
                          <span style={{ color: "var(--ent-text-primary)" }}>@{dri}</span>
                        )}
                        <span>· 审: @{confirmer}</span>
                      </div>
                      <div style={{ fontFamily: "var(--ent-font-mono)", color: isRed ? "var(--ent-rose)" : "var(--ent-amber)" }}>
                        {remainLabel(item.dueAt)} (截止 {formatDay(item.dueAt)})
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                      {nudgedTime ? (
                        <Tag
                          color="success"
                          icon={<CheckCircle2 size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />}
                          style={{ flex: 1, margin: 0, textAlign: "center", padding: "3px 0", fontSize: 11 }}
                        >
                          已催办 {nudgedTime}
                        </Tag>
                      ) : (
                        <Button
                          size="small"
                          style={{ flex: 1, color: "var(--ent-amber)" }}
                          onClick={() => handleNudge(item, lane)}
                        >
                          催办主责
                        </Button>
                      )}

                      {onQuickUnblockItem && (
                        <Popconfirm
                          title="特批解除阻断"
                          description="确定特批放行并解除此节点下游加锁吗？"
                          okText="特批放行"
                          cancelText="取消"
                          onConfirm={() => handleUnblock(item.id)}
                        >
                          <Button size="small" icon={<Unlock size={11} />} style={{ flex: 1, color: "var(--ent-emerald)" }}>
                            特批放行
                          </Button>
                        </Popconfirm>
                      )}

                      <Button
                        type="primary"
                        size="small"
                        style={{ flex: 1 }}
                        onClick={() => onOpenItem(item.id)}
                      >
                        下钻处置
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
