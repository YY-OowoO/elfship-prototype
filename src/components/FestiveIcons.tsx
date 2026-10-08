import type { CSSProperties } from "react";
import { X } from "@phosphor-icons/react";

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

// 1. 七夕良辰 (Qixi Constellation / Celestial Stars)
export function QixiIcon({ size = 16, color = "#7c3aed", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ verticalAlign: "-0.15em", display: "inline-block", flexShrink: 0, ...style }}
    >
      <circle cx="12" cy="12" r="9" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1.5" />
      <path
        d="M12 3C12 3 13.5 8.5 19 9C13.5 9.5 12 15 12 15C12 15 10.5 9.5 5 9C10.5 8.5 12 3 12 3Z"
        fill={color}
      />
      <circle cx="17.5" cy="16.5" r="1.8" fill={color} />
      <circle cx="6.5" cy="16.5" r="1.4" fill={color} fillOpacity="0.7" />
      <path d="M7 16.5L17 16.5" stroke={color} strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.6" />
    </svg>
  );
}

// 2. 中秋团圆 (Mid-Autumn Moon & Laurel)
export function MidAutumnIcon({ size = 16, color = "#d97706", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ verticalAlign: "-0.15em", display: "inline-block", flexShrink: 0, ...style }}
    >
      <circle cx="12" cy="12" r="9" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
      <circle cx="10" cy="10" r="1.5" fill={color} fillOpacity="0.4" />
      <circle cx="14.5" cy="13.5" r="2" fill={color} fillOpacity="0.3" />
      <circle cx="9" cy="15" r="1" fill={color} fillOpacity="0.35" />
      <path
        d="M15 6C15 6 18 8 18 12C18 16 15 18 15 18"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// 3. 除夕与春节 (Spring Festival Auspicious Lantern)
export function SpringFestivalIcon({ size = 16, color = "#dc2626", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ verticalAlign: "-0.15em", display: "inline-block", flexShrink: 0, ...style }}
    >
      <path d="M12 2V5M12 19V22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="7" y="5" width="10" height="14" rx="5" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
      <path d="M10 5C10 5 9 10 9 12C9 14 10 19 10 19M14 5C14 5 15 10 15 12C15 14 14 19 14 19" stroke={color} strokeWidth="1" strokeOpacity="0.6" />
      <line x1="6" y1="5" x2="18" y2="5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="19" x2="18" y2="19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// 4. 元宵闹春 (Lantern Festival)
export function LanternIcon({ size = 16, color = "#ea580c", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ verticalAlign: "-0.15em", display: "inline-block", flexShrink: 0, ...style }}
    >
      <circle cx="12" cy="11" r="7" fill={color} fillOpacity="0.15" stroke={color} strokeWidth="1.5" />
      <path d="M12 4V2M12 18V22M9 22L15 22" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="11" r="2.5" fill={color} />
    </svg>
  );
}

// 5. 端午安康 (Dragon Boat Bamboo Leaf)
export function DragonBoatIcon({ size = 16, color = "#0d9488", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ verticalAlign: "-0.15em", display: "inline-block", flexShrink: 0, ...style }}
    >
      <path
        d="M3 14C8 14 10 17 21 13C18 18 6 19 3 14Z"
        fill={color}
        fillOpacity="0.2"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 8L12 14M12 6L15 14M16 8L18 14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 19C5 18 9 20 13 19C17 18 20 20 22 19" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.6" />
    </svg>
  );
}

// 6. 清明时节 (Tomb Sweeping Spring Leaf)
export function TombSweepingIcon({ size = 16, color = "#16a34a", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ verticalAlign: "-0.15em", display: "inline-block", flexShrink: 0, ...style }}
    >
      <path
        d="M12 21C12 21 5 18 5 11C5 6 9 3 12 3C15 3 19 6 19 11C19 18 12 21 12 21Z"
        fill={color}
        fillOpacity="0.15"
        stroke={color}
        strokeWidth="1.5"
      />
      <path d="M12 6V18M12 11C14 10 16 11 16 11M12 14C10 13 8 14 8 14" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// 7. 五一劳动节 (Labor Day Gear & Tool)
