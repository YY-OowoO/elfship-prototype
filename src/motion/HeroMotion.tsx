import { motion } from "motion/react";
import { ArrowRightOutlined } from "@ant-design/icons";
import { prefersReduce } from "./prefers";

/**
 * 英雄区（批次中控 Hero Delivery Runway）专属动效组件。
 * 门禁里程碑连接线：极简高保真居中过渡箭头与状态微流。
 */

export interface GateConnectorProps {
  delay?: number;
  fromStatus?: "passed" | "risk" | "waiting" | "target";
  toStatus?: "passed" | "risk" | "waiting" | "target";
}

export function GateConnector({
  delay = 0,
  fromStatus = "passed",
  toStatus = "waiting",
}: GateConnectorProps) {
  const isPassedFlow = fromStatus === "passed" && toStatus === "passed";
  const isRiskFlow = fromStatus === "risk" || toStatus === "risk";
  const isTargetFlow = toStatus === "target";

  const trackTone = isRiskFlow
    ? "flow-risk"
    : isPassedFlow
    ? "flow-passed"
    : isTargetFlow
    ? "flow-target"
    : "flow-normal";

  if (prefersReduce()) {
    return (
      <div className={`hr-gate-connector ${trackTone}`} aria-hidden="true">
        <span className="hr-gate-conn-stem" />
        <span className="hr-gate-conn-badge">
          <ArrowRightOutlined className="hr-gate-conn-arrow" />
        </span>
        <span className="hr-gate-conn-stem" />
      </div>
    );
  }

  return (
    <motion.div
      className={`hr-gate-connector ${trackTone}`}
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
    >
      <span className="hr-gate-conn-stem" />
      <motion.span
        className="hr-gate-conn-badge"
        animate={{ x: [0, 3, 0] }}
        transition={{ duration: 1.8, delay: delay + 0.3, repeat: Infinity, ease: "easeInOut" }}
      >
        <ArrowRightOutlined className="hr-gate-conn-arrow" />
      </motion.span>
      <span className="hr-gate-conn-stem" />
    </motion.div>
  );
}
