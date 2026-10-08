import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Calendar,
  Clock,
  Download,
  FileText,
  Maximize2,
  Minimize2,
  Search,
} from "lucide-react";
import { Button, Select, Space, Tooltip } from "antd";
import type { LaunchBatch, PreviewMode } from "../../types";
import { TODAY } from "../../mock";
import { batchLights, formatDay } from "../../logic";
import { useSimulatedDate, TIME_TRAVEL_PRESETS } from "../../store/deliveryStore";
import { PreviewModeSwitcher } from "../layout/PreviewModeSwitcher";
import type { EnterpriseTab } from "./EnterpriseAdminRoot";

interface EnterpriseHeaderProps {
  activeBatch: LaunchBatch;
  activeTab: EnterpriseTab;
  onOpenShiftModal: () => void;
  onExportCsv: () => void;
  onGenerateReport?: () => void;
  onOpenSearch: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  previewMode?: PreviewMode;
  onTogglePreviewMode?: (mode: PreviewMode) => void;
}

const TAB_TITLES: Record<EnterpriseTab, { title: string; subtitle: string }> = {
  cockpit: {
    title: "全景数据大盘",
    subtitle: "实时态势链路 · 自动隔离上游故障 · 单一责任制 (DRI)",
  },
  tasks: {
    title: "交付任务中枢",
    subtitle: "在制工序跟踪 · 催办转派与流转管控",
  },
  personnel: {
    title: "人员与组织负荷",
    subtitle: "人效健康度 · 跨职能负载均衡分析",
  },
  pipeline: {
    title: "7工序流转拓扑",
    subtitle: "研发交付标准流水线 · 质量门禁阻断感知",
  },
  gantt: {
    title: "时序甘特与关键路径",
    subtitle: "里程碑基线比对 · 关键瓶颈卡点推演",
  },
  ledger: {
    title: "资产数字化质检台账",
    subtitle: "全量工件交付物追踪 · 验收凭证归档",
  },
  warroom: {
    title: "安灯故障作战室",
    subtitle: "异常熔断研判 · 快速攻坚与恢复方案",
  },
};

