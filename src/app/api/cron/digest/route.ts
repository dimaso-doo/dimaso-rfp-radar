import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { getOpportunities } from "@/lib/repository";

export async function GET(req: NextRequest) {
  if (process.env.CRON_SECRET && req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.RESEND_API_KEY || !process.env.DIGEST_TO) {
    return NextResponse.json({ skipped: true, reason: "RESEND_API_KEY or DIGEST_TO is not configured" });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dimaso-rfp-radar.vercel.app";
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const opportunities = (await getOpportunities()).filter((opportunity) => opportunity.score >= 40);
  const reviewCandidates = await db.reviewCandidate.findMany({
    where: { updatedAt: { gte: since } },
    orderBy: [{ fitScore: "desc" }, { updatedAt: "desc" }],
    take: 25,
    include: { target: true },
  });

  const opportunityRows = opportunities.slice(0, 20).map((opportunity) => `
    <li style="margin:12px 0">
      <a href="${appUrl}/opportunities/${opportunity.id}"><b>${opportunity.title}</b></a>
      — ${opportunity.organization}<br>
      <span>Score ${opportunity.score} · ${opportunity.recommendation} · deadline ${opportunity.deadline}</span>
    </li>
  `).join("");

  const reviewRows = reviewCandidates.map((candidate) => `
    <li style="margin:12px 0">
      <a href="${candidate.url}"><b>${candidate.title}</b></a>
      — ${candidate.organization ?? candidate.target?.name ?? "Unknown organization"}<br>
      <span>Score ${candidate.fitScore} · ${candidate.status} · ${candidate.reason ?? "Needs review"}</span>
    </li>
  `).join("");

  const html = `
    <h1>Dimaso RFP Radar — Daily review</h1>
    <p>Daily scan finished. Open the app review page here: <a href="${appUrl}/review">${appUrl}/review</a></p>
    <h2>Priority opportunities (${opportunities.length})</h2>
    ${opportunityRows ? `<ul>${opportunityRows}</ul>` : "<p>No priority opportunities found today.</p>"}
    <h2>New review candidates in last 24h (${reviewCandidates.length})</h2>
    ${reviewRows ? `<ul>${reviewRows}</ul>` : "<p>No new review candidates found in the last 24 hours.</p>"}
  `;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: process.env.DIGEST_FROM ?? "RFP Radar <onboarding@resend.dev>",
    to: process.env.DIGEST_TO.split(","),
    subject: `Dimaso RFP Radar — ${opportunities.length} opportunities, ${reviewCandidates.length} review candidates`,
    html,
  });

  return NextResponse.json({ sent: true, result, opportunities: opportunities.length, reviewCandidates: reviewCandidates.length });
}
