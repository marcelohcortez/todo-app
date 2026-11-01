import dynamic from "next/dynamic";
import { requireSignedIn } from "@/lib/session";

const TaskApp = dynamic(
  () => import("@/components/TaskApp"),
  { ssr: false },
);

export default async function Page() {
  await requireSignedIn();
  return <TaskApp view="active" />;
}
