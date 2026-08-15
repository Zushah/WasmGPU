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

// 5) Cleanup releases the shared compute context before its browser GPU device.
{
    compute.destroy();
    await destroyTestDevice(device);
}
