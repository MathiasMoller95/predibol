import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Predibol",
    short_name: "Predibol",
    description: "Predicciones del Mundial — grupos, ranking y más.",
    start_url: "/es/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0a0e14",
    theme_color: "#0a0e14",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
