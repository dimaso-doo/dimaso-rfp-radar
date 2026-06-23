import { db } from "@/lib/db";
import { FileText, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReviewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = one(params?.status) ?? "Review";
  const candidates = await db.reviewCandidate.findMany({
    where: status === "All" ? {} : { status },
    orderBy: [{ fitScore: "desc" }, { updatedAt: "desc" }],
    take: 250,
    include: { target: true, source: { include: { profile: true } } },
  });
  const counts = {
    review: await db.reviewCandidate.count({ where: { status: "Review" } }),
    verified: await db.reviewCandidate.count({ where: { status: "Verified" } }),
    rejected: await db.reviewCandidate.count({ where: { status: "Rejected" } }),
    all: await db.reviewCandidate.count(),
  };
  const tabs = [
    ["Review", counts.review],
    ["Verified", counts.verified],
    ["Rejected", counts.rejected],
    ["All", counts.all],
  ] as const;

  return <>
    <div className="mb-6">
      <h1 className="text-[28px] font-bold tracking-tight">Review candidates</h1>
      <p className="mt-1 text-sm text-[#748079]">Potential opportunities that need human review before they become verified opportunities.</p>
    </div>

    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map(([label, count]) => <a key={label} href={`/review?status=${encodeURIComponent(label)}`} className={`btn h-9 ${status === label ? "btn-primary" : ""}`}>{label} <span className="rounded-full bg-white/30 px-2 text-xs">{count}</span></a>)}
    </div>

    <div className="card overflow-hidden">
      <table>
        <thead><tr><th>Candidate</th><th>Source</th><th>Deadline</th><th>Score</th><th>Status</th><th>Reason</th><th>Links</th></tr></thead>
        <tbody>{candidates.map((candidate) => <tr key={candidate.id}>
          <td><div className="max-w-md font-semibold">{candidate.title}</div><div className="mt-1 text-xs text-[#7a8580]">{candidate.organization ?? candidate.target?.name ?? "Unknown organization"}</div></td>
          <td className="max-w-xs text-xs leading-5 text-[#68746e]">{candidate.target ? <><div className="font-semibold text-[#435049]">{candidate.target.name}</div>{candidate.target.website}</> : candidate.source?.profile?.name ?? candidate.sourceType}</td>
          <td className="whitespace-nowrap text-sm">{candidate.deadline ? candidate.deadline.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not detected"}</td>
          <td className="text-sm font-semibold">{candidate.fitScore}</td>
          <td><span className={`badge ${candidate.status === "Verified" ? "bg-[#e6f5ed] text-[#23704e]" : candidate.status === "Rejected" ? "bg-[#fae6e2] text-[#8f3224]" : "bg-[#fff3d8] text-[#886211]"}`}>{candidate.status}</span></td>
          <td className="max-w-sm text-xs leading-5 text-[#68746e]">{candidate.reason ?? "Needs review"}</td>
          <td><div className="flex gap-2"><a className="btn h-8 px-2 text-xs" href={candidate.url} target="_blank" rel="noreferrer">Open <ExternalLink size={12}/></a>{candidate.documentUrl && <a className="btn h-8 px-2 text-xs" href={candidate.documentUrl} target="_blank" rel="noreferrer">Doc <FileText size={12}/></a>}</div></td>
        </tr>)}</tbody>
      </table>
      {!candidates.length && <div className="p-8 text-center text-sm text-[#748079]">No candidates in this view yet. Run a target scan.</div>}
    </div>
  </>;
}
