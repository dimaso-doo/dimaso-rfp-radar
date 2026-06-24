"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Play, Plus } from "lucide-react";

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
      setMessage(`Done: ${result.targets} targets, ${result.changedPages ?? 0} changed pages, ${result.reviewSaved} review candidates.`);
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

type TargetRow = {
  id: string;
  name: string;
  website: string;
  rfpUrl: string | null;
  category: string | null;
  active: boolean;
  lastScannedAt: string | null;
  reviewCount: number;
};

export function TargetsScanTable({ targets }: { targets: TargetRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const activeTargets = targets.filter((target) => target.active);
  const selectedActive = selected.filter((id) => targets.find((target) => target.id === id)?.active);
  const allSelected = activeTargets.length > 0 && activeTargets.every((target) => selected.includes(target.id));

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleAll() {
    setSelected(allSelected ? [] : activeTargets.map((target) => target.id));
  }

  async function scan(payload: { targetIds?: string[]; scanAll?: boolean; limit?: number }, label: string) {
    setBusy(true);
    setMessage(label);
    try {
      const response = await fetch("/api/targets/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Target scan failed");
      setMessage(`Done: ${result.targets} targets, ${result.scannedResults} pages, ${result.changedPages ?? 0} changed, ${result.reviewSaved} review candidates.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Target scan failed");
    } finally {
      setBusy(false);
    }
  }

  return <div className="card overflow-hidden">
    <div className="flex flex-wrap items-center gap-3 border-b border-[#e4e8e5] p-4">
      <button className="btn h-9" onClick={() => scan({ targetIds: selectedActive }, `Scanning ${selectedActive.length} selected targets...`)} disabled={busy || !selectedActive.length}>
        <Play size={14}/>Scan selected ({selectedActive.length})
      </button>
      <button className="btn h-9" onClick={() => scan({ scanAll: true }, `Scanning all ${activeTargets.length} active targets...`)} disabled={busy || !activeTargets.length}>
        <Play size={14}/>Scan all active ({activeTargets.length})
      </button>
      {message && <span className="ml-auto text-xs text-[#68746e]" aria-live="polite">{message}</span>}
    </div>
    <table>
      <thead><tr><th><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all active targets"/></th><th>Organization</th><th>RFP / vendor page</th><th>Category</th><th>Status</th><th>Review</th><th>Last scan</th><th/></tr></thead>
      <tbody>{targets.map((target) => <tr key={target.id}>
        <td><input type="checkbox" checked={selected.includes(target.id)} onChange={() => toggle(target.id)} disabled={!target.active} aria-label={`Select ${target.name}`}/></td>
        <td><div className="font-semibold">{target.name}</div><a className="mt-1 inline-flex items-center gap-1 text-xs text-[#1d684e]" href={target.website} target="_blank" rel="noreferrer">{target.website}<ExternalLink size={12}/></a></td>
        <td className="max-w-xs text-xs">{target.rfpUrl ? <a className="inline-flex items-center gap-1 text-[#1d684e]" href={target.rfpUrl} target="_blank" rel="noreferrer">{target.rfpUrl}<ExternalLink size={12}/></a> : "—"}</td>
        <td className="text-sm">{target.category ?? "Organization"}</td>
        <td><span className={`badge ${target.active ? "bg-[#e6f5ed] text-[#23704e]" : "bg-[#f1f3f1] text-[#68746e]"}`}>{target.active ? "Active" : "Paused"}</span></td>
        <td className="text-sm">{target.reviewCount}</td>
        <td className="text-sm text-[#68746e]">{target.lastScannedAt ? new Date(target.lastScannedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never"}</td>
        <td><button className="btn h-8 px-2 text-xs" onClick={() => scan({ targetIds: [target.id] }, `Scanning ${target.name}...`)} disabled={busy}><Play size={12}/>Scan</button></td>
      </tr>)}</tbody>
    </table>
    {!targets.length && <div className="p-8 text-center text-sm text-[#748079]">No target organizations imported yet.</div>}
  </div>;
}
