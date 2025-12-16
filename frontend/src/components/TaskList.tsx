import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  GET_TASKS,
  CREATE_TASK,
  UPDATE_TASK,
  GET_TASK_COMMENTS,
  CREATE_TASK_COMMENT,
} from "../queries";

interface TaskListProps {
  organizationSlug: string;
  projectId: string;
}

type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  assigneeEmail?: string | null;
  dueDate?: string | null;
};

type Comment = {
  id: string;
  content: string;
  authorEmail: string;
  createdAt: string;
};

type StatusFilter = "ALL" | TaskStatus;
type SortKey = "NEWEST" | "DUE_ASC" | "DUE_DESC" | "TITLE_ASC";

export default function TaskList({ organizationSlug, projectId }: TaskListProps) {
  const { loading, error, data } = useQuery(GET_TASKS, {
    variables: { organizationSlug, projectId },
    fetchPolicy: "cache-and-network",
    skip: !organizationSlug || !projectId,
  });

  const tasks: Task[] = data?.tasks ?? [];

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("NEWEST");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    status: "TODO" as TaskStatus,
    assigneeEmail: "",
    dueDate: "", // datetime-local
  });

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    status: "TODO" as TaskStatus,
    assigneeEmail: "",
    dueDate: "", // datetime-local
  });

  const [commentForm, setCommentForm] = useState({ authorEmail: "", content: "" });

  const [createTask, { loading: creating, error: createErr }] = useMutation(CREATE_TASK, {
    refetchQueries: [{ query: GET_TASKS, variables: { organizationSlug, projectId } }],
    onCompleted: () => {
      setCreateOpen(false);
      setCreateForm({ title: "", description: "", status: "TODO", assigneeEmail: "", dueDate: "" });
    },
  });

  const [updateTask, { loading: updating, error: updateErr }] = useMutation(UPDATE_TASK, {
    refetchQueries: [{ query: GET_TASKS, variables: { organizationSlug, projectId } }],
    onCompleted: () => {
      setEditOpen(false);
      setSelectedTask(null);
    },
  });

  const [createComment, { loading: commenting, error: commentErr }] = useMutation(
    CREATE_TASK_COMMENT,
    {
      refetchQueries: selectedTask?.id
        ? [{ query: GET_TASK_COMMENTS, variables: { taskId: selectedTask.id, organizationSlug } }]
        : [],
    }
  );

  const { data: commentsData, loading: commentsLoading } = useQuery(GET_TASK_COMMENTS, {
    variables: { taskId: selectedTask?.id, organizationSlug },
    skip: !commentsOpen || !selectedTask?.id,
    fetchPolicy: "cache-and-network",
  });

  const comments: Comment[] = commentsData?.taskComments ?? [];

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = tasks.slice();

    if (statusFilter !== "ALL") list = list.filter((t) => t.status === statusFilter);

    if (query) {
      list = list.filter((t) => {
        const title = (t.title ?? "").toLowerCase();
        const desc = (t.description ?? "").toLowerCase();
        const email = (t.assigneeEmail ?? "").toLowerCase();
        return title.includes(query) || desc.includes(query) || email.includes(query);
      });
    }

    const dueMs = (d?: string | null) => {
      if (!d) return Number.POSITIVE_INFINITY;
      const dt = new Date(d);
      const t = dt.getTime();
      return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
    };

    list.sort((a, b) => {
      if (sortKey === "TITLE_ASC") return a.title.localeCompare(b.title);
      if (sortKey === "DUE_ASC") return dueMs(a.dueDate) - dueMs(b.dueDate);
      if (sortKey === "DUE_DESC") return dueMs(b.dueDate) - dueMs(a.dueDate);
      return b.id.localeCompare(a.id); // NEWEST fallback
    });

    return list;
  }, [tasks, q, statusFilter, sortKey]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter((t) => t.status === "TODO").length;
    const prog = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const done = tasks.filter((t) => t.status === "DONE").length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const overdue = tasks.filter((t) => isOverdue(t)).length;
    return { total, todo, prog, done, completionRate, overdue };
  }, [tasks]);

  function openEdit(t: Task) {
    setSelectedTask(t);
    setEditForm({
      title: t.title ?? "",
      description: t.description ?? "",
      status: t.status ?? "TODO",
      assigneeEmail: t.assigneeEmail ?? "",
      dueDate: t.dueDate ? toDatetimeLocal(t.dueDate) : "",
    });
    setEditOpen(true);
  }

  function openComments(t: Task) {
    setSelectedTask(t);
    setCommentsOpen(true);
    setCommentForm({ authorEmail: "", content: "" });
  }

  function submitCreate(e: FormEvent) {
    e.preventDefault();
    if (!createForm.title.trim()) return;

    createTask({
      variables: {
        projectId,
        organizationSlug,
        title: createForm.title.trim(),
        description: createForm.description.trim() || "",
        status: createForm.status,
        assigneeEmail: createForm.assigneeEmail.trim() || "",
        dueDate: createForm.dueDate ? new Date(createForm.dueDate).toISOString() : null,
      },
    });
  }

  function submitUpdate(e: FormEvent) {
    e.preventDefault();
    if (!selectedTask) return;
    if (!editForm.title.trim()) return;

    updateTask({
      variables: {
        id: selectedTask.id,
        organizationSlug,
        title: editForm.title.trim(),
        description: editForm.description.trim() || "",
        status: editForm.status,
        assigneeEmail: editForm.assigneeEmail.trim() || "",
        dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : null,
      },
    });
  }

  function submitComment(e: FormEvent) {
    e.preventDefault();
    if (!selectedTask) return;
    if (!commentForm.authorEmail.trim() || !commentForm.content.trim()) return;

    createComment({
      variables: {
        taskId: selectedTask.id,
        organizationSlug,
        authorEmail: commentForm.authorEmail.trim(),
        content: commentForm.content.trim(),
      },
      onCompleted: () => setCommentForm((s) => ({ ...s, content: "" })),
    });
  }

  if (loading && tasks.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="h-5 w-36 animate-pulse rounded bg-gray-100" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-50 ring-1 ring-black/5" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
        Error loading tasks: {error.message}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-lg font-semibold text-gray-900">Tasks</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
              <Chip>All: {stats.total}</Chip>
              <Chip>To do: {stats.todo}</Chip>
              <Chip>In progress: {stats.prog}</Chip>
              <Chip>Done: {stats.done}</Chip>
              <Chip>Completion: {stats.completionRate}%</Chip>
              {stats.overdue > 0 ? <DangerChip>{stats.overdue} overdue</DangerChip> : null}
            </div>
          </div>

          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          >
            <span className="text-base leading-none">+</span>
            New Task
          </button>
        </div>

        {/* Controls */}
        <div className="mt-5 flex flex-col gap-2 rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, description, assignee…"
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black sm:max-w-md"
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
            >
              <option value="ALL">All statuses</option>
              <option value="TODO">To do</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="DONE">Done</option>
            </select>

            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
            >
              <option value="NEWEST">Sort: Newest</option>
              <option value="TITLE_ASC">Sort: Title (A-Z)</option>
              <option value="DUE_ASC">Sort: Due (soonest)</option>
              <option value="DUE_DESC">Sort: Due (latest)</option>
            </select>

            {(q || statusFilter !== "ALL") && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setStatusFilter("ALL");
                }}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="mt-5 space-y-3">
          {tasks.length === 0 ? (
            <Empty
              title="No tasks"
              desc="Create your first task to start tracking work."
              actionLabel="Create Task"
              onAction={() => setCreateOpen(true)}
            />
          ) : filtered.length === 0 ? (
            <Empty
              title="No matches"
              desc="Try another search or clear filters."
              actionLabel="Clear filters"
              onAction={() => {
                setQ("");
                setStatusFilter("ALL");
              }}
            />
          ) : (
            filtered.map((t) => {
              const overdue = isOverdue(t);
              return (
                <div
                  key={t.id}
                  className="group rounded-2xl bg-white p-5 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-gray-900">{t.title}</h3>
                        <TaskStatusBadge status={t.status} />
                        {overdue ? <DangerChip>Overdue</DangerChip> : null}
                      </div>

                      {t.description ? (
                        <p className="mt-1 line-clamp-2 text-sm text-gray-600">{t.description}</p>
                      ) : (
                        <p className="mt-1 text-sm text-gray-400">No description</p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        {t.assigneeEmail ? <Chip>👤 {t.assigneeEmail}</Chip> : <Chip>👤 Unassigned</Chip>}
                        <Chip>📅 Due: {t.dueDate ? formatDateTime(t.dueDate) : "—"}</Chip>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openComments(t)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 transition hover:bg-gray-50"
                      >
                        Comments →
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(t)}
                        className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 transition hover:bg-gray-50"
                      >
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Pipeline hint bar */}
                  <div className="mt-4">
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-black transition-all"
                        style={{ width: `${statusToPct(t.status)}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                      <span>Pipeline: To do → In progress → Done</span>
                      <span>{statusToPct(t.status)}%</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Task">
        {createErr ? <ErrorBanner message={createErr.message} /> : null}

        <form onSubmit={submitCreate} className="mt-4 space-y-4">
          <Field label="Title *">
            <input
              value={createForm.title}
              onChange={(e) => setCreateForm((s) => ({ ...s, title: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
              placeholder="e.g., Add GraphQL org isolation"
              autoFocus
              required
            />
          </Field>

          <Field label="Description">
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm((s) => ({ ...s, description: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
              rows={3}
              placeholder="Optional details…"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Status">
              <select
                value={createForm.status}
                onChange={(e) => setCreateForm((s) => ({ ...s, status: e.target.value as TaskStatus }))}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
              >
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </Field>

            <Field label="Due date">
              <input
                type="datetime-local"
                value={createForm.dueDate}
                onChange={(e) => setCreateForm((s) => ({ ...s, dueDate: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
              />
            </Field>
          </div>

          <Field label="Assignee email">
            <input
              type="email"
              value={createForm.assigneeEmail}
              onChange={(e) => setCreateForm((s) => ({ ...s, assigneeEmail: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
              placeholder="name@company.com"
            />
          </Field>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !createForm.title.trim()}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create Task"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Task Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Task">
        {updateErr ? <ErrorBanner message={updateErr.message} /> : null}

        <form onSubmit={submitUpdate} className="mt-4 space-y-4">
          <Field label="Title *">
            <input
              value={editForm.title}
              onChange={(e) => setEditForm((s) => ({ ...s, title: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
              autoFocus
              required
            />
          </Field>

          <Field label="Description">
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm((s) => ({ ...s, description: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
              rows={3}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Status">
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((s) => ({ ...s, status: e.target.value as TaskStatus }))}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
              >
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </Field>

            <Field label="Due date">
              <input
                type="datetime-local"
                value={editForm.dueDate}
                onChange={(e) => setEditForm((s) => ({ ...s, dueDate: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
              />
            </Field>
          </div>

          <Field label="Assignee email">
            <input
              type="email"
              value={editForm.assigneeEmail}
              onChange={(e) => setEditForm((s) => ({ ...s, assigneeEmail: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
            />
          </Field>

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating || !editForm.title.trim()}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {updating ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Comments Slide-over */}
      <SlideOver
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        title={selectedTask ? `Comments · ${selectedTask.title}` : "Comments"}
        subtitle={selectedTask?.assigneeEmail ? `Assignee: ${selectedTask.assigneeEmail}` : "Unassigned"}
      >
        {commentErr ? <ErrorBanner message={commentErr.message} /> : null}

        <div className="mt-4 space-y-3">
          {commentsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-50 ring-1 ring-black/5" />
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-600 ring-1 ring-black/5">
              No comments yet. Add the first update.
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-gray-900">{c.authorEmail}</div>
                  <div className="text-xs text-gray-500">{formatDateTime(c.createdAt)}</div>
                </div>
                <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{c.content}</div>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <div className="text-sm font-semibold text-gray-900">Add comment</div>
          <form onSubmit={submitComment} className="mt-3 space-y-3">
            <input
              type="email"
              value={commentForm.authorEmail}
              onChange={(e) => setCommentForm((s) => ({ ...s, authorEmail: e.target.value }))}
              placeholder="Your email"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
              required
            />
            <textarea
              value={commentForm.content}
              onChange={(e) => setCommentForm((s) => ({ ...s, content: e.target.value }))}
              placeholder="Write an update…"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
              rows={3}
              required
            />
            <button
              type="submit"
              disabled={commenting || !commentForm.authorEmail.trim() || !commentForm.content.trim()}
              className="w-full rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {commenting ? "Posting…" : "Post Comment"}
            </button>
          </form>
        </div>
      </SlideOver>
    </>
  );
}

/* ---------------- UI bits ---------------- */

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-gray-100 px-2 py-1">{children}</span>;
}

function DangerChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-red-50 px-2 py-1 font-medium text-red-700 ring-1 ring-red-200">
      {children}
    </span>
  );
}

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const cls =
    status === "TODO"
      ? "bg-gray-100 text-gray-800 ring-gray-200"
      : status === "IN_PROGRESS"
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : "bg-green-50 text-green-700 ring-green-200";

  const label = status === "TODO" ? "To do" : status === "IN_PROGRESS" ? "In progress" : "Done";

  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${cls}`}>{label}</span>;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
      {message}
    </div>
  );
}

function Empty({
  title,
  desc,
  actionLabel,
  onAction,
}: {
  title: string;
  desc: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-2xl bg-gray-50 p-10 text-center ring-1 ring-black/5">
      <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-white ring-1 ring-black/5" />
      <div className="text-base font-semibold text-gray-900">{title}</div>
      <div className="mt-2 text-sm text-gray-600">{desc}</div>
      {actionLabel && onAction ? (
        <button
          onClick={onAction}
          className="mt-5 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl ring-1 ring-black/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-gray-900">{title}</div>
            <div className="mt-1 text-xs text-gray-500">Project-scoped</div>
          </div>
          <button onClick={onClose} className="rounded-xl px-2 py-1 text-sm text-gray-600 hover:bg-gray-100">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl ring-1 ring-black/10">
        <div className="flex items-start justify-between gap-4 border-b border-black/5 p-6">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-gray-900">{title}</div>
            {subtitle ? <div className="mt-1 text-xs text-gray-500">{subtitle}</div> : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-xl px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="h-[calc(100%-80px)] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Utils ---------------- */

function statusToPct(s: TaskStatus) {
  if (s === "TODO") return 20;
  if (s === "IN_PROGRESS") return 60;
  return 100;
}

function isOverdue(task: Task) {
  if (task.status === "DONE") return false;
  if (!task.dueDate) return false;

  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime())) return false;

  const now = new Date();
  return due.getTime() < now.getTime();
}

function toDatetimeLocal(iso: string) {
  // convert ISO -> "YYYY-MM-DDTHH:mm" for datetime-local input
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
