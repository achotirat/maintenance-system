import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DueSpot — Preventive Maintenance",
  description: "Never miss a maintenance date again. Track devices, schedules, warranties and repairs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&family=Inter+Tight:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[var(--bg)] text-[var(--tx)]">
        {children}
      </body>
    </html>
  );
}
