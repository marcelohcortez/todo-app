"use client";

import Link from "next/link";
import Button from "./ui/Button";
import Sheet from "./ui/Sheet";
import { cn } from "./ui/cn";
import { buttonClass } from "./ui/styles";

interface Props {
  // "dropdown" hangs under the desktop Options button. "sheet" slides up from the bottom on phones.
  variant: "dropdown" | "sheet";
  isAdmin: boolean;
  onClose: () => void;
  onAddUser: () => void;
  onFriends: () => void;
  // Only used by the sheet variant: on desktop, Shared already has its own top-nav tab.
  onShared?: () => void;
  onLogout: () => void;
}

const menuItem =
  "block w-full rounded-lg px-3 py-2.5 text-left text-sm text-gray-200 transition hover:bg-primary-500/10 active:bg-primary-500/15";

// Settings, Friends, Add user (admin only) and Log out (plus Shared, on phones only). Nav renders one
// variant per screen size; the classes below hide whichever one does not fit the screen.
export default function OptionsMenu({ variant, isAdmin, onClose, onAddUser, onFriends, onShared, onLogout }: Props) {
  if (variant === "dropdown") {
    return (
      <>
        {/* Covers the page so a click anywhere outside the menu closes it. */}
        <div className="options-scrim fixed inset-0 z-[9]" onClick={onClose} />
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-10 flex min-w-52 flex-col gap-0.5 rounded-xl border border-gray-800 bg-gray-900 p-1.5 shadow-2xl shadow-black/40"
          role="menu"
          aria-label="Options"
        >
          <Link href="/settings" role="menuitem" onClick={onClose} className={menuItem}>
            Settings
          </Link>
          <button type="button" role="menuitem" onClick={onFriends} className={menuItem}>
            Friends
          </button>
          {isAdmin && (
            <button type="button" role="menuitem" onClick={onAddUser} className={menuItem}>
              Add user
            </button>
          )}
          <button type="button" role="menuitem" onClick={onLogout} className={cn(menuItem, "text-danger-300")}>
            Log out
          </button>
        </div>
      </>
    );
  }

  return (
    <Sheet label="Options" title="Options" onClose={onClose} backdropClassName="min-[721px]:hidden">
      <div className="grid gap-2">
        <Link href="/settings" onClick={onClose} className={buttonClass({ variant: "outlined", intent: "gray", size: "lg" })}>
          Settings
        </Link>
        <Button variant="outlined" intent="gray" size="lg" onClick={onFriends}>
          Friends
        </Button>
        {onShared && (
          <Button variant="outlined" intent="gray" size="lg" onClick={onShared}>
            Shared
          </Button>
        )}
        {isAdmin && (
          <Button variant="outlined" intent="gray" size="lg" onClick={onAddUser}>
            Add user
          </Button>
        )}
        <Button variant="ghost" intent="danger" size="lg" onClick={onLogout}>
          Log out
        </Button>
      </div>
    </Sheet>
  );
}
