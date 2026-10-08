import { Modal, Button, Tag, Space, Typography, message } from "antd";
import { FestiveIllustrationBanner, HolidayIconRenderer } from "./FestiveIcons";
import { type HolidayInfo } from "../mock";
import { playSound } from "../sound";
import { Sparkle, CheckCircle, ShareNetwork } from "@phosphor-icons/react";

const { Paragraph } = Typography;

interface FestiveEasterEggModalProps {
  visible: boolean;
  holiday: HolidayInfo | null;
  holidayKey: string;
  onClose: () => void;
}

export function FestiveEasterEggModal({
  visible,
  holiday,
  holidayKey,
  onClose,
}: FestiveEasterEggModalProps) {
  if (!holiday) return null;

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={480}
      centered
      closable={false}
      className="festive-egg-modal"
      styles={{
        body: {
          padding: 0,
        },
      }}
    >
      {/* 1. Vector Hero Illustration Banner (includes custom close button) */}
      <FestiveIllustrationBanner
        holidayKey={holidayKey}
        title={`${holiday.name} · ${holiday.tag}`}
        subtitle={holiday.greeting}
        onClose={onClose}
      />

      <div style={{ padding: "0 20px 20px" }}>
        {/* 2. Studio Milestone & Pipeline Perk Card */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid rgba(226, 232, 240, 0.9)",
            borderRadius: 10,
            padding: "12px 14px",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: 5 }}>
              <Sparkle size={14} weight="duotone" color={holiday.themeColor} /> 节日专属研发生产力彩蛋
            </span>
            <Tag color={holiday.themeColor} style={{ marginRight: 0 }}>
              {holiday.type === "statutory" ? "法定节假日" : "传统/行业节日"}
            </Tag>
          </div>

          <Paragraph style={{ fontSize: 12, color: "#475569", marginBottom: 8, lineHeight: 1.5 }}>
            {holiday.easterEgg}
          </Paragraph>

          <div
            style={{
              background: "#ffffff",
              border: "1px dashed rgba(203, 213, 225, 0.8)",
              borderRadius: 6,
              padding: "6px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#64748b",
            }}
          >
            <span>管线状态：<b>全线无阻塞 · 流水线绿灯</b></span>
            <span style={{ color: "#16a34a", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
              <CheckCircle size={13} weight="fill" /> 自动化门禁已就绪
            </span>
          </div>
        </div>

        {/* 3. Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Button
            icon={<ShareNetwork size={14} weight="bold" />}
            onClick={() => {
              playSound.click();
              message.success(`已生成【${holiday.name}】版本交付贺卡并复制分享链接`);
            }}
            style={{ borderRadius: 8 }}
          >
            分享团队贺卡
          </Button>

          <Space size={8}>
            <Button onClick={onClose} style={{ borderRadius: 8 }}>
              了解
            </Button>
            <Button
              type="primary"
              icon={<HolidayIconRenderer holidayKey={holidayKey} size={14} style={{ color: "#fff" }} />}
              onClick={() => {
                playSound.fanfare();
                message.success(`已为全员激活【${holiday.name}】专属生产力加成 Buff！`);
                onClose();
              }}
              style={{
                borderRadius: 8,
                background: holiday.themeColor,
                borderColor: holiday.themeColor,
              }}
            >
              领取专属 Buff
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  );
}
