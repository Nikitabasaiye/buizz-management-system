import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@/styles/globals.css";
import { GlobalProviders } from "@/providers/GlobalProviders";

export const metadata: Metadata = {
  title: "Buizz | Maharashtra Experience Discovery",
  description:
    "Discover and book events, movies, concerts, workshops, communities, tourism experiences, and digital events across Maharashtra.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#090a12",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <GlobalProviders>{children}</GlobalProviders>
      </body>
    </html>
  );
}
