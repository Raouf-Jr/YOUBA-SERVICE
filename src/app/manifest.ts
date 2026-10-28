import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YOUBA SERVICE",
    short_name: "YOUBA",
    description: "Ce qui rentre et ce qui sort, produit par produit, chaque jour.",
    lang: "fr",
    start_url: "/saisie",
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
      { name: "Saisir la journée", short_name: "Saisie", url: "/saisie" },
      { name: "Voir les rapports", short_name: "Rapports", url: "/rapports" },
    ],
  };
}
