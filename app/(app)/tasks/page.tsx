import TaskBoard from "@/components/TaskBoard";

export const metadata = { title: "Task Bar — Compos" };

export default function TasksPage() {
  return (
    <div className="flex-1 px-4 md:px-8 py-8 max-w-6xl w-full mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Task Bar</h1>
        <p className="text-sm text-ink-soft mt-1">
          Everything on your plate, sorted by priority tier.
        </p>
      </header>
      <TaskBoard />
    </div>
  );
}
