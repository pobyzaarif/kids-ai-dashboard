"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toaster";
import { apiFetch } from "@/lib/client";
import type { MemoryRow } from "@/server/queries/memories";

export function MemoryPanel({
  deviceId,
  memories: initialMemories,
}: {
  deviceId: string;
  memories: MemoryRow[];
}) {
  const router = useRouter();
  const { push } = useToast();
  const [memories, setMemories] = useState(initialMemories);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<MemoryRow | null>(null);
  const [editContent, setEditContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function addMemory(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const { memory } = await apiFetch<{ memory: MemoryRow }>(
        `/api/v1/devices/${deviceId}/memories`,
        { method: "POST", body: JSON.stringify({ content: draft }) },
      );
      setMemories((prev) => [memory, ...prev]);
      setDraft("");
      push("Memory added", "success");
      router.refresh();
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not add memory", "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true);
    try {
      const { memory } = await apiFetch<{ memory: MemoryRow }>(
        `/api/v1/memories/${editing.id}`,
        { method: "PATCH", body: JSON.stringify({ content: editContent }) },
      );
      setMemories((prev) => prev.map((m) => (m.id === memory.id ? memory : m)));
      setEditing(null);
      push("Memory updated", "success");
      router.refresh();
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not update memory", "error");
    } finally {
      setBusy(false);
    }
  }

  async function removeMemory(memory: MemoryRow) {
    if (!window.confirm("Delete this memory?")) return;
    try {
      await apiFetch(`/api/v1/memories/${memory.id}`, { method: "DELETE" });
      setMemories((prev) => prev.filter((m) => m.id !== memory.id));
      push("Memory deleted", "success");
      router.refresh();
    } catch (err) {
      push(err instanceof Error ? err.message : "Could not delete memory", "error");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader
          title="Add Memory"
          subtitle="Facts the companion should remember across conversations."
        />
        <form onSubmit={addMemory} className="flex flex-col gap-3 p-4">
          <Textarea
            required
            maxLength={1000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. Has a cat named Mochi and is allergic to peanuts."
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={busy || !draft.trim()}>
              {busy ? "Adding…" : "+ Add memory"}
            </Button>
          </div>
        </form>
      </Card>

      {memories.length === 0 ? (
        <EmptyState
          icon="🧠"
          title="No memories yet"
          hint="Memory entries are injected into the device's conversations."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="flex items-start justify-between gap-3 border-2 border-ink bg-white p-3 shadow-brutal-sm"
            >
              <div className="min-w-0">
                <p className="break-words text-sm font-medium">{memory.content}</p>
                <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                  {new Date(memory.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditing(memory);
                    setEditContent(memory.content);
                  }}
                >
                  Edit
                </Button>
                <Button variant="danger" size="sm" onClick={() => removeMemory(memory)}>
                  ✕
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit Memory"
      >
        <div className="flex flex-col gap-4">
          <Textarea
            required
            maxLength={1000}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={busy || !editContent.trim()}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
