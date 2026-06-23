import { db } from "@/lib/db";
import { AddTargetForm, RunTargetScanButton, TargetsScanTable } from "@/components/target-actions";

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
        <p className="mt-1 text-sm text-[#748079]">US-only organizations with known RFP, procurement, vendor or business-opportunities pages.</p>
      </div>
      <RunTargetScanButton limit={10}/>
    </div>

    <AddTargetForm/>

    <div className="mb-5 grid grid-cols-3 gap-4">
      <div className="card p-4"><div className="text-xs text-[#7b8781]">Targets</div><div className="mt-1 text-2xl font-bold">{targets.length}</div></div>
      <div className="card p-4"><div className="text-xs text-[#7b8781]">Active</div><div className="mt-1 text-2xl font-bold">{active}</div></div>
      <div className="card p-4"><div className="text-xs text-[#7b8781]">Review candidates</div><div className="mt-1 text-2xl font-bold">{targets.reduce((sum, target) => sum + target._count.reviewCandidates, 0)}</div></div>
    </div>

    <TargetsScanTable targets={targets.map((target) => ({
      id: target.id,
      name: target.name,
      website: target.website,
      rfpUrl: target.rfpUrl,
      category: target.category,
      active: target.active,
      lastScannedAt: target.lastScannedAt?.toISOString() ?? null,
      reviewCount: target._count.reviewCandidates,
    }))}/>
  </>;
}
