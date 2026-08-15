/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import esbuild from "esbuild";
import fs from "node:fs";
const wgslMinify = {
  name: "wgsl-minify",
  setup(build) {
    build.onLoad({ filter: /\.wgsl$/ }, async (args) => {
      let text = await fs.promises.readFile(args.path, "utf8");
      text = text
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "")
        .replace(/\s+/g, " ")
        .trim();
      return { contents: text, loader: "text" };
    });
  }
};
const common = {
  bundle: true,
  platform: "browser",
  target: ["es2023"],
  external: ["node:*"],
  loader: { ".wasm": "file" },
  plugins: [wgslMinify],
  assetNames: "[name]",
  logLevel: "info"
};
try {
  await esbuild.build({
    ...common,
    entryPoints: ["./typescript/index.ts"],
    define: {
      __WASMGPU_BASE_URL__: "import.meta.url"
    },
    format: "esm",
    minify: false,
    outfile: "./release/WasmGPU.js"
  });
  await esbuild.build({
    ...common,
    entryPoints: ["./typescript/index.ts"],
    define: {
      __WASMGPU_BASE_URL__: "import.meta.url"
    },
    format: "esm",
    minify: true,
    outfile: "./release/WasmGPU.min.js"
  });
  await esbuild.build({
    ...common,
    entryPoints: ["./typescript/index.iife.ts"],
    define: {
      __WASMGPU_BASE_URL__: "\"__CURRENT_SCRIPT__\""
    },
    format: "iife",
    globalName: "WasmGPU",
    minify: true,
    outfile: "./release/WasmGPU.iife.min.js",
    footer: {
      js: `
(() => {
  const g = globalThis;
  if (g.WasmGPU && g.WasmGPU.default) g.WasmGPU = g.WasmGPU.default;
})();`
    }
  });
  fs.copyFileSync("./wasm/wasm.wasm", "./release/wasm.wasm");
  fs.copyFileSync("./wasm/wasm.js", "./release/wasm.js");
} catch (e) {
  process.exit(1);
}
