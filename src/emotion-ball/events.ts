export type ElfEventType =
  | 'stage_advanced'
  | 'item_confirmed'
  | 'item_rejected'
  | 'item_started'
  | 'item_submitted'
  | 'gate_completed'
  | 'evidence_filled'
  | 'nudge_sent'
  | 'batch_date_shifted'
  | 'batch_selected'
  | 'role_switched'
  | 'scenario_switched'
  | 'drag_start'
  | 'drag_end'
  | 'filter_changed'
  | 'diagnosis_requested'
  | 'search_active'
  | 'milestone_cleared'
  | 'report_generated'
  | 'holiday_egg'
  | 'idle_relaxed';

export interface ElfEvent {
  type: ElfEventType;
  message?: string;
  emotionId?: string;
  action?: 'spin' | 'burst' | 'bounce';
  meta?: Record<string, any>;
  timestamp?: number;
}

type ElfEventListener = (event: ElfEvent) => void;

class ElfEventBus {
  private listeners: Set<ElfEventListener> = new Set();

  subscribe(listener: ElfEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: ElfEvent): void {
    const enriched: ElfEvent = {
      timestamp: performance.now(),
      ...event
    };
    this.listeners.forEach((listener) => {
      try {
        listener(enriched);
      } catch (err) {
        console.error('[ElfEventBus] Listener error:', err);
      }
    });
  }
}

export const elfBus = new ElfEventBus();

export function dispatchElfEvent(
  type: ElfEventType,
  options: Omit<ElfEvent, 'type'> = {}
): void {
  elfBus.emit({
    type,
    ...options
  });
}
