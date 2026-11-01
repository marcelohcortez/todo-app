import dynamic from "next/dynamic";
import { requireSignedIn } from "@/lib/session";

const NoteDetail = dynamic(() => import("@/components/NoteDetail"), { ssr: false });

export default async function NotePage({ params }: { params: { id: string } }) {
  await requireSignedIn();
  return <NoteDetail id={params.id} />;
}
