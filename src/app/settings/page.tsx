export const dynamic = "force-dynamic";

export default function Settings() {
  const tavilyConnected = Boolean(process.env.TAVILY_API_KEY);
  const braveConnected = Boolean(process.env.BRAVE_SEARCH_API_KEY);
  const databaseConnected = Boolean(process.env.DATABASE_URL);
  const digestConnected = Boolean(process.env.RESEND_API_KEY && process.env.DIGEST_TO);
  const privateAccess = Boolean(process.env.APP_USERNAME && process.env.APP_PASSWORD);
  const badge = (connected: boolean) => <span className={`badge ${connected ? "bg-[#e6f5ed] text-[#23704e]" : "bg-[#fff3d8] text-[#886211]"}`}>{connected ? "Connected" : "Configuration required"}</span>;

  return <>
    <h1 className="text-[28px] font-bold">Settings</h1><p className="mb-6 mt-1 text-sm text-[#748079]">Manage integrations and digest preferences.</p>
    <div className="max-w-2xl space-y-4">
      <section className="card p-5"><h2 className="font-bold">Tavily Search API</h2><p className="mb-4 mt-1 text-sm text-[#748079]">Optional helper only. The main radar now crawls verified target organization RFP/vendor pages directly.</p>{badge(tavilyConnected)}</section>
      <section className="card p-5"><h2 className="font-bold">Brave Search fallback</h2><p className="mb-4 mt-1 text-sm text-[#748079]">Legacy fallback. Not required for the target-site crawler workflow.</p>{badge(braveConnected)}</section>
      <section className="card p-5"><h2 className="font-bold">Supabase database</h2><p className="mb-4 mt-1 text-sm text-[#748079]">Stores verified sources, extracted content, contacts, deadlines and scores.</p>{badge(databaseConnected)}</section>
      <section className="card p-5"><h2 className="font-bold">Private access</h2><p className="mb-4 mt-1 text-sm text-[#748079]">Protects the deployed app with APP_USERNAME and APP_PASSWORD.</p>{badge(privateAccess)}</section>
      <section className="card p-5"><h2 className="font-bold">Daily email digest</h2><p className="mb-4 mt-1 text-sm text-[#748079]">Sends good fits and new review candidates after the daily US target-site scan.</p>{badge(digestConnected)}<div className="mt-4 space-y-2 rounded-lg bg-[#f4f6f3] p-3 text-sm"><div className="flex items-center justify-between"><span>Target org scan</span><b>08:00 Europe/Belgrade</b></div><div className="flex items-center justify-between"><span>Email digest</span><b>08:30 Europe/Belgrade</b></div></div></section>
    </div>
  </>;
}
