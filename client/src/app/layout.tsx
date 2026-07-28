import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { BuizzPageLoader } from "@/components/common/BuizzPageLoader";
import { GlobalProviders } from "@/providers/GlobalProviders";
import "@/styles/globals.css";

// Force every route in the app to render dynamically.
// This prevents Next.js from attempting static pre-rendering of
// auth-gated pages and avoids _ssgManifest.js build race conditions.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.buizz.com"),
  title: {
    default: "Buizz | Maharashtra Experience Discovery",
    template: "%s | Buizz",
  },
  description:
    "Discover and book events, concerts, plays, workshops, activities, communities, tourism experiences, and digital events across Maharashtra.",
  keywords: [
    "Buizz",
    "events in Maharashtra",
    "events in Pune",
    "concert booking",
    "plays booking",
    "activities booking",
    "event tickets",
    "Maharashtra experiences",
  ],
  authors: [{ name: "Buizz" }],
  creator: "Buizz",
  publisher: "Buizz",
  applicationName: "Buizz",
  category: "Event Booking",
  openGraph: {
    type: "website",
    siteName: "Buizz",
    title: "Buizz | Maharashtra Experience Discovery",
    description:
      "Discover and book events, concerts, plays, workshops, activities, and tourism experiences across Maharashtra.",
    url: "https://www.buizz.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Buizz | Maharashtra Experience Discovery",
    description:
      "Discover and book events, concerts, plays, workshops, activities, and tourism experiences across Maharashtra.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F9FD" },
    { media: "(prefers-color-scheme: dark)", color: "#08000B" },
  ],
  colorScheme: "light dark",
};

const themeBootScript = `
(function () {
  try {
    var saved = localStorage.getItem("buizz-theme");
    var theme = saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
    var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    var resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;

    var root = document.documentElement;

    root.classList.remove("light", "dark");
    root.classList.add(resolved);

    root.dataset.theme = theme;
    root.dataset.resolvedTheme = resolved;

    root.style.colorScheme = resolved;
  } catch (error) {
    var root = document.documentElement;
    root.classList.remove("dark");
    root.classList.add("light");
    root.dataset.theme = "light";
    root.dataset.resolvedTheme = "light";
    root.style.colorScheme = "light";
  }
})();
`;

const staleChunkRecoveryScript = `
(function () {
  var key = "buizz-chunk-recovery";
  var recover = function (reason) {
    var text = String(reason && (reason.message || reason.reason || reason) || "");
    if (!/ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(text)) return;
    try {
      var last = Number(sessionStorage.getItem(key) || "0");
      if (Date.now() - last < 30000) return;
      sessionStorage.setItem(key, String(Date.now()));
    } catch (_) {}
    var url = new URL(window.location.href);
    url.searchParams.set("_build", String(Date.now()));
    window.location.replace(url.toString());
  };
  window.addEventListener("error", function (event) { recover(event.error || event.message); });
  window.addEventListener("unhandledrejection", function (event) { recover(event.reason); });
})();
`;

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script
          id="buizz-theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeBootScript }}
        />
        <Script
          id="buizz-stale-chunk-recovery"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: staleChunkRecoveryScript }}
        />
      </head>

      <body
        suppressHydrationWarning
        className="min-h-dvh overflow-x-hidden bg-[var(--app-background)] font-[var(--font-ui)] text-[var(--app-foreground)] antialiased"
      >
        <GlobalProviders>
          <BuizzPageLoader />
          {children}
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </GlobalProviders>
      </body>
    </html>
  );
}
