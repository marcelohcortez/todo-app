import SharedPage from "@/components/SharedPage";
import { requireSignedIn } from "@/lib/session";

export default async function Shared() {
  await requireSignedIn();
  return <SharedPage />;
}
