/**
 * 全站统一标准字体：系统字体栈，不引入任何外部字体文件。
 * antd ConfigProvider 与 styles.css 的 --font 都从这里取值，禁止两处各写一套。
 */
export const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif';

/** 数字/日期等对齐场景的标准等宽字体栈，对应 styles.css 的 --mono。 */
export const FONT_FAMILY_MONO =
  '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace';

/** 统一字号阶梯（px）。正文/标签只用这些档位，禁止 9.5px 之类的碎档。 */
export const TYPE_SCALE = {
  "2xs": 10,
  xs: 11,
  sm: 12,
  md: 13,
  lg: 14,
  xl: 16,
  "2xl": 20,
  "3xl": 24,
} as const;

/** 统一字重规范 */
export const FONT_WEIGHTS = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

/** 统一行高规范 */
export const LINE_HEIGHTS = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
} as const;

/** 统一圆角规范 */
export const RADIUS = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  "2xl": 16,
  full: 9999,
} as const;

/** Ant Design 6 default seed / preset colors. */
export const palette = {
  blue: "#1677ff",
  geekblue: "#2f54eb",
  purple: "#722ed1",
  cyan: "#13c2c2",
  green: "#52c41a",
  magenta: "#eb2f96",
  red: "#ff4d4f",
  volcano: "#fa541c",
  orange: "#fa8c16",
  gold: "#faad14",
  lime: "#a0d911",
  gray: "rgba(0, 0, 0, 0.45)",
  gray5: "#f0f0f0",
  gray6: "#f5f5f5",
  border: "#d9d9d9",
  split: "#f0f0f0",
  label: "rgba(0, 0, 0, 0.88)",
  secondaryLabel: "rgba(0, 0, 0, 0.65)",
  layout: "#f5f5f5",
  surface: "#ffffff",
} as const;

export const AVATAR_COLORS = [
  palette.blue,
  palette.geekblue,
  palette.purple,
  palette.magenta,
  palette.red,
  palette.orange,
  palette.green,
  palette.cyan,
  palette.gold,
  palette.volcano,
] as const;

export type ThemeKey = "light";

export interface ThemeConfig {
  key: ThemeKey;
  name: string;
  enName: string;
  desc: string;
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primaryLight: string;
  primaryBorder: string;
  primarySubtle: string;
  accent: string;
  accentHover: string;
  accentLight: string;
  gradient: string;
  gradientSoft: string;
  ringColor: string;
  ballColor: string;
  ballEyeColor: string;
  sketchInk: string;
  dotColor: string;
  tagColor: string;
}

export const THEMES: Record<ThemeKey, ThemeConfig> = {
  light: {
    key: "light",
    name: "极简纯白天幕",
    enName: "Editorial Light",
    desc: "现代极简白底 · 通透高雅",
    primary: "#0f172a",
    primaryHover: "#2563eb",
    primaryActive: "#1d4ed8",
    primaryLight: "#f8fafc",
    primaryBorder: "#e2e8f0",
    primarySubtle: "#f1f5f9",
    accent: "#2563eb",
    accentHover: "#1d4ed8",
    accentLight: "#eff6ff",
    gradient: "linear-gradient(135deg, #0f172a 0%, #2563eb 100%)",
    gradientSoft: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
    ringColor: "rgba(37, 99, 235, 0.2)",
    ballColor: "#2563eb",
    ballEyeColor: "#0f172a",
    sketchInk: "#0f172a",
    dotColor: "#2563eb",
    tagColor: "blue",
  },
};
