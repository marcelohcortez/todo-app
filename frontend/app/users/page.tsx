import AddUserPage from "@/components/AddUserPage";
import { requireSignedIn } from "@/lib/session";

// Only the admin can use this page. The API refuses everyone else, and the page says so.
export default async function UsersPage() {
  await requireSignedIn();
  return <AddUserPage />;
}
