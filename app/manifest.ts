import type { MetadataRoute } from "next";
import { APP_NAME, APP_SHORT_NAME, LOGO_PATH } from "@/lib/utils";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: "Cosmetics Stock Management",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f7f4",
    theme_color: "#5c2d4a",
    icons: [
      {
        src: LOGO_PATH,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: LOGO_PATH,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
