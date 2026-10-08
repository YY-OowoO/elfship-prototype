import type { LaunchBatch, Person, PersonId, ResourceLane, StageDef, StageKey, WorkItem, WorkState } from "./types";

export const TODAY = "2026-08-18";

export interface HolidayInfo {
  name: string;
  type: "statutory" | "festival" | "special";
  isRest: boolean;
  iconKey: string;
  tag: string;
  themeColor: string;
  greeting: string;
  easterEgg: string;
  elfEmotion: string;
}

/**
 * 中国法定节假日与传统节日日历数据（矢量级微变化与专业研发彩蛋）
 */
export const CHINESE_HOLIDAYS_MAP: Record<string, HolidayInfo> = {
  "2026-01-01": {
    name: "元旦",
    type: "statutory",
    isRest: true,
    iconKey: "new_year",
    tag: "元旦假期",
    themeColor: "#f43f5e",
    greeting: "新一年版本交付全线通关飘绿！",
    easterEgg: "主干分支已完成跨年基线标记，自动化集成门禁就绪。",
    elfEmotion: "33",
  },
  "2026-02-16": {
    name: "除夕",
    type: "statutory",
    isRest: true,
    iconKey: "spring_festival",
    tag: "除夕团圆",
    themeColor: "#dc2626",
    greeting: "合家团圆，所有生产工序零阻塞！",
    easterEgg: "全资源 SVN 文件锁已安全释放，无卡点交付达成。",
    elfEmotion: "33",
  },
  "2026-02-17": {
    name: "春节",
    type: "statutory",
    isRest: true,
    iconKey: "spring_festival",
    tag: "新春大吉",
    themeColor: "#dc2626",
    greeting: "新春纳福！金蛇献瑞，管线畅通无阻！",
    easterEgg: "新春研发通量翻倍，资产门禁校验全数一次性过审。",
    elfEmotion: "33",
  },
  "2026-03-03": {
    name: "元宵节",
    type: "festival",
    isRest: false,
    iconKey: "lantern",
    tag: "元宵闹春",
    themeColor: "#ea580c",
    greeting: "元宵佳节，管线流转不团团转！",
    easterEgg: "质检谜题：哪个资产最不易被退回？—— 规范达标的资产！",
    elfEmotion: "01",
  },
  "2026-04-05": {
    name: "清明节",
    type: "statutory",
    isRest: true,
    iconKey: "tomb_sweeping",
    tag: "清明休假",
    themeColor: "#16a34a",
    greeting: "清明时节春风暖，踏青休整再出发！",
    easterEgg: "泡一杯明前龙井，今日全员安心休整。",
    elfEmotion: "02",
  },
  "2026-05-01": {
    name: "五一劳动节",
    type: "statutory",
    isRest: true,
    iconKey: "labor",
    tag: "五一假期",
    themeColor: "#f97316",
    greeting: "致敬每一位匠心打磨的美术与研发伙伴！",
    easterEgg: "颁发五一劳动勋章：版本交付吞吐量提升 47%！",
    elfEmotion: "30",
  },
  "2026-06-19": {
    name: "端午节",
    type: "statutory",
    isRest: true,
    iconKey: "dragon_boat",
    tag: "端午安康",
    themeColor: "#0d9488",
    greeting: "端午安康！管线如龙舟竞渡直达终点！",
    easterEgg: "龙舟冲线！恭喜全流水线顺利入库！",
    elfEmotion: "33",
  },
  "2026-08-19": {
    name: "七夕节",
    type: "festival",
    isRest: false,
    iconKey: "qixi",
    tag: "七夕良辰",
    themeColor: "#7c3aed",
    greeting: "愿研发与美术心有灵犀，需求一次通过！",
    easterEgg: "鹊桥相会！夏日限定活动皮肤已全数过审交付！",
    elfEmotion: "33",
  },
  "2026-09-25": {
    name: "中秋节",
    type: "statutory",
    isRest: true,
    iconKey: "mid_autumn",
    tag: "中秋团圆",
    themeColor: "#d97706",
    greeting: "中秋月满人团圆！全员月饼已下发，无阻塞准时放假！",
    easterEgg: "全员月饼礼盒送达，制片宣布今晚 17:00 前无阻塞准时封板！",
    elfEmotion: "33",
  },
  "2026-10-01": {
    name: "国庆节",
    type: "statutory",
    isRest: true,
    iconKey: "national_day",
    tag: "国庆黄金周",
    themeColor: "#e11d48",
    greeting: "盛世华诞，欢度国庆！祝祖国繁荣昌盛！",
    easterEgg: "国庆 7 天长假，全管线封板守护假期安心！",
    elfEmotion: "33",
  },
  "2026-10-24": {
    name: "1024 程序员节",
    type: "festival",
    isRest: false,
    iconKey: "1024",
    tag: "1024节",
    themeColor: "#0284c7",
    greeting: "1024 快乐！愿代码零 Bug，一次编译直接通过！",
    easterEgg: "1024 专属 Buff：自动化门禁质检通关率 +100%！",
    elfEmotion: "30",
  },
};

export const HOLIDAYS: ReadonlySet<string> = new Set(
  Object.entries(CHINESE_HOLIDAYS_MAP)
    .filter(([_, info]) => info.isRest)
    .map(([iso]) => iso)
);

export const STAGES: StageDef[] = [
  { key: "launch", short: "上新", name: "上新时间表", color: "#52c41a" },
  { key: "schedule", short: "排期", name: "制片排期表", color: "#1677ff" },
  { key: "produce", short: "制作", name: "制作", color: "#52c41a" },
  { key: "upload", short: "上传", name: "上传 SVN", color: "#fa8c16" },
  { key: "review", short: "审核", name: "审核", color: "#722ed1" },
  { key: "accept", short: "验收", name: "验收", color: "#13c2c2" },
  { key: "checkin", short: "入库", name: "入库", color: "#eb2f96" },
];

