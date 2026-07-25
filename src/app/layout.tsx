import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal Loss — Critical Infrastructure Outage Radar",
  description:
    "Live tracking of internet outages, censorship events, and routing anomalies powered by the Cloudflare Radar API.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full min-h-full flex flex-col bg-[#0A0D12]">{children}</body>
    </html>
  );
}
