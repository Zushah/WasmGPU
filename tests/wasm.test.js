/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { WasmGPU, WasmMemoryView, WasmModule, driver, frameArena, initWebAssembly, pythonInterop, wasm, webassemblyInterop } from "../release/WasmGPU.js";
import * as generatedWasm from "../wasm/wasm.js";

const encoder = new TextEncoder();

const RUST_ABI = {
    accessor_apply_sparse: 8,
    accessor_convert_to_f32: 5,
    accessor_convert_to_u16: 4,
    accessor_convert_to_u32: 4,
    accessor_deinterleave: 6,
    anim_compute_joint_matrices_to: 6,
    anim_sample_clip_trs: 9,
    bounds_geometry_positions: 6,
    bounds_glyph_instances: 10,
    bounds_pointcloud_xyzs: 7,
    cull_prepare_world_spheres_from_ptrs: 6,
    cull_spheres_frustum: 5,
    cull_spheres_occlusion: 17,
    cull_write_planes_from_view_projection: 2,
    mat4f_abs: 2,
    mat4d_abs: 2,
    mat4f_add: 3,
    mat4d_add: 3,
    mat4f_copy: 2,
    mat4d_copy: 2,
    mat4f_decompose_trs: 2,
    mat4d_decompose_trs: 2,
    mat4f_det: 1,
    mat4d_det: 1,
    mat4f_identity: 1,
    mat4d_identity: 1,
    mat4f_init: 17,
    mat4d_init: 17,
    mat4f_invert: 2,
    mat4d_invert: 2,
    mat4f_isEqual: 2,
    mat4d_isEqual: 2,
    mat4f_isIdentity: 1,
    mat4d_isIdentity: 1,
    mat4f_isInverse: 2,
    mat4d_isInverse: 2,
    mat4f_isZero: 1,
    mat4d_isZero: 1,
    mat4f_lookAt: 4,
    mat4d_lookAt: 4,
    mat4f_mul: 3,
    mat4d_mul: 3,
    mat4f_mul_vec4: 3,
    mat4d_mul_vec4: 3,
    mat4f_neg: 2,
    mat4d_neg: 2,
    mat4f_norm: 1,
    mat4d_norm: 1,
    mat4f_normalize: 2,
    mat4d_normalize: 2,
    mat4f_normsq: 1,
    mat4d_normsq: 1,
    mat4f_perspective: 5,
    mat4d_perspective: 5,
    mat4f_print: 1,
    mat4d_print: 1,
    mat4f_random: 1,
    mat4d_random: 1,
    mat4f_random_range: 3,
    mat4d_random_range: 3,
    mat4f_rotateX: 3,
    mat4d_rotateX: 3,
    mat4f_rotateY: 3,
    mat4d_rotateY: 3,
    mat4f_rotateZ: 3,
    mat4d_rotateZ: 3,
    mat4f_round: 2,
    mat4d_round: 2,
    mat4f_scl: 3,
    mat4d_scl: 3,
    mat4f_sub: 3,
    mat4d_sub: 3,
    mat4f_trace: 1,
    mat4d_trace: 1,
    mat4f_translate: 3,
    mat4d_translate: 3,
    mat4f_transpose: 2,
    mat4d_transpose: 2,
    mesh_compute_vertex_normals: 5,
    ndarray_numel: 2,
    ndarray_offset_bytes: 5,
    ndarray_strides_row_major: 4,
    quatf_abs: 2,
    quatd_abs: 2,
    quatf_add: 3,
    quatd_add: 3,
    quatf_copy: 2,
    quatd_copy: 2,
    quatf_dist: 2,
    quatd_dist: 2,
    quatf_distsq: 2,
    quatd_distsq: 2,
    quatf_fromAxisAngle: 3,
    quatd_fromAxisAngle: 3,
    quatf_init: 5,
    quatd_init: 5,
    quatf_invert: 2,
    quatd_invert: 2,
    quatf_isEqual: 2,
    quatd_isEqual: 2,
    quatf_isNormalized: 1,
    quatd_isNormalized: 1,
    quatf_isZero: 1,
    quatd_isZero: 1,
    quatf_mul: 3,
    quatd_mul: 3,
    quatf_neg: 2,
    quatd_neg: 2,
    quatf_norm: 1,
    quatd_norm: 1,
    quatf_normalize: 2,
    quatd_normalize: 2,
    quatf_normscl: 3,
    quatd_normscl: 3,
    quatf_normsq: 1,
    quatd_normsq: 1,
    quatf_print: 1,
    quatd_print: 1,
    quatf_random: 1,
    quatd_random: 1,
    quatf_random_range: 3,
    quatd_random_range: 3,
    quatf_round: 2,
    quatd_round: 2,
    quatf_scl: 3,
    quatd_scl: 3,
    quatf_slerp: 4,
    quatd_slerp: 4,
    quatf_sub: 3,
    quatd_sub: 3,
    quatf_toRotation: 3,
    quatd_toRotation: 3,
    transform_compose_local_many: 5,
    transform_pack_model_normal_mat4_from_ptrs: 3,
    transform_update_partial_ordered: 10,
    transform_update_world_ordered: 5,
    vec3f_abs: 2,
    vec3d_abs: 2,
    vec3f_add: 3,
    vec3d_add: 3,
    vec3f_ang: 2,
    vec3d_ang: 2,
    vec3f_angBetween: 2,
    vec3d_angBetween: 2,
    vec3f_copy: 2,
    vec3d_copy: 2,
    vec3f_cross: 3,
    vec3d_cross: 3,
    vec3f_dist: 2,
    vec3d_dist: 2,
    vec3f_distsq: 2,
    vec3d_distsq: 2,
    vec3f_dot: 2,
    vec3d_dot: 2,
    vec3f_init: 4,
    vec3d_init: 4,
    vec3f_interp: 5,
    vec3d_interp: 5,
    vec3f_isEqual: 2,
    vec3d_isEqual: 2,
    vec3f_isNormalized: 1,
    vec3d_isNormalized: 1,
    vec3f_isOrthogonal: 2,
    vec3d_isOrthogonal: 2,
    vec3f_isParallel: 2,
    vec3d_isParallel: 2,
    vec3f_isZero: 1,
    vec3d_isZero: 1,
    vec3f_neg: 2,
    vec3d_neg: 2,
    vec3f_norm: 1,
    vec3d_norm: 1,
    vec3f_normalize: 2,
    vec3d_normalize: 2,
    vec3f_normscl: 3,
    vec3d_normscl: 3,
    vec3f_normsq: 1,
    vec3d_normsq: 1,
    vec3f_oproj: 3,
    vec3d_oproj: 3,
    vec3f_print: 1,
    vec3d_print: 1,
    vec3f_proj: 3,
    vec3d_proj: 3,
    vec3f_random: 1,
    vec3d_random: 1,
    vec3f_random_range: 3,
    vec3d_random_range: 3,
    vec3f_reflect: 3,
    vec3d_reflect: 3,
    vec3f_refract: 4,
    vec3d_refract: 4,
    vec3f_round: 2,
    vec3d_round: 2,
    vec3f_scl: 3,
    vec3d_scl: 3,
    vec3f_sub: 3,
    vec3d_sub: 3,
    wasmgpu_alloc: 1,
    wasmgpu_alloc_f32: 1,
    wasmgpu_alloc_f64: 1,
    wasmgpu_alloc_u32: 1,
    wasmgpu_frame_alloc: 2,
    wasmgpu_frame_alloc_f32: 1,
    wasmgpu_frame_alloc_f64: 1,
    wasmgpu_frame_arena_cap: 0,
    wasmgpu_frame_arena_epoch: 0,
    wasmgpu_frame_arena_init: 1,
    wasmgpu_frame_arena_reset: 0,
    wasmgpu_frame_arena_used: 0,
    wasmgpu_free: 2,
    wasmgpu_free_f32: 2,
    wasmgpu_free_f64: 2,
    wasmgpu_free_u32: 2,
    wasmgpu_seed: 1
};