export const PEOPLE: Record<PersonId, Person> = {
  longhui: { id: "longhui", name: "龙慧", title: "上新安排", initials: "龙", hue: 28 },
  xiangbin: { id: "xiangbin", name: "向彬", title: "排期统筹 / 批次主责", initials: "向", hue: 210 },
  linguangyi: { id: "linguangyi", name: "林广益", title: "3D 需求确认", initials: "林", hue: 160 },
  zhongzhiyong: { id: "zhongzhiyong", name: "钟志勇", title: "3D 制作 / 上传 / 入库", initials: "钟", hue: 18 },
  liuxinyu: { id: "liuxinyu", name: "刘心语", title: "平台送审", initials: "刘", hue: 268 },
  hepangpang: { id: "hepangpang", name: "何盼盼", title: "IP 送审", initials: "何", hue: 300 },
  luohaibin: { id: "luohaibin", name: "罗海彬", title: "验收 / 分支同步", initials: "罗", hue: 142 },
  luotianyi: { id: "luotianyi", name: "罗天一", title: "验收协作", initials: "天", hue: 188 },
  chenke: { id: "chenke", name: "陈可", title: "家园文案", initials: "陈", hue: 42 },
  suwan: { id: "suwan", name: "苏晚", title: "平面", initials: "苏", hue: 332 },
  jiangxia: { id: "jiangxia", name: "江夏", title: "常规壁纸", initials: "江", hue: 200 },
  yening: { id: "yening", name: "叶宁", title: "Q 版原画", initials: "叶", hue: 84 },
  hanzhou: { id: "hanzhou", name: "韩舟", title: "Q 版动画", initials: "韩", hue: 352 },
};

function ev(
  id: string,
  at: string,
  actorId: PersonId,
  action: string,
  from?: WorkState,
  to?: WorkState,
  reason?: string,
  rejectionCategory?: import("./types").RejectionCategory,
  isWaiver?: boolean,
  waiverReason?: string,
) {
  return { id, at, actorId, action, from, to, reason, rejectionCategory, isWaiver, waiverReason };
}

function item(partial: WorkItem): WorkItem {
  return partial;
}

function doneGates(...labels: string[]) {
  return labels.map((label, i) => ({ id: `g${i}`, label, ok: true }));
}

function mixedGates(rows: Array<[string, boolean]>) {
  return rows.map(([label, ok], i) => ({ id: `g${i}`, label, ok }));
}

const histLaunch = [
  ev("h1", "2026-07-28 10:12", "longhui", "确认上线日期", "submitted", "confirmed"),
];
const histSched = [
  ev("h2", "2026-07-30 16:40", "xiangbin", "排期确认", "submitted", "confirmed"),
];

