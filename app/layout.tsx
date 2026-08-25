import type { Metadata } from "next";
import "./globals.css";

const title = "Venture Forge — Build a Company That Lasts";
const description = "Start with $2,000. Work from one apartment desk, build an MVP, win customers, hire a team, and survive the decisions that shape a company.";

export const metadata: Metadata = {
  metadataBase: new URL("https://venture-forge-founder-sim.joannesaputra.chatgpt.site"),
  title,
  description,
  openGraph: { title, description, type: "website", images: [{ url: "/og.png", width: 1800, height: 909, alt: "Venture Forge — a founder building a startup from one apartment desk" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
