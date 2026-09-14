"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toaster";
import { apiFetch } from "@/lib/client";
import type { RoleWithMeta } from "@/server/queries/roles";
import { RoleForm } from "./RoleForm";

function RoleCard({
  role,
  editable,
  onEdit,
  onDelete,
}: {
  role: RoleWithMeta;
  editable: boolean;
  onEdit?: (role: RoleWithMeta) => void;
  onDelete?: (role: RoleWithMeta) => void;
}) {
  return (
    <div className="flex flex-col border-2 border-ink bg-white shadow-brutal-sm">
      <div className="flex items-start justify-between gap-2 border-b-2 border-ink px-3 py-2">
        <p className="font-black">{role.name}</p>
        <Badge tone={role.is_system ? "purple" : "cyan"}>
          {role.is_system ? "system" : "yours"}
        </Badge>
      </div>
      <div className="flex-1 p-3">
        <p className="text-xs font-medium text-gray-600">{role.description ?? "—"}</p>
        <p className="mt-2 line-clamp-3 text-xs italic text-gray-500">
          {role.system_prompt || "(no system prompt)"}
        </p>
      </div>
      <div className="flex items-center justify-between border-t-2 border-dashed border-ink px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-gray-500">
        <span>
          voice: {role.voice} · temp: {role.temperature} · used by {role.device_count}{" "}
          device{role.device_count === 1 ? "" : "s"}
        </span>
        {editable ? (
          <span className="flex gap-1">
            <Button variant="secondary" size="sm" onClick={() => onEdit?.(role)}>
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={() => onDelete?.(role)}>
              ✕
            </Button>
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function RoleManager({
  systemRoles,
  myRoles,
}: {
  systemRoles: RoleWithMeta[];
  myRoles: RoleWithMeta[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<RoleWithMeta | null>(null);
  const [deleting, setDeleting] = useState<RoleWithMeta | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await apiFetch(`/api/v1/roles/${deleting.id}`, { method: "DELETE" });
      push(
        deleting.device_count > 0
          ? "Role deleted — its devices now have no role"
          : "Role deleted",
        "success",
      );
      setDeleting(null);
      router.refresh();
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not delete role", "error");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black uppercase">Roles</h1>
          <p className="text-sm font-medium text-gray-600">
            Personalities you can configure onto devices. System presets are
            read-only — create your own to customize prompts, voice and
            temperature.
          </p>
        </div>
        <Button variant="lime" onClick={() => setCreating(true)}>
          + New Role
        </Button>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-black uppercase">My Roles</h2>
        {myRoles.length === 0 ? (
          <EmptyState
            icon="🎭"
            title="No custom roles yet"
            hint="Create your own persona — a name, a system prompt, a voice and a temperature."
            action={<Button onClick={() => setCreating(true)}>+ New Role</Button>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {myRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                editable
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-black uppercase">System Presets</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {systemRoles.map((role) => (
            <RoleCard key={role.id} role={role} editable={false} />
          ))}
        </div>
      </section>

      <Dialog open={creating} onClose={() => setCreating(false)} title="New Role">
        <RoleForm
          onDone={() => {
            setCreating(false);
            push("Role created", "success");
            router.refresh();
          }}
          onCancel={() => setCreating(false)}
        />
      </Dialog>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.name ?? ""}`}
      >
        {editing ? (
          <RoleForm
            initial={{
              id: editing.id,
              name: editing.name,
              description: editing.description ?? "",
              system_prompt: editing.system_prompt,
              voice: editing.voice,
              temperature: editing.temperature,
            }}
            onDone={() => {
              setEditing(null);
              push("Role updated", "success");
              router.refresh();
            }}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </Dialog>

      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete Role"
      >
        <p className="mb-4 text-sm font-medium">
          Delete <b>{deleting?.name}</b>? Devices using it will fall back to no
          role. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete role
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
