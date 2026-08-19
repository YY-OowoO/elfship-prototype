import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import "antd/dist/reset.css";
import { App } from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#1f5f99",
          colorError: "#c0392b",
          colorWarning: "#c48a12",
          colorSuccess: "#2f6f4e",
          colorInfo: "#5b3fa0",
          colorText: "#1b1f24",
          colorTextSecondary: "#4a535e",
          colorBorder: "#d5dae1",
          colorBgLayout: "#e8ecf1",
          borderRadius: 6,
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
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
);
