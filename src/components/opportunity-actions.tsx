"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";

type DeleteScope = { id?: string; sourceId?: string; category?: string; all?: boolean };

export function DeleteOpportunityButton({ scope, label = "Delete", confirmText }: { scope: DeleteScope; label?: string; confirmText: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(confirmText)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/opportunities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scope),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to delete opportunities");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return <button className="btn h-8 px-2 text-xs text-red-700" onClick={remove} disabled={busy}><Trash2 size={14}/>{busy ? "Deleting…" : label}</button>;
}