export function seedPrimaryBatch(): LaunchBatch {
  return {
    id: "b-summer",
    name: "2026 夏日家园上新",
    subtitle: "试运行批次 · 包含逾期与待办模拟",
    launchDate: "2026-08-26",
    batchDriId: "xiangbin",
    lifecycle: "in_progress",
    lanes: [
      {
        id: "q-art",
        name: "Q 版表情原画",
        type: "2D 原画",
        items: [
          item({
            id: "q-art-launch",
            laneId: "q-art",
            stage: "launch",
            state: "confirmed",
            dueAt: "2026-07-28",
            offsetLabel: "上线日确认时",
            driId: "longhui",
            confirmerId: "xiangbin",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: { note: "上线日 8 月 26 日" },
            completeWhen: doneGates("上线日期已确认"),
            enterNextWhen: doneGates("后续节点日期已换算"),
            history: histLaunch,
          }),
          item({
            id: "q-art-schedule",
            laneId: "q-art",
            stage: "schedule",
            state: "confirmed",
            dueAt: "2026-07-30",
            offsetLabel: "上线前 4 周",
            driId: "xiangbin",
            confirmerId: "yening",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: { note: "表情清单 12 个已确认" },
            completeWhen: doneGates("需求表已提交", "人员已确认"),
            enterNextWhen: doneGates("无关键缺失"),
            history: histSched,
          }),
          item({
            id: "q-art-produce",
            laneId: "q-art",
            stage: "produce",
            state: "confirmed",
            dueAt: "2026-08-08",
            offsetLabel: "上线前 12 工作日",
            driId: "yening",
            confirmerId: "xiangbin",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: { note: "12 张原画齐套" },
            completeWhen: doneGates("必需内容齐全"),
            enterNextWhen: doneGates("可进入上传"),
            history: [ev("h3", "2026-08-07 18:02", "yening", "提交制作结果", "in_progress", "submitted")],
          }),
          item({
            id: "q-art-upload",
            laneId: "q-art",
            stage: "upload",
            state: "confirmed",
            dueAt: "2026-08-12",
            offsetLabel: "上线前 10 工作日",
            driId: "yening",
            confirmerId: "liuxinyu",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: { svnPath: "svn://art/q-emote/draw", svnRev: "18402" },
            completeWhen: doneGates("路径明确", "版本已登记"),
            enterNextWhen: doneGates("解锁审核"),
            history: [ev("h4", "2026-08-11 11:20", "liuxinyu", "确认上传", "submitted", "confirmed")],
          }),
          item({
            id: "q-art-review",
            laneId: "q-art",
            stage: "review",
            state: "submitted",
            dueAt: "2026-08-20",
            offsetLabel: "平台审核预留 4 工作日",
            driId: "liuxinyu",
            confirmerId: "xiangbin",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: { svnRev: "18402", note: "已送平台审核，等结论" },
            completeWhen: mixedGates([
              ["送审版本已确认", true],
              ["审核结论已回", false],
            ]),
            enterNextWhen: mixedGates([["审核通过版本明确", false]]),
            history: [ev("h5", "2026-08-15 09:40", "liuxinyu", "发起审核", "in_progress", "submitted")],
          }),
          item({
            id: "q-art-accept",
            laneId: "q-art",
            stage: "accept",
            state: "not_started",
            dueAt: "2026-08-24",
            offsetLabel: "审核通过后 1-2 工作日",
            driId: "luohaibin",
            confirmerId: "xiangbin",
            collabIds: ["luotianyi"],
            locked: false,
            waiting: true,
            skipped: false,
            evidence: {},
            completeWhen: mixedGates([["验收结论", false]]),
            enterNextWhen: mixedGates([["验收版本与入库版本一致", false]]),
            history: [],
          }),
          item({
            id: "q-art-checkin",
            laneId: "q-art",
            stage: "checkin",
            state: "not_started",
            dueAt: "2026-08-25",
            offsetLabel: "不晚于上线前 1 天",
            driId: "yening",
            confirmerId: "luohaibin",
            collabIds: [],
            locked: false,
            waiting: true,
            skipped: false,
            evidence: {},
            completeWhen: mixedGates([["工程路径已写", false]]),
            enterNextWhen: mixedGates([["交付链结束", false]]),
            history: [],
          }),
        ],
      },
      {
        id: "q-anim",
        name: "Q 版表情动画",
        type: "动画",
        items: [
          item({
            id: "q-anim-launch",
            laneId: "q-anim",
            stage: "launch",
            state: "confirmed",
            dueAt: "2026-07-28",
            offsetLabel: "上线日确认时",
            driId: "longhui",
            confirmerId: "xiangbin",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: {},
            completeWhen: doneGates("上线日期已确认"),
            enterNextWhen: doneGates("日期已换算"),
            history: histLaunch,
          }),
          item({
            id: "q-anim-schedule",
            laneId: "q-anim",
            stage: "schedule",
            state: "confirmed",
            dueAt: "2026-07-30",
            offsetLabel: "上线前 4 周",
            driId: "xiangbin",
            confirmerId: "hanzhou",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: {},
            completeWhen: doneGates("需求已确认"),
            enterNextWhen: doneGates("制作任务明确"),
            history: histSched,
          }),
          item({
            id: "q-anim-produce",
            laneId: "q-anim",
            stage: "produce",
            state: "confirmed",
            dueAt: "2026-08-10",
            offsetLabel: "上线前 11 工作日",
            driId: "hanzhou",
            confirmerId: "xiangbin",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: { note: "12 条循环动画" },
            completeWhen: doneGates("动画齐套"),
            enterNextWhen: doneGates("可上传"),
            history: [],
          }),
          item({
            id: "q-anim-upload",
            laneId: "q-anim",
            stage: "upload",
            state: "confirmed",
            dueAt: "2026-08-13",
            offsetLabel: "上线前 9 工作日",
            driId: "hanzhou",
            confirmerId: "liuxinyu",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: { svnPath: "svn://art/q-emote/anim", svnRev: "18410" },
            completeWhen: doneGates("版本已登记"),
            enterNextWhen: doneGates("解锁审核"),
            history: [],
          }),
          item({
            id: "q-anim-review",
            laneId: "q-anim",
            stage: "review",
            state: "confirmed",
            dueAt: "2026-08-18",
            offsetLabel: "平台审核预留 3 工作日",
            driId: "liuxinyu",
            confirmerId: "xiangbin",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: { conclusion: "平台审核通过" },
            completeWhen: doneGates("审核通过"),
            enterNextWhen: doneGates("解锁验收"),
            history: [ev("ha", "2026-08-17 17:10", "xiangbin", "确认审核通过", "submitted", "confirmed")],
          }),
          item({
            id: "q-anim-accept",
            laneId: "q-anim",
            stage: "accept",
            state: "submitted",
            dueAt: "2026-08-22",
            offsetLabel: "审核通过后 2 工作日",
            driId: "luohaibin",
            confirmerId: "xiangbin",
            collabIds: ["luotianyi"],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: { note: "本地验证通过，待确认验收结论" },
            completeWhen: mixedGates([
              ["本地验证完成", true],
              ["验收结论已签", false],
            ]),
            enterNextWhen: mixedGates([["版本一致", true]]),
            history: [ev("hb", "2026-08-18 09:05", "luohaibin", "提交验收", "in_progress", "submitted")],
          }),
          item({
            id: "q-anim-checkin",
            laneId: "q-anim",
            stage: "checkin",
            state: "not_started",
            dueAt: "2026-08-25",
            offsetLabel: "不晚于上线前 1 天",
            driId: "hanzhou",
            confirmerId: "luohaibin",
            collabIds: [],
            locked: false,
            waiting: true,
            skipped: false,
            evidence: {},
            completeWhen: mixedGates([["写入工程路径", false]]),
            enterNextWhen: mixedGates([["交付链结束", false]]),
            history: [],
          }),
        ],
      },
      {
        id: "prop3d",
        name: "3D 模型道具",
        type: "3D",
        items: [
          item({
            id: "p3-launch",
            laneId: "prop3d",
            stage: "launch",
            state: "confirmed",
            dueAt: "2026-07-28",
            offsetLabel: "上线日确认时",
            driId: "longhui",
            confirmerId: "xiangbin",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: { note: "关联夏日家园批次" },
            completeWhen: doneGates("上线日期已确认"),
            enterNextWhen: doneGates("后续节点日期已换算"),
            history: histLaunch,
          }),
          item({
            id: "p3-schedule",
            laneId: "prop3d",
            stage: "schedule",
            state: "confirmed",
            dueAt: "2026-07-29",
            offsetLabel: "上线前 4 周",
            driId: "xiangbin",
            confirmerId: "linguangyi",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: { note: "3D 模型道具内容需求表已确认" },
            completeWhen: doneGates("需求表已提交", "需求内容已确认"),
            enterNextWhen: doneGates("制作任务和人员已经明确"),
            history: [
              ev("p3s", "2026-07-29 15:18", "linguangyi", "确认 3D 需求", "submitted", "confirmed"),
            ],
          }),
          item({
            id: "p3-produce",
            laneId: "prop3d",
            stage: "produce",
            state: "confirmed",
            dueAt: "2026-08-13",
            offsetLabel: "须早于上传截止",
            driId: "zhongzhiyong",
            confirmerId: "linguangyi",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: { note: "模型已达上传状态" },
            completeWhen: doneGates("必需制作内容齐全"),
            enterNextWhen: doneGates("能够进入 SVN 上传"),
            history: [
              ev("p3p", "2026-08-13 19:44", "linguangyi", "确认制作完成", "submitted", "confirmed"),
            ],
          }),
          item({
            id: "p3-upload",
            laneId: "prop3d",
            stage: "upload",
            state: "in_progress",
            dueAt: "2026-08-17",
            offsetLabel: "上线前 7 工作日（有 IP 则应更早）",
            driId: "zhongzhiyong",
            confirmerId: "liuxinyu",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: {
              svnPath: "svn://game/res/assets/summer2026/prop3d/v1",
              svnRev: "r98410",
              vertexCount: 16800,
              drawCall: 58,
              pbrCompliant: true,
              textureSpec: "2048x2048 ASTC",
              note: "高模已拓扑烘焙，贴图 PBR 规范已达标，正在执行最终 SVN 提交核验",
            },
            completeWhen: [
              { id: "g0", label: "SVN 规范路径", ok: true, level: "L1", metricThreshold: "URI: svn://..." },
              { id: "g1", label: "Revision 版本号已登记", ok: true, level: "L1", metricThreshold: "正整数" },
              { id: "g2", label: "三角面数预算控制", ok: true, level: "L2", metricThreshold: "Tris ≤ 15,000" },
            ],
            enterNextWhen: [
              { id: "gn0", label: "上传完整且机检通过后解锁审核", ok: false, level: "L1" },
            ],
            history: [
              ev("p3u", "2026-08-16 14:02", "zhongzhiyong", "开始上传", "not_started", "in_progress"),
            ],
          }),
          item({
            id: "p3-review",
            laneId: "prop3d",
            stage: "review",
            state: "not_started",
            dueAt: "2026-08-21",
            offsetLabel: "平台 2-5 工作日；IP 另加",
            driId: "liuxinyu",
            confirmerId: "xiangbin",
            collabIds: ["hepangpang"],
            locked: true,
            waiting: false,
            skipped: false,
            evidence: {},
            completeWhen: mixedGates([["适用审核均已通过", false]]),
            enterNextWhen: mixedGates([["通过版本明确", false]]),
            history: [],
          }),
          item({
            id: "p3-accept",
            laneId: "prop3d",
            stage: "accept",
            state: "not_started",
            dueAt: "2026-08-24",
            offsetLabel: "审核通过后 1-2 工作日",
            driId: "luohaibin",
            confirmerId: "xiangbin",
            collabIds: ["luotianyi"],
            locked: true,
            waiting: false,
            skipped: false,
            evidence: {},
            completeWhen: mixedGates([["问题关闭", false]]),
            enterNextWhen: mixedGates([["验收版本一致", false]]),
            history: [],
          }),
          item({
            id: "p3-checkin",
            laneId: "prop3d",
            stage: "checkin",
            state: "not_started",
            dueAt: "2026-08-25",
            offsetLabel: "不晚于上线前 1 天",
            driId: "zhongzhiyong",
            confirmerId: "luohaibin",
            collabIds: [],
            locked: true,
            waiting: false,
            skipped: false,
            evidence: {},
            completeWhen: mixedGates([["路径、分支、版本已确认", false]]),
            enterNextWhen: mixedGates([["3D 交付链结束", false]]),
            history: [],
          }),
        ],
      },
      {
        id: "flat2d",
        name: "平面资源",
        type: "2D",
        items: [
          item({
            id: "f2-launch",
            laneId: "flat2d",
            stage: "launch",
            state: "confirmed",
            dueAt: "2026-07-28",
            offsetLabel: "上线日确认时",
            driId: "longhui",
            confirmerId: "xiangbin",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: {},
            completeWhen: doneGates("上线日期已确认"),
            enterNextWhen: doneGates("日期已换算"),
            history: histLaunch,
          }),
          item({
            id: "f2-schedule",
            laneId: "flat2d",
            stage: "schedule",
            state: "confirmed",
            dueAt: "2026-07-30",
            offsetLabel: "上线前 4 周",
            driId: "xiangbin",
            confirmerId: "suwan",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: {},
            completeWhen: doneGates("需求已确认"),
            enterNextWhen: doneGates("人员明确"),
            history: histSched,
          }),
          item({
            id: "f2-produce",
            laneId: "flat2d",
            stage: "produce",
            state: "confirmed",
            dueAt: "2026-08-11",
            offsetLabel: "上线前 10 工作日",
            driId: "suwan",
            confirmerId: "xiangbin",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: {},
            completeWhen: doneGates("切图齐套"),
            enterNextWhen: doneGates("可上传"),
            history: [],
          }),
          item({
            id: "f2-upload",
            laneId: "flat2d",
            stage: "upload",
            state: "confirmed",
            dueAt: "2026-08-14",
            offsetLabel: "上线前 8 工作日",
            driId: "suwan",
            confirmerId: "liuxinyu",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: { svnPath: "svn://art/ui/summer", svnRev: "18388" },
            completeWhen: doneGates("版本已登记"),
            enterNextWhen: doneGates("解锁审核"),
            history: [],
          }),
          item({
            id: "f2-review",
            laneId: "flat2d",
            stage: "review",
            state: "confirmed",
            dueAt: "2026-08-18",
            offsetLabel: "平台审核预留 3 工作日",
            driId: "liuxinyu",
            confirmerId: "xiangbin",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: { conclusion: "通过" },
            completeWhen: doneGates("审核通过"),
            enterNextWhen: doneGates("解锁验收"),
            history: [],
          }),
          item({
            id: "f2-accept",
            laneId: "flat2d",
            stage: "accept",
            state: "confirmed",
            dueAt: "2026-08-20",
            offsetLabel: "审核通过后 1-2 工作日",
            driId: "luohaibin",
            confirmerId: "xiangbin",
            collabIds: ["luotianyi"],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: { conclusion: "验收通过" },
            completeWhen: doneGates("验收通过"),
            enterNextWhen: doneGates("解锁入库"),
            history: [],
          }),
          item({
            id: "f2-checkin",
            laneId: "flat2d",
            stage: "checkin",
            state: "in_progress",
            dueAt: "2026-08-25",
            offsetLabel: "不晚于上线前 1 天",
            driId: "suwan",
            confirmerId: "luohaibin",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: { note: "正在写入工程路径" },
            completeWhen: mixedGates([
              ["最终版本确认", true],
              ["写入工程路径", false],
              ["同步分支", false],
            ]),
            enterNextWhen: mixedGates([["入库完成", false]]),
            history: [ev("f2c", "2026-08-18 10:30", "suwan", "开始入库", "not_started", "in_progress")],
          }),
        ],
      },
      {
        id: "copy",
        name: "家园文案",
        type: "文案",
        items: [
          item({
            id: "cp-launch",
            laneId: "copy",
            stage: "launch",
            state: "confirmed",
            dueAt: "2026-07-28",
            offsetLabel: "上线日确认时",
            driId: "longhui",
            confirmerId: "xiangbin",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: {},
            completeWhen: doneGates("上线日期已确认"),
            enterNextWhen: doneGates("日期已换算"),
            history: histLaunch,
          }),
          item({
            id: "cp-schedule",
            laneId: "copy",
            stage: "schedule",
            state: "confirmed",
            dueAt: "2026-07-31",
            offsetLabel: "上线前 4 周",
            driId: "xiangbin",
            confirmerId: "chenke",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: {},
            completeWhen: doneGates("文案范围已确认"),
            enterNextWhen: doneGates("主责明确"),
            history: histSched,
          }),
          item({
            id: "cp-produce",
            laneId: "copy",
            stage: "produce",
            state: "in_progress",
            dueAt: "2026-08-19",
            offsetLabel: "上线前 5 工作日",
            driId: "chenke",
            confirmerId: "xiangbin",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: { note: "家具说明写到一半" },
            completeWhen: mixedGates([
              ["家具说明齐套", false],
              ["活动文案初稿", true],
            ]),
            enterNextWhen: mixedGates([["可进入验收", false]]),
            history: [ev("cp1", "2026-08-12 11:00", "chenke", "开始撰写", "not_started", "in_progress")],
          }),
          item({
            id: "cp-upload",
            laneId: "copy",
            stage: "upload",
            state: "skipped",
            dueAt: "2026-08-19",
            offsetLabel: "文案不走 SVN",
            driId: "chenke",
            confirmerId: "xiangbin",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: true,
            evidence: { note: "模板声明跳过" },
            completeWhen: doneGates("不适用"),
            enterNextWhen: doneGates("跳过"),
            history: [ev("cp0", "2026-07-30 09:00", "xiangbin", "模板跳过上传 SVN", "not_started", "skipped")],
          }),
          item({
            id: "cp-review",
            laneId: "copy",
            stage: "review",
            state: "not_started",
            dueAt: "2026-08-21",
            offsetLabel: "文案校对 2 工作日",
            driId: "xiangbin",
            confirmerId: "longhui",
            collabIds: [],
            locked: false,
            waiting: true,
            skipped: false,
            evidence: {},
            completeWhen: mixedGates([["校对通过", false]]),
            enterNextWhen: mixedGates([["解锁验收", false]]),
            history: [],
          }),
          item({
            id: "cp-accept",
            laneId: "copy",
            stage: "accept",
            state: "not_started",
            dueAt: "2026-08-24",
            offsetLabel: "校对后 1 工作日",
            driId: "luohaibin",
            confirmerId: "xiangbin",
            collabIds: [],
            locked: false,
            waiting: true,
            skipped: false,
            evidence: {},
            completeWhen: mixedGates([["验收通过", false]]),
            enterNextWhen: mixedGates([["解锁入库", false]]),
            history: [],
          }),
          item({
            id: "cp-checkin",
            laneId: "copy",
            stage: "checkin",
            state: "not_started",
            dueAt: "2026-08-25",
            offsetLabel: "不晚于上线前 1 天",
            driId: "chenke",
            confirmerId: "luohaibin",
            collabIds: [],
            locked: false,
            waiting: true,
            skipped: false,
            evidence: {},
            completeWhen: mixedGates([["写入配置表", false]]),
            enterNextWhen: mixedGates([["交付链结束", false]]),
            history: [],
          }),
        ],
      },
      {
        id: "wallpaper",
        name: "常规壁纸",
        type: "2D",
        items: [
          item({
            id: "wp-launch",
            laneId: "wallpaper",
            stage: "launch",
            state: "confirmed",
            dueAt: "2026-07-28",
            offsetLabel: "上线日确认时",
            driId: "longhui",
            confirmerId: "xiangbin",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: {},
            completeWhen: doneGates("上线日期已确认"),
            enterNextWhen: doneGates("日期已换算"),
            history: histLaunch,
          }),
          item({
            id: "wp-schedule",
            laneId: "wallpaper",
            stage: "schedule",
            state: "confirmed",
            dueAt: "2026-07-30",
            offsetLabel: "上线前 4 周",
            driId: "xiangbin",
            confirmerId: "jiangxia",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: {},
            completeWhen: doneGates("主题已确认"),
            enterNextWhen: doneGates("制作任务明确"),
            history: histSched,
          }),
          item({
            id: "wp-produce",
            laneId: "wallpaper",
            stage: "produce",
            state: "in_progress",
            dueAt: "2026-08-22",
            offsetLabel: "上线前 3 工作日",
            driId: "jiangxia",
            confirmerId: "xiangbin",
            collabIds: [],
            locked: false,
            waiting: false,
            skipped: false,
            evidence: { note: "白天版已出，夜晚版绘制中" },
            completeWhen: mixedGates([
              ["白天版", true],
              ["夜晚版", false],
            ]),
            enterNextWhen: mixedGates([["可上传", false]]),
            history: [ev("wp1", "2026-08-10 10:00", "jiangxia", "开始绘制", "not_started", "in_progress")],
          }),
          item({
            id: "wp-upload",
            laneId: "wallpaper",
            stage: "upload",
            state: "not_started",
            dueAt: "2026-08-22",
            offsetLabel: "制作完成后当日",
            driId: "jiangxia",
            confirmerId: "liuxinyu",
            collabIds: [],
            locked: false,
            waiting: true,
            skipped: false,
            evidence: {},
            completeWhen: mixedGates([["版本已登记", false]]),
            enterNextWhen: mixedGates([["解锁审核", false]]),
            history: [],
          }),
          item({
            id: "wp-review",
            laneId: "wallpaper",
            stage: "review",
            state: "not_started",
            dueAt: "2026-08-24",
            offsetLabel: "平台审核 2 工作日",
            driId: "liuxinyu",
            confirmerId: "xiangbin",
            collabIds: [],
            locked: false,
            waiting: true,
            skipped: false,
            evidence: {},
            completeWhen: mixedGates([["审核通过", false]]),
            enterNextWhen: mixedGates([["解锁验收", false]]),
            history: [],
          }),
          item({
            id: "wp-accept",
            laneId: "wallpaper",
            stage: "accept",
            state: "not_started",
            dueAt: "2026-08-25",
            offsetLabel: "审核通过后 1 工作日",
            driId: "luohaibin",
            confirmerId: "xiangbin",
            collabIds: [],
            locked: false,
            waiting: true,
            skipped: false,
            evidence: {},
            completeWhen: mixedGates([["验收通过", false]]),
            enterNextWhen: mixedGates([["解锁入库", false]]),
            history: [],
          }),
          item({
            id: "wp-checkin",
            laneId: "wallpaper",
            stage: "checkin",
            state: "not_started",
            dueAt: "2026-08-25",
            offsetLabel: "不晚于上线前 1 天",
            driId: "jiangxia",
            confirmerId: "luohaibin",
            collabIds: [],
            locked: false,
            waiting: true,
            skipped: false,
            evidence: {},
            completeWhen: mixedGates([["写入工程路径", false]]),
            enterNextWhen: mixedGates([["交付链结束", false]]),
            history: [],
          }),
        ],
      },
      ...overflowLanes(),
    ],
  };
}

