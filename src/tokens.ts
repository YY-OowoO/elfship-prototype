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
  xs: 10,
  sm: 11,
  md: 12,
  base: 13,
  lg: 14,
  xl: 16,
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
