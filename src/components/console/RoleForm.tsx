"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Field";
import { apiFetch } from "@/lib/client";

export type RoleFormValues = {
  id?: string;
  name: string;
  description: string;
  system_prompt: string;
  voice: string;
  temperature: number;
};

export function RoleForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: RoleFormValues;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<RoleFormValues>(
    initial ?? {
      name: "",
      description: "",
      system_prompt: "",
      voice: "default",
      temperature: 0.7,
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof RoleFormValues>(key: K, value: RoleFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      name: values.name,
      description: values.description || undefined,
      system_prompt: values.system_prompt,
      voice: values.voice || "default",
      temperature: Number(values.temperature),
    };
    try {
      if (initial?.id) {
        await apiFetch(`/api/v1/roles/${initial.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/api/v1/roles", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save role");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="role_name">Name</Label>
          <Input
            id="role_name"
            required
            maxLength={60}
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Space Explorer"
          />
        </div>
        <div>
          <Label htmlFor="role_voice">Voice label</Label>
          <Input
            id="role_voice"
            maxLength={60}
            value={values.voice}
            onChange={(e) => set("voice", e.target.value)}
            placeholder="e.g. cheerful"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="role_desc">Description</Label>
        <Input
          id="role_desc"
          maxLength={500}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What is this role for?"
        />
      </div>
      <div>
        <Label htmlFor="role_prompt">System prompt</Label>
        <Textarea
          id="role_prompt"
          maxLength={4000}
          className="min-h-32"
          value={values.system_prompt}
          onChange={(e) => set("system_prompt", e.target.value)}
          placeholder="You are… (persona instructions sent to the LLM)"
        />
      </div>
      <div>
        <Label htmlFor="role_temp">Temperature ({values.temperature.toFixed(2)})</Label>
        <input
          id="role_temp"
          type="range"
          min={0}
          max={2}
          step={0.05}
          value={values.temperature}
          onChange={(e) => set("temperature", Number(e.target.value))}
          className="w-full accent-black"
        />
        <p className="text-xs font-medium text-gray-500">
          Lower = focused and predictable, higher = creative and surprising.
        </p>
      </div>
      {error ? (
        <p className="border-2 border-ink bg-brand-red px-3 py-2 text-sm font-bold text-white">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : initial?.id ? "Save changes" : "Create role"}
        </Button>
      </div>
    </form>
  );
}
