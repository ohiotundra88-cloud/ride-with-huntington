import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

/**
 * Standard TanStack Start build. The server target is chosen with NITRO_PRESET:
 *   - "cloudflare-module" (default): Cloudflare Workers, used for the hosted Hub today
 *   - "node-server": a plain Node server, e.g. Azure App Service / Container Apps
 */
const preset = process.env.NITRO_PRESET ?? "cloudflare-module";

export default defineConfig(({ command, mode }) => {
  const viteEnv = loadEnv(mode, process.cwd(), "VITE_");
  return {
    define: Object.fromEntries(
      Object.entries(viteEnv).map(([k, v]) => [`import.meta.env.${k}`, JSON.stringify(v)]),
    ),
    css: { transformer: "lightningcss" },
    resolve: {
      alias: { "@": `${process.cwd()}/src` },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    plugins: [
      tailwindcss(),
      tsConfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
        // src/server.ts wraps the request handler with our SSR error page.
        server: { entry: "server" },
      }),
      ...(command === "build"
        ? [
            nitro({
              preset,
              ...(preset === "cloudflare-module"
                ? { cloudflare: { nodeCompat: true, deployConfig: false } }
                : {}),
            }),
          ]
        : []),
      viteReact(),
    ],
  };
});