export function LaborDayIcon({ size = 16, color = "#f97316", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ verticalAlign: "-0.15em", display: "inline-block", flexShrink: 0, ...style }}
    >
      <circle cx="12" cy="12" r="8" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1.5" />
      <path d="M12 8V12L15 15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 3L10 5M15 3L14 5M21 9L19 10M21 15L19 14M9 21L10 19M15 21L14 19M3 9L5 10M3 15L5 14" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// 8. 国庆黄金周 (National Day Golden Star & Crest)
export function NationalDayIcon({ size = 16, color = "#e11d48", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ verticalAlign: "-0.15em", display: "inline-block", flexShrink: 0, ...style }}
    >
      <polygon
        points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
        fill={color}
        fillOpacity="0.2"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill={color} />
    </svg>
  );
}

// 9. 1024 程序员节 (1024 Quantum Terminal / Code Chip)
export function Programmer1024Icon({ size = 16, color = "#0284c7", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ verticalAlign: "-0.15em", display: "inline-block", flexShrink: 0, ...style }}
    >
      <rect x="3" y="4" width="18" height="16" rx="4" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1.5" />
      <path d="M7 9L10 12L7 15M12 15H17" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 10. 元旦新春 (New Year Fireworks Burst)
export function NewYearIcon({ size = 16, color = "#f43f5e", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ verticalAlign: "-0.15em", display: "inline-block", flexShrink: 0, ...style }}
    >
      <circle cx="12" cy="12" r="3" fill={color} />
      <path d="M12 3V6M12 18V21M3 12H6M18 12H21M5.64 5.64L7.76 7.76M16.24 16.24L18.36 18.36M5.64 18.36L7.76 16.24M16.24 7.76L18.36 5.64" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// 11. 小周排期推进日 (Small Week Sprint Clock & Briefcase)
export function SmallWeekIcon({ size = 16, color = "#16a34a", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ verticalAlign: "-0.15em", display: "inline-block", flexShrink: 0, ...style }}
    >
      <rect x="3" y="6" width="18" height="15" rx="3" fill={color} fillOpacity="0.12" stroke={color} strokeWidth="1.5" />
      <path d="M8 3V7M16 3V7M3 11H21" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 14L14 16L17 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// 12. 大周双休 (Big Week Coffee & Rest)
export function BigWeekIcon({ size = 16, color = "#64748b", style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ verticalAlign: "-0.15em", display: "inline-block", flexShrink: 0, ...style }}
    >
      <path
        d="M4 8H17C17 8 17 17 10.5 17C4 17 4 8 4 8Z"
        fill={color}
        fillOpacity="0.12"
        stroke={color}
        strokeWidth="1.5"
      />
      <path d="M17 10H19C20.1 10 21 10.9 21 12C21 13.1 20.1 14 19 14H16.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 20H19" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 3C8 4.5 9 5 9 6M13 3C13 4.5 14 5 14 6" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
    </svg>
  );
}

/**
 * 通用节日图标调度器（根据节日 key 或类型渲染精美矢量图形）
 */
export function HolidayIconRenderer({ holidayKey, size = 15, style }: { holidayKey: string; size?: number; style?: React.CSSProperties }) {
  switch (holidayKey) {
    case "2026-08-19":
    case "qixi":
      return <QixiIcon size={size} color="#7c3aed" style={style} />;
    case "2026-09-25":
    case "mid_autumn":
      return <MidAutumnIcon size={size} color="#d97706" style={style} />;
    case "2026-02-16":
    case "2026-02-17":
    case "spring_festival":
      return <SpringFestivalIcon size={size} color="#dc2626" style={style} />;
    case "2026-03-03":
    case "lantern":
      return <LanternIcon size={size} color="#ea580c" style={style} />;
    case "2026-04-05":
    case "tomb_sweeping":
      return <TombSweepingIcon size={size} color="#16a34a" style={style} />;
    case "2026-05-01":
    case "labor":
      return <LaborDayIcon size={size} color="#f97316" style={style} />;
    case "2026-06-19":
    case "dragon_boat":
      return <DragonBoatIcon size={size} color="#0d9488" style={style} />;
    case "2026-10-01":
    case "national_day":
      return <NationalDayIcon size={size} color="#e11d48" style={style} />;
    case "2026-10-24":
    case "1024":
      return <Programmer1024Icon size={size} color="#0284c7" style={style} />;
    case "2026-01-01":
    case "new_year":
      return <NewYearIcon size={size} color="#f43f5e" style={style} />;
    case "small_week":
      return <SmallWeekIcon size={size} color="#16a34a" style={style} />;
    case "big_week":
      return <BigWeekIcon size={size} color="#64748b" style={style} />;
    default:
      return <QixiIcon size={size} color="#7c3aed" style={style} />;
  }
}

