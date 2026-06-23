"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ClipboardList, LayoutDashboard, Radar, Search, Settings, Plus, Bell, ChevronDown } from "lucide-react";

const links = [
  ["Dashboard", "/", LayoutDashboard], ["Opportunities", "/opportunities", Radar],
  ["Review candidates", "/review", ClipboardList], ["Target orgs", "/targets", Building2],
  ["Search sources", "/sources", Search], ["Settings", "/settings", Settings],
] as const;

export function AppShell({children,opportunityCount}:{children:React.ReactNode;opportunityCount:number}) {
 const path=usePathname();
 return <div className="min-h-screen">
  <aside className="sidebar fixed inset-y-0 left-0 z-20 flex w-[240px] flex-col bg-[#17231f] text-white">
   <div className="flex h-[74px] items-center gap-3 border-b border-white/10 px-5">
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#d8f45b] text-[#17231f]"><Radar size={20}/></div>
    <div><div className="font-bold tracking-tight">Dimaso</div><div className="text-xs text-white/55">RFP Radar</div></div>
   </div>
   <nav className="space-y-1 p-3">{links.map(([label,href,Icon])=>{
    const active=href==="/"?path===href:path.startsWith(href);
    return <Link key={href} href={href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${active?"bg-white/12 font-semibold":"text-white/65 hover:bg-white/5 hover:text-white"}`}><Icon size={17}/>{label}{label==="Opportunities"&&<span className="ml-auto rounded-full bg-[#d8f45b] px-2 py-0.5 text-[11px] font-bold text-[#17231f]">{opportunityCount}</span>}</Link>})}</nav>
   <div className="mt-auto p-3"><div className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="mb-1 text-xs font-semibold">Daily scan</div><div className="mb-3 text-xs leading-relaxed text-white/50">Next run tomorrow at 08:00</div><div className="h-1.5 rounded-full bg-white/10"><div className="h-full w-[72%] rounded-full bg-[#d8f45b]"/></div></div>
   <button className="mt-3 flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#386552] text-xs font-bold">DI</div><div className="text-xs"><div className="font-semibold">Dimaso team</div><div className="text-white/45">Private workspace</div></div><ChevronDown size={14} className="ml-auto text-white/40"/></button></div>
  </aside>
  <main className="main min-h-screen ml-[240px]">
   <header className="flex h-[74px] items-center border-b border-[#e4e8e5] bg-white px-7"><div className="text-sm text-[#78837e]">Opportunity intelligence</div><div className="ml-auto flex items-center gap-3"><button className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e4e8e5]"><Bell size={17}/></button><Link href="/opportunities/new" className="btn btn-primary"><Plus size={16}/>Add opportunity</Link></div></header>
   <div className="p-7">{children}</div>
  </main>
 </div>
}
