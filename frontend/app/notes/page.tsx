import NotesApp from "@/components/NotesApp";
import { requireSignedIn } from "@/lib/session";

export default async function NotesPage() {
  await requireSignedIn();
  return <NotesApp />;
}
