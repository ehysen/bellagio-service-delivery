import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SNAP Eligibility Agent — Proof of Concept",
  description:
    "Decision-support and pre-certification QC for the Maryland Food Supplement Program (FY2026). Every determination is citation-backed; a human decides.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
