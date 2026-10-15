import NoteDetail from "@/components/NoteDetail";

export default function NotePage({ params }: { params: { id: string } }) {
  return <NoteDetail id={params.id} />;
}
