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

export type GateItem = {
  id: string;
  label: string;
  ok: boolean;
};

export type Evidence = {
  svnPath?: string;
  svnRev?: string;
  note?: string;
  conclusion?: string;
};

export type AuditEvent = {
  id: string;
  at: string;
  actorId: PersonId;
  action: string;
  from?: WorkState;
  to?: WorkState;
  reason?: string;
};

export type WorkItem = {
  id: string;
  laneId: string;
  stage: StageKey;
  state: WorkState;
  dueAt: string;
  offsetLabel: string;
  driId: PersonId;
  confirmerId: PersonId;
  collabIds: PersonId[];
  locked: boolean;
  waiting: boolean;
  skipped: boolean;
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

export type LaunchBatch = {
  id: string;
  name: string;
  subtitle: string;
  launchDate: string;
  batchDriId: PersonId;
  lanes: ResourceLane[];
};

export type View = "list" | "board" | "mine";
export type BoardPane = "flow" | "queue" | "resources";
export type MineTab = "dri" | "confirm";
