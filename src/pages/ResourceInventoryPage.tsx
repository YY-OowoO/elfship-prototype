import { useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Input,
  Progress,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  SquaresFour,
  Rows,
  MagnifyingGlass,
  BellRinging,
  ShieldCheck,
  DownloadSimple,
  UserCircle,
  Eye,
  Copy,
} from "../icons";
import { EmotionBall } from "../emotion-ball";
import { PEOPLE, STAGES } from "../mock";
import { currentItem, itemLight, laneLight, progress, stateLabel, remainLabel, getAssetCategory, getAssetCategoryList, formatPercent } from "../logic";
import type { LaunchBatch, PersonId, ResourceLane, WorkItem } from "../types";
import { AssetTypeBadge, ItemStatusIcon, StageIcon } from "../icons";
import { playSound } from "../sound";

const { Text, Title } = Typography;

export function ResourceInventoryPage({
  batch,
  onOpenItem,
  onNudge,
}: {
  batch: LaunchBatch;
  onOpenItem: (id: string) => void;
  onNudge?: (item: WorkItem, lane: ResourceLane) => void;
}) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchKw, setSearchKw] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [selectedDri, setSelectedDri] = useState<string>("all");
  const [selectedLaneIds, setSelectedLaneIds] = useState<string[]>([]);

  const lanes = batch.lanes;

  // Compute Metrics
  const totalLanes = lanes.length;
  const doneLanes = lanes.filter((l) => {
    const p = progress(l);
    return p.total > 0 && p.done === p.total;
  }).length;
  const redLanes = lanes.filter((l) => laneLight(l) === "red");
  const watchLanes = lanes.filter((l) => laneLight(l) === "yellow");
  const passRate = totalLanes > 0 ? Math.round(((totalLanes - redLanes.length) / totalLanes) * 100) : 100;

  // Dynamic Categories from Batch
  const categoryList = useMemo(() => getAssetCategoryList(lanes), [lanes]);

  // Live Count by Status
  const countRisk = redLanes.length;
  const countWatch = watchLanes.length;
  const countDone = doneLanes;

  // Filtered Lanes
  const filteredLanes = useMemo(() => {
    return lanes.filter((lane) => {
      const cur = currentItem(lane);
      const light = laneLight(lane);

      // Search keyword
      if (searchKw.trim()) {
        const kw = searchKw.toLowerCase();
        const matchName = lane.name.toLowerCase().includes(kw);
        const matchDri = PEOPLE[cur.driId as PersonId]?.name.toLowerCase().includes(kw);
        const matchSvn = cur.evidence?.svnPath?.toLowerCase().includes(kw);
        if (!matchName && !matchDri && !matchSvn) return false;
      }

      // Filter by type category
      if (selectedType !== "all") {
        if (getAssetCategory(lane.type) !== selectedType) return false;
      }

      // Filter by status light
      if (selectedStatus !== "all") {
        if (selectedStatus === "risk" && light !== "red") return false;
        if (selectedStatus === "watch" && light !== "yellow") return false;
        if (selectedStatus === "done") {
          const p = progress(lane);
          if (!(p.total > 0 && p.done === p.total)) return false;
        }
      }

      // Filter by stage
      if (selectedStage !== "all" && cur.stage !== selectedStage) return false;

      // Filter by DRI
      if (selectedDri !== "all" && cur.driId !== selectedDri) return false;

      return true;
    });
  }, [lanes, searchKw, selectedType, selectedStatus, selectedStage, selectedDri]);

  // Table Columns Definition
  const columns: TableColumnsType<ResourceLane> = [
    {
      title: "选择",
      dataIndex: "id",
      width: 46,
      align: "center",
      render: (id: string) => (
        <Checkbox
          checked={selectedLaneIds.includes(id)}
          onChange={(e) => {
            if (e.target.checked) setSelectedLaneIds((prev) => [...prev, id]);
            else setSelectedLaneIds((prev) => prev.filter((x) => x !== id));
          }}
        />
      ),
    },
    {
      title: "数字资产名称与包体",
      dataIndex: "name",
      width: 240,
      render: (name: string, record: ResourceLane) => {
        const cur = currentItem(record);
        const light = laneLight(record);
        const is3D = record.type.startsWith("3D");
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <EmotionBall
              emotion={
                cur.locked
                  ? "06"
                  : light === "red"
                  ? "34"
                  : light === "yellow"
                  ? "11"
                  : cur.state === "confirmed"
                  ? "33"
                  : is3D
                  ? "30"
                  : "02"
              }
              size={28}
              shape={is3D ? "wedge" : record.type.includes("特效") ? "gem" : "blob"}
              interactive={false}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{name}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                <span style={{ fontFamily: "var(--mono)" }}>{cur.evidence?.svnRev ?? "r98412"}</span> ·{" "}
                {cur.evidence?.svnPath ? cur.evidence.svnPath.split("/").pop() : "asset_pkg_v1"}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: "类型",
      dataIndex: "type",
      width: 110,
      render: (type: string) => <AssetTypeBadge type={type} size={11} />,
    },
    {
      title: "当前工序阶段",
      key: "stage",
      width: 140,
      render: (_, record) => {
        const cur = currentItem(record);
        const stageDef = STAGES.find((s) => s.key === cur.stage);
        return (
          <Tag color="blue" style={{ display: "inline-flex", alignItems: "center", gap: 4, margin: 0 }}>
            <StageIcon stage={cur.stage} size={12} />
            <span>{stageDef?.name ?? cur.stage}</span>
          </Tag>
        );
      },
    },
    {
      title: "工序健康态",
      key: "status",
      width: 130,
      render: (_, record) => {
        const cur = currentItem(record);
        const light = itemLight(cur);
        return (
          <Tag
            color={light === "red" ? "error" : light === "yellow" ? "warning" : cur.state === "confirmed" ? "success" : "default"}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, margin: 0 }}
          >
            <ItemStatusIcon item={cur} size={12} />
            <span>{stateLabel(cur)}</span>
          </Tag>
        );
      },
    },
    {
      title: "管线总进度",
      key: "progress",
      width: 140,
      render: (_, record) => {
        const p = progress(record);
        const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
        const isDone = p.total > 0 && p.done === p.total;
        return (
          <div style={{ width: 110 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}>
              <span style={{ color: "#64748b" }}>{p.done}/{p.total} 步</span>
              <span style={{ fontWeight: 600, color: isDone ? "#52c41a" : "#1677ff" }}>{pct}%</span>
            </div>
            <Progress percent={pct} size="small" showInfo={false} strokeColor={isDone ? "#52c41a" : "#1677ff"} />
          </div>
        );
      },
    },
    {
      title: "主责人",
      key: "dri",
      width: 110,
      render: (_, record) => {
        const cur = currentItem(record);
        const person = PEOPLE[cur.driId as PersonId];
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <UserCircle size={14} weight="duotone" color="#1677ff" />
            <span style={{ fontSize: 12, color: "#334155" }}>{person?.name ?? cur.driId}</span>
          </div>
        );
      },
    },
    {
      title: "工期截止",
      key: "due",
      width: 120,
      render: (_, record) => {
        const cur = currentItem(record);
        const light = itemLight(cur);
        return (
          <div style={{ fontSize: 11 }}>
            <div style={{ fontWeight: 500, color: "#0f172a" }}>{cur.dueAt}</div>
            <div style={{ color: light === "red" ? "#ff4d4f" : light === "yellow" ? "#faad14" : "#94a3b8" }}>
              {remainLabel(cur.dueAt)}
            </div>
          </div>
        );
      },
    },
    {
      title: "操作",
      key: "action",
      width: 110,
      align: "center",
      render: (_, record) => {
        const cur = currentItem(record);
        return (
          <Space size={6}>
            <Button
              size="small"
              type="primary"
              ghost
              icon={<Eye size={12} />}
              onClick={() => onOpenItem(cur.id)}
            >
              检视
            </Button>
            {onNudge && itemLight(cur) === "red" && (
              <Button
                size="small"
                danger
                icon={<BellRinging size={12} />}
                onClick={() => onNudge(cur, record)}
              >
                催办
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="res-universe-page view-in">
      {/* 1. Header Banner & Universe Summary Metrics */}
      <div className="res-universe-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Title level={3} style={{ margin: 0, fontWeight: 800, letterSpacing: "-0.02em" }}>
              数字资产全景中台
            </Title>
            <Tag color="cyan" style={{ fontWeight: 600, fontSize: 11 }}>
              Studio Asset Universe
            </Tag>
          </div>
          <Text type="secondary" style={{ fontSize: 13 }}>
            统一把控全批次 3D 模型、2D 原画、骨骼动画、特效粒子与音效资产的研发交付流转全景
          </Text>
        </div>

        {/* 4 Stats Cards (Clickable Quick Filters) */}
        <div className="res-universe-stats-grid">
          <div
            className={`res-stat-card${selectedStatus === "all" ? " is-active" : ""}`}
            title="点击查看全部资产"
            onClick={() => {
              playSound.click();
              setSelectedStatus("all");
              setSelectedType("all");
              setSelectedStage("all");
            }}
          >
            <div className="res-stat-val text-blue">{totalLanes}</div>
            <div className="res-stat-lbl">资产总数</div>
          </div>
          <div
            className={`res-stat-card${selectedStatus === "done" ? " is-active" : ""}`}
            title="点击仅看已通关入库资产"
            onClick={() => {
              playSound.click();
              setSelectedStatus("done");
            }}
          >
            <div className="res-stat-val text-green">{doneLanes}</div>
            <div className="res-stat-lbl">已通关入库</div>
          </div>
          <div
            className={`res-stat-card${selectedStatus === "risk" ? " is-active" : ""}`}
            title="点击仅看阻塞与退回资产"
            onClick={() => {
              playSound.focus();
              setSelectedStatus("risk");
            }}
          >
            <div className="res-stat-val text-red">{redLanes.length}</div>
            <div className="res-stat-lbl">阻塞与退回</div>
          </div>
          <div
            className={`res-stat-card${selectedStatus === "watch" ? " is-active" : ""}`}
            title="点击仅看临期预警资产"
            onClick={() => {
              playSound.click();
              setSelectedStatus(selectedStatus === "watch" ? "all" : "watch");
            }}
          >
            <div className="res-stat-val text-purple">{formatPercent(passRate)}</div>
            <div className="res-stat-lbl">管线合规率</div>
          </div>
        </div>
      </div>

      {/* 2. Advanced Multi-Filter Toolbar */}
      <div className="res-universe-toolbar">
        <Space size={10} wrap style={{ flex: 1 }}>
          <Input
            placeholder="搜索资产名称、主责人、SVN 路径..."
            prefix={<MagnifyingGlass size={14} color="#94a3b8" />}
            value={searchKw}
            onChange={(e) => setSearchKw(e.target.value)}
            allowClear
            style={{ width: 230 }}
            size="middle"
          />

          <Select
            value={selectedType}
            onChange={(v) => {
              setSelectedType(v);
              playSound.click();
            }}
            style={{ width: 140 }}
            options={[
              { label: `全部类型 (${lanes.length})`, value: "all" },
              ...categoryList.map((c) => ({
                label: `${c.label} (${c.count})`,
                value: c.key,
              })),
            ]}
          />

          <Select
            value={selectedStatus}
            onChange={(v) => {
              setSelectedStatus(v);
              playSound.click();
            }}
            style={{ width: 140 }}
            options={[
              { label: `全部状态 (${lanes.length})`, value: "all" },
              { label: `阻塞/退回 (${countRisk})`, value: "risk" },
              { label: `临期预警 (${countWatch})`, value: "watch" },
              { label: `已通关入库 (${countDone})`, value: "done" },
            ]}
          />

          <Select
            value={selectedStage}
            onChange={(v) => {
              setSelectedStage(v);
              playSound.click();
            }}
            style={{ width: 130 }}
            options={[
              { label: `全部阶段 (${lanes.length})`, value: "all" },
              ...STAGES.map((s) => {
                const count = lanes.filter((l) => currentItem(l).stage === s.key).length;
                return { label: `${s.name} (${count})`, value: s.key };
              }),
            ]}
          />

          <Select
            value={selectedDri}
            onChange={(v) => {
              setSelectedDri(v);
              playSound.click();
            }}
            style={{ width: 120 }}
            options={[
              { label: "全部主责人", value: "all" },
              ...Object.values(PEOPLE).map((p) => {
                const count = lanes.filter((l) => currentItem(l).driId === p.id).length;
                return { label: `${p.name} (${count})`, value: p.id };
              }),
            ]}
          />
        </Space>

        {/* Right: View Mode Toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Segmented
            value={viewMode}
            onChange={(v) => {
              setViewMode(v as "grid" | "table");
              playSound.click();
            }}
            options={[
              {
                value: "grid",
                icon: <SquaresFour size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />,
                label: "画廊视图",
              },
              {
                value: "table",
                icon: <Rows size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />,
                label: "数据表格",
              },
            ]}
          />
        </div>
      </div>

      {/* 3. Batch Action Dock (Floating when items selected) */}
      {selectedLaneIds.length > 0 && (
        <div className="res-batch-dock">
          <Space size={12}>
            <span style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>
              已选中 {selectedLaneIds.length} 项资产
            </span>
            <Button
              size="small"
              type="primary"
              icon={<ShieldCheck size={14} />}
              onClick={() => {
                playSound.shimmer();
                message.success(`已对选中的 ${selectedLaneIds.length} 项资产触发 AYON 批量自动化门禁质检`);
              }}
            >
              批量门禁扫描
            </Button>
            <Button
              size="small"
              icon={<BellRinging size={14} />}
              onClick={() => {
                playSound.focus();
                message.info(`已向相关主责人员批量发送交付进度提醒通知`);
              }}
            >
              批量催办
            </Button>
            <Button
              size="small"
              icon={<DownloadSimple size={14} />}
              onClick={() => {
                playSound.click();
                message.success("资产交付清单已导出为 Excel / CSV 格式");
              }}
            >
              导出资产清单
            </Button>
            <Button size="small" type="link" onClick={() => setSelectedLaneIds([])}>
              取消选中
            </Button>
          </Space>
        </div>
      )}

      {/* 4. Main Body: Grid or Table Mode */}
      {filteredLanes.length === 0 ? (
        <div className="res-empty-box">
          <EmotionBall emotion="11" size={54} interactive={true} />
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 12, color: "#1e293b" }}>
            未找到匹配的资产记录
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
            当前筛选条件下暂无数字资产，请尝试重置或调整搜索关键词与过滤条件。
          </div>
          <Button
            size="small"
            type="primary"
            style={{ marginTop: 12 }}
            onClick={() => {
              setSearchKw("");
              setSelectedType("all");
              setSelectedStatus("all");
              setSelectedStage("all");
              setSelectedDri("all");
            }}
          >
            重置所有筛选
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="res-bento-gallery-grid">
          {filteredLanes.map((lane) => {
            const cur = currentItem(lane);
            const light = laneLight(lane);
            const pg = progress(lane);
            const isDone = pg.total > 0 && pg.done === pg.total;
            const dri = PEOPLE[cur.driId as PersonId];
            const isSelected = selectedLaneIds.includes(lane.id);
            const is3D = lane.type.startsWith("3D");
            const isVFX = lane.type.includes("特效");
            const isAudio = lane.type.includes("音效");

            return (
              <div
                key={lane.id}
                className={`res-bento-card${light === "red" ? " is-risk" : light === "yellow" ? " is-watch" : ""}${
                  isSelected ? " is-selected" : ""
                }`}
                onClick={() => onOpenItem(cur.id)}
              >
                {/* Card Top: Asset Type & Selection Checkbox */}
                <div className="res-bento-card-top">
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedLaneIds((prev) => [...prev, lane.id]);
                          else setSelectedLaneIds((prev) => prev.filter((id) => id !== lane.id));
                        }}
                      />
                    </div>
                    <AssetTypeBadge type={lane.type} size={12} />
                  </div>
                  <Tag
                    color={light === "red" ? "error" : light === "yellow" ? "warning" : isDone ? "success" : "blue"}
                    style={{ margin: 0, fontSize: 11 }}
                  >
                    {STAGES.find((s) => s.key === cur.stage)?.name ?? cur.stage}
                  </Tag>
                </div>

                {/* Card Center: Visual Avatar / 3D Box Illustration */}
                <div className="res-bento-visual">
                  <EmotionBall
                    emotion={
                      cur.locked
                        ? "06"
                        : light === "red"
                        ? "34"
                        : isDone
                        ? "33"
                        : light === "yellow"
                        ? "11"
                        : is3D
                        ? "30"
                        : "02"
                    }
                    size={38}
                    shape={is3D ? "wedge" : isVFX ? "gem" : "blob"}
                    interactive={false}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="res-bento-title" title={lane.name}>
                      {lane.name}
                    </div>
                    <div className="res-bento-sub">
                      {cur.evidence?.svnPath ? cur.evidence.svnPath.split("/").pop() : "asset_package_v1"} ·{" "}
                      <span
                        style={{ fontFamily: "var(--mono)", cursor: "pointer", color: "#1677ff" }}
                        title="点击复制 Revision"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard?.writeText(cur.evidence?.svnRev ?? "r98412");
                          message.success(`已复制 ${cur.evidence?.svnRev ?? "r98412"}`);
                        }}
                      >
                        {cur.evidence?.svnRev ?? "r98412"} <Copy size={10} />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Spec Chips */}
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  {is3D ? (
                    <Tag color="cyan" style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px", margin: 0 }}>
                      PBR 材质 · 2.4k 面
                    </Tag>
                  ) : isAudio ? (
                    <Tag color="green" style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px", margin: 0 }}>
                      48kHz · 立体声 WAV
                    </Tag>
                  ) : isVFX ? (
                    <Tag color="volcano" style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px", margin: 0 }}>
                      SpriteSheet 粒子
                    </Tag>
                  ) : (
                    <Tag color="purple" style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px", margin: 0 }}>
                      2048x2048 PNG
                    </Tag>
                  )}
                  <Tag
                    color={light === "red" ? "error" : "default"}
                    style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px", margin: 0 }}
                  >
                    {light === "red" ? "AYON 待返修" : "AYON 门禁合规"}
                  </Tag>
                </div>

                {/* Card Progress Strip */}
                <div className="res-bento-progress-wrap">
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: "#64748b" }}>进度：{pg.done}/{pg.total} 步</span>
                    <span style={{ fontWeight: 600, color: isDone ? "#52c41a" : "#1677ff" }}>
                      {pg.total > 0 ? Math.round((pg.done / pg.total) * 100) : 0}%
                    </span>
                  </div>
                  <Progress
                    percent={pg.total > 0 ? Math.round((pg.done / pg.total) * 100) : 0}
                    size="small"
                    showInfo={false}
                    strokeColor={isDone ? "#52c41a" : light === "red" ? "#ff4d4f" : "#1677ff"}
                  />
                </div>

                {/* Card Footer: DRI, Due Date & Quick Inspect CTA */}
                <div className="res-bento-footer">
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <UserCircle size={14} weight="duotone" color="#1677ff" />
                    <span style={{ fontSize: 11, color: "#334155", fontWeight: 500 }}>{dri?.name}</span>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>· {remainLabel(cur.dueAt)}</span>
                  </div>
                  <Button
                    size="small"
                    type="link"
                    style={{ padding: 0, fontSize: 12, height: "auto" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenItem(cur.id);
                    }}
                  >
                    工作台 →
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="res-studio-table-wrap">
          <Table<ResourceLane>
            rowKey="id"
            columns={columns}
            dataSource={filteredLanes}
            pagination={false}
            size="small"
            scroll={{ x: 1080 }}
            className="res-studio-table"
          />
        </div>
      )}
    </div>
  );
}
