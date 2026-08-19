import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import "antd/dist/reset.css";
import { App } from "./App";
import { palette } from "./tokens";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      button={{ autoInsertSpace: false }}
      theme={{
        token: {
          colorPrimary: palette.blue,
          colorError: palette.red,
          colorWarning: palette.gold,
          colorSuccess: palette.green,
          colorInfo: palette.blue,
          colorText: palette.label,
          colorTextSecondary: palette.secondaryLabel,
          colorBorder: palette.border,
          colorBgLayout: palette.layout,
          colorBgContainer: palette.surface,
          borderRadius: 8,
          controlHeight: 32,
          controlHeightSM: 28,
          controlHeightLG: 40,
          fontSize: 14,
          fontSizeSM: 12,
          fontSizeLG: 16,
          fontSizeHeading4: 18,
          fontSizeHeading5: 15,
          fontFamily:
            '"IBM Plex Sans SC", "IBM Plex Sans", "PingFang SC", "Microsoft YaHei", sans-serif',
          motionDurationMid: "0.22s",
          motionDurationSlow: "0.32s",
          motionEaseOut: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
        components: {
          Statistic: {
            titleFontSize: 12,
            contentFontSize: 20,
          },
          Card: {
            headerFontSize: 15,
          },
          Button: {
            autoInsertSpace: false,
            fontWeight: 500,
            paddingInline: 14,
            paddingInlineSM: 10,
          },
          Tag: {
            defaultBg: palette.gray6,
            defaultColor: palette.label,
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
);