const STAGE_ORDER: StageKey[] = ["launch", "schedule", "produce", "upload", "review", "accept", "checkin"];

const STAGE_DEFAULTS: Record<StageKey, { offsetLabel: string; defaultDue: string; defaultDri: PersonId; defaultConfirmer: PersonId }> = {
  launch: { offsetLabel: "上线日确认时", defaultDue: "2026-07-28", defaultDri: "longhui", defaultConfirmer: "xiangbin" },
  schedule: { offsetLabel: "上线前 4 周", defaultDue: "2026-07-30", defaultDri: "xiangbin", defaultConfirmer: "suwan" },
  produce: { offsetLabel: "制作阶段", defaultDue: "2026-08-14", defaultDri: "suwan", defaultConfirmer: "xiangbin" },
  upload: { offsetLabel: "制作完成后当日", defaultDue: "2026-08-18", defaultDri: "suwan", defaultConfirmer: "liuxinyu" },
  review: { offsetLabel: "审核预留 2-3 工作日", defaultDue: "2026-08-21", defaultDri: "liuxinyu", defaultConfirmer: "xiangbin" },
  accept: { offsetLabel: "审核后 1-2 工作日", defaultDue: "2026-08-24", defaultDri: "luohaibin", defaultConfirmer: "xiangbin" },
  checkin: { offsetLabel: "不晚于上线前 1 天", defaultDue: "2026-08-25", defaultDri: "suwan", defaultConfirmer: "luohaibin" },
};

