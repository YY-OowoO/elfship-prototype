import React, { useState, useMemo } from "react";
import { Modal, DatePicker, Button, Alert, Tag, Typography, Tooltip } from "antd";
import dayjs from "dayjs";
import {
  CalendarBlank,
  WarningCircle,
  WarningOctagon,
  CheckCircle,
  ArrowRight,
  PushPin,
} from "@phosphor-icons/react";
import type { LaunchBatch, PersonId } from "../types";
import { formatDay, previewShift, simulateShiftImpact, addWorkdays, workdaysBetween } from "../logic";
import { playSound } from "../sound";

const { Text } = Typography;

interface ShiftSimulationModalProps {
  open: boolean;
  onClose: () => void;
  batch: LaunchBatch;
  actor: PersonId;
  onApplyShift: (newLaunchDate: string) => void;
  onTogglePin: (itemId: string) => void;
}

export const ShiftSimulationModal: React.FC<ShiftSimulationModalProps> = ({
  open,
  onClose,
  batch,
  actor: _actor,
  onApplyShift,
  onTogglePin,
}) => {
  const [simulatedLaunch, setSimulatedLaunch] = useState<string>(() => batch.launchDate);

  // Sync with batch when modal opens
  React.useEffect(() => {
    if (open) {
      setSimulatedLaunch(batch.launchDate);
    }
  }, [open, batch.launchDate]);

  // Compute shift and impact
  const preview = useMemo(() => {
    return simulatedLaunch ? previewShift(batch, simulatedLaunch) : null;
  }, [batch, simulatedLaunch]);

  const impact = useMemo(() => {
    return simulatedLaunch ? simulateShiftImpact(batch, simulatedLaunch) : null;
  }, [batch, simulatedLaunch]);

  const deltaDays = useMemo(() => {
    return simulatedLaunch ? workdaysBetween(batch.launchDate, simulatedLaunch) : 0;
  }, [batch.launchDate, simulatedLaunch]);

  const handleQuickShift = (offset: number) => {
    playSound.click();
    const nextDate = addWorkdays(batch.launchDate, offset);
    setSimulatedLaunch(nextDate);
  };

  const handleConfirm = () => {
    playSound.fanfare();
    onApplyShift(simulatedLaunch);
    onClose();
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16 }}>
          <CalendarBlank size={20} color="#3b82f6" weight="duotone" />
          <span>上线日动态联动 · 排期推演仿真沙盘</span>
          <Tag color="blue" style={{ fontSize: 11, marginLeft: 4 }}>
            T-N 相对日自动随动
          </Tag>
        </div>
      }
      open={open}
      width={720}
      className="elf-shift-modal"
      centered
      onCancel={onClose}
      onOk={handleConfirm}
      okText="确认应用此排期"
      cancelText="取消"
      okButtonProps={{ type: "primary", disabled: deltaDays === 0 && (!preview || preview.moved.length === 0) }}
    >
      <div style={{ padding: "4px 0" }}>
        <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px 0", lineHeight: 1.5 }}>
          以基准上线日为唯一锚点。未完成且未钉死的工序将依据工作日历自动平移；已完成或已钉死工序将保持原日期并记录变更审计。
        </p>

        {/* Date Selection and Quick Simulation Presets */}
        <div
          style={{
            background: "#f8fafc",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid rgba(226, 232, 240, 0.9)",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", minWidth: 90 }}>
              目标上线日:
            </span>
            <DatePicker
              value={simulatedLaunch ? dayjs(simulatedLaunch) : null}
              onChange={(d) => setSimulatedLaunch(d ? d.format("YYYY-MM-DD") : "")}
              style={{ width: 170 }}
              allowClear={false}
            />
            {deltaDays !== 0 && (
              <Tag color={deltaDays > 0 ? "blue" : "warning"} style={{ margin: 0 }}>
                {deltaDays > 0 ? `推迟 ${deltaDays} 个工作日` : `提前 ${Math.abs(deltaDays)} 个工作日`}
              </Tag>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "#64748b" }}>快捷推演:</span>
            <Button size="small" onClick={() => handleQuickShift(-5)}>
              提前 5 工作日
            </Button>
            <Button size="small" onClick={() => handleQuickShift(-3)}>
              提前 3 工作日
            </Button>
            <Button size="small" onClick={() => handleQuickShift(3)}>
              推迟 3 工作日
            </Button>
            <Button size="small" onClick={() => handleQuickShift(5)}>
              推迟 5 工作日
            </Button>
            <Button size="small" type="link" onClick={() => setSimulatedLaunch(batch.launchDate)}>
              复位当前日
            </Button>
          </div>
        </div>

        {/* Simulation Impact Forecast */}
        {preview && (
          <div>
            {/* Impact Metric Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: 11, color: "#64748b" }}>平移任务数</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0284c7" }}>
                  {preview.moved.length} <span style={{ fontSize: 11, fontWeight: 400 }}>项</span>
                </div>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: 11, color: "#64748b" }}>保持不变(钉死/完成)</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#10b981" }}>
                  {preview.kept} <span style={{ fontSize: 11, fontWeight: 400 }}>项</span>
                </div>
              </div>

              <div
                style={{
                  background: preview.newRedCount > 0 ? "#fef2f2" : "#ffffff",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: preview.newRedCount > 0 ? "1px solid #fecaca" : "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: 11, color: preview.newRedCount > 0 ? "#dc2626" : "#64748b" }}>
                  新增逾期红灯
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: preview.newRedCount > 0 ? "#dc2626" : "#64748b" }}>
                  +{preview.newRedCount} <span style={{ fontSize: 11, fontWeight: 400 }}>项</span>
                </div>
              </div>

              <div
                style={{
                  background: preview.newYellowCount > 0 ? "#fffbeb" : "#ffffff",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: preview.newYellowCount > 0 ? "1px solid #fde68a" : "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: 11, color: preview.newYellowCount > 0 ? "#d97706" : "#64748b" }}>
                  新增临期黄灯
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: preview.newYellowCount > 0 ? "#d97706" : "#64748b" }}>
                  +{preview.newYellowCount} <span style={{ fontSize: 11, fontWeight: 400 }}>项</span>
                </div>
              </div>
            </div>

            {/* Impact Summary Alert */}
            {impact && impact.summary !== "上线日未变动" && (
              <Alert
                type={
                  preview.newRedCount > 0
                    ? "error"
                    : impact.newRisk.level === "ok"
                    ? "success"
                    : "warning"
                }
                showIcon
                icon={
                  preview.newRedCount > 0 ? (
                    <WarningOctagon size={16} />
                  ) : impact.newRisk.level === "ok" ? (
                    <CheckCircle size={16} />
                  ) : (
                    <WarningCircle size={16} />
                  )
                }
                message={<b>推演评估：{impact.summary}</b>}
                style={{ marginBottom: 10 }}
              />
            )}

            {/* Critical Bottleneck Callout */}
            {preview.criticalBottlenecks.length > 0 && (
              <div
                style={{
                  background: "#fff1f2",
                  border: "1px solid #fecdd3",
                  borderRadius: 6,
                  padding: "6px 12px",
                  marginBottom: 10,
                  fontSize: 12,
                  color: "#e11d48",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <WarningOctagon size={15} weight="fill" />
                <span>
                  <b>排期倒挂预警：</b>
                  {preview.criticalBottlenecks.map((b) => `【${b.laneName} · ${b.stageName}】`).join("、")}
                  将出现时间不足与红灯卡点，建议优先评估其工期。
                </span>
              </div>
            )}

            {/* Task Shift Interactive Sandbox List */}
            <div
              style={{
                border: "1px solid rgba(226, 232, 240, 0.9)",
                borderRadius: 8,
                overflow: "hidden",
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.8fr 2fr 1fr 1fr",
                  background: "#f1f5f9",
                  padding: "6px 12px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#475569",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <span>工序与资源</span>
                <span>截止日期平移随动</span>
                <span>灯色预测</span>
                <span style={{ textAlign: "right" }}>操作(就地钉死)</span>
              </div>

              {preview.moved.length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: 12 }}>
                  无任务会变动（所有任务均已完成或已被钉死）
                </div>
              ) : (
                preview.moved.map((row) => {
                  return (
                    <div
                      key={row.item.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.8fr 2fr 1fr 1fr",
                        alignItems: "center",
                        padding: "7px 12px",
                        fontSize: 12,
                        borderBottom: "1px solid #f1f5f9",
                        background: row.worsened ? "rgba(254, 242, 242, 0.6)" : "#ffffff",
                      }}
                    >
                      <Text ellipsis={{ tooltip: `${row.laneName} · ${row.stageName}` }} style={{ fontWeight: 500 }}>
                        {row.laneName} · {row.stageName}
                      </Text>

                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                        <span style={{ color: "#64748b" }}>{formatDay(row.oldDue)}</span>
                        <ArrowRight size={11} color="#94a3b8" />
                        <b style={{ color: row.worsened ? "#dc2626" : "#0284c7" }}>
                          {formatDay(row.newDue)}
                        </b>
                      </div>

                      <div>
                        {row.worsened ? (
                          <Tag color="volcano" style={{ margin: 0, fontSize: 10, padding: "0 4px" }}>
                            {row.newLight === "red" ? "转为红灯" : "转为黄灯"}
                          </Tag>
                        ) : row.improved ? (
                          <Tag color="green" style={{ margin: 0, fontSize: 10, padding: "0 4px" }}>
                            风险缓解
                          </Tag>
                        ) : (
                          <Tag style={{ margin: 0, fontSize: 10, padding: "0 4px" }}>正常随动</Tag>
                        )}
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <Tooltip title={row.item.duePinned ? "已钉死（不随动）" : "点击钉死此日期，使其不随上线日平移"}>
                          <Button
                            size="small"
                            type={row.item.duePinned ? "primary" : "text"}
                            icon={<PushPin size={12} weight={row.item.duePinned ? "fill" : "regular"} />}
                            onClick={() => onTogglePin(row.item.id)}
                            style={{ height: 22, padding: "0 6px", fontSize: 11 }}
                          >
                            {row.item.duePinned ? "已钉死" : "钉死"}
                          </Button>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
