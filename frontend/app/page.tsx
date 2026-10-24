import TaskApp from "@/components/TaskApp";
import { requireSignedIn } from "@/lib/session";

// Checked on the server first, so a signed-out visitor is sent to /login without seeing the app.
export default async function Page() {
  await requireSignedIn();
  return <TaskApp view="active" />;
}
