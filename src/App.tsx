import { useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Flex,
  Input,
  Modal,
  Popover,
  Segmented,
  Select,
  Space,
  Statistic,
  Tabs,
  Tag,
  Timeline,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { FlowBoard } from "./FlowBoard";
import { ResourceTable } from "./ResourceTable";
import { BoardInsight } from "./StageChart";
import { HeroMeter, LaunchDays, avatar } from "./ui";
import { BoardScroll } from "./motion/BoardScroll";
import {
  PEOPLE,
  PREVIEW_ROLES,
  STAGES,
  TODAY,
  seedPrimaryBatch,
  seedQuietBatch,
} from "./mock";
import {
  batchLights,
  batchRisk,
  canConfirm,
  canReject,
  canStart,
  canSubmit,
  confirmItem,
  findItem,
  formatDay,
  itemLight,
  launchRemain,
  actionQueue,
  patchEvidence,
  progress,
  refreshLocks,
  remainLabel,
  rejectItem,
  reworkItem,
  shiftLaunchDate,
  startItem,
  tryMoveLaneToStage,
  stateLabel,
  submitItem,
  workdaysBetween,
} from "./logic";
import type { LaunchBatch, PersonId, StageKey, View } from "./types";

const { Text, Title } = Typography;

const SHARE_URL = "https://yy-oowoo.github.io/elfship-prototype/";

export function App() {
  const [batches, setBatches] = useState<LaunchBatch[]>(() => [
    refreshLocks(seedPrimaryBatch()),
    refreshLocks(seedQuietBatch()),
  ]);
  const [activeId, setActiveId] = useState("b-summer");
  const [view, setView] = useState<View>("board");
  const [actor, setActor] = useState<PersonId>("xiangbin");
  const [stageFilter, setStageFilter] = useState<StageKey | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [nextLaunch, setNextLaunch] = useState("");
  const [mineTab, setMineTab] = useState<"dri" | "confirm">("dri");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const batch = batches.find((b) => b.id === activeId) ?? batches[0];
  const risk = batchRisk(batch);
  const queue = actionQueue(batch);
  const open = openId ? findItem(batch, openId) : null;

  function update(next: LaunchBatch) {
    setBatches((all) => all.map((b) => (b.id === next.id ? next : b)));
  }

  function openItem(id: string) {
    setOpenId(id);
    setReason("");
    setErr(null);
  }

  function closeItem() {
    setOpenId(null);
  }

  const visibleLanes = useMemo(() => {
    if (!stageFilter) return batch.lanes;
    return batch.lanes.filter((lane) => {
      const it = lane.items.find((x) => x.stage === stageFilter);
      if (!it || it.skipped) return false;
      return it.state !== "confirmed" || itemLight(it) !== "none";
    });
  }, [batch, stageFilter]);

  const doneLanes = batch.lanes.filter((lane) => {
    const p = progress(lane);
    return p.total > 0 && p.done === p.total;
  }).length;

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
    } catch {
      window.prompt("复制分享链接", SHARE_URL);
    }
    setCopied(true);
    message.success("分享链接已复制");
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function nativeShare() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: "精灵交付 · 参考原型",
          text: "上线管控看板原型",
          url: SHARE_URL,
        });
        return;
      } catch {
        /* dismissed */
      }
    }
    await copyShareLink();
  }

  function dropLane(laneId: string, dest: StageKey) {
    const result = tryMoveLaneToStage(batch, laneId, dest, actor);
    if (result.ok) {
      if (result.batch !== batch) {
        update(result.batch);
        message.success("已确认并进入下一节点");
      }
      return;
    }
    message.warning(result.reason);
    if (result.itemId) openItem(result.itemId);
  }

  return (
    <div className="app">
      <a className="skip" href="#main">
        跳到内容
      </a>
      <header className="nav">
        <div className="brand">
          <b>精灵交付</b>
          <span>上线管控</span>
        </div>
        <Segmented
          size="small"
          className="nav-seg"
          value={view}
          onChange={(v) => setView(v as View)}
          options={[
            { label: "批次", value: "list" },
            { label: "看板", value: "board" },
            { label: "我的待办", value: "mine" },
          ]}
        />
        <div className="nav-spacer" />
        <label className="role">
          预览身份
          <Select
            size="small"
            value={actor}
            onChange={(v) => setActor(v)}
            options={PREVIEW_ROLES.map((r) => ({ value: r.id, label: r.label }))}
            popupMatchSelectWidth={false}
          />
        </label>
        <Popover
          trigger="click"
          placement="bottomRight"
          arrow={false}
          content={
            <div className="share-pop">
              <div className="share-pop-label">公开预览</div>
              <Input value={SHARE_URL} readOnly size="small" />
              <div className="share-pop-actions">
                <Button type="primary" size="small" onClick={copyShareLink}>
                  {copied ? "已复制" : "复制链接"}
                </Button>
                <Button type="default" size="small" href={SHARE_URL} target="_blank" rel="noreferrer">
                  打开页面
                </Button>
                {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
                  <Button type="default" size="small" onClick={nativeShare}>
                    系统分享
                  </Button>
                ) : null}
              </div>
              <Text type="secondary" className="share-pop-hint">
                假数据参考原型。发给同事用这条链接，不要发本机地址。
              </Text>
            </div>
          }
        >
          <Button type="text" size="small" className="share-btn">
            {copied ? "已复制" : "分享"}
          </Button>
        </Popover>
        <Tag className="proto-tag">参考原型 · 假数据</Tag>
      </header>
      <div className="scroll-rail" aria-hidden="true">
        <i className="scroll-rail-fill" />
      </div>

      {view === "list" && (
        <div className="list-page view-in" id="main">
          <h1>上线批次</h1>
          <p className="list-lead">
            选择一个批次进入总体看板。主批次刻意做成「有风险」：3D 上传逾期并锁下游，家园文案临期，其它资源继续走。
          </p>
          <div className="cards">
            {batches.map((b) => {
              const r = batchRisk(b);
              const l = batchLights(b);
              return (
                <Card
                  key={b.id}
                  hoverable
                  className="batch-card"
                  onClick={() => {
                    setActiveId(b.id);
                    setStageFilter(null);
                    setView("board");
                  }}
                  extra={
                    <Tag color={r.level === "risk" ? "error" : r.level === "watch" ? "warning" : "success"}>
                      {r.level === "risk" ? "有风险" : r.level === "watch" ? "需关注" : "正常"}
                    </Tag>
                  }
                >
                  <Card.Meta
                    title={b.name}
                    description={
                      <>
                        <div>{b.subtitle}</div>
                        <div>
                          上线 {formatDay(b.launchDate)} · {launchRemain(b.launchDate)} · 红 {l.red} · 黄 {l.yellow}
                        </div>
                        <div>{r.sentence}</div>
                      </>
                    }
                  />
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {view === "board" && (
        <BoardScroll>
          <section className="batch-bar snap-pane">
            <div className="hero-band">
              <div className="hero-side hero-side-left">
                <Text type="secondary" className="hero-kicker">
                  上线批次
                </Text>
                <Title level={2} className="hero-title">
                  {batch.name}
                </Title>
                <Statistic
                  className="hero-date"
                  title="上线日"
                  value={formatDay(batch.launchDate)}
                />
                <div className="hero-dri">
                  {avatar(batch.batchDriId, 28)}
                  <div>
                    <Text type="secondary">批次主责</Text>
                    <div>{PEOPLE[batch.batchDriId].name}</div>
                  </div>
                </div>
              </div>
              <div className="hero-block">
                <HeroMeter
                  remainDays={workdaysBetween(TODAY, batch.launchDate)}
                  done={doneLanes}
                  total={batch.lanes.length}
                  risk={risk.level}
                />
              </div>
              <div className="hero-side hero-side-right">
                <LaunchDays
                  today={TODAY}
                  launch={batch.launchDate}
                  onChange={() => {
                    setNextLaunch(batch.launchDate);
                    setLaunchOpen(true);
                  }}
                />
              </div>
            </div>
          </section>

          <BoardInsight
            batch={batch}
            queue={queue}
            activeStage={stageFilter}
            onOpen={openItem}
            onStage={(key) => setStageFilter((cur) => (cur === key ? null : key))}
          />

          <Card
            className="board-block board-flow snap-pane"
            title="流程"
            extra={<Text type="secondary">拖到下一节点确认</Text>}
          >
            <FlowBoard
              batch={batch}
              actor={actor}
              stageFilter={stageFilter}
              onFilter={setStageFilter}
              onOpen={openItem}
              onDropLane={dropLane}
            />
          </Card>

          <Card
            className="board-block board-res snap-pane"
            title={
              <Space size="middle">
                <span>入库资源</span>
                {stageFilter ? (
                  <Text type="secondary">
                    {visibleLanes.length} / {batch.lanes.length} · {STAGES.find((s) => s.key === stageFilter)?.name}
                  </Text>
                ) : null}
              </Space>
            }
            extra={
              stageFilter ? (
                <Button type="link" size="small" onClick={() => setStageFilter(null)}>
                  看全部
                </Button>
              ) : null
            }
          >
            <ResourceTable lanes={visibleLanes} onOpen={openItem} />
          </Card>
        </BoardScroll>
      )}

      {view === "mine" && (
        <div className="mine view-in" id="main">
          <Tabs
            activeKey={mineTab}
            onChange={(k) => setMineTab(k as "dri" | "confirm")}
            items={[
              { key: "dri", label: "派给我的" },
              { key: "confirm", label: "等我确认" },
            ]}
          />
          {(() => {
            const rows = batch.lanes.flatMap((lane) =>
              lane.items
                .filter((it) => {
                  if (it.skipped || it.state === "confirmed") return false;
                  return mineTab === "dri" ? it.driId === actor : it.confirmerId === actor && it.state === "submitted";
                })
                .map((it) => ({ lane, it })),
            );
            if (rows.length === 0) {
              return <Empty description="这一栏没有待办" />;
            }
            return (
              <Flex orientation="vertical" gap={8}>
                {rows.map(({ lane, it }) => {
                  const light = itemLight(it);
                  return (
                    <button key={it.id} className="mine-row" onClick={() => openItem(it.id)}>
                      <Text strong ellipsis>
                        {`${lane.name} · ${STAGES.find((s) => s.key === it.stage)?.name}`}
                      </Text>
                      <Tag>{stateLabel(it)}</Tag>
                      <Text type="secondary">{remainLabel(it.dueAt)}</Text>
                      <Text type="secondary">{it.locked ? "已锁定" : it.waiting ? "等待前置" : "可处理"}</Text>
                      <Badge status={light === "red" ? "error" : light === "yellow" ? "warning" : "default"} />
                    </button>
                  );
                })}
              </Flex>
            );
          })()}
        </div>
      )}

      <Modal
        className="item-modal"
        open={!!open}
        onCancel={closeItem}
        footer={null}
        width={920}
        centered
        destroyOnHidden
        title={
          open ? (
            <div>
              <Text type="secondary">
                {open.lane.name} · {STAGES.find((s) => s.key === open.item.stage)?.name}
              </Text>
              <div>
                {stateLabel(open.item)}
                <Text type="secondary" style={{ marginLeft: 8, fontWeight: 400 }}>
                  {open.item.offsetLabel} · {formatDay(open.item.dueAt)}
                  {open.item.state === "confirmed" || open.item.skipped ? "" : ` · ${remainLabel(open.item.dueAt)}`}
                </Text>
              </div>
            </div>
          ) : null
        }
      >
        {open && (
          <div className="item-modal-grid">
            <div>
              <Descriptions
                className="block"
                title="职责"
                column={1}
                size="small"
                items={[
                  {
                    key: "dri",
                    label: "主责",
                    children: (
                      <Flex align="center" gap={8}>
                        {avatar(open.item.driId, 24)} {PEOPLE[open.item.driId].name}
                      </Flex>
                    ),
                  },
                  {
                    key: "confirm",
                    label: "确认",
                    children: (
                      <Flex align="center" gap={8}>
                        {avatar(open.item.confirmerId, 24)} {PEOPLE[open.item.confirmerId].name}
                      </Flex>
                    ),
                  },
                  ...open.item.collabIds.map((id) => ({
                    key: id,
                    label: "协作",
                    children: (
                      <Flex align="center" gap={8}>
                        {avatar(id, 24)} {PEOPLE[id].name}
                      </Flex>
                    ),
                  })),
                ]}
              />
              <Descriptions
                className="block"
                title="完成条件"
                column={1}
                size="small"
                items={open.item.completeWhen.map((g) => ({
                  key: g.id,
                  label: g.label,
                  children: <Tag color={g.ok ? "success" : "error"}>{g.ok ? "通过" : "缺失"}</Tag>,
                }))}
              />
              <Descriptions
                className="block"
                title="流转条件"
                column={1}
                size="small"
                items={open.item.enterNextWhen.map((g) => ({
                  key: g.id,
                  label: g.label,
                  children: <Tag color={g.ok ? "success" : "error"}>{g.ok ? "通过" : "缺失"}</Tag>,
                }))}
              />
              <section className="block">
                <h3>过程记录</h3>
                {open.item.history.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚无记录" />
                ) : (
                  <Timeline
                    items={[...open.item.history].reverse().map((h) => ({
                      key: h.id,
                      content: (
                        <div>
                          <Text type="secondary">{h.at}</Text>
                          <div>
                            {PEOPLE[h.actorId].name} {h.action}
                            {h.from && h.to ? ` · ${h.from} → ${h.to}` : ""}
                          </div>
                          {h.reason && <Text type="secondary">{h.reason}</Text>}
                        </div>
                      ),
                    }))}
                  />
                )}
              </section>
            </div>
            <div>
              <section className="block">
                <h3>交付内容</h3>
                {open.item.stage === "upload" && !open.item.skipped && (
                  <>
                    <label className="field">
                      SVN 地址
                      <Input
                        value={open.item.evidence.svnPath ?? ""}
                        onChange={(e) => update(patchEvidence(batch, open.item.id, { svnPath: e.target.value }))}
                      />
                    </label>
                    <label className="field">
                      资源版本
                      <Input
                        value={open.item.evidence.svnRev ?? ""}
                        placeholder="未填则不能确认"
                        onChange={(e) => update(patchEvidence(batch, open.item.id, { svnRev: e.target.value }))}
                      />
                    </label>
                  </>
                )}
                <label className="field">
                  说明
                  <Input.TextArea
                    rows={4}
                    value={open.item.evidence.note ?? ""}
                    onChange={(e) => update(patchEvidence(batch, open.item.id, { note: e.target.value }))}
                  />
                </label>
              </section>
              <section className="block item-actions">
                <h3>处理</h3>
                {err && <Alert type="error" showIcon message={err} style={{ marginBottom: 8 }} />}
                <Flex gap={8} wrap>
                  <Button
                    type="default"
                    onClick={() => {
                      const msg = canStart(open.item, actor);
                      if (msg) setErr(msg);
                      else {
                        update(startItem(batch, open.item.id, actor));
                        setErr(null);
                      }
                    }}
                  >
                    开始
                  </Button>
                  <Button
                    type="default"
                    onClick={() => {
                      const msg = canSubmit(open.item, actor);
                      if (msg) setErr(msg);
                      else {
                        update(submitItem(batch, open.item.id, actor));
                        setErr(null);
                      }
                    }}
                  >
                    提交
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => {
                      const msg = canConfirm(open.item, actor);
                      if (msg) setErr(msg);
                      else {
                        update(confirmItem(batch, open.item.id, actor));
                        setErr(null);
                      }
                    }}
                  >
                    确认通过
                  </Button>
                  {open.item.state === "rejected" && (
                    <Button
                      type="default"
                      onClick={() => {
                        update(reworkItem(batch, open.item.id, actor));
                        setErr(null);
                      }}
                    >
                      开始返工
                    </Button>
                  )}
                </Flex>
                <label className="field" style={{ marginTop: 12 }}>
                  退回原因
                  <Input.TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
                </label>
                <Button
                  color="danger"
                  variant="outlined"
                  onClick={() => {
                    const msg = canReject(open.item, actor, reason);
                    if (msg) setErr(msg);
                    else {
                      update(rejectItem(batch, open.item.id, actor, reason));
                      setReason("");
                      setErr(null);
                    }
                  }}
                >
                  退回
                </Button>
              </section>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="调整上线日"
        open={launchOpen}
        onCancel={() => setLaunchOpen(false)}
        onOk={() => {
          if (nextLaunch) update(shiftLaunchDate(batch, nextLaunch, actor));
          setLaunchOpen(false);
        }}
        okText="确认调整"
        cancelText="取消"
        okButtonProps={{ type: "primary" }}
        cancelButtonProps={{ type: "default" }}
      >
        <p className="hint">未完成且未钉死的任务会按工作日平移截止日期，并写入过程记录。已完成节点保持原日期。</p>
        <DatePicker
          value={nextLaunch ? dayjs(nextLaunch) : null}
          onChange={(d) => setNextLaunch(d ? d.format("YYYY-MM-DD") : "")}
          style={{ width: "100%" }}
        />
      </Modal>
    </div>
  );
}
