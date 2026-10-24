import { cn } from "./cn";

interface Props {
  // Read out by screen readers, for example "Searching".
  label: string;
  className?: string;
}

// A small spinning ring. Pass a label so screen readers say what is loading.
export default function Spinner({ label, className }: Props) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("block size-6 animate-spin rounded-full border-2 border-gray-600 border-t-primary-400", className)}
    />
  );
}
