import React, { useState } from "react";
import { Card, Segmented, Table, Tag } from "antd";
import {
  Sliders,
  Cube,
  Palette,
  PersonSimpleRun,
  ShieldCheck,
  CheckCircle,
  Info,
  Scroll,
  Layout,
  Sparkle,
  WarningOctagon,
  BellRinging,
} from "@phosphor-icons/react";
import { STAGES } from "../mock";
import { REJECTION_CATEGORY_MAP, type RejectionCategory } from "../types";

interface TemplateStageDef {
  stageKey: string;
  stageName: string;
  offsetDays: number;
  offsetLabel: string;
  roleDri: string;
  roleApprover: string;
  isSkippable: boolean;
  requiredEvidence: string[];
  gateConditions: { label: string; level: "L1" | "L2" | "L3"; threshold?: string }[];
}

interface EvidenceSchemaItem {
  field: string;
  name: string;
  type: string;
  rule: string;
  stage: string;
  example: string;
}

interface TemplateDef {
  id: string;
  name: string;
  category: string;
  version: string;
  status: "active" | "draft" | "deprecated";
  icon: React.ReactNode;
  description: string;
  features: string[];
  evidenceSchema: EvidenceSchemaItem[];
  stages: TemplateStageDef[];
}

const TEMPLATES: TemplateDef[] = [
  {
    id: "tpl-3d-model",
    name: "3D 道具与精灵模型标准流",
    category: "3D 美术类",
    version: "v1.2.0 发布版",
    status: "active",
    icon: <Cube size={20} className="text-blue-500" />,
    description: "适用于 3D 角色模型、精灵道具、伴生武器等高模与低模制作交付标准，集成 AYON 自动化机检与 PBR 材质规范。",
    features: ["+ PBR材质标准", "+ AYON机检", "+ 顶点预算", "+ 真机压测"],
    evidenceSchema: [
      { field: "svnPath", name: "SVN 资源路径", type: "URI", rule: "正则 svn://game/res/assets/...", stage: "上传 SVN", example: "svn://game/res/assets/summer/elf_01/v1" },
      { field: "svnRev", name: "Revision 版本号", type: "Integer", rule: "必须正整数且递增", stage: "上传 SVN", example: "r98412" },
      { field: "vertexCount", name: "三角面数 (Tris)", type: "Number", rule: "手游中模 ≤ 15,000 面", stage: "制作/上传", example: "13500" },
      { field: "drawCall", name: "DrawCall 监测值", type: "Number", rule: "单体 DC ≤ 120", stage: "验收", example: "48" },
      { field: "pbrCompliant", name: "PBR 合规标记", type: "Boolean", rule: "Albedo/Normal/Metallic 通道齐全", stage: "制作", example: "true" },
      { field: "conclusion", name: "验收测试结论", type: "String", rule: "QA 真机 60 帧无穿模签核", stage: "验收", example: "真机性能与美术效果通过" },
    ],
    stages: [
      {
        stageKey: "launch",
        stageName: "上新时间表",
        offsetDays: -28,
        offsetLabel: "T-28",
        roleDri: "上新负责人",
        roleApprover: "主策划",
        isSkippable: false,
        requiredEvidence: ["上新需求立项案", "排期基线确认"],
        gateConditions: [
          { label: "版本需求已冻结", level: "L3" },
          { label: "主美已签核设计概念", level: "L3" },
        ],
      },
      {
        stageKey: "schedule",
        stageName: "制片排期表",
        offsetDays: -21,
        offsetLabel: "T-21",
        roleDri: "排期统筹",
        roleApprover: "制片人",
        isSkippable: false,
        requiredEvidence: ["美术制作排期表", "工时拆解明细"],
        gateConditions: [
          { label: "各环节工时无重叠冲突", level: "L2", threshold: "缓冲 ≥ 2工作日" },
          { label: "外包承接对接就绪", level: "L3" },
        ],
      },
      {
        stageKey: "produce",
        stageName: "制作",
        offsetDays: -14,
        offsetLabel: "T-14",
        roleDri: "3D 制作人",
        roleApprover: "美术主管",
        isSkippable: false,
        requiredEvidence: ["高低模工程文件", "材质贴图包 (.png/tga)"],
        gateConditions: [
          { label: "三角面数预算控制", level: "L2", threshold: "Tris ≤ 15,000" },
          { label: "贴图规范符合 PBR 标", level: "L1", threshold: "ASTC 2048x2048" },
        ],
      },
      {
        stageKey: "upload",
        stageName: "上传 SVN",
        offsetDays: -7,
        offsetLabel: "T-7",
        roleDri: "技术美术 (TA)",
        roleApprover: "主程",
        isSkippable: false,
        requiredEvidence: ["SVN 提交路径与版本号", "Prefab 预制体"],
        gateConditions: [
          { label: "SVN 路径符合命名规范", level: "L1", threshold: "URI: svn://art/..." },
          { label: "无残留临时 .meta 报错", level: "L1" },
        ],
      },
      {
        stageKey: "review",
        stageName: "审核",
        offsetDays: -4,
        offsetLabel: "T-4",
        roleDri: "IP 审核员",
        roleApprover: "IP 监修主理人",
        isSkippable: false,
        requiredEvidence: ["IP 监修合规报告", "色板比对截图"],
        gateConditions: [
          { label: "世界观设定合规通过", level: "L3" },
          { label: "无版权侵权风险", level: "L3" },
        ],
      },
      {
        stageKey: "accept",
        stageName: "验收",
        offsetDays: -2,
        offsetLabel: "T-2",
        roleDri: "QA 测试",
        roleApprover: "测试组长",
        isSkippable: false,
        requiredEvidence: ["真机性能压测报告", "DrawCall 监测单"],
        gateConditions: [
          { label: "真机 60 帧无掉帧", level: "L2", threshold: "DrawCall ≤ 120" },
          { label: "无明显穿模或内存泄露", level: "L3" },
        ],
      },
      {
        stageKey: "checkin",
        stageName: "入库",
        offsetDays: 0,
        offsetLabel: "T-0",
        roleDri: "运营发布",
        roleApprover: "上线总指挥",
        isSkippable: false,
        requiredEvidence: ["热更包散件哈希", "配置表对应 ID"],
        gateConditions: [
          { label: "全渠道热更生效", level: "L1", threshold: "Hash 校验通过" },
          { label: "线上灰度验证通过", level: "L3" },
        ],
      },
    ],
  },
  {
    id: "tpl-fashion",
    name: "时装与角色换肤流",
    category: "时装美术类",
    version: "v1.2.0 发布版",
    status: "active",
    icon: <Palette size={20} className="text-purple-500" />,
    description: "适用于角色全身时装、发型、背饰等换肤资源，包含严格的布料解算与动作多体型适配审核。",
    features: ["+ 布料解算", "+ 多体型适配", "+ 动作兼容", "+ 性能压测"],
    evidenceSchema: [
      { field: "svnPath", name: "SVN 资源路径", type: "URI", rule: "svn://game/res/fashion/...", stage: "上传 SVN", example: "svn://game/res/fashion/suit_summer/v1" },
      { field: "dualModeTested", name: "多体型适配标记", type: "Boolean", rule: "高矮胖瘦多体型穿模检测", stage: "审核/验收", example: "true" },
      { field: "drawCall", name: "时装 DrawCall", type: "Number", rule: "单套时装 DC ≤ 85", stage: "验收", example: "62" },
      { field: "conclusion", name: "试穿间表现签核", type: "String", rule: "美术主管主观验收结论", stage: "验收", example: "多体型穿模无异常" },
    ],
    stages: [
      {
        stageKey: "launch",
        stageName: "上新时间表",
        offsetDays: -30,
        offsetLabel: "T-30",
        roleDri: "商业化策划",
        roleApprover: "主策划",
        isSkippable: false,
        requiredEvidence: ["时装立项规划", "定价策略案"],
        gateConditions: [{ label: "美术概念图完成定稿", level: "L3" }],
      },
      {
        stageKey: "schedule",
        stageName: "制片排期表",
        offsetDays: -24,
        offsetLabel: "T-24",
        roleDri: "排期统筹",
        roleApprover: "时装组长",
        isSkippable: false,
        requiredEvidence: ["原画制作排期", "3D制作排期"],
        gateConditions: [{ label: "外包承接合同已锁定", level: "L3" }],
      },
      {
        stageKey: "produce",
        stageName: "制作",
        offsetDays: -15,
        offsetLabel: "T-15",
        roleDri: "原画/3D时装师",
        roleApprover: "角色主美",
        isSkippable: false,
        requiredEvidence: ["时装模型工程包", "布料权重文件"],
        gateConditions: [{ label: "骨骼绑定通过兼容性测试", level: "L2", threshold: "Bone Count ≤ 65" }],
      },
      {
        stageKey: "upload",
        stageName: "上传 SVN",
        offsetDays: -8,
        offsetLabel: "T-8",
        roleDri: "技术美术 (TA)",
        roleApprover: "客户端主程",
        isSkippable: false,
        requiredEvidence: ["SVN 路径", "AnimationClip 依赖"],
        gateConditions: [{ label: "资产导入引擎无 Shader 报错", level: "L1" }],
      },
      {
        stageKey: "review",
        stageName: "审核",
        offsetDays: -5,
        offsetLabel: "T-5",
        roleDri: "IP 审核 / 美术审评",
        roleApprover: "主美",
        isSkippable: false,
        requiredEvidence: ["多体型适配截图", "审核评语"],
        gateConditions: [{ label: "高矮胖瘦多体型穿模检测通过", level: "L3" }],
      },
      {
        stageKey: "accept",
        stageName: "验收",
        offsetDays: -2,
        offsetLabel: "T-2",
        roleDri: "QA 工程师",
        roleApprover: "测试主干",
        isSkippable: false,
        requiredEvidence: ["多机型兼容性测试矩阵"],
        gateConditions: [{ label: "低端机内存开销达标", level: "L2", threshold: "Mem ≤ 35MB" }],
      },
      {
        stageKey: "checkin",
        stageName: "入库",
        offsetDays: 0,
        offsetLabel: "T-0",
        roleDri: "运营发布",
        roleApprover: "上线总指挥",
        isSkippable: false,
        requiredEvidence: ["商城上架配置校验报告"],
        gateConditions: [{ label: "试穿间与实机预览一致", level: "L3" }],
      },
    ],
  },
  {
    id: "tpl-mount",
    name: "坐骑与骑乘动画流",
    category: "动效骑乘类",
    version: "v1.2.0 发布版",
    status: "active",
    icon: <PersonSimpleRun size={20} className="text-amber-500" />,
    description: "涵盖骑乘骨骼、陆空双模切换特效、音效挂接等多模块联调管线。",
    features: ["+ 陆空双模", "+ 粒子上限", "+ 同步裁剪", "+ 视野测试"],
    evidenceSchema: [
      { field: "svnPath", name: "SVN 路径", type: "URI", rule: "svn://game/res/mount/...", stage: "上传 SVN", example: "svn://game/res/mount/dragon_02/v1" },
      { field: "particleCount", name: "特效粒子峰值", type: "Number", rule: "单坐骑特效粒子 ≤ 80", stage: "制作/上传", example: "64" },
      { field: "dualModeTested", name: "双模切换平滑性", type: "Boolean", rule: "上下坐骑过渡无瞬移卡顿", stage: "审核/验收", example: "true" },
    ],
    stages: [
      {
        stageKey: "launch",
        stageName: "上新时间表",
        offsetDays: -35,
        offsetLabel: "T-35",
        roleDri: "上新策划",
        roleApprover: "主策划",
        isSkippable: false,
        requiredEvidence: ["坐骑功能规格书"],
        gateConditions: [{ label: "移速与双人骑乘机制已定案", level: "L3" }],
      },
      {
        stageKey: "schedule",
        stageName: "制片排期表",
        offsetDays: -28,
        offsetLabel: "T-28",
        roleDri: "排期统筹",
        roleApprover: "制作主管",
        isSkippable: false,
        requiredEvidence: ["动画与特效工期排表"],
        gateConditions: [{ label: "动效人力排期锁定", level: "L3" }],
      },
      {
        stageKey: "produce",
        stageName: "制作",
        offsetDays: -16,
        offsetLabel: "T-16",
        roleDri: "动效/动作师",
        roleApprover: "动效主管",
        isSkippable: false,
        requiredEvidence: ["骑乘动画状态机", "特效 Prefab"],
        gateConditions: [{ label: "上下坐骑衔接帧平滑", level: "L2", threshold: "帧间过渡 ≤ 0.2s" }],
      },
      {
        stageKey: "upload",
        stageName: "上传 SVN",
        offsetDays: -9,
        offsetLabel: "T-9",
        roleDri: "动效 TA",
        roleApprover: "主程",
        isSkippable: false,
        requiredEvidence: ["SVN 版本号与资源目录"],
        gateConditions: [{ label: "特效粒子数控制在 80 以下", level: "L1", threshold: "Max Particles ≤ 80" }],
      },
      {
        stageKey: "review",
        stageName: "审核",
        offsetDays: -5,
        offsetLabel: "T-5",
        roleDri: "审核专员",
        roleApprover: "主美",
        isSkippable: false,
        requiredEvidence: ["动作流畅度评审表"],
        gateConditions: [{ label: "攻击/受击/跳跃状态过渡正常", level: "L3" }],
      },
      {
        stageKey: "accept",
        stageName: "验收",
        offsetDays: -2,
        offsetLabel: "T-2",
        roleDri: "QA",
        roleApprover: "测试组长",
        isSkippable: false,
        requiredEvidence: ["联机同步与视野裁剪测试"],
        gateConditions: [{ label: "多人同屏无严重性能卡顿", level: "L2", threshold: "同屏 30 骑无降频" }],
      },
      {
        stageKey: "checkin",
        stageName: "入库",
        offsetDays: 0,
        offsetLabel: "T-0",
        roleDri: "发布运维",
        roleApprover: "技术总监",
        isSkippable: false,
        requiredEvidence: ["发布验证单"],
        gateConditions: [{ label: "正式服部署成功", level: "L3" }],
      },
    ],
  },
  {
    id: "tpl-2d-art",
    name: "2D Q版表情原画流",
    category: "2D 原画类",
    version: "v1.1.0 发布版",
    status: "active",
    icon: <Scroll size={20} className="text-emerald-500" />,
    description: "轻量化 2D 原画与聊天表情交付流，免除重度 3D 渲染压测，聚焦色板合规与精灵形象一致性。",
    features: ["+ 轻量 2D 链", "+ 色板比对", "+ 图集打包", "+ 平台免审分支"],
    evidenceSchema: [
      { field: "svnPath", name: "SVN 图集路径", type: "URI", rule: "svn://art/q-emote/...", stage: "上传 SVN", example: "svn://art/q-emote/draw/v1" },
      { field: "textureSpec", name: "图集规格", type: "String", rule: "PNG 格式，单图 512x512", stage: "制作", example: "512x512 RGBA32" },
      { field: "conclusion", name: "原画组长签核", type: "String", rule: "表情包 12 款齐套合规", stage: "验收", example: "12 款原画已过审" },
    ],
    stages: [
      {
        stageKey: "launch",
        stageName: "上新时间表",
        offsetDays: -20,
        offsetLabel: "T-20",
        roleDri: "上新负责人",
        roleApprover: "主策划",
        isSkippable: false,
        requiredEvidence: ["表情包主题立项案"],
        gateConditions: [{ label: "表情清单 12 个已确认", level: "L3" }],
      },
      {
        stageKey: "schedule",
        stageName: "制片排期表",
        offsetDays: -16,
        offsetLabel: "T-16",
        roleDri: "排期统筹",
        roleApprover: "原画组长",
        isSkippable: false,
        requiredEvidence: ["原画工期排表"],
        gateConditions: [{ label: "原画人力确认锁定", level: "L3" }],
      },
      {
        stageKey: "produce",
        stageName: "制作",
        offsetDays: -10,
        offsetLabel: "T-10",
        roleDri: "2D 原画师",
        roleApprover: "原画组长",
        isSkippable: false,
        requiredEvidence: ["12 款分层 PSD / PNG 图集"],
        gateConditions: [{ label: "图幅尺寸为 512x512 规范", level: "L1" }],
      },
      {
        stageKey: "upload",
        stageName: "上传 SVN",
        offsetDays: -6,
        offsetLabel: "T-6",
        roleDri: "2D 原画师",
        roleApprover: "UI 主管",
        isSkippable: false,
        requiredEvidence: ["SVN 图集路径与版本号"],
        gateConditions: [{ label: "图集打包无黑边杂边", level: "L1" }],
      },
      {
        stageKey: "review",
        stageName: "审核",
        offsetDays: -4,
        offsetLabel: "T-4",
        roleDri: "审核专员",
        roleApprover: "主美",
        isSkippable: false,
        requiredEvidence: ["审核结论"],
        gateConditions: [{ label: "精灵形象版权合规通过", level: "L3" }],
      },
      {
        stageKey: "accept",
        stageName: "验收",
        offsetDays: -2,
        offsetLabel: "T-2",
        roleDri: "QA 测试",
        roleApprover: "测试主干",
        isSkippable: false,
        requiredEvidence: ["聊天气泡与表情轮盘实装截图"],
        gateConditions: [{ label: "游戏内聊天面板显示清晰", level: "L3" }],
      },
      {
        stageKey: "checkin",
        stageName: "入库",
        offsetDays: 0,
        offsetLabel: "T-0",
        roleDri: "运营发布",
        roleApprover: "上线总指挥",
        isSkippable: false,
        requiredEvidence: ["配置表登记 ID"],
        gateConditions: [{ label: "道具商城与聊天系统生效", level: "L3" }],
      },
    ],
  },
  {
    id: "tpl-homeland",
    name: "家园建筑与环境配置流",
    category: "场景配置类",
    version: "v1.1.0 发布版",
    status: "active",
    icon: <Layout size={20} className="text-teal-500" />,
    description: "适用于家园地块、摆件、家具及交互触发器的配置与模型打包，包含遮挡裁剪与光照烘焙门禁。",
    features: ["+ 光照烘焙", "+ 碰撞体检测", "+ 交互配置表", "+ 占地网格"],
    evidenceSchema: [
      { field: "svnPath", name: "SVN 场景路径", type: "URI", rule: "svn://game/res/homeland/...", stage: "上传 SVN", example: "svn://game/res/homeland/building_01" },
      { field: "localizationReady", name: "配置表及多语言", type: "Boolean", rule: "家具 ID 与名物志文案齐套", stage: "制作/入库", example: "true" },
    ],
    stages: [
      {
        stageKey: "launch",
        stageName: "上新时间表",
        offsetDays: -25,
        offsetLabel: "T-25",
        roleDri: "家园策划",
        roleApprover: "主策划",
        isSkippable: false,
        requiredEvidence: ["家园主题规划案"],
        gateConditions: [{ label: "家园主题立项通过", level: "L3" }],
      },
      {
        stageKey: "schedule",
        stageName: "制片排期表",
        offsetDays: -18,
        offsetLabel: "T-18",
        roleDri: "排期统筹",
        roleApprover: "场景组长",
        isSkippable: false,
        requiredEvidence: ["场景美术与配置排期"],
        gateConditions: [{ label: "排期无冲突", level: "L3" }],
      },
      {
        stageKey: "produce",
        stageName: "制作",
        offsetDays: -12,
        offsetLabel: "T-12",
        roleDri: "场景地块地表师",
        roleApprover: "场景主管",
        isSkippable: false,
        requiredEvidence: ["家园 Prefab 与光照贴图"],
        gateConditions: [{ label: "占地网格 Grid 严丝合缝", level: "L2", threshold: "对齐 0 误差" }],
      },
      {
        stageKey: "upload",
        stageName: "上传 SVN",
        offsetDays: -6,
        offsetLabel: "T-6",
        roleDri: "场景 TA",
        roleApprover: "客户端主程",
        isSkippable: false,
        requiredEvidence: ["SVN 路径与版本号"],
        gateConditions: [{ label: "光照烘焙贴图无漏光", level: "L1" }],
      },
      {
        stageKey: "review",
        stageName: "审核",
        offsetDays: -4,
        offsetLabel: "T-4",
        roleDri: "审核专员",
        roleApprover: "主美",
        isSkippable: true,
        requiredEvidence: ["场景氛围签核表"],
        gateConditions: [{ label: "整体家园色调匹配", level: "L3" }],
      },
      {
        stageKey: "accept",
        stageName: "验收",
        offsetDays: -2,
        offsetLabel: "T-2",
        roleDri: "QA 测试",
        roleApprover: "测试主干",
        isSkippable: false,
        requiredEvidence: ["碰撞体与摆放吸附测试单"],
        gateConditions: [{ label: "无穿地悬空与物理穿模", level: "L3" }],
      },
      {
        stageKey: "checkin",
        stageName: "入库",
        offsetDays: 0,
        offsetLabel: "T-0",
        roleDri: "运营发布",
        roleApprover: "上线总指挥",
        isSkippable: false,
        requiredEvidence: ["配置表 Hash"],
        gateConditions: [{ label: "全服家园配置更新", level: "L3" }],
      },
    ],
  },
  {
    id: "tpl-poster",
    name: "宣传壁纸与宣发海报流",
    category: "宣发运营类",
    version: "v1.0.0 发布版",
    status: "active",
    icon: <Sparkle size={20} className="text-pink-500" />,
    description: "用于版本官网 KV、渠道商店图与社媒宣发海报，跳过游戏内 SVN 引擎验证，强化平台与宣发法务门禁。",
    features: ["+ 渠道尺寸矩阵", "+ 法务字库合规", "+ 免 SVN 流程", "+ 宣发矩阵"],
    evidenceSchema: [
      { field: "svnPath", name: "宣发云盘/Git 路径", type: "URI", rule: "统一存储宣发资产网盘链接", stage: "上传 SVN", example: "https://cloud.game.com/promotions/summer_kv" },
      { field: "conclusion", name: "法务与字库审查", type: "String", rule: "商业字体商用授权无风险", stage: "审核", example: "字库与版权已签核" },
    ],
    stages: [
      {
        stageKey: "launch",
        stageName: "上新时间表",
        offsetDays: -15,
        offsetLabel: "T-15",
        roleDri: "宣发主理人",
        roleApprover: "市场总监",
        isSkippable: false,
        requiredEvidence: ["宣发排期规划书"],
        gateConditions: [{ label: "宣发主题已敲定", level: "L3" }],
      },
      {
        stageKey: "schedule",
        stageName: "制片排期表",
        offsetDays: -12,
        offsetLabel: "T-12",
        roleDri: "宣发统筹",
        roleApprover: "设计主管",
        isSkippable: false,
        requiredEvidence: ["宣发素材排期表"],
        gateConditions: [{ label: "海报设计师人力锁定", level: "L3" }],
      },
      {
        stageKey: "produce",
        stageName: "制作",
        offsetDays: -7,
        offsetLabel: "T-7",
        roleDri: "平面设计师",
        roleApprover: "设计主管",
        isSkippable: false,
        requiredEvidence: ["多比例尺寸海报套图 (16:9 / 9:16 / 1:1)"],
        gateConditions: [{ label: "高清 4K 分辨率输出", level: "L1" }],
      },
      {
        stageKey: "upload",
        stageName: "上传 SVN",
        offsetDays: -5,
        offsetLabel: "T-5",
        roleDri: "平面设计师",
        roleApprover: "宣发主管",
        isSkippable: false,
        requiredEvidence: ["宣发资产网盘链接"],
        gateConditions: [{ label: "全渠道尺寸就绪", level: "L1" }],
      },
      {
        stageKey: "review",
        stageName: "审核",
        offsetDays: -3,
        offsetLabel: "T-3",
        roleDri: "法务/IP 监修",
        roleApprover: "法务主管",
        isSkippable: false,
        requiredEvidence: ["字库商用授权书"],
        gateConditions: [{ label: "字体与版绘零法务侵权风险", level: "L3" }],
      },
      {
        stageKey: "accept",
        stageName: "验收",
        offsetDays: -1,
        offsetLabel: "T-1",
        roleDri: "渠道运营",
        roleApprover: "渠道组长",
        isSkippable: false,
        requiredEvidence: ["各应用商店后台上传回执"],
        gateConditions: [{ label: "渠道商店图预览过审", level: "L3" }],
      },
      {
        stageKey: "checkin",
        stageName: "入库",
        offsetDays: 0,
        offsetLabel: "T-0",
        roleDri: "宣发运营",
        roleApprover: "市场总监",
        isSkippable: false,
        requiredEvidence: ["官网与社媒发布确认单"],
        gateConditions: [{ label: "全网宣发同步上线", level: "L3" }],
      },
    ],
  },
];

