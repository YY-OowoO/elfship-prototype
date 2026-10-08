import React, { useState, useMemo } from "react";
import {
  ChevronRight,
  ExternalLink,
  Flame,
  Layers,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Empty,
  Input,
  Progress,
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
import type { LaunchBatch, PersonId, ResourceLane, WorkItem } from "../../types";
import { PEOPLE, STAGES } from "../../mock";
import {
  formatDay,
  itemLight,
  remainLabel,
  stateLabel,
} from "../../logic";

import type { NavigationContext } from "./EnterpriseAdminRoot";

interface EnterprisePersonnelViewProps {
  batch: LaunchBatch;
  actor: PersonId;
  onOpenItem: (id: string) => void;
  onReassignDri: (itemId: string, newDri: PersonId) => void;
  onNudgePerson: (personId: PersonId) => void;
  navContext?: NavigationContext | null;
  onClearNavContext?: () => void;
}

interface PersonnelTableRow {
  key: string;
  person: (typeof PEOPLE)[PersonId];
  driActiveCount: number;
  confirmerPendingCount: number;
  redCount: number;
  yellowCount: number;
  confirmedCount: number;
  workloadScore: number;
  statusLevel: "overloaded" | "balanced" | "available";
  assignedItems: { lane: ResourceLane; item: WorkItem }[];
}

export const EnterprisePersonnelView: React.FC<EnterprisePersonnelViewProps> = ({
  batch,
  actor: _actor,
  onOpenItem,
  onReassignDri,
  onNudgePerson,
  navContext,
}) => {
  const [selectedPersonId, setSelectedPersonId] = useState<PersonId>(() => {
    if (navContext?.dri && navContext.dri !== "all") {
      return navContext.dri;
    }
    return "zhongzhiyong";
  });
  const [searchKeyword, setSearchKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "overloaded" | "risk">("all");

  React.useEffect(() => {
    if (navContext?.dri && navContext.dri !== "all") {
      setSelectedPersonId(navContext.dri);
    }
  }, [navContext]);

  // Aggregate stats per person
  const personnelStats = useMemo<PersonnelTableRow[]>(() => {
    return Object.values(PEOPLE).map((person) => {
      let driActiveCount = 0;
      let confirmerPendingCount = 0;
      let redCount = 0;
      let yellowCount = 0;
      let confirmedCount = 0;
      const assignedItems: { lane: ResourceLane; item: WorkItem }[] = [];

      for (const lane of batch.lanes) {
        for (const item of lane.items) {
          if (item.skipped) continue;

          if (item.driId === person.id) {
            assignedItems.push({ lane, item });
            if (item.state === "confirmed") {
              confirmedCount++;
            } else {
              driActiveCount++;
              const light = itemLight(item);
              if (light === "red") redCount++;
              else if (light === "yellow") yellowCount++;
            }
          } else if (item.confirmerId === person.id && item.state === "submitted") {
            confirmerPendingCount++;
          }
        }
      }

      // Workload Saturation (0 ~ 100%)
      const rawScore = driActiveCount * 18 + confirmerPendingCount * 12 + redCount * 20 + yellowCount * 8;
      const workloadScore = Math.min(100, Math.max(10, rawScore));
      const statusLevel = workloadScore >= 75 ? "overloaded" : workloadScore >= 45 ? "balanced" : "available";

      return {
        key: person.id,
        person,
        driActiveCount,
        confirmerPendingCount,
        redCount,
        yellowCount,
        confirmedCount,
        workloadScore,
        statusLevel,
        assignedItems,
      };
    });
  }, [batch.lanes]);

  // Filtered personnel list
  const filteredPersonnel = useMemo(() => {
    return personnelStats.filter(({ person, statusLevel, redCount, yellowCount }) => {
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        if (!person.name.toLowerCase().includes(q) && !person.title.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (roleFilter === "overloaded" && statusLevel !== "overloaded") return false;
      if (roleFilter === "risk" && redCount === 0 && yellowCount === 0) return false;
      return true;
    });
  }, [personnelStats, searchKeyword, roleFilter]);

  // Selected person detail
  const currentDetail = useMemo(() => {
    return personnelStats.find((p) => p.person.id === selectedPersonId) ?? personnelStats[0];
  }, [personnelStats, selectedPersonId]);

  // Team summary metrics
  const totalTeamCount = Object.keys(PEOPLE).length;
  const overloadedCount = personnelStats.filter((p) => p.statusLevel === "overloaded").length;
  const totalDriTasks = personnelStats.reduce((acc, p) => acc + p.driActiveCount, 0);
  const avgTasksPerPerson = (totalDriTasks / totalTeamCount).toFixed(1);

  // Personnel Table Columns
  const columns: ColumnsType<PersonnelTableRow> = [
    {
      title: "成员姓名与角色",
      key: "name",
      width: 170,
      render: (_, record) => {
        const isSelected = record.person.id === selectedPersonId;
        return (
          <Space size={10}>
            <Avatar
              size={28}
              style={{
                backgroundColor: `hsl(${record.person.hue}, 70%, 35%)`,
                fontSize: 12,
                fontWeight: 700,
                boxShadow: isSelected ? "0 0 8px var(--ent-primary)" : "none",
              }}
            >
              {record.person.initials}
            </Avatar>
            <div>
              <div style={{ fontWeight: 600, color: isSelected ? "var(--ent-primary-hover)" : "var(--ent-text-primary)" }}>
                {record.person.name}
              </div>
              <div style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>
                {record.person.title}
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: "负载饱和度",
      key: "workload",
      width: 170,
      sorter: (a, b) => a.workloadScore - b.workloadScore,
      render: (_, record) => {
        const isOver = record.statusLevel === "overloaded";
        const strokeColor = isOver ? "#f43f5e" : record.workloadScore >= 45 ? "#f59e0b" : "#10b981";
        return (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
              <span style={{ color: isOver ? "var(--ent-rose)" : "var(--ent-text-secondary)" }}>
                {isOver ? "超负荷预警" : "正常推进"}
              </span>
              <span style={{ fontFamily: "var(--ent-font-mono)", fontWeight: 700, color: strokeColor }}>
                {record.workloadScore}%
              </span>
            </div>
            <Progress
              percent={record.workloadScore}
              showInfo={false}
              size="small"
              strokeColor={strokeColor}
            />
          </div>
        );
      },
    },
    {
      title: "主责在制",
      dataIndex: "driActiveCount",
      key: "driActiveCount",
      width: 90,
      align: "center",
      sorter: (a, b) => a.driActiveCount - b.driActiveCount,
      render: (count: number) => (
        <span style={{ fontFamily: "var(--ent-font-mono)", fontWeight: 600, color: "var(--ent-text-primary)" }}>
          {count}
        </span>
      ),
    },
    {
      title: "待审门禁",
      dataIndex: "confirmerPendingCount",
      key: "confirmerPendingCount",
      width: 90,
      align: "center",
      render: (count: number) => (
        <span style={{ fontFamily: "var(--ent-font-mono)", color: "var(--ent-primary-hover)" }}>
          {count}
        </span>
      ),
    },
    {
      title: "风险红黄项",
      key: "risks",
      width: 110,
      align: "center",
      render: (_, record) => {
        if (record.redCount > 0) {
          return <Tag color="error">逾期 {record.redCount}</Tag>;
        }
        if (record.yellowCount > 0) {
          return <Tag color="warning">临期 {record.yellowCount}</Tag>;
        }
        return <Tag color="success">正常</Tag>;
      },
    },
    {
      title: "已完成",
      dataIndex: "confirmedCount",
      key: "confirmedCount",
      width: 80,
      align: "center",
      render: (count: number) => (
        <span style={{ fontFamily: "var(--ent-font-mono)", color: "var(--ent-text-muted)" }}>
          {count}
        </span>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 80,
      align: "center",
      render: (_, record) => {
        const isSelected = record.person.id === selectedPersonId;
        return (
          <Button
            size="small"
            type={isSelected ? "primary" : "text"}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPersonId(record.person.id);
            }}
            style={{ fontSize: 11, padding: "0 6px" }}
          >
            穿透 <ChevronRight size={11} style={{ marginLeft: 2 }} />
          </Button>
        );
      },
    },
  ];

  return (
    <div className="ent-personnel-view">
      {/* 1. Top Prioritized Personnel Metric Architecture (Hero Overload Alert + Team Matrix) */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: 14, marginBottom: 16 }}>
        {/* Primary Hero Overload Alert Card */}
        <div
          className="ent-card-shell"
          style={{ cursor: "pointer" }}
          onClick={() => setRoleFilter(roleFilter === "overloaded" ? "all" : "overloaded")}
          role="button"
          tabIndex={0}
        >
          <div
            className="ent-card-inner"
            style={{
              borderLeft: "4px solid var(--ent-rose)",
              background: roleFilter === "overloaded" ? "var(--ent-rose-dim)" : "var(--ent-bg-card)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--ent-rose)" }}>
                  <Flame size={15} />
                  <span>核心人力瓶颈告警 (Capacity Alert)</span>
                </div>
                <Tag color="error" style={{ margin: 0, fontSize: 10 }}>
                  {roleFilter === "overloaded" ? "已激活过滤" : "点击过滤过载成员"}
                </Tag>
              </div>

              <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "4px 0" }}>
                <span style={{ fontFamily: "var(--ent-font-mono)", fontSize: 32, fontWeight: 850, color: "var(--ent-rose)", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
                  {overloadedCount}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ent-text-secondary)" }}>
                  位主责严重超负荷 (饱和度 &gt; 75%)
                </span>
              </div>
            </div>

            <div style={{ fontSize: 11, color: "var(--ent-rose)", display: "flex", alignItems: "center", gap: 6, marginTop: 8, paddingTop: 6, borderTop: "1px solid var(--ent-border-subtle)" }}>
              <span>任务堆积易引发门禁逾期，建议即时在右侧分流改派</span>
            </div>
          </div>
        </div>

        {/* Secondary Team Metric 3-Pod Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <Card
            size="small"
            style={{ background: "var(--ent-bg-card)", borderColor: "var(--ent-border-subtle)" }}
          >
            <Statistic
              title={<span style={{ color: "var(--ent-text-secondary)", fontSize: 12 }}>专职交付团队</span>}
              value={totalTeamCount}
              suffix={<span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>位主责</span>}
              valueStyle={{ color: "var(--ent-text-primary)", fontWeight: 700, fontSize: 20, fontFamily: "var(--ent-font-mono)" }}
              prefix={<Users size={16} style={{ color: "var(--ent-primary-hover)", marginRight: 4 }} />}
            />
            <div style={{ marginTop: 4, fontSize: 11, color: "var(--ent-text-muted)" }}>
              覆盖 7 大交付关键工序
            </div>
          </Card>

          <Card
            size="small"
            style={{ background: "var(--ent-bg-card)", borderColor: "var(--ent-border-subtle)" }}
          >
            <Statistic
              title={<span style={{ color: "var(--ent-text-secondary)", fontSize: 12 }}>在制工序总量</span>}
              value={totalDriTasks}
              suffix={<span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>项执行中</span>}
              valueStyle={{ color: "var(--ent-primary-hover)", fontWeight: 700, fontSize: 20, fontFamily: "var(--ent-font-mono)" }}
              prefix={<Zap size={16} style={{ color: "var(--ent-primary-hover)", marginRight: 4 }} />}
            />
            <div style={{ marginTop: 4, fontSize: 11, color: "var(--ent-text-muted)" }}>
              人均承接 {avgTasksPerPerson} 项工序
            </div>
          </Card>

          <Card
            size="small"
            style={{ background: "var(--ent-bg-card)", borderColor: "var(--ent-border-subtle)" }}
          >
            <Statistic
              title={<span style={{ color: "var(--ent-text-secondary)", fontSize: 12 }}>门禁独立审核规范</span>}
              value={100}
              suffix={<span style={{ fontSize: 11, color: "var(--ent-emerald)" }}>% 合规</span>}
              valueStyle={{ color: "var(--ent-emerald)", fontWeight: 700, fontSize: 20, fontFamily: "var(--ent-font-mono)" }}
              prefix={<ShieldCheck size={16} style={{ color: "var(--ent-emerald)", marginRight: 4 }} />}
            />
            <div style={{ marginTop: 4, fontSize: 11, color: "var(--ent-text-muted)" }}>
              把关人与主责 100% 隔离
            </div>
          </Card>
        </div>
      </div>

      {/* 2. Main Two-Column Layout: Table + Deep Dive Panel */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Left: Personnel Table */}
        <Card
          size="small"
          style={{ background: "var(--ent-bg-card)", borderColor: "var(--ent-border-subtle)" }}
          styles={{
            header: { borderBottom: "1px solid var(--ent-border-subtle)", padding: "10px 14px" },
            body: { padding: 0 },
          }}
          title={
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <Space size={8}>
                <Users size={16} style={{ color: "var(--ent-primary-hover)" }} />
                <span style={{ fontWeight: 700, color: "var(--ent-text-primary)", fontSize: 13 }}>
                  团队全景负荷与效能台账
                </span>
                <Badge count={filteredPersonnel.length} style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#fff" }} />
              </Space>

              <Space size={8}>
                <Input
                  placeholder="搜索人员或岗位..."
                  prefix={<Search size={13} style={{ color: "var(--ent-text-muted)" }} />}
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  allowClear
                  size="small"
                  style={{ width: 150 }}
                />

                <Segmented
                  size="small"
                  value={roleFilter}
                  onChange={(val) => setRoleFilter(val as "all" | "overloaded" | "risk")}
                  options={[
                    { label: "全部", value: "all" },
                    { label: "过载", value: "overloaded" },
                    { label: "风险", value: "risk" },
                  ]}
                  style={{ background: "var(--ent-bg-surface)", border: "1px solid var(--ent-border-subtle)" }}
                />
              </Space>
            </div>
          }
        >
          <Table<PersonnelTableRow>
            rowKey="key"
            columns={columns}
            dataSource={filteredPersonnel}
            size="middle"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            onRow={(record) => ({
              onClick: () => setSelectedPersonId(record.person.id),
              style: {
                cursor: "pointer",
                backgroundColor: record.person.id === selectedPersonId ? "var(--ent-primary-dim)" : undefined,
              },
            })}
          />
        </Card>

        {/* Right: Selected Person Deep Dive & Task Reassignment Panel */}
        <Card
          size="small"
          style={{ background: "var(--ent-bg-card)", borderColor: "var(--ent-border-subtle)" }}
          styles={{
            header: { borderBottom: "1px solid var(--ent-border-subtle)", padding: "10px 14px" },
            body: { padding: 14, display: "flex", flexDirection: "column", gap: 12 },
          }}
          title={
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Space size={10}>
                <Avatar
                  size={32}
                  style={{
                    backgroundColor: `hsl(${currentDetail.person.hue}, 70%, 35%)`,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {currentDetail.person.initials}
                </Avatar>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 700, color: "var(--ent-text-primary)", fontSize: 13 }}>
                      {currentDetail.person.name}
                    </span>
                    {currentDetail.statusLevel === "overloaded" ? (
                      <Tag color="error" style={{ margin: 0 }}>负荷过载</Tag>
                    ) : (
                      <Tag color="success" style={{ margin: 0 }}>适中推进</Tag>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>
                    {currentDetail.person.title} · 主责: {currentDetail.driActiveCount} 项 · 待审: {currentDetail.confirmerPendingCount} 项
                  </div>
                </div>
              </Space>

              <Button
                type="primary"
                size="small"
                icon={<Send size={12} />}
                onClick={() => onNudgePerson(currentDetail.person.id)}
              >
                一键催办此人
              </Button>
            </div>
          }
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ent-text-secondary)" }}>
            名下工作项与现场改派调度 ({currentDetail.assignedItems.length} 项)
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, maxHeight: 460 }}>
            {currentDetail.assignedItems.length === 0 ? (
              <Empty description="当前人员名下无正在推进的任务" style={{ margin: "40px 0" }} />
            ) : (
              currentDetail.assignedItems.map(({ lane, item }) => {
                const light = itemLight(item);
                const isRed = light === "red";
                const isYellow = light === "yellow";
                const isDone = item.state === "confirmed";
                const stageObj = STAGES.find((s) => s.key === item.stage);

                return (
                  <Card
                    key={item.id}
                    size="small"
                    style={{
                      background: "var(--ent-bg-surface)",
                      borderColor: isRed
                        ? "rgba(239, 68, 68, 0.4)"
                        : isYellow
                        ? "rgba(245, 158, 11, 0.4)"
                        : "var(--ent-border-subtle)",
                    }}
                    styles={{ body: { padding: "10px 12px" } }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 600, color: "var(--ent-text-primary)", fontSize: 13 }}>
                            {lane.name}
                          </span>
                          <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>
                            {stageObj?.name ?? item.stage}
                          </Tag>
                          <Tag color={isDone ? "success" : isRed ? "error" : "default"} style={{ margin: 0, fontSize: 10 }}>
                            {stateLabel(item)}
                          </Tag>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ent-text-muted)", marginTop: 4 }}>
                          {lane.type} · 截止: {formatDay(item.dueAt)} ({remainLabel(item.dueAt)})
                        </div>
                      </div>

                      <Tooltip title="进入工序交付详情">
                        <Button
                          type="text"
                          size="small"
                          icon={<ExternalLink size={12} />}
                          onClick={() => onOpenItem(item.id)}
                          style={{ color: "var(--ent-primary-hover)" }}
                        />
                      </Tooltip>
                    </div>

                    {/* Reassign select dropdown to balance workload */}
                    {!isDone && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginTop: 8,
                          paddingTop: 8,
                          borderTop: "1px solid var(--ent-border-subtle)",
                          fontSize: 11,
                        }}
                      >
                        <Space size={4} style={{ color: "var(--ent-text-muted)" }}>
                          <RotateCcw size={11} />
                          <span>分流改派至其他同事:</span>
                        </Space>
                        <Select
                          value={item.driId}
                          onChange={(newDri) => {
                            onReassignDri(item.id, newDri);
                            message.success(`已将【${lane.name}】改派给 @${PEOPLE[newDri]?.name}`);
                          }}
                          size="small"
                          style={{ width: 140 }}
                          options={Object.values(PEOPLE).map((p) => ({
                            label: `@${p.name} (${p.title.slice(0, 4)})`,
                            value: p.id,
                          }))}
                        />
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* 3. RACI & Stage-Role Responsibility Matrix */}
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
              <Layers size={16} style={{ color: "var(--ent-primary-hover)" }} />
              <span style={{ fontWeight: 700, color: "var(--ent-text-primary)", fontSize: 13 }}>
                标准交付工序责任矩阵 (RACI / Stage-Role Mapping)
              </span>
            </Space>
            <span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>
              遵循单一主责制 (DRI) · 门禁把关人独立
            </span>
          </div>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12 }}>
          {STAGES.map((st, idx) => {
            const driNames = Array.from(
              new Set(
                batch.lanes
                  .map((l) => l.items.find((x) => x.stage === st.key)?.driId)
                  .filter(Boolean)
                  .map((id) => PEOPLE[id!]?.name)
              )
            );
            const confirmerNames = Array.from(
              new Set(
                batch.lanes
                  .map((l) => l.items.find((x) => x.stage === st.key)?.confirmerId)
                  .filter(Boolean)
                  .map((id) => PEOPLE[id!]?.name)
              )
            );

            return (
              <Card
                key={st.key}
                size="small"
                style={{ background: "var(--ent-bg-surface)", borderColor: "var(--ent-border-subtle)" }}
                styles={{ body: { padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 } }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, color: "var(--ent-primary-hover)", fontFamily: "var(--ent-font-mono)" }}>
                    0{idx + 1}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ent-text-primary)" }}>
                    {st.name}
                  </span>
                </div>

                <div style={{ fontSize: 11, color: "var(--ent-text-muted)", marginTop: 4 }}>
                  <span style={{ color: "var(--ent-text-secondary)" }}>主要主责：</span>
                  <div>{driNames.slice(0, 2).map((n) => `@${n}`).join(", ") || "未绑定"}</div>
                </div>

                <div style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>
                  <span style={{ color: "var(--ent-text-secondary)" }}>门禁确认人：</span>
                  <div style={{ color: "var(--ent-primary-hover)" }}>
                    {confirmerNames.slice(0, 2).map((n) => `@${n}`).join(", ") || "无需"}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