function stubLane(
  id: string,
  name: string,
  type: string,
  current: StageKey,
  driId: PersonId,
  dueAt: string,
): ResourceLane {
  const idx = STAGE_ORDER.indexOf(current);
  return {
    id,
    name,
    type,
    items: STAGE_ORDER.map((stage, i) => {
      const def = STAGE_DEFAULTS[stage];
      const isPast = i < idx;
      const isCurrent = i === idx;
      const stageDri = (stage === "launch" || stage === "schedule") ? def.defaultDri : (stage === "review" ? "liuxinyu" : (stage === "accept" ? "luohaibin" : driId));
      const stageConfirmer = stageDri === "xiangbin" ? (driId !== "xiangbin" ? driId : "luohaibin") : "xiangbin";
      const itemDue = isCurrent ? dueAt : (isPast ? def.defaultDue : def.defaultDue);

      const completeWhen = isPast
        ? doneGates("必需内容已交付", "格式与规格达标")
        : isCurrent
          ? mixedGates([["内容制作中", true], ["交付物齐套", false]])
          : mixedGates([["前序依赖就绪", false], ["交付物齐套", false]]);

      const enterNextWhen = isPast
        ? doneGates("已满足流转要求")
        : mixedGates([["完成条件已通过", isPast], ["确认人已核验", false]]);

      const evidence = isPast
        ? (stage === "upload" ? { svnPath: `svn://art/assets/${id}`, svnRev: "18390" } : { note: "已按标准准出" })
        : (isCurrent && stage === "upload" ? { svnPath: `svn://art/assets/${id}`, svnRev: "" } : {});

      return item({
        id: `${id}-${stage}`,
        laneId: id,
        stage,
        state: isPast ? "confirmed" : isCurrent ? "in_progress" : "not_started",
        dueAt: itemDue,
        offsetLabel: def.offsetLabel,
        driId: stageDri,
        confirmerId: stageConfirmer,
        collabIds: stage === "accept" ? ["luotianyi"] : [],
        locked: false,
        waiting: i > idx,
        skipped: false,
        evidence,
        completeWhen,
        enterNextWhen,
        history: isPast
          ? [ev(`${id}-h-${stage}`, def.defaultDue, stageConfirmer, "确认通过", "submitted", "confirmed")]
          : (isCurrent ? [ev(`${id}-h-${stage}`, "2026-08-17 10:00", stageDri, "开始推进", "not_started", "in_progress")] : []),
      });
    }),
  };
}

