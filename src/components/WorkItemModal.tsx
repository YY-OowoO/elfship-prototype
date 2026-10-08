import { useState } from "react";
import {
  Alert,
  Button,
  DatePicker,
  Input,
  InputNumber,
  Modal,
  Popover,
  Radio,
  Space,
  Tag,
  Timeline,
  message,
} from "antd";
import dayjs from "dayjs";
import {
  CheckCircle,
  Lightning,
  PlayCircle,
  ArrowCounterClockwise,
  FastForward,
  WarningOctagon,
  ShieldCheck,
  Sparkle,
} from "../icons";
import { AssetTypeBadge, ItemStatusIcon, StageIcon } from "../icons";
import { EmotionBall } from "../emotion-ball";
import { AssetPreviewer } from "./AssetPreviewer";
import { AyonGateScanner } from "./AyonGateScanner";
import { PEOPLE, STAGES } from "../mock";
import { avatar } from "../ui";
import {
  canConfirm,
  canRework,
  canStart,
  canSubmit,
  canWaive,
  findBlockerSource,
  formatDay,
  itemLight,
  remainLabel,
  stateLabel,
} from "../logic";
import type {
  Evidence,
  LaunchBatch,
  PersonId,
  RejectionCategory,
  ResourceLane,
  WorkItem,
} from "../types";
import { REJECTION_CATEGORY_MAP } from "../types";
import { playSound } from "../sound";

