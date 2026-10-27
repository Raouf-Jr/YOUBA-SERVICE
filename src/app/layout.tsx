import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "YOUBA SERVICE — Gestion de boutique",
    template: "%s · YOUBA SERVICE",
  },
  description:
    "Suivez les ventes, les dépenses, le stock et les bénéfices de votre boutique, jour après jour, avec des rapports et des courbes clairs.",
  applicationName: "YOUBA SERVICE",
  appleWebApp: { capable: true, title: "YOUBA", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0d" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