function overflowLanes(): ResourceLane[] {
  return [
    stubLane("frame", "节日边框超长名称需要省略显示", "2D", "produce", "suwan", "2026-08-22"),
    stubLane("loader", "加载页插画", "2D", "produce", "yening", "2026-08-21"),
    stubLane("shop", "商店图标", "2D", "produce", "suwan", "2026-08-23"),
    stubLane("banner", "活动 Banner", "2D", "produce", "jiangxia", "2026-08-22"),
    stubLane("login", "登录背景", "2D", "produce", "jiangxia", "2026-08-24"),
    stubLane("badge", "徽章图标", "2D", "review", "liuxinyu", "2026-08-21"),
    stubLane("mail", "邮件头图", "2D", "review", "liuxinyu", "2026-08-22"),
    stubLane("popup", "弹窗装饰", "2D", "accept", "luohaibin", "2026-08-25"),
  ];
}

export function seedQuietBatch(): LaunchBatch {
  const src = seedPrimaryBatch();
  return {
    id: "b-quiet",
    name: "2026 九月常规周更",
    subtitle: "对照批次 · 稳步推进中",
    launchDate: "2026-09-16",
    batchDriId: "xiangbin",
    lifecycle: "accepting",
    lanes: src.lanes.slice(0, 4).map((lane) => ({
      ...lane,
      id: `${lane.id}-q`,
      items: lane.items.map((it) => ({
        ...it,
        id: `${it.id}-q`,
        laneId: `${lane.id}-q`,
        state: it.stage === "checkin" ? "in_progress" : "confirmed",
        locked: false,
        waiting: it.stage === "checkin",
        dueAt: it.stage === "checkin" ? "2026-09-15" : it.dueAt,
        completeWhen: it.completeWhen.map((g) => ({ ...g, ok: it.stage !== "checkin" || g.ok })),
      })),
    })),
  };
}

