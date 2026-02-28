import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Printforge — Free 3D Print Cost Calculator",
    short_name: "Printforge",
    description: "Free 3D print cost calculator and business management software. Calculate costs, generate quotes, track jobs, and invoice clients.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
