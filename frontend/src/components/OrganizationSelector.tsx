import { FormEvent, useMemo, useState } from "react";
import { useMutation } from "@apollo/client";
import { CREATE_ORGANIZATION } from "../queries";

interface OrganizationSelectorProps {
  onSelect: (slug: string) => void;
}

type Mode = "SELECT" | "CREATE";

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function OrganizationSelector({ onSelect }: OrganizationSelectorProps) {
  const [mode, setMode] = useState<Mode>("SELECT");
  const [slug, setSlug] = useState("");

  const [newOrgData, setNewOrgData] = useState({
    name: "",
    slug: "",
    contactEmail: "",
  });

  const [createOrganization, { loading, error }] = useMutation(CREATE_ORGANIZATION, {
    onCompleted: (data) => {
      // adjust path depending on your schema shape
      onSelect(data.createOrganization.organization.slug);
      setMode("SELECT");
    },
  });

  const suggestedSlug = useMemo(() => slugify(newOrgData.name), [newOrgData.name]);

  const canEnter = mode === "SELECT" ? slug.trim().length > 0 : true;
  const canCreate =
    newOrgData.name.trim().length > 0 &&
    newOrgData.slug.trim().length > 0 &&
    newOrgData.contactEmail.trim().length > 0;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (mode === "CREATE") {
      if (!canCreate) return;
      createOrganization({
        variables: {
          name: newOrgData.name.trim(),
          slug: newOrgData.slug.trim(),
          contactEmail: newOrgData.contactEmail.trim(),
        },
      });
    } else {
      if (!canEnter) return;
      onSelect(slug.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-lg p-6 pt-14">
        {/* Card */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-black text-white shadow-sm">
              ORG
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-gray-900">Workspace</h1>
              <p className="mt-1 text-sm text-gray-600">
                Enter an organization slug or create a new organization.
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-5 rounded-2xl bg-gray-50 p-1 ring-1 ring-black/5">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setMode("SELECT")}
                className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
                  mode === "SELECT"
                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Select
              </button>
              <button
                type="button"
                onClick={() => setMode("CREATE")}
                className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
                  mode === "CREATE"
                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Create
              </button>
            </div>
          </div>

          {/* Error */}
          {error ? (
            <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
              {error.message}
            </div>
          ) : null}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {mode === "SELECT" ? (
              <>
                <Field label="Organization Slug" hint="Example: demo, acme-inc, docintel">
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="e.g., demo"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                  />
                </Field>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={!canEnter}
                    className="w-full rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Enter Workspace →
                  </button>
                </div>

                <div className="text-center text-xs text-gray-500">
                  Tip: Use <span className="font-medium text-gray-900">demo</span> to try quickly.
                </div>
              </>
            ) : (
              <>
                <Field label="Organization Name" hint="This is what users will see in the UI.">
                  <input
                    type="text"
                    value={newOrgData.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setNewOrgData((s) => ({
                        ...s,
                        name,
                        // auto-fill slug if user hasn’t typed one yet
                        slug: s.slug.trim().length === 0 ? slugify(name) : s.slug,
                      }));
                    }}
                    placeholder="e.g., Acme Inc"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    required
                  />
                </Field>

                <Field
                  label="Slug"
                  hint={
                    suggestedSlug
                      ? `Suggested: ${suggestedSlug}`
                      : "Lowercase, hyphens only. Used in URLs."
                  }
                >
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={newOrgData.slug}
                      onChange={(e) => setNewOrgData((s) => ({ ...s, slug: slugify(e.target.value) }))}
                      placeholder="e.g., acme-inc"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setNewOrgData((s) => ({ ...s, slug: s.slug.trim() ? s.slug : suggestedSlug }))
                      }
                      className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-900 hover:bg-gray-50"
                      title="Use suggested slug"
                    >
                      Use
                    </button>
                  </div>
                </Field>

                <Field label="Contact Email" hint="Used for billing/notifications (demo).">
                  <input
                    type="email"
                    value={newOrgData.contactEmail}
                    onChange={(e) => setNewOrgData((s) => ({ ...s, contactEmail: e.target.value }))}
                    placeholder="name@company.com"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-black"
                    required
                  />
                </Field>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading || !canCreate}
                    className="w-full rounded-2xl bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "Creating…" : "Create Organization"}
                  </button>
                </div>

                <div className="text-center text-xs text-gray-500">
                  After creation, you’ll be redirected into the new org dashboard.
                </div>
              </>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-xs text-gray-500">
          Multi-tenant demo • organization slug scopes all queries & mutations
        </div>
      </div>
    </div>
  );
}

/* ---------------- Small UI helper ---------------- */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {hint ? <span className="text-xs text-gray-500">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}
