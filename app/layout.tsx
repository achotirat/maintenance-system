import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Preventive Maintenance System",
  description: "Multi-tenant SaaS for property maintenance management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
