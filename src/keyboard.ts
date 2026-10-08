import { useEffect } from "react";

export interface ShortcutHandlers {
  onSelectView?: (view: "board" | "list" | "mine" | "resources" | "analytics") => void;
  onNextCard?: () => void;
  onPrevCard?: () => void;
  onOpenFocused?: () => void;
  onQuickPeek?: () => void;
  onToggleElf?: () => void;
  onToggleMute?: () => void;
  onOpenHelp?: () => void;
  onSearch?: () => void;
  onToggleScheme?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when user is typing inside an input, textarea or select
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.classList.contains("ant-select-selection-search-input"))
      ) {
        return;
      }

      // Check Cmd/Ctrl + Shift + P for Scheme Switch (方案秒切)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        handlers.onToggleScheme?.();
        return;
      }

      // Check Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        handlers.onSearch?.();
        return;
      }

      // Number keys 1-5 for views
      if (e.key === "1") {
        e.preventDefault();
        handlers.onSelectView?.("board");
      } else if (e.key === "2") {
        e.preventDefault();
        handlers.onSelectView?.("list");
      } else if (e.key === "3") {
        e.preventDefault();
        handlers.onSelectView?.("mine");
      } else if (e.key === "4") {
        e.preventDefault();
        handlers.onSelectView?.("resources");
      } else if (e.key === "5") {
        e.preventDefault();
        handlers.onSelectView?.("analytics");
      }
      // Card navigation J / K / Up / Down
      else if (e.key === "j" || e.key === "J" || e.key === "ArrowDown") {
        e.preventDefault();
        handlers.onNextCard?.();
      } else if (e.key === "k" || e.key === "K" || e.key === "ArrowUp") {
        e.preventDefault();
        handlers.onPrevCard?.();
      }
      // Enter to open
      else if (e.key === "Enter") {
        e.preventDefault();
        handlers.onOpenFocused?.();
      }
      // Space for quick peek
      else if (e.key === " " && !e.repeat) {
        e.preventDefault();
        handlers.onQuickPeek?.();
      }
      // E for Elf Copilot
      else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        handlers.onToggleElf?.();
      }
      // M for Sound Mute
      else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        handlers.onToggleMute?.();
      }
      // ? for Help
      else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        handlers.onOpenHelp?.();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handlers]);
}
