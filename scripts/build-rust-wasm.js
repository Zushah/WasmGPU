/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/*
    ./scripts/build-rust-wasm.js builds the Rust WebAssembly driver of WasmGPU.

    It generates:
        - ./wasm/wasm.wasm (WebAssembly binary)
        - ./wasm/wasm.wat  (WebAssembly text format)
        - ./wasm/wasm.js   (JavaScript bridge)
        - ./wasm/wasm.d.ts (TypeScript declarations)
    It downloads:
        - ./tools/wabt/1.0.41/ (WABT for generating wasm.wat with wasm2wat.exe)
        - ./tools/binaryen/version_131/ (Binaryen for optimizing wasm.wasm with wasm-opt.exe)

    This file is intentionally self-contained so that building WasmGPU with `npm run build` is as straightforward as possible.
*/

import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import https from "node:https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = resolve(__dirname, "..");
const RUST_DIR = join(ROOT, "rust");
const WASM_DIR = join(ROOT, "wasm");
const TOOLS_DIR = join(ROOT, "tools");

const CRATE_NAME = "wasmgpu";
const WASM_TARGET = "wasm32-unknown-unknown";
const PROFILE_DIR = "release";

const WABT_VERSION = "1.0.41";
const BINARYEN_VERSION = "version_131";

const envFlag = (name, defaultValue) => {
    const raw = process.env[name];
    if (raw === undefined || raw === null || raw === "") return defaultValue;
    const v = String(raw).trim().toLowerCase();
    if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
    if (v === "0" || v === "false" || v === "no" || v === "off") return false;
    return defaultValue;
};