export const EnterpriseHeader: React.FC<EnterpriseHeaderProps> = ({
  activeBatch,
  activeTab,
  onOpenShiftModal,
  onExportCsv,
  onGenerateReport,
  onOpenSearch,
  isFullscreen,
  onToggleFullscreen,
  previewMode,
  onTogglePreviewMode,
}) => {
  // Live ticking clock for mission-critical countdown
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Global simulated date for demo time-travel
  const [simulatedDate, setSimulatedDate] = useSimulatedDate();

  // Compute countdown metrics to launchDate relative to simulatedDate benchmark
  const countdown = useMemo(() => {
    try {
      const [bY, bM, bD] = simulatedDate.split("-").map(Number);
      const simulatedNow = new Date(bY, bM - 1, bD, now.getHours(), now.getMinutes(), now.getSeconds());
      const launch = new Date(`${activeBatch.launchDate}T23:59:59`);
      const diffMs = launch.getTime() - simulatedNow.getTime();
      if (diffMs <= 0) {
        const pastDays = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
        const pastHours = Math.floor((Math.abs(diffMs) / (1000 * 60 * 60)) % 24);
        return { days: pastDays, hours: pastHours, minutes: 0, seconds: 0, isPast: true };
      }
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
      const seconds = Math.floor((diffMs / 1000) % 60);
      return { days, hours, minutes, seconds, isPast: false };
    } catch {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false };
    }
  }, [activeBatch.launchDate, now]);

  // Compute Delivery Health Index (DHI: 0 - 100)
  const lights = useMemo(() => batchLights(activeBatch), [activeBatch]);
  const totalLanes = activeBatch.lanes.length;
  const dhi = useMemo(() => {
    if (totalLanes === 0) return 100;
    // Penalty: red -18pts, yellow -6pts
    const rawPenalty = lights.red * 18 + lights.yellow * 6;
    return Math.max(12, Math.min(100, 100 - rawPenalty));
  }, [lights, totalLanes]);

  const dhiLevel = dhi >= 85 ? "good" : dhi >= 60 ? "warn" : "danger";
  const dhiLabel = dhi >= 85 ? "态势优良" : dhi >= 60 ? "重点预警" : "严重阻断";
  const currentTabMeta = TAB_TITLES[activeTab] || TAB_TITLES.cockpit;

  return (
    <header className="ent-stage-header">
      {/* Left: Current Active View Title & Breadcrumbs */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ent-text-primary)", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>
              {currentTabMeta.title}
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--ent-primary-hover)",
                background: "var(--ent-primary-dim)",
                border: "1px solid var(--ent-border-strong)",
                padding: "1px 6px",
                borderRadius: 4,
                fontFamily: "var(--ent-font-mono)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {activeBatch.name} · 上线日 {formatDay(activeBatch.launchDate)}
            </span>
            {onTogglePreviewMode && previewMode && (
              <PreviewModeSwitcher
                previewMode={previewMode}
                onTogglePreviewMode={onTogglePreviewMode}
                style={{ marginLeft: 6 }}
              />
            )}
          </div>
          <span style={{ fontSize: 11, color: "var(--ent-text-muted)", whiteSpace: "nowrap" }}>
            {currentTabMeta.subtitle}
          </span>
        </div>
      </div>

      {/* Center: Live Countdown & DHI Health Pill */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* Real-time Countdown Timer */}
        <Tooltip title={`基准日: ${TODAY} · 上线日: ${activeBatch.launchDate} (点击进行排期推演与窗口调整)`}>
          <div
            className="ent-countdown-clock"
            onClick={onOpenShiftModal}
            role="button"
            tabIndex={0}
            style={{ cursor: "pointer" }}
          >
            <div className="ent-clock-icon-wrap" style={{ color: countdown.isPast ? "var(--ent-rose)" : "var(--ent-primary-hover)" }}>
              <Clock size={15} />
            </div>
            {countdown.isPast ? (
              <div className="ent-clock-digits">
                <span className="ent-digit-unit" style={{ color: "var(--ent-rose)", fontWeight: 700 }}>已超期</span>
                <span className="ent-digit-num" style={{ color: "var(--ent-rose)" }}>{String(countdown.days).padStart(2, "0")}</span>
                <span className="ent-digit-unit">天</span>
                <span className="ent-digit-num" style={{ color: "var(--ent-rose)" }}>{String(countdown.hours).padStart(2, "0")}</span>
                <span className="ent-digit-unit">时</span>
              </div>
            ) : (
              <div className="ent-clock-digits">
                <span className="ent-digit-num">{String(countdown.days).padStart(2, "0")}</span>
                <span className="ent-digit-unit">天</span>
                <span className="ent-digit-num">{String(countdown.hours).padStart(2, "0")}</span>
                <span className="ent-digit-unit">时</span>
                <span className="ent-digit-num">{String(countdown.minutes).padStart(2, "0")}</span>
                <span className="ent-digit-unit">分</span>
                <span className="ent-digit-num" style={{ color: "var(--ent-primary-hover)" }}>
                  {String(countdown.seconds).padStart(2, "0")}
                </span>
                <span className="ent-digit-unit">秒</span>
              </div>
            )}
          </div>
        </Tooltip>

        {/* Global Delivery Health Index (DHI) */}
        <Tooltip title={`交付健康指数 (DHI)：综合评估红灯(${lights.red})、黄灯(${lights.yellow})、门禁阻断与节点通关率`}>
          <div className="ent-health-pill">
            <Activity
              size={14}
              style={{
                color:
                  dhiLevel === "good"
                    ? "var(--ent-emerald)"
                    : dhiLevel === "warn"
                    ? "var(--ent-amber)"
                    : "var(--ent-rose)",
              }}
            />
            <span className={`ent-health-score ${dhiLevel}`}>{dhi}</span>
            <span className="ent-health-label">/ 100 · {dhiLabel}</span>
          </div>
        </Tooltip>
      </div>

      {/* Right: Stage Action Buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Space size={8}>
          {/* Time Travel Demo Controller */}
          <Tooltip title="时序基准模拟：自由切换模拟日期，验证倒计时、安灯警报与甘特图状态">
            <Select
              size="small"
              value={simulatedDate}
              onChange={(val) => setSimulatedDate(val)}
              style={{ width: 148, fontSize: 11 }}
              popupMatchSelectWidth={false}
              options={TIME_TRAVEL_PRESETS.map((p) => ({
                label: p.label,
                value: p.date,
              }))}
            />
          </Tooltip>

          {/* Quick Search Trigger (Cmd+K) */}
          <Tooltip title="快速检索资产与工序 (Cmd+K)">
            <Button
              type="text"
              size="small"
              icon={<Search size={14} />}
              onClick={onOpenSearch}
              style={{ color: "var(--ent-text-secondary)" }}
            />
          </Tooltip>

          {/* Shift Simulation Modal */}
          <Tooltip title="排期推演与上线日调整">
            <Button
              type="text"
              size="small"
              icon={<Calendar size={14} />}
              onClick={onOpenShiftModal}
              style={{ color: "var(--ent-text-secondary)" }}
            />
          </Tooltip>

          {/* Export CSV */}
          <Tooltip title="导出交付台账 CSV">
            <Button
              type="text"
              size="small"
              icon={<Download size={14} />}
              onClick={onExportCsv}
              style={{ color: "var(--ent-text-secondary)" }}
            />
          </Tooltip>

          {/* Generate Report */}
          {onGenerateReport && (
            <Tooltip title="生成交付日报 Markdown 富文本">
              <Button
                type="text"
                size="small"
                icon={<FileText size={14} />}
                onClick={onGenerateReport}
                style={{ color: "var(--ent-text-secondary)" }}
              />
            </Tooltip>
          )}

          {/* Fullscreen Big Screen Presentation Toggle */}
          <Tooltip title={isFullscreen ? "退出大屏全屏模式" : "开启大屏数字指挥舱全屏模式"}>
            <Button
              type="primary"
              ghost
              size="small"
              icon={isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              onClick={onToggleFullscreen}
              style={{ color: "var(--ent-primary-hover)", borderColor: "var(--ent-border-strong)" }}
            />
          </Tooltip>
        </Space>
      </div>
    </header>
  );
};
