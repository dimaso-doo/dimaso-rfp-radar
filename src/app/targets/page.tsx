import { db } from "@/lib/db";
import { RunTargetScanButton } from "@/components/target-actions";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TargetsPage() {
  const targets = await db.targetOrganization.findMany({
    orderBy: [{ active: "desc" }, { priority: "asc" }, { name: "asc" }],
    include: { _count: { select: { reviewCandidates: true } } },
  });
  const active = targets.filter((target) => target.active).length;

  return <>
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Target organizations</h1>
        <p className="mt-1 text-sm text-[#748079]">Known organizations to monitor directly, instead of relying only on broad web search.</p>
      </div>
      <RunTargetScanButton limit={10}/>
    </div>

    <div className="mb-5 grid grid-cols-3 gap-4">
      <div className="card p-4"><div className="text-xs text-[#7b8781]">Targets</div><div className="mt-1 text-2xl font-bold">{targets.length}</div></div>
      <div className="card p-4"><div className="text-xs text-[#7b8781]">Active</div><div className="mt-1 text-2xl font-bold">{active}</div></div>
      <div className="card p-4"><div className="text-xs text-[#7b8781]">Review candidates</div><div className="mt-1 text-2xl font-bold">{targets.reduce((sum, target) => sum + target._count.reviewCandidates, 0)}</div></div>
    </div>

    <div className="card overflow-hidden">
      <table>
        <thead><tr><th>Organization</th><th>Category</th><th>Country</th><th>Status</th><th>Review</th><th>Last scan</th><th/></tr></thead>
        <tbody>{targets.map((target) => <tr key={target.id}>
          <td><div className="font-semibold">{target.name}</div><a className="mt-1 inline-flex items-center gap-1 text-xs text-[#1d684e]" href={target.website} target="_blank" rel="noreferrer">{target.website}<ExternalLink size={12}/></a></td>
          <td className="text-sm">{target.category ?? "Organization"}</td>
          <td className="text-sm">{target.country ?? "—"}</td>
          <td><span className={`badge ${target.active ? "bg-[#e6f5ed] text-[#23704e]" : "bg-[#f1f3f1] text-[#68746e]"}`}>{target.active ? "Active" : "Paused"}</span></td>
          <td className="text-sm">{target._count.reviewCandidates}</td>
          <td className="text-sm text-[#68746e]">{target.lastScannedAt ? target.lastScannedAt.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never"}</td>
          <td></td>
        </tr>)}</tbody>
      </table>
      {!targets.length && <div className="p-8 text-center text-sm text-[#748079]">No target organizations imported yet.</div>}
    </div>
  </>;
}
