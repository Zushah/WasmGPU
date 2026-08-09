/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { firefox } from "@playwright/test";

const firefoxDirectory = dirname(firefox.executablePath());
const preferencesDirectories = [
    join(firefoxDirectory, "browser", "defaults", "preferences"),
    join(firefoxDirectory, "defaults", "pref")
];
let preferencesDirectory;
for (const directory of preferencesDirectories) {
    try {
        if ((await stat(join(directory, "00-playwright-prefs.js"))).isFile()) { preferencesDirectory = directory; break; }
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }
}
if (!preferencesDirectory) throw new Error(`Firefox startup preferences directory is unavailable next to: ${firefox.executablePath()}`);
const preferencesPath = join(preferencesDirectory, "99-wasmgpu-webgpu.js");

const preferences = `// WasmGPU CI WebGPU startup preferences.
pref("dom.webgpu.enabled", true);
pref("dom.webgpu.allow-in-parent", true);
pref("gfx.webgpu.ignore-blocklist", true);
`;

await writeFile(preferencesPath, preferences, "utf8");
console.log(`Configured Firefox WebGPU startup preferences: ${preferencesPath}`);
