import { useMemo, useState } from "react";
import OrganizationSelector from "./components/OrganizationSelector";
import ProjectList from "./components/ProjectList";
import TaskList from "./components/TaskList";

export default function App() {
  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  const title = useMemo(() => (orgSlug ? `Org: ${orgSlug}` : "Select Organization"), [orgSlug]);

  const resetOrg = () => {
    setOrgSlug(null);
    setProjectId(null);
  };

  // --------- Logged-out / org not selected screen ----------
  if (!orgSlug) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-10">
          {/* Hero */}
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-black text-white shadow-sm">
                    PM
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Mini Project Manager</h1>
                    <p className="mt-1 text-sm text-gray-600">
                      Multi-tenant projects → tasks → comments. Choose an org to begin.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  <Chip>GraphQL + Apollo</Chip>
                  <Chip>Org isolation</Chip>
                  <Chip>Optimistic UX</Chip>
                  <Chip>Tailwind UI</Chip>
                </div>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4 ring-1 ring-black/5">
                <div className="text-xs font-medium text-gray-500">Tip</div>
                <div className="mt-1 text-sm text-gray-700">
                  Use <span className="font-semibold">demo</span> as org slug for quick testing.
                </div>
              </div>
            </div>

            {/* Selector card */}
            <div className="mt-8">
              <OrganizationSelector
                onSelect={(slug) => {
                  setOrgSlug(slug);
                  setProjectId(null);
                }}
              />
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-gray-500">
            {new Date().getFullYear()} · Built for screening task
          </div>
        </div>
      </div>
    );
  }

  // --------- App shell (org selected) ----------
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-black text-white shadow-sm">
              PM
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900">Tenant App</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <Chip>{title}</Chip>
                {projectId ? <Chip>Project selected</Chip> : <Chip>Pick a project</Chip>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={resetOrg}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
            >
              Switch org
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px,1fr]">
          {/* Left: Projects */}
          <aside className="min-h-[70vh] overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
            <div className="border-b border-black/5 p-4">
              <div className="text-sm font-semibold text-gray-900">Projects</div>
              <div className="mt-1 text-xs text-gray-500">Select a project to manage tasks</div>
            </div>
            <div className="h-[calc(70vh-64px)] overflow-y-auto p-4">
              <ProjectList
                organizationSlug={orgSlug}
                onSelectProject={(id) => setProjectId(id)}
                selectedProjectId={projectId}
              />
            </div>
          </aside>

          {/* Right: Tasks */}
          <section className="min-h-[70vh] overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5">
            <div className="border-b border-black/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Tasks</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {projectId ? `Project: ${projectId}` : "Choose a project to see tasks & comments"}
                  </div>
                </div>
                {projectId ? (
                  <div className="rounded-2xl bg-gray-50 px-3 py-2 text-xs text-gray-600 ring-1 ring-black/5">
                    Org: <span className="font-medium text-gray-900">{orgSlug}</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="h-[calc(70vh-64px)] overflow-y-auto p-4">
              {projectId ? (
                <TaskList organizationSlug={orgSlug} projectId={projectId} />
              ) : (
                <EmptyPanel />
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

/* ---------------- Small UI helpers ---------------- */

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-gray-100 px-2 py-1">{children}</span>;
}

function EmptyPanel() {
  return (
    <div className="grid h-full place-items-center rounded-3xl bg-gray-50 p-10 ring-1 ring-black/5">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-white ring-1 ring-black/5" />
        <div className="text-base font-semibold text-gray-900">Select a project</div>
        <div className="mt-2 text-sm text-gray-600">
          Pick a project from the left panel to view tasks, update statuses, and add comments.
        </div>
      </div>
    </div>
  );
}