export const ProcessTemplatesPage: React.FC = () => {
  const [activeTplId, setActiveTplId] = useState<string>("tpl-3d-model");
  const [subTab, setSubTab] = useState<"flow" | "schema" | "sla">("flow");

  const currentTpl = TEMPLATES.find((t) => t.id === activeTplId) || TEMPLATES[0];

  return (
    <div className="templates-page-container">
      {/* 顶部标题与标准定义 */}
      <div className="templates-header">
        <div className="templates-title-row">
          <Sliders size={24} className="text-blue-500" />
          <div>
            <h1 className="templates-title">7 节点标准 SOP 流程库与标准化中心</h1>
            <p className="templates-subtitle">
              统一管控各入库资源的生产标准基线：包含工作日相对偏移、三层质量门禁金字塔、交付物 Schema 约束及退回升级 SLA。
            </p>
          </div>
        </div>
      </div>

      {/* 模板选择 Tab 列表 */}
      <div className="templates-tabs-bar">
        {TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            className={`template-tab-btn ${activeTplId === tpl.id ? "active" : ""}`}
            onClick={() => setActiveTplId(tpl.id)}
          >
            {tpl.icon}
            <span>{tpl.name}</span>
            <Tag className="template-tab-tag">{tpl.category}</Tag>
          </button>
        ))}
      </div>

      {/* 模板详情主体 */}
      <div className="template-card-main">
        <div className="template-info-header">
          <div className="template-info-left">
            <div className="template-icon-badge">{currentTpl.icon}</div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h2 className="template-name">{currentTpl.name}</h2>
                <Tag color="blue">{currentTpl.version}</Tag>
                <Tag color="green">标准已冻结</Tag>
              </div>
              <p className="template-desc">{currentTpl.description}</p>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                {currentTpl.features.map((ft, idx) => (
                  <Tag key={idx} color="processing" style={{ fontSize: 10, margin: 0 }}>
                    {ft}
                  </Tag>
                ))}
              </div>
            </div>
          </div>
          <div className="template-rule-box">
            <Info size={16} className="text-blue-500" />
            <span>创建批次时将冻结该模板快照，在途批次不跟随模板热改而漂移。</span>
          </div>
        </div>

        {/* 子视图切换：SOP流转 / Schema字典 / SLA规则 */}
        <div style={{ margin: "14px 0 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Segmented
            value={subTab}
            onChange={(val) => setSubTab(val as any)}
            options={[
              { label: "7 节点工序与三层门禁", value: "flow", icon: <Sliders size={14} /> },
              { label: "交付物 Schema 约束字典", value: "schema", icon: <Scroll size={14} /> },
              { label: "退回根因字典与升级 SLA", value: "sla", icon: <WarningOctagon size={14} /> },
            ]}
          />
          <span style={{ fontSize: 11, color: "#64748b" }}>
            当前标准覆盖 <b>{currentTpl.stages.length}</b> 道工序 · <b>{currentTpl.evidenceSchema.length}</b> 项结构化交付物指标
          </span>
        </div>

        {/* Tab 1: 7 节点工序与三层门禁 */}
        {subTab === "flow" && (
          <div className="template-stages-flow">
            <div className="template-stages-timeline">
              {currentTpl.stages.map((stg, idx) => {
                const stageDef = STAGES.find((s) => s.key === stg.stageKey);
                return (
                  <div key={stg.stageKey} className="template-stage-item">
                    <div className="template-stage-top">
                      <span
                        className="template-stage-num"
                        style={{ backgroundColor: stageDef?.color || "#3b82f6" }}
                      >
                        {idx + 1}
                      </span>
                      <span className="template-stage-name">{stg.stageName}</span>
                      <span className="template-stage-offset">{stg.offsetLabel}</span>
                    </div>

                    <div className="template-stage-body">
                      <div className="template-role-line">
                        <span className="role-tag dri">主责: {stg.roleDri}</span>
                        <span className="role-tag approver">门禁: {stg.roleApprover}</span>
                      </div>

                      <div className="template-evidence-section">
                        <div className="evidence-title">
                          <CheckCircle size={13} className="text-emerald-600" />
                          <span>交付物与凭证要求</span>
                        </div>
                        <ul className="evidence-list">
                          {stg.requiredEvidence.map((ev, eIdx) => (
                            <li key={eIdx}>{ev}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="template-gates-section">
                        <div className="gates-title">
                          <ShieldCheck size={13} className="text-blue-600" />
                          <span>三层准出流转门禁</span>
                        </div>
                        <ul className="gates-list">
                          {stg.gateConditions.map((gt, gIdx) => (
                            <li key={gIdx} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <Tag
                                color={gt.level === "L1" ? "blue" : gt.level === "L2" ? "purple" : "cyan"}
                                style={{ fontSize: 8, lineHeight: "12px", padding: "0 2px", margin: 0, fontWeight: 700 }}
                              >
                                {gt.level}
                              </Tag>
                              <span style={{ flex: 1 }}>{gt.label}</span>
                              {gt.threshold && (
                                <span style={{ color: "#94a3b8", fontSize: 9 }}>({gt.threshold})</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: 交付物 Schema 约束字典 */}
        {subTab === "schema" && (
          <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0", padding: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#1e293b" }}>
              【{currentTpl.name}】结构化交付凭证定义
            </div>
            <Table
              size="small"
              pagination={false}
              dataSource={currentTpl.evidenceSchema.map((item, i) => ({ ...item, key: i }))}
              columns={[
                { title: "字段 Key", dataIndex: "field", key: "field", render: (t) => <Tag color="blue">{t}</Tag> },
                { title: "指标名称", dataIndex: "name", key: "name", render: (t) => <b>{t}</b> },
                { title: "数据类型", dataIndex: "type", key: "type", render: (t) => <Tag>{t}</Tag> },
                { title: "准出校验规则与阈值", dataIndex: "rule", key: "rule" },
                { title: "归属工序", dataIndex: "stage", key: "stage" },
                { title: "标准示例", dataIndex: "example", key: "example", render: (t) => <span style={{ fontFamily: "monospace", color: "#64748b" }}>{t}</span> },
              ]}
            />
          </div>
        )}

        {/* Tab 3: 退回根因字典与升级 SLA */}
        {subTab === "sla" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* 退回根因分类标准字典 */}
            <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0", padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#cf1322", display: "flex", alignItems: "center", gap: 6 }}>
                <WarningOctagon size={16} color="#cf1322" weight="duotone" />
                <span>标准化退回根因字典 (Rejection Taxonomy)</span>
              </div>
              <p style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>
                确认人在执行退回动作时，必须归类至以下 5 大标准根因之一，以沉淀版本质量复盘数据。
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                {(Object.keys(REJECTION_CATEGORY_MAP) as RejectionCategory[]).map((cat) => {
                  const meta = REJECTION_CATEGORY_MAP[cat];
                  return (
                    <Card key={cat} size="small" style={{ borderRadius: 6, borderColor: "#ffd8d8" }}>
                      <Tag color={meta.color} style={{ fontSize: 11, fontWeight: 700 }}>{meta.label}</Tag>
                      <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>{meta.desc}</div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* 异常响应与 Escalation SLA 升级矩阵 */}
            <div style={{ background: "#fff", borderRadius: 8, border: "1px solid #e2e8f0", padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                <BellRinging size={16} color="#1677ff" weight="duotone" />
                <span>异常预警与 Escalation SLA 升级机制</span>
              </div>
              <Table
                size="small"
                pagination={false}
                dataSource={[
                  {
                    key: "1",
                    level: "黄灯临期预警",
                    trigger: "距离截止时间 ≤ 1 个工作日且未完结",
                    action: "系统向当前 DRI 发送私信催办，工作台置顶提示",
                    sla: "当日 18:00 前更新最新进展备注",
                  },
                  {
                    key: "2",
                    level: "红灯逾期阻断",
                    trigger: "已超过截止日期且未达成放行终态",
                    action: "自动触发该资源下游全线置灰锁定，抄送组长与制片统筹",
                    sla: "逾期 4 小时内召开临时阻塞对齐会",
                  },
                  {
                    key: "3",
                    level: "逾期 1 工作日以上",
                    trigger: "红灯持续未解锁超过 1 个工作日",
                    action: "批次总看板顶栏标红置顶，自动升级通知项目总监",
                    sla: "批次 DRI 必须决策：调整排期 或 启动特批放行 (Waiver)",
                  },
                  {
                    key: "4",
                    level: "特批放行 (Waiver)",
                    trigger: "紧急版本发版、次要门禁允许后补",
                    action: "仅批次 DRI / 制片人可触发，记录特批留痕并入技术债清单",
                    sla: "下一个版本节点前必须完成合规复核消项",
                  },
                ]}
                columns={[
                  { title: "预警等级", dataIndex: "level", key: "level", render: (t) => <b>{t}</b> },
                  { title: "触发条件", dataIndex: "trigger", key: "trigger" },
                  { title: "系统自动联动动作", dataIndex: "action", key: "action" },
                  { title: "团队处理 SLA 要求", dataIndex: "sla", key: "sla", render: (t) => <Tag color="blue">{t}</Tag> },
                ]}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
