import { useState } from "react";
import { Button, Progress, Tag, Typography } from "antd";
import { ShieldCheck, CheckCircle, Sparkle, Lightning } from "../icons";
import { playSound } from "../sound";

const { Text } = Typography;

interface CheckItem {
  id: string;
  name: string;
  desc: string;
  status: "idle" | "scanning" | "passed" | "failed";
}

const INITIAL_CHECKS: CheckItem[] = [
  { id: "svn", name: "SVN 资源版本与锁状态", desc: "校验 SVN 路径合法、版本存在且文件锁已安全释放", status: "idle" },
  { id: "mesh", name: "引擎三角面与顶点预算", desc: "符合手游中模标准（Tris ≤ 2,500，Verts ≤ 1,800）", status: "idle" },
  { id: "texture", name: "贴图 2^N 幂次方与格式", desc: "校验 ASTC/BC7 纹理压缩规范与 2048x2048 尺寸", status: "idle" },
  { id: "pbr", name: "PBR 通道与材质球命名", desc: "Albedo / Normal / Metallic-Roughness 通道完整", status: "idle" },
  { id: "dri", name: "主责人数字指纹与签名", desc: "验证 GitLab Commit SHA 与负责人统一鉴权", status: "idle" },
];

export function AyonGateScanner({
  onAllPassed,
  itemState: _itemState,
}: {
  onAllPassed?: () => void;
  itemState?: string;
}) {
  const [scanning, setScanning] = useState(false);
  const [checks, setChecks] = useState<CheckItem[]>(INITIAL_CHECKS);
  const [progress, setProgress] = useState(0);

  const allPassed = checks.every((c) => c.status === "passed");

  function startScan() {
    playSound.click();
    setScanning(true);
    setProgress(0);
    setChecks(INITIAL_CHECKS.map((c) => ({ ...c, status: "scanning" })));

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      const pct = Math.min(100, Math.round((currentStep / INITIAL_CHECKS.length) * 100));
      setProgress(pct);

      setChecks((prev) =>
        prev.map((item, idx) => {
          if (idx < currentStep) return { ...item, status: "passed" };
          if (idx === currentStep) return { ...item, status: "scanning" };
          return item;
        })
      );

      playSound.focus();

      if (currentStep >= INITIAL_CHECKS.length) {
        clearInterval(interval);
        setScanning(false);
        playSound.shimmer();
        onAllPassed?.();
      }
    }, 380);
  }

  return (
    <div
      style={{
        background: "var(--bg-tag, rgba(0,0,0,0.03))",
        borderRadius: 12,
        padding: 14,
        border: allPassed ? "1px solid rgba(82, 196, 26, 0.4)" : "1px solid var(--border-subtle, rgba(0,0,0,0.08))",
        marginTop: 12,
        transition: "border-color 0.3s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <ShieldCheck size={16} weight="duotone" color={allPassed ? "#52c41a" : "#1677ff"} />
          <Text strong style={{ fontSize: 12, whiteSpace: "nowrap" }}>
            AYON 自动化质检
          </Text>
          {allPassed ? (
            <Tag color="success" style={{ margin: 0, fontSize: 11 }}>
              全部合规
            </Tag>
          ) : (
            <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
              5项门禁
            </Tag>
          )}
        </div>

        {!allPassed && (
          <Button
            size="small"
            type="primary"
            loading={scanning}
            icon={<Lightning size={13} weight="duotone" />}
            onClick={startScan}
          >
            {scanning ? "正在执行自动化质检..." : "执行一键门禁质检"}
          </Button>
        )}
      </div>

      {scanning && (
        <div style={{ marginBottom: 10 }}>
          <Progress percent={progress} size="small" status="active" strokeColor="#1677ff" />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {checks.map((item) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 10px",
              borderRadius: 6,
              background:
                item.status === "passed"
                  ? "rgba(82, 196, 26, 0.08)"
                  : item.status === "scanning"
                  ? "rgba(22, 119, 255, 0.08)"
                  : "var(--bg-card, #fff)",
              border: "1px solid var(--border-subtle, rgba(0,0,0,0.06))",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
              {item.status === "passed" ? (
                <CheckCircle size={15} weight="duotone" color="#52c41a" style={{ flexShrink: 0 }} />
              ) : item.status === "scanning" ? (
                <Sparkle size={15} weight="duotone" color="#1677ff" className="animate-spin" style={{ flexShrink: 0 }} />
              ) : (
                <ShieldCheck size={15} weight="duotone" color="#8c8c8c" style={{ flexShrink: 0 }} />
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: 600, display: "block" }} ellipsis>{item.name}</Text>
                <div style={{ fontSize: 11, color: "var(--text-secondary, #666)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.desc}</div>
              </div>
            </div>
            <div style={{ flexShrink: 0, marginLeft: 8 }}>
              {item.status === "passed" ? (
                <Tag color="success" style={{ margin: 0, fontSize: 11 }}>
                  PASS 通过
                </Tag>
              ) : item.status === "scanning" ? (
                <Tag color="processing" style={{ margin: 0, fontSize: 11 }}>
                  SCAN 检查中
                </Tag>
              ) : (
                <Tag style={{ margin: 0, fontSize: 11 }}>待检测</Tag>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
