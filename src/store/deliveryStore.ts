import { useState, useEffect, useCallback } from "react";
import { TODAY } from "../mock";
import { dispatchElfEvent } from "../emotion-ball";

export interface TimeTravelPreset {
  key: string;
  label: string;
  date: string;
  desc: string;
}

export const TIME_TRAVEL_PRESETS: TimeTravelPreset[] = [
  {
    key: "baseline",
    label: "8月18日 · 正常推进",
    date: TODAY,
    desc: "基准模拟日：全流程正常流转，部分工序接近截稿",
  },
  {
    key: "tight",
    label: "8月24日 · 临期前夕",
    date: "2026-08-24",
    desc: "距8月26日仅剩2天：倒计时红线预警，门禁严格封板",
  },
  {
    key: "delayed",
    label: "8月27日 · 超期复盘",
    date: "2026-08-27",
    desc: "已超期1天：安灯故障全线熔断，进入应急战备",
  },
];

// Simple in-memory pub-sub event broadcaster for cross-component and cross-mode sync
type Listener<T> = (val: T) => void;

class DeliveryStore {
  private simulatedDate: string = TODAY;
  private dateListeners: Set<Listener<string>> = new Set();

  public getSimulatedDate(): string {
    return this.simulatedDate;
  }

  public setSimulatedDate(newDate: string) {
    if (this.simulatedDate !== newDate) {
      this.simulatedDate = newDate;
      this.dateListeners.forEach((l) => l(newDate));
      dispatchElfEvent("batch_date_shifted", {
        message: `基准模拟日已变更为 ${newDate}`,
      });
    }
  }

  public subscribeDate(listener: Listener<string>): () => void {
    this.dateListeners.add(listener);
    return () => {
      this.dateListeners.delete(listener);
    };
  }
}

export const deliveryStore = new DeliveryStore();

/**
 * React hook to bind to global simulated date
 */
export function useSimulatedDate(): [string, (d: string) => void] {
  const [date, setDate] = useState<string>(() => deliveryStore.getSimulatedDate());

  useEffect(() => {
    return deliveryStore.subscribeDate((d) => setDate(d));
  }, []);

  const changeDate = useCallback((newDate: string) => {
    deliveryStore.setSimulatedDate(newDate);
  }, []);

  return [date, changeDate];
}
