import React, { useMemo } from "react";
import { Avatar, Dropdown, Tag, Tooltip } from "antd";
import type { MenuProps } from "antd";
import {
  Kanban,
  Package,
  ChartBar,
  ListBullets,
  UserCheck,
  BookOpen,
  Sliders,
  CaretLeft,
  CaretRight,
  SpeakerHigh,
  SpeakerSimpleSlash,
  Keyboard,
  ArrowsInLineHorizontal,
  ArrowsOutLineHorizontal,
  CaretUpDown,
} from "@phosphor-icons/react";
import type { DensityMode, PersonId, View } from "../../types";
import { PEOPLE } from "../../mock";
import { EmotionBall } from "../../emotion-ball";
import type { ThemeConfig } from "../../tokens";

interface AppSidebarProps {
  currentView: View;
  onSelectView: (view: View) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  actor: PersonId;
  onSelectActor: (actor: PersonId) => void;
  counts: {
    board: number;
    resources: number;
    riskCount: number;
    mineCount: number;
  };
  isMuted: boolean;
  onToggleMute: () => void;
  densityMode: DensityMode;
  onToggleDensity: () => void;
  onOpenCopilot: () => void;
  onOpenShortcuts: () => void;
  theme?: ThemeConfig;
}

interface NavItem {
  key: View;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  isNew?: boolean;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentView,
  onSelectView,
  collapsed,
  onToggleCollapse,
  actor,
  onSelectActor,
  counts,
  isMuted,
  onToggleMute,
  densityMode,
  onToggleDensity,
  onOpenCopilot,
  onOpenShortcuts,
  theme,
}) => {
  const currentPerson = PEOPLE[actor] || Object.values(PEOPLE)[0];

  const userMenuItems: MenuProps["items"] = useMemo(() => [
    {
      key: "group-dri",
      type: "group",
      label: (
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          切换主责视角 (DRI)
        </span>
      ),
      children: Object.values(PEOPLE).map((p) => ({
        key: p.id,
        label: (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minWidth: 160 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar
                size={20}
                style={{
                  backgroundColor: `hsl(${p.hue}, 70%, 45%)`,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {p.initials}
              </Avatar>
              <span style={{ fontWeight: p.id === actor ? 700 : 500 }}>{p.name}</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>{p.title}</span>
            </div>
            {p.id === actor && (
              <Tag color="processing" style={{ margin: 0, fontSize: 10, lineHeight: "16px", padding: "0 4px" }}>
                当前
              </Tag>
            )}
          </div>
        ),
      })),
    },
    {
      type: "divider",
    },
    {
      key: "action-mine",
      icon: <UserCheck size={15} weight="duotone" />,
      label: "我的待办与门禁审核",
    },
  ], [actor]);

  const navItems: NavGroup[] = [
    {
      group: "核心工作区",
      items: [
        {
          key: "board",
          label: "交付主看板",
          sublabel: "7 大节点全景流转",
          icon: <Kanban size={18} weight={currentView === "board" ? "fill" : "regular"} />,
          badge: counts.riskCount > 0 ? (
            <span className="sidebar-pill pill-danger" title={`${counts.riskCount} 项阻塞/临期卡点`}>
              <span className="sidebar-pill-dot" />
              <span>{counts.riskCount}</span>
            </span>
          ) : null,
        },
        {
          key: "resources",
          label: "资产全量台账",
          sublabel: "交付物清单与状态",
          icon: <Package size={18} weight={currentView === "resources" ? "fill" : "regular"} />,
          badge: (
            <span className="sidebar-pill pill-neutral" title={`全量台账共 ${counts.resources} 项资产`}>
              {counts.resources}
            </span>
          ),
        },
        {
          key: "analytics",
          label: "风险驾驶舱",
          sublabel: "黄红灯与瓶颈分析",
          icon: <ChartBar size={18} weight={currentView === "analytics" ? "fill" : "regular"} />,
          badge: counts.riskCount > 0 ? (
            <span className="sidebar-pill pill-warning" title={`${counts.riskCount} 项预警指标`}>
              <span className="sidebar-pill-dot" />
              <span>{counts.riskCount}</span>
            </span>
          ) : null,
        },
        {
          key: "mine",
          label: "我的待办与审核",
          sublabel: "主责事项与门禁确认",
          icon: <UserCheck size={18} weight={currentView === "mine" ? "fill" : "regular"} />,
          badge: counts.mineCount > 0 ? (
            <span className="sidebar-pill pill-primary" title={`${counts.mineCount} 项待我处理/确认`}>
              <span className="sidebar-pill-dot" />
              <span>{counts.mineCount}</span>
            </span>
          ) : null,
        },
        {
          key: "list",
          label: "工作项列表",
          sublabel: "平铺数据表格",
          icon: <ListBullets size={18} weight={currentView === "list" ? "fill" : "regular"} />,
        },
      ],
    },
    {
      group: "规范与标准",
      items: [
        {
          key: "portal",
          label: "平台交付白皮书",
          sublabel: "SOP理念与快速上手",
          icon: <BookOpen size={18} weight={currentView === "portal" ? "fill" : "regular"} />,
          isNew: true,
        },
        {
          key: "templates",
          label: "7 节点标准模板",
          sublabel: "相对上线日工期定义",
          icon: <Sliders size={18} weight={currentView === "templates" ? "fill" : "regular"} />,
        },
      ],
    },
  ];

  return (
    <aside className={`elf-sidebar ${collapsed ? "is-collapsed" : ""}`}>
      {/* 顶部 Brand 区域 */}
      <div className="sidebar-header">
        <button
          type="button"
          className="sidebar-brand"
          onClick={() => onSelectView("board")}
          aria-label="返回看板主页"
          title="返回看板主页"
        >
          <div className="sidebar-logo sidebar-logo-ball" title="精灵交付助手 · 点击唤起看板">
            <EmotionBall
              size={32}
              emotion={counts.riskCount > 0 ? "34" : "02"}
              shape="blob"
              color={theme?.ballColor || "#2563eb"}
              eyeColor={theme?.ballEyeColor || "#1e3a8a"}
              interactive={true}
              lite={false}
            />
          </div>
          {!collapsed && (
            <div className="sidebar-brand-text">
              <div className="sidebar-brand-title">
                ElfShip <span className="sidebar-brand-badge">SOP 2.0</span>
              </div>
              <div className="sidebar-brand-sub">精灵上线交付管控平台</div>
            </div>
              )}
        </button>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? "展开侧边栏" : "折叠侧边栏"}
          aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
        >
          {collapsed ? <CaretRight size={14} /> : <CaretLeft size={14} />}
        </button>
      </div>

      {/* 导航菜单区域 */}
      <div className="sidebar-nav">
        {navItems.map((group, gIdx) => (
          <div key={gIdx} className="sidebar-group">
            {!collapsed && <div className="sidebar-group-label">{group.group}</div>}
            <div className="sidebar-group-items">
              {group.items.map((item) => {
                const isActive = currentView === item.key;
                const buttonContent = (
                  <button
                    key={item.key}
                    className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                    onClick={() => onSelectView(item.key)}
                    type="button"
                    aria-current={isActive ? "page" : undefined}
                    aria-label={item.label}
                  >
                    <span className="sidebar-nav-icon">
                      {item.icon}
                      {collapsed && item.badge ? (
                        <span className="sidebar-collapsed-pip" />
                      ) : null}
                    </span>
                    {!collapsed && (
                      <span className="sidebar-nav-label-wrap">
                        <span className="sidebar-nav-label">{item.label}</span>
                        {item.sublabel && (
                          <span className="sidebar-nav-sublabel">{item.sublabel}</span>
                        )}
                      </span>
                    )}
                    {!collapsed && item.badge && (
                      <span className="sidebar-nav-extra">{item.badge}</span>
                    )}
                    {!collapsed && item.isNew && (
                      <span className="sidebar-tag-new">GUIDE</span>
                    )}
                  </button>
                );

                if (collapsed) {
                  return (
                    <Tooltip
                      key={item.key}
                      placement="right"
                      title={
                        <div style={{ minWidth: 120 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <span style={{ fontWeight: 600 }}>{item.label}</span>
                            {item.badge}
                          </div>
                          {item.sublabel && (
                            <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>{item.sublabel}</div>
                          )}
                        </div>
                      }
                    >
                      {buttonContent}
                    </Tooltip>
                  );
                }

                return buttonContent;
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 底部功能栏 */}
      <div className="sidebar-footer">
        {/* 精灵 AI Copilot 呼起入口 (线稿模式 EmotionBall) */}
        <button
          type="button"
          className="sidebar-copilot-card"
          onClick={onOpenCopilot}
          title="呼起精灵 AI 辅助中枢"
          aria-label="呼起精灵 AI 辅助中枢"
        >
          <div className="sidebar-copilot-icon sidebar-copilot-ball">
            <EmotionBall
              size={collapsed ? 28 : 28}
              emotion={counts.riskCount > 0 ? "34" : "01"}
              shape="blob"
              sketch={true}
              color={theme?.accent || "#7c3aed"}
              eyeColor={theme?.sketchInk || "#3b0764"}
              interactive={false}
              autostart={true}
              lite={false}
            />
          </div>
          {!collapsed && (
            <div className="sidebar-copilot-text">
              <div className="sidebar-copilot-title">精灵 Copilot</div>
              <div className="sidebar-copilot-desc">排期推演与催办中枢</div>
            </div>
          )}
          {!collapsed && <span className="sidebar-copilot-shortcut">AI</span>}
        </button>

        {/* 快捷工具栏 */}
        <div className="sidebar-quick-tools">
          <Tooltip title={isMuted ? "开启环境反馈音效" : "静音环境音效"}>
            <button
              type="button"
              className={`sidebar-tool-btn ${isMuted ? "muted" : "active"}`}
              aria-pressed={isMuted ? false : true}
              aria-label={isMuted ? "开启环境反馈音效" : "静音环境反馈音效"}
              onClick={onToggleMute}
            >
              {isMuted ? <SpeakerSimpleSlash size={16} /> : <SpeakerHigh size={16} />}
            </button>
          </Tooltip>

          <Tooltip title={densityMode === "compact" ? "切换为标准行高" : "切换为紧凑信息流"}>
            <button
              type="button"
              className="sidebar-tool-btn"
              onClick={onToggleDensity}
              aria-label={densityMode === "compact" ? "切换为标准行高" : "切换为紧凑信息流"}
            >
              {densityMode === "compact" ? (
                <ArrowsOutLineHorizontal size={16} />
              ) : (
                <ArrowsInLineHorizontal size={16} />
              )}
            </button>
          </Tooltip>

          <Tooltip title="查看快捷键清单 (?)">
            <button
              type="button"
              className="sidebar-tool-btn"
              onClick={onOpenShortcuts}
              aria-label="查看快捷键清单"
            >
              <Keyboard size={16} />
            </button>
          </Tooltip>
        </div>

        {/* 当前登录人 DRI 身份切换 (Ant Design 标准化 Dropdown 组件) */}
        <div className="sidebar-user-section">
          <Dropdown
            menu={{
              items: userMenuItems,
              selectedKeys: [actor],
              onClick: ({ key }) => {
                if (key === "action-mine") {
                  onSelectView("mine");
                } else if (key in PEOPLE) {
                  onSelectActor(key as PersonId);
                }
              },
            }}
            trigger={["click"]}
            placement={collapsed ? "topRight" : "topLeft"}
            overlayClassName="sidebar-user-dropdown-overlay"
          >
            {collapsed ? (
              <Tooltip placement="right" title={`当前主责: ${currentPerson.name} (${currentPerson.title}) · 点击切换`}>
                <button
                  type="button"
                  className="sidebar-user-card is-collapsed-card"
                  aria-label={`当前主责 ${currentPerson.name}，点击切换身份`}
                >
                  <Avatar
                    size={32}
                    style={{
                      backgroundColor: `hsl(${currentPerson.hue}, 70%, 45%)`,
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                      border: "1.5px solid rgba(255, 255, 255, 0.9)",
                      boxShadow: "0 2px 6px rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    {currentPerson.initials}
                  </Avatar>
                </button>
              </Tooltip>
            ) : (
              <button
                type="button"
                className="sidebar-user-card"
                aria-label={`当前主责 ${currentPerson.name} (${currentPerson.title})，点击切换主责视角`}
              >
                <Avatar
                  size={28}
                  style={{
                    backgroundColor: `hsl(${currentPerson.hue}, 70%, 45%)`,
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  {currentPerson.initials}
                </Avatar>
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name">{currentPerson.name}</div>
                  <div className="sidebar-user-role">{currentPerson.title}</div>
                </div>
                <CaretUpDown size={14} className="sidebar-user-chevron" />
              </button>
            )}
          </Dropdown>
        </div>
      </div>
    </aside>
  );
};
