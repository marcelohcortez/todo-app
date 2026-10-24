import TaskApp from "@/components/TaskApp";
import { requireSignedIn } from "@/lib/session";

export default async function DonePage() {
  await requireSignedIn();
  return <TaskApp view="done" />;
}
