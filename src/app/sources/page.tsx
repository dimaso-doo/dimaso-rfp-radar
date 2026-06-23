import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { AddSourceButton, DeleteAllTermsButton, DeleteTermButton, RunScanButton } from "@/components/source-actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Sources() {
  const stored = process.env.DATABASE_URL
    ? await db.searchSource.findMany({ orderBy: { createdAt: "asc" }, include: { profile: true, _count: { select: { opportunities: true } } } })
    : [];
  const rows = stored.map((source) => ({ id: source.id, search: source.profile?.name ?? "Website RFP Radar", query: source.query, active: source.active, priority: source.priority, dateRestrict: source.dateRestrict, results: source._count.opportunities, lastRunAt: source.lastRunAt }));
  const latestRun = rows.reduce<Date | null>((latest, row) => !row.lastRunAt || (latest && latest > row.lastRunAt) ? latest : row.lastRunAt, null);

  return <>
    <div className="mb-6 flex items-end justify-between gap-4"><div><h1 className="text-[28px] font-bold tracking-tight">Searches & terms</h1><p className="mt-1 text-sm text-[#748079]">Each search groups multiple terms; every term runs as its own Brave query.</p></div><AddSourceButton/></div>
    <div className="mb-5 grid grid-cols-3 gap-4"><div className="card p-4"><div className="text-xs text-[#7b8781]">Active queries</div><div className="mt-1 text-2xl font-bold">{rows.filter(row=>row.active).length}</div></div><div className="card p-4"><div className="text-xs text-[#7b8781]">Accepted results</div><div className="mt-1 text-2xl font-bold">{rows.reduce((sum,row)=>sum+row.results,0)}</div></div><div className="card p-4"><div className="text-xs text-[#7b8781]">Last scan</div><div className="mt-1 text-lg font-bold">{latestRun?latestRun.toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"Not run yet"}</div></div></div>
    <div className="card overflow-hidden"><div className="flex items-center border-b border-[#e4e8e5] p-4"><div><h2 className="font-bold">Search terms</h2><p className="text-xs text-[#818c87]">Each term can be scanned and reviewed independently.</p></div><div className="ml-auto flex items-center gap-2"><DeleteAllTermsButton count={stored.length}/><RunScanButton/></div></div><table><thead><tr><th>Search</th><th>Search term</th><th>Priority</th><th>Window</th><th>Status</th><th>Accepted</th><th>Last run</th><th/></tr></thead><tbody>{rows.map(row=><tr key={row.query}><td className="text-sm font-semibold">{row.search}</td><td><div className="flex max-w-xl items-start gap-3"><Search size={15} className="mt-0.5 shrink-0 text-[#7d8a83]"/><span className="break-words text-xs font-medium leading-5">{row.query}</span></div></td><td className="text-sm">{row.priority}</td><td className="text-sm">{row.dateRestrict ?? "py"}</td><td><span className={`badge ${row.active?"bg-[#e6f5ed] text-[#23704e]":"bg-[#f1f3f1] text-[#68746e]"}`}>{row.active?"Active":"Paused"}</span></td><td className="text-sm">{row.results}</td><td className="text-sm text-[#68746e]">{row.lastRunAt?row.lastRunAt.toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"Never"}</td><td><div className="flex items-center justify-end gap-2"><Link className="btn h-8 px-2 text-xs" href={`/opportunities?sourceId=${encodeURIComponent(row.id)}`}>Results</Link><RunScanButton sourceId={row.id} label="Search term"/><DeleteTermButton id={row.id} query={row.query}/></div></td></tr>)}</tbody></table>{!rows.length&&<div className="p-8 text-center text-sm text-[#748079]">No search terms yet. Add terms manually or import a CSV to start fresh.</div>}</div>
  </>;
}
