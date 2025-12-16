import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import { GET_PROJECTS, CREATE_PROJECT, UPDATE_PROJECT } from "../queries";

interface ProjectListProps {
  organizationSlug: string;
  onSelectProject: (id: string) => void;
  selectedProjectId: string | null;
}

type ProjectStatus = "ACTIVE" | "COMPLETED" | "ON_HOLD";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  dueDate?: string | null; // could be ISO
  taskCount?: number | null;
  completedTasks?: number | null;
  completionRate?: number | null;
};

type SortKey = "NEWEST" | "NAME_ASC" | "DUE_ASC" | "DUE_DESC";
type StatusFilter = "ALL" | ProjectStatus;

export default function ProjectList({
  organizationSlug,
  onSelectProject,
  selectedProjectId,
}: ProjectListProps) {
  const { loading, error, data } = useQuery(GET_PROJECTS, {
    variables: { organizationSlug },
    fetchPolicy: "cache-and-network",
    skip: !organizationSlug,
  });

  const projects: Project[] = data?.projects ?? [];

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("NEWEST");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [editProject, setEditProject] = useState<Project | null>(null);

  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    status: "ACTIVE" as ProjectStatus,
    dueDate: "",
  });

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    status: "ACTIVE" as ProjectStatus,
    dueDate: "",
  });

  const [createProject, { loading: creating, error: createErr }] = useMutation(CREATE_PROJECT, {
    refetchQueries: [{ query: GET_PROJECTS, variables: { organizationSlug } }],
    onCompleted: () => {
      setCreateOpen(false);
      setCreateForm({ name: "", description: "", status: "ACTIVE", dueDate: "" });
    },
  });

  const [updateProject, { loading: updating, error: updateErr }] = useMutation(UPDATE_PROJECT, {
    refetchQueries: [{ query: GET_PROJECTS, variables: { organizationSlug } }],
    onCompleted: () => {
      setEditOpen(false);
      setEditProject(null);
    },
  });

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = projects.slice();

    if (statusFilter !== "ALL") list = list.filter((p) => p.status === statusFilter);

    if (query) {
      list = list.filter((p) => {
        const name = (p.name ?? "").toLowerCase();
        const desc = (p.description ?? "").toLowerCase();
        return name.includes(query) || desc.includes(query);
      });
    }

    const dueMs = (d?: string | null) => {
      if (!d) return Number.POSITIVE_INFINITY;
      const dt = new Date(d);
      const t = dt.getTime();
      return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
    };

    list.sort((a, b) => {
      if (sortKey === "NAME_ASC") return a.name.localeCompare(b.name);
      if (sortKey === "DUE_ASC") return dueMs(a.dueDate) - dueMs(b.dueDate);
      if (sortKey === "DUE_DESC") return dueMs(b.dueDate) - dueMs(a.dueDate);
      return b.id.localeCompare(a.id); // fallback "newest"
    });

    return list;
  }, [projects, q, statusFilter, sortKey]);

  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === "ACTIVE").length;
    const completed = projects.filter((p) => p.status === "COMPLETED").length;
    const onHold = projects.filter((p) => p.status === "ON_HOLD").length;

    const totalTasks = projects.reduce((s, p) => s + (p.taskCount ?? 0), 0);
    const doneTasks = projects.reduce((s, p) => s + (p.completedTasks ?? 0), 0);
    const rate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return { total, active, completed, onHold, totalTasks, doneTasks, rate };
  }, [projects]);

  function openEdit(p: Project) {
    setEditProject(p);
    setEditForm({
      name: p.name ?? "",
      description: p.description ?? "",
      status: p.status ?? "ACTIVE",
      dueDate: p.dueDate ? normalizeDateInput(p.dueDate) : "",
    });
    setEditOpen(true);
  }

  function submitCreate(e: FormEvent) {
    e.preventDefault();
    if (!createForm.name.trim()) return;

    createProject({
      variables: {
        organizationSlug,
        name: createForm.name.trim(),
        description: createForm.description.trim() || "",
        status: createForm.status,
        dueDate: createForm.dueDate || null,
      },
    });
  }

  function submitUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editProject) return;
    if (!editForm.name.trim()) return;

    updateProject({
      variables: {
        id: editProject.id,
        organizationSlug,
        name: editForm.name.trim(),
        description: editForm.description.trim() || "",
        status: editForm.status,
        dueDate: editForm.dueDate || null,
      },
    });
  }

  if (loading && projects.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-50 ring-1 ring-black/5" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
        Error loading projects: {error.message}
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-lg font-semibold text-gray-900">Projects</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <Chip>All: {stats.total}</Chip>
            <Chip>Active: {stats.active}</Chip>
            <Chip>Completed: {stats.completed}</Chip>
            <Chip>
              Tasks: {stats.doneTasks}/{stats.totalTasks} ({stats.rate}%)
            </Chip>
          </div>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
        >
          <span className="text-base leading-none">+</span>
          New Project
        </button>
      </div>

      {/* Controls */}
      <div className="mt-5 flex flex-col gap-2 rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search projects…"
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black sm:max-w-md"
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On hold</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
          >
            <option value="NEWEST">Sort: Newest</option>
            <option value="NAME_ASC">Sort: Name (A-Z)</option>
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
        {projects.length === 0 ? (
          <Empty
            title="No projects"
            desc="Create your first project to start tracking tasks."
            actionLabel="Create Project"
            onAction={() => setCreateOpen(true)}
          />
        ) : filtered.length === 0 ? (
          <Empty
            title="No matches"
            desc="Try a different search or clear filters."
            actionLabel="Clear filters"
            onAction={() => {
              setQ("");
              setStatusFilter("ALL");
            }}
          />
        ) : (
          filtered.map((p) => {
            const isSelected = selectedProjectId === p.id;
            const total = p.taskCount ?? 0;
            const done = p.completedTasks ?? 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;

            return (
              <div
                key={p.id}
                onClick={() => onSelectProject(p.id)}
                className={`group cursor-pointer rounded-2xl p-5 ring-1 transition hover:-translate-y-0.5 hover:shadow-md ${
                  isSelected
                    ? "bg-gray-50 ring-black/10"
                    : "bg-white ring-black/5 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-semibold text-gray-900">{p.name}</h3>
                      <StatusBadge status={p.status} />
                    </div>

                    {p.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-600">{p.description}</p>
                    ) : (
                      <p className="mt-1 text-sm text-gray-400">No description</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(p);
                      }}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 transition hover:bg-gray-50"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span className="rounded-full bg-gray-100 px-2 py-1">
                      {total > 0 ? `${done}/${total} tasks done` : "No tasks yet"}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-1">{pct}%</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-black transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                  <span>
                    Due:{" "}
                    <span className="font-medium text-gray-900">
                      {p.dueDate ? formatDate(p.dueDate) : "—"}
                    </span>
                  </span>
                  {isSelected ? (
                    <span className="rounded-full bg-black px-2 py-1 text-[11px] font-medium text-white">
                      Selected
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-500 group-hover:text-gray-700">
                      Click to open →
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Project">
        {createErr ? <ErrorBanner message={createErr.message} /> : null}

        <form onSubmit={submitCreate} className="mt-4 space-y-4">
          <Field label="Name *">
            <input
              value={createForm.name}
              onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
              placeholder="e.g., Customer Onboarding Revamp"
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
                onChange={(e) => setCreateForm((s) => ({ ...s, status: e.target.value as ProjectStatus }))}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
              >
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On hold</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </Field>

            <Field label="Due date">
              <input
                type="date"
                value={createForm.dueDate}
                onChange={(e) => setCreateForm((s) => ({ ...s, dueDate: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
              />
            </Field>
          </div>

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
              disabled={creating || !createForm.name.trim()}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create Project"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Project">
        {updateErr ? <ErrorBanner message={updateErr.message} /> : null}

        <form onSubmit={submitUpdate} className="mt-4 space-y-4">
          <Field label="Name *">
            <input
              value={editForm.name}
              onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
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
                onChange={(e) => setEditForm((s) => ({ ...s, status: e.target.value as ProjectStatus }))}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
              >
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On hold</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </Field>

            <Field label="Due date">
              <input
                type="date"
                value={editForm.dueDate}
                onChange={(e) => setEditForm((s) => ({ ...s, dueDate: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
              />
            </Field>
          </div>

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
              disabled={updating || !editForm.name.trim()}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {updating ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ---------------- Small UI helpers ---------------- */

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-gray-100 px-2 py-1">{children}</span>;
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const cls =
    status === "ACTIVE"
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : status === "COMPLETED"
      ? "bg-green-50 text-green-700 ring-green-200"
      : "bg-yellow-50 text-yellow-800 ring-yellow-200";

  const label =
    status === "ACTIVE" ? "Active" : status === "COMPLETED" ? "Completed" : "On hold";

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
            <div className="mt-1 text-xs text-gray-500">Organization-scoped</div>
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

/* ---------------- Utils ---------------- */

function normalizeDateInput(isoOrDate: string) {
  // supports: "YYYY-MM-DD" or ISO "YYYY-MM-DDTHH:mm:ss..."
  if (!isoOrDate) return "";
  if (isoOrDate.includes("T")) return isoOrDate.split("T")[0];
  return isoOrDate;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
