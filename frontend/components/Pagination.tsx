import Button from "./ui/Button";
import { mutedText } from "./ui/styles";

interface Props {
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
}

// Previous and Next under a list. Nothing is shown when everything fits on one page.
export default function Pagination({ page, pageCount, onPage }: Props) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Pages" className="mt-5 flex items-center justify-between gap-3">
      <Button variant="soft" intent="gray" size="sm" type="button" onClick={() => onPage(page - 1)} disabled={page <= 1}>
        Previous
      </Button>
      <span className={mutedText} aria-live="polite">
        Page {page} of {pageCount}
      </span>
      <Button variant="soft" intent="gray" size="sm" type="button" onClick={() => onPage(page + 1)} disabled={page >= pageCount}>
        Next
      </Button>
    </nav>
  );
}
