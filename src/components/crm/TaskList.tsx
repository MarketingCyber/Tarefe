import Link from "next/link";
import { CheckCircle, Circle } from "@phosphor-icons/react/dist/ssr";
import { toggleTaskStatus } from "@/lib/task-actions";
import { PRIORITY_FA } from "@/lib/status-labels";

export interface TaskEntry {
  id: string;
  title: string;
  dueAt: Date | null;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: "OPEN" | "DONE";
  assignee: { name: string } | null;
  /** The lead/contract/ticket/customer this task is about, when there is one — see /ops/tasks for how it's derived. */
  link?: { href: string; label: string } | null;
}

const PRIORITY_STYLE: Record<TaskEntry["priority"], string> = {
  LOW: "bg-tint text-secondary",
  NORMAL: "bg-tint text-purple-900",
  HIGH: "bg-warning-bg text-warning",
  URGENT: "bg-danger-bg text-danger",
};

function isOverdue(task: TaskEntry) {
  return task.status === "OPEN" && task.dueAt !== null && task.dueAt.getTime() < Date.now();
}

/**
 * One reusable list (Phase 8.4), same pattern as ActivityTimeline —
 * rendered on /ops/tasks, the lead detail page, and the ticket detail
 * page. `returnPath` tells the toggle action which page to revalidate
 * after a status flip, since the same component renders in three
 * different places.
 */
export function TaskList({ tasks, returnPath }: { tasks: TaskEntry[]; returnPath: string }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-secondary">هنوز تسکی ثبت نشده.</p>;
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li
          key={task.id}
          className={`flex items-start gap-3 rounded-xl border p-3 ${task.status === "DONE" ? "border-border bg-tint/50" : isOverdue(task) ? "border-danger/40 bg-danger-bg/40" : "border-border bg-white"}`}
        >
          <form action={toggleTaskStatus} className="mt-0.5 shrink-0">
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="nextStatus" value={task.status === "OPEN" ? "DONE" : "OPEN"} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <button type="submit" className="press text-purple-600 hover:text-purple-900" aria-label={task.status === "OPEN" ? "علامت‌گذاری به‌عنوان انجام‌شده" : "بازگشایی مجدد"}>
              {task.status === "DONE" ? <CheckCircle size={20} weight="fill" /> : <Circle size={20} />}
            </button>
          </form>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-medium ${task.status === "DONE" ? "text-secondary line-through" : "text-purple-900"}`}>
              {task.title}
              {task.link && (
                <>
                  {" "}
                  <Link href={task.link.href} className="font-normal text-secondary hover:text-purple-600 hover:underline">
                    — {task.link.label}
                  </Link>
                </>
              )}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-secondary">
              {task.assignee && <span>{task.assignee.name}</span>}
              {task.dueAt && (
                <span className={isOverdue(task) ? "font-semibold text-danger" : ""}>
                  {isOverdue(task) ? "عقب‌افتاده: " : "سررسید: "}
                  {task.dueAt.toLocaleDateString("fa-IR", { calendar: "gregory" })}
                </span>
              )}
              <span className={`rounded-full px-2 py-0.5 font-medium ${PRIORITY_STYLE[task.priority]}`}>{PRIORITY_FA[task.priority] ?? task.priority}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