export function createMockBatch(
  name: string,
  subtitle: string,
  launchDate: string,
  template = "standard",
): LaunchBatch {
  const id = `b-${Date.now().toString(36)}`;
  const lanes =
    template === "heavy"
      ? [
          stubLane(`${id}-hero`, "主视觉宣发海报", "2D 概念", "produce", "suwan", "2026-08-20"),
          stubLane(`${id}-weapon`, "传奇武器 3D 模型", "3D 道具", "produce", "zhongzhiyong", "2026-08-18"),
          stubLane(`${id}-fx`, "武器流光特效包", "特效", "produce", "yening", "2026-08-21"),
          stubLane(`${id}-sound`, "专属打击音效", "音频", "produce", "hanzhou", "2026-08-22"),
        ]
      : [
          stubLane(`${id}-banner`, "版本主题 Banner", "2D 平面", "produce", "suwan", "2026-08-22"),
          stubLane(`${id}-ui`, "活动界面 UI 皮肤", "2D UI", "produce", "jiangxia", "2026-08-23"),
          stubLane(`${id}-copy`, "活动剧情与任务文案", "文案", "produce", "chenke", "2026-08-21"),
        ];

  return {
    id,
    name: name.trim() || "新建版本批次",
    subtitle: subtitle.trim() || "排期规则自动换算基线",
    launchDate,
    batchDriId: "xiangbin",
    lifecycle: "planning",
    lanes,
  };
}

export const PREVIEW_ROLES: Array<{ id: PersonId; label: string }> = [
  { id: "xiangbin", label: "向彬 · 制片" },
  { id: "zhongzhiyong", label: "钟志勇 · 制作" },
  { id: "luohaibin", label: "罗海彬 · 验收" },
  { id: "liuxinyu", label: "刘心语 · 送审" },
  { id: "chenke", label: "陈可 · 文案" },
];

export type ScenarioPresetKey =
  | "baseline"
  | "red_isolate"
  | "gate_blocked"
  | "rework_loop"
  | "all_green";

