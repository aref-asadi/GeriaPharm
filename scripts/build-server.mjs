import { build } from "esbuild";
await build({
  entryPoints: {
    index: "server/index.ts",
    "reset-admin": "scripts/reset-admin.ts",
    backup: "scripts/backup.ts",
  },
  outdir: "dist-server",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  packages: "external",
  sourcemap: true,
});
