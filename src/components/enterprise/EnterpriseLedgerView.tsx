import React, { useState, useMemo } from "react";
import {
  Copy,
  Download,
  ExternalLink,
  Search,
  Send,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { LaunchBatch, Light, PersonId, ResourceLane, WorkItem } from "../../types";
import { PEOPLE, STAGES } from "../../mock";
import {
  currentItem,
  formatDay,
  getAssetCategory,
  itemLight,
  remainLabel,
  stateLabel,
} from "../../logic";

interface EnterpriseLedgerViewProps {
  batch: LaunchBatch;
  actor: PersonId;
  onOpenItem: (id: string) => void;
  onNudgeItem: (item: WorkItem, lane: ResourceLane) => void;
  onExportCsv: () => void;
  onGenerateReport?: () => void;
}

interface LedgerTableRow {
  key: string;
  lane: ResourceLane;
  laneName: string;
  type: string;
  category: string;
  stageName: string;
  stageKey: string;
  driId: PersonId;
  confirmerId: PersonId;
  dueAt: string;
  light: Light;
  state: WorkItem["state"];
  vertexCount?: number;
  drawCall?: number;
  textureSpec?: string;
  svnRev?: number;
  item: WorkItem;
}

export const EnterpriseLedgerView: React.FC<EnterpriseLedgerViewProps> = ({
  batch,
  actor: _actor,
  onOpenItem,
  onNudgeItem,
  onExportCsv,
  onGenerateReport,
}) => {
  const [keyword, setKeyword] = useState("");
  const [selectedLaneIds, setSelectedLaneIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stageFilter, setStageFilter] = useState("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    batch.lanes.forEach((l) => set.add(getAssetCategory(l.type)));
    return Array.from(set);
  }, [batch.lanes]);

  const filteredLanes = useMemo(() => {
    return batch.lanes.filter((l) => {
      if (categoryFilter !== "all" && getAssetCategory(l.type) !== categoryFilter) return false;
      const cur = currentItem(l);
      if (stageFilter !== "all" && cur && cur.stage !== stageFilter) return false;
      if (keyword.trim()) {
        const q = keyword.toLowerCase();
        const curDri = cur ? PEOPLE[cur.driId]?.name ?? cur.driId : "";
        if (!l.name.toLowerCase().includes(q) && !l.type.toLowerCase().includes(q) && !curDri.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [batch.lanes, categoryFilter, stageFilter, keyword]);

  // Map to LedgerTableRow
  const tableData = useMemo<LedgerTableRow[]>(() => {
    return filteredLanes
      .map((lane) => {
        const cur = currentItem(lane);
        if (!cur) return null;
        const stageObj = STAGES.find((s) => s.key === cur.stage);
        const ev = cur.evidence || {};
        return {
          key: lane.id,
          lane,
          laneName: lane.name,
          type: lane.type,
          category: getAssetCategory(lane.type),
          stageName: stageObj?.name ?? cur.stage,
          stageKey: cur.stage,
          driId: cur.driId,
          confirmerId: cur.confirmerId,
          dueAt: cur.dueAt,
          light: itemLight(cur),
          state: cur.state,
          vertexCount: ev.vertexCount,
          drawCall: ev.drawCall,
          textureSpec: ev.textureSpec,
          svnRev: ev.svnRev,
          item: cur,
        };
      })
      .filter(Boolean) as LedgerTableRow[];
  }, [filteredLanes]);

  // Batch Nudge Selected
  const handleBatchNudgeSelected = () => {
    if (selectedLaneIds.length === 0) {
      message.warning("请先勾选需要催办的资产");
      return;
    }
    const selectedLanes = batch.lanes.filter((l) => selectedLaneIds.includes(l.id));
    const lines = [
      `【ElfShip · 企业级资产交付督办通报】`,
      `· 批次：${batch.name}（上线日 ${formatDay(batch.launchDate)}）`,
      `· 重点督办清单（共 ${selectedLanes.length} 项）：`,
      ...selectedLanes.map((l, i) => {
        const cur = currentItem(l);
        const dri = cur ? PEOPLE[cur.driId]?.name ?? cur.driId : "未指派";
        const st = cur ? STAGES.find((s) => s.key === cur.stage)?.name ?? cur.stage : "-";
        return `  ${i + 1}. ${l.name} [${st}] @${dri} 截止 ${cur ? formatDay(cur.dueAt) : "-"}`;
      }),
      `· 请相关主责同学按 SOP 规范推进并上传版本。`,
    ].join("\n");

    try {
      navigator.clipboard.writeText(lines);
      message.success(`已生成 ${selectedLanes.length} 项资产的督办通报至剪贴板！`);
    } catch {
      message.info("已生成督办通报");
    }
  };

  // Ant Design Table Columns
  const columns: ColumnsType<LedgerTableRow> = [
    {
      title: "资产名称与类型",
      key: "name",
      width: 190,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: "var(--ent-text-primary)", fontSize: 13 }}>{record.laneName}</div>
          <Space size={4} style={{ marginTop: 2 }}>
            <span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>{record.type}</span>
            <Tag color="blue" style={{ fontSize: 10, margin: 0, padding: "0 4px" }}>
              {record.category}
            </Tag>
          </Space>
        </div>
      ),
    },
    {
      title: "当前工序",
      key: "stage",
      width: 120,
      render: (_, record) => (
        <Tag color="blue" style={{ margin: 0, fontWeight: 500 }}>
          {record.stageName}
        </Tag>
      ),
    },
    {
      title: "主责人",
      key: "dri",
      width: 110,
      render: (_, record) => {
        const dri = PEOPLE[record.driId];
        return <span style={{ color: "var(--ent-text-primary)", fontSize: 12 }}>@{dri?.name ?? record.driId}</span>;
      },
    },
    {
      title: "确认人",
      key: "confirmer",
      width: 110,
      render: (_, record) => {
        const conf = PEOPLE[record.confirmerId];
        return <span style={{ color: "var(--ent-text-muted)", fontSize: 12 }}>@{conf?.name ?? record.confirmerId}</span>;
      },
    },
    {
      title: "截止日期",
      dataIndex: "dueAt",
      key: "dueAt",
      width: 115,
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
      title: "工程技术规范",
      key: "specs",
      width: 170,
      render: (_, record) => {
        if (record.vertexCount) {
          return (
            <span style={{ fontFamily: "var(--ent-font-mono)", fontSize: 11, color: "var(--ent-text-secondary)" }}>
              {record.vertexCount.toLocaleString()}面 · {record.drawCall ?? "-"}DC
            </span>
          );
        }
        if (record.textureSpec) {
          return (
            <span style={{ fontFamily: "var(--ent-font-mono)", fontSize: 11, color: "var(--ent-text-secondary)" }}>
              {record.textureSpec}
            </span>
          );
        }
        return <span style={{ fontSize: 11, color: "var(--ent-text-muted)" }}>标品规范</span>;
      },
    },
    {
      title: "SVN 版本号",
      key: "svn",
      width: 110,
      render: (_, record) => {
        if (!record.svnRev) {
          return <span style={{ color: "var(--ent-text-muted)" }}>-</span>;
        }
        return (
          <Tag style={{ fontFamily: "var(--ent-font-mono)", fontSize: 11, margin: 0, borderColor: "var(--ent-border-strong)", background: "var(--ent-primary-dim)", color: "var(--ent-primary-hover)" }}>
            r{record.svnRev}
          </Tag>
        );
      },
    },
    {
      title: "状态",
      key: "state",
      width: 100,
      render: (_, record) => (
        <span style={{ fontSize: 12, color: record.state === "confirmed" ? "var(--ent-emerald)" : "var(--ent-text-primary)" }}>
          {stateLabel(record.item)}
        </span>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 130,
      align: "center",
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="催办主责人">
            <Button
              type="text"
              size="small"
              icon={<Send size={12} />}
              onClick={() => onNudgeItem(record.item, record.lane)}
              style={{ color: "var(--ent-amber)", padding: "0 4px", fontSize: 12 }}
            >
              催办
            </Button>
          </Tooltip>
          <Tooltip title="查看质检与工序详情">
            <Button
              type="link"
              size="small"
              icon={<ExternalLink size={12} />}
              onClick={() => onOpenItem(record.item.id)}
              style={{ color: "var(--ent-primary-hover)", padding: "0 4px", fontSize: 12 }}
            >
              质检
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="ent-ledger-view">
      {/* Top Standardized Filter & Batch Action Bar */}
      <Card
        size="small"
        style={{
          background: "var(--ent-bg-card)",
          borderColor: "var(--ent-border-subtle)",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <Space size={10} wrap>
            <Input
              placeholder="搜索资产、分类、主责人..."
              prefix={<Search size={14} style={{ color: "var(--ent-text-muted)" }} />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              allowClear
              style={{ width: 220 }}
            />

            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ width: 140 }}
              options={[
                { label: "全部分类", value: "all" },
                ...categories.map((c) => ({ label: c, value: c })),
              ]}
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
          </Space>

          {/* Right Batch Operations */}
          <Space size={8}>
            <span style={{ fontSize: 12, color: "var(--ent-text-muted)" }}>
              已勾选 <span style={{ color: "var(--ent-primary-hover)", fontWeight: 700 }}>{selectedLaneIds.length}</span> 项
            </span>
            {selectedLaneIds.length > 0 && (
              <>
                <Badge count={selectedLaneIds.length} style={{ backgroundColor: "var(--ent-primary)", color: "#fff" }} />
                <Button
                  type="primary"
                  size="small"
                  icon={<Send size={13} />}
                  onClick={handleBatchNudgeSelected}
                >
                  批量督办广播
                </Button>
              </>
            )}

            <Button
              size="small"
              icon={<Download size={13} />}
              onClick={onExportCsv}
            >
              导出 CSV
            </Button>

            {onGenerateReport && (
              <Button
                size="small"
                icon={<Copy size={13} />}
                onClick={onGenerateReport}
              >
                生成日报富文本
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {/* High-Density Ant Design Table */}
      <Card
        size="small"
        style={{ background: "var(--ent-bg-card)", borderColor: "var(--ent-border-subtle)" }}
        styles={{ body: { padding: 0 } }}
      >
        <Table<LedgerTableRow>
          rowKey="key"
          columns={columns}
          dataSource={tableData}
          size="middle"
          rowSelection={{
            selectedRowKeys: selectedLaneIds,
            onChange: (keys) => setSelectedLaneIds(keys as string[]),
          }}
          pagination={{
            pageSize: 12,
            showSizeChanger: true,
            pageSizeOptions: ["12", "20", "50"],
            showTotal: (total) => (
              <span style={{ fontSize: 12, color: "var(--ent-text-muted)" }}>
                共计 {total} 项交付资产
              </span>
            ),
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};
