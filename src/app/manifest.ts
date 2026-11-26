import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vikings Athletes",
    short_name: "Vikings",
    description: "Ton niveau, ta progression, ta communauté Vikings.",
    start_url: "/accueil",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
