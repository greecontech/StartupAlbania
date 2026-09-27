import type { Metadata } from "next";
import "@fontsource/ibm-plex-serif/400.css";
import "@fontsource/ibm-plex-serif/500.css";
import "@fontsource/ibm-plex-serif/400-italic.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Greecon Platform", template: "%s · Greecon Platform" },
  description: "Operational platform for energy, water and agriculture monitoring — Greecon shpk."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
