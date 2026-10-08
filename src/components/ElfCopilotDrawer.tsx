import { useState } from "react";
import { Drawer, Tabs, Button, Tag, Typography, Space, Slider, message } from "antd";
import {
  Brain,
  WarningOctagon,
  CheckCircle,
  BellRinging,
  Copy,
  RocketLaunch,
  UserCircle,
} from "../icons";
import { EmotionBall } from "../emotion-ball";
import { PEOPLE, STAGES, TODAY } from "../mock";
import { formatDay, itemLight, launchRemain } from "../logic";
import type { LaunchBatch, WorkItem, ResourceLane, PersonId } from "../types";
import { playSound } from "../sound";

const { Text, Paragraph } = Typography;

export function ElfCopilotDrawer({
  open,
  onClose,
  batch,
  onOpenItem,
  onNudge,
}: {
  open: boolean;
  onClose: () => void;
  batch: LaunchBatch;
  onOpenItem?: (id: string) => void;
  onNudge?: (item: WorkItem, lane: ResourceLane) => void;
}) {
  const [whatIfDelay, setWhatIfDelay] = useState(0);

  // Compute key batch metrics
  const allItems: WorkItem[] = batch.lanes.flatMap((l: ResourceLane) => l.items);
  const totalCount = allItems.length;
  const doneCount = allItems.filter((i: WorkItem) => i.state === "confirmed" || i.skipped).length;
  const inProgressCount = allItems.filter((i: WorkItem) => i.state === "in_progress" || i.state === "submitted").length;
  const redItems = allItems.filter((i: WorkItem) => i.state !== "confirmed" && !i.skipped && itemLight(i) === "red");
  const yellowItems = allItems.filter((i: WorkItem) => i.state !== "confirmed" && !i.skipped && itemLight(i) === "yellow");
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const daysLeftLabel = launchRemain(batch.launchDate);

  // Generate Feishu / WeCom nudge drafts
  const nudgeDrafts = redItems.concat(yellowItems).slice(0, 4).map((item: WorkItem) => {
    const lane = batch.lanes.find((l: ResourceLane) => l.items.some((x: WorkItem) => x.id === item.id))!;
    const dri = PEOPLE[item.driId as PersonId];
    const stageName = STAGES.find((s) => s.key === item.stage)?.name ?? item.stage;
    const isRed = itemLight(item) === "red";
    return {
      driName: dri?.name ?? item.driId,
      driTitle: dri?.title ?? "工序主责",
      laneName: lane.name,
      stageName,
      text: isRed
        ? `Hi @${dri?.name}，您负责的【${lane.name}】当前滞留在 [${stageName}] 阶段已出现延期风险，目前已有下游工序处于等待锁定状态。请于今日内提交最新交付物或在 ElfShip 同步阻碍点，感谢！`
        : `Hi @${dri?.name}，温馨提醒：您负责的【${lane.name}】（${stageName}）节点将于 ${formatDay(item.dueAt)} 到期。请提前做好交付准备，如有依赖未就绪请及时呼叫！`,
      item,
      lane,
    };
  });

  // Generate Executive Markdown Report
  const dailyReport = `# 【${batch.name}】交付节拍日报
**汇报日期**：${TODAY} | **目标上线日**：${formatDay(batch.launchDate)} (${daysLeftLabel})

---
### 总体吞吐进度
- **全线达成率**：${pct}% (${doneCount}/${totalCount} 项工序已放行)
- **进行中工序**：${inProgressCount} 项
- **当前卡点风险**：严重逾期 ${redItems.length} 项 | 临期关注 ${yellowItems.length} 项

---
### 关键卡点与阻塞溯源
${
  redItems.length > 0
    ? redItems
        .map((item: WorkItem) => {
          const lane = batch.lanes.find((l: ResourceLane) => l.items.some((x: WorkItem) => x.id === item.id))!;
          const dri = PEOPLE[item.driId as PersonId];
          const stageName = STAGES.find((s) => s.key === item.stage)?.name ?? item.stage;
          return `- **${lane.name}** [${stageName}]：主责 @${dri?.name}，已滞留逾期，阻碍下游工序流转。`;
        })
        .join("\n")
    : "- 全管线无严重阻塞卡点，生产节拍处于健康缓冲区。"
}

---
### 交付精灵 AI 优化建议
1. 优先推进【${redItems[0] ? batch.lanes.find((l: ResourceLane) => l.items.some((x: WorkItem) => x.id === redItems[0].id))?.name : "重点资产"}】节点的验收放行，解锁下游 ${redItems.length > 0 ? "3" : "0"} 项依赖工序。
2. 针对临期工序提前启动 AYON 引擎门禁预检，避免终审积压。
`;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="min(520px, 100vw)"
      rootClassName="elf-copilot-drawer"
      styles={{
        body: { paddingBottom: 24, overflowX: "hidden" },
      }}
      title={
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <EmotionBall
              emotion={redItems.length > 0 ? "34" : "01"}
              size={32}
              sketch={true}
              shape="blob"
              color="#7c3aed"
              eyeColor="#3b0764"
              interactive={true}
              autostart={true}
            />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                <span>交付精灵 Copilot</span>
                <Tag color="purple" style={{ fontSize: 10, margin: 0 }}>AI 线稿智脑</Tag>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary, #666)" }}>
                实时分析 {batch.name} · {totalCount} 道工序
              </div>
            </div>
          </div>
          <Tag color={redItems.length > 0 ? "error" : "success"}>
            {redItems.length > 0 ? `${redItems.length} 项阻塞` : "节拍健康"}
          </Tag>
        </div>
      }
    >
      {/* Top Bento Stat Banner */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          marginBottom: 16,
          background: "var(--bg-tag, rgba(0,0,0,0.03))",
          padding: 12,
          borderRadius: 10,
          border: "1px solid var(--border-subtle, rgba(0,0,0,0.08))",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary, #666)" }}>批次总达成率</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1677ff" }}>{pct}%</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary, #666)" }}>交付倒计时</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#52c41a" }}>{daysLeftLabel}</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 11, color: "var(--text-secondary, #666)" }}>阻塞告警数</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: redItems.length > 0 ? "#ff4d4f" : "#52c41a" }}>
            {redItems.length}
          </div>
        </div>
      </div>

      <Tabs
        defaultActiveKey="diag"
        items={[
          {
            key: "diag",
            label: (
              <span>
                <Brain size={14} weight="duotone" style={{ marginRight: 4 }} />
                智能诊断
              </span>
            ),
            children: (
              <div>
                {/* AI Proactive Generative Action Dispatch Card */}
                {redItems.length > 0 && (
                  <div
                    style={{
                      padding: "12px 14px",
                      background: "linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(239, 68, 68, 0.05) 100%)",
                      border: "1px solid rgba(37, 99, 235, 0.2)",
                      borderRadius: 8,
                      marginBottom: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>
                        智能调度协同策略 (COPILOT ADVISORY)
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary, #666)", marginTop: 2 }}>
                        检测到 {redItems.length} 项工序阻断已触碰硬门禁，建议立刻执行跨部门排障协办。
                      </div>
                    </div>
                    <Button
                      type="primary"
                      size="small"
                      danger
                      icon={<BellRinging size={13} weight="bold" />}
                      onClick={() => {
                        const allText = nudgeDrafts.map((d: { text: string }) => d.text).join("\n\n");
                        navigator.clipboard?.writeText(allText);
                        message.success(`已复制 ${nudgeDrafts.length} 位责任人的催办协同广播！`);
                        playSound.confirm();
                      }}
                    >
                      一键批量催办
                    </Button>
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                <Text strong style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  <WarningOctagon size={16} weight="duotone" color="#ff4d4f" />
                  卡点阻塞多米诺效应分析
                </Text>
                </div>

                {redItems.length === 0 ? (
                  <div
                    style={{
                      padding: 24,
                      textAlign: "center",
                      background: "rgba(82, 196, 26, 0.06)",
                      borderRadius: 8,
                      border: "1px dashed #52c41a",
                    }}
                  >
                    <CheckCircle size={28} weight="duotone" color="#52c41a" style={{ marginBottom: 8 }} />
                    <div style={{ fontWeight: 600, color: "#52c41a" }}>全管线无致命卡点！</div>
                    <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                      当前所有工序按计划节奏顺利流转中。
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {redItems.map((item: WorkItem) => {
                      const lane = batch.lanes.find((l: ResourceLane) => l.items.some((x: WorkItem) => x.id === item.id))!;
                      const dri = PEOPLE[item.driId as PersonId];
                      const stage = STAGES.find((s) => s.key === item.stage);
                      return (
                        <div
                          key={item.id}
                          style={{
                            padding: 12,
                            borderRadius: 8,
                            background: "rgba(255, 77, 79, 0.06)",
                            border: "1px solid rgba(255, 77, 79, 0.2)",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <WarningOctagon size={16} weight="duotone" color="#ff4d4f" />
                              <span style={{ fontWeight: 700, fontSize: 13 }}>{lane.name}</span>
                              <Tag color="red" style={{ margin: 0 }}>{stage?.short} 逾期</Tag>
                            </div>
                            <Button
                              size="small"
                              type="link"
                              onClick={() => {
                                onClose();
                                onOpenItem?.(item.id);
                              }}
                            >
                              跳转工序 →
                            </Button>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary, #666)", marginBottom: 8 }}>
                            主责人：<b>{dri?.name}</b>（{dri?.title}） · 逾期导致下游验收工序被锁定
                          </div>
                          {onNudge && (
                            <Button
                              size="small"
                              type="primary"
                              danger
                              ghost
                              icon={<BellRinging size={13} weight="duotone" />}
                              onClick={() => {
                                onNudge(item, lane);
                                playSound.confirm();
                              }}
                            >
                              复制专属催办话术
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ marginTop: 20 }}>
                  <Text strong style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                    <RocketLaunch size={16} weight="duotone" color="#7c3aed" />
                    延期沙盒推演 ("What-If" Sandbox)
                  </Text>
                  <div
                    style={{
                      background: "var(--bg-tag, rgba(0,0,0,0.03))",
                      padding: 12,
                      borderRadius: 8,
                      marginTop: 8,
                      border: "1px solid var(--border-subtle, rgba(0,0,0,0.08))",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span>关键工序假设延期天数：</span>
                      <b style={{ color: whatIfDelay > 0 ? "#ff4d4f" : "#1677ff" }}>+{whatIfDelay} 天</b>
                    </div>
                    <Slider
                      min={0}
                      max={7}
                      value={whatIfDelay}
                      onChange={(v) => {
                        setWhatIfDelay(v);
                        playSound.click();
                      }}
                      marks={{ 0: "准时", 3: "+3天", 7: "+7天" }}
                    />
                    <div style={{ fontSize: 12, color: "var(--text-secondary, #666)", marginTop: 12 }}>
                      {whatIfDelay === 0 ? (
                        "当前排期处于安全冗余范围内，终审准出可如期达成。"
                      ) : (
                        <span style={{ color: "#ff4d4f" }}>
                          若延期 {whatIfDelay} 天，终审日期将顺延，并将触碰版本发布硬门禁！
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: "nudge",
            label: (
              <span>
                <BellRinging size={14} weight="duotone" style={{ marginRight: 4 }} />
                催办生成
              </span>
            ),
            children: (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text strong style={{ fontSize: 13 }}>
                  <Copy size={13} weight="duotone" style={{ marginRight: 4 }} />
                  飞书 / 企微个性化催办话术
                </Text>
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => {
                      const allText = nudgeDrafts.map((d: { text: string }) => d.text).join("\n\n");
                      navigator.clipboard?.writeText(allText);
                      message.success("已复制全部催办话术至剪贴板！");
                      playSound.confirm();
                    }}
                  >
                    一键复制全部
                  </Button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {nudgeDrafts.map((d: { driName: string; laneName: string; text: string }, i: number) => (
                    <div
                      key={i}
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        background: "var(--bg-tag, rgba(0,0,0,0.03))",
                        border: "1px solid var(--border-subtle, rgba(0,0,0,0.08))",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <Space size={6}>
                          <UserCircle size={15} weight="duotone" color="#1677ff" />
                          <span style={{ fontWeight: 600, fontSize: 13 }}>@{d.driName}</span>
                          <Tag style={{ margin: 0, fontSize: 11 }}>{d.laneName}</Tag>
                        </Space>
                        <Button
                          size="small"
                          type="text"
                          icon={<Copy size={13} weight="duotone" />}
                          onClick={() => {
                            navigator.clipboard?.writeText(d.text);
                            message.success(`已复制发给 @${d.driName} 的催办文本`);
                            playSound.confirm();
                          }}
                        >
                          复制单条
                        </Button>
                      </div>
                      <Paragraph
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary, #444)",
                          background: "var(--bg-card, #fff)",
                          padding: "8px 10px",
                          borderRadius: 6,
                          margin: 0,
                          lineHeight: 1.6,
                        }}
                      >
                        {d.text}
                      </Paragraph>
                    </div>
                  ))}
                </div>
              </div>
            ),
          },
          {
            key: "report",
            label: (
              <span>
                <RocketLaunch size={14} weight="duotone" style={{ marginRight: 4 }} />
                交付日报
              </span>
            ),
            children: (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text strong style={{ fontSize: 13 }}>
                  <RocketLaunch size={13} weight="duotone" style={{ marginRight: 4 }} />
                  制作人 / 总监交付简报 (Markdown)
                </Text>
                  <Button
                    size="small"
                    type="primary"
                    icon={<Copy size={13} weight="duotone" />}
                    onClick={() => {
                      navigator.clipboard?.writeText(dailyReport);
                      message.success("已将 Markdown 交付日报复制到剪贴板！");
                      playSound.confirm();
                    }}
                  >
                    复制 Markdown 日报
                  </Button>
                </div>

                <div
                  style={{
                    background: "var(--bg-tag, #0d1117)",
                    color: "var(--text-code, #c9d1d9)",
                    padding: 14,
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.6,
                    maxHeight: 380,
                    overflowY: "auto",
                    border: "1px solid var(--border-subtle, rgba(255,255,255,0.1))",
                  }}
                >
                  {dailyReport}
                </div>
              </div>
            ),
          },
        ]}
      />
    </Drawer>
  );
}
