import NoteDetail from "@/components/NoteDetail";
import { requireSignedIn } from "@/lib/session";

export default async function NotePage({ params }: { params: { id: string } }) {
  await requireSignedIn();
  return <NoteDetail id={params.id} />;
}
