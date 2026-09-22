import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Windows Simulator (Web)",
  description: "Create files and explore a simulated Windows-style desktop in your browser.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh overflow-hidden antialiased">{children}</body>
    </html>
  );
}
