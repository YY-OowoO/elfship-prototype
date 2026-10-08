import { Modal, Typography, Tag, Space, Divider } from "antd";
import { ArrowsClockwise, Lightning, SlidersHorizontal, Sparkle } from "../icons";

const { Text, Title } = Typography;

interface ShortcutItem {
  keyLabel: string[];
  desc: string;
  category: "views" | "flow" | "system";
}

const SHORTCUTS: ShortcutItem[] = [
  { keyLabel: ["1"], desc: "切换至「流水线看板」", category: "views" },
  { keyLabel: ["2"], desc: "切换至「时序甘特」", category: "views" },
  { keyLabel: ["3"], desc: "切换至「我的待办」", category: "views" },
  { keyLabel: ["4"], desc: "切换至「资源大盘」", category: "views" },
  { keyLabel: ["5"], desc: "切换至「效能分析」", category: "views" },

  { keyLabel: ["J", "↓"], desc: "向下 / 向右切换卡片焦点", category: "flow" },
  { keyLabel: ["K", "↑"], desc: "向上 / 向左切换卡片焦点", category: "flow" },
  { keyLabel: ["Enter"], desc: "打开当前焦点卡片详情", category: "flow" },
  { keyLabel: ["Space"], desc: "快速透视 SVN 交付证据", category: "flow" },

  { keyLabel: ["⌘", "K"], desc: "全局检索资产与工序", category: "system" },
  { keyLabel: ["E"], desc: "唤起「交付精灵」AI 诊断与日报", category: "system" },
  { keyLabel: ["M"], desc: "切换「操作音效」开 / 关", category: "system" },
  { keyLabel: ["?"], desc: "打开此快捷键帮助中心", category: "system" },
];

export function ShortcutModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
      className="elf-shortcut-modal"
      centered
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkle size={18} weight="duotone" color="var(--brand-primary, #1677ff)" />
          <span style={{ fontWeight: 700 }}>ElfShip 全键盘快捷键中心</span>
          <Tag color="cyan">Power-User</Tag>
        </div>
      }
    >
      <div style={{ marginTop: 12 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          为游戏主策划、美术制片与技术总监打造的毫秒级全键盘流操作指南。
        </Text>

        <div style={{ marginTop: 16 }}>
          <Title level={5} style={{ fontSize: 13, marginBottom: 8, color: "var(--brand-primary)" }}>
            <Lightning size={13} weight="duotone" style={{ marginRight: 4 }} />
            核心视图秒切 (View Switching)
          </Title>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {SHORTCUTS.filter((s) => s.category === "views").map((item) => (
              <div
                key={item.desc}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: "var(--bg-tag, rgba(0,0,0,0.03))",
                }}
              >
                <Text style={{ fontSize: 12 }}>{item.desc}</Text>
                <Space size={3}>
                  {item.keyLabel.map((k) => (
                    <kbd
                      key={k}
                      style={{
                        padding: "2px 6px",
                        fontSize: 11,
                        fontWeight: 700,
                        background: "var(--bg-canvas, #fff)",
                        border: "1px solid var(--border-subtle, #d9d9d9)",
                        borderRadius: 4,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                        minWidth: 20,
                        textAlign: "center",
                        display: "inline-block",
                      }}
                    >
                      {k}
                    </kbd>
                  ))}
                </Space>
              </div>
            ))}
          </div>
        </div>

        <Divider style={{ margin: "14px 0" }} />

        <div>
          <Title level={5} style={{ fontSize: 13, marginBottom: 8, color: "var(--brand-primary)" }}>
            <ArrowsClockwise size={13} weight="duotone" style={{ marginRight: 4 }} />
            卡片焦点流转 (Card Navigation)
          </Title>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {SHORTCUTS.filter((s) => s.category === "flow").map((item) => (
              <div
                key={item.desc}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: "var(--bg-tag, rgba(0,0,0,0.03))",
                }}
              >
                <Text style={{ fontSize: 12 }}>{item.desc}</Text>
                <Space size={3}>
                  {item.keyLabel.map((k) => (
                    <kbd
                      key={k}
                      style={{
                        padding: "2px 6px",
                        fontSize: 11,
                        fontWeight: 700,
                        background: "var(--bg-canvas, #fff)",
                        border: "1px solid var(--border-subtle, #d9d9d9)",
                        borderRadius: 4,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                        minWidth: 20,
                        textAlign: "center",
                        display: "inline-block",
                      }}
                    >
                      {k}
                    </kbd>
                  ))}
                </Space>
              </div>
            ))}
          </div>
        </div>

        <Divider style={{ margin: "14px 0" }} />

        <div>
          <Title level={5} style={{ fontSize: 13, marginBottom: 8, color: "var(--brand-primary)" }}>
            <SlidersHorizontal size={13} weight="duotone" style={{ marginRight: 4 }} />
            常用系统工具 (System Tools)
          </Title>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {SHORTCUTS.filter((s) => s.category === "system").map((item) => (
              <div
                key={item.desc}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: "var(--bg-tag, rgba(0,0,0,0.03))",
                }}
              >
                <Text style={{ fontSize: 12 }}>{item.desc}</Text>
                <Space size={3}>
                  {item.keyLabel.map((k) => (
                    <kbd
                      key={k}
                      style={{
                        padding: "2px 6px",
                        fontSize: 11,
                        fontWeight: 700,
                        background: "var(--bg-canvas, #fff)",
                        border: "1px solid var(--border-subtle, #d9d9d9)",
                        borderRadius: 4,
                        boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                        minWidth: 20,
                        textAlign: "center",
                        display: "inline-block",
                      }}
                    >
                      {k}
                    </kbd>
                  ))}
                </Space>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
