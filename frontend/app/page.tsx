import TaskApp from "@/components/TaskApp";

// Not signed in? TaskApp gets a 401 from the API and sends the browser to /login.
export default function Page() {
  return <TaskApp view="active" />;
}
