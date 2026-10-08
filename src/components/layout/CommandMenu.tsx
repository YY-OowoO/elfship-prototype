import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Modal, Input } from "antd";
import {
  MagnifyingGlass,
  Kanban,
  Package,
  ChartBar,
  UserCheck,
  BookOpen,
  Sliders,
  CalendarBlank,
  Sparkle,
  SpeakerHigh,
  SpeakerSimpleSlash,
  CaretRight,
} from "@phosphor-icons/react";
import type { LaunchBatch, PersonId, View } from "../../types";
import { PEOPLE, STAGES } from "../../mock";
import { currentItem, itemLight } from "../../logic";

interface CommandMenuProps {
  open: boolean;
  onClose: () => void;
  batch: LaunchBatch;
  currentView: View;
  onSelectView: (view: View) => void;
  onSelectActor: (actor: PersonId) => void;
  onSelectResourceLane: (laneId: string, itemId?: string) => void;
  onOpenShiftModal: () => void;
  onOpenCopilot: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

type CommandMenuItem = {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  iconClassName?: string;
  iconStandalone?: boolean;
  trailing?: React.ReactNode;
  onActivate: () => void;
  titleAddon?: React.ReactNode;
  current?: boolean;
};

type CommandMenuSection = {
  title: string;
  items: CommandMenuItem[];
};

export const CommandMenu: React.FC<CommandMenuProps> = ({
  open,
  onClose,
  batch,
  currentView,
  onSelectView,
  onSelectActor,
  onSelectResourceLane,
  onOpenShiftModal,
  onOpenCopilot,
  isMuted,
  onToggleMute,
}) => {
  const [query, setQuery] = useState("");
  const [activeCommandIndex, setActiveCommandIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const commandItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 全局快捷键监听 Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    setQuery("");
    setActiveCommandIndex(0);

    const onGlobalEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", onGlobalEsc);

    window.requestAnimationFrame(() => inputRef.current?.focus());

    return () => {
      window.removeEventListener("keydown", onGlobalEsc);
    };
  }, [open, onClose]);

  // 资源项检索
  const matchedLanes = useMemo(() => {
    if (!query.trim()) return batch.lanes.slice(0, 5);
    const q = query.toLowerCase();
    return batch.lanes.filter(
      (lane) =>
        lane.name.toLowerCase().includes(q) ||
        lane.type.toLowerCase().includes(q) ||
        lane.items.some((it) => PEOPLE[it.driId]?.name.toLowerCase().includes(q)),
    );
  }, [batch.lanes, query]);

