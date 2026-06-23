import Link from "next/link";
import { ArrowUpRight, CalendarClock, CircleCheck, Clock3, Filter, Search, Sparkles } from "lucide-react";
import { getOpportunities } from "@/lib/repository";
import { Recommendation, Score } from "@/components/badges";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Dashboard(){const opportunities=await getOpportunities();const [reviewCandidateCount,targetCount,scannedTargetCount]=process.env.DATABASE_URL?await Promise.all([db.reviewCandidate.count({where:{status:"Review"}}),db.targetOrganization.count({where:{active:true}}),db.targetOrganization.count({where:{active:true,lastScannedAt:{not:null}}})]):[0,0,0];const visible=opportunities.filter(o=>o.score>=40);const stats=[
 {label:"Verified candidates",number:String(opportunities.filter(o=>o.score>=20).length),sub:"Full source checked",icon:Sparkles,color:"bg-[#e6f5ed] text-[#277453]"},
 {label:"Good fits",number:String(opportunities.filter(o=>o.score>=70).length),sub:"Score 70+",icon:CircleCheck,color:"bg-[#ecf8ca] text-[#577016]"},
 {label:"Review candidates",number:String(reviewCandidateCount),sub:"Manual check queue",icon:Clock3,color:"bg-[#fff3d8] text-[#8f6811]"},
 {label:"Target scan",number:`${scannedTargetCount}/${targetCount}`,sub:"Organizations scanned",icon:CalendarClock,color:"bg-[#f1ebfb] text-[#7050a1]"},
 ];return <>
 <div className="mb-7 flex items-end justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.15em] text-[#1d684e]"><Sparkles size={14}/>Daily radar</div><h1 className="text-[30px] font-bold tracking-[-.03em]">Good morning, Dimaso.</h1><p className="mt-1 text-sm text-[#6e7974]">Here’s what’s worth your attention today.</p></div><div className="text-right text-xs text-[#7a8580]">Data source<br/><b className="text-[#36443e]">Live radar scan</b></div></div>
 <div className="mb-6 grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2">
  {stats.map(({label,number,sub,icon:Icon,color})=><div className="card p-4" key={label}><div className="mb-5 flex items-start justify-between"><div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}><Icon size={17}/></div><ArrowUpRight size={15} className="text-[#a6afab]"/></div><div className="text-2xl font-bold">{number}</div><div className="mt-1 flex justify-between text-xs"><span className="text-[#697570]">{label}</span><span className="text-[#93a09a]">{sub}</span></div></div>)}
 </div>
 <div className="card overflow-hidden"><div className="flex items-center gap-3 border-b border-[#e4e8e5] p-4"><div><h2 className="font-bold">Priority opportunities</h2><p className="text-xs text-[#7d8883]">Good Fit and Review items, ranked by fit score</p></div><div className="ml-auto relative desktop-only"><Search size={15} className="absolute left-3 top-2.5 text-[#8d9893]"/><input className="field h-9 w-56 pl-9 text-sm" placeholder="Search opportunities"/></div><button className="btn h-9"><Filter size={15}/>Filter</button></div>
  <div className="overflow-x-auto"><table><thead><tr><th>Opportunity</th><th>Deadline</th><th>Category</th><th>Score</th><th>Recommendation</th><th>Status</th><th/></tr></thead><tbody>{visible.map(o=><tr key={o.id} className="hover:bg-[#fafbf9]"><td className="min-w-[280px]"><Link href={`/opportunities/${o.id}`} className="font-semibold hover:text-[#1d684e]">{o.title}</Link><div className="mt-1 text-xs text-[#7c8782]">{o.organization} · {o.discovered}</div></td><td className="text-sm whitespace-nowrap">{o.deadline}</td><td><span className="badge bg-[#f1f3f1] text-[#5c6862]">{o.category}</span></td><td><Score value={o.score}/></td><td><Recommendation value={o.recommendation}/></td><td><span className="text-sm text-[#59655f]">{o.status}</span></td><td><Link href={`/opportunities/${o.id}`}><ArrowUpRight size={16} className="text-[#909b96]"/></Link></td></tr>)}</tbody></table></div>
 </div>
 </>}
