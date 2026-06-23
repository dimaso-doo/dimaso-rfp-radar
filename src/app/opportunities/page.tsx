import { getOpportunities, getOpportunityFilterOptions } from "@/lib/repository";
import { Recommendation, Score } from "@/components/badges";
import { DeleteOpportunityButton } from "@/components/opportunity-actions";
import Link from "next/link";
import { FileText, Search } from "lucide-react";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Opportunities({ searchParams }: PageProps) {
  const params = await searchParams;
  const sourceId = one(params?.sourceId);
  const category = one(params?.category);
  const q = one(params?.q);
  const [opportunities, filters] = await Promise.all([
    getOpportunities({ sourceId, category, q }),
    getOpportunityFilterOptions(),
  ]);
  const activeSource = filters.sources.find((source) => source.id === sourceId);
  const activeLabel = activeSource ? `Term: ${activeSource.query}` : category ? `Category: ${category}` : q ? `Search: ${q}` : "All opportunities";
  const deleteScope = sourceId ? { sourceId } : category ? { category } : { all: true };
  const deleteLabel = sourceId || category ? "Delete these results" : "Delete all RFPs";

  return <>
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Opportunities</h1>
        <p className="mt-1 text-sm text-[#748079]">{activeLabel} · {opportunities.length} visible result{opportunities.length === 1 ? "" : "s"}</p>
      </div>
      <DeleteOpportunityButton scope={deleteScope} label={deleteLabel} confirmText={sourceId || category ? `Delete all RFP results in this view?\n\n${activeLabel}` : "Delete all found RFP opportunities?\n\nSearch terms will stay; only found results will be removed."}/>
    </div>

    <div className="mb-5 grid gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="card max-h-[72vh] overflow-auto p-4">
        <div className="mb-3 text-xs font-bold uppercase tracking-[.14em] text-[#7b8781]">Views</div>
        <Link className={`mb-2 block rounded-lg px-3 py-2 text-sm ${!sourceId && !category ? "bg-[#e6f5ed] font-semibold text-[#1d684e]" : "hover:bg-[#f5f7f4]"}`} href="/opportunities">All results</Link>

        <div className="mt-5 text-xs font-bold uppercase tracking-[.14em] text-[#7b8781]">Categories</div>
        <div className="mt-2 space-y-1">
          {filters.categories.map((item) => <Link key={item} className={`block rounded-lg px-3 py-2 text-sm ${category === item ? "bg-[#e6f5ed] font-semibold text-[#1d684e]" : "hover:bg-[#f5f7f4]"}`} href={`/opportunities?category=${encodeURIComponent(item)}`}>{item}</Link>)}
          {!filters.categories.length && <div className="px-3 py-2 text-xs text-[#8b9691]">No categories yet.</div>}
        </div>

        <div className="mt-5 text-xs font-bold uppercase tracking-[.14em] text-[#7b8781]">Search terms</div>
        <div className="mt-2 space-y-1">
          {filters.sources.map((source) => <Link key={source.id} className={`block rounded-lg px-3 py-2 text-xs leading-5 ${sourceId === source.id ? "bg-[#e6f5ed] font-semibold text-[#1d684e]" : "hover:bg-[#f5f7f4]"}`} href={`/opportunities?sourceId=${encodeURIComponent(source.id)}`}><span className="block text-[11px] text-[#7b8781]">{source.search} · {source.count}</span>{source.query}</Link>)}
        </div>
      </aside>

      <div className="card overflow-hidden">
        <form className="flex gap-2 border-b border-[#e4e8e5] p-4" action="/opportunities">
          {sourceId && <input type="hidden" name="sourceId" value={sourceId}/>}
          {category && <input type="hidden" name="category" value={category}/>}
          <div className="relative flex-1"><Search className="absolute left-3 top-3 text-[#8b9690]" size={16}/><input className="field pl-10" name="q" defaultValue={q ?? ""} placeholder="Search by title, organization, or snippet"/></div>
          <button className="btn" type="submit">Search</button>
        </form>
        <div className="overflow-x-auto">
          <table>
            <thead><tr><th>Opportunity</th><th>Term</th><th>Document</th><th>Deadline</th><th>Category</th><th>Score</th><th>Recommendation</th><th>Status</th><th/></tr></thead>
            <tbody>{opportunities.map((o) => <tr key={o.id}>
              <td><Link href={`/opportunities/${o.id}`} className="font-semibold hover:text-[#1d684e]">{o.title}</Link><div className="mt-1 text-xs text-[#7a8580]">{o.organization}</div></td>
              <td className="max-w-xs text-xs leading-5 text-[#68746e]">{o.searchName && <div className="font-semibold text-[#435049]">{o.searchName}</div>}{o.sourceQuery ?? "Manual / unknown"}</td>
              <td>{o.documentUrl ? <a href={o.documentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-[#1d684e]"><FileText size={15}/>PDF</a> : <span className="text-xs text-[#9aa39f]">—</span>}</td>
              <td className="whitespace-nowrap text-sm">{o.deadline}</td>
              <td className="text-sm">{o.category}</td>
              <td><Score value={o.score}/></td>
              <td><Recommendation value={o.recommendation}/></td>
              <td className="whitespace-nowrap text-sm">{o.status}</td>
              <td><DeleteOpportunityButton scope={{ id: o.id }} label="Delete" confirmText={`Delete this RFP result?\n\n${o.title}`}/></td>
            </tr>)}</tbody>
          </table>
          {!opportunities.length && <div className="p-8 text-center text-sm text-[#748079]">No RFP results in this view yet. Run a scan for one term or all terms.</div>}
        </div>
      </div>
    </div>
  </>;
}
