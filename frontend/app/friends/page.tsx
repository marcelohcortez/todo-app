import FriendsPage from "@/components/FriendsPage";
import { requireSignedIn } from "@/lib/session";

export default async function Friends() {
  await requireSignedIn();
  return <FriendsPage />;
}
