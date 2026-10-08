export type StageKey =
  | "launch"
  | "schedule"
  | "produce"
  | "upload"
  | "review"
  | "accept"
  | "checkin";

export type WorkState =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "confirmed"
  | "rejected"
  | "rework"
  | "skipped";

export type Light = "ok" | "yellow" | "red" | "none";

export type PersonId =
  | "longhui"
  | "xiangbin"
  | "linguangyi"
  | "zhongzhiyong"
  | "liuxinyu"
  | "hepangpang"
  | "luohaibin"
  | "luotianyi"
  | "chenke"
  | "suwan"
  | "jiangxia"
  | "yening"
  | "hanzhou";

export type Person = {
  id: PersonId;
  name: string;
  title: string;
  initials: string;
  hue: number;
};

export type StageDef = {
  key: StageKey;
  short: string;
  name: string;
  color: string;
};

export type GateLevel = "L1" | "L2" | "L3";

export type RejectionCategory =
  | "art_effect"       // 美术效果：穿模/色差/动作不畅/造型偏差
  | "tech_spec"        // 技术规范：面数超标/DrawCall过高/贴图格式有误/Shader报错
  | "ip_compliance"    // IP 监修：版权风险/世界观不符/元素违规
  | "external_dep"     // 外部依赖：策划需求改动/外包交付不齐
  | "schedule_delay";  // 排期延误：工时超期/无故拖延

export const REJECTION_CATEGORY_MAP: Record<RejectionCategory, { label: string; color: string; desc: string }> = {
  art_effect: { label: "美术效果", color: "magenta", desc: "穿模、色差偏离、动作不流畅、造型比例不符" },
  tech_spec: { label: "技术规范", color: "orange", desc: "面数/DrawCall超标、贴图未压缩、Shader报错" },
  ip_compliance: { label: "IP监修合规", color: "purple", desc: "版权元素冲突、世界观设定违规、色版偏离" },
  external_dep: { label: "外部依赖未齐", color: "cyan", desc: "策划案临时变更、外包供应商交付延迟" },
  schedule_delay: { label: "排期进度延误", color: "red", desc: "制作周期超标、关键交接延期" },
};

export type GateItem = {
  id: string;
  label: string;
  ok: boolean;
  level?: GateLevel;
  metricThreshold?: string;
};

export type Evidence = {
  svnPath?: string;
  svnRev?: string;
  note?: string;
  conclusion?: string;
  // 结构化指标规范
  vertexCount?: number;       // 三角面/顶点数
  drawCall?: number;          // DrawCall 监测值
  textureSpec?: string;       // 贴图规格（如 2048x2048 ASTC）
  pbrCompliant?: boolean;     // PBR 材质规范达标
  dualModeTested?: boolean;   // 陆空/多体型适配测试
  localizationReady?: boolean;// 多语言/配置表就绪
  fileHash?: string;          // 资产散件哈希
};

export type AuditEvent = {
  id: string;
  at: string;
  actorId: PersonId;
  action: string;
  from?: WorkState;
  to?: WorkState;
  reason?: string;
  rejectionCategory?: RejectionCategory;
  isWaiver?: boolean;
  waiverReason?: string;
};

export type WorkItem = {
  id: string;
  laneId: string;
  stage: StageKey;
  state: WorkState;
  dueAt: string;
  offsetLabel: string;
  /** 钉死截止日期：改上线日时不随动重算 */
  duePinned?: boolean;
  driId: PersonId;
  confirmerId: PersonId;
  collabIds: PersonId[];
  locked: boolean;
  waiting: boolean;
  skipped: boolean;
  isWaived?: boolean;
  evidence: Evidence;
  completeWhen: GateItem[];
  enterNextWhen: GateItem[];
  history: AuditEvent[];
};

export type ResourceLane = {
  id: string;
  name: string;
  type: string;
  items: WorkItem[];
};

export type BatchLifecycle = "planning" | "in_progress" | "accepting" | "archived";

export type LaunchBatch = {
  id: string;
  name: string;
  subtitle: string;
  launchDate: string;
  batchDriId: PersonId;
  lifecycle?: BatchLifecycle;
  lanes: ResourceLane[];
};

export type DeliveryBatch = LaunchBatch;

export type View = "list" | "board" | "mine" | "resources" | "analytics" | "portal" | "templates";
export type BoardPane = "flow" | "queue" | "resources";
export type MineTab = "dri" | "confirm";
export type DensityMode = "normal" | "compact";
export type SwimlaneDimension = "stage" | "dri" | "type";
export type ChartRiskType = "done" | "risk" | "safe" | "blocked";
export type ChartSubFilter = {
  stage?: StageKey | null;
  riskType?: ChartRiskType | null;
};

export type PreviewMode = "companion" | "classic" | "enterprise";

