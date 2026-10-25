import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { cn } from "./cn";
import Button from "./Button";
import { headingText, sheetBackdrop, sheetPanel } from "./styles";

interface Props {
  // The accessible name of the dialog.
  label: string;
  // The visible heading. Usually the same as the label.
  title: ReactNode;
  onClose: () => void;
  // Extra classes for the backdrop, for example to hide it on desktop.
  backdropClassName?: string;
  children: ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// A dialog that slides up on phones and is centred on wider screens. A click on the dimmed page closes it.
export default function Sheet({ label, title, onClose, backdropClassName, children }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Moves focus into the dialog on open, traps Tab/Shift+Tab inside it, and restores focus to
  // whatever was focused before (usually the button that opened it) on close.
  useEffect(() => {
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const edge = e.shiftKey ? items[0] : items[items.length - 1];
      if (document.activeElement !== edge) return;
      e.preventDefault();
      (e.shiftKey ? items[items.length - 1] : items[0]).focus();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    <div className={cn(sheetBackdrop, backdropClassName)} onClick={onClose}>
      <div
        ref={panelRef}
        className={sheetPanel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className={headingText}>{title}</h2>
          <Button variant="ghost" intent="gray" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
