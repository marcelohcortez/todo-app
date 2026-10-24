import SettingsPanel from "@/components/SettingsPanel";
import { requireSignedIn } from "@/lib/session";

export default async function SettingsPage() {
  await requireSignedIn();
  return <SettingsPanel />;
}
