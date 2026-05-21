/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "assert";
import { WasmGPU, WasmMemoryView, WasmModule, driver, pythonInterop, webassemblyInterop } from "../dist/WasmGPU.js";

const encoder = new TextEncoder();

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
    assert.deepStrictEqual(Array.from(moduleRef.view({ ptr: () => 64, length: () => 4, dtype: "f32", name: "f32-view" }).array()), [1.5, 2.5, 3.5, 4.5]);
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