export interface ScenarioPresetMeta {
  key: ScenarioPresetKey;
  title: string;
  badge: string;
  badgeColor: string;
  desc: string;
  toast: string;
}

export const SCENARIO_PRESETS: ScenarioPresetMeta[] = [
  {
    key: "baseline",
    title: "基准批次：夏季大版本",
    badge: "标准演示",
    badgeColor: "blue",
    desc: "初始状态：3D道具上传逾期，文案临期黄灯，其余正常推进",
    toast: "已载入【基准演示批次】：请关注顶栏倒计时与红黄灯摘要",
  },
  {
    key: "red_isolate",
    title: "场景一：单链红灯故障隔离",
    badge: "单链隔离",
    badgeColor: "volcano",
    desc: "3D 武器上传逾期标红，仅锁定该泳道后续审核验收，2D等其他资源照常流转",
    toast: "已载入【单链故障隔离场景】：3D武器已锁死下游，请观察2D时装正常流转！",
  },
  {
    key: "gate_blocked",
    title: "场景二：AYON 门禁未达标拦截",
    badge: "质量门禁",
    badgeColor: "magenta",
    desc: "未上传 SVN 路径或质检未勾选，门禁确认放行按钮强制禁用，防止空转",
    toast: "已载入【门禁拦截场景】：打开工作项抽屉，未达标条件将禁用确认按钮！",
  },
  {
    key: "rework_loop",
    title: "场景三：驳回退回与返工闭环",
    badge: "异常闭环",
    badgeColor: "orange",
    desc: "验收人驳回必填结构化原因（美术穿模/技术超标），主责人进入返工状态",
    toast: "已载入【退回返工场景】：工作项已被打回，点击【开始返工】可查看驳回历史",
  },
  {
    key: "all_green",
    title: "场景四：全线绿灯就绪待交付",
    badge: "全线绿灯",
    badgeColor: "green",
    desc: "所有资源均已通过前六个主工序门禁，进入最终入库发布倒计时",
    toast: "已载入【全线绿灯就绪】：所有节点质检全通，批次达到 100% 待发布状态！",
  },
];

export function buildScenarioBatch(key: ScenarioPresetKey): LaunchBatch {
  const base = seedPrimaryBatch();

  if (key === "baseline") {
    return base;
  }

  if (key === "red_isolate") {
    // 确保 3D 道具处于逾期红灯并严格锁定下游，而 2D 平面推进到待验收
    return {
      ...base,
      lanes: base.lanes.map((lane) => {
        if (lane.id === "prop3d") {
          return {
            ...lane,
            items: lane.items.map((it) => {
              if (it.stage === "upload") {
                return { ...it, state: "in_progress", dueAt: "2026-08-10" }; // 严重逾期红灯
              }
              if (it.stage === "review" || it.stage === "accept" || it.stage === "checkin") {
                return { ...it, locked: true, waiting: true };
              }
              return it;
            }),
          };
        }
        if (lane.id === "flat2d") {
          return {
            ...lane,
            items: lane.items.map((it) => {
              if (it.stage === "accept") {
                return { ...it, state: "submitted", locked: false, waiting: false };
              }
              return it;
            }),
          };
        }
        return lane;
      }),
    };
  }

  if (key === "gate_blocked") {
    // 工作项提交了但没有填写 SVN 凭证，且门禁条件全红
    return {
      ...base,
      lanes: base.lanes.map((lane) => {
        if (lane.id === "prop3d") {
          return {
            ...lane,
            items: lane.items.map((it) => {
              if (it.stage === "review") {
                return {
                  ...it,
                  state: "submitted",
                  locked: false,
                  waiting: false,
                  evidence: { svnPath: "", svnRev: "" }, // 缺失凭证
                  completeWhen: it.completeWhen.map((g) => ({ ...g, ok: false })),
                  enterNextWhen: it.enterNextWhen.map((g) => ({ ...g, ok: false })),
                };
              }
              return it;
            }),
          };
        }
        return lane;
      }),
    };
  }

  if (key === "rework_loop") {
    // 处于被退回返工状态
    return {
      ...base,
      lanes: base.lanes.map((lane) => {
        if (lane.id === "prop3d") {
          return {
            ...lane,
            items: lane.items.map((it) => {
              if (it.stage === "produce") {
                return {
                  ...it,
                  state: "rejected",
                  locked: false,
                  waiting: false,
                  history: [
                    ...it.history,
                    {
                      id: "h-rej-demo",
                      at: "2026-08-17 16:30",
                      actorId: "luohaibin",
                      action: "退回驳回",
                      from: "submitted",
                      to: "rejected",
                      reason: "法线贴图接缝明显，且动作骨骼在奔跑状态下出现右腿穿模，需重新烘焙贴图并修正权重。",
                      rejectionCategory: "art_effect",
                    },
                  ],
                };
              }
              return it;
            }),
          };
        }
        return lane;
      }),
    };
  }

  if (key === "all_green") {
    // 全绿灯：所有资源均已通过验收，处于待入库状态
    return {
      ...base,
      lanes: base.lanes.map((lane) => ({
        ...lane,
        items: lane.items.map((it) => {
          if (it.stage === "checkin") {
            return {
              ...it,
              state: "in_progress",
              dueAt: "2026-08-25",
              locked: false,
              waiting: false,
              completeWhen: it.completeWhen.map((g) => ({ ...g, ok: true })),
            };
          }
          return {
            ...it,
            state: "confirmed",
            locked: false,
            waiting: false,
            completeWhen: it.completeWhen.map((g) => ({ ...g, ok: true })),
            enterNextWhen: it.enterNextWhen.map((g) => ({ ...g, ok: true })),
          };
        }),
      })),
    };
  }

  return base;
}

