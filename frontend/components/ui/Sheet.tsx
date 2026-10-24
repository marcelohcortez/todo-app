import type { ReactNode } from "react";
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

// A dialog that slides up on phones and is centred on wider screens. A click on the dimmed page closes it.
export default function Sheet({ label, title, onClose, backdropClassName, children }: Props) {
  return (
    <div className={cn(sheetBackdrop, backdropClassName)} onClick={onClose}>
      <div
        className={sheetPanel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
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
