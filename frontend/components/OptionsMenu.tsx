"use client";

import Link from "next/link";

interface Props {
  // "dropdown" hangs under the desktop Options button. "sheet" slides up from the bottom on phones.
  variant: "dropdown" | "sheet";
  isAdmin: boolean;
  onClose: () => void;
  onAddUser: () => void;
  onLogout: () => void;
}

// Settings, Add user (admin only) and Log out. Nav renders one variant per screen size;
// the CSS hides whichever one does not fit the screen.
export default function OptionsMenu({ variant, isAdmin, onClose, onAddUser, onLogout }: Props) {
  if (variant === "dropdown") {
    return (
      <>
        {/* Covers the page so a click anywhere outside the menu closes it. */}
        <div className="options-scrim" onClick={onClose} />
        <div className="options-dropdown" role="menu" aria-label="Options">
          <Link href="/settings" role="menuitem" onClick={onClose}>
            Settings
          </Link>
          {isAdmin && (
            <button type="button" role="menuitem" onClick={onAddUser}>
              Add user
            </button>
          )}
          <button type="button" role="menuitem" className="danger" onClick={onLogout}>
            Log out
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="sheet-backdrop options-sheet" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Options"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-head">
          <h2>Options</h2>
          <button className="ghost" type="button" onClick={onClose}>
            Cancel
          </button>
        </div>
        <div className="choose">
          <Link href="/settings" className="button-link" onClick={onClose}>
            Settings
          </Link>
          {isAdmin && (
            <button type="button" onClick={onAddUser}>
              Add user
            </button>
          )}
          <button type="button" className="ghost danger" onClick={onLogout}>
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
