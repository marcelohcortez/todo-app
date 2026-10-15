import AddUserPage from "@/components/AddUserPage";

// Only the admin can use this page. The API refuses everyone else, and the page says so.
export default function UsersPage() {
  return <AddUserPage />;
}
