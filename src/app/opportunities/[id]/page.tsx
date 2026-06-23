import { notFound } from "next/navigation";
import Link from "next/link";
import { getOpportunity } from "@/lib/repository";
import { Recommendation } from "@/components/badges";
import { ArrowLeft, Calendar, Check, ExternalLink, FileText, Mail, ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opportunity = await getOpportunity(id);
  if (!opportunity) notFound();

  return <>
    <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm text-[#64716b]"><ArrowLeft size={15}/>Back to dashboard</Link>
    <div className="mb-6 flex items-start justify-between gap-5"><div><div className="mb-3 flex gap-2"><Recommendation value={opportunity.recommendation}/><span className="badge border border-[#e1e6e3] bg-white">{opportunity.status}</span></div><h1 className="max-w-3xl text-[30px] font-bold tracking-tight">{opportunity.title}</h1><p className="mt-1 text-[#6f7b75]">{opportunity.organization}</p></div><div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#17231f] text-white"><b className="text-3xl">{opportunity.score}</b><span className="text-[10px] uppercase tracking-wider text-white/55">Fit score</span></div></div>
    <div className="grid grid-cols-[1fr_300px] gap-5 max-[1000px]:grid-cols-1">
      <div className="space-y-5">
        <section className="card p-5"><h2 className="mb-3 font-bold">Source summary</h2><p className="leading-7 text-[#4f5d56]">{opportunity.summary}</p></section>
        <section className="card p-5"><h2 className="mb-3 font-bold">Scope detected</h2><p className="leading-7 text-[#4f5d56]">{opportunity.scope}</p></section>
        <section className="card p-5"><h2 className="mb-4 font-bold">Why it scored {opportunity.score}</h2><div className="space-y-3">{opportunity.reasons.map((reason)=><div className="flex items-center gap-3 text-sm" key={reason}><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e6f5ed] text-[#1d684e]"><Check size={13}/></span>{reason}</div>)}</div></section>
        <section className="card p-5"><h2 className="mb-3 font-bold">Extracted source text</h2><p className="max-h-64 overflow-auto whitespace-pre-line text-sm leading-6 text-[#69756f]">{opportunity.text}</p></section>
      </div>
      <aside className="space-y-4">
        <div className="card p-5"><h3 className="mb-4 font-bold">Opportunity details</h3><div className="space-y-4 text-sm"><div className="flex gap-3"><Calendar size={17} className="text-[#7b8781]"/><div><div className="text-xs text-[#8a958f]">Deadline</div><b>{opportunity.deadline}</b></div></div><div className="flex gap-3"><Mail size={17} className="text-[#7b8781]"/><div className="min-w-0"><div className="text-xs text-[#8a958f]">Submission</div><b>{opportunity.submission}</b><div className="truncate text-[#1d684e]">{opportunity.email}</div></div></div></div>{opportunity.documentUrl && <a className="btn btn-primary mt-5 w-full" href={opportunity.documentUrl} target="_blank" rel="noreferrer"><FileText size={15}/>Open PDF / document</a>}<a className="btn mt-2 w-full" href={opportunity.url} target="_blank" rel="noreferrer">Original source <ExternalLink size={14}/></a>{opportunity.documentUrl && <p className="mt-2 text-xs leading-5 text-[#748079]">The document link is kept separately in case the original page becomes unavailable.</p>}</div>
        <div className="card p-5"><div className="mb-3 flex items-center gap-2"><ShieldAlert size={17} className="text-[#a66a26]"/><h3 className="font-bold">Checks needed</h3></div><ul className="space-y-2 text-sm leading-5 text-[#66726c]">{opportunity.risks.length?opportunity.risks.map((risk)=><li key={risk}>• {risk}</li>):<li>No automatic warnings.</li>}</ul></div>
        <div className="rounded-xl bg-[#d8f45b] p-5"><div className="text-xs font-bold uppercase tracking-wider text-[#52621d]">Recommendation</div><div className="mt-1 text-2xl font-bold">{opportunity.score>=70?"Bid":opportunity.score>=40?"Maybe":"No-bid"}</div><p className="mt-2 text-sm text-[#53602d]">{opportunity.score>=70?"Strong alignment with Dimaso’s capabilities and delivery model.":"Human review is required before deciding."}</p></div>
      </aside>
    </div>
  </>;
}
