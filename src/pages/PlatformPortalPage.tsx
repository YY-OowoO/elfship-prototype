import React from "react";
import {
  RocketLaunch,
  Kanban,
  ShieldCheck,
  WarningCircle,
  GitMerge,
  Clock,
  ArrowRight,
  Sparkle,
  Target,
  UsersThree,
} from "@phosphor-icons/react";
import type { View } from "../types";
import { STAGES } from "../mock";
import { ThreeDeliveryPipeline } from "../components/three/ThreeDeliveryPipeline";

interface PlatformPortalPageProps {
  onNavigate: (view: View) => void;
}

export const PlatformPortalPage: React.FC<PlatformPortalPageProps> = ({ onNavigate }) => {
  const corePrinciples = [
    {
      icon: <Clock size={24} className="text-blue-500" />,
      title: "以整体上线日为锚点 (T-N)",
      desc: "所有入库资源的截止时间均通过相对工作日偏移自动推算。当上线日调整时，未钉死的下游节点自动随动重算，彻底告别手工改表带来的口径错漏。",
      tag: "动态随动",
    },
    {
      icon: <WarningCircle size={24} className="text-amber-500" />,
      title: "丰田 Andon 黄红灯预警",
      desc: "截止前 1 个工作日自动标黄预警，到期未完成自动标红报警。警报是提醒与协作信号，绝不阻塞整个生产流水线，保持其他资源高速流转。",
      tag: "信号预警",
    },
    {
      icon: <ShieldCheck size={24} className="text-emerald-500" />,
      title: "AYON 证据链硬核门禁",
      desc: "未达到完成条件绝不允许流转至下一节点。门禁是对交付物与 SVN 凭证的严谨校验，必须由独立门禁确认人签发，杜绝无依据空转。",
      tag: "质量守卫",
    },
    {
      icon: <GitMerge size={24} className="text-purple-500" />,
      title: "按资源单链隔离故障",
      desc: "某一道具或时装发生卡点退回时，系统仅锁定该资源下游节点。同一批次下的其他 3D 模型、动效与音频资源继续独立推进，风险完全隔离。",
      tag: "故障隔离",
    },
  ];

  const roles = [
    {
      title: "主责人 (DRI)",
      role: "Directly Responsible Individual",
      desc: "每个工作项在任意时刻恰好有且仅有 1 位主责人，对其交付质量与进度负全责。",
      color: "border-blue-500 bg-blue-50/50",
    },
    {
      title: "门禁确认人",
      role: "Gatekeeper Approver",
      desc: "独立于主责人，负责核验 SVN 路径、验收报告与质检指标，确认通过后方可放行流转。",
      color: "border-emerald-500 bg-emerald-50/50",
    },
    {
      title: "统筹与制片",
      role: "Producer & Coordinator",
      desc: "维护批次基准上线日、调整资源排期、处理红黄灯升级事件与跨组资源协同。",
      color: "border-purple-500 bg-purple-50/50",
    },
  ];

  const faqs = [
    {
      q: "上线日发生推迟或提前，看板会发生什么变化？",
      a: "系统会根据各资源节点设定的相对工作日偏移量（如 T-7, T-2），结合中国法定节假日日历，自动批量重算所有未手动钉死日期的工作项截止时间，并完整记录审计追踪日志。",
    },
    {
      q: "工作项被质检退回（Reject / Rework）后如何处理？",
      a: "工作项状态将变为「待返工」，并自动锁定该资源的后续所有下游节点。主责人根据退回原因完成整改并再次提交后，门禁人重新复检通过方可解锁下游。",
    },
    {
      q: "哪些资源可以跳过（Skip）部分节点？",
      a: "对于无需 IP 审核或无需单独 SVN 提交的轻量资产（如常规文案、活动配置），模板允许设置节点为「不适用/跳过」，进度分母将动态按实际有效节点数计算，保证数据真实。",
    },
  ];

  return (
    <div className="portal-container">
      {/* 顶部 Hero 区域 */}
      <section className="portal-hero">
        <div className="portal-hero-badge">
          <Sparkle size={14} weight="fill" className="text-amber-500" />
          <span>精灵上线交付 SOP 体系白皮书 · 2.0 正式版</span>
        </div>
        <h1 className="portal-hero-title">
          可视管控 · 责任到人 · 门禁守卫 · 风险隔离
        </h1>
        <p className="portal-hero-desc">
          以整体上线日为基准锚点，将 3D模型、时装、坐骑、场景等不同入库资源的交付过程统一纳入全景可视化看板。通过严格的流程门禁与丰田安灯系统，推动资产高质量准时交付。
        </p>

        {/* 3D 交付立体导轨 (Linear / Stripe 风格纯净导轨) */}
        <div style={{ margin: "14px 0", borderRadius: 12, overflow: "hidden", background: "rgba(241, 245, 249, 0.4)", border: "1px solid rgba(226, 232, 240, 0.6)" }}>
          <ThreeDeliveryPipeline height={140} />
        </div>

        <div className="portal-hero-actions">
          <button className="portal-primary-btn" onClick={() => onNavigate("board")}>
            <Kanban size={18} weight="bold" />
            <span>进入交付主看板</span>
            <ArrowRight size={16} />
          </button>
          <button className="portal-secondary-btn" onClick={() => onNavigate("resources")}>
            <Target size={18} />
            <span>查看资产台账</span>
          </button>
        </div>
      </section>

      {/* 7 主流程节点可视化 Pipeline */}
      <section className="portal-section">
        <div className="portal-section-header">
          <span className="portal-section-tag">标准交付管道</span>
          <h2 className="portal-section-title">横向七大主流程节点</h2>
          <p className="portal-section-sub">
            所有入库资源严格遵循七步标准流转，每一步均设有准入准出标准与门禁条件。
          </p>
        </div>

        <div className="portal-pipeline-grid">
          {STAGES.map((stg, idx) => (
            <div key={stg.key} className="portal-pipeline-card">
              <div className="portal-pipeline-step">0{idx + 1}</div>
              <div
                className="portal-pipeline-dot"
                style={{ backgroundColor: stg.color }}
              />
              <h3 className="portal-pipeline-name">{stg.name}</h3>
              <span className="portal-pipeline-short">Stage: {stg.short}</span>
              <p className="portal-pipeline-desc">
                {idx === 0 && "确立版本上线基准日期与主干里程碑"}
                {idx === 1 && "拆解各资产交付周期与工作日相对偏移"}
                {idx === 2 && "美术与模型资产制作、材质贴图生成"}
                {idx === 3 && "资产文件提交至 SVN 仓库并打上版本号"}
                {idx === 4 && "品质审核、IP合规审查与规格核验"}
                {idx === 5 && "引擎内实机联调测试与功能验收"}
                {idx === 6 && "正式合并主干、完成版本资源入库"}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 四大核心架构支柱 (Bento Grid) */}
      <section className="portal-section">
        <div className="portal-section-header">
          <span className="portal-section-tag">设计哲学</span>
          <h2 className="portal-section-title">四大核心交付保障机制</h2>
          <p className="portal-section-sub">
            吸纳 Toyota Andon、AYON Publish 与 GitLab DRI 理念构建的现代化研发流。
          </p>
        </div>

        <div className="portal-bento-grid">
          {corePrinciples.map((item, idx) => (
            <div key={idx} className="portal-bento-card">
              <div className="portal-bento-top">
                <div className="portal-bento-icon">{item.icon}</div>
                <span className="portal-bento-tag">{item.tag}</span>
              </div>
              <h3 className="portal-bento-title">{item.title}</h3>
              <p className="portal-bento-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 角色与职责体系 */}
      <section className="portal-section">
        <div className="portal-section-header">
          <span className="portal-section-tag">RACI 职责模型</span>
          <h2 className="portal-section-title">角色职责与流转权限</h2>
        </div>

        <div className="portal-roles-grid">
          {roles.map((r, idx) => (
            <div key={idx} className={`portal-role-card ${r.color}`}>
              <div className="portal-role-header">
                <UsersThree size={20} className="text-slate-700" />
                <h3 className="portal-role-title">{r.title}</h3>
              </div>
              <span className="portal-role-subtitle">{r.role}</span>
              <p className="portal-role-desc">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 常见问题 FAQ */}
      <section className="portal-section">
        <div className="portal-section-header">
          <span className="portal-section-tag">FAQ 常见答疑</span>
          <h2 className="portal-section-title">使用与规则答疑</h2>
        </div>

        <div className="portal-faq-list">
          {faqs.map((faq, idx) => (
            <div key={idx} className="portal-faq-item">
              <div className="portal-faq-q">
                <span className="portal-faq-badge">Q</span>
                <span>{faq.q}</span>
              </div>
              <div className="portal-faq-a">
                <p>{faq.a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 底部快速开始 */}
      <section className="portal-footer-cta">
        <h2>准备好开始管控本次上线批次了吗？</h2>
        <p>进入主看板即刻纵览所有资产流转状态，处理红黄灯异常与门禁确认。</p>
        <button className="portal-primary-btn large" onClick={() => onNavigate("board")}>
          <RocketLaunch size={20} weight="fill" />
          <span>立即开启看板作业</span>
        </button>
      </section>
    </div>
  );
};
