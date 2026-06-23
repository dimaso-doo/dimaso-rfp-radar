import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getOpportunities } from "@/lib/repository";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dimaso RFP Radar",
  description: "Private opportunity intelligence for Dimaso",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <LayoutWithData>{children}</LayoutWithData>;
}

async function LayoutWithData({ children }: { children: React.ReactNode }) {
  const opportunities = await getOpportunities();
  const opportunityCount = opportunities.filter((item) => item.recommendation !== "No-bid").length;
  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body><AppShell opportunityCount={opportunityCount}>{children}</AppShell></body>
    </html>
  );
}
