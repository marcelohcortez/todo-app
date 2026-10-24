import { cn } from "./cn";

// Class recipes for the shared look. Based on the Tailus button, badge, card and form styles, dark only.
// Components import these instead of writing their own colours, sizes or radii.

export type ButtonVariant = "solid" | "soft" | "outlined" | "ghost";
export type ButtonIntent = "primary" | "danger" | "gray";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition duration-150 outline-2 outline-offset-2 outline-primary-500 focus-visible:outline disabled:pointer-events-none disabled:opacity-50";

const buttonSizes: Record<ButtonSize, string> = {
  xs: "h-7 px-3 text-sm",
  sm: "h-8 px-3.5 text-sm",
  md: "h-9 px-4 text-base",
  lg: "h-10 px-5 text-base",
};

const buttonVariants: Record<ButtonVariant, Record<ButtonIntent, string>> = {
  solid: {
    primary:
      "bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25)] hover:brightness-110 active:brightness-95",
    danger:
      "bg-gradient-to-b from-danger-500 to-danger-600 text-white shadow-[inset_0_1px_0_0_rgb(255_255_255/0.25)] hover:brightness-110 active:brightness-95",
    gray: "bg-gradient-to-b from-gray-600 to-gray-700 text-white shadow-[inset_0_1px_0_0_rgb(255_255_255/0.15)] hover:brightness-110 active:brightness-95",
  },
  soft: {
    primary: "bg-primary-500/15 text-primary-200 hover:bg-primary-500/25 active:bg-primary-500/15",
    danger: "bg-danger-500/15 text-danger-200 hover:bg-danger-500/25 active:bg-danger-500/15",
    gray: "bg-gray-500/15 text-gray-200 hover:bg-gray-500/25 active:bg-gray-500/15",
  },
  outlined: {
    primary: "border border-primary-500/40 text-primary-200 hover:bg-primary-500/10 active:bg-primary-500/5",
    danger: "border border-danger-500/40 text-danger-200 hover:bg-danger-500/10 active:bg-danger-500/5",
    gray: "border border-gray-600 text-gray-200 hover:bg-gray-800 active:bg-gray-700",
  },
  ghost: {
    primary: "text-primary-300 hover:bg-primary-500/10 active:bg-primary-500/15",
    danger: "text-danger-300 hover:bg-danger-500/10 active:bg-danger-500/15",
    gray: "text-gray-300 hover:bg-gray-800 hover:text-gray-100 active:bg-gray-700",
  },
};

export function buttonClass({
  variant = "solid",
  intent = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  intent?: ButtonIntent;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(buttonBase, buttonSizes[size], buttonVariants[variant][intent], className);
}

// Text fields, selects and textareas. The 16px font size is set globally in globals.css.
export const field = cn(
  "h-9 w-full min-w-0 rounded-lg border border-gray-700 bg-gray-900 px-3 text-base text-gray-100",
  "placeholder:text-gray-500 outline-2 -outline-offset-1 outline-primary-500 transition",
  "focus:outline hover:border-gray-600 disabled:opacity-50"
);

export const textareaField = cn(field, "h-auto min-h-28 resize-y py-2.5");

// A surface with the card radius, border and shadow.
export const card = "rounded-xl border border-gray-800 bg-gray-900 p-4 shadow-lg shadow-black/20";

// Small round or square buttons that only hold an icon.
export const iconButton = cn(
  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition",
  "hover:bg-gray-800 hover:text-gray-100 focus-visible:outline outline-2 outline-primary-500",
  "disabled:opacity-50"
);

export const iconButtonDanger = "hover:bg-danger-500/10 hover:text-danger-300";

// The page of the sign-in and consent screens: one card, centred.
export const authPage = "mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10";
export const authCard = "rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center shadow-2xl shadow-black/30";

// The main column of every page. Leaves room above the bottom bar on phones.
export const pageMain = "mx-auto w-full max-w-2xl px-4 pb-10 pt-6 max-[720px]:pb-28 min-[721px]:pt-8";

export const mutedText = "text-sm text-gray-400";
export const errorText = "text-sm text-danger-300";
export const headingText = "text-lg font-semibold text-gray-100";

export type Tone = "high" | "medium" | "normal" | "board";

const badgeTones: Record<Tone, string> = {
  high: "bg-danger-500/15 text-danger-200",
  medium: "bg-warning-500/15 text-warning-200",
  normal: "bg-gray-500/15 text-gray-300",
  board: "border border-primary-500/30 text-primary-200",
};

export function badgeClass(tone: Tone): string {
  return cn("block w-fit rounded-md px-2 py-0.5 text-xs font-medium", badgeTones[tone]);
}

// The dimmed page behind a dialog. On phones the dialog sits at the bottom; on wider screens it is centred.
export const sheetBackdrop =
  "fixed inset-0 z-50 flex items-end justify-center bg-gray-950/70 p-0 backdrop-blur-sm min-[721px]:items-center min-[721px]:p-4";

export const sheetPanel =
  "w-full max-w-md rounded-t-2xl border border-gray-800 bg-gray-900 p-5 shadow-2xl min-[721px]:rounded-2xl";