const makeFixture = () => {
    const memory = new WebAssembly.Memory({ initial: 1 });
    new Uint8Array(memory.buffer, 0, 4).set([1, 2, 3, 4]);
    new Int8Array(memory.buffer, 8, 4).set([-1, 2, -3, 4]);
    new Uint16Array(memory.buffer, 16, 4).set([10, 20, 30, 40]);
    new Int16Array(memory.buffer, 24, 4).set([-10, 20, -30, 40]);
    new Uint32Array(memory.buffer, 32, 4).set([100, 200, 300, 400]);
    new Int32Array(memory.buffer, 48, 4).set([-100, 200, -300, 400]);
    new Float32Array(memory.buffer, 64, 4).set([1.5, 2.5, 3.5, 4.5]);
    new Float64Array(memory.buffer, 96, 2).set([Math.PI, Math.E]);
    new Uint16Array(memory.buffer, 144, 4).set([7, 8, 9, 10]);
    const text = "hello wasm", textBytes = encoder.encode(text);
    new Uint8Array(memory.buffer, 128, textBytes.length).set(textBytes);
    new Uint8Array(memory.buffer, 160, 12).set([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    const ptrGlobal = new WebAssembly.Global({ value: "i32", mutable: true }, 16);
    const lenGlobal = new WebAssembly.Global({ value: "i32", mutable: true }, 4);
    const exportsObject = { memory, u16_ptr: () => 16, u16_len: () => 4, str_ptr: () => 128, str_len: () => textBytes.length, handle_ptr: (offset = 0) => 160 + Number(offset), handle_len: (count = 0) => Number(count), ptr_global: ptrGlobal, len_global: lenGlobal };
    return { memory, exportsObject, ptrGlobal, lenGlobal, text };
};

// 1) Public runtime accessors expose the driver, WebAssembly interop, and Python interop surfaces.
{
    assert.strictEqual(WasmGPU.driver, driver, "WasmGPU.driver should expose the internal WebAssembly driver surface");
    assert.strictEqual(WasmGPU.webassembly, webassemblyInterop, "WasmGPU.webassembly should expose the external WebAssembly interop surface");
    assert.strictEqual(WasmGPU.python, pythonInterop, "WasmGPU.python should expose the Python interop surface");
    const runtime = Object.create(WasmGPU.prototype);
    assert.strictEqual(runtime.driver, driver, "wgpu.driver getter should expose the internal WebAssembly driver surface");
    assert.strictEqual(runtime.webassembly, webassemblyInterop, "wgpu.webassembly getter should expose the external WebAssembly interop surface");
    assert.strictEqual(runtime.python, pythonInterop, "wgpu.python getter should expose the Python interop surface");
    assert.strictEqual(typeof webassemblyInterop.fromInstance, "function");
    assert.strictEqual(typeof webassemblyInterop.fromExports, "function");
    assert.strictEqual(typeof webassemblyInterop.fromMemory, "function");
}

// 2) Factory helpers wrap exports, instance-like objects, and raw WebAssembly memory.
{
    const { memory, exportsObject } = makeFixture();
    const moduleFromExports = webassemblyInterop.fromExports(exportsObject, { name: "mock-exports" });
    const moduleFromInstance = webassemblyInterop.fromInstance({ exports: exportsObject }, { name: "mock-instance" });
    const moduleFromMemory = webassemblyInterop.fromMemory(memory, { name: "memory-only" });
    assert.ok(moduleFromExports instanceof WasmModule, "fromExports should return a WasmModule");
    assert.ok(moduleFromInstance instanceof WasmModule, "fromInstance should return a WasmModule");
    assert.ok(moduleFromMemory instanceof WasmModule, "fromMemory should return a WasmModule");
    assert.strictEqual(moduleFromExports.memory(), memory, "fromExports should auto-resolve the only memory export");
    assert.strictEqual(moduleFromInstance.memory(), memory, "fromInstance should auto-resolve the only memory export");
    assert.strictEqual(moduleFromMemory.memory(), memory, "fromMemory should use the provided WebAssembly.Memory");
}

// 3) Typed views resolve representative dtypes and expose stable view metadata.
{
    const { memory, exportsObject } = makeFixture();
    const moduleRef = webassemblyInterop.fromExports(exportsObject, { name: "typed-views" });
    const u8View = moduleRef.view({ memory: "memory", ptr: 0, length: 4, dtype: "u8", name: "u8-view" });
    assert.ok(u8View instanceof WasmMemoryView, "view() should return a WasmMemoryView");
    assert.strictEqual(u8View.memory, memory);
    assert.strictEqual(u8View.ptr, 0);
    assert.strictEqual(u8View.length, 4);
    assert.strictEqual(u8View.byteLength, 4);
    assert.strictEqual(u8View.dtype, "u8");
    assert.strictEqual(u8View.name, "u8-view");
    assert.deepStrictEqual(Array.from(u8View.array()), [1, 2, 3, 4]);
    assert.deepStrictEqual(Array.from(moduleRef.view({ ptr: 8, length: 4, dtype: "i8", name: "i8-view" }).array()), [-1, 2, -3, 4]);
    assert.deepStrictEqual(Array.from(moduleRef.view({ ptr: "u16_ptr", length: "u16_len", dtype: "u16", name: "u16-view" }).array()), [10, 20, 30, 40]);
    assert.deepStrictEqual(Array.from(moduleRef.view({ ptr: 24, length: 4, dtype: "i16", name: "i16-view" }).array()), [-10, 20, -30, 40]);
    assert.deepStrictEqual(Array.from(moduleRef.view({ ptr: 32, length: 4, dtype: "u32", name: "u32-view" }).array()), [100, 200, 300, 400]);
    assert.deepStrictEqual(Array.from(moduleRef.view({ ptr: 48, length: 4, dtype: "i32", name: "i32-view" }).array()), [-100, 200, -300, 400]);
    assert.deepStrictEqual(Array.from(moduleRef.view({ ptr: 64, length: 4, dtype: "f32", name: "f32-view" }).array()), [1.5, 2.5, 3.5, 4.5]);
    assert.deepStrictEqual(Array.from(moduleRef.view({ ptr: 96, length: 2, dtype: "f64", name: "f64-view" }).array()), [Math.PI, Math.E]);
}

// 4) Descriptor-driven reads support export functions, globals, refresh, and UTF-8 decoding.
{
    const { exportsObject, ptrGlobal, lenGlobal } = makeFixture();
    const moduleRef = webassemblyInterop.fromExports(exportsObject, { name: "descriptor-resolution" });
    const bytes = moduleRef.readBytes({
        ptr: { export: "handle_ptr", args: [2], name: "handle-ptr" },
        byteLength: { export: "handle_len", args: [6], name: "handle-len" },
        name: "handle-bytes"
    });
    assert.deepStrictEqual(Array.from(bytes), [11, 12, 13, 14, 15, 16], "readBytes should support export-function descriptors with args");
    const globalView = moduleRef.view({
        ptr: { export: "ptr_global", kind: "global", name: "ptr-global" },
        length: { export: "len_global", kind: "global", name: "len-global" },
        dtype: "u16",
        name: "global-view"
    });
    assert.deepStrictEqual(Array.from(globalView.array()), [10, 20, 30, 40], "view() should support exported globals");
    ptrGlobal.value = 144;
    lenGlobal.value = 4;
    globalView.refresh();
    assert.strictEqual(globalView.ptr, 144, "refresh() should re-resolve the pointer descriptor");
    assert.deepStrictEqual(Array.from(globalView.array()), [7, 8, 9, 10], "refresh() should pick up updated global values");
    assert.strictEqual(moduleRef.readUtf8("str_ptr", "str_len", { name: "greeting" }), "hello wasm", "readUtf8 should decode ptr/len exports");
}

// 5) Copy helpers expose typed-array copies, byte copies, and fixed-layout DataView reads.
{
    const { exportsObject } = makeFixture();
    const moduleRef = webassemblyInterop.fromExports(exportsObject, { name: "copy-helpers" });
    const f32View = moduleRef.view({ ptr: 64, length: 4, dtype: "f32", name: "copy-f32" });
    const f32Copy = f32View.copy();
    assert.ok(f32Copy instanceof Float32Array, "copy() should return a typed-array copy");
    assert.deepStrictEqual(Array.from(f32Copy), [1.5, 2.5, 3.5, 4.5], "copy() should preserve values");
    const f32Target = new Float32Array(4);
    f32View.copyInto(f32Target);
    assert.deepStrictEqual(Array.from(f32Target), [1.5, 2.5, 3.5, 4.5], "copyInto() should populate numeric typed-array targets");
    assert.throws(() => f32View.copyInto(new Uint16Array(4)), /dtype-compatible/i, "copyInto() should reject silent numeric coercion into incompatible typed arrays");
    assert.throws(() => f32View.copyInto(new DataView(new ArrayBuffer(16))), /numeric TypedArray/i, "copyInto() should reject DataView targets");
    const u8Target = new Uint8Array(16);
    f32View.copyInto(u8Target);
    assert.deepStrictEqual(Array.from(u8Target), Array.from(f32View.bytes()), "copyInto() should support raw byte copies into byte-addressable targets");
    const dataView = moduleRef.dataView({ ptr: 96, byteLength: 16, name: "f64-data-view" });
    assert.strictEqual(dataView.getFloat64(0, true), Math.PI, "dataView() should expose fixed-layout binary reads");
    assert.strictEqual(dataView.getFloat64(8, true), Math.E, "dataView() should expose fixed-layout binary reads");
}

// 6) Cached typed-array views refresh automatically after WebAssembly memory growth.
{
    const { memory, exportsObject } = makeFixture();
    const moduleRef = webassemblyInterop.fromExports(exportsObject, { name: "memory-growth" });
    const view = moduleRef.view({ ptr: 16, length: 4, dtype: "u16", name: "grow-view" });
    const before = view.array();
    const beforeBuffer = before.buffer;
    memory.grow(1);
    const after = view.array();
    assert.notStrictEqual(after.buffer, beforeBuffer, "array() should refresh cached views when memory.buffer changes");
    assert.deepStrictEqual(Array.from(after), [10, 20, 30, 40], "array() should still read the correct values after memory growth");
}

// 7) Validation rejects missing exports, missing memory, invalid values, out-of-bounds ranges, and misalignment.
{
    const { exportsObject } = makeFixture();
    const moduleRef = webassemblyInterop.fromExports(exportsObject, { name: "validation" });
    assert.throws(() => moduleRef.getExport("missing"), /does not contain export 'missing'/i, "missing exports should throw");
    assert.throws(() => moduleRef.memory("missingMemory"), /does not contain export 'missingMemory'/i, "missing memory export names should throw");
    assert.throws(() => webassemblyInterop.fromExports({}, { name: "no-memory" }).memory(), /could not resolve a WebAssembly\.Memory/i, "missing memory should throw");
    assert.throws(() => webassemblyInterop.fromMemory(null), /WebAssembly\.Memory/i, "fromMemory(null) should throw");
    assert.throws(() => moduleRef.view({ ptr: -1, length: 4, dtype: "u8", name: "negative-ptr" }), /must be >= 0/i, "negative pointers should throw");
    assert.throws(() => moduleRef.view({ ptr: Number.NaN, length: 4, dtype: "u8", name: "nan-ptr" }), /must be finite/i, "NaN pointers should throw");
    assert.throws(() => moduleRef.view({ ptr: 0, length: Number.POSITIVE_INFINITY, dtype: "u8", name: "inf-len" }), /must be finite/i, "infinite lengths should throw");
    assert.throws(() => moduleRef.view({ ptr: 65530, length: 8, dtype: "u8", name: "oob-range" }), /out of bounds/i, "out-of-bounds ranges should throw");
    assert.throws(() => moduleRef.view({ ptr: 65, length: 4, dtype: "f32", name: "unaligned-f32" }), /not aligned/i, "misaligned typed views should throw");
}

// 8) The compiled Rust module, generated JavaScript bridge, and declarations expose the exact function ABI.
{
    const wasmResponse = await fetch(new URL("../wasm/wasm.wasm", import.meta.url));
    assert.ok(wasmResponse.ok, `Failed to fetch ./wasm/wasm.wasm: ${wasmResponse.status}`);
    const wasmBytes = new Uint8Array(await wasmResponse.arrayBuffer());
    const wasmModule = await WebAssembly.compile(wasmBytes);
    const rawExports = WebAssembly.Module.exports(wasmModule);
    const rawFunctionNames = rawExports.filter((entry) => entry.kind === "function").map((entry) => entry.name).sort();
    const expectedFunctionNames = Object.keys(RUST_ABI).sort();
    assert.deepStrictEqual(rawFunctionNames, expectedFunctionNames, "Compiled Rust function exports must match the ABI manifest exactly");
    assert.ok(rawExports.some((entry) => entry.kind === "memory" && entry.name === "memory"), "Compiled Rust module must export memory");

    const rawInstance = new WebAssembly.Instance(wasmModule, {});
    const declarationsResponse = await fetch(new URL("../wasm/wasm.d.ts", import.meta.url));
    assert.ok(declarationsResponse.ok, `Failed to fetch ./wasm/wasm.d.ts: ${declarationsResponse.status}`);
    const declarations = await declarationsResponse.text();
    for (const [name, arity] of Object.entries(RUST_ABI)) {
        assert.strictEqual(typeof rawInstance.exports[name], "function", `Raw Wasm export '${name}' must be a function`);
        assert.strictEqual(rawInstance.exports[name].length, arity, `Raw Wasm export '${name}' arity mismatch`);
        assert.strictEqual(typeof generatedWasm[name], "function", `Generated JavaScript bridge is missing '${name}'`);
        assert.strictEqual(generatedWasm[name].length, arity, `Generated JavaScript bridge '${name}' arity mismatch`);
        const signature = declarations.match(new RegExp(`^export function ${name}\\(([^)]*)\\)`, "m"));
        assert.ok(signature, `Generated declarations are missing '${name}'`);
        const declaredArity = signature[1].trim().length === 0 ? 0 : signature[1].split(",").length;
        assert.strictEqual(declaredArity, arity, `Generated declaration '${name}' arity mismatch`);
    }
}

// 9) Heap allocations are checked, aligned, disjoint while live, and reusable after matching frees.
{
    assert.strictEqual(generatedWasm.wasmgpu_alloc(0), 0, "Zero-byte allocations must use the null pointer");
    assert.strictEqual(generatedWasm.wasmgpu_alloc_f32(0), 0, "Zero-length f32 allocations must use the null pointer");
    assert.strictEqual(generatedWasm.wasmgpu_alloc_u32(0), 0, "Zero-length u32 allocations must use the null pointer");
    assert.strictEqual(generatedWasm.wasmgpu_alloc(0xffffffff), 0, "Byte allocations beyond Rust Layout limits must fail without wrapping");
    assert.strictEqual(generatedWasm.wasmgpu_alloc_f32(0xffffffff), 0, "f32 allocation size overflow must fail without wrapping");
    assert.strictEqual(generatedWasm.wasmgpu_alloc_u32(0xffffffff), 0, "u32 allocation size overflow must fail without wrapping");
    assert.doesNotThrow(() => generatedWasm.wasmgpu_free(0, 0));
    assert.doesNotThrow(() => generatedWasm.wasmgpu_free_f32(0, 0));
    assert.doesNotThrow(() => generatedWasm.wasmgpu_free_u32(0, 0));

    const bytePtr = generatedWasm.wasmgpu_alloc(17);
    const f32Ptr = generatedWasm.wasmgpu_alloc_f32(5);
    const u32Ptr = generatedWasm.wasmgpu_alloc_u32(5);
    assert.ok(bytePtr > 0 && f32Ptr > 0 && u32Ptr > 0, "Heap allocations must return nonzero pointers");
    assert.strictEqual(bytePtr % 16, 0, "Byte allocations must be 16-byte aligned");
    assert.strictEqual(f32Ptr % 4, 0, "f32 allocations must be naturally aligned");
    assert.strictEqual(u32Ptr % 4, 0, "u32 allocations must be naturally aligned");

    const allocations = [
        { ptr: bytePtr, bytes: 17 },
        { ptr: f32Ptr, bytes: 5 * 4 },
        { ptr: u32Ptr, bytes: 5 * 4 }
    ];
    for (let i = 0; i < allocations.length; i++) {
        for (let j = i + 1; j < allocations.length; j++) {
            const a = allocations[i], b = allocations[j];
            assert.ok(a.ptr + a.bytes <= b.ptr || b.ptr + b.bytes <= a.ptr, "Live heap allocations must not overlap");
        }
    }

    generatedWasm.u8view(bytePtr, 17).set(Array.from({ length: 17 }, (_, i) => i + 1));
    generatedWasm.f32view(f32Ptr, 5).set([1.25, -2.5, 3.75, 4.5, 5.25]);
    generatedWasm.u32view(u32Ptr, 5).set([1, 2, 3, 4, 0xffffffff]);
    assert.deepStrictEqual(Array.from(generatedWasm.u8view(bytePtr, 17)), Array.from({ length: 17 }, (_, i) => i + 1));
    assert.deepStrictEqual(Array.from(generatedWasm.f32view(f32Ptr, 5)), [1.25, -2.5, 3.75, 4.5, 5.25]);
    assert.deepStrictEqual(Array.from(generatedWasm.u32view(u32Ptr, 5)), [1, 2, 3, 4, 0xffffffff]);

    const beforeBuffer = generatedWasm.memory.buffer;
    const growthPtr = generatedWasm.wasmgpu_alloc(beforeBuffer.byteLength);
    assert.ok(growthPtr > 0, "Heap allocation large enough to grow memory must succeed");
    assert.notStrictEqual(generatedWasm.memory.buffer, beforeBuffer, "Heap growth must replace the WebAssembly memory buffer");
    assert.deepStrictEqual(Array.from(generatedWasm.f32view(f32Ptr, 5)), [1.25, -2.5, 3.75, 4.5, 5.25], "Typed views must remain readable when recreated after memory growth");

    assert.doesNotThrow(() => generatedWasm.wasmgpu_free(bytePtr, 17));
    assert.doesNotThrow(() => generatedWasm.wasmgpu_free_f32(f32Ptr, 5));
    assert.doesNotThrow(() => generatedWasm.wasmgpu_free_u32(u32Ptr, 5));
    assert.doesNotThrow(() => generatedWasm.wasmgpu_free(growthPtr, beforeBuffer.byteLength));

    const guardPtr = generatedWasm.wasmgpu_alloc(64);
    assert.ok(guardPtr > 0, "Live-allocation guard must succeed");
    generatedWasm.u8view(guardPtr, 64).fill(0x5a);

    const churnSizes = [257, 4096, 131072, 1024];
    const churnCycle = () => {
        const ptrs = churnSizes.map((bytes) => generatedWasm.wasmgpu_alloc(bytes));
        const f32 = generatedWasm.wasmgpu_alloc_f32(4096);
        const u32 = generatedWasm.wasmgpu_alloc_u32(4096);
        assert.ok(ptrs.every((ptr) => ptr > 0) && f32 > 0 && u32 > 0, "Heap churn allocations must succeed");
        for (let i = 0; i < ptrs.length; i++) {
            generatedWasm.u8view(ptrs[i], churnSizes[i]).fill(i + 1);
        }
        generatedWasm.f32view(f32, 4096).fill(1.25);
        generatedWasm.u32view(u32, 4096).fill(0xdecafbad);
        assert.deepStrictEqual(Array.from(generatedWasm.u8view(guardPtr, 64)), new Array(64).fill(0x5a), "Allocator churn must not corrupt a live neighboring allocation");
        generatedWasm.wasmgpu_free(ptrs[1], churnSizes[1]);
        generatedWasm.wasmgpu_free(ptrs[3], churnSizes[3]);
        generatedWasm.wasmgpu_free_f32(f32, 4096);
        generatedWasm.wasmgpu_free(ptrs[0], churnSizes[0]);
        generatedWasm.wasmgpu_free_u32(u32, 4096);
        generatedWasm.wasmgpu_free(ptrs[2], churnSizes[2]);
    };

    churnCycle();
    const stabilizedHeapBytes = generatedWasm.memory.buffer.byteLength;
    for (let i = 0; i < 64; i++) churnCycle();
    assert.strictEqual(generatedWasm.memory.buffer.byteLength, stabilizedHeapBytes, "Repeated mixed-size allocation/free cycles must reuse heap storage instead of growing memory linearly");
    assert.deepStrictEqual(Array.from(generatedWasm.u8view(guardPtr, 64)), new Array(64).fill(0x5a), "The live guard must remain intact after stabilized churn");
    generatedWasm.wasmgpu_free(guardPtr, 64);
}

// 10) The frame arena enforces capacity and alignment and invalidates transient allocations on reset.
{
    const base = generatedWasm.wasmgpu_frame_arena_init(256);
    assert.ok(base > 0, "Frame arena initialization must return a nonzero base pointer");
    assert.strictEqual(generatedWasm.wasmgpu_frame_arena_init(512), base, "Frame arena initialization must be idempotent");
    assert.strictEqual(generatedWasm.wasmgpu_frame_arena_cap(), 256);
    assert.strictEqual(generatedWasm.wasmgpu_frame_arena_used(), 0);
    const epochBefore = generatedWasm.wasmgpu_frame_arena_epoch();
    assert.ok(epochBefore > 0, "Initialized frame arena epoch must be nonzero");

    const bytePtr = generatedWasm.wasmgpu_frame_alloc(1, 1);
    const alignedPtr = generatedWasm.wasmgpu_frame_alloc(4, 4);
    const f32Ptr = generatedWasm.wasmgpu_frame_alloc_f32(2);
    const f64Ptr = generatedWasm.wasmgpu_frame_alloc_f64(2);
    assert.strictEqual(bytePtr, base);
    assert.strictEqual(alignedPtr % 4, 0);
    assert.strictEqual(f32Ptr % 16, 0);
    assert.strictEqual(f64Ptr % 16, 0);
    const used = generatedWasm.wasmgpu_frame_arena_used();
    assert.ok(used > 0 && used <= 256);
    assert.strictEqual(generatedWasm.wasmgpu_frame_alloc(1, 3), 0, "Non-power-of-two alignment must be rejected");
    assert.strictEqual(generatedWasm.wasmgpu_frame_alloc(257, 1), 0, "Out-of-capacity allocation must be rejected");
    assert.strictEqual(generatedWasm.wasmgpu_frame_arena_used(), used, "Rejected allocations must not consume arena space");

    generatedWasm.wasmgpu_frame_arena_reset();
    const epochAfter = generatedWasm.wasmgpu_frame_arena_epoch();
    assert.ok(epochAfter > 0 && epochAfter !== epochBefore, "Reset must advance to another nonzero epoch");
    assert.strictEqual(generatedWasm.wasmgpu_frame_arena_used(), 0);
    assert.strictEqual(generatedWasm.wasmgpu_frame_alloc(1, 1), base, "Reset must make frame storage reusable");
}

// 11) Representative pointer-based kernels read and write through the generated 32-bit ABI.
{
    const shapePtr = generatedWasm.wasmgpu_alloc_u32(3);
    const matrixPtr = generatedWasm.wasmgpu_alloc_f32(16);
    const copyPtr = generatedWasm.wasmgpu_alloc_f32(17);
    const sourcePtr = generatedWasm.wasmgpu_alloc(12);
    const outputPtr = generatedWasm.wasmgpu_alloc(8);
    try {
        generatedWasm.u32view(shapePtr, 3).set([2, 3, 4]);
        assert.strictEqual(generatedWasm.ndarray_numel(shapePtr, 3), 24);

        generatedWasm.mat4f_identity(matrixPtr);
        assert.deepStrictEqual(Array.from(generatedWasm.f32view(matrixPtr, 16)), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        generatedWasm.mat4f_copy(copyPtr, matrixPtr);
        assert.deepStrictEqual(Array.from(generatedWasm.f32view(copyPtr, 16)), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
        generatedWasm.mat4f_copy(copyPtr, copyPtr);
        assert.deepStrictEqual(Array.from(generatedWasm.f32view(copyPtr, 16)), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], "Matrix self-copy must preserve its input");
        generatedWasm.f32view(copyPtr, 17).set(Array.from({ length: 17 }, (_, i) => i + 1));
        generatedWasm.mat4f_copy(copyPtr + 4, copyPtr);
        assert.deepStrictEqual(Array.from(generatedWasm.f32view(copyPtr, 17)), [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], "Matrix copy must support forward overlap");
        generatedWasm.f32view(copyPtr, 17).set(Array.from({ length: 17 }, (_, i) => i + 1));
        generatedWasm.mat4f_copy(copyPtr, copyPtr + 4);
        assert.deepStrictEqual(Array.from(generatedWasm.f32view(copyPtr, 17)), [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 17], "Matrix copy must support backward overlap");
        generatedWasm.f32view(copyPtr, 17).set(Array.from({ length: 17 }, (_, i) => -(i + 1)));
        generatedWasm.mat4f_abs(copyPtr + 4, copyPtr);
        assert.deepStrictEqual(Array.from(generatedWasm.f32view(copyPtr, 17)), [-1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], "Fixed-width math kernels must stage inputs before partially overlapping output writes");

        generatedWasm.f32view(matrixPtr, 4).set([0.25, -0.5, 0.75, 1]);
        generatedWasm.quatf_copy(copyPtr, matrixPtr);
        assert.deepStrictEqual(Array.from(generatedWasm.f32view(copyPtr, 4)), [0.25, -0.5, 0.75, 1]);
        generatedWasm.quatf_copy(copyPtr, copyPtr);
        assert.deepStrictEqual(Array.from(generatedWasm.f32view(copyPtr, 4)), [0.25, -0.5, 0.75, 1], "Quaternion self-copy must preserve its input");
        generatedWasm.f32view(copyPtr, 5).set([1, 2, 3, 4, 5]);
        generatedWasm.quatf_copy(copyPtr + 4, copyPtr);
        assert.deepStrictEqual(Array.from(generatedWasm.f32view(copyPtr, 5)), [1, 1, 2, 3, 4], "Quaternion copy must support forward overlap");
        generatedWasm.f32view(copyPtr, 5).set([1, 2, 3, 4, 5]);
        generatedWasm.quatf_copy(copyPtr, copyPtr + 4);
        assert.deepStrictEqual(Array.from(generatedWasm.f32view(copyPtr, 5)), [2, 3, 4, 5, 5], "Quaternion copy must support backward overlap");
        generatedWasm.f32view(copyPtr, 8).set([0, 0, 0, 1, 1, 0, 0, 0]);
        generatedWasm.quatf_mul(copyPtr, copyPtr, copyPtr + 16);
        assert.deepStrictEqual(Array.from(generatedWasm.f32view(copyPtr, 4)), [1, 0, 0, 0], "Quaternion multiplication must support an in-place left operand");
        generatedWasm.f32view(copyPtr, 4).set([0, 0, 0, 2]);
        generatedWasm.quatf_normalize(copyPtr, copyPtr);
        assert.deepStrictEqual(Array.from(generatedWasm.f32view(copyPtr, 4)), [0, 0, 0, 1], "Quaternion normalization must support in-place output");

        generatedWasm.f32view(matrixPtr, 3).set([1.25, -2.5, 3.75]);
        generatedWasm.vec3f_copy(copyPtr, matrixPtr);
        assert.deepStrictEqual(Array.from(generatedWasm.f32view(copyPtr, 3)), [1.25, -2.5, 3.75]);
        generatedWasm.vec3f_copy(copyPtr, copyPtr);
        assert.deepStrictEqual(Array.from(generatedWasm.f32view(copyPtr, 3)), [1.25, -2.5, 3.75], "Vector self-copy must preserve its input");
        generatedWasm.f32view(copyPtr, 4).set([1, 2, 3, 4]);
        generatedWasm.vec3f_copy(copyPtr + 4, copyPtr);
        assert.deepStrictEqual(Array.from(generatedWasm.f32view(copyPtr, 4)), [1, 1, 2, 3], "Vector copy must support forward overlap");
        generatedWasm.f32view(copyPtr, 4).set([1, 2, 3, 4]);
        generatedWasm.vec3f_copy(copyPtr, copyPtr + 4);
        assert.deepStrictEqual(Array.from(generatedWasm.f32view(copyPtr, 4)), [2, 3, 4, 4], "Vector copy must support backward overlap");
        generatedWasm.f32view(copyPtr, 3).set([2, 0, 0]);
        generatedWasm.vec3f_normalize(copyPtr, copyPtr);
        assert.deepStrictEqual(Array.from(generatedWasm.f32view(copyPtr, 3)), [1, 0, 0], "Vector normalization must support in-place output");

        generatedWasm.u8view(sourcePtr, 12).set([1, 2, 3, 4, 90, 91, 5, 6, 7, 8, 92, 93]);
        generatedWasm.accessor_deinterleave(outputPtr, sourcePtr, 2, 2, 2, 6);
        assert.deepStrictEqual(Array.from(generatedWasm.u8view(outputPtr, 8)), [1, 2, 3, 4, 5, 6, 7, 8]);
    } finally {
        generatedWasm.wasmgpu_free_u32(shapePtr, 3);
        generatedWasm.wasmgpu_free_f32(matrixPtr, 16);
        generatedWasm.wasmgpu_free_f32(copyPtr, 17);
        generatedWasm.wasmgpu_free(sourcePtr, 12);
        generatedWasm.wasmgpu_free(outputPtr, 8);
    }
}

// 12) Driver-owned heap slices and heap arenas enforce deterministic lifetimes and reclaim their allocations.
{
    await initWebAssembly(new URL("../wasm/", import.meta.url).toString());

    frameArena.reset();
    const frameF64Slice = driver.frame.allocF64(2);
    frameF64Slice.write([Math.PI, 1 + Number.EPSILON]);
    assert.ok(frameF64Slice.view() instanceof Float64Array);
    frameArena.reset();
    assert.throws(() => frameF64Slice.view(), /epoch changed/i, "f64 frame slices must expire with the frame epoch");

    const slice = driver.heap.allocF32(4);
    slice.write([1, 2, 3, 4]);
    assert.strictEqual(slice.isAlive(), true);
    assert.deepStrictEqual(Array.from(slice.view()), [1, 2, 3, 4]);
    slice.free();
    assert.strictEqual(slice.isAlive(), false, "Explicitly freed heap slices must become invalid immediately");
    assert.throws(() => slice.view(), /freed/i, "Freed heap slices must reject later views");
    assert.throws(() => slice.handle(), /freed/i, "Freed heap slices must reject later handle creation");
    assert.doesNotThrow(() => slice.free(), "Heap slice free must remain idempotent");

    const f64Slice = driver.heap.allocF64(3);
    f64Slice.write([Math.PI, 1 + Number.EPSILON, -Math.E]);
    assert.ok(f64Slice.view() instanceof Float64Array, "f64 heap slices must expose Float64Array views");
    assert.deepStrictEqual(Array.from(f64Slice.view()), [Math.PI, 1 + Number.EPSILON, -Math.E]);
    const f64Handle = f64Slice.handle();
    assert.ok(driver.viewFromHandle(driver.buffer(), f64Handle) instanceof Float64Array, "f64 handles must reconstruct Float64Array views");
    f64Slice.free();

    const retrySlice = driver.heap.allocF32(4);
    retrySlice.write([5, 6, 7, 8]);
    const originalFreeF32 = wasm.freeF32;
    wasm.freeF32 = () => { throw new Error("injected free failure"); };
    try {
        assert.throws(() => retrySlice.free(), /injected free failure/i, "A failed heap release must be reported");
        assert.strictEqual(retrySlice.isAlive(), true, "A failed heap release must leave the slice retryable");
        assert.deepStrictEqual(Array.from(retrySlice.view()), [5, 6, 7, 8]);
    } finally {
        wasm.freeF32 = originalFreeF32;
    }
    retrySlice.free();

    const ndarrayHandle = pythonInterop.sendNdarray(new Float32Array([1, 2, 3, 4]), { shape: [2, 2] });
    assert.deepStrictEqual(Array.from(pythonInterop.view(ndarrayHandle)), [1, 2, 3, 4]);
    pythonInterop.free(ndarrayHandle);
    assert.doesNotThrow(() => pythonInterop.free(ndarrayHandle), "Python ndarray heap free must remain idempotent");
    assert.throws(() => pythonInterop.view(ndarrayHandle), /freed/i, "Freed Python ndarray handles must reject typed views");
    assert.throws(() => pythonInterop.bytes(ndarrayHandle), /freed/i, "Freed Python ndarray handles must reject byte views");
    assert.throws(() => pythonInterop.copyInto(ndarrayHandle, new Float32Array([5, 6, 7, 8])), /freed/i, "Freed Python ndarray handles must reject writes");
    assert.throws(() => pythonInterop.receiveNdarray(ndarrayHandle, { copy: true }), /freed/i, "Freed Python ndarray handles must reject reads");
    const replacementHandle = pythonInterop.sendNdarray(new Float32Array([9, 10, 11, 12]), { shape: [2, 2] });
    assert.throws(() => pythonInterop.view(ndarrayHandle), /freed/i, "A freed handle must remain invalid after its storage becomes reusable");
    pythonInterop.free(replacementHandle);

    const arena = driver.createHeapArena(256);
    const arenaSlice = arena.allocF64(2);
    arenaSlice.write([1, 2, 3, 4]);
    assert.strictEqual(arenaSlice.isAlive(), true);
    arena.destroy();
    assert.strictEqual(arenaSlice.isAlive(), false, "Destroying a heap arena must invalidate its slices");
    assert.throws(() => arenaSlice.view(), /epoch changed/i, "Destroyed-arena slices must reject later views");
    assert.throws(() => arena.alloc(1), /destroyed/i, "Destroyed heap arenas must reject new allocations");
    assert.doesNotThrow(() => arena.destroy(), "Heap arena destruction must remain idempotent");

    const retryArena = driver.createHeapArena(256);
    const retryArenaSlice = retryArena.allocU8(4);
    retryArenaSlice.write([1, 2, 3, 4]);
    const originalFreeBytes = wasm.freeBytes;
    wasm.freeBytes = () => { throw new Error("injected arena destroy failure"); };
    try {
        assert.throws(() => retryArena.destroy(), /injected arena destroy failure/i, "A failed arena release must be reported");
        assert.strictEqual(retryArenaSlice.isAlive(), true, "A failed arena release must leave its slices valid and retryable");
    } finally {
        wasm.freeBytes = originalFreeBytes;
    }
    retryArena.destroy();
    assert.strictEqual(retryArenaSlice.isAlive(), false);

    const arenaChurn = () => {
        const current = driver.createHeapArena(256 * 1024);
        const bytes = current.allocU8(256 * 1024);
        const view = bytes.view();
        view[0] = 0x35;
        view[view.length - 1] = 0x79;
        assert.strictEqual(view[0], 0x35);
        assert.strictEqual(view[view.length - 1], 0x79);
        current.destroy();
        assert.strictEqual(bytes.isAlive(), false);
    };

    arenaChurn();
    const stabilizedArenaBytes = generatedWasm.memory.buffer.byteLength;
    for (let i = 0; i < 64; i++) arenaChurn();
    assert.strictEqual(generatedWasm.memory.buffer.byteLength, stabilizedArenaBytes, "Repeated heap-arena destruction must release backing blocks for reuse");
}
