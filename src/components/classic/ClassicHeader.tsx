import { Button, Select } from "antd";
import type { LaunchBatch, PersonId } from "../../types";
import { PEOPLE, SCENARIO_PRESETS, type ScenarioPresetKey } from "../../mock";
import { formatDay } from "../../logic";

interface ClassicHeaderProps {
  batches: LaunchBatch[];
  activeBatch: LaunchBatch;
  onSelectBatch: (id: string) => void;
  actor: PersonId;
  onSelectActor: (actor: PersonId) => void;
  previewMode: "companion" | "classic";
  onTogglePreviewMode: (mode: "companion" | "classic") => void;
  onOpenShiftModal: () => void;
  onExportCsv: () => void;
  currentScenario?: ScenarioPresetKey;
  onSelectScenario?: (key: ScenarioPresetKey) => void;
}

export function ClassicHeader({
  batches,
  activeBatch,
  onSelectBatch,
  actor,
  onSelectActor,
  previewMode,
  onTogglePreviewMode,
  onOpenShiftModal,
  onExportCsv,
  currentScenario = "baseline",
  onSelectScenario,
}: ClassicHeaderProps) {
  const previewModeText: Record<"companion" | "classic", string> = {
    companion: "方案一：灵动伴侣体验版",
    classic: "方案二：经典工程管控台",
  };

  return (
    <header className="classic-header">
      <div className="classic-header-main">
        {/* 左侧：品牌 Logo 与 方案切换器 */}
        <div className="classic-brand-area">
          <div className="classic-logo-badge">ES</div>
          <div className="classic-brand-title">
            精灵上线交付管控平台
            <span className="classic-brand-tag">Studio Pipeline</span>
          </div>

          <div className="preview-switcher classic-preview-toggle" role="group" aria-label="预览方案切换">
            <button
              type="button"
              className={`preview-switch-btn ${previewMode === "companion" ? "is-active" : ""}`}
              onClick={() => onTogglePreviewMode("companion")}
              aria-pressed={previewMode === "companion"}
              aria-label={`切换到${previewModeText["companion"]}`}
              disabled={previewMode === "companion"}
              title={previewModeText["companion"]}
            >
              {previewModeText["companion"]}
            </button>
            <button
              type="button"
              className={`preview-switch-btn ${previewMode === "classic" ? "is-active" : ""}`}
              onClick={() => onTogglePreviewMode("classic")}
              aria-pressed={previewMode === "classic"}
              aria-label={`切换到${previewModeText["classic"]}`}
              disabled={previewMode === "classic"}
              title={previewModeText["classic"]}
            >
              {previewModeText["classic"]}
            </button>
          </div>

          {onSelectScenario && (
            <div style={{ marginLeft: 8 }}>
              <Select
                size="small"
                value={currentScenario}
                onChange={onSelectScenario}
                style={{ width: 170 }}
                options={SCENARIO_PRESETS.map((s) => ({
                  value: s.key,
                  label: (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background:
                            s.badgeColor === "volcano"
                              ? "#f97316"
                              : s.badgeColor === "green"
                              ? "#10b981"
                              : s.badgeColor === "magenta"
                              ? "#ec4899"
                              : s.badgeColor === "orange"
                              ? "#f59e0b"
                              : "#3b82f6",
                        }}
                      />
                      <span style={{ fontSize: 12 }}>{s.badge}</span>
                    </div>
                  ),
                }))}
              />
            </div>
          )}
        </div>

        {/* 右侧：批次、身份视角与操作 */}
        <div className="classic-toolbar-right">
          {/* 批次选择 */}
          <Select
            value={activeBatch.id}
            onChange={onSelectBatch}
            style={{ width: 190 }}
            options={batches.map((b) => ({
              label: `${b.name} (${formatDay(b.launchDate)})`,
              value: b.id,
            }))}
            size="small"
          />

          {/* 身份切换 */}
          <Select
            value={actor}
            onChange={onSelectActor}
            style={{ width: 160 }}
            size="small"
            options={Object.values(PEOPLE).map((p) => ({
              label: `${p.name} · ${p.title}`,
              value: p.id,
            }))}
          />

          {/* 快捷操作 */}
          <Button size="small" onClick={onOpenShiftModal}>
            调整上线日
          </Button>

          <Button size="small" onClick={onExportCsv}>
            导出交付清单
          </Button>
        </div>
      </div>
    </header>
  );
}