  // 人员检索
  const matchedPeople = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return Object.values(PEOPLE).filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    );
  }, [query]);

  // 视图跳转列表
  const views = [
    {
      key: "board" as View,
      label: "交付主看板",
      desc: "7 大流程节点全景看板",
      icon: <Kanban size={16} />,
    },
    {
      key: "resources" as View,
      label: "资产全量台账",
      desc: "资源清单与交付物凭证",
      icon: <Package size={16} />,
    },
    {
      key: "analytics" as View,
      label: "风险驾驶舱",
      desc: "Andon 黄红灯预警与堵点分析",
      icon: <ChartBar size={16} />,
    },
    {
      key: "mine" as View,
      label: "我的待办与审核",
      desc: "当前身份主责与待我确认",
      icon: <UserCheck size={16} />,
    },
    {
      key: "portal" as View,
      label: "平台交付白皮书",
      desc: "SOP理念与快速上手",
      icon: <BookOpen size={16} />,
    },
    {
      key: "templates" as View,
      label: "7 节点标准模板",
      desc: "各资源类型相对工期",
      icon: <Sliders size={16} />,
    },
  ];

  const matchedViews = useMemo(() => {
    if (!query.trim()) return views;
    const q = query.toLowerCase();
    return views.filter((v) => v.label.toLowerCase().includes(q) || v.desc.toLowerCase().includes(q));
  }, [query, views]);

  const quickActionMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const keywords = ["推演", "排期", "催办", "音效", "ai", "shift"];
    return keywords.some((kw) => q.includes(kw));
  }, [query]);

  const sections = useMemo<CommandMenuSection[]>(() => {
    const result: CommandMenuSection[] = [];

    if (quickActionMatch) {
      result.push({
        title: "常用快捷操作",
        items: [
          {
            id: "action-shift",
            title: "上线日顺延排期推演",
            description: "模拟推演批次延期对下游 5 个节点的影响",
            icon: <CalendarBlank size={16} />,
            iconClassName: "bg-blue-50 text-blue-600",
            trailing: <span className="command-item-shortcut">SHIFT</span>,
            onActivate: () => {
              onOpenShiftModal();
              onClose();
            },
          },
          {
            id: "action-copilot",
            title: "呼起精灵 AI 辅助中枢",
            description: "智能分析交付堵点，一键生成催办与诊断建议",
            icon: <Sparkle size={16} />,
            iconClassName: "bg-purple-50 text-purple-600",
            trailing: <span className="command-item-shortcut">AI</span>,
            onActivate: () => {
              onOpenCopilot();
              onClose();
            },
          },
          {
            id: "action-mute",
            title: isMuted ? "开启音效反馈" : "静音所有音效",
            description: "控制操作与安灯警报音效反馈",
            icon: isMuted ? <SpeakerHigh size={16} /> : <SpeakerSimpleSlash size={16} />,
            iconClassName: "bg-slate-50 text-slate-600",
            onActivate: () => {
              onToggleMute();
              onClose();
            },
          },
        ],
      });
    }

    if (matchedViews.length > 0) {
      result.push({
        title: "视图与工作区跳转",
        items: matchedViews.map((v) => ({
          id: `view-${v.key}`,
          title: v.label,
          description: v.desc,
          icon: v.icon,
          trailing:
            currentView === v.key ? (
              <span className="command-item-tag current">当前视图</span>
            ) : (
              <CaretRight size={14} className="command-item-arrow" />
            ),
          current: currentView === v.key,
          onActivate: () => {
            onSelectView(v.key);
            onClose();
          },
        })),
      });
    }

    if (matchedLanes.length > 0) {
      result.push({
        title: `交付入库资源 (${matchedLanes.length})`,
        items: matchedLanes.map((lane) => {
          const cur = currentItem(lane);
          const light = cur ? itemLight(cur) : "none";
          const stageMeta = cur ? STAGES.find((s) => s.key === cur.stage) : null;
          return {
            id: `lane-${lane.id}`,
            title: lane.name,
            description: `当前阶段: ${stageMeta?.name || "完成"} · 主责: ${cur ? PEOPLE[cur.driId]?.name : "无"}`,
            icon: <span className={`command-item-light-dot ${light}`} />,
            iconStandalone: true,
            titleAddon: <span className="command-item-type-tag">{lane.type}</span>,
            trailing: <span className="command-item-badge">查看卡片</span>,
            onActivate: () => {
              onSelectView("board");
              onSelectResourceLane(lane.id, cur?.id);
              onClose();
            },
          };
        }),
      });
    }

    if (matchedPeople.length > 0) {
      result.push({
        title: "快速切换 DRI 主责视角",
        items: matchedPeople.map((person) => ({
          id: `person-${person.id}`,
          title: person.name,
          description: person.title,
          icon: (
            <span className="command-avatar-dot" style={{ backgroundColor: `hsl(${person.hue}, 70%, 45%)` }}>
              {person.initials}
            </span>
          ),
          iconStandalone: true,
          trailing: <span className="command-item-badge">切换身份</span>,
          onActivate: () => {
            onSelectActor(person.id);
            onClose();
          },
        })),
      });
    }

    return result;
  }, [
    currentView,
    isMuted,
    matchedLanes,
    matchedPeople,
    matchedViews,
    onClose,
    onOpenCopilot,
    onOpenShiftModal,
    onSelectActor,
    onSelectResourceLane,
    onSelectView,
    onToggleMute,
    quickActionMatch,
  ]);

  const commandItems = useMemo(() => sections.flatMap((section) => section.items), [sections]);

  const activateByIndex = useCallback(
    (index: number) => {
      const item = commandItems[index];
      if (!item) return;
      item.onActivate();
    },
    [commandItems],
  );

  const moveCommand = useCallback(
    (delta: number) => {
      if (commandItems.length === 0) return;
      setActiveCommandIndex((prev) => {
        const base = prev < 0 ? 0 : prev;
        return (base + delta + commandItems.length) % commandItems.length;
      });
    },
    [commandItems.length],
  );

  const onCommandNavKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (commandItems.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveCommand(1);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveCommand(-1);
        return;
      }
      if (e.key === "Home") {
        e.preventDefault();
        setActiveCommandIndex(0);
        return;
      }
      if (e.key === "End") {
        e.preventDefault();
        setActiveCommandIndex(commandItems.length - 1);
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activateByIndex(activeCommandIndex);
      }
    },
    [activeCommandIndex, activateByIndex, commandItems.length, moveCommand],
  );

  useEffect(() => {
    if (!open) return;
    if (activeCommandIndex < 0) return;
    const node = commandItemRefs.current[activeCommandIndex];
    node?.focus();
  }, [activeCommandIndex, open]);

  useEffect(() => {
    if (!open) return;
    if (commandItems.length === 0) {
      setActiveCommandIndex(-1);
    } else if (activeCommandIndex >= commandItems.length) {
      setActiveCommandIndex(0);
    } else if (activeCommandIndex < 0) {
      setActiveCommandIndex(0);
    }
  }, [activeCommandIndex, commandItems.length, open]);

  let renderIndex = 0;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={640}
      className="elf-command-modal"
      destroyOnHidden
    >
      <div className="command-dialog">
        {/* 输入框 */}
        <div className="command-search-header">
          <Input
            ref={inputRef as any}
            className="command-input"
            variant="borderless"
            placeholder="搜索入库资源、主责人、视图或指令..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onCommandNavKeyDown}
            prefix={<MagnifyingGlass size={18} className="command-search-icon" style={{ marginRight: 6, color: "var(--muted)" }} />}
            suffix={
              <button
                type="button"
                className="command-esc-btn"
                onClick={onClose}
                aria-label="关闭命令面板"
              >
                ESC
              </button>
            }
          />
        </div>

        <div className="command-content-body" onKeyDown={onCommandNavKeyDown}>
          {sections.length > 0 ? (
            sections.map((section) => (
              <div key={section.title} className="command-section">
                <div className="command-section-title">{section.title}</div>
                <div className="command-list">
                  {section.items.map((item) => {
                    const commandIndex = renderIndex++;
                    const isFocused = commandIndex === activeCommandIndex;
                    return (
                      <button
                        key={item.id}
                        ref={(el) => {
                          commandItemRefs.current[commandIndex] = el;
                        }}
                        type="button"
                        className={`command-item ${item.current ? "current" : ""} ${isFocused ? "is-focused" : ""}`}
                        tabIndex={isFocused ? 0 : -1}
                        onMouseEnter={() => setActiveCommandIndex(commandIndex)}
                        onFocus={() => setActiveCommandIndex(commandIndex)}
                        onKeyDown={onCommandNavKeyDown}
                        onClick={() => {
                          activateByIndex(commandIndex);
                        }}
                        aria-label={`${item.title} ${item.description ?? ""}`}
                      >
                        {item.iconStandalone ? item.icon : (
                          <span className={`command-item-icon ${item.iconClassName || ""}`}>{item.icon}</span>
                        )}
                        <div className="command-item-main">
                          <div className="command-item-title-row">
                            <span className="command-item-title">{item.title}</span>
                            {item.titleAddon}
                          </div>
                          <span className="command-item-sub">{item.description}</span>
                        </div>
                        {item.trailing}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="command-empty">
              <span>未找到与 "{query}" 匹配的资源或指令</span>
            </div>
          )}
        </div>

        {/* 底部按键提示 */}
        <div className="command-footer">
          <span className="command-tip">
            <kbd>↑</kbd> <kbd>↓</kbd> 移动选择
          </span>
          <span className="command-tip">
            <kbd>↵</kbd> 确认执行
          </span>
          <span className="command-tip">
            <kbd>ESC</kbd> 关闭
          </span>
        </div>
      </div>
    </Modal>
  );
};
