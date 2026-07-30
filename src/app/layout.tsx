import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HORUS — Global OSINT & Threat Intelligence Radar",
  description:
    "Live internet outages, BGP hijacks and DDoS attack origins, real-time flight tracking, and URL threat investigation — powered by Cloudflare Radar, OpenSky Network, and Cloudflare URL Scanner.",
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