/**
 * 节日专属高清矢量插画横幅 (Studio Festive Illustration Banner)
 */
export function FestiveIllustrationBanner({
  holidayKey,
  title,
  subtitle,
  onClose,
}: {
  holidayKey: string;
  title: string;
  subtitle: string;
  onClose?: () => void;
}) {
  const isQixi = holidayKey === "2026-08-19" || holidayKey === "qixi";
  const isMidAutumn = holidayKey === "2026-09-25" || holidayKey === "mid_autumn";
  const isSpring = holidayKey.includes("2026-02") || holidayKey === "spring_festival";
  const is1024 = holidayKey.includes("10-24") || holidayKey === "1024";

  const theme = isQixi
    ? { primary: "#7c3aed", bg: "linear-gradient(135deg, #2e1065 0%, #4c1d95 60%, #5b21b6 100%)", glow: "rgba(167, 139, 250, 0.3)" }
    : isMidAutumn
    ? { primary: "#d97706", bg: "linear-gradient(135deg, #451a03 0%, #78350f 60%, #92400e 100%)", glow: "rgba(251, 191, 36, 0.3)" }
    : isSpring
    ? { primary: "#dc2626", bg: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 60%, #991b1b 100%)", glow: "rgba(248, 113, 113, 0.3)" }
    : is1024
    ? { primary: "#0284c7", bg: "linear-gradient(135deg, #082f49 0%, #0c4a6e 60%, #075985 100%)", glow: "rgba(56, 189, 248, 0.3)" }
    : { primary: "#7c3aed", bg: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #3730a3 100%)", glow: "rgba(129, 140, 248, 0.3)" };

  return (
    <div
      style={{
        background: theme.bg,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        padding: "16px 18px",
        position: "relative",
        overflow: "hidden",
        color: "#ffffff",
        boxShadow: `0 4px 20px ${theme.glow}`,
        borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
        marginBottom: 16,
      }}
    >
      {/* Custom Close Button — absolutely positioned, isolated from all content */}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="关闭"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 30,
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "1.5px solid rgba(255, 255, 255, 0.35)",
            background: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            color: "#ffffff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            lineHeight: 1,
            fontSize: 14,
            fontWeight: 300,
            transition: "all 0.18s ease",
            outline: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.35)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.55)";
            e.currentTarget.style.transform = "scale(1.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.2)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <X size={13} weight="bold" color="#ffffff" />
        </button>
      )}

      {/* Background Decorative SVG Grid & Geometry — shifted left to avoid close button zone */}
      <svg
        style={{ position: "absolute", right: 50, top: -10, width: 120, height: 90, opacity: 0.18, pointerEvents: "none" }}
        viewBox="0 0 140 100"
        fill="none"
      >
        <circle cx="90" cy="40" r="50" stroke="#ffffff" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx="90" cy="40" r="30" stroke="#ffffff" strokeWidth="1" />
        <path d="M40 90L130 0" stroke="#ffffff" strokeWidth="0.75" />
        <polygon points="110,20 115,35 130,40 115,45 110,60 105,45 90,40 105,35" fill="#ffffff" />
      </svg>

      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", gap: 12, paddingRight: 36 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <HolidayIconRenderer holidayKey={holidayKey} size={24} style={{ color: "#ffffff" }} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, textShadow: "0 1px 2px rgba(0,0,0,0.2)" }}>
            {title}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.85)", marginTop: 2, lineHeight: 1.4 }}>
            {subtitle}
          </div>
        </div>
      </div>
    </div>
  );
}
