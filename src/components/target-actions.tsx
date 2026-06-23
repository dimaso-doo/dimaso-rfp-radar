"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Play } from "lucide-react";

export function RunTargetScanButton({ limit = 25 }: { limit?: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function run() {
    setBusy(true);
    setMessage(`Scanning ${limit} target organizations...`);
    try {
      const response = await fetch("/api/targets/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Target scan failed");
      setMessage(`Done: ${result.targets} targets, ${result.reviewSaved} review candidates, ${result.opportunities} opportunities.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Target scan failed");
    } finally {
      setBusy(false);
    }
  }

  return <div className="ml-auto flex items-center gap-3">
    {message && <span className="max-w-md text-right text-xs text-[#68746e]" aria-live="polite">{message}</span>}
    <button className="btn h-9" onClick={run} disabled={busy}><Play size={14}/>{busy ? "Scanning..." : `Scan ${limit} targets`}</button>
  </div>;
}
