import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  Collapse,
  Flex,
  Input,
  Modal,
  Segmented,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message
} from 'antd';
import {
  RobotOutlined,
  SettingOutlined,
  CloseOutlined,
  SendOutlined,
  ExpandOutlined,
  CompressOutlined,
  SyncOutlined,
  StarOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  ExperimentOutlined,
  RiseOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'motion/react';
import { EmotionBall } from './EmotionBall';
import { EmotionBallConfig } from './engine';
import { elfBus, type ElfEvent } from './events';
import type { EmotionBallInstance, ShapeType } from './types';
import type { LaunchBatch } from '../types';
import { currentItem, itemLight } from '../logic';

const { Text, Paragraph } = Typography;

interface ElfCompanionProps {
  batch?: LaunchBatch;
  riskLevel?: 'risk' | 'watch' | 'ok';
  riskText?: string;
  onTriggerNudge?: () => void;
  onOpenSearch?: () => void;
}

export function ElfCompanion({
  batch,
  riskLevel = 'ok',
  riskText,
  onTriggerNudge,
  onOpenSearch
}: ElfCompanionProps) {
  const ballRef = useRef<EmotionBallInstance>(null);
  const [currentEmotion, setCurrentEmotion] = useState('02');
  const [shape, setShape] = useState<ShapeType>('blob');
  const [sketch, setSketch] = useState(false);
  const [touring, setTouring] = useState(false);
  const [tipsText, setTipsText] = useState<string | null>(null);
  const [workshopOpen, setWorkshopOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>('all');
  const [customMsg, setCustomMsg] = useState('{"emotionId":"30","tips":"正在根据排期模型评估各资源阻塞风险..."}');
  const [isMinimized, setIsMinimized] = useState(false);

  const allEmotions = useMemo(() => EmotionBallConfig.list(), []);

  const filteredEmotions = useMemo(() => {
    if (activeGroup === 'all') return allEmotions;
    return allEmotions.filter((e) => e.group === activeGroup);
  }, [allEmotions, activeGroup]);

  const activeDef = useMemo(() => {
    return EmotionBallConfig.get(currentEmotion) || allEmotions[0];
  }, [currentEmotion, allEmotions]);

  // Subscribe to real-time events across the entire platform
  useEffect(() => {
    const unsubscribe = elfBus.subscribe((evt: ElfEvent) => {
      if (touring) return;

      if (evt.message) {
        setTipsText(evt.message);
      }

      if (evt.emotionId) {
        ballRef.current?.setEmotion(evt.emotionId);
        setCurrentEmotion(evt.emotionId);
      } else {
        switch (evt.type) {
          case 'stage_advanced':
          case 'item_confirmed':
            ballRef.current?.setEmotion('33'); // 任务完成
            setCurrentEmotion('33');
            ballRef.current?.burst(24);
            ballRef.current?.spin(1);
            break;
          case 'item_rejected':
            ballRef.current?.setEmotion('23'); // 沮丧
            setCurrentEmotion('23');
            break;
          case 'item_started':
            ballRef.current?.setEmotion('30'); // 运转中
            setCurrentEmotion('30');
            break;
          case 'item_submitted':
            ballRef.current?.setEmotion('11'); // 关注审核
            setCurrentEmotion('11');
            break;
          case 'nudge_sent':
            ballRef.current?.setEmotion('17'); // 警惕催办
            setCurrentEmotion('17');
            (ballRef.current as any)?.bounce?.();
            break;
          case 'batch_date_shifted':
            ballRef.current?.setEmotion('30'); // 思考排期
            setCurrentEmotion('30');
            break;
          case 'role_switched':
            ballRef.current?.setEmotion('01'); // 唤醒
            setCurrentEmotion('01');
            break;
          case 'batch_selected':
            ballRef.current?.setEmotion('03'); // 好奇
            setCurrentEmotion('03');
            break;
          case 'filter_changed':
            ballRef.current?.setEmotion('40'); // 检索
            setCurrentEmotion('40');
            break;
          case 'drag_start':
            ballRef.current?.setEmotion('03');
            setCurrentEmotion('03');
            break;
          case 'drag_end':
            ballRef.current?.setEmotion('02');
            setCurrentEmotion('02');
            break;
          case 'diagnosis_requested':
            handleRunDiagnosis();
            break;
        }
      }

      if (evt.action === 'spin') ballRef.current?.spin(1);
      else if (evt.action === 'burst') ballRef.current?.burst(20);
      else if (evt.action === 'bounce') (ballRef.current as any)?.bounce?.();
    });

    return unsubscribe;
  }, [touring, batch, riskLevel, riskText]);

  // Auto react to delivery platform risk level changes
  useEffect(() => {
    if (touring) return;

    if (riskLevel === 'risk') {
      ballRef.current?.setEmotion('34'); // 出错/告警
      setTipsText(riskText || '检测到主链路存在逾期阻塞，请及时处理红灯资源。');
    } else if (riskLevel === 'watch') {
      ballRef.current?.setEmotion('11'); // 疑惑/关注
      setTipsText(riskText || '部分资源节点临期，建议留意交付排期。');
    } else {
      ballRef.current?.setEmotion('02'); // 待机放空
      setTipsText('所有交付项正常推进中，交付精灵已就绪。');
    }
  }, [riskLevel, riskText, touring]);

  const handleEmotionSelect = (id: string) => {
    setCurrentEmotion(id);
    ballRef.current?.setEmotion(id);
    const def = EmotionBallConfig.get(id);
    if (def) {
      setTipsText(`已切换状态【${def.name}】：${def.desc}`);
    }
  };

  const handleSpin = () => {
    ballRef.current?.spin(1);
    message.success('已触发自旋轨道彩带');
  };

  const handleBurst = () => {
    ballRef.current?.burst(28);
    message.success('已触发粒子撒花');
  };

  const handleBounce = () => {
    (ballRef.current as any)?.bounce?.();
    message.success('已触发动态弹跳');
  };

  const handleToggleTour = () => {
    if (touring) {
      ballRef.current?.stopTour();
      setTouring(false);
      message.info('已停止自动巡演');
    } else {
      ballRef.current?.startTour(undefined, 2200);
      setTouring(true);
      message.success('已开启全状态自动巡演');
    }
  };

  const handleSendAIMessage = () => {
    if (!customMsg.trim()) return;
    try {
      const ok = ballRef.current?.handleAIMessage(customMsg);
      if (ok) {
        message.success('AI 协议消息已解析并驱动小球');
      }
    } catch (e: any) {
      message.error(`解析失败：${e.message}`);
    }
  };

  const handleRunDiagnosis = () => {
    ballRef.current?.setEmotion('30'); // 思考中
    const batchName = batch ? batch.name : '当前批次';
    setTipsText(`交付精灵正在扫描【${batchName}】流水线依赖与交付节拍...`);

    setTimeout(() => {
      if (!batch || !batch.lanes) {
        ballRef.current?.setEmotion('33');
        ballRef.current?.burst(20);
        setTipsText(`诊断完成：平台交付流水线运行良好，各节点就绪。`);
        return;
      }

      const total = batch.lanes.length;
      let redCount = 0;
      let yellowCount = 0;
      let lockedCount = 0;
      let doneCount = 0;

      for (const lane of batch.lanes) {
        const cur = currentItem(lane);
        if (!cur) continue;
        const l = itemLight(cur);
        if (l === 'red') redCount++;
        else if (l === 'yellow') yellowCount++;
        if (cur.locked) lockedCount++;
        if (cur.stage === 'checkin' && cur.state === 'confirmed') doneCount++;
      }

      if (redCount > 0) {
        ballRef.current?.setEmotion('17'); // 慌张 / 警报
        ballRef.current?.burst(14);
        (ballRef.current as any)?.bounce?.();
        setTipsText(
          `【${batchName}】诊断告警：共 ${total} 项资源，存在 ${redCount} 项逾期红灯、${lockedCount} 项下游锁定！建议优先催办关键链路。`
        );
      } else if (yellowCount > 0) {
        ballRef.current?.setEmotion('11'); // 关注
        setTipsText(
          `【${batchName}】诊断关注：共 ${total} 项资源，已完成 ${doneCount} 项，发现 ${yellowCount} 项临期节点，请注意推进节奏。`
        );
      } else {
        ballRef.current?.setEmotion('33'); // 任务完成
        ballRef.current?.burst(30);
        ballRef.current?.spin(1);
        setTipsText(
          `【${batchName}】诊断优秀：全链路顺畅！已完成 ${doneCount}/${total} 项，无任何阻塞红灯与临期卡点。`
        );
      }
    }, 1200);
  };

  // Auto-collapse bubble on scroll to prevent obscuring board cards (WCAG & Ergonomics)
  useEffect(() => {
    const handleScroll = () => {
      if (tipsText) {
        setTipsText(null);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [tipsText]);

  return (
    <>
      {/* Floating Widget at Bottom-Right */}
      <div className="elf-companion-dock">
        {/* Speech Bubble */}
        <AnimatePresence>
          {tipsText && !isMinimized && (
            <motion.div
              className="elf-bubble"
              initial={{ opacity: 0, y: 10, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.2 }}
            >
              <div className="elf-bubble-header">
                <span className="elf-bubble-title">
                  <RobotOutlined style={{ color: 'var(--brand-primary, #1677ff)' }} /> 交付精灵 · {activeDef.name}
                </span>
                <Button
                  type="text"
                  size="small"
                  icon={<CloseOutlined style={{ fontSize: 10 }} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTipsText(null);
                  }}
                  className="elf-bubble-close"
                />
              </div>
              <div className="elf-bubble-body">{tipsText}</div>
              <div className="elf-bubble-actions">
                {onOpenSearch && (
                  <Button size="small" type="link" icon={<SearchOutlined />} onClick={onOpenSearch} style={{ padding: '0 4px', fontSize: 12 }}>
                    搜索
                  </Button>
                )}
                <Button size="small" type="link" icon={<RiseOutlined />} onClick={handleRunDiagnosis} style={{ padding: '0 4px', fontSize: 12 }}>
                  诊断
                </Button>
                {riskLevel === 'risk' && onTriggerNudge && (
                  <Button size="small" type="primary" danger icon={<ThunderboltOutlined />} onClick={onTriggerNudge} style={{ fontSize: 12 }}>
                    催办
                  </Button>
                )}
                <Button size="small" type="default" icon={<SettingOutlined />} onClick={() => setWorkshopOpen(true)} style={{ fontSize: 12 }}>
                  工坊
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Emotion Ball Avatar Card */}
        <motion.div
          className={`elf-companion-avatar ${isMinimized ? 'is-minimized' : ''}`}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onMouseEnter={() => {
            if (!tipsText) {
              setTipsText(riskLevel === 'risk' ? (riskText || '检测到主链路存在逾期阻塞，请及时处理红灯资源。') : '所有交付项推进中，点击打开工坊或直接拖拽卡片流转。');
            }
          }}
        >
          <div
            className="elf-ball-wrapper"
            onClick={() => {
              if (isMinimized) {
                setIsMinimized(false);
              } else {
                setWorkshopOpen(true);
              }
            }}
          >
            <EmotionBall
              ref={ballRef}
              emotion={currentEmotion}
              shape={shape}
              size={isMinimized ? 48 : 80}
              sketch={sketch ? 1 : 0}
              interactive={true}
              idle={true}
              onEmotionChange={({ id }) => setCurrentEmotion(id)}
              onTips={({ text }) => setTipsText(text)}
            />
          </div>

          <div className="elf-companion-toolbar">
            <Tooltip title={isMinimized ? '展开' : '最小化'}>
              <button
                type="button"
                className="elf-mini-btn"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <ExpandOutlined /> : <CompressOutlined />}
              </button>
            </Tooltip>
            {!isMinimized && (
              <>
                <Tooltip title="自旋彩带">
                  <button type="button" className="elf-mini-btn" onClick={handleSpin}>
                    <SyncOutlined />
                  </button>
                </Tooltip>
                <Tooltip title="撒花效果">
                  <button type="button" className="elf-mini-btn" onClick={handleBurst}>
                    <StarOutlined />
                  </button>
                </Tooltip>
                <Tooltip title="工坊面板">
                  <button
                    type="button"
                    className="elf-mini-btn primary"
                    onClick={() => setWorkshopOpen(true)}
                  >
                    <SettingOutlined />
                  </button>
                </Tooltip>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {/* Elf Emotion Workshop Modal */}
      <Modal
        title={
          <Flex align="center" gap={10}>
            <ExperimentOutlined style={{ fontSize: 18, color: 'var(--brand-primary, #1677ff)' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
                交付精灵状态机与工坊面板
              </div>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                实时渲染 32 种状态表情 · 3 种身体形态 · 物理弹簧动力学 · 轨道彩带与粒子系统
              </Text>
            </div>
          </Flex>
        }
        open={workshopOpen}
        onCancel={() => setWorkshopOpen(false)}
        footer={null}
        width={960}
        destroyOnClose={false}
        className="emotion-workshop-modal"
      >
        <div className="workshop-layout">
          {/* Left Stage & Controls Panel */}
          <div className="workshop-stage-panel">
            <div className="workshop-stage-box">
              <EmotionBall
                emotion={currentEmotion}
                shape={shape}
                size={136}
                sketch={sketch ? 1 : 0}
                interactive={true}
                idle={!touring}
              />
              <div className="workshop-stage-badge">
                <Tag color="blue" style={{ margin: 0, fontFamily: 'monospace', fontWeight: 600 }}>
                  {activeDef.id}
                </Tag>
                <Text strong style={{ fontSize: 13 }}>
                  {activeDef.name}
                </Text>
                {activeDef.en && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {activeDef.en.name}
                  </Text>
                )}
              </div>
            </div>

            <Paragraph
              type="secondary"
              ellipsis={{ rows: 2, tooltip: activeDef.desc }}
              style={{ fontSize: 12, margin: '2px 0 6px', minHeight: 32, textAlign: 'center', lineHeight: 1.4 }}
            >
              {activeDef.desc}
            </Paragraph>

            <Card size="small" title="形态与视觉控制" className="workshop-control-card" styles={{ body: { padding: '10px 12px' } }}>
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 500 }}>
                    身体形态：
                  </div>
                  <Segmented
                    size="small"
                    value={shape}
                    onChange={(v) => setShape(v as ShapeType)}
                    options={[
                      { label: '圆胖 (Blob)', value: 'blob' },
                      { label: '三角 (Wedge)', value: 'wedge' },
                      { label: '菱形 (Gem)', value: 'gem' }
                    ]}
                    block
                  />
                </div>

                <Flex justify="space-between" align="center" style={{ paddingTop: 2 }}>
                  <Text style={{ fontSize: 12 }}>线稿模式 (Sketch)</Text>
                  <Switch checked={sketch} onChange={setSketch} size="small" />
                </Flex>

                <Flex justify="space-between" align="center">
                  <Text style={{ fontSize: 12 }}>自动巡演模式</Text>
                  <Switch
                    checked={touring}
                    onChange={handleToggleTour}
                    size="small"
                  />
                </Flex>

                <div style={{ paddingTop: 2 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, fontWeight: 500 }}>
                    动画原语触发：
                  </div>
                  <Flex gap={6}>
                    <Button size="small" icon={<SyncOutlined />} onClick={handleSpin} style={{ flex: 1, fontSize: 12 }}>
                      自旋
                    </Button>
                    <Button size="small" icon={<StarOutlined />} onClick={handleBurst} style={{ flex: 1, fontSize: 12 }}>
                      撒花
                    </Button>
                    <Button size="small" icon={<RiseOutlined />} onClick={handleBounce} style={{ flex: 1, fontSize: 12 }}>
                      弹跳
                    </Button>
                  </Flex>
                </div>
              </Space>
            </Card>

            {/* AI Protocol Testing Box as Collapse */}
            <Collapse
              size="small"
              ghost
              items={[
                {
                  key: 'ai-debug',
                  label: <span style={{ fontSize: 12, fontWeight: 600 }}>AI 协议消息测试</span>,
                  children: (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <Input.TextArea
                        value={customMsg}
                        onChange={(e) => setCustomMsg(e.target.value)}
                        rows={2}
                        style={{ fontSize: 11, fontFamily: 'monospace' }}
                      />
                      <Button
                        type="primary"
                        size="small"
                        icon={<SendOutlined />}
                        onClick={handleSendAIMessage}
                        block
                        style={{ fontSize: 12 }}
                      >
                        发送协议驱动
                      </Button>
                    </div>
                  )
                }
              ]}
            />
          </div>

          {/* Right Emotion Grid Selector */}
          <div className="workshop-grid-panel">
            {/* Quick Business Presets */}
            <div className="workshop-preset-strip">
              <div className="workshop-preset-title">快捷场景：</div>
              <div className="workshop-preset-tags">
                <Tag.CheckableTag
                  checked={false}
                  onChange={() => {
                    setShape('wedge');
                    handleEmotionSelect('34');
                    (ballRef.current as any)?.bounce?.();
                  }}
                >
                  阻塞告警
                </Tag.CheckableTag>
                <Tag.CheckableTag
                  checked={false}
                  onChange={() => {
                    setShape('gem');
                    handleEmotionSelect('30');
                  }}
                >
                  专注冲刺
                </Tag.CheckableTag>
                <Tag.CheckableTag
                  checked={false}
                  onChange={() => {
                    setShape('blob');
                    handleEmotionSelect('19');
                  }}
                >
                  审核待办
                </Tag.CheckableTag>
                <Tag.CheckableTag
                  checked={false}
                  onChange={() => {
                    setShape('blob');
                    handleEmotionSelect('33');
                    ballRef.current?.burst(28);
                    ballRef.current?.spin(1);
                  }}
                >
                  通关达成
                </Tag.CheckableTag>
                <Tag.CheckableTag
                  checked={false}
                  onChange={() => {
                    setShape('blob');
                    handleEmotionSelect('00');
                  }}
                >
                  夜间休眠
                </Tag.CheckableTag>
                <Tag.CheckableTag
                  checked={false}
                  onChange={() => {
                    setShape('blob');
                    handleEmotionSelect('02');
                  }}
                >
                  日常待机
                </Tag.CheckableTag>
              </div>
            </div>

            <div className="workshop-filter-header">
              <Segmented
                size="small"
                value={activeGroup}
                onChange={(v) => setActiveGroup(v as string)}
                options={[
                  { label: '全部 (32)', value: 'all' },
                  { label: '日常状态 (8)', value: 'life' },
                  { label: '交付情绪 (8)', value: 'emotion' },
                  { label: '智能体协作 (8)', value: 'agent' },
                  { label: '特殊状态 (8)', value: 'custom' }
                ]}
                block
              />
            </div>

            <div className="workshop-emotion-scroll-body">
              <div className="workshop-emotion-grid">
                {filteredEmotions.map((item) => {
                  const isSelected = item.id === currentEmotion;
                  return (
                    <div
                      key={item.id}
                      className={`workshop-emotion-card ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => handleEmotionSelect(item.id)}
                    >
                      <div className="workshop-card-preview">
                        <EmotionBall
                          emotion={item.id}
                          shape={shape}
                          size={48}
                          sketch={sketch ? 1 : 0}
                          interactive={true}
                          autostart={true}
                        />
                      </div>
                      <div className="workshop-card-meta">
                        <span className="card-id">{item.id}</span>
                        <span className="card-name" title={item.name}>{item.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}
