import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "venture-forge.local";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") || host.endsWith(".local") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const title = "Venture Forge — Build a Company That Lasts";
  const description = "Start with $2,000. Build an MVP, win customers, hire a team, and survive the decisions that shape a company.";
  return {
    metadataBase: new URL(origin),
    title,
    description,
    openGraph: { title, description, type: "website", images: [{ url: "/og.png", width: 1800, height: 909, alt: "Venture Forge — a founder building a startup from one apartment desk" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
