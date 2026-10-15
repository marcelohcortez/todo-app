import NotesApp from "@/components/NotesApp";

// Not signed in? NotesApp gets a 401 from the API and sends the browser to /login.
export default function NotesPage() {
  return <NotesApp />;
}
