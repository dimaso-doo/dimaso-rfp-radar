"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Play, Plus } from "lucide-react";

export function RunTargetScanButton({ limit = 25 }: { limit?: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run() {
    setBusy(true);
    setMessage(`Scanning ${limit} target organizations...`);
    try {
      const response = await fetch("/api/targets/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Target scan failed");
      setMessage(`Done: ${result.targets} targets, ${result.reviewSaved} review candidates, ${result.opportunities} opportunities.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Target scan failed");
    } finally {
      setBusy(false);
    }
  }

  return <div className="ml-auto flex items-center gap-3">
    {message && <span className="max-w-md text-right text-xs text-[#68746e]" aria-live="polite">{message}</span>}
    <button className="btn h-9" onClick={run} disabled={busy}><Play size={14}/>{busy ? "Scanning..." : `Scan ${limit} targets`}</button>
  </div>;
}

export function AddTargetForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(formData: FormData) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          website: formData.get("website"),
          rfpUrl: formData.get("rfpUrl"),
          category: formData.get("category"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save target.");
      setMessage("Target saved.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save target.");
    } finally {
      setBusy(false);
    }
  }

  return <form action={submit} className="card mb-5 grid grid-cols-[1fr_1fr_1fr_180px_auto] gap-3 p-4 max-[1200px]:grid-cols-1">
    <input className="field h-10 text-sm" name="name" placeholder="Organization name" required/>
    <input className="field h-10 text-sm" name="website" placeholder="Homepage URL" required/>
    <input className="field h-10 text-sm" name="rfpUrl" placeholder="RFP / vendor page URL" required/>
    <input className="field h-10 text-sm" name="category" placeholder="Type e.g. Foundation"/>
    <button className="btn btn-primary h-10" disabled={busy}><Plus size={14}/>{busy ? "Saving..." : "Add target"}</button>
    {message && <div className="col-span-full text-xs text-[#68746e]" aria-live="polite">{message}</div>}
  </form>;
}
