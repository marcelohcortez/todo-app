import dynamic from "next/dynamic";
import { requireSignedIn } from "@/lib/session";

const NotesApp = dynamic(() => import("@/components/NotesApp"), { ssr: false });

export default async function NotesPage() {
  await requireSignedIn();
  return <NotesApp />;
}
