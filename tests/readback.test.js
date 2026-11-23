/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import assert from "./utils/assert.js";
import { arraysEqualU32, destroyTestDevice, setupTest } from "./utils/helpers.js";
import * as WasmGPU from "../release/WasmGPU.js";

const { device } = await setupTest({ webgpu: true });

const { Compute } = WasmGPU;
assert.ok(Compute, "Missing export: Compute");

const compute = new Compute(device, device.queue, { readback: { slots: 2, labelPrefix: "test:readback" } });
assert.ok(compute.readback, "Compute.readback is missing");

// 1) Basic readback (typed array).
{
    const data = new Uint32Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const buf = compute.createStorageBuffer({ label: "readback:basic", data, copySrc: true, copyDst: false });
    const got = await compute.readback.readAs(Uint32Array, buf);
    arraysEqualU32(got, data, "readback.readAs(Uint32Array) mismatch");
}

// 2) Scalar readback.
{
    const data = new Uint32Array([1234567890 >>> 0]);
    const buf = compute.createStorageBuffer({ label: "readback:scalar", data, copySrc: true, copyDst: false });
    const got = await compute.readback.readScalarU32(buf);
    assert.strictEqual(got >>> 0, data[0] >>> 0, "readback.readScalarU32 mismatch");
}

// 3) Ring saturation behavior (slots = 1).
{
    const rb = compute.createReadbackRing({ slots: 1, labelPrefix: "test:readback:ring1" });
    const data = new Uint32Array([0xDEADBEEF >>> 0, 7]);
    const buf = compute.createStorageBuffer({ label: "readback:ring1:src", data, copySrc: true, copyDst: false });

    // Schedule multiple reads without awaiting between them
    const p0 = rb.readAs(Uint32Array, buf, 0, 8, { label: "ring1:p0" });
    const p1 = rb.readAs(Uint32Array, buf, 0, 8, { label: "ring1:p1" });
    const p2 = rb.readAs(Uint32Array, buf, 0, 8, { label: "ring1:p2" });

    const [a0, a1, a2] = await Promise.all([p0, p1, p2]);
    arraysEqualU32(a0, data, "ring1 p0 mismatch");
    arraysEqualU32(a1, data, "ring1 p1 mismatch");
    arraysEqualU32(a2, data, "ring1 p2 mismatch");

    rb.destroy();
}

// 4) Error on missing COPY_SRC.
{
    const data = new Uint32Array([42]);
    const buf = compute.createStorageBuffer({ label: "readback:bad", data, copySrc: false, copyDst: false });
    let threw = false;
    try { await compute.readback.readScalarU32(buf); } catch { threw = true; }
    assert.ok(threw, "Expected readback to throw when source buffer lacks COPY_SRC");
}

// 5) Invalid logical ranges are rejected before allocating the returned copy.
{
    const buf = compute.createStorageBuffer({ label: "readback:invalid-range", data: new Uint32Array([7]), copySrc: true });
    await assert.rejects(
        compute.readback.read(buf, 0, Number.MAX_SAFE_INTEGER),
        /sizeBytes .* exceeds remaining bytes/,
        "Expected logical source-range validation instead of an allocation failure"
    );
    buf.destroy();
}

// 6) Every ring read copies its source at call time: later writes miss the result with the ring idle and with every slot busy.
{
    const words = (v) => new Uint32Array(16).fill(v);
    const src = compute.createStorageBuffer({ label: "readback:snapshot", data: words(1), copySrc: true, copyDst: true });
    const one = compute.createReadbackRing({ slots: 1, labelPrefix: "test:readback:one" });
    for (const rb of [compute.readback, one]) {
        src.write(words(1));
        const idle = rb.read(src);
        src.write(words(2));
        const busy = [rb.readAs(Uint32Array, src, 0, 16), rb.readScalarU32(src, 60), rb.read(src, 4, 8)];
        src.write(words(3));
        const [a, b, c, d] = await Promise.all([idle, ...busy]);
        assert.deepStrictEqual([new Uint32Array(a)[15], b[3], c, Array.from(new Uint32Array(d))], [1, 2, 2, [2, 2]], `${rb === one ? "slots: 1" : "slots: 2"} reads see the values present when they were called`);
        const many = Array.from({ length: 12 }, (_, i) => { src.write(words(10 + i)); return rb.readScalarU32(src, 4 * i); });
        assert.deepStrictEqual(await Promise.all(many), Array.from({ length: 12 }, (_, i) => 10 + i), "concurrent reads each keep their own snapshot");
    }
    one.destroy();
    src.destroy();
}

// 7) Concurrent reads take a free slot (one that already fits first) before a transient staging buffer and keep their snapshots.
{
    const rb = compute.createReadbackRing({ slots: 3, labelPrefix: "test:readback:scan" });
    const src = compute.createStorageBuffer({ label: "readback:scan", data: new Uint32Array(1024).fill(5), copySrc: true, copyDst: true });
    await rb.read(src);
    const create = device.createBuffer.bind(device);
    const created = [];
    device.createBuffer = (desc) => { created.push(desc.label); return create(desc); };
    try {
        const reads = [rb.read(src), rb.readScalarU32(src, 4)];
        src.write(new Uint32Array(1024).fill(6));
        reads.push(rb.read(src), rb.readScalarU32(src, 8));
        src.write(new Uint32Array(1024).fill(7));
        const [a, b, c, d] = await Promise.all(reads);
        assert.deepStrictEqual([new Uint32Array(a)[1023], b, new Uint32Array(c)[1023], d], [5, 5, 6, 6], "each read keeps the values present when it was called");
        assert.deepStrictEqual(created, ["test:readback:scan:slot2", "test:readback:scan:snapshot"], "the fitting idle slot is reused, the next idle slot grows, and only a fully busy ring uses a transient buffer");
    } finally { device.createBuffer = create; }
    rb.destroy();
    src.destroy();
}

// 8) Cleanup releases the shared compute context before its browser GPU device.
{
    compute.destroy();
    await destroyTestDevice(device);
}