export function WorkItemModal({
  open,
  actor,
  rawBatch,
  onClose,
  onStartItem,
  onSubmitItem,
  onConfirmItem,
  onRejectItem,
  onWaiveItem,
  onStartRework,
  onSkipItem,
  onUpdateDueDate,
  onToggleGate,
  onPatchEvidence,
  onSwitchActor,
  onOpenOtherItem,
}: {
  open: { lane: ResourceLane; item: WorkItem } | null;
  actor: PersonId;
  rawBatch: LaunchBatch;
  onClose: () => void;
  onStartItem: (itemId: string) => void;
  onSubmitItem: (itemId: string) => void;
  onConfirmItem: (itemId: string) => void;
  onRejectItem: (itemId: string, reason: string, category?: RejectionCategory) => void;
  onWaiveItem?: (itemId: string, reason: string) => void;
  onStartRework: (itemId: string) => void;
  onSkipItem: (itemId: string) => void;
  onUpdateDueDate: (itemId: string, newDate: string) => void;
  onToggleGate: (gateId: string) => void;
  onPatchEvidence: (itemId: string, patch: Partial<Evidence>) => void;
  onSwitchActor: (actorId: PersonId) => void;
  onOpenOtherItem: (itemId: string) => void;
}) {
  const [rejectReason, setRejectReason] = useState("拓扑三角面数超出手游预算，需减面重拓扑");
  const [rejectCategory, setRejectCategory] = useState<RejectionCategory>("tech_spec");
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [showWaiverInput, setShowWaiverInput] = useState(false);
  const [waiverReason, setWaiverReason] = useState("【紧急版本特批】主美与制作人评估视觉达标，容许次周补丁优化");
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const { lane, item } = open;
  const light = itemLight(item);
  const stage = STAGES.find((s) => s.key === item.stage);
  const dri = PEOPLE[item.driId as PersonId];
  const confirmer = PEOPLE[item.confirmerId as PersonId];
  const blocker = (item.locked || item.waiting) ? findBlockerSource(rawBatch, item.id) : null;
  const lastReject = [...item.history].reverse().find((h) => h.action.includes("退回") || (h.to === "rejected" && h.reason));
  const filteredHistory = [...item.history].reverse();

  // 资源类型判断
  const is3D = lane.type.includes("3D") || lane.type.includes("模型") || lane.type.includes("时装");

  return (
    <Modal
      open={Boolean(open)}
      onCancel={onClose}
      footer={null}
      width="min(1280px, 96vw)"
      centered
      destroyOnHidden
      className="studio-zero-scroll-modal"
      title={
        <div className="szs-modal-hud-bar">
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
            <EmotionBall
              emotion={
                item.locked
                  ? "06"
                  : light === "red"
                  ? "34"
                  : item.state === "confirmed"
                  ? "33"
                  : light === "yellow"
                  ? "11"
                  : item.state === "in_progress" || item.state === "rework"
                  ? "30"
                  : "02"
              }
              shape={lane.type.includes("3D") ? "wedge" : lane.type.includes("特效") ? "gem" : "blob"}
              size={34}
              interactive={false}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span className="szs-modal-title" title={lane.name}>
                  {lane.name}
                </span>
                <AssetTypeBadge type={lane.type} size={11} />
                <Tag color="blue" style={{ display: "inline-flex", alignItems: "center", gap: 3, margin: 0, fontSize: 11 }}>
                  <StageIcon stage={item.stage} size={11} />
                  {stage?.name ?? item.stage}
                </Tag>
                <Tag
                  color={item.isWaived ? "gold" : light === "red" ? "error" : light === "yellow" ? "warning" : item.state === "confirmed" ? "success" : "default"}
                  style={{ display: "inline-flex", alignItems: "center", gap: 3, margin: 0, fontSize: 11 }}
                >
                  <ItemStatusIcon item={item} size={11} />
                  {item.isWaived ? "特批放行" : stateLabel(item)}
                </Tag>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#64748b", marginTop: 2 }}>
                <span>
                  截止：<b>{formatDay(item.dueAt)}</b> ({remainLabel(item.dueAt)})
                </span>
                {item.duePinned && <Tag color="blue" style={{ fontSize: 10, lineHeight: "14px", padding: "0 3px", margin: 0 }}>已钉死</Tag>}
                <Popover
                  trigger="click"
                  placement="bottom"
                  autoAdjustOverflow={true}
                  destroyTooltipOnHide={true}
                  content={
                    <div style={{ padding: 4 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>调整本工序截止日期</div>
                      <DatePicker
                        size="small"
                        value={dayjs(item.dueAt)}
                        onChange={(d) => {
                          if (d) {
                            onUpdateDueDate(item.id, d.format("YYYY-MM-DD"));
                            message.success("已更新本工序截止日期并重算排期");
                          }
                        }}
                      />
                    </div>
                  }
                >
                  <Button size="small" type="link" style={{ fontSize: 11, padding: 0, height: "auto" }}>
                    调整日期
                  </Button>
                </Popover>
              </div>
            </div>
          </div>

          {/* Right: Responsibility Pills */}
          <div className="szs-dri-pills-wrap">
            <div className="szs-dri-pill">
              <span className="szs-dri-pill-lbl">主责:</span>
              {avatar(item.driId, 18)}
              <span className="szs-dri-pill-name">{dri?.name}</span>
            </div>
            <div className="szs-dri-pill">
              <span className="szs-dri-pill-lbl">确认:</span>
              {avatar(item.confirmerId, 18)}
              <span className="szs-dri-pill-name">{confirmer?.name}</span>
            </div>
          </div>
        </div>
      }
    >
      {/* Pipeline Progression Stepper Strip */}
      <div className="szs-stage-stepper-strip">
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginRight: 4 }}>
          工序流水线:
        </span>
        {lane.items.map((it, idx) => {
          const sDef = STAGES.find((s) => s.key === it.stage);
          const isCurrent = it.id === item.id;
          const isDone = it.state === "confirmed" || it.skipped;
          const isRed = itemLight(it) === "red";
          return (
            <div
              key={it.id}
              className={`szs-step-node${isCurrent ? " is-active" : ""}${isDone ? " is-done" : ""}${isRed ? " is-red" : ""}`}
              onClick={() => {
                if (!isCurrent) onOpenOtherItem(it.id);
              }}
              title={`${sDef?.name} (${stateLabel(it)})`}
            >
              <span className="szs-step-dot" />
              <span className="szs-step-label">{sDef?.short ?? it.stage}</span>
              {isDone ? " (完成)" : isCurrent ? " (进行中)" : ""}
              {idx < lane.items.length - 1 && <span className="szs-step-line" />}
            </div>
          );
        })}
      </div>

      {/* Studio 3-Column Zero-Scroll Grid Layout */}
      <div className="szs-studio-grid">
        {/* Column 1: Multi-Modal Asset Inspector */}
        <div className="szs-col-inspector">
          <div className="szs-col-card">
            <AssetPreviewer
              assetName={lane.name}
              assetType={lane.type}
              svnPath={item.evidence?.svnPath}
              svnRev={item.evidence?.svnRev}
            />
          </div>
        </div>

        {/* Column 2: AYON Automated Gate Scanner & 3-Tier Checklist Conditions */}
        <div className="szs-col-gates">
          <div className="szs-col-card">
            <AyonGateScanner
              itemState={item.state}
              onAllPassed={() => {
                playSound.shimmer();
                message.success("AYON 自动化质检通过！");
              }}
            />

            {/* Condition Gate Toggles with 3-Tier Badges */}
            <div className="szs-gate-checklist-wrap">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: "#1e293b" }}>三层质量门禁清单</span>
                <span style={{ fontSize: 10, color: "#94a3b8" }}>L1机检 / L2指标 / L3终审</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {item.completeWhen.map((g) => (
                  <div key={g.id} className="szs-gate-check-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0, flex: 1 }}>
                      <Tag
                        color={g.level === "L1" ? "blue" : g.level === "L2" ? "purple" : "cyan"}
                        style={{ fontSize: 9, lineHeight: "14px", padding: "0 3px", margin: 0, fontWeight: 700 }}
                      >
                        {g.level ?? (g.label.includes("SVN") || g.label.includes("路径") ? "L1" : g.label.includes("面数") || g.label.includes("DrawCall") ? "L2" : "L3")}
                      </Tag>
                      <span className="szs-gcr-label" title={g.label}>
                        {g.label}
                        {g.metricThreshold && <span style={{ color: "#94a3b8", fontSize: 10, marginLeft: 4 }}>({g.metricThreshold})</span>}
                      </span>
                    </div>
                    <Tag
                      color={g.ok ? "success" : "error"}
                      style={{ cursor: "pointer", userSelect: "none", fontSize: 11, margin: 0, padding: "0 6px" }}
                      onClick={() => {
                        onToggleGate(g.id);
                        playSound.click();
                      }}
                    >
                      {g.ok ? "已满足" : "未就绪"}
                    </Tag>
                  </div>
                ))}

                {item.enterNextWhen.map((g) => (
                  <div key={g.id} className="szs-gate-check-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0, flex: 1 }}>
                      <Tag color="volcano" style={{ fontSize: 9, lineHeight: "14px", padding: "0 3px", margin: 0, fontWeight: 700 }}>
                        流转
                      </Tag>
                      <span className="szs-gcr-label" title={g.label}>
                        {g.label}
                      </span>
                    </div>
                    <Tag
                      color={g.ok ? "success" : "error"}
                      style={{ cursor: "pointer", userSelect: "none", fontSize: 11, margin: 0, padding: "0 6px" }}
                      onClick={() => {
                        onToggleGate(g.id);
                        playSound.click();
                      }}
                    >
                      {g.ok ? "已满足" : "未就绪"}
                    </Tag>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Structured Evidence Schema & Delivery Sign-off Actions */}
        <div className="szs-col-actions">
          <div className="szs-col-card">
            {/* Top: Structured Evidence Inputs */}
            <div className="szs-evidence-section">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: "#1e293b" }}>交付物标准凭证 (Schema)</span>
                <Button
                  size="small"
                  type="link"
                  style={{ fontSize: 11, padding: 0, height: "auto" }}
                  onClick={() => {
                    if (item.stage === "upload" || item.stage === "produce") {
                      onPatchEvidence(item.id, {
                        svnPath: `svn://game/res/assets/summer2026/${lane.id}/v1`,
                        svnRev: "r98412",
                        vertexCount: 13500,
                        drawCall: 48,
                        pbrCompliant: true,
                        textureSpec: "2048x2048 ASTC",
                        note: "模型拓扑与 PBR 材质规范已全部机检达标",
                      });
                    } else {
                      onPatchEvidence(item.id, {
                        conclusion: "验收测试通过，真机 60 帧无掉帧，DrawCall 符合手游标准",
                        drawCall: 48,
                        note: "已完成各向异性光影调试与美术合规复核",
                      });
                    }
                    playSound.shimmer();
                    message.success("已自动填入标准规范的 Mock 交付凭证");
                  }}
                >
                  填入标准凭证
                </Button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {/* SVN 路径与版本 */}
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>
                    SVN 资源路径 / Revision (L1 静态机检):
                  </div>
                  <Input.Group compact style={{ display: "flex" }}>
                    <Input
                      size="small"
                      style={{ flex: 1 }}
                      placeholder="svn://game/res/assets/..."
                      value={item.evidence?.svnPath ?? ""}
                      onChange={(e) => onPatchEvidence(item.id, { svnPath: e.target.value })}
                    />
                    <Input
                      size="small"
                      style={{ width: 75 }}
                      placeholder="r98412"
                      value={item.evidence?.svnRev ?? ""}
                      onChange={(e) => onPatchEvidence(item.id, { svnRev: e.target.value })}
                    />
                  </Input.Group>
                </div>

                {/* 3D / 动效类的结构化性能指标录入 */}
                {is3D && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, background: "#f8fafc", padding: 6, borderRadius: 6, border: "1px solid #e2e8f0" }}>
                    <div>
                      <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>
                        三角面数 (≤1.5w):
                      </div>
                      <InputNumber
                        size="small"
                        style={{ width: "100%" }}
                        placeholder="如 13500"
                        value={item.evidence?.vertexCount}
                        onChange={(v) => onPatchEvidence(item.id, { vertexCount: v ?? undefined })}
                      />
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>
                        DrawCall (≤120):
                      </div>
                      <InputNumber
                        size="small"
                        style={{ width: "100%" }}
                        placeholder="如 48"
                        value={item.evidence?.drawCall}
                        onChange={(v) => onPatchEvidence(item.id, { drawCall: v ?? undefined })}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 2 }}>交付说明与交接备注:</div>
                  <Input.TextArea
                    rows={2}
                    size="small"
                    placeholder="输入交付物描述或交接说明..."
                    value={item.evidence?.note ?? ""}
                    onChange={(e) => onPatchEvidence(item.id, { note: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Middle: Alerts and Role Context */}
            <div className="szs-alerts-section">
              {item.state === "rejected" && (
                <Alert
                  type="error"
                  showIcon
                  message={
                    <span style={{ fontSize: 11 }}>
                      <b>【已被退回】</b> {lastReject?.rejectionCategory ? `[${REJECTION_CATEGORY_MAP[lastReject.rejectionCategory]?.label ?? lastReject.rejectionCategory}] ` : ""}
                      {lastReject?.reason ?? "请主责处理返工"}
                    </span>
                  }
                  style={{ padding: "4px 8px", marginBottom: 6 }}
                />
              )}

              {item.isWaived && (
                <Alert
                  type="warning"
                  showIcon
                  icon={<ShieldCheck size={14} weight="duotone" />}
                  message={
                    <span style={{ fontSize: 11 }}>
                      <b>【特批放行】</b> 该工序已由批次负责人授权特批，已解锁下游推进。
                    </span>
                  }
                  style={{ padding: "4px 8px", marginBottom: 6 }}
                />
              )}

              {blocker && (
                <Alert
                  type="warning"
                  showIcon
                  message={
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
                      <span>上游卡点：{blocker.reason}</span>
                      <Button
                        size="small"
                        type="link"
                        style={{ padding: 0, fontSize: 11, height: "auto" }}
                        onClick={() => onOpenOtherItem(blocker.blockerItem.id)}
                      >
                        跳转 →
                      </Button>
                    </div>
                  }
                  style={{ padding: "4px 8px", marginBottom: 6 }}
                />
              )}

              {actor !== item.driId && actor !== item.confirmerId && (
                <div className="szs-role-hint-strip">
                  <span>当前身份：{PEOPLE[actor].name}</span>
                  <Space size={4}>
                    <Button
                      size="small"
                      type="link"
                      style={{ fontSize: 11, padding: 0, height: "auto" }}
                      onClick={() => onSwitchActor(item.driId)}
                    >
                      切为主责
                    </Button>
                    <span style={{ color: "#cbd5e1" }}>|</span>
                    <Button
                      size="small"
                      type="link"
                      style={{ fontSize: 11, padding: 0, height: "auto" }}
                      onClick={() => onSwitchActor(item.confirmerId)}
                    >
                      切为确认人
                    </Button>
                  </Space>
                </div>
              )}

              {err && <Alert type="error" showIcon message={err} style={{ padding: "4px 8px", marginTop: 4 }} />}
            </div>

            {/* Bottom Action CTA Strip (Always visible at one glance!) */}
            <div className="szs-action-buttons-wrap">
              {item.state === "not_started" && (
                <Button
                  type="primary"
                  block
                  icon={<PlayCircle size={14} weight="duotone" />}
                  onClick={() => {
                    const msg = canStart(item, actor);
                    if (msg) setErr(msg);
                    else {
                      onStartItem(item.id);
                      setErr(null);
                    }
                  }}
                >
                  开始推进本工序
                </Button>
              )}

              {(item.state === "in_progress" || item.state === "rework") && (
                <Button
                  type="primary"
                  block
                  icon={<Lightning size={14} weight="duotone" />}
                  onClick={() => {
                    const msg = canSubmit(item, actor);
                    if (msg) setErr(msg);
                    else {
                      onSubmitItem(item.id);
                      setErr(null);
                    }
                  }}
                >
                  提交交付物待审
                </Button>
              )}

              {item.state === "submitted" && (
                <Button
                  type="primary"
                  block
                  style={{ background: "#52c41a", borderColor: "#52c41a" }}
                  icon={<CheckCircle size={14} weight="duotone" />}
                  onClick={() => {
                    const msg = canConfirm(item, actor);
                    if (msg) setErr(msg);
                    else {
                      onConfirmItem(item.id);
                      setErr(null);
                    }
                  }}
                >
                  通过质检并确认放行
                </Button>
              )}

              {item.state === "rejected" && (
                <Button
                  type="primary"
                  block
                  icon={<ArrowCounterClockwise size={14} weight="duotone" />}
                  onClick={() => {
                    const msg = canRework(item, actor);
                    if (msg) setErr(msg);
                    else {
                      onStartRework(item.id);
                      setErr(null);
                    }
                  }}
                >
                  开始返工修改
                </Button>
              )}

              {/* Secondary actions: Standardized Reject, Waiver & History */}
              <div style={{ display: "flex", gap: 6, width: "100%", marginTop: 6 }}>
                {item.state === "submitted" && (
                  <Button
                    danger
                    ghost
                    style={{ flex: 1 }}
                    icon={<WarningOctagon size={13} weight="duotone" />}
                    onClick={() => {
                      if (!showRejectInput) {
                        setShowRejectInput(true);
                        setShowWaiverInput(false);
                      } else {
                        onRejectItem(item.id, rejectReason, rejectCategory);
                        setShowRejectInput(false);
                      }
                    }}
                  >
                    {showRejectInput ? "确定退回" : "退回返工"}
                  </Button>
                )}

                {/* 批次 DRI / 确认人 特批放行 (Waiver) 通道 */}
                {item.state !== "confirmed" && !item.skipped && (actor === rawBatch.batchDriId || actor === item.confirmerId) && (
                  <Button
                    style={{ background: "#fffbe6", borderColor: "#ffe58f", color: "#d48806", flex: 1 }}
                    icon={<Sparkle size={13} weight="duotone" />}
                    onClick={() => {
                      if (!showWaiverInput) {
                        setShowWaiverInput(true);
                        setShowRejectInput(false);
                      } else {
                        const waiverErr = canWaive(rawBatch, item, actor, waiverReason);
                        if (waiverErr) setErr(waiverErr);
                        else {
                          onWaiveItem?.(item.id, waiverReason);
                          setShowWaiverInput(false);
                          setErr(null);
                        }
                      }
                    }}
                  >
                    {showWaiverInput ? "确认特批" : "特批放行"}
                  </Button>
                )}

                {item.state !== "confirmed" && !item.skipped && (
                  <Button
                    type="default"
                    style={{ flex: 1 }}
                    icon={<FastForward size={13} weight="duotone" />}
                    onClick={() => onSkipItem(item.id)}
                  >
                    跳过
                  </Button>
                )}

                {/* History Popover */}
                <Popover
                  trigger="click"
                  placement="topRight"
                  autoAdjustOverflow={true}
                  destroyTooltipOnHide={true}
                  title="工序流转与操作记录"
                  content={
                    <div style={{ width: 320, maxHeight: 260, overflowY: "auto" }}>
                      <Timeline
                        items={filteredHistory.map((h) => ({
                          key: h.id,
                          color: h.isWaiver ? "gold" : h.to === "rejected" ? "red" : h.to === "confirmed" ? "green" : "blue",
                          content: (
                            <div style={{ fontSize: 11 }}>
                              <div style={{ color: "#94a3b8" }}>{h.at}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                                <b>{PEOPLE[h.actorId as PersonId]?.name ?? h.actorId}</b>
                                <span>{h.action}</span>
                                {h.rejectionCategory && (
                                  <Tag color={REJECTION_CATEGORY_MAP[h.rejectionCategory]?.color ?? "red"} style={{ fontSize: 9, lineHeight: "14px", padding: "0 3px", margin: 0 }}>
                                    {REJECTION_CATEGORY_MAP[h.rejectionCategory]?.label ?? h.rejectionCategory}
                                  </Tag>
                                )}
                                {h.isWaiver && (
                                  <Tag color="gold" style={{ fontSize: 9, lineHeight: "14px", padding: "0 3px", margin: 0 }}>
                                    特批放行
                                  </Tag>
                                )}
                              </div>
                              {h.reason && <div style={{ color: h.isWaiver ? "#d48806" : "#ff4d4f", marginTop: 2 }}>{h.isWaiver ? "特批说明：" : "原因："}{h.reason}</div>}
                            </div>
                          ),
                        }))}
                      />
                    </div>
                  }
                >
                  <Button type="text" size="small" style={{ fontSize: 11, color: "#64748b" }}>
                    历史 ({item.history.length})
                  </Button>
                </Popover>
              </div>

              {/* 标准化退回根因字典选择与原因录入 */}
              {showRejectInput && (
                <div style={{ marginTop: 8, padding: 8, background: "#fff1f0", borderRadius: 6, border: "1px solid #ffccc7" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#cf1322" }}>
                      选择退回根因分类 (Taxonomy):
                    </span>
                    <Button
                      size="small"
                      type="link"
                      style={{ fontSize: 11, color: "#94a3b8", padding: 0, height: "auto" }}
                      onClick={() => setShowRejectInput(false)}
                    >
                      取消收起
                    </Button>
                  </div>
                  <Radio.Group
                    size="small"
                    value={rejectCategory}
                    onChange={(e) => setRejectCategory(e.target.value)}
                    style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}
                  >
                    {(Object.keys(REJECTION_CATEGORY_MAP) as RejectionCategory[]).map((cat) => (
                      <Radio key={cat} value={cat} style={{ fontSize: 11 }}>
                        <Tag color={REJECTION_CATEGORY_MAP[cat].color} style={{ margin: 0, fontSize: 10 }}>
                          {REJECTION_CATEGORY_MAP[cat].label}
                        </Tag>
                        <span style={{ color: "#64748b", fontSize: 10, marginLeft: 4 }}>
                          {REJECTION_CATEGORY_MAP[cat].desc}
                        </span>
                      </Radio>
                    ))}
                  </Radio.Group>
                  <Input.TextArea
                    rows={2}
                    size="small"
                    placeholder="输入具体退回整改要求（必填，至少4字）..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              )}

              {/* 批次 DRI 特批放行理由录入 */}
              {showWaiverInput && (
                <div style={{ marginTop: 8, padding: 8, background: "#fffbe6", borderRadius: 6, border: "1px solid #ffe58f" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#d48806" }}>
                      批次 DRI 特批放行授权 (Waiver):
                    </span>
                    <Button
                      size="small"
                      type="link"
                      style={{ fontSize: 11, color: "#94a3b8", padding: 0, height: "auto" }}
                      onClick={() => setShowWaiverInput(false)}
                    >
                      取消收起
                    </Button>
                  </div>
                  <div style={{ fontSize: 10, color: "#8c6b00", marginBottom: 6 }}>
                    特批放行将强制解除本资源的下游阻断，并作为高风险技术债登记在审计时间线中。
                  </div>
                  <Input.TextArea
                    rows={2}
                    size="small"
                    placeholder="详细填写特批理由与补救措施（至少6字）..."
                    value={waiverReason}
                    onChange={(e) => setWaiverReason(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

