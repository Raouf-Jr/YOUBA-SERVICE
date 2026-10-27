import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YOUBA SERVICE — Gestion de boutique",
    short_name: "YOUBA",
    description: "Ventes, dépenses, stock et bénéfices de votre boutique, au jour le jour.",
    lang: "fr",
    start_url: "/tableau-de-bord",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f4ef",
    theme_color: "#0f766e",
    categories: ["business", "finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Saisir les ventes", short_name: "Ventes", url: "/ventes" },
      { name: "Ajouter une dépense", short_name: "Dépense", url: "/depenses" },
    ],
  };
}
