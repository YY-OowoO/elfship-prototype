import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import "antd/dist/reset.css";
import { App } from "./App";
import { ios } from "./tokens";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: ios.blue,
          colorError: ios.red,
          colorWarning: ios.orange,
          colorSuccess: ios.green,
          colorInfo: ios.indigo,
          colorText: ios.label,
          colorTextSecondary: ios.secondaryLabel,
          colorBorder: ios.gray4,
          colorBgLayout: ios.grouped,
          colorBgContainer: ios.surface,
          borderRadius: 8,
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
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </StrictMode>,
);