const ENABLE_SIMD = envFlag("WASMGPU_SIMD", true);
const ENABLE_SHARED_MEMORY = envFlag("WASMGPU_SHARED_MEMORY", false);
const SHARED_MEMORY_INITIAL_MB = (() => {
    const raw = Number.parseInt(process.env.WASMGPU_SHARED_MEMORY_INITIAL_MB ?? "0", 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
})();
const SHARED_MEMORY_MAX_MB = (() => {
    const raw = Number.parseInt(process.env.WASMGPU_SHARED_MEMORY_MAX_MB ?? "0", 10);
    const v = Number.isFinite(raw) && raw > 0 ? raw : 1024;
    return v;
})();
const ENABLE_WASM_OPT = envFlag("WASMGPU_WASM_OPT", true);
const WASM_OPT_LEVEL = (process.env.WASMGPU_WASM_OPT_LEVEL ?? "O3").trim();
const WASM_OPT_CONVERGE = envFlag("WASMGPU_WASM_OPT_CONVERGE", false);

const withEnv = (extraEnv) => { if (!extraEnv) return process.env; return { ...process.env, ...extraEnv }; };

const run = (cmd, cwd, env) => { execSync(cmd, { cwd, stdio: "inherit", env: withEnv(env) }); };

const tryRun = (cmd, cwd, env) => { try { execSync(cmd, { cwd, stdio: "inherit", shell: true, env: withEnv(env) }); return true; } catch { return false; } };

const quote = (p) => `"${String(p).replaceAll(`"`, `\\"`)}"`;

const wabtExeName = () => process.platform === "win32" ? "wasm2wat.exe" : "wasm2wat";

const findWasm2WatBin = (rootDir) => {
    const exe = wabtExeName();
    const directCandidates = [join(rootDir, "bin", exe), join(rootDir, `wabt-${WABT_VERSION}`, "bin", exe), join(rootDir, exe)];
    for (const c of directCandidates) if (existsSync(c)) return c;
    try {
        const ents = readdirSync(rootDir, { withFileTypes: true });
        for (const ent of ents) {
            if (!ent.isDirectory()) continue;
            const c1 = join(rootDir, ent.name, "bin", exe);
            if (existsSync(c1)) return c1;
            const c2 = join(rootDir, ent.name, exe);
            if (existsSync(c2)) return c2;
        }
    } catch { /* ignore */ }
    return null;
};

const wabtAssetCandidates = () => {
    const v = WABT_VERSION;
    if (process.platform === "win32") {
        if (process.arch === "arm64") return [{ kind: "targz", asset: `wabt-${v}-windows-arm64.tar.gz` }];
        return [{ kind: "targz", asset: `wabt-${v}-windows-x64.tar.gz` }];
    }
    if (process.platform === "linux") {
        if (process.arch === "arm64") return [{ kind: "targz", asset: `wabt-${v}-linux-arm64.tar.gz` }];
        return [{ kind: "targz", asset: `wabt-${v}-linux-x64.tar.gz` }];
    }
    if (process.platform === "darwin") {
        if (process.arch === "arm64") return [{ kind: "targz", asset: `wabt-${v}-macos-arm64.tar.gz` }];
        return [{ kind: "targz", asset: `wabt-${v}-macos-x64.tar.gz` }];
    }
    return [];
};

const downloadTo = async (url, outPath) => {
    if (typeof fetch === "function") {
        const res = await fetch(url, { redirect: "follow" });
        if (!res.ok) {
            const err = new Error(`Download failed: ${res.status} ${res.statusText}`);
            err.status = res.status;
            throw err;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        writeFileSync(outPath, buf);
        return;
    }
    await new Promise((resolve, reject) => {
        const get = (u, depth) => {
            if (depth > 8) { reject(new Error(`Too many redirects while downloading ${url}`)); return; }
            https.get(u, (res) => {
                const status = res.statusCode || 0;
                const loc = res.headers.location;
                if (status >= 300 && status < 400 && loc) {
                    res.resume();
                    get(loc, depth + 1);
                    return;
                }
                if (status < 200 || status >= 300) {
                    res.resume();
                    const err = new Error(`Download failed: ${status}`);
                    err.status = status;
                    reject(err);
                    return;
                }
                const chunks = [];
                res.on("data", (d) => chunks.push(d));
                res.on("end", () => { writeFileSync(outPath, Buffer.concat(chunks)); resolve(); });
            }).on("error", reject);
        };
        get(url, 0);
    });
};

const extractZip = async (zipPath, destDir) => {
    mkdirSync(destDir, { recursive: true });
    if (process.platform === "win32") {
        const ps = [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            `Expand-Archive -Path ${quote(zipPath)} -DestinationPath ${quote(destDir)} -Force`
        ].join(" ");
        if (!tryRun(ps, ROOT)) throw new Error("Failed to extract WABT zip via PowerShell Expand-Archive.");
        return;
    }
    if (!tryRun(`unzip -o ${quote(zipPath)} -d ${quote(destDir)}`, ROOT)) throw new Error("Failed to extract WABT zip. Install 'unzip' or use a tar.gz WABT asset.");
};

const extractTarGz = async (tgzPath, destDir) => {
    mkdirSync(destDir, { recursive: true });
    if (!tryRun(`tar -xzf ${quote(tgzPath)} -C ${quote(destDir)}`, ROOT)) throw new Error("Failed to extract tar.gz. Ensure 'tar' is installed/available.");
};

const ensureWabtWasm2Wat = async () => {
    const wabtRoot = join(TOOLS_DIR, "wabt", WABT_VERSION);
    const existing = findWasm2WatBin(wabtRoot);
    if (existing) return existing;
    mkdirSync(wabtRoot, { recursive: true });
    const baseUrl = `https://www.github.com/WebAssembly/wabt/releases/download/${WABT_VERSION}`;
    const candidates = wabtAssetCandidates();
    if (candidates.length === 0) throw new Error(`No WABT asset candidates for platform ${process.platform}/${process.arch}`);
    let picked = null;
    let archivePath = null;
    for (const c of candidates) {
        const url = `${baseUrl}/${c.asset}`;
        const out = join(wabtRoot, c.asset);
        try {
            console.log(`WABT: downloading ${url}`);
            await downloadTo(url, out);
            picked = c;
            archivePath = out;
            break;
        } catch (e) {
            const status = e && typeof e === "object" ? e.status : undefined;
            if (status === 404) continue;
            throw e;
        }
    }
    if (!picked || !archivePath) { const tried = candidates.map((c) => c.asset).join(", "); throw new Error(`WABT: failed to download any asset for ${process.platform}/${process.arch}. Tried: ${tried}`); }
    console.log(`WABT: extracting ${picked.asset} -> ${wabtRoot}`);
    if (picked.kind === "zip") await extractZip(archivePath, wabtRoot);
    else await extractTarGz(archivePath, wabtRoot);
    const bin = findWasm2WatBin(wabtRoot);
    if (!bin) throw new Error(`WABT: extracted but ${wabtExeName()} not found under ${wabtRoot}`);
    return bin;
};

const binaryenExeName = () => process.platform === "win32" ? "wasm-opt.exe" : "wasm-opt";

const findWasmOptBin = (rootDir) => {
    const exe = binaryenExeName();
    const directCandidates = [
        join(rootDir, "bin", exe),
        join(rootDir, `binaryen-${BINARYEN_VERSION}`, "bin", exe),
        join(rootDir, exe),
    ];
    for (const c of directCandidates) if (existsSync(c)) return c;
    try {
        const ents = readdirSync(rootDir, { withFileTypes: true });
        for (const ent of ents) {
            if (!ent.isDirectory()) continue;
            const c1 = join(rootDir, ent.name, "bin", exe);
            if (existsSync(c1)) return c1;
            const c2 = join(rootDir, ent.name, exe);
            if (existsSync(c2)) return c2;
        }
    } catch { /* ignore */ }
    return null;
};

const binaryenAssetCandidates = () => {
    const v = BINARYEN_VERSION;
    if (process.platform === "win32") {
        if (process.arch === "arm64") return [{ kind: "targz", asset: `binaryen-${v}-arm64-windows.tar.gz` }];
        return [{ kind: "targz", asset: `binaryen-${v}-x86_64-windows.tar.gz` }];
    }
    if (process.platform === "linux") {
        if (process.arch === "arm64") return [{ kind: "targz", asset: `binaryen-${v}-aarch64-linux.tar.gz` }];
        return [{ kind: "targz", asset: `binaryen-${v}-x86_64-linux.tar.gz` }];
    }
    if (process.platform === "darwin") {
        if (process.arch === "arm64") return [{ kind: "targz", asset: `binaryen-${v}-arm64-macos.tar.gz` }];
        return [{ kind: "targz", asset: `binaryen-${v}-x86_64-macos.tar.gz` }];
    }
    return [];
};

const ensureBinaryenWasmOpt = async () => {
    const binaryenRoot = join(TOOLS_DIR, "binaryen", BINARYEN_VERSION);
    const existing = findWasmOptBin(binaryenRoot);
    if (existing) return existing;
    mkdirSync(binaryenRoot, { recursive: true });
    const baseUrl = `https://www.github.com/WebAssembly/binaryen/releases/download/${BINARYEN_VERSION}`;
    const candidates = binaryenAssetCandidates();
    if (candidates.length === 0) throw new Error(`No Binaryen asset candidates for platform ${process.platform}/${process.arch}`);
    let picked = null;
    let archivePath = null;
    for (const c of candidates) {
        const url = `${baseUrl}/${c.asset}`;
        const out = join(binaryenRoot, c.asset);
        try {
            console.log(`Binaryen: downloading ${url}`);
            await downloadTo(url, out);
            picked = c;
            archivePath = out;
            break;
        } catch (e) {
            const status = e && typeof e === "object" ? e.status : undefined;
            if (status === 404) continue;
            throw e;
        }
    }
    if (!picked || !archivePath) { const tried = candidates.map((c) => c.asset).join(", "); throw new Error(`Binaryen: failed to download any asset for ${process.platform}/${process.arch}. Tried: ${tried}`); }
    console.log(`Binaryen: extracting ${picked.asset} -> ${binaryenRoot}`);
    if (picked.kind === "zip") await extractZip(archivePath, binaryenRoot);
    else await extractTarGz(archivePath, binaryenRoot);
    const bin = findWasmOptBin(binaryenRoot);
    if (!bin) throw new Error(`Binaryen: extracted but ${binaryenExeName()} not found under ${binaryenRoot}`);
    return bin;
};

const formatBytes = (n) => {
    const bytes = Number(n) || 0;
    const units = ["B", "KB", "MB", "GB"];
    let v = bytes;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    const s = i === 0 ? `${v}` : v.toFixed(2);
    return `${s} ${units[i]}`;
};

const normalizeWasmOptLevel = (raw) => {
    const v = String(raw ?? "").trim();
    if (v.length === 0) return "-O3";
    if (v.startsWith("-")) return v;
    if (/^O[0-4sz]$/i.test(v)) return `-${v}`;
    if (/^[0-4]$/.test(v)) return `-O${v}`;
    return v;
};

mkdirSync(WASM_DIR, { recursive: true });
mkdirSync(TOOLS_DIR, { recursive: true });

console.log(
    `Rust build config: ` +
    `SIMD=${ENABLE_SIMD ? "on" : "off"} ` +
    `shared-memory=${ENABLE_SHARED_MEMORY ? "on" : "off"} ` +
    `wasm-opt=${ENABLE_WASM_OPT ? "on" : "off"} ` +
    `(level=${normalizeWasmOptLevel(WASM_OPT_LEVEL)} converge=${WASM_OPT_CONVERGE ? "on" : "off"})`
);

const rustEnv = (() => {
    const base = (process.env.RUSTFLAGS ?? "").trim();
    const flags = [];
    if (ENABLE_SIMD && !base.includes("simd128")) flags.push("-C target-feature=+simd128");
    if (ENABLE_SHARED_MEMORY) {
        if (!base.includes("atomics")) flags.push("-C target-feature=+atomics,+bulk-memory,+mutable-globals");
        const PAGE_BYTES = 65536;
        const alignUp = (n, align) => Math.ceil(n / align) * align;
        const initialBytes = (SHARED_MEMORY_INITIAL_MB > 0) ? alignUp(SHARED_MEMORY_INITIAL_MB * 1024 * 1024, PAGE_BYTES) : 0;
        const maxBytes = alignUp(SHARED_MEMORY_MAX_MB * 1024 * 1024, PAGE_BYTES);
        if (initialBytes > 0 && initialBytes > maxBytes) throw new Error(`WASMGPU_SHARED_MEMORY_INITIAL_MB (${SHARED_MEMORY_INITIAL_MB}) exceeds WASMGPU_SHARED_MEMORY_MAX_MB (${SHARED_MEMORY_MAX_MB})`);
        flags.push("-C link-arg=--shared-memory");
        flags.push("-C link-arg=--export-memory");
        flags.push(`-C link-arg=--max-memory=${maxBytes}`);
        if (initialBytes > 0) flags.push(`-C link-arg=--initial-memory=${initialBytes}`);
    }
    const merged = [base, ...flags].filter((s) => s && s.length > 0).join(" ").trim();
    return merged.length > 0 ? { RUSTFLAGS: merged } : undefined;
})();

run(`cargo build --release --target ${WASM_TARGET}`, RUST_DIR, rustEnv);

const wasmIn = join(RUST_DIR, "target", WASM_TARGET, PROFILE_DIR, `${CRATE_NAME}.wasm`);
const wasmTmp = join(WASM_DIR, "wasm.tmp.wasm");
const wasmOut = join(WASM_DIR, "wasm.wasm");
copyFileSync(wasmIn, wasmTmp);

let didWasmOpt = false;
if (ENABLE_WASM_OPT) {
    const optLevel = normalizeWasmOptLevel(WASM_OPT_LEVEL);
    const cmdArgs = [
        quote(wasmTmp),
        "-o",
        quote(wasmOut),
        optLevel,
        WASM_OPT_CONVERGE ? "--converge" : "",
        "--strip-debug",
        "--strip-dwarf",
        "--strip-producers",
        "--all-features"
    ].filter((x) => x && String(x).length > 0).join(" ");
    let downloadedWasmOpt = null;
    try { downloadedWasmOpt = await ensureBinaryenWasmOpt(); } catch (e) { console.log(`Binaryen: auto-download unavailable (${e?.message ?? e}). Falling back to system wasm-opt.`); }
    if (downloadedWasmOpt) didWasmOpt = tryRun(`${quote(downloadedWasmOpt)} ${cmdArgs}`, ROOT);
    if (!didWasmOpt) didWasmOpt = tryRun(`wasm-opt ${cmdArgs}`, ROOT);
    if (didWasmOpt) {
        const inSize = statSync(wasmTmp).size, outSize = statSync(wasmOut).size;
        console.log(`Optimized WASM                  -> ./wasm/wasm.wasm (${formatBytes(inSize)} -> ${formatBytes(outSize)})`);
    } else console.log(`WASM not optimized (wasm-opt unavailable).`);
}

if (!didWasmOpt) {
    copyFileSync(wasmTmp, wasmOut);
    const outSize = statSync(wasmOut).size;
    console.log(`WASM: copied raw wasm           -> ./wasm/wasm.wasm (${formatBytes(outSize)})`);
}

try { rmSync(wasmTmp, { force: true }); } catch { /* ignore */ }

const watOut = join(WASM_DIR, "wasm.wat");

let downloadedWasm2Wat = null;
try { downloadedWasm2Wat = await ensureWabtWasm2Wat(); } catch (e) { console.log(`WABT: auto-download unavailable (${e?.message ?? e}). Falling back to system tools.`); }

const madeWat = (downloadedWasm2Wat ? (tryRun(`${quote(downloadedWasm2Wat)} --enable-all ${quote(wasmOut)} -o ${quote(watOut)}`, ROOT) || tryRun(`${quote(downloadedWasm2Wat)} ${quote(wasmOut)} -o ${quote(watOut)}`, ROOT)) : false) || tryRun(`wasm2wat --enable-all ${quote(wasmOut)} -o ${quote(watOut)}`, ROOT) || tryRun(`wasm2wat ${quote(wasmOut)} -o ${quote(watOut)}`, ROOT) || tryRun(`wasm-tools print ${quote(wasmOut)} > ${quote(watOut)}`, ROOT);

if (madeWat) console.log(`Generated WAT                   -> ./wasm/wasm.wat`);
else console.log(`Note: ./wasm/wasm.wat not generated (auto-download failed and no system wasm2wat/wasm-tools found).`);

const wasmBytes = readFileSync(wasmOut);
const wasmBase64 = wasmBytes.toString("base64");

const generateWasmLoaderJS = (wasmB64) => `// Generated by ./scripts/build-rust-wasm.js.

const __wasmBase64 = "${wasmB64}";

async function __getWasmBytes() {
  try {
    const res = await fetch(new URL("./wasm.wasm", import.meta.url));
    if (res.ok) return new Uint8Array(await res.arrayBuffer());
  } catch (_) {
    // ignore
  }
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(__wasmBase64, "base64"));
  const binStr = atob(__wasmBase64);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
  return bytes;
}

const __bytes = await __getWasmBytes();
const { instance } = await WebAssembly.instantiate(__bytes, {});
const wasm = instance.exports;

export const memory = wasm.memory;

export const wasmgpu_alloc = wasm.wasmgpu_alloc;
export const wasmgpu_free = wasm.wasmgpu_free;
export const wasmgpu_alloc_f32 = wasm.wasmgpu_alloc_f32;
export const wasmgpu_free_f32 = wasm.wasmgpu_free_f32;
export const wasmgpu_alloc_f64 = wasm.wasmgpu_alloc_f64;
export const wasmgpu_free_f64 = wasm.wasmgpu_free_f64;
export const wasmgpu_alloc_u32 = wasm.wasmgpu_alloc_u32;
export const wasmgpu_free_u32 = wasm.wasmgpu_free_u32;
export const wasmgpu_seed = wasm.wasmgpu_seed;

export const wasmgpu_frame_arena_init = wasm.wasmgpu_frame_arena_init;
export const wasmgpu_frame_arena_reset = wasm.wasmgpu_frame_arena_reset;
export const wasmgpu_frame_arena_epoch = wasm.wasmgpu_frame_arena_epoch;
export const wasmgpu_frame_alloc = wasm.wasmgpu_frame_alloc;
export const wasmgpu_frame_alloc_f32 = wasm.wasmgpu_frame_alloc_f32;
export const wasmgpu_frame_alloc_f64 = wasm.wasmgpu_frame_alloc_f64;
export const wasmgpu_frame_arena_used = wasm.wasmgpu_frame_arena_used;
export const wasmgpu_frame_arena_cap = wasm.wasmgpu_frame_arena_cap;

export const f32view = (ptr, len) => new Float32Array(memory.buffer, ptr, len);
export const f64view = (ptr, len) => new Float64Array(memory.buffer, ptr, len);
export const u32view = (ptr, len) => new Uint32Array(memory.buffer, ptr, len);
export const i32view = (ptr, len) => new Int32Array(memory.buffer, ptr, len);
export const u8view = (ptr, len) => new Uint8Array(memory.buffer, ptr, len);

export const transform_compose_local_many = wasm.transform_compose_local_many;
export const transform_update_world_ordered = wasm.transform_update_world_ordered;
export const transform_update_partial_ordered = wasm.transform_update_partial_ordered;
export const transform_pack_model_normal_mat4_from_ptrs = wasm.transform_pack_model_normal_mat4_from_ptrs;

export const cull_write_planes_from_view_projection = wasm.cull_write_planes_from_view_projection;
export const cull_prepare_world_spheres_from_ptrs = wasm.cull_prepare_world_spheres_from_ptrs;
export const cull_spheres_frustum = wasm.cull_spheres_frustum;
export const cull_spheres_occlusion = wasm.cull_spheres_occlusion;

export const bounds_pointcloud_xyzs = wasm.bounds_pointcloud_xyzs;
export const bounds_glyph_instances = wasm.bounds_glyph_instances;
export const bounds_geometry_positions = wasm.bounds_geometry_positions;

export const accessor_deinterleave = wasm.accessor_deinterleave;
export const accessor_apply_sparse = wasm.accessor_apply_sparse;
export const accessor_convert_to_f32 = wasm.accessor_convert_to_f32;
export const accessor_convert_to_u16 = wasm.accessor_convert_to_u16;
export const accessor_convert_to_u32 = wasm.accessor_convert_to_u32;

export const mesh_compute_vertex_normals = wasm.mesh_compute_vertex_normals;

export const anim_sample_clip_trs = wasm.anim_sample_clip_trs;
export const anim_compute_joint_matrices_to = wasm.anim_compute_joint_matrices_to;

export const ndarray_numel = wasm.ndarray_numel;
export const ndarray_strides_row_major = wasm.ndarray_strides_row_major;
export const ndarray_offset_bytes = wasm.ndarray_offset_bytes;

export const mat4f_abs = wasm.mat4f_abs;
export const mat4d_abs = wasm.mat4d_abs;
export const mat4f_add = wasm.mat4f_add;
export const mat4d_add = wasm.mat4d_add;
export const mat4f_copy = wasm.mat4f_copy;
export const mat4d_copy = wasm.mat4d_copy;
export const mat4f_decompose_trs = wasm.mat4f_decompose_trs;
export const mat4d_decompose_trs = wasm.mat4d_decompose_trs;
export const mat4f_det = wasm.mat4f_det;
export const mat4d_det = wasm.mat4d_det;
export const mat4f_identity = wasm.mat4f_identity;
export const mat4d_identity = wasm.mat4d_identity;
export const mat4f_init = wasm.mat4f_init;
export const mat4d_init = wasm.mat4d_init;
export const mat4f_invert = wasm.mat4f_invert;
export const mat4d_invert = wasm.mat4d_invert;
export const mat4f_isEqual = wasm.mat4f_isEqual;
export const mat4d_isEqual = wasm.mat4d_isEqual;
export const mat4f_isIdentity = wasm.mat4f_isIdentity;
export const mat4d_isIdentity = wasm.mat4d_isIdentity;
export const mat4f_isInverse = wasm.mat4f_isInverse;
export const mat4d_isInverse = wasm.mat4d_isInverse;
export const mat4f_isZero = wasm.mat4f_isZero;
export const mat4d_isZero = wasm.mat4d_isZero;
export const mat4f_lookAt = wasm.mat4f_lookAt;
export const mat4d_lookAt = wasm.mat4d_lookAt;
export const mat4f_mul = wasm.mat4f_mul;
export const mat4d_mul = wasm.mat4d_mul;
export const mat4f_mul_vec4 = wasm.mat4f_mul_vec4;
export const mat4d_mul_vec4 = wasm.mat4d_mul_vec4;
export const mat4f_neg = wasm.mat4f_neg;
export const mat4d_neg = wasm.mat4d_neg;
export const mat4f_norm = wasm.mat4f_norm;
export const mat4d_norm = wasm.mat4d_norm;
export const mat4f_normalize = wasm.mat4f_normalize;
export const mat4d_normalize = wasm.mat4d_normalize;
export const mat4f_normsq = wasm.mat4f_normsq;
export const mat4d_normsq = wasm.mat4d_normsq;
export const mat4f_perspective = wasm.mat4f_perspective;
export const mat4d_perspective = wasm.mat4d_perspective;
export const mat4f_random = wasm.mat4f_random;
export const mat4d_random = wasm.mat4d_random;
export const mat4f_random_range = wasm.mat4f_random_range;
export const mat4d_random_range = wasm.mat4d_random_range;
export const mat4f_rotateX = wasm.mat4f_rotateX;
export const mat4d_rotateX = wasm.mat4d_rotateX;
export const mat4f_rotateY = wasm.mat4f_rotateY;
export const mat4d_rotateY = wasm.mat4d_rotateY;
export const mat4f_rotateZ = wasm.mat4f_rotateZ;
export const mat4d_rotateZ = wasm.mat4d_rotateZ;
export const mat4f_round = wasm.mat4f_round;
export const mat4d_round = wasm.mat4d_round;
export const mat4f_scl = wasm.mat4f_scl;
export const mat4d_scl = wasm.mat4d_scl;
export const mat4f_sub = wasm.mat4f_sub;
export const mat4d_sub = wasm.mat4d_sub;
export const mat4f_trace = wasm.mat4f_trace;
export const mat4d_trace = wasm.mat4d_trace;
export const mat4f_translate = wasm.mat4f_translate;
export const mat4d_translate = wasm.mat4d_translate;
export const mat4f_transpose = wasm.mat4f_transpose;
export const mat4d_transpose = wasm.mat4d_transpose;
export const mat4f_print = wasm.mat4f_print;
export const mat4d_print = wasm.mat4d_print;

export const quatf_abs = wasm.quatf_abs;
export const quatd_abs = wasm.quatd_abs;
export const quatf_add = wasm.quatf_add;
export const quatd_add = wasm.quatd_add;
export const quatf_copy = wasm.quatf_copy;
export const quatd_copy = wasm.quatd_copy;
export const quatf_dist = wasm.quatf_dist;
export const quatd_dist = wasm.quatd_dist;
export const quatf_distsq = wasm.quatf_distsq;
export const quatd_distsq = wasm.quatd_distsq;
export const quatf_fromAxisAngle = wasm.quatf_fromAxisAngle;
export const quatd_fromAxisAngle = wasm.quatd_fromAxisAngle;
export const quatf_init = wasm.quatf_init;
export const quatd_init = wasm.quatd_init;
export const quatf_invert = wasm.quatf_invert;
export const quatd_invert = wasm.quatd_invert;
export const quatf_isEqual = wasm.quatf_isEqual;
export const quatd_isEqual = wasm.quatd_isEqual;
export const quatf_isNormalized = wasm.quatf_isNormalized;
export const quatd_isNormalized = wasm.quatd_isNormalized;
export const quatf_isZero = wasm.quatf_isZero;
export const quatd_isZero = wasm.quatd_isZero;
export const quatf_mul = wasm.quatf_mul;
export const quatd_mul = wasm.quatd_mul;
export const quatf_neg = wasm.quatf_neg;
export const quatd_neg = wasm.quatd_neg;
export const quatf_norm = wasm.quatf_norm;
export const quatd_norm = wasm.quatd_norm;
export const quatf_normalize = wasm.quatf_normalize;
export const quatd_normalize = wasm.quatd_normalize;
export const quatf_normscl = wasm.quatf_normscl;
export const quatd_normscl = wasm.quatd_normscl;
export const quatf_normsq = wasm.quatf_normsq;
export const quatd_normsq = wasm.quatd_normsq;
export const quatf_random = wasm.quatf_random;
export const quatd_random = wasm.quatd_random;
export const quatf_random_range = wasm.quatf_random_range;
export const quatd_random_range = wasm.quatd_random_range;
export const quatf_round = wasm.quatf_round;
export const quatd_round = wasm.quatd_round;
export const quatf_scl = wasm.quatf_scl;
export const quatd_scl = wasm.quatd_scl;
export const quatf_slerp = wasm.quatf_slerp;
export const quatd_slerp = wasm.quatd_slerp;
export const quatf_sub = wasm.quatf_sub;
export const quatd_sub = wasm.quatd_sub;
export const quatf_toRotation = wasm.quatf_toRotation;
export const quatd_toRotation = wasm.quatd_toRotation;
export const quatf_print = wasm.quatf_print;
export const quatd_print = wasm.quatd_print;

export const vec3f_abs = wasm.vec3f_abs;
export const vec3d_abs = wasm.vec3d_abs;
export const vec3f_add = wasm.vec3f_add;
export const vec3d_add = wasm.vec3d_add;
export const vec3f_ang = wasm.vec3f_ang;
export const vec3d_ang = wasm.vec3d_ang;
export const vec3f_angBetween = wasm.vec3f_angBetween;
export const vec3d_angBetween = wasm.vec3d_angBetween;
export const vec3f_copy = wasm.vec3f_copy;
export const vec3d_copy = wasm.vec3d_copy;
export const vec3f_cross = wasm.vec3f_cross;
export const vec3d_cross = wasm.vec3d_cross;
export const vec3f_dist = wasm.vec3f_dist;
export const vec3d_dist = wasm.vec3d_dist;
export const vec3f_distsq = wasm.vec3f_distsq;
export const vec3d_distsq = wasm.vec3d_distsq;
export const vec3f_dot = wasm.vec3f_dot;
export const vec3d_dot = wasm.vec3d_dot;
export const vec3f_init = wasm.vec3f_init;
export const vec3d_init = wasm.vec3d_init;
export const vec3f_interp = wasm.vec3f_interp;
export const vec3d_interp = wasm.vec3d_interp;
export const vec3f_isEqual = wasm.vec3f_isEqual;
export const vec3d_isEqual = wasm.vec3d_isEqual;
export const vec3f_isNormalized = wasm.vec3f_isNormalized;
export const vec3d_isNormalized = wasm.vec3d_isNormalized;
export const vec3f_isOrthogonal = wasm.vec3f_isOrthogonal;
export const vec3d_isOrthogonal = wasm.vec3d_isOrthogonal;
export const vec3f_isParallel = wasm.vec3f_isParallel;
export const vec3d_isParallel = wasm.vec3d_isParallel;
export const vec3f_isZero = wasm.vec3f_isZero;
export const vec3d_isZero = wasm.vec3d_isZero;
export const vec3f_neg = wasm.vec3f_neg;
export const vec3d_neg = wasm.vec3d_neg;
export const vec3f_norm = wasm.vec3f_norm;
export const vec3d_norm = wasm.vec3d_norm;
export const vec3f_normalize = wasm.vec3f_normalize;
export const vec3d_normalize = wasm.vec3d_normalize;
export const vec3f_normscl = wasm.vec3f_normscl;
export const vec3d_normscl = wasm.vec3d_normscl;
export const vec3f_normsq = wasm.vec3f_normsq;
export const vec3d_normsq = wasm.vec3d_normsq;
export const vec3f_oproj = wasm.vec3f_oproj;
export const vec3d_oproj = wasm.vec3d_oproj;
export const vec3f_proj = wasm.vec3f_proj;
export const vec3d_proj = wasm.vec3d_proj;
export const vec3f_random = wasm.vec3f_random;
export const vec3d_random = wasm.vec3d_random;
export const vec3f_random_range = wasm.vec3f_random_range;
export const vec3d_random_range = wasm.vec3d_random_range;
export const vec3f_reflect = wasm.vec3f_reflect;
export const vec3d_reflect = wasm.vec3d_reflect;
export const vec3f_refract = wasm.vec3f_refract;
export const vec3d_refract = wasm.vec3d_refract;
export const vec3f_round = wasm.vec3f_round;
export const vec3d_round = wasm.vec3d_round;
export const vec3f_scl = wasm.vec3f_scl;
export const vec3d_scl = wasm.vec3d_scl;
export const vec3f_sub = wasm.vec3f_sub;
export const vec3d_sub = wasm.vec3d_sub;
export const vec3f_print = wasm.vec3f_print;
export const vec3d_print = wasm.vec3d_print;

const __M0 = wasmgpu_alloc_f32(16);
const __M1 = wasmgpu_alloc_f32(16);
const __M2 = wasmgpu_alloc_f32(16);

const __Q0 = wasmgpu_alloc_f32(4);
const __Q1 = wasmgpu_alloc_f32(4);
const __Q2 = wasmgpu_alloc_f32(4);

const __V0 = wasmgpu_alloc_f32(3);
const __V1 = wasmgpu_alloc_f32(3);
const __V2 = wasmgpu_alloc_f32(3);
const __V40 = wasmgpu_alloc_f32(4);
const __V42 = wasmgpu_alloc_f32(4);

const __write = (ptr, len, arr) => {
  const v = f32view(ptr, len);
  for (let i = 0; i < len; i++) v[i] = (arr && i < arr.length) ? arr[i] : 0;
};

const __read = (ptr, len) => Array.from(f32view(ptr, len));
const __read16 = (ptr) => __read(ptr, 16);
const __read4 = (ptr) => __read(ptr, 4);
const __read3 = (ptr) => __read(ptr, 3);
const __bool = (x) => !!x;

const __mat4_unary = (fn, m) => { __write(__M0, 16, m); fn(__M2, __M0); return __read16(__M2); };
const __mat4_binary = (fn, a, b) => { __write(__M0, 16, a); __write(__M1, 16, b); fn(__M2, __M0, __M1); return __read16(__M2); };

export const mat4abs = (m) => __mat4_unary(mat4f_abs, m);
export const mat4add = (m1, m2) => __mat4_binary(mat4f_add, m1, m2);
export const mat4copy = (m) => __mat4_unary(mat4f_copy, m);
export const mat4det = (m) => { __write(__M0, 16, m); return mat4f_det(__M0); };
export const mat4identity = () => { mat4f_identity(__M2); return __read16(__M2); };
export const mat4init = (...m) => {
  const mm = new Array(16);
  for (let i = 0; i < 16; i++) mm[i] = (i < m.length ? m[i] : 0);
  mat4f_init(__M2, mm[0], mm[1], mm[2], mm[3], mm[4], mm[5], mm[6], mm[7], mm[8], mm[9], mm[10], mm[11], mm[12], mm[13], mm[14], mm[15]);
  return __read16(__M2);
};
export const mat4invert = (m) => __mat4_unary(mat4f_invert, m);
export const mat4isEqual = (m1, m2) => { __write(__M0, 16, m1); __write(__M1, 16, m2); return __bool(mat4f_isEqual(__M0, __M1)); };
export const mat4isIdentity = (m) => { __write(__M0, 16, m); return __bool(mat4f_isIdentity(__M0)); };
export const mat4isInverse = (m1, m2) => { __write(__M0, 16, m1); __write(__M1, 16, m2); return __bool(mat4f_isInverse(__M0, __M1)); };
export const mat4isZero = (m) => { __write(__M0, 16, m); return __bool(mat4f_isZero(__M0)); };
export const mat4lookAt = (eye, center, up) => { __write(__V0, 3, eye); __write(__V1, 3, center); __write(__V2, 3, up); mat4f_lookAt(__M2, __V0, __V1, __V2); return __read16(__M2); };
export const mat4mul = (m1, m2) => {
  __write(__M0, 16, m1);
  if (m2 && m2.length === 4) {
    __write(__V40, 4, m2);
    mat4f_mul_vec4(__V42, __M0, __V40);
    return __read4(__V42);
  }
  __write(__M1, 16, m2);
  mat4f_mul(__M2, __M0, __M1);
  return __read16(__M2);
};
export const mat4neg = (m) => __mat4_unary(mat4f_neg, m);
export const mat4norm = (m) => { __write(__M0, 16, m); return mat4f_norm(__M0); };
export const mat4normalize = (m) => __mat4_unary(mat4f_normalize, m);
export const mat4normsq = (m) => { __write(__M0, 16, m); return mat4f_normsq(__M0); };
export const mat4perspective = (fovY, aspect, near, far) => { mat4f_perspective(__M2, fovY, aspect, near, far); return __read16(__M2); };
export const mat4print = (m) => { console.log(\`[ \${m[0]} \${m[1]} \${m[2]} \${m[3]} ]\\n[ \${m[4]} \${m[5]} \${m[6]} \${m[7]} ]\\n[ \${m[8]} \${m[9]} \${m[10]} \${m[11]} ]\\n[ \${m[12]} \${m[13]} \${m[14]} \${m[15]} ]\`); };
export const mat4random = (a, b) => { mat4f_random_range(__M2, a, b); return __read16(__M2); };
export const mat4rotateX = (m, angle) => { __write(__M0, 16, m); mat4f_rotateX(__M2, __M0, angle); return __read16(__M2); };
export const mat4rotateY = (m, angle) => { __write(__M0, 16, m); mat4f_rotateY(__M2, __M0, angle); return __read16(__M2); };
export const mat4rotateZ = (m, angle) => { __write(__M0, 16, m); mat4f_rotateZ(__M2, __M0, angle); return __read16(__M2); };
export const mat4round = (m) => __mat4_unary(mat4f_round, m);
export const mat4scl = (m, n) => { __write(__M0, 16, m); mat4f_scl(__M2, __M0, n); return __read16(__M2); };
export const mat4sub = (m1, m2) => __mat4_binary(mat4f_sub, m1, m2);
export const mat4trace = (m) => { __write(__M0, 16, m); return mat4f_trace(__M0); };
export const mat4translate = (m, v) => { __write(__M0, 16, m); __write(__V0, 3, v); mat4f_translate(__M2, __M0, __V0); return __read16(__M2); };
export const mat4transpose = (m) => __mat4_unary(mat4f_transpose, m);

const __quat_unary = (fn, q) => { __write(__Q0, 4, q); fn(__Q2, __Q0); return __read4(__Q2); };
const __quat_binary = (fn, a, b) => { __write(__Q0, 4, a); __write(__Q1, 4, b); fn(__Q2, __Q0, __Q1); return __read4(__Q2); };

export const quatabs = (q) => __quat_unary(quatf_abs, q);
export const quatadd = (q1, q2) => __quat_binary(quatf_add, q1, q2);
export const quatcopy = (q) => __quat_unary(quatf_copy, q);
export const quatdist = (q1, q2) => { __write(__Q0, 4, q1); __write(__Q1, 4, q2); return quatf_dist(__Q0, __Q1); };
export const quatdistsq = (q1, q2) => { __write(__Q0, 4, q1); __write(__Q1, 4, q2); return quatf_distsq(__Q0, __Q1); };
export const quatfromAxisAngle = (axis, angle) => { __write(__V0, 3, axis); quatf_fromAxisAngle(__Q2, __V0, angle); return __read4(__Q2); };
export const quatinit = (x = 0, y = 0, z = 0, w = 0) => { quatf_init(__Q2, x, y, z, w); return __read4(__Q2); };
export const quatinvert = (q) => __quat_unary(quatf_invert, q);
export const quatisEqual = (q1, q2) => { __write(__Q0, 4, q1); __write(__Q1, 4, q2); return __bool(quatf_isEqual(__Q0, __Q1)); };
export const quatisNormalized = (q) => { __write(__Q0, 4, q); return __bool(quatf_isNormalized(__Q0)); };
export const quatisZero = (q) => { __write(__Q0, 4, q); return __bool(quatf_isZero(__Q0)); };
export const quatmul = (q1, q2) => __quat_binary(quatf_mul, q1, q2);
export const quatneg = (q) => __quat_unary(quatf_neg, q);
export const quatnorm = (q) => { __write(__Q0, 4, q); return quatf_norm(__Q0); };
export const quatnormalize = (q) => __quat_unary(quatf_normalize, q);
export const quatnormscl = (q, scalar) => { __write(__Q0, 4, q); quatf_normscl(__Q2, __Q0, scalar); return __read4(__Q2); };
export const quatnormsq = (q) => { __write(__Q0, 4, q); return quatf_normsq(__Q0); };
export const quatprint = (q) => { console.log(\`\${q[0]} \${q[1] < 0 ? "-" : "+"} \${Math.abs(q[1])}i \${q[2] < 0 ? "-" : "+"} \${Math.abs(q[2])}j \${q[3] < 0 ? "-" : "+"} \${Math.abs(q[3])}k\`); };
export const quatrandom = (a, b) => { quatf_random_range(__Q2, a, b); return __read4(__Q2); };
export const quatround = (q) => __quat_unary(quatf_round, q);
export const quatscl = (q, scalar) => { __write(__Q0, 4, q); quatf_scl(__Q2, __Q0, scalar); return __read4(__Q2); };
export const quatslerp = (q1, q2, t) => { __write(__Q0, 4, q1); __write(__Q1, 4, q2); quatf_slerp(__Q2, __Q0, __Q1, t); return __read4(__Q2); };
export const quatsub = (q1, q2) => __quat_binary(quatf_sub, q1, q2);
export const quattoRotation = (q, v) => { __write(__Q0, 4, q); __write(__V0, 3, v); quatf_toRotation(__V2, __Q0, __V0); return __read3(__V2); };

const __vec3_unary = (fn, v) => { __write(__V0, 3, v); fn(__V2, __V0); return __read3(__V2); };
const __vec3_binary = (fn, a, b) => { __write(__V0, 3, a); __write(__V1, 3, b); fn(__V2, __V0, __V1); return __read3(__V2); };

export const vec3abs = (v) => __vec3_unary(vec3f_abs, v);
export const vec3add = (v1, v2) => __vec3_binary(vec3f_add, v1, v2);
export const vec3ang = (v) => { __write(__V0, 3, v); vec3f_ang(__V2, __V0); return __read3(__V2); };
export const vec3angBetween = (v1, v2) => { __write(__V0, 3, v1); __write(__V1, 3, v2); return vec3f_angBetween(__V0, __V1); };
export const vec3copy = (v) => __vec3_unary(vec3f_copy, v);
export const vec3cross = (v1, v2) => __vec3_binary(vec3f_cross, v1, v2);
export const vec3dist = (v1, v2) => { __write(__V0, 3, v1); __write(__V1, 3, v2); return vec3f_dist(__V0, __V1); };
export const vec3distsq = (v1, v2) => { __write(__V0, 3, v1); __write(__V1, 3, v2); return vec3f_distsq(__V0, __V1); };
export const vec3dot = (v1, v2) => { __write(__V0, 3, v1); __write(__V1, 3, v2); return vec3f_dot(__V0, __V1); };
export const vec3init = (x = 0, y = 0, z = 0) => { vec3f_init(__V2, x, y, z); return __read3(__V2); };
export const vec3interp = (v, a, b, c) => { __write(__V0, 3, v); vec3f_interp(__V2, __V0, a, b, c); return __read3(__V2); };
export const vec3isEqual = (v1, v2) => { __write(__V0, 3, v1); __write(__V1, 3, v2); return __bool(vec3f_isEqual(__V0, __V1)); };
export const vec3isNormalized = (v) => { __write(__V0, 3, v); return __bool(vec3f_isNormalized(__V0)); };
export const vec3isOrthogonal = (v1, v2) => { __write(__V0, 3, v1); __write(__V1, 3, v2); return __bool(vec3f_isOrthogonal(__V0, __V1)); };
export const vec3isParallel = (v1, v2) => { __write(__V0, 3, v1); __write(__V1, 3, v2); return __bool(vec3f_isParallel(__V0, __V1)); };
export const vec3isZero = (v) => { __write(__V0, 3, v); return __bool(vec3f_isZero(__V0)); };
export const vec3neg = (v) => __vec3_unary(vec3f_neg, v);
export const vec3norm = (v) => { __write(__V0, 3, v); return vec3f_norm(__V0); };
export const vec3normalize = (v) => __vec3_unary(vec3f_normalize, v);
export const vec3normscl = (v, scalar) => { __write(__V0, 3, v); vec3f_normscl(__V2, __V0, scalar); return __read3(__V2); };
export const vec3normsq = (v) => { __write(__V0, 3, v); return vec3f_normsq(__V0); };
export const vec3oproj = (v1, v2) => __vec3_binary(vec3f_oproj, v1, v2);
export const vec3print = (v) => { console.log(\`(\${v[0]}, \${v[1]}, \${v[2]})\`); };
export const vec3proj = (v1, v2) => __vec3_binary(vec3f_proj, v1, v2);
export const vec3random = (a, b) => { vec3f_random_range(__V2, a, b); return __read3(__V2); };
export const vec3reflect = (v1, v2) => __vec3_binary(vec3f_reflect, v1, v2);
export const vec3refract = (v1, v2, refractiveIndex) => { __write(__V0, 3, v1); __write(__V1, 3, v2); vec3f_refract(__V2, __V0, __V1, refractiveIndex); return __read3(__V2); };
export const vec3round = (v) => __vec3_unary(vec3f_round, v);
export const vec3scl = (v, scalar) => { __write(__V0, 3, v); vec3f_scl(__V2, __V0, scalar); return __read3(__V2); };
export const vec3sub = (v1, v2) => __vec3_binary(vec3f_sub, v1, v2);
`;

const generateWasmDTS = () => `// Auto-generated by ./scripts/build-rust-wasm.js.

export const memory: WebAssembly.Memory;

export function wasmgpu_alloc(bytes: number): number;
export function wasmgpu_free(ptr: number, bytes: number): void;
export function wasmgpu_alloc_f32(len: number): number;
export function wasmgpu_free_f32(ptr: number, len: number): void;
export function wasmgpu_alloc_f64(len: number): number;
export function wasmgpu_free_f64(ptr: number, len: number): void;
export function wasmgpu_alloc_u32(len: number): number;
export function wasmgpu_free_u32(ptr: number, len: number): void;
export function wasmgpu_seed(seed: number): void;

export function wasmgpu_frame_arena_init(capBytes: number): number;
export function wasmgpu_frame_arena_reset(): void;
export function wasmgpu_frame_arena_epoch(): number;
export function wasmgpu_frame_alloc(bytes: number, align: number): number;
export function wasmgpu_frame_alloc_f32(len: number): number;
export function wasmgpu_frame_alloc_f64(len: number): number;
export function wasmgpu_frame_arena_used(): number;
export function wasmgpu_frame_arena_cap(): number;

export function f32view(ptr: number, len: number): Float32Array;
export function f64view(ptr: number, len: number): Float64Array;
export function u32view(ptr: number, len: number): Uint32Array;
export function i32view(ptr: number, len: number): Int32Array;
export function u8view(ptr: number, len: number): Uint8Array;

export function transform_compose_local_many(outLocalPtr: number, posPtr: number, rotPtr: number, sclPtr: number, count: number): number;
export function transform_update_world_ordered(outWorldPtr: number, localPtr: number, parentPtr: number, orderPtr: number, count: number): number;
export function transform_update_partial_ordered(outWorldPtr: number, outLocalPtr: number, posPtr: number, rotPtr: number, sclPtr: number, parentPtr: number, orderPtr: number, dirtyIndicesPtr: number, dirtyCount: number, count: number): number;
export function transform_pack_model_normal_mat4_from_ptrs(outPtr: number, matPtrsPtr: number, count: number): number;

export function cull_write_planes_from_view_projection(outPlanesPtr: number, viewProjPtr: number): number;
export function cull_prepare_world_spheres_from_ptrs(outCentersPtr: number, outRadiiPtr: number, worldPtrsPtr: number, localCentersPtr: number, localRadiiPtr: number, count: number): number;
export function cull_spheres_frustum(outIndicesPtr: number, centersPtr: number, radiiPtr: number, count: number, frustumPtr: number): number;
export function cull_spheres_occlusion(outIndicesPtr: number, outStatsPtr: number, centersPtr: number, radiiPtr: number, count: number, viewProjPtr: number, viewportWidth: number, viewportHeight: number, mipOffsetsPtr: number, mipWidthsPtr: number, mipHeightsPtr: number, mipCount: number, depthValuesPtr: number, depthValuesLen: number, nearPlaneEpsilon: number, maxScreenCoverage: number, depthBias: number): number;

export function bounds_pointcloud_xyzs(outBoxMinPtr: number, outBoxMaxPtr: number, outSphereCenterPtr: number, outSphereRadiusPtr: number, pointsPtr: number, pointCount: number, strideF32: number): number;
export function bounds_glyph_instances(outBoxMinPtr: number, outBoxMaxPtr: number, outSphereCenterPtr: number, outSphereRadiusPtr: number, positionsPtr: number, scalesPtr: number, rotationsPtr: number, instanceCount: number, glyphCenterPtr: number, glyphRadius: number): number;
export function bounds_geometry_positions(outBoxMinPtr: number, outBoxMaxPtr: number, outSphereCenterPtr: number, outSphereRadiusPtr: number, positionsPtr: number, vertexCount: number): number;

export function accessor_deinterleave(outPtr: number, srcPtr: number, count: number, numComponents: number, componentBytes: number, byteStride: number): number;
export function accessor_apply_sparse(outPtr: number, outComponentCount: number, componentType: number, numComponents: number, indicesPtr: number, indicesComponentType: number, valuesPtr: number, sparseCount: number): number;
export function accessor_convert_to_f32(outPtr: number, srcPtr: number, componentCount: number, componentType: number, normalized: number): number;
export function accessor_convert_to_u16(outPtr: number, srcPtr: number, componentCount: number, componentType: number): number;
export function accessor_convert_to_u32(outPtr: number, srcPtr: number, componentCount: number, componentType: number): number;

export function mesh_compute_vertex_normals(outNormalsPtr: number, positionsPtr: number, vertexCount: number, indicesPtr: number, indexCount: number): number;

export function anim_sample_clip_trs(posPtr: number, rotPtr: number, sclPtr: number, transformCount: number, samplersPtr: number, samplerCount: number, channelsPtr: number, channelCount: number, time: number): number;
export function anim_compute_joint_matrices_to(outPtr: number, jointIndicesPtr: number, jointCount: number, invBindPtr: number, worldBasePtr: number, meshWorldPtr: number): number;

export function ndarray_numel(shapePtr: number, ndim: number): number;
export function ndarray_strides_row_major(outStridesPtr: number, shapePtr: number, ndim: number, elemBytes: number): number;
export function ndarray_offset_bytes(shapePtr: number, stridesPtr: number, indicesPtr: number, ndim: number, baseOffsetBytes: number): number;

export function mat4f_abs(outPtr: number, mPtr: number): number;
export function mat4d_abs(outPtr: number, mPtr: number): number;
export function mat4f_add(outPtr: number, m1Ptr: number, m2Ptr: number): number;
export function mat4d_add(outPtr: number, m1Ptr: number, m2Ptr: number): number;
export function mat4f_copy(outPtr: number, mPtr: number): number;
export function mat4d_copy(outPtr: number, mPtr: number): number;
export function mat4f_decompose_trs(outTrsPtr: number, mPtr: number): number;
export function mat4d_decompose_trs(outTrsPtr: number, mPtr: number): number;
export function mat4f_det(mPtr: number): number;
export function mat4d_det(mPtr: number): number;
export function mat4f_identity(outPtr: number): number;
export function mat4d_identity(outPtr: number): number;
export function mat4f_init(outPtr: number, m0: number, m1: number, m2: number, m3: number, m4: number, m5: number, m6: number, m7: number, m8: number, m9: number, m10: number, m11: number, m12: number, m13: number, m14: number, m15: number): number;
export function mat4d_init(outPtr: number, m0: number, m1: number, m2: number, m3: number, m4: number, m5: number, m6: number, m7: number, m8: number, m9: number, m10: number, m11: number, m12: number, m13: number, m14: number, m15: number): number;
export function mat4f_invert(outPtr: number, mPtr: number): number;
export function mat4d_invert(outPtr: number, mPtr: number): number;
export function mat4f_isEqual(m1Ptr: number, m2Ptr: number): number;
export function mat4d_isEqual(m1Ptr: number, m2Ptr: number): number;
export function mat4f_isIdentity(mPtr: number): number;
export function mat4d_isIdentity(mPtr: number): number;
export function mat4f_isInverse(m1Ptr: number, m2Ptr: number): number;
export function mat4d_isInverse(m1Ptr: number, m2Ptr: number): number;
export function mat4f_isZero(mPtr: number): number;
export function mat4d_isZero(mPtr: number): number;
export function mat4f_lookAt(outPtr: number, eyePtr: number, centerPtr: number, upPtr: number): number;
export function mat4d_lookAt(outPtr: number, eyePtr: number, centerPtr: number, upPtr: number): number;
export function mat4f_mul(outPtr: number, m1Ptr: number, m2Ptr: number): number;
export function mat4d_mul(outPtr: number, m1Ptr: number, m2Ptr: number): number;
export function mat4f_mul_vec4(outVec4Ptr: number, mPtr: number, v4Ptr: number): number;
export function mat4d_mul_vec4(outVec4Ptr: number, mPtr: number, v4Ptr: number): number;
export function mat4f_neg(outPtr: number, mPtr: number): number;
export function mat4d_neg(outPtr: number, mPtr: number): number;
export function mat4f_norm(mPtr: number): number;
export function mat4d_norm(mPtr: number): number;
export function mat4f_normalize(outPtr: number, mPtr: number): number;
export function mat4d_normalize(outPtr: number, mPtr: number): number;
export function mat4f_normsq(mPtr: number): number;
export function mat4d_normsq(mPtr: number): number;
export function mat4f_perspective(outPtr: number, fovY: number, aspect: number, near: number, far: number): number;
export function mat4d_perspective(outPtr: number, fovY: number, aspect: number, near: number, far: number): number;
export function mat4f_random(outPtr: number): number;
export function mat4d_random(outPtr: number): number;
export function mat4f_random_range(outPtr: number, a: number, b: number): number;
export function mat4d_random_range(outPtr: number, a: number, b: number): number;
export function mat4f_rotateX(outPtr: number, mPtr: number, angle: number): number;
export function mat4d_rotateX(outPtr: number, mPtr: number, angle: number): number;
export function mat4f_rotateY(outPtr: number, mPtr: number, angle: number): number;
export function mat4d_rotateY(outPtr: number, mPtr: number, angle: number): number;
export function mat4f_rotateZ(outPtr: number, mPtr: number, angle: number): number;
export function mat4d_rotateZ(outPtr: number, mPtr: number, angle: number): number;
export function mat4f_round(outPtr: number, mPtr: number): number;
export function mat4d_round(outPtr: number, mPtr: number): number;
export function mat4f_scl(outPtr: number, mPtr: number, n: number): number;
export function mat4d_scl(outPtr: number, mPtr: number, n: number): number;
export function mat4f_sub(outPtr: number, m1Ptr: number, m2Ptr: number): number;
export function mat4d_sub(outPtr: number, m1Ptr: number, m2Ptr: number): number;
export function mat4f_trace(mPtr: number): number;
export function mat4d_trace(mPtr: number): number;
export function mat4f_translate(outPtr: number, mPtr: number, v3Ptr: number): number;
export function mat4d_translate(outPtr: number, mPtr: number, v3Ptr: number): number;
export function mat4f_transpose(outPtr: number, mPtr: number): number;
export function mat4d_transpose(outPtr: number, mPtr: number): number;
export function mat4f_print(mPtr: number): void;
export function mat4d_print(mPtr: number): void;

export function quatf_abs(outPtr: number, qPtr: number): number;
export function quatd_abs(outPtr: number, qPtr: number): number;
export function quatf_add(outPtr: number, q1Ptr: number, q2Ptr: number): number;
export function quatd_add(outPtr: number, q1Ptr: number, q2Ptr: number): number;
export function quatf_copy(outPtr: number, qPtr: number): number;
export function quatd_copy(outPtr: number, qPtr: number): number;
export function quatf_dist(q1Ptr: number, q2Ptr: number): number;
export function quatd_dist(q1Ptr: number, q2Ptr: number): number;
export function quatf_distsq(q1Ptr: number, q2Ptr: number): number;
export function quatd_distsq(q1Ptr: number, q2Ptr: number): number;
export function quatf_fromAxisAngle(outPtr: number, axisPtr: number, angle: number): number;
export function quatd_fromAxisAngle(outPtr: number, axisPtr: number, angle: number): number;
export function quatf_init(outPtr: number, x: number, y: number, z: number, w: number): number;
export function quatd_init(outPtr: number, x: number, y: number, z: number, w: number): number;
export function quatf_invert(outPtr: number, qPtr: number): number;
export function quatd_invert(outPtr: number, qPtr: number): number;
export function quatf_isEqual(q1Ptr: number, q2Ptr: number): number;
export function quatd_isEqual(q1Ptr: number, q2Ptr: number): number;
export function quatf_isNormalized(qPtr: number): number;
export function quatd_isNormalized(qPtr: number): number;
export function quatf_isZero(qPtr: number): number;
export function quatd_isZero(qPtr: number): number;
export function quatf_mul(outPtr: number, q1Ptr: number, q2Ptr: number): number;
export function quatd_mul(outPtr: number, q1Ptr: number, q2Ptr: number): number;
export function quatf_neg(outPtr: number, qPtr: number): number;
export function quatd_neg(outPtr: number, qPtr: number): number;
export function quatf_norm(qPtr: number): number;
export function quatd_norm(qPtr: number): number;
export function quatf_normalize(outPtr: number, qPtr: number): number;
export function quatd_normalize(outPtr: number, qPtr: number): number;
export function quatf_normscl(outPtr: number, qPtr: number, n: number): number;
export function quatd_normscl(outPtr: number, qPtr: number, n: number): number;
export function quatf_normsq(qPtr: number): number;
export function quatd_normsq(qPtr: number): number;
export function quatf_random(outPtr: number): number;
export function quatd_random(outPtr: number): number;
export function quatf_random_range(outPtr: number, a: number, b: number): number;
export function quatd_random_range(outPtr: number, a: number, b: number): number;
export function quatf_round(outPtr: number, qPtr: number): number;
export function quatd_round(outPtr: number, qPtr: number): number;
export function quatf_scl(outPtr: number, qPtr: number, n: number): number;
export function quatd_scl(outPtr: number, qPtr: number, n: number): number;
export function quatf_slerp(outPtr: number, q1Ptr: number, q2Ptr: number, t: number): number;
export function quatd_slerp(outPtr: number, q1Ptr: number, q2Ptr: number, t: number): number;
export function quatf_sub(outPtr: number, q1Ptr: number, q2Ptr: number): number;
export function quatd_sub(outPtr: number, q1Ptr: number, q2Ptr: number): number;
export function quatf_toRotation(outVec3Ptr: number, qPtr: number, v3Ptr: number): number;
export function quatd_toRotation(outVec3Ptr: number, qPtr: number, v3Ptr: number): number;
export function quatf_print(qPtr: number): void;
export function quatd_print(qPtr: number): void;

export function vec3f_abs(outPtr: number, vPtr: number): number;
export function vec3d_abs(outPtr: number, vPtr: number): number;
export function vec3f_add(outPtr: number, v1Ptr: number, v2Ptr: number): number;
export function vec3d_add(outPtr: number, v1Ptr: number, v2Ptr: number): number;
export function vec3f_ang(outPtr: number, vPtr: number): number;
export function vec3d_ang(outPtr: number, vPtr: number): number;
export function vec3f_angBetween(v1Ptr: number, v2Ptr: number): number;
export function vec3d_angBetween(v1Ptr: number, v2Ptr: number): number;
export function vec3f_copy(outPtr: number, vPtr: number): number;
export function vec3d_copy(outPtr: number, vPtr: number): number;
export function vec3f_cross(outPtr: number, v1Ptr: number, v2Ptr: number): number;
export function vec3d_cross(outPtr: number, v1Ptr: number, v2Ptr: number): number;
export function vec3f_dist(v1Ptr: number, v2Ptr: number): number;
export function vec3d_dist(v1Ptr: number, v2Ptr: number): number;
export function vec3f_distsq(v1Ptr: number, v2Ptr: number): number;
export function vec3d_distsq(v1Ptr: number, v2Ptr: number): number;
export function vec3f_dot(v1Ptr: number, v2Ptr: number): number;
export function vec3d_dot(v1Ptr: number, v2Ptr: number): number;
export function vec3f_init(outPtr: number, x: number, y: number, z: number): number;
export function vec3d_init(outPtr: number, x: number, y: number, z: number): number;
export function vec3f_interp(outPtr: number, vPtr: number, a: number, b: number, c: number): number;
export function vec3d_interp(outPtr: number, vPtr: number, a: number, b: number, c: number): number;
export function vec3f_isEqual(v1Ptr: number, v2Ptr: number): number;
export function vec3d_isEqual(v1Ptr: number, v2Ptr: number): number;
export function vec3f_isNormalized(vPtr: number): number;
export function vec3d_isNormalized(vPtr: number): number;
export function vec3f_isOrthogonal(v1Ptr: number, v2Ptr: number): number;
export function vec3d_isOrthogonal(v1Ptr: number, v2Ptr: number): number;
export function vec3f_isParallel(v1Ptr: number, v2Ptr: number): number;
export function vec3d_isParallel(v1Ptr: number, v2Ptr: number): number;
export function vec3f_isZero(vPtr: number): number;
export function vec3d_isZero(vPtr: number): number;
export function vec3f_neg(outPtr: number, vPtr: number): number;
export function vec3d_neg(outPtr: number, vPtr: number): number;
export function vec3f_norm(vPtr: number): number;
export function vec3d_norm(vPtr: number): number;
export function vec3f_normalize(outPtr: number, vPtr: number): number;
export function vec3d_normalize(outPtr: number, vPtr: number): number;
export function vec3f_normscl(outPtr: number, vPtr: number, n: number): number;
export function vec3d_normscl(outPtr: number, vPtr: number, n: number): number;
export function vec3f_normsq(vPtr: number): number;
export function vec3d_normsq(vPtr: number): number;
export function vec3f_oproj(outPtr: number, v1Ptr: number, v2Ptr: number): number;
export function vec3d_oproj(outPtr: number, v1Ptr: number, v2Ptr: number): number;
export function vec3f_proj(outPtr: number, v1Ptr: number, v2Ptr: number): number;
export function vec3d_proj(outPtr: number, v1Ptr: number, v2Ptr: number): number;
export function vec3f_random(outPtr: number): number;
export function vec3d_random(outPtr: number): number;
export function vec3f_random_range(outPtr: number, a: number, b: number): number;
export function vec3d_random_range(outPtr: number, a: number, b: number): number;
export function vec3f_reflect(outPtr: number, v1Ptr: number, v2Ptr: number): number;
export function vec3d_reflect(outPtr: number, v1Ptr: number, v2Ptr: number): number;
export function vec3f_refract(outPtr: number, v1Ptr: number, v2Ptr: number, refractiveIndex: number): number;
export function vec3d_refract(outPtr: number, v1Ptr: number, v2Ptr: number, refractiveIndex: number): number;
export function vec3f_round(outPtr: number, vPtr: number): number;
export function vec3d_round(outPtr: number, vPtr: number): number;
export function vec3f_scl(outPtr: number, vPtr: number, n: number): number;
export function vec3d_scl(outPtr: number, vPtr: number, n: number): number;
export function vec3f_sub(outPtr: number, v1Ptr: number, v2Ptr: number): number;
export function vec3d_sub(outPtr: number, v1Ptr: number, v2Ptr: number): number;
export function vec3f_print(vPtr: number): void;
export function vec3d_print(vPtr: number): void;

export function mat4abs(m: number[]): number[];
export function mat4add(m1: number[], m2: number[]): number[];
export function mat4copy(m: number[]): number[];
export function mat4det(m: number[]): number;
export function mat4identity(): number[];
export function mat4init(...m: number[]): number[];
export function mat4invert(m: number[]): number[];
export function mat4isEqual(m1: number[], m2: number[]): boolean;
export function mat4isIdentity(m: number[]): boolean;
export function mat4isInverse(m1: number[], m2: number[]): boolean;
export function mat4isZero(m: number[]): boolean;
export function mat4lookAt(eye: number[], center: number[], up: number[]): number[];
export function mat4mul(m1: number[], m2: number[]): number[];
export function mat4neg(m: number[]): number[];
export function mat4norm(m: number[]): number;
export function mat4normalize(m: number[]): number[];
export function mat4normsq(m: number[]): number;
export function mat4perspective(fovY: number, aspect: number, near: number, far: number): number[];
export function mat4print(m: number[]): void;
export function mat4random(a: number, b: number): number[];
export function mat4rotateX(m: number[], angle: number): number[];
export function mat4rotateY(m: number[], angle: number): number[];
export function mat4rotateZ(m: number[], angle: number): number[];
export function mat4round(m: number[]): number[];
export function mat4scl(m: number[], n: number): number[];
export function mat4sub(m1: number[], m2: number[]): number[];
export function mat4trace(m: number[]): number;
export function mat4translate(m: number[], v: number[]): number[];
export function mat4transpose(m: number[]): number[];

export function quatabs(q: number[]): number[];
export function quatadd(q1: number[], q2: number[]): number[];
export function quatcopy(q: number[]): number[];
export function quatdist(q1: number[], q2: number[]): number;
export function quatdistsq(q1: number[], q2: number[]): number;
export function quatfromAxisAngle(axis: number[], angle: number): number[];
export function quatinit(x?: number, y?: number, z?: number, w?: number): number[];
export function quatinvert(q: number[]): number[];
export function quatisEqual(q1: number[], q2: number[]): boolean;
export function quatisNormalized(q: number[]): boolean;
export function quatisZero(q: number[]): boolean;
export function quatmul(q1: number[], q2: number[]): number[];
export function quatneg(q: number[]): number[];
export function quatnorm(q: number[]): number;
export function quatnormalize(q: number[]): number[];
export function quatnormscl(q: number[], scalar: number): number[];
export function quatnormsq(q: number[]): number;
export function quatprint(q: number[]): void;
export function quatrandom(a: number, b: number): number[];
export function quatround(q: number[]): number[];
export function quatscl(q: number[], scalar: number): number[];
export function quatslerp(q1: number[], q2: number[], t: number): number[];
export function quatsub(q1: number[], q2: number[]): number[];
export function quattoRotation(q: number[], v: number[]): number[];

export function vec3abs(v: number[]): number[];
export function vec3add(v1: number[], v2: number[]): number[];
export function vec3ang(v: number[]): number[];
export function vec3angBetween(v1: number[], v2: number[]): number;
export function vec3copy(v: number[]): number[];
export function vec3cross(v1: number[], v2: number[]): number[];
export function vec3dist(v1: number[], v2: number[]): number;
export function vec3distsq(v1: number[], v2: number[]): number;
export function vec3dot(v1: number[], v2: number[]): number;
export function vec3init(x?: number, y?: number, z?: number): number[];
export function vec3interp(v: number[], a: number, b: number, c: number): number[];
export function vec3isEqual(v1: number[], v2: number[]): boolean;
export function vec3isNormalized(v: number[]): boolean;
export function vec3isOrthogonal(v1: number[], v2: number[]): boolean;
export function vec3isParallel(v1: number[], v2: number[]): boolean;
export function vec3isZero(v: number[]): boolean;
export function vec3neg(v: number[]): number[];
export function vec3norm(v: number[]): number;
export function vec3normalize(v: number[]): number[];
export function vec3normscl(v: number[], scalar: number): number[];
export function vec3normsq(v: number[]): number;
export function vec3oproj(v1: number[], v2: number[]): number[];
export function vec3print(v: number[]): void;
export function vec3proj(v1: number[], v2: number[]): number[];
export function vec3random(a: number, b: number): number[];
export function vec3reflect(v1: number[], v2: number[]): number[];
export function vec3refract(v1: number[], v2: number[], refractiveIndex: number): number[];
export function vec3round(v: number[]): number[];
export function vec3scl(v: number[], scalar: number): number[];
export function vec3sub(v1: number[], v2: number[]): number[];
`;

writeFileSync(join(WASM_DIR, "wasm.js"), generateWasmLoaderJS(wasmBase64), "utf8");
writeFileSync(join(WASM_DIR, "wasm.d.ts"), generateWasmDTS(), "utf8");

console.log(`\nBuilt WebAssembly binary        -> ./wasm/wasm.wasm`);
console.log(`Built JavaScript bridge         -> ./wasm/wasm.js`);
console.log(`Built TypeScript declarations   -> ./wasm/wasm.d.ts\n`);
