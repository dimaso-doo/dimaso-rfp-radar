"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Plus, Trash2, X } from "lucide-react";

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell); if (row.some(Boolean)) rows.push(row); row = []; cell = "";
    } else cell += character;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export function AddSourceButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [terms, setTerms] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const searchTerms = terms.split(/\r?\n/).map((term) => term.trim()).filter(Boolean);
    const response = await fetch("/api/searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searches: [{ name, terms: searchTerms }] }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setError(result.error || "Unable to add source");
    setName("");
    setTerms("");
    setOpen(false);
    router.refresh();
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    const rows = parseCsv(await file.text()).map((row) => row.map((cell) => cell.trim()));
    const header = rows[0]?.map((cell) => cell.toLowerCase()) ?? [];
    const advanced = header.includes("search_query") && header.includes("category");
    const hasHeader = advanced || header.includes("search") || header.includes("search_name") || header.includes("term") || header.includes("query");
    const groups = new Map<string, Array<string | { query: string; enabled: boolean; priority: number; dateRestrict: string; notes: string }>>();
    for (const row of rows.slice(hasHeader ? 1 : 0)) {
      const searchName = advanced ? row[header.indexOf("category")] : row.length > 1 ? row[0] : file.name.replace(/\.csv$/i, "");
      const term = advanced ? row[header.indexOf("search_query")] : row.length > 1 ? row[1] : row[0];
      if (!searchName || !term) continue;
      const value = advanced ? {
        query: term,
        enabled: String(row[header.indexOf("enabled")] ?? "true").toLowerCase() !== "false",
        priority: Number(row[header.indexOf("priority")] ?? 3),
        dateRestrict: row[header.indexOf("date_restrict")] ?? "",
        notes: row[header.indexOf("notes")] ?? "",
      } : term;
      groups.set(searchName, [...(groups.get(searchName) ?? []), value]);
    }
    const response = await fetch("/api/searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searches: [...groups].map(([searchName, searchTerms]) => ({ name: searchName, terms: searchTerms })) }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setError(result.error || "CSV import failed");
    setError(`Imported ${result.added} new terms into ${result.searches} searches.`);
    router.refresh();
  }

  return <>
    <div className="flex items-center gap-2">
      <label className="btn cursor-pointer"><input className="hidden" type="file" accept=".csv,text/csv,text/plain" onChange={importCsv} disabled={busy}/>{busy ? "Importing…" : "Import CSV"}</label>
      <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16}/>Add search</button>
    </div>
    {error && !open && <div className="fixed bottom-5 right-5 z-40 rounded-lg bg-[#17231f] px-4 py-3 text-sm text-white shadow-lg" role="status">{error}</div>}
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17231f]/40 p-4" role="dialog" aria-modal="true" aria-label="Add search">
      <form onSubmit={submit} className="card w-full max-w-lg p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div><h2 className="text-lg font-bold">Add search</h2><p className="mt-1 text-sm text-[#748079]">Create one search containing multiple independent terms.</p></div>
          <button type="button" aria-label="Close" onClick={() => setOpen(false)}><X size={19}/></button>
        </div>
        <label className="mb-2 mt-5 block text-sm font-semibold" htmlFor="search-name">Search name</label>
        <input id="search-name" className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Nonprofit websites" minLength={2} maxLength={100} autoFocus required/>
        <label className="mb-2 mt-4 block text-sm font-semibold" htmlFor="search-terms">Search terms <span className="font-normal text-[#8b9691]">(one per line)</span></label>
        <textarea id="search-terms" className="field min-h-36" value={terms} onChange={(event) => setTerms(event.target.value)} placeholder={"nonprofit website redesign RFP\nfoundation WordPress support proposal\ncharity web accessibility RFP"} required/>
        <p className="mt-2 text-xs text-[#748079]">CSV format: <b>search,term</b>. Each row becomes a separate Brave query.</p>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex items-center justify-between gap-2"><a className="text-xs font-semibold text-[#1d684e]" download="rfp-search-template.csv" href={'data:text/csv;charset=utf-8,search%2Cterm%0ANonprofit%20websites%2Cnonprofit%20website%20redesign%20RFP%0ANonprofit%20websites%2Cfoundation%20WordPress%20support%20proposal'}>Download CSV template</a><div className="flex gap-2"><button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Adding…" : "Add search"}</button></div></div>
      </form>
    </div>}
  </>;
}

export function RunScanButton({ sourceId, label = "Run scan now" }: { sourceId?: string; label?: string } = {}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run() {
    setBusy(true);
    setMessage(sourceId ? "Scanning this term…" : "Scanning the web. This can take about a minute…");
    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: sourceId ? { "Content-Type": "application/json" } : undefined,
        body: sourceId ? JSON.stringify({ sourceId }) : undefined,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Scan failed");
      setMessage(`Done: ${result.scanned} results scanned, ${result.verifiedAndSaved} opportunities saved.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  return <div className="ml-auto flex items-center gap-3">
    {message && <span className="max-w-sm text-right text-xs text-[#68746e]" aria-live="polite">{message}</span>}
    <button className="btn h-9" onClick={run} disabled={busy}><Play size={14}/>{busy ? "Scanning…" : label}</button>
  </div>;
}

export function DeleteTermButton({ id, query }: { id: string; query: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`Delete this search term?\n\n${query}`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/searches", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to delete term");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return <button className="btn h-8 px-2 text-xs text-red-700" onClick={remove} disabled={busy} aria-label={`Delete ${query}`} title="Delete this term"><Trash2 size={14}/>{busy ? "Deleting…" : "Delete"}</button>;
}

export function DeleteAllTermsButton({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function removeAll() {
    if (!count) return;
    if (!confirm(`Delete all ${count} search terms?\n\nExisting opportunities will stay in the app, but future scans will use only newly imported/added terms.`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/searches", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to delete all terms");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return <button className="btn h-9 text-red-700" onClick={removeAll} disabled={busy || count === 0}><Trash2 size={14}/>{busy ? "Deleting…" : "Delete all terms"}</button>;
}
